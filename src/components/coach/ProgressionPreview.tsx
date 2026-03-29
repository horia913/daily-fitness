"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ProgramProgressionRule } from "@/lib/programProgressionService";
import type { ProgressionProfile } from "@/types/trainingBlock";
import { PROGRESSION_PROFILES } from "@/types/trainingBlock";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  GeneratedWeekRules,
  ProgressionChange,
  GenerationResult,
} from "@/lib/progressionGenerator";
import { TIER_3_SKIP } from "@/lib/progressionGenerator";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrescribedRpeLabel } from "@/lib/workoutTargetIntensity";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressionPreviewProps {
  weekRules: GeneratedWeekRules[];
  summary: GenerationResult["summary"];
  profile: ProgressionProfile;
  hasExistingWeeks: boolean;
  onApply: () => Promise<void>;
  onEditManually: () => void;
  isApplying: boolean;

  // Exercise selection controls
  progressExercises: Set<string>;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSetExerciseIncluded: (setEntryId: string, included: boolean) => void;
}

/** A single rendered item in the changes column: value text + optional delta. */
interface ChangeItem {
  value: string;
  delta?: string;
}

type R = ProgramProgressionRule & Record<string, any>;

/** `rule.rir` is prescribed RPE; display the DB value as-is (no math). */
function coachRpeDisplay(rirColumn: number | string | null | undefined): string {
  return formatPrescribedRpeLabel(rirColumn) ?? "";
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SET_TYPE_SHORT: Record<string, string> = {
  straight_set: "Straight Set",
  superset: "Superset",
  giant_set: "Giant Set",
  pre_exhaustion: "Pre-Exhaust",
  cluster_set: "Cluster",
  rest_pause: "Rest-Pause",
  drop_set: "Drop Set",
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For Time",
  tabata: "Tabata",
};

// ─── Change-item builder ──────────────────────────────────────────────────────

/**
 * Build the list of {value, delta} pairs for a rule's changes column.
 * Returns an empty array when nothing changed (caller renders em-dash).
 */
function buildChangeItems(rule: R, allChanges: ProgressionChange[]): ChangeItem[] {
  const name: string = rule.exercise?.name ?? "Exercise";
  const setEntryId = rule.set_entry_id as string | undefined;
  /** Match change rows to this rule (prefer set_entry_id; fallback to name for legacy data). */
  const matchesRule = (c: ProgressionChange): boolean => {
    if (setEntryId && c.set_entry_id) return c.set_entry_id === setEntryId;
    return c.exerciseName === name;
  };
  const items: ChangeItem[] = [];

  /** First non-cycle change for a field, or undefined. */
  const fc = (field: string): ProgressionChange | undefined =>
    allChanges.find(
      (c) => matchesRule(c) && c.field === field && !c.isCycleEvent,
    );

  const ch = (field: string): boolean => !!fc(field);

  const cycleChange = allChanges.find(
    (c) => matchesRule(c) && c.isCycleEvent,
  );
  const isCycle = !!cycleChange;
  // Weight bumped during cycle iff the description includes "kg" (e.g. "weight 60→61.5kg")
  const cycleHasWeight =
    isCycle && (cycleChange?.changeDescription.includes("kg") ?? false);

  switch (rule.set_type) {
    case "straight_set":
    case "giant_set": {
      if (isCycle || ch("sets") || ch("reps")) {
        const setsStr = rule.sets != null ? `${rule.sets}` : null;
        const repsStr = rule.reps != null ? `${rule.reps}` : null;
        const value = [setsStr, repsStr].filter(Boolean).join("×");
        items.push({
          value: value || "—",
          delta: isCycle
            ? "+1set, reset"
            : fc("reps")?.changeDescription ?? fc("sets")?.changeDescription ?? "",
        });
      }
      if (ch("weight_kg") || cycleHasWeight) {
        items.push({
          value: `${rule.weight_kg}kg`,
          delta: cycleHasWeight ? "+2.5%" : fc("weight_kg")!.changeDescription,
        });
      }
      if (ch("rir")) {
        items.push({
          value: coachRpeDisplay(rule.rir),
          delta: fc("rir")!.changeDescription,
        });
      }
      const restChg = fc("rest_seconds") ?? fc("rest_between_pairs");
      if (restChg) {
        const v = rule.rest_seconds ?? rule.rest_between_pairs;
        if (v != null) items.push({ value: `Rest ${v}s`, delta: restChg.changeDescription });
      }
      break;
    }

    case "superset": {
      const r1 = fc("first_exercise_reps");
      const r2 = fc("second_exercise_reps");
      const sc = fc("sets");
      if (isCycle || r1 || r2 || sc) {
        // Always read both rep values from the rule (never show "?")
        const a = rule.first_exercise_reps;
        const b = rule.second_exercise_reps;
        const setsLabel = rule.sets != null ? `${rule.sets} set${rule.sets !== 1 ? "s" : ""}` : null;
        const repsLabel = [a, b].filter((v) => v != null).join(" / ");
        const value = [setsLabel, repsLabel ? `${repsLabel} reps` : null]
          .filter(Boolean)
          .join(" × ");
        let delta: string;
        if (isCycle) delta = "+1set, reset";
        else if (r1 && r2) delta = "+1rep each";
        else if (r1) delta = "+1 rep ex.1";
        else if (r2) delta = "+1 rep ex.2";
        else delta = sc?.changeDescription ?? "";
        items.push({ value, delta });
      }
      if (ch("rir")) {
        items.push({
          value: coachRpeDisplay(rule.rir),
          delta: fc("rir")!.changeDescription,
        });
      }
      const rbc = fc("rest_between_pairs");
      if (rbc && rule.rest_between_pairs != null) {
        items.push({ value: `Rest ${rule.rest_between_pairs}s`, delta: rbc.changeDescription });
      }
      break;
    }

    case "pre_exhaustion": {
      const isoC = fc("isolation_reps");
      const cmpC = fc("compound_reps");
      const sc = fc("sets");
      if (isCycle || isoC || cmpC || sc) {
        // Always read both rep values from the rule (never show "?")
        const iso = rule.isolation_reps;
        const cmp = rule.compound_reps;
        const setsLabel = rule.sets != null ? `${rule.sets} set${rule.sets !== 1 ? "s" : ""}` : null;
        const isoPart = iso != null ? `${iso} iso` : null;
        const cmpPart = cmp != null ? `${cmp} compound` : null;
        const repsPart = [isoPart, cmpPart].filter(Boolean).join(" / ");
        const value = [setsLabel, repsPart].filter(Boolean).join(" × ");
        let delta: string;
        if (isCycle) delta = "+1set, reset";
        else if (isoC && cmpC) delta = "+1 iso, +1 compound";
        else if (isoC) delta = "+1 iso rep";
        else if (cmpC) delta = "+1 compound rep";
        else delta = sc?.changeDescription ?? "";
        items.push({ value, delta });
      }
      if (ch("rir")) {
        items.push({
          value: coachRpeDisplay(rule.rir),
          delta: fc("rir")!.changeDescription,
        });
      }
      const preRbc = fc("rest_between_pairs");
      if (preRbc && rule.rest_between_pairs != null) {
        items.push({ value: `Rest ${rule.rest_between_pairs}s`, delta: preRbc.changeDescription });
      }
      break;
    }

    case "cluster_set": {
      const clRepsC = fc("reps_per_cluster");
      if (clRepsC && rule.reps_per_cluster != null) {
        items.push({ value: `${rule.reps_per_cluster} reps per cluster`, delta: "+1 rep" });
      }
      const intraC = fc("intra_cluster_rest");
      if (intraC && rule.intra_cluster_rest != null) {
        items.push({ value: `${rule.intra_cluster_rest}s intra-cluster rest`, delta: intraC.changeDescription });
      }
      if (ch("weight_kg")) {
        items.push({ value: `${rule.weight_kg}kg`, delta: fc("weight_kg")!.changeDescription });
      }
      if (ch("sets")) {
        items.push({ value: `${rule.sets} sets`, delta: fc("sets")!.changeDescription });
      }
      if (ch("rir")) {
        items.push({
          value: coachRpeDisplay(rule.rir),
          delta: fc("rir")!.changeDescription,
        });
      }
      const clRestC = fc("rest_seconds");
      if (clRestC && rule.rest_seconds != null) {
        items.push({ value: `Rest ${rule.rest_seconds}s`, delta: clRestC.changeDescription });
      }
      break;
    }

    case "rest_pause": {
      if (ch("sets") || ch("reps")) {
        const setsStr = rule.sets != null ? `${rule.sets}` : null;
        const repsStr = rule.reps != null ? `${rule.reps}` : null;
        const value = [setsStr, repsStr].filter(Boolean).join("×");
        items.push({
          value: value || "—",
          delta: fc("reps")?.changeDescription ?? fc("sets")?.changeDescription ?? "",
        });
      }
      if (ch("weight_kg")) {
        items.push({ value: `${rule.weight_kg}kg`, delta: fc("weight_kg")!.changeDescription });
      }
      const rpDurC = fc("rest_pause_duration");
      if (rpDurC && rule.rest_pause_duration != null) {
        items.push({ value: `RP ${rule.rest_pause_duration}s`, delta: rpDurC.changeDescription });
      }
      if (ch("rir")) {
        items.push({
          value: coachRpeDisplay(rule.rir),
          delta: fc("rir")!.changeDescription,
        });
      }
      break;
    }

    case "drop_set": {
      if (ch("sets") || ch("exercise_reps")) {
        const setsStr = rule.sets != null ? `${rule.sets}` : null;
        const repsStr = rule.exercise_reps != null ? `${rule.exercise_reps}` : null;
        const value = [setsStr, repsStr].filter(Boolean).join("×");
        items.push({
          value: value || "—",
          delta:
            fc("exercise_reps")?.changeDescription ??
            fc("sets")?.changeDescription ??
            "",
        });
      }
      if (ch("weight_kg")) {
        const reduction = rule.weight_reduction_percentage;
        items.push({
          value:
            reduction != null
              ? `${rule.weight_kg}kg → ${reduction}%`
              : `${rule.weight_kg}kg`,
          delta: fc("weight_kg")!.changeDescription,
        });
      }
      if (ch("rir")) {
        items.push({
          value: coachRpeDisplay(rule.rir),
          delta: fc("rir")!.changeDescription,
        });
      }
      break;
    }

    default:
      break;
  }

  return items;
}

function buildBaselineItems(rule: R): ChangeItem[] {
  const items: ChangeItem[] = [];
  const setsStr =
    rule.sets != null ? `${rule.sets}` : null;

  const add = (value: string) => {
    if (!value) return;
    items.push({ value });
  };

  switch (rule.set_type) {
    case "straight_set":
    case "giant_set": {
      const repsStr = rule.reps != null ? `${rule.reps}` : null;
      const value = setsStr && repsStr ? `${setsStr}×${repsStr}` : null;
      if (value) add(value);
      if (rule.weight_kg != null) add(`${rule.weight_kg}kg`);
      if (rule.rir != null) add(coachRpeDisplay(rule.rir));
      if (rule.rest_seconds != null) add(`Rest ${rule.rest_seconds}s`);
      break;
    }
    case "superset": {
      const repsA =
        rule.first_exercise_reps != null ? `${rule.first_exercise_reps}` : null;
      const repsB =
        rule.second_exercise_reps != null ? `${rule.second_exercise_reps}` : null;
      const repsPart =
        repsA && repsB ? `${repsA} / ${repsB}` : repsA ?? repsB ?? null;
      const setsPart = setsStr ? `${setsStr} set${rule.sets === 1 ? "" : "s"}` : null;
      const value =
        setsPart && repsPart ? `${setsPart} × ${repsPart} reps` : null;
      if (value) add(value);
      if (rule.weight_kg != null) add(`${rule.weight_kg}kg`);
      if (rule.rir != null) add(coachRpeDisplay(rule.rir));
      if (rule.rest_between_pairs != null)
        add(`Rest ${rule.rest_between_pairs}s`);
      break;
    }
    case "pre_exhaustion": {
      const iso = rule.isolation_reps != null ? `${rule.isolation_reps}` : null;
      const cmp = rule.compound_reps != null ? `${rule.compound_reps}` : null;
      const repsPart = [iso ? `${iso} iso` : null, cmp ? `${cmp} compound` : null]
        .filter(Boolean)
        .join(" / ");
      const setsPart = setsStr ? `${setsStr} set${rule.sets === 1 ? "" : "s"}` : null;
      const value =
        setsPart && repsPart ? `${setsPart} × ${repsPart}` : null;
      if (value) add(value);
      if (rule.weight_kg != null) add(`${rule.weight_kg}kg`);
      if (rule.rir != null) add(coachRpeDisplay(rule.rir));
      if (rule.rest_between_pairs != null)
        add(`Rest ${rule.rest_between_pairs}s`);
      break;
    }
    case "cluster_set": {
      if (rule.reps_per_cluster != null) {
        add(`${rule.reps_per_cluster} reps per cluster`);
      }
      if (rule.intra_cluster_rest != null) {
        add(`${rule.intra_cluster_rest}s intra-cluster rest`);
      }
      if (rule.weight_kg != null) add(`${rule.weight_kg}kg`);
      if (rule.sets != null) add(`${rule.sets} sets`);
      if (rule.rir != null) add(coachRpeDisplay(rule.rir));
      if (rule.rest_seconds != null) add(`Rest ${rule.rest_seconds}s`);
      break;
    }
    case "rest_pause": {
      const repsStr = rule.reps != null ? `${rule.reps}` : null;
      const value = setsStr && repsStr ? `${setsStr}×${repsStr}` : null;
      if (value) add(value);
      if (rule.weight_kg != null) add(`${rule.weight_kg}kg`);
      if (rule.rest_pause_duration != null) add(`RP ${rule.rest_pause_duration}s`);
      if (rule.rir != null) add(coachRpeDisplay(rule.rir));
      if (rule.rest_seconds != null) add(`Rest ${rule.rest_seconds}s`);
      break;
    }
    case "drop_set": {
      const repsStr = rule.exercise_reps != null ? `${rule.exercise_reps}` : null;
      const value = setsStr && repsStr ? `${setsStr}×${repsStr}` : null;
      if (value) add(value);
      if (rule.weight_kg != null) add(`${rule.weight_kg}kg`);
      if (rule.rir != null) add(coachRpeDisplay(rule.rir));
      break;
    }
    default:
      break;
  }

  return items;
}

// ─── Sub-component: changes cell ─────────────────────────────────────────────

function ChangesCell({
  items,
  valueClass,
  mutedClass,
}: {
  items: ChangeItem[];
  valueClass: string;
  mutedClass: string;
}) {
  if (items.length === 0) {
    return <span className={mutedClass}>—</span>;
  }
  return (
    <>
      {items.map((item, i) => (
        <span key={i} className="whitespace-nowrap">
          {i > 0 && <span className="inline-block w-3" />}
          <span className={valueClass}>{item.value}</span>
          {item.delta && (
            <span className="text-emerald-400"> ({item.delta})</span>
          )}
        </span>
      ))}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProgressionPreview({
  weekRules,
  summary,
  profile,
  hasExistingWeeks,
  onApply,
  onEditManually,
  isApplying,
  progressExercises,
  onSelectAll,
  onDeselectAll,
  onSetExerciseIncluded,
}: ProgressionPreviewProps) {
  const { isDark } = useTheme();

  // Expanded by default for ≤4-week blocks (weekRules has ≤3 items)
  const [expanded, setExpanded] = useState(weekRules.length <= 4);
  const [activeWeek, setActiveWeek] = useState(weekRules[0]?.weekNumber ?? 2);
  const [unchangedOpen, setUnchangedOpen] = useState(false);

  const activeWeekData =
    weekRules.find((w) => w.weekNumber === activeWeek) ?? weekRules[0];

  // All Tier 1/2 exercises shown in the table (including those with no changes this week)
  const tableExercises = (activeWeekData?.rules ?? []).filter(
    (r) => !TIER_3_SKIP.has(r.set_type),
  );

  // Tier 3 exercises (static — shown only in the collapsed section)
  const tier3Exercises = (weekRules[0]?.rules ?? []).filter((r) =>
    TIER_3_SKIP.has(r.set_type),
  );

  const { autoProgressed, unchanged, unchangedTypes } = summary;
  const tier3Count = tier3Exercises.length;
  const tier3Types = Array.from(
    new Set(tier3Exercises.map((r) => r.set_type)),
  );
  const summaryLine = [
    autoProgressed > 0 ? `${autoProgressed} progressed` : null,
    unchanged > 0 ? `${unchanged} unchanged` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const mutedText = isDark ? "text-gray-500" : "text-gray-500";
  const nameText = isDark ? "text-gray-200" : "text-gray-800";
  const valueText = isDark ? "text-gray-200" : "text-gray-700";
  const weekTabActive =
    "bg-[color:var(--fc-domain-workouts)]/25 text-[color:var(--fc-text-primary)] ring-1 ring-[color:var(--fc-domain-workouts)]/40";
  const weekTabInactive = isDark
    ? "bg-white/5 text-gray-400 hover:bg-white/10"
    : "bg-black/[0.04] text-gray-600 hover:bg-black/[0.06]";

  return (
    <div className="border-t border-black/5 dark:border-white/5 mt-3 pt-2">
      {/* Collapsible header — one line + chevron, no card */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-2 py-1.5 text-left min-h-9"
      >
        <span className="text-sm font-semibold text-[color:var(--fc-text-primary)] truncate">
          Progression Preview · {PROGRESSION_PROFILES[profile]}
        </span>
        {expanded ? (
          <ChevronDown className={`w-4 h-4 shrink-0 ${mutedText}`} />
        ) : (
          <ChevronRight className={`w-4 h-4 shrink-0 ${mutedText}`} />
        )}
      </button>
      {expanded && summaryLine && (
        <p className={`text-xs ${mutedText} -mt-0.5 mb-2`}>{summaryLine}</p>
      )}

      {expanded && (
        <div className="pb-2">
          {/* Overwrite warning — compact inline alert */}
          {hasExistingWeeks && (
            <p className="text-xs text-amber-600 dark:text-amber-400/95 mb-2 pl-2 border-l-2 border-amber-500/70 leading-snug">
              Weeks 2–
              {weekRules.length
                ? weekRules[weekRules.length - 1].weekNumber
                : 2}{" "}
              already have data — applying will overwrite.
            </p>
          )}

          {/* Week pills — no outer card/padding shell */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {weekRules.map((gw) => (
              <button
                key={gw.weekNumber}
                type="button"
                onClick={() => setActiveWeek(gw.weekNumber)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                  activeWeek === gw.weekNumber
                    ? weekTabActive
                    : weekTabInactive
                }`}
              >
                Wk {gw.weekNumber}
              </button>
            ))}
          </div>

          {tableExercises.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0 mb-2">
              <button
                type="button"
                className="text-xs font-medium text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)] underline-offset-2 hover:underline"
                onClick={onSelectAll}
              >
                Select all
              </button>
              <span className="text-xs text-[color:var(--fc-text-dim)]">·</span>
              <button
                type="button"
                className="text-xs font-medium text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)] underline-offset-2 hover:underline"
                onClick={onDeselectAll}
              >
                Deselect all
              </button>
            </div>
          )}

          <div>
            {tableExercises.length === 0 ? (
              <p className={`px-3 py-2 text-sm ${mutedText}`}>No exercises.</p>
            ) : (() => {
              // Build consecutive groups preserving order
              const groups: { setType: string; exercises: typeof tableExercises }[] = [];
              for (const rule of tableExercises) {
                const last = groups[groups.length - 1];
                if (last && last.setType === rule.set_type) {
                  last.exercises.push(rule);
                } else {
                  groups.push({ setType: rule.set_type, exercises: [rule] });
                }
              }
              const weekChanges = activeWeekData?.changes ?? [];

              return groups.map((group, gi) => (
                <div key={gi}>
                  <div
                    className={`${gi === 0 ? "pt-0" : "pt-2"} pb-0`}
                  >
                    <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide block mb-1">
                      {SET_TYPE_SHORT[group.setType] ?? group.setType}
                    </span>
                  </div>

                  {group.exercises.map((rule, rowIdx) => {
                    const r = rule as R;
                    const name = rule.exercise?.name ?? "Exercise";
                    const setEntryId = r.set_entry_id;
                    const included = setEntryId ? progressExercises.has(setEntryId) : true;
                    const hasCycle = weekChanges.some((c) => {
                      if (!c.isCycleEvent) return false;
                      if (setEntryId && c.set_entry_id)
                        return c.set_entry_id === setEntryId;
                      return c.exerciseName === name;
                    });
                    const changeItems = buildChangeItems(r, weekChanges);
                    const items = included
                      ? changeItems.length > 0
                        ? changeItems
                        : buildBaselineItems(r)
                      : buildBaselineItems(r);
                    return (
                      <div
                        key={rowIdx}
                        className="border-b border-black/5 dark:border-white/5 last:border-b-0"
                      >
                        <div className="hidden md:flex items-center py-2 gap-2 min-w-0">
                          <div className="w-1/2 flex items-center gap-1.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {setEntryId ? (
                                <>
                                  <Checkbox
                                    className="h-3.5 w-3.5"
                                    checked={included}
                                    onCheckedChange={(v) =>
                                      onSetExerciseIncluded(
                                        setEntryId,
                                        v === true,
                                      )
                                    }
                                  />
                                  <Select
                                    value={included ? "primary" : "maintenance"}
                                    onValueChange={(val) =>
                                      onSetExerciseIncluded(
                                        setEntryId,
                                        val === "primary",
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-7 min-h-7 w-[7.25rem] text-xs px-2 py-0 [&>span]:truncate border-[color:var(--fc-glass-border)] bg-transparent">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="primary" className="text-xs">Primary</SelectItem>
                                      <SelectItem value="maintenance" className="text-xs">Maintenance</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </>
                              ) : null}
                            </div>
                            <span
                              className={`w-4 shrink-0 text-sm text-amber-400 ${hasCycle ? "" : "invisible"}`}
                              title={
                                hasCycle
                                  ? "Volume cycle: sets increased, reps reset, weight bumped"
                                  : undefined
                              }
                            >
                              ⚡
                            </span>
                            <span className={`text-xs sm:text-sm ${nameText} truncate`}>
                              {name}
                            </span>
                            {!included && (
                              <span className="text-[11px] text-gray-500 ml-1 shrink-0">
                                (excluded)
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 text-xs flex flex-wrap items-center gap-y-0.5">
                            <ChangesCell
                              items={items}
                              valueClass={valueText}
                              mutedClass={mutedText}
                            />
                          </div>
                        </div>

                        <div className="md:hidden py-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            {setEntryId && (
                              <>
                                <Checkbox
                                  className="h-3.5 w-3.5"
                                  checked={included}
                                  onCheckedChange={(v) =>
                                    onSetExerciseIncluded(
                                      setEntryId,
                                      v === true,
                                    )
                                  }
                                />
                                <Select
                                  value={included ? "primary" : "maintenance"}
                                  onValueChange={(val) =>
                                    onSetExerciseIncluded(
                                      setEntryId,
                                      val === "primary",
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-7 min-h-7 w-[6.75rem] text-xs px-2 py-0 border-[color:var(--fc-glass-border)] bg-transparent">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="primary" className="text-xs">Primary</SelectItem>
                                    <SelectItem value="maintenance" className="text-xs">Maintenance</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                            <span
                              className={`shrink-0 text-xs text-amber-400 ${hasCycle ? "" : "invisible"}`}
                            >
                              ⚡
                            </span>
                            <span className={`text-xs ${nameText} truncate flex-1 min-w-0`}>
                              {name}
                            </span>
                          </div>
                          <div className="mt-1 pl-0 text-xs flex flex-wrap items-center gap-y-0.5">
                            <ChangesCell
                              items={items}
                              valueClass={valueText}
                              mutedClass={mutedText}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>

          {/* ── Unchanged (Tier 3) section ────────────────────────────── */}
          {tier3Exercises.length > 0 && (
            <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setUnchangedOpen((o) => !o)}
                className={`flex items-center gap-1.5 text-xs ${mutedText} hover:opacity-75 transition-opacity`}
              >
                <span>{unchangedOpen ? "▾" : "▸"}</span>
                <span>
                  {tier3Count} unchanged (
                  {tier3Types.map((t) => SET_TYPE_SHORT[t] ?? t).join(", ")})
                </span>
              </button>

              {unchangedOpen && (
                <div className="mt-1.5 pl-1">
                  <p className={`text-xs ${mutedText}`}>
                    {tier3Exercises
                      .map((r) => r.exercise?.name ?? "Exercise")
                      .join(", ")}
                  </p>
                  <p className={`text-xs ${mutedText} mt-1 italic`}>
                    Switch to week tab below to edit manually.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => onApply()}
              disabled={isApplying}
              className="h-8 text-xs rounded-lg"
            >
              {isApplying ? "Applying…" : "Apply Progression"}
            </Button>
            <button
              type="button"
              onClick={onEditManually}
              className={`text-xs underline underline-offset-2 ${mutedText} hover:text-[color:var(--fc-text-primary)]`}
            >
              Edit Manually Instead
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
