# UI/UX Research Report for chase.md

> Competitive analysis of email outreach, campaign management, and document chasing tools.
> Compiled: 2 March 2026

---

## Table of Contents

1. [Tool-by-Tool Analysis](#tool-by-tool-analysis)
   - [Instantly.ai](#1-instantlyai)
   - [Lemlist](#2-lemlist)
   - [Woodpecker](#3-woodpecker)
   - [Content Snare](#4-content-snare)
   - [Chaser](#5-chaser)
   - [Customer.io](#6-customerio)
   - [Linear](#7-linear)
2. [Synthesis: Recommendations for chase.md](#synthesis-recommendations-for-chasemd)
3. [Quick Wins](#quick-wins)

---

## Tool-by-Tool Analysis

### 1. Instantly.ai

**What they do:** Cold email campaign automation at scale — inbox rotation, lead management, deliverability.

#### Key UX Patterns

- **Wizard-style campaign creation:** Step-by-step flow (Accounts → Leads → Sequences → Schedule → Launch). Each step is a discrete screen, not a multi-field form. This makes complex setup feel like filling in blanks.
- **Straightforward campaign UI:** Users frequently praise the simplicity despite deep functionality. The campaign sequence dashboard shows steps vertically with clear labels — no flowcharts, just a list with delay indicators.
- **AI-assisted personalization:** A small robot icon in the sequence editor opens an AI panel — progressive disclosure of power features without cluttering the base experience.
- **Unibox (unified inbox):** All replies across all sending accounts in one inbox. Crucial pattern: *aggregate complex infrastructure into a single view*.
- **Account health at a glance:** Dashboard tracks deliverability rates, warm-up status, and sending health per account using simple colored indicators (green/yellow/red).

#### Dashboard Hierarchy

1. **Top level:** Campaign list with status badges (Active/Paused/Draft) + key metrics inline (sent, opened, replied)
2. **Second level:** Individual campaign stats — funnel visualization from sent → opened → replied → booked
3. **Buried:** Detailed deliverability metrics, bounce logs, scheduling details

#### What Works for chase.md

- The **step-by-step campaign creation** model maps perfectly to creating a chase sequence
- **Unibox pattern** → unified view of all client responses across campaigns
- **Health indicators** per account → health indicators per client (responsive/unresponsive/complete)

#### Weaknesses

- UI has been criticized as "rough around the edges" — functional but not polished
- Complex pricing across multiple products creates confusion

---

### 2. Lemlist

**What they do:** Multichannel outreach (email + LinkedIn + calls) with strong personalization.

#### Key UX Patterns

- **Visual sequence builder:** Steps displayed as cards in a vertical timeline. Each card shows the channel (email/LinkedIn/call), a preview snippet, and delay between steps. Drag to reorder.
- **AI sequence generator:** Describe your target persona and value prop → AI generates a full multi-step sequence. Users then edit, reorder, adjust delays, and add/remove steps. This "generate then refine" pattern dramatically reduces blank-page anxiety.
- **Multichannel step types:** Each step in the sequence is visually coded by channel — email icon, LinkedIn icon, phone icon. Immediately clear what each touchpoint is.
- **A/B testing at sequence level:** Create variant sequences and the UI shows them as parallel tracks. Clean visual metaphor.
- **Personalization with dynamic images/landing pages:** Inline preview of personalized content. What-you-see-is-what-they-get.

#### Dashboard Hierarchy

1. Campaign list with performance summary (open rate, reply rate, click rate)
2. Individual campaign → step-by-step analytics showing drop-off
3. Lead-level view showing where each contact is in the sequence

#### What Works for chase.md

- **Vertical timeline with channel indicators** → perfect for showing escalation steps (Email 1 → Email 2 → Phone call → Letter)
- **AI sequence generation** → "Describe what you need from this client" → auto-generate chase sequence
- **Step-by-step drop-off analytics** → see exactly where clients stop responding

---

### 3. Woodpecker

**What they do:** Cold email with condition-based branching campaigns.

#### Key UX Patterns

- **"Path" visual builder:** Campaign flows are built as paths with conditional branching. If a prospect opens but doesn't reply → take path A. If they reply → path B. This tree-like visualization makes complex logic visible.
- **Clean, praised interface:** G2 reviewers consistently call out the intuitive UI. The campaign list is the default landing page — simple table with status, stats, and actions.
- **Condition-based steps:** Conditions appear as diamond/decision nodes between email steps. Each condition is a simple dropdown (opened? clicked? replied?) — no code, no complex logic builders.
- **Snippet variables:** Personalization via `{{snippets}}` shown inline in the email editor with color highlighting.

#### Dashboard Hierarchy

1. **Default view:** Campaign list with status + core metrics
2. **Campaign detail:** Path visualization with per-step stats
3. **Prospect list:** Per-contact status within each campaign

#### What Works for chase.md

- **Condition-based branching** → If client submits partial documents → send different follow-up than if they ignore entirely
- **Path visualization** → visual representation of the escalation journey
- **Campaign list as homepage** → chase.md should default to the active chase list, not a generic dashboard

---

### 4. Content Snare

**What they do:** Document collection from clients with automated reminders. **chase.md's closest competitor.**

#### Key UX Patterns

- **Request builder (drag-and-drop):** Build a request by dragging question types (text, file upload, date, etc.) into sections. Each section = a category of documents/info needed. Template library for common request types (tax returns, onboarding docs, etc.).
- **Client portal:** Clients see a clean, branded portal with:
  - Customizable title (e.g., "Documents for Your 2025 Tax Filing")
  - Instruction text
  - Progress bar showing completion
  - Auto-save on everything (clients can leave and return)
  - No login required (magic link access)
- **Automatic reminders:** Configurable reminder schedule. The killer feature — reminders go out automatically, removing the awkward "chasing" feeling.
- **In-platform discussions:** Clients can ask questions on specific items without email. Practitioners can "reject" an item to request corrections — inline, contextual feedback.
- **Live request tracking:** Both practitioner and client can see status at a glance — what's submitted, what's pending, what's been rejected.
- **Progress visualization:** Completion percentage per request, per section, per client. Traffic-light status indicators.

#### Dashboard Hierarchy

1. **Request list:** All active requests with client name, status (% complete), last activity, due date
2. **Individual request:** Section-by-section view with item-level status
3. **Client view:** All requests for a given client

#### What chase.md Must Learn

- **Auto-save everything** — clients hate losing work
- **Magic link access** — no account creation friction for clients
- **Inline reject/approve** — contextual feedback, not email threads
- **Progress bars** — the most satisfying UX element for document collection
- **Templates** — pre-built request templates for common scenarios (tax season, onboarding, year-end)

#### Where chase.md Can Differentiate

Content Snare is focused on *document collection*. chase.md focuses on *chasing* — the escalation, the urgency, the multi-channel follow-up. Content Snare's reminders are basic (email on a schedule). chase.md can offer:
- **Escalation intelligence** — reminders that get progressively more urgent
- **Multi-channel** — email → SMS → phone call task → letter
- **Practice-wide visibility** — not just per-request, but aggregated views of all outstanding work across all clients
- **Deadline-driven dashboards** — tax deadlines, filing deadlines, compliance deadlines

---

### 5. Chaser

**What they do:** Automated invoice chasing for accounts receivable.

#### Key UX Patterns

- **Xero/QuickBooks sync:** Pulls invoices directly from accounting software. No manual data entry. Chaser's killer onboarding moment: connect your accounting tool → see all your overdue invoices instantly.
- **Customizable chase schedules:** Per-customer chase cadences with templates. Different templates for different customer types or invoice sizes.
- **Email tracking:** See if chase emails have been opened/read. Simple indicators next to each sent chase.
- **Comprehensive dashboard:** Payment statuses, customer behavior insights, aging analysis. The dashboard answers: "How much is owed? Who owes it? How overdue is it?"
- **Pause/resume per invoice or customer:** Granular control without disrupting other chases.
- **SMS + email channels:** Multi-channel chasing.
- **Payment portal (Chaser Pay):** Embedded payment links in chase emails. Clients can pay directly from the email.

#### Dashboard Hierarchy

1. **Overview:** Total outstanding, overdue amount, average DSO (Days Sales Outstanding)
2. **Invoice aging:** Grouped by 30/60/90/120+ days
3. **Per-customer view:** All invoices for a customer with chase history
4. **Activity log:** What was sent, when, was it opened

#### What Works for chase.md

- **Aging buckets** → translate to urgency levels (7 days overdue → 30 days → 60 days → escalation)
- **Sync with practice management software** → chase.md should pull client/job data from Xero Practice Manager, AccountancyManager, etc.
- **Pause/resume controls** → essential for when a client communicates they need more time
- **"Was it opened?" tracking** → simple but powerful — helps practitioners decide next action
- **Payment portal parallel** → chase.md needs a "document submission portal" equivalent

---

### 6. Customer.io

**What they do:** Marketing automation with visual workflow builder.

#### Key UX Patterns

- **Open canvas workflow builder:** The standout feature. An infinite canvas where you drag-and-drop message actions, delays, conditions, and branches. Described by their team as designed to be:
  - **Approachable:** Simple automations feel simple
  - **Unambiguous:** Everything you can do is immediately apparent — no hidden menus
  - **Intuitive:** Matches the customer's mental model (flowchart/whiteboard)
- **Evolution story:** Customer.io started with a linear step list (like a numbered sequence). Users had to mentally translate their flowchart thinking into a flat list. The redesign moved to a visual canvas because *that's how people already think about workflows* — as flow diagrams on whiteboards.
- **Sticky notes on canvas:** Collaboration feature — leave notes for teammates explaining why a branch exists or what a message does.
- **Progressive disclosure in nodes:** Click a node to expand its settings. The canvas shows the high-level flow; details are one click deep.
- **Drag-and-drop reordering:** Move steps by dragging or using a "Move" button with drop targets.

#### Key Insight from Customer.io's Design Philosophy

> "We don't want people thinking about how our builder works. The tool should free them up to think about their goals, strategy, and content."

This is the north star for chase.md's sequence builder. The tool should disappear — practitioners should think about *what they want to say to the client*, not *how to configure the software*.

#### What Works for chase.md

- **Visual canvas for complex sequences** — but chase.md sequences are simpler than marketing automation, so a **vertical timeline** (like Lemlist) is more appropriate than a full canvas
- **Mental model alignment** — practitioners think in terms of "first I email, then I wait, then I call" — the UI should mirror this exactly
- **Sticky notes / annotations** — let practitioners add context ("Client said they'd send by Friday") to chase sequences

---

### 7. Linear

**What they do:** Project management / issue tracking. Not a chase tool — included as a benchmark for clean SaaS UI.

#### Key UX Patterns

- **Keyboard-first design:** Everything has a keyboard shortcut. Power users fly through the interface. Cmd+K opens a command palette for any action.
- **Information density without clutter:** Lists show exactly the right amount of info per row — title, status, assignee, priority — with no wasted space. Dense but scannable.
- **Status at a glance:** Color-coded status indicators (tiny circles: gray for backlog, yellow for in progress, green for done, red for cancelled). Instantly readable without labels.
- **Dark mode with high contrast:** The "Linear look" — dark background, crisp typography, minimal color palette with strategic accent colors.
- **Smooth transitions:** Every state change animates subtly. Items slide, expand, fade. Makes the app feel responsive and alive.
- **Progressive disclosure:** The sidebar shows the list. Clicking opens a detail panel. Everything stays in context — no full page navigations for simple edits.
- **Cycles/Sprints visualization:** Clean progress bars showing sprint completion. Simple but motivating.
- **Minimal onboarding:** The UI is self-explanatory enough that onboarding is minimal. A few tooltips, an empty-state that guides first action.

#### What Works for chase.md

- **Keyboard shortcuts** — practitioners doing bulk work need speed
- **Dense, scannable lists** — client list should show name, status indicator, items outstanding, days overdue, last contact — all in one row
- **Color-coded status dots** — the fastest way to communicate state
- **Command palette (Cmd+K)** — "Search clients, jump to campaigns, create new chase"
- **Smooth micro-animations** — tiny investment, huge perceived quality boost
- **Dark mode option** — modern expectation for professional tools
- **Empty states that guide action** — first-time user lands on dashboard, sees "Create your first chase campaign →"

---

## Synthesis: Recommendations for chase.md

### Campaign Creation Flow

Based on analysis of all seven tools, here's the recommended flow:

```
┌─────────────────────────────────────────────────────┐
│  Step 1: WHO                                        │
│  Select clients (search/filter/bulk select)         │
│  or import from practice management software        │
├─────────────────────────────────────────────────────┤
│  Step 2: WHAT                                       │
│  What do you need? (template or custom)             │
│  e.g., "2025 Tax Return Documents"                  │
│  Checklist of specific items needed per client      │
├─────────────────────────────────────────────────────┤
│  Step 3: WHEN                                       │
│  Deadline + chase schedule                          │
│  Visual timeline: Email → Wait 3d → Email →         │
│  Wait 5d → SMS → Wait 7d → Phone Task → Letter     │
│  (Drag to reorder, click to edit each step)         │
├─────────────────────────────────────────────────────┤
│  Step 4: REVIEW & LAUNCH                            │
│  Summary: X clients, Y items, Z steps, deadline     │
│  Preview first email                                │
│  [Launch Campaign]                                  │
└─────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **Wizard, not form.** Each step is a full screen (like Instantly). Reduces cognitive load.
- **Templates first.** Most chases are repetitive (tax season, year-end, quarterly VAT). Start with template selection, allow customization.
- **Visual timeline for sequence** (like Lemlist). Vertical list of steps with channel icons, delay indicators, and message previews.
- **AI-assisted message generation** (like Lemlist). "Describe what you need" → generates personalized chase emails. Practitioners edit, not write from scratch.
- **Escalation is the differentiator.** The timeline should visually escalate — color intensifies, icons get more urgent (envelope → phone → warning triangle → letter).

### Practice Dashboard

The dashboard should answer three questions in 3 seconds:

```
┌─────────────────────────────────────────────────────┐
│                  PRACTICE DASHBOARD                  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │    42     │  │    12    │  │     5    │          │
│  │Outstanding│  │ Overdue  │  │ Critical │          │
│  │  Clients  │  │ (>14 days│  │ (>30 days│          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                      │
│  ─── Needs Attention ───────────────────────        │
│  🔴 Smith & Co — Tax return — 45 days overdue      │
│  🔴 Jones Ltd — VAT docs — 32 days overdue         │
│  🟡 ABC Corp — Payroll info — 18 days overdue      │
│  🟡 Davis Family — Accounts — 15 days overdue      │
│                                                      │
│  ─── Recent Activity ───────────────────────        │
│  ✅ Green Inc submitted 3/4 items (2 min ago)       │
│  📧 Chase email opened by Taylor Ltd (1 hr ago)    │
│  📞 Phone task due: Williams & Sons (today)         │
│                                                      │
│  ─── Upcoming Deadlines ────────────────────        │
│  📅 31 Jan — Self Assessment (18 clients remain)    │
│  📅 07 Mar — Corporation Tax (6 clients remain)     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Hierarchy (what's shown first):**
1. **Aggregate numbers** — how many clients are outstanding, overdue, critical (like Chaser's aging buckets)
2. **Needs attention list** — sorted by urgency, not alphabetically. Red items first. (Linear's priority-first sorting)
3. **Recent activity** — what's happening right now. Submissions, opens, responses. (Instantly's Unibox concept)
4. **Upcoming deadlines** — compliance deadlines with remaining client count

**What's buried (accessible but not front-page):**
- Campaign configuration/settings
- Historical/completed chases
- Detailed analytics and reports
- Account/billing settings

### Client List / Status View

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Search clients...                    [Filter ▾] [Sort ▾]   │
│                                                                  │
│  ● Smith & Co        Tax Return 2025    3/8 items    45d  🔴   │
│  ● Jones Ltd         VAT Q4             0/4 items    32d  🔴   │
│  ● ABC Corporation   Payroll            5/6 items    18d  🟡   │
│  ● Davis Family      Year-End           2/10 items   15d  🟡   │
│  ● Taylor Ltd        Tax Return 2025    7/8 items     3d  🟢   │
│  ● Green Inc         Onboarding         4/4 items     —   ✅   │
│                                                                  │
│  Legend: 🔴 Critical  🟡 Overdue  🟢 Active  ✅ Complete        │
└─────────────────────────────────────────────────────────────────┘
```

**Each row shows (like Linear's dense lists):**
- **Status dot** — colored indicator (red/yellow/green/check)
- **Client name** — primary identifier
- **Campaign/request name** — what you're chasing for
- **Progress** — X/Y items submitted (with mini progress bar)
- **Days overdue** — simple number, immediately scannable
- **Escalation level indicator** — which stage of the chase sequence they're at

**Click to expand** (progressive disclosure like Linear):
- Full item checklist with per-item status
- Chase history timeline (what was sent, when, was it opened)
- Notes and annotations
- Quick actions: Send reminder now, Pause chase, Mark complete, Escalate

### Escalation Visualization

Escalation should be **viscerally obvious** without reading labels:

```
Chase Sequence Timeline (per client):
─────────────────────────────────────

  📧 Email 1 (Friendly)          ✅ Sent Jan 5 — Opened
       │ 3 days
  📧 Email 2 (Follow-up)         ✅ Sent Jan 8 — Opened  
       │ 5 days
  📧 Email 3 (Urgent)            ✅ Sent Jan 13 — Not opened
       │ 7 days
  📱 SMS Reminder                 ✅ Sent Jan 20
       │ 5 days
  📞 Phone Call Task              ⬜ Due Jan 25        ← YOU ARE HERE
       │ 7 days
  ✉️  Formal Letter               ⬜ Scheduled Feb 1
       │ 14 days  
  ⚠️  Partner Escalation          ⬜ Scheduled Feb 15
```

**Visual escalation cues:**
- **Color gradient:** Steps progress from blue (friendly) → yellow (nudge) → orange (urgent) → red (critical)
- **Icon progression:** Envelope → Phone → Warning → Exclamation
- **"You are here" marker:** Clear indication of where the client is in the sequence
- **Sent status:** Checkmarks for completed steps, open circles for upcoming
- **Engagement indicators:** "Opened" / "Not opened" / "Clicked" on each step (like Chaser)

### Client Portal (What the Client Sees)

Borrowing heavily from Content Snare:

```
┌─────────────────────────────────────────────────────┐
│  [Your Practice Logo]                                │
│                                                      │
│  Hi Sarah, we need the following for your            │
│  2025 Tax Return:                                    │
│                                                      │
│  Progress: ████████░░░░░░░░ 4 of 8 items            │
│  Due: 31 January 2026                                │
│                                                      │
│  ─── Income ──────────────────────────────          │
│  ✅ P60 from employer                                │
│  ✅ Bank interest certificate                        │
│  ⬜ Rental income summary               [Upload]    │
│  ⬜ Dividend vouchers                   [Upload]    │
│                                                      │
│  ─── Expenses ────────────────────────────          │
│  ✅ Business mileage log                             │
│  ✅ Home office costs                                │
│  ⬜ Professional subscriptions          [Upload]    │
│  ⬜ Charitable donations receipts       [Upload]    │
│                                                      │
│  💬 Have a question? Ask here...                     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Critical UX decisions:**
- **No login required** — magic link access (like Content Snare)
- **Auto-save everything** — clients can leave and return
- **Progress bar** — psychological motivation to complete
- **Section grouping** — organized by category, not a flat list
- **Inline questions** — client asks a question right next to the item, not via email
- **Mobile-first** — clients will open this on their phone from the chase email
- **Branded** — practice logo, colors. Feels professional, not generic.

---

## Quick Wins

These are high-impact, relatively low-effort features that will make chase.md feel premium from day one:

### 1. Color-Coded Status Dots (Linear pattern)
Single most effective visual shortcut. Red/yellow/green dots next to every client, every item, every campaign. Instantly scannable.

### 2. Keyboard Shortcuts + Command Palette
`Cmd+K` to search anything. `N` to create new chase. `E` to edit. Power users will love this. Implementation: ~2 days with a library like cmdk.

### 3. Empty States That Guide
First-time user sees: "No active chases yet. **Create your first chase →**" with an illustration. Not a blank table. Sets the tone.

### 4. Email Open Tracking Indicators
Tiny eye icon next to sent emails: gray (not opened), blue (opened). Simple, but practitioners *love* knowing if the client even saw the email.

### 5. Micro-Animations
- Status changes animate (dot color transitions smoothly)
- Items slide when reordered
- Progress bars fill with a satisfying animation
- Checkmarks appear with a subtle bounce

### 6. Smart Defaults
- Default chase schedule pre-populated (Email → 3d → Email → 5d → Email → 7d → SMS → Phone)
- Default email templates pre-written for each escalation level
- Default deadline suggestions based on known tax deadlines (UK-specific)

### 7. "Last Active" Indicator
Show when the client last opened their portal or interacted. "Last seen 3 days ago" vs "Never opened portal" tells the practitioner everything about what to do next.

### 8. Batch Actions
Select multiple clients → Apply chase template, send reminder now, pause, escalate. Practitioners manage hundreds of clients — bulk operations are essential.

### 9. Dark Mode
Modern expectation. Also signals "this is a tool for professionals, not a government form."

### 10. Satisfying Completion States
When a client submits everything: confetti animation (subtle), green checkmark, "All items received! 🎉". Make the happy path feel good.

---

## Summary: The chase.md UX North Star

> **"The tool should disappear. Practitioners should think about their clients, not the software."**
> — Paraphrased from Customer.io's design philosophy

chase.md sits at the intersection of:
- **Content Snare's** document collection UX (client portal, progress tracking, auto-save)
- **Chaser's** automated chasing intelligence (escalation schedules, open tracking, aging buckets)
- **Lemlist's** visual sequence builder (timeline with channel icons, drag-to-reorder)
- **Linear's** information density and polish (status dots, keyboard shortcuts, smooth animations)

The competitive advantage is in the **escalation engine** — no existing tool does intelligent, multi-channel, progressively-urgent chasing for professional services. Content Snare does collection. Chaser does invoice chasing. Neither combines document collection + intelligent chasing + practice-wide visibility + deadline awareness.

Build that, make it look like Linear, and accountants will never go back to "Hi Sarah, just following up on my previous email..."
