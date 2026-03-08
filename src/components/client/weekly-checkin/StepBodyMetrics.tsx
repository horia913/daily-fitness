"use client";

import React, { useState, useEffect } from "react";
import { ClientGlassCard } from "@/components/client-ui";
import type { WeeklyCheckInBodyData } from "./WeeklyCheckInFlowTypes";
import type { CheckInConfig } from "@/lib/checkInConfigService";
import type { BodyMeasurement } from "@/lib/measurementService";
import { ChevronDown, ChevronUp } from "lucide-react";

const CIRCUMFERENCE_KEYS = [
  "waist",
  "hips",
  "torso",
  "left_arm",
  "right_arm",
  "left_thigh",
  "right_thigh",
  "left_calf",
  "right_calf",
] as const;

interface StepBodyMetricsProps {
  bodyData: WeeklyCheckInBodyData;
  setBodyData: React.Dispatch<React.SetStateAction<WeeklyCheckInBodyData>>;
  config: CheckInConfig | null;
  lastMeasurement: BodyMeasurement | null;
  onNext: () => void;
}

function emptyBodyData(): WeeklyCheckInBodyData {
  return {
    weight_kg: null,
    body_fat_percentage: null,
    waist_circumference: null,
    hips_circumference: null,
    torso_circumference: null,
    left_arm_circumference: null,
    right_arm_circumference: null,
    left_thigh_circumference: null,
    right_thigh_circumference: null,
    left_calf_circumference: null,
    right_calf_circumference: null,
    muscle_mass_kg: null,
    visceral_fat_level: null,
    notes: "",
  };
}

function bodyDataFromMeasurement(m: BodyMeasurement): WeeklyCheckInBodyData {
  return {
    weight_kg: m.weight_kg ?? null,
    body_fat_percentage: m.body_fat_percentage ?? null,
    waist_circumference: m.waist_circumference ?? null,
    hips_circumference: m.hips_circumference ?? null,
    torso_circumference: m.torso_circumference ?? null,
    left_arm_circumference: m.left_arm_circumference ?? null,
    right_arm_circumference: m.right_arm_circumference ?? null,
    left_thigh_circumference: m.left_thigh_circumference ?? null,
    right_thigh_circumference: m.right_thigh_circumference ?? null,
    left_calf_circumference: m.left_calf_circumference ?? null,
    right_calf_circumference: m.right_calf_circumference ?? null,
    muscle_mass_kg: m.muscle_mass_kg ?? null,
    visceral_fat_level: m.visceral_fat_level ?? null,
    notes: m.notes ?? "",
  };
}

