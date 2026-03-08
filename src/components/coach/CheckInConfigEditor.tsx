"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CheckInConfig, UpsertCheckInConfigInput } from "@/lib/checkInConfigService";
import { getClientCheckInConfig, upsertCheckInConfig } from "@/lib/checkInConfigService";

const FREQUENCY_OPTIONS = [
  { value: 7, label: "Every 7 days (weekly)" },
  { value: 14, label: "Every 14 days (bi-weekly)" },
  { value: 30, label: "Every 30 days (monthly)" },
];

const CIRCUMFERENCE_OPTIONS = [
  { id: "waist", label: "Waist" },
  { id: "hips", label: "Hips" },
  { id: "torso", label: "Torso" },
  { id: "left_arm", label: "Left arm" },
  { id: "right_arm", label: "Right arm" },
  { id: "left_thigh", label: "Left thigh" },
  { id: "right_thigh", label: "Right thigh" },
  { id: "left_calf", label: "Left calf" },
  { id: "right_calf", label: "Right calf" },
];

interface CheckInConfigEditorProps {
  coachId: string;
  clientId: string;
  onSaved?: () => void;
}

export function CheckInConfigEditor({ coachId, clientId, onSaved }: CheckInConfigEditorProps) {
  const [config, setConfig] = useState<CheckInConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [frequencyDays, setFrequencyDays] = useState(7);
  const [weightRequired, setWeightRequired] = useState(true);
  const [bodyFatEnabled, setBodyFatEnabled] = useState(true);
  const [photosEnabled, setPhotosEnabled] = useState(true);
  const [circumferencesEnabled, setCircumferencesEnabled] = useState<string[]>([]);
  const [notesToCoachEnabled, setNotesToCoachEnabled] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getClientCheckInConfig(clientId);
        setConfig(data);
        if (data) {
          setFrequencyDays(data.frequency_days);
          setWeightRequired(data.weight_required);
          setBodyFatEnabled(data.body_fat_enabled);
          setPhotosEnabled(data.photos_enabled);
          setCircumferencesEnabled(Array.isArray(data.circumferences_enabled) ? data.circumferences_enabled : []);
          setNotesToCoachEnabled(data.notes_to_coach_enabled);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clientId]);

  const handleToggleCircumference = (id: string) => {
    setCircumferencesEnabled((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const input: UpsertCheckInConfigInput = {
      frequency_days: frequencyDays,
      weight_required: weightRequired,
      body_fat_enabled: bodyFatEnabled,
      photos_enabled: photosEnabled,
      circumferences_enabled: circumferencesEnabled,
      notes_to_coach_enabled: notesToCoachEnabled,
    };
    const result = await upsertCheckInConfig(coachId, clientId, input);
    setSaving(false);
    if (result) {
      setConfig(result);
      onSaved?.();
    }
  };

  if (loading) {
    return (
      <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-6 animate-pulse">
        <div className="h-6 w-48 rounded bg-[color:var(--fc-glass-highlight)] mb-4" />
        <div className="h-10 rounded bg-[color:var(--fc-glass-highlight)] mb-4" />
        <div className="h-24 rounded bg-[color:var(--fc-glass-highlight)]" />
      </div>
    );
  }

  return (
    <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
      <h3 className="text-lg font-semibold fc-text-primary mb-4">Check-in settings</h3>
      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium fc-text-primary mb-2">Check-in frequency</Label>
          <select
            value={frequencyDays}
            onChange={(e) => setFrequencyDays(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary text-sm"
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={weightRequired}
              onChange={(e) => setWeightRequired(e.target.checked)}
              className="rounded border-[color:var(--fc-glass-border)]"
            />
            <span className="text-sm fc-text-primary">Weight required</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bodyFatEnabled}
              onChange={(e) => setBodyFatEnabled(e.target.checked)}
              className="rounded border-[color:var(--fc-glass-border)]"
            />
            <span className="text-sm fc-text-primary">Body fat enabled</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={photosEnabled}
              onChange={(e) => setPhotosEnabled(e.target.checked)}
              className="rounded border-[color:var(--fc-glass-border)]"
            />
            <span className="text-sm fc-text-primary">Photos enabled</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notesToCoachEnabled}
              onChange={(e) => setNotesToCoachEnabled(e.target.checked)}
              className="rounded border-[color:var(--fc-glass-border)]"
            />
            <span className="text-sm fc-text-primary">Notes to coach</span>
          </label>
        </div>
        <div>
          <Label className="block text-sm font-medium fc-text-primary mb-2">Circumference measurements (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {CIRCUMFERENCE_OPTIONS.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={circumferencesEnabled.includes(opt.id)}
                  onChange={() => handleToggleCircumference(opt.id)}
                  className="rounded border-[color:var(--fc-glass-border)]"
                />
                <span className="text-sm fc-text-primary">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="fc-btn fc-btn-primary"
        >
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
