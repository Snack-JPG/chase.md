# Xero Integration — Technical Specification

**Version:** 1.0  
**Date:** 17 February 2026  
**Status:** Draft  

---

## Overview

Integrate chase.md with Xero to:
1. Import client/contact lists from Xero
2. Push uploaded documents back INTO Xero Files (associated with contacts)
3. (Phase 2) Read job statuses from Xero Practice Manager to auto-detect document needs

---

## OAuth 2.0 Flow

```
┌──────────┐     ┌──────────────┐     ┌────────────┐
│  Browser  │     │  chase.md    │     │   Xero     │
│  (Admin)  │     │  (Next.js)   │     │   OAuth    │
└────┬─────┘     └──────┬───────┘     └─────┬──────┘
     │                   │                    │
     │  Click "Connect   │                    │
     │  Xero" button     │                    │
     │──────────────────>│                    │
     │                   │                    │
     │                   │  Generate state,   │
     │                   │  store in session   │
     │                   │                    │
     │  302 Redirect     │                    │
     │<──────────────────│                    │
     │                   │                    │
     │  GET /identity/connect/authorize       │
     │  ?client_id=X                          │
     │  &redirect_uri=.../callback            │
     │  &scope=openid+accounting.contacts...  │
     │  &state=random123                      │
     │────────────────────────────────────────>│
     │                   │                    │
     │  User consents,   │                    │
     │  selects org(s)   │                    │
     │                   │                    │
     │  302 → /callback?code=abc&state=random123
     │<────────────────────────────────────────│
     │                   │                    │
     │──────────────────>│                    │
     │                   │                    │
     │                   │  POST /identity/connect/token
     │                   │  {code, client_id, client_secret}
     │                   │───────────────────>│
     │                   │                    │
     │                   │  {access_token, refresh_token,
     │                   │   id_token, expires_in: 1800}
     │                   │<───────────────────│
     │                   │                    │
     │                   │  GET /connections   │
     │                   │  (get tenant IDs)   │
     │                   │───────────────────>│
     │                   │                    │
     │                   │  [{tenantId, tenantName}]
     │                   │<───────────────────│
     │                   │                    │
     │                   │  Store encrypted    │
     │                   │  tokens + tenantId  │
     │                   │  in DB              │
     │                   │                    │
     │  Redirect to      │                    │
     │  /settings?       │                    │
     │  xero=connected   │                    │
     │<──────────────────│                    │
```

### Scopes (MVP)

```
openid profile email
accounting.contacts.read
accounting.settings.read
files
offline_access
```

### Token Refresh

- Access token expires in **30 minutes**
- Refresh token expires in **60 days**
- Background cron refreshes tokens every **25 minutes** for active connections
- If refresh fails, mark connection as `expired` and alert practice admin

---

## API Endpoints (chase.md)

### Integration Management

```
POST   /api/integrations/xero/connect      → Initiate OAuth flow
GET    /api/integrations/xero/callback      → OAuth callback
POST   /api/integrations/xero/disconnect    → Revoke tokens, remove connection
GET    /api/integrations/xero/status        → Connection health check
POST   /api/integrations/xero/sync          → Trigger manual sync
```

### tRPC Procedures (preferred)

```typescript
// Router: integrations.xero
xero.getConnection        // Get current connection status
xero.connect              // Generate OAuth URL  
xero.callback             // Handle OAuth callback
xero.disconnect           // Disconnect Xero
xero.triggerSync          // Manual sync
xero.getSyncHistory       // Recent sync logs
xero.getImportPreview     // Preview contacts before import
xero.importContacts       // Import selected contacts
xero.updateSettings       // Update sync preferences
```

---

## Schema Changes

### New: `xero_connections`

