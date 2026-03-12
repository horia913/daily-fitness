"use client";

/**
 * Daily check-in form for sleep, stress, soreness, steps, and notes.
 * The daily_wellness_logs table also includes optional columns motivation_level,
 * energy_level, and mood_rating; these are intentionally not collected here to keep check-ins brief.
 */

import React, { useState, useEffect, useCallback } from "react";
import { ClientGlassCard } from "@/components/client-ui";
import {
  DailyWellnessLog,
  getTodayLog,
  getLogRange,
  upsertDailyLog,
  getCheckinStreak,
  dbToUiScale,
} from "@/lib/wellnessService";
import { getWellnessValueColor } from "@/lib/wellnessValueColors";
import { getLatestMeasurement } from "@/lib/measurementService";
import { createMeasurement } from "@/lib/measurementService";
import { Check, Pencil, ChevronDown, ChevronUp, Scale, Minus, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { AchievementUnlockModal } from "@/components/ui/AchievementUnlockModal";
import type { Achievement } from "@/components/ui/AchievementCard";
import { AchievementService } from "@/lib/achievementService";

const MAX_NOTES = 500;

// Color system for rating scales
const ratingColors = {
  positive: {
    // Higher = better (sleep quality)
    1: '#EF4444',  // Red
    2: '#F97316',  // Orange
    3: '#EAB308',  // Yellow
    4: '#84CC16',  // Light green
    5: '#22C55E',  // Green
  },
  negative: {
    // Higher = worse (stress, soreness)
    1: '#22C55E',  // Green
    2: '#84CC16',  // Light green
    3: '#EAB308',  // Yellow
    4: '#F97316',  // Orange
    5: '#EF4444',  // Red
  },
  steps: {
    '1K': '#DC2626',  // Deep red
    '2K': '#EF4444',  // Red
    '5K': '#EAB308',  // Yellow
    '10K': '#22C55E', // Green
    '20K': '#16A34A', // Deep green
  },
};

// Sleep duration quick-select presets
const SLEEP_QUICK_PRESETS = [6, 7, 8, 9, 10];

// Steps quick-select presets
const STEPS_QUICK_PRESETS = [
  { value: 1000, label: '1K' },
  { value: 2000, label: '2K' },
  { value: 5000, label: '5K' },
  { value: 10000, label: '10K' },
  { value: 20000, label: '20K' },
];

// Sleep quality labels
const SLEEP_QUALITY_LABELS = [
  "Terrible",
  "Poor",
  "Fair",
  "Good",
  "Great",
];

// Stress labels
const STRESS_LABELS = [
  "Calm",
  "Mild",
  "Moderate",
  "High",
  "Extreme",
];

// Soreness labels
const SORENESS_LABELS = [
  "Fresh",
  "Mild",
  "Moderate",
  "Sore",
  "Severe",
];

function getStreakMilestone(streak: number): { emoji: string; message: string; nextMilestone: number } | null {
  if (streak >= 100) {
    return { emoji: "💎", message: "100 Days!", nextMilestone: 0 };
  }
  if (streak >= 30) {
    return { emoji: "🏆", message: "30-Day Champion!", nextMilestone: 100 };
  }
  if (streak >= 7) {
    return { emoji: "🎯", message: "1 Week Strong!", nextMilestone: 30 };
  }
  return null;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getSleepQualityLabel(value: number | null): string {
  if (value == null) return "—";
  return SLEEP_QUALITY_LABELS[Math.min(4, Math.max(0, value - 1))] || "—";
}

function getStressLabel(value: number | null): string {
  if (value == null) return "—";
  const uiValue = dbToUiScale(value);
  return STRESS_LABELS[Math.min(4, Math.max(0, (uiValue ?? 1) - 1))] || "—";
}

function getSorenessLabel(value: number | null): string {
  if (value == null) return "—";
  const uiValue = dbToUiScale(value);
  return SORENESS_LABELS[Math.min(4, Math.max(0, (uiValue ?? 1) - 1))] || "—";
}

interface DailyWellnessFormProps {
  clientId: string;
  initialTodayLog?: DailyWellnessLog | null;
  onSuccess?: () => void;
}

export function DailyWellnessForm({ clientId, initialTodayLog, onSuccess }: DailyWellnessFormProps) {
  const [todayLog, setTodayLog] = useState<DailyWellnessLog | null>(initialTodayLog ?? null);
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [successInsight, setSuccessInsight] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  
  // Form values
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [sleepHoursInput, setSleepHoursInput] = useState<string>("");
  const [showSleepInput, setShowSleepInput] = useState(false);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [sorenessLevel, setSorenessLevel] = useState<number | null>(null);
  const [steps, setSteps] = useState<number | null>(null);
  const [stepsInput, setStepsInput] = useState<string>("");
  const [showStepsInput, setShowStepsInput] = useState(false);
  const [notes, setNotes] = useState("");
  
  const [hasWeightToday, setHasWeightToday] = useState<boolean | null>(null);
  const [newAchievementsQueue, setNewAchievementsQueue] = useState<Achievement[]>([]);
  const [achievementModalIndex, setAchievementModalIndex] = useState(0);
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [quickWeight, setQuickWeight] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [yesterdayLog, setYesterdayLog] = useState<DailyWellnessLog | null>(null);
  const [weekLogs, setWeekLogs] = useState<DailyWellnessLog[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const todayFormatted = formatDateLong(today);
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();
  const getWeekStart = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d);
    mon.setDate(diff);
    return mon.toISOString().split("T")[0];
  };
  const weekStart = getWeekStart();

  // Initialize form from initialTodayLog prop
  useEffect(() => {
    if (initialTodayLog) {
      setTodayLog(initialTodayLog);
      setSleepHours(initialTodayLog.sleep_hours ?? null);
      setSleepHoursInput(initialTodayLog.sleep_hours?.toString() ?? "");
      setSleepQuality(initialTodayLog.sleep_quality ?? null);
      setStressLevel(initialTodayLog.stress_level ? dbToUiScale(initialTodayLog.stress_level) : null);
      setSorenessLevel(initialTodayLog.soreness_level ? dbToUiScale(initialTodayLog.soreness_level) : null);
      setSteps(initialTodayLog.steps ?? null);
      setStepsInput(initialTodayLog.steps?.toString() ?? "");
      setNotes(initialTodayLog.notes ?? "");
      setShowSuccess(true);
      setShowForm(false);
    } else {
      setShowForm(true);
      setShowSuccess(false);
    }
    
    // Only fetch weight data (not wellness data)
    const loadWeight = async () => {
      try {
        const latestMeasurement = await getLatestMeasurement(clientId);
        const today = new Date().toISOString().split("T")[0];
        const hasWeight = latestMeasurement?.measured_date === today;
        setHasWeightToday(hasWeight);
      } catch (err) {
        console.warn("Error loading weight data:", err);
      }
    };
    loadWeight();

    const loadYesterdayAndWeek = async () => {
      try {
        const [yesterdayData, weekData] = await Promise.all([
          getLogRange(clientId, yesterday, yesterday),
          getLogRange(clientId, weekStart, today),
        ]);
        setYesterdayLog(yesterdayData[0] ?? null);
        setWeekLogs(weekData ?? []);
      } catch (err) {
        console.warn("Error loading yesterday/week wellness:", err);
      }
    };
    loadYesterdayAndWeek();
  }, [clientId, initialTodayLog, yesterday, weekStart, today]);

  // Completion check: all 4 required fields must be filled
  const allRequiredSelected =
    sleepHours != null &&
    sleepQuality != null &&
    stressLevel != null &&
    sorenessLevel != null;

  const SAVE_TIMEOUT_MS = 15000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequiredSelected || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Save timed out")), SAVE_TIMEOUT_MS)
      );
      const result = await Promise.race([
        upsertDailyLog(clientId, {
          sleep_hours: sleepHours,
          sleep_quality: sleepQuality,
          stress_level: stressLevel,
          soreness_level: sorenessLevel,
          steps: steps || null,
          notes: notes.trim() || undefined,
        }),
        timeoutPromise,
      ]);
      if (result) {
        setTodayLog(result);
        setSubmitSuccess(true);
        setShowSuccess(true);
        setShowForm(false);
        setSubmitError(null);

        // Update form values from result
        setSleepHours(result.sleep_hours ?? null);
        setSleepHoursInput(result.sleep_hours?.toString() ?? "");
        setSleepQuality(result.sleep_quality ?? null);
        setStressLevel(result.stress_level ? dbToUiScale(result.stress_level) : null);
        setSorenessLevel(result.soreness_level ? dbToUiScale(result.soreness_level) : null);
        setSteps(result.steps ?? null);
        setStepsInput(result.steps?.toString() ?? "");
        setNotes(result.notes ?? "");

        try {
          const latestMeasurement = await getLatestMeasurement(clientId);
          const todayStr = new Date().toISOString().split("T")[0];
          const hasWeight = latestMeasurement?.measured_date === todayStr;
          setHasWeightToday(hasWeight);
          if (!hasWeight) setShowWeightPrompt(true);
        } catch (weightErr) {
          console.warn("Error loading weight after save:", weightErr);
        }

        let currentStreak = 0;
        try {
          const newStreak = await getCheckinStreak(clientId);
          currentStreak = newStreak;
          setStreak(newStreak);
        } catch (streakErr) {
          console.warn("Error loading streak after save:", streakErr);
        }

        try {
          const checkinNew = await AchievementService.checkAndUnlockAchievements(clientId, "checkin_streak");
          if (checkinNew.length > 0) {
            const tierToRarity = (tier: string | null): Achievement["rarity"] =>
              !tier ? "uncommon" : tier === "platinum" ? "epic" : tier === "gold" ? "rare" : tier === "silver" ? "uncommon" : "common";
            const mapped: Achievement[] = checkinNew.map((a) => ({
              id: a.templateId,
              name: a.templateName,
              description: a.description ?? "",
              icon: a.templateIcon ?? "🏆",
              rarity: tierToRarity(a.tier),
              unlocked: true,
            }));
            setNewAchievementsQueue((prev) => [...prev, ...mapped]);
            setAchievementModalIndex(0);
          }
        } catch (achErr) {
          console.warn("Error checking check-in achievements:", achErr);
        }

        try {
          const todayStr = new Date().toISOString().split("T")[0];
          const weekStartStr = getWeekStart();
          const endThis = todayStr;
          const startLast = new Date(weekStartStr + "T12:00:00");
          startLast.setDate(startLast.getDate() - 7);
          const endLast = new Date(weekStartStr + "T12:00:00");
          endLast.setDate(endLast.getDate() - 1);
          const [logsThisWeek, logsLastWeek] = await Promise.all([
            getLogRange(clientId, weekStartStr, endThis),
            getLogRange(clientId, startLast.toISOString().split("T")[0], endLast.toISOString().split("T")[0]),
          ]);
          const complete = (arr: DailyWellnessLog[]) =>
            arr.filter((l) => l.sleep_hours != null && l.stress_level != null && l.soreness_level != null);
          const avg = (arr: DailyWellnessLog[], field: "stress_level" | "soreness_level" | "sleep_hours") => {
            const c = complete(arr);
            if (c.length === 0) return null;
            if (field === "sleep_hours") return c.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / c.length;
            const scale = field === "stress_level" ? dbToUiScale : (v: number | null) => dbToUiScale(v);
            const sum = c.reduce((s, l) => s + (scale(l[field]) ?? 0), 0);
            return sum / c.length;
          };
          const stressThis = avg(logsThisWeek, "stress_level");
          const stressLast = avg(logsLastWeek, "stress_level");
          const sleepThis = avg(logsThisWeek, "sleep_hours");
          const sleepLast = avg(logsLastWeek, "sleep_hours");
          const sorenessThis = avg(logsThisWeek, "soreness_level");
          const sorenessLast = avg(logsLastWeek, "soreness_level");
          let insight: string | null = null;
          if (stressThis != null && stressLast != null && stressThis < stressLast) {
            insight = "Your stress is trending down this week — nice work!";
          } else if (sleepThis != null && sleepLast != null && sleepThis > sleepLast) {
            insight = "You're sleeping better this week — keep it up!";
          } else if (sorenessThis != null && sorenessLast != null && sorenessThis < sorenessLast) {
            insight = "Less sore than last week — recovery is on track.";
          } else if (currentStreak >= 7) {
            insight = "7+ days in a row! Consistency is your superpower.";
          } else {
            insight = "Every check-in counts. You're building a great habit.";
          }
          setSuccessInsight(insight);
        } catch (insightErr) {
          console.warn("Error loading success insight:", insightErr);
          setSuccessInsight("Every check-in counts. You're building a great habit.");
        }

        onSuccess?.();
      } else {
        setSubmitError("Save failed. Please try again.");
      }
    } catch (err) {
      console.error("Check-in save error:", err);
      const message =
        err instanceof Error && err.message === "Save timed out"
          ? "Save took too long. Check your connection and try again."
          : "Something went wrong. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = () => {
    setShowForm(true);
    setShowSuccess(false);
    setSubmitSuccess(false);
    setSubmitError(null);
    setSuccessInsight(null);
  };

  const handleQuickWeightSave = async () => {
    if (!quickWeight || parseFloat(quickWeight) <= 0) return;
    setSavingWeight(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const result = await createMeasurement({
        client_id: clientId,
        measured_date: today,
        weight_kg: parseFloat(quickWeight),
      });
      if (result) {
        setHasWeightToday(true);
        setShowWeightPrompt(false);
        setQuickWeight("");
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
            setNewAchievementsQueue((prev) => [...prev, ...mapped]);
            setAchievementModalIndex(0);
          }
        } catch (achErr) {
          console.warn("Error checking weight goal achievements:", achErr);
        }
      }
    } catch (err) {
      console.error("Error saving quick weight:", err);
    } finally {
      setSavingWeight(false);
    }
  };

  // Sleep hours stepper handlers
  const decrementSleep = () => {
    setSleepHours((prev) => {
      if (prev == null) return 0;
      const newValue = Math.max(0, prev - 0.5);
      setSleepHoursInput(newValue.toString());
      return newValue;
    });
  };

  const incrementSleep = () => {
    setSleepHours((prev) => {
      if (prev == null) return 0.5;
      const newValue = Math.min(14, prev + 0.5);
      setSleepHoursInput(newValue.toString());
      return newValue;
    });
  };

  // Steps stepper handlers
  const decrementSteps = () => {
    setSteps((prev) => {
      if (prev == null) return 0;
      const newValue = Math.max(0, prev - 500);
      setStepsInput(newValue.toString());
      return newValue;
    });
  };

  const incrementSteps = () => {
    setSteps((prev) => {
      if (prev == null) return 500;
      const newValue = prev + 500;
      setStepsInput(newValue.toString());
      return newValue;
    });
  };

  // Handle sleep hours manual input
  const handleSleepHoursInputChange = (value: string) => {
    setSleepHoursInput(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 24) {
      setSleepHours(numValue);
    } else if (value === "") {
      setSleepHours(null);
    }
  };

  // Handle steps manual input
  const handleStepsInputChange = (value: string) => {
    setStepsInput(value.replace(/,/g, ""));
    const numValue = parseInt(value.replace(/,/g, ""), 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setSteps(numValue);
    } else if (value === "") {
      setSteps(null);
    }
  };

  if (loading) {
    return (
      <ClientGlassCard className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </ClientGlassCard>
    );
  }

  if (showSuccess && !showForm) {
    const log = todayLog;

    return (
      <ClientGlassCard className="p-6 transition-all">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[color:var(--fc-status-success)]/20 flex items-center justify-center border border-[color:var(--fc-status-success)]/40">
            <Check className="w-7 h-7 text-[color:var(--fc-status-success)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold fc-text-primary">Check-in complete</h2>
            <p className="text-sm fc-text-dim">
              {todayLog?.created_at
                ? `Updated at ${formatTime(todayLog.created_at)}`
                : todayFormatted}
            </p>
          </div>
        </div>
        
        {/* Display summary */}
        <div className="flex flex-wrap gap-2 mb-4">
          {log?.sleep_hours != null && (
            <div className="fc-glass-soft px-3 py-2 rounded-xl border border-[color:var(--fc-glass-border)]">
              <span className="text-sm fc-text-subtle">
                😴 <span className={getWellnessValueColor(log.sleep_hours, "sleep_hours")}>{log.sleep_hours}h</span>
                {log.sleep_quality != null && (
                  <> (<span className={getWellnessValueColor(log.sleep_quality, "sleep_quality")}>{getSleepQualityLabel(log.sleep_quality)}</span>)</>
                )}
              </span>
            </div>
          )}
          {log?.stress_level != null && (() => {
            const uiVal = dbToUiScale(log.stress_level);
            return uiVal != null ? (
              <div className="fc-glass-soft px-3 py-2 rounded-xl border border-[color:var(--fc-glass-border)]">
                <span className="text-sm fc-text-subtle">
                  😤 <span className={getWellnessValueColor(uiVal, "stress")}>{getStressLabel(log.stress_level)}</span> stress
                </span>
              </div>
            ) : null;
          })()}
          {log?.soreness_level != null && (() => {
            const uiVal = dbToUiScale(log.soreness_level);
            return uiVal != null ? (
              <div className="fc-glass-soft px-3 py-2 rounded-xl border border-[color:var(--fc-glass-border)]">
                <span className="text-sm fc-text-subtle">
                  💪 <span className={getWellnessValueColor(uiVal, "soreness")}>{getSorenessLabel(log.soreness_level)}</span> soreness
                </span>
              </div>
            ) : null;
          })()}
          {log?.steps != null && (
            <div className="fc-glass-soft px-3 py-2 rounded-xl border border-[color:var(--fc-glass-border)]">
              <span className="text-sm fc-text-subtle">
                👟 {log.steps.toLocaleString()} steps
              </span>
            </div>
          )}
        </div>
        
        {todayLog?.notes && (
          <p className="text-sm fc-text-dim mb-4 italic">&ldquo;{todayLog.notes}&rdquo;</p>
        )}
        {streak > 0 && (() => {
          const milestone = getStreakMilestone(streak);
          const nextMilestone = milestone?.nextMilestone || (streak < 7 ? 7 : streak < 30 ? 30 : streak < 100 ? 100 : 0);
          const daysToNext = nextMilestone > 0 ? nextMilestone - streak : 0;
          
          return (
            <div className="mb-3">
              {milestone && submitSuccess && (
                <div className="mb-2 p-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 animate-pulse">
                  <p className="text-sm font-bold fc-text-primary text-center">
                    {milestone.emoji} {milestone.message}
                  </p>
                </div>
              )}
              <p className="text-sm font-semibold fc-text-primary">
                🔥 {streak}-day check-in streak
                {daysToNext > 0 && (
                  <span className="text-xs fc-text-subtle ml-2">
                    — {daysToNext} more to next milestone!
                  </span>
                )}
              </p>
            </div>
          );
        })()}
        {successInsight && (
          <p className="text-sm fc-text-primary mb-4">
            {successInsight.startsWith("Your stress") && "📉 "}
            {successInsight.startsWith("You're sleeping") && "😴 "}
            {successInsight.startsWith("Less sore") && "💪 "}
            {successInsight.startsWith("7+") && "🔥 "}
            {successInsight.startsWith("Every check-in") && "✨ "}
            {successInsight}
          </p>
        )}
        <p className="text-xs fc-text-subtle mb-4">Your coach can see this data.</p>
        
        {/* Optional: Quick weight prompt */}
        {showWeightPrompt && !hasWeightToday && (
          <div className="mt-4 p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <div className="flex items-start gap-3">
              <Scale className="w-5 h-5 fc-text-subtle mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium fc-text-primary mb-2">
                  Also log your weight today?
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={quickWeight}
                    onChange={(e) => setQuickWeight(e.target.value)}
                    placeholder="Weight (kg)"
                    className="flex-1 px-3 py-2 rounded-lg text-sm fc-glass fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-accent-cyan)]"
                  />
                  <button
                    type="button"
                    onClick={handleQuickWeightSave}
                    disabled={!quickWeight || savingWeight}
                    className="px-4 py-2 rounded-lg text-sm font-medium fc-btn fc-btn-primary disabled:opacity-50"
                  >
                    {savingWeight ? "..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWeightPrompt(false)}
                    className="px-3 py-2 rounded-lg text-sm fc-text-subtle hover:fc-text-primary transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <button
          type="button"
          onClick={startEdit}
          className="fc-btn fc-btn-ghost inline-flex items-center gap-2 text-sm font-medium fc-text-primary mt-2"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
      </ClientGlassCard>
    );
  }

  return (
    <>
    <ClientGlassCard className="p-6">
      <header className="mb-6">
        <h2 className="text-[22px] font-bold fc-text-primary">Daily Check-in</h2>
        <p className="text-sm fc-text-dim mt-0.5">{todayFormatted}</p>
        {todayLog?.created_at && (
          <p className="text-xs fc-text-subtle mt-1">
            Updated at {formatTime(todayLog.created_at)} — you can edit below.
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* A) Sleep Duration */}
        <div>
          <label className="block text-sm font-medium fc-text-primary mb-3">
            Sleep Duration
            {yesterdayLog?.sleep_hours != null && (
              <span className="ml-2 text-xs font-normal fc-text-subtle">
                (yesterday: {yesterdayLog.sleep_hours}h
                {sleepHours != null && yesterdayLog.sleep_hours !== sleepHours && (
                  <span className="ml-1">{sleepHours > yesterdayLog.sleep_hours ? "↑" : "↓"}</span>
                )}
                )
              </span>
            )}
          </label>
          
          {/* Stepper Control */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={decrementSleep}
              className="w-12 h-12 rounded-full fc-glass-soft border border-[color:var(--fc-glass-border)] flex items-center justify-center hover:bg-[color:var(--fc-glass-highlight)] transition-all active:scale-95"
            >
              <Minus className="w-5 h-5 fc-text-primary" />
            </button>
            
            <div className="min-w-[120px] text-center">
              {showSleepInput ? (
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={sleepHoursInput}
                  onChange={(e) => handleSleepHoursInputChange(e.target.value)}
                  onBlur={() => setShowSleepInput(false)}
                  className="w-full text-4xl font-bold fc-text-primary bg-transparent border-none outline-none text-center"
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => {
                    setShowSleepInput(true);
                    setSleepHoursInput(sleepHours?.toString() ?? "");
                  }}
                  className="text-4xl font-bold fc-text-primary cursor-text"
                >
                  {sleepHours != null ? `${sleepHours.toFixed(1)}h` : "—"}
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={incrementSleep}
              className="w-12 h-12 rounded-full fc-glass-soft border border-[color:var(--fc-glass-border)] flex items-center justify-center hover:bg-[color:var(--fc-glass-highlight)] transition-all active:scale-95"
            >
              <Plus className="w-5 h-5 fc-text-primary" />
            </button>
          </div>
          
          {/* Quick-select pills */}
          <div className="flex gap-1.5 sm:gap-2 justify-center">
            {SLEEP_QUICK_PRESETS.map((hours) => {
              const selected = sleepHours === hours;
              return (
                <button
                  key={hours}
                  type="button"
                  onClick={() => {
                    setSleepHours(hours);
                    setSleepHoursInput(hours.toString());
                  }}
                  className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all active:scale-95 flex-1 max-w-[60px] ${
                    selected
                      ? "fc-btn fc-btn-primary"
                      : "fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-subtle hover:fc-text-primary"
                  }`}
                >
                  {hours}h
                </button>
              );
            })}
          </div>
        </div>

        {/* B) Sleep Quality */}
        <div>
          <label className="block text-sm font-medium fc-text-primary mb-3">
            Sleep Quality
          </label>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map((n) => {
              const selected = sleepQuality === n;
              const color = ratingColors.positive[n as keyof typeof ratingColors.positive];
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSleepQuality(n)}
                  className="w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 border-2 text-white"
                  style={{
                    backgroundColor: selected ? color : `${color}30`,
                    borderColor: color,
                  }}
                >
                  <span className="text-lg font-bold">{n}</span>
                  <span className="text-[10px] mt-0.5 opacity-90">
                    {SLEEP_QUALITY_LABELS[n - 1]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* C) Stress Level */}
        <div>
          <label className="block text-sm font-medium fc-text-primary mb-3">
            Stress Level
            {yesterdayLog?.stress_level != null && (
              <span className="ml-2 text-xs font-normal fc-text-subtle">
                (yesterday: {getStressLabel(yesterdayLog.stress_level)}
                {stressLevel != null && (() => {
                  const yUi = dbToUiScale(yesterdayLog.stress_level);
                  if (yUi == null) return null;
                  return <span className="ml-1">{stressLevel > yUi ? "↑" : stressLevel < yUi ? "↓" : ""}</span>;
                })()}
                )
              </span>
            )}
          </label>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map((n) => {
              const selected = stressLevel === n;
              const color = ratingColors.negative[n as keyof typeof ratingColors.negative];
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStressLevel(n)}
                  className="w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 border-2 text-white"
                  style={{
                    backgroundColor: selected ? color : `${color}30`,
                    borderColor: color,
                  }}
                >
                  <span className="text-lg font-bold">{n}</span>
                  <span className="text-[10px] mt-0.5 opacity-90">
                    {STRESS_LABELS[n - 1]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* D) Muscle Soreness */}
        <div>
          <label className="block text-sm font-medium fc-text-primary mb-3">
            Muscle Soreness
            {yesterdayLog?.soreness_level != null && (
              <span className="ml-2 text-xs font-normal fc-text-subtle">
                (yesterday: {getSorenessLabel(yesterdayLog.soreness_level)}
                {sorenessLevel != null && (() => {
                  const yUi = dbToUiScale(yesterdayLog.soreness_level);
                  if (yUi == null) return null;
                  return <span className="ml-1">{sorenessLevel > yUi ? "↑" : sorenessLevel < yUi ? "↓" : ""}</span>;
                })()}
                )
              </span>
            )}
          </label>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map((n) => {
              const selected = sorenessLevel === n;
              const color = ratingColors.negative[n as keyof typeof ratingColors.negative];
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSorenessLevel(n)}
                  className="w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 border-2 text-white"
                  style={{
                    backgroundColor: selected ? color : `${color}30`,
                    borderColor: color,
                  }}
                >
                  <span className="text-lg font-bold">{n}</span>
                  <span className="text-[10px] mt-0.5 opacity-90">
                    {SORENESS_LABELS[n - 1]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* E) Steps */}
        <div>
          <label className="block text-sm font-medium fc-text-primary mb-3">
            Steps
            {yesterdayLog?.steps != null && (
              <span className="ml-2 text-xs font-normal fc-text-subtle">
                (yesterday: {yesterdayLog.steps.toLocaleString()}
                {steps != null && yesterdayLog.steps != null && (
                  <span className="ml-1">{steps > yesterdayLog.steps ? "↑" : steps < yesterdayLog.steps ? "↓" : ""}</span>
                )}
                )
              </span>
            )}
          </label>
          
          {/* Stepper Control */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={decrementSteps}
              className="w-12 h-12 rounded-full fc-glass-soft border border-[color:var(--fc-glass-border)] flex items-center justify-center hover:bg-[color:var(--fc-glass-highlight)] transition-all active:scale-95"
            >
              <Minus className="w-5 h-5 fc-text-primary" />
            </button>
            
            <div className="min-w-[140px] text-center">
              {showStepsInput ? (
                <input
                  type="text"
                  value={stepsInput}
                  onChange={(e) => handleStepsInputChange(e.target.value)}
                  onBlur={() => setShowStepsInput(false)}
                  className="w-full text-4xl font-bold fc-text-primary bg-transparent border-none outline-none text-center"
                  placeholder="0"
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => {
                    setShowStepsInput(true);
                    setStepsInput(steps?.toString() ?? "");
                  }}
                  className="text-4xl font-bold fc-text-primary cursor-text"
                >
                  {steps != null ? steps.toLocaleString() : "—"}
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={incrementSteps}
              className="w-12 h-12 rounded-full fc-glass-soft border border-[color:var(--fc-glass-border)] flex items-center justify-center hover:bg-[color:var(--fc-glass-highlight)] transition-all active:scale-95"
            >
              <Plus className="w-5 h-5 fc-text-primary" />
            </button>
          </div>
          
          {/* Quick-select pills */}
          <div className="flex gap-1.5 sm:gap-2 justify-center">
            {STEPS_QUICK_PRESETS.map((preset) => {
              const selected = steps === preset.value;
              const color = ratingColors.steps[preset.label as keyof typeof ratingColors.steps];
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setSteps(preset.value);
                    setStepsInput(preset.value.toString());
                  }}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all active:scale-95 text-white flex-1 max-w-[60px]"
                  style={{
                    backgroundColor: selected ? color : `${color}60`,
                    opacity: selected ? 1 : 0.8,
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* F) Notes */}
        <div>
          {!notesExpanded ? (
            <button
              type="button"
              onClick={() => setNotesExpanded(true)}
              className="text-sm font-medium fc-text-subtle hover:fc-text-primary transition-colors"
            >
              Add note <ChevronDown className="w-4 h-4 inline" />
            </button>
          ) : (
            <div>
              <label className="block text-sm font-medium fc-text-primary mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value.slice(0, MAX_NOTES))
                }
                placeholder="Optional — injuries, lifestyle factors, etc."
                rows={3}
                maxLength={MAX_NOTES}
                className="w-full px-4 py-3 rounded-xl text-sm fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)] resize-none"
              />
              <p className="text-xs fc-text-subtle mt-1">
                {notes.length}/{MAX_NOTES}
              </p>
              <button
                type="button"
                onClick={() => setNotesExpanded(false)}
                className="text-xs fc-text-subtle mt-1 flex items-center gap-1"
              >
                <ChevronUp className="w-3 h-3" /> Collapse
              </button>
            </div>
          )}
        </div>

        {/* 7-day trend strip */}
        {weekLogs.length > 0 && (
          <div className="border-t border-[color:var(--fc-glass-border)] pt-4">
            <p className="text-xs font-semibold fc-text-subtle uppercase mb-2">This week</p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                <div key={i} className="text-[10px] font-medium fc-text-subtle">
                  {day}
                </div>
              ))}
              {(() => {
                const weekDays: string[] = [];
                for (let i = 0; i < 7; i++) {
                  const d = new Date(weekStart + "T12:00:00Z");
                  d.setUTCDate(d.getUTCDate() + i);
                  weekDays.push(d.toISOString().split("T")[0]);
                }
                const logByDate = new Map(weekLogs.map((l) => [l.log_date, l]));
                return weekDays.map((dateStr) => {
                  const log = logByDate.get(dateStr);
                  const isFuture = dateStr > today;
                  const hasData = log && log.sleep_hours != null && log.sleep_quality != null && log.stress_level != null && log.soreness_level != null;
                  const emoji = isFuture ? "—" : hasData
                    ? ((log?.sleep_hours ?? 0) >= 7 && (log?.stress_level ?? 10) <= 6 ? "😊" : "😐")
                    : "—";
                  return (
                    <div key={dateStr} className="text-sm" title={dateStr}>
                      {emoji}
                    </div>
                  );
                });
              })()}
              {(() => {
                const weekDays: string[] = [];
                for (let i = 0; i < 7; i++) {
                  const d = new Date(weekStart + "T12:00:00Z");
                  d.setUTCDate(d.getUTCDate() + i);
                  weekDays.push(d.toISOString().split("T")[0]);
                }
                const logByDate = new Map(weekLogs.map((l) => [l.log_date, l]));
                return weekDays.map((dateStr) => {
                  const log = logByDate.get(dateStr);
                  const isFuture = dateStr > today;
                  return (
                    <div key={dateStr} className="text-[10px] fc-text-subtle font-mono">
                      {isFuture ? "—" : log?.sleep_hours != null ? `${log.sleep_hours}h` : "—"}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {submitError && (
          <p className="text-sm text-red-500 mb-2" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={!allRequiredSelected || submitting}
          className="w-full py-4 rounded-xl font-semibold text-base fc-btn fc-btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px]"
        >
          {submitting ? (
            <>
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </button>
      </form>
    </ClientGlassCard>

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
    </>
  );
}
