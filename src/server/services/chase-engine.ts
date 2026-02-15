/**
 * Chase Engine — Core scheduling logic
 *
 * This is the heart of chase.md. It determines:
 * 1. Which enrollments need chasing right now
 * 2. What channel to use (email vs WhatsApp)
 * 3. What escalation level (gentle → reminder → firm → urgent → escalate)
 * 4. When to schedule the next chase
 *
 * Called by QStash cron every 15 minutes during business hours.
 */

import { db } from "@/server/db";
import { chaseEnrollments, chaseMessages, clients, chaseCampaigns, practices, magicLinks } from "@/server/db/schema";
import { eq, and, lte, isNull, not } from "drizzle-orm";
import { addDays, isWeekend, setHours, setMinutes, isBefore, isAfter } from "date-fns";
import crypto from "crypto";

// Escalation levels in order
const ESCALATION_ORDER = ["gentle", "reminder", "firm", "urgent", "escalate"] as const;
type EscalationLevel = (typeof ESCALATION_ORDER)[number];

interface ChaseableEnrollment {
  enrollment: typeof chaseEnrollments.$inferSelect;
  client: typeof clients.$inferSelect;
  campaign: typeof chaseCampaigns.$inferSelect;
  practice: typeof practices.$inferSelect;
}

/**
 * Find all enrollments that are due for chasing right now.
 */
export async function findDueEnrollments(): Promise<ChaseableEnrollment[]> {
  const now = new Date();

  const results = await db.query.chaseEnrollments.findMany({
    where: and(
      eq(chaseEnrollments.status, "active"),
      lte(chaseEnrollments.nextChaseAt, now),
    ),
    with: {
      client: true,
      campaign: true,
      practice: true,
    },
  });

  return results.map((r) => ({
    enrollment: r,
    client: r.client,
    campaign: r.campaign,
    practice: r.practice,
  }));
}

/**
 * Determine the next escalation level based on chases delivered.
 */
export function getEscalationLevel(chasesDelivered: number, escalateAfter: number): EscalationLevel {
  if (chasesDelivered === 0) return "gentle";
  if (chasesDelivered < 2) return "reminder";
  if (chasesDelivered < escalateAfter) return "firm";
  if (chasesDelivered === escalateAfter) return "urgent";
  return "escalate";
}

/**
 * Determine which channel to use for this chase.
 * First chase: always email (introduces the system).
 * Subsequent: use client's preferred channel or practice default.
 */
export function selectChannel(
  chaseNumber: number,
  clientPreferred: string | null,
  practiceDefault: string,
): "email" | "whatsapp" | "sms" {
  // First message is always email (contains full context + magic link)
  if (chaseNumber === 0) return "email";

  // After that, use preferred channel
  const channel = clientPreferred || practiceDefault;
  if (channel === "whatsapp" || channel === "sms" || channel === "email") {
    return channel;
  }
  return "email";
}

/**
 * Calculate when the next chase should be sent.
 * Respects business hours, weekends, and bank holidays.
 */
export function calculateNextChaseDate(
  from: Date,
  daysBetween: number,
  skipWeekends: boolean,
  businessHoursStart: string,
  businessHoursEnd: string,
): Date {
  let next = addDays(from, daysBetween);

  // Skip weekends
  if (skipWeekends) {
    while (isWeekend(next)) {
      next = addDays(next, 1);
    }
  }

  // Set to business hours (send at a reasonable time)
  const [startHour, startMin] = businessHoursStart.split(":").map(Number);
  // Pick a time in the first half of business hours (feels more natural)
  const sendHour = startHour + Math.floor(Math.random() * 2) + 1; // 10:00-11:00 for 09:00 start
  next = setHours(next, sendHour);
  next = setMinutes(next, Math.floor(Math.random() * 30)); // Random minute for natural feel

  return next;
}

/**
 * Generate a magic link token for a client's upload portal.
 */