```typescript
export const xeroConnections = pgTable("xero_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  
  xeroTenantId: varchar("xero_tenant_id", { length: 255 }).notNull(),
  xeroOrgName: varchar("xero_org_name", { length: 255 }),
  
  // Encrypted with AES-256-GCM using per-practice key
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
  tokenLastRefreshedAt: timestamp("token_last_refreshed_at", { withTimezone: true }),
  scopes: jsonb("scopes").default([]),
  
  status: varchar("status", { length: 20 }).default("active").notNull(),
  // active | token_expired | disconnected | error
  
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncContactCount: integer("last_sync_contact_count"),
  lastError: text("last_error"),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
  consecutiveErrors: integer("consecutive_errors").default(0),
  
  // Settings
  autoSyncContacts: boolean("auto_sync_contacts").default(true),
  pushDocumentsToXero: boolean("push_documents_to_xero").default(true),
  xeroFolderId: varchar("xero_folder_id", { length: 255 }),
  createYearFolders: boolean("create_year_folders").default(false),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("xero_connections_practice_idx").on(t.practiceId),
]);
```

### New: `xero_contact_mappings`

```typescript
export const xeroContactMappings = pgTable("xero_contact_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  xeroConnectionId: uuid("xero_connection_id").notNull().references(() => xeroConnections.id),
  
  xeroContactId: varchar("xero_contact_id", { length: 255 }).notNull(),
  xeroContactName: varchar("xero_contact_name", { length: 255 }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("xero_mapping_connection_contact_idx").on(t.xeroConnectionId, t.xeroContactId),
  uniqueIndex("xero_mapping_connection_client_idx").on(t.xeroConnectionId, t.clientId),
  index("xero_mapping_practice_idx").on(t.practiceId),
]);
```

### New: `xero_file_pushes`

```typescript
export const xeroFilePushes = pgTable("xero_file_pushes", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  xeroConnectionId: uuid("xero_connection_id").notNull().references(() => xeroConnections.id),
  documentId: uuid("document_id").notNull().references(() => clientDocuments.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  
  xeroFileId: varchar("xero_file_id", { length: 255 }),
  xeroFolderId: varchar("xero_folder_id", { length: 255 }),
  xeroAssociationObjectId: varchar("xero_association_object_id", { length: 255 }),
  
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  // pending | uploading | uploaded | associated | failed
  error: text("error"),
  retryCount: integer("retry_count").default(0),
  
  pushedAt: timestamp("pushed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("xero_pushes_practice_idx").on(t.practiceId),
  index("xero_pushes_document_idx").on(t.documentId),
  index("xero_pushes_status_idx").on(t.status),
]);
```

### Modifications to Existing Tables

```typescript
// Add to clients table:
xeroContactId: varchar("xero_contact_id", { length: 255 }),

// Add to client_documents table:
xeroFileId: varchar("xero_file_id", { length: 255 }),
xeroPushedAt: timestamp("xero_pushed_at", { withTimezone: true }),
```

---

## Xero API Calls Used

### MVP

| Xero Endpoint | Method | Purpose |
|---------------|--------|---------|
| `/identity/connect/authorize` | GET | OAuth consent |
| `/identity/connect/token` | POST | Exchange code / refresh token |
| `/connections` | GET | List connected tenants |
| `/connections/{id}` | DELETE | Disconnect tenant |
| `/api.xro/2.0/Organisation` | GET | Get org details |
| `/api.xro/2.0/Contacts` | GET | List contacts (paginated) |
| `/api.xro/2.0/Contacts/{id}` | GET | Single contact detail |
| `/files.xro/1.0/Folders` | GET | List folders |
| `/files.xro/1.0/Folders` | POST | Create folder |
| `/files.xro/1.0/Files` | POST | Upload file |
| `/files.xro/1.0/Associations` | POST | Associate file with contact |

### Phase 2 (XPM)

| Xero Endpoint | Method | Purpose |
|---------------|--------|---------|
| `/practicemanager/3.0/clients` | GET | XPM client list |
| `/practicemanager/3.0/jobs` | GET | Job list with statuses |
| `/practicemanager/3.0/jobs/{id}` | GET | Job detail + tasks |
| `/practicemanager/3.0/jobstatus` | GET | Available job statuses |

---

## Key Services

### `XeroAuthService`

```typescript
class XeroAuthService {
  generateAuthUrl(practiceId: string): Promise<string>
  handleCallback(code: string, state: string): Promise<XeroConnection>
  refreshToken(connectionId: string): Promise<void>
  disconnect(connectionId: string): Promise<void>
  getValidClient(practiceId: string): Promise<XeroClient> // auto-refreshes
}
```

