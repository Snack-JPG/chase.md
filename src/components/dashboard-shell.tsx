"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
  MessageSquareText,
  FileCheck2,
  Search,
  Bell,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, shortcut: "1" },
  { href: "/dashboard/clients", label: "Clients", icon: Users, shortcut: "2" },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone, shortcut: "3" },
  { href: "/dashboard/responses", label: "Responses", icon: MessageSquareText, shortcut: "4", badge: true },
  { href: "/dashboard/documents", label: "Documents", icon: FileCheck2, shortcut: "5", badge: true },
];

const BOTTOM_NAV = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings, shortcut: "," },
];

interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userImageUrl?: string;
}

export function DashboardShell({ children, userName, userEmail }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = useCallback((href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }, [pathname]);

  // Keyboard shortcuts: Cmd+1-5 for nav, Cmd+, for settings, Cmd+K for search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) {
        const allItems = [...NAV_ITEMS, ...BOTTOM_NAV];
        const match = allItems.find((item) => item.shortcut === e.key);
        if (match) {
          e.preventDefault();
          router.push(match.href);
        }
        if (e.key === "k") {
          e.preventDefault();
          // Command palette trigger - dispatched as custom event
          window.dispatchEvent(new CustomEvent("open-command-palette"));
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Build breadcrumbs from pathname
  const breadcrumbs = buildBreadcrumbs(pathname);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn("flex items-center h-14 px-4 shrink-0", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold text-[15px] text-sidebar-foreground tracking-tight">
              Chase<span className="text-sidebar-primary">.md</span>
            </span>
          </Link>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-sidebar-primary-foreground" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("w-3.5 h-3.5 transition-transform duration-200", collapsed && "rotate-180")} />
        </button>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Main nav */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        <TooltipProvider delayDuration={0}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-fast group",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {/* Active indicator */}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-sidebar-primary rounded-r-full" />
                    )}
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] bg-sidebar-primary/20 text-sidebar-primary border-0">
                            0
                          </Badge>
                        )}
                        <span className="text-[11px] text-sidebar-foreground/30 font-mono">
                          {"\u2318"}{item.shortcut}
                        </span>
                      </>
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" sideOffset={8}>
                    <p>{item.label} <span className="text-muted-foreground ml-1">{"\u2318"}{item.shortcut}</span></p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* Bottom nav */}
      <div className="px-2 pb-2 space-y-0.5">
        <Separator className="bg-sidebar-border mb-2" />
        <TooltipProvider delayDuration={0}>
          {BOTTOM_NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-fast",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-sidebar-primary rounded-r-full" />
                    )}
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        <span className="text-[11px] text-sidebar-foreground/30 font-mono">
                          {"\u2318"}{item.shortcut}
                        </span>
                      </>
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" sideOffset={8}>
                    <p>{item.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* User section */}
      <div className={cn("border-t border-sidebar-border p-3", collapsed && "flex justify-center")}>
        <div className={cn("flex items-center gap-3", collapsed ? "" : "px-1")}>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-sidebar-foreground truncate">{userName}</p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">{userEmail}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="dark min-h-screen bg-background flex">
      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0 bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border h-14 flex items-center px-4 lg:px-6 gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 -ml-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumbs */}
          <Breadcrumb className="hidden sm:flex">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => (
                <BreadcrumbItem key={crumb.href}>
                  {i < breadcrumbs.length - 1 ? (
                    <>
                      <BreadcrumbLink href={crumb.href} className="text-[13px]">{crumb.label}</BreadcrumbLink>
                      <BreadcrumbSeparator />
                    </>
                  ) : (
                    <BreadcrumbPage className="text-[13px] font-medium">{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex-1" />

          {/* Cmd+K search trigger */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-2 text-muted-foreground h-8 px-3 bg-secondary/50"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[12px]">Search...</span>
            <kbd className="pointer-events-none text-[10px] font-mono text-muted-foreground/60 border rounded px-1 py-0.5 bg-muted">
              {"\u2318"}K
            </kbd>
          </Button>

          {/* Notification bell */}
          <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground">
            <Bell className="w-4 h-4" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User button (visible on mobile where sidebar is hidden) */}
          <div className="lg:hidden">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7",
                },
              }}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster richColors position="bottom-right" />
    </div>
  );
}

// ─── Breadcrumb builder ───
function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  const LABELS: Record<string, string> = {
    dashboard: "Dashboard",
    clients: "Clients",
    campaigns: "Campaigns",
    responses: "Responses",
    documents: "Documents",
    settings: "Settings",
    new: "New",
    onboarding: "Onboarding",
  };

  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    // Skip "dashboard" in breadcrumbs if it's the first segment (it's implicit)
    if (seg === "dashboard" && crumbs.length === 0) {
      crumbs.push({ label: "Dashboard", href: "/dashboard" });
      continue;
    }
    const label = LABELS[seg] ?? decodeURIComponent(seg);
    crumbs.push({ label, href: path });
  }

  return crumbs;
}
