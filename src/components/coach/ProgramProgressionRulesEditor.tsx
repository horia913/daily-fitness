"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ProgramProgressionService,
  ProgramProgressionRule,
} from "@/lib/programProgressionService";
import { Save, RefreshCw, Replace, AlertCircle } from "lucide-react";
import { Exercise, WorkoutTemplate } from "@/lib/workoutTemplateService";
import ExerciseBlockCard from "@/components/features/workouts/ExerciseBlockCard";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ExerciseDetailForm from "@/components/features/workouts/ExerciseDetailForm";

interface ProgramProgressionRulesEditorProps {
  programId: string;
  programScheduleId: string;
  weekNumber: number;
  exercises: Exercise[];
  templates?: WorkoutTemplate[];
  onUpdate?: () => void;
}

interface GroupedRules {
  blockOrder: number;
  blockType: string;
  blockName?: string;
  rules: ProgramProgressionRule[];
}

interface BlockFormState {
  key: string;
  blockOrder: number;
  blockType: string;
  blockName?: string;
  rules: ProgramProgressionRule[];
  formValue: any;
  originalFormValue: any;
  hasChanges: boolean;
}

interface RuleUpdateCandidate {
  original: ProgramProgressionRule;
  updates: Partial<ProgramProgressionRule>;
  createPayload?: Omit<
    ProgramProgressionRule,
    "id" | "created_at" | "updated_at" | "exercise"
  >;
}

