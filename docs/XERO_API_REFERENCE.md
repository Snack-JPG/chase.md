# Xero API Reference for Chase.md

> Generated 2026-02-17 from Xero OpenAPI specs (v10.1.0) and xero-node SDK docs.
> This is a developer reference — zero guessing when building.

---

## Table of Contents

1. [OAuth 2.0 Authentication](#1-oauth-20-authentication)
2. [Contacts API](#2-contacts-api)
3. [Files API](#3-files-api)
4. [Xero Practice Manager (XPM) API](#4-xero-practice-manager-xpm-api)
5. [Webhooks](#5-webhooks)
6. [Rate Limits](#6-rate-limits)
7. [xero-node SDK](#7-xero-node-sdk)

---

## 1. OAuth 2.0 Authentication

### Endpoints

| Purpose | URL |
|---------|-----|
| Authorization | `https://login.xero.com/identity/connect/authorize` |
| Token Exchange | `https://identity.xero.com/connect/token` |
| Connections | `https://api.xero.com/connections` |
| Identity | `https://api.xero.com/api.xro/2.0/Organisation` |

### Authorization Code Flow

1. **Redirect user** to consent URL with params:
   - `response_type=code`
   - `client_id=YOUR_CLIENT_ID`
   - `redirect_uri=YOUR_REDIRECT_URI`
   - `scope=openid profile email accounting.contacts accounting.transactions files offline_access`
   - `state=RANDOM_STATE` (CSRF protection)

2. **Exchange code for tokens** — POST to token URL:
   ```
   POST https://identity.xero.com/connect/token
   Content-Type: application/x-www-form-urlencoded
   Authorization: Basic base64(client_id:client_secret)

   grant_type=authorization_code&code=CODE&redirect_uri=REDIRECT_URI
   ```

3. **Token Set Response:**
   ```json
   {
     "id_token": "xxx.yyy.zzz",
     "access_token": "xxx.yyy.zzz",
     "expires_in": 1800,
     "token_type": "Bearer",
     "refresh_token": "xxxxxxxxx",
     "scope": ["email", "profile", "openid", "accounting.contacts", "files", "offline_access"]
   }
   ```

### Token Lifetimes

| Token | Lifetime | Notes |
|-------|----------|-------|
| access_token | **30 minutes** (1800s) | JWT, must refresh before expiry |
| refresh_token | **60 days** | Single-use: each refresh returns a NEW refresh_token |
| id_token | 30 minutes | OpenID Connect identity token |

### Refresh Token Flow

```
POST https://identity.xero.com/connect/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=refresh_token&refresh_token=CURRENT_REFRESH_TOKEN
```

**⚠️ CRITICAL:** Each refresh returns a new refresh_token. You MUST store the new one. The old one is invalidated immediately. If you lose it, user must re-authorize.

### Scopes Needed for Chase.md

| Scope | Purpose |
|-------|---------|
| `openid profile email` | User identity (SSO) |
| `accounting.contacts` | Read/write contacts |
| `accounting.contacts.read` | Read-only contacts (alternative) |
| `files` | Read/write files |
| `files.read` | Read-only files (alternative) |
| `offline_access` | Get refresh tokens |
| `accounting.settings.read` | Read org settings (optional) |

### Multi-Tenant Architecture

After auth, call `GET https://api.xero.com/connections` to get authorized tenants:

```json
[
  {
    "id": "connection-uuid",
    "authEventId": "auth-event-uuid",
    "tenantId": "tenant-uuid-1",
    "tenantType": "ORGANISATION",
    "tenantName": "Demo Company (UK)",
    "createdDateUtc": "2020-01-01T00:00:00.000Z",
    "updatedDateUtc": "2020-01-01T00:00:00.000Z"
  }
]
```

**Key concept:** Each Xero organisation = separate tenant. Every API call requires `xero-tenant-id` header. For an accounting practice, each client org the practice has access to is a separate tenant.

### Required Headers for All API Calls

```
Authorization: Bearer ACCESS_TOKEN
xero-tenant-id: TENANT_UUID
Content-Type: application/json
Accept: application/json
```

---

## 2. Contacts API

**Base URL:** `https://api.xero.com/api.xro/2.0`
**Required scopes:** `accounting.contacts` or `accounting.contacts.read`

### GET /Contacts — List All Contacts

```
GET https://api.xero.com/api.xro/2.0/Contacts
```

**Headers:**
- `Authorization: Bearer ACCESS_TOKEN`
- `xero-tenant-id: TENANT_ID`
- `If-Modified-Since: datetime` (optional, for incremental sync)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `where` | string | Filter expression, e.g. `ContactStatus=="ACTIVE"` |
| `order` | string | Sort order, e.g. `Name ASC` |
| `page` | integer | Page number (100 contacts per page with line items) |
| `IDs` | string | Comma-separated ContactIDs to filter |
| `includeArchived` | boolean | Include archived contacts |
| `summaryOnly` | boolean | Return summary fields only (faster) |

**Response (200):**
```json
{
  "Id": "request-uuid",
  "Status": "OK",
  "ProviderName": "Your App Name",
  "DateTimeUTC": "/Date(1550793549392)/",
  "Contacts": [
    {
      "ContactID": "uuid",
      "ContactNumber": "string",
      "AccountNumber": "string",
      "ContactStatus": "ACTIVE",
      "Name": "Client Name Ltd",
      "FirstName": "John",
      "LastName": "Smith",
      "EmailAddress": "john@client.com",
      "Phones": [
        {
          "PhoneType": "DEFAULT",
          "PhoneNumber": "1234567890",
          "PhoneAreaCode": "020",
          "PhoneCountryCode": "44"
        },
        {
          "PhoneType": "MOBILE",
          "PhoneNumber": "...",
          "PhoneAreaCode": "",
          "PhoneCountryCode": ""
        }
      ],
      "Addresses": [
        {
          "AddressType": "STREET",
          "AddressLine1": "...",
          "City": "...",
          "Region": "...",
          "PostalCode": "...",
          "Country": "..."
        },
        {
          "AddressType": "POBOX",
          "AddressLine1": "..."
        }
      ],
      "ContactGroups": [
        {
          "ContactGroupID": "uuid",
          "Name": "Group Name"
        }
      ],
      "IsSupplier": false,
      "IsCustomer": true,
      "ContactPersons": [
        {
          "FirstName": "...",
          "LastName": "...",
          "EmailAddress": "...",
          "IncludeInEmails": true
        }
      ],
      "HasAttachments": false,
      "HasValidationErrors": false,
      "UpdatedDateUTC": "/Date(1550793549320+0000)/"
    }
  ]
}
```

**Key Fields for Chase.md:**

| Field | Type | Use |
|-------|------|-----|
| `ContactID` | uuid | Primary key — store this to link Xero contact to chase.md client |
| `Name` | string | Display name (company or individual) |
| `EmailAddress` | string | Primary email for chasing |
| `Phones` | array | Phone types: DEFAULT, DDI, MOBILE, FAX |
| `ContactStatus` | enum | ACTIVE, ARCHIVED, GDPRREQUEST |
| `IsCustomer` | bool | Filter for clients only |
| `ContactPersons` | array | Additional contacts within the company |
| `ContactGroups` | array | Useful for categorizing clients |
| `UpdatedDateUTC` | date | For incremental sync |

### GET /Contacts/{ContactID} — Single Contact

```
GET https://api.xero.com/api.xro/2.0/Contacts/{ContactID}
```

Returns same schema, single contact in array.

### Pagination

- **100 contacts per page** when using `page` parameter
- Pages are 1-indexed
- No page param = returns all contacts (but truncated without line items)
- Use `summaryOnly=true` for faster listing

### Filtering (where clause)

```
where=ContactStatus=="ACTIVE"
where=IsCustomer==true
where=Name.Contains("Smith")
where=UpdatedDateUTC>DateTime(2024,01,01)
where=ContactStatus=="ACTIVE" AND IsCustomer==true
```

### Gotchas

- **Phone types:** Each contact always has 4 phone entries (DEFAULT, DDI, MOBILE, FAX), but they may be empty
- **Addresses:** Always 2 entries (STREET, POBOX), may be empty
- **Date format:** Xero uses MS Date format `/Date(timestamp)/` in responses
- **ContactNumber vs AccountNumber:** ContactNumber is Xero-internal, AccountNumber is user-defined
- **summaryOnly:** Omits Phones, Addresses, ContactPersons — much faster for lists

---

## 3. Files API

**Base URL:** `https://api.xero.com/files.xro/1.0`
**Required scopes:** `files` or `files.read`

### POST /Files — Upload a File (to Inbox)

```
POST https://api.xero.com/files.xro/1.0/Files
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `body` | binary | Yes | The file content |
| `name` | string | Yes | Display name of the file |
| `filename` | string | Yes | Filename with extension |
| `mimeType` | string | No | MIME type (auto-detected if omitted) |

**Response (201):**
```json
{
  "Name": "document.pdf",
  "MimeType": "application/pdf",
  "Size": 2878711,
  "CreatedDateUtc": "2021-02-10T23:17:50.1930000",
  "UpdatedDateUtc": "2021-02-10T23:17:50.1930000",
  "User": {
    "Name": "user@email.com",
    "FirstName": "First",
    "LastName": "Last",
    "FullName": "First Last",
    "Id": "user-uuid"
  },
  "FolderId": "folder-uuid",
  "Id": "file-uuid"
}
```

### POST /Files/{FolderId} — Upload to Specific Folder

```
POST https://api.xero.com/files.xro/1.0/Files/{FolderId}
Content-Type: multipart/form-data
```

Same request body as above. File goes into specified folder instead of Inbox.

### POST /Files/{FileId}/Associations — Associate File with Object

```
POST https://api.xero.com/files.xro/1.0/Files/{FileId}/Associations
Content-Type: application/json
```

**Request Body:**
```json
{
  "ObjectId": "contact-uuid-or-invoice-uuid",
  "ObjectGroup": "Contact",
  "ObjectType": "Business"
}
```

**ObjectGroup values:** `Contact`, `Invoice`, `CreditNote`, `BankTransaction`, `Account`, `Receipt`, `ManualJournal`, `Quote`

**ObjectType values for Contact:** `Business`, `Person`

**Response (201):**
```json
{
  "FileId": "file-uuid",
  "ObjectId": "contact-uuid",
  "ObjectType": "Business",
  "ObjectGroup": "Contact"
}
```

### GET /Files — List Files

```
GET https://api.xero.com/files.xro/1.0/Files?pagesize=50&page=1&sort=CreatedDateUTC&direction=DESC
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pagesize` | int | Max 100, default 50 |
| `page` | int | 1-indexed |
| `sort` | string | `Name`, `Size`, `CreatedDateUTC` |
| `direction` | string | `ASC`, `DESC` |

### GET /Folders — List Folders

```
GET https://api.xero.com/files.xro/1.0/Folders
```

**Response:**
```json
[
  {
    "Name": "Inbox",
    "FileCount": 14,
    "Email": "xero.inbox.xxx@xerofiles.com",
    "IsInbox": true,
    "Id": "folder-uuid"
  },
  {
    "Name": "Contracts",
    "FileCount": 7,
    "IsInbox": false,
    "Id": "folder-uuid"
  }
]
```

### GET /Associations/{ObjectId} — Get Files for a Contact

```
GET https://api.xero.com/files.xro/1.0/Associations/{ContactID}
```

Returns all files associated with that contact. Very useful for chase.md!

### DELETE /Files/{FileId}/Associations/{ObjectId} — Remove Association

```
DELETE https://api.xero.com/files.xro/1.0/Files/{FileId}/Associations/{ObjectId}
```

Returns 204 No Content.

### File Limits & Accepted Types

- **Max file size:** 10MB per file
- **Max files per org:** 100 (free plan), unlimited (paid plans)
- **Accepted extensions:** pdf, doc, docx, xls, xlsx, csv, txt, jpg, jpeg, png, gif, bmp, tiff, zip, rar, 7z, and more
- **Invalid extensions:** exe, bat, cmd, com, lnk, pif, scr, vbs, js, etc.

### Gotchas

- Files uploaded via API go to **Inbox** by default unless you specify a FolderId
- The Inbox folder **cannot be deleted or renamed**
- File associations are how you link documents to contacts — this is the mechanism for "pushing documents back to Xero"
- Each file can be associated with **multiple objects**
- The `Idempotency-Key` header prevents duplicate uploads on retry

---

## 4. Xero Practice Manager (XPM) API

**⚠️ IMPORTANT:** XPM API requires a separate subscription and is NOT part of the standard Xero API. Access requires:
- A Xero Practice Manager subscription
- Separate API approval from Xero (must apply)
- Different authentication endpoint/scope

### Base URL

```
https://api.xero.com/practicemanager/3.0/
```

### Required Scope

```
practicemanager
```

### GET /job.api/list — List Jobs

```
GET https://api.xero.com/practicemanager/3.0/job.api/list
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `modifiedSince` | datetime | Filter by modification date |
| `page` | int | Pagination |

### Job Schema (Key Fields)

```xml
<Job>
  <ID>J0001</ID>
  <Name>Annual Accounts 2024</Name>
  <Description>...</Description>
  <ClientID>client-uuid</ClientID>
  <ClientName>Client Ltd</ClientName>
  <ManagerID>manager-uuid</ManagerID>
  <PartnerID>partner-uuid</PartnerID>
  <State>Planned|InProgress|Completed</State>
  <Status>
    <Name>Awaiting Information</Name>
    <ID>status-uuid</ID>
  </Status>
  <StartDate>2024-01-01</StartDate>
  <DueDate>2024-03-31</DueDate>
</Job>
```

### Job States

| State | Description |
|-------|-------------|
| `Planned` | Job created but not started |
| `InProgress` | Job actively being worked on |
| `Completed` | Job finished |

### Custom Statuses

XPM allows custom job statuses (configured per practice). Common ones:
- Awaiting Information
- In Progress
- Under Review
- Ready to Lodge
- Completed

**⚠️ NOTE:** The "Awaiting Information" status is a custom status — its exact name and ID vary per practice. You'll need to query the status list and let users map their statuses.

### GET /client.api/list — List Clients

```
GET https://api.xero.com/practicemanager/3.0/client.api/list
```

Returns all clients in the practice, including their Xero contact IDs for cross-referencing.

### XPM API Gotchas

1. **XML responses** — XPM returns XML, not JSON. You'll need an XML parser.
2. **Separate auth** — XPM uses the same OAuth2 flow but requires the `practicemanager` scope
3. **Limited availability** — Not all practices have XPM; must handle gracefully
4. **Custom statuses** — Can't hardcode "Awaiting Information"; must discover dynamically
5. **Rate limits** — Same as standard Xero API (see below)
6. **Alternative approach:** Consider polling the Xero Accounting API for outstanding invoices/overdue items instead of relying on XPM statuses, especially if XPM access is problematic

---

## 5. Webhooks

### Overview

Xero supports webhooks for the **Accounting API** (Contacts, Invoices, etc.). Limited to certain event types.

### Supported Events

| Category | Events |
|----------|--------|
| Contacts | Create, Update |
| Invoices | Create, Update |
| Credit Notes | Create, Update |
| Bank Transactions | Create, Update |
| Manual Journals | Create, Update |
| Payments | Create, Update |
| Quotes | Create, Update |

**⚠️ XPM webhooks:** XPM does NOT support webhooks. Job status changes must be polled.

### Webhook Setup

1. **Register webhook** in Xero Developer Dashboard (not via API)
2. Provide your **HTTPS endpoint URL**
3. Xero sends a **webhook key** for payload verification
4. Your endpoint must respond to an **Intent to Receive** check

### Intent to Receive (Validation)

When you first create a webhook, Xero sends a validation payload:

```json
{
  "events": [],
  "firstEventSequence": 0,
  "lastEventSequence": 0,
  "entropy": "RANDOM_STRING"
}
```

You must respond with:
- Status **200**
- `x-xero-signature` header containing HMACSHA256(payload_body, webhook_key) base64-encoded

If signature matches, webhook is activated. **Must respond within 5 seconds.**

### Payload Format

```json
{
  "events": [
    {
      "resourceUrl": "https://api.xero.com/api.xro/2.0/Contacts/contact-uuid",
      "resourceId": "contact-uuid",
      "eventDateUtc": "2024-01-15T10:30:00.000Z",
      "eventType": "Update",
      "eventCategory": "CONTACT",
      "tenantId": "tenant-uuid",
      "tenantType": "ORGANISATION"
    }
  ],
  "firstEventSequence": 1,
  "lastEventSequence": 1
}
```

### Webhook Response Requirements

- **Must respond within 5 seconds** with 2xx status
- If response > 5s or non-2xx, Xero retries with exponential backoff
- After repeated failures, webhook is **disabled**
- Webhooks deliver **event notifications only** — you must call the API to get the actual data

### Signature Verification

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, webhookKey) {
  const hash = crypto
    .createHmac('sha256', webhookKey)
    .update(payload)
    .digest('base64');
  return hash === signature;
}
```

### Gotchas

1. **Events are notifications, not data** — you get told "Contact X changed" but must fetch the contact yourself
2. **May receive duplicate events** — handle idempotently
3. **Event ordering not guaranteed** — use eventDateUtc for ordering
4. **Webhook key is per-webhook** — store securely
5. **No XPM webhooks** — must poll for job status changes
6. **Limited to Accounting API events** — no Files API webhooks
7. **Max 10 webhook subscriptions per app**

---

## 6. Rate Limits

### Standard Limits

| Limit | Value | Scope |
|-------|-------|-------|
| **Per minute** | 60 calls/min | Per app per tenant |
| **Daily** | 5,000 calls/day | Per app per tenant |
| **App-wide minute** | 10,000 calls/min | Across all tenants |

### Rate Limit Headers

Every response includes:

```
X-Rate-Limit-Problem: <which limit was hit>
X-MinLimit-Remaining: <calls left this minute>
X-DayLimit-Remaining: <calls left today>
X-AppMinLimit-Remaining: <app-wide calls left this minute>
Retry-After: <seconds to wait>
```

### 429 Too Many Requests

When rate limited, Xero returns:
- Status **429**
- `Retry-After` header with seconds to wait

### Retry Strategy

```typescript
async function xeroApiCall(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
        await sleep(retryAfter * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

### Best Practices

1. **Cache aggressively** — contacts don't change often
2. **Use `If-Modified-Since`** header for incremental sync instead of full pulls
3. **Use `summaryOnly=true`** when you don't need full contact details
4. **Batch operations** — update multiple contacts in one call where possible
5. **Implement exponential backoff** for 429s, 500s, 503s
6. **Track remaining limits** from response headers and throttle proactively
7. **For contact sync:** daily full sync + webhook-triggered incremental updates

---

## 7. xero-node SDK

### Package Info

| | |
|--|--|
| **Package** | `xero-node` |
| **npm** | https://www.npmjs.com/package/xero-node |
| **GitHub** | https://github.com/XeroAPI/xero-node |
| **TypeScript** | ✅ Full TypeScript support (generated from OpenAPI spec) |
| **Install** | `npm install xero-node` |

### Configuration

```typescript
import { XeroClient } from 'xero-node';

const xero = new XeroClient({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUris: ['http://localhost:3000/api/xero/callback'],
  scopes: 'openid profile email accounting.contacts files offline_access'.split(' '),
  state: 'optional-csrf-state',
  httpTimeout: 3000,
});
```

### Auth Flow Methods

```typescript
// 1. Get consent URL
const consentUrl = await xero.buildConsentUrl();
// redirect user to consentUrl

// 2. Handle callback — exchange code for tokens
const tokenSet = await xero.apiCallback(callbackUrl);
// save tokenSet to database

// 3. Restore session
await xero.initialize();
await xero.setTokenSet(savedTokenSet);

// 4. Refresh if expired
if (tokenSet.expired()) {
  const newTokenSet = await xero.refreshToken();
  // save newTokenSet
}

// 5. Alternative: refresh without full client init
const newTokenSet = await xero.refreshWithRefreshToken(clientId, clientSecret, refreshToken);

// 6. Get tenant connections
await xero.updateTenants(); // populates xero.tenants[]
const tenantId = xero.tenants[0].tenantId;
```

### API Client Instances

```typescript
xero.accountingApi   // Contacts, Invoices, etc.
xero.filesApi        // Files, Folders, Associations
xero.assetApi        // Fixed assets
xero.projectApi      // Projects/Jobs
xero.payrollAUApi    // AU Payroll
xero.payrollNZApi    // NZ Payroll
xero.payrollUKApi    // UK Payroll
```

### Contacts API (SDK)

```typescript
// List contacts
const response = await xero.accountingApi.getContacts(
  tenantId,
  ifModifiedSince,   // Date | undefined
  where,             // string | undefined, e.g. 'IsCustomer==true'
  order,             // string | undefined, e.g. 'Name ASC'
  ids,               // string[] | undefined
  page,              // number | undefined
  includeArchived,   // boolean | undefined
  summaryOnly        // boolean | undefined
);
const contacts = response.body.contacts;

// Get single contact
const response = await xero.accountingApi.getContact(tenantId, contactId);
const contact = response.body.contacts[0];

// Create/Update contacts
const contacts = { contacts: [{ name: 'New Client', emailAddress: 'client@email.com' }] };
const response = await xero.accountingApi.createContacts(tenantId, contacts);
```

### Files API (SDK)

```typescript
// List files
const response = await xero.filesApi.getFiles(tenantId, pagesize, page, sort, direction);

// Upload file
const response = await xero.filesApi.uploadFile(
  tenantId,
  fileBody,    // Buffer or ReadStream
  fileName,    // string
  fileName,    // string (name)
  mimeType     // string (optional)
);

// Upload to folder
const response = await xero.filesApi.uploadFileToFolder(
  tenantId,
  folderId,
  fileBody,
  fileName,
  fileName,
  mimeType
);

// Create association
const association = {
  objectId: contactId,
  objectGroup: 'Contact' as any,
  objectType: 'Business' as any
};
const response = await xero.filesApi.createFileAssociation(tenantId, fileId, association);

// List folders
const response = await xero.filesApi.getFolders(tenantId, sort);

// Get files for a contact
const response = await xero.filesApi.getAssociationsByObject(tenantId, contactId);
```

### SDK Helper Methods

| Method | Description |
|--------|-------------|
| `xero.initialize()` | Initialize client with config |
| `xero.buildConsentUrl()` | Get OAuth consent URL |
| `xero.apiCallback(url)` | Exchange auth code for tokens |
| `xero.disconnect(connectionId)` | Remove a tenant connection |
| `xero.readTokenSet()` | Get current token set |
| `xero.setTokenSet(tokenSet)` | Set token set on client |
| `xero.refreshToken()` | Refresh using stored token |
| `xero.revokeToken()` | Revoke refresh token |
| `xero.refreshWithRefreshToken(id, secret, token)` | Refresh without full init |
| `xero.getClientCredentialsToken()` | M2M auth (custom connections only) |
| `xero.updateTenants(fullDetails?)` | Fetch connected tenants |

### SDK Conventions

- Pass `undefined` (not `null`) for optional params you want to skip
- `null` values generate empty query params which break queries
- All API methods require `tenantId` as first param
- Response data is in `response.body`
- Dates use MS Date format in some responses

---

## Quick Reference: Headers Template

```typescript
// Every API call needs these headers (SDK handles this automatically):
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'xero-tenant-id': tenantId,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  // Optional:
  'If-Modified-Since': lastSyncDate.toISOString(),
  'Idempotency-Key': uuidv4(), // For POST/PUT to prevent duplicates
};
```

---

## Quick Reference: Error Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Bad request / validation error | Check request body |
| 401 | Unauthorized | Token expired — refresh |
| 403 | Forbidden | Wrong scope or tenant |
| 404 | Not found | Resource doesn't exist |
| 429 | Rate limited | Wait for Retry-After seconds |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry with backoff |
