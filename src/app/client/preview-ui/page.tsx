"use client";

/**
 * UI preview lab: updated celebration modals + Train hub accent patterns in one place.
 * For internal / QA use — not linked from production nav by default.
 */

import React, { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell, ClientGlassCard } from "@/components/client-ui";
import { Button } from "@/components/ui/button";
import {
  PRCelebrationModal,
  type PRDetectedPayload,
} from "@/components/client/workout-execution/ui/PRCelebrationModal";
import { AchievementUnlockModal } from "@/components/ui/AchievementUnlockModal";
import type { Achievement } from "@/components/ui/AchievementCard";
import { ActiveProgramCard } from "@/components/client/train/ActiveProgramCard";
import { WeekStrip } from "@/components/client/train/WeekStrip";
import type { ProgramWeekState, ProgramWeekDayCard } from "@/lib/programWeekStateBuilder";
import {
  ArrowLeft,
  ExternalLink,
  LayoutGrid,
  Palette,
  Trophy,
  Award,
  Zap,
} from "lucide-react";

const MOCK_DAYS: ProgramWeekDayCard[] = [
  {
    scheduleId: "pv-d0",
    dayNumber: 1,
    dayLabel: "Mon",
    dayOfWeek: 0,
    templateId: "pv-t1",
    workoutName: "Upper Push",
    estimatedDuration: 45,
    isCompleted: true,
  },
  {
    scheduleId: "pv-d1",
    dayNumber: 2,
    dayLabel: "Tue",
    dayOfWeek: 1,
    templateId: "pv-t2",
    workoutName: "Lower Strength",
    estimatedDuration: 50,
    isCompleted: true,
  },
  {
    scheduleId: "pv-d2",
    dayNumber: 3,
    dayLabel: "Wed",
    dayOfWeek: 2,
    templateId: "pv-t3",
    workoutName: "Leg Day",
    estimatedDuration: 55,
    isCompleted: false,
  },
  {
    scheduleId: "pv-d3",
    dayNumber: 4,
    dayLabel: "Thu",
    dayOfWeek: 3,
    templateId: "pv-t4",
    workoutName: "Conditioning",
    estimatedDuration: 40,
    isCompleted: false,
  },
  {
    scheduleId: "pv-d4",
    dayNumber: 5,
    dayLabel: "Fri",
    dayOfWeek: 4,
    templateId: "pv-t5",
    workoutName: "Full Body",
    estimatedDuration: 50,
    isCompleted: false,
  },
];

/** Wednesday = today in this mock */
const MOCK_TODAY_WEEKDAY = 2;

const MOCK_PROGRAM_WEEK: ProgramWeekState = {
  hasProgram: true,
  programName: "Preview — Strength Phase",
  programId: null,
  programAssignmentId: null,
  currentUnlockedWeek: 3,
  totalWeeks: 8,
  unlockedWeekMax: 3,
  isCompleted: false,
  days: MOCK_DAYS,
  todaySlot: MOCK_DAYS[2] ?? null,
  isRestDay: false,
  overdueSlots: [],
  completedCount: 2,
  totalSlots: 5,
  currentWeekNumber: 3,
  progressionMode: "auto",
  isWeekCompleteAwaitingReview: false,
  coachFeedback: null,
};

const EXERCISE_COUNTS = new Map<string, number>([
  ["pv-t3", 9],
]);

const SAMPLE_PRS: Record<string, PRDetectedPayload> = {
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
  olympian_tier: {
    type: "weight",
    exercise_name: "Back Squat",
    new_value: 200,
    previous_value: 190,
    unit: "kg",
    weight_kg: 200,
    reps: 3,
  },
};

