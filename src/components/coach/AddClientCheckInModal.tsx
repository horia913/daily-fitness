"use client";

import React, { useState } from "react";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertMeasurement } from "@/lib/measurementService";

interface AddClientCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  coachId: string;
}

export function AddClientCheckInModal({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  coachId,
}: AddClientCheckInModalProps) {
  const [measuredDate, setMeasuredDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [waist, setWaist] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const weightNum = weight.trim() ? parseFloat(weight) : null;
    if (weightNum == null || weightNum <= 0) {
      setError("Please enter a valid weight.");
      return;
    }
    setSaving(true);
    try {
      const result = await upsertMeasurement({
        client_id: clientId,
        coach_id: coachId,
        measured_date: measuredDate,
        weight_kg: weightNum,
        body_fat_percentage: bodyFat.trim() ? parseFloat(bodyFat) : undefined,
        waist_circumference: waist.trim() ? parseFloat(waist) : undefined,
        notes: notes.trim() || undefined,
      });
      if (result) {
        onSuccess();
        onClose();
        setWeight("");
        setBodyFat("");
        setWaist("");
        setNotes("");
      } else {
        setError("Failed to save check-in.");
      }
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add check-in for client"
      subtitle="Enter weight and optional metrics from in-person session."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="block text-sm font-medium fc-text-primary mb-2">Date</Label>
          <Input
            type="date"
            value={measuredDate}
            onChange={(e) => setMeasuredDate(e.target.value)}
            required
            className="w-full"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium fc-text-primary mb-2">Weight (kg) *</Label>
          <Input
            type="number"
            step="0.1"
            min="30"
            max="300"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 78.5"
            required
            className="w-full"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium fc-text-primary mb-2">Body fat (%) — optional</Label>
          <Input
            type="number"
            step="0.1"
            min="3"
            max="60"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            placeholder="e.g. 17.8"
            className="w-full"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium fc-text-primary mb-2">Waist (cm) — optional</Label>
          <Input
            type="number"
            step="0.1"
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
            placeholder="e.g. 83"
            className="w-full"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium fc-text-primary mb-2">Notes</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Session notes..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary text-sm resize-none"
          />
        </div>
        {error && <p className="text-sm fc-text-error">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 fc-btn fc-btn-secondary">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 fc-btn fc-btn-primary">
            {saving ? "Saving..." : "Save check-in"}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
