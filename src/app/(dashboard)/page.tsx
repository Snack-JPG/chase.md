import { Suspense } from "react";

function StatCard({ label, value, change }: { label: string; value: string; change?: string }) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {change && <p className="text-xs text-green-600 mt-1">{change}</p>}
    </div>
  );
}

function CampaignRow({ name, status, completion, chasesSent }: {
  name: string; status: string; completion: number; chasesSent: number;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div>
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-gray-500">{chasesSent} chases sent</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full"
            style={{ width: `${completion}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-8 text-right">{completion}%</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          status === "active" ? "bg-green-100 text-green-700" :
          status === "completed" ? "bg-gray-100 text-gray-600" :
          "bg-amber-100 text-amber-700"
        }`}>
          {status}
        </span>
      </div>
    </div>
  );
}

function RecentActivity({ action, client, time }: { action: string; client: string; time: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 shrink-0" />
      <div>
        <p className="text-sm text-gray-700">
          <span className="font-medium">{client}</span> {action}
        </p>
        <p className="text-xs text-gray-400">{time}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  // TODO: Replace with real data from tRPC queries
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
        <StatCard label="Active Campaigns" value="0" />
        <StatCard label="Documents Received" value="0" />
        <StatCard label="Chases Sent (30d)" value="0" />
        <StatCard label="Avg Completion Rate" value="—" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active campaigns */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Active Campaigns</h2>
          <div className="text-center py-8 text-gray-400">
            <p className="text-lg">No campaigns yet</p>
            <p className="text-sm mt-1">Create your first campaign to start chasing.</p>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No activity yet</p>
          </div>
        </div>
      </div>

      {/* Clients needing attention */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-gray-900 mb-4">⚠️ Clients Needing Attention</h2>
        <p className="text-sm text-gray-500">
          Clients who haven&apos;t responded after 3+ chases will appear here.
        </p>
      </div>
    </div>
  );
}
