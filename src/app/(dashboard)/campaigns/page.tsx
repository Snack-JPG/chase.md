export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium">
          New Campaign
        </button>
      </div>
      <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
        <p className="text-lg font-medium">No campaigns yet</p>
        <p className="text-sm mt-1">Create a campaign to start chasing documents from your clients.</p>
      </div>
    </div>
  );
}
