"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Save, ChevronDown, ChevronUp } from "lucide-react";
import { upsertMeasurement } from "@/lib/measurementService";
import type { BodyMeasurement } from "@/lib/measurementService";
import type { NewlyUnlockedAchievement } from "@/lib/achievementService";

interface LogMeasurementModalProps {
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-fill form from last check-in */
  lastMeasurement?: BodyMeasurement | null;
  /** Called with newly unlocked achievements after save (e.g. weight_goal); parent can show AchievementUnlockModal */
  onAchievementsUnlocked?: (achievements: NewlyUnlockedAchievement[]) => void;
  /** Tighter layout for narrow mobile shells (e.g. body-metrics); default keeps legacy styling for other callers */
  compactForm?: boolean;
}

export function LogMeasurementModal({
  clientId,
  onClose,
  onSuccess,
  lastMeasurement,
  onAchievementsUnlocked,
  compactForm = false,
}: LogMeasurementModalProps) {
  const [showFullMeasurements, setShowFullMeasurements] = useState(false);
  
  // Quick log fields
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  
  // Full measurements - Circumferences
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [torso, setTorso] = useState("");
  const [leftArm, setLeftArm] = useState("");
  const [rightArm, setRightArm] = useState("");
  const [leftThigh, setLeftThigh] = useState("");
  const [rightThigh, setRightThigh] = useState("");
  const [leftCalf, setLeftCalf] = useState("");
  const [rightCalf, setRightCalf] = useState("");
  
  // Full measurements - Composition
  const [muscleMass, setMuscleMass] = useState("");
  const [visceralFat, setVisceralFat] = useState("");
  
  // Full measurements - Details
  const [measurementMethod, setMeasurementMethod] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill from last measurement
  useEffect(() => {
    if (!lastMeasurement) return;
    if (lastMeasurement.weight_kg != null) setWeight(String(lastMeasurement.weight_kg));
    if (lastMeasurement.body_fat_percentage != null) setBodyFat(String(lastMeasurement.body_fat_percentage));
    if (lastMeasurement.muscle_mass_kg != null) setMuscleMass(String(lastMeasurement.muscle_mass_kg));
    if (lastMeasurement.waist_circumference != null) setWaist(String(lastMeasurement.waist_circumference));
    if (lastMeasurement.hips_circumference != null) setHips(String(lastMeasurement.hips_circumference));
    if (lastMeasurement.torso_circumference != null) setTorso(String(lastMeasurement.torso_circumference));
    if (lastMeasurement.left_arm_circumference != null) setLeftArm(String(lastMeasurement.left_arm_circumference));
    if (lastMeasurement.right_arm_circumference != null) setRightArm(String(lastMeasurement.right_arm_circumference));
    if (lastMeasurement.left_thigh_circumference != null) setLeftThigh(String(lastMeasurement.left_thigh_circumference));
    if (lastMeasurement.right_thigh_circumference != null) setRightThigh(String(lastMeasurement.right_thigh_circumference));
    if (lastMeasurement.left_calf_circumference != null) setLeftCalf(String(lastMeasurement.left_calf_circumference));
    if (lastMeasurement.right_calf_circumference != null) setRightCalf(String(lastMeasurement.right_calf_circumference));
    if (lastMeasurement.measurement_method) setMeasurementMethod(lastMeasurement.measurement_method);
    if (lastMeasurement.notes) setNotes(lastMeasurement.notes);
  }, [lastMeasurement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!weight || parseFloat(weight) <= 0) {
      setError("Please enter a valid weight");
      return;
    }

    setSaving(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      
      const result = await upsertMeasurement({
        client_id: clientId,
        measured_date: today,
        weight_kg: parseFloat(weight),
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : undefined,
        waist_circumference: waist ? parseFloat(waist) : undefined,
        hips_circumference: hips ? parseFloat(hips) : undefined,
        torso_circumference: torso ? parseFloat(torso) : undefined,
        left_arm_circumference: leftArm ? parseFloat(leftArm) : undefined,
        right_arm_circumference: rightArm ? parseFloat(rightArm) : undefined,
        left_thigh_circumference: leftThigh ? parseFloat(leftThigh) : undefined,
        right_thigh_circumference: rightThigh ? parseFloat(rightThigh) : undefined,
        left_calf_circumference: leftCalf ? parseFloat(leftCalf) : undefined,
        right_calf_circumference: rightCalf ? parseFloat(rightCalf) : undefined,
        muscle_mass_kg: muscleMass ? parseFloat(muscleMass) : undefined,
        visceral_fat_level: visceralFat ? parseInt(visceralFat) : undefined,
        measurement_method: measurementMethod || undefined,
        notes: notes.trim() || undefined,
      });

      if (!result) {
        setError("Failed to save measurement");
        return;
      }

      try {
        const { AchievementService } = await import("@/lib/achievementService");
        const weightNew = await AchievementService.checkAndUnlockAchievements(clientId, "weight_goal");
        if (weightNew.length > 0 && onAchievementsUnlocked) {
          onAchievementsUnlocked(weightNew);
        }
      } catch (achErr) {
        console.warn("Error checking weight goal achievements:", achErr);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving measurement:", err);
      setError("Failed to save measurement. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const labelClass = compactForm
    ? "block text-xs uppercase tracking-wider text-gray-400 mb-1"
    : "block text-base font-semibold mb-2 fc-text-primary";
  const labelClassSmall = compactForm
    ? "block text-xs uppercase tracking-wider text-gray-400 mb-1"
    : "block text-sm font-medium mb-2 fc-text-primary";
  const inputClass = compactForm
    ? "w-full h-11 px-3 rounded-lg text-sm text-white bg-white/[0.04] border border-white/10 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40"
    : "w-full px-4 py-4 rounded-xl text-lg font-medium fc-glass-soft fc-text-primary border-2 border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)] focus:border-[color:var(--fc-accent-cyan)]";
  const inputClassSecondary = compactForm
    ? "w-full h-11 px-3 rounded-lg text-sm text-white bg-white/[0.04] border border-white/10 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40"
    : "w-full px-4 py-3 rounded-xl text-base fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]";
  const inputClassGrid = compactForm
    ? "w-full h-11 px-3 rounded-lg text-sm text-white bg-white/[0.04] border border-white/10 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40"
    : "w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]";
  const gridLabelClass = compactForm
    ? "block text-xs uppercase tracking-wider text-gray-400 mb-1"
    : "block text-xs font-medium mb-1.5 fc-text-subtle";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div
        className={
          compactForm
            ? "w-[min(95vw,32rem)] max-w-full max-h-[88vh] fc-modal fc-card overflow-hidden flex flex-col rounded-xl border border-white/10 bg-[color:var(--fc-surface)] shadow-xl"
            : "w-full max-w-[500px] max-h-[88vh] fc-modal fc-card overflow-hidden flex flex-col"
        }
      >
        {/* Header */}
        <div
          className={`sticky top-0 z-10 flex items-center justify-between border-b border-[color:var(--fc-glass-border)] ${compactForm ? "px-4 py-4" : "px-6 py-5"}`}
        >
          <div>
            {!compactForm && (
              <span className="fc-pill fc-pill-glass fc-text-habits">
                Body metrics
              </span>
            )}
            <h2
              className={
                compactForm
                  ? "text-lg font-semibold text-white mt-0"
                  : "text-2xl font-bold fc-text-primary mt-2"
              }
            >
              Log measurement
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 rounded-full fc-btn fc-btn-ghost flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto ${compactForm ? "px-4 pb-4" : "px-6 pb-6"}`}>
          <form onSubmit={handleSubmit} className={`${compactForm ? "space-y-4 mt-4" : "space-y-6 mt-6"}`}>
            {/* Quick Log Section */}
            <div className={compactForm ? "space-y-3" : "space-y-4"}>
              {/* Weight - Large, prominent */}
              <div>
                <label className={labelClass}>
                  Weight (kg) <span className={compactForm ? "text-red-400" : "fc-text-error"}>*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Enter weight in kg"
                  className={inputClass}
                  required
                  autoFocus
                />
              </div>

              {/* Body Fat - Optional, smaller */}
              <div>
                <label className={compactForm ? labelClass : labelClassSmall}>
                  Body Fat (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="Optional"
                  className={inputClassSecondary}
                />
              </div>
            </div>

            {/* Expandable Full Measurements */}
            <div className="border-t border-[color:var(--fc-glass-border)] pt-4">
              <button
                type="button"
                onClick={() => setShowFullMeasurements(!showFullMeasurements)}
                className={`w-full flex items-center justify-between py-2 text-sm font-medium fc-text-subtle hover:fc-text-primary transition-colors ${compactForm ? "text-gray-400 hover:text-white" : ""}`}
              >
                <span>Add more measurements</span>
                {showFullMeasurements ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showFullMeasurements && (
                <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Circumferences Section */}
                  <div>
                    <h3 className={`text-sm font-semibold mb-3 ${compactForm ? "text-white" : "fc-text-primary"}`}>Circumferences (cm)</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={gridLabelClass}>Waist</label>
                        <input
                          type="number"
                          step="0.1"
                          value={waist}
                          onChange={(e) => setWaist(e.target.value)}
                          placeholder="Optional"
                          className={inputClassGrid}
                        />
                      </div>
                      <div>
                        <label className={gridLabelClass}>Hips</label>
                        <input
                          type="number"
                          step="0.1"
                          value={hips}
                          onChange={(e) => setHips(e.target.value)}
                          placeholder="Optional"
                          className={inputClassGrid}
                        />
                      </div>
                      <div>
                        <label className={gridLabelClass}>Chest/Torso</label>
                        <input
                          type="number"
                          step="0.1"
                          value={torso}
                          onChange={(e) => setTorso(e.target.value)}
                          placeholder="Optional"
                          className={inputClassGrid}
                        />
                      </div>
                      <div>
                        <label className={gridLabelClass}>Left Arm</label>
                        <input
                          type="number"
                          step="0.1"
                          value={leftArm}
                          onChange={(e) => setLeftArm(e.target.value)}
                          placeholder="Optional"
                          className={inputClassGrid}
                        />
                      </div>
                      <div>
                        <label className={gridLabelClass}>Right Arm</label>
                        <input
                          type="number"
                          step="0.1"
                          value={rightArm}
                          onChange={(e) => setRightArm(e.target.value)}
                          placeholder="Optional"
                          className={inputClassGrid}
                        />
                      </div>
                      <div>
                        <label className={gridLabelClass}>Left Thigh</label>
                        <input
                          type="number"
                          step="0.1"
                          value={leftThigh}
                          onChange={(e) => setLeftThigh(e.target.value)}
                          placeholder="Optional"
                          className={inputClassGrid}
                        />
                      </div>
                      <div>
                        <label className={gridLabelClass}>Right Thigh</label>
                        <input
                          type="number"
                          step="0.1"
                          value={rightThigh}
                          onChange={(e) => setRightThigh(e.target.value)}
                          placeholder="Optional"
                          className={inputClassGrid}
                        />
                      </div>
                      <div>
                        <label className={gridLabelClass}>Left Calf</label>
                        <input
                          type="number"
                          step="0.1"
                          value={leftCalf}
                          onChange={(e) => setLeftCalf(e.target.value)}
                          placeholder="Optional"
                          className={inputClassGrid}
                        />
                      </div>
                      <div>
                        <label className={gridLabelClass}>Right Calf</label>
                        <input
                          type="number"
                          step="0.1"
                          value={rightCalf}
                          onChange={(e) => setRightCalf(e.target.value)}
                          placeholder="Optional"
                          className={inputClassGrid}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Composition Section */}
                  <div>
                    <h3 className={`text-sm font-semibold mb-3 ${compactForm ? "text-white" : "fc-text-primary"}`}>Body Composition</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={gridLabelClass}>Muscle Mass (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={muscleMass}
                          onChange={(e) => setMuscleMass(e.target.value)}
                          placeholder="Optional"
                          className={inputClassGrid}
                        />
                      </div>
                      <div>
                        <label className={gridLabelClass}>Visceral Fat Level</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="25"
                          value={visceralFat}
                          onChange={(e) => setVisceralFat(e.target.value)}
                          placeholder="0-25"
                          className={inputClassGrid}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div>
                    <h3 className={`text-sm font-semibold mb-3 ${compactForm ? "text-white" : "fc-text-primary"}`}>Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className={gridLabelClass}>Measurement Method</label>
                        <select
                          value={measurementMethod}
                          onChange={(e) => setMeasurementMethod(e.target.value)}
                          className={
                            compactForm
                              ? "w-full h-11 px-3 rounded-lg text-sm text-white bg-white/[0.04] border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                              : "w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)] bg-[color:var(--fc-glass-soft)]"
                          }
                        >
                          <option value="">Select method</option>
                          <option value="Scale">Scale</option>
                          <option value="Tape + Calipers">Tape + Calipers</option>
                          <option value="DEXA">DEXA</option>
                          <option value="BIA">BIA</option>
                          <option value="Visual">Visual</option>
                        </select>
                      </div>
                      <div>
                        <label className={gridLabelClass}>Notes</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Optional notes"
                          rows={3}
                          className={
                            compactForm
                              ? "w-full min-h-[5.5rem] px-3 py-2 rounded-lg text-sm text-white bg-white/[0.04] border border-white/10 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none"
                              : "w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)] resize-none"
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-status-error)] fc-text-error">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Footer - sticky so Save/Cancel always visible on mobile */}
        <div
          className={`flex-shrink-0 border-t border-[color:var(--fc-glass-border)] ${
            compactForm ? "px-4 py-4 flex flex-col gap-2" : "px-6 py-4 flex gap-3"
          }`}
        >
          {compactForm ? (
            <>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/30 ring-inset transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save measurement
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-sm font-semibold text-gray-300 transition-colors hover:bg-white/[0.1]"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
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
                    Save Measurement
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

