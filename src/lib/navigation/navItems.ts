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
  { href: "/coach", icon: Home, label: "Home" },
  { href: "/coach/clients", icon: Users, label: "Clients" },
  { href: "/coach/training", icon: Dumbbell, label: "Training" },
  { href: "/coach/nutrition", icon: Apple, label: "Nutrition" },
  { href: "/coach/analytics", icon: BarChart3, label: "Analytics" },
];

export function isSegmentActive(pathname: string, item: AppNavItem): boolean {
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
