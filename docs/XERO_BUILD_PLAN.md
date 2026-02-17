# Xero Integration Build Plan

> 5 phases, each self-contained and deployable independently.
> Reference: [XERO_API_REFERENCE.md](./XERO_API_REFERENCE.md)

---

## Phase 1: OAuth Flow (Connect/Disconnect Xero)

**Goal:** Practice owners can connect their Xero org to chase.md and disconnect it.

### Schema Changes (`src/server/db/schema.ts`)

Add to `practices` table:
```sql
xero_client_id        varchar(255)        -- from env, but stored per-practice if multi-app
xero_tenant_id        varchar(255)        -- the connected Xero org tenant ID
xero_connection_id    varchar(255)        -- for disconnect
xero_access_token     text                -- encrypted, 30min lifetime
xero_refresh_token    text                -- encrypted, 60-day lifetime  
xero_token_expires_at timestamp(tz)       -- when access_token expires
xero_connected_at     timestamp(tz)       -- when they connected
xero_org_name         varchar(255)        -- display name from Xero
xero_last_sync_at     timestamp(tz)       -- last contact sync
```

**Alternative (cleaner):** New `xero_connections` table:
```typescript
export const xeroConnections = pgTable("xero_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id).unique(),
  tenantId: varchar("tenant_id", { length: 255 }).notNull(),
  connectionId: varchar("connection_id", { length: 255 }).notNull(),
  orgName: varchar("org_name", { length: 255 }),
  accessToken: text("access_token").notNull(),      // encrypt at app layer
  refreshToken: text("refresh_token").notNull(),     // encrypt at app layer
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
  scopes: jsonb("scopes").default([]),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow().notNull(),
  disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
});
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/xero.ts` | XeroClient singleton, token management, helper functions |
| `src/app/api/xero/connect/route.ts` | GET — redirects to Xero consent URL |
| `src/app/api/xero/callback/route.ts` | GET — handles OAuth callback, stores tokens |
| `src/app/api/xero/disconnect/route.ts` | POST — disconnects Xero, revokes tokens |
| `src/server/services/xero-token-manager.ts` | Token refresh logic, encryption helpers |

### Files to Modify

| File | Change |
|------|--------|
| `src/server/db/schema.ts` | Add `xeroConnections` table |
| `src/server/trpc/routers/practice.ts` | Add `getXeroStatus`, `disconnectXero` mutations |
| `src/app/(dashboard)/settings/page.tsx` | Add Xero connection UI (connect/disconnect button, status) |

### tRPC Routes

```typescript
// In practice.ts router
practice.getXeroConnection    // query — returns connection status + org name
practice.disconnectXero       // mutation — calls disconnect, clears tokens
```

### UI Components

- `src/components/xero-connect-button.tsx` — "Connect to Xero" / "Connected to [Org]" toggle
- Add to Settings page in an "Integrations" section

### Environment Variables

```env
XERO_CLIENT_ID=
XERO_CLIENT_SECRET=
XERO_REDIRECT_URI=https://app.chase.md/api/xero/callback
XERO_TOKEN_ENCRYPTION_KEY=  # 32-byte key for encrypting stored tokens
```

### Test Plan

1. ✅ Click "Connect to Xero" → redirects to Xero consent screen
2. ✅ Authorize → callback stores tokens, shows connected status
3. ✅ Token refresh works automatically before API calls
4. ✅ Disconnect button revokes token and clears connection
5. ✅ Re-connecting after disconnect works
6. ✅ Multiple practices can connect different Xero orgs
7. ✅ Error handling: user cancels auth, invalid state, expired code

---

## Phase 2: Contact Sync (Import Clients from Xero)

**Goal:** Import Xero contacts as chase.md clients, keep them in sync.

### Schema Changes

Add to `clients` table:
```typescript
xeroContactId: varchar("xero_contact_id", { length: 255 }),  // Xero ContactID UUID
xeroSyncedAt: timestamp("xero_synced_at", { withTimezone: true }),
xeroSource: boolean("xero_source").default(false),  // true = originally from Xero
```

Add unique index:
```typescript
uniqueIndex("clients_xero_contact_idx").on(t.practiceId, t.xeroContactId)
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/server/services/xero-contact-sync.ts` | Core sync logic: fetch contacts, map to clients, upsert |
| `src/app/api/cron/xero-sync/route.ts` | Cron endpoint for daily full sync |
| `src/components/xero-import-dialog.tsx` | UI for initial import — shows preview, lets user select |
| `src/components/xero-sync-status.tsx` | Shows last sync time, errors, manual sync button |

