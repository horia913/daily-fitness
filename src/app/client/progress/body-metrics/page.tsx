"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  ArrowLeft,
  Scale,
  TrendingUp,
  TrendingDown,
  Plus,
  Activity,
  Target,
  ListFilter,
  Camera,
  Ruler,
  GitCompare,
  X,
  Save,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { isFromCheckIns, progressBackHref } from "@/lib/clientProgressNav";
import { useToast } from "@/components/ui/toast-provider";
import { supabase } from "@/lib/supabase";
import { LogMeasurementModal } from "@/components/client/LogMeasurementModal";
import { AchievementUnlockModal } from "@/components/ui/AchievementUnlockModal";
import type { Achievement } from "@/components/ui/AchievementCard";
import { BodyMeasurement } from "@/lib/measurementService";
import type { NewlyUnlockedAchievement } from "@/lib/achievementService";
import { MeasurementMiniChart } from "@/components/progress/MeasurementMiniChart";
import { ClientPageShell } from "@/components/client-ui";
import { cn } from "@/lib/utils";
import {
  getPhotosForDate,
  uploadPhoto,
  getPhotoTimeline,
  getComparisonPhotos,
  getLatestWeightForPhoto,
  deletePhoto,
  type ProgressPhoto,
} from "@/lib/progressPhotoService";
import { getNutritionComplianceTrend, parseNutritionGoalsFromRows } from "@/lib/nutritionLogService";

interface BodyMetric {
  date: string;
  weight: number;
  waist?: number;
  bodyFat?: number;
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = Math.round((now.getTime() - d.getTime()) / (60 * 60 * 1000));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type PhotoType = "front" | "side" | "back";
type BodyMetricsTabId = "overview" | "weight-bf" | "measurements" | "photos" | "history";

function formatPhotoDateLong(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeBodyMetricsTab(
  raw: string | null,
  hasCircumference: boolean
): BodyMetricsTabId {
  if (!raw) return "overview";
  if (raw === "measurements" && !hasCircumference) return "overview";
  if (
    raw === "overview" ||
    raw === "weight-bf" ||
    raw === "measurements" ||
    raw === "photos" ||
    raw === "history"
  ) {
    return raw;
  }
  return "overview";
}

interface PhotoSlot {
  type: PhotoType;
  label: string;
  file: File | null;
  preview: string | null;
  existingPhoto: ProgressPhoto | null;
}

function BodyMetricsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { addToast } = useToast();
  const fromCheckIns = isFromCheckIns(searchParams);
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [fullMeasurements, setFullMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newAchievementsQueue, setNewAchievementsQueue] = useState<Achievement[]>([]);
  const [achievementModalIndex, setAchievementModalIndex] = useState(0);
  const [chartRange, setChartRange] = useState<"12M" | "6M" | "1M">("12M");
  const [activeTab, setActiveTab] = useState<BodyMetricsTabId>("overview");
  const [latestDatePhotos, setLatestDatePhotos] = useState<{ url: string; type: string }[]>([]);
  const [previousDatePhotos, setPreviousDatePhotos] = useState<{ url: string; type: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const [checkInGoals, setCheckInGoals] = useState<Array<{ id: string; title: string; target_value: number; target_unit: string | null }>>([]);
  const [hasNutritionGoals, setHasNutritionGoals] = useState(false);
  const [nutritionAdherence30, setNutritionAdherence30] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const todayPhoto = new Date().toISOString().split("T")[0];
  const [photoTimeline, setPhotoTimeline] = useState<
    { date: string; types: string[]; weight_kg?: number | null }[]
  >([]);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoTimelineSelectedDate, setPhotoTimelineSelectedDate] = useState<string | null>(null);
  const [photoTimelineSelectedPhotos, setPhotoTimelineSelectedPhotos] = useState<ProgressPhoto[]>([]);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonDate1, setComparisonDate1] = useState<string | null>(null);
  const [comparisonDate2, setComparisonDate2] = useState<string | null>(null);
  const [comparisonPhotos, setComparisonPhotos] = useState<{
    before: ProgressPhoto[];
    after: ProgressPhoto[];
  } | null>(null);
  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState<string | null>(null);
  const [photoUploadWeight, setPhotoUploadWeight] = useState("");
  const [photoUploadNotes, setPhotoUploadNotes] = useState("");
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([
    { type: "front", label: "Front", file: null, preview: null, existingPhoto: null },
    { type: "side", label: "Side", file: null, preview: null, existingPhoto: null },
    { type: "back", label: "Back", file: null, preview: null, existingPhoto: null },
  ]);
  const [photoStripNonce, setPhotoStripNonce] = useState(0);
  const [photoTimelineLoading, setPhotoTimelineLoading] = useState(false);

