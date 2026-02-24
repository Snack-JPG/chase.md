/**
 * Inbound WhatsApp Message Handler
 *
 * Handles client replies via WhatsApp:
 * - Matches sender phone to client record
 * - "done"/"uploaded"/"sent" → logs as note
 * - Media messages → queues for AI classification
 * - Questions/other → logs as note + notifies practice
 * - Always validates Twilio signature
 * - Updates 24hr conversation window
 */

import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { clients, clientNotes, clientDocuments, chaseEnrollments, auditLog } from "@/server/db/schema";
import { eq, or, and, isNull } from "drizzle-orm";
import twilio from "twilio";
import { updateConversationWindow } from "@/server/services/whatsapp-conversation-window";
import { classifyDocument } from "@/server/services/document-classifier";

const authToken = process.env.TWILIO_AUTH_TOKEN!;

// Patterns that indicate the client has completed an action
const COMPLETION_PATTERNS = /^(done|uploaded|sent|finished|completed|yes|sorted|all sent|all done)\s*[.!]?\s*$/i;

export async function POST(req: Request) {
  const body = await req.formData();

  // Validate Twilio signature
  const signature = req.headers.get("x-twilio-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/inbound`;
  const params: Record<string, string> = {};
  body.forEach((value, key) => {
    params[key] = value.toString();
  });

  const isValid = twilio.validateRequest(authToken, signature, url, params);
  if (!isValid) {
    console.error("Twilio inbound webhook signature validation failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const from = params.From?.replace("whatsapp:", "") || "";
  const messageBody = params.Body?.trim() || "";
  const messageSid = params.MessageSid || "";
  const numMedia = parseInt(params.NumMedia || "0", 10);

  if (!from) {
    return NextResponse.json({ error: "No sender" }, { status: 400 });
  }

  // Match sender phone to a client record
  const client = await db.query.clients.findFirst({
    where: or(
      eq(clients.whatsappPhone, from),
      eq(clients.phone, from),
    ),
    with: { practice: true },
  });

  if (!client) {
    console.warn(`Inbound WhatsApp from unknown number: ${from}`);
    // Respond with a generic message — don't reveal system details
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks for your message. We couldn't match your number to an account. Please contact your accountant directly.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  // Update conversation window
  await updateConversationWindow(client.id);

  // Handle media messages (photos of receipts/docs)
  if (numMedia > 0) {
    await handleMediaMessage(client, params, messageSid);
  }

  // Handle text messages
  if (messageBody) {
    if (COMPLETION_PATTERNS.test(messageBody)) {
      // Client says they've done it — log as completion note
      await db.insert(clientNotes).values({
        practiceId: client.practiceId,
        clientId: client.id,
        source: "whatsapp_inbound",
        content: `Client replied: "${messageBody}" — indicates documents uploaded/sent.`,
        externalMessageId: messageSid,
      });

      await db.insert(auditLog).values({
        practiceId: client.practiceId,
        action: "update",
        entityType: "client_note",
        clientId: client.id,
        metadata: { source: "whatsapp_inbound", type: "completion", body: messageBody },
      });

      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks ${client.firstName}! We'll check and let you know if we need anything else. 👍</Message></Response>`,
        { headers: { "Content-Type": "text/xml" } },
      );
    } else {
      // Question or general message — log as note
      await db.insert(clientNotes).values({
        practiceId: client.practiceId,
        clientId: client.id,
        source: "whatsapp_inbound",
        content: messageBody,
        externalMessageId: messageSid,
      });

      await db.insert(auditLog).values({
        practiceId: client.practiceId,
        action: "update",
        entityType: "client_note",
        clientId: client.id,
        metadata: { source: "whatsapp_inbound", type: "message", body: messageBody },
      });

      // TODO: Notify practice staff about client question (email/push notification)

      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks for your message, ${client.firstName}. Your accountant will get back to you shortly.</Message></Response>`,
        { headers: { "Content-Type": "text/xml" } },
      );
    }
  }

  // Media-only message (no text body) — already handled above
  if (numMedia > 0 && !messageBody) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks ${client.firstName}! We've received your document and will process it shortly. 📄</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  return NextResponse.json({ received: true });
}

/**
 * Handle media attachments from WhatsApp messages.
 * Creates document records and queues for AI classification.
 */
async function handleMediaMessage(
  client: { id: string; practiceId: string; firstName: string },
  params: Record<string, string>,
  messageSid: string,
) {
  const numMedia = parseInt(params.NumMedia || "0", 10);

  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = params[`MediaUrl${i}`];
    const mediaType = params[`MediaContentType${i}`];

    if (!mediaUrl) continue;

    // Find the client's active enrollment to link the document
    const enrollment = await db.query.chaseEnrollments.findFirst({
      where: and(
        eq(chaseEnrollments.clientId, client.id),
        eq(chaseEnrollments.status, "active"),
      ),
    });

    // Create a document record
    const [doc] = await db.insert(clientDocuments).values({
      practiceId: client.practiceId,
      clientId: client.id,
      enrollmentId: enrollment?.id,
      campaignId: enrollment?.campaignId,
      fileName: `whatsapp-${messageSid}-${i}`,
      mimeType: mediaType || "application/octet-stream",
      status: "processing",
      uploadedVia: "whatsapp",
      // Store Twilio media URL — in production, download and store in R2
      r2Key: mediaUrl,
    }).returning();

    // Log as note
    await db.insert(clientNotes).values({
      practiceId: client.practiceId,
      clientId: client.id,
      source: "whatsapp_inbound",
      content: `Document received via WhatsApp (${mediaType || "unknown type"})`,
      mediaUrl,
      mediaType,
      externalMessageId: messageSid,
    });

    // Queue for AI classification
    try {
      await classifyDocument(doc.id);
    } catch (err) {
      console.error(`Failed to classify WhatsApp document ${doc.id}:`, err);
    }

    await db.insert(auditLog).values({
      practiceId: client.practiceId,
      action: "upload",
      entityType: "client_document",
      entityId: doc.id,
      clientId: client.id,
      metadata: { source: "whatsapp", mediaType, mediaUrl },
    });
  }
}
