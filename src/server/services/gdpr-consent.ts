/**
 * GDPR Consent Management Service
 *
 * Handles opt-in/opt-out for all channels, unsubscribe link generation,
 * SMS STOP handling, and enrollment blocking when all channels exhausted.
 */

import { db } from "@/server/db";
import {
  clients,
  consentRecords,
  chaseEnrollments,
  chaseMessages,
} from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { logConsentChange, logAuditEvent } from "./audit-logger";
import crypto from "crypto";

// ─── Types ──────────────────────────────────────────────

type Channel = "email" | "sms" | "whatsapp";

interface OptOutRequest {
  clientId: string;
  practiceId: string;
  channel: Channel;
  method: string; // "sms_stop", "email_unsubscribe", "whatsapp_stop", "manual", "portal"
  ipAddress?: string;
  userId?: string; // staff user who triggered it (for manual)
}

interface OptInRequest {
  clientId: string;
  practiceId: string;
  channel: Channel;
  method: string;
  ipAddress?: string;
  userId?: string;
}

// ─── Consent Check ──────────────────────────────────────

/**
 * Check if a client has consent for a given channel.
 * Used by message-dispatcher before sending.
 */
export async function hasConsent(clientId: string, channel: Channel): Promise<boolean> {
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
    columns: {
      emailConsent: true,
      smsConsent: true,
      whatsappOptIn: true,
      chaseEnabled: true,
    },
  });

  if (!client || !client.chaseEnabled) return false;

  switch (channel) {
    case "email":
      return client.emailConsent ?? true; // Default true for email (legitimate interest)
    case "sms":
      return client.smsConsent ?? false;
    case "whatsapp":
      return client.whatsappOptIn ?? false;
    default:
      return false;
  }
}

/**
 * Get all consented channels for a client.
 */
export async function getConsentedChannels(clientId: string): Promise<Channel[]> {
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
    columns: {
      emailConsent: true,
      smsConsent: true,
      whatsappOptIn: true,
    },
  });

  if (!client) return [];

  const channels: Channel[] = [];
  if (client.emailConsent !== false) channels.push("email");
  if (client.smsConsent) channels.push("sms");
  if (client.whatsappOptIn) channels.push("whatsapp");
  return channels;
}

// ─── Opt-Out ────────────────────────────────────────────

/**
 * Process an opt-out request from any channel.
 * Updates client consent, creates consent record, pauses enrollments if needed.
 */
export async function processOptOut(request: OptOutRequest): Promise<{
  allChannelsRevoked: boolean;
  enrollmentsPaused: number;
}> {
  const { clientId, practiceId, channel, method, ipAddress, userId } = request;
  const now = new Date();

  // Update client consent field
  const consentUpdate: Record<string, unknown> = { updatedAt: now };
  switch (channel) {
    case "email":
      consentUpdate.emailConsent = false;
      consentUpdate.emailConsentAt = now;
      break;
    case "sms":
      consentUpdate.smsConsent = false;
      consentUpdate.smsConsentAt = now;
      break;
    case "whatsapp":
      consentUpdate.whatsappOptIn = false;
      consentUpdate.whatsappOptInAt = now;
      break;
  }

  await db.update(clients).set(consentUpdate).where(eq(clients.id, clientId));

  // Create consent record
  await db.insert(consentRecords).values({
    practiceId,
    clientId,
    channel,
    status: "revoked",
    revokedAt: now,
    revocationMethod: method,
    legalBasis: "consent",
  });

  // Log audit event
  await logConsentChange({
    practiceId,
    clientId,
    channel,
    granted: false,
    method,
    userId,
    ipAddress,
  });

  // Cancel any queued messages on this channel
  await db
    .update(chaseMessages)
    .set({ status: "opted_out" })
    .where(
      and(
        eq(chaseMessages.clientId, clientId),
        eq(chaseMessages.channel, channel),
        eq(chaseMessages.status, "queued"),
      ),
    );

  // Check if ALL channels are now revoked
  const remaining = await getConsentedChannels(clientId);
  const allRevoked = remaining.length === 0;

  let enrollmentsPaused = 0;

  if (allRevoked) {
    // Pause all active enrollments for this client
    const activeEnrollments = await db.query.chaseEnrollments.findMany({
      where: and(
        eq(chaseEnrollments.clientId, clientId),
        eq(chaseEnrollments.status, "active"),
      ),
    });

    for (const enrollment of activeEnrollments) {
      await db
        .update(chaseEnrollments)
        .set({
          status: "paused",
          optedOutAt: now,
          optOutReason: `All communication channels opted out (last: ${channel} via ${method})`,
          updatedAt: now,
        })
        .where(eq(chaseEnrollments.id, enrollment.id));
      enrollmentsPaused++;
    }

    // Log practice notification event
    await logAuditEvent({
      practiceId,
      action: "consent_revoke",
      entityType: "client",
      clientId,
      metadata: {
        allChannelsRevoked: true,
        enrollmentsPaused,
        lastChannel: channel,
        method,
      },
    });
  }

  return { allChannelsRevoked: allRevoked, enrollmentsPaused };
}

// ─── Opt-In ─────────────────────────────────────────────

/**
 * Process an opt-in / consent grant.
 */
