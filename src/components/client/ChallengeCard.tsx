"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Users, Gift, Clock, Flame } from "lucide-react";
import { Challenge } from "@/lib/challengeService";

interface ChallengeCardProps {
  challenge: Challenge;
  onJoin: (challenge: Challenge) => void;
  onView: (challenge: Challenge) => void;
  isParticipating?: boolean;
  /** Flat list row instead of full card chrome */
  dense?: boolean;
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  end.setHours(23, 59, 59, 999);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function getChallengeProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

export function ChallengeCard({
  challenge,
  onJoin,
  onView,
  isParticipating = false,
  dense = false,
}: ChallengeCardProps) {
  const daysRemaining = getDaysRemaining(challenge.end_date);
  const progress = getChallengeProgress(challenge.start_date, challenge.end_date);
  const isEnding = daysRemaining <= 3 && challenge.status === "active";
  const challengeAsk = challenge.description?.trim()
    ? challenge.description
    : "Complete the required tasks shown in challenge details.";

  const getStatusColor = () => {
    if (challenge.status === "active") return "fc-text-success";
    if (challenge.status === "draft") return "fc-text-subtle";
    if (challenge.status === "completed") return "fc-text-workouts";
    return "fc-text-error";
  };

  const getChallengeTypeLabel = () => {
    if (challenge.challenge_type === "coach_challenge") return "Coach Challenge";
    return "Recomp Challenge";
  };

  const getCardStatusClasses = () => {
    if (challenge.status === "completed") {
      return "border-white/10 border-l-4 border-l-gray-400/80 opacity-90";
    }
    if (isParticipating) {
      return "border-white/10 border-l-4 border-l-amber-400/70";
    }
    if (challenge.status === "active") {
      return "border-white/10 border-l-4 border-l-emerald-400/70";
    }
    return "border-white/10 border-l-4 border-l-sky-400/70";
  };

  const getTypeBadgeClasses = () => {
    if (challenge.challenge_type === "coach_challenge") {
      return "border border-white/10 bg-white/[0.06] text-gray-200";
    }
    return "border border-white/10 bg-white/[0.06] text-gray-300";
  };

  if (dense) {
    const denseAccent =
      challenge.status === "completed"
        ? "border-l-gray-400 dark:border-l-gray-500"
        : isParticipating
          ? "border-l-amber-500"
          : challenge.status === "active"
            ? "border-l-green-500"
            : "border-l-blue-500";
    return (
      <div
        className={`flex min-h-[52px] flex-wrap items-center gap-3 border-b border-white/5 border-l-2 py-3 pl-2 ${denseAccent}`}
      >
        <Trophy className="h-5 w-5 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold fc-text-primary">{challenge.name}</p>
          <p className="text-xs fc-text-dim">
            {challenge.status === "active" ? `${daysRemaining}d left` : challenge.status}
            {isParticipating ? " · Joined" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="fc-btn fc-btn-ghost h-9 px-3"
            onClick={() => onView(challenge)}
          >
            View
          </Button>
          {!isParticipating && challenge.status === "active" && (
            <Button
              type="button"
              size="sm"
              className="fc-btn fc-btn-primary fc-press h-9 px-3"
              onClick={() => onJoin(challenge)}
            >
              Join
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-xl border bg-white/[0.04] backdrop-blur-[6px] transition-colors ${getCardStatusClasses()}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]">
            <Trophy className="w-5 h-5 text-gray-200" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${getTypeBadgeClasses()}`}>
                {getChallengeTypeLabel()}
              </span>
              {isEnding && challenge.status === "active" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-500 flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  Ending soon!
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              {challenge.name}
            </h3>
          </div>
        </div>
        <span className={`fc-pill fc-pill-glass uppercase ${getStatusColor()}`}>
          {challenge.status}
        </span>
      </div>

      {/* At-a-glance details */}
      <div className="space-y-2 mb-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
            Challenge asks
          </p>
          <p className="text-sm text-gray-200 line-clamp-2">{challengeAsk}</p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Prize
            </p>
            <div className="flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-xs text-gray-200 truncate">
                {challenge.reward_description || "No prize specified"}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Start / End
            </p>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs text-gray-200">
                {new Date(challenge.start_date).toLocaleDateString()} -{" "}
                {new Date(challenge.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar (active challenges only) */}
      {challenge.status === "active" && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] fc-text-dim mb-1">
            <span>Progress</span>
            <span>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left</span>
          </div>
          <div className="h-1.5 rounded-full bg-[color:var(--fc-glass-soft)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: isEnding
                  ? "linear-gradient(90deg, #ef4444, #f97316)"
                  : "linear-gradient(90deg, #06b6d4, #3b82f6)",
              }}
            />
          </div>
        </div>
      )}

      {/* Info Row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {challenge.status === "active" && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 fc-text-subtle" />
            <span className="text-xs font-medium fc-text-dim">
              {daysRemaining}d remaining
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 fc-text-subtle" />
          <span className="text-xs fc-text-dim">
            {isParticipating ? "Participating" : "Open to join"}
          </span>
        </div>
        {challenge.max_participants && (
          <span className="text-xs fc-text-subtle">
            Max {challenge.max_participants}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => onView(challenge)}
          variant="ghost"
          className="flex-1 fc-btn fc-btn-ghost"
        >
          View Details
        </Button>
        {!isParticipating && challenge.status === "active" && (
          <Button
            onClick={() => onJoin(challenge)}
            className="flex-1 fc-btn fc-btn-primary fc-press"
          >
            Join Challenge
          </Button>
        )}
        {isParticipating && (
          <div className="flex-1 justify-center py-2 flex items-center fc-pill fc-pill-glass fc-text-primary border border-[color:var(--fc-glass-border)]">
            Participating
          </div>
        )}
      </div>
    </div>
  );
}
