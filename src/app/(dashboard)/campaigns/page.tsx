"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Megaphone,
} from "lucide-react";
import { getCampaignStatusStyle, formatObligation } from "@/lib/constants";
import { CreateCampaignModal } from "@/components/create-campaign-modal";

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset capitalize ${getCampaignStatusStyle(status)}`} role="status">
      {status}
    </span>
  );
}

export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false);

  const campaignsQuery = trpc.campaigns.list.useInfiniteQuery(
    { limit: 50 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      campaignsQuery.refetch();
      setShowCreate(false);
    },
  });

  const campaigns = campaignsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">Campaigns</h1>
          <p className="text-[13px] text-text-muted mt-0.5">
            Chase groups of clients for specific documents.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover text-[13px] font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {campaignsQuery.isError && (
        <div className="bg-danger-light border border-red-200 text-danger text-[13px] rounded-[var(--radius-md)] px-4 py-3">
          Failed to load campaigns. {campaignsQuery.error?.message}
        </div>
      )}

      {/* Campaign list */}
      {campaignsQuery.isLoading ? (
        <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-14 w-full" />
            ))}
          </div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-12 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="w-14 h-14 rounded-full bg-surface-inset flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-6 h-6 text-text-muted" />
          </div>
          <p className="text-[15px] font-medium text-text-primary">No campaigns yet</p>
          <p className="text-[13px] text-text-muted mt-1.5 max-w-md mx-auto">
            A campaign lets you chase a group of clients for their documents.
            For example: &quot;2024/25 Self Assessment &mdash; chase all sole traders for P60s, bank statements, and expenses.&quot;
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-[var(--radius-md)] text-[13px] font-medium hover:bg-accent-hover transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Your First Campaign
          </button>
        </div>
      ) : (
        <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-inset/50">
                <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Tax Year</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Obligation</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Progress</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((c) => {
                const completion = c.totalEnrollments
                  ? Math.round(((c.completedEnrollments ?? 0) / c.totalEnrollments) * 100)
                  : 0;
                return (
                  <tr key={c.id} className="hover:bg-surface-inset/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3.5 font-medium text-text-primary">{c.name}</td>
                    <td className="px-4 py-3.5 text-text-secondary font-mono text-[12px]">{c.taxYear}</td>
                    <td className="px-4 py-3.5 text-text-secondary">{formatObligation(c.taxObligation)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 h-1.5 bg-surface-inset rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all duration-500"
                            style={{ width: `${completion}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-text-muted w-8 text-right">{completion}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3.5 text-text-muted">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Load more */}
      {campaignsQuery.hasNextPage && (
        <div className="flex justify-center">
          <button
            onClick={() => campaignsQuery.fetchNextPage()}
            disabled={campaignsQuery.isFetchingNextPage}
            className="px-4 py-2.5 bg-surface-raised border border-border text-text-secondary rounded-[var(--radius-md)] hover:bg-surface-inset text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {campaignsQuery.isFetchingNextPage ? "Loading..." : "Load more campaigns"}
          </button>
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
