"use client";

import { usePathname } from "next/navigation";
import {
  Home,
  Dumbbell,
  Apple,
  ClipboardCheck,
  User,
  Grid,
  Users,
  BarChart3,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string; fill?: string; stroke?: string }>;
  label: string;
  isCenter?: boolean; // Special flag for the elevated center button
}

const clientNavItems: NavItem[] = [
  { href: "/client", icon: Home, label: "Home" },
  { href: "/client/check-ins", icon: ClipboardCheck, label: "Check-in" },
  { href: "/client/train", icon: Dumbbell, label: "Train", isCenter: true },
  { href: "/client/nutrition", icon: Apple, label: "Fuel" },
  { href: "/client/me", icon: User, label: "Me" },
];

// Phase 2 — Spec v2.0: exactly 5 pillars. Training = /coach/programs. No scheduling, no Menu in nav.
const coachNavItems: NavItem[] = [
  { href: "/coach", icon: Home, label: "Home" },
  { href: "/coach/clients", icon: Users, label: "Clients" },
  { href: "/coach/programs", icon: Dumbbell, label: "Training" },
  { href: "/coach/nutrition", icon: Apple, label: "Nutrition" },
  { href: "/coach/analytics", icon: BarChart3, label: "Analytics" },
];

function isSegmentActive(pathname: string, item: NavItem): boolean {
  const { href } = item;
  
  // Home: exact match only
  if (href === "/client" || href === "/coach") {
    return pathname === href;
  }
  
  // Check-in: starts with /client/check-in
  if (href === "/client/check-ins") {
    return pathname.startsWith("/client/check-in");
  }
  
  // Train: matches both /client/train and /client/workouts
  if (href === "/client/train") {
    return pathname.startsWith("/client/train") || pathname.startsWith("/client/workouts");
  }
  
  // Fuel: starts with /client/nutrition
  if (href === "/client/nutrition") {
    return pathname.startsWith("/client/nutrition");
  }
  
  // Me: matches /client/me, /client/profile, /client/progress
  if (href === "/client/me") {
    return pathname.startsWith("/client/me") || 
           pathname.startsWith("/client/profile") || 
           pathname.startsWith("/client/progress") ||
           pathname.startsWith("/client/goals") ||
           pathname.startsWith("/client/habits") ||
           pathname.startsWith("/client/challenges");
  }
  
  // Default: exact match or starts with href + "/"
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname();

  // Hide nav on workout execution pages
  if (pathname.includes("/workouts/") && pathname.includes("/start")) {
    return null;
  }

  const navItems = pathname.startsWith("/coach")
    ? coachNavItems
    : clientNavItems;

  const navContent = (
    <nav
      data-fc-bottom-nav
      className="fc-bottom-nav-float"
    >
      <div className="fc-bottom-nav-inner">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = isSegmentActive(pathname, item);
          const isCenter = item.isCenter === true;

          // Render center button (window.location.href bypasses dead router after tab switch)
          if (isCenter) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => { window.location.href = item.href; }}
                className="fc-bottom-nav-item-center bg-transparent border-none cursor-pointer"
              >
                <div className="fc-bottom-nav-center-button">
                  <Icon
                    className={`w-6 h-6 transition-all duration-200 ${
                      isActive ? "text-white" : "text-white/90"
                    }`}
                  />
                  {isActive && (
                    <div className="fc-bottom-nav-center-ring" aria-hidden />
                  )}
                </div>
                <span className="fc-bottom-nav-center-label">
                  {item.label}
                </span>
              </button>
            );
          }

          // Render regular nav items (window.location.href bypasses dead router after tab switch)
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => { window.location.href = item.href; }}
              className={`fc-bottom-nav-item ${isActive ? "fc-bottom-nav-item--active" : ""} bg-transparent border-none cursor-pointer`}
            >
              {/* Active pill background */}
              {isActive && (
                <div className="fc-bottom-nav-pill" aria-hidden />
              )}

              <div className="relative z-10">
                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive
                      ? "text-cyan-400"
                      : pathname.startsWith("/coach")
                        ? "text-gray-500"
                        : "fc-text-dim"
                  }`}
                />
              </div>

              <span
                className={`text-[10px] font-semibold leading-none relative z-10 transition-colors duration-200 ${
                  isActive
                    ? "text-cyan-400"
                    : pathname.startsWith("/coach")
                      ? "text-gray-500"
                      : "fc-text-dim"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  return navContent;
}
