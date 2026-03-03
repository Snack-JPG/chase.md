# Claude Code — chase.md UI Implementation

You are building the UI for **chase.md**, a document chasing SaaS for UK accountancy practices. The codebase already has backend logic, tRPC routers, services, and basic page stubs. Your job is to implement the full UI according to the design plan.

## Read These First (mandatory)

1. `docs/UI-PLAN.md` — **The master plan.** Every page, every component, every state. Follow it closely.
2. `docs/AUDIT.md` — What exists, what's wired, what's missing.
3. `docs/UI-UX-RESEARCH.md` — Competitive research and UX principles.
4. `docs/TECHNICAL_BLUEPRINT.md` — Architecture, schema, data flow.
5. `src/server/db/schema.ts` — Database schema (14 tables, this is your data model).
6. `src/server/trpc/router.ts` + `src/server/trpc/routers/*.ts` — All available tRPC endpoints.

## Tech Stack

- **Next.js 15** (App Router, RSC where possible)
- **shadcn/ui** — primary component library (already partially installed)
- **Tailwind CSS 4** — styling (already configured)
- **tRPC v11** — data fetching (already wired)
- **Clerk** — auth (already configured)
- **Framer Motion** — animations
- **Geist** — font (already installed)
- **TypeScript strict** — no `any`, no shortcuts

## Install Dependencies First

```bash
# shadcn components (check which are already installed, skip those)
npx shadcn@latest add accordion alert avatar badge breadcrumb button card checkbox collapsible command dialog dropdown-menu input label pagination popover progress radio-group resizable-panel scroll-area select separator sheet skeleton sonner switch table tabs textarea toggle-group tooltip

# Additional libraries
npm install @tanstack/react-table cmdk framer-motion react-dropzone canvas-confetti recharts date-fns
```

## Design System

