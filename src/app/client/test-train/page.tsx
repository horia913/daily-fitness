"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Play,
  Flame,
  Trophy,
  Zap,
  ChevronRight,
  Dumbbell,
  Clock,
  TrendingUp,
  CheckCircle,
  Target,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// ─── SAMPLE DATA ───

const PROGRAM = {
  name: "Hypertrophy Phase II",
  blockName: "Accumulation",
  blockGoal: "hypertrophy",
  week: 3,
  totalWeeks: 8,
  completedThisWeek: 3,
  totalThisWeek: 5,
};

const WEEK_DAYS = [
  { day: "Mon", label: "Chest & Tri", done: true, exercises: 6, duration: 55, isToday: false },
  { day: "Tue", label: "Back & Bi", done: true, exercises: 7, duration: 50, isToday: false },
  { day: "Wed", label: "Rest", done: true, exercises: 0, duration: 0, isToday: false, isRest: true },
  { day: "Thu", label: "Legs", done: false, exercises: 8, duration: 60, isToday: true },
  { day: "Fri", label: "Shoulders", done: false, exercises: 6, duration: 45, isToday: false },
  { day: "Sat", label: "Rest", done: false, exercises: 0, duration: 0, isToday: false, isRest: true },
  { day: "Sun", label: "Arms & Abs", done: false, exercises: 7, duration: 40, isToday: false },
];

const TODAY = WEEK_DAYS.find((d) => d.isToday)!;

const EXERCISES = [
  { name: "Barbell Back Squat", sets: 4, reps: "8-10", icon: "🏋️" },
  { name: "Romanian Deadlift", sets: 3, reps: "10-12", icon: "💪" },
  { name: "Leg Press", sets: 3, reps: "12-15", icon: "🦵" },
  { name: "Walking Lunges", sets: 3, reps: "12 each", icon: "🚶" },
  { name: "Leg Curl", sets: 3, reps: "10-12", icon: "⚡" },
  { name: "Calf Raises", sets: 4, reps: "15-20", icon: "🔥" },
];

const STATS = {
  streak: 12,
  prsThisWeek: 3,
  totalVolume: "24,500 kg",
  workoutsThisMonth: 14,
};

const MOTIVATIONAL = [
  "Leg day — time to build a foundation!",
  "Strong legs, strong everything.",
  "Your future self will thank you.",
  "The iron never lies.",
];

