"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Settings,
  ChevronLeft,
  Menu,
  FileText,
  ArrowUpRight,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userImageUrl?: string;
}

export function DashboardShell({ children, userName, userEmail }: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen bg-sidebar flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-[68px]" : "w-[240px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:sticky
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-5 border-b border-white/[0.06] ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-[15px] text-white tracking-tight">
                chase<span className="text-accent">.md</span>
              </span>
            </Link>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-sidebar-hover text-sidebar-text transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium
                  transition-all duration-150
                  ${collapsed ? "justify-center px-0" : ""}
                  ${active
                    ? "bg-accent text-white shadow-[0_1px_3px_rgba(13,148,136,0.3)]"
                    : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
                  }
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className={`border-t border-white/[0.06] p-3 ${collapsed ? "flex justify-center" : ""}`}>
          <div className={`flex items-center gap-3 ${collapsed ? "" : "px-2"}`}>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-sidebar-text-active truncate">{userName}</p>
                <p className="text-[11px] text-sidebar-text truncate">{userEmail}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-surface-raised/80 backdrop-blur-md border-b border-border h-14 flex items-center px-6 gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-surface-inset text-text-secondary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <a
            href="https://chase.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors"
          >
            Docs <ArrowUpRight className="w-3 h-3" />
          </a>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
