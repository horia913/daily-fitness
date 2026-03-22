"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { PRCelebrationModal } from "@/components/client/workout-execution/ui/PRCelebrationModal";
import type { PRDetectedPayload } from "@/components/client/workout-execution/ui/PRCelebrationModal";
import { AchievementUnlockModal } from "@/components/ui/AchievementUnlockModal";
import { AchievementCard } from "@/components/ui/AchievementCard";
import type { Achievement, AchievementRarity } from "@/components/ui/AchievementCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Award, Sparkles, Zap, Star, Flame } from "lucide-react";
import Link from "next/link";

// ─── Sample PR Data ───

const samplePRs: Record<string, PRDetectedPayload> = {
  weight_with_prev: {
    type: "weight",
    exercise_name: "Barbell Bench Press",
    new_value: 120,
    previous_value: 110,
    unit: "kg",
    weight_kg: 120,
    reps: 10,
  },
  weight_first: {
    type: "weight",
    exercise_name: "Deadlift",
    new_value: 180,
    previous_value: null,
    unit: "kg",
    weight_kg: 180,
    reps: 5,
  },
  reps_with_prev: {
    type: "reps",
    exercise_name: "Pull-Ups",
    new_value: 15,
    previous_value: 12,
    unit: "reps",
    weight_kg: 0,
    reps: 15,
  },
  reps_first: {
    type: "reps",
    exercise_name: "Pistol Squat",
    new_value: 8,
    previous_value: null,
    unit: "reps",
    weight_kg: 0,
    reps: 8,
  },
  big_improvement: {
    type: "weight",
    exercise_name: "Overhead Press",
    new_value: 80,
    previous_value: 60,
    unit: "kg",
    weight_kg: 80,
    reps: 6,
  },
};

// ─── Sample Achievement Data ───

const sampleAchievements: Record<string, Achievement> = {
  common_bronze: {
    id: "a1",
    name: "First Steps",
    description: "Complete your first workout. (Next: Regular — 5/10)",
    icon: "🏃",
    rarity: "common",
    unlocked: true,
  },
  uncommon_silver: {
    id: "a2",
    name: "Consistency King",
    description: "Maintain a workout streak. (Next: Gold — 18/30)",
    icon: "🔥",
    rarity: "uncommon",
    unlocked: true,
  },
  rare_gold: {
    id: "a3",
    name: "PR Machine",
    description: "Set multiple personal records.",
    icon: "💪",
    rarity: "rare",
    unlocked: true,
  },
  epic_platinum: {
    id: "a4",
    name: "Volume Master",
    description: "Lift an incredible total volume.",
    icon: "🏋️",
    rarity: "epic",
    unlocked: true,
  },
  legendary: {
    id: "a5",
    name: "Body Transformer",
    description: "Complete a full body transformation program.",
    icon: "⚡",
    rarity: "legendary",
    unlocked: true,
  },
};

// ─── Sample Achievement Cards (all states) ───

const cardSamples: Achievement[] = [
  {
    id: "c1",
    name: "Workout Warrior",
    description: "Complete workouts to earn all tiers",
    icon: "⚔️",
    rarity: "epic",
    unlocked: true,
    isMastered: true,
    unlockedTiers: ["bronze", "silver", "gold", "platinum"],
    requirement: "All tiers complete!",
    progress: 100,
  },
  {
    id: "c2",
    name: "Iron Lifter",
    description: "Lift heavy to progress through tiers (Next: Gold at 50)",
    icon: "🏋️",
    rarity: "rare",
    unlocked: true,
    isMastered: false,
    unlockedTiers: ["bronze", "silver"],
    requirement: "35/50 for Gold",
    progress: 70,
  },
  {
    id: "c3",
    name: "Streak Starter",
    description: "Build a workout streak",
    icon: "🔥",
    rarity: "uncommon",
    unlocked: false,
    isMastered: false,
    unlockedTiers: [],
    requirement: "3/5 for Bronze",
    progress: 60,
  },
  {
    id: "c4",
    name: "Almost There!",
    description: "Near-miss example at 85%",
    icon: "🎯",
    rarity: "rare",
    unlocked: false,
    isMastered: false,
    unlockedTiers: [],
    requirement: "17/20 for Bronze",
    progress: 85,
    nearMiss: true,
  },
  {
    id: "c5",
    name: "Mystery Challenge",
    description: "Complete a mystery challenge",
    icon: "❓",
    rarity: "legendary",
    unlocked: false,
    isMastered: false,
    progress: undefined,
    requirement: "Complete 100 workouts",
  },
];

