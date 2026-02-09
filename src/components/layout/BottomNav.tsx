"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Home,
  Dumbbell,
  Apple,
  TrendingUp,
  Grid,
  Award,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string; fill?: string; stroke?: string }>;
  label: string;
}

const clientNavItems: NavItem[] = [
  { href: "/client", icon: Home, label: "Home" },
  { href: "/client/workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/client/nutrition", icon: Apple, label: "Nutrition" },
  { href: "/client/progress", icon: TrendingUp, label: "Progress" },
  { href: "/client/menu", icon: Grid, label: "Menu" },
];

const coachNavItems: NavItem[] = [
  { href: "/coach", icon: Home, label: "Dashboard" },
  { href: "/coach/programs-workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/coach/programs", icon: Award, label: "Programs" },
  { href: "/coach/nutrition", icon: Apple, label: "Nutrition" },
  { href: "/coach/menu", icon: Grid, label: "Menu" },
];

function isSegmentActive(pathname: string, href: string): boolean {
  if (href === "/client" || href === "/coach") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
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
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isSegmentActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`fc-bottom-nav-item ${isActive ? "fc-bottom-nav-item--active" : ""}`}
            >
              {/* Active pill background */}
              {isActive && (
                <div className="fc-bottom-nav-pill" aria-hidden />
              )}

              <div className="relative z-10">
                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? "fc-text-primary" : "fc-text-dim"
                  }`}
                />
              </div>

              <span
                className={`text-[10px] font-semibold leading-none relative z-10 transition-colors duration-200 ${
                  isActive ? "fc-text-primary" : "fc-text-dim"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return createPortal(navContent, document.body);
}
