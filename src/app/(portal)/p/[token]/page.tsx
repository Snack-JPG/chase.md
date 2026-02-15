interface PortalPageProps {
  params: Promise<{ token: string }>;
}

export default async function PortalPage({ params }: PortalPageProps) {
  const { token } = await params;

  // TODO: validate magic link token against DB
  // For now, render the portal shell

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Upload Your Documents</h1>
          <p className="text-gray-500 mt-2">
            Your accountant needs a few documents from you. Upload them here — it only takes a couple of minutes.
          </p>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">P60 — Pay & Tax Certificate</p>
              <p className="text-xs text-gray-500">Your employer gives you this in May/June</p>
            </div>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Needed</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Bank Statements</p>
              <p className="text-xs text-gray-500">April 2025 to March 2026</p>
            </div>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Needed</span>
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition cursor-pointer">
          <p className="text-gray-500">Tap to upload or drag files here</p>
          <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex justify-between text-sm">
            <span className="text-blue-700 font-medium">Progress</span>
            <span className="text-blue-700">0 of 2 documents</span>
          </div>
          <div className="mt-2 h-2 bg-blue-100 rounded-full">
            <div className="h-2 bg-blue-600 rounded-full" style={{ width: "0%" }} />
          </div>
        </div>

        <p className="text-xs text-center text-gray-400">
          Powered by chase.md · Your data is encrypted and secure
        </p>
      </div>
    </div>
  );
}