  const loadMetricsData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    setLoadingStartedAt(Date.now());
    try {
      // Load 12 months of data (for 12M range)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const dateFrom = twelveMonthsAgo.toISOString().split("T")[0];

      // Single body_metrics fetch (full columns); chart subset derived client-side
      const { data: fullData, error: fullError } = await supabase
        .from("body_metrics")
        .select("*")
        .eq("client_id", user.id)
        .gte("measured_date", dateFrom)
        .order("measured_date", { ascending: false });

      if (fullError) {
        console.error("Error loading body metrics:", fullError);
        setFullMeasurements([]);
        setMetrics([]);
      } else {
        setFullMeasurements(fullData || []);
        // Derive chart subset from full data (ascending by date for chart)
        const sorted = [...(fullData || [])].sort(
          (a, b) => a.measured_date.localeCompare(b.measured_date)
        );
        setMetrics(
          sorted.map((m) => ({
            date: m.measured_date,
            weight: m.weight_kg,
            waist: m.waist_circumference ?? undefined,
            bodyFat: m.body_fat_percentage ?? undefined,
          }))
        );
      }

      // Single goals fetch for both check-in and nutrition pillars
      const { data: goalsData } = await supabase
        .from("goals")
        .select("id, title, target_value, target_unit, pillar")
        .eq("client_id", user.id)
        .in("pillar", ["checkins", "nutrition"])
        .eq("status", "active")
        .not("target_value", "is", null);

      const allGoals = goalsData || [];
      const checkInGoalsRows = allGoals.filter((g) => g.pillar === "checkins");
      const nutritionGoalsRows = allGoals.filter((g) => g.pillar === "nutrition");

      setCheckInGoals(
        checkInGoalsRows.map((g) => ({
          id: g.id,
          title: g.title ?? "",
          target_value: Number(g.target_value),
          target_unit: g.target_unit ?? null,
        }))
      );

      const nutritionGoals = parseNutritionGoalsFromRows(nutritionGoalsRows);
      setHasNutritionGoals(nutritionGoals != null);
      if (nutritionGoals != null) {
        const end30 = new Date();
        const start30 = new Date();
        start30.setDate(start30.getDate() - 30);
        const startStr = start30.toISOString().split("T")[0];
        const endStr = end30.toISOString().split("T")[0];
        const trend = await getNutritionComplianceTrend(
          user.id,
          startStr,
          endStr,
          nutritionGoals
        );
        const daysWithData = trend.filter((d) => d.compliance > 0).length;
        const avgAdherence =
          trend.length > 0
            ? Math.round(
                trend.reduce((s, d) => s + d.compliance, 0) / trend.length
              )
            : 0;
        setNutritionAdherence30(daysWithData > 0 ? avgAdherence : null);
      } else {
        setNutritionAdherence30(null);
      }
    } catch (err) {
      console.error("Error loading body metrics:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load metrics");
      setMetrics([]);
      setFullMeasurements([]);
    } finally {
      setLoading(false);
      setLoadingStartedAt(null);
    }
  }, [user]);

  const loadPhotoTimelineOnly = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getPhotoTimeline(user.id);
      setPhotoTimeline(data);
    } catch (e) {
      console.error("Error loading photo timeline:", e);
    }
  }, [user?.id]);

  const loadTodayPhotoSlots = useCallback(async () => {
    if (!user?.id) return;
    try {
      const photos = await getPhotosForDate(user.id, todayPhoto);
      setPhotoSlots((slots) =>
        slots.map((slot) => {
          const existing = photos.find((p) => p.photo_type === slot.type);
          return {
            ...slot,
            existingPhoto: existing || null,
            preview: existing?.photo_url || null,
            file: null,
          };
        })
      );
    } catch (e) {
      console.error("Error loading today's photos:", e);
    }
  }, [user?.id, todayPhoto]);

  const loadLatestWeightForPhotoSlots = useCallback(async () => {
    if (!user?.id) return;
    try {
      const w = await getLatestWeightForPhoto(user.id);
      if (w != null) setPhotoUploadWeight(String(w));
    } catch (e) {
      console.error("Error loading latest weight for photos:", e);
    }
  }, [user?.id]);

  const refreshPhotoData = useCallback(async () => {
    await Promise.all([loadPhotoTimelineOnly(), loadTodayPhotoSlots()]);
  }, [loadPhotoTimelineOnly, loadTodayPhotoSlots]);

  useEffect(() => {
    if (!user?.id || authLoading) return;
    void refreshPhotoData();
    void loadLatestWeightForPhotoSlots();
  }, [user?.id, authLoading, refreshPhotoData, loadLatestWeightForPhotoSlots]);

  useEffect(() => {
    if (!user || authLoading) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setLoadError("Loading took too long. Tap Retry to try again.");
    }, 20_000);
    loadMetricsData().finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [loadMetricsData, user, authLoading]);

  // Latest = most recent check-in, previous = one before that (for "last vs current" comparison)
  const { latest, previous } = useMemo(() => {
    if (fullMeasurements.length === 0) return { latest: null, previous: null };
    const latestEntry = fullMeasurements[0];
    const previousEntry = fullMeasurements.length >= 2 ? fullMeasurements[1] : null;
    return { latest: latestEntry, previous: previousEntry };
  }, [fullMeasurements]);

  const daysSincePrevious = useMemo(() => {
    if (!previous?.measured_date) return null;
    const prev = new Date(previous.measured_date + "T12:00:00Z");
    const now = new Date();
    return Math.floor((now.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
  }, [previous]);

  useEffect(() => {
    if (!user?.id || !latest?.measured_date) {
      setLatestDatePhotos([]);
      return;
    }
    let cancelled = false;
    getPhotosForDate(user.id, latest.measured_date).then((photos) => {
      if (!cancelled)
        setLatestDatePhotos(photos.map((p) => ({ url: p.photo_url, type: p.photo_type })));
    });
    return () => { cancelled = true; };
  }, [user?.id, latest?.measured_date, photoStripNonce]);
  useEffect(() => {
    if (!user?.id || !previous?.measured_date) {
      setPreviousDatePhotos([]);
      return;
    }
    let cancelled = false;
    getPhotosForDate(user.id, previous.measured_date).then((photos) => {
      if (!cancelled)
        setPreviousDatePhotos(photos.map((p) => ({ url: p.photo_url, type: p.photo_type })));
    });
    return () => { cancelled = true; };
  }, [user?.id, previous?.measured_date, photoStripNonce]);

  const { current, previous: previousMetric } = useMemo(() => {
    if (metrics.length === 0) return { current: null, previous: null };
    const latestM = metrics[0];
    const prevM = metrics.length >= 2 ? metrics[1] : null;
    return { current: latestM, previous: prevM };
  }, [metrics]);

  const currentWeight = latest?.weight_kg ?? current?.weight ?? 0;
  const currentWaist = latest?.waist_circumference ?? current?.waist ?? 0;
  const currentBodyFat = latest?.body_fat_percentage ?? current?.bodyFat ?? 0;
  const weightChange = previous ? (latest?.weight_kg ?? 0) - (previous.weight_kg ?? 0) : 0;
  const waistChange =
    previous && (latest?.waist_circumference != null) && (previous.waist_circumference != null)
      ? (latest.waist_circumference ?? 0) - (previous.waist_circumference ?? 0)
      : null;
  const bodyFatChange =
    previous && (latest?.body_fat_percentage != null) && (previous.body_fat_percentage != null)
      ? (latest.body_fat_percentage ?? 0) - (previous.body_fat_percentage ?? 0)
      : null;
  const muscleChange = previous && (latest?.muscle_mass_kg != null) && (previous.muscle_mass_kg != null)
    ? (latest.muscle_mass_kg ?? 0) - (previous.muscle_mass_kg ?? 0)
    : null;

  const historyNewestFirst = useMemo(
    () => [...metrics].reverse(),
    [metrics]
  );

  const latestDate = metrics.length > 0 ? metrics[metrics.length - 1].date : null;

  // Nutrition vs body composition: last 30 days body_metrics + adherence
  const bodyMetricsLast30 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return fullMeasurements
      .filter((m) => m.measured_date >= cutoffStr)
      .sort((a, b) => a.measured_date.localeCompare(b.measured_date));
  }, [fullMeasurements]);

  const nutritionVsBodyInsight = useMemo(() => {
    if (!hasNutritionGoals || bodyMetricsLast30.length < 2 || nutritionAdherence30 == null)
      return null;
    const first = bodyMetricsLast30[0];
    const last = bodyMetricsLast30[bodyMetricsLast30.length - 1];
    const weightChange =
      (last?.weight_kg ?? 0) - (first?.weight_kg ?? 0);
    const highAdherence = nutritionAdherence30 >= 70;
    const lowAdherence = nutritionAdherence30 < 50;
    // "Goal direction": assume weight loss is common goal; if weight went down, trending toward goal
    const weightTowardGoal = weightChange < 0;
    const weightStable = Math.abs(weightChange) < 0.5;
    const weightProgress = Math.abs(weightChange) >= 0.5;

    let message: string;
    if (highAdherence && weightTowardGoal)
      message =
        "Nutrition consistency is paying off — your body composition is moving in the right direction";
    else if (highAdherence && weightStable)
      message =
        "You're eating consistently but weight is stable — this could mean body recomposition. Check circumferences and photos for the full picture";
    else if (lowAdherence && !weightProgress)
      message =
        "Inconsistent nutrition may be limiting your results. Try hitting your targets more consistently this week";
    else if (lowAdherence && weightProgress)
      message =
        "You're making progress even with inconsistent nutrition — imagine what consistent eating could do";
    else
      message =
        "Nutrition consistency is paying off — your body composition is moving in the right direction";

    return { message, weightChange, adherence: nutritionAdherence30 };
  }, [
    hasNutritionGoals,
    bodyMetricsLast30,
    nutritionAdherence30,
  ]);

  // Check if there's circumference data to show Measurements tab
  const hasCircumferenceData = useMemo(() => {
    return fullMeasurements.some((m) => 
      m.left_arm_circumference != null ||
      m.right_arm_circumference != null ||
      m.torso_circumference != null ||
      m.hips_circumference != null ||
      m.left_thigh_circumference != null ||
      m.right_thigh_circumference != null ||
      m.left_calf_circumference != null ||
      m.right_calf_circumference != null
    );
  }, [fullMeasurements]);

  const setTab = useCallback(
    (tab: BodyMetricsTabId) => {
      const effective =
        tab === "measurements" && !hasCircumferenceData ? "overview" : tab;
      setActiveTab(effective);
      const p = new URLSearchParams(searchParams.toString());
      if (effective === "overview") {
        p.delete("tab");
      } else {
        p.set("tab", effective);
      }
      const q = p.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [hasCircumferenceData, pathname, router, searchParams]
  );

  useEffect(() => {
    if (loading) return;
    const normalized = normalizeBodyMetricsTab(
      searchParams.get("tab"),
      hasCircumferenceData
    );
    setActiveTab(normalized);
    const raw = searchParams.get("tab");
    if (raw && normalized !== raw) {
      const p = new URLSearchParams(searchParams.toString());
      if (normalized === "overview") p.delete("tab");
      else p.set("tab", normalized);
      const q = p.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [loading, searchParams, hasCircumferenceData, pathname, router]);

  const loadComparison = useCallback(async () => {
    if (!comparisonDate1 || !comparisonDate2 || !user?.id) return;
    try {
      const photos = await getComparisonPhotos(
        user.id,
        comparisonDate1,
        comparisonDate2
      );
      setComparisonPhotos(photos);
    } catch (e) {
      console.error("Error loading comparison:", e);
    }
  }, [comparisonDate1, comparisonDate2, user?.id]);

  useEffect(() => {
    if (comparisonMode && comparisonDate1 && comparisonDate2 && user?.id) {
      void loadComparison();
    }
  }, [comparisonMode, comparisonDate1, comparisonDate2, user?.id, loadComparison]);

  const loadPhotoDatePhotos = async (date: string) => {
    if (!user?.id) return;
    setPhotoTimelineLoading(true);
    try {
      const photos = await getPhotosForDate(user.id, date);
      setPhotoTimelineSelectedPhotos(photos);
      setPhotoTimelineSelectedDate(date);
    } catch (e) {
      console.error("Error loading date photos:", e);
    } finally {
      setPhotoTimelineLoading(false);
    }
  };

  const handlePhotoSlotSelect = (
    type: PhotoType,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      addToast({ title: "Please select an image file", variant: "warning" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoSlots((slots) =>
        slots.map((slot) =>
          slot.type === type
            ? {
                ...slot,
                file,
                preview: reader.result as string,
                existingPhoto: null,
              }
            : slot
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const clearPhotoSlot = (type: PhotoType) => {
    setPhotoSlots((slots) =>
      slots.map((slot) =>
        slot.type === type
          ? { ...slot, file: null, preview: null, existingPhoto: null }
          : slot
      )
    );
  };

  const handleSavePhotos = async () => {
    if (!user?.id) return;
    const hasAny = photoSlots.some((s) => s.file || s.existingPhoto);
    if (!hasAny) {
      addToast({ title: "Please take at least one photo", variant: "warning" });
      return;
    }
    setPhotoSaving(true);
    try {
      const uploadPromises = photoSlots
        .filter((slot) => slot.file !== null)
        .map((slot) =>
          uploadPhoto(user.id, {
            photo_date: todayPhoto,
            photo_type: slot.type,
            file: slot.file!,
            weight_kg: photoUploadWeight ? parseFloat(photoUploadWeight) : undefined,
            notes: photoUploadNotes.trim() || undefined,
          })
        );
      await Promise.all(uploadPromises);
      await refreshPhotoData();
      setPhotoUploadNotes("");
      setPhotoStripNonce((n) => n + 1);
    } catch (e) {
      console.error("Error saving photos:", e);
      addToast({ title: "Failed to save photos. Please try again.", variant: "destructive" });
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleDeleteProgressPhoto = async (photoId: string) => {
    if (!user?.id || !confirm("Delete this photo?")) return;
    try {
      await deletePhoto(photoId, user.id);
      await refreshPhotoData();
      setPhotoStripNonce((n) => n + 1);
      if (photoTimelineSelectedDate) {
        await loadPhotoDatePhotos(photoTimelineSelectedDate);
      }
      await loadTodayPhotoSlots();
    } catch (e) {
      console.error("Error deleting photo:", e);
      addToast({ title: "Failed to delete photo", variant: "destructive" });
    }
  };

  const startPhotoComparison = () => {
    if (photoTimeline.length < 2) {
      addToast({ title: "Need at least 2 photo dates to compare", variant: "warning" });
      return;
    }
    setComparisonMode(true);
    setComparisonDate1(photoTimeline[photoTimeline.length - 1].date);
    setComparisonDate2(photoTimeline[0].date);
  };

  if (loadError && !loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
            <div className="py-6 text-center">
              <p className="mb-3 text-sm text-gray-400">{loadError}</p>
              <button type="button" onClick={() => { setLoadError(null); loadMetricsData(); }} className="fc-btn fc-btn-secondary fc-press h-10 px-5 text-sm">Retry</button>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
            <div className="animate-pulse space-y-3">
              <div className="h-10 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-40 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-48 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  const tabChipBase =
    "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.1em] border shrink-0 transition-colors";
  const tabChipActive = "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
  const tabChipInactive = "bg-white/[0.03] text-gray-400 border-white/10";

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <ClientPageShell className="relative z-10 max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              window.location.href = progressBackHref(fromCheckIns);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white tracking-tight">Body Metrics</h1>
            <p className="text-sm text-gray-500">
              {latestDate ? (
                <>Updated {formatTimeAgo(latestDate)}</>
              ) : (
                <>Weight, measurements, and progress photos</>
              )}
            </p>
          </div>
        </div>

        {/* Tab chips */}
        <div className="-mx-4 px-4 mb-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-wrap gap-2 min-w-min">
            <button
              type="button"
              onClick={() => setTab("overview")}
              className={cn(tabChipBase, activeTab === "overview" ? tabChipActive : tabChipInactive)}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setTab("weight-bf")}
              className={cn(tabChipBase, activeTab === "weight-bf" ? tabChipActive : tabChipInactive)}
            >
              Weight & BF
            </button>
            {hasCircumferenceData && (
              <button
                type="button"
                onClick={() => setTab("measurements")}
                className={cn(tabChipBase, activeTab === "measurements" ? tabChipActive : tabChipInactive)}
              >
                Measurements
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab("photos")}
              className={cn(tabChipBase, activeTab === "photos" ? tabChipActive : tabChipInactive)}
            >
              Photos
            </button>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={cn(tabChipBase, activeTab === "history" ? tabChipActive : tabChipInactive)}
            >
              History
            </button>
          </div>
        </div>

        {(activeTab === "weight-bf" || activeTab === "measurements") && (
          <div className="flex flex-wrap gap-2 mb-4">
            {(["12M", "6M", "1M"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setChartRange(range)}
                className={cn(tabChipBase, chartRange === range ? tabChipActive : tabChipInactive)}
              >
                {range}
              </button>
            ))}
          </div>
        )}

        {/* Goal Progress (check-in goals with body-metric targets) — overview only */}
        {activeTab === "overview" && checkInGoals.length > 0 && (() => {
          const goalCards: React.ReactNode[] = [];
          for (const goal of checkInGoals) {
            const unit = (goal.target_unit || "").toLowerCase();
            let current: number | null = null;
            let label = "";
            let lowerIsBetter = true;
            if (unit === "kg" || unit === "weight") {
              current = latest?.weight_kg ?? null;
              label = "Weight";
              lowerIsBetter = true;
            } else if (unit === "%" || unit === "body_fat") {
              current = latest?.body_fat_percentage ?? null;
              label = "Body fat";
              lowerIsBetter = true;
            } else if (unit === "cm" || unit === "waist") {
              current = latest?.waist_circumference ?? null;
              label = "Waist";
              lowerIsBetter = true;
            } else continue;
            const target = goal.target_value;
            const reached = current != null && (lowerIsBetter ? current <= target : current >= target);
            const progressPct = current != null && target > 0
              ? (lowerIsBetter ? Math.min(100, (target / current) * 100) : Math.min(100, (current / target) * 100))
              : 0;
            const remaining = current != null && !reached
              ? (lowerIsBetter ? (current - target).toFixed(1) : (target - current).toFixed(1))
              : null;
            goalCards.push(
              <div
                key={goal.id}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3 mb-2 last:mb-0"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-white">{goal.title}</span>
                </div>
                {latest == null ? (
                  <p className="text-sm text-gray-500">Log your first measurement to track progress toward your goal.</p>
                ) : (
                  <>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Current {label}</span>
                      <span className="tabular-nums font-semibold text-white">{current != null ? (label === "Body fat" ? `${current.toFixed(1)}%` : `${current.toFixed(1)} ${label === "Weight" ? "kg" : "cm"}`) : "—"}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500/80 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                      />
                    </div>
                    {reached ? (
                      <p className="text-sm font-medium text-emerald-300 mt-2">Goal reached!</p>
                    ) : remaining != null ? (
                      <p className="text-sm text-gray-500 mt-2">{remaining} {label === "Weight" ? "kg" : label === "Body fat" ? "%" : "cm"} to go</p>
                    ) : null}
                  </>
                )}
              </div>
            );
          }
          return goalCards.length > 0 ? (
            <section className="mb-4 space-y-2">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70 mb-2">Goal progress</h2>
              <div>{goalCards}</div>
            </section>
          ) : null;
        })()}

        {/* Nutrition vs Body Composition insight — only if nutrition goals + ≥2 body metrics in 30d */}
        {activeTab === "overview" && nutritionVsBodyInsight && (
          <section className="mb-4 space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Nutrition &amp; body composition</h2>
              <span className="text-xs text-gray-500">Last 30 days</span>
            </div>
            <p className="text-sm text-gray-300">{nutritionVsBodyInsight.message}</p>
          </section>
        )}

        {activeTab === "overview" && metrics.length === 0 && (
          <div className="py-8 px-4 text-center">
            <Scale className="mx-auto mb-3 h-10 w-10 text-gray-600" aria-hidden />
            <p className="text-sm text-gray-400">No measurements yet</p>
            <p className="mt-1 text-xs text-gray-500">Log your first measurement to start tracking</p>
            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              className="mt-4 flex h-11 w-full max-w-xs mx-auto items-center justify-center rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25"
            >
              Log today
            </button>
          </div>
        )}

        {activeTab === "overview" && metrics.length > 0 && (
          <main className="space-y-4">
            {/* Last vs current comparison */}
            <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70">Body check-in</h2>
              {previous && daysSincePrevious != null && (
                <p className="text-xs text-gray-500 mb-2">
                  Last check-in: {new Date(previous.measured_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ({daysSincePrevious} day{daysSincePrevious === 1 ? "" : "s"} ago)
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[280px] border-collapse text-white">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500"></th>
                      {previous && (
                        <>
                          <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">{new Date(previous.measured_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</th>
                          <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Current</th>
                          <th className="py-2 pl-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Change</th>
                        </>
                      )}
                      {!previous && <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Current</th>}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10">
                      <td className="py-2 pr-3 text-sm font-medium text-gray-200">Weight</td>
                      {previous && <td className="px-2 py-2 text-right tabular-nums text-sm">{(previous.weight_kg ?? 0).toFixed(1)} kg</td>}
                      <td className="px-2 py-2 text-right tabular-nums text-sm font-semibold">{(latest?.weight_kg ?? 0).toFixed(1)} kg</td>
                      {previous && (
                        <td className="py-2 pl-2 text-right">
                          {weightChange !== 0 ? (
                            <span className={`text-sm font-bold ${weightChange < 0 ? "text-emerald-300" : "text-amber-300"}`}>
                              {weightChange < 0 ? "▼" : "▲"} {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
                            </span>
                          ) : "—"}
                        </td>
                      )}
                    </tr>
                    {(latest?.body_fat_percentage != null || previous?.body_fat_percentage != null) && (
                      <tr className="border-b border-white/10">
                        <td className="py-2 pr-3 text-sm font-medium text-gray-200">Body fat</td>
                        {previous && <td className="px-2 py-2 text-right tabular-nums text-sm">{(previous.body_fat_percentage ?? "—")}%</td>}
                        <td className="px-2 py-2 text-right tabular-nums text-sm font-semibold">{(latest?.body_fat_percentage ?? "—")}%</td>
                        {previous && (
                          <td className="py-2 pl-2 text-right">
                            {bodyFatChange != null && bodyFatChange !== 0 ? (
                              <span className={`text-sm font-bold ${bodyFatChange < 0 ? "text-emerald-300" : "text-amber-300"}`}>
                                {bodyFatChange < 0 ? "▼" : "▲"} {bodyFatChange > 0 ? "+" : ""}{bodyFatChange.toFixed(1)}%
                              </span>
                            ) : "—"}
                          </td>
                        )}
                      </tr>
                    )}
                    {(latest?.muscle_mass_kg != null || previous?.muscle_mass_kg != null) && (
                      <tr className="border-b border-white/10">
                        <td className="py-2 pr-3 text-sm font-medium text-gray-200">Muscle mass</td>
                        {previous && <td className="px-2 py-2 text-right tabular-nums text-sm">{(previous.muscle_mass_kg ?? "—").toString()} kg</td>}
                        <td className="px-2 py-2 text-right tabular-nums text-sm font-semibold">{(latest?.muscle_mass_kg ?? "—").toString()} kg</td>
                        {previous && (
                          <td className="py-2 pl-2 text-right">
                            {muscleChange != null && muscleChange !== 0 ? (
                              <span className={`text-sm font-bold ${muscleChange > 0 ? "text-emerald-300" : "text-amber-300"}`}>
                                {muscleChange > 0 ? "▲" : "▼"} {muscleChange > 0 ? "+" : ""}{muscleChange.toFixed(1)} kg
                              </span>
                            ) : "—"}
                          </td>
                        )}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Weight trend sparkline (last 8–12 points) */}
              {metrics.length >= 2 && (() => {
                const sparkData = metrics.slice(-12);
                const minW = Math.min(...sparkData.map((x) => x.weight));
                const maxW = Math.max(...sparkData.map((x) => x.weight));
                const range = maxW - minW || 1;
                return (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70">Weight trend (last 3 months)</p>
                    <div className="flex h-10 items-end gap-0.5">
                      {sparkData.map((m, i) => {
                        const h = ((m.weight - minW) / range) * 100;
                        return (
                          <div
                            key={`${m.date}-${i}`}
                            className="flex-1 min-w-[4px] rounded-t bg-cyan-500/50"
                            style={{ height: `${Math.max(h, 4)}%` }}
                            title={`${m.weight.toFixed(1)} kg · ${new Date(m.date).toLocaleDateString()}`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-gray-500 tabular-nums">
                      <span>{sparkData[0]?.weight.toFixed(1)} kg</span>
                      <span>{sparkData[sparkData.length - 1]?.weight.toFixed(1)} kg</span>
                    </div>
                    {hasNutritionGoals && (
                      <p className="mt-2 text-sm">
                        <button
                          type="button"
                          className="text-cyan-400 hover:underline"
                          onClick={() => {
                            window.location.href = "/client/nutrition";
                          }}
                        >
                          How&apos;s your nutrition?
                        </button>
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Measurements comparison (previous vs current) */}
              {previous && latest && hasCircumferenceData && (() => {
                const rows: { label: string; prev: number | null; curr: number | null }[] = [
                  { label: "Chest", prev: previous.torso_circumference ?? null, curr: latest.torso_circumference ?? null },
                  { label: "Waist", prev: previous.waist_circumference ?? null, curr: latest.waist_circumference ?? null },
                  { label: "Hips", prev: previous.hips_circumference ?? null, curr: latest.hips_circumference ?? null },
                  { label: "Bicep (L)", prev: previous.left_arm_circumference ?? null, curr: latest.left_arm_circumference ?? null },
                  { label: "Bicep (R)", prev: previous.right_arm_circumference ?? null, curr: latest.right_arm_circumference ?? null },
                  { label: "Thigh (L)", prev: previous.left_thigh_circumference ?? null, curr: latest.left_thigh_circumference ?? null },
                  { label: "Thigh (R)", prev: previous.right_thigh_circumference ?? null, curr: latest.right_thigh_circumference ?? null },
                ].filter((r) => r.prev != null || r.curr != null);
                if (rows.length === 0) return null;
                return (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70">Measurements</p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[240px] text-sm text-white">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-gray-500"></th>
                            {previous && <th className="text-right py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">{new Date(previous.measured_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</th>}
                            <th className="text-right py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Current</th>
                            <th className="text-right py-2 pl-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            const change = r.prev != null && r.curr != null ? r.curr - r.prev : null;
                            return (
                              <tr key={r.label} className="border-b border-white/10">
                                <td className="py-2 pr-2 text-gray-200">{r.label}</td>
                                <td className="text-right py-2 px-2 tabular-nums">{r.prev != null ? `${r.prev} cm` : "—"}</td>
                                <td className="text-right py-2 px-2 tabular-nums font-semibold">{r.curr != null ? `${r.curr} cm` : "—"}</td>
                                <td className="text-right py-2 pl-2 tabular-nums">
                                  {change != null && change !== 0 ? (
                                    <span className={change < 0 ? "text-emerald-300" : "text-amber-300"}>{change > 0 ? "+" : ""}{change} cm</span>
                                  ) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Progress photos comparison — tap opens Photos tab */}
              {(latestDatePhotos.length > 0 || previousDatePhotos.length > 0) && (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <button
                    type="button"
                    onClick={() => setTab("photos")}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.02] p-3 text-left transition-colors hover:bg-white/[0.06]"
                  >
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70">
                      Progress photos
                    </p>
                    <p className="mb-2 text-xs text-gray-500">Tap to open Photos</p>
                    <div className="flex flex-wrap items-end gap-3">
                      {previous && previousDatePhotos.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] text-gray-500">{new Date(previous.measured_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · previous</p>
                          <img src={previousDatePhotos[0].url} alt="Previous" className="h-20 w-14 rounded-lg object-cover bg-white/5 sm:h-24 sm:w-16 pointer-events-none" />
                        </div>
                      )}
                      {latest && latestDatePhotos.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] text-gray-500">{new Date(latest.measured_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · current</p>
                          <img src={latestDatePhotos[0].url} alt="Current" className="h-20 w-14 rounded-lg object-cover bg-white/5 sm:h-24 sm:w-16 pointer-events-none" />
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              )}
            </section>

            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25"
            >
              Log today
            </button>
          </main>
        )}

        {activeTab === "weight-bf" && metrics.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70 mb-3">
                    Weight &amp; body fat
                  </p>
                  <div className="flex items-baseline gap-2 mb-3 flex-wrap">
                    <span className="text-2xl font-bold text-white tabular-nums">
                      {currentWeight > 0 ? currentWeight.toFixed(1) : "—"}
                    </span>
                    <span className="text-sm text-gray-400">kg</span>
                    {previous != null && weightChange !== 0 && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border tabular-nums",
                          weightChange > 0
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        )}
                      >
                        {weightChange > 0 ? (
                          <TrendingUp className="w-2.5 h-2.5 shrink-0" aria-hidden />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5 shrink-0" aria-hidden />
                        )}
                        {weightChange > 0 ? "+" : ""}
                        {weightChange.toFixed(1)} kg
                      </span>
                    )}
                  </div>
                  {metrics.length > 0 ? (
                    <div className="overflow-x-auto -mx-1 px-1">
                      <div className="min-w-[520px]">
                        <div className="relative">
                          <div className="flex h-48 items-end justify-between gap-1 sm:gap-2 sm:h-56">
                            {metrics.slice(-12).map((metric, index) => {
                              const maxW = Math.max(...metrics.map((m) => m.weight));
                              const minW = Math.min(...metrics.map((m) => m.weight));
                              const range = maxW - minW || 1;
                              const height = ((metric.weight - minW) / range) * 100;

                              const hasBodyFat = metrics.some((m) => m.bodyFat != null);
                              const maxBF = hasBodyFat ? Math.max(...metrics.map((m) => m.bodyFat || 0)) : 0;
                              const minBF = hasBodyFat ? Math.min(...metrics.map((m) => m.bodyFat || 0)) : 0;
                              const rangeBF = maxBF - minBF || 1;
                              const heightBF = metric.bodyFat != null ? ((metric.bodyFat - minBF) / rangeBF) * 100 : 0;

                              return (
                                <div key={`${metric.date}-${index}`} className="flex-1 flex flex-col items-center min-w-0 relative h-full">
                                  {metric.bodyFat != null && heightBF > 0 && (
                                    <div
                                      className="absolute w-2 h-2 rounded-full bg-emerald-400 border border-white/20 z-10"
                                      style={{
                                        bottom: `calc(${Math.max(heightBF, 2)}% + 2rem)`,
                                      }}
                                      title={`Body Fat: ${metric.bodyFat}%`}
                                    />
                                  )}
                                  <div
                                    className="w-full rounded-t-lg min-h-[20px] transition-opacity hover:opacity-90 relative"
                                    style={{
                                      height: `${Math.max(height, 8)}%`,
                                      background:
                                        "linear-gradient(135deg, var(--fc-status-error) 0%, var(--fc-accent-blue) 100%)",
                                    }}
                                  />
                                  <div className="mt-2 text-center truncate w-full">
                                    <p className="text-xs font-semibold text-white truncate tabular-nums">
                                      {metric.weight.toFixed(1)}
                                    </p>
                                    <p className="text-[10px] text-gray-500 truncate">
                                      {new Date(metric.date).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {metrics.some((m) => m.bodyFat != null) && (
                            <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[color:var(--fc-status-error)] to-[color:var(--fc-accent-blue)]" />
                                <span>Weight</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>Body Fat %</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-8 text-sm text-gray-500">Not enough data to show chart</p>
                  )}
                </div>
        )}

        {activeTab === "measurements" && metrics.length > 0 && hasCircumferenceData && (
                fullMeasurements.length > 0 ? (
                  <div className="space-y-3">
                    {/* Comparison Summary Card */}
                    {(() => {
                      const sortedMeasurements = [...fullMeasurements].sort(
                        (a, b) => a.measured_date.localeCompare(b.measured_date)
                      );
                      const firstMeasurement = sortedMeasurements[0];
                      const lastMeasurement = sortedMeasurements[sortedMeasurements.length - 1];

                      if (!firstMeasurement || !lastMeasurement) return null;

                      const comparisons: Array<{
                        label: string;
                        change: number;
                        isGood: boolean;
                        hasData: boolean;
                        currentValue: number;
                      }> = [];

                      // Waist
                      if (
                        firstMeasurement.waist_circumference != null &&
                        lastMeasurement.waist_circumference != null
                      ) {
                        const change = lastMeasurement.waist_circumference - firstMeasurement.waist_circumference;
                        comparisons.push({
                          label: "Waist",
                          change,
                          isGood: change < 0, // Decrease is good
                          hasData: true,
                          currentValue: lastMeasurement.waist_circumference,
                        });
                      }

                      // Hips
                      if (
                        firstMeasurement.hips_circumference != null &&
                        lastMeasurement.hips_circumference != null
                      ) {
                        const change = lastMeasurement.hips_circumference - firstMeasurement.hips_circumference;
                        comparisons.push({
                          label: "Hips",
                          change,
                          isGood: change < 0, // Decrease is good
                          hasData: true,
                          currentValue: lastMeasurement.hips_circumference,
                        });
                      }

                      // Arms (average of left/right)
                      const firstArms = [
                        firstMeasurement.left_arm_circumference,
                        firstMeasurement.right_arm_circumference,
                      ].filter((v) => v != null);
                      const lastArms = [
                        lastMeasurement.left_arm_circumference,
                        lastMeasurement.right_arm_circumference,
                      ].filter((v) => v != null);
                      if (firstArms.length > 0 && lastArms.length > 0) {
                        const firstAvg = firstArms.reduce((a, b) => a + b, 0) / firstArms.length;
                        const lastAvg = lastArms.reduce((a, b) => a + b, 0) / lastArms.length;
                        const change = lastAvg - firstAvg;
                        comparisons.push({
                          label: "Arms",
                          change,
                          isGood: change > 0, // Increase is good (muscle growth)
                          hasData: true,
                          currentValue: lastAvg,
                        });
                      }

                      // Thighs (average)
                      const firstThighs = [
                        firstMeasurement.left_thigh_circumference,
                        firstMeasurement.right_thigh_circumference,
                      ].filter((v) => v != null);
                      const lastThighs = [
                        lastMeasurement.left_thigh_circumference,
                        lastMeasurement.right_thigh_circumference,
                      ].filter((v) => v != null);
                      if (firstThighs.length > 0 && lastThighs.length > 0) {
                        const firstAvg = firstThighs.reduce((a, b) => a + b, 0) / firstThighs.length;
                        const lastAvg = lastThighs.reduce((a, b) => a + b, 0) / lastThighs.length;
                        const change = lastAvg - firstAvg;
                        comparisons.push({
                          label: "Thighs",
                          change,
                          isGood: change > 0, // Increase is good
                          hasData: true,
                          currentValue: lastAvg,
                        });
                      }

                      // Calves (average)
                      const firstCalves = [
                        firstMeasurement.left_calf_circumference,
                        firstMeasurement.right_calf_circumference,
                      ].filter((v) => v != null);
                      const lastCalves = [
                        lastMeasurement.left_calf_circumference,
                        lastMeasurement.right_calf_circumference,
                      ].filter((v) => v != null);
                      if (firstCalves.length > 0 && lastCalves.length > 0) {
                        const firstAvg = firstCalves.reduce((a, b) => a + b, 0) / firstCalves.length;
                        const lastAvg = lastCalves.reduce((a, b) => a + b, 0) / lastCalves.length;
                        const change = lastAvg - firstAvg;
                        comparisons.push({
                          label: "Calves",
                          change,
                          isGood: change > 0, // Increase is good
                          hasData: true,
                          currentValue: lastAvg,
                        });
                      }

                      if (comparisons.length === 0) return null;

                      return (
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 mb-2">
                          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70">
                            Since {new Date(firstMeasurement.measured_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {comparisons.map((comp) => (
                              <div
                                key={comp.label}
                                className="rounded-lg border border-white/10 bg-white/[0.04] p-3"
                              >
                                <p className="text-[10px] uppercase tracking-wider text-gray-500">{comp.label}</p>
                                <p className="text-base font-semibold text-white tabular-nums mt-1">
                                  {comp.currentValue.toFixed(1)}{" "}
                                  <span className="text-xs font-normal text-gray-400">cm</span>
                                </p>
                                {comp.change !== 0 && (
                                  <span
                                    className={cn(
                                      "mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border tabular-nums",
                                      comp.change > 0
                                        ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                                        : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                    )}
                                  >
                                    {comp.change > 0 ? (
                                      <TrendingUp className="w-2.5 h-2.5 shrink-0" aria-hidden />
                                    ) : (
                                      <TrendingDown className="w-2.5 h-2.5 shrink-0" aria-hidden />
                                    )}
                                    {comp.change > 0 ? "+" : ""}
                                    {comp.change.toFixed(1)} cm
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Measurement Charts Grid */}
                    <div className="grid grid-cols-1 gap-3">
                      {/* Waist */}
                      {fullMeasurements.filter((m) => m.waist_circumference != null).length >= 2 && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[520px]">
                            <MeasurementMiniChart
                              className="rounded-xl border border-white/10 bg-white/[0.04] shadow-none"
                              title="Waist"
                              measurements={fullMeasurements}
                              getValue={(m) => m.waist_circumference ?? null}
                              timeRange={chartRange}
                              isDecreaseGood={true}
                            />
                          </div>
                        </div>
                      )}

                      {/* Hips */}
                      {fullMeasurements.filter((m) => m.hips_circumference != null).length >= 2 && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[520px]">
                            <MeasurementMiniChart
                              className="rounded-xl border border-white/10 bg-white/[0.04] shadow-none"
                              title="Hips"
                              measurements={fullMeasurements}
                              getValue={(m) => m.hips_circumference ?? null}
                              timeRange={chartRange}
                              isDecreaseGood={true}
                            />
                          </div>
                        </div>
                      )}

                      {/* Torso/Chest */}
                      {fullMeasurements.filter((m) => m.torso_circumference != null).length >= 2 && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[520px]">
                            <MeasurementMiniChart
                              className="rounded-xl border border-white/10 bg-white/[0.04] shadow-none"
                              title="Torso/Chest"
                              measurements={fullMeasurements}
                              getValue={(m) => m.torso_circumference ?? null}
                              timeRange={chartRange}
                              isDecreaseGood={false}
                            />
                          </div>
                        </div>
                      )}

                      {/* Arms (Left & Right) */}
                      {fullMeasurements.filter(
                        (m) => m.left_arm_circumference != null || m.right_arm_circumference != null
                      ).length >= 2 && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[520px]">
                            <MeasurementMiniChart
                              className="rounded-xl border border-white/10 bg-white/[0.04] shadow-none"
                              title="Arms"
                              measurements={fullMeasurements}
                              getValue={(m) => m.left_arm_circumference ?? null}
                              getValue2={(m) => m.right_arm_circumference ?? null}
                              label2="Right"
                              timeRange={chartRange}
                              isDecreaseGood={false}
                            />
                          </div>
                        </div>
                      )}

                      {/* Thighs (Left & Right) */}
                      {fullMeasurements.filter(
                        (m) => m.left_thigh_circumference != null || m.right_thigh_circumference != null
                      ).length >= 2 && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[520px]">
                            <MeasurementMiniChart
                              className="rounded-xl border border-white/10 bg-white/[0.04] shadow-none"
                              title="Thighs"
                              measurements={fullMeasurements}
                              getValue={(m) => m.left_thigh_circumference ?? null}
                              getValue2={(m) => m.right_thigh_circumference ?? null}
                              label2="Right"
                              timeRange={chartRange}
                              isDecreaseGood={false}
                            />
                          </div>
                        </div>
                      )}

                      {/* Calves (Left & Right) */}
                      {fullMeasurements.filter(
                        (m) => m.left_calf_circumference != null || m.right_calf_circumference != null
                      ).length >= 2 && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[520px]">
                            <MeasurementMiniChart
                              className="rounded-xl border border-white/10 bg-white/[0.04] shadow-none"
                              title="Calves"
                              measurements={fullMeasurements}
                              getValue={(m) => m.left_calf_circumference ?? null}
                              getValue2={(m) => m.right_calf_circumference ?? null}
                              label2="Right"
                              timeRange={chartRange}
                              isDecreaseGood={false}
                            />
                          </div>
                        </div>
                      )}

                      {/* Muscle mass */}
                      {fullMeasurements.filter((m) => m.muscle_mass_kg != null).length >= 2 && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[520px]">
                            <MeasurementMiniChart
                              className="rounded-xl border border-white/10 bg-white/[0.04] shadow-none"
                              title="Muscle mass"
                              measurements={fullMeasurements}
                              getValue={(m) => m.muscle_mass_kg ?? null}
                              timeRange={chartRange}
                              isDecreaseGood={false}
                            />
                          </div>
                        </div>
                      )}

                      {/* Visceral fat */}
                      {fullMeasurements.filter((m) => m.visceral_fat_level != null).length >= 2 && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[520px]">
                            <MeasurementMiniChart
                              className="rounded-xl border border-white/10 bg-white/[0.04] shadow-none"
                              title="Visceral fat"
                              measurements={fullMeasurements}
                              getValue={(m) => m.visceral_fat_level ?? null}
                              timeRange={chartRange}
                              isDecreaseGood={true}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 px-4 text-center">
                    <Ruler className="mx-auto mb-3 h-10 w-10 text-gray-600" aria-hidden />
                    <p className="text-sm text-gray-400">No measurement data available</p>
                    <p className="mt-1 text-xs text-gray-500">Log a check-in with circumferences to see charts here.</p>
                  </div>
                )
        )}

        {activeTab === "weight-bf" && metrics.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            No weight data yet. Log a measurement from Overview or use Log today.
          </p>
        )}

        {activeTab === "history" && metrics.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">No entries yet. Log a measurement to see history here.</p>
        )}

        {activeTab === "history" && metrics.length > 0 && (
            <div className="flex flex-col border-t border-white/10 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70">Log history</h3>
                <ListFilter className="h-4 w-4 text-gray-500" />
              </div>
              <div className="max-h-[min(50vh,360px)] space-y-2 overflow-y-auto pr-1">
                {historyNewestFirst.map((metric, index) => {
                  const prev = historyNewestFirst[index + 1];
                  const delta = prev ? metric.weight - prev.weight : null;
                  const d = new Date(metric.date);
                  const full = fullMeasurements.find((m) => m.measured_date === metric.date);
                  const subtitleParts = [
                    metric.bodyFat != null && `${metric.bodyFat}% BF`,
                    metric.waist != null && `${metric.waist} cm waist`,
                  ].filter(Boolean);
                  const subtitle =
                    subtitleParts.length > 0
                      ? subtitleParts.join(" · ")
                      : full?.notes?.trim()
                        ? undefined
                        : "Body weight log";
                  return (
                    <div
                      key={metric.date}
                      className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-white tracking-tight">
                          {d.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-sm font-semibold text-white tabular-nums">
                            {metric.weight.toFixed(1)} kg
                          </span>
                          {delta !== null && delta !== 0 && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border tabular-nums",
                                delta > 0
                                  ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                              )}
                            >
                              {delta > 0 ? (
                                <TrendingUp className="w-2.5 h-2.5 shrink-0" aria-hidden />
                              ) : (
                                <TrendingDown className="w-2.5 h-2.5 shrink-0" aria-hidden />
                              )}
                              {delta > 0 ? "+" : ""}
                              {delta.toFixed(1)} kg
                            </span>
                          )}
                        </div>
                      </div>
                      {subtitle != null && (
                        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                      )}
                      {full?.notes?.trim() && (
                        <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap break-words">{full.notes.trim()}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 border-t border-white/10 pt-2 text-center text-xs text-gray-500">
                {metrics.length} entr{metrics.length === 1 ? "y" : "ies"} total
              </p>
            </div>
        )}

        {activeTab === "photos" && user && (
          <div className="space-y-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70">Photos</p>
              {photoTimeline.length >= 2 && (
                <button
                  type="button"
                  onClick={startPhotoComparison}
                  className={cn(tabChipBase, tabChipInactive, "inline-flex items-center gap-1.5")}
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  Compare
                </button>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70 mb-3">
                Today&apos;s photos
              </p>
              <div className="grid grid-cols-3 gap-2">
                {photoSlots.map((slot) => (
                  <div key={slot.type} className="flex flex-col">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-dashed border-white/10 bg-white/[0.02]">
                      {slot.preview ? (
                        <>
                          <img src={slot.preview} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              if (slot.existingPhoto && !slot.file) {
                                void handleDeleteProgressPhoto(slot.existingPhoto.id);
                              } else {
                                clearPhotoSlot(slot.type);
                              }
                            }}
                            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white"
                            aria-label="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1">
                          <Camera className="h-6 w-6 text-gray-500" />
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handlePhotoSlotSelect(slot.type, e)}
                          />
                        </label>
                      )}
                    </div>
                    <p className="mt-1.5 text-center text-[10px] uppercase tracking-wider text-gray-500">
                      {slot.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-gray-400">Weight (kg) — optional</label>
                  <input
                    type="number"
                    step="0.1"
                    value={photoUploadWeight}
                    onChange={(e) => setPhotoUploadWeight(e.target.value)}
                    className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="From latest log"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-gray-400">Notes — optional</label>
                  <input
                    type="text"
                    value={photoUploadNotes}
                    onChange={(e) => setPhotoUploadNotes(e.target.value)}
                    className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="Add notes"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleSavePhotos()}
                disabled={photoSaving || !photoSlots.some((s) => s.file || s.existingPhoto)}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 disabled:opacity-50"
              >
                {photoSaving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save photos
                  </>
                )}
              </button>
            </div>

            {photoTimeline.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70">Timeline</p>
                {photoTimeline.map((entry) => {
                  const isExpanded = photoTimelineSelectedDate === entry.date;
                  const photos = isExpanded ? photoTimelineSelectedPhotos : [];
                  return (
                    <div
                      key={entry.date}
                      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          isExpanded
                            ? setPhotoTimelineSelectedDate(null)
                            : void loadPhotoDatePhotos(entry.date)
                        }
                        className="flex w-full items-center justify-between text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{formatPhotoDateLong(entry.date)}</p>
                          <p className="text-xs text-gray-500">
                            {entry.types.length} photo{entry.types.length !== 1 ? "s" : ""}
                            {entry.weight_kg != null && ` · ${entry.weight_kg.toFixed(1)} kg`}
                          </p>
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-5 w-5 shrink-0 text-gray-500 transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </button>
                      {photoTimelineLoading && isExpanded && (
                        <p className="mt-2 text-xs text-gray-500">Loading…</p>
                      )}
                      {isExpanded && photos.length > 0 && (
                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                          {(["front", "side", "back"] as PhotoType[]).map((type) => {
                            const photo = photos.find((p) => p.photo_type === type);
                            return (
                              <div key={type}>
                                <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">{type}</p>
                                {photo ? (
                                  <button
                                    type="button"
                                    onClick={() => setFullscreenPhotoUrl(photo.photo_url)}
                                    className="block w-full overflow-hidden rounded-lg border border-white/10"
                                  >
                                    <img
                                      src={photo.photo_url}
                                      alt=""
                                      className="aspect-[3/4] w-full object-cover"
                                    />
                                  </button>
                                ) : (
                                  <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-gray-500">
                                    —
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FAB */}
        <button
          type="button"
          onClick={() => setShowLogModal(true)}
          className="absolute bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/30"
          aria-label="Log metrics"
        >
          <Plus className="w-8 h-8" />
        </button>
      </ClientPageShell>

      {showLogModal && user && (
        <LogMeasurementModal
          clientId={user.id}
          compactForm
          onClose={() => setShowLogModal(false)}
          onSuccess={() => {
            void loadMetricsData();
            void refreshPhotoData();
            setPhotoStripNonce((n) => n + 1);
          }}
          lastMeasurement={latest ?? undefined}
          onAchievementsUnlocked={(raw) => {
            const tierToRarity = (tier: string | null): Achievement["rarity"] =>
              !tier ? "uncommon" : tier === "platinum" ? "epic" : tier === "gold" ? "rare" : tier === "silver" ? "uncommon" : "common";
            const mapped: Achievement[] = raw.map((a) => ({
              id: a.templateId,
              name: a.templateName,
              description: a.description ?? "",
              icon: a.templateIcon ?? "🏆",
              rarity: tierToRarity(a.tier),
              unlocked: true,
            }));
            setNewAchievementsQueue(mapped);
            setAchievementModalIndex(0);
          }}
        />
      )}

      {newAchievementsQueue.length > 0 && (
        <AchievementUnlockModal
          achievement={newAchievementsQueue[achievementModalIndex] ?? null}
          visible={achievementModalIndex < newAchievementsQueue.length}
          onClose={() => {
            if (achievementModalIndex < newAchievementsQueue.length - 1) {
              setAchievementModalIndex((i) => i + 1);
            } else {
              setNewAchievementsQueue([]);
              setAchievementModalIndex(0);
            }
          }}
        />
      )}

      {comparisonMode && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black text-white">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Photo comparison</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Before</span>
                  <select
                    value={comparisonDate1 || ""}
                    onChange={(e) => setComparisonDate1(e.target.value)}
                    className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white"
                  >
                    {photoTimeline.map((entry) => (
                      <option key={entry.date} value={entry.date}>
                        {formatPhotoDateLong(entry.date)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">After</span>
                  <select
                    value={comparisonDate2 || ""}
                    onChange={(e) => setComparisonDate2(e.target.value)}
                    className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white"
                  >
                    {photoTimeline.map((entry) => (
                      <option key={entry.date} value={entry.date}>
                        {formatPhotoDateLong(entry.date)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setComparisonMode(false);
                    setComparisonPhotos(null);
                  }}
                  className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]"
                  aria-label="Close comparison"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {comparisonPhotos ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
                  <h3 className="mb-4 text-base font-semibold">
                    {comparisonDate1 ? formatPhotoDateLong(comparisonDate1) : ""}
                    {comparisonPhotos.before[0]?.weight_kg != null && (
                      <span className="ml-2 text-sm font-normal text-gray-400">
                        ({comparisonPhotos.before[0].weight_kg.toFixed(1)} kg)
                      </span>
                    )}
                  </h3>
                  <div className="space-y-4">
                    {(["front", "side", "back"] as PhotoType[]).map((type) => {
                      const photo = comparisonPhotos.before.find((p) => p.photo_type === type);
                      return (
                        <div key={type}>
                          <p className="mb-2 text-sm capitalize text-gray-400">{type}</p>
                          {photo ? (
                            <button
                              type="button"
                              onClick={() => setFullscreenPhotoUrl(photo.photo_url)}
                              className="block w-full overflow-hidden rounded-xl border border-white/10"
                            >
                              <img src={photo.photo_url} alt="" className="w-full object-cover" />
                            </button>
                          ) : (
                            <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-white/20 text-gray-500">
                              No {type} photo
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
                  <h3 className="mb-4 text-base font-semibold">
                    {comparisonDate2 ? formatPhotoDateLong(comparisonDate2) : ""}
                    {comparisonPhotos.after[0]?.weight_kg != null && (
                      <span className="ml-2 text-sm font-normal text-gray-400">
                        ({comparisonPhotos.after[0].weight_kg.toFixed(1)} kg)
                      </span>
                    )}
                  </h3>
                  <div className="space-y-4">
                    {(["front", "side", "back"] as PhotoType[]).map((type) => {
                      const photo = comparisonPhotos.after.find((p) => p.photo_type === type);
                      return (
                        <div key={type}>
                          <p className="mb-2 text-sm capitalize text-gray-400">{type}</p>
                          {photo ? (
                            <button
                              type="button"
                              onClick={() => setFullscreenPhotoUrl(photo.photo_url)}
                              className="block w-full overflow-hidden rounded-xl border border-white/10"
                            >
                              <img src={photo.photo_url} alt="" className="w-full object-cover" />
                            </button>
                          ) : (
                            <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-white/20 text-gray-500">
                              No {type} photo
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-16">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              </div>
            )}
          </div>
        </div>
      )}

      {fullscreenPhotoUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={() => setFullscreenPhotoUrl(null)}
          role="presentation"
        >
          <button
            type="button"
            onClick={() => setFullscreenPhotoUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={fullscreenPhotoUrl}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </AnimatedBackground>
  );
}

export default function BodyMetricsPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <AnimatedBackground>
            <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
              <div className="animate-pulse space-y-3">
                <div className="h-10 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
                <div className="h-32 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
              </div>
            </ClientPageShell>
          </AnimatedBackground>
        }
      >
        <BodyMetricsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
