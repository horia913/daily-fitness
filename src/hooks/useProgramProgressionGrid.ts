"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProgramSchedule } from "@/lib/workoutTemplateService";
import type { ProgramProgressionRule } from "@/lib/programProgressionService";
import { ProgramProgressionService } from "@/lib/programProgressionService";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import { supabase } from "@/lib/supabase";

export type GridSupportedSetType =
  | "straight_set"
  | "superset"
  | "giant_set"
  | "drop_set"
  | "cluster_set"
  | "rest_pause"
  | "pre_exhaustion"
  | "amrap"
  | "emom"
  | "for_time"
  | "tabata"
  | "speed_work"
  | "endurance";

export const GRID_SUPPORTED_SET_TYPES: GridSupportedSetType[] = [
  "straight_set",
  "superset",
  "giant_set",
  "drop_set",
  "cluster_set",
  "rest_pause",
  "pre_exhaustion",
  "amrap",
  "emom",
  "for_time",
  "tabata",
  "speed_work",
  "endurance",
];

type WorkoutBlockLite = {
  id: string;
  set_type: string;
  set_order: number;
  set_name?: string | null;
  total_sets?: number | null;
  rest_seconds?: number | null;
  reps_per_set?: string | null;
  exercises?: Array<{
    exercise_id: string;
    exercise_order: number;
    exercise_letter?: string | null;
    sets?: number | null;
    reps?: string | null;
    rest_seconds?: number | null;
    tempo?: string | null;
    rir?: number | null;
    weight_kg?: number | null;
    load_percentage?: number | null;
  }>;
};

export interface ProgressionGridCellRef {
  rowId: string;
  weekNumber: number;
  day: number;
  scheduleId?: string;
  rule?: ProgramProgressionRule;
  setType: string;
  rowExerciseId: string;
  rowExerciseOrder: number;
  rowExerciseLetter?: string | null;
  rowSetOrder: number;
  rowSetName?: string | null;
  rowTrainingBlockId?: string | null;
  defaults: {
    reps?: string | null;
    sets?: number | null;
    rest_seconds?: number | null;
    tempo?: string | null;
    rir?: number | null;
    weight_kg?: number | null;
    load_percentage?: number | null;
  };
}

