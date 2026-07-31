"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import type { GoalCreationPayload } from "@/lib/goalCreationService";
import { WizardNotice } from "./WizardNotice";
import { ENDURANCE_DEFERRED_NOTICE } from "./wizardCopy";
import {
  WizardFieldLabel,
  WizardFormActions,
  WizardHint,
  WizardOptionChip,
  WizardSectionLabel,
  wizardInputClass,
  wizardSelectClass,
  wizardTextareaClass,
} from "./wizardUi";

const LB_TO_KG = 0.45359237;

type PerfSub = "strength_pr" | "endurance";

export function PerformanceForm({
  onSubmit,
  onBack,
  submitting,
}: {
  onSubmit: (p: GoalCreationPayload) => void | Promise<void>;
  onBack: () => void;
  submitting: boolean;
}) {
  const [subType, setSubType] = useState<PerfSub>("strength_pr");

  const [exSearch, setExSearch] = useState("");
  const [exResults, setExResults] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState("");

  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [targetWeight, setTargetWeight] = useState("");

  const [enduranceTitle, setEnduranceTitle] = useState("");
  /** Weekly workout count target (auto-synced from workout logs). */
  const [enduranceWeeklyWorkouts, setEnduranceWeeklyWorkouts] = useState("4");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  const runExerciseSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setExResults([]);
      return;
    }
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name")
      .ilike("name", `%${q.trim()}%`)
      .eq("is_active", true)
      .order("name")
      .limit(12);

    if (error) {
      console.error("[PerformanceForm] exercise search:", error);
      setExResults([]);
      return;
    }
    setExResults(data || []);
  }, []);

  useEffect(() => {
    if (subType !== "strength_pr") return;
    const t = setTimeout(() => runExerciseSearch(exSearch), 250);
    return () => clearTimeout(t);
  }, [exSearch, subType, runExerciseSearch]);

  const pickExercise = (row: { id: string; name: string }) => {
    setExerciseId(row.id);
    setExerciseName(row.name);
    setExSearch(row.name);
    setExResults([]);
  };

  const strengthTitle = () => {
    const n = parseFloat(targetWeight);
    if (!exerciseName || !Number.isFinite(n)) return "";
    const display = `${n}${weightUnit}`;
    return `${exerciseName} ${display}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (subType === "strength_pr") {
      const n = parseFloat(targetWeight);
      if (!exerciseId || !Number.isFinite(n)) return;
      const kg = weightUnit === "lbs" ? n * LB_TO_KG : n;
      const title = strengthTitle();
      if (!title.trim()) return;

      await onSubmit({
        category: "performance",
        title: title.trim(),
        target_value: Math.round(kg * 1000) / 1000,
        target_unit: "kg",
        target_date: targetDate || null,
        notes: notes.trim() || null,
        source_type: "personal_record",
        source_config: { exercise_id: exerciseId },
        direction: "increase",
      });
      return;
    }

    if (!enduranceTitle.trim()) return;
    const w = parseInt(enduranceWeeklyWorkouts, 10);
    if (!Number.isFinite(w) || w < 1 || w > 21) return;
    await onSubmit({
      category: "performance",
      title: enduranceTitle.trim(),
      target_value: w,
      target_unit: "workouts/week",
      target_date: targetDate || null,
      notes: notes.trim() || null,
      source_type: "workout_count",
      source_config: { window: "weekly" },
      direction: "increase",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset>
        <WizardSectionLabel>Type</WizardSectionLabel>
        <WizardOptionChip
          name="perf-type"
          value={subType}
          onChange={setSubType}
          options={[
            {
              value: "strength_pr",
              label: "Strength PR",
              hint: "Lift target for an exercise",
            },
            {
              value: "endurance",
              label: "Endurance / speed",
              hint: "Weekly workout cadence",
            },
          ]}
        />
      </fieldset>

      {subType === "strength_pr" ? (
        <>
          <div className="relative">
            <WizardFieldLabel>Exercise</WizardFieldLabel>
            <Input
              value={exSearch}
              onChange={(e) => {
                setExSearch(e.target.value);
                setExerciseId(null);
              }}
              placeholder="Search e.g. bench"
              className={wizardInputClass}
              autoComplete="off"
            />
            {exResults.length > 0 ? (
              <ul className="absolute z-10 mt-1.5 max-h-48 w-full overflow-auto rounded-[11px] border border-[color:var(--fc-hairline)] bg-[color:var(--fc-bg-deep)] shadow-lg">
                {exResults.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2.5 text-left text-sm fc-text-primary transition-colors hover:bg-[color:var(--fc-surface-tint)]"
                      onClick={() => pickExercise(row)}
                    >
                      {row.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {exerciseId ? (
              <WizardHint>Selected: {exerciseName}</WizardHint>
            ) : null}
          </div>

          <div>
            <WizardFieldLabel>Target weight</WizardFieldLabel>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.5"
                min={0}
                required
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className={`flex-1 ${wizardInputClass}`}
              />
              <select
                value={weightUnit}
                onChange={(e) =>
                  setWeightUnit(e.target.value as "kg" | "lbs")
                }
                className={wizardSelectClass}
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
            <div className="mt-1.5">
              <WizardHint>Progress direction is increase (PR).</WizardHint>
            </div>
          </div>
        </>
      ) : (
        <>
          <WizardNotice>{ENDURANCE_DEFERRED_NOTICE}</WizardNotice>
          <WizardHint>
            Progress is tracked from completed workouts each week (same engine
            as strength goals sync).
          </WizardHint>
          <div>
            <WizardFieldLabel>Title</WizardFieldLabel>
            <Input
              value={enduranceTitle}
              onChange={(e) => setEnduranceTitle(e.target.value)}
              required
              placeholder="e.g. 5K under 28 minutes"
              className={wizardInputClass}
            />
          </div>
          <div>
            <WizardFieldLabel>Target workouts per week (1–21)</WizardFieldLabel>
            <Input
              type="number"
              min={1}
              max={21}
              step={1}
              required
              value={enduranceWeeklyWorkouts}
              onChange={(e) => setEnduranceWeeklyWorkouts(e.target.value)}
              className={wizardInputClass}
            />
          </div>
        </>
      )}

      <div>
        <WizardFieldLabel>Target date (optional)</WizardFieldLabel>
        <Input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className={wizardInputClass}
        />
      </div>

      <div>
        <WizardFieldLabel>Notes (optional)</WizardFieldLabel>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={wizardTextareaClass}
        />
      </div>

      <WizardFormActions onBack={onBack} submitting={submitting} />
    </form>
  );
}
