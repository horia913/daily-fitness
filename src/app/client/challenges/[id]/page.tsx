"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Calendar, Gift } from "lucide-react";
import Link from "next/link";
import { getChallengeDetails, getChallengeLeaderboard } from "@/lib/challengeService";
import { cn } from "@/lib/utils";

function ChallengeDetailContent() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();
  const challengeId = params.id as string;

  const [challenge, setChallenge] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !authLoading && challengeId) {
      loadChallenge();
    }
  }, [user, authLoading, challengeId]);

  const loadChallenge = async () => {
    setLoading(true);
    try {
      const [challengeData, leaderboardData] = await Promise.all([
        getChallengeDetails(challengeId),
        getChallengeLeaderboard(challengeId),
      ]);

      setChallenge(challengeData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error loading challenge:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <div className="fc-glass fc-card p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-20 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="h-80 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!challenge) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <GlassCard elevation={2} className="fc-glass fc-card p-12 text-center">
              <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                Challenge not found
              </p>
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
        <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Link href="/client/challenges">
                <Button variant="ghost" size="icon" className="fc-btn fc-btn-ghost h-10 w-10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Challenge Details
                </span>
                <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                  {challenge.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[color:var(--fc-text-dim)]">
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                    {new Date(challenge.start_date).toLocaleDateString()} -{" "}
                    {new Date(challenge.end_date).toLocaleDateString()}
                  </span>
                  {challenge.reward_description && (
                    <span className="inline-flex items-center gap-2 text-[color:var(--fc-status-warning)]">
                      <Gift className="w-4 h-4" />
                      {challenge.reward_description}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)] uppercase">
              {challenge.status}
            </span>
          </div>

          {challenge.description && (
            <p className="mt-4 text-sm text-[color:var(--fc-text-dim)]">
              {challenge.description}
            </p>
          )}
        </GlassCard>

        <GlassCard elevation={2} className="fc-glass fc-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_8px_18px_rgba(245,158,11,0.35)]">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                Leaderboard
              </h2>
              <p className="text-sm text-[color:var(--fc-text-dim)]">
                {leaderboard.length} participants
              </p>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-[color:var(--fc-text-subtle)]" />
              <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                No participants yet
              </p>
              <p className="text-sm mt-2 text-[color:var(--fc-text-dim)]">
                Be the first to join.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={cn(
                    "fc-glass-soft fc-card p-4 transition-all",
                    entry.client_id === user?.id
                      ? "border border-[color:var(--fc-accent-cyan)]/50 shadow-[0_0_0_1px_rgba(8,145,178,0.25)]"
                      : "border border-[color:var(--fc-glass-border)]"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0",
                        entry.final_rank === 1
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                          : entry.final_rank === 2
                          ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white"
                          : entry.final_rank === 3
                          ? "bg-gradient-to-br from-amber-700 to-orange-900 text-white"
                          : "bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-text-primary)]"
                      )}
                    >
                      {entry.final_rank || index + 1}
                    </div>

                    <div className="flex-1">
                      <p className="font-semibold text-[color:var(--fc-text-primary)]">
                        Participant {index + 1}
                      </p>
                      {entry.selected_track && (
                        <p className="text-xs text-[color:var(--fc-text-subtle)]">
                          {entry.selected_track === "fat_loss"
                            ? "Fat Loss Track"
                            : "Muscle Gain Track"}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-[color:var(--fc-accent-cyan)]">
                        {entry.total_score}
                      </p>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">
                        points
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </AnimatedBackground>
  );
}

export default function ChallengeDetailPage() {
  return (
    <ProtectedRoute>
      <ChallengeDetailContent />
    </ProtectedRoute>
  );
}

