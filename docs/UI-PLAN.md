# chase.md — UI/UX Component Plan

> **Date:** 2 March 2026
> **Stack:** Next.js 15 + shadcn/ui + Tailwind CSS 4 + Framer Motion
> **Design System:** Dark-first, Linear-inspired density, escalation color language

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Global Components](#2-global-components)
3. [Marketing Pages](#3-marketing-pages)
4. [Auth & Onboarding](#4-auth--onboarding)
5. [Practice Dashboard](#5-practice-dashboard)
6. [Client Management](#6-client-management)
7. [Campaign System](#7-campaign-system)
8. [Chase Timeline](#8-chase-timeline)
9. [Response Hub](#9-response-hub)
10. [Document Review](#10-document-review)
11. [Client Portal](#11-client-portal)
12. [Settings](#12-settings)
13. [Implementation Order](#13-implementation-order)

---

## 1. Design System

### Color Palette

```
Background:
  --bg-primary:     hsl(0 0% 3.9%)      // Near-black
  --bg-secondary:   hsl(0 0% 7%)        // Card backgrounds
  --bg-tertiary:    hsl(0 0% 10%)       // Hover states
  --bg-elevated:    hsl(0 0% 14%)       // Modals, dropdowns

Borders:
  --border-subtle:  hsl(0 0% 14%)       // Card borders
  --border-default: hsl(0 0% 20%)       // Input borders
  --border-focus:   hsl(220 70% 50%)    // Focus rings

Text:
  --text-primary:   hsl(0 0% 98%)       // Headings
  --text-secondary: hsl(0 0% 64%)       // Body, descriptions
  --text-tertiary:  hsl(0 0% 45%)       // Muted, timestamps
  --text-link:      hsl(220 70% 60%)    // Interactive

Brand:
  --brand:          hsl(220 70% 50%)    // Primary CTA, accents
  --brand-hover:    hsl(220 70% 45%)    // Hover state
```

### Escalation Color System (critical differentiator)

```
Level 1 — Friendly:    hsl(220 70% 50%)   // Blue        📧
Level 2 — Follow-up:   hsl(200 60% 50%)   // Teal        📧
Level 3 — Urgent:      hsl(45 90% 50%)    // Amber       📧
Level 4 — Serious:     hsl(25 90% 50%)    // Orange      📱
Level 5 — Final:       hsl(0 72% 51%)     // Red         📞✉️

Status colors:
  --status-active:      hsl(142 70% 45%)  // Green
  --status-overdue:     hsl(45 90% 50%)   // Amber
  --status-critical:    hsl(0 72% 51%)    // Red
  --status-complete:    hsl(142 70% 45%)  // Green
  --status-paused:      hsl(0 0% 45%)     // Gray
  --status-draft:       hsl(220 10% 50%)  // Blue-gray
```

### Typography

```
Font:         Geist Sans (already installed)
Mono:         Geist Mono (for stats, IDs)

Scale:
  --text-xs:    0.75rem / 1rem       // Timestamps, badges
  --text-sm:    0.875rem / 1.25rem   // Body, table cells
  --text-base:  1rem / 1.5rem        // Default
  --text-lg:    1.125rem / 1.75rem   // Section headings
  --text-xl:    1.25rem / 1.75rem    // Page headings
  --text-2xl:   1.5rem / 2rem        // Hero stats
  --text-3xl:   1.875rem / 2.25rem   // Dashboard numbers
```

### Spacing

```
4px grid system (Tailwind default):
  gap-1 (4px)   — between badge elements
  gap-2 (8px)   — between inline elements
  gap-3 (12px)  — between list items
  gap-4 (16px)  — component padding
  gap-6 (24px)  — between sections
  gap-8 (32px)  — between page sections
```

### Status Indicators

```
● Dot indicators (8px circles):
  🔴 Critical (>30 days overdue)
  🟡 Overdue (>14 days)
  🟢 Active (on schedule)
  ✅ Complete (all docs received)
  ⚪ Draft / Not started
  ⏸ Paused (gray)

Progress bars:
  Thin (2px) — table rows, inline
  Medium (4px) — card headers
  Thick (8px) — portal progress

Badges (shadcn Badge variants):
  default — neutral info
  destructive — critical/overdue
  outline — draft/inactive
  secondary — in-progress
  + custom: "success" (green), "warning" (amber)
```

### Animation Guidelines

```
Transitions:
  --duration-fast:   150ms    // Hover states, color changes
  --duration-normal: 200ms    // Expand/collapse
  --duration-slow:   300ms    // Page transitions, modals
  --easing:          cubic-bezier(0.4, 0, 0.2, 1)

Framer Motion presets:
  fadeIn:    { opacity: [0, 1], duration: 0.2 }
  slideUp:   { y: [8, 0], opacity: [0, 1], duration: 0.25 }
  scaleIn:   { scale: [0.95, 1], opacity: [0, 1], duration: 0.2 }
  progressFill: { width: ["0%", target], duration: 0.6, ease: "easeOut" }

Rules:
  - Status dot color transitions: 150ms ease
  - Progress bar fills: 600ms ease-out (satisfying)
  - List item enter: stagger 30ms, slideUp
  - Modal: scaleIn + backdrop fade
  - Skeleton → content: crossfade 200ms
  - Confetti on 100% completion (client portal only)
```

### Icon Set

```
Primary: Lucide React (already in shadcn)
Usage:
  Mail         — email channel
  MessageCircle — WhatsApp/SMS
  Phone        — phone call task
  FileText     — documents, letters
  AlertTriangle — escalation warning
  CheckCircle  — complete
  Clock        — pending/scheduled
  Eye          — opened/viewed
  EyeOff       — not opened
  Upload       — file upload
  Download     — export
  Search       — search bars
  Plus         — create new
  MoreHorizontal — row actions menu
  ArrowUpRight — external link
  ChevronRight — breadcrumb, expand
```

### Dark Mode Approach

```
Dark-first design (default is dark).
Light mode: optional toggle in settings.
Implementation: CSS custom properties in globals.css, toggle via next-themes.
shadcn already supports this natively.
```

---

## 2. Global Components

### 2A. Sidebar Navigation

```
┌──────────────────────────┐
│  chase.md                │  ← Logo + wordmark
│                          │
│  ▸ Dashboard        ⌘1  │
│  ▸ Clients          ⌘2  │
│  ▸ Campaigns        ⌘3  │
│  ▸ Responses        ⌘4  │
│  ▸ Documents        ⌘5  │
│                          │
│  ─────────────────────   │
│                          │
│  ▸ Settings         ⌘,  │
│                          │
│  ─────────────────────   │
│  [Practice Name     ▾]  │  ← Clerk org switcher
│  [Austin Mander     ▾]  │  ← Clerk user button
└──────────────────────────┘
```

**shadcn components:**
- Custom sidebar (not shadcn — build with `nav` + `Button variant="ghost"`)
- `Tooltip` on collapsed sidebar icons
- `DropdownMenu` for user/org menus
- `Separator` between nav groups

**Behavior:**
- Collapsible to icon-only (64px → 16px)
- Active item: left border accent + bg-tertiary
- Badge counts on Responses (unread count) and Documents (pending review)
- Keyboard: ⌘1-5 jumps to sections
- Mobile: full-screen overlay via `Sheet` (slide from left)

**States:**
- Default: expanded with labels
- Collapsed: icons only + tooltips
- Mobile: hidden, hamburger trigger → Sheet

---

### 2B. Command Palette (Cmd+K)

```
┌──────────────────────────────────────┐
│  🔍 Search clients, campaigns...     │
│                                      │
│  Recent                              │
│  ▸ Smith & Co — Tax Return 2025     │
│  ▸ Jones Ltd — VAT Q4              │
│                                      │
│  Actions                             │
│  ▸ Create new campaign              │
│  ▸ Add client                       │
│  ▸ Go to settings                   │
│                                      │
│  Clients (3 results)                 │
│  ▸ ABC Corporation                  │
│  ▸ Davis Family Trust               │
│  ▸ Green & Partners                 │
└──────────────────────────────────────┘
```

**shadcn components:**
- `Command` (built on cmdk) — the entire palette
- `CommandInput` — search field
- `CommandList` → `CommandGroup` → `CommandItem`
- `CommandSeparator` between groups
- `Dialog` wrapper for modal behavior

**Library:** `cmdk` (already part of shadcn Command component)

**Sections:**
- Recent (last 5 visited items)
- Actions (create campaign, add client, go to settings)
- Clients (search by name, email, company)
- Campaigns (search by name)
- Documents (search by filename, client)

**Data:** Lightweight tRPC endpoint `search.global({ query })` returning typed results.

---

### 2C. Notification System

```
┌─────────────────────────────────┐
│  🔔 3                           │  ← Bell icon in top bar
│  ┌────────────────────────────┐ │
│  │ Smith & Co uploaded P60    │ │  2m ago
│  │ Jones Ltd replied via WA   │ │  15m ago
│  │ Campaign "Tax 2025" — 3    │ │  1h ago
│  │   clients now critical     │ │
│  └────────────────────────────┘ │
└─────────────────────────────────┘
```

**shadcn components:**
- `Popover` for notification dropdown
- `Button` (icon variant) for bell trigger
- `Badge` for unread count
- `ScrollArea` for notification list
- `Separator` between items

**Behavior:**
- Bell icon in top bar with red dot/count badge
- Click opens popover with scrollable list
- Each item: icon + description + timestamp + click to navigate
- "Mark all as read" action at top
- Polling every 30s or SSE for real-time

---

### 2D. Top Bar

```
┌──────────────────────────────────────────────────────────────┐
│  📄 Clients                    🔍 ⌘K    🔔 3    [Avatar ▾]  │
└──────────────────────────────────────────────────────────────┘
```

**Components:**
- Breadcrumb (shadcn `Breadcrumb`) — current location
- Command trigger button — "Search... ⌘K"
- Notification bell
- Clerk `UserButton`

---

### 2E. Toast / Alert Patterns

**shadcn components:**
- `Sonner` (toast library built into shadcn) for transient notifications
- `Alert` + `AlertDescription` for persistent in-page messages

**Toast types:**
- Success: "Client added successfully" (green check, auto-dismiss 3s)
- Error: "Failed to send email" (red X, persists until dismissed)
- Info: "Campaign launching in 5 minutes" (blue info)
- Action: "3 documents pending review" + [Review →] button

---

### 2F. Loading Skeletons

**shadcn components:**
- `Skeleton` — rectangular placeholder shapes

**Patterns:**
- Table skeleton: 5 rows of alternating width bars
- Card skeleton: header bar + 3 body lines
- Stat card skeleton: large number block + label bar
- Full page: sidebar (real) + content area skeleton

---

### 2G. Error Boundaries

**Pattern:**
- Page-level: centered card with error message + retry button
- Component-level: inline alert with retry
- Network error: toast with retry action

**shadcn:** `Alert variant="destructive"` + `Button`

---

## 3. Marketing Pages

### 3A. Landing Page (exists — improvements only)

**Current:** Polished with Framer Motion. Hero, problem, features, pricing, FAQ, waitlist.

**Improvements needed:**
- Wire waitlist form to actual backend (currently `console.log`)
- Add social proof section (testimonials, logos when available)
- Add "See it in action" section with embedded Loom/demo
- Sticky CTA bar on scroll (after hero passes viewport)

**New shadcn components needed:**
- `Input` + `Button` for waitlist form (already there, just needs backend)

---

### 3B. Pricing Page (new)

```
┌──────────────────────────────────────────────────────────────┐
│                     Simple, honest pricing                    │
│              Everything you need to stop chasing.             │
│                                                               │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────┐     │
│  │   Starter   │  │  Professional   │  │    Scale    │     │
│  │   £79/mo    │  │    £149/mo      │  │   £249/mo   │     │
│  │             │  │   ★ POPULAR     │  │             │     │
│  │  50 clients │  │  200 clients    │  │  Unlimited  │     │
│  │  Email only │  │  + SMS + WA     │  │  + AI class │     │
│  │  1 user     │  │  3 users        │  │  10 users   │     │
│  │             │  │                 │  │             │     │
│  │ [Start free]│  │ [Start free]    │  │ [Contact us]│     │
│  └─────────────┘  └─────────────────┘  └─────────────┘     │
│                                                               │
│  ── FAQ ──────────────────────────────────────────────       │
│  ▸ What happens after my trial?                              │
│  ▸ Can I change plans?                                       │
│  ▸ Do my clients need accounts?                              │
└──────────────────────────────────────────────────────────────┘
```

**shadcn components:**
- `Card` + `CardHeader` + `CardContent` + `CardFooter` — pricing tiers
- `Badge` — "Popular" indicator
- `Button` — CTAs
- `Accordion` — FAQ section
- `Separator` between feature groups
- `Switch` or `Tabs` — monthly/annual toggle

**States:**
- Default: monthly pricing shown
- Toggle: annual pricing with savings badge ("Save 20%")
- Mobile: cards stack vertically, popular card first

---

## 4. Auth & Onboarding

### 4A. Sign In / Sign Up

**Current:** Clerk `<SignIn />` and `<SignUp />` components. Functional.

**Improvements:**
- Custom themed Clerk appearance to match dark design system
- Add background pattern/gradient to auth pages
- "What is chase.md?" link for prospects who land directly on sign-in

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│            ┌──────────────────────┐                          │
│            │   chase.md           │                          │
│            │                      │                          │
│            │   [Clerk SignIn]     │                          │
│            │                      │                          │
│            │   New here?          │                          │
│            │   Start free trial → │                          │
│            └──────────────────────┘                          │
│                                                               │
│           "Stop chasing. Start collecting."                   │
└──────────────────────────────────────────────────────────────┘
```

---

### 4B. Onboarding Wizard (NEW — critical missing piece)

First-time user after Clerk sign-up. Must create a practice before accessing dashboard.

```
Step 1/4 — Your Practice
┌──────────────────────────────────────────────────────────────┐
│  Let's set up your practice                                   │
│                                                               │
│  Practice name     [________________________]                │
│  Your role         [Practice Manager      ▾]                 │
│  Practice size     ○ 1-5  ○ 6-15  ○ 16-30  ○ 30+           │
│  Software          [□ Xero  □ Sage  □ IRIS  □ Other]        │
│                                                               │
│                                    [Continue →]               │
└──────────────────────────────────────────────────────────────┘

Step 2/4 — Chase Preferences
┌──────────────────────────────────────────────────────────────┐
│  How do you want to chase?                                    │
│                                                               │
│  Channels:  [✓] Email  [✓] SMS  [ ] WhatsApp                │
│  Tone:      ○ Friendly  ● Professional  ○ Firm              │
│  Timing:    Send chases between [09:00] and [17:00]          │
│  Days:      [✓]Mon [✓]Tue [✓]Wed [✓]Thu [✓]Fri [ ]Sat [ ]Sun│
│                                                               │
│                             [← Back]    [Continue →]          │
└──────────────────────────────────────────────────────────────┘

Step 3/4 — Add Your First Clients
┌──────────────────────────────────────────────────────────────┐
│  Let's add some clients to chase                              │
│                                                               │
│  ┌──────────────────────────────────────────────┐            │
│  │  📂 Import from CSV       [Upload CSV]       │            │
│  │  🔗 Connect Xero          [Connect]          │            │
│  │  ✏️  Add manually          [Add client]       │            │
│  │  ⏭️  Skip for now                             │            │
│  └──────────────────────────────────────────────┘            │
│                                                               │
│                             [← Back]    [Continue →]          │
└──────────────────────────────────────────────────────────────┘

Step 4/4 — You're Ready!
┌──────────────────────────────────────────────────────────────┐
│  🎉 Your practice is set up!                                  │
│                                                               │
│  Practice: Smith & Associates                                 │
│  Clients: 24 imported from CSV                                │
│  Channels: Email + SMS                                        │
│                                                               │
│  Next step: Create your first chase campaign                  │
│                                                               │
│              [Go to Dashboard →]                              │
└──────────────────────────────────────────────────────────────┘
```

**shadcn components:**
- `Card` — wizard container
- `Input`, `Select`, `RadioGroup`, `Checkbox` — form fields
- `Button` — navigation
- `Progress` — step indicator (1/4, 2/4...)
- Custom stepper using `Badge` + `Separator` for step dots
- `Dialog` for CSV import (reuse existing `csv-import-modal`)

**Data flow:**
- Step 1 → creates Clerk org + practice record via tRPC
- Step 2 → updates practice settings
- Step 3 → imports clients (CSV/Xero/manual)
- Step 4 → redirects to `/dashboard`

**States:**
- Each step validates before allowing Continue
- Back always available (except step 1)
- Skip available on step 3 (can add clients later)
- Error: inline validation messages under fields

---

## 5. Practice Dashboard

### 5A. Overview / Home

The first thing practitioners see. Must answer: "What needs my attention?"

```
┌──────────────────────────────────────────────────────────────┐
│  Good morning, Austin                          March 2, 2026  │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   127    │  │    42    │  │    12    │  │     5    │   │
│  │  Total   │  │ Active   │  │ Overdue  │  │ Critical │   │
│  │ Clients  │  │ Chases   │  │ (>14d)   │  │  (>30d)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                               │
│  ── Needs Attention ─────────────────────────────────────    │
│  🔴 Smith & Co      Tax Return 2025    3/8    45d   Lvl 5  │
│  🔴 Jones Ltd       VAT Q4            0/4    32d   Lvl 4  │
│  🟡 ABC Corp        Payroll           5/6    18d   Lvl 3  │
│  🟡 Davis Family    Year-End          2/10   15d   Lvl 2  │
│  🟢 Taylor Ltd      Tax Return 2025   7/8     3d   Lvl 1  │
│                                       [View all clients →]   │
│                                                               │
│  ── Active Campaigns ────────────────────────────────────    │
│  📋 Tax Return 2025     18/42 complete   ████████░░░░ 43%   │
│  📋 VAT Q4 2025          9/15 complete   ██████████░░ 60%   │
│  📋 Payroll Setup         3/8 complete   █████░░░░░░░ 38%   │
│                                      [View all campaigns →]  │
│                                                               │
│  ── Recent Activity ─────────────────────────────────────    │
│  ✅ Green Inc submitted P60                       2 min ago  │
│  📧 Chase email opened by Taylor Ltd              1 hr ago   │
│  📱 SMS sent to Davis Family                      2 hr ago   │
│  📞 Phone task due: Williams & Sons              today       │
│  ✅ ABC Corp submitted mileage log               yesterday   │
│                                                               │
│  ── Upcoming Deadlines ──────────────────────────────────    │
│  📅 31 Mar — Corporation Tax        6 clients remaining     │
│  📅 05 Apr — End of Tax Year        18 clients remaining    │
│  📅 07 Jul — Self Assessment (POA)  12 clients remaining    │
└──────────────────────────────────────────────────────────────┘
```

**shadcn components:**
- `Card` + `CardHeader` + `CardContent` — stat cards (4x top row)
- Custom `DataTable` (see below) — needs attention list
- `Progress` — campaign progress bars
- `Badge` — escalation level indicators
- `ScrollArea` — activity feed
- `Separator` between sections

**Additional libraries:**
- `recharts` — optional: weekly activity sparkline chart in stat cards
- `date-fns` — relative timestamps ("2 min ago")
- `framer-motion` — stat number count-up animation on load

**Data:** `dashboard.stats`, `dashboard.clientsNeedingAttention`, `dashboard.recentCampaigns`, `dashboard.recentActivity` — all exist in tRPC already.

**States:**
- Empty: "No active chases yet. Create your first campaign →" with illustration
- Loading: skeleton cards + skeleton table rows
- Error: alert banner at top with retry

**Mobile:**
- Stat cards: 2x2 grid
- Needs attention: horizontal scroll or accordion per client
- Activity feed: full width, scrollable

---

## 6. Client Management

### 6A. Client List

The workhorse view. Practitioners live here.

```
┌──────────────────────────────────────────────────────────────┐
│  Clients                              [+ Add] [📂 Import]   │
│                                                               │
│  🔍 Search by name, email, company...    [Filter ▾] [Sort ▾]│
│                                                               │
│  ☐ │ ● │ Name            │ Campaign        │ Prog │ Days│Lvl│
│  ──┼───┼─────────────────┼─────────────────┼──────┼─────┼───│
│  ☐ │ 🔴│ Smith & Co       │ Tax Return 2025 │ 3/8  │ 45d │ 5 │
│  ☐ │ 🔴│ Jones Ltd        │ VAT Q4          │ 0/4  │ 32d │ 4 │
│  ☐ │ 🟡│ ABC Corporation  │ Payroll         │ 5/6  │ 18d │ 3 │
│  ☐ │ 🟡│ Davis Family     │ Year-End        │ 2/10 │ 15d │ 2 │
│  ☐ │ 🟢│ Taylor Ltd       │ Tax Return 2025 │ 7/8  │  3d │ 1 │
│  ☐ │ ✅│ Green Inc        │ Onboarding      │ 4/4  │  —  │ — │
│  ☐ │ ⚪│ Williams & Sons  │ —               │  —   │  —  │ — │
│                                                               │
│  ◀ 1 2 3 ... 12 ▶                   Showing 1-25 of 289    │
│                                                               │
│  ── Bulk Actions (when selected) ────────────────────────    │
│  [▾ Add to campaign] [▾ Send reminder now] [Export CSV]      │
└──────────────────────────────────────────────────────────────┘
```

**shadcn components:**
- `Table` + `TableHeader` + `TableBody` + `TableRow` + `TableCell`
- `Checkbox` — row selection
- `Input` — search
- `DropdownMenu` — filter (status, campaign, escalation level) + sort
- `Button` — add, import, bulk actions
- `Badge` — escalation level, status
- `Pagination` or infinite scroll
- `Dialog` — add client modal (exists), CSV import modal (exists)

**Additional library:** `@tanstack/react-table` — sorting, filtering, selection, pagination

**Filters:**
- Status: All / Active / Overdue / Critical / Complete / No campaign
- Campaign: dropdown of active campaigns
- Escalation level: 1-5
- Last contact: today / this week / this month / never

**Sort options:**
- Days overdue (default, descending)
- Name (A-Z)
- Progress (ascending — least complete first)
- Last activity (most recent first)

**Row click:** navigates to client detail page

**Bulk actions (visible when ≥1 row selected):**
- Add to campaign
- Send reminder now
- Pause chases
- Export selected as CSV

**States:**
- Empty: "No clients yet. Add your first client or import from CSV →"
- Loading: 8 skeleton rows
- Filtered empty: "No clients match your filters. [Clear filters]"

**Mobile:**
- Cards instead of table rows
- Each card: name, status dot, campaign, progress bar
- Swipe actions: view / pause / remind

---

### 6B. Client Detail

Deep view of a single client. Everything about their chase history.

```
┌──────────────────────────────────────────────────────────────┐
│  ← Clients / Smith & Co                    [⋯ Actions ▾]    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Smith & Co                                   🔴 Lvl 5  │ │
│  │  sarah@smithco.co.uk  •  07700 123456                   │ │
│  │  Tax Return 2025  •  3/8 items  •  45 days overdue      │ │
│  │  █████░░░░░░░░░░░ 38%                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Overview] [Documents] [Chase History] [Notes]              │
│                                                               │
│  ── Tab: Overview ───────────────────────────────────────    │
│                                                               │
│  Contact                        Tax Details                   │
│  Sarah Smith                    UTR: 1234567890              │
│  sarah@smithco.co.uk           NINO: AB 12 34 56 C          │
│  07700 123456                   Year end: 5 April            │
│  123 High Street, B1 1AA       Agent ref: 12345             │
│                                                               │
│  ── Active Enrollment ───────────────────────────────────    │
│  Campaign: Tax Return 2025                                   │
│  Enrolled: 15 Jan 2026                                       │
│  Deadline: 31 Jan 2026                                       │
│  Current level: 5 (Final notice)                             │
│  Next action: Formal letter scheduled 3 Feb                  │
│  Portal link: chase.md/p/abc123... [Copy] [Resend]          │
│                                                               │
│  ── Quick Actions ───────────────────────────────────────    │
│  [Send reminder now] [Pause chase] [Mark complete]           │
│  [Open portal as client] [Call client]                       │
└──────────────────────────────────────────────────────────────┘
```

**Tab: Documents**
```
│  ── Documents (3 of 8 received) ──────────────────────────   │
│                                                               │
│  ✅ P60 from employer           Received 18 Jan   [View]    │
│  ✅ Bank interest certificate   Received 20 Jan   [View]    │
│  ✅ Business mileage log        Received 22 Jan   [View]    │
│  ⬜ Rental income summary       — Not received —            │
│  ⬜ Dividend vouchers           — Not received —            │
│  ⬜ Professional subscriptions  — Not received —            │
│  ⬜ Charitable donation receipts— Not received —            │
│  ⬜ Property expenses breakdown — Not received —            │
```

**Tab: Chase History (Timeline)**
```
│  ── Chase History ────────────────────────────────────────   │
│                                                               │
│  📧 Lvl 1 — Friendly reminder                    15 Jan    │
│     ✅ Delivered  •  👁 Opened 15 Jan 10:23am               │
│     "Hi Sarah, just a quick reminder..."                     │
│                                                               │
│  📧 Lvl 2 — Follow-up                            18 Jan    │
│     ✅ Delivered  •  👁 Opened 18 Jan 2:15pm                │
│     "Following up on our previous email..."                  │
│                                                               │
│  📧 Lvl 3 — Urgent                               23 Jan    │
│     ✅ Delivered  •  ❌ Not opened                           │
│     "We still need the following documents..."               │
│                                                               │
│  📱 Lvl 4 — SMS reminder                         30 Jan    │
│     ✅ Delivered                                             │
│     "Hi Sarah, we urgently need your tax docs..."            │
│                                                               │
│  📞 Lvl 5 — Phone call task                      ← TODAY   │
│     ⬜ Not completed                                         │
│     [Mark as called] [Log outcome]                           │
```

**Tab: Notes**
```
│  ── Notes ────────────────────────────────────────────────   │
│                                                               │
│  [+ Add note]                                                │
│                                                               │
│  Austin — 28 Jan                                             │
│  "Sarah said she'd send by Friday. Husband handles the      │
│   rental income docs — she'll chase him."                    │
│                                                               │
│  System — 22 Jan                                             │
│  "Client submitted 3 documents via portal"                   │
```

**shadcn components:**
- `Breadcrumb` — navigation back
- `Card` — header info card
- `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent` — section tabs
- `Badge` — status, escalation level
- `Progress` — completion bar
- `Button` — quick actions
- `Table` — document list
- `DropdownMenu` — "⋯ Actions" (edit, delete, export)
- `Textarea` + `Button` — notes input
- `Tooltip` — hover on timeline items for full timestamp
- `Dialog` — log call outcome modal

**Data:** `clients.get`, `clients.messages`, `documents.listByClient` — all exist in tRPC.

---

## 7. Campaign System

### 7A. Campaign List

```
┌──────────────────────────────────────────────────────────────┐
│  Campaigns                               [+ New Campaign]    │
│                                                               │
│  [Active] [Draft] [Completed] [All]                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  📋 Tax Return 2025                        🟢 Active    │ │
│  │  42 clients  •  18 complete  •  5 critical              │ │
│  │  ████████████████░░░░░░░░░░ 43%        Due: 31 Jan     │ │
│  │  Created 5 Jan  •  Last chase: 2 hours ago              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  📋 VAT Q4 2025                            🟢 Active    │ │
│  │  15 clients  •  9 complete  •  2 overdue                │ │
│  │  ██████████████████████░░░░ 60%        Due: 7 Feb      │ │
│  │  Created 10 Jan  •  Last chase: 5 hours ago             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  📋 Payroll Setup                          🟡 Draft     │ │
│  │  8 clients  •  0 complete                               │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░ 0%          Due: 15 Mar     │ │
│  │  Created today  •  Not launched                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**shadcn components:**
- `Card` — each campaign card
- `Tabs` — status filter
- `Badge` — status indicator
- `Progress` — completion bar
- `Button` — new campaign

**Card click:** navigates to campaign detail

---

### 7B. Campaign Creation Wizard (WHO → WHAT → WHEN → REVIEW)

The most important UX flow in the app. Must feel effortless.

```
Step indicator:
  ① WHO  ——  ② WHAT  ——  ③ WHEN  ——  ④ REVIEW
  [●]────────[○]─────────[○]─────────[○]
```

**Step 1: WHO — Select Clients**
```
┌──────────────────────────────────────────────────────────────┐
│  ① WHO   ② WHAT   ③ WHEN   ④ REVIEW                        │
│  ━━━━━━                                                       │
│                                                               │
│  Who needs to send you documents?                             │
│                                                               │
│  🔍 Search clients...          [Select all] [Clear]          │
│                                                               │
│  ☐ │ Smith & Co          │ sarah@smithco.co.uk    │ Xero ✓  │
│  ☑ │ Jones Ltd           │ mark@jonesltd.com      │ Manual  │
│  ☑ │ ABC Corporation     │ admin@abccorp.co.uk    │ Xero ✓  │
│  ☐ │ Davis Family Trust  │ james@davis.com        │ CSV     │
│  ☑ │ Taylor Ltd          │ info@taylorltd.co.uk   │ Xero ✓  │
│                                                               │
│  3 clients selected                                           │
│                                                               │
│  ── Or add new ──────────────────────────────────────────    │
│  [+ Add client manually]  [📂 Import CSV]  [🔗 Sync Xero]  │
│                                                               │
│                                        [Continue → WHAT]      │
└──────────────────────────────────────────────────────────────┘
```

**Step 2: WHAT — Define Documents Needed**
```
┌──────────────────────────────────────────────────────────────┐
│  ① WHO   ② WHAT   ③ WHEN   ④ REVIEW                        │
│          ━━━━━━                                               │
│                                                               │
│  What do you need from them?                                  │
│                                                               │
│  ── Start from template ─────────────────────────────────    │
│  [Tax Return 2025] [VAT Quarter] [Year-End Accounts]         │
│  [Payroll Setup] [New Client Onboarding] [+ Custom]          │
│                                                               │
│  ── Selected: Tax Return 2025 ───────────────────────────    │
│                                                               │
│  Campaign name: [Tax Return 2025                    ]        │
│                                                               │
│  Document checklist:                                          │
│  ☑ P60 from employer                           [✏️] [🗑]    │
│  ☑ Bank interest certificate                   [✏️] [🗑]    │
│  ☑ Rental income summary                       [✏️] [🗑]    │
│  ☑ Dividend vouchers                           [✏️] [🗑]    │
│  ☑ Charitable donation receipts                [✏️] [🗑]    │
│  [+ Add document]                                             │
│                                                               │
│  💡 AI suggestion: Based on your client data, you may also   │
│     want to request: Property expenses, Foreign income       │
│     [+ Add suggested]                                         │
│                                                               │
│                            [← Back]    [Continue → WHEN]      │
└──────────────────────────────────────────────────────────────┘
```

**Step 3: WHEN — Configure Chase Schedule**
```
┌──────────────────────────────────────────────────────────────┐
│  ① WHO   ② WHAT   ③ WHEN   ④ REVIEW                        │
│                    ━━━━━━                                      │
│                                                               │
│  When and how should we chase?                                │
│                                                               │
│  Deadline: [31 January 2026        📅]                       │
│  Start chasing: [15 January 2026   📅] (or immediately)     │
│                                                               │
│  ── Chase Sequence ──────────────────────────────────────    │
│                                                               │
│  🔵 Step 1 — Email (Friendly)              Day 0            │
│  │  "Hi {name}, we need the following..."                    │
│  │  [Preview] [Edit]                                         │
│  │                                                           │
│  │  ⏱ Wait 3 days                         [Edit delay]      │
│  │                                                           │
│  🔵 Step 2 — Email (Follow-up)             Day 3            │
│  │  "Just following up on our previous..."                   │
│  │  [Preview] [Edit]                                         │
│  │                                                           │
│  │  ⏱ Wait 5 days                         [Edit delay]      │
│  │                                                           │
│  🟡 Step 3 — Email (Urgent)                Day 8            │
│  │  "We still need the following urgent..."                  │
│  │  [Preview] [Edit]                                         │
│  │                                                           │
│  │  ⏱ Wait 7 days                         [Edit delay]      │
│  │                                                           │
│  🟠 Step 4 — SMS                            Day 15           │
│  │  "Hi {name}, we urgently need..."                         │
│  │  [Preview] [Edit]                                         │
│  │                                                           │
│  │  ⏱ Wait 5 days                         [Edit delay]      │
│  │                                                           │
│  🔴 Step 5 — Phone Call Task                Day 20           │
│  │  Assigned to: [Austin Mander ▾]                           │
│  │                                                           │
│  │  ⏱ Wait 7 days                         [Edit delay]      │
│  │                                                           │
│  🔴 Step 6 — Formal Letter                  Day 27           │
│     "Dear {name}, despite our attempts..."                   │
│     [Preview] [Edit]                                         │
│                                                               │
│  [+ Add step]  [Reset to default]                            │
│                                                               │
│                            [← Back]    [Continue → REVIEW]    │
└──────────────────────────────────────────────────────────────┘
```

**Step 4: REVIEW — Summary & Launch**
```
┌──────────────────────────────────────────────────────────────┐
│  ① WHO   ② WHAT   ③ WHEN   ④ REVIEW                        │
│                              ━━━━━━━━                         │
│                                                               │
│  Review your campaign                                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Campaign: Tax Return 2025                              │ │
│  │  Clients: 3 (Jones Ltd, ABC Corp, Taylor Ltd)          │ │
│  │  Documents: 5 items per client                          │ │
│  │  Deadline: 31 January 2026                              │ │
│  │  Chase steps: 6 (3 email + 1 SMS + 1 call + 1 letter) │ │
│  │  First chase: 15 January 2026                           │ │
│  │  Estimated completion: 27 days                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ── Preview First Email ─────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  To: mark@jonesltd.com                                  │ │
│  │  Subject: Documents needed — Tax Return 2025            │ │
│  │                                                         │ │
│  │  Hi Mark,                                               │ │
│  │                                                         │ │
│  │  We're preparing your 2025 tax return and need the      │ │
│  │  following documents from you:                          │ │
│  │  • P60 from employer                                    │ │
│  │  • Bank interest certificate                            │ │
│  │  ...                                                    │ │
│  │                                                         │ │
│  │  [Upload your documents →]                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Save as draft]    [← Back]    [🚀 Launch Campaign]         │
└──────────────────────────────────────────────────────────────┘
```

**shadcn components across all steps:**
- Custom step indicator: `Badge` (numbered) + `Separator` (line between)
- Step 1: `Table` + `Checkbox` + `Input` (search) + `Button`
- Step 2: `ToggleGroup` (templates) + `Card` (checklist) + `Input` + `Button`
- Step 3: Custom timeline component + `Select` (assignee) + `Popover` + `Calendar` (date picker) + `Button`
- Step 4: `Card` (summary) + `Card` (email preview) + `Button`
- All: `Button` for navigation, `Badge` for step indicator

**Animation:**
- Step transitions: slide left/right with framer-motion
- Timeline steps: stagger enter animation
- Launch button: pulse animation, then confetti on click

---

### 7C. Campaign Detail / Monitoring

```
┌──────────────────────────────────────────────────────────────┐
│  ← Campaigns / Tax Return 2025              [⏸ Pause] [⋯]  │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  42      │  │  18      │  │  12      │  │  5       │   │
│  │ Enrolled │  │ Complete │  │ Overdue  │  │ Critical │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                               │
│  Overall: ████████████████░░░░░░░░░░ 43%   Due: 31 Jan     │
│                                                               │
│  ── Enrolled Clients ────────────────────────────────────    │
│  🔍 Search...                      [Filter ▾] [Sort ▾]      │
│                                                               │
│  ● │ Client          │ Progress │ Level │ Last Contact │ Act │
│  ──┼─────────────────┼──────────┼───────┼──────────────┼─────│
│  🔴│ Smith & Co       │ 3/8 38% │ Lvl 5 │ SMS 2d ago   │ [⋯]│
│  🔴│ Jones Ltd        │ 0/4  0% │ Lvl 4 │ Email 5d ago │ [⋯]│
│  🟡│ ABC Corp         │ 5/6 83% │ Lvl 3 │ Email 1d ago │ [⋯]│
│  🟢│ Taylor Ltd       │ 7/8 88% │ Lvl 1 │ Upload today │ [⋯]│
│  ✅│ Green Inc        │ 4/4 100%│ Done  │ Complete     │ [⋯]│
│                                                               │
│  ── Campaign Settings ───────────────────────────────────    │
│  Schedule: Mon-Fri, 09:00-17:00                              │
│  Channels: Email + SMS + WhatsApp                            │
│  Template: Tax Return 2025 (5 documents)                     │
│  [Edit settings]                                             │
└──────────────────────────────────────────────────────────────┘
```

**shadcn components:**
- `Card` — stat cards
- `Progress` — overall bar
- `Table` — enrolled clients (reuse client table pattern)
- `Badge` — level, status
- `DropdownMenu` — row actions (remind now, pause, remove, view timeline)
- `Button` — pause/resume campaign
- `Collapsible` — campaign settings section

---

## 8. Chase Timeline (Per-Client-in-Campaign)

Accessible from campaign detail or client detail. The visual escalation journey.

```
┌──────────────────────────────────────────────────────────────┐
│  ← Smith & Co / Tax Return 2025                              │
│                                                               │
│  Progress: ███████░░░░░░░░░ 3/8 items    🔴 Level 5        │
│                                                               │
│  ┌─ TIMELINE ──────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  🔵 15 Jan — Email: Friendly reminder                   │ │
│  │  │  ✅ Delivered → 👁 Opened (15 Jan 10:23)             │ │
│  │  │  ↳ Client uploaded P60, bank cert (18 Jan)           │ │
│  │  │                                                      │ │
│  │  🔵 18 Jan — Email: Follow-up                           │ │
│  │  │  ✅ Delivered → 👁 Opened (18 Jan 14:15)             │ │
│  │  │                                                      │ │
│  │  🟡 23 Jan — Email: Urgent                              │ │
│  │  │  ✅ Delivered → ❌ Not opened                        │ │
│  │  │                                                      │ │
│  │  🟠 30 Jan — SMS sent                                   │ │
│  │  │  ✅ Delivered                                        │ │
│  │  │  ↳ Client uploaded mileage log (31 Jan)              │ │
│  │  │                                                      │ │
│  │  🔴 4 Feb — Phone call task              ← YOU ARE HERE │ │
│  │  │  ⬜ Pending — assigned to Austin                     │ │
│  │  │  [✅ Mark called] [📝 Log outcome]                   │ │
│  │  │                                                      │ │
│  │  🔴 11 Feb — Formal letter                 (scheduled)  │ │
│  │  │  ⬜ Will send if still incomplete                    │ │
│  │  │                                                      │ │
│  │  ⚫ 25 Feb — Partner escalation             (scheduled)  │ │
│  │     ⬜ Final step                                       │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ── Quick Actions ───────────────────────────────────────    │
│  [Send reminder now] [Pause] [Skip to next level]            │
│  [Open portal as client] [Copy portal link]                  │
└──────────────────────────────────────────────────────────────┘
```

**shadcn components:**
- Custom timeline (vertical line + positioned nodes)
- `Badge` — level color coding
- `Tooltip` — hover on timestamps for exact time
- `Button` — action buttons
- `Dialog` — log outcome modal
- `Collapsible` — expand message preview on each step

**Implementation:**
- Custom component: `<ChaseTimeline steps={[]} currentLevel={5} />`
- Each node: colored circle + line segment + content card
- Color from design system escalation palette
- "YOU ARE HERE" marker: pulsing ring animation (framer-motion)
- Future steps: dashed line, muted colors

---

## 9. Response Hub

Unified inbox for all client responses across all campaigns. Inspired by Instantly's Unibox.

```
┌──────────────────────────────────────────────────────────────┐
│  Responses                              12 unread             │
│                                                               │
│  [All] [Email] [WhatsApp] [SMS] [Portal] [Unread]           │
│                                                               │
│  ┌──────────────────────────┬────────────────────────────┐   │
│  │  Conversation List       │  Selected Conversation     │   │
│  │                          │                            │   │
│  │  🔴 Smith & Co     2m   │  Smith & Co                │   │
│  │  "Hi, I can't find my   │  sarah@smithco.co.uk       │   │
│  │   P60 anywhere..."      │  Tax Return 2025           │   │
│  │                          │                            │   │
│  │  🟢 Taylor Ltd    15m   │  ┌──────────────────────┐  │   │
│  │  Uploaded 2 documents    │  │ 📧 You (chase email) │  │   │
│  │                          │  │ 23 Jan — Lvl 3       │  │   │
│  │  🟡 ABC Corp      1h    │  │ "We still need..."   │  │   │
│  │  "Will send by Friday"  │  └──────────────────────┘  │   │
│  │                          │                            │   │
│  │  ⚪ Davis Family   3h    │  ┌──────────────────────┐  │   │
│  │  Email opened            │  │ 💬 Sarah (reply)     │  │   │
│  │                          │  │ 24 Jan — via email   │  │   │
│  │                          │  │ "Hi, I can't find    │  │   │
│  │                          │  │ my P60 anywhere.     │  │   │
│  │                          │  │ Can I send a         │  │   │
│  │                          │  │ payslip instead?"    │  │   │
│  │                          │  └──────────────────────┘  │   │
│  │                          │                            │   │
│  │                          │  [Type a reply...]         │   │
│  │                          │                            │   │
│  │                          │  Quick: [✅ Accept payslip]│   │
│  │                          │  [⏸ Pause chase]          │   │
│  │                          │  [📝 Add note]            │   │
│  └──────────────────────────┴────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**shadcn components:**
- `ResizablePanelGroup` + `ResizablePanel` — two-pane layout
- `ScrollArea` — conversation list + message thread
- `Input` — reply composer
- `Tabs` — channel filter
- `Badge` — unread count, channel indicator
- `Avatar` — sender/recipient
- `Button` — quick actions
- `Separator` between messages

**Additional library:** None — custom layout with shadcn primitives

**States:**
- Empty: "No responses yet. Responses will appear here when clients reply to chase messages."
- Loading: skeleton conversation list
- No selection: right panel shows "Select a conversation"
- Mobile: single-panel, list → detail navigation

---

## 10. Document Review

Queue for reviewing uploaded documents. AI classification confidence + manual override.

```
┌──────────────────────────────────────────────────────────────┐
│  Document Review                          8 pending           │
│                                                               │
│  [Pending] [Approved] [Rejected] [All]                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  📄 payslip-jan-2025.pdf                                │ │
│  │  Uploaded by: Sarah Smith (Smith & Co)                  │ │
│  │  Campaign: Tax Return 2025                              │ │
│  │  AI classified as: P60         Confidence: 72% ⚠️       │ │
│  │                                                         │ │
│  │  [👁 Preview]  [✅ Accept as P60]  [🔄 Reclassify ▾]  │ │
│  │  [❌ Reject + request resubmit]                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  📄 bank-statement-2025.pdf                             │ │
│  │  Uploaded by: Mark Jones (Jones Ltd)                    │ │
│  │  Campaign: Tax Return 2025                              │ │
│  │  AI classified as: Bank interest cert   Confidence: 95% │ │
│  │                                                         │ │
│  │  [👁 Preview]  [✅ Accept]  [🔄 Reclassify ▾]         │ │
│  │  [❌ Reject + request resubmit]                        │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**shadcn components:**
- `Card` — each document review card
- `Badge` — confidence level (green >90%, amber 70-90%, red <70%)
- `Tabs` — status filter
- `Button` — accept/reject/reclassify
- `DropdownMenu` — reclassify with document type options
- `Dialog` — rejection reason + message to client
- `Sheet` — document preview (slide-over panel)

**States:**
- Empty: "No documents to review. Nice work! 🎉"
- Loading: skeleton cards

---

## 11. Client Portal (External)

What the client sees. Must be dead simple, mobile-first, no login.

### 11A. Magic Link Landing

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│           [Practice Logo]                                     │
│                                                               │
│           Smith & Associates                                  │
│                                                               │
│  Hi Sarah,                                                    │
│                                                               │
│  We need a few documents for your 2025 Tax Return.           │
│  Upload them below — it only takes a few minutes.            │
│                                                               │
│  Due: 31 January 2026 (12 days remaining)                    │
│                                                               │
│  Progress: ████████░░░░░░░░ 3 of 8 items                    │
│                                                               │
│  ─── Income ────────────────────────────────────────         │
│  ✅ P60 from employer              Received 18 Jan           │
│  ✅ Bank interest certificate      Received 20 Jan           │
│  ⬜ Rental income summary                                    │
│     ┌──────────────────────────────────────────┐             │
│     │  📂 Drag & drop file here                │             │
│     │     or click to browse                   │             │
│     │     PDF, JPG, PNG up to 10MB             │             │
│     └──────────────────────────────────────────┘             │
│  ⬜ Dividend vouchers                                        │
│     [Upload ↑]                                               │
│                                                               │
│  ─── Expenses ──────────────────────────────────────         │
│  ✅ Business mileage log           Received 22 Jan           │
│  ⬜ Professional subscriptions     [Upload ↑]                │
│  ⬜ Charitable donations           [Upload ↑]                │
│  ⬜ Property expenses              [Upload ↑]                │
│                                                               │
│  💬 Have a question?                                         │
│  [Type your message here...              ] [Send]            │
│                                                               │
│  ─────────────────────────────────────────────               │
│  Powered by chase.md                                         │
└──────────────────────────────────────────────────────────────┘
```

### 11B. Upload Progress

```
│  ⬜ Rental income summary                                    │
│     📄 rental-income-summary.pdf                             │
│     ████████████████████░░░░ 78%  Uploading...              │
```

### 11C. Completion State

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│           [Practice Logo]                                     │
│                                                               │
│           🎉                                                  │
│                                                               │
│  All done, Sarah!                                            │
│                                                               │
│  You've submitted all 8 documents for your                   │
│  2025 Tax Return. We'll be in touch if we                    │
│  need anything else.                                         │
│                                                               │
│  Progress: ████████████████ 8 of 8 items ✅                  │
│                                                               │
│  Thank you for using Smith & Associates.                     │
│                                                               │
│  ─────────────────────────────────────────────               │
│  Powered by chase.md                                         │
└──────────────────────────────────────────────────────────────┘
```

**shadcn components:**
- `Card` — main container
- `Progress` — completion bar
- `Badge` — status per item (received/pending)
- `Button` — upload triggers
- `Input` + `Button` — question form
- `Separator` — between sections
- Custom dropzone (react-dropzone or custom)

**Critical UX:**
- **No login** — magic link only
- **Auto-save** — uploads persist immediately
- **Mobile-first** — full width, large touch targets
- **Progress bar** — always visible, motivating
- **Section grouping** — not a flat list
- **Inline upload** — expand per item, no separate page
- **Completion confetti** — subtle canvas-confetti on 100%

**Additional libraries:**
- `react-dropzone` — drag-and-drop file upload
- `canvas-confetti` — completion celebration

**States:**
- Invalid/expired token: "This link has expired. Please contact your accountant."
- Loading: skeleton checklist
- Partial: some items checked, upload zones visible
- Complete: celebration state
- Error: toast on upload failure with retry

**Design:** Light theme by default (clients aren't power users, light is more friendly). Practice branding (logo + accent color) applied.

---

## 12. Settings

### 12A. Settings Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Settings                                                     │
│                                                               │
│  ┌────────────────┐  ┌──────────────────────────────────┐   │
│  │ Practice       │  │  [Selected section content]      │   │
│  │ Team           │  │                                  │   │
│  │ Chase Defaults │  │                                  │   │
│  │ Integrations   │  │                                  │   │
│  │ Templates      │  │                                  │   │
│  │ Billing        │  │                                  │   │
│  │ GDPR           │  │                                  │   │
│  └────────────────┘  └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Sections:**

**Practice:** Name, address, logo upload, custom branding color, reply-to email
**Team:** Invite members (via Clerk), role assignment, chase assignment defaults
**Chase Defaults:** Default schedule, business hours, tone, channels enabled
**Integrations:** Xero connect/disconnect, Stripe billing, Twilio setup, Resend domain
**Templates:** Document template CRUD, email template editor, SMS templates
**Billing:** Current plan, usage, upgrade/downgrade, invoices (Stripe portal)
**GDPR:** Data retention policy, consent settings, export data, delete account

**shadcn components:**
- Side nav: `Button variant="ghost"` list (or `Tabs` vertical)
- Forms: `Input`, `Textarea`, `Select`, `Switch`, `Label`
- `Card` — each settings section
- `Separator` — between form groups
- `Alert` — danger zone warnings
- `Dialog` — confirm destructive actions
- `Table` — team members list, template list

---

## 13. Implementation Order

Build in this order for maximum impact with minimum effort:

### Phase 1: Core Shell (2-3 days)
1. Design system tokens in `globals.css`
2. Sidebar navigation (refactor existing `dashboard-shell`)
3. Top bar with breadcrumbs
4. Loading skeletons for all page types
5. Toast setup (Sonner)

### Phase 2: Dashboard + Client List (3-4 days)
6. Dashboard overview (refactor existing — add stat animations, attention list)
7. Client list with @tanstack/table (sorting, filtering, selection)
8. Client detail with tabs (overview, documents, timeline, notes)

### Phase 3: Campaign System (4-5 days)
9. Campaign list (card-based)
10. Campaign creation wizard (4 steps)
11. Campaign detail/monitoring page
12. Chase timeline component

### Phase 4: Response Hub + Documents (3-4 days)
13. Response hub (two-pane layout)
14. Document review queue
15. Notification system (bell + popover)

### Phase 5: Client Portal Upgrade (2-3 days)
16. Portal redesign (sections, inline upload, progress)
17. Completion state with confetti
18. Mobile optimization pass

### Phase 6: Onboarding + Settings (2-3 days)
19. Onboarding wizard (4 steps)
20. Settings pages (all sections)

### Phase 7: Polish (2-3 days)
21. Command palette (Cmd+K)
22. Keyboard shortcuts throughout
23. Micro-animations (framer-motion)
24. Empty states for all pages
25. Error boundaries
26. Dark/light mode toggle

**Total estimate: ~20-25 dev days**

---

## Appendix: Component Library

### shadcn components needed (install list):
```bash
npx shadcn@latest add accordion alert avatar badge breadcrumb button card checkbox collapsible command dialog dropdown-menu input label pagination popover progress radio-group resizable-panel scroll-area select separator sheet skeleton sonner switch table tabs textarea toggle-group tooltip
```

### Additional libraries:
```bash
npm install @tanstack/react-table cmdk framer-motion react-dropzone canvas-confetti recharts date-fns
```

### Custom components to build:
- `<ChaseTimeline />` — vertical escalation timeline
- `<StatusDot />` — colored circle indicator
- `<StatCard />` — dashboard stat with optional sparkline
- `<StepIndicator />` — wizard progress (numbered dots + lines)
- `<FileDropzone />` — branded drag-drop upload zone
- `<EmptyState />` — illustration + message + CTA pattern
- `<ChannelIcon />` — email/sms/whatsapp/phone/letter icons

---

*This plan maps every pixel to a component. Hand it to Claude Code and build.*
