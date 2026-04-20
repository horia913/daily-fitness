"use client";

import React from "react";
import { useRouter } from "next/navigation";
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
import { ClientPageShell } from "@/components/client-ui";

export interface ChallengeDetailPageBodyProps {
  challenge: any;
  leaderboard: any[];
  scoringCategories: any[];
  userId: string | undefined;
  backHref?: string;
  /** When set, back control uses this handler instead of navigating to backHref. */
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

function DetailSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] p-4">
      {children}
    </div>
  );
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
  const router = useRouter();

  const backControl = onBackClick ? (
    <button
      type="button"
      onClick={onBackClick}
      className="inline-flex items-center gap-2 fc-text-subtle hover:fc-text-primary mb-4 text-xs font-medium"
    >
      <ArrowLeft className="w-5 h-5" aria-hidden />
      Back to Challenges
    </button>
  ) : (
    <button
      type="button"
      onClick={() => {
        router.push(backHref);
      }}
      className="inline-flex items-center gap-2 fc-text-subtle hover:fc-text-primary mb-4 text-xs font-medium"
    >
      <ArrowLeft className="w-5 h-5" aria-hidden />
      Back to Challenges
    </button>
  );

  return (
    <ClientPageShell className="max-w-lg px-4 pb-32 pt-6 space-y-4">
      {cornerBadge ? (
        <div className="fixed right-3 top-3 z-[60]">{cornerBadge}</div>
      ) : null}

      <header className="mb-4">
        {backControl}
        <div className="flex gap-3 flex-col">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight fc-text-primary mb-1.5 break-words">
              {challenge.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <div className="fc-glass-soft px-2.5 py-1.5 rounded-lg border border-[color:var(--fc-glass-border)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 fc-text-warning shrink-0" aria-hidden />
                <span className="font-mono text-xs font-bold fc-text-primary">
                  {new Date(challenge.end_date) > new Date()
                    ? "Ends " + new Date(challenge.end_date).toLocaleDateString()
                    : "Ended " +
                      new Date(challenge.end_date).toLocaleDateString()}
                </span>
              </div>
              {challenge.reward_description && (
                <span className="fc-glass-soft px-3 py-1.5 rounded-full text-sm font-bold fc-text-warning border border-[color-mix(in_srgb,var(--fc-status-warning)_30%,transparent)] flex items-center gap-2">
                  <Gift className="w-4 h-4" aria-hidden />
                  {challenge.reward_description}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="w-12 h-12 flex items-center justify-center rounded-xl border transition-colors shrink-0 border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] hover:bg-[color:var(--fc-glass-soft)]"
            aria-label="Share challenge"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.share) {
                navigator
                  .share({ title: challenge.name, url: window.location.href })
                  .catch(() => {});
              }
            }}
          >
            <Share2 className="w-6 h-6 fc-text-primary" aria-hidden />
          </button>
        </div>
      </header>

      {challenge.status === "completed" &&
        (() => {
          const userEntry = userId
            ? leaderboard.find((e: any) => e.client_id === userId)
            : null;
          if (!userEntry) return null;
          const rank = userEntry.final_rank ?? leaderboard.indexOf(userEntry) + 1;
          const isWinner = rank === 1;
          const isTopThree = rank <= 3;
          return (
            <div
              className={cn(
                "rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] p-4 text-center",
                isWinner &&
                  "border-2 border-[color-mix(in_srgb,var(--fc-status-warning)_50%,transparent)] bg-gradient-to-b from-[color-mix(in_srgb,var(--fc-status-warning)_12%,transparent)] to-transparent"
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[color-mix(in_srgb,var(--fc-accent-cyan)_20%,transparent)] text-[color:var(--fc-accent-cyan)] text-sm font-medium hover:bg-[color-mix(in_srgb,var(--fc-accent-cyan)_30%,transparent)] transition-colors"
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
                <Share2 className="w-4 h-4" aria-hidden />
                Share Result
              </button>
            </div>
          );
        })()}

      {(() => {
        const userEntry = userId
          ? leaderboard.find((e: any) => e.client_id === userId)
          : null;
        return userEntry ? (
          <div className="rounded-xl border-y border-r border-[color:var(--fc-glass-border)] border-l-4 border-l-[color:var(--fc-accent-cyan)] bg-[color:var(--fc-glass-highlight)] p-4">
            <p className="text-xs font-bold uppercase tracking-widest fc-text-workouts mb-3">
              Your performance
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 snap-x snap-mandatory">
              <div className="min-w-[calc(50%-0.25rem)] shrink-0 snap-start rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider fc-text-subtle mb-1">
                  Rank
                </p>
                <p className="text-2xl font-bold font-mono fc-text-primary">
                  #{userEntry.final_rank ?? leaderboard.indexOf(userEntry) + 1}
                </p>
                <p className="text-xs fc-text-subtle mt-1">
                  of {leaderboard.length} participants
                </p>
              </div>
              <div className="min-w-[calc(50%-0.25rem)] shrink-0 snap-start rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider fc-text-subtle mb-1">
                  Points
                </p>
                <p className="text-2xl font-bold font-mono fc-text-primary">
                  {userEntry.total_score ?? 0}
                </p>
                <p className="text-xs fc-text-success mt-1 font-medium">
                  Total score
                </p>
              </div>
            </div>
          </div>
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
          <DetailSection>
            <h2 className="text-xl font-semibold fc-text-primary mb-4 flex items-center gap-2">
              <Video className="w-5 h-5" aria-hidden />
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
                    className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)]"
                  >
                    <div>
                      <p className="font-semibold fc-text-primary">
                        {cat.category_name}
                      </p>
                      {status === "none" && (
                        <p className="text-xs fc-text-subtle">No submission</p>
                      )}
                      {status === "pending" && (
                        <p className="text-xs fc-text-warning flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden /> Waiting for coach review
                        </p>
                      )}
                      {status === "approved" && (
                        <p className="text-xs fc-text-success flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" aria-hidden /> Approved{" "}
                          {sub?.claimed_weight != null &&
                            `— ${sub.claimed_weight} kg${
                              sub?.claimed_reps != null
                                ? ` × ${sub.claimed_reps} reps`
                                : ""
                            }`}
                        </p>
                      )}
                      {status === "rejected" && (
                        <p className="text-xs text-[color:var(--fc-status-error)] flex items-center gap-1">
                          <XCircle className="w-3 h-3" aria-hidden /> Rejected — submit again
                        </p>
                      )}
                    </div>
                    {(status === "none" || status === "rejected") && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSubmitModalCategory(cat);
                          setSubmitVideo(null);
                          setSubmitWeight("");
                          setSubmitReps("");
                          setSubmitNotes("");
                        }}
                      >
                        <Upload className="w-4 h-4 mr-2" aria-hidden />
                        Submit proof
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </DetailSection>
        );
      })()}

      {challenge.description && (
        <div className="rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] overflow-hidden">
          <details className="group">
            <summary className="flex justify-between items-center p-4 cursor-pointer list-none hover:bg-[color:var(--fc-glass-soft)] transition-colors">
              <div className="flex items-center gap-3">
                <ScrollText className="w-6 h-6 fc-text-subtle" aria-hidden />
                <h3 className="text-base font-semibold fc-text-primary tracking-tight">
                  Rules & info
                </h3>
              </div>
              <ChevronDown className="w-5 h-5 fc-text-subtle group-open:rotate-180 transition-transform" aria-hidden />
            </summary>
            <div className="px-4 pb-4 pt-2 border-t border-[color:var(--fc-glass-border)]">
              <p className="text-sm fc-text-dim leading-relaxed">
                {challenge.description}
              </p>
              <p className="text-xs fc-text-subtle mt-4 italic">
                {new Date(challenge.start_date).toLocaleDateString()} –{" "}
                {new Date(challenge.end_date).toLocaleDateString()}
              </p>
            </div>
          </details>
        </div>
      )}

      {challenge.status === "active" &&
        (() => {
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
            <DetailSection>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest fc-text-dim flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" aria-hidden />
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
                      ? "linear-gradient(90deg, var(--fc-status-error), var(--fc-status-warning))"
                      : "linear-gradient(90deg, var(--fc-accent-cyan), var(--fc-accent))",
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
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-[color-mix(in_srgb,var(--fc-accent-cyan)_20%,transparent)] text-[color:var(--fc-accent-cyan)] flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" aria-hidden /> Halfway reached
                  </span>
                )}
                {isEndingSoon && (
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-[color-mix(in_srgb,var(--fc-status-error)_20%,transparent)] text-[color:var(--fc-status-error)] flex items-center gap-1">
                    <Flame className="w-3 h-3" aria-hidden /> {daysLeft} day
                    {daysLeft !== 1 ? "s" : ""} left!
                  </span>
                )}
                {daysLeft === 0 && (
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-[color-mix(in_srgb,var(--fc-status-warning)_20%,transparent)] text-[color:var(--fc-status-warning)] flex items-center gap-1">
                    <Clock className="w-3 h-3" aria-hidden /> Last day!
                  </span>
                )}
              </div>
            </DetailSection>
          );
        })()}

      <section>
        <div className="mb-3 flex flex-col gap-1">
          <h2 className="flex items-center gap-2 font-semibold fc-text-primary tracking-tight text-base">
            <Trophy className="fc-text-workouts shrink-0 w-5 h-5" aria-hidden />
            Leaderboard
          </h2>
          {leaderboard.length > 0 && (
            <p className="text-xs fc-text-subtle">
              {leaderboard.length} participants
            </p>
          )}
        </div>
        {leaderboard.length === 0 ? (
          <div className="rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] p-4 text-center py-10">
            <Trophy className="w-12 h-12 mx-auto mb-3 fc-text-subtle" aria-hidden />
            <p className="text-base font-semibold fc-text-primary">
              No participants yet
            </p>
            <p className="text-xs fc-text-subtle mt-2">Be the first to join.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {challenge.status === "completed" && leaderboard.length >= 3 && (
              <div className="rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] p-4 mb-2">
                <div className="flex items-end justify-center gap-3 py-2">
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
                            "w-full rounded-t-xl border-t-2 border-[color:var(--fc-status-warning)] bg-gradient-to-t from-[color-mix(in_srgb,var(--fc-status-warning)_12%,transparent)] to-transparent",
                            heights[podiumIdx]
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {leaderboard.map((entry, index) => {
              const rank = entry.final_rank || index + 1;
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] p-4 transition-all",
                    entry.client_id === userId &&
                      "border-[color-mix(in_srgb,var(--fc-accent-cyan)_50%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--fc-accent-cyan)_25%,transparent)]"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 border border-[color:var(--fc-glass-border)]",
                        rank === 1
                          ? "bg-[color-mix(in_srgb,var(--fc-status-warning)_35%,transparent)] text-[color:var(--fc-status-warning)]"
                          : rank === 2
                            ? "bg-[color:var(--fc-glass-soft)] fc-text-primary"
                            : rank === 3
                              ? "bg-[color-mix(in_srgb,var(--fc-status-warning)_22%,transparent)] text-[color:var(--fc-text-primary)]"
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
      </section>

      <Dialog
        open={!!submitModalCategory}
        onOpenChange={(open) => !open && setSubmitModalCategory(null)}
      >
        <DialogContent className="fc-card-shell border border-[color:var(--fc-glass-border)] max-w-md">
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
            <Button type="button" variant="outline" onClick={() => setSubmitModalCategory(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmitProof} disabled={submitting || !submitVideo}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientPageShell>
  );
}
