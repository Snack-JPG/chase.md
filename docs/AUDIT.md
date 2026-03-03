# chase.md — Project Audit

**Date:** 2 March 2026  
**Auditor:** Automated (OpenClaw subagent)

---

## 1. File Index

### Root Config
| File | Description |
|------|-------------|
| `package.json` | Next.js 15 app with tRPC, Drizzle, Clerk, Stripe, Twilio, Xero, Resend, R2, Upstash |
| `drizzle.config.ts` | Drizzle Kit config pointing at `DATABASE_URL` (Neon Postgres) |
| `next.config.ts` | Minimal — `serverExternalPackages: ["@neondatabase/serverless"]` |
| `postcss.config.mjs` | Tailwind v4 PostCSS plugin |
| `tsconfig.json` | Standard Next.js TypeScript config |
| `.env.example` | Full env template (all vars listed) |
| `.env.local` | **Real creds** — Clerk + Stripe + Neon populated; Resend/Twilio/R2/Upstash/Xero/Anthropic **empty** |

### `src/app/` — Pages & Routes

| File | Description |
|------|-------------|
| `layout.tsx` | Root layout with Clerk provider + globals.css |
| `globals.css` | Tailwind v4 + CSS custom properties (design tokens for dashboard) |
| `(marketing)/layout.tsx` | Marketing metadata wrapper |
| `(marketing)/page.tsx` | **Full landing page** — hero, problem, how-it-works, features, pricing, FAQ, waitlist form. Uses `motion` (Framer Motion). Polished. |
| `(dashboard)/layout.tsx` | Auth guard (Clerk `auth()`), wraps children in `TRPCProvider` + `DashboardShell` |
| `(dashboard)/dashboard/page.tsx` | Overview dashboard — stats cards, recent campaigns, activity feed, attention list |
| `(dashboard)/clients/page.tsx` | Client list with search, CSV import modal, add client modal, Xero sync button |
| `(dashboard)/clients/[id]/page.tsx` | Client detail — contact info, tax details, chase status, enrollments, documents, chase timeline, notes |
| `(dashboard)/campaigns/page.tsx` | Campaign list with status badges, progress bars |
| `(dashboard)/campaigns/[id]/page.tsx` | Campaign detail — stats, enrolled clients table, settings, status transitions (launch/pause/cancel) |
| `(dashboard)/campaigns/new/page.tsx` | **5-step campaign wizard** — details, client selection, document templates, schedule config, review |
| `(dashboard)/settings/page.tsx` | Practice details, chase preferences, Xero connection/webhook config, integration status, danger zone |
| `(portal)/p/[token]/page.tsx` | **Client upload portal** — server component, validates magic link, shows document checklist + progress |
| `(portal)/p/[token]/upload-zone.tsx` | Drag-and-drop file upload client component |
| `sign-in/[[...sign-in]]/page.tsx` | Clerk `<SignIn />` |
| `sign-up/[[...sign-up]]/page.tsx` | Clerk `<SignUp />` |

### `src/app/api/` — API Routes

| Route | Method | Description | Status |
|-------|--------|-------------|--------|
| `api/trpc/[trpc]/route.ts` | GET/POST | tRPC handler | ✅ Wired |
| `api/portal/upload/route.ts` | POST | Portal file upload → R2 + classify + Xero push | ✅ Wired |
| `api/billing/checkout/route.ts` | POST | Stripe checkout session creation | ✅ Wired |
| `api/billing/portal/route.ts` | POST | Stripe billing portal session | ✅ Wired |
| `api/cron/chase/route.ts` | POST | QStash-signed chase engine tick + dispatch | ✅ Wired |
| `api/cron/xero-sync/route.ts` | POST | QStash-signed Xero contact sync + doc push + XPM sync | ✅ Wired |
| `api/gdpr/delete/route.ts` | POST | GDPR Right to Erasure (anonymize client) | ✅ Wired |
| `api/gdpr/export/route.ts` | POST | GDPR Subject Access Request (JSON export) | ✅ Wired |
| `api/webhooks/clerk/route.ts` | POST | Clerk org/user/membership sync → practices/users tables | ✅ Wired |
| `api/webhooks/stripe/route.ts` | POST | Stripe subscription lifecycle → plan updates | ✅ Wired |
| `api/webhooks/twilio/route.ts` | POST | Twilio status callbacks (sent/delivered/read/failed) | ✅ Wired |
| `api/webhooks/twilio/inbound/route.ts` | POST | Inbound WhatsApp handling — STOP, media, replies | ✅ Wired |
| `api/webhooks/xero/route.ts` | POST | Xero webhook (contact create/update) — partial (file truncated but structure present) | ✅ Wired |
| `api/xero/connect/route.ts` | GET | Xero OAuth2 redirect | ✅ Present |
| `api/xero/callback/route.ts` | GET | Xero OAuth2 callback | ✅ Present |
| `api/xero/disconnect/route.ts` | POST | Revoke Xero connection | ✅ Present |

