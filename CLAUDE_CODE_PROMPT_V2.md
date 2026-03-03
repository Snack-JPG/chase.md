# Claude Code — chase.md UI Implementation (Continuation)

> **Session started from:** `CLAUDE_CODE_PROMPT.md` (original build plan)
> **Master spec:** `docs/UI-PLAN.md` — ASCII wireframes for every page, component specs, animation guidelines
> **Date:** 2 March 2026

---

## What's Been Built (Phases 1–3 Complete)

### Phase 1: Design System + Shell ✅

**Design tokens** (`src/app/globals.css`):
- Dark-first dashboard via `.dark` class with near-black backgrounds
- Light marketing/portal theme preserved in `:root` with teal brand accent
- Escalation color gradient: Level 1 (blue) → Level 2 (teal) → Level 3 (amber) → Level 4 (orange) → Level 5 (red)
- Status dot colors, animation utilities (progress-fill, status-pulse, count-up)
- Tailwind v4 `@theme` block — NOT `:root` or `@layer`
- Fonts: DM Sans (body) + JetBrains Mono (mono) via Google Fonts import AFTER @theme

**Dashboard Shell** (`src/components/dashboard-shell.tsx`):
- Collapsible sidebar (240px → 60px) with smooth transition
- 5 nav items: Overview, Clients, Campaigns, Responses, Documents + Settings
- Keyboard shortcuts: Cmd+1-5 for nav, Cmd+, for settings, Cmd+K for search
- Active item styling with left border accent + highlighted background
- Badge counts on Responses and Documents nav items
- Tooltips on collapsed sidebar icons
- Mobile: Sheet slide-over with hamburger trigger
- Top bar: Breadcrumbs + Cmd+K search trigger + notification bell + Clerk UserButton
- Sonner toasts integrated (`richColors position="bottom-right"`)

**Custom Components** (in `src/components/ui/`):
- `status-dot.tsx` — colored circles with variant prop + `getClientStatus()` helper
- `stat-card.tsx` — animated count-up stat card with icon + variant
- `step-indicator.tsx` — numbered wizard progress dots with connecting lines
- `empty-state.tsx` — icon + message + CTA pattern
- `channel-icon.tsx` — email/sms/whatsapp/phone/letter + `getChannelConfig()`
- `chase-timeline.tsx` — vertical escalation timeline (the signature component)
- `file-dropzone.tsx` — drag-drop upload with progress + validation
- `escalation-badge.tsx` — Lvl 1-5 badges with color mapping from DB enums
- `loading-skeletons.tsx` — Table, Card, Stats, Section, Dashboard, ClientList, CampaignCards skeletons

**Command Palette** (`src/components/command-palette.tsx`):
- Cmd+K global shortcut
- Navigation to all pages
- Quick actions (create campaign, add client)

**shadcn Components Installed (32 total):**
accordion, alert, avatar, badge, breadcrumb, button, card, checkbox, collapsible, command, dialog, dropdown-menu, input, label, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, skeleton, sonner, switch, table, tabs, textarea, toggle, toggle-group, tooltip

### Phase 2: Dashboard ✅

**Page:** `src/app/(dashboard)/dashboard/page.tsx` (283 lines, "use client")
- 4 stat cards with count-up animation (Active Campaigns, Documents Received, Chases Sent 30d, Avg Completion)
- "Needs Attention" list — sorted by urgency, status dots, escalation badges
- Active Campaigns with progress bars
- Recent Activity feed with icons and relative timestamps
- Empty states for all sections
- tRPC: `dashboard.stats`, `dashboard.clientsNeedingAttention`, `dashboard.recentCampaigns`, `dashboard.recentActivity`

### Phase 3: Client List + Detail ✅

**Client List** (`src/app/(dashboard)/clients/page.tsx`) — ~350 lines:
- @tanstack/react-table with full sorting, filtering, row selection, pagination (25/page)
- Columns: checkbox, status dot + name, type badge, contact, last chased, status badge
- Global search (real-time filtering by name/company/email)
- Status filter dropdown (All / Active / Paused) via shadcn DropdownMenu
- Bulk actions bar (floating bottom) when rows selected: Add to Campaign, Pause, Export CSV
- CSV export works; other bulk actions show "coming soon" toast
- Server pagination via infinite query + "Load more" button
- Keeps existing AddClientModal + CsvImportModal
- Xero sync button with spinner
- Sonner toasts for all mutations

**Client Detail** (`src/app/(dashboard)/clients/[id]/page.tsx`) — ~480 lines:
- Header card: name, status dot, escalation badge, email/phone, progress bar, Xero indicator
- Quick actions: Pause/Resume toggle + dropdown (Send Reminder, Open Portal, Copy Portal Link)
- **4 Tabs using shadcn Tabs (line variant):**
  - **Overview:** Contact info, tax details, chase status (3-col grid) + active enrollment details + all enrollments table
  - **Documents:** Table with file icon, AI classification + confidence badge, status, Xero push status, upload time
  - **Chase History:** `ChaseTimeline` component — messages sorted chronologically, escalation colors, delivery status, message previews
  - **Notes:** Editable textarea with save/cancel, read-only display when not editing
