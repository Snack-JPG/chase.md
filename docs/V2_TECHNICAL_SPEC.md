# chase.md V2 Technical Specification

> **Version:** 2.0.0-draft  
> **Date:** 2026-02-28  
> **Author:** Auto-generated from V1 codebase analysis  
> **Status:** Implementation-ready specification  
> **V1 Baseline:** 3,089 lines, 68 files, Next.js 14 + tRPC + Drizzle + Neon + Clerk + Stripe + Twilio + Resend + QStash + R2

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Event Sourcing Foundation](#2-event-sourcing-foundation)
3. [Feature 1: Auto-Pause on Reply](#3-feature-1-auto-pause-on-reply)
4. [Feature 2: Event-Driven Sequence Engine](#4-feature-2-event-driven-sequence-engine)
5. [Feature 3: Progress-Based Dynamic Messaging](#5-feature-3-progress-based-dynamic-messaging)
6. [Feature 4: Response Classifier (AI-Powered)](#6-feature-4-response-classifier-ai-powered)
7. [Feature 5: Out-of-Office / Absence Detection](#7-feature-5-out-of-office--absence-detection)
8. [Feature 6: Smart Send Time Optimisation](#8-feature-6-smart-send-time-optimisation)
9. [Feature 7: Unified Response Hub](#9-feature-7-unified-response-hub)
10. [Feature 8: Chase Analytics Dashboard V2](#10-feature-8-chase-analytics-dashboard-v2)
11. [Feature 9: Chase Template Library](#11-feature-9-chase-template-library)
12. [Feature 10: A/B Testing for Chase Sequences](#12-feature-10-ab-testing-for-chase-sequences)
13. [Migration Strategy](#13-migration-strategy)
14. [AI Cost Model](#14-ai-cost-model)
15. [WebSocket Real-Time Layer](#15-websocket-real-time-layer)
16. [Implementation Order](#16-implementation-order)

---

## 1. Architecture Overview

### V2 Architectural Principles

1. **Event-sourced chase state** — Every state change emits an event to `chase_events`. Enables analytics, replay, debugging, and the event-driven sequence engine.
2. **AI costs must be predictable** — Claude Haiku 3.5 for all classification (~$0.25/1M input tokens). Sonnet 3.5 only for complex date parsing in OOO detection. Never Opus.
3. **Graceful degradation** — If AI classification fails or returns low confidence (<0.6), fall back to "flag for human review". Never block a chase on AI.
4. **Privacy-first** — All client PII encrypted at rest (Neon default). AI prompts never include unnecessary PII. No client data in logs.
5. **Real-time updates** — WebSocket (Partykit or Soketi on Cloudflare) for dashboard push. No polling.

### Tech Stack Additions (V2)

| Component | Technology | Reason |
|-----------|-----------|--------|
| Event bus | `chase_events` table + QStash | Simple, auditable, no new infra |
| WebSocket | PartyKit (Cloudflare) | Serverless WebSocket, pairs with Next.js |
| AI Classification | Anthropic Claude 3.5 Haiku | Cheap, fast, good enough for intent classification |
| Date parsing | Anthropic Claude 3.5 Sonnet | Only for complex natural language date extraction |
| Background jobs | QStash (existing) | Already in V1, extend with more job types |
| Caching | Upstash Redis (existing) | Send time patterns, engagement scores |

### System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js App Router                      │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
│  │Dashboard │  │ Response │  │ Analytics │  │ Template │ │
│  │   V2    │  │   Hub    │  │Dashboard  │  │ Library  │ │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘ │
│       │            │              │              │        │
│       └────────────┴──────┬───────┴──────────────┘        │
│                           │                               │
│                    ┌──────┴──────┐                        │
│                    │  tRPC Router │                        │
│                    └──────┬──────┘                        │
└───────────────────────────┼──────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────┴──────┐  ┌────────┴───────┐  ┌───────┴────────┐
│ Event Engine │  │  AI Classifier │  │  Send Time     │
│  (QStash)    │  │  (Haiku/Sonnet)│  │  Optimiser     │
└───────┬──────┘  └────────┬───────┘  └───────┬────────┘
        │                  │                   │
        └──────────────────┼───────────────────┘
                           │
                    ┌──────┴──────┐
                    │chase_events │ ← Event Source of Truth
                    │   (Neon)    │
                    └─────────────┘
```

---

## 2. Event Sourcing Foundation

This is the backbone for V2. Every feature depends on it.

### New Table: `chase_events`

```typescript
export const chaseEventTypeEnum = pgEnum("chase_event_type", [
  // Chase lifecycle
  "chase_created", "chase_scheduled", "chase_sent", "chase_delivered",
  "chase_failed", "chase_paused", "chase_resumed", "chase_cancelled",
  "chase_escalated", "chase_completed",
  // Client engagement
  "email_opened", "email_clicked", "link_clicked",
  "portal_visited", "portal_upload_started", "portal_upload_completed",
  // Document events
  "document_uploaded", "document_classified", "document_accepted",
  "document_rejected",
  // Reply events
  "reply_received", "reply_classified", "reply_processed",
  "attachment_received", "attachment_classified",
  // Absence events
  "ooo_detected", "ooo_return_scheduled", "absence_detected",
  // System events
  "sequence_step_triggered", "sequence_step_skipped",
  "ab_variant_assigned", "send_time_optimised",
  // Accountant actions
  "manual_pause", "manual_resume", "manual_reassign",
  "classification_corrected", "reply_reclassified",
]);

export const chaseEvents = pgTable("chase_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  enrollmentId: uuid("enrollment_id").references(() => chaseEnrollments.id),
  clientId: uuid("client_id").references(() => clients.id),
  campaignId: uuid("campaign_id").references(() => chaseCampaigns.id),
  messageId: uuid("message_id").references(() => chaseMessages.id),
  documentId: uuid("document_id").references(() => clientDocuments.id),

  eventType: chaseEventTypeEnum("event_type").notNull(),
  channel: channelEnum("channel"),

  // Flexible payload for event-specific data
  payload: jsonb("payload").default({}).notNull(),
  // Example payloads:
  // reply_classified: { intent: "sending_soon", confidence: 0.92, rawText: "...", parsedDate: "2026-03-05" }
  // email_opened: { messageId: "...", openedAt: "...", userAgent: "..." }
  // ooo_detected: { returnDate: "2026-03-10", rawAutoReply: "..." }
  // ab_variant_assigned: { testId: "...", variant: "A", subjectLine: "..." }

  // Who/what triggered this event
  triggeredBy: varchar("triggered_by", { length: 50 }).notNull(), // "system", "webhook", "cron", "user:{userId}"
  
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("events_practice_id_idx").on(t.practiceId),
  index("events_enrollment_id_idx").on(t.enrollmentId),
  index("events_client_id_idx").on(t.clientId),
  index("events_event_type_idx").on(t.eventType),
  index("events_created_at_idx").on(t.createdAt),
  index("events_unprocessed_idx").on(t.processedAt).where(sql`processed_at IS NULL`),
]);
```

### Event Emission Helper

```typescript
// src/server/services/event-emitter.ts
import { db } from "@/server/db";
import { chaseEvents } from "@/server/db/schema";

type EmitEventParams = {
  practiceId: string;
  eventType: typeof chaseEvents.$inferInsert["eventType"];
  enrollmentId?: string;
  clientId?: string;
  campaignId?: string;
  messageId?: string;
  documentId?: string;
  channel?: "email" | "sms" | "whatsapp";
  payload?: Record<string, unknown>;
  triggeredBy: string;
};

export async function emitChaseEvent(params: EmitEventParams) {
  const [event] = await db.insert(chaseEvents).values(params).returning();
  
  // Fan out to QStash for async processing
  await qstash.publishJSON({
    url: `${process.env.APP_URL}/api/events/process`,
    body: { eventId: event.id },
    retries: 3,
  });
  
  // Push to WebSocket for real-time UI updates
  await pushToPartyKit(params.practiceId, {
    type: "chase_event",
    event: { ...event },
  });

  return event;
}
```

### Event Processor Endpoint

```typescript
// src/app/api/events/process/route.ts
// QStash calls this for each event. Routes to feature-specific handlers.
export async function POST(req: Request) {
  const { eventId } = await req.json();
  const event = await db.query.chaseEvents.findFirst({ where: eq(chaseEvents.id, eventId) });
  
  const handlers: Record<string, (event) => Promise<void>> = {
    reply_received: handleReplyReceived,       // → Feature 1, 4
    email_opened: handleEngagementEvent,       // → Feature 2, 6, 8
    email_clicked: handleEngagementEvent,
    portal_visited: handlePortalEvent,          // → Feature 2
    document_uploaded: handleDocumentUploaded,  // → Feature 2, 3
    ooo_detected: handleOOODetected,           // → Feature 5
    // ...
  };
  
  await handlers[event.eventType]?.(event);
  await db.update(chaseEvents).set({ processedAt: new Date() }).where(eq(chaseEvents.id, eventId));
}
```

---

## 3. Feature 1: Auto-Pause on Reply (CRITICAL — #1 Priority)

### Overview

When a client replies to any chase message (email, SMS, WhatsApp), the system immediately pauses their chase sequence, classifies the reply intent, and takes appropriate action.

### Data Model Changes

#### New Table: `chase_replies`

```typescript
export const replyIntentEnum = pgEnum("reply_intent", [
  "sending_soon", "need_help", "dont_have", "already_sent",
  "wrong_person", "refusing", "out_of_office", "irrelevant",
  "has_attachment", "unknown",
]);

export const replyStatusEnum = pgEnum("reply_status", [
  "received", "classifying", "classified", "action_taken",
  "flagged_for_review", "reviewed", "dismissed",
]);

export const chaseReplies = pgTable("chase_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  enrollmentId: uuid("enrollment_id").references(() => chaseEnrollments.id),
  messageId: uuid("message_id").references(() => chaseMessages.id), // the chase message being replied to

  channel: channelEnum("channel").notNull(),
  rawContent: text("raw_content").notNull(),
  externalMessageId: varchar("external_message_id", { length: 255 }),
  
  // AI classification results
  intent: replyIntentEnum("intent"),
  intentConfidence: decimal("intent_confidence", { precision: 5, scale: 4 }),
  aiRawResponse: jsonb("ai_raw_response"),
  classifiedAt: timestamp("classified_at", { withTimezone: true }),
  
  // Extracted data
  parsedDate: timestamp("parsed_date", { withTimezone: true }), // e.g., "sending Thursday" → date
  parsedDateText: varchar("parsed_date_text", { length: 255 }), // raw text that was parsed
  
  // Attachments
  hasAttachment: boolean("has_attachment").default(false),
  attachmentDocumentIds: jsonb("attachment_document_ids").default([]),
  
  // Action taken
  status: replyStatusEnum("status").default("received").notNull(),
  actionTaken: varchar("action_taken", { length: 255 }), // "paused", "rescheduled:2026-03-05", "flagged", "auto_processed"
  actionAt: timestamp("action_at", { withTimezone: true }),
  
  // Human review
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  correctedIntent: replyIntentEnum("corrected_intent"), // if accountant disagrees with AI
  reviewNotes: text("review_notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("replies_practice_id_idx").on(t.practiceId),
  index("replies_client_id_idx").on(t.clientId),
  index("replies_enrollment_id_idx").on(t.enrollmentId),
  index("replies_status_idx").on(t.status),
  index("replies_created_at_idx").on(t.createdAt),
]);
```

#### Column Additions to `chase_enrollments`

```typescript
// Add to chaseEnrollments:
pausedAt: timestamp("paused_at", { withTimezone: true }),
pauseReason: varchar("pause_reason", { length: 255 }), // "reply:sending_soon", "ooo:return:2026-03-10", "manual"
resumeAt: timestamp("resume_at", { withTimezone: true }), // scheduled auto-resume
lastReplyId: uuid("last_reply_id").references(() => chaseReplies.id),
```

### Inbound Message Flow

```
Twilio Webhook (SMS/WhatsApp)  →  /api/webhooks/twilio/inbound
Resend Inbound (Email)         →  /api/webhooks/email/inbound   [NEW]
        │
        ▼
   1. Match to client (by phone/email)
   2. Match to active enrollment (by client + campaign)
   3. IMMEDIATELY pause enrollment (set status="paused", pausedAt=now())
   4. Insert into chase_replies (status="received")
   5. Emit event: reply_received
   6. If has attachment → extract, upload to R2, emit attachment_received
        │
        ▼
   QStash → /api/events/process → handleReplyReceived
        │
        ▼
   7. Call AI classifier (Feature 4) 
   8. Based on intent + confidence:
      - High confidence (≥0.8): auto-action
      - Medium confidence (0.6-0.8): auto-action + flag for review
      - Low confidence (<0.6): flag for review only
```

### API Endpoints

```typescript
// New tRPC router: src/server/trpc/routers/replies.ts

export const repliesRouter = router({
  // List replies for practice (used by Response Hub)
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["received", "classifying", "classified", "action_taken", "flagged_for_review", "reviewed", "dismissed"]).optional(),
      clientId: z.string().uuid().optional(),
      enrollmentId: z.string().uuid().optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  // Get single reply with full context
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  // Accountant reviews/corrects a reply classification
  review: protectedProcedure
    .input(z.object({
      replyId: z.string().uuid(),
      correctedIntent: z.enum([...replyIntentEnum.enumValues]).optional(),
      action: z.enum(["approve", "reclassify", "dismiss"]),
      notes: z.string().optional(),
      resumeAt: z.string().datetime().optional(), // manual reschedule
    }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Manual resume of paused enrollment
  resumeChase: protectedProcedure
    .input(z.object({
      enrollmentId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Manual cancel of chase
  cancelChase: protectedProcedure
    .input(z.object({
      enrollmentId: z.string().uuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

### Webhook Endpoints

```typescript
// NEW: src/app/api/webhooks/email/inbound/route.ts
// Resend inbound email webhook — catches replies to chase emails
export async function POST(req: Request) {
  const body = await req.json();
  // Resend sends: from, to, subject, text, html, attachments[]
  
  // 1. Parse "to" address to extract practice + enrollment context
  //    Reply-to format: reply+{enrollmentId}@chase.md (or custom domain)
  // 2. Match client by from address
  // 3. Process through shared reply handler
}

// MODIFY: src/app/api/webhooks/twilio/inbound/route.ts  
// Already exists in V1 — extend to emit reply_received event and auto-pause
```

### Reply-To Email Architecture

```
Outbound chase email:
  From: chase@{practice-domain}.chase.md
  Reply-To: reply+{enrollmentId}@inbound.chase.md

Resend inbound webhook configured on: inbound.chase.md
  → Receives reply
  → Parses enrollmentId from address
  → Routes to reply handler
```

### Auto-Action Matrix

| Intent | Confidence ≥ 0.8 | Confidence 0.6-0.8 | Confidence < 0.6 |
|--------|------------------|--------------------|--------------------|
| `sending_soon` | Pause, reschedule +5d (or parsed date) | Same + flag | Flag only, keep paused |
| `need_help` | Pause, flag, send help resources | Same + flag | Flag only, keep paused |
| `dont_have` | Pause, flag accountant | Same | Flag only, keep paused |
| `already_sent` | Pause, flag for verification | Same | Flag only, keep paused |
| `wrong_person` | Pause, alert accountant | Same | Flag only, keep paused |
| `refusing` | Pause, escalate immediately | Same | Flag only, keep paused |
| `out_of_office` | Pause, resume on return+1d | Same + flag | Flag only, keep paused |
| `has_attachment` | Pause, process attachment through doc classifier | Same | Same |
| `irrelevant` | Continue sequence (unpause) | Flag for review | Flag for review |

### Attachment Processing

```typescript
async function handleAttachmentReply(reply: ChaseReply, attachments: Attachment[]) {
  for (const attachment of attachments) {
    // 1. Upload to R2 (reuse existing portal upload logic)
    const r2Key = await uploadToR2(attachment.buffer, attachment.filename);
    
    // 2. Create clientDocument record
    const doc = await db.insert(clientDocuments).values({
      practiceId: reply.practiceId,
      clientId: reply.clientId,
      enrollmentId: reply.enrollmentId,
      fileName: attachment.filename,
      fileSize: attachment.size,
      mimeType: attachment.contentType,
      r2Key,
      r2Bucket: "chase-documents",
      status: "processing",
      uploadedVia: `reply:${reply.channel}`,
    }).returning();
    
    // 3. Run through existing AI document classifier
    await classifyDocument(doc[0].id);
    
    // 4. Emit event
    await emitChaseEvent({
      practiceId: reply.practiceId,
      eventType: "attachment_received",
      enrollmentId: reply.enrollmentId,
      clientId: reply.clientId,
      documentId: doc[0].id,
      channel: reply.channel,
      triggeredBy: "webhook",
    });
  }
}
```

---

## 4. Feature 2: Event-Driven Sequence Engine

### Overview

Replace V1's pure time-based cron ("chase every N days") with an event+time hybrid. Each sequence step can wait for an event OR a timeout, whichever comes first.

### Data Model Changes

#### New Table: `sequence_steps`

```typescript
export const stepTriggerTypeEnum = pgEnum("step_trigger_type", [
  "delay",           // Pure time-based (V1 behaviour)
  "event",           // Wait for specific event
  "event_or_delay",  // Wait for event, but escalate after timeout
  "condition",       // Evaluate a condition (e.g., completion % > 50)
]);

export const sequenceSteps = pgTable("sequence_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => chaseCampaigns.id),
  
  stepNumber: integer("step_number").notNull(),
  name: varchar("name", { length: 255 }),
  
  // Trigger configuration
  triggerType: stepTriggerTypeEnum("trigger_type").notNull(),
  
  // For delay / event_or_delay: how long to wait
  delayDays: integer("delay_days"),
  delayHours: integer("delay_hours"),
  
  // For event / event_or_delay: which event to wait for
  waitForEvent: varchar("wait_for_event", { length: 100 }), // e.g., "document_uploaded", "portal_visited"
  
  // For condition: JS-like expression evaluated against enrollment state
  // e.g., "completionPercent >= 100" or "completionPercent > 0 && completionPercent < 100"
  condition: text("condition"),
  
  // What to do when triggered
  actionType: varchar("action_type", { length: 50 }).notNull(),
  // "send_chase", "send_nudge", "send_help", "send_celebration", "escalate", "pause", "complete"
  
  channel: channelEnum("channel"), // null = use campaign default / smart selection
  escalationLevel: escalationLevelEnum("escalation_level"),
  
  // Message template (supports Handlebars variables)
  messageTemplateId: uuid("message_template_id").references(() => messageTemplates.id),
  subjectTemplate: varchar("subject_template", { length: 500 }),
  bodyTemplate: text("body_template"),
  
  // A/B test variant (null = no test)
  abTestId: uuid("ab_test_id").references(() => abTests.id),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("steps_campaign_id_idx").on(t.campaignId),
  uniqueIndex("steps_campaign_step_idx").on(t.campaignId, t.stepNumber),
]);
```

#### New Table: `enrollment_step_state`

Tracks where each enrollment is in the sequence.

```typescript
export const enrollmentStepStateEnum = pgEnum("enrollment_step_state", [
  "pending", "waiting", "triggered", "skipped", "completed",
]);

export const enrollmentStepStates = pgTable("enrollment_step_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  enrollmentId: uuid("enrollment_id").notNull().references(() => chaseEnrollments.id),
  stepId: uuid("step_id").notNull().references(() => sequenceSteps.id),
  
  state: enrollmentStepStateEnum("state").default("pending").notNull(),
  
  // When this step becomes active (waiting)
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  // When the timeout fires (for event_or_delay)
  timeoutAt: timestamp("timeout_at", { withTimezone: true }),
  // When the step actually triggered
  triggeredAt: timestamp("triggered_at", { withTimezone: true }),
  // What triggered it: "event:{eventType}", "timeout", "condition"
  triggerSource: varchar("trigger_source", { length: 100 }),
  
  // The message sent (if action = send_chase)
  messageId: uuid("message_id").references(() => chaseMessages.id),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("step_state_enrollment_idx").on(t.enrollmentId),
  uniqueIndex("step_state_enrollment_step_idx").on(t.enrollmentId, t.stepId),
  index("step_state_timeout_idx").on(t.timeoutAt).where(sql`state = 'waiting'`),
]);
```

### Sequence Engine Logic

```typescript
// src/server/services/sequence-engine.ts

export class SequenceEngine {
  /**
   * Called when an enrollment is created or resumed.
   * Activates the next pending step.
   */
  async activateNextStep(enrollmentId: string) {
    const enrollment = await getEnrollmentWithSteps(enrollmentId);
    const nextStep = enrollment.stepStates.find(s => s.state === "pending");
    if (!nextStep) {
      // All steps completed — mark enrollment complete
      await completeEnrollment(enrollmentId);
      return;
    }

    const step = nextStep.step;
    const now = new Date();
    
    switch (step.triggerType) {
      case "delay":
        // Schedule timeout
        const timeoutAt = addDays(addHours(now, step.delayHours ?? 0), step.delayDays ?? 0);
        await updateStepState(nextStep.id, {
          state: "waiting",
          activatedAt: now,
          timeoutAt,
        });
        // Schedule QStash job for timeout
        await scheduleStepTimeout(enrollmentId, nextStep.id, timeoutAt);
        break;

      case "event":
        // Just wait — event processor will trigger this
        await updateStepState(nextStep.id, {
          state: "waiting",
          activatedAt: now,
        });
        break;

      case "event_or_delay":
        const timeout = addDays(addHours(now, step.delayHours ?? 0), step.delayDays ?? 0);
        await updateStepState(nextStep.id, {
          state: "waiting",
          activatedAt: now,
          timeoutAt: timeout,
        });
        await scheduleStepTimeout(enrollmentId, nextStep.id, timeout);
        break;

      case "condition":
        // Evaluate immediately — if true, trigger; if false, re-evaluate on next event
        if (evaluateCondition(step.condition, enrollment)) {
          await triggerStep(enrollmentId, nextStep.id, "condition");
        } else {
          await updateStepState(nextStep.id, {
            state: "waiting",
            activatedAt: now,
          });
        }
        break;
    }
  }

  /**
   * Called by event processor when a relevant event occurs.
   * Checks if any waiting step should be triggered.
   */
  async handleEvent(enrollmentId: string, eventType: string) {
    const waitingSteps = await getWaitingSteps(enrollmentId);
    
    for (const stepState of waitingSteps) {
      const step = stepState.step;
      
      // Check if this event matches what the step is waiting for
      if (step.waitForEvent === eventType || step.triggerType === "condition") {
        if (step.triggerType === "condition") {
          const enrollment = await getEnrollment(enrollmentId);
          if (!evaluateCondition(step.condition, enrollment)) continue;
        }
        await triggerStep(enrollmentId, stepState.id, `event:${eventType}`);
        return; // Only trigger one step per event
      }
    }
  }

  /**
   * Called by QStash when a step timeout fires.
   */
  async handleTimeout(enrollmentId: string, stepStateId: string) {
    const stepState = await getStepState(stepStateId);
    if (stepState.state !== "waiting") return; // Already triggered by event
    
    await triggerStep(enrollmentId, stepStateId, "timeout");
  }

  /**
   * Execute the step's action and advance to next step.
   */
  async triggerStep(enrollmentId: string, stepStateId: string, source: string) {
    const stepState = await getStepState(stepStateId);
    const step = stepState.step;
    const enrollment = await getEnrollmentWithContext(enrollmentId);
    
    // Build dynamic message (Feature 3)
    const message = await buildDynamicMessage(step, enrollment);
    
    // Apply send time optimisation (Feature 6)
    const sendAt = await getOptimalSendTime(enrollment.clientId, enrollment.practiceId);
    
    // Apply A/B test variant if configured (Feature 10)
    const variant = step.abTestId 
      ? await assignABVariant(step.abTestId, enrollmentId)
      : null;
    
    // Dispatch message
    const messageId = await dispatchChaseMessage({
      enrollment,
      step,
      message: variant?.message ?? message,
      sendAt,
      variant,
    });
    
    // Update state
    await updateStepState(stepStateId, {
      state: "triggered",
      triggeredAt: new Date(),
      triggerSource: source,
      messageId,
    });
    
    // Emit event
    await emitChaseEvent({
      practiceId: enrollment.practiceId,
      eventType: "sequence_step_triggered",
      enrollmentId,
      clientId: enrollment.clientId,
      campaignId: enrollment.campaignId,
      messageId,
      payload: { stepNumber: step.stepNumber, source, variant: variant?.id },
      triggeredBy: "system",
    });
    
    // Activate next step
    await this.activateNextStep(enrollmentId);
  }
}
```

### Predefined Event-Driven Patterns

```typescript
// Example: Standard SA100 chase sequence with event-driven steps
const sa100Sequence: SequenceStep[] = [
  {
    stepNumber: 1,
    name: "Initial request",
    triggerType: "delay",
    delayDays: 0,
    actionType: "send_chase",
    escalationLevel: "gentle",
    channel: "email",
  },
  {
    stepNumber: 2,
    name: "Wait for portal visit or 3 days",
    triggerType: "event_or_delay",
    waitForEvent: "portal_visited",
    delayDays: 3,
    actionType: "send_nudge",
    escalationLevel: "gentle",
    subjectTemplate: "Quick reminder: {{practiceName}} needs your documents",
    bodyTemplate: "Hi {{firstName}}, we noticed you haven't had a chance to visit your upload portal yet...",
  },
  {
    stepNumber: 3,
    name: "Portal visited but no upload — offer help",
    triggerType: "event_or_delay",
    waitForEvent: "document_uploaded",
    delayDays: 4,
    condition: "portalVisited && completionPercent === 0",
    actionType: "send_help",
    escalationLevel: "reminder",
  },
  {
    stepNumber: 4,
    name: "Partial upload — chase remaining",
    triggerType: "condition",
    condition: "completionPercent > 0 && completionPercent < 100",
    delayDays: 5,
    actionType: "send_chase",
    escalationLevel: "reminder",
    bodyTemplate: "Hi {{firstName}}, great progress! You've returned {{done}} of {{total}} documents...",
  },
  {
    stepNumber: 5,
    name: "Firm reminder",
    triggerType: "event_or_delay",
    waitForEvent: "document_uploaded",
    delayDays: 7,
    actionType: "send_chase",
    escalationLevel: "firm",
    channel: "sms", // Escalate to SMS
  },
  {
    stepNumber: 6,
    name: "Final escalation",
    triggerType: "delay",
    delayDays: 7,
    actionType: "send_chase",
    escalationLevel: "urgent",
    channel: "whatsapp",
  },
];
```

### Modified Cron Job

```typescript
// MODIFY: src/app/api/cron/chase/route.ts
// V1: Cron iterates all active enrollments and sends if nextChaseAt <= now
// V2: Cron only handles step timeouts and scheduled resumes

export async function POST(req: Request) {
  // Verify QStash signature (existing)

  // 1. Process timed-out steps
  const timedOutSteps = await db.query.enrollmentStepStates.findMany({
    where: and(
      eq(enrollmentStepStates.state, "waiting"),
      lte(enrollmentStepStates.timeoutAt, new Date()),
    ),
    limit: 100,
  });
  
  for (const step of timedOutSteps) {
    await sequenceEngine.handleTimeout(step.enrollmentId, step.id);
  }

  // 2. Process scheduled resumes (from auto-pause)
  const resumable = await db.query.chaseEnrollments.findMany({
    where: and(
      eq(chaseEnrollments.status, "paused"),
      lte(chaseEnrollments.resumeAt, new Date()),
    ),
    limit: 100,
  });
  
  for (const enrollment of resumable) {
    await resumeEnrollment(enrollment.id);
  }
}
```

### Migration from V1

The V1 chase engine uses `chaseDaysBetween`, `maxChases`, `escalateAfterChase` on `chaseCampaigns` and `nextChaseAt`, `chasesDelivered` on `chaseEnrollments`.

**Migration approach:**
1. For existing active campaigns, auto-generate `sequence_steps` from the V1 config:
   - N steps with `triggerType: "delay"` and `delayDays: campaign.chaseDaysBetween`
   - Escalation level increases at `escalateAfterChase`
2. For existing active enrollments, create `enrollment_step_states` with steps 1..chasesDelivered marked "completed"
3. V1 fields remain on the tables (not removed) but new UI uses sequence_steps

```typescript
// src/scripts/migrate-v1-sequences.ts
async function migrateV1Campaigns() {
  const campaigns = await db.query.chaseCampaigns.findMany({
    where: eq(chaseCampaigns.status, "active"),
  });
  
  for (const campaign of campaigns) {
    const steps: typeof sequenceSteps.$inferInsert[] = [];
    for (let i = 1; i <= (campaign.maxChases ?? 6); i++) {
      const level = i <= (campaign.escalateAfterChase ?? 4)
        ? ["gentle", "gentle", "reminder", "reminder"][i - 1] ?? "firm"
        : i === (campaign.maxChases ?? 6) ? "escalate" : "urgent";
      
      steps.push({
        campaignId: campaign.id,
        stepNumber: i,
        name: `Chase ${i}`,
        triggerType: i === 1 ? "delay" : "event_or_delay",
        delayDays: i === 1 ? 0 : campaign.chaseDaysBetween ?? 7,
        waitForEvent: i === 1 ? undefined : "document_uploaded",
        actionType: "send_chase",
        escalationLevel: level as any,
      });
    }
    await db.insert(sequenceSteps).values(steps);
    
    // Create step states for existing enrollments
    const enrollments = await db.query.chaseEnrollments.findMany({
      where: eq(chaseEnrollments.campaignId, campaign.id),
    });
    for (const enrollment of enrollments) {
      for (const step of steps) {
        await db.insert(enrollmentStepStates).values({
          enrollmentId: enrollment.id,
          stepId: step.id!,
          state: step.stepNumber <= (enrollment.chasesDelivered ?? 0) ? "completed" : "pending",
        });
      }
    }
  }
}
```

---

## 5. Feature 3: Progress-Based Dynamic Messaging

### Overview

Every chase message dynamically reflects the client's current document return progress. Uses Handlebars-style templates with live data injection.

### Template Variable System

```typescript
// src/server/services/template-renderer.ts

interface TemplateContext {
  // Client
  firstName: string;
  lastName: string;
  fullName: string;
  companyName: string | null;
  
  // Practice
  practiceName: string;
  practicePhone: string | null;
  
  // Progress
  done: number;              // documents returned
  total: number;             // total required
  remaining: number;         // total - done
  completionPercent: number; // Math.round((done/total) * 100)
  remainingList: string;     // "P60, bank statements" (comma-separated)
  remainingBulletList: string; // "• P60\n• Bank statements"
  nextDocument: string;      // first remaining doc name
  
  // Dates
  deadline: string;          // "31 January 2027"
  daysUntilDeadline: number;
  
  // Portal
  portalUrl: string;
  
  // Chase context
  chaseNumber: number;
  escalationLevel: string;
}

export function renderTemplate(template: string, context: TemplateContext): string {
  // Simple Handlebars-like replacement
  // Supports: {{variable}}, {{#if condition}}...{{/if}}, {{#each items}}...{{/each}}
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return String(context[key as keyof TemplateContext] ?? "");
  });
}

export function buildTemplateContext(
  enrollment: EnrollmentWithRelations,
  step: SequenceStep,
): TemplateContext {
  const required = enrollment.requiredDocumentIds as string[];
  const received = enrollment.receivedDocumentIds as string[];
  const remaining = required.filter(id => !received.includes(id));
  // Resolve document template names
  const remainingNames = /* query documentTemplates by IDs */;
  
  return {
    firstName: enrollment.client.firstName,
    lastName: enrollment.client.lastName,
    fullName: `${enrollment.client.firstName} ${enrollment.client.lastName}`,
    companyName: enrollment.client.companyName,
    practiceName: enrollment.practice.name,
    practicePhone: enrollment.practice.phone,
    done: received.length,
    total: required.length,
    remaining: remaining.length,
    completionPercent: Math.round((received.length / required.length) * 100),
    remainingList: remainingNames.join(", "),
    remainingBulletList: remainingNames.map(n => `• ${n}`).join("\n"),
    nextDocument: remainingNames[0] ?? "",
    deadline: format(enrollment.campaign.deadlineDate, "d MMMM yyyy"),
    daysUntilDeadline: differenceInDays(enrollment.campaign.deadlineDate, new Date()),
    portalUrl: `${process.env.APP_URL}/p/${enrollment.magicLink.token}`,
    chaseNumber: step.stepNumber,
    escalationLevel: step.escalationLevel ?? "gentle",
  };
}
```

### Smart Subject Lines

```typescript
const subjectTemplates: Record<string, string[]> = {
  initial: [
    "{{practiceName}} needs {{total}} documents for your tax return",
    "Your {{deadline}} tax return — {{total}} documents needed",
  ],
  progress: [
    "Your tax return: {{completionPercent}}% complete — {{remaining}} to go",
    "Great progress! Just {{remaining}} document{{remaining === 1 ? '' : 's'}} left",
  ],
  nearComplete: [
    "Just 1 document left — your {{nextDocument}}",
    "Almost there! Your {{nextDocument}} is the last one",
  ],
  complete: [
    "All done! ✅ Your accountant has everything they need",
    "Documents received — thank you, {{firstName}}!",
  ],
};

function selectSubjectTemplate(context: TemplateContext): string {
  if (context.remaining === 0) return pickRandom(subjectTemplates.complete);
  if (context.remaining === 1) return pickRandom(subjectTemplates.nearComplete);
  if (context.done > 0) return pickRandom(subjectTemplates.progress);
  return pickRandom(subjectTemplates.initial);
}
```

### Celebration / Completion Messages

```typescript
// Auto-triggered when last document is uploaded
async function handleAllDocumentsReceived(enrollmentId: string) {
  const enrollment = await getEnrollmentWithContext(enrollmentId);
  const context = buildTemplateContext(enrollment, {} as any);
  
  // Send celebration message via original channel
  await dispatchMessage({
    practiceId: enrollment.practiceId,
    clientId: enrollment.clientId,
    enrollmentId: enrollment.id,
    channel: enrollment.client.preferredChannel ?? "email",
    subject: renderTemplate("All done! ✅ {{practiceName}} has everything", context),
    body: renderTemplate(
      "Hi {{firstName}},\n\nThat's all {{total}} documents received — thank you! " +
      "Your accountant at {{practiceName}} now has everything they need to prepare your return.\n\n" +
      "We'll be in touch if anything else is needed.\n\nThank you!",
      context
    ),
    escalationLevel: "gentle",
  });
  
  // Complete the enrollment
  await db.update(chaseEnrollments).set({
    status: "completed",
    completedAt: new Date(),
    completionPercent: 100,
  }).where(eq(chaseEnrollments.id, enrollmentId));
  
  // Emit completion event
  await emitChaseEvent({
    practiceId: enrollment.practiceId,
    eventType: "chase_completed",
    enrollmentId,
    clientId: enrollment.clientId,
    campaignId: enrollment.campaignId,
    triggeredBy: "system",
  });
  
  // Notify accountant
  await notifyAccountant(enrollment.practiceId, {
    type: "chase_completed",
    clientName: context.fullName,
    campaignName: enrollment.campaign.name,
  });
}
```

### Frontend: Progress Indicators

No new pages needed — modify existing campaign detail and client detail pages to show:
- Progress bar per enrollment
- Document checklist with received/pending status
- Predicted completion date based on client's historical response rate

---

## 6. Feature 4: Response Classifier (AI-Powered)

### AI Integration

```typescript
// src/server/services/response-classifier.ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const CLASSIFICATION_PROMPT = `You are a reply classifier for a UK accountancy document chasing system. 
Classify the client's reply into exactly one intent category.

Categories:
- sending_soon: Client says they will send documents soon, or gives a specific date
- need_help: Client needs help finding/understanding what's needed
- dont_have: Client says they don't have the document(s)
- already_sent: Client claims they already sent/uploaded the document(s)
- wrong_person: Reply is from wrong person or client says it's not their responsibility
- refusing: Client refuses to provide documents
- out_of_office: Auto-reply or manual message saying they're away
- irrelevant: Spam, unrelated content, or test messages
- has_attachment: Reply contains an attachment (document being returned)

Also extract:
- Any specific dates mentioned (in ISO format)
- Return date if out-of-office
- Confidence level (0.0 to 1.0)

Reply context:
- Client name: {{clientName}}
- Documents being chased: {{documentList}}
- Chase number: {{chaseNumber}} of {{maxChases}}
- Last chase message subject: {{lastSubject}}

Client's reply:
"""
{{replyContent}}
"""

Respond in JSON only:
{
  "intent": "sending_soon|need_help|dont_have|already_sent|wrong_person|refusing|out_of_office|irrelevant|has_attachment",
  "confidence": 0.95,
  "extractedDate": "2026-03-05T00:00:00Z" | null,
  "extractedDateText": "Thursday" | null,
  "returnDate": "2026-03-10T00:00:00Z" | null,
  "reasoning": "Brief explanation",
  "suggestedAction": "Brief suggestion for the accountant"
}`;

export async function classifyReply(params: {
  replyContent: string;
  clientName: string;
  documentList: string;
  chaseNumber: number;
  maxChases: number;
  lastSubject: string;
  hasAttachment: boolean;
}): Promise<ClassificationResult> {
  // Short-circuit: if has attachment, classify as has_attachment with high confidence
  if (params.hasAttachment) {
    return {
      intent: "has_attachment",
      confidence: 0.99,
      extractedDate: null,
      returnDate: null,
      reasoning: "Reply contains an attachment",
      suggestedAction: "Process attachment through document classifier",
    };
  }

  const prompt = renderTemplate(CLASSIFICATION_PROMPT, params);
  
  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  
  try {
    const result = JSON.parse(text);
    return {
      intent: result.intent,
      confidence: result.confidence,
      extractedDate: result.extractedDate ? new Date(result.extractedDate) : null,
      extractedDateText: result.extractedDateText,
      returnDate: result.returnDate ? new Date(result.returnDate) : null,
      reasoning: result.reasoning,
      suggestedAction: result.suggestedAction,
    };
  } catch {
    // AI returned non-JSON — flag for human review
    return {
      intent: "unknown" as any,
      confidence: 0,
      extractedDate: null,
      returnDate: null,
      reasoning: "Failed to parse AI response",
      suggestedAction: "Manual review required",
    };
  }
}
```

### Cost Estimates

| Operation | Model | Input tokens (avg) | Output tokens (avg) | Cost per call | Monthly (1000 practices × 50 replies) |
|-----------|-------|-------------------|---------------------|---------------|---------------------------------------|
| Reply classification | Haiku 3.5 | ~400 | ~150 | ~$0.00015 | ~$7.50/mo |
| Complex date parsing | Sonnet 3.5 | ~300 | ~100 | ~$0.0012 | ~$6/mo (10% of replies) |
| OOO detection | Haiku 3.5 | ~300 | ~100 | ~$0.0001 | ~$0.50/mo |

**Total AI cost: ~$14/month at 50k classifications.** Extremely manageable.

### Learning Loop

```typescript
// New table for tracking corrections
export const classificationCorrections = pgTable("classification_corrections", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  replyId: uuid("reply_id").notNull().references(() => chaseReplies.id),
  
  originalIntent: replyIntentEnum("original_intent").notNull(),
  originalConfidence: decimal("original_confidence", { precision: 5, scale: 4 }).notNull(),
  correctedIntent: replyIntentEnum("corrected_intent").notNull(),
  
  replyContent: text("reply_content").notNull(), // denormalized for training
  correctedBy: uuid("corrected_by").notNull().references(() => users.id),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("corrections_practice_id_idx").on(t.practiceId),
]);
```

**Phase 1 (V2 launch):** Log corrections. Include up to 5 recent corrections as few-shot examples in the classification prompt.

**Phase 2 (future):** If correction volume is high enough, fine-tune a model or build practice-specific example banks.

```typescript
// Enhanced classifier with few-shot examples
async function getClassificationPromptWithExamples(practiceId: string): Promise<string> {
  const recentCorrections = await db.query.classificationCorrections.findMany({
    where: eq(classificationCorrections.practiceId, practiceId),
    orderBy: desc(classificationCorrections.createdAt),
    limit: 5,
  });
  
  if (recentCorrections.length === 0) return CLASSIFICATION_PROMPT;
  
  const examples = recentCorrections.map(c => 
    `Reply: "${c.replyContent.slice(0, 200)}"\nCorrect intent: ${c.correctedIntent}`
  ).join("\n\n");
  
  return CLASSIFICATION_PROMPT + `\n\nHere are examples of how this practice classifies replies:\n${examples}`;
}
```

---

## 7. Feature 5: Out-of-Office / Absence Detection

### Overview

Detect auto-replies and absence patterns. Auto-pause sequences and resume on return date.

### Implementation

OOO detection is a specialization of the Response Classifier (Feature 4). When intent = `out_of_office`, additional parsing kicks in.

```typescript
// src/server/services/ooo-detector.ts

const OOO_DATE_PROMPT = `Extract the return date from this out-of-office reply.
Consider today's date is {{today}}.

Auto-reply text:
"""
{{replyContent}}
"""

Return JSON:
{
  "returnDate": "2026-03-10" | null,
  "delegateName": "name" | null,
  "delegateEmail": "email" | null,
  "isAutoReply": true | false,
  "confidence": 0.95
}`;

export async function parseOOOReply(replyContent: string): Promise<OOOResult> {
  // First try regex patterns for common formats
  const patterns = [
    /(?:back|return|returning|available)\s+(?:on\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*(?:\s+\d{4})?)/i,
    /(?:out of (?:the )?office|away|on (?:annual )?leave|on holiday)\s+(?:until|till|from\s+\S+\s+(?:to|until|-))\s+(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*(?:\s+\d{4})?)/i,
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
  ];
  
  for (const pattern of patterns) {
    const match = replyContent.match(pattern);
    if (match) {
      const parsed = parseDate(match[1]); // date-fns parse with UK format preference
      if (parsed && isValid(parsed) && isFuture(parsed)) {
        return { returnDate: parsed, confidence: 0.9, isAutoReply: true, delegateName: null, delegateEmail: null };
      }
    }
  }
  
  // Fall back to AI for complex cases
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022", // Use Sonnet for date parsing
    max_tokens: 200,
    messages: [{ role: "user", content: renderTemplate(OOO_DATE_PROMPT, { replyContent, today: format(new Date(), "yyyy-MM-dd") }) }],
  });
  
  // Parse response...
}
```

### Holiday Season Awareness

```typescript
// src/server/services/holiday-awareness.ts

const UK_HOLIDAY_SEASONS = [
  { name: "Christmas", start: { month: 12, day: 20 }, end: { month: 1, day: 3 }, delayMultiplier: 2.0 },
  { name: "Easter", start: "dynamic", end: "dynamic", delayMultiplier: 1.5 }, // Calculate from Easter date
  { name: "August holidays", start: { month: 8, day: 1 }, end: { month: 8, day: 31 }, delayMultiplier: 1.3 },
  { name: "Half term (Feb)", start: { month: 2, day: 10 }, end: { month: 2, day: 21 }, delayMultiplier: 1.2 },
  { name: "Half term (Oct)", start: { month: 10, day: 21 }, end: { month: 10, day: 31 }, delayMultiplier: 1.2 },
];

export function getHolidayDelayMultiplier(date: Date): number {
  for (const season of UK_HOLIDAY_SEASONS) {
    if (isDateInSeason(date, season)) return season.delayMultiplier;
  }
  return 1.0;
}

// Used by sequence engine: multiply step delays by holiday multiplier
// e.g., 7-day chase interval during Christmas → 14 days
```

### Redirect Detection

```typescript
// When reply contains "my accountant handles this" or "contact X instead"
// Intent: wrong_person with delegate info
// Action: pause chase, create notification for practice with delegate details
```

---

## 8. Feature 6: Smart Send Time Optimisation

### Data Model

```typescript
export const clientEngagementPatterns = pgTable("client_engagement_patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  
  // Engagement heatmap: 7 days × 24 hours = 168 slots
  // Each slot stores a score (0-100) based on historical engagement
  engagementHeatmap: jsonb("engagement_heatmap").default({}).notNull(),
  // Format: { "1_9": 85, "1_10": 72, "2_14": 45, ... }
  // Key: "{dayOfWeek}_{hour}" (0=Sunday, 1=Monday, ...)
  
  // Summary stats
  bestDay: integer("best_day"),     // 0-6 (day of week)
  bestHour: integer("best_hour"),   // 0-23
  avgResponseTimeHours: decimal("avg_response_time_hours", { precision: 8, scale: 2 }),
  totalEngagements: integer("total_engagements").default(0),
  
  // Timezone (inferred or set)
  inferredTimezone: varchar("inferred_timezone", { length: 50 }),
  
  lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("engagement_client_idx").on(t.practiceId, t.clientId),
]);
```

### Engagement Tracking

```typescript
// src/server/services/send-time-optimiser.ts

// Called by event processor for every engagement event
export async function recordEngagement(clientId: string, practiceId: string, eventType: string) {
  const now = new Date();
  const day = now.getDay(); // 0-6
  const hour = now.getHours(); // 0-23
  const key = `${day}_${hour}`;
  
  // Increment heatmap slot
  // Using Redis for real-time accumulation, sync to Postgres periodically
  const redisKey = `engagement:${practiceId}:${clientId}`;
  await redis.hincrby(redisKey, key, getEventWeight(eventType));
  await redis.hincrby(redisKey, "total", 1);
}

function getEventWeight(eventType: string): number {
  switch (eventType) {
    case "document_uploaded": return 10;  // Strongest signal
    case "email_clicked": return 7;
    case "portal_visited": return 5;
    case "reply_received": return 8;
    case "email_opened": return 3;
    default: return 1;
  }
}

export async function getOptimalSendTime(
  clientId: string,
  practiceId: string,
): Promise<Date> {
  const practice = await getPractice(practiceId);
  const pattern = await getEngagementPattern(clientId, practiceId);
  
  // Business hours constraints
  const startHour = parseInt(practice.businessHoursStart?.split(":")[0] ?? "9");
  const endHour = parseInt(practice.businessHoursEnd?.split(":")[0] ?? "17");
  const businessDays = (practice.businessDays as number[]) ?? [1, 2, 3, 4, 5];
  
  const now = new Date();
  
  // If no engagement data, use practice defaults
  if (!pattern || pattern.totalEngagements < 5) {
    return getNextBusinessHour(now, startHour, endHour, businessDays);
  }
  
  // Find best slot within business hours in next 7 days
  const heatmap = pattern.engagementHeatmap as Record<string, number>;
  let bestScore = 0;
  let bestTime = getNextBusinessHour(now, startHour, endHour, businessDays);
  
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const candidate = addDays(now, dayOffset);
    const dayOfWeek = candidate.getDay();
    
    if (!businessDays.includes(dayOfWeek)) continue;
    
    for (let hour = startHour; hour < endHour; hour++) {
      const key = `${dayOfWeek}_${hour}`;
      const score = heatmap[key] ?? 0;
      
      if (score > bestScore) {
        const candidateTime = setHours(setMinutes(candidate, 0), hour);
        if (candidateTime > now) {
          bestScore = score;
          bestTime = candidateTime;
        }
      }
    }
  }
  
  return bestTime;
}

// Sync Redis heatmaps to Postgres (run via cron every 6 hours)
export async function syncEngagementPatterns() {
  const keys = await redis.keys("engagement:*");
  for (const key of keys) {
    const [_, practiceId, clientId] = key.split(":");
    const data = await redis.hgetall(key);
    
    const total = parseInt(data.total ?? "0");
    delete data.total;
    
    // Find best day/hour
    let bestKey = "";
    let bestScore = 0;
    for (const [k, v] of Object.entries(data)) {
      const score = parseInt(v as string);
      if (score > bestScore) { bestScore = score; bestKey = k; }
    }
    const [bestDay, bestHour] = bestKey.split("_").map(Number);
    
    await db.insert(clientEngagementPatterns).values({
      practiceId, clientId,
      engagementHeatmap: data,
      bestDay, bestHour,
      totalEngagements: total,
      lastCalculatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [clientEngagementPatterns.practiceId, clientEngagementPatterns.clientId],
      set: {
        engagementHeatmap: data,
        bestDay, bestHour,
        totalEngagements: total,
        lastCalculatedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
```

### API Endpoint

```typescript
// Add to clients router
getBestSendTime: protectedProcedure
  .input(z.object({ clientId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const pattern = await db.query.clientEngagementPatterns.findFirst({
      where: and(
        eq(clientEngagementPatterns.practiceId, ctx.practiceId),
        eq(clientEngagementPatterns.clientId, input.clientId),
      ),
    });
    
    if (!pattern || (pattern.totalEngagements ?? 0) < 5) {
      return { hasSufficientData: false, suggestion: null };
    }
    
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return {
      hasSufficientData: true,
      suggestion: `${days[pattern.bestDay!]} ${pattern.bestHour}:00`,
      avgResponseTimeHours: pattern.avgResponseTimeHours,
      heatmap: pattern.engagementHeatmap,
    };
  }),
```

---

## 9. Feature 7: Unified Response Hub

### Overview

Single inbox view for all client replies across all channels. Shows AI classification, suggested actions, and enables quick responses.

### Data Model

No new tables needed — the Response Hub queries `chase_replies` with joins to `clients`, `chase_enrollments`, `chase_campaigns`, and `chase_messages`.

### API Endpoints

```typescript
// src/server/trpc/routers/response-hub.ts

export const responseHubRouter = router({
  // Main inbox query with filters
  getInbox: protectedProcedure
    .input(z.object({
      filter: z.enum(["all", "needs_response", "auto_handled", "escalated", "flagged"]).default("all"),
      channel: z.enum(["email", "sms", "whatsapp"]).optional(),
      search: z.string().optional(),
      assignedTo: z.string().uuid().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let query = db
        .select({
          reply: chaseReplies,
          client: {
            id: clients.id,
            firstName: clients.firstName,
            lastName: clients.lastName,
            companyName: clients.companyName,
            email: clients.email,
            phone: clients.phone,
          },
          enrollment: {
            id: chaseEnrollments.id,
            status: chaseEnrollments.status,
            completionPercent: chaseEnrollments.completionPercent,
          },
          campaign: {
            id: chaseCampaigns.id,
            name: chaseCampaigns.name,
          },
        })
        .from(chaseReplies)
        .innerJoin(clients, eq(chaseReplies.clientId, clients.id))
        .leftJoin(chaseEnrollments, eq(chaseReplies.enrollmentId, chaseEnrollments.id))
        .leftJoin(chaseCampaigns, eq(chaseEnrollments.campaignId, chaseCampaigns.id))
        .where(eq(chaseReplies.practiceId, ctx.practiceId))
        .orderBy(desc(chaseReplies.createdAt))
        .limit(input.limit);

      // Apply filters
      switch (input.filter) {
        case "needs_response":
          query = query.where(
            inArray(chaseReplies.status, ["classified", "received"])
          );
          break;
        case "auto_handled":
          query = query.where(eq(chaseReplies.status, "action_taken"));
          break;
        case "escalated":
          query = query.where(
            and(
              eq(chaseReplies.status, "flagged_for_review"),
              inArray(chaseReplies.intent, ["refusing", "wrong_person"]),
            )
          );
          break;
        case "flagged":
          query = query.where(eq(chaseReplies.status, "flagged_for_review"));
          break;
      }

      return query;
    }),

  // Get conversation thread for a client
  getThread: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      enrollmentId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Get all outbound messages and inbound replies, merged and sorted by date
      const outbound = await db.query.chaseMessages.findMany({
        where: and(
          eq(chaseMessages.practiceId, ctx.practiceId),
          eq(chaseMessages.clientId, input.clientId),
          input.enrollmentId ? eq(chaseMessages.enrollmentId, input.enrollmentId) : undefined,
        ),
        orderBy: asc(chaseMessages.createdAt),
      });
      
      const inbound = await db.query.chaseReplies.findMany({
        where: and(
          eq(chaseReplies.practiceId, ctx.practiceId),
          eq(chaseReplies.clientId, input.clientId),
          input.enrollmentId ? eq(chaseReplies.enrollmentId, input.enrollmentId) : undefined,
        ),
        orderBy: asc(chaseReplies.createdAt),
      });
      
      // Merge and sort
      const thread = [
        ...outbound.map(m => ({ type: "outbound" as const, ...m })),
        ...inbound.map(r => ({ type: "inbound" as const, ...r })),
      ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      return thread;
    }),

  // Reply directly from hub
  sendReply: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      enrollmentId: z.string().uuid().optional(),
      channel: z.enum(["email", "sms", "whatsapp"]),
      message: z.string().min(1).max(5000),
      subject: z.string().optional(), // email only
    }))
    .mutation(async ({ ctx, input }) => {
      // Dispatch via appropriate sender (reuse existing V1 senders)
      // Log as manual message in chase_messages
    }),

  // Quick actions
  quickAction: protectedProcedure
    .input(z.object({
      replyId: z.string().uuid(),
      action: z.enum(["pause", "resume", "reschedule", "resolve", "assign", "dismiss"]),
      rescheduleDate: z.string().datetime().optional(),
      assignToUserId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Get inbox counts for badges
  getCounts: protectedProcedure
    .query(async ({ ctx }) => {
      const [needsResponse, flagged, total] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(chaseReplies).where(
          and(eq(chaseReplies.practiceId, ctx.practiceId), inArray(chaseReplies.status, ["classified", "received"]))
        ),
        db.select({ count: sql`count(*)` }).from(chaseReplies).where(
          and(eq(chaseReplies.practiceId, ctx.practiceId), eq(chaseReplies.status, "flagged_for_review"))
        ),
        db.select({ count: sql`count(*)` }).from(chaseReplies).where(
          and(eq(chaseReplies.practiceId, ctx.practiceId), inArray(chaseReplies.status, ["received", "classifying", "classified", "flagged_for_review"]))
        ),
      ]);
      return {
        needsResponse: Number(needsResponse[0]?.count ?? 0),
        flagged: Number(flagged[0]?.count ?? 0),
        total: Number(total[0]?.count ?? 0),
      };
    }),
});
```

### Frontend Components

```
src/app/(dashboard)/inbox/page.tsx          — Response Hub main page
src/app/(dashboard)/inbox/components/
  inbox-list.tsx                             — Reply list with filters
  reply-card.tsx                             — Individual reply card (intent badge, actions)
  conversation-thread.tsx                    — Full thread view (outbound + inbound)
  reply-composer.tsx                         — Compose reply (channel-aware)
  intent-badge.tsx                           — Colored badge for AI intent
  quick-action-bar.tsx                       — Pause/resume/reschedule/assign buttons
  inbox-filters.tsx                          — Filter bar
  inbox-counts.tsx                           — Badge counts in nav
```

### Real-Time Updates

The Response Hub connects to PartyKit WebSocket for live updates:

```typescript
// src/app/(dashboard)/inbox/use-inbox-realtime.ts
import usePartySocket from "partysocket/react";

export function useInboxRealtime(practiceId: string) {
  const queryClient = useQueryClient();
  
  usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST!,
    room: `practice:${practiceId}`,
    onMessage(event) {
      const data = JSON.parse(event.data);
      if (data.type === "chase_event" && data.event.eventType === "reply_received") {
        // Invalidate inbox query to show new reply
        queryClient.invalidateQueries({ queryKey: ["responseHub", "getInbox"] });
        queryClient.invalidateQueries({ queryKey: ["responseHub", "getCounts"] });
      }
    },
  });
}
```

---

## 10. Feature 8: Chase Analytics Dashboard V2

### Data Model

Analytics are derived from `chase_events`. No separate analytics tables needed — use materialized views or on-demand aggregation with Redis caching.

### API Endpoints

```typescript
// src/server/trpc/routers/analytics.ts

export const analyticsRouter = router({
  // Document return funnel
  getDocumentFunnel: protectedProcedure
    .input(z.object({
      campaignId: z.string().uuid().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Aggregate from chase_events
      // Requested → Email sent → Email opened → Portal visited → Upload started → Document returned
      const stages = await db.execute(sql`
        WITH enrollment_events AS (
          SELECT DISTINCT ON (enrollment_id, event_type)
            enrollment_id, event_type, created_at
          FROM chase_events
          WHERE practice_id = ${ctx.practiceId}
            ${input.campaignId ? sql`AND campaign_id = ${input.campaignId}` : sql``}
            ${input.dateFrom ? sql`AND created_at >= ${input.dateFrom}` : sql``}
        )
        SELECT
          COUNT(DISTINCT CASE WHEN event_type = 'chase_sent' THEN enrollment_id END) as requested,
          COUNT(DISTINCT CASE WHEN event_type = 'email_opened' THEN enrollment_id END) as email_opened,
          COUNT(DISTINCT CASE WHEN event_type = 'portal_visited' THEN enrollment_id END) as portal_visited,
          COUNT(DISTINCT CASE WHEN event_type = 'portal_upload_started' THEN enrollment_id END) as upload_started,
          COUNT(DISTINCT CASE WHEN event_type = 'document_uploaded' THEN enrollment_id END) as document_returned,
          COUNT(DISTINCT CASE WHEN event_type = 'chase_completed' THEN enrollment_id END) as completed
        FROM enrollment_events
      `);
      return stages.rows[0];
    }),

  // Client reliability scores
  getClientReliability: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      sortBy: z.enum(["fastest", "slowest"]).default("slowest"),
    }))
    .query(async ({ ctx, input }) => {
      return db.execute(sql`
        SELECT 
          c.id, c.first_name, c.last_name, c.company_name,
          AVG(EXTRACT(EPOCH FROM (ce.completed_at - ce.created_at)) / 86400)::numeric(8,1) as avg_days_to_complete,
          COUNT(DISTINCT ce.id) as total_enrollments,
          COUNT(DISTINCT CASE WHEN ce.status = 'completed' THEN ce.id END) as completed_enrollments,
          AVG(ce.chases_delivered) as avg_chases_needed
        FROM clients c
        JOIN chase_enrollments ce ON c.id = ce.client_id
        WHERE c.practice_id = ${ctx.practiceId}
          AND ce.status = 'completed'
        GROUP BY c.id
        ORDER BY avg_days_to_complete ${input.sortBy === "slowest" ? sql`DESC` : sql`ASC`}
        LIMIT ${input.limit}
      `);
    }),

  // Document type analytics
  getDocumentTypeStats: protectedProcedure
    .query(async ({ ctx }) => {
      return db.execute(sql`
        SELECT 
          dt.name as document_type,
          COUNT(cd.id) as total_requested,
          COUNT(CASE WHEN cd.status IN ('accepted', 'classified') THEN 1 END) as returned,
          AVG(EXTRACT(EPOCH FROM (cd.updated_at - cd.created_at)) / 86400)::numeric(8,1) as avg_days_to_return
        FROM document_templates dt
        LEFT JOIN client_documents cd ON dt.id = cd.template_id
        WHERE dt.practice_id = ${ctx.practiceId} OR dt.is_system = true
        GROUP BY dt.id, dt.name
        ORDER BY avg_days_to_return DESC NULLS LAST
      `);
    }),

  // Channel effectiveness
  getChannelStats: protectedProcedure
    .input(z.object({ campaignId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      return db.execute(sql`
        SELECT 
          cm.channel,
          COUNT(cm.id) as sent,
          COUNT(CASE WHEN cm.status = 'delivered' THEN 1 END) as delivered,
          COUNT(CASE WHEN cm.email_opened_at IS NOT NULL THEN 1 END) as opened,
          COUNT(CASE WHEN cm.email_clicked_at IS NOT NULL THEN 1 END) as clicked,
          COUNT(DISTINCT cr.id) as replies_received
        FROM chase_messages cm
        LEFT JOIN chase_replies cr ON cr.message_id = cm.id
        WHERE cm.practice_id = ${ctx.practiceId}
          ${input.campaignId ? sql`AND cm.campaign_id = ${input.campaignId}` : sql``}
        GROUP BY cm.channel
      `);
    }),

  // Seasonal trends
  getSeasonalTrends: protectedProcedure
    .query(async ({ ctx }) => {
      return db.execute(sql`
        SELECT 
          EXTRACT(MONTH FROM ce.created_at) as month,
          AVG(EXTRACT(EPOCH FROM (ce.completed_at - ce.created_at)) / 86400)::numeric(8,1) as avg_days_to_complete,
          COUNT(ce.id) as total_enrollments,
          AVG(ce.chases_delivered)::numeric(4,1) as avg_chases
        FROM chase_enrollments ce
        WHERE ce.practice_id = ${ctx.practiceId}
          AND ce.status = 'completed'
        GROUP BY EXTRACT(MONTH FROM ce.created_at)
        ORDER BY month
      `);
    }),

  // Bottleneck identification
  getBottlenecks: protectedProcedure
    .input(z.object({ campaignId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      // Calculate drop-off between funnel stages
      const funnel = await this.getDocumentFunnel({ campaignId: input.campaignId });
      const bottlenecks: string[] = [];
      
      if (funnel.email_opened / funnel.requested < 0.3) {
        bottlenecks.push("Low email open rate — consider SMS as first channel");
      }
      if (funnel.portal_visited / funnel.email_opened < 0.4) {
        bottlenecks.push(`${Math.round((1 - funnel.portal_visited / funnel.email_opened) * 100)}% open emails but don't visit portal — consider SMS escalation`);
      }
      if (funnel.document_returned / funnel.portal_visited < 0.5) {
        bottlenecks.push("Clients visit portal but don't upload — portal UX may need improvement");
      }
      
      return bottlenecks;
    }),

  // Team performance
  getTeamPerformance: protectedProcedure
    .query(async ({ ctx }) => {
      return db.execute(sql`
        SELECT 
          u.id, u.first_name, u.last_name,
          COUNT(DISTINCT cc.id) as campaigns_created,
          COUNT(DISTINCT ce.id) as total_enrollments,
          COUNT(DISTINCT CASE WHEN ce.status = 'completed' THEN ce.id END) as completed,
          AVG(CASE WHEN ce.status = 'completed' 
            THEN EXTRACT(EPOCH FROM (ce.completed_at - ce.created_at)) / 86400 
          END)::numeric(8,1) as avg_completion_days
        FROM users u
        LEFT JOIN chase_campaigns cc ON u.id = cc.created_by
        LEFT JOIN chase_enrollments ce ON cc.id = ce.campaign_id
        WHERE u.practice_id = ${ctx.practiceId}
        GROUP BY u.id
      `);
    }),
});
```

### Frontend Components

```
src/app/(dashboard)/analytics/page.tsx
src/app/(dashboard)/analytics/components/
  funnel-chart.tsx           — Horizontal funnel visualization
  client-reliability.tsx     — Sortable table with reliability scores
  document-type-chart.tsx    — Bar chart of return times by doc type
  channel-comparison.tsx     — Channel effectiveness comparison
  seasonal-chart.tsx         — Line chart of monthly trends
  bottleneck-alerts.tsx      — Alert cards with actionable suggestions
  team-leaderboard.tsx       — Team performance table
```

### Caching Strategy

Analytics queries can be expensive. Cache in Redis:

```typescript
async function getCachedAnalytics<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached as string);
  
  const result = await compute();
  await redis.setex(key, ttlSeconds, JSON.stringify(result));
  return result;
}

// Usage:
const funnel = await getCachedAnalytics(
  `analytics:funnel:${practiceId}:${campaignId}`,
  300, // 5 minute TTL
  () => computeFunnel(practiceId, campaignId),
);
```

---

## 11. Feature 9: Chase Template Library

### Data Model

```typescript
export const templateVisibilityEnum = pgEnum("template_visibility", [
  "private",     // Only this practice
  "community",   // Shared with all practices
  "system",      // Built-in, maintained by chase.md team
]);

export const chaseTemplates = pgTable("chase_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id), // null for system templates
  createdBy: uuid("created_by").references(() => users.id),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  // Categories: "self_assessment", "corporation_tax", "vat", "payroll", "onboarding", "accounts", "mtd"
  
  visibility: templateVisibilityEnum("visibility").default("private").notNull(),
  
  // What documents this template chases
  documentTemplateIds: jsonb("document_template_ids").default([]).notNull(),
  
  // The sequence definition (array of step configs)
  sequenceConfig: jsonb("sequence_config").notNull(),
  // Type: SequenceStepConfig[] — same shape as sequenceSteps table but as JSON
  
  // Message templates per escalation level
  messageTemplates: jsonb("message_templates").notNull(),
  // Type: { gentle: { email: { subject, body }, sms: { body }, whatsapp: { body } }, reminder: {...}, ... }
  
  // Metadata
  applicableClientTypes: jsonb("applicable_client_types").default([]),
  taxObligation: taxObligationEnum("tax_obligation"),
  suggestedStartOffset: integer("suggested_start_offset_days"), // days before deadline to start
  
  // Community features
  usageCount: integer("usage_count").default(0),
  avgCompletionRate: decimal("avg_completion_rate", { precision: 5, scale: 2 }),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  ratingCount: integer("rating_count").default(0),
  
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("templates_practice_id_idx").on(t.practiceId),
  index("templates_visibility_idx").on(t.visibility),
  index("templates_category_idx").on(t.category),
]);
```

### System Templates (Seed Data)

```typescript
// src/server/db/seed-templates.ts

export const SYSTEM_TEMPLATES: typeof chaseTemplates.$inferInsert[] = [
  {
    name: "SA100 Individual Tax Return",
    description: "Complete document chase for individual self-assessment tax return",
    category: "self_assessment",
    visibility: "system",
    taxObligation: "self_assessment",
    suggestedStartOffset: 120, // Start 4 months before deadline
    applicableClientTypes: ["sole_trader", "individual"],
    documentTemplateIds: [], // Populated with system doc template IDs
    sequenceConfig: [
      { stepNumber: 1, triggerType: "delay", delayDays: 0, actionType: "send_chase", escalationLevel: "gentle", channel: "email" },
      { stepNumber: 2, triggerType: "event_or_delay", waitForEvent: "portal_visited", delayDays: 3, actionType: "send_nudge", escalationLevel: "gentle" },
      { stepNumber: 3, triggerType: "event_or_delay", waitForEvent: "document_uploaded", delayDays: 7, actionType: "send_chase", escalationLevel: "reminder" },
      { stepNumber: 4, triggerType: "event_or_delay", waitForEvent: "document_uploaded", delayDays: 7, actionType: "send_chase", escalationLevel: "firm", channel: "sms" },
      { stepNumber: 5, triggerType: "delay", delayDays: 7, actionType: "send_chase", escalationLevel: "urgent", channel: "whatsapp" },
      { stepNumber: 6, triggerType: "delay", delayDays: 5, actionType: "escalate", escalationLevel: "escalate" },
    ],
    messageTemplates: {
      gentle: {
        email: {
          subject: "{{practiceName}} — your tax return documents needed ({{total}} items)",
          body: "Hi {{firstName}},\n\nWe're preparing your {{taxYear}} tax return and need {{total}} documents from you.\n\nPlease upload them securely here: {{portalUrl}}\n\nDocuments needed:\n{{remainingBulletList}}\n\nThe deadline is {{deadline}} — the sooner we receive everything, the sooner we can get your return filed.\n\nThank you,\n{{practiceName}}",
        },
        sms: { body: "Hi {{firstName}}, {{practiceName}} needs {{total}} documents for your tax return. Upload here: {{portalUrl}}" },
        whatsapp: { body: "Hi {{firstName}}, we need {{total}} documents for your {{taxYear}} tax return. Upload securely here: {{portalUrl}}" },
      },
      reminder: {
        email: {
          subject: "Your tax return: {{completionPercent}}% complete — {{remaining}} documents to go",
          body: "Hi {{firstName}},\n\n{{#if done}}Great progress — you've returned {{done}} of {{total}} documents! Just these remaining:\n{{remainingBulletList}}{{else}}We haven't received any documents yet. We need:\n{{remainingBulletList}}{{/if}}\n\nUpload here: {{portalUrl}}\n\nDeadline: {{deadline}} ({{daysUntilDeadline}} days away)\n\nThank you,\n{{practiceName}}",
        },
      },
      firm: {
        email: {
          subject: "IMPORTANT: {{remaining}} documents still needed — {{deadline}} deadline approaching",
          body: "Hi {{firstName}},\n\nWe still need {{remaining}} document{{remaining === 1 ? '' : 's'}} for your tax return:\n{{remainingBulletList}}\n\nThe filing deadline is {{deadline}} — just {{daysUntilDeadline}} days away. To avoid penalties, please upload as soon as possible: {{portalUrl}}\n\nIf you're having trouble finding any documents, please let us know and we can help.\n\n{{practiceName}}",
        },
      },
      urgent: {
        whatsapp: {
          body: "⚠️ Hi {{firstName}}, this is urgent — we need {{remaining}} documents for your tax return by {{deadline}}. Please upload now: {{portalUrl}} — or call us if you need help.",
        },
      },
    },
  },
  {
    name: "CT600 Corporation Tax",
    description: "Document chase for limited company corporation tax return",
    category: "corporation_tax",
    visibility: "system",
    taxObligation: "corporation_tax",
    suggestedStartOffset: 180,
    applicableClientTypes: ["limited_company"],
    // ... similar structure
  },
  {
    name: "New Client Onboarding",
    description: "Collect engagement letter, 64-8, AML documents for new clients",
    category: "onboarding",
    visibility: "system",
    suggestedStartOffset: 0,
    // ...
  },
  {
    name: "MTD ITSA Quarterly Submission",
    description: "Quarterly document chase for Making Tax Digital",
    category: "mtd",
    visibility: "system",
    taxObligation: "mtd_itsa",
    suggestedStartOffset: 30,
    // ...
  },
  {
    name: "VAT Return Documents",
    description: "Chase for quarterly VAT return supporting documents",
    category: "vat",
    visibility: "system",
    taxObligation: "vat",
    suggestedStartOffset: 21,
    // ...
  },
  {
    name: "Payroll Year-End (P60s, P11Ds)",
    description: "Annual payroll document collection",
    category: "payroll",
    visibility: "system",
    taxObligation: "paye",
    suggestedStartOffset: 30,
    // ...
  },
  {
    name: "Annual Accounts Preparation",
    description: "Full document set for annual accounts",
    category: "accounts",
    visibility: "system",
    taxObligation: "annual_accounts",
    suggestedStartOffset: 90,
    // ...
  },
  {
    name: "SA800 Partnership Return",
    description: "Partnership tax return document collection",
    category: "self_assessment",
    visibility: "system",
    taxObligation: "self_assessment",
    suggestedStartOffset: 120,
    applicableClientTypes: ["partnership"],
    // ...
  },
];
```

### AI Template Generator

```typescript
// src/server/services/template-generator.ts

const TEMPLATE_GENERATOR_PROMPT = `You are a UK accountancy document chasing expert. Generate a chase sequence template.

The user wants:
"""
{{userDescription}}
"""

Based on this, generate:
1. A list of documents to chase (use standard UK accounting terminology)
2. A 4-6 step chase sequence with appropriate timing and escalation
3. Message templates for each escalation level (gentle, reminder, firm, urgent)

Consider:
- UK tax deadlines and typical timelines
- HMRC requirements
- Professional but friendly tone
- Progressive escalation from email → SMS → WhatsApp

Return JSON matching this schema:
{
  "name": "Template name",
  "description": "Brief description",
  "category": "self_assessment|corporation_tax|vat|payroll|onboarding|accounts|mtd|other",
  "documentList": ["Document 1", "Document 2", ...],
  "suggestedStartOffsetDays": 90,
  "sequenceConfig": [
    { "stepNumber": 1, "triggerType": "delay|event_or_delay", "delayDays": 0, "waitForEvent": null, "actionType": "send_chase", "escalationLevel": "gentle", "channel": "email" },
    ...
  ],
  "messageTemplates": { "gentle": { "email": { "subject": "...", "body": "..." } }, ... }
}`;

export async function generateTemplate(description: string) {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022", // Sonnet for creative generation
    max_tokens: 4000,
    messages: [{ role: "user", content: TEMPLATE_GENERATOR_PROMPT.replace("{{userDescription}}", description) }],
  });
  
  return JSON.parse(response.content[0].text);
}
```

### API Endpoints

```typescript
// src/server/trpc/routers/templates.ts

export const templatesRouter = router({
  // Browse template library
  list: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      visibility: z.enum(["private", "community", "system", "all"]).default("all"),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  // Get single template
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  // Use a template to create a campaign
  useTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      campaignName: z.string(),
      taxYear: z.string(),
      deadlineDate: z.string().datetime(),
      clientIds: z.array(z.string().uuid()),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Load template
      // 2. Create campaign from template config
      // 3. Create sequence_steps from template.sequenceConfig
      // 4. Enroll clients
      // 5. Return campaign ID
    }),

  // Create custom template from existing campaign
  createFromCampaign: protectedProcedure
    .input(z.object({
      campaignId: z.string().uuid(),
      name: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // AI-generate a template
  generate: protectedProcedure
    .input(z.object({ description: z.string().min(10).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      return generateTemplate(input.description);
    }),

  // Publish to community
  publish: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Rate a community template
  rate: protectedProcedure
    .input(z.object({ templateId: z.string().uuid(), rating: z.number().min(1).max(5) }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

### Frontend Components

```
src/app/(dashboard)/templates/page.tsx           — Template library browser
src/app/(dashboard)/templates/[id]/page.tsx      — Template detail/preview
src/app/(dashboard)/templates/generate/page.tsx  — AI template generator
src/app/(dashboard)/templates/components/
  template-card.tsx
  template-preview.tsx
  sequence-timeline.tsx     — Visual timeline of chase steps
  use-template-modal.tsx    — Configure + launch from template
```

---

## 12. Feature 10: A/B Testing for Chase Sequences

### Data Model

```typescript
export const abTestStatusEnum = pgEnum("ab_test_status", [
  "draft", "running", "completed", "cancelled",
]);

export const abTests = pgTable("ab_tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  campaignId: uuid("campaign_id").notNull().references(() => chaseCampaigns.id),
  stepId: uuid("step_id").references(() => sequenceSteps.id), // null = test across entire sequence
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // What's being tested
  testType: varchar("test_type", { length: 50 }).notNull(),
  // "subject_line", "message_body", "send_time", "channel", "sequence"
  
  status: abTestStatusEnum("status").default("draft").notNull(),
  
  // Variants (JSON array)
  variants: jsonb("variants").notNull(),
  // Type: ABVariant[] = [
  //   { id: "A", name: "Control", weight: 50, config: { subject: "...", body: "..." } },
  //   { id: "B", name: "Variant B", weight: 50, config: { subject: "...", body: "..." } },
  // ]
  
  // Winner determination
  primaryMetric: varchar("primary_metric", { length: 50 }).default("document_return_rate"),
  // "document_return_rate", "portal_visit_rate", "email_open_rate", "reply_rate", "avg_completion_days"
  significanceThreshold: decimal("significance_threshold", { precision: 5, scale: 4 }).default("0.95"),
  minSampleSize: integer("min_sample_size").default(30), // per variant
  
  // Results
  winningVariant: varchar("winning_variant", { length: 50 }),
  winnerDeclaredAt: timestamp("winner_declared_at", { withTimezone: true }),
  autoPromoted: boolean("auto_promoted").default(false),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("ab_tests_practice_id_idx").on(t.practiceId),
  index("ab_tests_campaign_id_idx").on(t.campaignId),
]);

// Track which variant each enrollment was assigned
export const abTestAssignments = pgTable("ab_test_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  testId: uuid("test_id").notNull().references(() => abTests.id),
  enrollmentId: uuid("enrollment_id").notNull().references(() => chaseEnrollments.id),
  
  variantId: varchar("variant_id", { length: 50 }).notNull(), // "A", "B", etc.
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  
  // Outcome tracking
  emailOpened: boolean("email_opened").default(false),
  portalVisited: boolean("portal_visited").default(false),
  documentUploaded: boolean("document_uploaded").default(false),
  replyReceived: boolean("reply_received").default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completionDays: integer("completion_days"),
}, (t) => [
  index("ab_assignments_test_idx").on(t.testId),
  uniqueIndex("ab_assignments_test_enrollment_idx").on(t.testId, t.enrollmentId),
]);
```

### Variant Assignment

```typescript
// src/server/services/ab-testing.ts

export async function assignABVariant(
  testId: string,
  enrollmentId: string,
): Promise<{ id: string; variantId: string; config: Record<string, unknown> }> {
  // Check if already assigned
  const existing = await db.query.abTestAssignments.findFirst({
    where: and(
      eq(abTestAssignments.testId, testId),
      eq(abTestAssignments.enrollmentId, enrollmentId),
    ),
  });
  if (existing) {
    const test = await db.query.abTests.findFirst({ where: eq(abTests.id, testId) });
    const variant = (test!.variants as ABVariant[]).find(v => v.id === existing.variantId)!;
    return { id: existing.id, variantId: existing.variantId, config: variant.config };
  }
  
  // Weighted random assignment
  const test = await db.query.abTests.findFirst({ where: eq(abTests.id, testId) });
  const variants = test!.variants as ABVariant[];
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;
  
  let selectedVariant = variants[0];
  for (const variant of variants) {
    random -= variant.weight;
    if (random <= 0) { selectedVariant = variant; break; }
  }
  
  await db.insert(abTestAssignments).values({
    testId,
    enrollmentId,
    variantId: selectedVariant.id,
  });
  
  return { id: "", variantId: selectedVariant.id, config: selectedVariant.config };
}
```

### Statistical Significance

```typescript
// src/server/services/ab-statistics.ts

// Two-proportion z-test for binary outcomes (e.g., document return rate)
export function calculateSignificance(
  nA: number, successA: number,
  nB: number, successB: number,
): { significant: boolean; pValue: number; confidenceLevel: number } {
  if (nA < 5 || nB < 5) return { significant: false, pValue: 1, confidenceLevel: 0 };
  
  const pA = successA / nA;
  const pB = successB / nB;
  const pPool = (successA + successB) / (nA + nB);
  const se = Math.sqrt(pPool * (1 - pPool) * (1/nA + 1/nB));
  
  if (se === 0) return { significant: false, pValue: 1, confidenceLevel: 0 };
  
  const z = Math.abs(pA - pB) / se;
  
  // Approximate p-value from z-score
  const pValue = 2 * (1 - normalCDF(z));
  
  return {
    significant: pValue < 0.05,
    pValue,
    confidenceLevel: 1 - pValue,
  };
}

// Check and auto-promote winner
export async function checkTestResults(testId: string) {
  const test = await db.query.abTests.findFirst({ where: eq(abTests.id, testId) });
  if (!test || test.status !== "running") return;
  
  const variants = test.variants as ABVariant[];
  const results: Record<string, { n: number; success: number }> = {};
  
  for (const variant of variants) {
    const assignments = await db.query.abTestAssignments.findMany({
      where: and(
        eq(abTestAssignments.testId, testId),
        eq(abTestAssignments.variantId, variant.id),
      ),
    });
    
    const metric = test.primaryMetric ?? "document_return_rate";
    let successCount = 0;
    
    switch (metric) {
      case "document_return_rate":
        successCount = assignments.filter(a => a.documentUploaded).length;
        break;
      case "portal_visit_rate":
        successCount = assignments.filter(a => a.portalVisited).length;
        break;
      case "email_open_rate":
        successCount = assignments.filter(a => a.emailOpened).length;
        break;
    }
    
    results[variant.id] = { n: assignments.length, success: successCount };
  }
  
  // Check min sample size
  const allAboveMin = Object.values(results).every(r => r.n >= (test.minSampleSize ?? 30));
  if (!allAboveMin) return;
  
  // Compare all pairs (for now, just A vs B)
  const variantIds = Object.keys(results);
  if (variantIds.length === 2) {
    const a = results[variantIds[0]];
    const b = results[variantIds[1]];
    const { significant, confidenceLevel } = calculateSignificance(a.n, a.success, b.n, b.success);
    
    if (significant && confidenceLevel >= Number(test.significanceThreshold ?? 0.95)) {
      const winner = (a.success / a.n) > (b.success / b.n) ? variantIds[0] : variantIds[1];
      
      await db.update(abTests).set({
        status: "completed",
        winningVariant: winner,
        winnerDeclaredAt: new Date(),
        autoPromoted: true,
      }).where(eq(abTests.id, testId));
      
      // Auto-promote: update the sequence step to use winning variant's config
      if (test.stepId) {
        const winnerConfig = (test.variants as ABVariant[]).find(v => v.id === winner)!.config;
        await db.update(sequenceSteps).set({
          subjectTemplate: winnerConfig.subject as string ?? undefined,
          bodyTemplate: winnerConfig.body as string ?? undefined,
        }).where(eq(sequenceSteps.id, test.stepId));
      }
    }
  }
}
```

### API Endpoints

```typescript
// src/server/trpc/routers/ab-tests.ts

export const abTestsRouter = router({
  create: protectedProcedure
    .input(z.object({
      campaignId: z.string().uuid(),
      stepId: z.string().uuid().optional(),
      name: z.string(),
      testType: z.enum(["subject_line", "message_body", "send_time", "channel"]),
      variants: z.array(z.object({
        id: z.string(),
        name: z.string(),
        weight: z.number().min(1).max(100),
        config: z.record(z.unknown()),
      })).min(2).max(4),
      primaryMetric: z.enum(["document_return_rate", "portal_visit_rate", "email_open_rate", "reply_rate"]).default("document_return_rate"),
      minSampleSize: z.number().min(10).default(30),
    }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  getResults: protectedProcedure
    .input(z.object({ testId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Return per-variant metrics + significance calculation
    }),

  stop: protectedProcedure
    .input(z.object({ testId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Practice-wide insights
  getInsights: protectedProcedure
    .query(async ({ ctx }) => {
      // Aggregate results across all completed A/B tests
      // "WhatsApp follow-ups get 3x the response rate of second emails"
    }),
});
```

---

## 13. Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. Add `chase_events` table
2. Add `chase_replies` table  
3. Add columns to `chase_enrollments` (pausedAt, pauseReason, resumeAt, lastReplyId)
4. Retrofit V1 to emit events for existing actions (message sent, document uploaded, etc.)
5. Set up PartyKit for WebSocket

### Phase 2: Auto-Pause + Classifier (Week 3-4)
1. Implement response classifier (Feature 4)
2. Implement auto-pause on reply (Feature 1)
3. Set up email inbound webhook (Resend)
4. Extend Twilio inbound webhook for reply detection
5. Add `classification_corrections` table

### Phase 3: Event-Driven Engine (Week 5-6)
1. Add `sequence_steps` and `enrollment_step_states` tables
2. Implement SequenceEngine
3. Migrate existing campaigns to sequence steps
4. Modify cron to use new engine
5. Implement progress-based messaging (Feature 3)

### Phase 4: Intelligence Features (Week 7-8)
1. OOO detection (Feature 5)
2. Smart send time (Feature 6) — add `client_engagement_patterns`
3. Engagement tracking on all events

### Phase 5: UI Features (Week 9-10)
1. Unified Response Hub (Feature 7)
2. Analytics Dashboard V2 (Feature 8)
3. WebSocket integration for real-time updates

### Phase 6: Templates + Testing (Week 11-12)
1. Chase Template Library (Feature 9) — add `chase_templates`
2. Seed system templates
3. A/B Testing (Feature 10) — add `ab_tests`, `ab_test_assignments`
4. AI template generator

### Database Migration Files

```
drizzle/migrations/
  0001_add_chase_events.sql
  0002_add_chase_replies.sql
  0003_add_enrollment_pause_columns.sql
  0004_add_sequence_steps.sql
  0005_add_enrollment_step_states.sql
  0006_add_classification_corrections.sql
  0007_add_client_engagement_patterns.sql
  0008_add_chase_templates.sql
  0009_add_ab_tests.sql
  0010_add_ab_test_assignments.sql
  0011_backfill_sequence_steps.sql
```

---

## 14. AI Cost Model

### Per-Practice Monthly Estimates (Typical 200-client practice)

| Operation | Frequency | Model | Cost/call | Monthly cost |
|-----------|-----------|-------|-----------|-------------|
| Reply classification | ~100 replies | Haiku 3.5 | $0.00015 | $0.015 |
| OOO date parsing | ~10 OOO replies | Sonnet 3.5 | $0.0012 | $0.012 |
| Template generation | ~2 templates | Sonnet 3.5 | $0.005 | $0.01 |
| Document classification (V1) | ~500 docs | Haiku 3.5 | $0.0003 | $0.15 |
| **Total per practice** | | | | **~$0.19/mo** |

### Platform-Wide (1,000 practices)

| | Monthly | Annual |
|---|---------|--------|
| AI costs | ~$190 | ~$2,280 |
| QStash | ~$25 | ~$300 |
| PartyKit | ~$5 | ~$60 |
| **Total V2 infra addition** | **~$220** | **~$2,640** |

AI costs are negligible. Even at 10,000 practices: ~$1,900/month.

### Cost Controls

```typescript
// src/server/services/ai-cost-guard.ts

const MONTHLY_AI_BUDGET_PENCE = 10000; // £100 hard cap

export async function checkAIBudget(practiceId: string): Promise<boolean> {
  const key = `ai_spend:${practiceId}:${format(new Date(), "yyyy-MM")}`;
  const currentSpend = parseInt(await redis.get(key) ?? "0");
  return currentSpend < MONTHLY_AI_BUDGET_PENCE;
}

export async function recordAISpend(practiceId: string, costPence: number) {
  const key = `ai_spend:${practiceId}:${format(new Date(), "yyyy-MM")}`;
  await redis.incrby(key, Math.ceil(costPence));
  await redis.expire(key, 60 * 60 * 24 * 35); // 35 day TTL
}
```

---

## 15. WebSocket Real-Time Layer

### PartyKit Setup

```typescript
// partykit/chase-room.ts
import type { Party, Server, Connection } from "partykit/server";

export default class ChaseRoom implements Server {
  constructor(readonly room: Party) {}

  onConnect(conn: Connection) {
    // Validate auth token from connection URL params
    const token = new URL(conn.url!).searchParams.get("token");
    if (!validatePracticeToken(token)) {
      conn.close(4001, "Unauthorized");
    }
  }

  onMessage(message: string, sender: Connection) {
    // Broadcast to all connections in this room (practice)
    this.room.broadcast(message, [sender.id]);
  }
}
```

### Events pushed via WebSocket

| Event | Payload | UI Update |
|-------|---------|-----------|
| `reply_received` | reply summary | Response Hub badge, inbox list |
| `document_uploaded` | doc info, enrollment progress | Dashboard progress bars |
| `chase_completed` | enrollment summary | Dashboard completion count |
| `reply_classified` | intent, confidence, action | Response Hub intent badge |
| `chase_paused` | enrollment, reason | Dashboard status |
| `ooo_detected` | client, return date | Response Hub alert |

---

## 16. Implementation Order

```
Priority  Feature                          Effort   Dependencies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   P0     Event Sourcing Foundation         3d      None
   P0     Auto-Pause on Reply (#1)          5d      Events
   P0     Response Classifier (#4)          3d      Events
   P1     Event-Driven Sequence Engine (#2) 8d      Events
   P1     Progress-Based Messaging (#3)     3d      Sequence Engine
   P1     OOO Detection (#5)               2d      Classifier
   P2     Unified Response Hub (#7)         5d      Replies, Classifier
   P2     Smart Send Time (#6)             4d      Events
   P2     Analytics Dashboard V2 (#8)       5d      Events
   P3     Chase Template Library (#9)       4d      Sequence Engine
   P3     A/B Testing (#10)                5d      Sequence Engine
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         TOTAL                             ~47d
```

### New Files Summary

```
src/server/db/schema.ts                          — Extended with 8 new tables
src/server/services/
  event-emitter.ts                               — Event sourcing core
  sequence-engine.ts                             — Event-driven sequence engine
  response-classifier.ts                         — AI reply classification
  ooo-detector.ts                                — Out-of-office detection
  send-time-optimiser.ts                         — Smart send time
  template-renderer.ts                           — Dynamic message templates
  template-generator.ts                          — AI template generation
  ab-testing.ts                                  — A/B test management
  ab-statistics.ts                               — Statistical significance
  ai-cost-guard.ts                               — AI spend tracking
  holiday-awareness.ts                           — UK holiday season handling

src/server/trpc/routers/
  replies.ts                                     — Reply management
  response-hub.ts                                — Unified inbox
  analytics.ts                                   — V2 analytics
  templates.ts                                   — Template library
  ab-tests.ts                                    — A/B testing

src/app/api/
  events/process/route.ts                        — Event processor (QStash target)
  webhooks/email/inbound/route.ts                — Resend inbound email
  cron/engagement-sync/route.ts                  — Sync engagement patterns

src/app/(dashboard)/
  inbox/page.tsx                                 — Response Hub
  inbox/components/*.tsx
  analytics/page.tsx                             — V2 Analytics
  analytics/components/*.tsx
  templates/page.tsx                             — Template Library
  templates/[id]/page.tsx
  templates/generate/page.tsx
  templates/components/*.tsx

partykit/
  chase-room.ts                                  — WebSocket server

src/scripts/
  migrate-v1-sequences.ts                        — V1 → V2 migration
  seed-templates.ts                              — System template seeder
```

---

## Appendix A: New Enum Values

Add to existing `enrollment_status` enum:
```sql
ALTER TYPE enrollment_status ADD VALUE 'paused_reply';
ALTER TYPE enrollment_status ADD VALUE 'paused_ooo';
```

Add to existing `audit_action` enum:
```sql
ALTER TYPE audit_action ADD VALUE 'reply_classify';
ALTER TYPE audit_action ADD VALUE 'reply_review';
ALTER TYPE audit_action ADD VALUE 'chase_pause';
ALTER TYPE audit_action ADD VALUE 'chase_resume';
ALTER TYPE audit_action ADD VALUE 'ab_test_create';
ALTER TYPE audit_action ADD VALUE 'template_publish';
```

## Appendix B: Environment Variables (New)

```env
# PartyKit WebSocket
NEXT_PUBLIC_PARTYKIT_HOST=chase-md.username.partykit.dev
PARTYKIT_TOKEN=pk_...

# Resend Inbound
RESEND_INBOUND_WEBHOOK_SECRET=whsec_...

# AI Cost Controls  
AI_MONTHLY_BUDGET_PENCE=10000
```

## Appendix C: QStash Job Types (New)

| Job | URL | Schedule | Purpose |
|-----|-----|----------|---------|
| Process event | `/api/events/process` | On-demand | Process chase events |
| Step timeout | `/api/cron/chase` | Every 5 min | Check step timeouts + scheduled resumes |
| Engagement sync | `/api/cron/engagement-sync` | Every 6 hours | Sync Redis heatmaps to Postgres |
| A/B test check | `/api/cron/ab-test-check` | Every hour | Check for statistical significance |

---

*End of V2 Technical Specification*
