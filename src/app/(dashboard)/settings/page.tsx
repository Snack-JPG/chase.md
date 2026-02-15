export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold">Practice Details</h2>
        <p className="text-sm text-gray-500">Configure your practice name, branding, and contact details.</p>
      </div>
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold">Chase Preferences</h2>
        <p className="text-sm text-gray-500">Set default channels, business hours, and escalation rules.</p>
      </div>
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold">Integrations</h2>
        <p className="text-sm text-gray-500">Connect WhatsApp, custom email domain, and Stripe billing.</p>
      </div>
    </div>
  );
}
