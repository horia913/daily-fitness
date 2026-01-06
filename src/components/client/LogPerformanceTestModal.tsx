"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { X, Save, Timer, Activity } from "lucide-react";
import { createPerformanceTest, TestType } from "@/lib/performanceTestService";

interface LogPerformanceTestModalProps {
  clientId: string;
  testType: TestType;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogPerformanceTestModal({
  clientId,
  testType,
  onClose,
  onSuccess,
}: LogPerformanceTestModalProps) {
  const { isDark, getSemanticColor } = useTheme();
  
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

    // Simple recovery score: lower is better
    // Score = (HR1min + HR2min + HR3min) - (3 * HRpre)
    const score = (min1 + min2 + min3) - (3 * pre);
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
          tested_at: new Date().toISOString().split('T')[0],
          time_seconds: totalSeconds,
          notes: notes || null,
        });
      } else {
        // step_test
        if (!heartRatePre || !heartRate1Min || !heartRate2Min || !heartRate3Min) {
          setError("Please enter all heart rate measurements");
          setSaving(false);
          return;
        }

        const recoveryScore = calculateRecoveryScore();

        result = await createPerformanceTest({
          client_id: clientId,
          test_type: testType,
          tested_at: new Date().toISOString().split('T')[0],
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
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4"
      style={{
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="w-full rounded-2xl shadow-2xl"
        style={{
          background: isDark ? "#1E1E1E" : "#FFFFFF",
          maxWidth: "min(95vw, 500px)",
          maxHeight: "min(88vh, calc(100vh - 4rem))",
          height: "min(88vh, calc(100vh - 4rem))",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-5"
          style={{
            background: isDark ? "#1E1E1E" : "#FFFFFF",
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: getSemanticColor("trust").gradient,
              }}
            >
              {testType === "1km_run" ? (
                <Timer className="w-5 h-5 text-white" />
              ) : (
                <Activity className="w-5 h-5 text-white" />
              )}
            </div>
            <h2
              className="text-2xl font-bold"
              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
            >
              {testType === "1km_run" ? "Log 1km Run" : "Log Step Test"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-opacity-10 hover:bg-white"
          >
            <X className="w-6 h-6" style={{ color: isDark ? "#fff" : "#1A1A1A" }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {testType === "1km_run" ? (
              <>
                {/* 1km Run Time */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Time <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        value={minutes}
                        onChange={(e) => setMinutes(e.target.value)}
                        placeholder="Minutes"
                        className="w-full px-4 py-3 rounded-lg text-lg"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                          color: isDark ? "#fff" : "#1A1A1A",
                          border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
                        }}
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
                        className="w-full px-4 py-3 rounded-lg text-lg"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                          color: isDark ? "#fff" : "#1A1A1A",
                          border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
                        }}
                        required
                      />
                    </div>
                  </div>
                  <p
                    className="text-xs mt-1"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                    }}
                  >
                    Enter your 1km run time
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Step Test Heart Rates */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Pre-Test Heart Rate (bpm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="200"
                    value={heartRatePre}
                    onChange={(e) => setHeartRatePre(e.target.value)}
                    placeholder="Before exercise"
                    className="w-full px-4 py-3 rounded-lg text-lg"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                      color: isDark ? "#fff" : "#1A1A1A",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
                    }}
                    required
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Heart Rate at 1 min (bpm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="200"
                    value={heartRate1Min}
                    onChange={(e) => setHeartRate1Min(e.target.value)}
                    placeholder="After 1 minute"
                    className="w-full px-4 py-3 rounded-lg text-lg"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                      color: isDark ? "#fff" : "#1A1A1A",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
                    }}
                    required
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Heart Rate at 2 min (bpm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="200"
                    value={heartRate2Min}
                    onChange={(e) => setHeartRate2Min(e.target.value)}
                    placeholder="After 2 minutes"
                    className="w-full px-4 py-3 rounded-lg text-lg"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                      color: isDark ? "#fff" : "#1A1A1A",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
                    }}
                    required
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Heart Rate at 3 min (bpm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="200"
                    value={heartRate3Min}
                    onChange={(e) => setHeartRate3Min(e.target.value)}
                    placeholder="After 3 minutes"
                    className="w-full px-4 py-3 rounded-lg text-lg"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                      color: isDark ? "#fff" : "#1A1A1A",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
                    }}
                    required
                  />
                </div>

                {recoveryScore !== null && (
                  <div
                    className="p-4 rounded-lg"
                    style={{
                      background: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.05)",
                    }}
                  >
                    <p
                      className="text-sm font-medium"
                      style={{ color: getSemanticColor("success").primary }}
                    >
                      Calculated Recovery Score: {recoveryScore}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Lower is better
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this test..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg resize-none"
                style={{
                  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  color: isDark ? "#fff" : "#1A1A1A",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="p-3 rounded-lg"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: "#ef4444",
                }}
              >
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-6 py-4 flex gap-3"
          style={{
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          }}
        >
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1"
            style={{
              background: getSemanticColor("trust").gradient,
              boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
            }}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Test
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

