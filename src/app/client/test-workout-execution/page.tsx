"use client";

import React, { useCallback, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell } from "@/components/client-ui/ClientPageShell";
import { Button } from "@/components/ui/button";
import { StraightSetExecutor } from "@/components/client/workout-execution/blocks/StraightSetExecutor";
import { SupersetExecutor } from "@/components/client/workout-execution/blocks/SupersetExecutor";
import { GiantSetExecutor } from "@/components/client/workout-execution/blocks/GiantSetExecutor";
import { DropSetExecutor } from "@/components/client/workout-execution/blocks/DropSetExecutor";
import { ClusterSetExecutor } from "@/components/client/workout-execution/blocks/ClusterSetExecutor";
import { RestPauseExecutor } from "@/components/client/workout-execution/blocks/RestPauseExecutor";
import { PreExhaustionExecutor } from "@/components/client/workout-execution/blocks/PreExhaustionExecutor";
import { AmrapExecutor } from "@/components/client/workout-execution/blocks/AmrapExecutor";
import { EmomExecutor } from "@/components/client/workout-execution/blocks/EmomExecutor";
import { TabataExecutor } from "@/components/client/workout-execution/blocks/TabataExecutor";
import { ForTimeExecutor } from "@/components/client/workout-execution/blocks/ForTimeExecutor";
import { SpeedWorkExecutor } from "@/components/client/workout-execution/blocks/SpeedWorkExecutor";
import { EnduranceExecutor } from "@/components/client/workout-execution/blocks/EnduranceExecutor";
import type { LiveWorkoutBlock } from "@/types/workoutBlocks";
import type { LastSessionSetRow } from "@/lib/clientProgressionService";
import ClientExerciseAlternativesModal from "@/components/client/workout-execution/ui/ClientExerciseAlternativesModal";
import type { ExerciseAlternative } from "@/lib/workoutTemplateService";

const nowIso = new Date().toISOString();
const lastWeekIso = new Date(Date.now() - 7 * 86400000).toISOString();

/** Stable mock rows for the alternatives modal (bypasses API via `demoAlternatives`). */
const DEMO_ALTERNATIVES: ExerciseAlternative[] = [
  {
    id: "demo-alt-1",
    primary_exercise_id: "bench",
    alternative_exercise_id: "mock-smith",
    reason: "equipment",
    notes: "Use when all free benches are taken.",
    created_at: nowIso,
    alternative_exercise: {
      id: "mock-smith",
      name: "Smith Machine Bench Press",
      created_at: nowIso,
      updated_at: nowIso,
    },
  },
  {
    id: "demo-alt-2",
    primary_exercise_id: "bench",
    alternative_exercise_id: "mock-incline-db",
    reason: "difficulty",
    notes: "Lighter load, easier shoulder angle.",
    created_at: nowIso,
    alternative_exercise: {
      id: "mock-incline-db",
      name: "Incline Dumbbell Press",
      created_at: nowIso,
      updated_at: nowIso,
    },
  },
  {
    id: "demo-alt-3",
    primary_exercise_id: "bench",
    alternative_exercise_id: "mock-floor",
    reason: "injury",
    notes: "Reduced shoulder ROM; coach-approved.",
    created_at: nowIso,
    alternative_exercise: {
      id: "mock-floor",
      name: "Barbell Floor Press",
      created_at: nowIso,
      updated_at: nowIso,
    },
  },
  {
    id: "demo-alt-4",
    primary_exercise_id: "bench",
    alternative_exercise_id: "mock-pushup",
    reason: "preference",
    notes: "Bodyweight option for finishers.",
    created_at: nowIso,
    alternative_exercise: {
      id: "mock-pushup",
      name: "Push-Up",
      created_at: nowIso,
      updated_at: nowIso,
    },
  },
];

/** Matches `previousPerformanceMap` / `lastWorkout` shape used by executors + LastSessionSetsSection. */
type PreviousPerfEntry = {
  lastWorkout: {
    weight: number | null;
    reps: number | null;
    sets: number;
    avgRpe: number | null;
    date: string;
    workout_log_id?: string;
    setDetails?: LastSessionSetRow[];
  } | null;
  personalBest: {
    maxWeight: number | null;
    maxReps: number | null;
    date: string;
  } | null;
};

