"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import {
  isSegmentActive,
  navItemsForPathname,
} from "@/lib/navigation/navItems";
import styles from "./SideNav.module.css";

export default function SideNav() {
  const pathname = usePathname() ?? "";
  const { user, profile } = useAuth();
  const { items, isCoach } = navItemsForPathname(pathname);

  const initials =
    profile?.first_name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";
  const profileHref = pathname.startsWith("/coach")
    ? "/coach/profile"
    : "/client/profile";

  return (
    <aside className={styles.root} aria-label="Main navigation">
      <div className={styles.brand}>DailyFitness</div>
      <nav className={styles.navPrimary} aria-label="Primary">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isSegmentActive(pathname, item);
          return (
            <button
              key={item.href}
              type="button"
              className={`${styles.row} ${active ? styles.rowActive : ""}`}
              onClick={() => {
                window.location.href = item.href;
              }}
            >
              <Icon className={styles.icon} aria-hidden />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className={styles.spacer} />
      <div className={styles.footer}>
        <div className={styles.footerRow}>
          <NotificationBell />
        </div>
        <Link
          href={profileHref}
          className={styles.avatarLink}
          aria-label="Go to profile"
        >
          <div className={`${styles.avatar} fc-header-avatar`}>{initials}</div>
          <span className={styles.avatarLabel}>
            {isCoach ? "Coach" : "Account"}
          </span>
        </Link>
      </div>
    </aside>
  );
}
