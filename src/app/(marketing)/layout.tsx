import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "chase.md — Stop Chasing Documents. Start Collecting Them.",
  description:
    "AI-powered document chasing for UK accountancy practices. Multi-channel escalation via email, SMS & WhatsApp. Save 500-750 hours per year.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
