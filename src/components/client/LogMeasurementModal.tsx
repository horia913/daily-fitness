"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Save, ChevronDown, ChevronUp } from "lucide-react";
import { createMeasurement } from "@/lib/measurementService";
import type { BodyMeasurement } from "@/lib/measurementService";

interface LogMeasurementModalProps {
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-fill form from last check-in */
  lastMeasurement?: BodyMeasurement | null;
}

export function LogMeasurementModal({
  clientId,
  onClose,
  onSuccess,
  lastMeasurement,
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
      
      const result = await createMeasurement({
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

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving measurement:", err);
      setError("Failed to save measurement. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div
        className="w-full max-w-[500px] max-h-[88vh] fc-modal fc-card overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b border-[color:var(--fc-glass-border)]"
        >
          <div>
            <span className="fc-pill fc-pill-glass fc-text-habits">
              Body metrics
            </span>
            <h2 className="text-2xl font-bold fc-text-primary mt-2">
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
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* Quick Log Section */}
            <div className="space-y-4">
              {/* Weight - Large, prominent */}
              <div>
                <label className="block text-base font-semibold mb-2 fc-text-primary">
                  Weight (kg) <span className="fc-text-error">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Enter weight in kg"
                  className="w-full px-4 py-4 rounded-xl text-lg font-medium fc-glass-soft fc-text-primary border-2 border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)] focus:border-[color:var(--fc-accent-cyan)]"
                  required
                  autoFocus
                />
              </div>

              {/* Body Fat - Optional, smaller */}
              <div>
                <label className="block text-sm font-medium mb-2 fc-text-primary">
                  Body Fat (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-3 rounded-xl text-base fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
                />
              </div>
            </div>

            {/* Expandable Full Measurements */}
            <div className="border-t border-[color:var(--fc-glass-border)] pt-4">
              <button
                type="button"
                onClick={() => setShowFullMeasurements(!showFullMeasurements)}
                className="w-full flex items-center justify-between py-2 text-sm font-medium fc-text-subtle hover:fc-text-primary transition-colors"
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
                    <h3 className="text-sm font-semibold fc-text-primary mb-3">Circumferences (cm)</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Waist</label>
                        <input
                          type="number"
                          step="0.1"
                          value={waist}
                          onChange={(e) => setWaist(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Hips</label>
                        <input
                          type="number"
                          step="0.1"
                          value={hips}
                          onChange={(e) => setHips(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Chest/Torso</label>
                        <input
                          type="number"
                          step="0.1"
                          value={torso}
                          onChange={(e) => setTorso(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Left Arm</label>
                        <input
                          type="number"
                          step="0.1"
                          value={leftArm}
                          onChange={(e) => setLeftArm(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Right Arm</label>
                        <input
                          type="number"
                          step="0.1"
                          value={rightArm}
                          onChange={(e) => setRightArm(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Left Thigh</label>
                        <input
                          type="number"
                          step="0.1"
                          value={leftThigh}
                          onChange={(e) => setLeftThigh(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Right Thigh</label>
                        <input
                          type="number"
                          step="0.1"
                          value={rightThigh}
                          onChange={(e) => setRightThigh(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Left Calf</label>
                        <input
                          type="number"
                          step="0.1"
                          value={leftCalf}
                          onChange={(e) => setLeftCalf(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Right Calf</label>
                        <input
                          type="number"
                          step="0.1"
                          value={rightCalf}
                          onChange={(e) => setRightCalf(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Composition Section */}
                  <div>
                    <h3 className="text-sm font-semibold fc-text-primary mb-3">Body Composition</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Muscle Mass (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={muscleMass}
                          onChange={(e) => setMuscleMass(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Visceral Fat Level</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="25"
                          value={visceralFat}
                          onChange={(e) => setVisceralFat(e.target.value)}
                          placeholder="0-25"
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div>
                    <h3 className="text-sm font-semibold fc-text-primary mb-3">Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Measurement Method</label>
                        <select
                          value={measurementMethod}
                          onChange={(e) => setMeasurementMethod(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)] bg-[color:var(--fc-glass-soft)]"
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
                        <label className="block text-xs font-medium mb-1.5 fc-text-subtle">Notes</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Optional notes"
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)] resize-none"
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
          className="flex-shrink-0 px-6 py-4 flex gap-3 border-t border-[color:var(--fc-glass-border)]"
        >
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
        </div>
      </div>
    </div>
  );
}

