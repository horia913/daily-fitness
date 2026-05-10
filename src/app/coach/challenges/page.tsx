"use client";

import React, { useState, useEffect, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast-provider";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { Trophy, Plus, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { Challenge, getAllChallenges } from "@/lib/challengeService";
import { CreateChallengeModal } from "@/components/coach/CreateChallengeModal";
import { cn } from "@/lib/utils";

function CoachChallengesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();
  const { addToast } = useToast();
  const router = useRouter();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "active" | "completed">("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const challengesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || authLoading) return;
    if (challengesTimeoutRef.current) clearTimeout(challengesTimeoutRef.current);
    challengesTimeoutRef.current = setTimeout(() => {
      challengesTimeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    loadChallenges().finally(() => {
      if (challengesTimeoutRef.current) {
        clearTimeout(challengesTimeoutRef.current);
        challengesTimeoutRef.current = null;
      }
    });
    return () => {
      if (challengesTimeoutRef.current) {
        clearTimeout(challengesTimeoutRef.current);
        challengesTimeoutRef.current = null;
      }
    };
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

  const challengeStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "border border-[color-mix(in_srgb,var(--fc-status-success)_40%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-success)_22%,transparent)] fc-text-primary";
      case "draft":
        return "border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] fc-text-dim";
      case "completed":
        return "border border-[color-mix(in_srgb,var(--fc-status-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-info)_18%,transparent)] fc-text-primary";
      default:
        return "border border-[color-mix(in_srgb,var(--fc-status-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-error)_12%,transparent)] fc-text-primary";
    }
  };

  const filteredChallenges = filterStatus === "all"
    ? challenges
    : challenges.filter(c => c.status === filterStatus);

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <CoachPageShell widthVariant="data-7xl" className="p-3 pb-[var(--fc-bottom-safe-area)] sm:p-6 md:p-6">
            <PageSkeleton variant="dashboard" />
          </CoachPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  const activeCount = challenges.filter(c => c.status === 'active').length;

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <CoachPageShell widthVariant="data-7xl" className="p-3 pb-[var(--fc-bottom-safe-area)] sm:p-6 md:p-6 space-y-8 sm:space-y-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-0.5 rounded-full bg-[color:var(--fc-accent-success)]" />
              <span className="text-sm font-bold tracking-widest uppercase fc-text-dim">Coach Portal</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight fc-text-primary">Challenges Management</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost rounded-xl hidden md:inline-flex">
              Analytics
            </Button>
            <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost rounded-xl hidden md:inline-flex">
              History
            </Button>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="fc-btn fc-btn-primary rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Challenge
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 mb-6">
            {["all", "draft", "active", "completed"].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterStatus(status as any)}
                className={filterStatus === status ? "fc-btn fc-btn-primary" : "fc-btn fc-btn-ghost"}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
        </div>

        {/* Challenges Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider fc-text-dim flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[color:var(--fc-status-warning)]" aria-hidden />
              Active Now
            </h2>
            {activeCount > 0 && (
              <span className="font-mono text-xs fc-glass-soft px-2 py-1 rounded">{activeCount} RUNNING</span>
            )}
          </div>
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
                onClick={() => setCreateModalOpen(true)}
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
                      <Trophy className="w-6 h-6 text-[color:var(--fc-bg-base)]" aria-hidden />
                    </div>
                  </div>
                  <Badge className={cn("font-semibold capitalize", challengeStatusBadgeClass(challenge.status))}>
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
        </section>

        {/*
          Phase 0b 6-FAB extension — coach challenges FAB migration.
          Spec ref: design-system-v4 §6.21. Was: Button fixed bottom-8 right-8 z-50,
          h-14 w-14 rounded-2xl fc-btn-primary, Plus w-6 h-6. Header "Create Challenge"
          CTA unchanged (Phase 1+ duplicate-CTA demotion). Now: native fab-action.
        */}
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="fab-action"
          aria-label="Create challenge"
        >
          <Plus />
        </button>

        <CreateChallengeModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreateSuccess={(challengeId) => {
            setCreateModalOpen(false);
            loadChallenges();
            router.push(`/coach/challenges/${challengeId}`);
          }}
          coachId={user?.id ?? ""}
        />
      </CoachPageShell>
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