export default function ProgramProgressionRulesEditor({
  programId,
  programScheduleId,
  weekNumber,
  exercises,
  templates = [],
  onUpdate,
}: ProgramProgressionRulesEditorProps) {
  const [blockForms, setBlockForms] = useState<BlockFormState[]>([]);
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReplaceWorkout, setShowReplaceWorkout] = useState(false);

  useEffect(() => {
    loadRules();
  }, [programId, programScheduleId, weekNumber]);

  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);

      const { rules, isPlaceholder: isPlaceholderData } =
        await ProgramProgressionService.getProgressionRules(
          programId,
          weekNumber,
          programScheduleId
        );

      // If no rules exist and we have a schedule ID, try to copy workout data
      if (
        rules.length === 0 &&
        programScheduleId &&
        !programScheduleId.startsWith("temp-")
      ) {
        try {
          // Get the template_id from the schedule
          const { data: scheduleData } = await supabase
            .from("program_schedule")
            .select("template_id")
            .eq("id", programScheduleId)
            .single();

          if (scheduleData?.template_id) {
            console.log(
              "[ProgressionDebug] Invoking copyWorkoutToProgram from ProgramProgressionRulesEditor",
              {
                programId,
                weekNumber,
                programScheduleId,
                templateId: scheduleData.template_id,
                source: "ProgramProgressionRulesEditor.loadRules",
              }
            );
            const success =
              await ProgramProgressionService.copyWorkoutToProgram(
                programId,
                programScheduleId,
                scheduleData.template_id,
                weekNumber
              );

            if (success) {
              const { rules: newRules, isPlaceholder: newIsPlaceholder } =
                await ProgramProgressionService.getProgressionRules(
                  programId,
                  weekNumber,
                  programScheduleId
                );
              setIsPlaceholder(newIsPlaceholder);
              const grouped = groupRulesByBlock(newRules);
              const blockState = grouped.map((group) => {
                const formValue = createFormValueForGroup(group);
                return {
                  key: `block-${group.blockOrder}-${group.blockType}-${
                    group.rules[0]?.exercise_order || 0
                  }`,
                  blockOrder: group.blockOrder,
                  blockType: group.blockType,
                  blockName: group.blockName,
                  rules: group.rules,
                  formValue,
                  originalFormValue: cloneDeep(formValue),
                  hasChanges: false,
                } as BlockFormState;
              });
              setBlockForms(blockState);
              return;
            } else {
              console.warn("⚠️ Failed to copy workout data");
            }
          }
        } catch (copyError) {
          console.error("❌ Error copying workout data:", copyError);
          // Continue to show empty state rather than error
        }
      }

      setIsPlaceholder(isPlaceholderData);

      // Debug: Log what we received
      console.log("[ProgressionRulesEditor] Loaded rules:", {
        count: rules.length,
        sample: rules.slice(0, 2).map((r) => ({
          id: r.id,
          block_type: r.block_type,
          exercise_id: r.exercise_id,
          load_percentage: r.load_percentage,
          weight_kg: r.weight_kg,
          sets: r.sets,
          reps: r.reps,
          tempo: r.tempo,
          rir: r.rir,
          notes: r.notes,
        })),
      });

      // Group rules by block
      const grouped = groupRulesByBlock(rules);
      const blockState = grouped.map((group) => {
        const formValue = createFormValueForGroup(group);
        
        // Debug: Log what we're creating
        console.log(`[ProgressionRulesEditor] Created formValue for ${group.blockType}:`, {
          blockOrder: group.blockOrder,
          exercise_id: formValue.exercise_id,
          load_percentage: formValue.load_percentage,
          weight_kg: formValue.weight_kg,
          sets: formValue.sets,
          reps: formValue.reps,
          tempo: formValue.tempo,
          rir: formValue.rir,
          notes: formValue.notes,
        });
        
        return {
          key: `block-${group.blockOrder}-${group.blockType}-${
            group.rules[0]?.exercise_order || 0
          }`,
          blockOrder: group.blockOrder,
          blockType: group.blockType,
          blockName: group.blockName,
          rules: group.rules,
          formValue,
          originalFormValue: cloneDeep(formValue),
          hasChanges: false,
        } as BlockFormState;
      });
      setBlockForms(blockState);
    } catch (err: any) {
      console.error("❌ Error loading progression rules:", err);
      console.error("❌ Error details:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      });
      setError(
        `Failed to load progression rules: ${err?.message || "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const groupRulesByBlock = (
    rules: ProgramProgressionRule[]
  ): GroupedRules[] => {
    const grouped = new Map<number, GroupedRules>();

    rules.forEach((rule) => {
      if (!grouped.has(rule.block_order)) {
        grouped.set(rule.block_order, {
          blockOrder: rule.block_order,
          blockType: rule.block_type,
          blockName: rule.block_name,
          rules: [],
        });
      }
      grouped.get(rule.block_order)!.rules.push(rule);
    });

    return Array.from(grouped.values()).sort(
      (a, b) => a.blockOrder - b.blockOrder
    );
  };

  const numberToString = (value?: number | null) => {
    if (value === undefined || value === null) return "";
    return String(value);
  };

  const toNumberOrNull = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const parsed =
      typeof value === "number" ? value : parseInt(String(value), 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const toStringOrNull = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    const str = String(value);
    return str.trim() === "" ? null : str;
  };

  const cloneDeep = <T,>(value: T): T =>
    typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));

  const deepEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object" || a === null || b === null) {
      return a === b;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual(a[key], b[key]));
  };

  const findExerciseMeta = (exerciseId?: string | null) =>
    exerciseId ? exercises.find((e) => e.id === exerciseId) : undefined;

  const valuesMatch = (a: any, b: any) => {
    if (a === b) return true;
    if (a === null || a === undefined) return b === null || b === undefined;
    if (b === null || b === undefined) return false;
    if (typeof a === "number" && typeof b === "number") {
      return Number.isNaN(a) && Number.isNaN(b) ? true : a === b;
    }
    return a === b;
  };

  const createFormValueForGroup = (group: GroupedRules) => {
    const rulesSorted = cloneDeep(group.rules).sort(
      (a, b) => (a.exercise_order || 0) - (b.exercise_order || 0)
    );
    const primaryRule = rulesSorted[0];
    const blockType = group.blockType;

    const baseForm: any = {
      id:
        primaryRule?.id ||
        `placeholder-${group.blockOrder}-${primaryRule?.exercise_order || 0}`,
      exercise_type: blockType,
      exercise_id: primaryRule?.exercise_id || "",
      exercise:
        primaryRule?.exercise || findExerciseMeta(primaryRule?.exercise_id),
      sets: numberToString(primaryRule?.sets ?? null),
      reps: primaryRule?.reps || primaryRule?.first_exercise_reps || primaryRule?.isolation_reps || "",
      rest_seconds: numberToString(primaryRule?.rest_seconds ?? null),
      tempo: primaryRule?.tempo || "",
      rir: numberToString(primaryRule?.rir ?? null),
      load_percentage: numberToString(primaryRule?.load_percentage ?? null),
      weight_kg: numberToString(primaryRule?.weight_kg ?? null),
      notes: primaryRule?.notes || "",
    };
    
    // Debug log for baseForm
    console.log(`[createFormValueForGroup] baseForm for ${blockType}:`, {
      exercise_id: baseForm.exercise_id,
      sets: baseForm.sets,
      reps: baseForm.reps,
      load_percentage: baseForm.load_percentage,
      weight_kg: baseForm.weight_kg,
      tempo: baseForm.tempo,
      rir: baseForm.rir,
      notes: baseForm.notes,
      primaryRuleData: {
        sets: primaryRule?.sets,
        reps: primaryRule?.reps,
        load_percentage: primaryRule?.load_percentage,
        weight_kg: primaryRule?.weight_kg,
        tempo: primaryRule?.tempo,
        rir: primaryRule?.rir,
        notes: primaryRule?.notes,
      },
    });

    switch (blockType) {
      case "superset": {
        const ruleA =
          rulesSorted.find((r) => r.exercise_letter === "A") || rulesSorted[0];
        const ruleB =
          rulesSorted.find((r) => r.exercise_letter === "B") || rulesSorted[1];
        return {
          ...baseForm,
          exercise_id: ruleA?.exercise_id || "",
          exercise: ruleA?.exercise || findExerciseMeta(ruleA?.exercise_id),
          superset_exercise_id: ruleB?.exercise_id || "",
          superset_exercise:
            ruleB?.exercise || findExerciseMeta(ruleB?.exercise_id),
          sets: numberToString(ruleA?.sets ?? ruleB?.sets ?? null),
          reps:
            ruleA?.first_exercise_reps || ruleA?.reps || baseForm.reps || "",
          superset_reps: ruleB?.second_exercise_reps || ruleB?.reps || "",
          rest_seconds: numberToString(
            ruleA?.rest_between_pairs ?? ruleB?.rest_between_pairs ?? null
          ),
          tempo: ruleA?.tempo || baseForm.tempo || "",
          superset_tempo: ruleB?.tempo || "",
          rir: numberToString(ruleA?.rir ?? null),
          superset_rir: numberToString(ruleB?.rir ?? null),
          load_percentage: numberToString(ruleA?.load_percentage ?? null),
          weight_kg: numberToString(ruleA?.weight_kg ?? null),
          superset_load_percentage: numberToString(ruleB?.load_percentage ?? null),
          superset_weight_kg: numberToString(ruleB?.weight_kg ?? null),
          notes: ruleA?.notes || baseForm.notes || "",
        };
      }
      case "giant_set": {
        // Sort by exercise_letter to ensure consistent order (A, B, C, D)
        const sortedRules = [...rulesSorted].sort((a, b) => {
          const letterA = a.exercise_letter || "A"
          const letterB = b.exercise_letter || "A"
          return letterA.localeCompare(letterB)
        });
        const restBetween = sortedRules[0]?.rest_between_pairs ?? null;
        return {
          ...baseForm,
          sets: numberToString(sortedRules[0]?.sets ?? null),
          rest_seconds: numberToString(restBetween),
          giant_set_exercises: sortedRules.map((rule) => ({
            exercise_id: rule.exercise_id || "",
            exercise: rule.exercise || findExerciseMeta(rule.exercise_id),
            reps: rule.reps || "",
            sets: numberToString(rule.sets ?? null),
            rest_seconds: numberToString(rule.rest_seconds ?? null),
            tempo: rule.tempo || "",
            rir: numberToString(rule.rir ?? null),
            load_percentage: numberToString(rule.load_percentage ?? null),
            weight_kg: numberToString(rule.weight_kg ?? null),
            notes: rule.notes || "",
          })),
        };
      }
      case "drop_set": {
        return {
          ...baseForm,
          exercise_reps: primaryRule?.exercise_reps || primaryRule?.reps || "",
          drop_set_reps: primaryRule?.drop_set_reps || "",
          drop_percentage: numberToString(
            primaryRule?.drop_percentage ?? null
          ),
          rest_seconds: numberToString(primaryRule?.rest_seconds ?? null),
          tempo: primaryRule?.tempo || baseForm.tempo || "",
          rir: numberToString(primaryRule?.rir ?? null),
          load_percentage: numberToString(primaryRule?.load_percentage ?? null),
          weight_kg: numberToString(primaryRule?.weight_kg ?? null),
          notes: primaryRule?.notes || baseForm.notes || "",
        };
      }
      case "cluster_set": {
        return {
          ...baseForm,
          clusters_per_set: numberToString(
            primaryRule?.clusters_per_set ?? null
          ),
          cluster_reps: numberToString(primaryRule?.reps_per_cluster ?? null),
          intra_cluster_rest: numberToString(
            primaryRule?.intra_cluster_rest ?? null
          ),
          rest_seconds: numberToString(primaryRule?.rest_seconds ?? null),
          tempo: primaryRule?.tempo || baseForm.tempo || "",
          rir: numberToString(primaryRule?.rir ?? null),
          load_percentage: numberToString(primaryRule?.load_percentage ?? null),
          weight_kg: numberToString(primaryRule?.weight_kg ?? null),
          notes: primaryRule?.notes || baseForm.notes || "",
        };
      }
      case "rest_pause": {
        return {
          ...baseForm,
          reps: primaryRule?.reps || baseForm.reps || "",
          rest_pause_duration: numberToString(
            primaryRule?.rest_pause_duration ?? null
          ),
          max_rest_pauses: numberToString(primaryRule?.max_rest_pauses ?? null),
          rest_seconds: numberToString(primaryRule?.rest_seconds ?? null),
          tempo: primaryRule?.tempo || baseForm.tempo || "",
          load_percentage: numberToString(primaryRule?.load_percentage ?? null),
          weight_kg: numberToString(primaryRule?.weight_kg ?? null),
          notes: primaryRule?.notes || baseForm.notes || "",
        };
      }
      case "pre_exhaustion": {
        // Find isolation (letter A) and compound (letter B) exercises
        const isolationRule = rulesSorted.find((r) => r.exercise_letter === "A") || rulesSorted.find((r) => (r.exercise_order || 0) === 1) || rulesSorted[0];
        const compoundRule = rulesSorted.find((r) => r.exercise_letter === "B") || rulesSorted.find((r) => (r.exercise_order || 0) === 2) || rulesSorted[1] || rulesSorted[0];
        return {
          ...baseForm,
          exercise_id: isolationRule?.exercise_id || "",
          exercise:
            isolationRule?.exercise ||
            findExerciseMeta(isolationRule?.exercise_id),
          compound_exercise_id: compoundRule?.exercise_id || "",
          compound_exercise:
            compoundRule?.exercise ||
            findExerciseMeta(compoundRule?.exercise_id),
          sets: numberToString(
            isolationRule?.sets ?? compoundRule?.sets ?? null
          ),
          isolation_reps:
            isolationRule?.isolation_reps || isolationRule?.reps || "",
          compound_reps:
            compoundRule?.compound_reps || compoundRule?.reps || "",
          rest_seconds: numberToString(
            isolationRule?.rest_between_pairs ??
              compoundRule?.rest_between_pairs ??
              null
          ),
          tempo: isolationRule?.tempo || baseForm.tempo || "",
          compound_tempo: compoundRule?.tempo || "",
          rir: numberToString(isolationRule?.rir ?? null),
          compound_rir: numberToString(compoundRule?.rir ?? null),
          load_percentage: numberToString(isolationRule?.load_percentage ?? null),
          weight_kg: numberToString(isolationRule?.weight_kg ?? null),
          compound_load_percentage: numberToString(compoundRule?.load_percentage ?? null),
          compound_weight_kg: numberToString(compoundRule?.weight_kg ?? null),
          notes: isolationRule?.notes || baseForm.notes || "",
        };
      }
      case "amrap": {
        return {
          ...baseForm,
          reps: primaryRule?.reps || baseForm.reps || "",
          amrap_duration: numberToString(primaryRule?.duration_minutes ?? null),
          target_reps: numberToString(primaryRule?.target_reps ?? null),
          tempo: primaryRule?.tempo || baseForm.tempo || "",
          load_percentage: numberToString(primaryRule?.load_percentage ?? null),
          weight_kg: numberToString(primaryRule?.weight_kg ?? null),
          notes: primaryRule?.notes || baseForm.notes || "",
        };
      }
      case "emom": {
        return {
          ...baseForm,
          emom_mode: primaryRule?.emom_mode || "target_reps",
          emom_duration: numberToString(primaryRule?.duration_minutes ?? null),
          emom_reps: numberToString(primaryRule?.target_reps ?? null),
          work_seconds: numberToString(primaryRule?.work_seconds ?? null),
          rest_seconds: numberToString(primaryRule?.rest_seconds ?? null),
          tempo: primaryRule?.tempo || baseForm.tempo || "",
          load_percentage: numberToString(primaryRule?.load_percentage ?? null),
          weight_kg: numberToString(primaryRule?.weight_kg ?? null),
          notes: primaryRule?.notes || baseForm.notes || "",
        };
      }
      case "tabata": {
        return {
          ...baseForm,
          work_seconds: numberToString(primaryRule?.work_seconds ?? null),
          rest_seconds: numberToString(primaryRule?.rest_seconds ?? null),
          rounds: numberToString(primaryRule?.rounds ?? null),
          rest_after: numberToString(primaryRule?.rest_after_set ?? null),
          tempo: primaryRule?.tempo || baseForm.tempo || "",
          notes: primaryRule?.notes || baseForm.notes || "",
        };
      }
      case "for_time": {
        return {
          ...baseForm,
          target_reps: numberToString(primaryRule?.target_reps ?? null),
          time_cap: numberToString(primaryRule?.time_cap_minutes ?? null),
          tempo: primaryRule?.tempo || baseForm.tempo || "",
          load_percentage: numberToString(primaryRule?.load_percentage ?? null),
          weight_kg: numberToString(primaryRule?.weight_kg ?? null),
          notes: primaryRule?.notes || baseForm.notes || "",
        };
      }
      case "pyramid_set": {
        return {
          ...baseForm,
          pyramid_order: numberToString(primaryRule?.pyramid_order ?? null),
        };
      }
      case "ladder": {
        return {
          ...baseForm,
          ladder_order: numberToString(primaryRule?.ladder_order ?? null),
          rounds: numberToString(primaryRule?.rounds ?? null),
          start_reps: numberToString(primaryRule?.target_reps ?? null),
        };
      }
      default:
        return baseForm;
    }
  };

  const buildRuleUpdateCandidates = (
    block: BlockFormState
  ): RuleUpdateCandidate[] => {
    const form = block.formValue || {};
    const rulesSorted = block.rules
      .map((rule) => ({ ...rule }))
      .sort((a, b) => (a.exercise_order || 0) - (b.exercise_order || 0));

    const candidates: RuleUpdateCandidate[] = [];

    const pushCandidate = (
      rule: ProgramProgressionRule | undefined,
      values: Partial<ProgramProgressionRule>
    ) => {
      if (!rule) return;
      const updates: Partial<ProgramProgressionRule> = {};

      Object.entries(values).forEach(([key, value]) => {
        const existing = (rule as any)[key];
        if (!valuesMatch(existing, value)) {
          updates[key as keyof ProgramProgressionRule] = value as any;
        }
      });

      const candidate: RuleUpdateCandidate = { original: rule, updates };

      if (!rule.id) {
        const { id, created_at, updated_at, exercise, ...rest } = {
          ...rule,
          ...values,
        } as any;
        candidate.createPayload = rest;
      }

      candidates.push(candidate);
    };

    switch (block.blockType) {
      case "superset": {
        const ruleA =
          rulesSorted.find((r) => r.exercise_letter === "A") || rulesSorted[0];
        const ruleB =
          rulesSorted.find((r) => r.exercise_letter === "B") || rulesSorted[1];
        const setsValue = toNumberOrNull(form.sets);
        const restPairs = toNumberOrNull(form.rest_seconds);

        pushCandidate(ruleA, {
          exercise_id:
            toStringOrNull(form.exercise_id) ?? ruleA?.exercise_id ?? undefined,
          sets: setsValue,
          first_exercise_reps: toStringOrNull(form.reps),
          rest_between_pairs: restPairs,
          tempo: toStringOrNull(form.tempo),
          rir: toNumberOrNull(form.rir),
          load_percentage: toNumberOrNull(form.load_percentage),
          notes: toStringOrNull(form.notes),
        });

        pushCandidate(ruleB, {
          exercise_id:
            toStringOrNull(form.superset_exercise_id) ??
            ruleB?.exercise_id ??
            undefined,
          sets: setsValue,
          second_exercise_reps: toStringOrNull(form.superset_reps),
          rest_between_pairs: restPairs,
          tempo: toStringOrNull(form.superset_tempo ?? form.tempo),
          rir: toNumberOrNull(form.superset_rir ?? form.rir),
          load_percentage: toNumberOrNull(form.load_percentage),
          notes: toStringOrNull(form.superset_notes ?? form.notes),
        });
        break;
      }
      case "giant_set": {
        const blockSets = toNumberOrNull(form.sets);
        const restPairs = toNumberOrNull(form.rest_seconds);
        const entries: any[] = Array.isArray(form.giant_set_exercises)
          ? form.giant_set_exercises
          : [];

        rulesSorted.forEach((rule, idx) => {
          const entry = entries[idx] || {};
          pushCandidate(rule, {
            exercise_id:
              toStringOrNull(entry.exercise_id) ??
              rule.exercise_id ??
              undefined,
            sets:
              blockSets ?? toNumberOrNull(entry.sets) ?? rule.sets ?? undefined,
            reps: toStringOrNull(entry.reps),
            rest_seconds: toNumberOrNull(entry.rest_seconds),
            rest_between_pairs: restPairs,
            tempo: toStringOrNull(entry.tempo ?? form.tempo),
            rir: toNumberOrNull(entry.rir ?? form.rir),
            load_percentage: toNumberOrNull(form.load_percentage),
            notes: toStringOrNull(form.notes ?? entry.notes),
          });
        });
        break;
      }
      case "drop_set": {
        const rule = rulesSorted[0];
        pushCandidate(rule, {
          exercise_id:
            toStringOrNull(form.exercise_id) ?? rule?.exercise_id ?? undefined,
          sets: toNumberOrNull(form.sets),
          exercise_reps: toStringOrNull(form.exercise_reps),
          drop_set_reps: toStringOrNull(form.drop_set_reps),
          drop_percentage: toNumberOrNull(form.drop_percentage),
          rest_seconds: toNumberOrNull(form.rest_seconds),
          tempo: toStringOrNull(form.tempo),
          rir: toNumberOrNull(form.rir),
          load_percentage: toNumberOrNull(form.load_percentage),
          weight_kg: toNumberOrNull(form.weight_kg),
          notes: toStringOrNull(form.notes),
        });
        break;
      }
      case "cluster_set": {
        const rule = rulesSorted[0];
        pushCandidate(rule, {
          exercise_id:
            toStringOrNull(form.exercise_id) ?? rule?.exercise_id ?? undefined,
          sets: toNumberOrNull(form.sets),
          reps_per_cluster: toNumberOrNull(form.cluster_reps),
          clusters_per_set: toNumberOrNull(form.clusters_per_set),
          intra_cluster_rest: toNumberOrNull(form.intra_cluster_rest),
          rest_seconds: toNumberOrNull(form.rest_seconds),
          tempo: toStringOrNull(form.tempo),
          rir: toNumberOrNull(form.rir),
          load_percentage: toNumberOrNull(form.load_percentage),
          notes: toStringOrNull(form.notes),
        });
        break;
      }
      case "rest_pause": {
        const rule = rulesSorted[0];
        pushCandidate(rule, {
          exercise_id:
            toStringOrNull(form.exercise_id) ?? rule?.exercise_id ?? undefined,
          sets: toNumberOrNull(form.sets),
          reps: toStringOrNull(form.reps),
          rest_pause_duration: toNumberOrNull(form.rest_pause_duration),
          max_rest_pauses: toNumberOrNull(form.max_rest_pauses),
          rest_seconds: toNumberOrNull(form.rest_seconds),
          tempo: toStringOrNull(form.tempo),
          load_percentage: toNumberOrNull(form.load_percentage),
          notes: toStringOrNull(form.notes),
        });
        break;
      }
      case "pre_exhaustion": {
        const isolationRule = rulesSorted[0];
        const compoundRule = rulesSorted[1] || rulesSorted[0];
        const setsValue = toNumberOrNull(form.sets);
        const restPairs = toNumberOrNull(form.rest_seconds);

        pushCandidate(isolationRule, {
          exercise_id:
            toStringOrNull(form.exercise_id) ??
            isolationRule?.exercise_id ??
            undefined,
          sets: setsValue,
          isolation_reps: toStringOrNull(form.isolation_reps),
          rest_between_pairs: restPairs,
          tempo: toStringOrNull(form.tempo),
          rir: toNumberOrNull(form.rir),
          load_percentage: toNumberOrNull(form.load_percentage),
          notes: toStringOrNull(form.notes),
        });

        pushCandidate(compoundRule, {
          exercise_id:
            toStringOrNull(form.compound_exercise_id) ??
            compoundRule?.exercise_id ??
            undefined,
          sets: setsValue,
          compound_reps: toStringOrNull(form.compound_reps),
          rest_between_pairs: restPairs,
          tempo: toStringOrNull(form.compound_tempo ?? form.tempo),
          rir: toNumberOrNull(form.compound_rir ?? form.rir),
          load_percentage: toNumberOrNull(form.load_percentage),
          notes: toStringOrNull(form.notes),
        });
        break;
      }
      case "amrap": {
        const rule = rulesSorted[0];
        pushCandidate(rule, {
          exercise_id:
            toStringOrNull(form.exercise_id) ?? rule?.exercise_id ?? undefined,
          duration_minutes: toNumberOrNull(form.amrap_duration),
          target_reps: toNumberOrNull(form.target_reps ?? form.reps),
          reps: toStringOrNull(form.reps),
          tempo: toStringOrNull(form.tempo),
          load_percentage: toNumberOrNull(form.load_percentage),
          notes: toStringOrNull(form.notes),
        });
        break;
      }
      case "emom": {
        const rule = rulesSorted[0];
        pushCandidate(rule, {
          exercise_id:
            toStringOrNull(form.exercise_id) ?? rule?.exercise_id ?? undefined,
          emom_mode: form.emom_mode || rule?.emom_mode || "target_reps",
          duration_minutes: toNumberOrNull(form.emom_duration),
          target_reps: toNumberOrNull(form.emom_reps ?? form.target_reps),
          work_seconds: toNumberOrNull(form.work_seconds),
          tempo: toStringOrNull(form.tempo),
          load_percentage: toNumberOrNull(form.load_percentage),
          notes: toStringOrNull(form.notes),
        });
        break;
      }
      case "tabata": {
        const rule = rulesSorted[0];
        pushCandidate(rule, {
          exercise_id:
            toStringOrNull(form.exercise_id) ?? rule?.exercise_id ?? undefined,
          work_seconds: toNumberOrNull(form.work_seconds),
          rest_seconds: toNumberOrNull(form.rest_seconds),
          rounds: toNumberOrNull(form.rounds),
          rest_after_set: toNumberOrNull(form.rest_after),
          tempo: toStringOrNull(form.tempo),
          load_percentage: toNumberOrNull(form.load_percentage),
          notes: toStringOrNull(form.notes),
        });
        break;
      }
      case "for_time": {
        const rule = rulesSorted[0];
        pushCandidate(rule, {
          exercise_id:
            toStringOrNull(form.exercise_id) ?? rule?.exercise_id ?? undefined,
          target_reps: toNumberOrNull(form.target_reps),
          time_cap_minutes: toNumberOrNull(form.time_cap),
          tempo: toStringOrNull(form.tempo),
          load_percentage: toNumberOrNull(form.load_percentage),
          notes: toStringOrNull(form.notes),
        });
        break;
      }
      case "pyramid_set": {
        const rule = rulesSorted[0];
        pushCandidate(rule, {
          exercise_id:
            toStringOrNull(form.exercise_id) ?? rule?.exercise_id ?? undefined,
          pyramid_order: toNumberOrNull(form.pyramid_order),
          sets: toNumberOrNull(form.sets),
          reps: toStringOrNull(form.reps),
          tempo: toStringOrNull(form.tempo),
          load_percentage: toNumberOrNull(form.load_percentage),
          notes: toStringOrNull(form.notes),
        });
        break;
      }
      case "ladder": {
        const rule = rulesSorted[0];
        pushCandidate(rule, {
          exercise_id:
            toStringOrNull(form.exercise_id) ?? rule?.exercise_id ?? undefined,
          ladder_order: toNumberOrNull(form.ladder_order),
          rounds: toNumberOrNull(form.rounds),
          target_reps: toNumberOrNull(form.start_reps ?? form.target_reps),
          tempo: toStringOrNull(form.tempo),
          load_percentage: toNumberOrNull(form.load_percentage),
          notes: toStringOrNull(form.notes),
        });
        break;
      }
      default: {
        rulesSorted.forEach((rule, idx) => {
          const perExercise = Array.isArray(form.exercises)
            ? form.exercises[idx] || {}
            : {};
          pushCandidate(rule, {
            exercise_id:
              toStringOrNull(perExercise.exercise_id ?? form.exercise_id) ??
              rule.exercise_id ??
              undefined,
            sets:
              toNumberOrNull(perExercise.sets ?? form.sets) ??
              rule.sets ??
              null,
            reps: toStringOrNull(perExercise.reps ?? form.reps),
            rest_seconds: toNumberOrNull(
              perExercise.rest_seconds ?? form.rest_seconds
            ),
            tempo: toStringOrNull(perExercise.tempo ?? form.tempo),
            rir: toNumberOrNull(perExercise.rir ?? form.rir),
            load_percentage: toNumberOrNull(form.load_percentage),
            notes: toStringOrNull(perExercise.notes ?? form.notes),
          });
        });
        break;
      }
    }

    return candidates;
  };

  const pendingChangeCount = blockForms.filter(
    (block) => block.hasChanges
  ).length;
  const hasPendingChanges = pendingChangeCount > 0;

  const handleBlockChange = (blockKey: string, updatedForm: any) => {
    setBlockForms((prev) =>
      prev.map((block) => {
        if (block.key !== blockKey) return block;
        const mergedForm = {
          ...block.formValue,
          ...updatedForm,
          exercise_type: block.blockType,
        };
        return {
          ...block,
          formValue: mergedForm,
          hasChanges: !deepEqual(block.originalFormValue, mergedForm),
        };
      })
    );
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      setError(null);

      const dirtyBlocks = blockForms.filter((block) => block.hasChanges);

      for (const block of dirtyBlocks) {
        const candidates = buildRuleUpdateCandidates(block);

        for (const candidate of candidates) {
          const { original, updates, createPayload } = candidate;

          // Remove undefined fields from updates to avoid accidental clears
          Object.keys(updates).forEach((key) => {
            if ((updates as any)[key] === undefined) {
              delete (updates as any)[key];
            }
          });

          const hasUpdateFields = Object.keys(updates).length > 0;

          if (original.id && hasUpdateFields) {
            const success =
              await ProgramProgressionService.updateProgressionRule(
                original.id,
                updates
              );
            if (!success) {
              throw new Error("Failed to update progression rule");
            }
          }

          if (!original.id && createPayload) {
            const sanitizedPayload = { ...createPayload } as any;
            delete sanitizedPayload.exercise;

            const created =
              await ProgramProgressionService.createProgressionRule(
                sanitizedPayload
              );
            if (!created) {
              throw new Error("Failed to create progression rule");
            }
          }
        }
      }

      await loadRules();
      onUpdate?.();
    } catch (err: any) {
      console.error("Error saving changes:", err);
      setError(err?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleReplaceWorkout = async (newTemplateId: string) => {
    try {
      const success = await ProgramProgressionService.replaceWorkout(
        programId,
        programScheduleId,
        newTemplateId,
        weekNumber
      );
      if (success) {
        await loadRules();
        setShowReplaceWorkout(false);
        onUpdate?.();
      } else {
        setError("Failed to replace workout");
      }
    } catch (err) {
      console.error("Error replacing workout:", err);
      setError("Failed to replace workout");
    }
  };

  const handleRefreshFromTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the current template_id from the schedule
      const { data: scheduleData } = await supabase
        .from("program_schedule")
        .select("template_id")
        .eq("id", programScheduleId)
        .single();

      if (!scheduleData?.template_id) {
        setError("No template assigned to this schedule");
        return;
      }

      // Delete existing progression rules
      await ProgramProgressionService.deleteProgressionRules(
        programScheduleId,
        weekNumber
      );

      // Re-copy workout data with updated fields
      const success = await ProgramProgressionService.copyWorkoutToProgram(
        programId,
        programScheduleId,
        scheduleData.template_id,
        weekNumber
      );

      if (success) {
        await loadRules();
        onUpdate?.();
      } else {
        setError("Failed to refresh from template");
      }
    } catch (err: any) {
      console.error("Error refreshing from template:", err);
      setError(err?.message || "Failed to refresh from template");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const buildDisplayExercise = (block: BlockFormState) => {
    const exerciseData: any = {
      ...block.formValue,
      exercise_type: block.blockType,
      block_name: block.blockName,
      block_order: block.blockOrder,
    };

    if (!exerciseData.exercise && exerciseData.exercise_id) {
      exerciseData.exercise = findExerciseMeta(exerciseData.exercise_id);
    }

    if (exerciseData.superset_exercise_id && !exerciseData.superset_exercise) {
      exerciseData.superset_exercise = findExerciseMeta(
        exerciseData.superset_exercise_id
      );
    }

    if (
      Array.isArray(exerciseData.giant_set_exercises) &&
      exerciseData.giant_set_exercises.length > 0
    ) {
      exerciseData.giant_set_exercises = exerciseData.giant_set_exercises.map(
        (item: any) => ({
          ...item,
          exercise:
            item.exercise || findExerciseMeta(item.exercise_id) || undefined,
        })
      );
    }

    return exerciseData;
  };

  return (
    <div className="space-y-6">
      {/* Header with placeholder indicator and Replace Workout button */}
      <div className="flex items-center justify-between">
        {isPlaceholder && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex-1 mr-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <AlertCircle className="w-5 h-5" />
              <span>
                Showing Week 1 data as placeholders. Edit any field to create
                Week {weekNumber} specific rules.
              </span>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshFromTemplate}
            className="flex-shrink-0"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh from Template
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowReplaceWorkout(true)}
            className="flex-shrink-0"
          >
            <Replace className="w-4 h-4 mr-2" />
            Replace Workout
          </Button>
        </div>
      </div>

      {blockForms.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <p>
            No progression rules found. Assign a workout template to this
            program day.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {blockForms.map((block, index) => {
            const exerciseData = buildDisplayExercise(block);
            return (
              <ExerciseBlockCard
                key={block.key}
                exercise={exerciseData}
                index={index}
                availableExercises={exercises}
                renderMode="form"
              >
                <ExerciseDetailForm
                  exercise={{
                    ...block.formValue,
                    // Ensure all fields are properly passed
                    load_percentage: block.formValue.load_percentage || undefined,
                    weight_kg: block.formValue.weight_kg || undefined,
                  }}
                  onChange={(updated) => {
                    console.log(`[ProgressionRulesEditor] Form changed for ${block.blockType}:`, {
                      load_percentage: updated.load_percentage,
                      weight_kg: updated.weight_kg,
                      sets: updated.sets,
                      reps: updated.reps,
                    });
                    handleBlockChange(block.key, updated);
                  }}
                  availableExercises={exercises}
                  mode="inline"
                  allowTypeChange={false}
                  allowStructureEditing={false}
                />
              </ExerciseBlockCard>
            );
          })}
        </div>
      )}

      {/* Save Button */}
      {hasPendingChanges && (
        <div className="sticky bottom-4 flex justify-center">
          <Button
            size="lg"
            onClick={saveChanges}
            disabled={saving}
            className="bg-gradient-to-r from-purple-500 to-orange-500 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Changes ({pendingChangeCount})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Replace Workout Modal */}
      {showReplaceWorkout && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4">Replace Workout</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select a new workout template to replace the current one. This
                will delete all current progression rules and copy the new
                template.
              </p>
              <div className="space-y-4">
                <div>
                  <Label>Select Workout Template</Label>
                  <Select
                    onValueChange={(value) => {
                      if (value) {
                        handleReplaceWorkout(value);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => setShowReplaceWorkout(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
