"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ClientGlassCard, SectionHeader } from "@/components/client-ui";
import checkinSuiteStyles from "@/components/client/check-ins/checkinSuite/checkinSuiteV1.module.css";
import { cn } from "@/lib/utils";
import {
  DailyWellnessLog,
  MonthlyStats,
  dbToUiScale,
} from "@/lib/wellnessService";
import { getWellnessValueColor } from "@/lib/wellnessValueColors";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

function getSleepQualityLabel(value: number | null | undefined): string {
  if (value == null) return "—";
  const labels = ["Terrible", "Poor", "Fair", "Good", "Great"];
  return labels[Math.min(4, Math.max(0, value - 1))] || "—";
}

function getStressLabel(dbValue: number | null | undefined): string {
  if (dbValue == null) return "—";
  const uiValue = dbToUiScale(dbValue);
  if (uiValue == null) return "—";
  const labels = ["Calm", "Mild", "Moderate", "High", "Overwhelmed"];
  return labels[Math.min(4, Math.max(0, uiValue - 1))] || "—";
}

function getSorenessLabel(dbValue: number | null | undefined): string {
  if (dbValue == null) return "—";
  const uiValue = dbToUiScale(dbValue);
  if (uiValue == null) return "—";
  const labels = ["Fresh", "Mild", "Moderate", "Sore", "Very Sore"];
  return labels[Math.min(4, Math.max(0, uiValue - 1))] || "—";
}

interface CheckInHistoryProps {
  clientId: string;
  initialLogRange?: DailyWellnessLog[];
  initialCurrentStreak?: number;
  initialBestStreak?: number;
  initialMonthlyStats?: MonthlyStats | null;
}

