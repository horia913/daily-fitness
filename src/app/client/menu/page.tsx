"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  User,
  Target,
  Flame,
  BookOpen,
  Trophy,
  Award,
  Users,
  Flag,
  BookMarked,
  Calendar,
  ChevronRight,
  MessageCircle,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

const MENU_ITEMS: {
  href: string;
  title: string;
  description: string;
  icon: typeof User;
  iconClass: string;
}[] = [
  { href: "/client/profile", title: "Profile", description: "Settings", icon: User, iconClass: "bg-[color:var(--fc-domain-workouts)]/10 text-[color:var(--fc-domain-workouts)] border border-[color:var(--fc-domain-workouts)]/20" },
  { href: "/client/goals", title: "Goals", description: "Track targets", icon: Target, iconClass: "bg-[color:var(--fc-status-error)]/10 text-[color:var(--fc-status-error)] border border-[color:var(--fc-status-error)]/20" },
  { href: "/client/habits", title: "Habits", description: "Daily habits", icon: Flame, iconClass: "bg-[color:var(--fc-status-warning)]/10 text-[color:var(--fc-status-warning)] border border-[color:var(--fc-status-warning)]/20" },
  { href: "/client/progress/workout-logs", title: "Workout logs", description: "History", icon: BookOpen, iconClass: "bg-[color:var(--fc-domain-workouts)]/10 text-[color:var(--fc-domain-workouts)] border border-[color:var(--fc-domain-workouts)]/20" },
  { href: "/client/progress/personal-records", title: "Personal records", description: "PRs", icon: Trophy, iconClass: "bg-[color:var(--fc-status-warning)]/10 text-[color:var(--fc-status-warning)] border border-[color:var(--fc-status-warning)]/20" },
  { href: "/client/achievements", title: "Achievements", description: "Badges", icon: Award, iconClass: "bg-[color:var(--fc-status-success)]/10 text-[color:var(--fc-status-success)] border border-[color:var(--fc-status-success)]/20" },
  { href: "/client/progress/leaderboard", title: "Leaderboard", description: "Ranks", icon: Users, iconClass: "bg-[color:var(--fc-domain-workouts)]/10 text-[color:var(--fc-domain-workouts)] border border-[color:var(--fc-domain-workouts)]/20" },
  { href: "/client/challenges", title: "Challenges", description: "Events", icon: Flag, iconClass: "bg-[color:var(--fc-status-error)]/10 text-[color:var(--fc-status-error)] border border-[color:var(--fc-status-error)]/20" },
  { href: "/client/clipcards", title: "Clipcards", description: "Tips", icon: BookMarked, iconClass: "bg-[color:var(--fc-domain-workouts)]/10 text-[color:var(--fc-domain-workouts)] border border-[color:var(--fc-domain-workouts)]/20" },
  { href: "/client/workouts", title: "Programs", description: "Training plan", icon: Calendar, iconClass: "bg-[color:var(--fc-status-success)]/10 text-[color:var(--fc-status-success)] border border-[color:var(--fc-status-success)]/20" },
];

export default function ClientMenuPage() {
  const { user, profile } = useAuth();
  const { performanceSettings } = useTheme();

  const firstName = profile?.first_name || user?.email?.split("@")[0] || "there";
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firstName)}`;

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-4xl fc-page pb-40">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-[30px] font-bold tracking-tight fc-text-primary">Menu</h1>
              <p className="text-sm fc-text-dim mt-0.5">Shortcuts and settings</p>
            </div>
            <Link href="/client/profile" className="relative group">
              <div className="w-14 h-14 rounded-full border-2 border-[color:var(--fc-glass-border)] overflow-hidden fc-glass p-0.5">
                <img src={avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[color:var(--fc-status-success)] border-2 border-[color:var(--fc-bg-deep)]" aria-hidden />
            </Link>
          </header>

          <div className="mb-8">
            <h2 className="text-xl font-medium fc-text-dim">
              Hey, <span className="fc-text-primary font-bold">{firstName}</span>
            </h2>
            <div className="h-1 w-12 rounded-full bg-[color:var(--fc-status-error)] mt-2" aria-hidden />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <GlassCard
                    elevation={2}
                    className="fc-glass fc-card p-5 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-pointer fc-hover-rise fc-press border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${item.iconClass}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold fc-text-primary">{item.title}</h3>
                        <ChevronRight className="w-4 h-4 fc-text-subtle" />
                      </div>
                      <p className="text-sm fc-text-subtle mt-1">{item.description}</p>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 space-y-4">
            <Link href="/client/sessions" className="block">
              <button
                type="button"
                className="fc-btn fc-btn-secondary w-full h-12 rounded-2xl flex items-center justify-center gap-3 font-semibold"
              >
                <MessageCircle className="w-5 h-5" />
                Contact coach
              </button>
            </Link>
            <div className="flex justify-center">
              <Link
                href="/client/scheduling"
                className="text-sm fc-text-subtle hover:fc-text-primary flex items-center gap-2 transition-colors py-2"
              >
                <HelpCircle className="w-4 h-4" />
                Help & support
              </Link>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
