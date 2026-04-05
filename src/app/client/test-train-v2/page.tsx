"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell, ClientGlassCard } from "@/components/client-ui";
import {
  Play,
  Zap,
  Dumbbell,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Circle,
  Coffee,
  ArrowLeft,
  Plus,
  Activity,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getExerciseVisuals } from "@/lib/exerciseIconMap";

// ─── SAMPLE DATA (mirrors real train page structure) ───

const PROGRAM = {
  name: "Hypertrophy Phase II",
  blockName: "Accumulation",
  blockGoal: "hypertrophy",
  week: 3,
  totalWeeks: 8,
  completedThisWeek: 3,
  totalThisWeek: 5,
};

const GOAL_COLORS: Record<string, string> = {
  hypertrophy: "#06b6d4", strength: "#f97316", power: "#ef4444",
  peaking: "#a855f7", accumulation: "#3b82f6", conditioning: "#22c55e",
  deload: "#6b7280", general_fitness: "#14b8a6", sport_specific: "#eab308",
};

type SampleExercise = {
  name: string;
  sets: number;
  reps: string;
  category: string;
  primaryMuscleGroup: string | null;
};

type DayData = {
  scheduleId: string;
  dayOfWeek: number;
  workoutName: string;
  isCompleted: boolean;
  isToday: boolean;
  isMissed: boolean;
  exerciseCount: number;
  estimatedDuration: number;
  exercises?: SampleExercise[];
};

const DAYS: (DayData | null)[] = [
  { scheduleId: "s1", dayOfWeek: 0, workoutName: "Chest & Triceps", isCompleted: true, isToday: false, isMissed: false, exerciseCount: 6, estimatedDuration: 55, exercises: [
    { name: "Barbell Bench Press", sets: 4, reps: "8-10", category: "Strength", primaryMuscleGroup: "Chest" },
    { name: "Incline DB Press", sets: 3, reps: "10-12", category: "Strength", primaryMuscleGroup: "Chest" },
    { name: "Cable Flyes", sets: 3, reps: "12-15", category: "Strength", primaryMuscleGroup: "Chest" },
    { name: "Tricep Pushdown", sets: 3, reps: "10-12", category: "Strength", primaryMuscleGroup: "Triceps" },
    { name: "Overhead Tricep Extension", sets: 3, reps: "12-15", category: "Strength", primaryMuscleGroup: "Triceps" },
    { name: "Dips", sets: 3, reps: "AMRAP", category: "Strength", primaryMuscleGroup: "Chest" },
  ]},
  { scheduleId: "s2", dayOfWeek: 1, workoutName: "Back & Biceps", isCompleted: true, isToday: false, isMissed: false, exerciseCount: 7, estimatedDuration: 50, exercises: [
    { name: "Barbell Row", sets: 4, reps: "8-10", category: "Strength", primaryMuscleGroup: "Back" },
    { name: "Lat Pulldown", sets: 3, reps: "10-12", category: "Strength", primaryMuscleGroup: "Lats" },
    { name: "Seated Cable Row", sets: 3, reps: "10-12", category: "Strength", primaryMuscleGroup: "Back" },
    { name: "Face Pulls", sets: 3, reps: "15-20", category: "Strength", primaryMuscleGroup: "Shoulders" },
    { name: "Barbell Curl", sets: 3, reps: "10-12", category: "Strength", primaryMuscleGroup: "Biceps" },
    { name: "Hammer Curl", sets: 3, reps: "12-15", category: "Strength", primaryMuscleGroup: "Biceps" },
    { name: "Preacher Curl", sets: 2, reps: "12-15", category: "Strength", primaryMuscleGroup: "Biceps" },
  ]},
  null, // Wednesday rest
  { scheduleId: "s4", dayOfWeek: 3, workoutName: "Legs", isCompleted: false, isToday: true, isMissed: false, exerciseCount: 8, estimatedDuration: 60, exercises: [
    { name: "Barbell Back Squat", sets: 4, reps: "8-10", category: "Strength", primaryMuscleGroup: "Quads" },
    { name: "Romanian Deadlift", sets: 3, reps: "10-12", category: "Strength", primaryMuscleGroup: "Hamstrings" },
    { name: "Leg Press", sets: 3, reps: "12-15", category: "Strength", primaryMuscleGroup: "Quads" },
    { name: "Walking Lunges", sets: 3, reps: "12 each", category: "Strength", primaryMuscleGroup: "Glutes" },
    { name: "Leg Curl", sets: 3, reps: "10-12", category: "Strength", primaryMuscleGroup: "Hamstrings" },
    { name: "Leg Extension", sets: 3, reps: "12-15", category: "Strength", primaryMuscleGroup: "Quads" },
    { name: "Standing Calf Raise", sets: 4, reps: "15-20", category: "Strength", primaryMuscleGroup: "Calves" },
    { name: "Seated Calf Raise", sets: 3, reps: "15-20", category: "Strength", primaryMuscleGroup: "Calves" },
  ]},
  { scheduleId: "s5", dayOfWeek: 4, workoutName: "Shoulders", isCompleted: false, isToday: false, isMissed: false, exerciseCount: 6, estimatedDuration: 45, exercises: [
    { name: "OHP", sets: 4, reps: "6-8", category: "Strength", primaryMuscleGroup: "Shoulders" },
    { name: "Lateral Raise", sets: 4, reps: "12-15", category: "Strength", primaryMuscleGroup: "Shoulders" },
    { name: "Rear Delt Fly", sets: 3, reps: "15-20", category: "Strength", primaryMuscleGroup: "Shoulders" },
    { name: "Arnold Press", sets: 3, reps: "10-12", category: "Strength", primaryMuscleGroup: "Shoulders" },
    { name: "Upright Row", sets: 3, reps: "10-12", category: "Strength", primaryMuscleGroup: "Traps" },
    { name: "Shrugs", sets: 3, reps: "12-15", category: "Strength", primaryMuscleGroup: "Traps" },
  ]},
  null, // Saturday rest
  { scheduleId: "s7", dayOfWeek: 6, workoutName: "Arms & Abs", isCompleted: false, isToday: false, isMissed: false, exerciseCount: 7, estimatedDuration: 40, exercises: [
    { name: "Close-Grip Bench", sets: 3, reps: "8-10", category: "Strength", primaryMuscleGroup: "Triceps" },
    { name: "Barbell Curl", sets: 3, reps: "10-12", category: "Strength", primaryMuscleGroup: "Biceps" },
    { name: "Skull Crushers", sets: 3, reps: "10-12", category: "Strength", primaryMuscleGroup: "Triceps" },
    { name: "Cable Curl", sets: 3, reps: "12-15", category: "Strength", primaryMuscleGroup: "Biceps" },
    { name: "Cable Crunch", sets: 3, reps: "15-20", category: "Strength", primaryMuscleGroup: "Abs" },
    { name: "Hanging Leg Raise", sets: 3, reps: "12-15", category: "Strength", primaryMuscleGroup: "Abs" },
    { name: "Plank", sets: 3, reps: "60s", category: "Strength", primaryMuscleGroup: "Core" },
  ]},
];

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EXTRA_WORKOUTS = [
  { id: "ex1", name: "Quick HIIT Intervals", exerciseCount: 5, estimatedDuration: 20 },
  { id: "ex2", name: "Mobility Flow", exerciseCount: 8, estimatedDuration: 15 },
];

