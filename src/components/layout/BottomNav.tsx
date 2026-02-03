"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Home,
  Dumbbell,
  Calendar,
  MessageCircle,
  User,
  Target,
  CreditCard,
  Utensils,
  TrendingUp,
  Award,
  Apple,
  Flag,
  Users,
  BarChart3,
  Grid,
  Sparkles,
  Activity,
  Zap,
  Leaf,
  CheckCircle,
  Trophy,
  Settings,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const clientNavItems: NavItem[] = [
  { href: "/client", icon: Home, label: "Home" },
  { href: "/client/workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/client/nutrition", icon: Apple, label: "Nutrition" },
  { href: "/client/progress", icon: TrendingUp, label: "Progress" },
  { href: "/client/profile", icon: User, label: "Profile" },
];

const coachNavItems: NavItem[] = [
  { href: "/coach", icon: Home, label: "Dashboard" },
  { href: "/coach/programs-workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/coach/programs", icon: Award, label: "Programs" },
  { href: "/coach/nutrition", icon: Apple, label: "Nutrition" },
  { href: "/coach/menu", icon: Grid, label: "Menu" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Only render after component mounts to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const fixedNavStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    zIndex: 10000,
  };

  // Render nothing until mounted so server and client output match (avoids hydration mismatch).
  // After mount we portal the nav into document.body.
  if (!mounted) {
    return null;
  }

  // Determine which nav items to show based on current path
  const navItems = pathname.startsWith("/coach")
    ? coachNavItems
    : clientNavItems;

  const navContent = (
    <nav
      data-fc-bottom-nav
      style={fixedNavStyle}
      className="fc-glass fc-card border-t border-[color:var(--fc-glass-border)] h-20 shadow-lg !rounded-none"
    >
      <div className="h-full px-2">
        <div className="flex items-center justify-between h-full max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isHomeItem =
              item.href === "/client" || item.href === "/coach";
            const isWorkoutsItem =
              item.href === "/client/workouts" ||
              item.href === "/coach/programs-workouts";
            const isNutritionItem =
              item.href === "/client/nutrition" ||
              item.href === "/coach/nutrition";
            const isProgressItem = item.href === "/client/progress";
            const isProfileItem = item.href === "/client/profile";
            const isCoachWorkoutsItem =
              item.href === "/coach/programs-workouts";
            const isCoachProgramsItem = item.href === "/coach/programs";
            const isCoachNutritionItem = item.href === "/coach/nutrition";
            const isCoachMenuItem = item.href === "/coach/menu";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-2xl transition-all duration-200 ease-in-out ${
                  isActive
                    ? isCoachWorkoutsItem
                      ? "fc-text-workouts fc-glass-soft border border-[color:var(--fc-glass-border)] shadow-md transform scale-105"
                      : isCoachProgramsItem
                      ? "fc-text-workouts fc-glass-soft border border-[color:var(--fc-glass-border)] shadow-md transform scale-105"
                      : isCoachNutritionItem
                      ? "fc-text-habits fc-glass-soft border border-[color:var(--fc-glass-border)] shadow-md transform scale-105"
                      : isCoachMenuItem
                      ? "fc-text-neutral fc-glass-soft border border-[color:var(--fc-glass-border)] shadow-md transform scale-105"
                      : "fc-text-primary fc-glass-soft border border-[color:var(--fc-glass-border)] shadow-md transform scale-105"
                    : "fc-text-subtle hover:fc-text-primary hover:fc-glass-soft hover:shadow-sm hover:transform hover:scale-102"
                } ${
                  isHomeItem
                    ? "min-w-[60px]"
                    : isWorkoutsItem ||
                      isNutritionItem ||
                      isProgressItem ||
                      isProfileItem ||
                      isCoachProgramsItem
                    ? "min-w-[55px]"
                    : "min-w-[50px]"
                }`}
              >
                {/* Special indicator for Home/Dashboard item */}
                {isActive && isHomeItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[color:var(--fc-domain-workouts)] rounded-full animate-pulse"></div>
                )}

                {/* Special indicator for Workouts item */}
                {isActive && isWorkoutsItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[color:var(--fc-domain-workouts)] rounded-full animate-bounce"></div>
                )}

                {/* Special indicator for Nutrition item */}
                {isActive && isNutritionItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[color:var(--fc-accent-cyan)] rounded-full animate-pulse"></div>
                )}

                {/* Special indicator for Progress item */}
                {isActive && isProgressItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[color:var(--fc-accent-cyan)] rounded-full animate-pulse"></div>
                )}

                {/* Special indicator for Profile item */}
                {isActive && isProfileItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[color:var(--fc-glass-border)] rounded-full animate-pulse"></div>
                )}

                {/* Special indicator for Coach Workouts item */}
                {isActive && isCoachWorkoutsItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[color:var(--fc-domain-workouts)] rounded-full animate-bounce"></div>
                )}

                {/* Special indicator for Coach Nutrition item */}
                {isActive && isCoachNutritionItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[color:var(--fc-accent-cyan)] rounded-full animate-pulse"></div>
                )}

                {/* Special indicator for Coach Programs item */}
                {isActive && isCoachProgramsItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[color:var(--fc-accent-cyan)] rounded-full animate-pulse"></div>
                )}

                {/* Special indicator for Coach Menu item */}
                {isActive && isCoachMenuItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[color:var(--fc-glass-border)] rounded-full animate-pulse"></div>
                )}

                {/* Icon with special treatment for Home, Workouts, Nutrition, Progress, Profile, Coach Workouts, Coach Programs, Coach Nutrition, Coach Messages, and Coach Menu */}
                <div
                  className={`relative ${
                    isHomeItem && isActive
                      ? "animate-pulse"
                      : isWorkoutsItem && isActive
                      ? "animate-pulse"
                      : isNutritionItem && isActive
                      ? "animate-pulse"
                      : isProgressItem && isActive
                      ? "animate-pulse"
                      : isProfileItem && isActive
                      ? "animate-pulse"
                      : isCoachWorkoutsItem && isActive
                      ? "animate-pulse"
                      : isCoachProgramsItem && isActive
                      ? "animate-pulse"
                      : isCoachNutritionItem && isActive
                      ? "animate-pulse"
                      : isCoachMenuItem && isActive
                      ? "animate-pulse"
                      : ""
                  }`}
                >
                  <Icon
                    className={`${
                      isHomeItem
                        ? "w-6 h-6"
                        : isWorkoutsItem ||
                          isNutritionItem ||
                          isProgressItem ||
                          isProfileItem ||
                          isCoachWorkoutsItem ||
                          isCoachProgramsItem ||
                          isCoachNutritionItem ||
                          isCoachMenuItem
                        ? "w-5.5 h-5.5"
                        : "w-5 h-5"
                    } transition-all duration-200 ${
                      isActive
                        ? isWorkoutsItem
                          ? "fc-text-workouts"
                          : isNutritionItem
                          ? "fc-text-habits"
                          : isProgressItem
                          ? "fc-text-warning"
                          : isProfileItem
                          ? "fc-text-neutral"
                          : isCoachWorkoutsItem
                          ? "fc-text-workouts"
                          : isCoachProgramsItem
                          ? "fc-text-workouts"
                          : isCoachNutritionItem
                          ? "fc-text-habits"
                          : isCoachMenuItem
                          ? "fc-text-neutral"
                          : "fc-text-primary"
                        : "fc-text-subtle group-hover:fc-text-primary"
                    }`}
                  />

                  {/* Special sparkle effect for active Home item */}
                  {isActive && isHomeItem && (
                    <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-3 h-3 fc-text-workouts animate-pulse" />
                    </div>
                  )}

                  {/* Special energy effect for active Workouts item */}
                  {isActive && isWorkoutsItem && (
                    <div className="absolute -top-1 -right-1">
                    <Zap className="w-3 h-3 fc-text-workouts animate-pulse" />
                    </div>
                  )}

                  {/* Special leaf effect for active Nutrition item */}
                  {isActive && isNutritionItem && (
                    <div className="absolute -top-1 -right-1">
                    <Leaf className="w-3 h-3 fc-text-habits animate-pulse" />
                    </div>
                  )}

                  {/* Special trophy effect for active Progress item */}
                  {isActive && isProgressItem && (
                    <div className="absolute -top-1 -right-1">
                    <Trophy className="w-3 h-3 fc-text-warning animate-pulse" />
                    </div>
                  )}

                  {/* Special settings effect for active Profile item */}
                  {isActive && isProfileItem && (
                    <div className="absolute -top-1 -right-1">
                    <Settings className="w-3 h-3 fc-text-neutral animate-pulse" />
                    </div>
                  )}

                  {/* Special energy effect for active Coach Workouts item */}
                  {isActive && isCoachWorkoutsItem && (
                    <div className="absolute -top-1 -right-1">
                    <Zap className="w-3 h-3 fc-text-workouts animate-pulse" />
                    </div>
                  )}

                  {/* Special trophy effect for active Coach Programs item */}
                  {isActive && isCoachProgramsItem && (
                    <div className="absolute -top-1 -right-1">
                    <Trophy className="w-3 h-3 fc-text-workouts animate-pulse" />
                    </div>
                  )}

                  {/* Special health effect for active Coach Nutrition item */}
                  {isActive && isCoachNutritionItem && (
                    <div className="absolute -top-1 -right-1">
                    <Leaf className="w-3 h-3 fc-text-habits animate-pulse" />
                    </div>
                  )}

                  {/* Special tools effect for active Coach Menu item */}
                  {isActive && isCoachMenuItem && (
                    <div className="absolute -top-1 -right-1">
                    <Grid className="w-3 h-3 fc-text-neutral animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Label with enhanced typography */}
                <span
                  className={`text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? isWorkoutsItem
                        ? "fc-text-workouts"
                        : isNutritionItem
                        ? "fc-text-habits"
                        : isProgressItem
                        ? "fc-text-warning"
                        : isProfileItem
                        ? "fc-text-neutral"
                        : isCoachWorkoutsItem
                        ? "fc-text-workouts"
                        : isCoachProgramsItem
                        ? "fc-text-workouts"
                        : isCoachNutritionItem
                        ? "fc-text-habits"
                        : isCoachMenuItem
                        ? "fc-text-neutral"
                        : "fc-text-primary"
                      : "fc-text-subtle group-hover:fc-text-primary"
                  } ${
                    isHomeItem
                      ? "text-[11px]"
                      : isWorkoutsItem ||
                        isNutritionItem ||
                        isProgressItem ||
                        isProfileItem ||
                        isCoachWorkoutsItem ||
                        isCoachProgramsItem ||
                        isCoachNutritionItem ||
                        isCoachMenuItem
                      ? "text-[10.5px]"
                      : "text-[10px]"
                  }`}
                >
                  {item.label}
                </span>

                {/* Subtle background glow for active Home item */}
                {isActive && isHomeItem && (
                  <div className="absolute inset-0 fc-glass-soft rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Workouts item */}
                {isActive && isWorkoutsItem && (
                  <div className="absolute inset-0 fc-glass-soft rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Nutrition item */}
                {isActive && isNutritionItem && (
                  <div className="absolute inset-0 fc-glass-soft rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Progress item */}
                {isActive && isProgressItem && (
                  <div className="absolute inset-0 fc-glass-soft rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Profile item */}
                {isActive && isProfileItem && (
                  <div className="absolute inset-0 fc-glass-soft rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Coach Workouts item */}
                {isActive && isCoachWorkoutsItem && (
                  <div className="absolute inset-0 fc-glass-soft rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Coach Programs item */}
                {isActive && isCoachProgramsItem && (
                  <div className="absolute inset-0 fc-glass-soft rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Coach Nutrition item */}
                {isActive && isCoachNutritionItem && (
                  <div className="absolute inset-0 fc-glass-soft rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Coach Menu item */}
                {isActive && isCoachMenuItem && (
                  <div className="absolute inset-0 fc-glass-soft rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Workout progress indicator for active Workouts item */}
                {isActive && isWorkoutsItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[color:var(--fc-domain-workouts)] rounded-full animate-pulse"></div>
                )}

                {/* Nutrition progress indicator for active Nutrition item */}
                {isActive && isNutritionItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[color:var(--fc-accent-cyan)] rounded-full animate-pulse"></div>
                )}

                {/* Progress indicator for active Progress item */}
                {isActive && isProgressItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[color:var(--fc-accent-cyan)] rounded-full animate-pulse"></div>
                )}

                {/* Profile indicator for active Profile item */}
                {isActive && isProfileItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[color:var(--fc-glass-border)] rounded-full animate-pulse"></div>
                )}

                {/* Coach Workouts indicator for active Coach Workouts item */}
                {isActive && isCoachWorkoutsItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[color:var(--fc-domain-workouts)] rounded-full animate-pulse"></div>
                )}

                {/* Coach Programs indicator for active Coach Programs item */}
                {isActive && isCoachProgramsItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[color:var(--fc-domain-workouts)] rounded-full animate-pulse"></div>
                )}

                {/* Coach Nutrition indicator for active Coach Nutrition item */}
                {isActive && isCoachNutritionItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[color:var(--fc-accent-cyan)] rounded-full animate-pulse"></div>
                )}

                {/* Coach Menu indicator for active Coach Menu item */}
                {isActive && isCoachMenuItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[color:var(--fc-glass-border)] rounded-full animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );

  // Portal the nav into document.body so it is always viewport-fixed
  return createPortal(navContent, document.body);
}
