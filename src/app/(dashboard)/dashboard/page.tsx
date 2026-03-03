"use client";

import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  Megaphone,
  AlertTriangle,
  ArrowRight,
  FileUp,
  Send,
  FileCheck,
  MessageSquare,
  Plus,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusDot, getClientStatus } from "@/components/ui/status-dot";
import { EscalationBadge } from "@/components/ui/escalation-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/* ---------- Section Header ---------- */
function SectionHeader({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className="text-[13px] font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          {action.label} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ---------- Main Page ---------- */
export default function DashboardPage() {
  const stats = trpc.dashboard.stats.useQuery();
  const campaigns = trpc.dashboard.recentCampaigns.useQuery();
  const activity = trpc.dashboard.recentActivity.useQuery();
  const attention = trpc.dashboard.clientsNeedingAttention.useQuery();

  const greeting = getGreeting();

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">{greeting}</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/campaigns/new">
            <Plus className="w-4 h-4 mr-1.5" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Campaigns"
          value={stats.data?.activeCampaigns ?? 0}
          icon={Megaphone}
          loading={stats.isLoading}
          variant="default"
        />
        <StatCard
          label="Documents Received"
          value={stats.data?.docsReceived ?? 0}
          icon={FileCheck}
          loading={stats.isLoading}
          variant="success"
        />
        <StatCard
          label="Chases Sent (30d)"
          value={stats.data?.chasesSent30d ?? 0}
          icon={Send}
          loading={stats.isLoading}
          variant="info"
        />
        <StatCard
          label="Avg Completion"
          value={stats.data?.avgCompletionRate ?? 0}
          icon={AlertTriangle}
          loading={stats.isLoading}
          variant="warning"
          suffix="%"
        />
      </div>

      {/* Error state */}
      {stats.isError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[13px] rounded-lg px-4 py-3">
          Failed to load dashboard data. {stats.error?.message}
        </div>
      )}

      {/* Needs Attention */}
      <div className="rounded-lg border bg-card shadow-[var(--shadow-card)]">
        <div className="p-5">
          <SectionHeader
            title="Needs Attention"
            action={attention.data?.length ? { label: "View all clients", href: "/dashboard/clients" } : undefined}
          />

          {attention.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-14 w-full" />
              ))}
            </div>
          ) : !attention.data?.length ? (
            <div className="flex items-center gap-3 py-4 px-4 bg-status-active/5 rounded-lg border border-status-active/10">
              <div className="w-8 h-8 rounded-full bg-status-active/10 flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-status-active" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">All clear</p>
                <p className="text-[12px] text-muted-foreground">No clients need attention right now.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {attention.data.map((a) => (
                <Link
                  key={a.clientId}
                  href={`/dashboard/clients/${a.clientId}`}
                  className="flex items-center justify-between py-3 px-3 -mx-3 rounded-md hover:bg-accent transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <StatusDot status="overdue" />
                    <div>
                      <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                        {a.clientName}
                      </p>
                      <p className="text-[12px] text-muted-foreground">{a.campaignName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[12px] text-muted-foreground font-mono">{a.chasesDelivered} chases</span>
                    <EscalationBadge level={a.escalationLevel ?? "reminder"} showLabel={false} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout: Campaigns + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Active campaigns */}
        <div className="lg:col-span-3 rounded-lg border bg-card shadow-[var(--shadow-card)]">
          <div className="p-5">
            <SectionHeader title="Active Campaigns" action={{ label: "View all", href: "/dashboard/campaigns" }} />

            {campaigns.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-14 w-full" />
                ))}
              </div>
            ) : !campaigns.data?.length ? (
              <EmptyState
                icon={Megaphone}
                title="No campaigns yet"
                description="Create your first campaign to start chasing documents."
                action={{ label: "Create Campaign", href: "/dashboard/campaigns/new" }}
              />
            ) : (
              <div className="space-y-1">
                {campaigns.data.map((c) => {
                  const completion = c.totalEnrollments
                    ? Math.round(((c.completedEnrollments ?? 0) / c.totalEnrollments) * 100)
                    : 0;
                  return (
                    <Link
                      key={c.id}
                      href={`/dashboard/campaigns/${c.id}`}
                      className="flex items-center justify-between py-3 px-3 -mx-3 rounded-md hover:bg-accent transition-colors group"
                    >
                      <div className="min-w-0 flex-1 mr-4">
                        <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {c.name}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          {c.totalEnrollments ?? 0} clients &middot; {c.completedEnrollments ?? 0} complete
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2 w-32">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full animate-progress-fill"
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
                            {completion}%
                          </span>
                        </div>
                        <Badge
                          variant={c.status === "active" ? "default" : "secondary"}
                          className="text-[11px] capitalize"
                        >
                          {c.status}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2 rounded-lg border bg-card shadow-[var(--shadow-card)]">
          <div className="p-5">
            <SectionHeader title="Recent Activity" />

            {activity.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton h-12 w-full" />
                ))}
              </div>
            ) : !activity.data?.length ? (
              <EmptyState
                icon={MessageSquare}
                title="No activity yet"
                description="Activity will appear here as clients respond to chases."
              />
            ) : (
              <div className="space-y-0.5">
                {activity.data.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2.5 px-2 -mx-2 rounded-md hover:bg-accent transition-colors"
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      a.type === "doc_uploaded" ? "bg-status-active/10 text-status-active" : "bg-primary/10 text-primary"
                    )}>
                      {a.type === "doc_uploaded" ? <FileUp className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-foreground leading-snug">
                        <span className="font-medium">{a.clientName}</span>{" "}
                        <span className="text-muted-foreground">{a.description}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(a.time), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
