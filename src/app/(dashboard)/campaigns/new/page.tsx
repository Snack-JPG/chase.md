"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  Rocket,
  Save,
  FileText,
  Users,
  Calendar,
  Settings,
  ClipboardCheck,
} from "lucide-react";
import {
  TAX_OBLIGATIONS,
  type TaxObligation,
  CHANNEL_OPTIONS,
  getClientTypeConfig,
} from "@/lib/constants";

// ─── Types ──────────────────────────────────────────────

interface CampaignFormState {
  // Step 1: Details
  name: string;
  taxObligation: TaxObligation | "";
  taxYear: string;
  deadlineDate: string;
  description: string;
  // Step 2: Clients
  clientIds: string[];
  // Step 3: Documents
  documentTemplateIds: string[];
  // Step 4: Schedule
  maxChases: number;
  chaseDaysBetween: number;
  escalateAfterChase: number;
  channels: string[];
  gracePeriodDays: number;
  skipWeekends: boolean;
  skipBankHolidays: boolean;
}

const STEPS = [
  { label: "Details", icon: Calendar },
  { label: "Clients", icon: Users },
  { label: "Documents", icon: FileText },
  { label: "Schedule", icon: Settings },
  { label: "Review", icon: ClipboardCheck },
];

const DEFAULT_FORM: CampaignFormState = {
  name: "",
  taxObligation: "",
  taxYear: "",
  deadlineDate: "",
  description: "",
  clientIds: [],
  documentTemplateIds: [],
  maxChases: 6,
  chaseDaysBetween: 7,
  escalateAfterChase: 4,
  channels: ["email"],
  gracePeriodDays: 14,
  skipWeekends: true,
  skipBankHolidays: true,
};

