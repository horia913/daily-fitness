"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  getChallengeDetails,
  getChallengeLeaderboard,
  getChallengeScoringCategories,
  getParticipantSubmissions,
  submitVideoProof,
} from "@/lib/challengeService";
import { useToast } from "@/components/ui/toast-provider";
import { ChallengeDetailPageBody } from "@/components/client/challenges/ChallengeDetailPageBody";

function ChallengeDetailContent() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();
  const { addToast } = useToast();
  const challengeId = params.id as string;

  const [challenge, setChallenge] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [scoringCategories, setScoringCategories] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitModalCategory, setSubmitModalCategory] = useState<any>(null);
  const [submitVideo, setSubmitVideo] = useState<File | null>(null);
  const [submitWeight, setSubmitWeight] = useState("");
  const [submitReps, setSubmitReps] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || authLoading || !challengeId) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setLoadError("Loading took too long. Tap Retry to try again.");
    }, 20_000);
    loadChallenge().finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [user, authLoading, challengeId]);

  const loadChallenge = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [challengeData, leaderboardData, categoriesData] = await Promise.all([
        getChallengeDetails(challengeId),
        getChallengeLeaderboard(challengeId),
        getChallengeScoringCategories(challengeId),
      ]);

      setChallenge(challengeData);
      setLeaderboard(leaderboardData);
      setScoringCategories(categoriesData || []);

      const userEntry = user?.id
        ? leaderboardData?.find((e: any) => e.client_id === user.id)
        : null;
      if (userEntry?.id) {
        const subs = await getParticipantSubmissions(userEntry.id);
        setSubmissions(subs || []);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error("Error loading challenge:", error);
      setLoadError(
        error instanceof Error ? error.message : "Failed to load challenge"
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshSubmissions = async () => {
    const userEntry = user?.id
      ? leaderboard.find((e: any) => e.client_id === user.id)
      : null;
    if (userEntry?.id) {
      const subs = await getParticipantSubmissions(userEntry.id);
      setSubmissions(subs || []);
    }
  };

  const getSubmissionForCategory = (categoryId: string) => {
    const forCategory = submissions
      .filter((s: any) => s.scoring_category_id === categoryId)
      .sort(
        (a: any, b: any) =>
          new Date(b.submitted_at).getTime() -
          new Date(a.submitted_at).getTime()
      );
    return forCategory[0] || null;
  };

  const handleSubmitProof = async () => {
    const userEntry = user?.id
      ? leaderboard.find((e: any) => e.client_id === user.id)
      : null;
    if (!userEntry?.id || !submitModalCategory || !submitVideo) {
      addToast({ title: "Select a video file.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitVideoProof(
        userEntry.id,
        submitModalCategory.id,
        submitVideo,
        submitWeight ? parseFloat(submitWeight) : undefined,
        submitReps ? parseInt(submitReps, 10) : undefined
      );
      if (result) {
        addToast({
          title: "Proof submitted. Waiting for coach review.",
          variant: "success",
        });
        setSubmitModalCategory(null);
        setSubmitVideo(null);
        setSubmitWeight("");
        setSubmitReps("");
        setSubmitNotes("");
        await refreshSubmissions();
        loadChallenge();
      } else {
        addToast({ title: "Failed to submit. Try again.", variant: "destructive" });
      }
    } catch (err) {
      addToast({ title: "Failed to submit.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-10 sm:px-6 lg:px-10">
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

  if (loadError || !challenge) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-10 sm:px-6 lg:px-10">
            <GlassCard elevation={2} className="fc-glass fc-card p-12 text-center">
              <p className="text-lg font-semibold text-[color:var(--fc-text-primary)] mb-4">
                {loadError || "Challenge not found"}
              </p>
              {loadError ? (
                <Button
                  type="button"
                  onClick={() => {
                    setLoadError(null);
                    setLoading(true);
                    loadChallenge();
                  }}
                  className="fc-btn fc-btn-primary"
                >
                  Retry
                </Button>
              ) : (
                <Link
                  href="/client/challenges"
                  className="fc-btn fc-btn-secondary fc-press inline-flex"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Challenges
                </Link>
              )}
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <ChallengeDetailPageBody
        challenge={challenge}
        leaderboard={leaderboard}
        scoringCategories={scoringCategories}
        userId={user?.id}
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

export default function ChallengeDetailPage() {
  return (
    <ProtectedRoute>
      <ChallengeDetailContent />
    </ProtectedRoute>
  );
}
