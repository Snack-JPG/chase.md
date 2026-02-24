import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TRPCProvider } from "@/lib/trpc/provider";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session.userId) redirect("/sign-in");

  const user = await currentUser();

  return (
    <TRPCProvider>
      <DashboardShell
        userName={user?.firstName || "User"}
        userEmail={user?.emailAddresses?.[0]?.emailAddress || ""}
        userImageUrl={user?.imageUrl}
      >
        {children}
      </DashboardShell>
    </TRPCProvider>
  );
}
