"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Save } from "lucide-react";
import {
  calculateRecoveryScore,
  createPerformanceTest,
  validatePerformanceTest,
  type TestType,
} from "@/lib/performanceTestService";

interface LogPerformanceTestModalProps {
  open: boolean;
  clientId: string;
  testType: TestType;
  onClose: () => void;
  onSuccess: () => void;
}

function parseRunTime(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((p) => parseInt(p, 10));
    if (parts.some((n) => Number.isNaN(n))) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }

  const seconds = parseInt(trimmed, 10);
  return Number.isNaN(seconds) ? null : seconds;
}

export function LogPerformanceTestModal({
  open,
  clientId,
  testType,
  onClose,
  onSuccess,
}: LogPerformanceTestModalProps) {
  const [testedAt, setTestedAt] = useState("");
  const [runTime, setRunTime] = useState("");
  const [hrPre, setHrPre] = useState("");
  const [hr1min, setHr1min] = useState("");
  const [hr2min, setHr2min] = useState("");
  const [hr3min, setHr3min] = useState("");
  const [perceivedEffort, setPerceivedEffort] = useState("");
  const [conditions, setConditions] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTestedAt(new Date().toISOString().split("T")[0]);
    setRunTime("");
    setHrPre("");
    setHr1min("");
    setHr2min("");
    setHr3min("");
    setPerceivedEffort("");
    setConditions("");
    setNotes("");
    setError("");
  }, [open, testType]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const tested_at = testedAt || new Date().toISOString().split("T")[0];

    let payload: Parameters<typeof createPerformanceTest>[0];

    if (testType === "1km_run") {
      const time_seconds = parseRunTime(runTime);
      if (time_seconds == null) {
        setError("Enter a valid time (e.g. 5:30 for 5 minutes 30 seconds)");
        return;
      }

      payload = {
        client_id: clientId,
        tested_at,
        test_type: "1km_run",
        time_seconds,
        notes: notes.trim() || null,
        conditions: conditions.trim() || null,
        perceived_effort: perceivedEffort ? parseInt(perceivedEffort, 10) : null,
        tested_by: null,
      };
    } else {
      const heart_rate_pre = parseInt(hrPre, 10);
      const heart_rate_1min = parseInt(hr1min, 10);
      const heart_rate_2min = parseInt(hr2min, 10);
      const heart_rate_3min = parseInt(hr3min, 10);

      if (
        [heart_rate_pre, heart_rate_1min, heart_rate_2min, heart_rate_3min].some(
          (n) => Number.isNaN(n)
        )
      ) {
        setError("Enter all heart rate values (pre-exercise and 1, 2, 3 min recovery)");
        return;
      }

      const recovery_score = calculateRecoveryScore(
        heart_rate_pre,
        heart_rate_1min,
        heart_rate_2min,
        heart_rate_3min
      );

      payload = {
        client_id: clientId,
        tested_at,
        test_type: "step_test",
        heart_rate_pre,
        heart_rate_1min,
        heart_rate_2min,
        heart_rate_3min,
        recovery_score,
        notes: notes.trim() || null,
        conditions: conditions.trim() || null,
        perceived_effort: perceivedEffort ? parseInt(perceivedEffort, 10) : null,
        tested_by: null,
      };
    }

    const validation = validatePerformanceTest(payload);
    if (!validation.valid) {
      setError(validation.errors[0] ?? "Invalid test data");
      return;
    }

    setSaving(true);
    try {
      const result = await createPerformanceTest(payload);
      if (!result) {
        setError("Failed to save test. Please try again.");
        return;
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving performance test:", err);
      setError("Failed to save test. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "block text-sm font-medium mb-2 fc-text-primary";
  const inputClass =
    "w-full px-4 py-3 rounded-xl text-base fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-performance-test-title"
    >
      <div className="w-full max-w-[500px] max-h-[88vh] fc-modal fc-card overflow-hidden flex flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[color:var(--fc-glass-border)] px-6 py-5">
          <div>
            <span className="fc-pill fc-pill-glass fc-text-habits">Performance</span>
            <h2
              id="log-performance-test-title"
              className="text-2xl font-bold fc-text-primary mt-2"
            >
              Log {testType === "1km_run" ? "1km run" : "step test"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 rounded-full fc-btn fc-btn-ghost flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <label className={labelClass} htmlFor="tested-at">
                Test date
              </label>
              <input
                id="tested-at"
                type="date"
                value={testedAt}
                onChange={(e) => setTestedAt(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            {testType === "1km_run" ? (
              <div>
                <label className={labelClass} htmlFor="run-time">
                  Time (MM:SS) <span className="fc-text-error">*</span>
                </label>
                <input
                  id="run-time"
                  type="text"
                  value={runTime}
                  onChange={(e) => setRunTime(e.target.value)}
                  placeholder="e.g. 5:30"
                  className={inputClass}
                  required
                  autoFocus
                />
                <p className="text-xs fc-text-dim mt-1">Minutes and seconds, e.g. 5:30</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="hr-pre">
                    Pre HR (BPM) <span className="fc-text-error">*</span>
                  </label>
                  <input
                    id="hr-pre"
                    type="number"
                    value={hrPre}
                    onChange={(e) => setHrPre(e.target.value)}
                    className={inputClass}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="hr-1min">
                    1 min (BPM) <span className="fc-text-error">*</span>
                  </label>
                  <input
                    id="hr-1min"
                    type="number"
                    value={hr1min}
                    onChange={(e) => setHr1min(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="hr-2min">
                    2 min (BPM) <span className="fc-text-error">*</span>
                  </label>
                  <input
                    id="hr-2min"
                    type="number"
                    value={hr2min}
                    onChange={(e) => setHr2min(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="hr-3min">
                    3 min (BPM) <span className="fc-text-error">*</span>
                  </label>
                  <input
                    id="hr-3min"
                    type="number"
                    value={hr3min}
                    onChange={(e) => setHr3min(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="perceived-effort">
                Perceived effort (1–10)
              </label>
              <input
                id="perceived-effort"
                type="number"
                min={1}
                max={10}
                value={perceivedEffort}
                onChange={(e) => setPerceivedEffort(e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="conditions">
                Conditions
              </label>
              <input
                id="conditions"
                type="text"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="Optional (e.g. hot weather)"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-status-error)] fc-text-error text-sm">
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="flex-shrink-0 border-t border-[color:var(--fc-glass-border)] px-6 py-4 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1 fc-btn fc-btn-ghost min-h-[44px]">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 fc-btn fc-btn-primary fc-press min-h-[44px]"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save test
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
