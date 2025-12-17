"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { GlassCard } from "./GlassCard";
import { AnimatedNumber } from "./AnimatedNumber";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string;
  workoutCount: number;
  trend?: "up" | "down" | "same";
  streak?: number;
  rank?: number;
  previousRank?: number;
}

interface LeaderboardCardProps {
  leaderboard: LeaderboardUser[];
  currentUserId: string;
  totalParticipants?: number;
  className?: string;
}

export function LeaderboardCard({
  leaderboard,
  currentUserId,
  totalParticipants,
  className = "",
}: LeaderboardCardProps) {
  const { isDark, getSemanticColor } = useTheme();

  // Auto-calculate ranks if not provided
  const usersWithRanks = leaderboard.map((user, index) => ({
    ...user,
    rank: user.rank ?? index + 1,
    previousRank: user.previousRank ?? index + 1,
    streak: user.streak ?? 0,
  }));

  const topThree = usersWithRanks.slice(0, 3);
  const chasingPack = usersWithRanks.slice(3, 10);
  const currentUser = usersWithRanks.find((u) => u.id === currentUserId);
  const currentUserInTop10 = currentUser && currentUser.rank <= 10;
  const calculatedTotalParticipants = totalParticipants ?? leaderboard.length;

  return (
    <GlassCard elevation={2} className={`p-6 ${className}`}>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
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
              Leaderboard
            </h3>
            <p
              className="text-xs"
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              {calculatedTotalParticipants} athletes this week
            </p>
          </div>
        </div>
      </div>

      {/* Podium Display */}
      <div className="flex items-end justify-center gap-2 mb-6">
        {/* Second Place */}
        {topThree[1] && (
          <PodiumCard user={topThree[1]} place={2} height={100} />
        )}

        {/* First Place */}
        {topThree[0] && (
          <PodiumCard user={topThree[0]} place={1} height={120} />
        )}

        {/* Third Place */}
        {topThree[2] && <PodiumCard user={topThree[2]} place={3} height={80} />}
      </div>

      {/* Chasing Pack */}
      {chasingPack.length > 0 && (
        <div className="mb-6">
          <h4
            className="text-sm font-semibold mb-3"
            style={{
              color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
            }}
          >
            Chasing Pack
          </h4>
          <div className="space-y-2">
            {chasingPack.map((user) => (
              <LeaderboardRow
                key={user.id}
                user={user}
                isCurrentUser={user.id === currentUserId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Current User Section (if not in top 10) */}
      {!currentUserInTop10 && currentUser && (
        <div>
          <div
            className="h-px mb-3"
            style={{
              background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            }}
          />
          <h4
            className="text-sm font-semibold mb-3"
            style={{
              color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
            }}
          >
            Your Rank
          </h4>
          <LeaderboardRow user={currentUser} isCurrentUser={true} />

          <div className="mt-4 text-center">
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: getSemanticColor("energy").primary }}
            >
              {currentUser.rank <= 10
                ? "You're in the top 10!"
                : `${10 - currentUser.rank} more workouts → Top 10!`}
            </p>
            <p
              className="text-xs"
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              Beat {calculatedTotalParticipants - currentUser.rank} athletes!
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function PodiumCard({
  user,
  place,
  height,
}: {
  user: LeaderboardUser;
  place: number;
  height: number;
}) {
  const { isDark } = useTheme();

  const medals = ["🥇", "🥈", "🥉"];
  const gradients = [
    "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
    "linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)",
    "linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)",
  ];

  return (
    <div className="flex flex-col items-center flex-1 max-w-[100px]">
      {/* Avatar */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-2 relative"
        style={{
          background: gradients[place - 1],
          border: "3px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-2xl">👤</span>
        )}

        {/* Medal Badge */}
        <div
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
        >
          <span className="text-sm">{medals[place - 1]}</span>
        </div>
      </div>

      {/* Name */}
      <p
        className="text-sm font-bold text-center mb-1 truncate w-full"
        style={{ color: isDark ? "#fff" : "#1A1A1A" }}
      >
        {user.name}
      </p>

      {/* Stats */}
      <div className="text-xs text-center mb-2">
        <AnimatedNumber
          value={user.workoutCount}
          size="body"
          weight="bold"
          color={isDark ? "#fff" : "#1A1A1A"}
        />
        <span
          style={{
            color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
          }}
        >
          {" "}
          workouts
        </span>
      </div>

      {/* Podium */}
      <div
        className="w-full rounded-t-lg"
        style={{
          height: `${height}px`,
          background: gradients[place - 1],
          opacity: 0.3,
        }}
      />
    </div>
  );
}

function LeaderboardRow({
  user,
  isCurrentUser,
}: {
  user: LeaderboardUser;
  isCurrentUser: boolean;
}) {
  const { isDark, getSemanticColor } = useTheme();

  const rankChange = user.previousRank - user.rank;
  const trendIcon =
    rankChange > 0 ? (
      <TrendingUp
        className="w-4 h-4"
        style={{ color: getSemanticColor("success").primary }}
      />
    ) : rankChange < 0 ? (
      <TrendingDown
        className="w-4 h-4"
        style={{ color: getSemanticColor("critical").primary }}
      />
    ) : (
      <Minus
        className="w-4 h-4"
        style={{ color: getSemanticColor("neutral").primary }}
      />
    );

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        background: isCurrentUser
          ? `${getSemanticColor("energy").primary}20`
          : isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(0,0,0,0.03)",
        border: isCurrentUser
          ? `2px solid ${getSemanticColor("energy").primary}`
          : "none",
        animation: isCurrentUser ? "pulse 2s ease-in-out infinite" : "none",
      }}
    >
      {/* Rank */}
      <div className="w-8 text-center">
        <span
          className="text-lg font-bold"
          style={{ color: isDark ? "#fff" : "#1A1A1A" }}
        >
          {user.rank}
        </span>
      </div>

      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        }}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-lg">👤</span>
        )}
      </div>

      {/* Name & Stats */}
      <div className="flex-1">
        <p
          className="text-sm font-semibold"
          style={{ color: isDark ? "#fff" : "#1A1A1A" }}
        >
          {user.name} {isCurrentUser && "(YOU)"}
        </p>
        <div className="flex items-center gap-3 text-xs">
          <span
            style={{
              color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
            }}
          >
            {user.workoutCount} workouts
          </span>
          <span
            style={{
              color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
            }}
          >
            🔥 {user.streak} day streak
          </span>
        </div>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-1">
        {trendIcon}
        {rankChange !== 0 && (
          <span
            className="text-xs font-semibold"
            style={{
              color:
                rankChange > 0
                  ? getSemanticColor("success").primary
                  : getSemanticColor("critical").primary,
            }}
          >
            {Math.abs(rankChange)}
          </span>
        )}
      </div>
    </div>
  );
}

export default LeaderboardCard;
