"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/apiClient";
import { useToast } from "@/components/ui/toast-provider";

const DEFAULT_SLEEP = 7;
const DEFAULT_STEPS = 8000;

export function RecoveryTargetsForm({ clientId }: { clientId: string }) {
  const { addToast } = useToast();
  const [sleep, setSleep] = useState("");
  const [steps, setSteps] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchApi(`/api/coach/clients/${clientId}/recovery-targets`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? "Failed to load targets");
        if (!cancelled) {
          const sh = body.sleep_target_hours;
          const st = body.steps_target;
          setSleep(sh != null && Number.isFinite(Number(sh)) ? String(sh) : "");
          setSteps(st != null && Number.isFinite(Number(st)) ? String(st) : "");
        }
      } catch {
        if (!cancelled) {
          setSleep("");
          setSteps("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const onSave = async () => {
    const sleepNum = Number(sleep);
    const stepsNum = Number(steps);
    if (!Number.isFinite(sleepNum) || sleepNum < 4 || sleepNum > 12) {
      addToast({ title: "Sleep target must be between 4 and 12 hours", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(stepsNum) || stepsNum < 1000 || stepsNum > 30000) {
      addToast({ title: "Steps target must be between 1,000 and 30,000", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetchApi(`/api/coach/clients/${clientId}/recovery-targets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sleep_target_hours: sleepNum,
          steps_target: Math.round(stepsNum),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Save failed");
      addToast({
        title: "Recovery targets updated. Will apply to next score recompute.",
      });
    } catch (e) {
      addToast({
        title: e instanceof Error ? e.message : "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)] p-6">
      <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">Recovery targets</h2>
      <p className="mt-2 text-sm text-[color:var(--fc-text-dim)]">
        These affect the Recovery component of the athlete score. Defaults: 7 hours sleep, 8,000
        steps.
      </p>

      <div className="mt-6 space-y-4 max-w-md">
        <label className="block text-sm text-[color:var(--fc-text-primary)]">
          <span className="mb-1 block text-[color:var(--fc-text-dim)]">Sleep target</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.5"
              min={4}
              max={12}
              disabled={loading || saving}
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              placeholder={String(DEFAULT_SLEEP)}
              className="flex-1"
            />
            <span className="text-sm text-[color:var(--fc-text-dim)] shrink-0">hours per night</span>
          </div>
        </label>

        <label className="block text-sm text-[color:var(--fc-text-primary)]">
          <span className="mb-1 block text-[color:var(--fc-text-dim)]">Steps target</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step={500}
              min={1000}
              max={30000}
              disabled={loading || saving}
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder={String(DEFAULT_STEPS)}
              className="flex-1"
            />
            <span className="text-sm text-[color:var(--fc-text-dim)] shrink-0">steps per day</span>
          </div>
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          className="fc-btn fc-btn-primary"
          disabled={loading || saving}
          onClick={() => void onSave()}
        >
          {saving ? "Saving…" : "Save targets"}
        </Button>
      </div>
    </section>
  );
}
