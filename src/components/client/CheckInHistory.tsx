"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ClientGlassCard } from "@/components/client-ui";
import {
  DailyWellnessLog,
  MonthlyStats,
  dbToUiScale,
} from "@/lib/wellnessService";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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
    setCalendarLogs(new Set(monthLogs.map((log) => log.log_date)));
    
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
          onClick={() => !isFuture && handleDateClick(dateStr)}
          disabled={isFuture}
          className={`
            aspect-square rounded-lg text-xs font-medium transition-all
            ${isFuture
              ? "fc-text-subtle opacity-30 cursor-not-allowed"
              : isLogged
              ? "bg-[color:var(--fc-status-success)]/20 text-[color:var(--fc-status-success)] border border-[color:var(--fc-status-success)]/40 hover:bg-[color:var(--fc-status-success)]/30"
              : "fc-glass-soft border border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-glass-highlight)]"}
            ${isToday ? "ring-2 ring-[color:var(--fc-accent-cyan)]" : ""}
            ${isSelected ? "ring-2 ring-[color:var(--fc-accent-purple)]" : ""}
          `}
        >
          {day}
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
      <ClientGlassCard className="p-6">
        <h2 className="text-xl font-bold fc-text-primary mb-4">History & Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="fc-glass-soft p-4 rounded-xl border border-[color:var(--fc-glass-border)]">
            <p className="text-xs fc-text-subtle mb-1">Current Streak</p>
            <p className="text-2xl font-bold fc-text-primary">
              🔥 {currentStreak} {currentStreak === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="fc-glass-soft p-4 rounded-xl border border-[color:var(--fc-glass-border)]">
            <p className="text-xs fc-text-subtle mb-1">Personal Best</p>
            <p className="text-2xl font-bold fc-text-primary">
              {bestStreak} {bestStreak === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="fc-glass-soft p-4 rounded-xl border border-[color:var(--fc-glass-border)]">
            <p className="text-xs fc-text-subtle mb-1">This Month</p>
            <p className="text-2xl font-bold fc-text-primary">
              {monthlyStats?.loggedDays || 0} / {monthlyStats?.totalDays || 0}
            </p>
            <p className="text-xs fc-text-subtle mt-1">
              ({monthlyStats?.completionRate || 0}%)
            </p>
          </div>
        </div>
      </ClientGlassCard>

      {/* Calendar Heat Map */}
      <ClientGlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold fc-text-primary">
            {new Date(currentYear, currentMonth - 1, 1).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth("prev")}
              className="fc-glass-soft p-2 rounded-lg border border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4 fc-text-primary" />
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setCurrentMonth(now.getMonth() + 1);
                setCurrentYear(now.getFullYear());
              }}
              className="fc-glass-soft px-3 py-2 rounded-lg border border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-glass-highlight)] transition-colors text-xs font-medium fc-text-primary"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth("next")}
              disabled={
                currentMonth === new Date().getMonth() + 1 &&
                currentYear === new Date().getFullYear()
              }
              className="fc-glass-soft p-2 rounded-lg border border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-glass-highlight)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 fc-text-primary" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="mb-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-medium fc-text-subtle py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
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
                  <div className="text-xs font-semibold fc-text-primary">
                    {selectedLog.sleep_hours}h ({getSleepQualityLabel(selectedLog.sleep_quality)})
                  </div>
                </div>
              )}
              {selectedLog.stress_level != null && (
                <div className="fc-glass-soft px-2 py-1.5 rounded-lg border border-[color:var(--fc-glass-border)]">
                  <div className="text-xs fc-text-subtle">😤</div>
                  <div className="text-xs font-semibold fc-text-primary">
                    {getStressLabel(selectedLog.stress_level)}
                  </div>
                </div>
              )}
              {selectedLog.soreness_level != null && (
                <div className="fc-glass-soft px-2 py-1.5 rounded-lg border border-[color:var(--fc-glass-border)]">
                  <div className="text-xs fc-text-subtle">💪</div>
                  <div className="text-xs font-semibold fc-text-primary">
                    {getSorenessLabel(selectedLog.soreness_level)}
                  </div>
                </div>
              )}
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
      </ClientGlassCard>

      {/* Recent Entries */}
      {recentLogs.length > 0 && (
        <ClientGlassCard className="p-6">
          <h3 className="text-lg font-semibold fc-text-primary mb-4">Recent Entries</h3>
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="fc-glass-soft p-4 rounded-xl border border-[color:var(--fc-glass-border)] cursor-pointer hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
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
                      😴 {log.sleep_hours}h ({getSleepQualityLabel(log.sleep_quality)})
                    </span>
                  )}
                  {log.stress_level != null && (
                    <span>
                      😤 {getStressLabel(log.stress_level)}
                    </span>
                  )}
                  {log.soreness_level != null && (
                    <span>
                      💪 {getSorenessLabel(log.soreness_level)}
                    </span>
                  )}
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