### Files to Modify

| File | Change |
|------|--------|
| `src/server/db/schema.ts` | Add xero fields to `clients` |
| `src/server/trpc/routers/clients.ts` | Add `syncFromXero`, `importXeroContacts` mutations |
| `src/app/(dashboard)/clients/page.tsx` | Add "Import from Xero" button, sync status indicator |
| `src/lib/xero.ts` | Add `getContacts()`, `getContact()` helper functions |

### tRPC Routes

```typescript
clients.syncFromXero          // mutation — triggers incremental sync
clients.importXeroContacts    // mutation — initial bulk import with preview
clients.getXeroSyncStatus     // query — last sync time, pending changes
```

### Sync Logic (`xero-contact-sync.ts`)

```typescript
// Core mapping function
function mapXeroContactToClient(contact: XeroContact, practiceId: string): Partial<Client> {
  return {
    practiceId,
    xeroContactId: contact.ContactID,
    firstName: contact.FirstName || contact.Name?.split(' ')[0] || '',
    lastName: contact.LastName || contact.Name?.split(' ').slice(1).join(' ') || '',
    companyName: contact.Name,
    email: contact.EmailAddress,
    phone: contact.Phones?.find(p => p.PhoneType === 'DEFAULT')?.PhoneNumber,
    whatsappPhone: contact.Phones?.find(p => p.PhoneType === 'MOBILE')?.PhoneNumber,
    clientType: 'limited_company', // default, user can change
    xeroSyncedAt: new Date(),
    xeroSource: true,
  };
}

// Sync strategy:
// 1. Use If-Modified-Since for incremental (daily cron)
// 2. Filter: IsCustomer==true (skip suppliers)
// 3. Upsert by (practiceId, xeroContactId)
// 4. Never delete — mark as archived if contact archived in Xero
// 5. Don't overwrite user edits — track which fields were manually changed
```

### Test Plan

1. ✅ "Import from Xero" shows list of Xero contacts with preview
2. ✅ Selecting contacts creates clients with correct field mapping
3. ✅ Duplicate import doesn't create duplicates (upsert by xeroContactId)
4. ✅ Incremental sync only fetches recently modified contacts
5. ✅ Phone number mapping: DEFAULT → phone, MOBILE → whatsappPhone
6. ✅ Archived contacts in Xero → soft-deleted in chase.md
7. ✅ Manual edits to client fields are preserved on re-sync
8. ✅ Rate limit handling (60/min) with retry logic
9. ✅ Pagination works for practices with 1000+ contacts

---

## Phase 3: File Push (Upload Documents Back to Xero)

**Goal:** When a client uploads documents via portal, push them to Xero Files and associate with their contact.

### Schema Changes

Add to `documents` table (assuming it exists):
```typescript
xeroFileId: varchar("xero_file_id", { length: 255 }),
xeroPushedAt: timestamp("xero_pushed_at", { withTimezone: true }),
xeroPushError: text("xero_push_error"),
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/server/services/xero-file-pusher.ts` | Upload file to Xero, create association |
| `src/server/services/xero-folder-manager.ts` | Ensure chase.md folder exists in Xero, manage structure |
| `src/components/xero-push-status.tsx` | Shows push status per document (pending/pushed/error) |

### Files to Modify

| File | Change |
|------|--------|
| `src/server/db/schema.ts` | Add xero fields to documents table |
| `src/server/services/document-classifier.ts` | After classification, trigger Xero push |
| `src/server/trpc/routers/documents.ts` | Add `pushToXero`, `retryXeroPush` mutations |
| `src/app/api/portal/upload/route.ts` | After upload success, queue Xero push |
| `src/lib/xero.ts` | Add file upload and association helpers |

### tRPC Routes

```typescript
documents.pushToXero          // mutation — manually push a document to Xero
documents.retryXeroPush       // mutation — retry failed push
documents.getXeroPushStatus   // query — status of Xero push for a document
```

### File Push Flow