- Badge counts on Documents and Chase History tabs

---

## What Still Needs to Be Built

### Phase 4: Campaign System (items 10-12 from original plan)

The campaign pages exist from a prior session but may need review/polish to match the design system established in Phases 1-3. Check these files:

- `src/app/(dashboard)/campaigns/page.tsx` — Campaign list (card-based layout)
- `src/app/(dashboard)/campaigns/new/page.tsx` — Campaign creation wizard (5 steps)
- `src/app/(dashboard)/campaigns/[id]/page.tsx` — Campaign detail/monitoring

**Review checklist:**
- Are they using shadcn components (Button, Badge, Card, Tabs) instead of raw HTML?
- Do they use `bg-card`, `text-foreground`, `text-muted-foreground` tokens (not `bg-surface-raised`, `text-text-primary`)?
- Do they use the StatusDot, EscalationBadge, EmptyState components?
- Is the campaign wizard step indicator using the `StepIndicator` component?
- Do tables use shadcn `Table` + `TableHeader` + `TableBody` + `TableRow` + `TableHead` + `TableCell`?
- Does the chase sequence in Step 3 (WHEN) use the `ChaseTimeline` component?

Refer to `docs/UI-PLAN.md` §7A (Campaign List), §7B (Campaign Wizard), §7C (Campaign Detail).

### Phase 5: Chase Timeline + Response Hub (NEW PAGES)

**13. Response Hub** — `src/app/(dashboard)/responses/page.tsx`

This page does NOT exist yet. Build it from scratch.

Spec from `docs/UI-PLAN.md` §9:
- Two-pane layout using shadcn `ResizablePanelGroup` + `ResizablePanel` (already installed)
- Left pane: conversation list (scrollable, latest message preview, unread indicator, relative time)
- Right pane: selected conversation thread (messages chronologically, yours vs theirs styled differently)
- Channel filter tabs: All | Email | WhatsApp | SMS | Portal
- Reply composer at bottom of right pane
- Quick actions: accept, pause chase, add note
- Data: compose from `clients.messages` tRPC endpoint (may need a new endpoint)
- States: empty, loading skeletons, no selection ("Select a conversation"), mobile single-pane

**14. Document Review** — `src/app/(dashboard)/documents/page.tsx`

This page does NOT exist yet. Build it from scratch.

Spec from `docs/UI-PLAN.md` §10:
- Card-based queue layout
- Each card: filename, uploader (client name), campaign, AI classification + confidence badge
- Actions: accept, reject (with reason dialog), reclassify (dropdown)
- Tab filter: Pending | Approved | Rejected | All
- Data: `documents.listByCampaign` or compose from existing endpoints
- Confidence badge colors: green >90%, amber 70-90%, red <70%
- States: empty ("No documents to review. Nice work!"), loading skeletons

### Phase 6: Client Portal Upgrade

**15-16.** Portal pages already exist at `src/app/(portal)/p/[token]/`:
- `page.tsx` — server component, validates magic link, shows document checklist
- `upload-zone.tsx` — client component, drag-drop upload

**What needs doing:**
- Light theme override (portal should NOT be dark)
- Practice branding (logo + name from DB)
- Greeting with client name + deadline with days remaining
- Section-grouped document checklist (not flat list)
- Inline upload per item (expand to show dropzone)
- Progress bar (prominent, animated fill)
- Completion state: all items green + confetti (`canvas-confetti` already installed)
- Question/message input at bottom
- "Powered by chase.md" footer
- Mobile-first: full-width, large touch targets, 44px minimum tap areas

Refer to `docs/UI-PLAN.md` §11.

### Phase 7: Onboarding + Settings + Polish

**17. Onboarding Wizard** — `src/app/(dashboard)/onboarding/page.tsx` (NEW)
- 4-step wizard (same pattern as campaign wizard)
- Step 1: Practice name, role, size, software
- Step 2: Chase preferences (channels, tone, timing, days)
- Step 3: Import clients (CSV/Xero/manual/skip)
- Step 4: Success + redirect to dashboard
- Redirect here if user has no practice record

**18. Settings** — `src/app/(dashboard)/settings/page.tsx` (EXISTS, needs major expansion)
- Currently only has Xero webhook config
- Needs: vertical nav on left (Practice, Team, Chase Defaults, Integrations, Templates, Billing, GDPR)
- Each section as a form with save button
- Danger zone at bottom with confirm dialogs
- Refer to `docs/UI-PLAN.md` §12

