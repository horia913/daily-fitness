"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import type { GoalCreationPayload } from "@/lib/goalCreationService";
import { WizardNotice } from "./WizardNotice";
import { ENDURANCE_DEFERRED_NOTICE } from "./wizardCopy";

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
  const [exResults, setExResults] = useState<{ id: string; name: string }[]>([]);
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
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wider fc-text-dim mb-2">Type</legend>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 cursor-pointer has-[:checked]:border-[color:var(--fc-accent-cyan)]">
            <input
              type="radio"
              name="perf-sub"
              checked={subType === "strength_pr"}
              onChange={() => setSubType("strength_pr")}
              className="accent-[color:var(--fc-accent-cyan)]"
            />
            <span className="text-sm fc-text-primary">Strength PR</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 cursor-pointer has-[:checked]:border-[color:var(--fc-accent-cyan)]">
            <input
              type="radio"
              name="perf-sub"
              checked={subType === "endurance"}
              onChange={() => setSubType("endurance")}
              className="accent-[color:var(--fc-accent-cyan)]"
            />
            <span className="text-sm fc-text-primary">Endurance / speed</span>
          </label>
        </div>
      </fieldset>

      {subType === "strength_pr" ? (
        <>
          <div className="space-y-2 relative">
            <Label className="text-sm fc-text-subtle">Exercise</Label>
            <Input
              value={exSearch}
              onChange={(e) => {
                setExSearch(e.target.value);
                setExerciseId(null);
              }}
              placeholder="Search e.g. bench"
              className="rounded-xl border-[color:var(--fc-glass-border)]"
              autoComplete="off"
            />
            {exResults.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface)] shadow-lg">
                {exResults.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[color:var(--fc-glass-highlight)] fc-text-primary"
                      onClick={() => pickExercise(row)}
                    >
                      {row.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {exerciseId ? (
              <p className="text-xs fc-text-dim">Selected: {exerciseName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-sm fc-text-subtle">Target weight</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.5"
                min={0}
                required
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className="flex-1 rounded-xl border-[color:var(--fc-glass-border)]"
              />
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as "kg" | "lbs")}
                className="rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface)] px-2 text-sm fc-text-primary"
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
            <p className="text-xs fc-text-dim">Progress direction is increase (PR).</p>
          </div>
        </>
      ) : (
        <>
          <WizardNotice>{ENDURANCE_DEFERRED_NOTICE}</WizardNotice>
          <p className="text-xs fc-text-dim">
            Progress is tracked from completed workouts each week (same engine as strength goals sync).
          </p>
          <div className="space-y-2">
            <Label className="text-sm fc-text-subtle">Title</Label>
            <Input
              value={enduranceTitle}
              onChange={(e) => setEnduranceTitle(e.target.value)}
              required
              placeholder="e.g. 5K under 28 minutes"
              className="rounded-xl border-[color:var(--fc-glass-border)]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm fc-text-subtle">Target workouts per week (1–21)</Label>
            <Input
              type="number"
              min={1}
              max={21}
              step={1}
              required
              value={enduranceWeeklyWorkouts}
              onChange={(e) => setEnduranceWeeklyWorkouts(e.target.value)}
              className="rounded-xl border-[color:var(--fc-glass-border)]"
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label className="text-sm fc-text-subtle">Target date (optional)</Label>
        <Input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="rounded-xl border-[color:var(--fc-glass-border)]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm fc-text-subtle">Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-xl border-[color:var(--fc-glass-border)]"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button type="submit" className="flex-1 fc-btn fc-btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Create goal"}
        </Button>
      </div>
    </form>
  );
}
