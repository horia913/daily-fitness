"use client";

/**
 * BottomNav — client + coach floating bottom navigation
 *
 * Cluster 7 (Apr 2026): **Flat five-item bar** for client + coach — no elevated
 * center hub. Active state = cyan **dot** below icon (mockup `client-screens-v5.html`
 * Phone 1 `.nav-item.active::before`), not pill background. Replaces prior v4 §6.23
 * elevated Train hub pattern for mockup alignment.
 *
 * Phase 0b (Task 4): inactive items use `fc-text-dim`; active accent from `var(--fc-accent-cyan)` (client + coach).
 */

import { usePathname } from "next/navigation";
import {
  isSegmentActive,
  navItemsForPathname,
} from "@/lib/navigation/navItems";

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.includes("/workouts/") && pathname.includes("/start")) {
    return null;
  }

  const { items: navItems, isCoach } = navItemsForPathname(pathname);

  return (
    <nav
      data-fc-bottom-nav
      className="fc-bottom-nav-float"
      data-coach-context={isCoach ? "true" : undefined}
    >
      <div className="fc-bottom-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isSegmentActive(pathname, item);
          const activeColor = "text-[color:var(--fc-accent-cyan)]";

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => {
                window.location.href = item.href;
              }}
              className={`fc-bottom-nav-item fc-bottom-nav-item--flat relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 bg-transparent cursor-pointer border-none p-1.5 ${
                isActive ? "fc-bottom-nav-item--active" : ""
              }`}
            >
              {isActive ? (
                <span className="fc-bottom-nav-active-dot" aria-hidden />
              ) : null}

              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <Icon
                  className={`h-[22px] w-[22px] transition-colors duration-200 ${
                    isActive ? activeColor : "fc-text-dim"
                  }`}
                />
                <span
                  className={`text-[10px] font-semibold leading-none transition-colors duration-200 ${
                    isActive ? activeColor : "fc-text-dim"
                  }`}
                  style={{ letterSpacing: "0.04em" }}
                >
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
