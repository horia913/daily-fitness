"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Layers,
  Dumbbell,
  FolderTree,
  Library,
  Users,
  Activity,
} from "lucide-react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

const trainingHubLinksForEntry = [
  { label: "Programs", href: "/coach/training/programs", icon: BookOpen },
  { label: "Workout Templates", href: "/coach/workouts/templates", icon: Layers },
  { label: "Exercises", href: "/coach/exercises", icon: Dumbbell },
  { label: "Workout Categories", href: "/coach/categories", icon: FolderTree },
  { label: "Exercise Categories", href: "/coach/exercise-categories", icon: Library },
  { label: "Gym Console", href: "/coach/gym-console", icon: Activity },
];

function TrainingHubEntry() {
  const { getSemanticColor, performanceSettings } = useTheme();

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          {/* Training Hub — navigation only */}
          <section className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4 sm:p-5">
            <h2 className="text-lg font-bold text-[color:var(--fc-text-primary)] mb-0.5">
              Training
            </h2>
            <p className="text-sm text-[color:var(--fc-text-dim)] mb-4">
              Programs, templates, exercises, and assignments
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
              {trainingHubLinksForEntry.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="transition-opacity hover:opacity-90 active:opacity-80"
                  >
                    <div className="flex items-center gap-2 p-3 rounded-xl border border-[color:var(--fc-surface-card-border)] bg-[color:var(--fc-bg-elevated)]/50">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${getSemanticColor("trust").primary}20` }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: getSemanticColor("trust").primary }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[color:var(--fc-text-primary)] truncate">
                        {item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Primary hub CTA */}
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold fc-text-primary">
                  Training Hub
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Jump into programs, templates, and your training tools.
                </p>
              </div>
              <Link href="/coach/training/programs">
                <Button className="fc-btn fc-btn-primary">
                  Manage Programs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}

export default function CoachProgramsPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <TrainingHubEntry />
    </ProtectedRoute>
  );
}

