"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Plus, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Challenge, getAllChallenges } from "@/lib/challengeService";

function CoachChallengesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { getSemanticColor, performanceSettings } = useTheme();
  const router = useRouter();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "active" | "completed">("all");

  useEffect(() => {
    if (user && !authLoading) {
      loadChallenges();
    }
  }, [user, authLoading]);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const data = await getAllChallenges();
      setChallenges(data);
    } catch (error) {
      console.error("Error loading challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "active") return getSemanticColor("success").primary;
    if (status === "draft") return getSemanticColor("neutral").primary;
    if (status === "completed") return getSemanticColor("trust").primary;
    return getSemanticColor("critical").primary;
  };

  const filteredChallenges = filterStatus === "all"
    ? challenges
    : challenges.filter(c => c.status === filterStatus);

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl space-y-6">
        <GlassCard elevation={1} className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <Badge className="fc-badge fc-badge-strong w-fit">Challenge Hub</Badge>
              <div className="flex items-center gap-4">
                <Link href="/coach">
                  <Button variant="ghost" size="icon" className="fc-btn fc-btn-ghost h-10 w-10">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-semibold text-[color:var(--fc-text-primary)]">
                    Challenges
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Launch seasonal competitions, track participation, and award winners.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => alert("Create challenge feature - integrate with createChallenge service")}
              className="fc-btn fc-btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Challenge
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {["all", "draft", "active", "completed"].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterStatus(status as any)}
                className={filterStatus === status ? "fc-btn fc-btn-primary" : "fc-btn fc-btn-ghost"}
                style={
                  filterStatus === status
                    ? {
                        background: getSemanticColor("trust").gradient,
                        boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
                      }
                    : {}
                }
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </GlassCard>

        {/* Challenges Grid */}
        {filteredChallenges.length === 0 ? (
          <GlassCard elevation={2} className="p-12">
            <div className="text-center">
              <Trophy className="w-24 h-24 mx-auto mb-6 text-[color:var(--fc-text-subtle)]" />
              <h2 className="text-2xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
                No Challenges Found
              </h2>
              <p className="text-sm mb-6 text-[color:var(--fc-text-dim)]">
                Create your first challenge to get started
              </p>
              <Button
                onClick={() => alert("Create challenge feature")}
                className="fc-btn fc-btn-primary"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Challenge
              </Button>
            </div>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChallenges.map((challenge) => (
              <GlassCard
                key={challenge.id}
                elevation={2}
                className="p-6 hover:scale-[1.02] transition-all cursor-pointer"
                pressable
                onPress={() => router.push(`/coach/challenges/${challenge.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                        boxShadow: "0 4px 12px rgba(255, 215, 0, 0.3)",
                      }}
                    >
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <Badge
                    style={{
                      background: getStatusColor(challenge.status),
                      color: "#fff",
                    }}
                  >
                    {challenge.status}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold mb-2 text-[color:var(--fc-text-primary)]">
                  {challenge.name}
                </h3>

                {challenge.description && (
                  <p className="text-sm mb-4 line-clamp-2 text-[color:var(--fc-text-dim)]">
                    {challenge.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-[color:var(--fc-text-subtle)]">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(challenge.start_date).toLocaleDateString()}</span>
                  </div>
                  <span>•</span>
                  <span>{challenge.challenge_type === "coach_challenge" ? "Coach" : "Recomp"}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </AnimatedBackground>
  );
}

export default function CoachChallengesPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <CoachChallengesPageContent />
    </ProtectedRoute>
  );
}

