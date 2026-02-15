import { UploadZone } from "./upload-zone";

interface PortalPageProps {
  params: Promise<{ token: string }>;
}

export default async function PortalPage({ params }: PortalPageProps) {
  const { token } = await params;

  // TODO: validate magic link token against DB
  // TODO: fetch enrollment details + required documents
  // For now, render the portal shell with static example docs

  const practiceName = "Smith & Co Accountants";
  const clientName = "John";
  const documents = [
    { name: "P60 — Pay & Tax Certificate", help: "Your employer gives you this in May/June", status: "needed" },
    { name: "Bank Statements", help: "April 2025 to March 2026", status: "needed" },
    { name: "Dividend Vouchers", help: "If you received dividends from your company", status: "needed" },
  ];
  const received = 0;
  const total = documents.length;
  const percent = total > 0 ? Math.round((received / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white border rounded-full px-4 py-2 mb-4">
            <span className="text-sm font-medium text-gray-600">{practiceName}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hi {clientName} 👋
          </h1>
          <p className="text-gray-500 mt-2">
            We need a few documents from you. Upload them here — it only takes a couple of minutes.
          </p>
        </div>

        {/* Progress */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex justify-between text-sm">
            <span className="text-blue-700 font-medium">Progress</span>
            <span className="text-blue-700">{received} of {total} documents</span>
          </div>
          <div className="mt-2 h-3 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          {percent === 100 && (
            <p className="text-sm text-blue-700 mt-2 font-medium">
              🎉 All done! Your accountant has been notified.
            </p>
          )}
        </div>

        {/* Document checklist */}
        <div className="bg-white rounded-xl border divide-y">
          {documents.map((doc, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-gray-900">{doc.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{doc.help}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full ml-3 whitespace-nowrap ${
                doc.status === "received"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {doc.status === "received" ? "✓ Received" : "Needed"}
              </span>
            </div>
          ))}
        </div>

        {/* Upload zone */}
        <UploadZone token={token} />

        {/* Help section */}
        <details className="bg-white rounded-xl border p-4">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer">
            ℹ️ Not sure what to upload?
          </summary>
          <div className="mt-3 text-sm text-gray-500 space-y-2">
            <p>
              <strong>P60:</strong> Your employer sends this after the tax year ends (April/May).
              Check your email or ask your employer.
            </p>
            <p>
              <strong>Bank statements:</strong> Download from your online banking.
              We need April 2025 to March 2026.
            </p>
            <p>
              <strong>Can&apos;t find something?</strong> Don&apos;t worry — upload what you can and
              your accountant will follow up on anything missing.
            </p>
          </div>
        </details>

        {/* Footer */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-xs text-gray-400">
            Your files are encrypted and sent directly to {practiceName}.
          </p>
          <p className="text-xs text-gray-300">
            Powered by <span className="font-medium">chase.md</span>
          </p>
        </div>
      </div>
    </div>
  );
}