export default function TestCelebrationsPage() {
  const { isDark } = useTheme();
  const [showPR, setShowPR] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PRDetectedPayload>(samplePRs.weight_with_prev);
  const [showAchievement, setShowAchievement] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement>(sampleAchievements.common_bronze);
  const [sequenceRunning, setSequenceRunning] = useState(false);

  const runSequence = () => {
    setSequenceRunning(true);
    setShowPR(true);
  };

  const handlePRCloseInSequence = () => {
    setShowPR(false);
    if (sequenceRunning) {
      setTimeout(() => {
        setShowAchievement(true);
      }, 300);
    }
  };

  const handleAchievementCloseInSequence = () => {
    setShowAchievement(false);
    setSequenceRunning(false);
  };

  const bg = isDark ? "#0a0a0a" : "#f5f5f5";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const textPrimary = isDark ? "#fff" : "#1a1a1a";
  const textDim = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <div className="min-h-screen pb-24" style={{ background: bg }}>
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 py-3 backdrop-blur-xl" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/client/progress">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold" style={{ color: textPrimary }}>Celebration Test Lab</h1>
            <p className="text-xs" style={{ color: textDim }}>Preview PR & Achievement modals without completing workouts</p>
            <Link href="/client/preview-ui" className="text-xs font-medium text-cyan-500 hover:text-cyan-400 mt-1 inline-block">
              Open full UI preview lab (modals + Train accents) →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* ─── SECTION: PR CELEBRATION MODAL ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5" style={{ color: "#FFD700" }} />
            <h2 className="text-base font-bold" style={{ color: textPrimary }}>PR Celebration Modal</h2>
          </div>

          <div className="space-y-3">
            {Object.entries(samplePRs).map(([key, pr]) => (
              <button
                key={key}
                onClick={() => { setSelectedPR(pr); setShowPR(true); }}
                className="w-full text-left px-4 py-3 rounded-xl flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: cardBg, border: `1px solid ${border}` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)" }}>
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{pr.exercise_name}</p>
                    <p className="text-xs" style={{ color: textDim }}>
                      {pr.type === "weight" ? `${pr.new_value} ${pr.unit}` : `${pr.new_value} reps`}
                      {pr.previous_value != null ? ` (prev: ${pr.previous_value})` : " (first PR)"}
                    </p>
                  </div>
                </div>
                <Zap className="w-4 h-4 flex-shrink-0" style={{ color: "#FFD700" }} />
              </button>
            ))}
          </div>
        </section>

        {/* ─── SECTION: ACHIEVEMENT UNLOCK MODAL ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5" style={{ color: "#9B59B6" }} />
            <h2 className="text-base font-bold" style={{ color: textPrimary }}>Achievement Unlock Modal</h2>
          </div>

          <div className="space-y-3">
            {Object.entries(sampleAchievements).map(([key, ach]) => {
              const rarityGradients: Record<string, string> = {
                common: "linear-gradient(135deg, #CD7F32, #8B4513)",
                uncommon: "linear-gradient(135deg, #C0C0C0, #808080)",
                rare: "linear-gradient(135deg, #FFD700, #FFA500)",
                epic: "linear-gradient(135deg, #9B59B6, #6C3483)",
                legendary: "linear-gradient(135deg, #E74C3C, #9B59B6)",
              };
              return (
                <button
                  key={key}
                  onClick={() => { setSelectedAchievement(ach); setShowAchievement(true); }}
                  className="w-full text-left px-4 py-3 rounded-xl flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: cardBg, border: `1px solid ${border}` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: rarityGradients[ach.rarity] || rarityGradients.common }}>
                      <span className="text-xl">{ach.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{ach.name}</p>
                      <p className="text-xs capitalize" style={{ color: textDim }}>{ach.rarity} rarity</p>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: "#9B59B6" }} />
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── SECTION: SEQUENCED TEST (PR → Achievement) ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5" style={{ color: "#FF6B35" }} />
            <h2 className="text-base font-bold" style={{ color: textPrimary }}>Sequenced Queue Test</h2>
          </div>
          <p className="text-sm mb-3" style={{ color: textDim }}>
            Simulates a set that triggers both a PR and an achievement. PR modal shows first, then the achievement modal after a 300ms gap.
          </p>
          <Button
            variant="energy"
            size="lg"
            className="w-full font-bold"
            onClick={runSequence}
            disabled={sequenceRunning}
          >
            <Zap className="w-4 h-4 mr-2" />
            {sequenceRunning ? "Sequence Playing..." : "Run PR → Achievement Sequence"}
          </Button>
        </section>

        {/* ─── SECTION: ACHIEVEMENT CARDS (All States) ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5" style={{ color: "#FFD700" }} />
            <h2 className="text-base font-bold" style={{ color: textPrimary }}>Achievement Card States</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: textDim }}>
            All 5 visual states: Mastered, Partially Unlocked, In-Progress, Near-Miss, and Locked.
          </p>
          <div className="space-y-3">
            {cardSamples.map((card, i) => {
              const stateLabels = ["Mastered (All Tiers)", "Partially Unlocked (2/4 Tiers)", "In-Progress (No Tiers Yet)", "Near-Miss (85% to Bronze)", "Locked (0 Progress)"];
              return (
                <div key={card.id}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textDim }}>
                    {stateLabels[i]}
                  </p>
                  <AchievementCard achievement={card} />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ─── MODALS ─── */}
      <PRCelebrationModal
        visible={showPR}
        onClose={sequenceRunning ? handlePRCloseInSequence : () => setShowPR(false)}
        pr={selectedPR}
        bodyWeightKg={78}
      />

      <AchievementUnlockModal
        achievement={selectedAchievement}
        visible={showAchievement}
        onClose={sequenceRunning ? handleAchievementCloseInSequence : () => setShowAchievement(false)}
        onShare={() => alert("Share clicked — would open share sheet in production")}
      />
    </div>
  );
}