export async function getOrCreateMagicLink(
  practiceId: string,
  clientId: string,
  enrollmentId: string,
): Promise<string> {
  // Check for existing non-expired link
  const existing = await db.query.magicLinks.findFirst({
    where: and(
      eq(magicLinks.clientId, clientId),
      eq(magicLinks.enrollmentId, enrollmentId),
      eq(magicLinks.isRevoked, false),
    ),
  });

  if (existing && isAfter(new Date(existing.expiresAt), new Date())) {
    return existing.token;
  }

  // Create new magic link (valid for 90 days)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = addDays(new Date(), 90);

  await db.insert(magicLinks).values({
    practiceId,
    clientId,
    enrollmentId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Process a single enrollment chase.
 * Returns the created message record.
 */
export async function processChase(chaseable: ChaseableEnrollment) {
  const { enrollment, client, campaign, practice } = chaseable;

  const chaseNumber = enrollment.chasesDelivered ?? 0;
  const escalationLevel = getEscalationLevel(
    chaseNumber,
    campaign.escalateAfterChase ?? 4,
  );
  const channel = selectChannel(
    chaseNumber,
    client.preferredChannel,
    practice.defaultChaseChannel ?? "whatsapp",
  );

  // Get or create magic link for the upload portal
  const magicToken = await getOrCreateMagicLink(
    practice.id,
    client.id,
    enrollment.id,
  );

  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/p/${magicToken}`;

  // Generate message content based on escalation level
  const messageContent = generateChaseMessage({
    clientFirstName: client.firstName,
    practiceName: practice.name,
    escalationLevel,
    portalUrl,
    deadlineDate: campaign.deadlineDate,
    documentsNeeded: (enrollment.requiredDocumentIds as string[])?.length ?? 0,
    documentsReceived: (enrollment.receivedDocumentIds as string[])?.length ?? 0,
  });

  // Create the message record
  const [message] = await db.insert(chaseMessages).values({
    practiceId: practice.id,
    enrollmentId: enrollment.id,
    clientId: client.id,
    campaignId: campaign.id,
    channel,
    escalationLevel,
    chaseNumber: chaseNumber + 1,
    subject: messageContent.subject,
    bodyText: messageContent.bodyText,
    bodyHtml: messageContent.bodyHtml,
    status: "queued",
  }).returning();

  // Calculate and set next chase date
  const nextChaseAt = calculateNextChaseDate(
    new Date(),
    campaign.chaseDaysBetween ?? 7,
    campaign.skipWeekends ?? true,
    practice.businessHoursStart ?? "09:00",
    practice.businessHoursEnd ?? "17:30",
  );

  // Update enrollment
  await db.update(chaseEnrollments)
    .set({
      chasesDelivered: chaseNumber + 1,
      currentEscalationLevel: escalationLevel,
      lastChasedAt: new Date(),
      nextChaseAt: chaseNumber + 1 >= (campaign.maxChases ?? 6) ? null : nextChaseAt,
      updatedAt: new Date(),
    })
    .where(eq(chaseEnrollments.id, enrollment.id));

  return message;
}

/**
 * Generate chase message content based on escalation level.
 */
function generateChaseMessage(params: {
  clientFirstName: string;
  practiceName: string;
  escalationLevel: EscalationLevel;
  portalUrl: string;
  deadlineDate: Date;
  documentsNeeded: number;
  documentsReceived: number;
}) {
  const { clientFirstName, practiceName, escalationLevel, portalUrl, deadlineDate, documentsNeeded, documentsReceived } = params;
  const remaining = documentsNeeded - documentsReceived;

  const templates: Record<EscalationLevel, { subject: string; bodyText: string }> = {
    gentle: {
      subject: `${practiceName} — a few documents needed from you`,
      bodyText: `Hi ${clientFirstName},\n\nHope you're well! We need ${remaining} document${remaining !== 1 ? "s" : ""} from you to get your tax return sorted.\n\nYou can upload them here — it only takes a couple of minutes:\n${portalUrl}\n\nNo login needed, just tap the link.\n\nThanks,\n${practiceName}`,
    },
    reminder: {
      subject: `Reminder: ${remaining} document${remaining !== 1 ? "s" : ""} still needed`,
      bodyText: `Hi ${clientFirstName},\n\nJust a quick reminder — we're still waiting on ${remaining} document${remaining !== 1 ? "s" : ""} from you.\n\nUpload here: ${portalUrl}\n\nThe deadline is coming up, so the sooner the better!\n\nThanks,\n${practiceName}`,
    },
    firm: {
      subject: `Action needed: documents outstanding`,
      bodyText: `Hi ${clientFirstName},\n\nWe still need ${remaining} document${remaining !== 1 ? "s" : ""} from you and the deadline is approaching.\n\nPlease upload them as soon as possible: ${portalUrl}\n\nIf you're having trouble finding anything, just reply to this email and we'll help.\n\nThanks,\n${practiceName}`,
    },
    urgent: {
      subject: `Urgent: deadline approaching — documents needed`,
      bodyText: `Hi ${clientFirstName},\n\nThis is getting urgent — we need your remaining ${remaining} document${remaining !== 1 ? "s" : ""} to file on time.\n\nThe deadline is ${deadlineDate.toLocaleDateString("en-GB")}. Late filing means penalties.\n\nPlease upload now: ${portalUrl}\n\nIf there's an issue, let us know immediately.\n\n${practiceName}`,
    },
    escalate: {
      subject: `Final notice: documents required immediately`,
      bodyText: `Hi ${clientFirstName},\n\nWe've reached out several times about your outstanding documents. We still need ${remaining} item${remaining !== 1 ? "s" : ""}.\n\nWithout these, we cannot file your return and you may incur penalties.\n\nUpload here: ${portalUrl}\n\nAlternatively, please call us to discuss.\n\n${practiceName}`,
    },
  };

  const template = templates[escalationLevel];
  return {
    subject: template.subject,
    bodyText: template.bodyText,
    bodyHtml: null, // TODO: React Email templates
  };
}

/**
 * Main chase engine tick — called by QStash cron.
 * Finds all due enrollments and processes them.
 */
export async function runChaseTick(): Promise<{ processed: number; errors: number }> {
  const due = await findDueEnrollments();
  let processed = 0;
  let errors = 0;

  for (const enrollment of due) {
    try {
      await processChase(enrollment);
      processed++;
    } catch (error) {
      console.error(`Chase failed for enrollment ${enrollment.enrollment.id}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}
