"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  Send,
  Edit3,
  Save,
  X,
} from "lucide-react";
import {
  getClientTypeConfig,
  getEscalationStyle,
  getDocumentStatusStyle,
  getMessageStatusStyle,
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

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const clientQuery = trpc.clients.getById.useQuery({ id: clientId });
  const docsQuery = trpc.documents.listByClient.useQuery({ clientId });
  const messagesQuery = trpc.clients.messages.useQuery({ clientId });
  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => clientQuery.refetch(),
  });

  const client = clientQuery.data;
  const documents = docsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];

  if (clientQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-44 w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-14 h-14 rounded-full bg-surface-inset flex items-center justify-center mb-2">
          <FileText className="w-6 h-6 text-text-muted" />
        </div>
        <p className="text-[15px] font-medium text-text-primary">Client not found</p>
        <Link
          href="/dashboard/clients"
          className="text-[13px] text-accent hover:text-accent-hover flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to clients
        </Link>
      </div>
    );
  }

  const enrollments = client.enrollments ?? [];
  const activeEnrollments = enrollments.filter((e) => e.status === "active" || e.status === "pending");
  const completedEnrollments = enrollments.filter((e) => e.status === "completed");
  const clientTypeConfig = getClientTypeConfig(client.clientType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/clients"
            className="text-[13px] text-text-muted hover:text-text-secondary inline-flex items-center gap-1.5 mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All Clients
          </Link>
          <h1 className="text-[22px] font-semibold text-text-primary tracking-tight flex items-center gap-3">
            {client.firstName} {client.lastName}
            {client.xeroContactId && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200 uppercase tracking-wide">
                Xero
              </span>
            )}
          </h1>
          {client.companyName && (
            <p className="text-[14px] text-text-secondary mt-0.5">{client.companyName}</p>
          )}
        </div>
        <button
          onClick={() => updateClient.mutate({ id: clientId, chaseEnabled: !client.chaseEnabled })}
          className={`px-4 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-colors ${
            client.chaseEnabled
              ? "bg-surface-inset text-text-secondary hover:bg-border"
              : "bg-accent text-white hover:bg-accent-hover shadow-sm"
          }`}
        >
          {client.chaseEnabled ? "Pause Chasing" : "Enable Chasing"}
        </button>
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contact Info */}
        <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-5 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Contact</h2>
          <div className="space-y-2.5 text-[13px]">
            {client.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-text-muted" />
                <a href={`mailto:${client.email}`} className="text-accent hover:text-accent-hover transition-colors">{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-text-primary">{client.phone}</span>
              </div>
            )}
            {client.whatsappPhone && (
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-text-primary">{client.whatsappPhone}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <Send className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-text-primary capitalize">{client.preferredChannel ?? "whatsapp"}</span>
            </div>
          </div>
        </div>

        {/* Tax Details */}
        <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-5 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Details</h2>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-text-muted">Type</span>
              <span className="font-medium text-text-primary">{clientTypeConfig.label}</span>
            </div>
            {client.utr && (
              <div className="flex justify-between">
                <span className="text-text-muted">UTR</span>
                <span className="font-mono text-[12px] text-text-secondary">{client.utr}</span>
              </div>
            )}
            {client.companyNumber && (
              <div className="flex justify-between">
                <span className="text-text-muted">Co. Number</span>
                <span className="font-mono text-[12px] text-text-secondary">{client.companyNumber}</span>
              </div>
            )}
            {client.vatNumber && (
              <div className="flex justify-between">
                <span className="text-text-muted">VAT</span>
                <span className="font-mono text-[12px] text-text-secondary">{client.vatNumber}</span>
              </div>
            )}
            {client.accountingYearEnd && (
              <div className="flex justify-between">
                <span className="text-text-muted">Year End</span>
                <span className="text-text-primary">{client.accountingYearEnd}</span>
              </div>
            )}
            {client.externalRef && (
              <div className="flex justify-between">
                <span className="text-text-muted">Ref</span>
                <span className="font-mono text-[12px] text-text-secondary">{client.externalRef}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chase Status */}
        <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-5 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Chase Status</h2>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Status</span>
              <Badge
                label={client.chaseEnabled ? "Active" : "Paused"}
                colorClass={client.chaseEnabled ? "bg-success-light text-success ring-green-200" : "bg-stone-100 text-stone-500 ring-stone-200"}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Last Chased</span>
              <span className="text-text-primary">{client.lastChasedAt ? formatDistanceToNow(new Date(client.lastChasedAt), { addSuffix: true }) : "Never"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Active Campaigns</span>
              <span className="font-medium text-text-primary">{activeEnrollments.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Completed</span>
              <span className="font-medium text-text-primary">{completedEnrollments.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Documents</span>
              <span className="font-medium text-text-primary">{documents.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {Array.isArray(client.tags) && client.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(client.tags as string[]).map((tag) => (
            <span key={tag} className="text-[12px] px-2.5 py-1 rounded-full bg-surface-inset text-text-secondary ring-1 ring-inset ring-border">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Enrollments */}
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-text-primary">Campaign Enrollments</h2>
        {enrollments.length === 0 ? (
          <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-[13px] text-text-muted">Not enrolled in any campaigns yet</p>
          </div>
        ) : (
          <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-inset/50">
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Campaign</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Escalation</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Chases</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Progress</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Next Chase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {enrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-inset/50 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-text-primary font-mono text-[12px]">{e.campaignId.slice(0, 8)}&hellip;</td>
                    <td className="px-4 py-3.5">
                      <Badge
                        label={e.status}
                        colorClass={
                          e.status === "active" ? "bg-success-light text-success ring-green-200"
                          : e.status === "completed" ? "bg-info-light text-info ring-blue-200"
                          : e.status === "opted_out" ? "bg-danger-light text-danger ring-red-200"
                          : "bg-stone-100 text-stone-600 ring-stone-200"
                        }
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        label={e.currentEscalationLevel ?? "gentle"}
                        colorClass={getEscalationStyle(e.currentEscalationLevel ?? "gentle")}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary font-mono text-[12px]">{e.chasesDelivered ?? 0}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-surface-inset rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all duration-500"
                            style={{ width: `${e.completionPercent ?? 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-text-muted">{e.completionPercent ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-text-muted text-[12px]">
                      {e.nextChaseAt
                        ? format(new Date(e.nextChaseAt), "dd MMM yyyy")
                        : <span>&mdash;</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Documents */}
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-text-primary">Documents</h2>
        {documents.length === 0 ? (
          <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-[13px] text-text-muted">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-inset/50">
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">File</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Classification</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Xero</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-[12px] uppercase tracking-wider">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-inset/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-text-primary truncate max-w-[200px]">{doc.fileName ?? "Unnamed"}</p>
                      {doc.fileSize && (
                        <p className="text-[11px] text-text-muted mt-0.5">{(doc.fileSize / 1024).toFixed(0)} KB</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[12px] text-text-secondary">
                        {doc.aiClassification ?? doc.manualClassification ?? "Unclassified"}
                      </span>
                      {doc.aiConfidenceLevel && (
                        <span className="text-[10px] text-text-muted ml-1.5">({doc.aiConfidenceLevel})</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge label={doc.status} colorClass={getDocumentStatusStyle(doc.status)} />
                    </td>
                    <td className="px-4 py-3.5">
                      {doc.xeroPushStatus === "pushed" ? (
                        <span className="text-[12px] text-teal-600 font-medium">Pushed</span>
                      ) : doc.xeroPushStatus === "failed" ? (
                        <span className="text-[12px] text-danger font-medium">Failed</span>
                      ) : doc.xeroPushStatus === "pending" ? (
                        <span className="text-[12px] text-text-muted">Pending</span>
                      ) : (
                        <span className="text-[12px] text-text-muted">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-text-muted text-[12px]">
                      {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Chase Timeline (Messages) */}
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-text-primary">Chase Timeline</h2>
        {messages.length === 0 ? (
          <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-[13px] text-text-muted">No chase messages sent yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-4" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      msg.channel === "email" ? "bg-purple-50 text-purple-600" :
                      msg.channel === "whatsapp" ? "bg-green-50 text-green-600" :
                      "bg-blue-50 text-blue-600"
                    }`}>
                      {msg.channel === "email" ? <Mail className="w-3.5 h-3.5" /> :
                       msg.channel === "whatsapp" ? <MessageSquare className="w-3.5 h-3.5" /> :
                       <Phone className="w-3.5 h-3.5" />}
                    </div>
                    <Badge
                      label={msg.escalationLevel}
                      colorClass={getEscalationStyle(msg.escalationLevel)}
                    />
                    <span className="text-[11px] text-text-muted font-mono">#{msg.chaseNumber}</span>
                    <Badge
                      label={msg.status}
                      colorClass={getMessageStatusStyle(msg.status)}
                    />
                  </div>
                  <span className="text-[11px] text-text-muted">
                    {format(new Date(msg.createdAt), "dd MMM yyyy HH:mm")}
                  </span>
                </div>
                {msg.subject && (
                  <p className="text-[13px] font-medium text-text-primary mb-1">{msg.subject}</p>
                )}
                <p className="text-[13px] text-text-secondary line-clamp-2">{msg.bodyText}</p>
                {msg.sentAt && (
                  <div className="flex gap-4 mt-2.5 text-[11px] text-text-muted">
                    <span>Sent {format(new Date(msg.sentAt), "HH:mm")}</span>
                    {msg.deliveredAt && <span>Delivered {format(new Date(msg.deliveredAt), "HH:mm")}</span>}
                    {msg.readAt && <span>Read {format(new Date(msg.readAt), "HH:mm")}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notes */}
      <NotesSection clientId={clientId} initialNotes={client.notes ?? ""} />
    </div>
  );
}

// ─── Notes Component ──────────────────────────────────────────────

function NotesSection({ clientId, initialNotes }: { clientId: string; initialNotes: string }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => setEditing(false),
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-text-primary">Notes</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-[13px] text-accent hover:text-accent-hover flex items-center gap-1.5 transition-colors"
            aria-label="Edit notes"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            placeholder="Add notes about this client..."
          />
          <div className="flex gap-2">
            <button
              onClick={() => updateClient.mutate({ id: clientId, notes })}
              disabled={updateClient.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-accent text-white rounded-[var(--radius-md)] text-[13px] font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {updateClient.isPending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => { setEditing(false); setNotes(initialNotes); }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-surface-inset text-text-secondary rounded-[var(--radius-md)] text-[13px] font-medium hover:bg-border transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-[13px] text-text-secondary whitespace-pre-wrap leading-relaxed">
            {initialNotes || "No notes yet. Click Edit to add some."}
          </p>
        </div>
      )}
    </section>
  );
}
