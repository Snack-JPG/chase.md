import { db } from "@/server/db";
import { clients, xeroConnections, xpmJobs } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { refreshAccessToken } from "./xero";
import { XMLParser } from "fast-xml-parser";

// ============================================================
// Types
// ============================================================

interface XpmJob {
  ID: string;
  Name: string;
  ClientID?: string;
  ClientName?: string;
  State?: string;
  Status?: { Name?: string; ID?: string };
  Category?: { Name?: string };
  DueDate?: string;
  StartDate?: string;
}

interface XpmSyncStats {
  fetched: number;
  upserted: number;
  matched: number;
  errors: number;
  errorDetails: string[];
}

// ============================================================
// Token helper (shared pattern with xero-sync)
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
// Fetch jobs from XPM API (XML responses)
// ============================================================

async function fetchXpmJobs(
  accessToken: string,
  tenantId: string,
): Promise<XpmJob[]> {
  const url = "https://api.xero.com/practicemanager/3.0/job.api/list";

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
      Accept: "application/xml",
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new XpmAccessError(
      `XPM API returned ${response.status}. Practice Manager access may not be approved.`,
    );
  }

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("retry-after") || "60", 10);
    await sleep(retryAfter * 1000);
    return fetchXpmJobs(accessToken, tenantId);
  }

  if (!response.ok) {
    throw new Error(`XPM API error: ${response.status} ${await response.text()}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (tagName) => tagName === "Job",
  });

  const parsed = parser.parse(xml);
  const jobs: XpmJob[] = parsed?.Response?.Jobs?.Job || parsed?.Jobs?.Job || [];

  return Array.isArray(jobs) ? jobs : [jobs];
}

// ============================================================
// Custom error for XPM access issues
// ============================================================

export class XpmAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XpmAccessError";
  }
}

// ============================================================
// Main sync function
// ============================================================

export async function syncJobs(practiceId: string): Promise<XpmSyncStats> {
  const stats: XpmSyncStats = {
    fetched: 0,
    upserted: 0,
    matched: 0,
    errors: 0,
    errorDetails: [],
  };

  const connection = await db.query.xeroConnections.findFirst({
    where: and(
      eq(xeroConnections.practiceId, practiceId),
      eq(xeroConnections.status, "active"),
    ),
  });

  if (!connection) {
    throw new Error("No active Xero connection for this practice");
  }

  if (!connection.xpmEnabled) {
    return stats;
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(connection);
  } catch {
    throw new Error("Failed to get valid access token for XPM sync");
  }

  let xpmJobList: XpmJob[];
  try {
    xpmJobList = await fetchXpmJobs(accessToken, connection.xeroTenantId);
  } catch (err) {
    if (err instanceof XpmAccessError) {
      // Graceful degradation: disable XPM and surface the error
      await db
        .update(xeroConnections)
        .set({ xpmEnabled: false, updatedAt: new Date() })
        .where(eq(xeroConnections.id, connection.id));
      throw err;
    }
    throw err;
  }

  stats.fetched = xpmJobList.length;

  // Build lookup: xeroContactId → client
  const practiceClients = await db.query.clients.findMany({
    where: and(eq(clients.practiceId, practiceId), isNull(clients.deletedAt)),
  });
  const clientByXeroId = new Map(
    practiceClients.filter((c) => c.xeroContactId).map((c) => [c.xeroContactId!, c]),
  );

  const now = new Date();

  for (const job of xpmJobList) {
    try {
      const xeroClientId = job.ClientID ? String(job.ClientID) : undefined;
      const matchedClient = xeroClientId ? clientByXeroId.get(xeroClientId) : undefined;

      if (matchedClient) stats.matched++;

      const statusName =
        typeof job.Status === "object" ? job.Status?.Name : undefined;
      const categoryName =
        typeof job.Category === "object" ? job.Category?.Name : undefined;

      const values = {
        practiceId,
        xeroJobId: String(job.ID),
        clientId: matchedClient?.id ?? null,
        xeroClientId: xeroClientId ?? null,
        jobName: job.Name ? String(job.Name) : null,
        jobStatus: statusName ?? null,
        jobCategory: categoryName ?? null,
        jobState: job.State ? String(job.State) : null,
        dueDate: job.DueDate ? new Date(job.DueDate) : null,
        lastSyncedAt: now,
        updatedAt: now,
      };

      // Upsert by (practiceId, xeroJobId)
      const existing = await db.query.xpmJobs.findFirst({
        where: and(
          eq(xpmJobs.practiceId, practiceId),
          eq(xpmJobs.xeroJobId, String(job.ID)),
        ),
      });

      if (existing) {
        await db.update(xpmJobs).set(values).where(eq(xpmJobs.id, existing.id));
      } else {
        await db.insert(xpmJobs).values(values);
      }

      stats.upserted++;
    } catch (err) {
      stats.errors++;
      stats.errorDetails.push(
        `Job ${job.ID}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  return stats;
}

// ============================================================
// Get clients needing documents (jobs with "awaiting" statuses)
// ============================================================

export async function getClientsNeedingDocuments(practiceId: string): Promise<
  Array<{
    clientId: string;
    clientName: string;
    jobs: Array<{ id: string; jobName: string | null; jobStatus: string | null; jobCategory: string | null; dueDate: Date | null }>;
  }>
> {
  const connection = await db.query.xeroConnections.findFirst({
    where: and(
      eq(xeroConnections.practiceId, practiceId),
      eq(xeroConnections.status, "active"),
    ),
  });

  if (!connection?.xpmEnabled) return [];

  // Get the mapped "needs docs" statuses from xpmStatusMappings
  const mappings = (connection.xpmStatusMappings ?? {}) as Record<string, string>;
  const needsDocsStatuses = Object.entries(mappings)
    .filter(([, action]) => action === "needs_docs")
    .map(([status]) => status.toLowerCase());

  if (needsDocsStatuses.length === 0) {
    // Default: look for anything containing "awaiting"
    needsDocsStatuses.push("awaiting");
  }

  const allJobs = await db.query.xpmJobs.findMany({
    where: and(
      eq(xpmJobs.practiceId, practiceId),
    ),
    with: { client: true },
  });

  // Filter for jobs matching needs_docs statuses
  const matchingJobs = allJobs.filter((j) => {
    if (!j.jobStatus || !j.clientId) return false;
    const statusLower = j.jobStatus.toLowerCase();
    return needsDocsStatuses.some((s) => statusLower.includes(s));
  });

  // Group by client
  const byClient = new Map<string, typeof matchingJobs>();
  for (const job of matchingJobs) {
    const key = job.clientId!;
    if (!byClient.has(key)) byClient.set(key, []);
    byClient.get(key)!.push(job);
  }

  return Array.from(byClient.entries()).map(([clientId, jobs]) => {
    const client = jobs[0]?.client;
    return {
      clientId,
      clientName: client
        ? `${client.firstName} ${client.lastName}`.trim()
        : "Unknown",
      jobs: jobs.map((j) => ({
        id: j.id,
        jobName: j.jobName,
        jobStatus: j.jobStatus,
        jobCategory: j.jobCategory,
        dueDate: j.dueDate,
      })),
    };
  });
}

// ============================================================
// Sync all XPM-enabled practices (for cron)
// ============================================================

export async function syncAllXpmJobs(): Promise<Record<string, XpmSyncStats>> {
  const activeConnections = await db.query.xeroConnections.findMany({
    where: and(
      eq(xeroConnections.status, "active"),
      eq(xeroConnections.xpmEnabled, true),
    ),
  });

  const results: Record<string, XpmSyncStats> = {};

  for (const conn of activeConnections) {
    try {
      results[conn.practiceId] = await syncJobs(conn.practiceId);
    } catch (err) {
      results[conn.practiceId] = {
        fetched: 0,
        upserted: 0,
        matched: 0,
        errors: 1,
        errorDetails: [err instanceof Error ? err.message : "Unknown error"],
      };
    }
  }

  return results;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
