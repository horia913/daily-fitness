"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Gift,
  ChevronDown,
  ScrollText,
  Share2,
  Video,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Flame,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ChallengeDetailPageBodyProps {
  challenge: any;
  leaderboard: any[];
  scoringCategories: any[];
  userId: string | undefined;
  backHref?: string;
  /** When set, back control is a button (e.g. test page) instead of a Link. */
  onBackClick?: () => void;
  cornerBadge?: React.ReactNode;
  submitModalCategory: any;
  setSubmitModalCategory: (c: any) => void;
  submitVideo: File | null;
  setSubmitVideo: (f: File | null) => void;
  submitWeight: string;
  setSubmitWeight: (s: string) => void;
  submitReps: string;
  setSubmitReps: (s: string) => void;
  submitNotes: string;
  setSubmitNotes: (s: string) => void;
  submitting: boolean;
  handleSubmitProof: () => void;
  getSubmissionForCategory: (categoryId: string) => any;
}

export function ChallengeDetailPageBody({
  challenge,
  leaderboard,
  scoringCategories,
  userId,
  backHref = "/client/challenges",
  onBackClick,
  cornerBadge,
  submitModalCategory,
  setSubmitModalCategory,
  submitVideo,
  setSubmitVideo,
  submitWeight,
  setSubmitWeight,
  submitReps,
  setSubmitReps,
  submitNotes,
  setSubmitNotes,
  submitting,
  handleSubmitProof,
  getSubmissionForCategory,
}: ChallengeDetailPageBodyProps) {
  const backControl = onBackClick ? (
    <button
      type="button"
      onClick={onBackClick}
      className="inline-flex items-center gap-2 fc-text-subtle hover:fc-text-primary mb-6 text-sm font-medium"
    >
      <ArrowLeft className="w-5 h-5" />
      Back to Challenges
    </button>
  ) : (
    <Link
      href={backHref}
      className="inline-flex items-center gap-2 fc-text-subtle hover:fc-text-primary mb-6 text-sm font-medium"
    >
      <ArrowLeft className="w-5 h-5" />
      Back to Challenges
    </Link>
  );

  return (
    <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-32 pt-8 sm:px-6 lg:px-12 fc-page space-y-8">
      {cornerBadge ? (
        <div className="fixed right-3 top-3 z-[60] sm:right-6 sm:top-4">
          {cornerBadge}
        </div>
      ) : null}

      <header className="mb-8">
        {backControl}
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
                    : "Ended " +
                      new Date(challenge.end_date).toLocaleDateString()}
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
                navigator
                  .share({ title: challenge.name, url: window.location.href })
                  .catch(() => {});
              }
            }}
          >
            <Share2 className="w-6 h-6 fc-text-primary" />
          </button>
        </div>
      </header>

      {challenge.status === "completed" && (() => {
        const userEntry = userId
          ? leaderboard.find((e: any) => e.client_id === userId)
          : null;
        if (!userEntry) return null;
        const rank = userEntry.final_rank ?? leaderboard.indexOf(userEntry) + 1;
        const isWinner = rank === 1;
        const isTopThree = rank <= 3;
        return (
          <GlassCard
            elevation={2}
            className={cn(
              "fc-glass fc-card p-6 sm:p-8 rounded-2xl text-center",
              isWinner
                ? "border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-transparent"
                : ""
            )}
          >
            <div className="text-4xl mb-2">
              {isWinner ? "🏆" : isTopThree ? "🥈" : "🎉"}
            </div>
            <h2 className="text-xl font-bold fc-text-primary mb-1">
              {isWinner
                ? "You Won!"
                : isTopThree
                  ? `You finished #${rank}!`
                  : "Challenge Complete!"}
            </h2>
            <p className="text-sm fc-text-dim mb-4">
              You placed #{rank} of {leaderboard.length} with{" "}
              {userEntry.total_score ?? 0} points
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.share) {
                  navigator
                    .share({
                      title: `I placed #${rank} in ${challenge.name}!`,
                      text: `I scored ${userEntry.total_score ?? 0} points and finished #${rank} in the ${challenge.name} challenge!`,
                      url: window.location.href,
                    })
                    .catch(() => {});
                }
              }}
            >
              <Share2 className="w-4 h-4" />
              Share Result
            </button>
          </GlassCard>
        );
      })()}

      {(() => {
        const userEntry = userId
          ? leaderboard.find((e: any) => e.client_id === userId)
          : null;
        return userEntry ? (
          <GlassCard
            elevation={2}
            className="fc-glass fc-card p-6 sm:p-8 rounded-2xl border-l-4 border-l-[color:var(--fc-accent-blue)]"
          >
            <p className="text-sm font-bold uppercase tracking-widest fc-text-workouts mb-2">
              Your performance
            </p>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <div className="flex items-end gap-4 mb-2">
                  <span className="text-4xl font-bold font-mono fc-text-primary">
                    #{userEntry.final_rank ?? leaderboard.indexOf(userEntry) + 1}
                  </span>
                  <span className="fc-text-subtle mb-1">
                    of {leaderboard.length} participants
                  </span>
                </div>
                <div className="fc-glass-soft fc-text-success px-4 py-3 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                  <span>{userEntry.total_score ?? 0} points</span>
                </div>
              </div>
              <div className="fc-glass-soft p-6 rounded-2xl border border-[color:var(--fc-glass-border)] w-full sm:w-48 text-center">
                <span className="text-xs fc-text-subtle uppercase tracking-wider">
                  Points
                </span>
                <p className="text-2xl font-bold font-mono fc-text-primary mt-1">
                  {userEntry.total_score ?? 0}
                </p>
              </div>
            </div>
          </GlassCard>
        ) : null;
      })()}

      {(() => {
        const userEntry = userId
          ? leaderboard.find((e: any) => e.client_id === userId)
          : null;
        const canSubmit =
          userEntry &&
          challenge.requires_video_proof &&
          scoringCategories.length > 0 &&
          challenge.status === "active";
        if (!canSubmit) return null;
        return (
          <GlassCard elevation={2} className="fc-glass fc-card p-6 rounded-2xl">
            <h2 className="text-xl font-semibold fc-text-primary mb-4 flex items-center gap-2">
              <Video className="w-5 h-5" />
              Submit proof
            </h2>
            <p className="text-sm fc-text-dim mb-4">
              Submit video proof for each scoring category.
            </p>
            <div className="space-y-3">
              {scoringCategories.map((cat: any) => {
                const sub = getSubmissionForCategory(cat.id);
                const status = !sub ? "none" : sub.status;
                return (
                  <div
                    key={cat.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-xl bg-[color:var(--fc-glass-highlight)] border border-[color:var(--fc-glass-border)]"
                  >
                    <div>
                      <p className="font-semibold fc-text-primary">
                        {cat.category_name}
                      </p>
                      {status === "none" && (
                        <p className="text-xs fc-text-subtle">No submission</p>
                      )}
                      {status === "pending" && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Waiting for coach review
                        </p>
                      )}
                      {status === "approved" && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Approved{" "}
                          {sub?.claimed_weight != null &&
                            `— ${sub.claimed_weight} kg${
                              sub?.claimed_reps != null
                                ? ` × ${sub.claimed_reps} reps`
                                : ""
                            }`}
                        </p>
                      )}
                      {status === "rejected" && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Rejected — submit again
                        </p>
                      )}
                    </div>
                    {(status === "none" || status === "rejected") && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSubmitModalCategory(cat);
                          setSubmitVideo(null);
                          setSubmitWeight("");
                          setSubmitReps("");
                          setSubmitNotes("");
                        }}
                      >
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
        <GlassCard
          elevation={2}
          className="fc-glass fc-card rounded-2xl overflow-hidden"
        >
          <details className="group">
            <summary className="flex justify-between items-center p-6 cursor-pointer list-none hover:bg-[color:var(--fc-glass-highlight)] transition-colors">
              <div className="flex items-center gap-3">
                <ScrollText className="w-6 h-6 fc-text-subtle" />
                <h3 className="text-xl font-semibold fc-text-primary">
                  Rules & info
                </h3>
              </div>
              <ChevronDown className="w-5 h-5 fc-text-subtle group-open:rotate-180 transition-transform" />
            </summary>
            <div className="px-6 pb-6 pt-2 border-t border-[color:var(--fc-glass-border)]">
              <p className="fc-text-dim text-sm leading-relaxed">
                {challenge.description}
              </p>
              <p className="text-xs fc-text-subtle mt-4 italic">
                {new Date(challenge.start_date).toLocaleDateString()} –{" "}
                {new Date(challenge.end_date).toLocaleDateString()}
              </p>
            </div>
          </details>
        </GlassCard>
      )}

      {challenge.status === "active" && (() => {
        const start = new Date(challenge.start_date).getTime();
        const end = new Date(challenge.end_date).getTime();
        const now = Date.now();
        const pct = Math.min(
          100,
          Math.max(0, Math.round(((now - start) / (end - start)) * 100))
        );
        const daysTotal = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(
          0,
          Math.ceil((end - now) / (1000 * 60 * 60 * 24))
        );
        const isEndingSoon = daysLeft <= 3;

        return (
          <GlassCard elevation={2} className="fc-glass fc-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest fc-text-dim flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Challenge Progress
              </h3>
              <span className="text-sm font-mono font-bold fc-text-primary">
                Day {daysTotal - daysLeft} / {daysTotal}
              </span>
            </div>

            <div className="relative h-3 rounded-full bg-[color:var(--fc-glass-soft)] overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: isEndingSoon
                    ? "linear-gradient(90deg, #ef4444, #f97316)"
                    : "linear-gradient(90deg, #06b6d4, #3b82f6)",
                }}
              />
              <div className="absolute top-0 left-1/4 w-px h-full bg-[color:var(--fc-glass-border)]" />
              <div className="absolute top-0 left-1/2 w-px h-full bg-[color:var(--fc-glass-border)]" />
              <div className="absolute top-0 left-3/4 w-px h-full bg-[color:var(--fc-glass-border)]" />
            </div>

            <div className="flex justify-between text-[10px] fc-text-dim">
              <span>Start</span>
              <span>25%</span>
              <span>Halfway</span>
              <span>75%</span>
              <span>End</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {pct >= 50 && (
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Halfway reached
                </span>
              )}
              {isEndingSoon && (
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 flex items-center gap-1">
                  <Flame className="w-3 h-3" /> {daysLeft} day
                  {daysLeft !== 1 ? "s" : ""} left!
                </span>
              )}
              {daysLeft === 0 && (
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Last day!
                </span>
              )}
            </div>
          </GlassCard>
        );
      })()}

      <section>
        <h2 className="text-xl font-semibold fc-text-primary mb-6 flex items-center gap-3">
          <Trophy className="w-6 h-6 fc-text-workouts" />
          Leaderboard
        </h2>
        <GlassCard elevation={2} className="fc-glass fc-card p-6 rounded-2xl">
          {leaderboard.length > 0 && (
            <p className="text-sm fc-text-subtle mb-4">
              {leaderboard.length} participants
            </p>
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
              {challenge.status === "completed" && leaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-3 mb-4 py-4">
                  {[1, 0, 2].map((podiumIdx) => {
                    const entry = leaderboard[podiumIdx];
                    if (!entry) return null;
                    const heights = ["h-20", "h-16", "h-12"];
                    const badges = ["🥇", "🥈", "🥉"];
                    return (
                      <div
                        key={entry.id}
                        className="flex flex-col items-center gap-1 flex-1 max-w-[100px]"
                      >
                        <span className="text-xl">{badges[podiumIdx]}</span>
                        <p className="text-xs font-semibold fc-text-primary truncate w-full text-center">
                          {entry.display_name ?? "Participant"}
                        </p>
                        <p className="text-xs font-mono font-bold text-[color:var(--fc-accent-cyan)]">
                          {entry.total_score} pts
                        </p>
                        <div
                          className={cn(
                            "w-full rounded-t-xl border-t-2 border-amber-400 bg-gradient-to-t from-amber-500/10 to-transparent",
                            heights[podiumIdx]
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {leaderboard.map((entry, index) => {
                const rank = entry.final_rank || index + 1;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "fc-glass-soft fc-card p-4 transition-all",
                      entry.client_id === userId
                        ? "border border-[color:var(--fc-accent-cyan)]/50 shadow-[0_0_0_1px_rgba(8,145,178,0.25)]"
                        : "border border-[color:var(--fc-glass-border)]"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0",
                          rank === 1
                            ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                            : rank === 2
                              ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white"
                              : rank === 3
                                ? "bg-gradient-to-br from-amber-700 to-orange-900 text-white"
                                : "bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-text-primary)]"
                        )}
                      >
                        {rank}
                      </div>

                      <div className="flex-1">
                        <p className="font-semibold text-[color:var(--fc-text-primary)]">
                          {entry.display_name ?? `Participant ${index + 1}`}
                          {entry.client_id === userId && (
                            <span className="text-xs ml-2 text-[color:var(--fc-accent-cyan)]">
                              (You)
                            </span>
                          )}
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
                );
              })}
            </div>
          )}
        </GlassCard>
      </section>

      <Dialog
        open={!!submitModalCategory}
        onOpenChange={(open) => !open && setSubmitModalCategory(null)}
      >
        <DialogContent className="fc-glass fc-card border border-[color:var(--fc-glass-border)] max-w-md">
          <DialogHeader>
            <DialogTitle>
              Submit proof — {submitModalCategory?.category_name}
            </DialogTitle>
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
              <Input
                type="number"
                step="0.1"
                value={submitWeight}
                onChange={(e) => setSubmitWeight(e.target.value)}
                placeholder="Optional"
                variant="fc"
              />
            </div>
            <div>
              <Label>Claimed reps</Label>
              <Input
                type="number"
                value={submitReps}
                onChange={(e) => setSubmitReps(e.target.value)}
                placeholder="Optional"
                variant="fc"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={submitNotes}
                onChange={(e) => setSubmitNotes(e.target.value)}
                placeholder="Optional"
                variant="fc"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitModalCategory(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitProof} disabled={submitting || !submitVideo}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
