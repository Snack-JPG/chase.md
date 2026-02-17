"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";

const TAX_OBLIGATIONS = [
  { value: "self_assessment", label: "Self Assessment" },
  { value: "corporation_tax", label: "Corporation Tax" },
  { value: "vat", label: "VAT Returns" },
  { value: "mtd_itsa", label: "MTD ITSA" },
  { value: "annual_accounts", label: "Annual Accounts" },
  { value: "confirmation_statement", label: "Confirmation Statement" },
] as const;

type TaxObligation = (typeof TAX_OBLIGATIONS)[number]["value"];

export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false);

  const campaignsQuery = trpc.campaigns.list.useQuery();
  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      campaignsQuery.refetch();
      setShowCreate(false);
    },
  });

  const campaigns = campaignsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">
            Each campaign chases a group of clients for specific documents.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium"
        >
          New Campaign
        </button>
      </div>

      {campaignsQuery.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          Failed to load campaigns. {campaignsQuery.error?.message}
        </div>
      )}

      {/* Campaign list */}
      {campaignsQuery.isLoading ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-400">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-lg font-medium text-gray-700">No campaigns yet</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            A campaign lets you chase a group of clients for their documents.
            For example: &quot;2024/25 Self Assessment — chase all sole traders for P60s, bank statements, and expenses.&quot;
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium"
          >
            Create Your First Campaign
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tax Year</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Obligation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Progress</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.map((c) => {
                const completion = c.totalEnrollments
                  ? Math.round(((c.completedEnrollments ?? 0) / c.totalEnrollments) * 100)
                  : 0;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500">{c.taxYear}</td>
                    <td className="px-4 py-3 text-gray-500">{c.taxObligation.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${completion}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{completion}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === "active" ? "bg-green-100 text-green-700" :
                        c.status === "completed" ? "bg-gray-100 text-gray-600" :
                        c.status === "draft" ? "bg-blue-100 text-blue-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create campaign modal */}
      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createCampaign.mutate(data)}
          isLoading={createCampaign.isPending}
          error={createCampaign.error?.message}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({ onClose, onSubmit, isLoading, error }: {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">New Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
            <input
              type="text"
              placeholder="e.g. 2024/25 Self Assessment"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Obligation</label>
            <select
              value={form.taxObligation}
              onChange={(e) => setForm({ ...form, taxObligation: e.target.value as TaxObligation })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              {TAX_OBLIGATIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Year</label>
              <input
                type="text"
                placeholder="2024/25"
                value={form.taxYear}
                onChange={(e) => setForm({ ...form, taxYear: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input
                type="date"
                value={form.deadlineDate}
                onChange={(e) => setForm({ ...form, deadlineDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
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
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