const SAMPLE_ACHIEVEMENTS: Record<string, Achievement> = {
  rare: {
    id: "pv-a1",
    name: "PR Machine",
    description: "Set multiple personal records in a month.",
    icon: "💪",
    rarity: "rare",
    unlocked: true,
  },
  epic: {
    id: "pv-a2",
    name: "Volume Master",
    description: "Hit your volume goal for the week.",
    icon: "🏋️",
    rarity: "epic",
    unlocked: true,
  },
  legendary: {
    id: "pv-a3",
    name: "Iron Will",
    description: "Complete 100 workouts.",
    icon: "👑",
    rarity: "legendary",
    unlocked: true,
  },
};

export default function ClientUIPreviewPage() {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    MOCK_DAYS[2]?.scheduleId ?? null,
  );
  const [selectedRestWeekday, setSelectedRestWeekday] = useState<number | null>(null);

  const [showPR, setShowPR] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PRDetectedPayload>(
    SAMPLE_PRS.weight_with_prev,
  );
  const [prBodyKg, setPrBodyKg] = useState<number | null>(78);

  const [showAchievement, setShowAchievement] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement>(
    SAMPLE_ACHIEVEMENTS.rare,
  );

  const [sequenceOn, setSequenceOn] = useState(false);

  const handleDaySelect = useCallback(
    (day: ProgramWeekDayCard | null, weekday: number) => {
      setSelectedScheduleId(day?.scheduleId ?? null);
      setSelectedRestWeekday(day === null ? weekday : null);
    },
    [],
  );

  const runPRThenAchievement = useCallback(() => {
    setSequenceOn(true);
    setSelectedPR(SAMPLE_PRS.weight_with_prev);
    setShowPR(true);
  }, []);

  const onPRClose = useCallback(() => {
    setShowPR(false);
    if (sequenceOn) {
      setTimeout(() => {
        setSelectedAchievement(SAMPLE_ACHIEVEMENTS.epic);
        setShowAchievement(true);
      }, 350);
    }
  }, [sequenceOn]);

  const onAchievementClose = useCallback(() => {
    setShowAchievement(false);
    setSequenceOn(false);
  }, []);

  const previewNote = useMemo(
    () =>
      "Train (/client/train) got the biggest accent pass: active program card, week strip, and day preview. Below uses the same components with mock data.",
    [],
  );

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        <ClientPageShell className="max-w-lg px-4 pb-32 pt-6">
          <header className="mb-6 flex items-start justify-between gap-3">
            <div>
              <Link
                href="/client/me"
                className="inline-flex items-center gap-1 text-sm fc-text-dim hover:fc-text-primary mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <h1
                className="font-bold fc-text-primary flex items-center gap-2"
                style={{ fontSize: "var(--fc-type-h2)" }}
              >
                <LayoutGrid className="w-7 h-7 text-cyan-400" />
                UI preview lab
              </h1>
              <p className="text-sm fc-text-dim mt-1 max-w-md">{previewNote}</p>
            </div>
          </header>

          {/* Live pages (most accent work) */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold fc-text-primary uppercase tracking-wide">
                Open real screens
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/client/train">
                <Button
                  variant="fc-secondary"
                  className="w-full justify-between h-12 rounded-xl"
                >
                  <span className="font-semibold">Train hub</span>
                  <span className="text-xs fc-text-dim">Primary accent target</span>
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/client">
                  <Button variant="outline" className="w-full h-11 rounded-xl text-sm">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/client/nutrition">
                  <Button variant="outline" className="w-full h-11 rounded-xl text-sm">
                    Fuel
                  </Button>
                </Link>
              </div>
              <Link href="/client/test-celebrations">
                <Button variant="ghost" className="w-full text-sm fc-text-dim h-10">
                  Legacy celebration test page →
                </Button>
              </Link>
            </div>
          </section>

          {/* Train accent — real components, mock data */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold fc-text-primary uppercase tracking-wide">
                Train accents (mock data)
              </h2>
            </div>
            <p className="text-xs fc-text-dim mb-4">
              Same <code className="text-cyan-400/90">ActiveProgramCard</code> and{" "}
              <code className="text-cyan-400/90">WeekStrip</code> as production.
            </p>
            <ActiveProgramCard
              programWeek={MOCK_PROGRAM_WEEK}
              onStartWorkout={() => {}}
              isStarting={false}
              startingScheduleId={null}
              exerciseCounts={EXERCISE_COUNTS}
            />
            <WeekStrip
              days={MOCK_DAYS}
              todaySlot={MOCK_PROGRAM_WEEK.todaySlot}
              todayWeekday={MOCK_TODAY_WEEKDAY}
              onDaySelect={handleDaySelect}
              selectedScheduleId={selectedScheduleId}
              selectedRestWeekday={selectedRestWeekday}
            />
          </section>

          {/* PR modals */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold fc-text-primary uppercase tracking-wide">
                PR celebration modal
              </h2>
            </div>
            <ClientGlassCard className="p-4 mb-4 space-y-3">
              <p className="text-xs fc-text-dim">
                Body weight (kg) for tier math — uses{" "}
                <code className="text-cyan-400/90">getPRTier</code> with fallback when
                empty.
              </p>
              <label className="flex items-center gap-2 text-sm fc-text-primary">
                <span className="w-24 shrink-0">Body (kg)</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={prBodyKg ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPrBodyKg(v === "" ? null : Number(v));
                  }}
                  className="flex-1 min-h-10 px-3 rounded-lg border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-sunken)] fc-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0"
                  placeholder="e.g. 78 (empty = absolute tiers)"
                />
              </label>
            </ClientGlassCard>
            <div className="space-y-2">
              {Object.entries(SAMPLE_PRS).map(([key, pr]) => (
                <Button
                  key={key}
                  variant="outline"
                  className="w-full h-auto py-3 px-4 rounded-xl flex flex-col items-stretch text-left border-[color:var(--fc-glass-border)]"
                  onClick={() => {
                    setSelectedPR(pr);
                    setShowPR(true);
                  }}
                >
                  <span className="font-semibold fc-text-primary">{pr.exercise_name}</span>
                  <span className="text-xs fc-text-dim font-normal">
                    {key.replace(/_/g, " ")} ·{" "}
                    {pr.type === "weight"
                      ? `${pr.weight_kg} kg × ${pr.reps} reps`
                      : `${pr.reps} reps`}
                  </span>
                </Button>
              ))}
            </div>
            <Button
              variant="fc-primary"
              className="w-full mt-4 h-12 rounded-xl font-bold shadow-lg shadow-cyan-500/25"
              onClick={runPRThenAchievement}
            >
              <Zap className="w-4 h-4 mr-2" />
              Sequence: PR → Achievement (demo)
            </Button>
          </section>

          {/* Achievement modals */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold fc-text-primary uppercase tracking-wide">
                Achievement unlock modal
              </h2>
            </div>
            <div className="space-y-2">
              {Object.entries(SAMPLE_ACHIEVEMENTS).map(([key, ach]) => (
                <Button
                  key={key}
                  variant="outline"
                  className="w-full h-auto py-3 px-4 rounded-xl justify-start border-[color:var(--fc-glass-border)]"
                  onClick={() => {
                    setSelectedAchievement(ach);
                    setShowAchievement(true);
                  }}
                >
                  <span className="mr-2 text-lg">{ach.icon}</span>
                  <span className="font-semibold fc-text-primary">{ach.name}</span>
                  <span className="ml-auto text-xs capitalize fc-text-dim">{ach.rarity}</span>
                </Button>
              ))}
            </div>
          </section>
        </ClientPageShell>
      </AnimatedBackground>

      <PRCelebrationModal
        visible={showPR}
        onClose={sequenceOn ? onPRClose : () => setShowPR(false)}
        pr={selectedPR}
        bodyWeightKg={prBodyKg}
      />

      <AchievementUnlockModal
        achievement={selectedAchievement}
        visible={showAchievement}
        onClose={sequenceOn ? onAchievementClose : () => setShowAchievement(false)}
        onShare={() => {}}
      />
    </ProtectedRoute>
  );
}
