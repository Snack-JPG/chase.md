# chase.md — Definition of Done (DoD)

## Global DoD (Every Feature)

A feature is **done** when:

- [ ] Code is written, typed (TypeScript strict), and linted (ESLint + Prettier)
- [ ] Works on mobile (tested on iPhone Safari + Android Chrome)
- [ ] Works on desktop (Chrome, Firefox, Safari)
- [ ] Has error handling — no unhandled exceptions, user sees helpful error messages
- [ ] Loading states exist — no blank screens, no hanging spinners
- [ ] Accessible — semantic HTML, keyboard navigable, screen reader basics
- [ ] Secure — no exposed secrets, no SQL injection, no XSS, auth checked on every endpoint
- [ ] GDPR compliant — consent tracked, data minimised, audit trail exists
- [ ] Tested — critical paths have integration tests, edge cases considered
- [ ] Deployed — live on Vercel preview, no build errors
- [ ] Documented — README updated if setup/config changed

---

## Phase 1: MVP (Weeks 1-8) — "The Chase Engine"

### Epic 1: Project Foundation
**Done when:**
- [ ] Next.js 15 app scaffolded with App Router
- [ ] TypeScript strict mode enabled
- [ ] Tailwind CSS + shadcn/ui component library configured
- [ ] Neon Postgres database provisioned + Drizzle ORM configured
- [ ] Database schema deployed: practices, users, clients, document_templates, client_documents, chase_campaigns, chase_messages, magic_links, consent_records
- [ ] Clerk auth integrated for practice staff (login, signup, team invite)
- [ ] Magic link system for clients (custom — JWT with 30-day expiry, no password)
- [ ] Stripe billing skeleton (subscription plans defined, webhook handler)
- [ ] Resend email configured (domain verified, test email sends)
- [ ] WhatsApp Business API configured via Twilio (sandbox for dev, production when verified)
- [ ] Cloudflare R2 bucket provisioned (encrypted, signed URLs working)
- [ ] Sentry error tracking connected
- [ ] PostHog analytics connected
- [ ] CI/CD: push to main → deploy to Vercel
- [ ] Git repo initialised, README with setup instructions
- [ ] `.env.example` with all required env vars documented

### Epic 2: Practice Onboarding
**Done when:**
- [ ] Practice can sign up (Clerk) and land on empty dashboard
- [ ] Practice can set their branding (name, logo — used on client portal + emails)
- [ ] Practice can invite team members with roles (admin, staff)
- [ ] Subscription plan selected (Stripe checkout) — free trial for 14 days
- [ ] Onboarding checklist shown until core setup complete

### Epic 3: Client Management
**Done when:**
- [ ] Practice can add clients manually (name, email, phone, type: SA/Ltd/VAT/Payroll)
- [ ] Practice can bulk import clients via CSV upload (with column mapping UI)
- [ ] Practice can edit/archive clients
- [ ] Each client has a profile page showing: info, documents status, chase history, channel preferences
- [ ] Client type determines default document checklist (auto-assigned, editable)

### Epic 4: Document Templates & Checklists
**Done when:**
- [ ] Pre-built document templates exist for: Self-Assessment (individual), Self-Assessment (landlord), Ltd Company Accounts, VAT Quarterly, Payroll/P11D, MTD ITSA Quarterly
- [ ] Each template has: document name, description, help text ("What is this?", "Where to find it")
- [ ] Practice can create custom templates
- [ ] Practice can customise per-client checklists (add/remove documents)
- [ ] Each document item tracks: status (pending/received/verified), file URL, upload date, classification

### Epic 5: Chase Engine
**Done when:**
- [ ] Practice can create a chase campaign (name, deadline, target clients, schedule)
- [ ] Chase schedule configurable: e.g., Day 0, Day 14, Day 28, Day 42
- [ ] Chase messages auto-generated referencing SPECIFIC missing documents per client
- [ ] Tone escalation across stages: friendly → specific → urgent → formal
- [ ] Email sending via Resend with practice branding
- [ ] WhatsApp sending via Twilio Business API with pre-approved templates
- [ ] Channel logic: start with email, escalate to WhatsApp after configurable trigger (e.g., email ignored for X days)
- [ ] Chase skips clients who are 100% complete
- [ ] Chase pauses if client uploads something (grace period before next chase)
- [ ] Practice can manually pause/resume/skip chase per client
- [ ] Email open + click tracking working
- [ ] WhatsApp delivery + read receipt tracking working
- [ ] All messages logged with timestamp, channel, content, status

