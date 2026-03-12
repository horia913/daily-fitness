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
import { ArrowLeft, Trophy, Calendar, Gift, ChevronDown, ScrollText, Share2, Video, CheckCircle, XCircle, Clock, Upload } from "lucide-react";
import Link from "next/link";
import { getChallengeDetails, getChallengeLeaderboard, getChallengeScoringCategories, getParticipantSubmissions, submitVideoProof } from "@/lib/challengeService";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

      const userEntry = user?.id ? leaderboardData?.find((e: any) => e.client_id === user.id) : null;
      if (userEntry?.id) {
        const subs = await getParticipantSubmissions(userEntry.id);
        setSubmissions(subs || []);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error("Error loading challenge:", error);
      setLoadError(error instanceof Error ? error.message : "Failed to load challenge");
    } finally {
      setLoading(false);
    }
  };

  const refreshSubmissions = async () => {
    const userEntry = user?.id ? leaderboard.find((e: any) => e.client_id === user.id) : null;
    if (userEntry?.id) {
      const subs = await getParticipantSubmissions(userEntry.id);
      setSubmissions(subs || []);
    }
  };

  const getSubmissionForCategory = (categoryId: string) => {
    const forCategory = submissions.filter((s: any) => s.scoring_category_id === categoryId).sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    return forCategory[0] || null;
  };

  const handleSubmitProof = async () => {
    const userEntry = user?.id ? leaderboard.find((e: any) => e.client_id === user.id) : null;
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
        addToast({ title: "Proof submitted. Waiting for coach review.", variant: "success" });
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
                <Button type="button" onClick={() => { setLoadError(null); setLoading(true); loadChallenge(); }} className="fc-btn fc-btn-primary">
                  Retry
                </Button>
              ) : (
                <Link href="/client/challenges" className="fc-btn fc-btn-secondary fc-press inline-flex">
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

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-32 pt-8 sm:px-6 lg:px-12 fc-page space-y-8">
        <header className="mb-8">
          <Link
            href="/client/challenges"
            className="inline-flex items-center gap-2 fc-text-subtle hover:fc-text-primary mb-6 text-sm font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Challenges
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight fc-text-primary mb-2">
                {challenge.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className="fc-glass-soft px-3 py-2 rounded-xl border border-[color:var(--fc-glass-border)] flex items-center gap-2">
                  <Calendar className="w-4 h-4 fc-text-warning" />
                  <span className="font-mono text-sm font-bold fc-text-primary">
                    {new Date(challenge.end_date) > new Date()
                      ? "Ends " + new Date(challenge.end_date).toLocaleDateString()
                      : "Ended " + new Date(challenge.end_date).toLocaleDateString()}
                  </span>
                </div>
                {challenge.reward_description && (
                  <span className="fc-glass-soft px-3 py-1.5 rounded-full text-sm font-bold fc-text-warning border border-amber-500/30 flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    {challenge.reward_description}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="fc-glass fc-card w-12 h-12 flex items-center justify-center rounded-2xl border border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-glass-soft)] transition-colors shrink-0"
              aria-label="Share challenge"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.share) {
                  navigator.share({ title: challenge.name, url: window.location.href }).catch(() => {});
                }
              }}
            >
              <Share2 className="w-6 h-6 fc-text-primary" />
            </button>
          </div>
        </header>

        {(() => {
          const userEntry = user?.id ? leaderboard.find((e: any) => e.client_id === user.id) : null;
          return userEntry ? (
            <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-8 rounded-2xl border-l-4 border-l-[color:var(--fc-accent-blue)]">
              <p className="text-sm font-bold uppercase tracking-widest fc-text-workouts mb-2">Your performance</p>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                  <div className="flex items-end gap-4 mb-2">
                    <span className="text-4xl font-bold font-mono fc-text-primary">#{userEntry.final_rank ?? leaderboard.indexOf(userEntry) + 1}</span>
                    <span className="fc-text-subtle mb-1">of {leaderboard.length} participants</span>
                  </div>
                  <div className="fc-glass-soft fc-text-success px-4 py-3 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                    <span>{userEntry.total_score ?? 0} points</span>
                  </div>
                </div>
                <div className="fc-glass-soft p-6 rounded-2xl border border-[color:var(--fc-glass-border)] w-full sm:w-48 text-center">
                  <span className="text-xs fc-text-subtle uppercase tracking-wider">Points</span>
                  <p className="text-2xl font-bold font-mono fc-text-primary mt-1">{userEntry.total_score ?? 0}</p>
                </div>
              </div>
            </GlassCard>
          ) : null;
        })()}

        {(() => {
          const userEntry = user?.id ? leaderboard.find((e: any) => e.client_id === user.id) : null;
          const canSubmit = userEntry && challenge.requires_video_proof && scoringCategories.length > 0 && challenge.status === "active";
          if (!canSubmit) return null;
          return (
            <GlassCard elevation={2} className="fc-glass fc-card p-6 rounded-2xl">
              <h2 className="text-xl font-semibold fc-text-primary mb-4 flex items-center gap-2">
                <Video className="w-5 h-5" />
                Submit proof
              </h2>
              <p className="text-sm fc-text-dim mb-4">Submit video proof for each scoring category.</p>
              <div className="space-y-3">
                {scoringCategories.map((cat: any) => {
                  const sub = getSubmissionForCategory(cat.id);
                  const status = !sub ? "none" : sub.status;
                  return (
                    <div key={cat.id} className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-xl bg-[color:var(--fc-glass-highlight)] border border-[color:var(--fc-glass-border)]">
                      <div>
                        <p className="font-semibold fc-text-primary">{cat.category_name}</p>
                        {status === "none" && <p className="text-xs fc-text-subtle">No submission</p>}
                        {status === "pending" && <p className="text-xs text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Waiting for coach review</p>}
                        {status === "approved" && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved {sub?.claimed_weight != null && `— ${sub.claimed_weight} kg${sub?.claimed_reps != null ? ` × ${sub.claimed_reps} reps` : ""}`}</p>}
                        {status === "rejected" && <p className="text-xs text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected — submit again</p>}
                      </div>
                      {(status === "none" || status === "rejected") && (
                        <Button size="sm" onClick={() => { setSubmitModalCategory(cat); setSubmitVideo(null); setSubmitWeight(""); setSubmitReps(""); setSubmitNotes(""); }}>
                          <Upload className="w-4 h-4 mr-2" />
                          Submit proof
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          );
        })()}

        {challenge.description && (
          <GlassCard elevation={2} className="fc-glass fc-card rounded-2xl overflow-hidden">
            <details className="group">
              <summary className="flex justify-between items-center p-6 cursor-pointer list-none hover:bg-[color:var(--fc-glass-highlight)] transition-colors">
                <div className="flex items-center gap-3">
                  <ScrollText className="w-6 h-6 fc-text-subtle" />
                  <h3 className="text-xl font-semibold fc-text-primary">Rules & info</h3>
                </div>
                <ChevronDown className="w-5 h-5 fc-text-subtle group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-6 pb-6 pt-2 border-t border-[color:var(--fc-glass-border)]">
                <p className="fc-text-dim text-sm leading-relaxed">{challenge.description}</p>
                <p className="text-xs fc-text-subtle mt-4 italic">
                  {new Date(challenge.start_date).toLocaleDateString()} – {new Date(challenge.end_date).toLocaleDateString()}
                </p>
              </div>
            </details>
          </GlassCard>
        )}

        <section>
          <h2 className="text-xl font-semibold fc-text-primary mb-6 flex items-center gap-3">
            <Trophy className="w-6 h-6 fc-text-workouts" />
            Leaderboard
          </h2>
        <GlassCard elevation={2} className="fc-glass fc-card p-6 rounded-2xl">
          {leaderboard.length > 0 && (
            <p className="text-sm fc-text-subtle mb-4">{leaderboard.length} participants</p>
          )}
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
        </section>

        <Dialog open={!!submitModalCategory} onOpenChange={(open) => !open && setSubmitModalCategory(null)}>
          <DialogContent className="fc-glass fc-card border border-[color:var(--fc-glass-border)] max-w-md">
            <DialogHeader>
              <DialogTitle>Submit proof — {submitModalCategory?.category_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Video (MP4, MOV)</Label>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,.mp4,.mov"
                  className="mt-1 block w-full text-sm fc-text-primary"
                  onChange={(e) => setSubmitVideo(e.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <Label>Claimed weight (kg)</Label>
                <Input type="number" step="0.1" value={submitWeight} onChange={(e) => setSubmitWeight(e.target.value)} placeholder="Optional" variant="fc" />
              </div>
              <div>
                <Label>Claimed reps</Label>
                <Input type="number" value={submitReps} onChange={(e) => setSubmitReps(e.target.value)} placeholder="Optional" variant="fc" />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input value={submitNotes} onChange={(e) => setSubmitNotes(e.target.value)} placeholder="Optional" variant="fc" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubmitModalCategory(null)}>Cancel</Button>
              <Button onClick={handleSubmitProof} disabled={submitting || !submitVideo}>
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

