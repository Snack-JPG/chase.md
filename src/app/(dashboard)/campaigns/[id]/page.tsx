"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  XCircle,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Megaphone,
} from "lucide-react";
import {
  getCampaignStatusStyle,
  getEnrollmentStatusStyle,
  getEscalationStyle,
  getClientTypeConfig,
  formatObligation,
  CHANNEL_OPTIONS,
} from "@/lib/constants";

// ─── Badge ──────────────────────────────────────────────

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset capitalize ${colorClass}`} role="status">
      {label}
    </span>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const campaignQuery = trpc.campaigns.getById.useQuery({ id: campaignId });
  const updateStatus = trpc.campaigns.updateStatus.useMutation({
    onSuccess: () => campaignQuery.refetch(),
  });

  const campaign = campaignQuery.data;

  // ─── Loading ──────────────────────────────────────────────
  if (campaignQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
        <div className="skeleton h-64 w-full rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  // ─── Not Found ──────────────────────────────────────────────
  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-14 h-14 rounded-full bg-surface-inset flex items-center justify-center mb-2">
          <Megaphone className="w-6 h-6 text-text-muted" />
        </div>
        <p className="text-[15px] font-medium text-text-primary">Campaign not found</p>
        <Link
          href="/dashboard/campaigns"
          className="text-[13px] text-accent hover:text-accent-hover flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to campaigns
        </Link>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────
  if (campaignQuery.isError) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/campaigns"
          className="text-[13px] text-text-muted hover:text-text-secondary inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All Campaigns
        </Link>
        <div className="bg-danger-light border border-red-200 text-danger text-[13px] rounded-[var(--radius-md)] px-4 py-3">
          Failed to load campaign. {campaignQuery.error?.message}
        </div>
      </div>
    );
  }

  // ─── Computed Stats ──────────────────────────────────────────────
  const enrollments = campaign.enrollments ?? [];
  const totalCount = enrollments.length;
  const completedCount = enrollments.filter((e) => e.status === "completed").length;
  const activeCount = enrollments.filter((e) => e.status === "active").length;
  const pendingCount = enrollments.filter((e) => e.status === "pending").length;
  const channels = (campaign.channels as string[]) ?? [];

  const stats = [
    { label: "Total", value: totalCount, icon: Users, color: "text-text-primary" },
    { label: "Completed", value: completedCount, icon: CheckCircle2, color: "text-success" },
    { label: "In Progress", value: activeCount, icon: Clock, color: "text-accent" },
    { label: "Not Started", value: pendingCount, icon: AlertCircle, color: "text-text-muted" },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/campaigns"
        className="text-[13px] text-text-muted hover:text-text-secondary inline-flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">{campaign.name}</h1>
            <Badge label={campaign.status} colorClass={getCampaignStatusStyle(campaign.status)} />
          </div>
          <p className="text-[14px] text-text-secondary mt-0.5">
            {formatObligation(campaign.taxObligation)} &middot; {campaign.taxYear}
            {campaign.deadlineDate && (
              <> &middot; Deadline {format(new Date(campaign.deadlineDate), "dd MMM yyyy")}</>
            )}
          </p>
          {campaign.description && (
            <p className="text-[13px] text-text-muted mt-1.5">{campaign.description}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0">
          {campaign.status === "draft" && (
            <>
              <button
                onClick={() => updateStatus.mutate({ id: campaignId, status: "active" })}
                disabled={updateStatus.isPending || totalCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover text-[13px] font-medium transition-colors disabled:opacity-50 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                {updateStatus.isPending ? "Launching..." : "Launch"}
              </button>
            </>
          )}
          {campaign.status === "active" && (
            <>
              <button
                onClick={() => updateStatus.mutate({ id: campaignId, status: "paused" })}
                disabled={updateStatus.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-raised border border-border text-text-secondary rounded-[var(--radius-md)] hover:bg-surface-inset text-[13px] font-medium transition-colors disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
              <button
                onClick={() => updateStatus.mutate({ id: campaignId, status: "cancelled" })}
                disabled={updateStatus.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-danger-light text-danger rounded-[var(--radius-md)] hover:bg-red-100 text-[13px] font-medium transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel
              </button>
            </>
          )}
          {campaign.status === "paused" && (
            <>
              <button
                onClick={() => updateStatus.mutate({ id: campaignId, status: "active" })}
                disabled={updateStatus.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover text-[13px] font-medium transition-colors disabled:opacity-50 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                {updateStatus.isPending ? "Resuming..." : "Resume"}
              </button>
              <button
                onClick={() => updateStatus.mutate({ id: campaignId, status: "cancelled" })}
                disabled={updateStatus.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-danger-light text-danger rounded-[var(--radius-md)] hover:bg-red-100 text-[13px] font-medium transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mutation error */}
      {updateStatus.isError && (
        <div className="bg-danger-light border border-red-200 text-danger text-[13px] rounded-[var(--radius-md)] px-4 py-3">
          {updateStatus.error?.message}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-4"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={`text-[24px] font-semibold ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Enrolled clients table */}
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-text-primary">Enrolled Clients</h2>
        {enrollments.length === 0 ? (
          <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-[13px] text-text-muted">No clients enrolled yet.</p>
            {campaign.status === "draft" && (
              <p className="text-[12px] text-text-muted mt-1">Create a new campaign with the wizard to enroll clients.</p>
            )}
          </div>
        ) : (
          <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-inset/50">
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Escalation</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Chases</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Progress</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Next Chase</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Last Chased</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {enrollments.map((enrollment) => {
                  const client = enrollment.client;
                  const typeConfig = getClientTypeConfig(client.clientType);
                  return (
                    <tr
                      key={enrollment.id}
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
                        <div>
                          <p className="font-medium text-text-primary">
                            {client.firstName} {client.lastName}
                          </p>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          label={enrollment.status.replace("_", " ")}
                          colorClass={getEnrollmentStatusStyle(enrollment.status)}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          label={enrollment.currentEscalationLevel ?? "gentle"}
                          colorClass={getEscalationStyle(enrollment.currentEscalationLevel ?? "gentle")}
                        />
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary font-mono text-[12px]">
                        {enrollment.chasesDelivered ?? 0} / {campaign.maxChases ?? 6}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-surface-inset rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all duration-500"
                              style={{ width: `${enrollment.completionPercent ?? 0}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-text-muted">{enrollment.completionPercent ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-text-muted text-[12px]">
                        {enrollment.nextChaseAt
                          ? format(new Date(enrollment.nextChaseAt), "dd MMM yyyy")
                          : <span>&mdash;</span>}
                      </td>
                      <td className="px-4 py-3.5 text-text-muted text-[12px]">
                        {enrollment.lastChasedAt
                          ? formatDistanceToNow(new Date(enrollment.lastChasedAt), { addSuffix: true })
                          : <span>&mdash;</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Campaign Settings */}
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-text-primary">Campaign Settings</h2>
        <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[13px]">
            <div>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block mb-1">Channels</span>
              <span className="text-text-primary capitalize">
                {channels.length > 0
                  ? channels.map((c) => CHANNEL_OPTIONS.find((o) => o.value === c)?.label ?? c).join(", ")
                  : "Email"}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block mb-1">Days Between</span>
              <span className="font-mono text-[12px] text-text-primary">{campaign.chaseDaysBetween ?? 7}</span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block mb-1">Max Chases</span>
              <span className="font-mono text-[12px] text-text-primary">{campaign.maxChases ?? 6}</span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block mb-1">Escalate After</span>
              <span className="font-mono text-[12px] text-text-primary">Chase #{campaign.escalateAfterChase ?? 4}</span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block mb-1">Grace Period</span>
              <span className="font-mono text-[12px] text-text-primary">{campaign.gracePeriodDays ?? 14} days</span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block mb-1">Skip Weekends</span>
              <span className="text-text-primary">{campaign.skipWeekends ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
