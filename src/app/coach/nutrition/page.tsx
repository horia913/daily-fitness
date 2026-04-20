"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTheme } from "@/contexts/ThemeContext";
import { Utensils, ChefHat, Users, Wand2, Apple, Plus } from "lucide-react";
import Link from "next/link";

const NUTRITION_SECTIONS = [
  {
    title: "Meal Plans",
    description: "Create and manage meal plan templates",
    icon: ChefHat,
    href: "/coach/nutrition/meal-plans",
  },
  {
    title: "Generator",
    description: "Auto-generate meal plans with macro targets",
    icon: Wand2,
    href: "/coach/nutrition/generator",
  },
  {
    title: "Food Database",
    description: "Manage foods and nutrition data",
    icon: Utensils,
    href: "/coach/nutrition/foods",
  },
  {
    title: "Assignments",
    description: "Track and manage client assignments",
    icon: Users,
    href: "/coach/nutrition/assignments",
  },
  {
    title: "Create Meal Plan",
    description: "Start a new meal plan from scratch",
    icon: Plus,
    href: "/coach/nutrition/meal-plans/create",
  },
];

export default function CoachNutritionPage() {
  const { performanceSettings } = useTheme();

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="data-7xl" className="px-4 sm:px-6 py-6 pb-32 space-y-8">
          <GlassCard elevation={2} className="fc-card-shell p-6 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)]">
                  <Apple className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                    Nutrition
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                    Meal plans, food database, and client nutrition tools.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[color:var(--fc-text-dim)] mb-3 px-1">
              What do you want to manage?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {NUTRITION_SECTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link href={item.href} key={item.href}>
                    <GlassCard
                      elevation={2}
                      className="fc-card-shell p-5 h-full transition-all hover:scale-[1.02] hover:shadow-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[color:var(--fc-aurora)]/15 text-[color:var(--fc-accent)]">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-[color:var(--fc-text-primary)]">
                            {item.title}
                          </h3>
                          <p className="text-sm text-[color:var(--fc-text-dim)] mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                );
              })}
            </div>
          </section>
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
