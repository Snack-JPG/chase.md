"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Check,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

/* ---------- Xero Webhook Config ---------- */
function XeroWebhookConfig() {
  const xeroStatus = trpc.practice.xeroStatus.useQuery();
  const saveWebhookKey = trpc.practice.saveWebhookKey.useMutation({
    onSuccess: () => {
      xeroStatus.refetch();
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
    },
  });
  const [webhookKey, setWebhookKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);

  if (!xeroStatus.data?.connected) return null;

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/xero`
    : "";

  return (
    <div className="mt-3 p-4 bg-surface-inset/50 border border-border rounded-[var(--radius-md)] space-y-3">
      <h3 className="text-[13px] font-semibold text-text-primary">Xero Webhooks</h3>
      <p className="text-[12px] text-text-muted leading-relaxed">
        Enable real-time contact sync. Register a webhook in your{" "}
        <a href="https://developer.xero.com/app/manage" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline underline-offset-2">
          Xero Developer Dashboard
        </a>{" "}
        with the URL below, then paste the webhook key here.
      </p>

      <div>
        <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Webhook URL</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="flex-1 px-3 py-2 border border-border rounded-[var(--radius-md)] text-[12px] bg-surface-inset text-text-secondary font-mono"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => navigator.clipboard.writeText(webhookUrl)}
            className="text-[12px] px-3 py-2 border border-border rounded-[var(--radius-md)] hover:bg-surface-inset font-medium text-text-secondary transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Webhook Key</label>
        <div className="flex items-center gap-2">
          <input
            type="password"
            placeholder={xeroStatus.data.webhookKeySet ? "Key saved" : "Paste webhook key from Xero"}
            value={webhookKey}
            onChange={(e) => setWebhookKey(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-[var(--radius-md)] text-[12px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          />
          <button
            onClick={() => {
              if (webhookKey.trim()) saveWebhookKey.mutate({ webhookKey: webhookKey.trim() });
            }}
            disabled={!webhookKey.trim() || saveWebhookKey.isPending}
            className="text-[12px] px-3.5 py-2 bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover disabled:opacity-50 font-medium transition-colors"
          >
            {saveWebhookKey.isPending ? "Saving..." : "Save"}
          </button>
        </div>
        {keySaved && (
          <p className="text-[12px] text-success mt-1.5 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Webhook key saved
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${xeroStatus.data.webhookKeySet ? "bg-success" : "bg-text-muted"}`} />
        <span className="text-[12px] text-text-secondary">
          {xeroStatus.data.webhookKeySet ? "Real-time sync active" : "Using scheduled sync only"}
        </span>
      </div>
    </div>
  );
}

