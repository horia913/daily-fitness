"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  TrendingUp,
  User,
  ArrowLeft,
} from "lucide-react";

type TabDef = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  isActive: (pathname: string) => boolean;
};

function buildTabs(clientId: string): TabDef[] {
  const base = `/coach/clients/${clientId}`;
  return [
    {
      label: "Overview",
      href: base,
      icon: LayoutDashboard,
      isActive: (pathname) => pathname === base,
    },
    {
      label: "Training",
      href: `${base}/workouts`,
      icon: Dumbbell,
      isActive: (pathname) =>
        pathname.startsWith(`${base}/workouts`) ||
        pathname.startsWith(`${base}/workout-logs`) ||
        pathname.includes(`${base}/programs/`),
    },
    {
      label: "Nutrition",
      href: `${base}/meals`,
      icon: Utensils,
      isActive: (pathname) => pathname.startsWith(`${base}/meals`),
    },
    {
      label: "Progress",
      href: `${base}/progress`,
      icon: TrendingUp,
      isActive: (pathname) => pathname.startsWith(`${base}/progress`),
    },
    {
      label: "Profile",
      href: `${base}/profile`,
      icon: User,
      isActive: (pathname) => pathname.startsWith(`${base}/profile`),
    },
  ];
}

/** Shorter labels on narrow screens so tabs are not truncated (e.g. "Progres…"). */
const TAB_SHORT_LABEL: Record<string, string> = {
  Overview: "Home",
  Training: "Train",
  Nutrition: "Meals",
  Progress: "Stats",
  Profile: "Prof",
};

export default function CoachClientTabBar({ clientId }: { clientId: string }) {
  const pathname = usePathname() ?? "";
  const tabs = buildTabs(clientId);

  return (
    <div
      className="sticky top-0 z-20 mb-4 sm:mb-6 -mx-4 sm:mx-0 px-2 sm:px-0 pt-1 bg-[color:var(--fc-bg-base)]/90 backdrop-blur-md border-b border-[color:var(--fc-glass-border)]"
    >
      <nav
        className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide min-h-[44px] items-stretch"
        role="tablist"
        aria-label="Client sections"
      >
        <button
          type="button"
          aria-label="Back to client list"
          onClick={() => {
            window.location.href = "/coach/clients";
          }}
          className="flex items-center justify-center px-2 sm:px-3 py-3 rounded-t-xl border-b-2 border-transparent text-gray-400 hover:text-gray-300 hover:border-[color:var(--fc-glass-border)] flex-shrink-0 min-h-[44px] min-w-[44px]"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </button>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.isActive(pathname);
          return (
            <button
              key={tab.href}
              type="button"
              aria-label={tab.label}
              onClick={() => {
                window.location.href = tab.href;
              }}
              className={cn(
                "bg-transparent border-none cursor-pointer",
                "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] rounded-t-xl",
                "border-b-2 -mb-px",
                active
                  ? "text-cyan-400 font-medium border-cyan-400"
                  : "text-gray-400 border-transparent hover:text-gray-300 hover:border-[color:var(--fc-glass-border)]"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {TAB_SHORT_LABEL[tab.label] ?? tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
