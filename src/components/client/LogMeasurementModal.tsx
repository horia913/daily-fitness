"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
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
  const { isDark, getSemanticColor } = useTheme();
  
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
          <h2
            className="text-2xl font-bold"
            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
          >
            Log Measurement
          </h2>
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
            {/* Weight */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Weight (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter weight in kg"
                className="w-full px-4 py-3 rounded-lg text-lg"
                style={{
                  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  color: isDark ? "#fff" : "#1A1A1A",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
                }}
                required
              />
            </div>

            {/* Waist */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Waist (cm) - Measured at iliac crest
              </label>
              <input
                type="number"
                step="0.1"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-3 rounded-lg text-lg"
                style={{
                  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  color: isDark ? "#fff" : "#1A1A1A",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
                }}
              />
              <p
                className="text-xs mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                }}
              >
                Measure at the top of the iliac crest (hip bone)
              </p>
            </div>

            {/* Body Fat */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Body Fat (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-3 rounded-lg text-lg"
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
              background: getSemanticColor("success").gradient,
              boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
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
                Save Measurement
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