export function StepBodyMetrics({
  bodyData,
  setBodyData,
  config,
  lastMeasurement,
  onNext,
}: StepBodyMetricsProps) {
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [error, setError] = useState("");

  const weightRequired = config?.weight_required ?? true;
  const bodyFatEnabled = config?.body_fat_enabled ?? true;
  const circumferencesEnabled = config?.circumferences_enabled ?? [];

  useEffect(() => {
    if (lastMeasurement) {
      setBodyData(bodyDataFromMeasurement(lastMeasurement));
    } else {
      setBodyData(emptyBodyData());
    }
  }, [lastMeasurement]);

  const handleNext = () => {
    setError("");
    if (weightRequired && (bodyData.weight_kg == null || bodyData.weight_kg <= 0)) {
      setError("Please enter a valid weight.");
      return;
    }
    onNext();
  };

  const updateCircumference = (key: (typeof CIRCUMFERENCE_KEYS)[number], value: string) => {
    const num = value.trim() ? parseFloat(value) : null;
    const fieldMap: Record<string, keyof WeeklyCheckInBodyData> = {
      waist: "waist_circumference",
      hips: "hips_circumference",
      torso: "torso_circumference",
      left_arm: "left_arm_circumference",
      right_arm: "right_arm_circumference",
      left_thigh: "left_thigh_circumference",
      right_thigh: "right_thigh_circumference",
      left_calf: "left_calf_circumference",
      right_calf: "right_calf_circumference",
    };
    const field = fieldMap[key];
    if (field) setBodyData((prev) => ({ ...prev, [field]: num !== null && !isNaN(num) ? num : null }));
  };

  const circumferenceValue = (key: (typeof CIRCUMFERENCE_KEYS)[number]) => {
    const field = key === "waist" ? "waist_circumference" : key === "hips" ? "hips_circumference" : key === "torso" ? "torso_circumference" : key === "left_arm" ? "left_arm_circumference" : key === "right_arm" ? "right_arm_circumference" : key === "left_thigh" ? "left_thigh_circumference" : key === "right_thigh" ? "right_thigh_circumference" : key === "left_calf" ? "left_calf_circumference" : "right_calf_circumference";
    const v = bodyData[field];
    return v != null ? String(v) : "";
  };

  const labelFor = (key: string) => {
    const labels: Record<string, string> = {
      waist: "Waist (cm)",
      hips: "Hips (cm)",
      torso: "Torso (cm)",
      left_arm: "Left arm (cm)",
      right_arm: "Right arm (cm)",
      left_thigh: "Left thigh (cm)",
      right_thigh: "Right thigh (cm)",
      left_calf: "Left calf (cm)",
      right_calf: "Right calf (cm)",
    };
    return labels[key] ?? key;
  };

  const showCircumferenceSection = circumferencesEnabled.length > 0 || true;

  return (
    <ClientGlassCard className="p-6 sm:p-8">
      <p className="text-sm fc-text-subtle mb-4">Step 1 of 3</p>
      <h2 className="text-xl font-bold fc-text-primary mb-1">Body metrics</h2>
      {lastMeasurement?.weight_kg != null && (
        <p className="text-sm fc-text-dim mb-6">
          Last check-in: {lastMeasurement.weight_kg.toFixed(1)} kg
          {lastMeasurement.body_fat_percentage != null && ` · ${lastMeasurement.body_fat_percentage.toFixed(1)}% body fat`}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium fc-text-primary mb-2">
            Weight (kg) {weightRequired && <span className="fc-text-error">*</span>}
          </label>
          <input
            type="number"
            step="0.1"
            min="30"
            max="300"
            value={bodyData.weight_kg != null ? String(bodyData.weight_kg) : ""}
            onChange={(e) => {
              const v = e.target.value.trim() ? parseFloat(e.target.value) : null;
              setBodyData((prev) => ({ ...prev, weight_kg: v !== null && !isNaN(v) ? v : null }));
            }}
            placeholder="e.g. 78.5"
            className="w-full px-4 py-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
          />
        </div>

        {bodyFatEnabled && (
          <div>
            <label className="block text-sm font-medium fc-text-primary mb-2">Body fat (%) — optional</label>
            <input
              type="number"
              step="0.1"
              min="3"
              max="60"
              value={bodyData.body_fat_percentage != null ? String(bodyData.body_fat_percentage) : ""}
              onChange={(e) => {
                const v = e.target.value.trim() ? parseFloat(e.target.value) : null;
                setBodyData((prev) => ({ ...prev, body_fat_percentage: v !== null && !isNaN(v) ? v : null }));
              }}
              placeholder="e.g. 17.8"
              className="w-full px-4 py-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
            />
          </div>
        )}

        {showCircumferenceSection && (
          <>
            <button
              type="button"
              onClick={() => setShowMeasurements(!showMeasurements)}
              className="flex items-center gap-2 text-sm font-medium fc-text-primary"
            >
              {showMeasurements ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Show measurements
            </button>
            {showMeasurements && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {(circumferencesEnabled.length > 0 ? circumferencesEnabled as (typeof CIRCUMFERENCE_KEYS)[number][] : CIRCUMFERENCE_KEYS).map((key) => (
                  <div key={key}>
                    <label className="block text-xs font-medium fc-text-subtle mb-1">{labelFor(key)}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={circumferenceValue(key)}
                      onChange={(e) => updateCircumference(key, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {error && <p className="text-sm fc-text-error mt-4">{error}</p>}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={handleNext}
          className="fc-btn fc-btn-primary px-6 py-3 rounded-xl font-semibold"
        >
          Next →
        </button>
      </div>
    </ClientGlassCard>
  );
}
