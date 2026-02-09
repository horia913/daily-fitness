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
  Settings,
  Database,
  Award,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const menuItems = [
  { title: "Client Management", description: "Manage clients, view progress, and assign workouts", icon: Users, href: "/coach/clients", iconTile: "fc-icon-workouts" },
  { title: "Programs & Workouts", description: "Create and manage workout programs and templates", icon: Dumbbell, href: "/coach/programs-workouts", iconTile: "fc-icon-workouts" },
  { title: "Exercise Library", description: "Manage your exercise database and create custom exercises", icon: Library, href: "/coach/exercises", iconTile: "fc-icon-challenges" },
  { title: "Exercise Categories", description: "Organize exercises with custom categories", icon: Layers, href: "/coach/exercise-categories", iconTile: "fc-icon-challenges" },
  { title: "Workout Categories", description: "Organize workout templates and programs", icon: FolderTree, href: "/coach/categories", iconTile: "fc-icon-challenges" },
  { title: "Nutrition Management", description: "Create meal plans and track client nutrition", icon: Apple, href: "/coach/nutrition", iconTile: "fc-icon-meals" },
  { title: "Analytics & Reports", description: "View client progress and generate reports", icon: BarChart3, href: "/coach/analytics", iconTile: "fc-icon-workouts" },
  { title: "Client Progress", description: "Monitor client progress and improvements", icon: TrendingUp, href: "/coach/progress", iconTile: "fc-icon-meals" },
  { title: "Goals & Habits", description: "Set goals and track client habits", icon: Target, href: "/coach/goals", iconTile: "fc-icon-habits" },
  { title: "Session Management", description: "Schedule and manage client sessions", icon: Calendar, href: "/coach/sessions", iconTile: "fc-icon-workouts" },
  { title: "Challenges", description: "Create and manage client challenges", icon: Trophy, href: "/coach/challenges", iconTile: "fc-icon-challenges" },
  { title: "Availability Settings", description: "Set your availability for client session bookings", icon: Clock, href: "/coach/availability", iconTile: "fc-icon-challenges" },
  { title: "Coach Profile", description: "Manage your profile, settings, and account information", icon: User, href: "/coach/profile", iconTile: "fc-icon-neutral" },
];

const adminMenuItems = [
  { title: "Goal Templates", description: "Manage goal types that clients can select", icon: Target, href: "/admin/goal-templates", iconTile: "fc-icon-workouts" },
  { title: "Habit Categories", description: "Manage categories for organizing client habits", icon: Sparkles, href: "/admin/habit-categories", iconTile: "fc-icon-challenges" },
  { title: "Achievement Templates", description: "Manage achievements and badges clients can earn", icon: Award, href: "/admin/achievement-templates", iconTile: "fc-icon-habits" },
  { title: "Tracking Sources", description: "View available data sources for auto-tracking", icon: Database, href: "/admin/tracking-sources", iconTile: "fc-icon-workouts" },
];

export default function CoachMenu() {
  const { performanceSettings } = useTheme();
  const { profile } = useAuth();
  
  // Check if user is admin
  const isAdmin = profile?.role === 'admin';

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 pb-24 space-y-6">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)]">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)] sm:text-3xl">
                    Coach Menu
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
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
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.iconTile}`}>
                        <Icon className="w-6 h-6" />
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

          {/* Admin Section - Only visible to admin users */}
          {isAdmin && (
            <>
              <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10 border-2" borderColor="color-mix(in srgb, var(--fc-status-warning) 35%, transparent)">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(to bottom right, var(--fc-status-warning), var(--fc-domain-habits))" }}>
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full border fc-text-warning" style={{ background: "color-mix(in srgb, var(--fc-status-warning) 18%, transparent)", borderColor: "color-mix(in srgb, var(--fc-status-warning) 35%, transparent)" }}>
                      ADMIN ONLY
                    </span>
                    <h2 className="mt-2 text-xl font-bold text-[color:var(--fc-text-primary)]">
                      System Administration
                    </h2>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Manage templates, categories, and system configuration
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {adminMenuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Link href={item.href} key={`admin-${index}`}>
                        <div className="flex items-center gap-4 p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] hover:opacity-90 transition-all">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.iconTile}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[color:var(--fc-text-primary)]">
                              {item.title}
                            </h3>
                            <p className="text-xs text-[color:var(--fc-text-dim)]">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </GlassCard>
            </>
          )}

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
              {isAdmin && (
                <Link href="/admin">
                  <Button className="fc-btn text-white" style={{ background: "var(--fc-status-warning)" }}>
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          </GlassCard>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
