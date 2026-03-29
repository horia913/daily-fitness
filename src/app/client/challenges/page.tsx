"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { Challenge, getActiveChallenges, joinChallenge, getClientChallenges, type ChallengeParticipant } from "@/lib/challengeService";
import { ChallengeCard } from "@/components/client/ChallengeCard";
import { ChallengesPageShell } from "@/components/client/challenges/ChallengesPageShell";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { withTimeout } from "@/lib/withTimeout";
import { useToast } from "@/components/ui/toast-provider";

function ChallengesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();
  const { addToast } = useToast();
  const router = useRouter();

  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [myChallenges, setMyChallenges] = useState<string[]>([]);
  const [invitedChallenges, setInvitedChallenges] = useState<Array<Challenge & { participation: ChallengeParticipant }>>([]);
  const [loading, setLoading] = useState(true);
  const [completedChallenges, setCompletedChallenges] = useState<Array<Challenge & { participation: ChallengeParticipant }>>([]);
  const [activeTab, setActiveTab] = useState<"all" | "my" | "invited" | "history">("all");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<"fat_loss" | "muscle_gain" | null>(null);
  const [joining, setJoining] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      loadChallenges();
    }
  }, [user, authLoading]);

  const loadChallenges = async () => {
    if (!user?.id) return;

    setLoading(true);
    setLoadError(null);
    try {
      await withTimeout(
        (async () => {
          const [active, myParticipations] = await Promise.all([
            getActiveChallenges(),
            getClientChallenges(user.id),
          ]);
          setActiveChallenges(active);
          setMyChallenges(myParticipations.map(p => p.id));
          setInvitedChallenges(
            myParticipations.filter(p => p.participation?.status === "invited")
          );
          setCompletedChallenges(
            myParticipations.filter(p => p.status === "completed")
          );
        })(),
        30000,
        "timeout"
      );
    } catch (error: any) {
      console.error("Error loading challenges:", error);
      setLoadError(error?.message === "timeout" ? "Loading took too long. Please try again." : (error?.message || "Failed to load challenges"));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setSelectedTrack(null);
    
    // If recomp challenge, show track selector
    if (challenge.challenge_type === "recomp_challenge") {
      setShowJoinModal(true);
    } else {
      // Direct join for coach challenges
      handleJoin(challenge, null);
    }
  };

  const handleJoin = async (challenge: Challenge, track: "fat_loss" | "muscle_gain" | null) => {
    if (!user?.id) return;

    setJoining(true);
    try {
      const result = await joinChallenge(challenge.id, user.id, track || undefined);
      
      if (result) {
        addToast({ title: `You've joined ${challenge.name}! 💪`, variant: "success" });
        setShowJoinModal(false);
        loadChallenges(); // Refresh
      } else {
        addToast({ title: "Failed to join challenge", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error joining challenge:", error);
      addToast({ title: "Failed to join challenge", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const handleView = (challenge: Challenge) => {
    router.push(`/client/challenges/${challenge.id}`);
  };

  const displayedChallenges = activeTab === "all"
    ? activeChallenges
    : activeTab === "invited"
      ? invitedChallenges
      : activeTab === "history"
        ? completedChallenges
        : activeChallenges.filter(c => myChallenges.includes(c.id));

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-10 sm:px-6 lg:px-10">
            <div className="fc-glass fc-card p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-20 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="h-64 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                  <div className="h-64 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (loadError) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-10 sm:px-6 lg:px-10">
            <GlassCard elevation={2} className="fc-glass fc-card p-8 text-center">
              <p className="text-[color:var(--fc-text-dim)] mb-4">{loadError}</p>
              <Button type="button" onClick={() => { setLoadError(null); setLoading(true); loadChallenges(); }} className="fc-btn fc-btn-primary">
                Retry
              </Button>
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <ChallengesPageShell
        activeChallengesCount={activeChallenges.length}
        invitedCount={invitedChallenges.length}
        showInvitedTab={invitedChallenges.length > 0}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      >
        {displayedChallenges.length === 0 ? (
          <GlassCard elevation={2} className="fc-glass fc-card p-12 text-center">
            <Trophy className="w-20 h-20 text-[color:var(--fc-text-subtle)] mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-[color:var(--fc-text-primary)] mb-2">
              {activeTab === "history"
                ? "No Past Challenges"
                : activeTab === "invited"
                  ? "No Invitations"
                  : activeTab === "my" ? "No Active Challenges" : "No Challenges Available"}
            </h2>
            <p className="text-sm text-[color:var(--fc-text-dim)]">
              {activeTab === "history"
                ? "Completed challenges will appear here."
                : activeTab === "invited"
                  ? "No pending challenge invitations."
                  : activeTab === "my"
                    ? "Join a challenge to start competing."
                    : "Check back later for new challenges."}
            </p>
          </GlassCard>
        ) : (
          <div className="flex w-full flex-col gap-6">
            <ChallengeCard
              key={displayedChallenges[0].id}
              challenge={displayedChallenges[0]}
              isParticipating={myChallenges.includes(displayedChallenges[0].id)}
              onJoin={handleJoinClick}
              onView={handleView}
            />
            {displayedChallenges.length > 1 && (
              <div className="flex flex-col divide-y divide-white/5 border-y border-white/5">
                {displayedChallenges.slice(1).map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    dense
                    isParticipating={myChallenges.includes(challenge.id)}
                    onJoin={handleJoinClick}
                    onView={handleView}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </ChallengesPageShell>

      {/* Join Modal for Recomp Challenges */}
      {showJoinModal && selectedChallenge && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <div
            className="w-full max-w-md fc-glass fc-card border border-[color:var(--fc-glass-border-strong)] shadow-2xl p-6"
          >
            <h2 className="text-2xl font-semibold text-[color:var(--fc-text-primary)] mb-4">
              Select Your Track
            </h2>
            <p className="text-sm text-[color:var(--fc-text-dim)] mb-6">
              Choose which recomp track you want to compete in
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setSelectedTrack("fat_loss")}
                className={cn(
                  "p-4 rounded-xl text-left transition-all border",
                  selectedTrack === "fat_loss"
                    ? "border-[color:var(--fc-status-success)] bg-[color:var(--fc-status-success)]/10"
                    : "border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)]"
                )}
              >
                <p className="font-semibold text-[color:var(--fc-text-primary)] text-sm">
                  Fat Loss Track
                </p>
                <p className="text-xs mt-1 text-[color:var(--fc-text-dim)]">
                  Reduce waist, maintain strength
                </p>
              </button>

              <button
                onClick={() => setSelectedTrack("muscle_gain")}
                className={cn(
                  "p-4 rounded-xl text-left transition-all border",
                  selectedTrack === "muscle_gain"
                    ? "border-[color:var(--fc-status-success)] bg-[color:var(--fc-status-success)]/10"
                    : "border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)]"
                )}
              >
                <p className="font-semibold text-[color:var(--fc-text-primary)] text-sm">
                  Muscle Gain Track
                </p>
                <p className="text-xs mt-1 text-[color:var(--fc-text-dim)]">
                  Gain bodyweight multiples
                </p>
              </button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowJoinModal(false)}
                className="flex-1 fc-btn fc-btn-secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedTrack && handleJoin(selectedChallenge, selectedTrack)}
                disabled={!selectedTrack || joining}
                className="flex-1 fc-btn fc-btn-primary"
              >
                {joining ? "Joining..." : "Join Challenge"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AnimatedBackground>
  );
}

export default function ChallengesPage() {
  return (
    <ProtectedRoute>
      <ChallengesPageContent />
    </ProtectedRoute>
  );
}