export async function processOptIn(request: OptInRequest) {
  const { clientId, practiceId, channel, method, ipAddress, userId } = request;
  const now = new Date();

  const consentUpdate: Record<string, unknown> = { updatedAt: now, consentRecordedAt: now };
  switch (channel) {
    case "email":
      consentUpdate.emailConsent = true;
      consentUpdate.emailConsentAt = now;
      break;
    case "sms":
      consentUpdate.smsConsent = true;
      consentUpdate.smsConsentAt = now;
      break;
    case "whatsapp":
      consentUpdate.whatsappOptIn = true;
      consentUpdate.whatsappOptInAt = now;
      break;
  }

  await db.update(clients).set(consentUpdate).where(eq(clients.id, clientId));

  await db.insert(consentRecords).values({
    practiceId,
    clientId,
    channel,
    status: "granted",
    consentedAt: now,
    consentMethod: method,
    legalBasis: channel === "email" ? "legitimate_interest" : "consent",
  });

  await logConsentChange({
    practiceId,
    clientId,
    channel,
    granted: true,
    method,
    userId,
    ipAddress,
  });
}

// ─── Unsubscribe Links ─────────────────────────────────

/**
 * Generate a signed unsubscribe token for email footers.
 * Token format: base64(clientId:channel:timestamp:hmac)
 */
export function generateUnsubscribeToken(clientId: string, channel: Channel = "email"): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret";
  const timestamp = Date.now().toString(36);
  const payload = `${clientId}:${channel}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

/**
 * Verify and decode an unsubscribe token.
 */
export function verifyUnsubscribeToken(token: string): { clientId: string; channel: Channel } | null {
  try {
    const secret = process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret";
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;

    const [clientId, channel, timestamp, hmac] = parts;
    const payload = `${clientId}:${channel}:${timestamp}`;
    const expectedHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);

    if (hmac !== expectedHmac) return null;

    // Token expires after 365 days
    const tokenTime = parseInt(timestamp, 36);
    if (Date.now() - tokenTime > 365 * 24 * 60 * 60 * 1000) return null;

    return { clientId, channel: channel as Channel };
  } catch {
    return null;
  }
}

/**
 * Generate a full unsubscribe URL for email footers.
 */
export function generateUnsubscribeUrl(clientId: string): string {
  const token = generateUnsubscribeToken(clientId, "email");
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/gdpr/unsubscribe?token=${token}`;
}

// ─── SMS STOP Handler ───────────────────────────────────

const STOP_KEYWORDS = /^(stop|unsubscribe|cancel|end|quit)\s*$/i;

/**
 * Check if an inbound SMS/WhatsApp message is an opt-out keyword.
 */
export function isOptOutKeyword(message: string): boolean {
  return STOP_KEYWORDS.test(message.trim());
}

// ─── Data Subject Rights ────────────────────────────────

/**
 * Export all data for a client (Subject Access Request).
 */
export async function exportClientData(clientId: string, practiceId: string) {
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.practiceId, practiceId)),
    with: {
      documents: true,
      enrollments: true,
      consentRecords: true,
      magicLinks: { columns: { id: true, createdAt: true, expiresAt: true, lastUsedAt: true } },
    },
  });

  if (!client) return null;

  // Get messages
  const messages = await db.query.chaseMessages.findMany({
    where: and(
      eq(chaseMessages.clientId, clientId),
      eq(chaseMessages.practiceId, practiceId),
    ),
  });

  // Get audit logs
  const audits = await db.query.auditLog.findMany({
    where: and(
      eq(auditLog.clientId, clientId),
      eq(auditLog.practiceId, practiceId),
    ),
  });

  return {
    exportDate: new Date().toISOString(),
    dataSubject: {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      whatsappPhone: client.whatsappPhone,
      companyName: client.companyName,
      clientType: client.clientType,
      utr: client.utr,
      companyNumber: client.companyNumber,
      vatNumber: client.vatNumber,
    },
    consent: {
      emailConsent: client.emailConsent,
      emailConsentAt: client.emailConsentAt,
      smsConsent: client.smsConsent,
      smsConsentAt: client.smsConsentAt,
      whatsappOptIn: client.whatsappOptIn,
      whatsappOptInAt: client.whatsappOptInAt,
      marketingConsent: client.marketingConsent,
      consentSource: client.consentSource,
    },
    consentRecords: client.consentRecords,
    documents: client.documents.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      status: d.status,
      uploadedVia: d.uploadedVia,
      createdAt: d.createdAt,
    })),
    enrollments: client.enrollments,
    messages: messages.map((m) => ({
      id: m.id,
      channel: m.channel,
      status: m.status,
      sentAt: m.sentAt,
      bodyText: m.bodyText,
    })),
    auditTrail: audits,
  };
}

/**
 * Anonymize client data (Right to Erasure).
 * Replaces PII with [redacted] to preserve audit trail integrity.
 */
export async function anonymizeClientData(clientId: string, practiceId: string) {
  const now = new Date();
  const REDACTED = "[redacted]";

  // Anonymize client record
  await db
    .update(clients)
    .set({
      firstName: REDACTED,
      lastName: REDACTED,
      email: null,
      phone: null,
      whatsappPhone: null,
      companyName: null,
      utr: null,
      companyNumber: null,
      vatNumber: null,
      notes: null,
      tags: [],
      chaseEnabled: false,
      emailConsent: false,
      smsConsent: false,
      whatsappOptIn: false,
      deletedAt: now,
      updatedAt: now,
    })
    .where(and(eq(clients.id, clientId), eq(clients.practiceId, practiceId)));

  // Anonymize message content
  await db
    .update(chaseMessages)
    .set({ bodyText: REDACTED, bodyHtml: null, subject: REDACTED })
    .where(and(eq(chaseMessages.clientId, clientId), eq(chaseMessages.practiceId, practiceId)));

  // Pause all enrollments
  await db
    .update(chaseEnrollments)
    .set({
      status: "opted_out",
      optedOutAt: now,
      optOutReason: "GDPR Right to Erasure",
      updatedAt: now,
    })
    .where(and(eq(chaseEnrollments.clientId, clientId), eq(chaseEnrollments.practiceId, practiceId)));

  return { anonymizedAt: now };
}
