"use client";

import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  Megaphone,
  FileCheck,
  Send,
  TrendingUp,
  ArrowRight,
  FileUp,
  MessageSquare,
  AlertTriangle,
  Plus,
} from "lucide-react";
import {
  getCampaignStatusStyle,
  getEscalationStyle,
  formatObligation,
} from "@/lib/constants";

/* ---------- Stat Card ---------- */
function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  loading?: boolean;
  accent: string;
}) {
  return (
    <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-5 card-hover" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-text-secondary">{label}</p>
          {loading ? (
            <div className="skeleton h-8 w-16 mt-1.5" />
          ) : (
            <p className="text-[28px] font-semibold tracking-tight mt-0.5 text-text-primary">{value}</p>
          )}
        </div>
        <div className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center ${accent}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Section Header ---------- */
function SectionHeader({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className="text-[13px] font-medium text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
        >
          {action.label} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ---------- Status badge ---------- */
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${getCampaignStatusStyle(status)}`} role="status">
      {status}
    </span>
  );
}

/* ---------- Escalation badge ---------- */
function EscalationBadge({ level }: { level: string }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${getEscalationStyle(level)}`} role="status">
      {level}
    </span>
  );
}

/* ---------- Main Page ---------- */
export default function DashboardPage() {
  const stats = trpc.dashboard.stats.useQuery();
  const campaigns = trpc.dashboard.recentCampaigns.useQuery();
  const activity = trpc.dashboard.recentActivity.useQuery();
  const attention = trpc.dashboard.clientsNeedingAttention.useQuery();

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-text-muted mt-0.5">Your practice at a glance.</p>
        </div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover text-[13px] font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Campaigns"
          value={String(stats.data?.activeCampaigns ?? 0)}
          icon={Megaphone}
          loading={stats.isLoading}
          accent="bg-accent-subtle text-accent"
        />
        <StatCard
          label="Documents Received"
          value={String(stats.data?.docsReceived ?? 0)}
          icon={FileCheck}
          loading={stats.isLoading}
          accent="bg-success-light text-success"
        />
        <StatCard
          label="Chases Sent (30d)"
          value={String(stats.data?.chasesSent30d ?? 0)}
          icon={Send}
          loading={stats.isLoading}
          accent="bg-info-light text-info"
        />
        <StatCard
          label="Avg Completion"
          value={stats.data ? `${stats.data.avgCompletionRate}%` : "0%"}
          icon={TrendingUp}
          loading={stats.isLoading}
          accent="bg-warning-light text-warning"
        />
      </div>

      {/* Error state */}
      {stats.isError && (
        <div className="bg-danger-light border border-red-200 text-danger text-[13px] rounded-[var(--radius-md)] px-4 py-3">
          Failed to load dashboard data. {stats.error?.message}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Active campaigns — wider */}
        <div className="lg:col-span-3 bg-surface-raised rounded-[var(--radius-lg)] border border-border p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <SectionHeader title="Active Campaigns" action={{ label: "View all", href: "/dashboard/campaigns" }} />

          {campaigns.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-14 w-full" />
              ))}
            </div>
          ) : !campaigns.data?.length ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-surface-inset flex items-center justify-center mx-auto mb-3">
                <Megaphone className="w-5 h-5 text-text-muted" />
              </div>
              <p className="text-[14px] font-medium text-text-secondary">No campaigns yet</p>
              <p className="text-[13px] text-text-muted mt-1">Create your first campaign to start chasing documents.</p>
              <Link
                href="/dashboard/campaigns"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-accent text-white rounded-[var(--radius-md)] text-[13px] font-medium hover:bg-accent-hover transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Campaign
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {campaigns.data.map((c) => {
                const completion = c.totalEnrollments
                  ? Math.round(((c.completedEnrollments ?? 0) / c.totalEnrollments) * 100)
                  : 0;
                return (
                  <div key={c.id} className="flex items-center justify-between py-3 px-3 -mx-3 rounded-[var(--radius-md)] hover:bg-surface-inset transition-colors group">
                    <div className="min-w-0 flex-1 mr-4">
                      <p className="text-[13px] font-medium text-text-primary truncate">{c.name}</p>
                      <p className="text-[12px] text-text-muted mt-0.5">
                        {c.taxYear} &middot; {formatObligation(c.taxObligation)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-surface-inset rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all duration-500"
                            style={{ width: `${completion}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-text-muted w-8 text-right">{completion}%</span>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent activity — narrower */}
        <div className="lg:col-span-2 bg-surface-raised rounded-[var(--radius-lg)] border border-border p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <SectionHeader title="Recent Activity" />

          {activity.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : !activity.data?.length ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-surface-inset flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-text-muted" />
              </div>
              <p className="text-[13px] text-text-muted">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {activity.data.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 px-2 -mx-2 rounded-[var(--radius-sm)] hover:bg-surface-inset transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    a.type === "doc_uploaded"
                      ? "bg-success-light text-success"
                      : "bg-info-light text-info"
                  }`}>
                    {a.type === "doc_uploaded"
                      ? <FileUp className="w-3.5 h-3.5" />
                      : <Send className="w-3.5 h-3.5" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-text-primary leading-snug">
                      <span className="font-medium">{a.clientName}</span>{" "}
                      <span className="text-text-secondary">{a.description}</span>
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
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
      <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <SectionHeader
          title="Clients Needing Attention"
          action={attention.data?.length ? { label: "View clients", href: "/dashboard/clients" } : undefined}
        />

        {attention.isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-14 w-full" />
            ))}
          </div>
        ) : !attention.data?.length ? (
          <div className="flex items-center gap-3 py-4 px-4 bg-success-light/50 rounded-[var(--radius-md)]">
            <div className="w-8 h-8 rounded-full bg-success-light flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-text-primary">All clear</p>
              <p className="text-[12px] text-text-secondary">No clients need attention right now. Clients with 3+ unanswered chases will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {attention.data.map((a) => (
              <Link
                key={a.clientId}
                href={`/dashboard/clients/${a.clientId}`}
                className="flex items-center justify-between py-3 px-3 -mx-3 rounded-[var(--radius-md)] hover:bg-surface-inset transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-warning-light flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-text-primary group-hover:text-accent transition-colors">{a.clientName}</p>
                    <p className="text-[12px] text-text-muted">{a.campaignName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[12px] text-text-muted font-mono">{a.chasesDelivered} chases</span>
                  <EscalationBadge level={a.escalationLevel ?? "reminder"} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
