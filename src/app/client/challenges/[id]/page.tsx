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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Calendar, Gift } from "lucide-react";
import Link from "next/link";
import { getChallengeDetails, getChallengeLeaderboard } from "@/lib/challengeService";

function ChallengeDetailContent() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();
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
          <div className="relative z-10 container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
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
          <div className="relative z-10 container mx-auto px-4 py-8">
            <GlassCard elevation={2} className="p-12">
              <div className="text-center">
                <p style={{ color: isDark ? "#fff" : "#1A1A1A" }}>
                  Challenge not found
                </p>
              </div>
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <GlassCard elevation={1} className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/client/challenges">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1
                  className="text-3xl font-bold mb-1"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  {challenge.name}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }} />
                    <span
                      className="text-sm"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      }}
                    >
                      {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  {challenge.reward_description && (
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4" style={{ color: getSemanticColor("warning").primary }} />
                      <span
                        className="text-sm font-medium"
                        style={{ color: getSemanticColor("warning").primary }}
                      >
                        {challenge.reward_description}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Badge
                style={{
                  background: getSemanticColor("success").gradient,
                  color: "#fff",
                }}
              >
                {challenge.status}
              </Badge>
            </div>

            {challenge.description && (
              <p
                className="text-sm"
                style={{
                  color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                }}
              >
                {challenge.description}
              </p>
            )}
          </GlassCard>
        </div>

        {/* Leaderboard */}
        <GlassCard elevation={2} className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                boxShadow: "0 4px 12px rgba(255, 215, 0, 0.3)",
              }}
            >
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Leaderboard
              </h2>
              <p
                className="text-sm"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                {leaderboard.length} participants
              </p>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy
                className="w-16 h-16 mx-auto mb-4"
                style={{
                  color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                }}
              />
              <p
                className="text-lg font-semibold"
                style={{
                  color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                }}
              >
                No participants yet
              </p>
              <p
                className="text-sm mt-2"
                style={{
                  color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                }}
              >
                Be the first to join!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-lg ${
                    entry.client_id === user?.id ? "ring-2 ring-offset-2" : ""
                  }`}
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                    ...(entry.client_id === user?.id && {
                      border: `2px solid ${getSemanticColor("energy").primary}`,
                      boxShadow: `0 0 0 2px ${getSemanticColor("energy").primary}40`,
                      // Use CSS custom property for ring color if needed
                      '--ring-color': getSemanticColor("energy").primary,
                    } as React.CSSProperties),
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                      style={{
                        background:
                          entry.final_rank === 1
                            ? "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
                            : entry.final_rank === 2
                            ? "linear-gradient(135deg, #C0C0C0 0%, #808080 100%)"
                            : entry.final_rank === 3
                            ? "linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)"
                            : isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.05)",
                        color: entry.final_rank <= 3 ? "#fff" : isDark ? "#fff" : "#1A1A1A",
                      }}
                    >
                      {entry.final_rank || index + 1}
                    </div>

                    <div className="flex-1">
                      <p
                        className="font-semibold"
                        style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      >
                        Participant {index + 1}
                      </p>
                      {entry.selected_track && (
                        <p
                          className="text-xs"
                          style={{
                            color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                          }}
                        >
                          {entry.selected_track === "fat_loss" ? "Fat Loss Track" : "Muscle Gain Track"}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p
                        className="text-2xl font-bold"
                        style={{ color: getSemanticColor("energy").primary }}
                      >
                        {entry.total_score}
                      </p>
                      <p
                        className="text-xs"
                        style={{
                          color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                        }}
                      >
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

