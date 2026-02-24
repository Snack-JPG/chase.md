"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

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
    <div className="mt-3 p-4 bg-white border rounded-lg space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">Xero Webhooks</h3>
      <p className="text-xs text-gray-500">
        Enable real-time contact sync. Register a webhook in your{" "}
        <a href="https://developer.xero.com/app/manage" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
          Xero Developer Dashboard
        </a>{" "}
        with the URL below, then paste the webhook key here.
      </p>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Webhook URL</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="flex-1 px-3 py-1.5 border rounded-lg text-xs bg-gray-50 text-gray-700"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => navigator.clipboard.writeText(webhookUrl)}
            className="text-xs px-2 py-1.5 border rounded-lg hover:bg-gray-50"
          >
            Copy
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Webhook Key</label>
        <div className="flex items-center gap-2">
          <input
            type="password"
            placeholder={xeroStatus.data.webhookKeySet ? "••••••••  (key saved)" : "Paste webhook key from Xero"}
            value={webhookKey}
            onChange={(e) => setWebhookKey(e.target.value)}
            className="flex-1 px-3 py-1.5 border rounded-lg text-xs"
          />
          <button
            onClick={() => {
              if (webhookKey.trim()) saveWebhookKey.mutate({ webhookKey: webhookKey.trim() });
            }}
            disabled={!webhookKey.trim() || saveWebhookKey.isPending}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
          >
            {saveWebhookKey.isPending ? "Saving..." : "Save"}
          </button>
        </div>
        {keySaved && <p className="text-xs text-green-600 mt-1">✓ Webhook key saved</p>}
      </div>

      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${xeroStatus.data.webhookKeySet ? "bg-green-500" : "bg-gray-300"}`} />
        <span className="text-xs text-gray-600">
          {xeroStatus.data.webhookKeySet ? "Webhook configured — real-time sync active" : "Webhook not configured — using scheduled sync only"}
        </span>
      </div>
    </div>
  );
}

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
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-medium text-sm">Xero</p>
            <p className="text-xs text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const data = xeroStatus.data;

  if (data?.connected) {
    return (
      <div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-medium text-sm">Xero</p>
              <p className="text-xs text-gray-500">
                Connected to <strong>{data.tenantName}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700">Connected</span>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
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
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📊</span>
        <div>
          <p className="font-medium text-sm">Xero</p>
          <p className="text-xs text-gray-500">Import clients and push documents to Xero</p>
        </div>
      </div>
      <a
        href="/api/xero/connect"
        className="text-xs px-3 py-1.5 rounded-lg bg-[#13B5EA] text-white hover:bg-[#0e9ac7] font-medium"
      >
        Connect to Xero
      </a>
    </div>
  );
}

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
  const [whatsapp, setWhatsapp] = useState({
    twilioWhatsappNumber: "",
    whatsappOptInMessage: "",
  });

  // Load practice data into form
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
      setWhatsapp({
        twilioWhatsappNumber: p.twilioWhatsappNumber || "",
        whatsappOptInMessage: (p as Record<string, unknown>).whatsappOptInMessage as string || "Hi! Your accountant would like to send you document reminders via WhatsApp. Reply YES to opt in.",
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

  const saveWhatsapp = () => {
    setSaveStatus(null);
    updatePractice.mutate(whatsapp);
  };

  if (practiceQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Loading settings...</div>
      </div>
    );
  }

  if (practiceQuery.isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          Failed to load settings. {practiceQuery.error?.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        {saveStatus === "saved" && (
          <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">✓ Saved</span>
        )}
        {saveStatus === "error" && (
          <span className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">Save failed</span>
        )}
      </div>

      {/* Practice Details */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Practice Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Practice Name</label>
            <input type="text" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
            <input type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input type="url" value={details.website} onChange={(e) => setDetails({ ...details, website: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <button onClick={saveDetails} disabled={updatePractice.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium disabled:opacity-50">
          {updatePractice.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Chase Preferences */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Chase Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Channel</label>
            <select value={prefs.defaultChaseChannel} onChange={(e) => setPrefs({ ...prefs, defaultChaseChannel: e.target.value as typeof prefs.defaultChaseChannel })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="whatsapp">WhatsApp (recommended)</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select value={prefs.timezone} onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Europe/London">UK (Europe/London)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Hours Start</label>
            <input type="time" value={prefs.businessHoursStart} onChange={(e) => setPrefs({ ...prefs, businessHoursStart: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Hours End</label>
            <input type="time" value={prefs.businessHoursEnd} onChange={(e) => setPrefs({ ...prefs, businessHoursEnd: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <button onClick={savePrefs} disabled={updatePractice.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium disabled:opacity-50">
          {updatePractice.isPending ? "Saving..." : "Save Preferences"}
        </button>
      </div>

      {/* Integrations */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Integrations</h2>

        {/* Xero Integration */}
        <XeroConnectionCard />

        {[
          { icon: "💬", name: "WhatsApp Business", desc: "Send chases via WhatsApp", connected: !!practiceQuery.data?.twilioWhatsappNumber },
          { icon: "📱", name: "SMS (Twilio)", desc: "Chase clients via text message", connected: !!practiceQuery.data?.twilioSmsNumber },
          { icon: "📧", name: "Custom Email Domain", desc: "Send from chase@yourdomain.co.uk", connected: !!practiceQuery.data?.customEmailDomain },
          { icon: "💳", name: "Stripe Billing", desc: "Manage your subscription", connected: !!practiceQuery.data?.stripeSubscriptionId },
        ].map((i) => (
          <div key={i.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{i.icon}</span>
              <div>
                <p className="font-medium text-sm">{i.name}</p>
                <p className="text-xs text-gray-500">{i.desc}</p>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full ${
              i.connected ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}>{i.connected ? "Connected" : "Not connected"}</span>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6 space-y-4">
        <h2 className="font-semibold text-red-600">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Delete Practice Account</p>
            <p className="text-xs text-gray-500">Permanently delete all data. This cannot be undone.</p>
          </div>
          <button className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
