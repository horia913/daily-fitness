"use client";

import { useMemo, useRef, useState } from "react";
import type { ProgramProgressionRule } from "@/lib/programProgressionService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadPercentageWeightToggle } from "@/components/ui/LoadPercentageWeightToggle";
import type { ProgressionGridCellRef } from "@/hooks/useProgramProgressionGrid";
import { formatCellDisplay } from "@/hooks/useProgramProgressionGrid";

type SaveResult = { ok: true } | { ok: false; error: string };

function n(v: string): number | null {
  if (!v?.trim()) return null;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ProgramProgressionGridCell(props: {
  cell: ProgressionGridCellRef;
  saving: boolean;
  error?: string | null;
  onSave: (cell: ProgressionGridCellRef, patch: Partial<ProgramProgressionRule>) => Promise<SaveResult>;
  onOpenFullEditor: (cell: ProgressionGridCellRef) => void;
  accentWeek?: boolean;
  deltaHint?: string | null;
}) {
  const { cell, saving, error, onSave, onOpenFullEditor, accentWeek, deltaHint } = props;
  const [open, setOpen] = useState(false);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initial = useMemo(() => {
    const r = cell.rule;
    return {
      loadMode: r?.weight_kg != null ? ("weight" as const) : ("load" as const),
      weight_kg: r?.weight_kg != null ? String(r.weight_kg) : "",
      load_percentage: r?.load_percentage != null ? String(r.load_percentage) : "",
      rir: r?.rir != null ? String(r.rir) : "",
      reps:
        (r?.reps ??
          r?.first_exercise_reps ??
          r?.second_exercise_reps ??
          r?.exercise_reps ??
          r?.isolation_reps ??
          r?.compound_reps ??
          cell.defaults.reps ??
          "") + "",
      drop_set_reps: r?.drop_set_reps != null ? String(r.drop_set_reps) : "",
      drop_percentage:
        (r as any)?.drop_percentage != null
          ? String((r as any).drop_percentage)
          : (r as any)?.weight_reduction_percentage != null
            ? String((r as any).weight_reduction_percentage)
            : "",
      reps_per_cluster: r?.reps_per_cluster != null ? String(r.reps_per_cluster) : "",
      clusters_per_set: r?.clusters_per_set != null ? String(r.clusters_per_set) : "",
      rest_pause_duration:
        r?.rest_pause_duration != null ? String(r.rest_pause_duration) : "",
      max_rest_pauses: r?.max_rest_pauses != null ? String(r.max_rest_pauses) : "",
      duration_minutes: r?.duration_minutes != null ? String(r.duration_minutes) : "",
      target_reps: r?.target_reps != null ? String(r.target_reps) : "",
      work_seconds: r?.work_seconds != null ? String(r.work_seconds) : "",
      rest_seconds: r?.rest_seconds != null ? String(r.rest_seconds) : "",
      rounds: r?.rounds != null ? String(r.rounds) : "",
      time_cap_minutes: r?.time_cap_minutes != null ? String(r.time_cap_minutes) : "",
      speed_distance:
        (r?.speed_endurance_config as any)?.distance_meters != null
          ? String((r?.speed_endurance_config as any).distance_meters)
          : "",
      speed_target_hr:
        (r?.speed_endurance_config as any)?.target_hr_pct != null
          ? String((r?.speed_endurance_config as any).target_hr_pct)
          : "",
      endurance_distance:
        (r?.speed_endurance_config as any)?.target_distance_meters != null
          ? String((r?.speed_endurance_config as any).target_distance_meters)
          : "",
      endurance_time:
        (r?.speed_endurance_config as any)?.target_time_seconds != null
          ? String((r?.speed_endurance_config as any).target_time_seconds)
          : "",
      endurance_target_hr:
        (r?.speed_endurance_config as any)?.target_hr_pct != null
          ? String((r?.speed_endurance_config as any).target_hr_pct)
          : "",
    };
  }, [cell]);

  const [form, setForm] = useState(initial);

  const patch = useMemo<Partial<ProgramProgressionRule>>(() => {
    const baseLoad =
      form.loadMode === "weight"
        ? { weight_kg: n(form.weight_kg), load_percentage: null }
        : { weight_kg: null, load_percentage: n(form.load_percentage) };
    const setType = cell.setType;
    if (
      [
        "straight_set",
        "superset",
        "giant_set",
        "pre_exhaustion",
      ].includes(setType)
    ) {
      return { ...baseLoad, rir: n(form.rir), reps: form.reps || null };
    }
    if (setType === "drop_set") {
      return {
        ...baseLoad,
        exercise_reps: form.reps || null,
        drop_set_reps: form.drop_set_reps || null,
        ...( { weight_reduction_percentage: n(form.drop_percentage) } as any ),
      };
    }
    if (setType === "cluster_set") {
      return {
        ...baseLoad,
        reps_per_cluster: n(form.reps_per_cluster),
        clusters_per_set: n(form.clusters_per_set),
      };
    }
    if (setType === "rest_pause") {
      return {
        ...baseLoad,
        reps: form.reps || null,
        rest_pause_duration: n(form.rest_pause_duration),
        max_rest_pauses: n(form.max_rest_pauses),
      };
    }
    if (setType === "amrap") {
      return {
        ...baseLoad,
        duration_minutes: n(form.duration_minutes),
        target_reps: n(form.target_reps),
      };
    }
    if (setType === "emom") {
      return {
        ...baseLoad,
        duration_minutes: n(form.duration_minutes),
        target_reps: n(form.target_reps),
        work_seconds: n(form.work_seconds),
      };
    }
    if (setType === "for_time") {
      return {
        ...baseLoad,
        target_reps: n(form.target_reps),
        time_cap_minutes: n(form.time_cap_minutes),
      };
    }
    if (setType === "tabata") {
      return {
        work_seconds: n(form.work_seconds),
        rest_seconds: n(form.rest_seconds),
        rounds: n(form.rounds),
      };
    }
    if (setType === "speed_work") {
      return {
        speed_endurance_config: {
          ...(cell.rule?.speed_endurance_config || {}),
          distance_meters: n(form.speed_distance),
          target_hr_pct: n(form.speed_target_hr),
        },
      };
    }
    if (setType === "endurance") {
      return {
        speed_endurance_config: {
          ...(cell.rule?.speed_endurance_config || {}),
          target_distance_meters: n(form.endurance_distance),
          target_time_seconds: n(form.endurance_time),
          target_hr_pct: n(form.endurance_target_hr),
        },
      };
    }
    return {};
  }, [cell.rule?.speed_endurance_config, cell.setType, form]);

  const handleSave = async () => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      const res = await onSave(cell, patch);
      if (res.ok) setOpen(false);
    }, 180);
  };

  const hasRule = Boolean(cell.rule);
  const display = formatCellDisplay(cell);
  const empty = !hasRule || display.trim() === "—";

  return (
    <div className="relative w-full h-full min-h-[46px]">
      <button
        type="button"
        className={`w-full h-full text-left px-1.5 py-2 rounded-md border text-[10px] leading-snug min-h-[46px] flex flex-col items-center justify-center transition-colors ${
          accentWeek
            ? "ring-1 ring-[rgba(79,227,232,0.18)] bg-[rgba(79,227,232,0.06)] border-[rgba(79,227,232,0.25)]"
            : empty
              ? "border-[rgba(255,255,255,0.06)] bg-[var(--pe-card-3,#091420)] text-[var(--pe-t4)]"
              : "border-[rgba(255,255,255,0.08)] bg-gradient-to-b from-[rgba(79,227,232,0.04)] to-transparent text-[var(--pe-t1)] hover:border-[rgba(79,227,232,0.35)]"
        }`}
        style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
        onClick={() => setOpen((v) => !v)}
      >
        {saving ? (
          <span className="text-[var(--pe-t3)]">…</span>
        ) : empty ? (
          <span className="text-[var(--pe-t4)]">—</span>
        ) : (
          <>
            <span className="text-center w-full line-clamp-2">{display}</span>
            {deltaHint ? (
              <span className="text-[9px] text-[#34D399] mt-0.5 w-full text-center">{deltaHint}</span>
            ) : null}
          </>
        )}
      </button>
      {error ? <p className="mt-1 text-[11px] text-red-400">{error}</p> : null}

      {open && (
        <div
          className="absolute z-50 top-[calc(100%+6px)] left-0 w-[280px] rounded-xl border border-white/10 p-3 shadow-2xl space-y-2"
          style={{ backgroundColor: "rgb(15, 23, 42)" }}
        >
          {[
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
          ].includes(cell.setType) ? (
            <LoadPercentageWeightToggle
              value={form.loadMode}
              onValueChange={(v) => setForm((prev) => ({ ...prev, loadMode: v }))}
            />
          ) : null}

          {form.loadMode === "weight" ? (
            <Input
              value={form.weight_kg}
              onChange={(e) => setForm((p) => ({ ...p, weight_kg: e.target.value }))}
              placeholder="Weight (kg)"
              className="h-8 text-xs"
            />
          ) : (
            <Input
              value={form.load_percentage}
              onChange={(e) => setForm((p) => ({ ...p, load_percentage: e.target.value }))}
              placeholder="Load (%)"
              className="h-8 text-xs"
            />
          )}

          {[
            "straight_set",
            "superset",
            "giant_set",
            "pre_exhaustion",
            "rest_pause",
          ].includes(cell.setType) && (
            <>
              <Input
                value={form.rir}
                onChange={(e) => setForm((p) => ({ ...p, rir: e.target.value }))}
                placeholder="RPE"
                className="h-8 text-xs"
              />
              <Input
                value={form.reps}
                onChange={(e) => setForm((p) => ({ ...p, reps: e.target.value }))}
                placeholder="Reps"
                className="h-8 text-xs"
              />
            </>
          )}

          {cell.setType === "drop_set" && (
            <>
              <Input value={form.reps} onChange={(e) => setForm((p) => ({ ...p, reps: e.target.value }))} placeholder="Main reps" className="h-8 text-xs" />
              <Input value={form.drop_set_reps} onChange={(e) => setForm((p) => ({ ...p, drop_set_reps: e.target.value }))} placeholder="Drop reps" className="h-8 text-xs" />
              <Input value={form.drop_percentage} onChange={(e) => setForm((p) => ({ ...p, drop_percentage: e.target.value }))} placeholder="Drop %" className="h-8 text-xs" />
            </>
          )}

          {cell.setType === "cluster_set" && (
            <>
              <Input value={form.reps_per_cluster} onChange={(e) => setForm((p) => ({ ...p, reps_per_cluster: e.target.value }))} placeholder="Reps / cluster" className="h-8 text-xs" />
              <Input value={form.clusters_per_set} onChange={(e) => setForm((p) => ({ ...p, clusters_per_set: e.target.value }))} placeholder="Clusters / set" className="h-8 text-xs" />
            </>
          )}

          {cell.setType === "rest_pause" && (
            <>
              <Input value={form.rest_pause_duration} onChange={(e) => setForm((p) => ({ ...p, rest_pause_duration: e.target.value }))} placeholder="Rest-pause duration (s)" className="h-8 text-xs" />
              <Input value={form.max_rest_pauses} onChange={(e) => setForm((p) => ({ ...p, max_rest_pauses: e.target.value }))} placeholder="Max pauses" className="h-8 text-xs" />
            </>
          )}

          {cell.setType === "amrap" && (
            <>
              <Input value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))} placeholder="Duration (min)" className="h-8 text-xs" />
              <Input value={form.target_reps} onChange={(e) => setForm((p) => ({ ...p, target_reps: e.target.value }))} placeholder="Target reps" className="h-8 text-xs" />
            </>
          )}

          {cell.setType === "emom" && (
            <>
              <Input value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))} placeholder="Duration (min)" className="h-8 text-xs" />
              <Input value={form.target_reps} onChange={(e) => setForm((p) => ({ ...p, target_reps: e.target.value }))} placeholder="Target reps" className="h-8 text-xs" />
              <Input value={form.work_seconds} onChange={(e) => setForm((p) => ({ ...p, work_seconds: e.target.value }))} placeholder="Work seconds" className="h-8 text-xs" />
            </>
          )}

          {cell.setType === "for_time" && (
            <>
              <Input value={form.target_reps} onChange={(e) => setForm((p) => ({ ...p, target_reps: e.target.value }))} placeholder="Target reps" className="h-8 text-xs" />
              <Input value={form.time_cap_minutes} onChange={(e) => setForm((p) => ({ ...p, time_cap_minutes: e.target.value }))} placeholder="Time cap (min)" className="h-8 text-xs" />
            </>
          )}

          {cell.setType === "tabata" && (
            <>
              <Input value={form.work_seconds} onChange={(e) => setForm((p) => ({ ...p, work_seconds: e.target.value }))} placeholder="Work seconds" className="h-8 text-xs" />
              <Input value={form.rest_seconds} onChange={(e) => setForm((p) => ({ ...p, rest_seconds: e.target.value }))} placeholder="Rest seconds" className="h-8 text-xs" />
              <Input value={form.rounds} onChange={(e) => setForm((p) => ({ ...p, rounds: e.target.value }))} placeholder="Rounds" className="h-8 text-xs" />
            </>
          )}

          {cell.setType === "speed_work" && (
            <>
              <Input value={form.speed_distance} onChange={(e) => setForm((p) => ({ ...p, speed_distance: e.target.value }))} placeholder="Distance (m)" className="h-8 text-xs" />
              <Input value={form.speed_target_hr} onChange={(e) => setForm((p) => ({ ...p, speed_target_hr: e.target.value }))} placeholder="Target HR %" className="h-8 text-xs" />
            </>
          )}

          {cell.setType === "endurance" && (
            <>
              <Input value={form.endurance_distance} onChange={(e) => setForm((p) => ({ ...p, endurance_distance: e.target.value }))} placeholder="Distance (m)" className="h-8 text-xs" />
              <Input value={form.endurance_time} onChange={(e) => setForm((p) => ({ ...p, endurance_time: e.target.value }))} placeholder="Duration (s)" className="h-8 text-xs" />
              <Input value={form.endurance_target_hr} onChange={(e) => setForm((p) => ({ ...p, endurance_target_hr: e.target.value }))} placeholder="Target HR %" className="h-8 text-xs" />
            </>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving}>
              Save
            </Button>
          </div>
          <button
            type="button"
            className="text-[11px] underline text-[color:var(--fc-text-dim)]"
            onClick={() => {
              setOpen(false);
              onOpenFullEditor(cell);
            }}
          >
            Open full editor
          </button>
        </div>
      )}
    </div>
  );
}

