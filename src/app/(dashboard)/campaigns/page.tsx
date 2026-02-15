"use client";

import { useState } from "react";

const TAX_OBLIGATIONS = [
  { value: "self_assessment", label: "Self Assessment" },
  { value: "corporation_tax", label: "Corporation Tax" },
  { value: "vat", label: "VAT Returns" },
  { value: "mtd_itsa", label: "MTD ITSA" },
  { value: "annual_accounts", label: "Annual Accounts" },
  { value: "confirmation_statement", label: "Confirmation Statement" },
];

export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false);
  // TODO: wire to tRPC
  const campaigns: never[] = [];

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

      {/* Campaign list */}
      {campaigns.length === 0 ? (
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
      ) : null}

      {/* Create campaign modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">New Campaign</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. 2024/25 Self Assessment"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Obligation</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chase Frequency</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="5">Every 5 days</option>
                  <option value="7" selected>Every 7 days</option>
                  <option value="10">Every 10 days</option>
                  <option value="14">Every 14 days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channels</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="rounded" /> Email
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="rounded" /> WhatsApp
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" /> SMS
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium">
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
