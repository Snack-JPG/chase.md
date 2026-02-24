/**
 * WhatsApp Sender — Twilio integration for chase messages
 *
 * Automatically selects template vs free-form based on conversation window.
 */

import { twilioClient } from "@/lib/twilio";
import { db } from "@/server/db";
import { chaseMessages, clients } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { isInConversationWindow } from "./whatsapp-conversation-window";

interface SendWhatsAppParams {
  messageId: string;
  to: string; // Client's WhatsApp number (E.164 format)
  from: string; // Practice's Twilio WhatsApp number
  templateSid?: string;
  templateVars?: Record<string, string>;
  bodyText: string; // Fallback for session messages
  clientId?: string; // For conversation window check
}

export async function sendWhatsAppChase(params: SendWhatsAppParams) {
  try {
    // Check conversation window if we have a clientId
    let inWindow = false;
    if (params.clientId) {
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, params.clientId),
        columns: { whatsappLastInboundAt: true },
      });
      inWindow = isInConversationWindow(client?.whatsappLastInboundAt ?? null);
    }

    let result;

    if (!inWindow && params.templateSid) {
      // Outside 24hr window — MUST use approved template
      result = await twilioClient.messages.create({
        to: `whatsapp:${params.to}`,
        from: `whatsapp:${params.from}`,
        contentSid: params.templateSid,
        contentVariables: params.templateVars
          ? JSON.stringify(params.templateVars)
          : undefined,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`,
      });
    } else {
      // Inside 24hr window OR no template — send free-form
      result = await twilioClient.messages.create({
        to: `whatsapp:${params.to}`,
        from: `whatsapp:${params.from}`,
        body: params.bodyText,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`,
      });
    }

    await db.update(chaseMessages)
      .set({
        status: "sent",
        externalMessageId: result.sid,
        sentAt: new Date(),
        costPence: Math.round((result.price ? parseFloat(result.price) : 0.04) * 100),
      })
      .where(eq(chaseMessages.id, params.messageId));

    return { success: true, sid: result.sid };
  } catch (error) {
    await db.update(chaseMessages)
      .set({
        status: "failed",
        failedAt: new Date(),
        failureReason: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(chaseMessages.id, params.messageId));

    return { success: false, error };
  }
}
