"use client";

import React from "react";
import { ClientGlassCard } from "@/components/client-ui";
import type { WeeklyCheckInPhotoFiles } from "./WeeklyCheckInFlowTypes";
import { Camera } from "lucide-react";

const PHOTO_TYPES = ["front", "side", "back"] as const;

interface StepPhotosProps {
  photoFiles: WeeklyCheckInPhotoFiles;
  setPhotoFiles: React.Dispatch<React.SetStateAction<WeeklyCheckInPhotoFiles>>;
  lastPhotoDate: string | null;
  weightKg: number | null;
  onSkip: () => void;
  onNext: () => void;
}

export function StepPhotos({
  photoFiles,
  setPhotoFiles,
  lastPhotoDate,
  weightKg,
  onSkip,
  onNext,
}: StepPhotosProps) {
  const handleFile = (type: "front" | "side" | "back", file: File | null) => {
    if (!file) {
      setPhotoFiles((prev) => ({ ...prev, [type]: undefined }));
      return;
    }
    if (!file.type.startsWith("image/")) return;
    setPhotoFiles((prev) => ({ ...prev, [type]: file }));
  };

  const hasAny = photoFiles.front || photoFiles.side || photoFiles.back;

  return (
    <ClientGlassCard className="p-6 sm:p-8">
      <p className="text-sm fc-text-subtle mb-4">Step 2 of 3</p>
      <h2 className="text-xl font-bold fc-text-primary mb-1">Progress photos</h2>
      <p className="text-sm fc-text-dim mb-6">Optional — add front, side, and/or back.</p>
      {lastPhotoDate && (
        <p className="text-sm fc-text-subtle mb-6">
          Last photos: {new Date(lastPhotoDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {PHOTO_TYPES.map((type) => {
          const file = photoFiles[type];
          const preview = file ? URL.createObjectURL(file) : null;
          return (
            <div key={type}>
              <label className="block text-sm font-medium fc-text-primary mb-2 capitalize">{type}</label>
              <label className="block aspect-[3/4] rounded-xl border-2 border-dashed border-[color:var(--fc-glass-border)] overflow-hidden cursor-pointer hover:border-[color:var(--fc-accent-cyan)] transition-colors">
                {preview ? (
                  <img src={preview} alt={type} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center fc-text-subtle">
                    <Camera className="w-10 h-10 mb-2" />
                    <span className="text-sm">Add {type}</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    handleFile(type, f ?? null);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onSkip} className="fc-btn fc-btn-secondary px-6 py-3 rounded-xl font-medium">
          Skip
        </button>
        <button type="button" onClick={onNext} className="fc-btn fc-btn-primary px-6 py-3 rounded-xl font-semibold">
          Next →
        </button>
      </div>
    </ClientGlassCard>
  );
}
