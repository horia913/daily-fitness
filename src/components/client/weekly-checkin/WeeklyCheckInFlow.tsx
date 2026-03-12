"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { StepBodyMetrics } from "./StepBodyMetrics";
import { StepPhotos } from "./StepPhotos";
import { StepReview, type WellnessSummary } from "./StepReview";
import { ProgressMomentCard } from "./ProgressMomentCard";
import type { WeeklyCheckInBodyData, WeeklyCheckInPhotoFiles } from "./WeeklyCheckInFlowTypes";
import type { WeeklyCheckInFlowProps } from "./WeeklyCheckInFlowTypes";
import { getClientMeasurements, getFirstMeasurement, upsertMeasurement } from "@/lib/measurementService";
import { uploadPhoto } from "@/lib/progressPhotoService";
import { getLogRange, dbToUiScale } from "@/lib/wellnessService";
import { AchievementService } from "@/lib/achievementService";
import { AchievementUnlockModal } from "@/components/ui/AchievementUnlockModal";
import type { Achievement } from "@/components/ui/AchievementCard";

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
  const [showProgressMoment, setShowProgressMoment] = useState(false);
  const [progressMomentHeadline, setProgressMomentHeadline] = useState("");
  const [progressMomentFirstDate, setProgressMomentFirstDate] = useState<string | null>(null);

  const [previousMeasurement, setPreviousMeasurement] = useState<typeof lastMeasurement>(null);
  const [firstMeasurement, setFirstMeasurement] = useState<typeof lastMeasurement>(null);
  const [wellnessThisWeek, setWellnessThisWeek] = useState<WellnessSummary | null>(null);
  const [wellnessLastWeek, setWellnessLastWeek] = useState<WellnessSummary | null>(null);
  const [newAchievementsQueue, setNewAchievementsQueue] = useState<Achievement[]>([]);
  const [achievementModalIndex, setAchievementModalIndex] = useState(0);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
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
      const [measurements, first, logsThis, logsLast] = await Promise.all([
        getClientMeasurements(clientId, 2),
        getFirstMeasurement(clientId),
        getLogRange(clientId, startThis.toISOString().split("T")[0], today),
        getLogRange(clientId, startLast.toISOString().split("T")[0], endLast.toISOString().split("T")[0]),
      ]);
      if (!cancelled) {
        setPreviousMeasurement(measurements[1] ?? null);
        setFirstMeasurement(first);
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
        try {
          const weightNew = await AchievementService.checkAndUnlockAchievements(clientId, "weight_goal");
          if (weightNew.length > 0) {
            const tierToRarity = (tier: string | null): Achievement["rarity"] =>
              !tier ? "uncommon" : tier === "platinum" ? "epic" : tier === "gold" ? "rare" : tier === "silver" ? "uncommon" : "common";
            const mapped: Achievement[] = weightNew.map((a) => ({
              id: a.templateId,
              name: a.templateName,
              description: a.description ?? "",
              icon: a.templateIcon ?? "🏆",
              rarity: tierToRarity(a.tier),
              unlocked: true,
            }));
            setNewAchievementsQueue(mapped);
            setAchievementModalIndex(0);
          }
        } catch (achErr) {
          console.warn("Error checking weight goal achievements:", achErr);
        }
        const isFirst = !firstMeasurement;
        if (isFirst) {
          setProgressMomentHeadline("First check-in logged! Your journey starts now.");
          setProgressMomentFirstDate(null);
        } else {
          const current = bodyData;
          const first = firstMeasurement;
          type Candidate = { label: string; pct: number; text: string };
          const candidates: Candidate[] = [];
          if (first.weight_kg != null && current.weight_kg != null && first.weight_kg > 0) {
            const diff = first.weight_kg - current.weight_kg;
            const pct = (diff / first.weight_kg) * 100;
            if (diff > 0) candidates.push({ label: "Weight", pct, text: `You've lost ${diff.toFixed(1)} kg since you started!` });
            else if (diff < 0) candidates.push({ label: "Weight", pct, text: `You've gained ${Math.abs(diff).toFixed(1)} kg since you started.` });
          }
          if (first.body_fat_percentage != null && current.body_fat_percentage != null && first.body_fat_percentage > 0) {
            const diff = first.body_fat_percentage - current.body_fat_percentage;
            const pct = (diff / first.body_fat_percentage) * 100;
            if (diff > 0) candidates.push({ label: "Body fat", pct, text: `Your body fat is down ${diff.toFixed(1)}% since you started!` });
          }
          if (first.waist_circumference != null && current.waist_circumference != null && first.waist_circumference > 0) {
            const diff = first.waist_circumference - current.waist_circumference;
            const pct = (diff / first.waist_circumference) * 100;
            if (diff > 0) candidates.push({ label: "Waist", pct, text: `Your waist is down ${diff.toFixed(1)} cm since you started!` });
          }
          const best = candidates.length > 0
            ? candidates.reduce((a, b) => (Math.abs(a.pct) > Math.abs(b.pct) ? a : b))
            : null;
          setProgressMomentHeadline(best?.text ?? "Check-in saved. Keep up the great work!");
          setProgressMomentFirstDate(first.measured_date ?? null);
        }
        setShowProgressMoment(true);
      }
    } catch (e) {
      console.error("Submit error:", e);
      if (mountedRef.current) setSubmitError("Something went wrong. Please try again.");
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [clientId, bodyData, photoFiles, notesToCoach, onComplete, router, firstMeasurement]);

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
          <h1 className="text-2xl font-bold fc-text-primary">
            Scheduled Check-In{config?.frequency_days ? ` · ${config.frequency_days === 7 ? "Weekly" : config.frequency_days === 14 ? "Every 2 weeks" : config.frequency_days === 30 ? "Monthly" : `Every ${config.frequency_days} days`}` : ""}
          </h1>
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
          firstMeasurement={firstMeasurement ?? null}
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

      {showProgressMoment && (
        <ProgressMomentCard
          clientId={clientId}
          isFirstCheckIn={!firstMeasurement}
          headline={progressMomentHeadline}
          firstDate={progressMomentFirstDate}
          onContinue={() => {
            setShowProgressMoment(false);
            if (newAchievementsQueue.length > 0) {
              setShowAchievementModal(true);
            } else {
              router.push("/client/check-ins");
            }
          }}
        />
      )}

      {showAchievementModal && newAchievementsQueue.length > 0 && (
        <AchievementUnlockModal
          achievement={newAchievementsQueue[achievementModalIndex] ?? null}
          visible={achievementModalIndex < newAchievementsQueue.length}
          onClose={() => {
            if (achievementModalIndex < newAchievementsQueue.length - 1) {
              setAchievementModalIndex((i) => i + 1);
            } else {
              setNewAchievementsQueue([]);
              setAchievementModalIndex(0);
              setShowAchievementModal(false);
              router.push("/client/check-ins");
            }
          }}
        />
      )}
    </div>
  );
}
