"use client";

import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";

function StatCard({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{loading ? "…" : value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const stats = trpc.dashboard.stats.useQuery();
  const campaigns = trpc.dashboard.recentCampaigns.useQuery();
  const activity = trpc.dashboard.recentActivity.useQuery();
  const attention = trpc.dashboard.clientsNeedingAttention.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back. Here&apos;s what&apos;s happening.</p>
        </div>
        <a
          href="/dashboard/campaigns"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium"
        >
          New Campaign
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Active Campaigns" value={String(stats.data?.activeCampaigns ?? 0)} loading={stats.isLoading} />
        <StatCard label="Documents Received" value={String(stats.data?.docsReceived ?? 0)} loading={stats.isLoading} />
        <StatCard label="Chases Sent (30d)" value={String(stats.data?.chasesSent30d ?? 0)} loading={stats.isLoading} />
        <StatCard label="Avg Completion Rate" value={stats.data ? `${stats.data.avgCompletionRate}%` : "—"} loading={stats.isLoading} />
      </div>

      {stats.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          Failed to load dashboard data. {stats.error?.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active campaigns */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Active Campaigns</h2>
          {campaigns.isLoading ? (
            <p className="text-sm text-gray-400 py-4">Loading...</p>
          ) : !campaigns.data?.length ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-lg">No campaigns yet</p>
              <p className="text-sm mt-1">Create your first campaign to start chasing.</p>
            </div>
          ) : (
            <div>
              {campaigns.data.map((c) => {
                const completion = c.totalEnrollments
                  ? Math.round(((c.completedEnrollments ?? 0) / c.totalEnrollments) * 100)
                  : 0;
                return (
                  <div key={c.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.taxYear} · {c.taxObligation.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${completion}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{completion}%</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === "active" ? "bg-green-100 text-green-700" :
                        c.status === "completed" ? "bg-gray-100 text-gray-600" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {activity.isLoading ? (
            <p className="text-sm text-gray-400 py-4">Loading...</p>
          ) : !activity.data?.length ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {activity.data.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    a.type === "doc_uploaded" ? "bg-green-400" : "bg-blue-400"
                  }`} />
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{a.clientName}</span>{" "}
                      {a.description}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(a.time), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clients needing attention */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-gray-900 mb-4">⚠️ Clients Needing Attention</h2>
        {attention.isLoading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : !attention.data?.length ? (
          <p className="text-sm text-gray-500">
            No clients need attention right now. Clients who haven&apos;t responded after 3+ chases will appear here.
          </p>
        ) : (
          <div className="divide-y">
            {attention.data.map((a) => (
              <div key={a.clientId} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{a.clientName}</p>
                  <p className="text-xs text-gray-500">{a.campaignName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{a.chasesDelivered} chases</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.escalationLevel === "urgent" || a.escalationLevel === "escalate"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {a.escalationLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
