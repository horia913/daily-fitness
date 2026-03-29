"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import {
  BookOpen,
  Layers,
  Library,
  Activity,
  ChevronRight,
  Tag,
  FolderTree,
  Trophy,
} from "lucide-react";

const PRIMARY_LINKS = [
  {
    href: "/coach/programs",
    title: "Programs",
    description: "Multi-week programs and weekly schedules",
    icon: BookOpen,
    accent: "border-l-2 border-l-cyan-500 bg-cyan-500/5",
  },
  {
    href: "/coach/workouts/templates",
    title: "Workout templates",
    description: "Single-session workouts for programs and assignments",
    icon: Layers,
    accent: "border-l-2 border-l-violet-500 bg-violet-500/5",
  },
  {
    href: "/coach/exercises",
    title: "Exercise library",
    description: "Browse and manage exercises",
    icon: Library,
    accent: "border-l-2 border-l-emerald-500 bg-emerald-500/5",
  },
  {
    href: "/coach/challenges",
    title: "Challenges",
    description: "Create and manage client challenges; open a challenge from the list for details",
    icon: Trophy,
    accent: "border-l-2 border-l-rose-500 bg-rose-500/5",
  },
  {
    href: "/coach/gym-console",
    title: "Gym console",
    description: "Mark in-person workouts complete for clients",
    icon: Activity,
    accent: "border-l-2 border-l-amber-500 bg-amber-500/5",
  },
] as const;

const SECONDARY_LINKS = [
  {
    href: "/coach/categories?tab=workouts",
    title: "Workout categories",
    icon: FolderTree,
  },
  {
    href: "/coach/categories?tab=exercises",
    title: "Exercise categories",
    icon: Tag,
  },
] as const;

export default function CoachTrainingHubPage() {
  const { performanceSettings } = useTheme();

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-lg px-4 pb-32 pt-6 sm:max-w-2xl sm:px-6">
          <header className="mb-6">
            <h1
              className="font-bold fc-text-primary"
              style={{ fontSize: "var(--fc-type-h2)" }}
            >
              Training
            </h1>
            <p className="mt-1 text-sm fc-text-dim">
              Programs, workout templates, and your exercise library.
            </p>
          </header>

          <nav className="flex flex-col border-y border-white/5" aria-label="Training">
            {PRIMARY_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  type="button"
                  className={`flex w-full min-h-[52px] items-center gap-4 border-b border-white/5 py-3 text-left transition-colors hover:bg-white/[0.02] ${item.accent}`}
                  onClick={() => {
                    window.location.href = item.href;
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--fc-glass-highlight)] text-cyan-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold fc-text-primary">{item.title}</h2>
                    <p className="mt-0.5 text-xs fc-text-dim">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-cyan-400/80" />
                </button>
              );
            })}
          </nav>

          <div className="mt-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
              Organization
            </p>
            <div className="flex flex-col border-y border-white/5">
              {SECONDARY_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    type="button"
                    className="flex w-full min-h-[48px] items-center justify-between border-b border-white/5 py-3 text-left text-sm font-medium text-cyan-400 transition-colors hover:bg-white/[0.02]"
                    onClick={() => {
                      window.location.href = item.href;
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 opacity-80" />
                      {item.title}
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-60" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