Apply these tokens in `src/app/globals.css` (extend what's there):

- **Dark-first** design. Near-black backgrounds (`hsl(0 0% 3.9%)`), high-contrast text.
- **Escalation color gradient:** Blue (Lvl 1) → Teal (Lvl 2) → Amber (Lvl 3) → Orange (Lvl 4) → Red (Lvl 5). This is the core visual language.
- **Status dots:** 8px colored circles. Red = critical, Amber = overdue, Green = active, Check = complete, Gray = paused/draft.
- **Font:** Geist Sans for UI, Geist Mono for stats/IDs.
- **Animations:** Fast (150ms) for hovers, normal (200ms) for expand/collapse, slow (300ms) for modals. Progress bars fill over 600ms ease-out.
- **Density:** Linear-inspired. Information-dense but not cluttered. Every row in a table should show status dot + name + key metric + days + level on one line.

## Build Order (follow this sequence)

### Phase 1: Design System + Shell
1. Update `globals.css` with full design token set from UI-PLAN.md §1
2. Create reusable components in `src/components/ui/`:
   - `status-dot.tsx` — colored circle component with variant prop
   - `stat-card.tsx` — dashboard stat card with optional sparkline
   - `step-indicator.tsx` — wizard progress dots
   - `empty-state.tsx` — illustration + message + CTA
   - `channel-icon.tsx` — email/sms/whatsapp/phone/letter icons
   - `chase-timeline.tsx` — vertical escalation timeline (the signature component)
   - `file-dropzone.tsx` — branded drag-drop upload zone
3. Refactor `src/components/dashboard-shell.tsx`:
   - Collapsible sidebar (expanded with labels ↔ icon-only)
   - Keyboard shortcuts (⌘1-5 for nav sections)
   - Active item styling (left border accent + bg highlight)
   - Badge counts on Responses and Documents nav items
   - Mobile: hamburger → Sheet slide-over
4. Add top bar: breadcrumbs (shadcn Breadcrumb) + Cmd+K trigger + notification bell + Clerk UserButton
5. Set up Sonner for toasts
6. Create loading skeleton patterns for tables, cards, and full pages

### Phase 2: Dashboard
7. Rebuild `src/app/(dashboard)/dashboard/page.tsx`:
   - 4 stat cards (Total Clients, Active Chases, Overdue, Critical) with count-up animation
   - "Needs Attention" list — sorted by urgency, status dots, progress, days overdue, escalation level
   - Active Campaigns with progress bars
   - Recent Activity feed with icons and relative timestamps
   - Upcoming Deadlines section
   - Empty state when no campaigns exist
   - Data from existing tRPC: `dashboard.stats`, `dashboard.clientsNeedingAttention`, `dashboard.recentCampaigns`, `dashboard.recentActivity`

### Phase 3: Client List + Detail
8. Rebuild `src/app/(dashboard)/clients/page.tsx`:
   - @tanstack/react-table with sorting, filtering, row selection
   - Columns: checkbox, status dot, name, campaign, progress (X/Y), days overdue, escalation level
   - Search bar (filters as you type)
   - Filter dropdown (status, campaign, level)
   - Sort dropdown (days overdue, name, progress, last activity)
   - Bulk actions bar (appears when rows selected): add to campaign, send reminder, pause, export
   - Pagination
   - Existing modals: keep add-client-modal and csv-import-modal, restyle to match
9. Rebuild `src/app/(dashboard)/clients/[id]/page.tsx`:
   - Header card: name, email, phone, status dot, escalation badge, progress bar
   - Tabs: Overview | Documents | Chase History | Notes
   - Overview: contact info, tax details, active enrollment, quick actions
   - Documents: checklist with received/pending status, view button
   - Chase History: use `<ChaseTimeline />` component
   - Notes: add note form + chronological note list
   - Quick actions: send reminder, pause, mark complete, open portal, copy portal link

### Phase 4: Campaign System
10. Rebuild `src/app/(dashboard)/campaigns/page.tsx`:
    - Card-based layout (not table)
    - Each card: campaign name, status badge, client count, completion stats, progress bar, dates
    - Tab filter: Active | Draft | Completed | All
    - Click → campaign detail
11. **Build campaign creation wizard** `src/app/(dashboard)/campaigns/new/page.tsx`:
    - This is the most important flow. Follow UI-PLAN.md §7B exactly.
    - Step indicator at top (numbered dots with connecting lines)
    - Step 1 (WHO): client selection table with checkboxes, search, select all
    - Step 2 (WHAT): template picker (toggle group), document checklist builder (add/edit/remove items), campaign name input
    - Step 3 (WHEN): date pickers for deadline + start date, visual chase sequence timeline (vertical, with channel icons + delays + message previews, editable delays, drag-to-reorder)
    - Step 4 (REVIEW): summary card + first email preview + launch button
    - Step transitions: slide animation with framer-motion
    - Save as draft at any point
    - Use existing tRPC: `campaigns.create`, `campaigns.enrollClient`, `clients.list`
12. Rebuild `src/app/(dashboard)/campaigns/[id]/page.tsx`:
    - Stat cards (enrolled, complete, overdue, critical)
    - Overall progress bar
    - Enrolled clients table (reuse client table pattern)
    - Campaign settings section (collapsible)
    - Actions: pause/resume, edit settings

### Phase 5: Chase Timeline + Response Hub
13. Build Response Hub `src/app/(dashboard)/responses/page.tsx` (NEW PAGE):
    - Two-pane layout using ResizablePanelGroup
    - Left: conversation list (scrollable, shows latest message preview, unread indicator, relative time)
    - Right: selected conversation thread (messages chronologically, yours vs theirs styled differently)
    - Channel filter tabs: All | Email | WhatsApp | SMS | Portal
    - Reply composer at bottom of right pane
    - Quick actions: accept, pause chase, add note
    - Data: will need a new tRPC endpoint or compose from existing `clients.messages`
14. Build Document Review page `src/app/(dashboard)/documents/page.tsx` (NEW PAGE):
    - Card-based queue
    - Each card: filename, uploader, campaign, AI classification + confidence badge
    - Actions: accept, reject (with reason dialog), reclassify (dropdown)
    - Tab filter: Pending | Approved | Rejected | All
    - Data: `documents.listByCampaign` or new endpoint

### Phase 6: Client Portal Upgrade
15. Redesign `src/app/(portal)/p/[token]/page.tsx`:
    - Light theme (override dark default for portal routes)
    - Practice branding (logo + name from DB)
    - Greeting with client name
    - Deadline with days remaining
    - Progress bar (prominent, animated fill)
    - Section-grouped document checklist
    - Inline upload per item (expand to show dropzone)
    - Auto-save on upload
    - Question/message input at bottom
    - Completion state: all items green + confetti (canvas-confetti)
    - "Powered by chase.md" footer
    - Mobile-first: full-width, large touch targets, 44px minimum tap areas
16. Upgrade `src/app/(portal)/p/[token]/upload-zone.tsx`:
    - Use react-dropzone
    - Progress bar during upload
    - File type validation (PDF, JPG, PNG, max 10MB)
    - Success checkmark animation
    - Error state with retry

### Phase 7: Onboarding + Settings + Polish
17. Build onboarding wizard `src/app/(dashboard)/onboarding/page.tsx` (NEW):
    - 4-step wizard (follows same pattern as campaign wizard)
    - Step 1: Practice name, role, size, software
    - Step 2: Chase preferences (channels, tone, timing, days)
    - Step 3: Import clients (CSV/Xero/manual/skip)
    - Step 4: Success + redirect to dashboard
    - Redirect here if user has no practice record
18. Rebuild `src/app/(dashboard)/settings/page.tsx`:
    - Vertical nav on left (Practice, Team, Chase Defaults, Integrations, Templates, Billing, GDPR)
    - Each section as a form with save button
    - Danger zone at bottom with confirm dialogs
19. Add Command Palette:
    - `src/components/command-palette.tsx`
    - Cmd+K global shortcut
    - Search clients, campaigns, documents
    - Quick actions: create campaign, add client, go to settings
    - Recent items section
20. Add keyboard shortcuts throughout:
    - ⌘1-5 for navigation
    - `N` for new (campaign/client depending on context)
    - `E` for edit
    - `/` to focus search
    - `Esc` to close modals/sheets
21. Notification system:
    - `src/components/notification-bell.tsx`
    - Bell icon in top bar with unread count badge
    - Popover with scrollable notification list
    - Click to navigate to relevant item
22. Final polish pass:
    - All empty states have illustration + message + CTA
    - All loading states have appropriate skeletons
    - All error states have retry buttons
    - Micro-animations on status changes, list enters, progress fills
    - Responsive: every page works on mobile (test at 375px width)

## Rules

1. **Use existing tRPC endpoints.** Don't create new API routes unless absolutely necessary. The routers in `src/server/trpc/routers/` have most of what you need.
2. **Server Components by default.** Only use `"use client"` when you need interactivity (forms, animations, client-side state).
3. **Colocate.** Page-specific components go next to their page file. Shared components go in `src/components/`.
4. **No placeholder data.** Wire everything to real tRPC calls. Use loading skeletons while data fetches. Show empty states when there's no data.
5. **Accessible.** All interactive elements need proper aria labels. Focus management in modals. Skip-nav link. Minimum AA contrast.
6. **Type-safe.** Infer types from tRPC router outputs. No `any`. No `as` casts unless absolutely necessary.
7. **Don't break what works.** The landing page, auth pages, and API routes are done. Don't modify `src/server/` or `src/app/api/` unless fixing a bug.
8. **Commit after each phase.** Clean commit messages: "feat: phase 1 — design system + shell"
9. **Test as you go.** Run `npm run build` after each phase to catch errors. Fix lint warnings.
10. **Delete `page.tsx.old`** and remove `redis.ts` import if unused.

## Quality Bar

The UI should feel like Linear meets Instantly — information-dense, keyboard-friendly, dark and polished. Not generic. Not "AI-generated looking." The escalation color system should be immediately obvious and satisfying. Status at a glance. No clicks wasted.

When in doubt, refer to `docs/UI-PLAN.md`. It has ASCII wireframes for every single page.

Now get to work. Start with Phase 1.
