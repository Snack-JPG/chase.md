/**
 * SMS Sender — Twilio integration for chase messages via SMS
 *
 * SMS is used as a secondary channel for clients who don't use WhatsApp.
 * Messages are plain text (no templates needed — SMS doesn't require pre-approval).
 * UK SMS pricing: ~£0.04/segment (160 chars). Chase messages typically 1-2 segments.
 */

import { twilioClient } from "@/lib/twilio";
import { db } from "@/server/db";
import { chaseMessages } from "@/server/db/schema";
import { eq } from "drizzle-orm";

interface SendSmsParams {
  messageId: string;
  to: string; // Client's phone number (E.164 format, e.g. +447700900000)
  from: string; // Practice's Twilio phone number
  bodyText: string;
}

/**
 * Shorten a chase message for SMS (160-char segments are expensive).
 * Strips the full portal URL down and trims pleasantries for subsequent chases.
 */
function compactForSms(bodyText: string): string {
  // SMS has no subject line — body only
  // Keep it concise: accountants pay per segment
  // Max ~300 chars (2 segments) to keep costs reasonable
  if (bodyText.length <= 320) return bodyText;

  // Truncate intelligently — keep first paragraph + portal link
  const lines = bodyText.split("\n").filter((l) => l.trim());
  const linkLine = lines.find((l) => l.includes("/p/"));
  const greeting = lines[0] || "";
  const firstContent = lines[1] || "";

  let compact = `${greeting}\n${firstContent}`;
  if (linkLine && !compact.includes(linkLine)) {
    compact += `\n\nUpload here: ${linkLine.trim()}`;
  }

  return compact;
}

export async function sendSmsChase(params: SendSmsParams) {
  try {
    const body = compactForSms(params.bodyText);

    const result = await twilioClient.messages.create({
      to: params.to,
      from: params.from,
      body,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`,
    });

    // Twilio returns price per segment; estimate cost in pence
    const priceFloat = result.price ? Math.abs(parseFloat(result.price)) : 0.04;
    const costPence = Math.round(priceFloat * 100);

    await db.update(chaseMessages)
      .set({
        status: "sent",
        externalMessageId: result.sid,
        sentAt: new Date(),
        costPence,
      })
      .where(eq(chaseMessages.id, params.messageId));

    return { success: true, sid: result.sid };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown SMS error";

    await db.update(chaseMessages)
      .set({
        status: "failed",
        failedAt: new Date(),
        failureReason: reason,
      })
      .where(eq(chaseMessages.id, params.messageId));

    return { success: false, error };
  }
}
