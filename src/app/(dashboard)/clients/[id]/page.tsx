"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";

// ─── Helpers ──────────────────────────────────────────────

const clientTypeLabels: Record<string, string> = {
  sole_trader: "Sole Trader",
  limited_company: "Limited Company",
  partnership: "Partnership",
  llp: "LLP",
  trust: "Trust",
  individual: "Individual",
};

const channelLabels: Record<string, string> = {
  email: "📧 Email",
  whatsapp: "💬 WhatsApp",
  sms: "📱 SMS",
};

const escalationColors: Record<string, string> = {
  gentle: "bg-green-100 text-green-700",
  reminder: "bg-blue-100 text-blue-700",
  firm: "bg-yellow-100 text-yellow-700",
  urgent: "bg-orange-100 text-orange-700",
  escalate: "bg-red-100 text-red-700",
};

const docStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  uploaded: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  classified: "bg-indigo-100 text-indigo-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
};

const messageStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  queued: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  read: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  opted_out: "bg-orange-100 text-orange-700",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-400 text-sm">Loading client…</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <p className="text-gray-500">Client not found</p>
        <button
          onClick={() => router.push("/clients")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to clients
        </button>
      </div>
    );
  }

  const enrollments = client.enrollments ?? [];
  const activeEnrollments = enrollments.filter((e) => e.status === "active" || e.status === "pending");
  const completedEnrollments = enrollments.filter((e) => e.status === "completed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/clients")}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
          >
            ← All Clients
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {client.firstName} {client.lastName}
            {client.xeroContactId && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-medium">
                Xero
              </span>
            )}
          </h1>
          {client.companyName && (
            <p className="text-gray-500 mt-0.5">{client.companyName}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => updateClient.mutate({ id: clientId, chaseEnabled: !client.chaseEnabled })}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              client.chaseEnabled
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-green-600 text-white hover:bg-green-500"
            }`}
          >
            {client.chaseEnabled ? "Pause Chasing" : "Enable Chasing"}
          </button>
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contact Info */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Contact</h2>
          <div className="space-y-2 text-sm">
            {client.email && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">📧</span>
                <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">📱</span>
                <span>{client.phone}</span>
              </div>
            )}
            {client.whatsappPhone && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">💬</span>
                <span>{client.whatsappPhone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-gray-400">📢</span>
              <span className="capitalize">{client.preferredChannel ?? "whatsapp"}</span>
            </div>
          </div>
        </div>

        {/* Tax Details */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium">{clientTypeLabels[client.clientType] ?? client.clientType}</span>
            </div>
            {client.utr && (
              <div className="flex justify-between">
                <span className="text-gray-500">UTR</span>
                <span className="font-mono text-xs">{client.utr}</span>
              </div>
            )}
            {client.companyNumber && (
              <div className="flex justify-between">
                <span className="text-gray-500">Co. Number</span>
                <span className="font-mono text-xs">{client.companyNumber}</span>
              </div>
            )}
            {client.vatNumber && (
              <div className="flex justify-between">
                <span className="text-gray-500">VAT</span>
                <span className="font-mono text-xs">{client.vatNumber}</span>
              </div>
            )}
            {client.accountingYearEnd && (
              <div className="flex justify-between">
                <span className="text-gray-500">Year End</span>
                <span>{client.accountingYearEnd}</span>
              </div>
            )}
            {client.externalRef && (
              <div className="flex justify-between">
                <span className="text-gray-500">Ref</span>
                <span className="font-mono text-xs">{client.externalRef}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chase Status */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Chase Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <Badge
                label={client.chaseEnabled ? "Active" : "Paused"}
                colorClass={client.chaseEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Chased</span>
              <span>{client.lastChasedAt ? formatDistanceToNow(new Date(client.lastChasedAt), { addSuffix: true }) : "Never"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Active Campaigns</span>
              <span className="font-medium">{activeEnrollments.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Completed</span>
              <span className="font-medium">{completedEnrollments.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Documents</span>
              <span className="font-medium">{documents.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {Array.isArray(client.tags) && client.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(client.tags as string[]).map((tag) => (
            <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Enrollments */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Campaign Enrollments</h2>
        {enrollments.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center">
            <p className="text-gray-400 text-sm">Not enrolled in any campaigns yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Campaign</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Escalation</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Chases</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Progress</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Next Chase</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {enrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{e.campaignId.slice(0, 8)}…</td>
                    <td className="px-4 py-3">
                      <Badge
                        label={e.status}
                        colorClass={
                          e.status === "active" ? "bg-green-100 text-green-700"
                          : e.status === "completed" ? "bg-blue-100 text-blue-700"
                          : e.status === "opted_out" ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={e.currentEscalationLevel ?? "gentle"}
                        colorClass={escalationColors[e.currentEscalationLevel ?? "gentle"]}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{e.chasesDelivered ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${e.completionPercent ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{e.completionPercent ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {e.nextChaseAt
                        ? format(new Date(e.nextChaseAt), "dd MMM yyyy")
                        : "—"}
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
        <h2 className="text-lg font-bold text-gray-900">Documents</h2>
        {documents.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center">
            <p className="text-gray-400 text-sm">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">File</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Classification</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Xero</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[200px]">{doc.fileName ?? "Unnamed"}</p>
                      {doc.fileSize && (
                        <p className="text-xs text-gray-400">{(doc.fileSize / 1024).toFixed(0)} KB</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs">
                        {doc.aiClassification ?? doc.manualClassification ?? "Unclassified"}
                      </span>
                      {doc.aiConfidenceLevel && (
                        <span className="text-[10px] text-gray-400 ml-1">({doc.aiConfidenceLevel})</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={doc.status} colorClass={docStatusColors[doc.status] ?? "bg-gray-100 text-gray-600"} />
                    </td>
                    <td className="px-4 py-3">
                      {doc.xeroPushStatus === "pushed" ? (
                        <span className="text-xs text-teal-600">✓ Pushed</span>
                      ) : doc.xeroPushStatus === "failed" ? (
                        <span className="text-xs text-red-500">✗ Failed</span>
                      ) : doc.xeroPushStatus === "pending" ? (
                        <span className="text-xs text-gray-400">Pending</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
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
        <h2 className="text-lg font-bold text-gray-900">Chase Timeline</h2>
        {messages.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center">
            <p className="text-gray-400 text-sm">No chase messages sent yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {msg.channel === "email" ? "📧" : msg.channel === "whatsapp" ? "💬" : "📱"}
                    </span>
                    <Badge
                      label={msg.escalationLevel}
                      colorClass={escalationColors[msg.escalationLevel] ?? "bg-gray-100 text-gray-600"}
                    />
                    <span className="text-xs text-gray-400">Chase #{msg.chaseNumber}</span>
                    <Badge
                      label={msg.status}
                      colorClass={messageStatusColors[msg.status] ?? "bg-gray-100 text-gray-600"}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(new Date(msg.createdAt), "dd MMM yyyy HH:mm")}
                  </span>
                </div>
                {msg.subject && (
                  <p className="text-sm font-medium text-gray-700 mb-1">{msg.subject}</p>
                )}
                <p className="text-sm text-gray-600 line-clamp-2">{msg.bodyText}</p>
                {msg.sentAt && (
                  <div className="flex gap-4 mt-2 text-[11px] text-gray-400">
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
        <h2 className="text-lg font-bold text-gray-900">Notes</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add notes about this client…"
          />
          <div className="flex gap-2">
            <button
              onClick={() => updateClient.mutate({ id: clientId, notes })}
              disabled={updateClient.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {updateClient.isPending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setEditing(false); setNotes(initialNotes); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {initialNotes || "No notes yet. Click Edit to add some."}
          </p>
        </div>
      )}
    </section>
  );
}