function perf(
  last: NonNullable<PreviousPerfEntry["lastWorkout"]>,
): PreviousPerfEntry {
  return { lastWorkout: last, personalBest: null };
}

function ex(
  id: string,
  name: string,
  extra: Record<string, unknown> = {},
  formCues?: string,
) {
  return {
    id: `${id}-entry`,
    set_entry_id: "mock-set-entry",
    exercise_id: id,
    exercise_order: 1,
    exercise: {
      id,
      name,
      /** Demo URL so video + alternatives buttons render on this test page. */
      video_url: "https://www.youtube.com/watch?v=2wt3DMtcKzE",
      ...(formCues ? { instructions: formCues } : {}),
      created_at: nowIso,
      updated_at: nowIso,
    },
    created_at: nowIso,
    updated_at: nowIso,
    ...extra,
  };
}

function makeBlock(
  id: string,
  setType: LiveWorkoutBlock["block"]["set_type"],
  /** Test fixtures: allow partial nested rows (e.g. time_protocols) without DB-shaped fields. */
  data: object,
  completedSets = 0
): LiveWorkoutBlock {
  const patch = data as Partial<LiveWorkoutBlock["block"]>;
  return {
    block: {
      id,
      template_id: "mock-template",
      set_type: setType,
      set_order: 1,
      created_at: nowIso,
      updated_at: nowIso,
      ...patch,
    } as LiveWorkoutBlock["block"],
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    isCompleted: false,
    completedSets,
    totalSets: patch.total_sets ?? 1,
  };
}

const noopAsync = async () => ({ success: true, set_log_id: "mock-log-id" });
const noop = () => {};
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function section(title: string, child: React.ReactNode) {
  return (
    <section className="border-t border-white/10 pt-6">
      <h2 className="mb-4 text-sm font-bold tracking-wider fc-text-primary">{title}</h2>
      {child}
    </section>
  );
}