export default function TestTrainPage() {
  const { isDark } = useTheme();
  const [selectedDay, setSelectedDay] = useState(3); // Thursday
  const selected = WEEK_DAYS[selectedDay];
  const motivQuote = MOTIVATIONAL[Math.floor(Date.now() / 86400000) % MOTIVATIONAL.length];

  const weekProgress = Math.round((PROGRAM.completedThisWeek / PROGRAM.totalThisWeek) * 100);
  const programProgress = Math.round((PROGRAM.week / PROGRAM.totalWeeks) * 100);

  const bg = isDark ? "var(--fc-bg-deep, #0b0f14)" : "#f5f5f5";
  const cardBg = isDark ? "var(--fc-surface-card, #1c2333)" : "#fff";
  const cardBorder = isDark ? "var(--fc-surface-card-border, rgba(255,255,255,0.08))" : "rgba(0,0,0,0.08)";
  const sunken = isDark ? "var(--fc-surface-sunken, #141b27)" : "rgba(0,0,0,0.03)";
  const textPrimary = isDark ? "#fff" : "#1a1a1a";
  const textDim = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  const textMuted = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";

  return (
    <div className="min-h-screen pb-28" style={{ background: bg }}>
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 py-3 backdrop-blur-xl" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/client/train">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold" style={{ color: textPrimary }}>Train Page Prototype</h1>
            <p className="text-xs" style={{ color: textDim }}>Visual mockup — not functional</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* ─── STATS RIBBON ─── */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {[
            { icon: <Flame className="w-3.5 h-3.5" />, value: `${STATS.streak} days`, label: "Streak", color: "#FF6B35" },
            { icon: <Trophy className="w-3.5 h-3.5" />, value: `${STATS.prsThisWeek}`, label: "PRs this week", color: "#FFD700" },
            { icon: <TrendingUp className="w-3.5 h-3.5" />, value: STATS.totalVolume, label: "Volume", color: "#06b6d4" },
            { icon: <Target className="w-3.5 h-3.5" />, value: `${STATS.workoutsThisMonth}`, label: "This month", color: "#7c3aed" },
          ].map((stat, i) => (
            <div
              key={i}
              className="flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
              style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${stat.color}18`, color: stat.color }}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-bold tabular-nums" style={{ color: textPrimary }}>{stat.value}</p>
                <p className="text-[10px]" style={{ color: textMuted }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── HERO: TODAY'S WORKOUT ─── */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee)",
            boxShadow: "0 8px 32px rgba(8, 145, 178, 0.3)",
          }}
        >
          {/* Subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)",
            }}
          />
          <div className="relative p-6">
            {/* Program context */}
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white">
                {PROGRAM.blockGoal}
              </span>
              <span className="text-xs text-white/70">{PROGRAM.blockName}</span>
            </div>

            <p className="text-white/70 text-xs mb-4">
              Week {PROGRAM.week} of {PROGRAM.totalWeeks} · {motivQuote}
            </p>

            {/* Workout info */}
            <div className="mb-5">
              <h2 className="text-2xl font-black text-white mb-1 tracking-tight">
                {TODAY.label}
              </h2>
              <div className="flex items-center gap-4 text-sm text-white/80">
                <span className="flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5" />
                  {TODAY.exercises} exercises
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  ~{TODAY.duration} min
                </span>
              </div>
            </div>

            {/* Week progress mini-ring */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                    <circle
                      cx="24" cy="24" r="20" fill="none" stroke="#fff"
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={`${weekProgress * 1.256} 999`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">
                    {PROGRAM.completedThisWeek}/{PROGRAM.totalThisWeek}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Week Progress</p>
                  <p className="text-xs text-white/60">{weekProgress}% complete</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              className="w-full h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
              style={{
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(12px)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <Play className="w-5 h-5 fill-current" />
              START WORKOUT
            </button>
          </div>
        </div>

        {/* ─── WEEK STRIP ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: textDim }}>This Week</h3>
            <span className="text-xs" style={{ color: textMuted }}>
              {PROGRAM.completedThisWeek} of {PROGRAM.totalThisWeek} done
            </span>
          </div>
          <div className="flex gap-1.5">
            {WEEK_DAYS.map((d, i) => {
              const isActive = i === selectedDay;
              let bg: string;
              let borderColor: string;
              let dotColor: string;

              if (d.done) {
                bg = isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)";
                borderColor = "rgba(34,197,94,0.3)";
                dotColor = "#22c55e";
              } else if (d.isToday) {
                bg = isDark ? "rgba(6,182,212,0.15)" : "rgba(6,182,212,0.08)";
                borderColor = "#06b6d4";
                dotColor = "#06b6d4";
              } else if (d.isRest) {
                bg = "transparent";
                borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
                dotColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
              } else {
                bg = "transparent";
                borderColor = cardBorder;
                dotColor = textMuted;
              }

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all"
                  style={{
                    background: bg,
                    border: `1.5px solid ${isActive ? "#06b6d4" : borderColor}`,
                    boxShadow: isActive ? "0 0 0 2px rgba(6,182,212,0.25)" : "none",
                  }}
                >
                  <span className="text-[10px] font-bold uppercase" style={{ color: d.isToday ? "#06b6d4" : textDim }}>
                    {d.day}
                  </span>
                  {d.done ? (
                    <CheckCircle className="w-5 h-5" style={{ color: "#22c55e" }} />
                  ) : d.isRest ? (
                    <div className="w-5 h-5 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
                    </div>
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: dotColor }}
                    >
                      {d.isToday && <div className="w-2 h-2 rounded-full" style={{ background: dotColor }} />}
                    </div>
                  )}
                  <span
                    className="text-[9px] font-medium truncate max-w-full px-0.5"
                    style={{ color: d.done ? "#22c55e" : d.isToday ? "#06b6d4" : textMuted }}
                  >
                    {d.isRest ? "Rest" : d.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── SELECTED DAY PREVIEW ─── */}
        {selected && !selected.isRest && (
          <div
            className="rounded-2xl p-5"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold" style={{ color: textPrimary }}>
                  {selected.label}
                </h3>
                <p className="text-xs" style={{ color: textDim }}>
                  {selected.exercises} exercises · ~{selected.duration} min
                </p>
              </div>
              {selected.isToday && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ background: "rgba(6,182,212,0.12)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.25)" }}>
                  Today
                </span>
              )}
              {selected.done && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>
                  Done
                </span>
              )}
            </div>

            <div className="space-y-2">
              {EXERCISES.map((ex, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: sunken }}
                >
                  <span className="text-lg flex-shrink-0">{ex.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{ex.name}</p>
                    <p className="text-xs" style={{ color: textDim }}>{ex.sets} sets × {ex.reps}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: textMuted }} />
                </div>
              ))}
            </div>

            {!selected.done && (
              <button
                className="w-full h-12 mt-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{
                  background: selected.isToday ? "linear-gradient(135deg, #0891b2, #06b6d4)" : cardBg,
                  color: selected.isToday ? "#fff" : textPrimary,
                  border: selected.isToday ? "none" : `1px solid ${cardBorder}`,
                  boxShadow: selected.isToday ? "0 4px 16px rgba(6,182,212,0.3)" : "none",
                }}
              >
                <Play className="w-4 h-4 fill-current" />
                {selected.isToday ? "START WORKOUT" : "Preview Workout"}
              </button>
            )}
          </div>
        )}

        {/* Rest day state */}
        {selected && selected.isRest && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <span className="text-4xl mb-3 block">😴</span>
            <h3 className="text-base font-bold mb-1" style={{ color: textPrimary }}>Rest Day</h3>
            <p className="text-sm" style={{ color: textDim }}>
              Recovery is when the magic happens. Stay hydrated, stretch, and come back stronger.
            </p>
          </div>
        )}

        {/* ─── PROGRAM PROGRESS ─── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(124,58,237,0.12)" }}
            >
              <Target className="w-5 h-5" style={{ color: "#7c3aed" }} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold" style={{ color: textPrimary }}>{PROGRAM.name}</h3>
              <p className="text-xs" style={{ color: textDim }}>
                Week {PROGRAM.week} of {PROGRAM.totalWeeks} · {PROGRAM.blockName}
              </p>
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: "#7c3aed" }}>
              {programProgress}%
            </span>
          </div>

          {/* Program progress bar */}
          <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: sunken }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${programProgress}%`,
                background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
              }}
            />
          </div>

          {/* Block breakdown */}
          <div className="flex gap-1.5 mt-3">
            {["Accumulation", "Intensification", "Peaking", "Deload"].map((block, i) => (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full"
                style={{
                  background: i < 1 ? "linear-gradient(90deg, #7c3aed, #a78bfa)" : sunken,
                  opacity: i < 1 ? 1 : 0.5,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {["Accum.", "Intens.", "Peak", "Deload"].map((label, i) => (
              <span key={i} className="text-[9px]" style={{ color: i < 1 ? "#7c3aed" : textMuted }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ─── QUICK ACTIONS ─── */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: textDim }}>Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Zap className="w-5 h-5" />, title: "Extra Workout", sub: "Add a bonus session", color: "#FF6B35" },
              { icon: <TrendingUp className="w-5 h-5" />, title: "Log Activity", sub: "Cardio, steps, etc.", color: "#06b6d4" },
            ].map((action, i) => (
              <div
                key={i}
                className="rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98]"
                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${action.color}15`, color: action.color }}
                >
                  {action.icon}
                </div>
                <p className="text-sm font-bold" style={{ color: textPrimary }}>{action.title}</p>
                <p className="text-xs" style={{ color: textDim }}>{action.sub}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