### `XeroSyncService`

```typescript
class XeroSyncService {
  syncContacts(practiceId: string): Promise<SyncResult>
  importContacts(practiceId: string, contactIds: string[]): Promise<ImportResult>
  getImportPreview(practiceId: string): Promise<ContactPreview[]>
  syncOrganisation(practiceId: string): Promise<void>
}
```

### `XeroFileService`

```typescript
class XeroFileService {
  pushDocument(documentId: string): Promise<PushResult>
  ensureFolder(practiceId: string, folderName: string): Promise<string>
  associateFile(xeroFileId: string, xeroContactId: string): Promise<void>
  retryFailedPushes(practiceId: string): Promise<void>
}
```

---

## Background Jobs

| Job | Frequency | Description |
|-----|-----------|-------------|
| `xero-token-refresh` | Every 25 min | Refresh tokens for active connections |
| `xero-contact-sync` | Every 15 min | Incremental contact sync (modified-since) |
| `xero-file-push` | On document accept | Push accepted documents to Xero |
| `xero-file-retry` | Every 5 min | Retry failed file pushes (max 3 retries) |
| `xero-health-check` | Every hour | Verify connections are healthy |

---

## MVP Scope — Build Order

### Week 1: OAuth + Connection
- [ ] `xero_connections` table + migration
- [ ] `XeroAuthService` — connect, callback, disconnect
- [ ] `/api/integrations/xero/connect` + `/callback` routes
- [ ] Settings page UI — Connect Xero button
- [ ] Token encryption (AES-256-GCM)
- [ ] Connection status display

### Week 2: Client Import
- [ ] `xero_contact_mappings` table + migration
- [ ] `XeroSyncService` — fetch contacts, map to clients
- [ ] Import preview UI (show contacts, detect duplicates)
- [ ] Bulk import with progress indicator
- [ ] Add `xeroContactId` to clients table
- [ ] Handle contact groups as tags

### Week 3-4: Document Push to Xero
- [ ] `xero_file_pushes` table + migration
- [ ] `XeroFileService` — upload, create folders, associate
- [ ] Trigger on document status → `accepted`
- [ ] Create "chase.md" folder in Xero on first push
- [ ] File naming convention: `{ClientName}_{DocType}_{TaxYear}.pdf`
- [ ] Error handling + retry logic
- [ ] Push status in document detail view

### Week 5: Background Jobs + Polish
- [ ] Token refresh cron job
- [ ] Incremental contact sync job
- [ ] Failed push retry job
- [ ] Connection health monitoring
- [ ] Disconnect flow (revoke tokens, clean up)
- [ ] Rate limit handling (429 backoff)

### Week 6: Testing + Edge Cases
- [ ] Integration tests with Xero sandbox
- [ ] Token expiry scenarios
- [ ] Rate limiting scenarios
- [ ] Disconnect/reconnect flows
- [ ] Large contact list pagination
- [ ] Error states in UI

---

## Security Considerations

1. **Token encryption:** AES-256-GCM with practice-specific keys derived from a master key
2. **Token storage:** Never log tokens; encrypted at rest in DB
3. **Scope minimization:** Request only scopes needed for current features
4. **Token refresh:** Refresh proactively (before expiry), not reactively
5. **Disconnect cleanup:** Revoke tokens at Xero, delete local encrypted copies
6. **Rate limiting:** Respect Xero's 60/min per-tenant limit; queue and backoff
7. **File validation:** Validate files before pushing (size, type, virus scan status)

---

## Dependencies

```json
{
  "xero-node": "^7.x"
}
```

No other new dependencies needed. The `xero-node` SDK handles all API communication, token management helpers, and type definitions.

---

## Estimated Effort

| Component | Effort |
|-----------|--------|
| OAuth flow + token management | 5 days |
| Client import + mapping | 5 days |
| Document push to Xero Files | 7 days |
| Background jobs | 3 days |
| UI (settings, import preview, status) | 5 days |
| Testing + edge cases | 5 days |
| **Total MVP** | **~30 days (6 weeks)** |
| XPM integration (Phase 2) | 15 days |
| App Store certification (Phase 2) | 10 days |
