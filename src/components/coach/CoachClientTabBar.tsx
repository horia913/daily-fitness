"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  TrendingUp,
  ClipboardCheck,
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
      label: "Stats",
      href: `${base}/stats`,
      icon: TrendingUp,
      isActive: (pathname) => pathname.startsWith(`${base}/stats`),
    },
    {
      label: "Nutrition",
      href: `${base}/meals`,
      icon: Utensils,
      isActive: (pathname) => pathname.startsWith(`${base}/meals`),
    },
    {
      label: "Check-ins",
      href: `${base}/progress`,
      icon: ClipboardCheck,
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
  Stats: "Stats",
  Nutrition: "Meals",
  "Check-ins": "Checks",
  Profile: "Prof",
};

export default function CoachClientTabBar({ clientId }: { clientId: string }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const tabs = buildTabs(clientId);

  return (
    <div className="sticky top-0 z-20 -mx-1 mb-4 sm:mx-0 sm:mb-6">
      <nav
        className="flex min-h-[44px] items-stretch gap-0.5 overflow-x-auto rounded-2xl border border-[color:var(--fc-glass-border)] bg-[color-mix(in_srgb,var(--fc-surface-card)_88%,transparent)] px-1 py-1 shadow-[0_1px_0_var(--fc-surface-card-border)] backdrop-blur-md scrollbar-hide sm:gap-1"
        role="tablist"
        aria-label="Client sections"
      >
        <button
          type="button"
          aria-label="Back to client list"
          onClick={() => router.push("/coach/clients")}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl px-2 fc-text-dim transition-colors hover:bg-[color:var(--fc-glass-highlight)] hover:fc-text-primary sm:px-3"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.isActive(pathname);
          return (
            <button
              key={tab.href}
              type="button"
              aria-label={tab.label}
              onClick={() => router.push(tab.href)}
              className={cn(
                "flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-transparent px-2 py-2.5 text-sm font-medium transition-colors sm:gap-2 sm:px-4",
                active
                  ? "border-[color-mix(in_srgb,var(--fc-accent-cyan)_45%,transparent)] bg-[color-mix(in_srgb,var(--fc-accent-cyan)_12%,transparent)] font-semibold text-[color:var(--fc-accent-cyan)]"
                  : "fc-text-dim hover:bg-[color:var(--fc-glass-highlight)] hover:fc-text-primary",
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
