"use client";

import React from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell } from "@/components/client-ui/ClientPageShell";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  User,
  Target,
  BarChart3,
  Award,
  Sparkles,
  Trophy,
  CreditCard,
  ChevronRight,
} from "lucide-react";

interface NavCard {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const NAV_CARDS: NavCard[] = [
  {
    href: "/client/profile",
    title: "Profile",
    icon: User,
    description: "Personal information and settings",
  },
  {
    href: "/client/progress",
    title: "Progress",
    icon: BarChart3,
    description: "Analytics and performance tracking",
  },
  {
    href: "/client/goals",
    title: "Goals",
    icon: Target,
    description: "Track your fitness goals",
  },
  {
    href: "/client/habits",
    title: "Habits",
    icon: Sparkles,
    description: "Build healthy routines",
  },
  {
    href: "/client/progress/achievements",
    title: "Achievements",
    icon: Award,
    description: "Unlock badges and milestones",
  },
  {
    href: "/client/challenges",
    title: "Challenges",
    icon: Trophy,
    description: "Join fitness challenges",
  },
  {
    href: "/client/clipcards",
    title: "Training Pass",
    icon: CreditCard,
    description: "Manage your training passes",
  },
];

export default function MePage() {
  const { user, profile } = useAuth();
  const { performanceSettings } = useTheme();

  const userName = profile?.first_name || user?.email?.split("@")[0] || "there";
  const avatarUrl = profile?.avatar_url;

  const getAvatarUrl = () => {
    if (avatarUrl) return avatarUrl;
    if (profile?.first_name) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.first_name}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "User"}`;
  };

  return (
    <ProtectedRoute requiredRole="client">
      <div className="relative fc-app-bg isolate min-h-screen">
        <AnimatedBackground>
          <ClientPageShell className="max-w-lg px-4 pb-32 pt-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold fc-text-primary mb-2">Me</h1>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[color:var(--fc-accent-cyan)] flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={getAvatarUrl()}
                      alt={userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold fc-text-primary">
                    {userName}
                  </h2>
                  {profile?.email && (
                    <p className="text-sm fc-text-dim">{profile.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Cards */}
            <div className="space-y-3">
              {NAV_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.href} href={card.href}>
                    <GlassCard
                      elevation={2}
                      className="fc-glass fc-card p-4 hover:scale-[1.02] transition-transform cursor-pointer"
                      pressable
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[color:var(--fc-glass-highlight)] flex items-center justify-center">
                          <Icon className="w-6 h-6 fc-text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold fc-text-primary mb-0.5">
                            {card.title}
                          </h3>
                          {card.description && (
                            <p className="text-xs fc-text-dim line-clamp-1">
                              {card.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 fc-text-dim flex-shrink-0" />
                      </div>
                    </GlassCard>
                  </Link>
                );
              })}
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </div>
    </ProtectedRoute>
  );
}