export function CheckInHistory({ 
  clientId, 
  initialLogRange = [],
  initialCurrentStreak = 0,
  initialBestStreak = 0,
  initialMonthlyStats = null,
}: CheckInHistoryProps) {
  const [currentStreak, setCurrentStreak] = useState(initialCurrentStreak);
  const [bestStreak, setBestStreak] = useState(initialBestStreak);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(initialMonthlyStats);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendarLogs, setCalendarLogs] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<DailyWellnessLog | null>(null);
  const [recentLogs, setRecentLogs] = useState<DailyWellnessLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Update from props when they change
  useEffect(() => {
    setCurrentStreak(initialCurrentStreak);
    setBestStreak(initialBestStreak);
    setMonthlyStats(initialMonthlyStats);
  }, [initialCurrentStreak, initialBestStreak, initialMonthlyStats]);

  // Calculate calendar and recent logs from initialLogRange (no additional queries)
  useEffect(() => {
    if (initialLogRange.length === 0) return;
    
    const now = new Date();
    const month = currentMonth;
    const year = currentYear;
    
    // Filter logs for current month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];
    
    const monthLogs = initialLogRange.filter(
      (log) => log.log_date >= startDateStr && log.log_date <= endDateStr
    );
    const completeInMonth = monthLogs.filter(
      (l) =>
        l.sleep_hours != null &&
        l.sleep_quality != null &&
        l.stress_level != null &&
        l.soreness_level != null
    );
    setCalendarLogs(new Set(completeInMonth.map((log) => log.log_date)));
    
    // Filter recent logs (last 7 days)
    const today = now.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
    
    const recent = initialLogRange.filter(
      (log) => log.log_date >= sevenDaysAgoStr && log.log_date <= today
    );
    setRecentLogs(recent);
    
    // Update selected log if date is selected
    if (selectedDate) {
      const log = monthLogs.find((l) => l.log_date === selectedDate);
      setSelectedLog(log || null);
    }
    
    // Recalculate monthly stats from filtered logs
    const completeMonthLogs = monthLogs.filter(
      (l: any) =>
        l.sleep_hours != null &&
        l.sleep_quality != null &&
        l.stress_level != null &&
        l.soreness_level != null
    );
    
    setMonthlyStats({
      loggedDays: completeMonthLogs.length,
      totalDays: endDate.getDate(),
      completionRate: endDate.getDate() > 0 ? Math.round((completeMonthLogs.length / endDate.getDate()) * 100) : 0,
    });
  }, [initialLogRange, currentMonth, currentYear, selectedDate]);

  const handleDateClick = (date: string) => {
    if (date > new Date().toISOString().split("T")[0]) return; // Future date

    setSelectedDate(date);
    // Find log from initialLogRange (no query needed)
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];
    
    const monthLogs = initialLogRange.filter(
      (log) => log.log_date >= startDateStr && log.log_date <= endDateStr
    );
    const log = monthLogs.find((l) => l.log_date === date);
    setSelectedLog(log || null);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      const now = new Date();
      if (currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear()) {
        return; // Can't go to future
      }
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const renderCalendar = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const today = new Date().toISOString().split("T")[0];
    const days: React.ReactElement[] = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isLogged = calendarLogs.has(dateStr);
      const isToday = dateStr === today;
      const isFuture = dateStr > today;
      const isSelected = selectedDate === dateStr;

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => !isFuture && handleDateClick(dateStr)}
          disabled={isFuture}
          className={cn(
            checkinSuiteStyles.fontDisplay,
            "aspect-square rounded-[9px] flex flex-col items-center justify-center gap-0.5 text-sm font-bold transition-all border",
          )}
          style={
            isFuture
              ? {
                  opacity: 0.25,
                  cursor: "not-allowed",
                  color: "var(--cs-t4)",
                  borderColor: "transparent",
                  background: "transparent",
                }
              : isLogged
                ? {
                    color: "var(--cs-good)",
                    borderColor: "var(--cs-good-dim)",
                    background: "var(--cs-good-soft)",
                  }
                : {
                    color: isToday ? "var(--fc-accent)" : "var(--cs-t4)",
                    borderColor: isToday ? "var(--fc-accent)" : "var(--cs-line-2)",
                    background: "var(--cs-card-2)",
                    boxShadow: isToday ? "0 0 0 2px var(--fc-accent-dim), inset 0 0 0 1px var(--fc-accent-glow)" : undefined,
                  }
          }
        >
          <span>{day}</span>
          {isLogged && !isFuture ? (
            <Check className="h-2.5 w-2.5" strokeWidth={3} style={{ color: "var(--cs-good)" }} aria-hidden />
          ) : (
            <span className="h-1 w-1 rounded-full opacity-0" aria-hidden />
          )}
        </button>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <ClientGlassCard className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </ClientGlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Streak & Stats Header */}
      <div className={checkinSuiteStyles.statsHero}>
        <div className="relative z-[1]">
          <p
            className={cn(checkinSuiteStyles.fontMono, "text-[10px] font-semibold uppercase tracking-[0.16em] mb-2")}
            style={{ color: "var(--fc-accent)" }}
          >
            History & stats
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div
              className="flex flex-col gap-1 rounded-[11px] border p-2.5"
              style={{
                background: "rgba(0,0,0,0.18)",
                borderColor: "var(--cs-line-2)",
              }}
            >
              <span className={cn(checkinSuiteStyles.fontMono, "text-[9px] uppercase tracking-[0.1em]")} style={{ color: "var(--cs-t3)" }}>
                Current streak
              </span>
              <p className={cn(checkinSuiteStyles.fontDisplay, "text-xl font-bold flex flex-wrap items-baseline gap-1")} style={{ color: "var(--cs-warning)" }}>
                <span aria-hidden>🔥</span>
                {currentStreak}
                <span className={cn(checkinSuiteStyles.fontBody, "text-[10px] font-normal")} style={{ color: "var(--cs-t3)" }}>
                  {currentStreak === 1 ? "day" : "days"}
                </span>
              </p>
            </div>
            <div
              className="flex flex-col gap-1 rounded-[11px] border p-2.5"
              style={{
                background: "rgba(0,0,0,0.18)",
                borderColor: "var(--cs-line-2)",
              }}
            >
              <span className={cn(checkinSuiteStyles.fontMono, "text-[9px] uppercase tracking-[0.1em]")} style={{ color: "var(--cs-t3)" }}>
                Personal best
              </span>
              <p className={cn(checkinSuiteStyles.fontDisplay, "text-xl font-bold")} style={{ color: "var(--fc-accent)" }}>
                {bestStreak}{" "}
                <span className={cn(checkinSuiteStyles.fontBody, "text-[10px] font-normal")} style={{ color: "var(--cs-t3)" }}>
                  {bestStreak === 1 ? "day" : "days"}
                </span>
              </p>
            </div>
            <div
              className="flex flex-col gap-1 rounded-[11px] border p-2.5"
              style={{
                background: "rgba(0,0,0,0.18)",
                borderColor: "var(--cs-line-2)",
              }}
            >
              <span className={cn(checkinSuiteStyles.fontMono, "text-[9px] uppercase tracking-[0.1em]")} style={{ color: "var(--cs-t3)" }}>
                This month
              </span>
              <p className={cn(checkinSuiteStyles.fontDisplay, "text-xl font-bold")} style={{ color: "var(--fc-accent)" }}>
                {monthlyStats?.loggedDays || 0}
                <span className={cn(checkinSuiteStyles.fontBody, "text-[13px] font-normal")} style={{ color: "var(--cs-t3)" }}>
                  {" "}
                  /{monthlyStats?.totalDays || 0}
                </span>
              </p>
              <p className={cn(checkinSuiteStyles.fontMono, "text-[9.5px] tracking-[0.04em]")} style={{ color: "var(--cs-t3)" }}>
                {monthlyStats?.completionRate || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Heat Map */}
      <div className={checkinSuiteStyles.sectionCard}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className={cn(checkinSuiteStyles.fontHeadline, "text-[15px] font-semibold")} style={{ color: "var(--cs-t1)" }}>
            {new Date(currentYear, currentMonth - 1, 1).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => navigateMonth("prev")}
              className="flex h-7 w-7 items-center justify-center rounded-lg border transition-colors"
              style={{ background: "var(--cs-card-2)", borderColor: "var(--cs-line)", color: "var(--cs-t2)" }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCurrentMonth(now.getMonth() + 1);
                setCurrentYear(now.getFullYear());
              }}
              className={cn(checkinSuiteStyles.fontMono, "px-2.5 py-1 rounded-lg border text-[9.5px] font-semibold uppercase tracking-[0.08em]")}
              style={{
                background: "var(--fc-accent-dim)",
                borderColor: "var(--fc-accent-glow)",
                color: "var(--fc-accent)",
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => navigateMonth("next")}
              disabled={
                currentMonth === new Date().getMonth() + 1 &&
                currentYear === new Date().getFullYear()
              }
              className="flex h-7 w-7 items-center justify-center rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "var(--cs-card-2)", borderColor: "var(--cs-line)", color: "var(--cs-t2)" }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mb-1">
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className={cn(checkinSuiteStyles.fontMono, "text-center text-[9px] font-medium uppercase tracking-[0.1em] py-1")}
                style={{ color: "var(--cs-t3)" }}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-[3px]">{renderCalendar()}</div>
        </div>

        {/* Selected Date Details */}
        {selectedLog && (
          <div className="mt-4 p-4 fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)]">
            <p className="text-sm font-semibold fc-text-primary mb-2">
              {new Date(selectedLog.log_date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {selectedLog.sleep_hours != null && (
                <div className="fc-glass-soft px-2 py-1.5 rounded-lg border border-[color:var(--fc-glass-border)]">
                  <div className="text-xs fc-text-subtle">😴</div>
                  <div className={`text-xs font-semibold ${getWellnessValueColor(selectedLog.sleep_hours, "sleep_hours")}`}>
                    {selectedLog.sleep_hours}h
                    {selectedLog.sleep_quality != null && (
                      <> ({getSleepQualityLabel(selectedLog.sleep_quality)})</>
                    )}
                  </div>
                </div>
              )}
              {selectedLog.stress_level != null && (() => {
                const uiVal = dbToUiScale(selectedLog.stress_level);
                return uiVal != null ? (
                  <div className="fc-glass-soft px-2 py-1.5 rounded-lg border border-[color:var(--fc-glass-border)]">
                    <div className="text-xs fc-text-subtle">😤</div>
                    <div className={`text-xs font-semibold ${getWellnessValueColor(uiVal, "stress")}`}>
                      {getStressLabel(selectedLog.stress_level)}
                    </div>
                  </div>
                ) : null;
              })()}
              {selectedLog.soreness_level != null && (() => {
                const uiVal = dbToUiScale(selectedLog.soreness_level);
                return uiVal != null ? (
                  <div className="fc-glass-soft px-2 py-1.5 rounded-lg border border-[color:var(--fc-glass-border)]">
                    <div className="text-xs fc-text-subtle">💪</div>
                    <div className={`text-xs font-semibold ${getWellnessValueColor(uiVal, "soreness")}`}>
                      {getSorenessLabel(selectedLog.soreness_level)}
                    </div>
                  </div>
                ) : null;
              })()}
              {selectedLog.steps != null && (
                <div className="fc-glass-soft px-2 py-1.5 rounded-lg border border-[color:var(--fc-glass-border)]">
                  <div className="text-xs fc-text-subtle">👟</div>
                  <div className="text-xs font-semibold fc-text-primary">
                    {selectedLog.steps.toLocaleString()} steps
                  </div>
                </div>
              )}
            </div>
            {selectedLog.notes && (
              <p className="text-xs fc-text-subtle mt-2 italic">&ldquo;{selectedLog.notes}&rdquo;</p>
            )}
          </div>
        )}
      </div>

      {/* Recent Entries */}
      {recentLogs.length > 0 && (
        <ClientGlassCard className="p-6">
          <SectionHeader
            title="Recent Entries"
            titleTone="plain"
            titleClassName="text-lg font-semibold fc-text-primary"
            className="!mb-4"
          />
          <div className="flex flex-col border-y border-[color:var(--fc-glass-border)] -mx-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="cursor-pointer border-b border-[color:var(--fc-glass-border)] px-2 py-3 last:border-b-0 transition-colors hover:bg-[color:var(--fc-glass-highlight)]"
                onClick={() => handleDateClick(log.log_date)}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold fc-text-primary">
                    {new Date(log.log_date + "T12:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs fc-text-subtle">
                    {new Date(log.created_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mb-2 text-xs fc-text-subtle">
                  {log.sleep_hours != null && (
                    <span>
                      😴 <span className={getWellnessValueColor(log.sleep_hours, "sleep_hours")}>{log.sleep_hours}h</span>
                      {log.sleep_quality != null && (
                        <> (<span className={getWellnessValueColor(log.sleep_quality, "sleep_quality")}>{getSleepQualityLabel(log.sleep_quality)}</span>)</>
                      )}
                    </span>
                  )}
                  {log.stress_level != null && (() => {
                    const uiVal = dbToUiScale(log.stress_level);
                    return uiVal != null ? (
                      <span>
                        😤 <span className={getWellnessValueColor(uiVal, "stress")}>{getStressLabel(log.stress_level)}</span>
                      </span>
                    ) : null;
                  })()}
                  {log.soreness_level != null && (() => {
                    const uiVal = dbToUiScale(log.soreness_level);
                    return uiVal != null ? (
                      <span>
                        💪 <span className={getWellnessValueColor(uiVal, "soreness")}>{getSorenessLabel(log.soreness_level)}</span>
                      </span>
                    ) : null;
                  })()}
                  {log.steps != null && (
                    <span>
                      👟 {log.steps.toLocaleString()} steps
                    </span>
                  )}
                </div>
                {log.notes && (
                  <p className="text-xs fc-text-subtle italic line-clamp-2">
                    &ldquo;{log.notes}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </ClientGlassCard>
      )}
    </div>
  );
}