export default function TestWorkoutExecutionPage() {
  const [alternativesModalOpen, setAlternativesModalOpen] = useState(false);
  const [alternativesExercise, setAlternativesExercise] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [lastAlternativePick, setLastAlternativePick] = useState<string | null>(
    null,
  );

  const openAlternativesDemo = useCallback((id: string, name: string) => {
    setAlternativesExercise({ id, name });
    setAlternativesModalOpen(true);
  }, []);

  const closeAlternativesDemo = useCallback(() => {
    setAlternativesModalOpen(false);
    setAlternativesExercise(null);
  }, []);

  const straight = makeBlock(
    "straight",
    "straight_set",
    {
      total_sets: 4,
      reps_per_set: "8",
      rest_seconds: 90,
      set_notes:
        "Focus on pause at chest. Explosive concentric. Keep shoulder blades retracted throughout the set.",
      exercises: [
        ex(
          "bench",
          "Barbell Bench Press",
          { reps: "8", sets: 4 },
          "Feet flat on the floor. Drive with your legs. Tuck elbows at 45°.",
        ),
      ],
    },
    1
  );
  const superset = makeBlock("superset", "superset", {
    total_sets: 3,
    rest_seconds: 90,
    set_notes:
      "No rest between exercises. Rest only after completing both. Match tempo on both movements.",
    exercises: [
      ex("bench2", "Barbell Bench Press", { reps: "8-10", exercise_letter: "A" }),
      ex("row", "Barbell Row", { reps: "8-10", exercise_letter: "B", exercise_order: 2 }),
    ],
  });
  const giant = makeBlock("giant", "giant_set", {
    total_sets: 3,
    rest_seconds: 120,
    set_notes:
      "Treat this as one continuous set. No rest between exercises within a round.",
    exercises: [
      ex(
        "squat",
        "Back Squat",
        { reps: "10" },
        "Keep the core braced throughout all 4 movements.",
      ),
      ex("lunge", "Walking Lunge", { reps: "12/leg", exercise_order: 2 }),
      ex("stepup", "Step-Up", { reps: "10/leg", exercise_order: 3 }),
      ex("calf", "Standing Calf Raise", { reps: "20", exercise_order: 4 }),
    ],
  });
  const drop = makeBlock("drop", "drop_set", {
    total_sets: 1,
    rest_seconds: 90,
    set_notes:
      "Reach failure on the initial set, then immediately reduce weight by 20% and continue to failure. Repeat for up to 5 drops.",
    exercises: [ex("legpress", "Leg Press", { reps: "12" })],
  });
  const cluster = makeBlock("cluster", "cluster_set", {
    total_sets: 5,
    rest_seconds: 120,
    set_notes:
      "15 seconds rest between clusters. Reset your setup completely between each cluster. Quality over quantity.",
    exercises: [
      ex("deadlift", "Deadlift", {
        reps: "3",
        clusters_per_set: 5,
        reps_per_cluster: 3,
        intra_cluster_rest: 15,
      }, "Bar over mid-foot. Lats engaged before pulling."),
    ],
  });
  const restPause = makeBlock("restpause", "rest_pause", {
    total_sets: 1,
    set_notes:
      "Initial set to failure. 20s rest, then max reps again. Up to 2 rest-pauses per set.",
    exercises: [
      ex("inclinedb", "Incline Dumbbell Press", {
        reps: "15",
        rest_pause_sets: [{ rest_pause_duration: 20, max_rest_pauses: 2 }],
      }),
    ],
  });
  const preExhaust = makeBlock("pre", "pre_exhaustion", {
    total_sets: 3,
    rest_seconds: 20,
    set_notes:
      "Isolation first to fatigue the quads, then immediately into the compound. No rest between the two movements.",
    exercises: [
      ex("legext", "Leg Extension", { reps: "12", exercise_letter: "A" }),
      ex("squat2", "Back Squat", { reps: "8", exercise_order: 2, exercise_letter: "B" }),
    ],
  });
  const amrap = makeBlock("amrap", "amrap", {
    set_notes:
      "As many reps as possible in 5 minutes. Track every rep. Short rests are fine but the clock doesn't stop.",
    exercises: [ex("pushup", "Push-Up")],
    time_protocols: [{ protocol_type: "amrap", total_duration_minutes: 5 }],
  });
  const emom = makeBlock("emom", "emom", {
    set_notes:
      "15 reps at the top of every minute. Use remaining time to rest. If you can't hit 15, reduce the weight.",
    exercises: [ex("kbswing", "Kettlebell Swing")],
    time_protocols: [
      { protocol_type: "emom", total_duration_minutes: 10, target_reps: 15, emom_mode: "target_reps" },
    ],
  });
  const tabata = makeBlock("tabata", "tabata", {
    total_sets: 8,
    set_notes:
      "20 seconds maximum effort, 10 seconds rest. 8 rounds. Count your reps in the first and last round to track decline.",
    exercises: [ex("burpee", "Burpee")],
    time_protocols: [{ protocol_type: "tabata", set: 1, exercise_id: "burpee", work_seconds: 20, rest_seconds: 10, rounds: 8 }],
  });
  const forTime = makeBlock("fortime", "for_time", {
    set_notes:
      "21-15-9 rep scheme. Complete as fast as possible while maintaining form. 18 minute cap.",
    exercises: [
      ex("thruster", "Thruster"),
      ex(
        "pullup",
        "Pull-Up",
        { exercise_order: 2 },
        "Break up the pull-ups early to avoid grip failure.",
      ),
    ],
    set_name: "21-15-9 Thrusters + Pull-Ups",
    time_protocols: [{ protocol_type: "for_time", target_reps: 45, time_cap_minutes: 18 }],
  });
  const speed = makeBlock("speed", "speed_work", {
    set_notes:
      "Maximum effort on every interval. Full recovery between reps — the goal is speed, not conditioning.",
    exercises: [
      ex(
        "sled",
        "Sled Acceleration",
        {},
        "Drive angle low. Don't stand up too early.",
      ),
    ],
    speed_sets: [{ exercise_id: "sled", intervals: 6, distance_meters: 50, target_speed_pct: 100, rest_seconds: 90 }],
  });
  const endurance = makeBlock("endurance", "endurance", {
    set_notes:
      "Stay in Zone 3. If your heart rate drifts above, slow down. Conversational pace, not a race.",
    exercises: [ex("run", "Long Run")],
    endurance_sets: [{ exercise_id: "run", target_distance_meters: 5000, target_pace_seconds_per_km: 360, hr_zone: 3 }],
  });

  /** Matches executor weight pipeline: sticky session map → getWeightDefaultAndSuggestion default_weight */
  const lastPerformedWeightByExerciseId: Record<string, number> = {
    bench: 100,
    bench2: 80,
    row: 70,
    squat: 100,
    lunge: 40,
    stepup: 30,
    calf: 50,
    legpress: 100,
    deadlift: 140,
    inclinedb: 22.5,
    legext: 35,
    squat2: 120,
    pushup: 20,
    kbswing: 24,
    burpee: 20,
    thruster: 42.5,
    pullup: 10,
  };

  const previousPerformanceMap = new Map<string, PreviousPerfEntry>([
    [
      "bench",
      perf({
        weight: 80,
        reps: 8,
        sets: 4,
        avgRpe: 7.5,
        date: lastWeekIso,
        workout_log_id: "mock-wl-bench",
        setDetails: [
          { set_number: 1, weight_kg: 80, reps_completed: 8, rpe: 7 },
          { set_number: 2, weight_kg: 80, reps_completed: 8, rpe: 8 },
          { set_number: 3, weight_kg: 80, reps_completed: 8, rpe: 8 },
          { set_number: 4, weight_kg: 80, reps_completed: 8, rpe: 7 },
        ],
      }),
    ],
    [
      "bench2",
      perf({
        weight: 80,
        reps: 10,
        sets: 3,
        avgRpe: 8,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 80, reps_completed: 10, rpe: 8 },
          { set_number: 2, weight_kg: 80, reps_completed: 10, rpe: 8 },
          { set_number: 3, weight_kg: 80, reps_completed: 9, rpe: 9 },
        ],
      }),
    ],
    [
      "row",
      perf({
        weight: 70,
        reps: 10,
        sets: 3,
        avgRpe: 7,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 70, reps_completed: 10, rpe: 7 },
          { set_number: 2, weight_kg: 70, reps_completed: 10, rpe: 7 },
          { set_number: 3, weight_kg: 70, reps_completed: 10, rpe: 8 },
        ],
      }),
    ],
    [
      "squat",
      perf({
        weight: 100,
        reps: 10,
        sets: 3,
        avgRpe: 8,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 100, reps_completed: 10, rpe: 8 },
          { set_number: 2, weight_kg: 100, reps_completed: 10, rpe: 8 },
          { set_number: 3, weight_kg: 100, reps_completed: 10, rpe: 9 },
        ],
      }),
    ],
    [
      "lunge",
      perf({
        weight: 40,
        reps: 12,
        sets: 3,
        avgRpe: 7,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 40, reps_completed: 12, rpe: 7 },
          { set_number: 2, weight_kg: 40, reps_completed: 12, rpe: 7 },
          { set_number: 3, weight_kg: 40, reps_completed: 12, rpe: 8 },
        ],
      }),
    ],
    [
      "stepup",
      perf({
        weight: 30,
        reps: 10,
        sets: 3,
        avgRpe: 7,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 30, reps_completed: 10, rpe: 7 },
          { set_number: 2, weight_kg: 30, reps_completed: 10, rpe: 7 },
          { set_number: 3, weight_kg: 30, reps_completed: 10, rpe: 8 },
        ],
      }),
    ],
    [
      "calf",
      perf({
        weight: 50,
        reps: 20,
        sets: 3,
        avgRpe: 6,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 50, reps_completed: 20, rpe: 6 },
          { set_number: 2, weight_kg: 50, reps_completed: 20, rpe: 6 },
          { set_number: 3, weight_kg: 50, reps_completed: 20, rpe: 7 },
        ],
      }),
    ],
    [
      "legpress",
      perf({
        weight: 100,
        reps: 12,
        sets: 1,
        avgRpe: 9,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 100, reps_completed: 12, rpe: 9 },
          { set_number: 2, weight_kg: 80, reps_completed: 10, rpe: 10 },
          { set_number: 3, weight_kg: 60, reps_completed: 8, rpe: 10 },
          { set_number: 4, weight_kg: 40, reps_completed: 6, rpe: null },
        ],
      }),
    ],
    [
      "deadlift",
      perf({
        weight: 140,
        reps: 3,
        sets: 5,
        avgRpe: 8,
        date: lastWeekIso,
        setDetails: [1, 2, 3, 4, 5].map((n) => ({
          set_number: n,
          weight_kg: 140,
          reps_completed: 3,
          rpe: 8,
        })),
      }),
    ],
    [
      "inclinedb",
      perf({
        weight: 22.5,
        reps: 15,
        sets: 1,
        avgRpe: 9,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 22.5, reps_completed: 15, rpe: 9 },
          { set_number: 2, weight_kg: 22.5, reps_completed: 8, rpe: 10 },
          { set_number: 3, weight_kg: 22.5, reps_completed: 5, rpe: 10 },
        ],
      }),
    ],
    [
      "legext",
      perf({
        weight: 35,
        reps: 12,
        sets: 3,
        avgRpe: 8,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 35, reps_completed: 12, rpe: 8 },
          { set_number: 2, weight_kg: 35, reps_completed: 12, rpe: 8 },
          { set_number: 3, weight_kg: 35, reps_completed: 11, rpe: 9 },
        ],
      }),
    ],
    [
      "squat2",
      perf({
        weight: 120,
        reps: 8,
        sets: 3,
        avgRpe: 8,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 120, reps_completed: 8, rpe: 8 },
          { set_number: 2, weight_kg: 120, reps_completed: 8, rpe: 8 },
          { set_number: 3, weight_kg: 120, reps_completed: 8, rpe: 9 },
        ],
      }),
    ],
    [
      "pushup",
      perf({
        weight: 20,
        reps: 72,
        sets: 1,
        avgRpe: null,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 20, reps_completed: 72, rpe: null },
        ],
      }),
    ],
    [
      "kbswing",
      perf({
        weight: 24,
        reps: 15,
        sets: 10,
        avgRpe: null,
        date: lastWeekIso,
        setDetails: Array.from({ length: 10 }, (_, i) => ({
          set_number: i + 1,
          weight_kg: 24,
          reps_completed: 15,
          rpe: null,
        })),
      }),
    ],
    [
      "burpee",
      perf({
        weight: null,
        reps: 11,
        sets: 8,
        avgRpe: null,
        date: lastWeekIso,
        setDetails: [12, 11, 11, 10, 10, 9, 9, 8].map((reps, i) => ({
          set_number: i + 1,
          weight_kg: null,
          reps_completed: reps,
          rpe: null,
        })),
      }),
    ],
    [
      "thruster",
      perf({
        weight: 42.5,
        reps: 21,
        sets: 3,
        avgRpe: null,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 42.5, reps_completed: 21, rpe: null },
          { set_number: 2, weight_kg: 42.5, reps_completed: 15, rpe: null },
          { set_number: 3, weight_kg: 42.5, reps_completed: 9, rpe: null },
        ],
      }),
    ],
    [
      "pullup",
      perf({
        weight: 10,
        reps: 21,
        sets: 3,
        avgRpe: null,
        date: lastWeekIso,
        setDetails: [
          { set_number: 1, weight_kg: 10, reps_completed: 21, rpe: null },
          { set_number: 2, weight_kg: 10, reps_completed: 15, rpe: null },
          { set_number: 3, weight_kg: 10, reps_completed: 9, rpe: null },
        ],
      }),
    ],
    [
      "sled",
      perf({
        weight: 80,
        reps: 1,
        sets: 6,
        avgRpe: null,
        date: lastWeekIso,
        setDetails: Array.from({ length: 6 }, (_, i) => ({
          set_number: i + 1,
          weight_kg: 80,
          reps_completed: 1,
          rpe: null,
          actual_time_seconds: 12 + i,
        })),
      }),
    ],
    [
      "run",
      perf({
        weight: null,
        reps: 5000,
        sets: 1,
        avgRpe: null,
        date: lastWeekIso,
      }),
    ],
  ]);

  const baseProps = {
    onBlockComplete: noop,
    onNextBlock: noop,
    logSetToDatabase: noopAsync,
    formatTime,
    calculateSuggestedWeight: () => null,
    lastPerformedWeightByExerciseId,
    previousPerformanceMap,
    onVideoClick: (url: string, _title?: string) => {
      if (typeof window !== "undefined" && url)
        window.open(url, "_blank", "noopener,noreferrer");
    },
    onAlternativesClick: (exerciseId: string) => {
      openAlternativesDemo(
        exerciseId,
        exerciseId === "bench"
          ? "Barbell Bench Press"
          : `Exercise (${exerciseId})`,
      );
    },
  };

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        <ClientPageShell className="max-w-4xl space-y-8 px-4 pb-24 pt-8">
          <header className="border-b border-white/10 pb-4">
            <h1 className="text-2xl font-bold fc-text-primary">Workout Execution UI Test Page</h1>
            <p className="text-sm fc-text-dim">Mock-only visual review surface before client testing.</p>
          </header>

          {section(
            "1. SET TYPE EXECUTORS",
            <div className="space-y-8">
              {section("STRAIGHT SET", <StraightSetExecutor {...baseProps} block={straight} />)}
              {section("SUPERSET", <SupersetExecutor {...baseProps} block={superset} />)}
              {section("GIANT SET", <GiantSetExecutor {...baseProps} block={giant} />)}
              {section("DROP SET", <DropSetExecutor {...baseProps} block={drop} />)}
              {section("CLUSTER SET", <ClusterSetExecutor {...baseProps} block={cluster} />)}
              {section("REST-PAUSE", <RestPauseExecutor {...baseProps} block={restPause} />)}
              {section("PRE-EXHAUSTION", <PreExhaustionExecutor {...baseProps} block={preExhaust} />)}
              {section("AMRAP", <AmrapExecutor {...baseProps} block={amrap} />)}
              {section("EMOM", <EmomExecutor {...baseProps} block={emom} />)}
              {section("TABATA", <TabataExecutor {...baseProps} block={tabata} />)}
              {section("FOR TIME", <ForTimeExecutor {...baseProps} block={forTime} />)}
              {section(
                "SPEED WORK",
                <SpeedWorkExecutor
                  {...baseProps}
                  block={speed}
                  clientBodyWeightKg={82}
                  loggedSets={[
                    {
                      id: "speed-1",
                      exercise_id: "sled",
                      set_entry_id: "speed",
                      set_number: 1,
                      actual_time_seconds: 12,
                      completed_at: new Date(),
                    },
                  ]}
                />
              )}
              {section("ENDURANCE", <EnduranceExecutor {...baseProps} block={endurance} />)}
            </div>
          )}

          {section(
            "2. REST TIMER OVERLAY",
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6 shadow-[0_0_40px_rgba(6,182,212,0.15)] backdrop-blur-md">
              <p className="mb-2 text-xs uppercase tracking-wider text-cyan-300">REST TIMER</p>
              <p className="mb-4 text-sm text-gray-400">Next: Barbell Bench Press — Set 3 of 4</p>
              <p className="my-6 text-center text-6xl font-bold tabular-nums text-white">00:45</p>
              <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-cyan-900/30">
                <div className="h-full w-2/3 rounded-full bg-cyan-400" />
              </div>
              <div className="mb-4 flex items-center justify-center gap-2">
                <button className="inline-flex items-center rounded-full border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-200">-15s</button>
                <button className="inline-flex items-center rounded-full border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-200">+15s</button>
              </div>
              <button className="w-full rounded-xl bg-gray-800 py-3 text-gray-400">Skip rest</button>
            </div>
          )}

          {section(
            "3. TABATA TIMER",
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-red-500/10 p-4">
                <p className="text-xs font-bold text-red-300">WORK</p>
                <p className="mt-2 text-3xl font-bold">00:14</p>
                <p className="text-sm fc-text-dim">Round 3 of 8 · Burpees</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-cyan-500/10 p-4">
                <p className="text-xs font-bold text-cyan-300">REST</p>
                <p className="mt-2 text-3xl font-bold">00:08</p>
                <p className="text-sm fc-text-dim">Round 3 of 8 · Get ready</p>
              </div>
            </div>
          )}

          {section(
            "4. EXERCISE ALTERNATIVES MODAL",
            <div className="space-y-3">
              <p className="text-sm fc-text-dim">
                Opens the real <code className="text-cyan-300/90">ClientExerciseAlternativesModal</code>{" "}
                with mocked alternatives (no API). Use the straight-set refresh icon above, or:
              </p>
              <Button
                type="button"
                variant="fc-primary"
                className="w-full sm:w-auto"
                onClick={() =>
                  openAlternativesDemo("bench", "Barbell Bench Press")
                }
              >
                Show alternatives modal
              </Button>
              {lastAlternativePick ? (
                <p className="text-xs fc-text-dim">
                  Last selection:{" "}
                  <span className="fc-text-primary">{lastAlternativePick}</span>
                </p>
              ) : null}
              {alternativesModalOpen && alternativesExercise ? (
                <ClientExerciseAlternativesModal
                  isOpen={alternativesModalOpen}
                  onClose={closeAlternativesDemo}
                  exercise={alternativesExercise}
                  demoAlternatives={DEMO_ALTERNATIVES}
                  onSelect={(altId, altName) => {
                    setLastAlternativePick(`${altName} (${altId})`);
                    closeAlternativesDemo();
                  }}
                />
              ) : null}
            </div>,
          )}

          {section(
            "5. INLINE PLATE CALCULATOR",
            <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.03] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/70">PLATES PER SIDE</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="h-8 w-12 rounded bg-red-500/80 text-center text-xs leading-8">20</div>
                <div className="h-6 w-10 rounded bg-green-500/80 text-center text-xs leading-6">10</div>
                <div className="h-2 w-24 rounded bg-white/60" />
                <div className="h-6 w-10 rounded bg-green-500/80 text-center text-xs leading-6">10</div>
                <div className="h-8 w-12 rounded bg-red-500/80 text-center text-xs leading-8">20</div>
              </div>
              <p className="mt-2 text-xs text-gray-400">20 + 10 per side · Bar: 20kg · Total: 100kg</p>
            </div>
          )}

          {section(
            "6. WORKOUT COMPLETION SCREEN",
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 p-5">
                <h3 className="text-xl font-bold">Workout Complete</h3>
                <p className="text-sm fc-text-dim">Workout duration: 48 minutes</p>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
                  <div><p className="font-bold">2</p><p className="fc-text-dim">PRs</p></div>
                  <div><p className="font-bold">9,840</p><p className="fc-text-dim">Volume</p></div>
                  <div><p className="font-bold">11</p><p className="fc-text-dim">Sets</p></div>
                  <div><p className="font-bold">92</p><p className="fc-text-dim">Reps</p></div>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>Bench Press - 4 sets logged (80x8, 80x8, 82.5x7, 82.5x7)</li>
                  <li>Pull-Ups - 3 sets logged</li>
                  <li>Squat - 4 sets logged, set 4 marked new PR</li>
                </ul>
                <Button className="mt-4 w-full" onClick={() => (window.location.href = "/client")}>
                  Back to Dashboard
                </Button>
              </div>

              <div className="rounded-2xl border border-white/10 p-5">
                <h3 className="text-xl font-bold">Workout Complete (Speed/Endurance)</h3>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
                  <div><p className="font-bold">6</p><p className="fc-text-dim">Intervals</p></div>
                  <div><p className="font-bold">5.0 km</p><p className="fc-text-dim">Distance</p></div>
                  <div><p className="font-bold">29:42</p><p className="fc-text-dim">Time</p></div>
                  <div><p className="font-bold">5:56/km</p><p className="fc-text-dim">Pace</p></div>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>Sled acceleration intervals logged: 6 x 50m</li>
                  <li>Long run logged: 5.0 km in 29:42</li>
                </ul>
                <Button className="mt-4 w-full" onClick={() => (window.location.href = "/client")}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
