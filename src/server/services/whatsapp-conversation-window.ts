/**
 * WhatsApp Conversation Window Tracking
 *
 * WhatsApp Business API rules:
 * - When a client sends a message, a 24hr "conversation window" opens
 * - Inside the window: can send free-form text (no template needed)
 * - Outside the window: MUST use an approved message template
 *
 * We track `whatsappLastInboundAt` on the client record.
 */

import { db } from "@/server/db";
import { clients } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const CONVERSATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if a client is within the 24hr conversation window.
 */
export function isInConversationWindow(lastInboundAt: Date | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - new Date(lastInboundAt).getTime() < CONVERSATION_WINDOW_MS;
}

/**
 * Update the conversation window timestamp for a client (called on inbound message).
 */
export async function updateConversationWindow(clientId: string): Promise<void> {
  await db.update(clients)
    .set({ whatsappLastInboundAt: new Date(), updatedAt: new Date() })
    .where(eq(clients.id, clientId));
}

/**
 * Check conversation window for a client by ID.
 */
export async function checkConversationWindow(clientId: string): Promise<boolean> {
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
    columns: { whatsappLastInboundAt: true },
  });
  return isInConversationWindow(client?.whatsappLastInboundAt ?? null);
}
