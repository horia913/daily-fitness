"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ProgramProgressionRule } from "@/lib/programProgressionService";
import type { ProgressionProfile } from "@/types/trainingBlock";
import { PROGRESSION_PROFILES } from "@/types/trainingBlock";
import type {
  GeneratedWeekRules,
  ProgressionChange,
  GenerationResult,
} from "@/lib/progressionGenerator";
import { TIER_3_SKIP } from "@/lib/progressionGenerator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressionPreviewProps {
  weekRules: GeneratedWeekRules[];
  summary: GenerationResult["summary"];
  profile: ProgressionProfile;
  hasExistingWeeks: boolean;
  onApply: () => Promise<void>;
  onEditManually: () => void;
  isApplying: boolean;
}

/** A single rendered item in the changes column: value text + optional delta. */
interface ChangeItem {
  value: string;
  delta?: string;
}

type R = ProgramProgressionRule & Record<string, any>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SET_TYPE_SHORT: Record<string, string> = {
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
  const items: ChangeItem[] = [];

  /** First non-cycle change for a field, or undefined. */
  const fc = (field: string): ProgressionChange | undefined =>
    allChanges.find(
      (c) => c.exerciseName === name && c.field === field && !c.isCycleEvent,
    );

  const ch = (field: string): boolean => !!fc(field);

  const cycleChange = allChanges.find(
    (c) => c.exerciseName === name && c.isCycleEvent,
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
        items.push({ value: `RIR ${rule.rir}`, delta: fc("rir")!.changeDescription });
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
        items.push({ value: `RIR ${rule.rir}`, delta: fc("rir")!.changeDescription });
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
        items.push({ value: `RIR ${rule.rir}`, delta: fc("rir")!.changeDescription });
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
        items.push({ value: `RIR ${rule.rir}`, delta: fc("rir")!.changeDescription });
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
        items.push({ value: `RIR ${rule.rir}`, delta: fc("rir")!.changeDescription });
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
        items.push({ value: `RIR ${rule.rir}`, delta: fc("rir")!.changeDescription });
      }
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
  const summaryLine = [
    autoProgressed > 0 ? `${autoProgressed} progressed` : null,
    unchanged > 0 ? `${unchanged} unchanged` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const containerCls = isDark
    ? "bg-gray-900/40 border-gray-700/50"
    : "bg-white/80 border-gray-200";
  const headerText = isDark ? "text-gray-100" : "text-gray-900";
  const mutedText = isDark ? "text-gray-500" : "text-gray-500";
  const nameText = isDark ? "text-gray-200" : "text-gray-800";
  const valueText = isDark ? "text-gray-200" : "text-gray-700";
  const rowOdd = isDark ? "bg-gray-800/20" : "bg-gray-100/40";
  const rowHover = isDark
    ? "hover:bg-gray-700/30"
    : "hover:bg-gray-200/50";
  const weekTabActive = "bg-blue-600 text-white";
  const weekTabInactive = isDark
    ? "bg-gray-700/50 text-gray-400 hover:bg-gray-600/50"
    : "bg-gray-200 text-gray-600 hover:bg-gray-300";

  return (
    <div className={`rounded-xl border overflow-hidden ${containerCls}`}>

      {/* ── Collapsible header ───────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start justify-between px-4 py-3 text-left"
      >
        <div className="flex flex-col gap-0.5">
          <span className={`font-semibold text-sm ${headerText}`}>
            Progression Preview — {PROGRESSION_PROFILES[profile]}
          </span>
          {summaryLine && (
            <span className={`text-xs ${mutedText}`}>{summaryLine}</span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className={`w-4 h-4 mt-0.5 shrink-0 ${mutedText}`} />
        ) : (
          <ChevronRight className={`w-4 h-4 mt-0.5 shrink-0 ${mutedText}`} />
        )}
      </button>

      {expanded && (
        <div className="pb-4">

          {/* ── Overwrite warning ──────────────────────────────────────── */}
          {hasExistingWeeks && (
            <div className="mx-4 mb-3 rounded-lg p-3 text-sm flex items-start gap-2 bg-amber-900/20 border border-amber-700/30 text-amber-400">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span>
                Weeks 2–
                {weekRules.length
                  ? weekRules[weekRules.length - 1].weekNumber
                  : 2}{" "}
                already have data. Applying will overwrite them.
              </span>
            </div>
          )}

          {/* ── Week tabs ─────────────────────────────────────────────── */}
          <div className="px-4 mb-3 flex flex-wrap gap-1.5">
            {weekRules.map((gw) => (
              <button
                key={gw.weekNumber}
                type="button"
                onClick={() => setActiveWeek(gw.weekNumber)}
                className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
                  activeWeek === gw.weekNumber
                    ? weekTabActive
                    : weekTabInactive
                }`}
              >
                Wk {gw.weekNumber}
              </button>
            ))}
          </div>

          {/* ── Exercise rows (grouped by set type) ──────────────────── */}
          <div className="px-1">
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
              // Pre-compute flat index offset per group for alternating row bg
              const offsets = groups.map((_, gi) =>
                groups.slice(0, gi).reduce((s, g) => s + g.exercises.length, 0),
              );
              const weekChanges = activeWeekData?.changes ?? [];
              const groupHeaderBg = isDark ? "bg-gray-700/40" : "bg-gray-200/60";

              return groups.map((group, gi) => (
                <div key={gi}>
                  {/* Group header */}
                  <div
                    className={`${gi === 0 ? "mt-0" : "mt-4"} mb-1 px-3 py-1.5 rounded ${groupHeaderBg}`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {SET_TYPE_SHORT[group.setType] ?? group.setType}
                    </span>
                  </div>

                  {/* Rows within this group */}
                  {group.exercises.map((rule, rowIdx) => {
                    const r = rule as R;
                    const name = rule.exercise?.name ?? "Exercise";
                    const hasCycle = weekChanges.some(
                      (c) => c.exerciseName === name && c.isCycleEvent,
                    );
                    const items = buildChangeItems(r, weekChanges);
                    const globalIdx = offsets[gi] + rowIdx;
                    const rowBg = globalIdx % 2 === 0 ? rowOdd : "";

                    return (
                      <div
                        key={rowIdx}
                        className={`${rowBg} ${rowHover} transition-colors rounded`}
                      >
                        {/* Desktop: 2-column row */}
                        <div className="hidden md:flex items-center py-2 px-3 gap-2">
                          {/* Column 1 — Exercise name */}
                          <div className="w-1/2 flex items-center gap-1.5 min-w-0">
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
                            <span className={`text-sm ${nameText} truncate`}>
                              {name}
                            </span>
                          </div>

                          {/* Column 2 — Changes */}
                          <div className="flex-1 min-w-0 text-sm flex flex-wrap items-center gap-y-0.5">
                            <ChangesCell
                              items={items}
                              valueClass={valueText}
                              mutedClass={mutedText}
                            />
                          </div>
                        </div>

                        {/* Mobile: 2-line layout */}
                        <div className="md:hidden py-2 px-3">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`shrink-0 text-sm text-amber-400 ${hasCycle ? "" : "invisible"}`}
                            >
                              ⚡
                            </span>
                            <span className={`text-sm ${nameText} truncate`}>
                              {name}
                            </span>
                          </div>
                          <div className="pl-5 mt-0.5 text-sm flex flex-wrap items-center gap-y-0.5">
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
            <div className="px-4 mt-4">
              <button
                type="button"
                onClick={() => setUnchangedOpen((o) => !o)}
                className={`flex items-center gap-1.5 text-sm ${mutedText} hover:opacity-75 transition-opacity`}
              >
                <span>{unchangedOpen ? "▾" : "▸"}</span>
                <span>
                  {unchanged} unchanged (
                  {unchangedTypes
                    .map((t) => SET_TYPE_SHORT[t] ?? t)
                    .join(", ")}
                  )
                </span>
              </button>

              {unchangedOpen && (
                <div className="mt-2 pl-4">
                  <p className={`text-sm ${mutedText}`}>
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

          {/* ── Action buttons ─────────────────────────────────────────── */}
          <div className="px-4 mt-4 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              onClick={() => onApply()}
              disabled={isApplying}
              className="rounded-xl"
            >
              {isApplying ? "Applying…" : "Apply Progression"}
            </Button>
            <button
              type="button"
              onClick={onEditManually}
              className={`text-sm underline ${mutedText}`}
            >
              Edit Manually Instead
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