const ACTIVITIES = [
  { type: "running", icon: "🏃", label: "Morning Run", duration: 35 },
  { type: "swimming", icon: "🏊", label: "Swimming", duration: 45 },
];

const MOTIVATIONAL: Record<string, string> = {
  "Chest & Triceps": "Upper body push — let's build!",
  "Back & Biceps": "Pull day — sculpt that V-taper!",
  "Legs": "Leg day — time to build a foundation!",
  "Shoulders": "Boulder shoulders incoming!",
  "Arms & Abs": "Arm day — finish the week strong!",
};

export default function TestTrainV2Page() {
  const { isDark } = useTheme();
  const [selectedDay, setSelectedDay] = useState<number>(3);
  const [selectedRestWeekday, setSelectedRestWeekday] = useState<number | null>(null);

  const selected = selectedRestWeekday !== null ? null : DAYS[selectedDay];
  const todayDay = DAYS.find((d) => d?.isToday) || null;

  const completedDays = DAYS.filter((d) => d?.isCompleted).length;
  const totalDays = DAYS.filter((d) => d !== null).length;
  const completionPercent = Math.round((completedDays / totalDays) * 100);

  const nextWorkout = todayDay && !todayDay.isCompleted ? todayDay : DAYS.find((d) => d && !d.isCompleted) || null;

  const goalColor = GOAL_COLORS[PROGRAM.blockGoal] || "#06b6d4";

  const handleDaySelect = (idx: number) => {
    if (DAYS[idx] === null) {
      setSelectedDay(idx);
      setSelectedRestWeekday(idx);
    } else {
      setSelectedDay(idx);
      setSelectedRestWeekday(null);
    }
  };

  return (
    <AnimatedBackground>
      <ClientPageShell className="max-w-lg px-4 pb-32 pt-6">

        {/* ══════ SECTION 1: Page Header ══════ */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/client/train">
              <Button variant="ghost" size="icon" className="rounded-full -ml-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold fc-text-primary" style={{ fontSize: "var(--fc-type-h2)" }}>
                Training
              </h1>
              <p className="text-xs fc-text-dim">V2 Prototype — hybrid layout</p>
            </div>
          </div>
        </header>

        {/* ══════ SECTION 2: Active Program Card (glass + enhanced visuals) ══════ */}
        <ClientGlassCard className="p-6 mb-6 border-l-4 border-cyan-400 bg-cyan-600 text-white">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1 drop-shadow-sm">Today&apos;s Workout</h2>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${goalColor}20`,
                    color: goalColor,
                    border: `1px solid ${goalColor}40`,
                  }}
                >
                  {PROGRAM.blockGoal.charAt(0).toUpperCase() + PROGRAM.blockGoal.slice(1)}
                </span>
                <span className="text-xs text-white/80">{PROGRAM.blockName}</span>
              </div>
              <p className="text-sm text-white/80">
                Week {PROGRAM.week} of {PROGRAM.totalWeeks} · Day {completedDays + 1} of {totalDays}
              </p>
            </div>
          </div>

          {/* Progress: ring instead of flat bar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="23" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                <circle cx="28" cy="28" r="23" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${completionPercent * 1.445} 999`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">
                {completionPercent}%
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">{completedDays}/{totalDays} workouts done</p>
              <p className="text-xs text-white/60">This week&apos;s progress</p>
            </div>
          </div>

          {/* Next Up Section */}
          {nextWorkout ? (
            <>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚡</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-white/80">NEXT UP</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 drop-shadow-sm">{nextWorkout.workoutName}</h3>
                <p className="text-sm text-white/80">
                  {nextWorkout.exerciseCount} exercises · ~{nextWorkout.estimatedDuration} min
                </p>
              </div>

              <button className="w-full h-14 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 bg-[color:var(--fc-surface-card)] border border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-surface-sunken)]">
                <Play className="w-5 h-5 fill-current" />
                START WORKOUT →
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-base font-semibold text-white mb-1">Rest day</p>
              <p className="text-sm text-white/80">No workout scheduled for today</p>
            </div>
          )}
        </ClientGlassCard>

        {/* ══════ SECTION 3: Week Strip (color-coded enhancement) ══════ */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {DAYS.map((day, i) => {
              const isToday = day?.isToday ?? false;
              const isCompleted = day?.isCompleted ?? false;
              const isMissed = day?.isMissed ?? false;
              const isRest = day === null;
              const isSelected = (selectedRestWeekday !== null && selectedRestWeekday === i)
                || (selectedRestWeekday === null && selectedDay === i);

              return (
                <button
                  key={i}
                  onClick={() => handleDaySelect(i)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[60px] transition-opacity hover:opacity-80"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-offset-[var(--fc-bg-deep)]"
                        : ""
                    } ${
                      isSelected && isCompleted
                        ? "ring-emerald-500 dark:ring-emerald-400"
                        : isSelected && isToday
                        ? "ring-cyan-500 dark:ring-cyan-400"
                        : isSelected
                        ? "ring-blue-500 dark:ring-blue-400"
                        : ""
                    } ${
                      isCompleted
                        ? "border-emerald-500 dark:border-emerald-400 bg-[color-mix(in_srgb,#22c55e_12%,transparent)]"
                        : isToday && !isSelected
                        ? "border-cyan-500 dark:border-cyan-400 bg-[color-mix(in_srgb,#06b6d4_12%,transparent)]"
                        : isMissed
                        ? "border-amber-500 dark:border-amber-400 bg-[color-mix(in_srgb,#f59e0b_12%,transparent)]"
                        : "border-[var(--fc-glass-border)]"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    ) : isMissed ? (
                      <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-pulse" />
                    ) : isRest ? (
                      <Circle className="w-5 h-5 fc-text-dim" />
                    ) : isToday ? (
                      <Zap className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                    ) : (
                      <Circle className="w-5 h-5 fc-text-dim" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-[10px] font-semibold mb-0.5 ${
                      isToday ? "text-cyan-500 dark:text-cyan-400" : "fc-text-dim"
                    }`}>
                      {WEEKDAY_LABELS[i]}
                    </p>
                    <p className={`text-[9px] line-clamp-1 ${
                      isCompleted
                        ? "text-emerald-500 dark:text-emerald-400"
                        : isToday
                        ? "text-cyan-500 dark:text-cyan-400"
                        : "fc-text-subtle"
                    }`}>
                      {isRest ? "Rest" : day?.workoutName && day.workoutName.length > 10
                        ? day.workoutName.substring(0, 10) + "..."
                        : day?.workoutName}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════ SECTION 5: Workout Day Preview (glass card + icons) ══════ */}
        {selected && (
          <ClientGlassCard className="p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold fc-text-primary">{selected.workoutName}</h3>
                  {selected.isToday && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">Today</span>
                  )}
                  {selected.isCompleted && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Done</span>
                  )}
                </div>
                <p className="text-xs fc-text-dim">
                  {WEEKDAY_LABELS[selectedDay]}
                  {' · '}{selected.exerciseCount} exercises · ~{selected.estimatedDuration} min
                </p>
                {MOTIVATIONAL[selected.workoutName] && (
                  <p className="text-xs mt-1" style={{ color: goalColor }}>
                    {MOTIVATIONAL[selected.workoutName]}
                  </p>
                )}
              </div>
            </div>

            {/* Exercise list with deterministic Lucide icons */}
            {selected.exercises && (
              <div className="space-y-2 mb-4">
                {selected.exercises.map((ex, i) => {
                  const { Icon, color } = getExerciseVisuals({
                    category: ex.category,
                    primaryMuscleGroup: ex.primaryMuscleGroup,
                  });
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "var(--fc-surface-sunken)" }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}18` }}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold fc-text-primary truncate">{ex.name}</p>
                        <p className="text-xs fc-text-dim">{ex.sets} sets × {ex.reps}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CTA */}
            {!selected.isCompleted && (
              <button
                className={`w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  selected.isToday
                    ? "bg-cyan-600 text-white hover:bg-cyan-700"
                    : "fc-surface border border-[color:var(--fc-glass-border)] fc-text-primary hover:opacity-80"
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                {selected.isToday ? "START WORKOUT" : "Preview Workout"}
              </button>
            )}
          </ClientGlassCard>
        )}

        {/* Rest day preview */}
        {selectedRestWeekday !== null && (
          <ClientGlassCard className="p-6 mb-6 text-center">
            <Coffee className="w-8 h-8 mx-auto mb-3 fc-text-dim" />
            <h3 className="text-base font-bold fc-text-primary mb-1">
              {WEEKDAY_LABELS[selectedRestWeekday]} — Rest Day
            </h3>
            <p className="text-sm fc-text-dim">
              Recovery is when the magic happens. Stay hydrated, stretch, and come back stronger.
            </p>
          </ClientGlassCard>
        )}

        {/* ══════ SECTION 6: Activity Week Summary (glass card) ══════ */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 fc-text-dim" />
              <h3 className="text-sm font-bold fc-text-primary">Other Activities This Week</h3>
            </div>
            <button className="p-1.5 rounded-lg fc-surface border border-[color:var(--fc-glass-border)] hover:opacity-80 transition-opacity">
              <Plus className="w-3.5 h-3.5 fc-text-dim" />
            </button>
          </div>
          {ACTIVITIES.length > 0 ? (
            <ClientGlassCard className="p-3">
              <div className="flex items-center gap-4 mb-2 pb-2 border-b border-[color:var(--fc-glass-border)]">
                <span className="text-xs fc-text-dim flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />{ACTIVITIES.length} activities
                </span>
                <span className="text-xs fc-text-dim flex items-center gap-1">
                  <Clock className="w-3 h-3" />{ACTIVITIES.reduce((s, a) => s + a.duration, 0)} min
                </span>
              </div>
              <div className="space-y-1.5">
                {ACTIVITIES.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1">
                    <span className="text-base shrink-0">{a.icon}</span>
                    <span className="text-sm font-medium fc-text-primary flex-1 truncate">{a.label}</span>
                    <span className="text-xs fc-text-dim shrink-0">{a.duration} min</span>
                  </div>
                ))}
              </div>
            </ClientGlassCard>
          ) : (
            <button className="w-full text-left rounded-xl p-4 fc-surface border border-dashed border-[color:var(--fc-glass-border)] hover:opacity-80 transition-opacity">
              <p className="text-sm fc-text-dim text-center">Log a run, swim, or other activity</p>
            </button>
          )}
        </div>

        {/* ══════ SECTION 7: Extra Training → Compact Quick Action Grid ══════ */}
        {EXTRA_WORKOUTS.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold fc-text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500 dark:text-orange-400" />
              Extra Training
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {EXTRA_WORKOUTS.map((w) => (
                <ClientGlassCard key={w.id} className="p-4 cursor-pointer hover:opacity-80 transition-all">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: "color-mix(in srgb, var(--fc-domain-workouts) 12%, transparent)" }}
                  >
                    <Dumbbell className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                  </div>
                  <p className="text-sm font-bold fc-text-primary mb-0.5 truncate">{w.name}</p>
                  <p className="text-xs fc-text-dim">
                    {w.exerciseCount} exercises · ~{w.estimatedDuration} min
                  </p>
                </ClientGlassCard>
              ))}
            </div>
          </div>
        )}

      </ClientPageShell>
    </AnimatedBackground>
  );
}
