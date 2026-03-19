"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  Dumbbell,
  Apple,
  BarChart3,
  ClipboardCheck,
  BookOpen,
  Layers,
  Library,
  Activity,
  ChefHat,
  Utensils,
  UserPlus,
  User,
  Clock,
  Calendar,
  Settings,
  Target,
  Award,
  Sparkles,
  Database,
  Wand2,
} from "lucide-react";
import Link from "next/link";

// Menu sections: only real, working pages. No dead links.
// /coach/reviews and /coach/messages do not exist — not linked.
// Exercise Categories, Workout Categories, Goals & Habits, Challenges, Clipcards, Notifications, Meals removed from menu (per-client or duplicate).

const SECTION_CLIENT_MANAGEMENT = {
  title: "Client Management",
  items: [
    { title: "Clients", description: "View and manage your client roster", icon: Users, href: "/coach/clients" },
  ],
};

const SECTION_TRAINING = {
  title: "Training",
  items: [
    { title: "Programs", description: "Create and manage workout programs", icon: BookOpen, href: "/coach/programs" },
    { title: "Workout Templates", description: "Create and manage workout templates", icon: Layers, href: "/coach/workouts/templates" },
    { title: "Exercise Library", description: "Manage exercises and create custom exercises", icon: Library, href: "/coach/exercises" },
    { title: "Gym Console", description: "Mark workouts complete for clients in person", icon: Activity, href: "/coach/gym-console" },
  ],
};

const SECTION_NUTRITION = {
  title: "Nutrition",
  items: [
    { title: "Meal Plans", description: "Create and manage meal plans", icon: ChefHat, href: "/coach/nutrition/meal-plans" },
    { title: "Generator", description: "Auto-generate full-day meal plans with macro targets", icon: Wand2, href: "/coach/nutrition/generator" },
    { title: "Food Database", description: "Manage food database", icon: Utensils, href: "/coach/nutrition/foods" },
    { title: "Assignments", description: "Assign meal plans to clients", icon: Users, href: "/coach/nutrition/assignments" },
  ],
};

const SECTION_ANALYTICS = {
  title: "Analytics & Reports",
  items: [
    { title: "Analytics", description: "View client progress and reporting", icon: BarChart3, href: "/coach/analytics" },
    { title: "Compliance Dashboard", description: "Follow-through and at-risk clients", icon: ClipboardCheck, href: "/coach/compliance" },
  ],
};

const SECTION_SETTINGS = {
  title: "Settings",
  items: [
    { title: "Profile", description: "Your profile and account", icon: User, href: "/coach/profile" },
  ],
};

const adminMenuItems = [
  { title: "Goal Templates", description: "Manage goal types for clients", icon: Target, href: "/admin/goal-templates" },
  { title: "Habit Categories", description: "Categories for client habits", icon: Sparkles, href: "/admin/habit-categories" },
  { title: "Achievement Templates", description: "Achievements and badges", icon: Award, href: "/admin/achievement-templates" },
  { title: "Tracking Sources", description: "Data sources for auto-tracking", icon: Database, href: "/admin/tracking-sources" },
];

const SECTIONS = [
  SECTION_CLIENT_MANAGEMENT,
  SECTION_TRAINING,
  SECTION_NUTRITION,
  SECTION_ANALYTICS,
  SECTION_SETTINGS,
];

export default function CoachMenu() {
  const { performanceSettings } = useTheme();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 pb-32 space-y-8">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)]">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                    Coach Menu
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                    Access your coaching tools and features.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[color:var(--fc-text-dim)] mb-3 px-1">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link href={item.href} key={item.href}>
                      <GlassCard
                        elevation={2}
                        className="fc-glass fc-card p-5 h-full transition-all hover:scale-[1.02] hover:shadow-xl"
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
          ))}

          {isAdmin && (
            <>
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[color:var(--fc-status-warning)] mb-3 px-1 flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" />
                  Admin only
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {adminMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link href={item.href} key={item.href}>
                        <div className="flex items-center gap-4 p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] hover:opacity-90 transition-all">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[color:var(--fc-status-warning)]/15 text-[color:var(--fc-status-warning)]">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[color:var(--fc-text-primary)]">{item.title}</h3>
                            <p className="text-xs text-[color:var(--fc-text-dim)]">{item.description}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
              <div className="flex justify-center">
                <Link href="/admin">
                  <Button className="fc-btn text-white" style={{ background: "var(--fc-status-warning)" }}>
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              </div>
            </>
          )}

          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)] mb-4">
              Quick Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/coach/clients">
                <Button className="fc-btn fc-btn-secondary">
                  <Users className="w-4 h-4 mr-2" />
                  View All Clients
                </Button>
              </Link>
              <Link href="/coach/programs">
                <Button className="fc-btn fc-btn-secondary">
                  <Dumbbell className="w-4 h-4 mr-2" />
                  Programs
                </Button>
              </Link>
              <Link href="/coach/workouts/templates">
                <Button className="fc-btn fc-btn-secondary">
                  <Layers className="w-4 h-4 mr-2" />
                  Workout Templates
                </Button>
              </Link>
              <Link href="/coach/nutrition/meal-plans">
                <Button className="fc-btn fc-btn-secondary">
                  <Apple className="w-4 h-4 mr-2" />
                  Meal Plans
                </Button>
              </Link>
              <Link href="/coach/profile">
                <Button className="fc-btn fc-btn-secondary">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
