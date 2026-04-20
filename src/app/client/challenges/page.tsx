"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trophy } from "lucide-react";
import { Challenge, getActiveChallenges, joinChallenge, getClientChallenges, type ChallengeParticipant } from "@/lib/challengeService";
import { ChallengeCard } from "@/components/client/ChallengeCard";
import { cn } from "@/lib/utils";
import { withTimeout } from "@/lib/withTimeout";
import { useToast } from "@/components/ui/toast-provider";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import Link from "next/link";

function ChallengesPageContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();
  const { addToast } = useToast();

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
          <ClientPageShell className="max-w-lg px-4 pb-32 pt-6">
            <PageSkeleton variant="dashboard" />
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (loadError) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6">
            <GlassCard elevation={2} className="fc-card-shell p-4 text-center">
              <p className="text-sm text-[color:var(--fc-text-dim)] mb-3">{loadError}</p>
              <Button type="button" onClick={() => { setLoadError(null); setLoading(true); loadChallenges(); }} className="fc-btn fc-btn-primary h-10 text-sm">
                Retry
              </Button>
            </GlassCard>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <ClientPageShell className="max-w-lg px-4 pb-32 pt-6 space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <nav className="flex items-center gap-2 text-xs fc-text-subtle mb-1 font-mono">
              <Link href="/client/me" className="hover:fc-text-primary">
                Me
              </Link>
              <span>/</span>
              <span className="fc-text-primary">Challenges</span>
            </nav>
            <h1 className="text-xl font-bold tracking-tight fc-text-primary">
              Challenges
            </h1>
            <p className="text-xs fc-text-dim mt-1">
              Join challenges and compete with others.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="fc-glass-soft px-3 py-1.5 rounded-lg border border-[color:var(--fc-glass-border)] flex items-center gap-1.5">
              <Trophy className="w-4 h-4 fc-text-warning" />
              <span className="font-mono text-xs font-bold fc-text-primary">
                {activeChallenges.length} active
              </span>
            </div>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[color:var(--fc-glass-border)] pb-2">
          <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1 w-full min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "pb-1.5 text-xs font-bold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors",
                activeTab === "all"
                  ? "fc-text-primary border-[color:var(--fc-status-error)]"
                  : "fc-text-subtle border-transparent hover:fc-text-primary"
              )}
            >
              Browse all
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("my")}
              className={cn(
                "pb-1.5 text-xs font-bold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors",
                activeTab === "my"
                  ? "fc-text-primary border-[color:var(--fc-status-error)]"
                  : "fc-text-subtle border-transparent hover:fc-text-primary"
              )}
            >
              My challenges
            </button>
            {invitedChallenges.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("invited")}
                className={cn(
                  "pb-1.5 text-xs font-bold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors flex items-center gap-2",
                  activeTab === "invited"
                    ? "fc-text-primary border-[color:var(--fc-status-error)]"
                    : "fc-text-subtle border-transparent hover:fc-text-primary"
                )}
              >
                Invited
                <span className="w-5 h-5 rounded-full bg-[color:var(--fc-accent-cyan)] text-white text-[10px] flex items-center justify-center font-bold">
                  {invitedChallenges.length}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "pb-1.5 text-xs font-bold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors",
                activeTab === "history"
                  ? "fc-text-primary border-[color:var(--fc-status-error)]"
                  : "fc-text-subtle border-transparent hover:fc-text-primary"
              )}
            >
              History
            </button>
          </div>
        </div>

        {displayedChallenges.length === 0 ? (
          <GlassCard elevation={2} className="fc-card-shell p-6 text-center">
            <Trophy className="w-10 h-10 text-[color:var(--fc-text-subtle)] mx-auto mb-3 opacity-80" />
            <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)] mb-1">
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
          <div className="flex w-full flex-col gap-3">
            <ChallengeCard
              key={displayedChallenges[0].id}
              challenge={displayedChallenges[0]}
              isParticipating={myChallenges.includes(displayedChallenges[0].id)}
              onJoin={handleJoinClick}
              onView={handleView}
            />
            {displayedChallenges.length > 1 && (
              <div className="flex flex-col divide-y divide-[color:var(--fc-glass-border)] border-y border-[color:var(--fc-glass-border)]">
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
      </ClientPageShell>

      <Dialog
        open={showJoinModal}
        onOpenChange={(open) => !open && setShowJoinModal(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Your Track</DialogTitle>
            <DialogDescription>
              Choose which recomp track you want to compete in
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 my-2">
            <button
              type="button"
              onClick={() => setSelectedTrack("fat_loss")}
              aria-pressed={selectedTrack === "fat_loss"}
              className={cn(
                "p-4 rounded-xl text-left transition-all border",
                selectedTrack === "fat_loss"
                  ? "border-[color:var(--fc-status-success)] bg-[color-mix(in_srgb,var(--fc-status-success)_10%,transparent)]"
                  : "border-[color:var(--fc-glass-border)] fc-glass-soft hover:border-[color:var(--fc-glass-border-strong)]"
              )}
            >
              <p className="font-semibold fc-text-primary text-sm">
                Fat Loss Track
              </p>
              <p className="text-xs mt-1 fc-text-dim">
                Reduce waist, maintain strength
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTrack("muscle_gain")}
              aria-pressed={selectedTrack === "muscle_gain"}
              className={cn(
                "p-4 rounded-xl text-left transition-all border",
                selectedTrack === "muscle_gain"
                  ? "border-[color:var(--fc-status-success)] bg-[color-mix(in_srgb,var(--fc-status-success)_10%,transparent)]"
                  : "border-[color:var(--fc-glass-border)] fc-glass-soft hover:border-[color:var(--fc-glass-border-strong)]"
              )}
            >
              <p className="font-semibold fc-text-primary text-sm">
                Muscle Gain Track
              </p>
              <p className="text-xs mt-1 fc-text-dim">
                Gain bodyweight multiples
              </p>
            </button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowJoinModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedChallenge && selectedTrack && handleJoin(selectedChallenge, selectedTrack)}
              disabled={!selectedTrack || joining}
              className="fc-btn fc-btn-primary"
            >
              {joining ? "Joining…" : "Join Challenge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

