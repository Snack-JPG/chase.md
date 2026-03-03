"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusDot } from "@/components/ui/status-dot";
import { EscalationBadge } from "@/components/ui/escalation-badge";
import { ChaseTimeline } from "@/components/ui/chase-timeline";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  Send,
  ExternalLink,
  Copy,
  Pause,
  Play,
  CheckCircle,
  Save,
  X,
  Clock,
  FileUp,
  Calendar,
  Edit3,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getClientTypeConfig,
  getDocumentStatusStyle,
  getEnrollmentStatusStyle,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ---------- Escalation level → numeric ---------- */
const ESCALATION_MAP: Record<string, number> = {
  gentle: 1,
  reminder: 1,
  firm: 2,
  urgent: 3,
  escalate: 4,
  final: 5,
};

/* ---------- Main Page ---------- */
export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const clientQuery = trpc.clients.getById.useQuery({ id: clientId });
  const docsQuery = trpc.documents.listByClient.useQuery({ clientId });
  const messagesQuery = trpc.clients.messages.useQuery({ clientId });
  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => {
      clientQuery.refetch();
      toast.success("Client updated");
    },
  });

  const client = clientQuery.data;
  const documents = docsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];

  if (clientQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-40 w-full rounded-lg" />
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-2">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-[15px] font-medium text-foreground">Client not found</p>
        <Button asChild variant="link" size="sm">
          <Link href="/dashboard/clients">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to clients
          </Link>
        </Button>
      </div>
    );
  }

  const enrollments = client.enrollments ?? [];
  const activeEnrollment = enrollments.find(
    (e) => e.status === "active" || e.status === "pending",
  );
  const clientTypeConfig = getClientTypeConfig(client.clientType);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/dashboard/clients"
          className="text-[13px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All Clients
        </Link>

        {/* Header Card */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground tracking-tight">
                  {client.firstName} {client.lastName}
                </h1>
                <StatusDot
                  status={client.chaseEnabled ? "active" : "paused"}
                  size="md"
                />
                {activeEnrollment && (
                  <EscalationBadge
                    level={activeEnrollment.currentEscalationLevel ?? "gentle"}
                  />
                )}
                {client.xeroContactId && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 ring-1 ring-inset ring-teal-500/20 uppercase tracking-wide">
                    Xero
                  </span>
                )}
              </div>
              {client.companyName && (
                <p className="text-[14px] text-muted-foreground">{client.companyName}</p>
              )}
              <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
                {client.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {client.email}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {client.phone}
                  </span>
                )}
              </div>
              {activeEnrollment && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[13px] text-muted-foreground">
                    {activeEnrollment.completionPercent ?? 0}% complete
                  </span>
                  <div className="w-40 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full animate-progress-fill"
                      style={{ width: `${activeEnrollment.completionPercent ?? 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick actions dropdown */}
            <div className="flex items-center gap-2">
              <Button
                variant={client.chaseEnabled ? "outline" : "default"}
                size="sm"
                onClick={() =>
                  updateClient.mutate({
                    id: clientId,
                    chaseEnabled: !client.chaseEnabled,
                  })
                }
              >
                {client.chaseEnabled ? (
                  <>
                    <Pause className="w-3.5 h-3.5 mr-1.5" />
                    Pause Chase
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Resume Chase
                  </>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toast.info("Send reminder coming soon")}>
                    <Send className="w-3.5 h-3.5 mr-2" />
                    Send Reminder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Portal link coming soon")}>
                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                    Open Portal
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/p/${clientId}`,
                      );
                      toast.success("Portal link copied");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    Copy Portal Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            {documents.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                {documents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            Chase History
            {messages.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                {messages.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contact Info */}
            <div className="rounded-lg border bg-card p-5 space-y-3">
              <h2 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Contact
              </h2>
              <div className="space-y-2.5 text-[13px]">
                {client.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <a
                      href={`mailto:${client.email}`}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      {client.email}
                    </a>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground">{client.phone}</span>
                  </div>
                )}
                {client.whatsappPhone && (
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground">{client.whatsappPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Send className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground capitalize">
                    {client.preferredChannel ?? "whatsapp"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tax Details */}
            <div className="rounded-lg border bg-card p-5 space-y-3">
              <h2 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Details
              </h2>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-foreground">{clientTypeConfig.label}</span>
                </div>
                {client.utr && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UTR</span>
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {client.utr}
                    </span>
                  </div>
                )}
                {client.companyNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Co. Number</span>
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {client.companyNumber}
                    </span>
                  </div>
                )}
                {client.vatNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT</span>
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {client.vatNumber}
                    </span>
                  </div>
                )}
                {client.accountingYearEnd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Year End</span>
                    <span className="text-foreground">{client.accountingYearEnd}</span>
                  </div>
                )}
                {client.externalRef && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ref</span>
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {client.externalRef}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Chase Status */}
            <div className="rounded-lg border bg-card p-5 space-y-3">
              <h2 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Chase Status
              </h2>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={client.chaseEnabled ? "default" : "secondary"}>
                    {client.chaseEnabled ? "Active" : "Paused"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Chased</span>
                  <span className="text-foreground">
                    {client.lastChasedAt
                      ? formatDistanceToNow(new Date(client.lastChasedAt), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Campaigns</span>
                  <span className="font-medium text-foreground">
                    {enrollments.filter((e) => e.status === "active" || e.status === "pending").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium text-foreground">
                    {enrollments.filter((e) => e.status === "completed").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="font-medium text-foreground">{documents.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {Array.isArray(client.tags) && (client.tags as string[]).length > 0 && (
            <div className="flex gap-2 flex-wrap mt-4">
              {(client.tags as string[]).map((tag) => (
                <span
                  key={tag}
                  className="text-[12px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground ring-1 ring-inset ring-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Active Enrollment */}
          {activeEnrollment && (
            <div className="rounded-lg border bg-card p-5 mt-4 space-y-3">
              <h2 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Active Enrollment
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
                <div>
                  <p className="text-muted-foreground mb-0.5">Campaign</p>
                  <p className="font-mono text-[12px] text-foreground">
                    {activeEnrollment.campaignId.slice(0, 8)}&hellip;
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Escalation</p>
                  <EscalationBadge
                    level={activeEnrollment.currentEscalationLevel ?? "gentle"}
                  />
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Chases Sent</p>
                  <p className="font-medium text-foreground">
                    {activeEnrollment.chasesDelivered ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Next Chase</p>
                  <p className="text-foreground">
                    {activeEnrollment.nextChaseAt
                      ? format(new Date(activeEnrollment.nextChaseAt), "dd MMM yyyy")
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Progress value={activeEnrollment.completionPercent ?? 0} className="h-2" />
                <span className="text-[12px] text-muted-foreground font-mono shrink-0">
                  {activeEnrollment.completionPercent ?? 0}%
                </span>
              </div>
            </div>
          )}

          {/* All Enrollments */}
          {enrollments.length > 0 && (
            <div className="mt-4 space-y-3">
              <h2 className="text-[15px] font-semibold text-foreground">
                Campaign Enrollments
              </h2>
              <div className="rounded-lg border bg-card overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[12px] uppercase tracking-wider">
                        Campaign
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[12px] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[12px] uppercase tracking-wider">
                        Escalation
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[12px] uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[12px] uppercase tracking-wider">
                        Next Chase
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {enrollments.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-[12px] text-foreground">
                          {e.campaignId.slice(0, 8)}&hellip;
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] capitalize",
                              getEnrollmentStatusStyle(e.status),
                            )}
                          >
                            {e.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <EscalationBadge
                            level={e.currentEscalationLevel ?? "gentle"}
                            showLabel={false}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${e.completionPercent ?? 0}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {e.completionPercent ?? 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground text-[12px]">
                          {e.nextChaseAt
                            ? format(new Date(e.nextChaseAt), "dd MMM yyyy")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── Documents Tab ─── */}
        <TabsContent value="documents" className="mt-6">
          {documents.length === 0 ? (
            <div className="rounded-lg border bg-card">
              <EmptyState
                icon={FileText}
                title="No documents uploaded yet"
                description="Documents will appear here when the client uploads files via the portal."
              />
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[12px] uppercase tracking-wider">
                      File
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[12px] uppercase tracking-wider">
                      Classification
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[12px] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[12px] uppercase tracking-wider">
                      Xero
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[12px] uppercase tracking-wider">
                      Uploaded
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground truncate max-w-[200px]">
                              {doc.fileName ?? "Unnamed"}
                            </p>
                            {doc.fileSize && (
                              <p className="text-[11px] text-muted-foreground">
                                {(doc.fileSize / 1024).toFixed(0)} KB
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] text-foreground">
                          {doc.aiClassification ??
                            doc.manualClassification ??
                            "Unclassified"}
                        </span>
                        {doc.aiConfidenceLevel && (
                          <span
                            className={cn(
                              "text-[10px] ml-1.5 px-1.5 py-0.5 rounded-full",
                              doc.aiConfidenceLevel === "high"
                                ? "bg-status-active/10 text-status-active"
                                : doc.aiConfidenceLevel === "medium"
                                  ? "bg-status-overdue/10 text-status-overdue"
                                  : "bg-status-critical/10 text-status-critical",
                            )}
                          >
                            {doc.aiConfidenceLevel}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] capitalize",
                            getDocumentStatusStyle(doc.status),
                          )}
                        >
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        {doc.xeroPushStatus === "pushed" ? (
                          <span className="text-[12px] text-teal-400 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Pushed
                          </span>
                        ) : doc.xeroPushStatus === "failed" ? (
                          <span className="text-[12px] text-destructive font-medium">
                            Failed
                          </span>
                        ) : doc.xeroPushStatus === "pending" ? (
                          <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Pending
                          </span>
                        ) : (
                          <span className="text-[12px] text-muted-foreground/50">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-[12px]">
                        {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ─── Chase History Tab ─── */}
        <TabsContent value="history" className="mt-6">
          {messages.length === 0 ? (
            <div className="rounded-lg border bg-card">
              <EmptyState
                icon={Send}
                title="No chase messages sent yet"
                description="Chase messages will appear here as the campaign progresses."
              />
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-5">
              <ChaseTimeline
                steps={messages
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                  )
                  .map((msg, i, arr) => {
                    const numLevel = (ESCALATION_MAP[msg.escalationLevel] ?? 1) as
                      | 1
                      | 2
                      | 3
                      | 4
                      | 5;
                    const isLast = i === arr.length - 1;
                    const isSent = msg.status === "sent" || msg.status === "delivered" || msg.status === "read";
                    const isScheduled = msg.status === "pending" || msg.status === "queued";

                    let deliveryStatus: "delivered" | "opened" | "failed" | "not_opened" | null =
                      null;
                    if (msg.readAt || msg.emailOpenedAt) deliveryStatus = "opened";
                    else if (msg.deliveredAt) deliveryStatus = "delivered";
                    else if (msg.failedAt) deliveryStatus = "failed";
                    else if (isSent) deliveryStatus = "not_opened";

                    return {
                      id: msg.id,
                      level: numLevel,
                      channel: msg.channel as "email" | "sms" | "whatsapp",
                      label: `${msg.channel === "email" ? "Email" : msg.channel === "sms" ? "SMS" : "WhatsApp"} — Chase #${msg.chaseNumber}`,
                      date: msg.sentAt || msg.scheduledFor || msg.createdAt,
                      status: isScheduled
                        ? ("scheduled" as const)
                        : isLast && isSent
                          ? ("current" as const)
                          : ("completed" as const),
                      deliveryStatus,
                      messagePreview: msg.bodyText?.slice(0, 120) ?? null,
                    };
                  })}
              />
            </div>
          )}
        </TabsContent>

        {/* ─── Notes Tab ─── */}
        <TabsContent value="notes" className="mt-6">
          <NotesSection clientId={clientId} initialNotes={client.notes ?? ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Notes Component ---------- */
function NotesSection({
  clientId,
  initialNotes,
}: {
  clientId: string;
  initialNotes: string;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => {
      setEditing(false);
      toast.success("Notes saved");
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-foreground">Notes</h2>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[13px]"
            onClick={() => setEditing(true)}
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="Add notes about this client..."
            className="text-[13px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => updateClient.mutate({ id: clientId, notes })}
              disabled={updateClient.isPending}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {updateClient.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false);
                setNotes(initialNotes);
              }}
            >
              <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-5">
          <p className="text-[13px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {initialNotes || "No notes yet. Click Edit to add some."}
          </p>
        </div>
      )}
    </div>
  );
}