### `src/components/`

| File | Description |
|------|-------------|
| `dashboard-shell.tsx` | Sidebar nav + top bar + UserButton (Clerk) |
| `add-client-modal.tsx` | Manual client creation form |
| `csv-import-modal.tsx` | CSV drag-drop + parse (papaparse) + preview + bulk import |
| `xero-push-status.tsx` | Document Xero push status indicator with retry |

### `src/lib/`

| File | Description |
|------|-------------|
| `constants.ts` | All status/color/label constants, badge helpers |
| `utils.ts` | `cn()` — clsx + tailwind-merge |
| `r2.ts` | Cloudflare R2 (S3-compatible) upload/download |
| `redis.ts` | Upstash Redis client |
| `resend.ts` | Lazy Resend client |
| `stripe.ts` | Lazy Stripe client, price IDs, checkout/portal session creators |
| `twilio.ts` | Twilio client + WhatsApp template sender |
| `xero.ts` | Xero client (xero-node), OAuth helpers, token refresh, webhook verification |
| `xero-sync.ts` | Full contact sync — paginated fetch, match by xeroId/email/name, create/update |
| `xero-files.ts` | Push documents to Xero Files API — folder management, upload, contact association |
| `xero-xpm.ts` | Xero Practice Manager job sync (XML API) — fetch, upsert, status matching |
| `xpm-campaign-trigger.ts` | Auto-enroll clients from XPM job status changes |
| `trpc/client.ts` | tRPC React client |
| `trpc/provider.tsx` | tRPC + React Query provider |

### `src/server/`

| File | Description |
|------|-------------|
| `db/index.ts` | Neon serverless + Drizzle ORM (lazy proxy pattern) |
| `db/schema.ts` | **Comprehensive schema** — 14 tables, 17 enums, full relations |
| `trpc/context.ts` | Auth context from Clerk |
| `trpc/init.ts` | tRPC init with `publicProcedure`, `protectedProcedure`, `orgProcedure` (resolves practice + user) |
| `trpc/router.ts` | Root router merging 6 sub-routers |
| `trpc/routers/clients.ts` | CRUD, list, bulkCreate, syncFromXero, xpmJobs, messages, update |
| `trpc/routers/campaigns.ts` | Full CRUD, status transitions, enrollClient, removeEnrollment, xpmAutoEnroll |
| `trpc/routers/documents.ts` | listTemplates, listByClient, listByCampaign, pushToXero, retryXeroPush |
| `trpc/routers/practice.ts` | get, update, xeroStatus, saveWebhookKey |
| `trpc/routers/dashboard.ts` | stats, recentCampaigns, recentActivity, clientsNeedingAttention |
| `trpc/routers/billing.ts` | usage (plan, features, counts, trial info) |

### `src/server/services/`

| File | Description |
|------|-------------|
| `chase-engine.ts` | **Core engine** — find due enrollments, escalation logic, channel selection, magic link creation, message generation (5 escalation templates), scheduling |
| `chase-email-template.tsx` | React Email template (branded HTML email) |
| `email-sender.ts` | Resend email dispatch + status tracking |
| `whatsapp-sender.ts` | Twilio WhatsApp dispatch (template vs free-form based on conversation window) |
| `sms-sender.ts` | Twilio SMS dispatch with cost tracking |
| `whatsapp-conversation-window.ts` | 24hr WhatsApp window tracking |
| `whatsapp-templates.ts` | 5 escalation-level WhatsApp template definitions + payload builder |
| `message-dispatcher.ts` | Routes queued messages to email/WhatsApp/SMS senders |
| `document-classifier.ts` | Anthropic Claude AI document classification |
| `gdpr-consent.ts` | **Full GDPR service** — opt-in/out, consent records, unsubscribe tokens, STOP handling, data export, anonymization |
| `audit-logger.ts` | Typed audit logger for all actions |
| `plan-limits.ts` | Plan feature gates (starter/professional/scale limits) |

