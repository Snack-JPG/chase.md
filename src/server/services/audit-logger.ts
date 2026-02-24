/**
 * Typed audit logger for GDPR compliance.
 * Logs all consent changes, data access, exports, and deletions.
 */

import { db } from "@/server/db";
import { auditLog } from "@/server/db/schema";

export type AuditAction =
  | "create" | "update" | "delete" | "send" | "upload" | "classify"
  | "login" | "consent_change" | "export" | "bulk_action"
  | "data_export" | "data_deletion" | "consent_grant" | "consent_revoke";

export interface AuditEvent {
  practiceId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  userId?: string;
  clientId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(event: AuditEvent) {
  await db.insert(auditLog).values({
    practiceId: event.practiceId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    userId: event.userId,
    clientId: event.clientId,
    changes: event.changes,
    metadata: event.metadata,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
  });
}

// Convenience helpers

export async function logConsentChange(params: {
  practiceId: string;
  clientId: string;
  channel: string;
  granted: boolean;
  method: string;
  userId?: string;
  ipAddress?: string;
}) {
  await logAuditEvent({
    practiceId: params.practiceId,
    action: params.granted ? "consent_grant" : "consent_revoke",
    entityType: "consent",
    clientId: params.clientId,
    userId: params.userId,
    changes: { channel: params.channel, granted: params.granted, method: params.method },
    ipAddress: params.ipAddress,
  });
}

export async function logDataExport(params: {
  practiceId: string;
  clientId: string;
  userId: string;
  ipAddress?: string;
}) {
  await logAuditEvent({
    practiceId: params.practiceId,
    action: "data_export",
    entityType: "client",
    clientId: params.clientId,
    userId: params.userId,
    ipAddress: params.ipAddress,
  });
}

export async function logDataDeletion(params: {
  practiceId: string;
  clientId: string;
  userId: string;
  ipAddress?: string;
}) {
  await logAuditEvent({
    practiceId: params.practiceId,
    action: "data_deletion",
    entityType: "client",
    clientId: params.clientId,
    userId: params.userId,
    ipAddress: params.ipAddress,
  });
}
