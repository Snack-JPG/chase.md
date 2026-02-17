# Xero Integration Spec — chase.md

## Status: ✅ Complete (All 5 Phases)

Built: 2026-02-17

---

## Phase 1: OAuth Flow (Connect/Disconnect Xero)
- `xeroConnections` table with token storage
- `/api/xero/connect` — redirects to Xero consent URL
- `/api/xero/callback` — handles OAuth callback, stores tokens
- `/api/xero/disconnect` — revokes tokens, clears connection
- Auto token refresh before expiry
- Settings UI with connect/disconnect button

## Phase 2: Contact Sync (Import Clients from Xero)
- `xeroContactId` field on `clients` table
- `syncContacts(practiceId)` — full paginated sync with rate limiting
- `syncAllPractices()` — cron-compatible batch sync
- Smart matching: xeroContactId → email → name
- Preserves manual edits (only fills empty fields)
- `/api/cron/xero-sync` — daily cron endpoint

## Phase 3: File Push (Upload Documents to Xero)
- `xeroFileId`, `xeroPushStatus`, `xeroPushError` on `clientDocuments`
- `pushDocumentToXero()` — uploads to Xero Files API + associates with contact
- Auto-creates "Chase.md Uploads" folder in Xero
- Push status tracking (pending/pushed/failed/skipped)
- Retry support for failed pushes

## Phase 4: XPM Job Status (Practice Manager Integration)
- `xpmJobs` table tracking job states and statuses
- `xpmEnabled` + `xpmStatusMappings` on `xeroConnections`
- XML parsing of XPM API responses
- Auto-enrollment: jobs in mapped "needs docs" status → chase campaigns
- Auto-completion when jobs move out of "needs docs"
- XPM status mapping UI in settings

## Phase 5: Webhooks (Real-Time Contact Sync)
- `xeroWebhookKey` on `xeroConnections`
- `/api/webhooks/xero` — POST endpoint with HMACSHA256 signature verification
- Intent to Receive validation for webhook setup
- `syncSingleContact(practiceId, xeroContactId)` — single contact fetch + upsert
- Handles CREATE and UPDATE contact events
- Maps tenantId to practice for multi-tenant support
- Settings UI: webhook URL display, key input, status indicator
- Webhook registration is manual via Xero Developer Dashboard (API doesn't support programmatic creation)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/xero.ts` | Client singleton, token refresh, webhook verification |
| `src/lib/xero-sync.ts` | Contact sync (full + single) |
| `src/lib/xero-files.ts` | File push to Xero |
| `src/lib/xero-xpm.ts` | XPM job sync + auto-enrollment |
| `src/app/api/xero/connect/route.ts` | OAuth initiation |
| `src/app/api/xero/callback/route.ts` | OAuth callback |
| `src/app/api/xero/disconnect/route.ts` | Disconnect |
| `src/app/api/webhooks/xero/route.ts` | Webhook receiver |
| `src/app/api/cron/xero-sync/route.ts` | Daily cron sync |
| `src/server/db/schema.ts` | All Xero-related tables/fields |