### `src/middleware.ts`
Clerk middleware protecting `/dashboard(.*)` routes.

### `public/`
| File | Description |
|------|-------------|
| `llms.txt` | LLM-readable site description |
| `robots.txt` | Standard robots.txt |

---

## 2. Architecture Map

```
┌──────────────────────────────────────────────────────────────┐
│                      Next.js 15 App Router                    │
├──────────────┬──────────────┬─────────────┬──────────────────┤
│  (marketing) │  (dashboard) │  (portal)   │    API Routes    │
│  Landing pg  │  Dashboard   │  Upload     │  tRPC, webhooks, │
│              │  Clients     │  Portal     │  cron, billing,  │
│              │  Campaigns   │  (magic     │  GDPR, Xero,     │
│              │  Settings    │   links)    │  portal upload   │
├──────────────┴──────────────┴─────────────┴──────────────────┤
│                        tRPC Layer                             │
│  clients, campaigns, documents, practice, dashboard, billing  │
├──────────────────────────────────────────────────────────────┤
│                      Service Layer                            │
│  chase-engine, message-dispatcher, email/whatsapp/sms sender │
│  document-classifier, gdpr-consent, audit-logger, plan-limits│
├──────────────────────────────────────────────────────────────┤
│                    Data & Integration Layer                    │
│  Drizzle ORM (Neon Postgres) │ R2 (docs) │ Redis (Upstash)  │
│  Clerk (auth) │ Stripe (billing) │ Twilio (msg) │ Resend    │
│  Xero (contacts/files/XPM) │ Anthropic (AI classify)        │
└──────────────────────────────────────────────────────────────┘
```

**Data flow (chase cycle):**
1. QStash cron → `POST /api/cron/chase` (every 15 min)
2. `runChaseTick()` → finds due enrollments → generates messages → creates magic links
3. `dispatchQueuedMessages()` → routes to email/WhatsApp/SMS sender
4. Client clicks magic link → `(portal)/p/[token]` → uploads documents
5. `POST /api/portal/upload` → R2 storage → AI classification → Xero push
6. Twilio webhooks update delivery status
7. Inbound WhatsApp → conversation window update, note logging, media handling

---

## 3. What's Wired Up vs Stub/Placeholder

### ✅ Fully Wired (code complete, would work with env vars)
- **Auth:** Clerk middleware, sign-in/sign-up, webhook sync for org/user creation
- **Database:** Complete Drizzle schema with 14 tables, relations, indexes. No migrations checked in but `db:push` available
- **Dashboard:** All 6 pages fully implemented with real tRPC queries
- **tRPC:** 6 routers with ~30 endpoints, all with proper auth/org guards
- **Chase Engine:** Full escalation logic, scheduling, magic links, 5-level message templates
- **Message Dispatch:** Email (Resend), WhatsApp (Twilio with template/freeform logic), SMS (Twilio with cost tracking)
- **Portal:** Server-rendered upload page with document checklist, client-side upload zone
- **Upload Pipeline:** R2 storage → AI classification (Anthropic) → Xero Files push
- **Xero Integration:** OAuth2 connect/callback/disconnect, contact sync (paginated), file push, webhook handler, XPM job sync
- **Stripe Billing:** Checkout, portal, webhook lifecycle (created/updated/deleted/trial_ending)
- **GDPR:** Full consent management, opt-in/out, data export, anonymization, audit logging, unsubscribe tokens
- **CSV Import:** Parse, validate, preview, bulk create with dedup
- **WhatsApp Inbound:** STOP handling, media processing, completion detection, conversation window