/* ---------- Xero Connection Card ---------- */
function XeroConnectionCard() {
  const xeroStatus = trpc.practice.xeroStatus.useQuery();
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Xero?")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/xero/disconnect", { method: "POST" });
      xeroStatus.refetch();
    } catch {
      alert("Failed to disconnect Xero");
    } finally {
      setDisconnecting(false);
    }
  };

  if (xeroStatus.isLoading) {
    return (
      <div className="flex items-center justify-between p-4 bg-surface-inset/50 rounded-[var(--radius-md)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#13B5EA]/10 flex items-center justify-center text-[15px] font-bold text-[#13B5EA]">X</div>
          <div>
            <p className="text-[13px] font-medium text-text-primary">Xero</p>
            <p className="text-[12px] text-text-muted">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const data = xeroStatus.data;

  if (data?.connected) {
    return (
      <div>
        <div className="flex items-center justify-between p-4 bg-surface-inset/50 rounded-[var(--radius-md)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#13B5EA]/10 flex items-center justify-center text-[15px] font-bold text-[#13B5EA]">X</div>
            <div>
              <p className="text-[13px] font-medium text-text-primary">Xero</p>
              <p className="text-[12px] text-text-muted">
                Connected to <strong className="text-text-secondary">{data.tenantName}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success-light text-success ring-1 ring-inset ring-green-200">Connected</span>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-[12px] px-3 py-1.5 rounded-[var(--radius-md)] border border-red-200 text-danger hover:bg-danger-light disabled:opacity-50 font-medium transition-colors"
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </div>
        <XeroWebhookConfig />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-surface-inset/50 rounded-[var(--radius-md)]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#13B5EA]/10 flex items-center justify-center text-[15px] font-bold text-[#13B5EA]">X</div>
        <div>
          <p className="text-[13px] font-medium text-text-primary">Xero</p>
          <p className="text-[12px] text-text-muted">Import clients and push documents to Xero</p>
        </div>
      </div>
      <a
        href="/api/xero/connect"
        className="text-[12px] px-3.5 py-2 rounded-[var(--radius-md)] bg-[#13B5EA] text-white hover:bg-[#0e9ac7] font-medium transition-colors"
      >
        Connect
      </a>
    </div>
  );
}

/* ---------- Integration Item ---------- */
const INTEGRATIONS = [
  { id: "whatsapp", icon: "W", color: "bg-green-500/10 text-green-600", name: "WhatsApp Business", desc: "Send chases via WhatsApp", field: "twilioWhatsappNumber" as const },
  { id: "sms", icon: "S", color: "bg-blue-500/10 text-blue-600", name: "SMS (Twilio)", desc: "Chase clients via text message", field: "twilioSmsNumber" as const },
  { id: "email", icon: "E", color: "bg-purple-500/10 text-purple-600", name: "Custom Email Domain", desc: "Send from chase@yourdomain.co.uk", field: "customEmailDomain" as const },
  { id: "stripe", icon: "$", color: "bg-violet-500/10 text-violet-600", name: "Stripe Billing", desc: "Manage your subscription", field: "stripeSubscriptionId" as const },
];

/* ---------- Settings Page ---------- */
export default function SettingsPage() {
  const practiceQuery = trpc.practice.get.useQuery();
  const updatePractice = trpc.practice.update.useMutation({
    onSuccess: () => {
      practiceQuery.refetch();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    },
    onError: () => setSaveStatus("error"),
  });

  const [saveStatus, setSaveStatus] = useState<"saved" | "error" | null>(null);
  const [details, setDetails] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
  });
  const [prefs, setPrefs] = useState({
    defaultChaseChannel: "whatsapp" as "email" | "whatsapp" | "sms",
    timezone: "Europe/London",
    businessHoursStart: "09:00",
    businessHoursEnd: "17:30",
  });

  useEffect(() => {
    if (practiceQuery.data) {
      const p = practiceQuery.data;
      setDetails({
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        website: p.website || "",
      });
      setPrefs({
        defaultChaseChannel: p.defaultChaseChannel || "whatsapp",
        timezone: p.timezone || "Europe/London",
        businessHoursStart: p.businessHoursStart || "09:00",
        businessHoursEnd: p.businessHoursEnd || "17:30",
      });
    }
  }, [practiceQuery.data]);

  const saveDetails = () => {
    setSaveStatus(null);
    updatePractice.mutate(details);
  };

  const savePrefs = () => {
    setSaveStatus(null);
    updatePractice.mutate(prefs);
  };

  if (practiceQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">Settings</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-48 w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      </div>
    );
  }

  if (practiceQuery.isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">Settings</h1>
        <div className="bg-danger-light border border-red-200 text-danger text-[13px] rounded-[var(--radius-md)] px-4 py-3">
          Failed to load settings. {practiceQuery.error?.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">Settings</h1>
        {saveStatus === "saved" && (
          <span className="text-[12px] font-medium text-success bg-success-light px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
        {saveStatus === "error" && (
          <span className="text-[12px] font-medium text-danger bg-danger-light px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <X className="w-3.5 h-3.5" /> Save failed
          </span>
        )}
      </div>

      {/* Practice Details */}
      <section className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div>
          <h2 className="text-[15px] font-semibold text-text-primary">Practice Details</h2>
          <p className="text-[12px] text-text-muted mt-0.5">Your practice information visible to clients.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { label: "Practice Name", key: "name", type: "text" },
            { label: "Contact Email", key: "email", type: "email" },
            { label: "Phone", key: "phone", type: "tel" },
            { label: "Website", key: "website", type: "url" },
          ] as const).map((field) => (
            <div key={field.key}>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">{field.label}</label>
              <input
                type={field.type}
                value={details[field.key]}
                onChange={(e) => setDetails({ ...details, [field.key]: e.target.value })}
                className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              />
            </div>
          ))}
        </div>
        <button
          onClick={saveDetails}
          disabled={updatePractice.isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover text-[13px] font-medium disabled:opacity-50 transition-colors shadow-sm"
        >
          {updatePractice.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          {updatePractice.isPending ? "Saving..." : "Save Changes"}
        </button>
      </section>

      {/* Chase Preferences */}
      <section className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div>
          <h2 className="text-[15px] font-semibold text-text-primary">Chase Preferences</h2>
          <p className="text-[12px] text-text-muted mt-0.5">Configure how and when chases are sent.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Default Channel</label>
            <select
              value={prefs.defaultChaseChannel}
              onChange={(e) => setPrefs({ ...prefs, defaultChaseChannel: e.target.value as typeof prefs.defaultChaseChannel })}
              className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            >
              <option value="whatsapp">WhatsApp (recommended)</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Timezone</label>
            <select
              value={prefs.timezone}
              onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
              className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            >
              <option value="Europe/London">UK (Europe/London)</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Business Hours Start</label>
            <input
              type="time"
              value={prefs.businessHoursStart}
              onChange={(e) => setPrefs({ ...prefs, businessHoursStart: e.target.value })}
              className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Business Hours End</label>
            <input
              type="time"
              value={prefs.businessHoursEnd}
              onChange={(e) => setPrefs({ ...prefs, businessHoursEnd: e.target.value })}
              className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>
        </div>
        <button
          onClick={savePrefs}
          disabled={updatePractice.isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover text-[13px] font-medium disabled:opacity-50 transition-colors shadow-sm"
        >
          {updatePractice.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          {updatePractice.isPending ? "Saving..." : "Save Preferences"}
        </button>
      </section>

      {/* Integrations */}
      <section className="bg-surface-raised rounded-[var(--radius-lg)] border border-border p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div>
          <h2 className="text-[15px] font-semibold text-text-primary">Integrations</h2>
          <p className="text-[12px] text-text-muted mt-0.5">Connect your tools and services.</p>
        </div>

        <XeroConnectionCard />

        <div className="space-y-2">
          {INTEGRATIONS.map((i) => {
            const connected = !!practiceQuery.data?.[i.field];
            return (
              <div key={i.id} className="flex items-center justify-between p-4 bg-surface-inset/50 rounded-[var(--radius-md)]">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center text-[14px] font-bold ${i.color}`}>
                    {i.icon}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-text-primary">{i.name}</p>
                    <p className="text-[12px] text-text-muted">{i.desc}</p>
                  </div>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${
                  connected
                    ? "bg-success-light text-success ring-green-200"
                    : "bg-warning-light text-warning ring-amber-200"
                }`}>
                  {connected ? "Connected" : "Not connected"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-surface-raised rounded-[var(--radius-lg)] border border-red-200 p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-danger" />
          <h2 className="text-[15px] font-semibold text-danger">Danger Zone</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-text-primary">Delete Practice Account</p>
            <p className="text-[12px] text-text-muted">Permanently delete all data. This cannot be undone.</p>
          </div>
          <button className="px-4 py-2 bg-surface-raised border border-red-200 text-danger rounded-[var(--radius-md)] hover:bg-danger-light text-[13px] font-medium transition-colors">
            Delete Account
          </button>
        </div>
      </section>
    </div>
  );
}
