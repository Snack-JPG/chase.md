/**
 * WhatsApp Sender — Twilio integration for chase messages
 */

import { twilioClient } from "@/lib/twilio";
import { db } from "@/server/db";
import { chaseMessages } from "@/server/db/schema";
import { eq } from "drizzle-orm";

interface SendWhatsAppParams {
  messageId: string;
  to: string; // Client's WhatsApp number (E.164 format)
  from: string; // Practice's Twilio WhatsApp number
  templateSid?: string;
  templateVars?: Record<string, string>;
  bodyText: string; // Fallback for session messages
}

export async function sendWhatsAppChase(params: SendWhatsAppParams) {
  try {
    let result;

    if (params.templateSid) {
      // Use approved template (required for initiating conversations)
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
      // Session message (within 24h window)
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
