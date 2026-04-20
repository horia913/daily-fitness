"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, Save, Timer, Activity } from "lucide-react";
import { createPerformanceTest, TestType } from "@/lib/performanceTestService";

interface LogPerformanceTestModalProps {
  open: boolean;
  clientId: string;
  testType: TestType;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogPerformanceTestModal({
  open,
  clientId,
  testType,
  onClose,
  onSuccess,
}: LogPerformanceTestModalProps) {
  // 1km Run fields
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");

  // Step Test fields
  const [heartRatePre, setHeartRatePre] = useState("");
  const [heartRate1Min, setHeartRate1Min] = useState("");
  const [heartRate2Min, setHeartRate2Min] = useState("");
  const [heartRate3Min, setHeartRate3Min] = useState("");

  // Common fields
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const calculateRecoveryScore = () => {
    if (!heartRatePre || !heartRate1Min || !heartRate2Min || !heartRate3Min) {
      return null;
    }

    const pre = parseInt(heartRatePre);
    const min1 = parseInt(heartRate1Min);
    const min2 = parseInt(heartRate2Min);
    const min3 = parseInt(heartRate3Min);

    const score = min1 + min2 + min3 - 3 * pre;
    return score;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setSaving(true);

    try {
      let result;

      if (testType === "1km_run") {
        if (!minutes || !seconds) {
          setError("Please enter time for 1km run");
          setSaving(false);
          return;
        }

        const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);

        result = await createPerformanceTest({
          client_id: clientId,
          test_type: testType,
          tested_at: new Date().toISOString().split("T")[0],
          time_seconds: totalSeconds,
          notes: notes || null,
        });
      } else {
        if (!heartRatePre || !heartRate1Min || !heartRate2Min || !heartRate3Min) {
          setError("Please enter all heart rate measurements");
          setSaving(false);
          return;
        }

        const recoveryScore = calculateRecoveryScore();

        result = await createPerformanceTest({
          client_id: clientId,
          test_type: testType,
          tested_at: new Date().toISOString().split("T")[0],
          heart_rate_pre: parseInt(heartRatePre),
          heart_rate_1min: parseInt(heartRate1Min),
          heart_rate_2min: parseInt(heartRate2Min),
          heart_rate_3min: parseInt(heartRate3Min),
          recovery_score: recoveryScore,
          notes: notes || null,
        });
      }

      if (result) {
        onSuccess();
        onClose();
      } else {
        setError("Failed to save test");
      }
    } catch (err) {
      console.error("Error saving test:", err);
      setError("Failed to save test. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const recoveryScore = calculateRecoveryScore();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex w-[calc(100vw-2rem)] max-w-[500px] flex-col gap-0 overflow-hidden p-0 top-[6vh] max-h-[88vh] translate-y-0 sm:rounded-2xl"
      >
        <div className="w-full max-h-[88vh] fc-modal fc-card overflow-hidden flex flex-col min-h-0">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b border-[color:var(--fc-glass-border)] shrink-0">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="fc-icon-tile fc-icon-neutral shrink-0">
                {testType === "1km_run" ? (
                  <Timer className="w-5 h-5" aria-hidden />
                ) : (
                  <Activity className="w-5 h-5" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <span className="fc-pill fc-pill-glass fc-text-neutral">
                  Performance test
                </span>
                <DialogTitle className="text-2xl font-bold fc-text-primary mt-2">
                  {testType === "1km_run" ? "Log 1km Run" : "Log Step Test"}
                </DialogTitle>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-full fc-btn fc-btn-ghost shrink-0"
            >
              <X className="w-6 h-6" aria-hidden />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
            <form id="log-performance-test-form" onSubmit={handleSubmit} className="space-y-6 mt-6">
              {testType === "1km_run" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 fc-text-primary">
                      Time <span className="fc-text-error">*</span>
                    </label>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          value={minutes}
                          onChange={(e) => setMinutes(e.target.value)}
                          placeholder="Minutes"
                          className="w-full px-4 py-3 rounded-xl text-base fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={seconds}
                          onChange={(e) => setSeconds(e.target.value)}
                          placeholder="Seconds"
                          className="w-full px-4 py-3 rounded-xl text-base fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
                          required
                        />
                      </div>
                    </div>
                    <p className="text-xs mt-2 fc-text-subtle">Enter your 1km run time</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 fc-text-primary">
                      Pre-Test Heart Rate (bpm) <span className="fc-text-error">*</span>
                    </label>
                    <input
                      type="number"
                      min="40"
                      max="200"
                      value={heartRatePre}
                      onChange={(e) => setHeartRatePre(e.target.value)}
                      placeholder="Before exercise"
                      className="w-full px-4 py-3 rounded-xl text-base fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 fc-text-primary">
                      Heart Rate at 1 min (bpm) <span className="fc-text-error">*</span>
                    </label>
                    <input
                      type="number"
                      min="40"
                      max="200"
                      value={heartRate1Min}
                      onChange={(e) => setHeartRate1Min(e.target.value)}
                      placeholder="After 1 minute"
                      className="w-full px-4 py-3 rounded-xl text-base fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 fc-text-primary">
                      Heart Rate at 2 min (bpm) <span className="fc-text-error">*</span>
                    </label>
                    <input
                      type="number"
                      min="40"
                      max="200"
                      value={heartRate2Min}
                      onChange={(e) => setHeartRate2Min(e.target.value)}
                      placeholder="After 2 minutes"
                      className="w-full px-4 py-3 rounded-xl text-base fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 fc-text-primary">
                      Heart Rate at 3 min (bpm) <span className="fc-text-error">*</span>
                    </label>
                    <input
                      type="number"
                      min="40"
                      max="200"
                      value={heartRate3Min}
                      onChange={(e) => setHeartRate3Min(e.target.value)}
                      placeholder="After 3 minutes"
                      className="w-full px-4 py-3 rounded-xl text-base fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
                      required
                    />
                  </div>

                  {recoveryScore !== null && (
                    <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-status-success)]">
                      <p className="text-sm font-medium fc-text-success">
                        Recovery score: {recoveryScore}
                      </p>
                      <p className="text-xs mt-1 fc-text-subtle">Lower is better</p>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 fc-text-primary">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this test..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-base fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)] resize-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-status-error)] fc-text-error">
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-4 flex gap-3 border-t border-[color:var(--fc-glass-border)]">
            <Button variant="ghost" onClick={onClose} className="flex-1 fc-btn fc-btn-ghost">
              Cancel
            </Button>
            <Button
              type="submit"
              form="log-performance-test-form"
              disabled={saving}
              className="flex-1 fc-btn fc-btn-primary fc-press"
            >
              {saving ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"
                    aria-hidden
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" aria-hidden />
                  Save Test
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
