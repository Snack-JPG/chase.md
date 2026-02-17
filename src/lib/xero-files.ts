import { db } from "@/server/db";
import { clientDocuments, clients, xeroConnections } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { refreshAccessToken } from "./xero";
import { getDocument } from "./r2";

// ============================================================
// Token refresh (shared pattern with xero-sync)
// ============================================================

async function getValidAccessToken(
  connection: typeof xeroConnections.$inferSelect,
): Promise<string> {
  const bufferMs = 2 * 60 * 1000;
  if (connection.tokenExpiresAt.getTime() - Date.now() > bufferMs) {
    return connection.accessToken;
  }

  const refreshed = await refreshAccessToken(connection.refreshToken);

  await db
    .update(xeroConnections)
    .set({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      tokenExpiresAt: refreshed.expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(xeroConnections.id, connection.id));

  return refreshed.accessToken;
}

// ============================================================
// Folder management — ensure "chase.md Uploads" folder exists
// ============================================================

async function ensureUploadFolder(
  accessToken: string,
  tenantId: string,
  connectionId: string,
  cachedFolderId: string | null,
): Promise<string> {
  // If we have a cached folder ID, verify it still exists
  if (cachedFolderId) {
    const res = await fetch("https://api.xero.com/files.xro/1.0/Folders", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "xero-tenant-id": tenantId,
      },
    });
    if (res.ok) {
      const folders = await res.json();
      if (Array.isArray(folders) && folders.some((f: { Id: string }) => f.Id === cachedFolderId)) {
        return cachedFolderId;
      }
    }
  }

  // List folders and look for existing "chase.md Uploads"
  const listRes = await fetch("https://api.xero.com/files.xro/1.0/Folders", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
    },
  });

  if (!listRes.ok) {
    throw new Error(`Failed to list Xero folders: ${listRes.status}`);
  }

  const folders = await listRes.json();
  const existing = Array.isArray(folders)
    ? folders.find((f: { Name: string }) => f.Name === "chase.md Uploads")
    : undefined;

  if (existing) {
    // Cache it
    await db
      .update(xeroConnections)
      .set({ xeroUploadFolderId: existing.Id, updatedAt: new Date() })
      .where(eq(xeroConnections.id, connectionId));
    return existing.Id;
  }

  // Create the folder
  const createRes = await fetch("https://api.xero.com/files.xro/1.0/Folders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Name: "chase.md Uploads" }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create Xero folder: ${createRes.status} ${await createRes.text()}`);
  }

  const newFolder = await createRes.json();
  const folderId = newFolder.Id;

  // Cache the folder ID
  await db
    .update(xeroConnections)
    .set({ xeroUploadFolderId: folderId, updatedAt: new Date() })
    .where(eq(xeroConnections.id, connectionId));

  return folderId;
}

// ============================================================
// Upload file to Xero and associate with contact
// ============================================================

