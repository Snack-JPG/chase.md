"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { CsvImportModal } from "@/components/csv-import-modal";
import { AddClientModal } from "@/components/add-client-modal";
import {
  Search,
  Upload,
  Plus,
  Users,
  RefreshCw,
  X,
} from "lucide-react";
import { getClientTypeConfig } from "@/lib/constants";

function ClientTypeBadge({ type }: { type: string }) {
  const config = getClientTypeConfig(type);
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${config.color}`}>
      {config.label}
    </span>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const clientsQuery = trpc.clients.list.useInfiniteQuery(
    { limit: 50 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
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

  const clients = clientsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = clients.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.companyName || ""} ${c.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {syncToast && (
        <div className="fixed top-4 right-4 z-50 bg-surface-raised border border-border shadow-lg rounded-[var(--radius-md)] px-4 py-3 text-[13px] flex items-center gap-2" style={{ boxShadow: "var(--shadow-card-hover)" }}>
          <RefreshCw className="w-4 h-4 text-accent" />
          {syncToast}
          <button onClick={() => setSyncToast(null)} aria-label="Dismiss notification" className="text-text-muted hover:text-text-secondary ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">Clients</h1>
          <p className="text-[13px] text-text-muted mt-0.5">
            {clientsQuery.isLoading ? "Loading..." : `${clients.length} total clients`}
            {syncStatus.data?.lastSyncAt && (
              <span className="ml-1.5">
                &middot; Synced {formatDistanceToNow(new Date(syncStatus.data.lastSyncAt), { addSuffix: true })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {syncStatus.data?.connected && (
            <button
              onClick={() => syncFromXero.mutate()}
              disabled={syncFromXero.isPending}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-teal-600 text-white rounded-[var(--radius-md)] hover:bg-teal-700 text-[13px] font-medium disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncFromXero.isPending ? "animate-spin" : ""}`} />
              {syncFromXero.isPending ? "Syncing..." : "Sync Xero"}
            </button>
          )}
          <button
            onClick={() => setShowCsvImport(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface-raised border border-border text-text-secondary rounded-[var(--radius-md)] hover:bg-surface-inset text-[13px] font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover text-[13px] font-medium transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Client
          </button>
        </div>
      </div>

      {clientsQuery.isError && (
        <div className="bg-danger-light border border-red-200 text-danger text-[13px] rounded-[var(--radius-md)] px-4 py-3">
          Failed to load clients. {clientsQuery.error?.message}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search by name, company, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search clients"
          className="w-full pl-10 pr-4 py-2.5 bg-surface-raised border border-border rounded-[var(--radius-md)] text-[13px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
        />
      </div>

      {/* Table */}
      {clientsQuery.isLoading ? (
        <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-12 w-full" />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-12 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="w-14 h-14 rounded-full bg-surface-inset flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-text-muted" />
          </div>
          <p className="text-[15px] font-medium text-text-primary">
            {search ? "No clients match your search" : "No clients yet"}
          </p>
          {!search && (
            <>
              <p className="text-[13px] text-text-muted mt-1.5 max-w-sm mx-auto">
                Import from a CSV, connect Xero, or add clients manually to get started.
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-[var(--radius-md)] text-[13px] font-medium hover:bg-accent-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Client
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-inset/50">
                <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Last Chased</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-surface-inset/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                  tabIndex={0}
                  role="link"
                  aria-label={`View ${client.firstName} ${client.lastName}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/dashboard/clients/${client.id}`);
                    }
                  }}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-text-primary">{client.firstName} {client.lastName}</p>
                        {client.companyName && (
                          <p className="text-[12px] text-text-muted mt-0.5">{client.companyName}</p>
                        )}
                      </div>
                      {client.xeroContactId && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200 uppercase tracking-wide">
                          Xero
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <ClientTypeBadge type={client.clientType} />
                  </td>
                  <td className="px-4 py-3.5 text-text-secondary">
                    {client.email || client.phone || <span className="text-text-muted">&mdash;</span>}
                  </td>
                  <td className="px-4 py-3.5 text-text-secondary">
                    {client.lastChasedAt
                      ? formatDistanceToNow(new Date(client.lastChasedAt), { addSuffix: true })
                      : <span className="text-text-muted">Never</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${
                      client.chaseEnabled
                        ? "bg-success-light text-success ring-green-200"
                        : "bg-stone-100 text-stone-500 ring-stone-200"
                    }`} role="status">
                      {client.chaseEnabled ? "Active" : "Paused"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Load more */}
      {clientsQuery.hasNextPage && (
        <div className="flex justify-center">
          <button
            onClick={() => clientsQuery.fetchNextPage()}
            disabled={clientsQuery.isFetchingNextPage}
            className="px-4 py-2.5 bg-surface-raised border border-border text-text-secondary rounded-[var(--radius-md)] hover:bg-surface-inset text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {clientsQuery.isFetchingNextPage ? "Loading..." : "Load more clients"}
          </button>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvImport && (
        <CsvImportModal
          onClose={() => setShowCsvImport(false)}
          onSuccess={() => clientsQuery.refetch()}
        />
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
