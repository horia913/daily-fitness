"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Users,
  Dumbbell,
  Apple,
  Calendar,
  BarChart3,
  MessageCircle,
  Target,
  TrendingUp,
  Clock,
  Library,
  Layers,
  FolderTree,
  User,
  Trophy,
} from "lucide-react";
import Link from "next/link";

const menuItems = [
  {
    title: "Client Management",
    description: "Manage clients, view progress, and assign workouts",
    icon: Users,
    href: "/coach/clients",
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Programs & Workouts",
    description: "Create and manage workout programs and templates",
    icon: Dumbbell,
    href: "/coach/programs-workouts",
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Exercise Library",
    description: "Manage your exercise database and create custom exercises",
    icon: Library,
    href: "/coach/exercises",
    color: "bg-violet-100 text-violet-600",
  },
  {
    title: "Exercise Categories",
    description: "Organize exercises with custom categories",
    icon: Layers,
    href: "/coach/exercise-categories",
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Workout Categories",
    description: "Organize workout templates and programs",
    icon: FolderTree,
    href: "/coach/categories",
    color: "bg-pink-100 text-pink-600",
  },
  {
    title: "Nutrition Management",
    description: "Create meal plans and track client nutrition",
    icon: Apple,
    href: "/coach/nutrition",
    color: "bg-orange-100 text-orange-600",
  },
  {
    title: "Analytics & Reports",
    description: "View client progress and generate reports",
    icon: BarChart3,
    href: "/coach/analytics",
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    title: "Client Progress",
    description: "Monitor client progress and improvements",
    icon: TrendingUp,
    href: "/coach/progress",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Goals & Habits",
    description: "Set goals and track client habits",
    icon: Target,
    href: "/coach/goals",
    color: "bg-yellow-100 text-yellow-600",
  },
  {
    title: "Session Management",
    description: "Schedule and manage client sessions",
    icon: Calendar,
    href: "/coach/sessions",
    color: "bg-teal-100 text-teal-600",
  },
  {
    title: "Challenges",
    description: "Create and manage client challenges",
    icon: Trophy,
    href: "/coach/challenges",
    color: "bg-amber-100 text-amber-600",
  },
  {
    title: "Availability Settings",
    description: "Set your availability for client session bookings",
    icon: Clock,
    href: "/coach/availability",
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Coach Profile",
    description: "Manage your profile, settings, and account information",
    icon: User,
    href: "/coach/profile",
    color: "bg-slate-100 text-slate-600",
  },
];

export default function CoachMenu() {
  const { performanceSettings } = useTheme();

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    Coach Toolkit
                  </span>
                  <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                    Coach Menu
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Access all your coaching tools and features.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link href={item.href} key={index}>
                  <GlassCard elevation={2} className="fc-glass fc-card p-6 h-full transition-all hover:scale-[1.02] hover:shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                        {item.title}
                      </h3>
                    </div>
                    <p className="mt-3 text-sm text-[color:var(--fc-text-dim)]">
                      {item.description}
                    </p>
                  </GlassCard>
                </Link>
              );
            })}
          </div>

          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <h2 className="text-xl font-semibold text-[color:var(--fc-text-primary)] mb-4">
              Quick Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/coach/clients">
                <Button className="fc-btn fc-btn-secondary">
                  <Users className="w-4 h-4 mr-2" />
                  View All Clients
                </Button>
              </Link>
              <Link href="/coach/programs-workouts">
                <Button className="fc-btn fc-btn-secondary">
                  <Dumbbell className="w-4 h-4 mr-2" />
                  Create Workout
                </Button>
              </Link>
              <Link href="/coach/nutrition">
                <Button className="fc-btn fc-btn-secondary">
                  <Apple className="w-4 h-4 mr-2" />
                  Create Meal Plan
                </Button>
              </Link>
              <Link href="/coach/availability">
                <Button className="fc-btn fc-btn-secondary">
                  <Clock className="w-4 h-4 mr-2" />
                  Set Availability
                </Button>
              </Link>
              <Link href="/coach/profile">
                <Button className="fc-btn fc-btn-secondary">
                  <User className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
