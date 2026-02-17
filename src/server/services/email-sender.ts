/**
 * Email Sender — Resend integration for chase emails
 */

import { getResend } from "@/lib/resend";
import { db } from "@/server/db";
import { chaseMessages } from "@/server/db/schema";
import { eq } from "drizzle-orm";

interface SendChaseEmailParams {
  messageId: string;
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string | null;
  replyTo?: string;
}

export async function sendChaseEmail(params: SendChaseEmailParams) {
  try {
    const result = await getResend().emails.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html || undefined,
      replyTo: params.replyTo,
      headers: {
        "X-Chase-Message-Id": params.messageId,
      },
    });

    // Update message status
    await db.update(chaseMessages)
      .set({
        status: "sent",
        externalMessageId: result.data?.id,
        sentAt: new Date(),
      })
      .where(eq(chaseMessages.id, params.messageId));

    return { success: true, id: result.data?.id };
  } catch (error) {
    // Update message as failed
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