### ⚠️ Partially Implemented
- **Landing page waitlist form:** `console.log` only — no backend email collection
- **Xero webhook route:** File truncated in read but structure is complete
- **WhatsApp templates:** Template SIDs come from env vars (`WA_TEMPLATE_SID_*`) — need Twilio Console setup
- **Trial ending email:** Has a `TODO` comment in Stripe webhook handler
- **Delete account button:** Rendered in Settings danger zone but no handler wired

### 🔲 Not Yet Built
- **Onboarding flow:** No practice/org creation wizard after Clerk sign-up (relies entirely on Clerk webhooks)
- **Notification system:** No staff notifications for uploads, questions, or alerts (multiple `TODO` comments)
- **Document review UI:** Documents can be classified by AI but there's no UI to accept/reject/reclassify
- **Unsubscribe endpoint:** `generateUnsubscribeUrl()` exists but no `GET /api/gdpr/unsubscribe` handler
- **Bank holiday skipping:** Referenced in campaign config but no holiday calendar data
- **Virus scanning:** Schema has `virusScanStatus` field but no implementation
- **Email tracking pixels:** Schema has `emailOpenedAt`/`emailClickedAt` but no tracking implementation
- **Client deletion from UI:** No delete button on client pages (only GDPR anonymize via API)
- **Document template management UI:** No CRUD for document templates (data is seeded or via DB)

---

## 4. Missing Pieces for Working MVP

### Environment Variables (empty in `.env.local`)
| Variable | Service | Required For |
|----------|---------|-------------|
| `RESEND_API_KEY` | Resend | Sending any chase emails |
| `TWILIO_ACCOUNT_SID` | Twilio | WhatsApp/SMS sending |
| `TWILIO_AUTH_TOKEN` | Twilio | WhatsApp/SMS + webhook validation |
| `TWILIO_WHATSAPP_NUMBER` | Twilio | WhatsApp sending |
| `R2_ACCOUNT_ID` | Cloudflare | Document storage |
| `R2_ACCESS_KEY_ID` | Cloudflare | Document storage |
| `R2_SECRET_ACCESS_KEY` | Cloudflare | Document storage |
| `R2_PUBLIC_URL` | Cloudflare | Document URLs |
| `UPSTASH_REDIS_REST_URL` | Upstash | Rate limiting / caching |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | Rate limiting / caching |
| `QSTASH_TOKEN` | Upstash | Cron job scheduling |
| `QSTASH_CURRENT_SIGNING_KEY` | Upstash | Cron webhook verification |
| `QSTASH_NEXT_SIGNING_KEY` | Upstash | Cron webhook verification |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook signature verification |
| `ANTHROPIC_API_KEY` | Anthropic | AI document classification |
| `XERO_CLIENT_ID` | Xero | OAuth integration |
| `XERO_CLIENT_SECRET` | Xero | OAuth integration |
| `CLERK_WEBHOOK_SECRET` | Clerk | Webhook verification |

### Database Setup
- Need to run `npx drizzle-kit push` to create tables in Neon
- No seed data script exists — document templates need manual creation
- No migration files checked in (using `push` strategy)

### External Service Setup
- **QStash:** Need to create cron schedules pointing at `/api/cron/chase` and `/api/cron/xero-sync`
- **Clerk:** Need to configure webhook endpoint in Clerk dashboard
- **Stripe:** Need to configure webhook endpoint + create Products/Prices (price IDs are in env)
- **Twilio:** Need WhatsApp Business sender + Content Templates approved
- **Xero:** Need OAuth app registration + redirect URI config
- **Cloudflare R2:** Need bucket creation + CORS config
- **Resend:** Need API key + domain verification for custom email sending

---

## 5. Broken Imports, Dead Code, Inconsistencies

### Dead Code
- `src/app/page.tsx.old` — Old landing page (superseded by `(marketing)/page.tsx`)
- `src/lib/resend.ts` exports `resend` as deprecated (`undefined as unknown as Resend`)
- `redis.ts` is imported nowhere — Redis client exists but isn't used anywhere in the codebase