async function uploadFileToXero(
  accessToken: string,
  tenantId: string,
  folderId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  // Build multipart form data
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
  formData.append("body", blob, fileName);
  formData.append("name", fileName);
  formData.append("filename", fileName);
  formData.append("mimeType", mimeType);

  const res = await fetch(
    `https://api.xero.com/files.xro/1.0/Files/${folderId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "xero-tenant-id": tenantId,
      },
      body: formData,
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Xero file upload failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.Id;
}

async function associateFileWithContact(
  accessToken: string,
  tenantId: string,
  fileId: string,
  contactId: string,
): Promise<void> {
  const res = await fetch(
    `https://api.xero.com/files.xro/1.0/Files/${fileId}/Associations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "xero-tenant-id": tenantId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ObjectId: contactId,
        ObjectGroup: "Contact",
        ObjectType: "Business",
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Xero file association failed: ${res.status} ${errText}`);
  }
}

// ============================================================
// Main push function
// ============================================================

export async function pushDocumentToXero(documentId: string): Promise<void> {
  // Load document with client
  const doc = await db.query.clientDocuments.findFirst({
    where: eq(clientDocuments.id, documentId),
    with: { client: true },
  });

  if (!doc) {
    throw new Error(`Document ${documentId} not found`);
  }

  // Skip if already pushed
  if (doc.xeroPushStatus === "pushed") return;

  const client = doc.client;
  if (!client) {
    await markSkipped(documentId, "No client linked to document");
    return;
  }

  // Get Xero connection for practice
  const connection = await db.query.xeroConnections.findFirst({
    where: and(
      eq(xeroConnections.practiceId, doc.practiceId),
      eq(xeroConnections.status, "active"),
    ),
  });

  if (!connection) {
    await markSkipped(documentId, "No active Xero connection");
    return;
  }

  if (!client.xeroContactId) {
    await markSkipped(documentId, "Client has no xeroContactId");
    return;
  }

  if (!doc.r2Key) {
    await markFailed(documentId, "Document has no R2 key");
    return;
  }

  try {
    // Refresh token if needed
    const accessToken = await getValidAccessToken(connection);

    // Ensure upload folder exists
    const folderId = await ensureUploadFolder(
      accessToken,
      connection.xeroTenantId,
      connection.id,
      connection.xeroUploadFolderId,
    );

    // Download file from R2
    const r2Response = await getDocument(doc.r2Key);
    const bodyBytes = await r2Response.Body?.transformToByteArray();
    if (!bodyBytes) {
      throw new Error("Failed to download file from R2");
    }
    const fileBuffer = Buffer.from(bodyBytes);

    // Upload to Xero
    const xeroFileId = await uploadFileToXero(
      accessToken,
      connection.xeroTenantId,
      folderId,
      doc.fileName || "document",
      fileBuffer,
      doc.mimeType || "application/octet-stream",
    );

    // Associate with contact
    await associateFileWithContact(
      accessToken,
      connection.xeroTenantId,
      xeroFileId,
      client.xeroContactId,
    );

    // Mark as pushed
    await db
      .update(clientDocuments)
      .set({
        xeroFileId: xeroFileId,
        xeroPushStatus: "pushed",
        xeroPushError: null,
        xeroPushedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clientDocuments.id, documentId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await markFailed(documentId, message);
    throw err; // re-throw so callers know it failed
  }
}

// ============================================================
// Batch push pending documents
// ============================================================

export async function pushPendingDocuments(): Promise<{
  pushed: number;
  failed: number;
  skipped: number;
}> {
  const pending = await db.query.clientDocuments.findMany({
    where: eq(clientDocuments.xeroPushStatus, "pending"),
  });

  const stats = { pushed: 0, failed: 0, skipped: 0 };

  for (const doc of pending) {
    try {
      await pushDocumentToXero(doc.id);
      // Re-check status after push (might have been skipped)
      const updated = await db.query.clientDocuments.findFirst({
        where: eq(clientDocuments.id, doc.id),
      });
      if (updated?.xeroPushStatus === "pushed") stats.pushed++;
      else if (updated?.xeroPushStatus === "skipped") stats.skipped++;
    } catch {
      stats.failed++;
    }

    // Rate limit: don't overwhelm Xero (60 calls/min, each push uses ~3-4 calls)
    await new Promise((r) => setTimeout(r, 3000));
  }

  return stats;
}

// ============================================================
// Helpers
// ============================================================

async function markSkipped(documentId: string, reason: string) {
  await db
    .update(clientDocuments)
    .set({
      xeroPushStatus: "skipped",
      xeroPushError: reason,
      updatedAt: new Date(),
    })
    .where(eq(clientDocuments.id, documentId));
}

async function markFailed(documentId: string, error: string) {
  await db
    .update(clientDocuments)
    .set({
      xeroPushStatus: "failed",
      xeroPushError: error,
      updatedAt: new Date(),
    })
    .where(eq(clientDocuments.id, documentId));
}