// ─── Main Page ──────────────────────────────────────────────

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CampaignFormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: (campaign) => {
      router.push(`/dashboard/campaigns/${campaign.id}`);
    },
    onError: (err) => setError(err.message),
  });

  function canAdvance(): boolean {
    switch (step) {
      case 0: return !!(form.name && form.taxObligation && form.taxYear && form.deadlineDate);
      case 1: return form.clientIds.length > 0;
      case 2: return true; // optional
      case 3: return form.channels.length > 0;
      default: return true;
    }
  }

  function handleSubmit(status: "draft" | "active") {
    if (!form.taxObligation) return;
    setError(null);
    createCampaign.mutate({
      name: form.name,
      taxObligation: form.taxObligation as TaxObligation,
      taxYear: form.taxYear,
      deadlineDate: new Date(form.deadlineDate).toISOString(),
      description: form.description || undefined,
      documentTemplateIds: form.documentTemplateIds.length > 0 ? form.documentTemplateIds : undefined,
      maxChases: form.maxChases,
      chaseDaysBetween: form.chaseDaysBetween,
      escalateAfterChase: form.escalateAfterChase,
      channels: form.channels as ("email" | "whatsapp" | "sms")[],
      gracePeriodDays: form.gracePeriodDays,
      skipWeekends: form.skipWeekends,
      skipBankHolidays: form.skipBankHolidays,
      clientIds: form.clientIds,
      status,
    });
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push("/dashboard/campaigns")}
        className="text-[13px] text-text-muted hover:text-text-secondary inline-flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Campaigns
      </button>

      <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">New Campaign</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isComplete = i < step;
          const isCurrent = i === step;
          return (
            <div key={s.label} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => { if (isComplete) setStep(i); }}
                disabled={!isComplete}
                className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-[12px] font-medium transition-colors w-full ${
                  isCurrent
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : isComplete
                      ? "bg-surface-inset text-text-secondary hover:bg-border cursor-pointer"
                      : "bg-surface-inset/50 text-text-muted cursor-default"
                }`}
              >
                {isComplete ? (
                  <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
                ) : (
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger-light border border-red-200 text-danger text-[13px] rounded-[var(--radius-md)] px-4 py-3">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        {step === 0 && <StepDetails form={form} setForm={setForm} />}
        {step === 1 && <StepClients form={form} setForm={setForm} />}
        {step === 2 && <StepDocuments form={form} setForm={setForm} />}
        {step === 3 && <StepSchedule form={form} setForm={setForm} />}
        {step === 4 && <StepReview form={form} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-raised border border-border text-text-secondary rounded-[var(--radius-md)] hover:bg-surface-inset text-[13px] font-medium transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canAdvance()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-[var(--radius-md)] hover:bg-primary/90 text-[13px] font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            Next <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit("draft")}
              disabled={createCampaign.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-raised border border-border text-text-secondary rounded-[var(--radius-md)] hover:bg-surface-inset text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {createCampaign.isPending ? "Saving..." : "Save as Draft"}
            </button>
            <button
              onClick={() => handleSubmit("active")}
              disabled={createCampaign.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-[var(--radius-md)] hover:bg-primary/90 text-[13px] font-medium transition-colors disabled:opacity-50 shadow-sm"
            >
              <Rocket className="w-3.5 h-3.5" />
              {createCampaign.isPending ? "Launching..." : "Launch Campaign"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Details ──────────────────────────────────────────────

function StepDetails({
  form,
  setForm,
}: {
  form: CampaignFormState;
  setForm: React.Dispatch<React.SetStateAction<CampaignFormState>>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Campaign Name</label>
        <input
          type="text"
          placeholder="e.g. 2024/25 Self Assessment"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-accent transition-all"
        />
      </div>

      <div>
        <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Tax Obligation</label>
        <select
          value={form.taxObligation}
          onChange={(e) => setForm((f) => ({ ...f, taxObligation: e.target.value as TaxObligation }))}
          className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-accent transition-all"
        >
          <option value="">Select...</option>
          {TAX_OBLIGATIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Tax Year</label>
          <input
            type="text"
            placeholder="2024/25"
            value={form.taxYear}
            onChange={(e) => setForm((f) => ({ ...f, taxYear: e.target.value }))}
            className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-accent transition-all"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Deadline</label>
          <input
            type="date"
            value={form.deadlineDate}
            onChange={(e) => setForm((f) => ({ ...f, deadlineDate: e.target.value }))}
            className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-accent transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
          Description <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <textarea
          placeholder="Brief description of this campaign..."
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-accent transition-all"
        />
      </div>
    </div>
  );
}

// ─── Step 2: Select Clients ──────────────────────────────────────────────

function StepClients({
  form,
  setForm,
}: {
  form: CampaignFormState;
  setForm: React.Dispatch<React.SetStateAction<CampaignFormState>>;
}) {
  const [search, setSearch] = useState("");
  const clientsQuery = trpc.clients.list.useInfiniteQuery(
    { limit: 100 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );

  const allClients = clientsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = allClients.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.companyName || ""} ${c.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const toggleClient = (id: string) => {
    setForm((f) => ({
      ...f,
      clientIds: f.clientIds.includes(id)
        ? f.clientIds.filter((cid) => cid !== id)
        : [...f.clientIds, id],
    }));
  };

  const selectAll = () => {
    setForm((f) => ({ ...f, clientIds: filtered.map((c) => c.id) }));
  };

  const deselectAll = () => {
    setForm((f) => ({ ...f, clientIds: [] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-text-secondary">
          Select clients to enrol in this campaign.
        </p>
        <span className="text-[12px] font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          {form.clientIds.length} selected
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search by name, company, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-accent transition-all"
        />
      </div>

      {/* Select all / deselect */}
      <div className="flex gap-2">
        <button
          onClick={selectAll}
          className="text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Select All ({filtered.length})
        </button>
        <span className="text-text-muted">|</span>
        <button
          onClick={deselectAll}
          className="text-[12px] font-medium text-text-muted hover:text-text-secondary transition-colors"
        >
          Deselect All
        </button>
      </div>

      {/* Client list */}
      {clientsQuery.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-12 w-full rounded-[var(--radius-md)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[13px] text-text-muted">
            {search ? "No clients match your search" : "No clients found. Add clients first."}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-[var(--radius-md)] divide-y divide-border max-h-[400px] overflow-y-auto">
          {filtered.map((client) => {
            const selected = form.clientIds.includes(client.id);
            const typeConfig = getClientTypeConfig(client.clientType);
            return (
              <label
                key={client.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  selected ? "bg-primary/5" : "hover:bg-surface-inset/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleClient(client.id)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">
                    {client.firstName} {client.lastName}
                    {client.companyName && (
                      <span className="text-text-muted font-normal ml-1.5">{client.companyName}</span>
                    )}
                  </p>
                  {client.email && (
                    <p className="text-[12px] text-text-muted truncate">{client.email}</p>
                  )}
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset flex-shrink-0 ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {clientsQuery.hasNextPage && (
        <button
          onClick={() => clientsQuery.fetchNextPage()}
          disabled={clientsQuery.isFetchingNextPage}
          className="w-full py-2.5 bg-surface-inset text-text-secondary rounded-[var(--radius-md)] text-[13px] font-medium hover:bg-border transition-colors disabled:opacity-50"
        >
          {clientsQuery.isFetchingNextPage ? "Loading..." : "Load more clients"}
        </button>
      )}
    </div>
  );
}

// ─── Step 3: Documents ──────────────────────────────────────────────

function StepDocuments({
  form,
  setForm,
}: {
  form: CampaignFormState;
  setForm: React.Dispatch<React.SetStateAction<CampaignFormState>>;
}) {
  const templatesQuery = trpc.documents.listTemplates.useQuery(
    form.taxObligation ? { taxObligation: form.taxObligation } : undefined,
  );
  const templates = templatesQuery.data ?? [];

  const toggleTemplate = (id: string) => {
    setForm((f) => ({
      ...f,
      documentTemplateIds: f.documentTemplateIds.includes(id)
        ? f.documentTemplateIds.filter((tid) => tid !== id)
        : [...f.documentTemplateIds, id],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-text-secondary">
            Select document templates clients need to provide.
          </p>
          <p className="text-[12px] text-text-muted mt-0.5">This step is optional &mdash; you can skip if not needed.</p>
        </div>
        {form.documentTemplateIds.length > 0 && (
          <span className="text-[12px] font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            {form.documentTemplateIds.length} selected
          </span>
        )}
      </div>

      {templatesQuery.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-14 w-full rounded-[var(--radius-md)]" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="py-8 text-center border border-border rounded-[var(--radius-md)]">
          <FileText className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="text-[13px] text-text-muted">No document templates found.</p>
          <p className="text-[12px] text-text-muted mt-1">You can skip this step and add documents later.</p>
        </div>
      ) : (
        <div className="border border-border rounded-[var(--radius-md)] divide-y divide-border max-h-[400px] overflow-y-auto">
          {templates.map((template) => {
            const selected = form.documentTemplateIds.includes(template.id);
            return (
              <label
                key={template.id}
                className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                  selected ? "bg-primary/5" : "hover:bg-surface-inset/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleTemplate(template.id)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary">{template.name}</p>
                  {template.description && (
                    <p className="text-[12px] text-text-muted mt-0.5 line-clamp-1">{template.description}</p>
                  )}
                </div>
                <span className="text-[11px] text-text-muted bg-surface-inset px-2 py-0.5 rounded-full flex-shrink-0">
                  {template.category}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Schedule ──────────────────────────────────────────────

function StepSchedule({
  form,
  setForm,
}: {
  form: CampaignFormState;
  setForm: React.Dispatch<React.SetStateAction<CampaignFormState>>;
}) {
  const toggleChannel = (channel: string) => {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(channel)
        ? f.channels.filter((c) => c !== channel)
        : [...f.channels, channel],
    }));
  };

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-text-secondary">
        Configure how and when clients are chased.
      </p>

      {/* Channels */}
      <div>
        <label className="block text-[12px] font-medium text-text-secondary mb-2">Channels</label>
        <div className="flex gap-3">
          {CHANNEL_OPTIONS.map((ch) => {
            const active = form.channels.includes(ch.value);
            return (
              <button
                key={ch.value}
                type="button"
                onClick={() => toggleChannel(ch.value)}
                className={`px-4 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-colors border ${
                  active
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-surface-inset text-text-muted border-border hover:bg-border"
                }`}
              >
                {ch.label}
              </button>
            );
          })}
        </div>
        {form.channels.length === 0 && (
          <p className="text-[12px] text-danger mt-1.5">Select at least one channel.</p>
        )}
      </div>

      {/* Number inputs row */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Days Between Chases</label>
          <input
            type="number"
            min={1}
            max={90}
            value={form.chaseDaysBetween}
            onChange={(e) => setForm((f) => ({ ...f, chaseDaysBetween: parseInt(e.target.value) || 7 }))}
            className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-accent transition-all"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Max Chases</label>
          <input
            type="number"
            min={1}
            max={20}
            value={form.maxChases}
            onChange={(e) => setForm((f) => ({ ...f, maxChases: parseInt(e.target.value) || 6 }))}
            className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-accent transition-all"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Escalate After Chase</label>
          <input
            type="number"
            min={1}
            max={20}
            value={form.escalateAfterChase}
            onChange={(e) => setForm((f) => ({ ...f, escalateAfterChase: parseInt(e.target.value) || 4 }))}
            className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-accent transition-all"
          />
        </div>
      </div>

      {/* Grace period */}
      <div className="max-w-[200px]">
        <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Grace Period (days)</label>
        <input
          type="number"
          min={0}
          max={90}
          value={form.gracePeriodDays}
          onChange={(e) => setForm((f) => ({ ...f, gracePeriodDays: parseInt(e.target.value) || 0 }))}
          className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-accent transition-all"
        />
      </div>

      {/* Toggles */}
      <div className="space-y-3 pt-1">
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={form.skipWeekends}
            onClick={() => setForm((f) => ({ ...f, skipWeekends: !f.skipWeekends }))}
            className={`relative w-9 h-5 rounded-full transition-colors ${form.skipWeekends ? "bg-primary" : "bg-border"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${form.skipWeekends ? "translate-x-4" : ""}`} />
          </button>
          <span className="text-[13px] text-text-primary">Skip weekends</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={form.skipBankHolidays}
            onClick={() => setForm((f) => ({ ...f, skipBankHolidays: !f.skipBankHolidays }))}
            className={`relative w-9 h-5 rounded-full transition-colors ${form.skipBankHolidays ? "bg-primary" : "bg-border"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${form.skipBankHolidays ? "translate-x-4" : ""}`} />
          </button>
          <span className="text-[13px] text-text-primary">Skip bank holidays</span>
        </label>
      </div>
    </div>
  );
}

// ─── Step 5: Review ──────────────────────────────────────────────

function StepReview({ form }: { form: CampaignFormState }) {
  const obligationLabel = TAX_OBLIGATIONS.find((o) => o.value === form.taxObligation)?.label ?? form.taxObligation;

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-text-secondary">
        Review your campaign before creating.
      </p>

      {/* Details summary */}
      <div className="space-y-2">
        <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Campaign Details</h3>
        <div className="bg-surface-inset/50 rounded-[var(--radius-md)] p-4 space-y-1.5 text-[13px]">
          <div className="flex justify-between">
            <span className="text-text-muted">Name</span>
            <span className="font-medium text-text-primary">{form.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Tax Obligation</span>
            <span className="text-text-primary">{obligationLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Tax Year</span>
            <span className="font-mono text-[12px] text-text-primary">{form.taxYear}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Deadline</span>
            <span className="text-text-primary">{form.deadlineDate}</span>
          </div>
          {form.description && (
            <div className="flex justify-between">
              <span className="text-text-muted">Description</span>
              <span className="text-text-secondary text-right max-w-[60%] truncate">{form.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Clients summary */}
      <div className="space-y-2">
        <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Clients</h3>
        <div className="bg-surface-inset/50 rounded-[var(--radius-md)] p-4 text-[13px]">
          <span className="font-medium text-text-primary">{form.clientIds.length}</span>
          <span className="text-text-muted ml-1.5">clients will be enrolled</span>
        </div>
      </div>

      {/* Documents summary */}
      <div className="space-y-2">
        <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Documents</h3>
        <div className="bg-surface-inset/50 rounded-[var(--radius-md)] p-4 text-[13px]">
          {form.documentTemplateIds.length > 0 ? (
            <>
              <span className="font-medium text-text-primary">{form.documentTemplateIds.length}</span>
              <span className="text-text-muted ml-1.5">document templates selected</span>
            </>
          ) : (
            <span className="text-text-muted">No document templates selected</span>
          )}
        </div>
      </div>

      {/* Schedule summary */}
      <div className="space-y-2">
        <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Schedule</h3>
        <div className="bg-surface-inset/50 rounded-[var(--radius-md)] p-4 space-y-1.5 text-[13px]">
          <div className="flex justify-between">
            <span className="text-text-muted">Channels</span>
            <span className="text-text-primary">{form.channels.join(", ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Days between chases</span>
            <span className="font-mono text-[12px] text-text-primary">{form.chaseDaysBetween}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Max chases</span>
            <span className="font-mono text-[12px] text-text-primary">{form.maxChases}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Escalate after</span>
            <span className="font-mono text-[12px] text-text-primary">chase #{form.escalateAfterChase}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Grace period</span>
            <span className="font-mono text-[12px] text-text-primary">{form.gracePeriodDays} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Skip weekends</span>
            <span className="text-text-primary">{form.skipWeekends ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Skip bank holidays</span>
            <span className="text-text-primary">{form.skipBankHolidays ? "Yes" : "No"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