### Epic 6: Client Upload Portal
**Done when:**
- [ ] Each client has a unique magic link URL (no login required)
- [ ] Portal is mobile-first (tested on real phones)
- [ ] Portal shows: practice branding, client name, document checklist, progress bar
- [ ] Each document item has: help tooltip, file upload zone (drag-and-drop + camera capture)
- [ ] Upload supports: PDF, JPG, PNG, HEIC (iPhone photos), DOC/DOCX, XLS/XLSX
- [ ] File size limit: 25MB per file
- [ ] Upload goes to R2 with virus scanning
- [ ] Instant confirmation on upload: "✅ Received! X of Y complete"
- [ ] Progress bar updates in real-time
- [ ] Completion celebration: "🎉 All done!" message
- [ ] Client can see what's received vs what's still needed
- [ ] No jargon — plain English labels with help text
- [ ] Consent capture: first visit shows "Your accountant uses chase.md to collect documents. We may send reminders via email/WhatsApp. [Accept] [Manage preferences]"
- [ ] Consent timestamp logged in database
- [ ] Opt-out mechanism: STOP keyword on WhatsApp, unsubscribe link on email

### Epic 7: Practice Dashboard
**Done when:**
- [ ] Overview: total clients, % complete, % in progress, % not started, % overdue
- [ ] Client list view: sortable by name, status, completion %, last activity, deadline
- [ ] Traffic light system: green (complete), amber (in progress), red (overdue/no response)
- [ ] Filter by: client type, assigned staff member, campaign, status
- [ ] Quick actions: chase now, pause chase, mark complete, view portal
- [ ] Campaign overview: active campaigns, progress per campaign
- [ ] Notifications: "3 new documents received overnight"
- [ ] Staff view: "My clients" filtered to assigned clients only
- [ ] Export: CSV download of client status for reporting

### Epic 8: GDPR & Compliance Layer
**Done when:**
- [ ] Data Processing Agreement (DPA) template available for practices to sign
- [ ] Consent records stored: client ID, channel, consent type, timestamp, method
- [ ] Opt-out handling: WhatsApp STOP → auto-disable WhatsApp for that client
- [ ] Email unsubscribe → auto-disable email for that client
- [ ] Right to erasure: practice can delete all client data (files + records)
- [ ] Audit log: all actions (messages sent, documents received, consent changes) timestamped
- [ ] Data residency: all data stored in UK/EU (Neon EU region, R2 EU)
- [ ] Privacy policy page on client portal
- [ ] ICO registration reminder in practice onboarding

---

## Phase 2: Growth (Weeks 9-20) — "Intelligence"

### Epic 9: AI Document Recognition
**Done when:**
- [ ] On upload, file sent to Claude Vision API for classification
- [ ] Classification: document type, confidence score, tax year, issuer
- [ ] High confidence (>85%): auto-classify and tick checklist
- [ ] Low confidence: flag for practice review with suggested classification
- [ ] Classification metadata stored alongside document
- [ ] Practice dashboard shows AI-classified vs manually-classified

### Epic 10: Xero Integration
**Done when:**
- [ ] OAuth 2.0 flow to connect Xero account
- [ ] Pull client list from Xero (name, email, phone, type)
- [ ] Auto-sync: new Xero contacts → new chase.md clients
- [ ] Client type auto-detected from Xero data
- [ ] Xero App Marketplace submission prepared

### Epic 11: Client Behaviour Analytics
**Done when:**
- [ ] Per-client tracking: email opens, WhatsApp reads, upload times, response lag
- [ ] Client behaviour profile: responsive/slow/ghost classification
- [ ] Practice analytics: overall response rates by channel, best times to chase, worst offender clients
- [ ] "Time saved" metric calculated and displayed: "chase.md saved your practice X hours this quarter"

### Epic 12: Predictive Chasing
**Done when:**
- [ ] System learns optimal chase timing per client from historical data
- [ ] Auto-schedule: "Client X responds to WhatsApp on Tuesday mornings" → schedule accordingly
- [ ] Channel recommendation: "This client ignores email but responds to WhatsApp in <2 hours"

---

## Phase 3: Dominance (Weeks 21-40) — "Platform"

### Epic 13: HMRC API Integration
- [ ] Pull MTD ITSA obligations and deadlines per client
- [ ] Auto-create quarterly chase cycles from HMRC data

### Epic 14: Sage Integration
- [ ] OAuth flow, client sync, same as Xero

### Epic 15: Practice Analytics & Reporting
- [ ] Annual report: total hours saved, response rates, channel effectiveness
- [ ] Seasonal comparison: this January vs last January
- [ ] Client fee justification: "We chased Dave 47 times across 3 channels"

### Epic 16: API & Integrations
- [ ] Public API for practice management tools to pull chase status
- [ ] Webhook support: "document received" events for downstream tools

---

*This DoD is a living document. Update as scope evolves.*
*Last updated: 15 February 2026*
