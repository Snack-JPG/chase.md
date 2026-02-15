<div align="center">

<!-- TODO: Replace with actual logo -->
<img src="docs/assets/logo-placeholder.png" alt="chase.md" width="120" />

# chase.md

### Get your clients to send their stuff.

[![Built with Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-Proprietary-red)]()

</div>

---

## What is chase.md?

**chase.md** is an AI-powered document chasing engine for UK accountancy practices. It knows what each client needs to send, chases them intelligently across email and WhatsApp, receives documents through a frictionless mobile-first portal, recognises what's been uploaded using AI classification, and tracks everything in a single dashboard — saving practices 500–4,500 hours per year.

---

## The Problem

UK accountants waste **500–750 hours/year** chasing clients for documents. With MTD ITSA launching **April 2026**, that becomes **2,000–4,500 hours/year**. Every existing tool sends dumb email templates on a schedule. Nobody solves this intelligently.

This is a **client experience problem** disguised as a productivity problem. Fix the client's experience, and the accountant's problem disappears.

---

## The Solution

- 📋 **Smart Checklists** — Document templates by client type (SA, Ltd, VAT, MTD ITSA). Know exactly what's missing.
- 📨 **Intelligent Chasing** — Multi-channel campaigns across email + WhatsApp with tone escalation: friendly → specific → urgent → formal.
- 📱 **Magic Link Portal** — Mobile-first upload portal. No login, no passwords. Camera capture, drag-and-drop, progress bars.
- 🤖 **AI Document Recognition** — Claude Vision classifies uploads automatically. Auto-tick checklists with confidence scoring.
- 📊 **Practice Dashboard** — Traffic light overview. Filter, sort, export. See who's done, who's ghosting, who needs a nudge.
- 💬 **WhatsApp-First** — First mover in accountant→client WhatsApp chasing. Chase where clients actually are.
- 🔒 **GDPR Compliant** — Consent tracking, opt-out handling, audit logs, UK/EU data residency. Built in, not bolted on.
- 💷 **Stripe Billing** — Simple per-practice pricing. 14-day free trial. No per-user fees.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Database** | Neon Postgres |
| **ORM** | Drizzle ORM |
| **Auth** | Clerk |
| **Email** | Resend |
| **WhatsApp** | Twilio Business API |
| **File Storage** | Cloudflare R2 |
| **AI** | Claude Vision API |
| **Payments** | Stripe |
| **Analytics** | PostHog |
| **Error Tracking** | Sentry |
| **Deployment** | Vercel |

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** (`npm install -g pnpm`)
- Accounts required:
  - [Neon](https://neon.tech) — Postgres database
  - [Clerk](https://clerk.com) — Authentication
  - [Resend](https://resend.com) — Transactional email
  - [Twilio](https://twilio.com) — WhatsApp Business API
  - [Cloudflare R2](https://www.cloudflare.com/r2/) — File storage
  - [Stripe](https://stripe.com) — Billing

### Environment Variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Database
DATABASE_URL=

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Email (Resend)
RESEND_API_KEY=

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=

# File Storage (Cloudflare R2)
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=

# Payments (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# AI (Anthropic)
ANTHROPIC_API_KEY=

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
SENTRY_DSN=
```

### Setup

```bash
# Clone the repository
git clone https://github.com/Snack-JPG/chase.md.git
cd chase.md

# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
chase.md/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (auth)/       # Auth routes (sign-in, sign-up)
│   │   ├── (dashboard)/  # Practice dashboard
│   │   ├── (portal)/     # Client upload portal
│   │   └── api/          # API routes
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui primitives
│   │   └── ...           # Feature components
│   ├── lib/              # Utilities & config
│   │   ├── db/           # Drizzle schema & queries
│   │   ├── chase/        # Chase engine logic
│   │   ├── ai/           # Document classification
│   │   └── ...
│   └── types/            # TypeScript types
├── docs/                 # Documentation
│   ├── NORTH_STAR.md
│   ├── DEFINITION_OF_DONE.md
│   └── TECHNICAL_BLUEPRINT.md
├── public/               # Static assets
├── drizzle/              # Database migrations
└── tests/                # Test suites
```

---

## Development

### Run Locally

```bash
pnpm dev          # Start dev server on :3000
pnpm db:studio    # Open Drizzle Studio (database GUI)
```

### Testing

```bash
pnpm test         # Run test suite
pnpm test:watch   # Run tests in watch mode
pnpm lint         # ESLint + Prettier check
pnpm type-check   # TypeScript strict check
```

### Deploy

Push to `main` → auto-deploys to Vercel.

```bash
pnpm build        # Local production build
```

---

## Architecture

chase.md follows a simple, scalable architecture:

- **Next.js App Router** for server components, API routes, and the client portal
- **Drizzle ORM** with Neon Postgres for type-safe database access
- **Chase Engine** — a scheduler that evaluates outstanding documents per client and dispatches messages across channels with tone escalation
- **Magic Links** — JWT-based client authentication with 30-day expiry, no passwords
- **AI Pipeline** — Claude Vision classifies uploaded documents with confidence scoring

For the full technical breakdown, see [`docs/TECHNICAL_BLUEPRINT.md`](docs/TECHNICAL_BLUEPRINT.md).

---

## Roadmap

### Phase 1: MVP — "The Chase Engine" *(Weeks 1–8)*

- [ ] Project foundation (Next.js, DB, auth, billing skeleton)
- [ ] Practice onboarding + team management
- [ ] Client management with CSV import
- [ ] Document templates & checklists by client type
- [ ] Chase engine with multi-channel campaigns
- [ ] Client upload portal (magic links, mobile-first)
- [ ] Practice dashboard with traffic lights
- [ ] GDPR & compliance layer

### Phase 2: Growth — "Intelligence" *(Weeks 9–20)*

- [ ] AI document recognition (Claude Vision)
- [ ] Xero integration (OAuth, client sync)
- [ ] Client behaviour analytics
- [ ] Predictive chasing (optimal timing & channel)

### Phase 3: Dominance — "Platform" *(Weeks 21–40)*

- [ ] HMRC API integration (MTD ITSA obligations)
- [ ] Sage integration
- [ ] Practice analytics & annual reporting
- [ ] Public API & webhooks

---

## Contributing

chase.md is currently built solo by [Austin](https://github.com/Snack-JPG). Contributions aren't open yet, but the codebase is structured for future collaboration:

- TypeScript strict mode throughout
- ESLint + Prettier enforced
- Conventional commits
- PR-based workflow ready

Interested in contributing when we open up? Watch this repo.

---

## License

**Proprietary** — All rights reserved. This software is not open source.

---

<div align="center">

**chase.md** — Stop chasing. Start collecting.

Built with ☕ in England.

</div>
