import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/server/db";
import { xeroConnections } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { syncSingleContact } from "@/lib/xero-sync";

interface XeroWebhookEvent {
  resourceUrl: string;
  resourceId: string;
  eventDateUtc: string;
  eventType: string;
  eventCategory: string;
  tenantId: string;
  tenantType: string;
}

interface XeroWebhookPayload {
  events: XeroWebhookEvent[];
  firstEventSequence: number;
  lastEventSequence: number;
  entropy?: string;
}

function verifySignature(payload: string, signature: string, webhookKey: string): boolean {
  const hash = crypto
    .createHmac("sha256", webhookKey)
    .update(payload)
    .digest("base64");
  return hash === signature;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-xero-signature") || "";

  // Parse payload to get tenantId for key lookup
  let payload: XeroWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // Find the webhook key — check events for tenantId, or check all connections for ITR validation
  let webhookKey: string | null = null;
  const connectionPracticeMap = new Map<string, string>();

  if (payload.events.length > 0) {
    // Normal event — look up by tenantId
    const tenantIds = [...new Set(payload.events.map((e) => e.tenantId))];
    const connections = await db.query.xeroConnections.findMany({
      where: eq(xeroConnections.status, "active"),
    });

    for (const conn of connections) {
      if (tenantIds.includes(conn.xeroTenantId) && conn.xeroWebhookKey) {
        webhookKey = conn.xeroWebhookKey;
        connectionPracticeMap.set(conn.xeroTenantId, conn.practiceId);
      }
    }
  } else {
    // Intent to Receive validation — try all webhook keys
    const connections = await db.query.xeroConnections.findMany({
      where: eq(xeroConnections.status, "active"),
    });

    for (const conn of connections) {
      if (conn.xeroWebhookKey && verifySignature(rawBody, signature, conn.xeroWebhookKey)) {
        webhookKey = conn.xeroWebhookKey;
        break;
      }
    }

    if (webhookKey) {
      // ITR validation — just return 200 (signature verified via response header)
      return new NextResponse(null, { status: 200 });
    }
    return new NextResponse(null, { status: 401 });
  }

  if (!webhookKey) {
    return new NextResponse(null, { status: 401 });
  }

  // Verify signature
  if (!verifySignature(rawBody, signature, webhookKey)) {
    return new NextResponse(null, { status: 401 });
  }

  // Respond 200 immediately — process events async
  // Use waitUntil pattern via promise (Next.js edge-compatible)
  const processPromise = processEvents(payload.events, connectionPracticeMap);

  // In serverless, we can't truly fire-and-forget, but we process quickly
  // The events are lightweight (just contact ID lookups)
  try {
    await processPromise;
  } catch (err) {
    console.error("[Xero Webhook] Error processing events:", err);
  }

  return new NextResponse(null, { status: 200 });
}

async function processEvents(
  events: XeroWebhookEvent[],
  practiceMap: Map<string, string>,
) {
  for (const event of events) {
    if (event.eventCategory !== "CONTACT") continue;
    if (event.eventType !== "Create" && event.eventType !== "Update") continue;

    const practiceId = practiceMap.get(event.tenantId);
    if (!practiceId) continue;

    try {
      await syncSingleContact(practiceId, event.resourceId);
    } catch (err) {
      console.error(
        `[Xero Webhook] Failed to sync contact ${event.resourceId}:`,
        err,
      );
    }
  }
}
