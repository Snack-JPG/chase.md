import { db } from "@/server/db";
import { clients, xeroConnections } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { refreshAccessToken } from "./xero";

// ============================================================
// Types
// ============================================================

interface XeroPhone {
  PhoneType: string;
  PhoneNumber: string;
  PhoneAreaCode: string;
  PhoneCountryCode: string;
}

interface XeroContact {
  ContactID: string;
  Name: string;
  FirstName?: string;
  LastName?: string;
  EmailAddress?: string;
  ContactStatus: string;
  IsCustomer?: boolean;
  Phones?: XeroPhone[];
  UpdatedDateUTC?: string;
}

interface SyncStats {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
}

// ============================================================
// Token refresh helper
// ============================================================

async function getValidAccessToken(connection: typeof xeroConnections.$inferSelect): Promise<string> {
  // If token expires within 2 minutes, refresh
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
// Fetch contacts from Xero with pagination
// ============================================================

async function fetchAllXeroContacts(
  accessToken: string,
  tenantId: string,
): Promise<XeroContact[]> {
  const allContacts: XeroContact[] = [];
  let page = 1;

  while (true) {
    const url = new URL("https://api.xero.com/api.xro/2.0/Contacts");
    url.searchParams.set("page", String(page));
    url.searchParams.set("where", 'ContactStatus=="ACTIVE"');
    url.searchParams.set("order", "Name ASC");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "xero-tenant-id": tenantId,
        Accept: "application/json",
      },
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("retry-after") || "60", 10);
      await sleep(retryAfter * 1000);
      continue; // retry same page
    }

    if (!response.ok) {
      throw new Error(`Xero API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const contacts: XeroContact[] = data.Contacts || [];

    if (contacts.length === 0) break;

    allContacts.push(...contacts);

    // 100 per page — if less, we're done
    if (contacts.length < 100) break;

    page++;
    // Rate limit: ~60/min, add delay between pages
    await sleep(1100);
  }

  return allContacts;
}

// ============================================================
// Extract phone number from Xero phone array
// ============================================================

function extractPhone(phones: XeroPhone[] | undefined, type: string): string | undefined {
  if (!phones) return undefined;
  const phone = phones.find((p) => p.PhoneType === type);
  if (!phone || !phone.PhoneNumber) return undefined;

  const parts = [phone.PhoneCountryCode, phone.PhoneAreaCode, phone.PhoneNumber]
    .filter(Boolean);
  return parts.join("") || undefined;
}

// ============================================================
// Main sync function
// ============================================================

export async function syncContacts(practiceId: string): Promise<SyncStats> {
  const stats: SyncStats = { created: 0, updated: 0, skipped: 0, errors: 0, errorDetails: [] };

  // Get active Xero connection for this practice
  const connection = await db.query.xeroConnections.findFirst({
    where: and(
      eq(xeroConnections.practiceId, practiceId),
      eq(xeroConnections.status, "active"),
    ),
  });

  if (!connection) {
    throw new Error("No active Xero connection for this practice");
  }

  const accessToken = await getValidAccessToken(connection);
  const xeroContacts = await fetchAllXeroContacts(accessToken, connection.xeroTenantId);

  // Get all existing clients for matching
  const existingClients = await db.query.clients.findMany({
    where: and(eq(clients.practiceId, practiceId), isNull(clients.deletedAt)),
  });

  // Build lookup maps
  const byXeroId = new Map(existingClients.filter((c) => c.xeroContactId).map((c) => [c.xeroContactId!, c]));
  const byEmail = new Map(existingClients.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c]));
  const byName = new Map(existingClients.map((c) => [`${c.firstName} ${c.lastName}`.toLowerCase(), c]));

  for (const xc of xeroContacts) {
    try {
      const name = xc.Name || "";
      const firstName = xc.FirstName || name.split(" ")[0] || "Unknown";
      const lastName = xc.LastName || name.split(" ").slice(1).join(" ") || "";
      const email = xc.EmailAddress || undefined;
      const phone = extractPhone(xc.Phones, "DEFAULT");

      // Match: xeroContactId > email > name
      const existing = byXeroId.get(xc.ContactID)
        || (email ? byEmail.get(email.toLowerCase()) : undefined)
        || byName.get(name.toLowerCase());

      if (existing) {
        // Update existing client
        await db
          .update(clients)
          .set({
            xeroContactId: xc.ContactID,
            ...(email && !existing.email ? { email } : {}),
            ...(phone && !existing.phone ? { phone } : {}),
            updatedAt: new Date(),
          })
          .where(eq(clients.id, existing.id));
        stats.updated++;
      } else {
        // Create new client
        await db.insert(clients).values({
          practiceId,
          firstName,
          lastName: lastName || firstName, // lastName is notNull
          companyName: name,
          email,
          phone,
          clientType: "limited_company",
          xeroContactId: xc.ContactID,
          chaseEnabled: true,
        });
        stats.created++;
      }
    } catch (err) {
      stats.errors++;
      stats.errorDetails.push(`${xc.Name}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Update last sync time on connection
  await db
    .update(xeroConnections)
    .set({ updatedAt: new Date() })
    .where(eq(xeroConnections.id, connection.id));

  return stats;
}

// ============================================================
// Sync all practices (for cron)
// ============================================================

export async function syncAllPractices(): Promise<Record<string, SyncStats>> {
  const activeConnections = await db.query.xeroConnections.findMany({
    where: eq(xeroConnections.status, "active"),
  });

  const results: Record<string, SyncStats> = {};

  for (const conn of activeConnections) {
    try {
      results[conn.practiceId] = await syncContacts(conn.practiceId);
    } catch (err) {
      results[conn.practiceId] = {
        created: 0,
        updated: 0,
        skipped: 0,
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
