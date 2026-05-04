"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GoalCreationPayload } from "@/lib/goalCreationService";
import { WizardNotice } from "./WizardNotice";
import { AUTO_TRACKING_DEFERRED_NOTICE } from "./wizardCopy";

type NutSub = "calories" | "protein" | "water" | "meal_plan";
type Dir = "increase" | "decrease" | "maintain";

function autoTitle(sub: NutSub, value: number): string {
  if (sub === "calories") return `Daily calorie target: ${value} kcal`;
  if (sub === "protein") return `Daily protein target: ${value} g`;
  if (sub === "water") return `Daily water: ${value} L`;
  if (sub === "meal_plan") return `Meal plan adherence ${value}%`;
  return "";
}

export function NutritionForm({
  onSubmit,
  onBack,
  submitting,
}: {
  onSubmit: (p: GoalCreationPayload) => void | Promise<void>;
  onBack: () => void;
  submitting: boolean;
}) {
  const [subType, setSubType] = useState<NutSub>("calories");
  const [targetValue, setTargetValue] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [direction, setDirection] = useState<Dir>("maintain");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (subType === "water") setDirection("increase");
    else if (subType === "calories") setDirection("maintain");
    else if (subType === "protein") setDirection("increase");
    else if (subType === "meal_plan") setDirection("increase");
    setTitleTouched(false);
  }, [subType]);

  const parsed = parseFloat(targetValue);

  useEffect(() => {
    if (titleTouched) return;
    if (!Number.isFinite(parsed)) {
      setTitle("");
      return;
    }
    setTitle(autoTitle(subType, parsed));
  }, [subType, parsed, titleTouched]);

  const unitFor = (): string | null => {
    if (subType === "calories") return "kcal";
    if (subType === "protein") return "g";
    if (subType === "water") return "L";
    if (subType === "meal_plan") return "%";
    return null;
  };

  const dirToLink = (d: Dir): GoalCreationPayload["direction"] => d;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (subType === "meal_plan") {
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return;
      const t = (titleTouched ? title : autoTitle("meal_plan", parsed)).trim();
      if (!t) return;
      await onSubmit({
        category: "nutrition",
        title: t,
        target_value: parsed,
        target_unit: "%",
        target_date: targetDate || null,
        notes: notes.trim() || null,
        source_type: "meal_plan",
        source_config: { window_days: 7 },
        direction: "increase",
      });
      return;
    }

    if (!Number.isFinite(parsed)) return;
    const t = (titleTouched ? title : autoTitle(subType, parsed)).trim();
    if (!t) return;

    const macro =
      subType === "calories" ? "calories" : subType === "protein" ? "protein_g" : "water_l";

    await onSubmit({
      category: "nutrition",
      title: t,
      target_value: parsed,
      target_unit: unitFor(),
      target_date: targetDate || null,
      notes: notes.trim() || null,
      source_type: "meal_plan",
      source_config: {
        tracking: "daily_macro",
        macro,
        window_days: 7,
      },
      direction: dirToLink(direction),
    });
  };

  const showMacroFields = subType === "calories" || subType === "protein" || subType === "water";
  const showNotice = true;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wider fc-text-dim mb-2">Type</legend>
        <div className="flex flex-col gap-2">
          {(
            [
              ["calories", "Daily calorie target"],
              ["protein", "Daily protein target"],
              ["water", "Water intake"],
              ["meal_plan", "Meal plan adherence"],
            ] as const
          ).map(([v, lab]) => (
            <label
              key={v}
              className="flex items-center gap-2 rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 cursor-pointer has-[:checked]:border-[color:var(--fc-accent-cyan)]"
            >
              <input
                type="radio"
                name="nut-sub"
                checked={subType === v}
                onChange={() => setSubType(v)}
                className="accent-[color:var(--fc-accent-cyan)]"
              />
              <span className="text-sm fc-text-primary">{lab}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {showNotice ? <WizardNotice>{AUTO_TRACKING_DEFERRED_NOTICE}</WizardNotice> : null}

      {subType === "meal_plan" ? (
        <>
          <p className="text-xs fc-text-dim">Window: last 7 days (locked for now).</p>
          <div className="space-y-2">
            <Label className="text-sm fc-text-subtle">Target percentage (0–100)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              required
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="rounded-xl border-[color:var(--fc-glass-border)]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm fc-text-subtle">Title</Label>
            <Input
              value={title}
              onChange={(e) => {
                setTitleTouched(true);
                setTitle(e.target.value);
              }}
              required
              className="rounded-xl border-[color:var(--fc-glass-border)]"
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label className="text-sm fc-text-subtle">
              Target value ({unitFor()})
            </Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              required
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="rounded-xl border-[color:var(--fc-glass-border)]"
            />
          </div>

          {showMacroFields ? (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wider fc-text-dim mb-2">Direction</legend>
              <div className="flex flex-col gap-2">
                {(
                  [
                    ["increase", "Increase"],
                    ["decrease", "Decrease"],
                    ["maintain", "Maintain"],
                  ] as const
                ).map(([v, lab]) => (
                  <label
                    key={v}
                    className="flex items-center gap-2 rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 cursor-pointer has-[:checked]:border-[color:var(--fc-accent-cyan)]"
                  >
                    <input
                      type="radio"
                      name="nut-dir"
                      checked={direction === v}
                      onChange={() => setDirection(v)}
                      className="accent-[color:var(--fc-accent-cyan)]"
                    />
                    <span className="text-sm fc-text-primary">{lab}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="space-y-2">
            <Label className="text-sm fc-text-subtle">Title</Label>
            <Input
              value={title}
              onChange={(e) => {
                setTitleTouched(true);
                setTitle(e.target.value);
              }}
              required
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
