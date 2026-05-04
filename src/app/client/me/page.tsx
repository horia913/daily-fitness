"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell } from "@/components/client-ui/ClientPageShell";
import { ClientScoreInsightsSection } from "@/components/client/ClientScoreInsightsSection";
import { usePageData } from "@/hooks/usePageData";
import {
  fetchDashboardPageData,
  type DashboardPageData,
} from "@/lib/clientDashboardPageData";
import { tierBackdropVariant } from "@/lib/tierBackdrop";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import {
  User,
  Target,
  BarChart3,
  Award,
  Sparkles,
  Trophy,
  CreditCard,
  ChevronRight,
  AlertTriangle,
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
    href: "/client/profile",
    title: "Subscription",
    icon: CreditCard,
    description: "Your coaching plan on Profile",
  },
];

export default function MePage() {
  const { user, profile } = useAuth();
  const userName = profile?.first_name || user?.email?.split("@")[0] || "there";
  const avatarUrl = profile?.avatar_url;

  const fetchFn = useCallback(async (): Promise<DashboardPageData> => {
    if (!user?.id) {
      return {
        dashboard: null,
        athleteScore: null,
        hasCheckInToday: null,
        todayWellnessLog: null,
        checkinStreak: 0,
        hasScheduledCheckInThisPeriod: false,
        scoreError: null,
      };
    }
    return fetchDashboardPageData(user.id);
  }, [user?.id]);

  const { data: pageData, loading: dashboardLoading, error, refetch } = usePageData(
    fetchFn,
    [user?.id],
  );

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
          <ClientPageShell
            className="max-w-lg px-4 pb-32 pt-6"
            backdrop={tierBackdropVariant(pageData?.athleteScore?.tier)}
          >
            {/* Header */}
            <div className="mb-4">
              <h1 className="text-xl font-bold fc-text-primary mb-4">Me</h1>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[color:var(--fc-accent-cyan)] flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={getAvatarUrl()}
                      alt={userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-[color:var(--fc-bg-base)]">
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

            {error ? (
              <div className="mb-8 flex flex-col items-center border-t border-[var(--fc-glass-border)] pt-8 text-center">
                <AlertTriangle
                  className="mb-3 h-10 w-10 text-[var(--fc-status-error)]"
                  aria-hidden
                />
                <h2 className="mb-2 text-lg font-semibold fc-text-primary">
                  Couldn&apos;t load this page
                </h2>
                <p className="mb-4 text-sm fc-text-dim">{error}</p>
                <Button
                  type="button"
                  className="fc-btn fc-btn-primary"
                  onClick={() => void refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : dashboardLoading ? (
              <div className="mb-8 border-t border-[var(--fc-glass-border)] pt-6">
                <Skeleton className="mb-4 h-5 w-40" />
                <Skeleton className="mx-auto mb-4 h-40 w-40 rounded-full" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : (
              <ClientScoreInsightsSection
                userId={user?.id ?? null}
                athleteScore={pageData?.athleteScore ?? null}
                scoreError={pageData?.scoreError ?? null}
              />
            )}

            <nav
              className="flex flex-col border-y border-[color:var(--fc-glass-border)]"
              aria-label="Account"
            >
              {NAV_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={`${card.href}-${card.title}`}
                    href={card.href}
                    className="w-full text-left flex min-h-[52px] items-center gap-4 border-b border-[color:var(--fc-glass-border)] py-3 last:border-b-0 transition-colors hover:bg-[color:var(--fc-glass-highlight)]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--fc-glass-highlight)]">
                      <Icon className="h-5 w-5 fc-text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold fc-text-primary">
                        {card.title}
                      </h3>
                      {card.description && (
                        <p className="line-clamp-1 text-xs fc-text-dim">
                          {card.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 fc-text-dim" />
                  </Link>
                );
              })}
            </nav>
          </ClientPageShell>
        </AnimatedBackground>
      </div>
    </ProtectedRoute>
  );
}