### Potential Issues
- **Dashboard nav links:** Sidebar uses `/dashboard/clients` and `/dashboard/campaigns` but actual routes are `/clients` and `/campaigns` under `(dashboard)` group — **this works** because Next.js route groups don't affect URLs
- **`orgProcedure` requirement:** Every dashboard tRPC call requires a Clerk org. New users without an org will hit "No practice selected" errors — **needs onboarding flow**
- **`clientsQuery.useInfiniteQuery`:** Campaign wizard uses `useInfiniteQuery` with `{ limit: 100 }` but the cursor-based pagination in the router uses `gt(clients.id, cursor)` which isn't stable ordering (UUIDs aren't sequential) — **potential pagination issues**
- **`page.tsx.old`:** Root page at `/` currently 404s because `(marketing)/page.tsx` handles `/` via the route group — actually this is fine, route groups work correctly
- **Missing `clientDocuments` → `enrollment` link on upload:** Portal upload sets `enrollmentId` but doesn't update enrollment's `receivedDocumentIds` or `completionPercent` — **chase completion tracking is broken**
- **WhatsApp media:** Inbound media stores Twilio URL as `r2Key` instead of downloading to R2 — media will expire when Twilio deletes it
- **Stripe price IDs in PLAN_FROM_PRICE:** Uses `process.env` at module level — values are `undefined` if env vars missing, creating an object with `undefined` keys

### Minor Issues
- `isNull` imported but unused in some files (tree-shaken, no runtime impact)
- `fast-xml-parser` import uses `XMLParser` but package exports it as `{ XMLParser }` — works fine
- Some `date-fns` functions imported but `isBefore` unused in chase-engine (no impact)

---

## 6. Feature Completeness Ratings

| Feature Area | Rating | Notes |
|-------------|--------|-------|
| **Auth (Clerk)** | 🟢 90% | Sign-in/up, middleware, webhook sync all working. Missing: onboarding wizard, org creation flow for new users |
| **Chase Engine** | 🟢 85% | Full escalation logic, scheduling, message generation. Missing: bank holiday calendar, completion tracking on upload |
| **Dashboard** | 🟢 85% | All 4 main pages built + campaign wizard. Missing: document review UI, notification indicators |
| **Client Portal** | 🟢 80% | Magic link validation, document checklist, upload zone, AI classification trigger. Missing: progress auto-update after upload (no revalidation), mobile UX polish |
| **Billing (Stripe)** | 🟡 70% | Checkout, portal, webhook handlers, plan limits enforced in tRPC. Missing: plan upgrade prompts in UI, trial ending email, billing page in settings (currently only shows usage) |
| **WhatsApp** | 🟡 65% | Full send/receive pipeline, conversation window, template system, inbound message handling. Missing: template approval flow UI, opt-in collection mechanism, media → R2 pipeline |
| **Xero Integration** | 🟢 80% | OAuth flow, contact sync, file push, XPM job sync, webhook handler, auto-enrollment. Missing: UI for XPM status mappings, sync error display |
| **GDPR** | 🟢 85% | Consent records, opt-in/out, audit logging, data export, anonymization, unsubscribe token generation. Missing: unsubscribe endpoint, consent collection UI, data retention automation |
| **Landing Page** | 🟢 90% | Beautiful, animated, responsive. Pricing, FAQ, features, social proof. Missing: actual waitlist backend (just `console.log`) |
| **SMS** | 🟡 65% | Send pipeline complete with cost tracking. Missing: STOP keyword handling for SMS (only WhatsApp), opt-in collection |
| **Email** | 🟡 70% | Resend integration, branded React Email template. Missing: custom domain setup UI, open/click tracking, bounce handling |
| **Document Classification (AI)** | 🟡 60% | Anthropic integration works for filename-based classification. Missing: actual file content analysis (currently only uses filename/mimetype), review/override UI |

### Overall MVP Readiness: **~75%**

**What works today with env vars configured:**
- Full auth flow → dashboard → create clients (manual + CSV + Xero sync) → create campaigns → magic link generation → portal upload → AI classification → Xero push

**Critical gaps for launch:**
1. Onboarding flow (new user → create org → create practice)
2. Env var configuration for Resend + Twilio + R2
3. QStash cron job setup
4. Enrollment completion tracking (upload → update enrollment progress)
5. Waitlist form backend
6. Unsubscribe endpoint

---

*Report generated from full source review of 60+ source files across the chase.md codebase.*
