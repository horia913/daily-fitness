"use client";

import React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import styles from "./homePage.module.css";
import { buildHomeGreetingEyebrow, formatHomeDateLine } from "./homeGreeting";
import type { DashboardData } from "@/lib/clientDashboardPageData";
import { useUnreadNotificationCount } from "@/components/notifications/NotificationFeedList";

export interface HomeGreetingHeaderProps {
  firstName: string;
  todaysWorkout: DashboardData["todaysWorkout"] | undefined;
  programProgress: DashboardData["programProgress"] | undefined;
  hasActiveProgram: boolean;
}

export function HomeGreetingHeader({
  firstName,
  todaysWorkout,
  programProgress,
  hasActiveProgram,
}: HomeGreetingHeaderProps) {
  const eyebrow = buildHomeGreetingEyebrow(
    todaysWorkout,
    programProgress,
    hasActiveProgram,
  );
  const { count } = useUnreadNotificationCount(20_000);

  return (
    <header className="min-w-0 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className={styles.greetEyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.greetTitle}>
          Hey, <span className={styles.greetName}>{firstName}</span>
        </h1>
        <p className={styles.greetDate}>{formatHomeDateLine()}</p>
      </div>
      <Link
        href="/client/notifications"
        className="relative mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)]"
        aria-label={
          count > 0 ? `Notifications, ${count} unread` : "Notifications"
        }
      >
        <Bell className="h-4 w-4 fc-text-primary" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--fc-accent)] px-1 text-[10px] font-semibold text-[color:var(--fc-bg-base)]">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    </header>
  );
}
