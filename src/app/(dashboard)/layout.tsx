import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TRPCProvider } from "@/lib/trpc/provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session.userId) redirect("/sign-in");

  return (
    <TRPCProvider>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">chase<span className="text-blue-600">.md</span></span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <a href="/dashboard" className="hover:text-gray-900">Dashboard</a>
            <a href="/dashboard/clients" className="hover:text-gray-900">Clients</a>
            <a href="/dashboard/campaigns" className="hover:text-gray-900">Campaigns</a>
            <a href="/dashboard/settings" className="hover:text-gray-900">Settings</a>
          </div>
        </nav>
        <main className="p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </TRPCProvider>
  );
}
