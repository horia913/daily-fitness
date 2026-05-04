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
  Home,
  Dumbbell,
  Apple,
  ClipboardCheck,
  User,
  Users,
  BarChart3,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string; fill?: string; stroke?: string }>;
  label: string;
}

const clientNavItems: NavItem[] = [
  { href: "/client", icon: Home, label: "Home" },
  { href: "/client/check-ins", icon: ClipboardCheck, label: "Check-in" },
  { href: "/client/train", icon: Dumbbell, label: "Train" },
  { href: "/client/nutrition", icon: Apple, label: "Fuel" },
  { href: "/client/me", icon: User, label: "Me" },
];

const coachNavItems: NavItem[] = [
  { href: "/coach", icon: Home, label: "Home" },
  { href: "/coach/clients", icon: Users, label: "Clients" },
  { href: "/coach/training", icon: Dumbbell, label: "Training" },
  { href: "/coach/nutrition", icon: Apple, label: "Nutrition" },
  { href: "/coach/analytics", icon: BarChart3, label: "Analytics" },
];

function isSegmentActive(pathname: string, item: NavItem): boolean {
  const { href } = item;

  if (href === "/client" || href === "/coach") {
    return pathname === href;
  }

  if (href === "/client/check-ins") {
    return pathname.startsWith("/client/check-in");
  }

  if (href === "/client/train") {
    return (
      pathname.startsWith("/client/train") ||
      pathname.startsWith("/client/workouts")
    );
  }

  if (href === "/client/nutrition") {
    return pathname.startsWith("/client/nutrition");
  }

  if (href === "/client/me") {
    return (
      pathname.startsWith("/client/me") ||
      pathname.startsWith("/client/profile") ||
      pathname.startsWith("/client/progress") ||
      pathname.startsWith("/client/goals") ||
      pathname.startsWith("/client/habits") ||
      pathname.startsWith("/client/challenges")
    );
  }

  if (href === "/coach/training") {
    return (
      pathname.startsWith("/coach/training") ||
      pathname.startsWith("/coach/programs") ||
      pathname.startsWith("/coach/workouts") ||
      pathname.startsWith("/coach/exercises") ||
      pathname.startsWith("/coach/categories") ||
      pathname.startsWith("/coach/gym-console") ||
      pathname.startsWith("/coach/challenges")
    );
  }

  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.includes("/workouts/") && pathname.includes("/start")) {
    return null;
  }

  const navItems = pathname.startsWith("/coach") ? coachNavItems : clientNavItems;
  const isCoach = pathname.startsWith("/coach");

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
