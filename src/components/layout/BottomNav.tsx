"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

  // Show static skeleton during SSR and initial hydration
  if (!mounted) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 h-20 z-[10000] shadow-lg">
        <div className="h-full px-2">
          <div className="flex items-center justify-between h-full max-w-md mx-auto">
            <div className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-2xl min-w-[60px]">
              <div className="w-6 h-6 bg-slate-200 rounded" />
              <div className="w-8 h-3 bg-slate-200 rounded" />
            </div>
            <div className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-2xl min-w-[55px]">
              <div className="w-5.5 h-5.5 bg-slate-200 rounded" />
              <div className="w-8 h-3 bg-slate-200 rounded" />
            </div>
            <div className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-2xl min-w-[55px]">
              <div className="w-5.5 h-5.5 bg-slate-200 rounded" />
              <div className="w-8 h-3 bg-slate-200 rounded" />
            </div>
            <div className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-2xl min-w-[55px]">
              <div className="w-5.5 h-5.5 bg-slate-200 rounded" />
              <div className="w-8 h-3 bg-slate-200 rounded" />
            </div>
            <div className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-2xl min-w-[55px]">
              <div className="w-5.5 h-5.5 bg-slate-200 rounded" />
              <div className="w-8 h-3 bg-slate-200 rounded" />
            </div>
            <div className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-2xl min-w-[50px]">
              <div className="w-5 h-5 bg-slate-200 rounded" />
              <div className="w-8 h-3 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Determine which nav items to show based on current path
  const navItems = pathname.startsWith("/coach")
    ? coachNavItems
    : clientNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 h-20 z-[10000] shadow-lg">
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
                      ? "text-orange-600 bg-gradient-to-br from-orange-50 to-orange-100 shadow-md transform scale-105"
                      : isCoachProgramsItem
                      ? "text-purple-600 bg-gradient-to-br from-purple-50 to-purple-100 shadow-md transform scale-105"
                      : isCoachNutritionItem
                      ? "text-green-600 bg-gradient-to-br from-green-50 to-green-100 shadow-md transform scale-105"
                      : isCoachMenuItem
                      ? "text-slate-600 bg-gradient-to-br from-slate-50 to-slate-100 shadow-md transform scale-105"
                      : "text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md transform scale-105"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm hover:transform hover:scale-102"
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
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full animate-pulse"></div>
                )}

                {/* Special indicator for Workouts item */}
                {isActive && isWorkoutsItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                )}

                {/* Special indicator for Nutrition item */}
                {isActive && isNutritionItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                )}

                {/* Special indicator for Progress item */}
                {isActive && isProgressItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                )}

                {/* Special indicator for Profile item */}
                {isActive && isProfileItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-slate-600 rounded-full animate-pulse"></div>
                )}

                {/* Special indicator for Coach Workouts item */}
                {isActive && isCoachWorkoutsItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                )}

                {/* Special indicator for Coach Nutrition item */}
                {isActive && isCoachNutritionItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                )}

                {/* Special indicator for Coach Programs item */}
                {isActive && isCoachProgramsItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                )}

                {/* Special indicator for Coach Menu item */}
                {isActive && isCoachMenuItem && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse"></div>
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
                          ? "text-orange-600"
                          : isNutritionItem
                          ? "text-green-600"
                          : isProgressItem
                          ? "text-purple-600"
                          : isProfileItem
                          ? "text-slate-700"
                          : isCoachWorkoutsItem
                          ? "text-orange-600"
                          : isCoachProgramsItem
                          ? "text-purple-600"
                          : isCoachNutritionItem
                          ? "text-green-600"
                          : isCoachMenuItem
                          ? "text-slate-600"
                          : "text-blue-600"
                        : "text-slate-500 group-hover:text-slate-700"
                    }`}
                  />

                  {/* Special sparkle effect for active Home item */}
                  {isActive && isHomeItem && (
                    <div className="absolute -top-1 -right-1">
                      <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
                    </div>
                  )}

                  {/* Special energy effect for active Workouts item */}
                  {isActive && isWorkoutsItem && (
                    <div className="absolute -top-1 -right-1">
                      <Zap className="w-3 h-3 text-orange-400 animate-pulse" />
                    </div>
                  )}

                  {/* Special leaf effect for active Nutrition item */}
                  {isActive && isNutritionItem && (
                    <div className="absolute -top-1 -right-1">
                      <Leaf className="w-3 h-3 text-green-400 animate-pulse" />
                    </div>
                  )}

                  {/* Special trophy effect for active Progress item */}
                  {isActive && isProgressItem && (
                    <div className="absolute -top-1 -right-1">
                      <Trophy className="w-3 h-3 text-purple-400 animate-pulse" />
                    </div>
                  )}

                  {/* Special settings effect for active Profile item */}
                  {isActive && isProfileItem && (
                    <div className="absolute -top-1 -right-1">
                      <Settings className="w-3 h-3 text-slate-500 animate-pulse" />
                    </div>
                  )}

                  {/* Special energy effect for active Coach Workouts item */}
                  {isActive && isCoachWorkoutsItem && (
                    <div className="absolute -top-1 -right-1">
                      <Zap className="w-3 h-3 text-orange-400 animate-pulse" />
                    </div>
                  )}

                  {/* Special trophy effect for active Coach Programs item */}
                  {isActive && isCoachProgramsItem && (
                    <div className="absolute -top-1 -right-1">
                      <Trophy className="w-3 h-3 text-purple-400 animate-pulse" />
                    </div>
                  )}

                  {/* Special health effect for active Coach Nutrition item */}
                  {isActive && isCoachNutritionItem && (
                    <div className="absolute -top-1 -right-1">
                      <Leaf className="w-3 h-3 text-green-400 animate-pulse" />
                    </div>
                  )}

                  {/* Special tools effect for active Coach Menu item */}
                  {isActive && isCoachMenuItem && (
                    <div className="absolute -top-1 -right-1">
                      <Grid className="w-3 h-3 text-slate-400 animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Label with enhanced typography */}
                <span
                  className={`text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? isWorkoutsItem
                        ? "text-orange-600"
                        : isNutritionItem
                        ? "text-green-600"
                        : isProgressItem
                        ? "text-purple-600"
                        : isProfileItem
                        ? "text-slate-700"
                        : isCoachWorkoutsItem
                        ? "text-orange-600"
                        : isCoachProgramsItem
                        ? "text-purple-600"
                        : isCoachNutritionItem
                        ? "text-green-600"
                        : isCoachMenuItem
                        ? "text-slate-600"
                        : "text-blue-600"
                      : "text-slate-500 group-hover:text-slate-700"
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
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-blue-200/30 rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Workouts item */}
                {isActive && isWorkoutsItem && (
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 to-orange-200/30 rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Nutrition item */}
                {isActive && isNutritionItem && (
                  <div className="absolute inset-0 bg-gradient-to-br from-green-100/50 to-green-200/30 rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Progress item */}
                {isActive && isProgressItem && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 to-purple-200/30 rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Profile item */}
                {isActive && isProfileItem && (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-slate-200/30 rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Coach Workouts item */}
                {isActive && isCoachWorkoutsItem && (
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 to-orange-200/30 rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Coach Programs item */}
                {isActive && isCoachProgramsItem && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 to-purple-200/30 rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Coach Nutrition item */}
                {isActive && isCoachNutritionItem && (
                  <div className="absolute inset-0 bg-gradient-to-br from-green-100/50 to-green-200/30 rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Subtle background glow for active Coach Menu item */}
                {isActive && isCoachMenuItem && (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-slate-200/30 rounded-2xl blur-sm -z-10"></div>
                )}

                {/* Workout progress indicator for active Workouts item */}
                {isActive && isWorkoutsItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full animate-pulse"></div>
                )}

                {/* Nutrition progress indicator for active Nutrition item */}
                {isActive && isNutritionItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-pulse"></div>
                )}

                {/* Progress indicator for active Progress item */}
                {isActive && isProgressItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full animate-pulse"></div>
                )}

                {/* Profile indicator for active Profile item */}
                {isActive && isProfileItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-slate-400 to-slate-600 rounded-full animate-pulse"></div>
                )}

                {/* Coach Workouts indicator for active Coach Workouts item */}
                {isActive && isCoachWorkoutsItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full animate-pulse"></div>
                )}

                {/* Coach Programs indicator for active Coach Programs item */}
                {isActive && isCoachProgramsItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full animate-pulse"></div>
                )}

                {/* Coach Nutrition indicator for active Coach Nutrition item */}
                {isActive && isCoachNutritionItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-pulse"></div>
                )}

                {/* Coach Menu indicator for active Coach Menu item */}
                {isActive && isCoachMenuItem && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-slate-400 to-slate-600 rounded-full animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
