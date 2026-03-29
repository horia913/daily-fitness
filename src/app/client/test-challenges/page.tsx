"use client";

import React, { useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { ChallengeCard } from "@/components/client/ChallengeCard";
import {
  ChallengesPageShell,
  type ChallengesListTab,
} from "@/components/client/challenges/ChallengesPageShell";
import { ChallengeDetailPageBody } from "@/components/client/challenges/ChallengeDetailPageBody";
import type { Challenge, ChallengeParticipant } from "@/lib/challengeService";
import {
  TEST_CHALLENGES_ALL,
  TEST_CHALLENGE_COMPLETED,
  getTestChallengeById,
  getTestChallengeLeaderboard,
  testChallengesSelfClientId,
} from "@/lib/testChallengesMockData";
import { useToast } from "@/components/ui/toast-provider";

function TestDataBadge() {
  return (
    <span className="pointer-events-none rounded-md border border-cyan-500/40 bg-black/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400 backdrop-blur-sm">
      Test data
    </span>
  );
}

const MY_CHALLENGE_IDS = new Set(["test-challenge-1", "test-challenge-2"]);

function TestChallengesContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const { addToast } = useToast();
  const selfId = testChallengesSelfClientId(user?.id);

  const [activeTab, setActiveTab] = useState<ChallengesListTab>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(
    null
  );
  const [selectedTrack, setSelectedTrack] = useState<
    "fat_loss" | "muscle_gain" | null
  >(null);
  const [submitModalCategory, setSubmitModalCategory] = useState<any>(null);
  const [submitVideo, setSubmitVideo] = useState<File | null>(null);
  const [submitWeight, setSubmitWeight] = useState("");
  const [submitReps, setSubmitReps] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeChallenges = useMemo(
    () => TEST_CHALLENGES_ALL.filter((c) => c.status === "active"),
    []
  );

  const invitedChallenges: Array<Challenge & { participation: ChallengeParticipant }> =
    [];

  const completedParticipation: ChallengeParticipant = useMemo(
    () => ({
      id: "test-part-completed",
      challenge_id: TEST_CHALLENGE_COMPLETED.id,
      client_id: selfId,
      status: "completed",
      joined_at: "2026-02-01T00:00:00.000Z",
      total_score: 12,
      final_rank: 5,
      is_winner: false,
      award_notes: null,
    }),
    [selfId]
  );

  const completedChallenges: Array<
    Challenge & { participation: ChallengeParticipant }
  > = useMemo(
    () => [
      {
        ...TEST_CHALLENGE_COMPLETED,
        participation: completedParticipation,
      },
    ],
    [completedParticipation]
  );

  const myChallenges = useMemo(() => [...MY_CHALLENGE_IDS], []);

  const displayedChallenges =
    activeTab === "all"
      ? TEST_CHALLENGES_ALL
      : activeTab === "invited"
        ? invitedChallenges
        : activeTab === "history"
          ? completedChallenges
          : activeChallenges.filter((c) => myChallenges.includes(c.id));

  const detailChallenge = detailId ? getTestChallengeById(detailId) : null;
  const detailLeaderboard = detailId
    ? getTestChallengeLeaderboard(detailId, selfId)
    : [];

  const handleJoinClick = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setSelectedTrack(null);
    if (challenge.challenge_type === "recomp_challenge") {
      setShowJoinModal(true);
    } else {
      addToast({
        title: "Test data — join is disabled here.",
        variant: "destructive",
      });
    }
  };

  const handleJoin = () => {
    addToast({ title: "Test data — join is disabled.", variant: "destructive" });
    setShowJoinModal(false);
  };

  const handleView = (challenge: Challenge) => {
    setDetailId(challenge.id);
  };

  const getSubmissionForCategory = (_categoryId: string) => null;

  const handleSubmitProof = () => {
    addToast({ title: "Test data — no upload.", variant: "destructive" });
    setSubmitting(false);
  };

  if (detailChallenge) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ChallengeDetailPageBody
          challenge={detailChallenge}
          leaderboard={detailLeaderboard}
          scoringCategories={[]}
          userId={selfId}
          onBackClick={() => setDetailId(null)}
          cornerBadge={<TestDataBadge />}
          submitModalCategory={submitModalCategory}
          setSubmitModalCategory={setSubmitModalCategory}
          submitVideo={submitVideo}
          setSubmitVideo={setSubmitVideo}
          submitWeight={submitWeight}
          setSubmitWeight={setSubmitWeight}
          submitReps={submitReps}
          setSubmitReps={setSubmitReps}
          submitNotes={submitNotes}
          setSubmitNotes={setSubmitNotes}
          submitting={submitting}
          handleSubmitProof={handleSubmitProof}
          getSubmissionForCategory={getSubmissionForCategory}
        />
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <ChallengesPageShell
        activeChallengesCount={activeChallenges.length}
        invitedCount={invitedChallenges.length}
        showInvitedTab={false}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        breadcrumbCurrentLabel="Challenges"
      >
        {displayedChallenges.length === 0 ? (
          <GlassCard elevation={2} className="fc-glass fc-card p-12 text-center">
            <Trophy className="w-20 h-20 text-[color:var(--fc-text-subtle)] mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-[color:var(--fc-text-primary)] mb-2">
              No challenges
            </h2>
            <p className="text-sm text-[color:var(--fc-text-dim)]">
              This tab is empty in test data.
            </p>
          </GlassCard>
        ) : (
          <div className="relative">
            <div className="pointer-events-none absolute right-0 top-0 z-10 sm:right-2">
              <TestDataBadge />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
              {displayedChallenges.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  isParticipating={myChallenges.includes(challenge.id)}
                  onJoin={handleJoinClick}
                  onView={handleView}
                />
              ))}
            </div>
          </div>
        )}
      </ChallengesPageShell>

      {showJoinModal && selectedChallenge && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md fc-glass fc-card border border-[color:var(--fc-glass-border-strong)] shadow-2xl p-6">
            <h2 className="text-2xl font-semibold text-[color:var(--fc-text-primary)] mb-4">
              Select Your Track
            </h2>
            <p className="text-sm text-[color:var(--fc-text-dim)] mb-6">
              Test data — recomp join is disabled.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowJoinModal(false)}
                className="flex-1 fc-btn fc-btn-secondary"
              >
                Cancel
              </Button>
              <Button onClick={handleJoin} className="flex-1 fc-btn fc-btn-primary">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </AnimatedBackground>
  );
}

export default function TestChallengesPage() {
  return (
    <ProtectedRoute>
      <TestChallengesContent />
    </ProtectedRoute>
  );
}
