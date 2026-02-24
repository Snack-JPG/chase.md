// Shared status/color/label constants — single source of truth for all dashboard pages.
// Keyed by actual DB enum values from src/server/db/schema.ts.

// ─── Campaign Status ──────────────────────────────────────────────

export const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
  active: "bg-success-light text-success ring-green-200",
  completed: "bg-stone-100 text-stone-600 ring-stone-200",
  draft: "bg-info-light text-info ring-blue-200",
  paused: "bg-warning-light text-warning ring-amber-200",
  cancelled: "bg-stone-100 text-stone-500 ring-stone-200",
};

// ─── Escalation Level ──────────────────────────────────────────────

export const ESCALATION_STYLES: Record<string, string> = {
  gentle: "bg-success-light text-success ring-green-200",
  reminder: "bg-info-light text-info ring-blue-200",
  firm: "bg-warning-light text-warning ring-amber-200",
  urgent: "bg-orange-100 text-orange-700 ring-orange-200",
  escalate: "bg-danger-light text-danger ring-red-200",
};

// ─── Client Type ──────────────────────────────────────────────

export const CLIENT_TYPE_STYLES: Record<string, { label: string; color: string }> = {
  sole_trader: { label: "Sole Trader", color: "bg-purple-50 text-purple-700 ring-purple-200" },
  limited_company: { label: "Limited Co", color: "bg-blue-50 text-blue-700 ring-blue-200" },
  partnership: { label: "Partnership", color: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  individual: { label: "Individual", color: "bg-stone-100 text-stone-600 ring-stone-200" },
  llp: { label: "LLP", color: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  trust: { label: "Trust", color: "bg-amber-50 text-amber-700 ring-amber-200" },
};

// ─── Document Status ──────────────────────────────────────────────

export const DOCUMENT_STATUS_STYLES: Record<string, string> = {
  pending: "bg-stone-100 text-stone-600 ring-stone-200",
  uploaded: "bg-info-light text-info ring-blue-200",
  processing: "bg-warning-light text-warning ring-amber-200",
  classified: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  accepted: "bg-success-light text-success ring-green-200",
  rejected: "bg-danger-light text-danger ring-red-200",
  expired: "bg-stone-100 text-stone-500 ring-stone-200",
};

// ─── Message Status ──────────────────────────────────────────────

export const MESSAGE_STATUS_STYLES: Record<string, string> = {
  pending: "bg-stone-100 text-stone-600 ring-stone-200",
  queued: "bg-stone-100 text-stone-600 ring-stone-200",
  sent: "bg-info-light text-info ring-blue-200",
  delivered: "bg-success-light text-success ring-green-200",
  read: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-danger-light text-danger ring-red-200",
  opted_out: "bg-orange-50 text-orange-700 ring-orange-200",
};

// ─── Tax Obligations ──────────────────────────────────────────────

export const TAX_OBLIGATIONS = [
  { value: "self_assessment", label: "Self Assessment" },
  { value: "corporation_tax", label: "Corporation Tax" },
  { value: "vat", label: "VAT Returns" },
  { value: "mtd_itsa", label: "MTD ITSA" },
  { value: "annual_accounts", label: "Annual Accounts" },
  { value: "confirmation_statement", label: "Confirmation Statement" },
] as const;

export type TaxObligation = (typeof TAX_OBLIGATIONS)[number]["value"];

// ─── Style lookup helpers ──────────────────────────────────────────────

const DEFAULT_BADGE = "bg-stone-100 text-stone-600 ring-stone-200";

export function getCampaignStatusStyle(status: string): string {
  return CAMPAIGN_STATUS_STYLES[status] ?? DEFAULT_BADGE;
}

export function getEscalationStyle(level: string): string {
  return ESCALATION_STYLES[level] ?? DEFAULT_BADGE;
}

export function getClientTypeConfig(type: string): { label: string; color: string } {
  return CLIENT_TYPE_STYLES[type] ?? { label: type, color: DEFAULT_BADGE };
}

export function getDocumentStatusStyle(status: string): string {
  return DOCUMENT_STATUS_STYLES[status] ?? DEFAULT_BADGE;
}

export function getMessageStatusStyle(status: string): string {
  return MESSAGE_STATUS_STYLES[status] ?? DEFAULT_BADGE;
}

export function formatObligation(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
