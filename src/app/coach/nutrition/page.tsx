"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
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
          <div className="max-w-7xl mx-auto p-6">
            {/* Nutrition Hub — navigation only */}
            <section className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4 sm:p-5 mb-6">
              <h2 className="text-lg font-bold text-[color:var(--fc-text-primary)] mb-0.5">Nutrition</h2>
              <p className="text-sm text-[color:var(--fc-text-dim)] mb-4">Meal plans, meals, and client nutrition tools</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {nutritionHubLinks.map((item) => {
                  const Icon = item.icon;
                  const content = (
                    <div className="flex items-center gap-2 p-3 rounded-xl border border-[color:var(--fc-surface-card-border)] bg-[color:var(--fc-bg-elevated)]/50">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${getSemanticColor("success").primary}20` }}>
                        <Icon className="w-4 h-4" style={{ color: getSemanticColor("success").primary }} />
                      </div>
                      <span className="text-xs font-medium text-[color:var(--fc-text-primary)] truncate">{item.label}</span>
                    </div>
                  );
                  return (
                    <Link key={item.href} href={item.href} className="transition-opacity hover:opacity-90 active:opacity-80">
                      {content}
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* What do you want to manage? */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-[color:var(--fc-aurora-green)]/20">
                  <Apple className="w-7 h-7 text-[color:var(--fc-accent-green)]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[color:var(--fc-text-primary)]">Nutrition</h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">What do you want to manage?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {manageCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-4 transition-opacity hover:opacity-90 active:opacity-80"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${getSemanticColor("trust").primary}20` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: getSemanticColor("trust").primary }} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[color:var(--fc-text-primary)] truncate">
                            {item.label}
                          </div>
                          <div className="text-xs text-[color:var(--fc-text-dim)] truncate">
                            {item.label === "Meal Plans"
                              ? "Create and manage meal plan templates"
                              : item.label === "Generator"
                                ? "Auto-generate meal plans with macro targets"
                                : item.label === "Food Database"
                                  ? "Manage foods and nutrition data"
                                  : "Track and manage client assignments"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
