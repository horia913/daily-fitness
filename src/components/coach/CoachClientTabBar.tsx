"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Eye,
  Dumbbell,
  Utensils,
  TrendingUp,
  CalendarCheck,
  User,
  ChevronLeft,
} from "lucide-react";
import styles from "./CoachClientTabBar.module.css";

type TabAccent = "cyan" | "good" | "purple";

type TabDef = {
  label: string;
  shortLabel: string;
  href: string;
  icon: typeof Eye;
  isActive: (pathname: string) => boolean;
  activeAccent: TabAccent;
};

function buildTabs(clientId: string): TabDef[] {
  const base = `/coach/clients/${clientId}`;
  return [
    {
      label: "Overview",
      shortLabel: "Home",
      href: base,
      icon: Eye,
      isActive: (pathname) => pathname === base,
      activeAccent: "cyan",
    },
    {
      label: "Training",
      shortLabel: "Train",
      href: `${base}/workouts`,
      icon: Dumbbell,
      isActive: (pathname) =>
        pathname.startsWith(`${base}/workouts`) ||
        pathname.startsWith(`${base}/workout-logs`) ||
        pathname.includes(`${base}/programs/`),
      activeAccent: "cyan",
    },
    {
      label: "Stats",
      shortLabel: "Stats",
      href: `${base}/stats`,
      icon: TrendingUp,
      isActive: (pathname) => pathname.startsWith(`${base}/stats`),
      activeAccent: "cyan",
    },
    {
      label: "Nutrition",
      shortLabel: "Meals",
      href: `${base}/meals`,
      icon: Utensils,
      isActive: (pathname) => pathname.startsWith(`${base}/meals`),
      activeAccent: "good",
    },
    {
      label: "Check-ins",
      shortLabel: "Checks",
      href: `${base}/progress`,
      icon: CalendarCheck,
      isActive: (pathname) => pathname.startsWith(`${base}/progress`),
      activeAccent: "purple",
    },
    {
      label: "Profile",
      shortLabel: "Prof",
      href: `${base}/profile`,
      icon: User,
      isActive: (pathname) => pathname.startsWith(`${base}/profile`),
      activeAccent: "cyan",
    },
  ];
}

export default function CoachClientTabBar({ clientId }: { clientId: string }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const tabs = buildTabs(clientId);

  return (
    <div className={cn(styles.sticky, "-mx-1 sm:mx-0")}>
      <nav className={styles.nav} role="tablist" aria-label="Client sections">
        <button
          type="button"
          aria-label="Back to client list"
          onClick={() => router.push("/coach/clients")}
          className={styles.back}
        >
          <ChevronLeft className="h-[18px] w-[18px]" aria-hidden />
        </button>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.isActive(pathname);
          const activeClass =
            tab.activeAccent === "good"
              ? styles.tabActiveGood
              : tab.activeAccent === "purple"
                ? styles.tabActivePurple
                : styles.tabActiveCyan;
          const dotClass =
            tab.activeAccent === "good"
              ? styles.glowDotGood
              : tab.activeAccent === "purple"
                ? styles.glowDotPurple
                : styles.glowDotCyan;
          return (
            <button
              key={tab.href}
              type="button"
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              onClick={() => router.push(tab.href)}
              className={cn(styles.tab, active && styles.tabActive, active && activeClass)}
            >
              <Icon className={styles.tabIcon} aria-hidden />
              <span className={styles.tabLabelLong}>{tab.label}</span>
              <span className={styles.tabLabelShort}>{tab.shortLabel}</span>
              {active ? <span className={cn(styles.glowDot, dotClass)} aria-hidden /> : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
