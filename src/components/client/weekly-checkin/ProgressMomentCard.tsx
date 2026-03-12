"use client";

import React, { useState, useEffect } from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { getPhotosForDate } from "@/lib/progressPhotoService";
import type { ProgressPhoto } from "@/lib/progressPhotoService";
import { Check } from "lucide-react";

interface ProgressMomentCardProps {
  clientId: string;
  isFirstCheckIn: boolean;
  headline: string;
  firstDate: string | null;
  onContinue: () => void;
}

function PhotoThumb({ photo }: { photo: ProgressPhoto }) {
  return (
    <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-[color:var(--fc-glass-border)] flex-shrink-0">
      <img
        src={photo.photo_url}
        alt=""
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function ProgressMomentCard({
  clientId,
  isFirstCheckIn,
  headline,
  firstDate,
  onContinue,
}: ProgressMomentCardProps) {
  const [photosFirst, setPhotosFirst] = useState<ProgressPhoto[]>([]);
  const [photosToday, setPhotosToday] = useState<ProgressPhoto[]>([]);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!firstDate || isFirstCheckIn) return;
    let cancelled = false;
    Promise.all([
      getPhotosForDate(clientId, firstDate),
      getPhotosForDate(clientId, today),
    ]).then(([first, todayList]) => {
      if (!cancelled) {
        setPhotosFirst(first);
        setPhotosToday(todayList);
      }
    });
    return () => { cancelled = true; };
  }, [clientId, firstDate, today, isFirstCheckIn]);

  const hasComparison = !isFirstCheckIn && firstDate && photosFirst.length > 0 && photosToday.length > 0;
  const frontFirst = photosFirst.find((p) => p.photo_type === "front");
  const frontToday = photosToday.find((p) => p.photo_type === "front");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <ClientGlassCard className="max-w-md w-full p-8 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-[color:var(--fc-status-success)]/20 flex items-center justify-center">
          <Check className="w-6 h-6 fc-text-success" strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-bold fc-text-primary mt-2 mb-4">
          Check-in saved
        </h2>
        <p
          className="text-2xl font-bold fc-text-primary mb-6 leading-tight"
          style={{ color: "var(--fc-status-success)" }}
        >
          {headline}
        </p>
        {hasComparison && frontFirst && frontToday && (
          <div className="flex justify-center gap-4 mb-6">
            <div className="text-center">
              <PhotoThumb photo={frontFirst} />
              <p className="text-xs fc-text-subtle mt-1">Then</p>
            </div>
            <div className="text-center">
              <PhotoThumb photo={frontToday} />
              <p className="text-xs fc-text-subtle mt-1">Now</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="fc-btn fc-btn-primary w-full py-3 rounded-xl font-semibold"
        >
          Continue
        </button>
      </ClientGlassCard>
    </div>
  );
}
