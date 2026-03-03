# Build Audit — 25 Feb 2026

## Result: ✅ BUILD SUCCESSFUL

Next.js 15.5.12 — compiled in 3.6s, 25 static pages generated.

## Warnings (20 total — all `@typescript-eslint/no-unused-vars`)

No TypeScript errors. No build errors. Only unused-variable lint warnings:

| # | File | Line | Unused Variable |
|---|------|------|-----------------|
| 1 | `src/app/(marketing)/page.tsx` | 9 | `MessageSquare` |
| 2 | `src/app/(marketing)/page.tsx` | 10 | `Smartphone` |
| 3 | `src/app/(portal)/p/[token]/upload-zone.tsx` | 3 | `useRef` |
| 4 | `src/app/api/webhooks/twilio/inbound/route.ts` | 16 | `isNull` |
| 5 | `src/components/csv-import-modal.tsx` | 83 | `hasNameCol` |
| 6 | `src/lib/xero-files.ts` | 2 | `clients` |
| 7 | `src/server/services/chase-email-template.tsx` | 24 | `clientFirstName` |
| 8 | `src/server/services/chase-engine.ts` | 15 | `isNull` |
| 9 | `src/server/services/chase-engine.ts` | 15 | `not` |
| 10 | `src/server/services/chase-engine.ts` | 16 | `isBefore` |
| 11 | `src/server/services/chase-engine.ts` | 21 | `ESCALATION_ORDER` |
| 12 | `src/server/services/chase-engine.ts` | 98 | `businessHoursEnd` |
| 13 | `src/server/services/chase-engine.ts` | 110 | `startMin` |
| 14 | `src/server/services/document-classifier.ts` | 8 | `and` |
| 15 | `src/server/services/document-classifier.ts` | 8 | `isNull` |
| 16 | `src/server/services/message-dispatcher.ts` | 6 | `clients` |
| 17 | `src/server/services/message-dispatcher.ts` | 6 | `practices` |
| 18 | `src/server/services/plan-limits.ts` | 3 | `and` |
| 19 | `src/server/trpc/routers/billing.ts` | 1 | `z` |
| 20 | `src/server/trpc/routers/dashboard.ts` | 2 | `clients` |

## Route Summary

- 29 routes total (4 static, 25 dynamic)
- Middleware: 86.5 kB
- First Load JS shared: 102 kB
- Largest page: `/clients` at 13.4 kB

## Quick Fix

All 20 warnings are dead imports. A single pass removing unused imports would get a clean build:

```bash
npx knip --fix  # or manually remove the unused imports
```
