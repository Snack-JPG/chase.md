import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Chase.md — Document Chasing for Accountants",
  description:
    "AI-powered document chasing that gets your clients to send their stuff. Multi-channel escalation via email, SMS & WhatsApp.",
  metadataBase: new URL("https://chase.md"),
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
