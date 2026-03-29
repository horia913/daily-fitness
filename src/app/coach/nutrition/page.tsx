"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Utensils,
  Plus,
  ChefHat,
  Apple,
  Users,
  Wand2,
} from "lucide-react";
import Link from "next/link";

export default function CoachNutritionPage() {
  const { performanceSettings, getSemanticColor } = useTheme();

  const nutritionHubLinks = [
    { label: "Meal Plans", href: "/coach/nutrition/meal-plans", icon: ChefHat, current: false },
    { label: "Generator", href: "/coach/nutrition/generator", icon: Wand2, current: false },
    { label: "Create Meal Plan", href: "/coach/nutrition/meal-plans/create", icon: Plus, current: false },
    { label: "Meals", href: "/coach/meals", icon: Utensils, current: false },
  ];

  const manageCards = [
    { label: "Meal Plans", href: "/coach/nutrition/meal-plans", icon: ChefHat },
    { label: "Generator", href: "/coach/nutrition/generator", icon: Wand2 },
    { label: "Food Database", href: "/coach/nutrition/foods", icon: Utensils },
    { label: "Assignments", href: "/coach/nutrition/assignments", icon: Users },
  ];

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen pb-32">
          <div className="mx-auto max-w-7xl p-6">
            <header className="mb-6 border-b border-white/5 pb-4">
              <h1 className="text-2xl font-bold text-[color:var(--fc-text-primary)]">Nutrition</h1>
              <p className="mt-1 text-sm text-[color:var(--fc-text-dim)]">
                Meal plans, meals, and client nutrition tools
              </p>
            </header>

            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[color:var(--fc-text-dim)]">
              Quick links
            </p>
            <nav className="mb-8 flex flex-col border-y border-white/5" aria-label="Nutrition quick links">
              {nutritionHubLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-[48px] items-center gap-3 border-b border-white/5 py-3 transition-colors hover:bg-white/[0.02]"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `${getSemanticColor("success").primary}20` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: getSemanticColor("success").primary }} />
                    </div>
                    <span className="truncate text-sm font-medium text-[color:var(--fc-text-primary)]">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-[color:var(--fc-aurora-green)]/20 p-2">
                <Apple className="h-6 w-6 text-[color:var(--fc-accent-green)]" />
              </div>
              <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                What do you want to manage?
              </h2>
            </div>

            <nav className="flex flex-col border-y border-white/5" aria-label="Nutrition management">
              {manageCards.map((item) => {
                const Icon = item.icon;
                const sub =
                  item.label === "Meal Plans"
                    ? "Create and manage meal plan templates"
                    : item.label === "Generator"
                      ? "Auto-generate meal plans with macro targets"
                      : item.label === "Food Database"
                        ? "Manage foods and nutrition data"
                        : "Track and manage client assignments";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-[52px] items-center gap-3 border-b border-white/5 py-3 transition-colors hover:bg-white/[0.02]"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `${getSemanticColor("trust").primary}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: getSemanticColor("trust").primary }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[color:var(--fc-text-primary)]">
                        {item.label}
                      </div>
                      <div className="line-clamp-1 text-xs text-[color:var(--fc-text-dim)]">{sub}</div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
