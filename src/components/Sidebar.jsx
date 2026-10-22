"use client";

import {
  BarChart3,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Plus,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    group: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Invoices",
        href: "/invoices",
        icon: FileText,
        badge: "3 pending",
        badgeVariant: "warning",
      },
      {
        label: "Clients",
        href: "/clients",
        icon: Users,
      },
      {
        label: "Expenses",
        href: "/expenses",
        icon: Receipt,
      },
    ],
  },
  {
    group: "Finance Tools",
    items: [
      {
        label: "Tax Vault",
        href: "/tax-vault",
        icon: Wallet,
        badge: "Q4 prep",
        badgeVariant: "neutral",
      },
      {
        label: "Reports",
        href: "/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    group: "Preferences",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
      },
      {
        label: "Help & Support",
        href: "/support",
        icon: HelpCircle,
      },
    ],
  },
];

export function Sidebar({ className }) {
  const pathname = usePathname() || "/dashboard";
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen sticky top-0 shrink-0",
        "bg-card/90 backdrop-blur-xl border-r border-border/70",
        "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] font-sans z-40 select-none",
        isCollapsed ? "w-20" : "w-64",
        className,
      )}
    >
      {/* 1. Header / Workspace Brand Pod */}
      <div
        className={cn(
          "flex items-center h-18 px-4 border-b border-border/50",
          isCollapsed ? "justify-center px-2" : "justify-start",
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 min-w-0 group",
            isCollapsed && "justify-center",
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary border border-primary/25 shadow-xs transition-transform duration-200 group-hover:scale-105">
            <CreditCard className="size-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground truncate">
                FreelanceFin
              </span>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                Trade & Market Pro <ChevronDown className="size-3 opacity-60" />
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Floating Toggle Button in the ring on the border */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-9 -translate-y-1/2 z-50 flex size-7 items-center justify-center rounded-full bg-card border border-border shadow-xs ring-4 ring-background text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 cursor-pointer"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronsRight className="size-3.5" />
        ) : (
          <ChevronsLeft className="size-3.5" />
        )}
      </button>

      {/* 2. Quick Action CTA (New Invoice) */}
      <div className="px-3 pt-4 pb-2">
        {isCollapsed ? (
          <Button
            size="icon"
            className="size-11 rounded-2xl shadow-xs hover:shadow-md active:scale-95 transition-all mx-auto flex"
            title="Create New Invoice"
          >
            <Plus className="size-5" />
          </Button>
        ) : (
          <Button className="w-full justify-center gap-2 rounded-full font-semibold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all text-xs h-10">
            <Plus className="size-4" />
            <span>New Invoice</span>
          </Button>
        )}
      </div>

      {/* 3. Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6 scrollbar-thin">
        {NAV_ITEMS.map((section) => (
          <div key={section.group} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2">
                {section.group}
              </p>
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                    "transition-all duration-200 ease-out",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    isCollapsed && "justify-center px-0 py-3",
                  )}
                >
                  {/* Active Indicator Accent Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                  )}

                  <Icon
                    className={cn(
                      "size-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />

                  {!isCollapsed && (
                    <div className="flex flex-1 items-center justify-between min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tight uppercase border",
                            item.badgeVariant === "warning"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25"
                              : "bg-muted text-muted-foreground border-border/60",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* 5. User Profile Footer */}
      <div className="p-3 border-t border-border/50 bg-muted/20">
        <div
          className={cn(
            "flex items-center gap-3 p-1.5 rounded-xl",
            isCollapsed ? "justify-center" : "justify-between",
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* User Avatar with online indicator */}
            <div className="relative size-9 shrink-0 rounded-full bg-gradient-to-tr from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
              ER
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex flex-col">
                <span className="text-xs font-semibold text-foreground truncate">
                  Elena Rostova
                </span>
                <span className="text-[10px] text-muted-foreground truncate font-mono">
                  elena@designops.co
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
