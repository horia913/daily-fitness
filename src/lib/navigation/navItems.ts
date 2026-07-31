import type { ComponentType } from "react";
import {
  Home,
  Dumbbell,
  Apple,
  ClipboardCheck,
  User,
  Users,
  BarChart3,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  icon: ComponentType<{ className?: string; fill?: string; stroke?: string }>;
  label: string;
};

export const clientNavItems: AppNavItem[] = [
  { href: "/client", icon: Home, label: "Home" },
  { href: "/client/check-ins", icon: ClipboardCheck, label: "Check-in" },
  { href: "/client/train", icon: Dumbbell, label: "Train" },
  { href: "/client/nutrition", icon: Apple, label: "Fuel" },
  { href: "/client/me", icon: User, label: "Me" },
];

export const coachNavItems: AppNavItem[] = [
  { href: "/coach", icon: Home, label: "Briefing" },
  { href: "/coach/clients", icon: Users, label: "Clients" },
  { href: "/coach/training", icon: Dumbbell, label: "Training" },
  { href: "/coach/nutrition", icon: Apple, label: "Nutrition" },
  { href: "/coach/insights", icon: BarChart3, label: "Insights" },
];

/** True when a Progress workout-log screen was opened from Train (`?from=train`). */
export function isWorkoutLogFromTrain(
  pathname: string,
  search: string = "",
): boolean {
  if (!pathname.startsWith("/client/progress/workout-logs")) return false;
  const q = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(q).get("from") === "train";
}

export function isSegmentActive(
  pathname: string,
  item: AppNavItem,
  search: string = typeof window !== "undefined" ? window.location.search : "",
): boolean {
  const { href } = item;
  const fromTrain = isWorkoutLogFromTrain(pathname, search);

  if (href === "/client" || href === "/coach") {
    return pathname === href;
  }

  if (href === "/client/check-ins") {
    return pathname.startsWith("/client/check-in");
  }

  if (href === "/client/train") {
    return (
      pathname.startsWith("/client/train") ||
      pathname.startsWith("/client/workouts") ||
      fromTrain
    );
  }

  if (href === "/client/nutrition") {
    return pathname.startsWith("/client/nutrition");
  }

  if (href === "/client/me") {
    if (fromTrain) return false;
    return (
      pathname.startsWith("/client/me") ||
      pathname.startsWith("/client/profile") ||
      pathname.startsWith("/client/privacy") ||
      pathname.startsWith("/client/settings") ||
      pathname.startsWith("/client/coach") ||
      pathname.startsWith("/client/progress") ||
      pathname.startsWith("/client/goals") ||
      pathname.startsWith("/client/habits") ||
      pathname.startsWith("/client/challenges") ||
      pathname.startsWith("/client/activity")
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
      pathname.startsWith("/coach/testing") ||
      pathname.startsWith("/coach/challenges")
    );
  }

  if (href === "/coach/insights") {
    return (
      pathname === "/coach/insights" ||
      pathname.startsWith("/coach/analytics") ||
      pathname.startsWith("/coach/compliance")
    );
  }

  return pathname === href || pathname.startsWith(href + "/");
}

export function navItemsForPathname(pathname: string): {
  items: AppNavItem[];
  isCoach: boolean;
} {
  const isCoach = pathname.startsWith("/coach");
  return {
    items: isCoach ? coachNavItems : clientNavItems,
    isCoach,
  };
}