**19-22. Polish tasks:**
- Command Palette: search clients/campaigns/documents, recent items (partially done)
- Keyboard shortcuts: ⌘1-5 for nav (structure exists in shell, needs wiring)
- Notification bell: popover with scrollable notification list (nav item exists, no content)
- Final polish: all empty states, all loading skeletons, all error states with retry, micro-animations, responsive (375px)

---

## Architecture Quick Reference

### Tech Stack
- Next.js 15 (App Router), React 19, TypeScript 5.7, Tailwind CSS v4
- tRPC v11 RC + TanStack React Query, Drizzle ORM + Neon Postgres
- Auth: Clerk (multi-org), Billing: Stripe, Integrations: Xero, Twilio, Resend
- Icons: lucide-react, Animations: framer-motion, Fonts: DM Sans + JetBrains Mono

### tRPC Routers Available
Located in `src/server/trpc/routers/`:
- **dashboard** — `stats`, `recentCampaigns`, `recentActivity`, `clientsNeedingAttention`
- **clients** — `list` (paginated), `getById` (with enrollments + documents), `create`, `update`, `bulkCreate`, `syncFromXero`, `lastSyncStatus`, `messages`, `xpmJobs`
- **campaigns** — full CRUD, status transitions, `enrollClient`, `removeEnrollment`
- **documents** — `listTemplates`, `listByClient`, `listByCampaign`, `pushToXero`, `retryXeroPush`
- **practice** — `get`, `update`, `xeroStatus`, `saveWebhookKey`
- **billing** — `usage` (plan, features, counts, trial info)

### Component Patterns
- **shadcn imports:** `import { Button } from "@/components/ui/button"`
- **Custom component imports:** `import { StatusDot } from "@/components/ui/status-dot"`
- **tRPC hooks:** `const query = trpc.router.endpoint.useQuery({ ... })`
- **Color tokens:** Use `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-muted`, `border` (shadcn tokens), NOT the old `text-text-primary`, `bg-surface-raised` tokens
- **Cards:** `rounded-lg border bg-card` with optional `shadow-[var(--shadow-card)]`
- **Tables:** shadcn `Table` components with `@tanstack/react-table` for sortable/filterable tables
- **Toasts:** `import { toast } from "sonner"` — `toast.success()`, `toast.error()`, `toast.info()`
- **Empty states:** Use `<EmptyState icon={...} title="..." description="..." action={...} />`

### Style Constants
Located in `src/lib/constants.ts`:
- `getClientTypeConfig(type)` — returns `{ label, color }` for client type badges
- `getEscalationStyle(level)` — returns Tailwind classes for escalation level
- `getCampaignStatusStyle(status)` — returns Tailwind classes for campaign status
- `getDocumentStatusStyle(status)` — returns Tailwind classes for document status
- `getEnrollmentStatusStyle(status)` — returns Tailwind classes for enrollment status
- `getMessageStatusStyle(status)` — returns Tailwind classes for message status

### Known Gotchas
1. **`escalationLevel` can be null** — always fallback: `level ?? "reminder"`
2. **Tailwind v4 uses `@theme` block** — not `@layer` or `:root`
3. **Font import order matters** — `@import url(...)` goes AFTER @theme in globals.css
4. **Don't modify `src/server/`** — rule from original prompt: "Don't break what works"
5. **Cursor-based pagination uses UUIDs** — not sequential, `gt(clients.id, cursor)` ordering is unstable
6. **CsvImportModal still uses old light-theme styles** — needs restyling to match dark theme
7. **Some old pages use `bg-surface-raised`, `text-text-primary`** — these are legacy tokens; use `bg-card`, `text-foreground` instead
8. **Build is clean** — only pre-existing lint warnings in server files, zero TypeScript errors

---

## Rules (carried forward from original prompt)

1. **Use existing tRPC endpoints.** Don't create new API routes unless absolutely necessary.
2. **Server Components by default.** Only use `"use client"` when you need interactivity.
3. **Colocate.** Page-specific components next to their page file. Shared components in `src/components/`.
4. **No placeholder data.** Wire everything to real tRPC calls. Loading skeletons while fetching. Empty states when no data.
5. **Accessible.** Proper aria labels, focus management in modals, minimum AA contrast.
6. **Type-safe.** Infer types from tRPC. No `any`. No `as` casts unless absolutely necessary.
7. **Don't break what works.** Don't modify `src/server/` or `src/app/api/` unless fixing a bug.
8. **Test as you go.** Run `npm run build` after each phase.

## Quality Bar

The UI should feel like Linear meets Instantly — information-dense, keyboard-friendly, dark and polished. Not generic. Not "AI-generated looking." The escalation color system should be immediately obvious and satisfying. Status at a glance. No clicks wasted.

Refer to `docs/UI-PLAN.md` for ASCII wireframes of every page.
