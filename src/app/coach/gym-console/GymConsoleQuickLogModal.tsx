"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/IconButton";
import { LargeInput } from "@/components/ui/LargeInput";
import { useToast } from "@/components/ui/toast-provider";
import { Loader2, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/lib/apiClient";
import type { WorkoutBlock } from "./gymConsoleTypes";
import styles from "./gymConsole.module.css";

export function GymConsoleQuickLogModal({
  open,
  onClose,
  clientId,
  clientName,
  workoutLogId,
  workoutAssignmentId,
  sessionId,
  onSuccess,
  initialSelected,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  workoutLogId: string;
  workoutAssignmentId: string;
  sessionId: string;
  onSuccess?: (info?: { exerciseId: string; hadPr: boolean }) => void;
  initialSelected?: { blockId: string; exerciseId: string; exerciseName: string } | null;
}) {
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<{
    blockId: string;
    exerciseId: string;
    exerciseName: string;
  } | null>(null);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (!open || !clientId) return;
    setLoading(true);
    setBlocks([]);
    setSelected(initialSelected ?? null);
    setWeight("");
    setReps("");
    setMenuOpen(false);
    fetchApi(`/api/coach/pickup/next-workout?clientId=${clientId}`)
      .then((res) => res.json())
      .then((body) => {
        if (body.blocks && Array.isArray(body.blocks)) {
          setBlocks(body.blocks);
        }
      })
      .catch(() => addToast({ title: "Failed to load exercises", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open, clientId, addToast, initialSelected]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const exerciseOptions: { blockId: string; exerciseId: string; exerciseName: string }[] = [];
  for (const block of blocks) {
    for (const ex of block.exercises || []) {
      if (ex.exercise_id && ex.exercise_name) {
        exerciseOptions.push({
          blockId: block.id,
          exerciseId: ex.exercise_id,
          exerciseName: ex.exercise_name,
        });
      }
    }
  }

  const selectedKey = selected ? `${selected.blockId}:${selected.exerciseId}` : "";

  const handleSubmit = async () => {
    if (!selected || !weight.trim() || !reps.trim()) {
      addToast({ title: "Enter weight and reps", variant: "destructive" });
      return;
    }
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (isNaN(w) || w < 0 || isNaN(r) || r <= 0) {
      addToast({ title: "Invalid weight or reps", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchApi("/api/log-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          workout_log_id: workoutLogId,
          workout_assignment_id: workoutAssignmentId,
          session_id: sessionId,
          set_entry_id: selected.blockId,
          exercise_id: selected.exerciseId,
          weight: w,
          reps: r,
          set_type: "straight_set",
          set_number: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to log set");
      addToast({
        title: "Set logged",
        description: `${selected.exerciseName}: ${w}kg × ${r} reps`,
        variant: "success",
      });
      const stored = data?.pr?.stored_prs;
      const hadPr = Array.isArray(stored) && stored.length > 0;
      onSuccess?.({ exerciseId: selected.exerciseId, hadPr });
      onClose();
    } catch (e) {
      addToast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to log set",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          styles.logModalPanel,
          "max-w-[min(calc(100vw-1.5rem),420px)] !gap-0 !p-0 sm:rounded-[22px]"
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.18em] text-[color:var(--fc-accent-lime)]">
                Log set
              </p>
              <p
                className="text-lg font-bold leading-tight text-[color:var(--fc-text-primary)]"
                style={{ fontFamily: "var(--f-headline, var(--font-sans, ui-sans-serif))" }}
              >
                {clientName}
              </p>
            </div>
            <IconButton
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              aria-label="Close"
              className="!h-7 !w-7 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </IconButton>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[color:var(--fc-accent-cyan)]" aria-hidden />
            </div>
          ) : (
            <>
              <div className="relative mb-3" ref={menuRef}>
                <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--fc-text-dim)]">
                  Exercise
                </p>
                <button
                  type="button"
                  className={styles.exerciseTrigger}
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-expanded={menuOpen}
                  aria-haspopup="listbox"
                >
                  <span className="min-w-0 truncate">{selected?.exerciseName ?? "Select exercise"}</span>
                  <ChevronDown className="h-3 w-3 shrink-0 text-[color:var(--fc-text-dim)]" aria-hidden />
                </button>
                {menuOpen ? (
                  <div className={styles.exerciseMenu} role="listbox">
                    {exerciseOptions.map((o) => {
                      const key = `${o.blockId}:${o.exerciseId}`;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="option"
                          aria-selected={key === selectedKey}
                          className={cn(
                            styles.exerciseMenuItem,
                            key === selectedKey && styles.exerciseMenuItemActive
                          )}
                          onClick={() => {
                            setSelected(o);
                            setMenuOpen(false);
                          }}
                        >
                          {o.exerciseName}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <LargeInput
                  label="Weight"
                  unit="kg"
                  value={weight}
                  onChange={setWeight}
                  inputType="decimal"
                  step="0.5"
                  stepAmount={0.5}
                  min="0"
                  placeholder="0"
                  density="compact"
                />
                <LargeInput
                  label="Reps"
                  value={reps}
                  onChange={setReps}
                  inputType="number"
                  step="1"
                  stepAmount={1}
                  min="1"
                  placeholder="0"
                  density="compact"
                />
              </div>

              <div className="mt-3 grid grid-cols-[auto_1fr] gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 rounded-xl border-[color:var(--fc-glass-border)] bg-[rgba(255,255,255,0.04)] px-3.5 py-2.5 text-[13px] font-semibold text-[color:var(--fc-text-primary)]"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="btn-action"
                  className="h-11 w-full min-w-0 rounded-xl p-2.5 text-[13px] font-bold uppercase tracking-[0.06em]"
                  onClick={handleSubmit}
                  disabled={submitting || !selected}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Log Set"}
                </Button>
              </div>
            </>
          )}
      </DialogContent>
    </Dialog>
  );
}