export interface ProgramProgressionGridRow {
  id: string;
  day: number;
  dayLabel: string;
  blockType: string;
  blockOrder: number;
  blockName?: string | null;
  blockBadge: string;
  rowLabel: string;
  exerciseId: string;
  exerciseName: string;
  exerciseOrder: number;
  exerciseLetter?: string | null;
  structural: {
    sets?: number | null;
    restSeconds?: number | null;
    tempo?: string | null;
  };
  defaultWeek?: number;
  defaultScheduleId?: string;
  defaultTrainingBlockId?: string | null;
  cells: Record<number, ProgressionGridCellRef>;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const BLOCK_LABELS: Record<string, string> = {
  straight_set: "Straight Set",
  superset: "Superset",
  giant_set: "Giant",
  drop_set: "Drop Set",
  cluster_set: "Cluster",
  rest_pause: "Rest-Pause",
  pre_exhaustion: "Pre-Exhaust",
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For Time",
  tabata: "Tabata",
  speed_work: "Speed",
  endurance: "Endurance",
};

function getDayLabel(programDay: number): string {
  if (programDay >= 1 && programDay <= 7) return DAY_LABELS[programDay - 1];
  return `Day ${programDay}`;
}

function keyForRule(rule: ProgramProgressionRule, day: number): string {
  return [
    rule.week_number,
    day,
    rule.set_type,
    rule.set_order,
    rule.exercise_order,
    rule.exercise_letter || "",
  ].join("|");
}

function rowIdForExercise(args: {
  day: number;
  setEntryId?: string | null;
  setOrder: number;
  exerciseOrder: number;
  exerciseLetter?: string | null;
}): string {
  return [
    args.day,
    args.setEntryId || `set-${args.setOrder}`,
    args.exerciseOrder,
    args.exerciseLetter || "",
  ].join("_");
}

function setTypeLabel(setType: string): string {
  return BLOCK_LABELS[setType] || setType.replace(/_/g, " ");
}

export function formatLoad(rule?: Partial<ProgramProgressionRule> | null): string {
  if (!rule) return "—";
  if (rule.weight_kg != null) return `${rule.weight_kg}kg`;
  if (rule.load_percentage != null) return `${rule.load_percentage}%`;
  return "—";
}

export function formatCellDisplay(cell: ProgressionGridCellRef): string {
  const rule = cell.rule;
  const setType = cell.setType;
  if (!rule) return "—";

  if (
    [
      "straight_set",
      "superset",
      "giant_set",
      "drop_set",
      "cluster_set",
      "rest_pause",
      "pre_exhaustion",
    ].includes(setType)
  ) {
    const reps =
      rule.reps ??
      rule.first_exercise_reps ??
      rule.second_exercise_reps ??
      rule.exercise_reps ??
      rule.isolation_reps ??
      rule.compound_reps ??
      "—";
    return `${formatLoad(rule)} · RPE ${rule.rir ?? "—"} · ${reps}`;
  }

  if (setType === "amrap") {
    return `${rule.duration_minutes ?? "—"}min · target ${rule.target_reps ?? "—"}`;
  }
  if (setType === "emom") {
    return `${rule.duration_minutes ?? "—"}min · ${rule.target_reps ?? "—"} reps`;
  }
  if (setType === "for_time") {
    return `${rule.target_reps ?? "—"} reps · cap ${rule.time_cap_minutes ?? "—"}min`;
  }
  if (setType === "tabata") {
    return `${rule.rounds ?? "—"} × ${rule.work_seconds ?? "—"}/${rule.rest_seconds ?? "—"}s`;
  }
  if (setType === "speed_work") {
    const cfg = (rule.speed_endurance_config || {}) as Record<string, unknown>;
    const distance = cfg.distance_meters ?? "—";
    const hr = cfg.target_hr_pct ?? cfg.max_hr_percent ?? "—";
    const intervals = cfg.intervals ?? rule.sets ?? "—";
    return `${intervals} int · ${distance}m · ${hr}% HR`;
  }
  if (setType === "endurance") {
    const cfg = (rule.speed_endurance_config || {}) as Record<string, unknown>;
    const distance = cfg.target_distance_meters ?? "—";
    const time = cfg.target_time_seconds ?? "—";
    const hr = cfg.target_hr_pct ?? cfg.hr_percentage ?? "—";
    return `${distance}m · ${time}s · ${hr}% HR`;
  }

  return "—";
}

export function useProgramProgressionGrid(args: {
  programId: string;
  durationWeeks: number;
  schedule: ProgramSchedule[];
}) {
  const { programId, durationWeeks, schedule } = args;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<ProgramProgressionRule[]>([]);
  const [blocksByTemplate, setBlocksByTemplate] = useState<Map<string, WorkoutBlockLite[]>>(
    new Map(),
  );
  const [exerciseNameById, setExerciseNameById] = useState<Map<string, string>>(new Map());
  const [cellSaving, setCellSaving] = useState<Record<string, boolean>>({});
  const [cellErrors, setCellErrors] = useState<Record<string, string | null>>({});

  const refresh = useCallback(async () => {
    if (!programId) return;
    setLoading(true);
    setError(null);
    try {
      const templateIds = [
        ...new Set(
          (schedule || [])
            .map((s) => s.template_id)
            .filter((id) => Boolean(id) && id !== "rest"),
        ),
      ];

      const [rulesRes, blocksMap] = await Promise.all([
        supabase
          .from("program_progression_rules")
          .select("*")
          .eq("program_id", programId)
          .lte("week_number", durationWeeks)
          .order("week_number", { ascending: true })
          .order("set_order", { ascending: true })
          .order("exercise_order", { ascending: true }),
        templateIds.length
          ? WorkoutBlockService.getWorkoutBlocksForTemplates(templateIds, { lite: true })
          : Promise.resolve(new Map<string, WorkoutBlockLite[]>()),
      ]);

      if (rulesRes.error) throw rulesRes.error;
      const ruleRows = (rulesRes.data || []) as ProgramProgressionRule[];
      setRules(ruleRows);
      setBlocksByTemplate(blocksMap as Map<string, WorkoutBlockLite[]>);

      const exerciseIds = new Set<string>();
      ruleRows.forEach((r) => {
        if (r.exercise_id) exerciseIds.add(r.exercise_id);
      });
      blocksMap.forEach((blocks) => {
        blocks.forEach((block) => {
          (block.exercises || []).forEach((ex) => {
            if (ex.exercise_id) exerciseIds.add(ex.exercise_id);
          });
        });
      });

      if (exerciseIds.size > 0) {
        const { data: exData, error: exErr } = await supabase
          .from("exercises")
          .select("id,name")
          .in("id", Array.from(exerciseIds));
        if (exErr) throw exErr;
        const map = new Map<string, string>();
        (exData || []).forEach((ex: any) => map.set(ex.id, ex.name || "Exercise"));
        setExerciseNameById(map);
      } else {
        setExerciseNameById(new Map());
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load progression grid.");
    } finally {
      setLoading(false);
    }
  }, [durationWeeks, programId, schedule]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const rows = useMemo<ProgramProgressionGridRow[]>(() => {
    const scheduleByWeekDay = new Map<string, ProgramSchedule>();
    const scheduleById = new Map<string, ProgramSchedule>();
    schedule.forEach((s) => scheduleByWeekDay.set(`${s.week_number}|${s.program_day}`, s));
    schedule.forEach((s) => scheduleById.set(s.id, s));

    const ruleIndex = new Map<string, ProgramProgressionRule>();
    rules.forEach((rule) => {
      const sch = rule.program_schedule_id
        ? scheduleById.get(rule.program_schedule_id)
        : undefined;
      if (!sch) return;
      ruleIndex.set(keyForRule(rule, sch.program_day), rule);
    });

    const rowMap = new Map<string, ProgramProgressionGridRow>();
    for (const sch of schedule) {
      if (!sch.template_id || sch.template_id === "rest") continue;
      const blocks = blocksByTemplate.get(sch.template_id) || [];
      for (const block of blocks) {
        const exercises = [...(block.exercises || [])].sort(
          (a, b) => (a.exercise_order || 0) - (b.exercise_order || 0),
        );
        for (const ex of exercises) {
          const rowId = rowIdForExercise({
            day: sch.program_day,
            setEntryId: block.id,
            setOrder: block.set_order,
            exerciseOrder: ex.exercise_order,
            exerciseLetter: ex.exercise_letter,
          });
          const exerciseName =
            exerciseNameById.get(ex.exercise_id) || `Exercise ${ex.exercise_order}`;
          const letterSuffix = ex.exercise_letter ? ex.exercise_letter : "";
          const positionLabel =
            block.set_type === "pre_exhaustion" && ex.exercise_letter
              ? `${ex.exercise_letter}${ex.exercise_letter === "A" ? " (Iso)" : " (Comp)"}`
              : `${letterSuffix}`;
          const rowLabel = `${setTypeLabel(block.set_type)} ${block.set_order}${positionLabel} - ${exerciseName}`;

          if (!rowMap.has(rowId)) {
            rowMap.set(rowId, {
              id: rowId,
              day: sch.program_day,
              dayLabel: getDayLabel(sch.program_day),
              blockType: block.set_type,
              blockOrder: block.set_order,
              blockName: block.set_name,
              blockBadge: setTypeLabel(block.set_type),
              rowLabel,
              exerciseId: ex.exercise_id,
              exerciseName,
              exerciseOrder: ex.exercise_order,
              exerciseLetter: ex.exercise_letter || null,
              structural: {
                sets: ex.sets ?? block.total_sets ?? null,
                restSeconds: ex.rest_seconds ?? block.rest_seconds ?? null,
                tempo: ex.tempo ?? null,
              },
              defaultWeek: sch.week_number,
              defaultScheduleId: sch.id,
              defaultTrainingBlockId: sch.training_block_id ?? null,
              cells: {},
            });
          }
          const row = rowMap.get(rowId)!;

          for (let week = 1; week <= durationWeeks; week += 1) {
            const weekSchedule = scheduleByWeekDay.get(`${week}|${row.day}`);
            const key = [week, row.day, row.blockType, row.blockOrder, row.exerciseOrder, row.exerciseLetter || ""].join(
              "|",
            );
            row.cells[week] = {
              rowId: row.id,
              weekNumber: week,
              day: row.day,
              scheduleId: weekSchedule?.id,
              rule: ruleIndex.get(key),
              setType: row.blockType,
              rowExerciseId: row.exerciseId,
              rowExerciseOrder: row.exerciseOrder,
              rowExerciseLetter: row.exerciseLetter,
              rowSetOrder: row.blockOrder,
              rowSetName: row.blockName,
              rowTrainingBlockId: weekSchedule?.training_block_id ?? row.defaultTrainingBlockId,
              defaults: {
                reps: ex.reps ?? block.reps_per_set ?? null,
                sets: ex.sets ?? block.total_sets ?? null,
                rest_seconds: ex.rest_seconds ?? block.rest_seconds ?? null,
                tempo: ex.tempo ?? null,
                rir: ex.rir ?? null,
                weight_kg: ex.weight_kg ?? null,
                load_percentage: ex.load_percentage ?? null,
              },
            };
          }
        }
      }
    }

    return Array.from(rowMap.values()).sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      if (a.blockOrder !== b.blockOrder) return a.blockOrder - b.blockOrder;
      if (a.exerciseOrder !== b.exerciseOrder) return a.exerciseOrder - b.exerciseOrder;
      return (a.exerciseLetter || "").localeCompare(b.exerciseLetter || "");
    });
  }, [blocksByTemplate, durationWeeks, exerciseNameById, rules, schedule]);

  const saveCell = useCallback(
    async (cell: ProgressionGridCellRef, patch: Partial<ProgramProgressionRule>) => {
      const cellKey = `${cell.rowId}|${cell.weekNumber}`;
      setCellSaving((prev) => ({ ...prev, [cellKey]: true }));
      setCellErrors((prev) => ({ ...prev, [cellKey]: null }));
      try {
        if (cell.rule?.id) {
          const ok = await ProgramProgressionService.updateProgressionRule(cell.rule.id, patch);
          if (!ok) throw new Error("Failed to update progression rule.");
        } else {
          if (!cell.scheduleId) throw new Error("No schedule slot for this week/day.");
          const payload: Omit<ProgramProgressionRule, "id" | "created_at" | "updated_at" | "exercise"> = {
            program_id: programId,
            program_schedule_id: cell.scheduleId,
            week_number: cell.weekNumber,
            set_type: cell.setType,
            set_order: cell.rowSetOrder,
            set_name: cell.rowSetName || undefined,
            exercise_id: cell.rowExerciseId,
            exercise_order: cell.rowExerciseOrder,
            exercise_letter: cell.rowExerciseLetter || undefined,
            training_block_id: cell.rowTrainingBlockId ?? undefined,
            ...patch,
          };
          const created = await ProgramProgressionService.createProgressionRule(payload);
          if (!created) throw new Error("Failed to create progression rule.");
        }
        await refresh();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Save failed.";
        setCellErrors((prev) => ({ ...prev, [cellKey]: msg }));
        return { ok: false, error: msg };
      } finally {
        setCellSaving((prev) => ({ ...prev, [cellKey]: false }));
      }
      return { ok: true as const };
    },
    [programId, refresh],
  );

  return {
    loading,
    error,
    rows,
    saveCell,
    cellSaving,
    cellErrors,
    refresh,
  };
}

