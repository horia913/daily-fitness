"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Users, Gift } from "lucide-react";
import { Challenge } from "@/lib/challengeService";

interface ChallengeCardProps {
  challenge: Challenge;
  onJoin: (challenge: Challenge) => void;
  onView: (challenge: Challenge) => void;
  isParticipating?: boolean;
}

export function ChallengeCard({
  challenge,
  onJoin,
  onView,
  isParticipating = false,
}: ChallengeCardProps) {
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

  return (
    <div className="p-6 fc-glass fc-card fc-accent-challenges fc-hover-rise fc-press rounded-2xl border border-[color:var(--fc-glass-border)]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="fc-icon-tile fc-icon-challenges">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="fc-pill fc-pill-glass fc-text-challenges">
                {getChallengeTypeLabel()}
              </span>
            </div>
            <h3 className="text-lg font-bold fc-text-primary">
              {challenge.name}
            </h3>
            <p className="text-xs fc-text-subtle">
              {new Date(challenge.start_date).toLocaleDateString()} -{" "}
              {new Date(challenge.end_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <span className={`fc-pill fc-pill-glass uppercase ${getStatusColor()}`}>
          {challenge.status}
        </span>
      </div>

      {/* Description */}
      {challenge.description && (
        <p className="text-sm mb-4 line-clamp-2 fc-text-dim">
          {challenge.description}
        </p>
      )}

      {/* Info Row */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 fc-text-subtle" />
          <span className="text-xs fc-text-subtle">Timeline</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 fc-text-subtle" />
          <span className="text-xs fc-text-subtle">
            {isParticipating ? "You are in" : "Open to join"}
          </span>
        </div>
        {challenge.reward_description && (
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 fc-text-warning" />
            <span className="text-xs font-medium fc-text-warning">
              Prize available
            </span>
          </div>
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
          <div
            className="flex-1 justify-center py-2 flex items-center fc-pill fc-pill-glass fc-text-primary border border-[color:var(--fc-glass-border)]"
          >
            Participating
          </div>
        )}
      </div>
    </div>
  );
}

