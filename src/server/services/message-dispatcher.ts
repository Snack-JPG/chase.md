/**
 * Message Dispatcher — Routes chase messages to the correct channel
 */

import { db } from "@/server/db";
import { chaseMessages, clients, practices } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { sendChaseEmail } from "./email-sender";
import { sendWhatsAppChase } from "./whatsapp-sender";

/**
 * Dispatch a queued chase message to the appropriate channel.
 */
export async function dispatchMessage(messageId: string) {
  const message = await db.query.chaseMessages.findFirst({
    where: eq(chaseMessages.id, messageId),
    with: {
      client: true,
      practice: true,
    },
  });

  if (!message) throw new Error(`Message ${messageId} not found`);
  if (message.status !== "queued") return; // Already processed

  const client = message.client;
  const practice = message.practice;

  switch (message.channel) {
    case "email": {
      if (!client.email) {
        await markFailed(messageId, "Client has no email address");
        return;
      }
      const fromDomain = practice.customEmailDomain || "chase.md";
      const fromName = practice.fromEmailName || practice.name;

      await sendChaseEmail({
        messageId,
        to: client.email,
        from: `${fromName} <chase@${fromDomain}>`,
        subject: message.subject || "Documents needed",
        text: message.bodyText,
        html: message.bodyHtml,
        replyTo: practice.email,
      });
      break;
    }

    case "whatsapp": {
      const whatsappNumber = client.whatsappPhone || client.phone;
      if (!whatsappNumber) {
        await markFailed(messageId, "Client has no WhatsApp/phone number");
        return;
      }
      if (!practice.twilioWhatsappNumber) {
        await markFailed(messageId, "Practice has no WhatsApp number configured");
        return;
      }

      await sendWhatsAppChase({
        messageId,
        to: whatsappNumber,
        from: practice.twilioWhatsappNumber,
        templateSid: message.whatsappTemplateName || undefined,
        bodyText: message.bodyText,
      });
      break;
    }

    case "sms":
      // TODO: SMS via Twilio (V2)
      await markFailed(messageId, "SMS channel not yet implemented");
      break;
  }
}

async function markFailed(messageId: string, reason: string) {
  await db.update(chaseMessages)
    .set({
      status: "failed",
      failedAt: new Date(),
      failureReason: reason,
    })
    .where(eq(chaseMessages.id, messageId));
}

/**
 * Dispatch all queued messages (called after chase engine tick).
 */
export async function dispatchQueuedMessages() {
  const queued = await db.query.chaseMessages.findMany({
    where: eq(chaseMessages.status, "queued"),
  });

  const results = { sent: 0, failed: 0 };

  for (const message of queued) {
    try {
      await dispatchMessage(message.id);
      results.sent++;
    } catch (error) {
      console.error(`Failed to dispatch message ${message.id}:`, error);
      results.failed++;
    }
  }

  return results;
}
