"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { TAX_OBLIGATIONS, type TaxObligation } from "@/lib/constants";

export function CreateCampaignModal({ onClose, onSubmit, isLoading, error }: {
  onClose: () => void;
  onSubmit: (data: { name: string; taxYear: string; taxObligation: TaxObligation; deadlineDate: string }) => void;
  isLoading: boolean;
  error?: string;
}) {
  const [form, setForm] = useState({
    name: "",
    taxObligation: "" as TaxObligation | "",
    taxYear: "",
    deadlineDate: "",
  });

  return (
    <div
      className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-campaign-title"
    >
      <div className="bg-surface-raised rounded-[var(--radius-xl)] max-w-lg w-full p-6 space-y-5" style={{ boxShadow: "var(--shadow-overlay)" }}>
        <div className="flex items-center justify-between">
          <h2 id="create-campaign-title" className="text-[17px] font-semibold text-text-primary">New Campaign</h2>
          <button onClick={onClose} aria-label="Close dialog" className="w-8 h-8 rounded-lg hover:bg-surface-inset flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="text-danger text-[13px] bg-danger-light px-3 py-2 rounded-[var(--radius-md)]">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Campaign Name</label>
            <input
              type="text"
              placeholder="e.g. 2024/25 Self Assessment"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Tax Obligation</label>
            <select
              value={form.taxObligation}
              onChange={(e) => setForm({ ...form, taxObligation: e.target.value as TaxObligation })}
              className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
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
                onChange={(e) => setForm({ ...form, taxYear: e.target.value })}
                className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Deadline</label>
              <input
                type="date"
                value={form.deadlineDate}
                onChange={(e) => setForm({ ...form, deadlineDate: e.target.value })}
                className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-surface-inset text-text-secondary rounded-[var(--radius-md)] hover:bg-border text-[13px] font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (form.name && form.taxObligation && form.taxYear && form.deadlineDate) {
                onSubmit({
                  name: form.name,
                  taxYear: form.taxYear,
                  taxObligation: form.taxObligation as TaxObligation,
                  deadlineDate: new Date(form.deadlineDate).toISOString(),
                });
              }
            }}
            disabled={isLoading || !form.name || !form.taxObligation || !form.taxYear || !form.deadlineDate}
            className="flex-1 px-4 py-2.5 bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover text-[13px] font-medium disabled:opacity-50 transition-colors shadow-sm"
          >
            {isLoading ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