```
1. Client uploads document via portal
2. Document stored in R2 (existing flow)
3. Document classified (existing flow)
4. IF practice has Xero connected AND client has xeroContactId:
   a. Ensure "Chase.md" folder exists in Xero (create if not, cache folderId)
   b. Download file from R2
   c. Upload to Xero Files API → get fileId
   d. Create association: fileId → contactId (ObjectGroup: Contact)
   e. Store xeroFileId on document record
5. On failure: store error, allow manual retry
```

### Folder Strategy

- Create a single "Chase.md Uploads" folder in Xero per connected org
- Cache the folderId in `xeroConnections` table
- Sub-organization by year/month via file naming: `{ClientName}/{YYYY-MM}/{filename}`

### Test Plan

1. ✅ Document uploaded via portal → appears in Xero Files under correct folder
2. ✅ File associated with correct Xero contact
3. ✅ File visible when viewing contact in Xero
4. ✅ Push failure stored, manual retry works
5. ✅ Large files (up to 10MB) handled correctly
6. ✅ Unsupported file types rejected gracefully
7. ✅ Practice without Xero connection → push silently skipped
8. ✅ Client without xeroContactId → push skipped with warning
9. ✅ Rate limiting handled (don't overwhelm on bulk uploads)

---

## Phase 4: XPM Job Status (Auto-Detect Who Needs Documents)

**Goal:** For practices using XPM, detect jobs in "Awaiting Information" status and auto-trigger chase campaigns.

### Schema Changes

New table:
```typescript
export const xeroJobs = pgTable("xero_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  xeroJobId: varchar("xero_job_id", { length: 255 }).notNull(),
  clientId: uuid("client_id").references(() => clients.id),
  xeroClientId: varchar("xero_client_id", { length: 255 }),
  name: varchar("name", { length: 255 }),
  state: varchar("state", { length: 50 }),          // Planned, InProgress, Completed
  statusName: varchar("status_name", { length: 255 }), // Custom status text
  dueDate: timestamp("due_date", { withTimezone: true }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Add to xeroConnections:
xpmEnabled: boolean("xpm_enabled").default(false),
xpmStatusMappings: jsonb("xpm_status_mappings").default({}),  // { "Awaiting Information": "needs_docs" }
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/server/services/xero-xpm-sync.ts` | Fetch XPM jobs, parse XML, detect awaiting status |
| `src/app/api/cron/xpm-sync/route.ts` | Cron for polling XPM job statuses |
| `src/components/xpm-status-mapper.tsx` | UI to map XPM statuses → chase.md actions |
| `src/components/xpm-job-list.tsx` | Dashboard widget showing jobs awaiting info |

### Files to Modify

| File | Change |
|------|--------|
| `src/server/db/schema.ts` | Add `xeroJobs` table, xpm fields to xeroConnections |
| `src/server/services/chase-engine.ts` | Check XPM status as trigger for auto-chase |
| `src/server/trpc/routers/practice.ts` | Add XPM settings, status mapping config |
| `src/app/(dashboard)/settings/page.tsx` | Add XPM configuration section |
| `src/app/(dashboard)/page.tsx` | Add "Jobs Awaiting Info" widget to dashboard |
| `src/lib/xero.ts` | Add XPM API helpers (with XML parsing) |

### tRPC Routes

```typescript
practice.getXpmStatuses         // query — list available XPM statuses for mapping
practice.updateXpmMappings      // mutation — save status→action mappings
practice.syncXpmJobs            // mutation — manual sync trigger
xeroJobs.list                   // query — list jobs with filters
xeroJobs.getAwaitingInfo        // query — jobs needing documents
```

### XPM Polling Strategy

```
Every 4 hours (or configurable):
1. Fetch all InProgress jobs from XPM
2. Parse XML response (use fast-xml-parser)
3. Match XPM client IDs to chase.md clients (via xeroContactId)
4. Upsert job records
5. For jobs whose status changed to a "needs docs" mapped status:
   a. Check if client already has an active chase campaign
   b. If not, create enrollment or flag for review
6. For jobs that moved OUT of "needs docs":
   a. Auto-complete any related chase campaign
```

### Dependencies

```
npm install fast-xml-parser   # for XPM XML responses
```

### Test Plan

1. ✅ XPM jobs fetched and displayed on dashboard
2. ✅ Status mapping UI works — user maps their custom statuses
3. ✅ "Awaiting Information" job triggers chase campaign suggestion
4. ✅ Job completion auto-resolves chase campaign
5. ✅ Practices without XPM → feature hidden/disabled gracefully
6. ✅ XML parsing handles edge cases (empty fields, special chars)
7. ✅ Client matching works (XPM client → Xero contact → chase.md client)
8. ✅ Polling doesn't exceed rate limits

---

## Phase 5: Webhooks (Real-Time Sync)

**Goal:** Real-time contact updates via Xero webhooks instead of polling.

### Schema Changes

Add to `xeroConnections`:
```typescript
webhookKey: text("webhook_key"),                    // for signature verification
webhookEnabled: boolean("webhook_enabled").default(false),
```

New table:
```typescript
export const xeroWebhookEvents = pgTable("xero_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id),
  tenantId: varchar("tenant_id", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),  // Create, Update
  eventCategory: varchar("event_category", { length: 50 }).notNull(), // CONTACT, INVOICE
  resourceId: varchar("resource_id", { length: 255 }).notNull(),
  resourceUrl: varchar("resource_url", { length: 500 }),
  eventDateUtc: timestamp("event_date_utc", { withTimezone: true }),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/webhooks/xero/route.ts` | Webhook receiver: verify signature, store events, process |
| `src/server/services/xero-webhook-processor.ts` | Process webhook events: fetch updated data, sync |

### Files to Modify

| File | Change |
|------|--------|
| `src/server/db/schema.ts` | Add webhook fields, events table |
| `src/server/services/xero-contact-sync.ts` | Add single-contact sync method (for webhook-triggered updates) |
| `src/lib/xero.ts` | Add webhook signature verification helper |
| `src/server/trpc/routers/practice.ts` | Add webhook status query |

### tRPC Routes

```typescript
practice.getWebhookStatus      // query — is webhook active, last event received
```

### Webhook Handler (`api/webhooks/xero/route.ts`)

```typescript
// 1. Verify HMAC-SHA256 signature
// 2. Handle Intent to Receive (empty events array)
// 3. For each event:
//    a. Find practice by tenantId
//    b. Store event in xero_webhook_events
//    c. If CONTACT event → trigger single-contact sync
//    d. If INVOICE event → could trigger status updates
// 4. Return 200 within 5 seconds (process async if needed)
```

### Setup Notes

⚠️ **Webhooks must be configured in Xero Developer Dashboard** — not via API.
- URL: `https://app.chase.md/api/webhooks/xero`
- Events: Contacts (Create, Update)
- Webhook key stored in `xeroConnections.webhookKey`

### Test Plan

1. ✅ Intent to Receive validation passes
2. ✅ Contact update in Xero → webhook received → client updated in chase.md
3. ✅ New contact created in Xero → webhook received → new client created
4. ✅ Invalid signature → 401 rejected
5. ✅ Duplicate events handled idempotently
6. ✅ Webhook responds within 5 seconds (async processing for heavy work)
7. ✅ Webhook failure logged, event stored for retry
8. ✅ Multiple tenants/practices handled correctly via tenantId lookup

---

## Implementation Order & Dependencies

```
Phase 1 (OAuth) ──→ Phase 2 (Contacts) ──→ Phase 3 (Files)
                         │                        
                         └──→ Phase 4 (XPM) ──→ Phase 5 (Webhooks)
```

- **Phase 1 is required first** — everything depends on auth
- **Phase 2 before 3** — file push needs client→contact mapping
- **Phase 4 is independent** of Phase 3, only needs Phase 2
- **Phase 5 enhances** Phase 2 (real-time instead of polling)

### Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: OAuth | 1 day | 🔴 Critical |
| Phase 2: Contact Sync | 1-2 days | 🔴 Critical |
| Phase 3: File Push | 1 day | 🟡 High |
| Phase 4: XPM Jobs | 2 days | 🟢 Medium (depends on XPM access) |
| Phase 5: Webhooks | 0.5 day | 🟢 Nice-to-have (polling works fine) |

### Key Dependencies

```
npm install xero-node          # Official SDK
npm install fast-xml-parser    # For XPM XML responses (Phase 4 only)
```

### Environment Variables (All Phases)

```env
# Phase 1
XERO_CLIENT_ID=
XERO_CLIENT_SECRET=
XERO_REDIRECT_URI=https://app.chase.md/api/xero/callback
XERO_TOKEN_ENCRYPTION_KEY=

# Phase 5
XERO_WEBHOOK_KEY=              # From Xero Developer Dashboard
```
