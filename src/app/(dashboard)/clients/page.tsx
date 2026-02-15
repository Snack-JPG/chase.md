"use client";

import { useState } from "react";

// TODO: Wire up to tRPC once DB is connected
// import { trpc } from "@/lib/trpc-client";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  clientType: string;
  chaseEnabled: boolean;
  lastChasedAt?: string;
}

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

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const clients: Client[] = []; // TODO: from tRPC

  const filtered = clients.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.companyName || ""} ${c.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">{clients.length} total clients</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
            Import CSV
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium">
            Add Client
          </button>
        </div>
      </div>

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
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-lg font-medium text-gray-700">No clients yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Import from a CSV, connect Xero/Sage, or add clients manually.
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm">
              Add Your First Client
            </button>
          </div>
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
                    <p className="font-medium">{client.firstName} {client.lastName}</p>
                    {client.companyName && (
                      <p className="text-xs text-gray-500">{client.companyName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ClientTypeLabel type={client.clientType} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {client.email || client.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {client.lastChasedAt || "Never"}
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
    </div>
  );
}
