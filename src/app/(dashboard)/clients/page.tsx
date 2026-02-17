"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";

function ClientTypeLabel({ type }: { type: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    sole_trader: { label: "Sole Trader", color: "bg-purple-100 text-purple-700" },
    limited_company: { label: "Limited Co", color: "bg-blue-100 text-blue-700" },
    partnership: { label: "Partnership", color: "bg-green-100 text-green-700" },
    individual: { label: "Individual", color: "bg-gray-100 text-gray-700" },
    llp: { label: "LLP", color: "bg-indigo-100 text-indigo-700" },
    trust: { label: "Trust", color: "bg-amber-100 text-amber-700" },
  };
  const config = labels[type] || { label: type, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
}

function XeroBadge() {
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-medium ml-1.5">
      Xero
    </span>
  );
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const clientsQuery = trpc.clients.list.useQuery();
  const syncStatus = trpc.clients.lastSyncStatus.useQuery();
  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => {
      clientsQuery.refetch();
      setShowAdd(false);
    },
  });
  const syncFromXero = trpc.clients.syncFromXero.useMutation({
    onSuccess: (stats) => {
      clientsQuery.refetch();
      syncStatus.refetch();
      const parts: string[] = [];
      if (stats.created > 0) parts.push(`Imported ${stats.created}`);
      if (stats.updated > 0) parts.push(`updated ${stats.updated}`);
      if (stats.errors > 0) parts.push(`${stats.errors} errors`);
      setSyncToast(parts.length > 0 ? parts.join(", ") : "No changes");
      setTimeout(() => setSyncToast(null), 5000);
    },
    onError: (err) => {
      setSyncToast(`Sync failed: ${err.message}`);
      setTimeout(() => setSyncToast(null), 5000);
    },
  });

  const clients = clientsQuery.data ?? [];
  const filtered = clients.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.companyName || ""} ${c.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {syncToast && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 shadow-lg rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <span className="text-teal-600">⟳</span> {syncToast}
          <button onClick={() => setSyncToast(null)} className="text-gray-400 hover:text-gray-600 ml-2">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            {clientsQuery.isLoading ? "Loading..." : `${clients.length} total clients`}
            {syncStatus.data?.lastSyncAt && (
              <span className="ml-2 text-gray-400">
                · Last synced {formatDistanceToNow(new Date(syncStatus.data.lastSyncAt), { addSuffix: true })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          {syncStatus.data?.connected && (
            <button
              onClick={() => syncFromXero.mutate()}
              disabled={syncFromXero.isPending}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {syncFromXero.isPending ? (
                <>
                  <span className="animate-spin">⟳</span> Syncing…
                </>
              ) : (
                <>⟳ Sync from Xero</>
              )}
            </button>
          )}
          <button className="px-4 py-2 bg-white border text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
            Import CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium"
          >
            Add Client
          </button>
        </div>
      </div>

      {clientsQuery.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          Failed to load clients. {clientsQuery.error?.message}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search clients by name, company, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Client list */}
      {clientsQuery.isLoading ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-400">Loading clients...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-lg font-medium text-gray-700">
            {search ? "No clients match your search" : "No clients yet"}
          </p>
          {!search && (
            <>
              <p className="text-sm text-gray-500 mt-1">
                Import from a CSV, connect Xero/Sage, or add clients manually.
              </p>
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={() => setShowAdd(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                >
                  Add Your First Client
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Last Chased</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div>
                        <p className="font-medium">{client.firstName} {client.lastName}</p>
                        {client.companyName && (
                          <p className="text-xs text-gray-500">{client.companyName}</p>
                        )}
                      </div>
                      {client.xeroContactId && <XeroBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ClientTypeLabel type={client.clientType} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {client.email || client.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {client.lastChasedAt
                      ? formatDistanceToNow(new Date(client.lastChasedAt), { addSuffix: true })
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      client.chaseEnabled
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {client.chaseEnabled ? "Active" : "Paused"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Client Modal */}
      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onSubmit={(data) => createClient.mutate(data)}
          isLoading={createClient.isPending}
          error={createClient.error?.message}
        />
      )}
    </div>
  );
}

function AddClientModal({ onClose, onSubmit, isLoading, error }: {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Add Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Type</label>
            <select value={form.clientType} onChange={(e) => setForm({ ...form, clientType: e.target.value as typeof form.clientType })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="sole_trader">Sole Trader</option>
              <option value="limited_company">Limited Company</option>
              <option value="partnership">Partnership</option>
              <option value="llp">LLP</option>
              <option value="trust">Trust</option>
              <option value="individual">Individual</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">Cancel</button>
          <button
            onClick={() => onSubmit({
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email || undefined,
              phone: form.phone || undefined,
              clientType: form.clientType,
            })}
            disabled={isLoading || !form.firstName || !form.lastName}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
          >
            {isLoading ? "Adding..." : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}
