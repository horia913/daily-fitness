"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Save } from "lucide-react";
import { createMeasurement } from "@/lib/measurementService";

interface LogMeasurementModalProps {
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogMeasurementModal({
  clientId,
  onClose,
  onSuccess,
}: LogMeasurementModalProps) {
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        waist_circumference: waist ? parseFloat(waist) : undefined,
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : undefined,
      });

      if (result) {
        onSuccess();
        onClose();
      } else {
        setError("Failed to save measurement");
      }
    } catch (err) {
      console.error("Error saving measurement:", err);
      setError("Failed to save measurement. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div
        className="w-full max-w-[500px] max-h-[88vh] h-[88vh] fc-modal fc-card overflow-hidden flex flex-col"
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
            className="p-2 rounded-full fc-btn fc-btn-ghost"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* Weight */}
            <div>
              <label className="block text-sm font-medium mb-2 fc-text-primary">
                Weight (kg) <span className="fc-text-error">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter weight in kg"
                className="w-full px-4 py-3 rounded-xl text-base fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
                required
              />
            </div>

            {/* Waist */}
            <div>
              <label className="block text-sm font-medium mb-2 fc-text-primary">
                Waist (cm) - Measured at iliac crest
              </label>
              <input
                type="number"
                step="0.1"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-3 rounded-xl text-base fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
              />
              <p className="text-xs mt-2 fc-text-subtle">
                Measure at the top of the iliac crest (hip bone)
              </p>
            </div>

            {/* Body Fat */}
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

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-status-error)] fc-text-error">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-6 py-4 flex gap-3 border-t border-[color:var(--fc-glass-border)]"
        >
          <Button variant="ghost" onClick={onClose} className="flex-1 fc-btn fc-btn-ghost">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 fc-btn fc-btn-primary fc-press"
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

