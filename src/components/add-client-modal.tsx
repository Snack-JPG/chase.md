"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { CLIENT_TYPE_STYLES } from "@/lib/constants";

export function AddClientModal({ onClose, onSubmit, isLoading, error }: {
  onClose: () => void;
  onSubmit: (data: { firstName: string; lastName: string; email?: string; phone?: string; clientType: "sole_trader" | "limited_company" | "partnership" | "llp" | "trust" | "individual" }) => void;
  isLoading: boolean;
  error?: string;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    clientType: "sole_trader" as const,
  });

  return (
    <div
      className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-client-title"
    >
      <div className="bg-surface-raised rounded-[var(--radius-xl)] max-w-lg w-full p-6 space-y-5" style={{ boxShadow: "var(--shadow-overlay)" }}>
        <div className="flex items-center justify-between">
          <h2 id="add-client-title" className="text-[17px] font-semibold text-text-primary">Add Client</h2>
          <button onClick={onClose} aria-label="Close dialog" className="w-8 h-8 rounded-lg hover:bg-surface-inset flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="text-danger text-[13px] bg-danger-light px-3 py-2 rounded-[var(--radius-md)]">{error}</div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Client Type</label>
            <select
              value={form.clientType}
              onChange={(e) => setForm({ ...form, clientType: e.target.value as typeof form.clientType })}
              className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            >
              {Object.entries(CLIENT_TYPE_STYLES).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
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
            onClick={() => onSubmit({
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email || undefined,
              phone: form.phone || undefined,
              clientType: form.clientType,
            })}
            disabled={isLoading || !form.firstName || !form.lastName}
            className="flex-1 px-4 py-2.5 bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover text-[13px] font-medium disabled:opacity-50 transition-colors shadow-sm"
          >
            {isLoading ? "Adding..." : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}
