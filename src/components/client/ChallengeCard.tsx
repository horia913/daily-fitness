"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const { isDark, getSemanticColor } = useTheme();

  const getStatusColor = () => {
    if (challenge.status === "active") return getSemanticColor("success").primary;
    if (challenge.status === "draft") return getSemanticColor("neutral").primary;
    if (challenge.status === "completed") return getSemanticColor("trust").primary;
    return getSemanticColor("critical").primary;
  };

  const getChallengeTypeLabel = () => {
    if (challenge.challenge_type === "coach_challenge") return "Coach Challenge";
    return "Recomp Challenge";
  };

  return (
    <div
      className="p-6 rounded-2xl transition-all hover:scale-[1.02]"
      style={{
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
        border: `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
              boxShadow: "0 4px 12px rgba(255, 215, 0, 0.3)",
            }}
          >
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3
              className="text-lg font-bold"
              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
            >
              {challenge.name}
            </h3>
            <p
              className="text-xs"
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              {getChallengeTypeLabel()}
            </p>
          </div>
        </div>
        <Badge
          style={{
            background: getStatusColor(),
            color: "#fff",
          }}
        >
          {challenge.status}
        </Badge>
      </div>

      {/* Description */}
      {challenge.description && (
        <p
          className="text-sm mb-4 line-clamp-2"
          style={{
            color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
          }}
        >
          {challenge.description}
        </p>
      )}

      {/* Info Row */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }} />
          <span
            className="text-xs"
            style={{
              color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
            }}
          >
            {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
          </span>
        </div>
        {challenge.reward_description && (
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4" style={{ color: getSemanticColor("warning").primary }} />
            <span
              className="text-xs font-medium"
              style={{ color: getSemanticColor("warning").primary }}
            >
              Prize
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => onView(challenge)}
          variant="ghost"
          className="flex-1"
        >
          View Details
        </Button>
        {!isParticipating && challenge.status === "active" && (
          <Button
            onClick={() => onJoin(challenge)}
            className="flex-1"
            style={{
              background: getSemanticColor("success").gradient,
              boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
            }}
          >
            Join Challenge
          </Button>
        )}
        {isParticipating && (
          <Badge
            className="flex-1 justify-center py-2"
            style={{
              background: getSemanticColor("trust").gradient,
              color: "#fff",
            }}
          >
            Participating
          </Badge>
        )}
      </div>
    </div>
  );
}

