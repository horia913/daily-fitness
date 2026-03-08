"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { StepBodyMetrics } from "./StepBodyMetrics";
import { StepPhotos } from "./StepPhotos";
import { StepReview, type WellnessSummary } from "./StepReview";
import type { WeeklyCheckInBodyData, WeeklyCheckInPhotoFiles } from "./WeeklyCheckInFlowTypes";
import type { WeeklyCheckInFlowProps } from "./WeeklyCheckInFlowTypes";
import { getClientMeasurements, upsertMeasurement } from "@/lib/measurementService";
import { uploadPhoto } from "@/lib/progressPhotoService";
import { getLogRange, dbToUiScale } from "@/lib/wellnessService";

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

function computeWellnessSummary(logs: { sleep_hours?: number | null; sleep_quality?: number | null; stress_level?: number | null; soreness_level?: number | null }[]): WellnessSummary | null {
  const complete = logs.filter(
    (l) =>
      l.sleep_hours != null &&
      l.sleep_quality != null &&
      l.stress_level != null &&
      l.soreness_level != null
  );
  if (complete.length === 0) return null;
  const sleepAvg = complete.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / complete.length;
  const stressUi = complete.map((l) => dbToUiScale(l.stress_level) ?? 0);
  const sorenessUi = complete.map((l) => dbToUiScale(l.soreness_level) ?? 0);
  return {
    sleepAvg: Math.round(sleepAvg * 10) / 10,
    stressAvg: Math.round((stressUi.reduce((a, b) => a + b, 0) / stressUi.length) * 10) / 10,
    sorenessAvg: Math.round((sorenessUi.reduce((a, b) => a + b, 0) / sorenessUi.length) * 10) / 10,
  };
}

export function WeeklyCheckInFlow({
  clientId,
  config,
  lastMeasurement,
  lastPhotoDate,
  onComplete,
  onBack,
}: WeeklyCheckInFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bodyData, setBodyData] = useState<WeeklyCheckInBodyData>(emptyBodyData());
  const [photoFiles, setPhotoFiles] = useState<WeeklyCheckInPhotoFiles>({});
  const [notesToCoach, setNotesToCoach] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [previousMeasurement, setPreviousMeasurement] = useState<typeof lastMeasurement>(null);
  const [wellnessThisWeek, setWellnessThisWeek] = useState<WellnessSummary | null>(null);
  const [wellnessLastWeek, setWellnessLastWeek] = useState<WellnessSummary | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;
    const today = new Date().toISOString().split("T")[0];
    const endThis = new Date();
    const startThis = new Date();
    startThis.setDate(startThis.getDate() - 6);
    const startLast = new Date(startThis);
    startLast.setDate(startLast.getDate() - 7);
    const endLast = new Date(startThis);
    endLast.setDate(endLast.getDate() - 1);
    const load = async () => {
      const [measurements, logsThis, logsLast] = await Promise.all([
        getClientMeasurements(clientId, 2),
        getLogRange(clientId, startThis.toISOString().split("T")[0], today),
        getLogRange(clientId, startLast.toISOString().split("T")[0], endLast.toISOString().split("T")[0]),
      ]);
      if (!cancelled) {
        setPreviousMeasurement(measurements[1] ?? null);
        setWellnessThisWeek(computeWellnessSummary(logsThis));
        setWellnessLastWeek(computeWellnessSummary(logsLast));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [step, clientId]);

  const handleSubmit = useCallback(async () => {
    setSubmitError("");
    if (bodyData.weight_kg == null || bodyData.weight_kg <= 0) return;
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const measurement = await upsertMeasurement({
        client_id: clientId,
        measured_date: today,
        weight_kg: bodyData.weight_kg,
        body_fat_percentage: bodyData.body_fat_percentage ?? undefined,
        waist_circumference: bodyData.waist_circumference ?? undefined,
        hips_circumference: bodyData.hips_circumference ?? undefined,
        torso_circumference: bodyData.torso_circumference ?? undefined,
        left_arm_circumference: bodyData.left_arm_circumference ?? undefined,
        right_arm_circumference: bodyData.right_arm_circumference ?? undefined,
        left_thigh_circumference: bodyData.left_thigh_circumference ?? undefined,
        right_thigh_circumference: bodyData.right_thigh_circumference ?? undefined,
        left_calf_circumference: bodyData.left_calf_circumference ?? undefined,
        right_calf_circumference: bodyData.right_calf_circumference ?? undefined,
        muscle_mass_kg: bodyData.muscle_mass_kg ?? undefined,
        visceral_fat_level: bodyData.visceral_fat_level ?? undefined,
        notes: (notesToCoach.trim() || bodyData.notes) || undefined,
      });
      if (!measurement) {
        if (mountedRef.current) setSubmitError("Failed to save measurement.");
        return;
      }
      const order: ("front" | "side" | "back")[] = ["front", "side", "back"];
      for (const type of order) {
        const file = photoFiles[type];
        if (!file) continue;
        if (!mountedRef.current) break;
        try {
          await uploadPhoto(clientId, {
            photo_date: today,
            photo_type: type,
            file,
            weight_kg: bodyData.weight_kg ?? undefined,
            body_fat_percentage: bodyData.body_fat_percentage ?? undefined,
            notes: notesToCoach.trim() || undefined,
          });
        } catch (e) {
          console.error("Photo upload error:", e);
        }
      }
      if (mountedRef.current) {
        onComplete();
        router.push("/client/check-ins");
      }
    } catch (e) {
      console.error("Submit error:", e);
      if (mountedRef.current) setSubmitError("Something went wrong. Please try again.");
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [clientId, bodyData, photoFiles, notesToCoach, onComplete, router]);

  const photosEnabled = config?.photos_enabled ?? true;
  const notesEnabled = config?.notes_to_coach_enabled ?? true;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/client/check-ins"
          className="fc-surface w-10 h-10 flex items-center justify-center rounded-xl border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold fc-text-primary">Monthly Check-In</h1>
          <p className="text-sm fc-text-dim">Step {step} of 3</p>
        </div>
      </div>

      {step === 1 && (
        <StepBodyMetrics
          bodyData={bodyData}
          setBodyData={setBodyData}
          config={config}
          lastMeasurement={lastMeasurement}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepPhotos
          photoFiles={photoFiles}
          setPhotoFiles={setPhotoFiles}
          lastPhotoDate={lastPhotoDate}
          weightKg={bodyData.weight_kg}
          onSkip={() => setStep(3)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepReview
          bodyData={bodyData}
          previousMeasurement={previousMeasurement ?? null}
          wellnessThisWeek={wellnessThisWeek}
          wellnessLastWeek={wellnessLastWeek}
          notesToCoach={notesToCoach}
          setNotesToCoach={setNotesToCoach}
          notesEnabled={notesEnabled}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}

      {submitError && <p className="text-sm fc-text-error">{submitError}</p>}
    </div>
  );
}
