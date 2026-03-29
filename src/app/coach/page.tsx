"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { AnimatedEntry } from "@/components/ui/AnimatedEntry";
import { WeekReviewModal } from "@/components/coach/WeekReviewModal";
import {
  Users,
  Dumbbell,
  ClipboardCheck,
  BarChart3,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Moon,
  Calendar,
  Flag,
  Search,
  Flame,
  Utensils,
  Trophy,
  Clock,
} from "lucide-react";
import { type MorningBriefing, type ClientAlert, sortAlertsByPriority } from "@/lib/coachDashboardService";
import {
  attentionListRowClass,
  computeClientAttentionFromSummary,
} from "@/lib/coachClientAttention";
import { cn } from "@/lib/utils";
function CoachDashboardContent() {
  const { user, profile } = useAuth();
  const { performanceSettings } = useTheme();

  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [programCompliance, setProgramCompliance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "lastActive" | "streak" | "compliance">("name");
  const loadingRef = useRef(false);
  const didLoadRef = useRef(false);
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    assignmentId: string;
    programId: string;
    weekNumber: number;
    clientName: string;
  }>({ isOpen: false, assignmentId: "", programId: "", weekNumber: 0, clientName: "" });

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (!user) return;
    if (didLoadRef.current) return;
    if (loadingRef.current) return;
    didLoadRef.current = true;
    loadingRef.current = true;
    try {
      setLoading(true);
      setLoadingStartedAt(Date.now());
      setError(null);

      const res = await fetch("/api/coach/dashboard", { signal: signal ?? null });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const { briefing: briefingData, controlRoom: controlRoomData } = await res.json();

      setBriefing(briefingData ?? null);
      if (controlRoomData?.signals != null) {
        setProgramCompliance(controlRoomData.signals.coachProgramCompliancePct ?? null);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        didLoadRef.current = false;
        return;
      }
      console.error("Error loading dashboard data:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      didLoadRef.current = false;
    } finally {
      setLoading(false);
      setLoadingStartedAt(null);
      loadingRef.current = false;
    }
  }, [user]);

  const refetchDashboard = useCallback(() => {
    didLoadRef.current = false;
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const ac = new AbortController();
    loadData(ac.signal);
    return () => {
      didLoadRef.current = false;
      loadingRef.current = false;
      ac.abort();
    };
  }, [user, loadData]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = profile?.first_name || "Coach";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Combine and prioritize alerts
  const getAllAlerts = (): ClientAlert[] => {
    if (!briefing) return [];
    const { alerts } = briefing;
    // Combine all alerts from all categories
    const allAlerts: ClientAlert[] = [
      ...alerts.highStress,
      ...alerts.highSoreness,
      ...alerts.lowSleep,
      ...alerts.noCheckIn3Days,
      ...alerts.missedWorkouts,
      ...alerts.overdueCheckIn,
      ...alerts.programEnding,
      ...alerts.noProgram,
      ...alerts.noMealPlan,
      ...alerts.achievementUnlocked,
    ];
    // Sort by severity (high → medium → low)
    return sortAlertsByPriority(allAlerts);
  };

  const allAlerts = getAllAlerts();
  const urgentAlerts = allAlerts.filter((a) => a.severity === "high");
  const warningAlerts = allAlerts.filter((a) => a.severity === "medium");
  const infoAlerts = allAlerts.filter((a) => a.severity === "low");
  const orderedAlerts = [...urgentAlerts, ...warningAlerts, ...infoAlerts];
  const visibleAlerts = orderedAlerts.slice(0, 5);

  const weekReviewQueue = useMemo(() => {
    if (!briefing) return [];
    return briefing.clientSummaries.filter(
      (c) =>
        c.weekReviewNeeded &&
        c.completedWeekNumber != null &&
        c.activeProgramAssignmentId &&
        c.activeProgramId,
    );
  }, [briefing]);

  const recentCheckinQueue = useMemo(() => {
    if (!briefing) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 2);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return briefing.clientSummaries.filter((c) => c.lastCheckinDate && c.lastCheckinDate >= cutoffStr);
  }, [briefing]);

  // Filter and sort client summaries
  const filteredAndSortedClients = briefing?.clientSummaries
    .filter((client) => {
      if (!searchQuery) return true;
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "lastActive":
          const aDate = a.lastWorkoutDate || a.lastCheckinDate || "";
          const bDate = b.lastWorkoutDate || b.lastCheckinDate || "";
          return bDate.localeCompare(aDate);
        case "streak":
          return b.checkinStreak - a.checkinStreak;
        case "compliance":
          const aComp = a.programCompliance ?? 0;
          const bComp = b.programCompliance ?? 0;
          return bComp - aComp;
        case "name":
        default:
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
    }) || [];

  // Format "X days ago" or "Today"
  const formatDaysAgo = (dateStr: string | null): string => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr + "T12:00:00Z");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1d ago";
    return `${diffDays}d ago`;
  };

  // Get stress/soreness color
  const getWellnessColor = (value: number | null): string => {
    if (value == null) return "var(--fc-text-dim)";
    if (value <= 2) return "var(--fc-status-success)";
    if (value <= 3) return "var(--fc-status-warning)";
    return "var(--fc-status-error)";
  };

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 mx-auto w-full max-w-5xl fc-page min-w-0 overflow-x-hidden px-4 sm:px-6">
        {/* ===== HEADER ===== */}
        <AnimatedEntry delay={0} animation="fade-up">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold fc-text-primary">
                {getGreeting()}, {firstName}
              </h1>
              <p className="text-[11px] fc-text-dim font-mono mt-1">{dateStr}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/coach/menu";
                }}
                className="text-xs font-medium fc-text-dim hover:fc-text-primary transition-colors"
              >
                Menu
              </button>
              <div className="w-10 h-10 rounded-full fc-surface-elevated border border-[color:var(--fc-glass-border)] flex items-center justify-center font-bold fc-text-primary text-sm">
                {profile?.first_name?.[0] || user?.email?.[0] || "C"}
              </div>
            </div>
          </header>
        </AnimatedEntry>

        {error && !loading && (
          <div className="fc-surface rounded-2xl p-4 mb-6 border-l-4 border-l-[color:var(--fc-status-error)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm fc-text-error">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                didLoadRef.current = false;
                loadData();
              }}
              className="fc-btn fc-btn-primary fc-press shrink-0"
            >
              Retry
            </button>
          </div>
        )}
        {error && loading && (
          <div className="fc-surface rounded-2xl p-4 mb-6 border-l-4 border-l-[color:var(--fc-status-error)]">
            <p className="text-sm fc-text-error">{error}</p>
          </div>
        )}

        {loading && (
          <div className="space-y-4 mb-8">
            <div className="fc-skeleton rounded-2xl" style={{ height: 100 }} />
            <div className="fc-skeleton rounded-2xl" style={{ height: 180 }} />
            <div className="fc-skeleton rounded-2xl" style={{ height: 200 }} />
          </div>
        )}

        {!loading && briefing && (
          <>
            {/* ===== TODAY'S SNAPSHOT ===== */}
            <AnimatedEntry delay={50} animation="fade-up">
              <section className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest fc-text-dim mb-4">
                  Today's Snapshot
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fc-surface rounded-xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--fc-domain-workouts) 8%, transparent)" }}>
                    <div className="text-2xl font-bold text-cyan-400 tabular-nums">
                      {briefing.clientsTrainedToday} / {briefing.activeClients}
                    </div>
                    <div className="text-xs fc-text-dim mt-0.5 flex items-center justify-center gap-1">
                      <Dumbbell className="w-3 h-3" />
                      Trained Today
                    </div>
                  </div>
                  <div className="fc-surface rounded-xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--fc-domain-meals) 8%, transparent)" }}>
                    <div className="text-2xl font-bold text-cyan-400 tabular-nums">
                      {briefing.clientsCheckedInToday} / {briefing.activeClients}
                    </div>
                    <div className="text-xs fc-text-dim mt-0.5 flex items-center justify-center gap-1">
                      <ClipboardCheck className="w-3 h-3" />
                      Checked In
                    </div>
                  </div>
                  <div className="fc-surface rounded-xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--fc-domain-workouts) 8%, transparent)" }}>
                    <div className="text-2xl font-bold text-cyan-400 tabular-nums">
                      {programCompliance != null ? `${programCompliance}%` : "—"}
                    </div>
                    <div className="text-xs fc-text-dim mt-0.5 flex items-center justify-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      Program Compliance
                    </div>
                  </div>
                  <div className="fc-surface rounded-xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--fc-accent-cyan) 8%, transparent)" }}>
                    <div className="text-2xl font-bold text-cyan-400 tabular-nums">
                      {briefing.activeClients} / {briefing.totalClients}
                    </div>
                    <div className="text-xs fc-text-dim mt-0.5 flex items-center justify-center gap-1">
                      <Users className="w-3 h-3" />
                      Active Clients
                    </div>
                  </div>
                </div>
              </section>
            </AnimatedEntry>

            {/* ===== WEEK REVIEWS ===== */}
            <AnimatedEntry delay={80} animation="fade-up">
              <section className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-widest fc-text-dim mb-3">
                  Week reviews
                </h3>
                {weekReviewQueue.length === 0 ? (
                  <div className="fc-surface rounded-xl p-4 text-center">
                    <p className="text-xs fc-text-dim">No pending week reviews</p>
                  </div>
                ) : (
                  <div className="flex flex-col border-y border-white/5">
                    {weekReviewQueue.map((c) => (
                      <button
                        key={c.clientId}
                        type="button"
                        onClick={() =>
                          setReviewModal({
                            isOpen: true,
                            assignmentId: c.activeProgramAssignmentId!,
                            programId: c.activeProgramId!,
                            weekNumber: c.completedWeekNumber!,
                            clientName: `${c.firstName} ${c.lastName}`.trim() || "Client",
                          })
                        }
                        className="flex w-full items-center gap-3 border-b border-white/5 py-3 pl-2 text-left transition-colors hover:bg-white/[0.02] border-l-[3px] border-l-amber-500"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg fc-surface-elevated fc-text-warning">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium fc-text-primary">
                            {c.firstName} {c.lastName}
                          </div>
                          <p className="text-xs fc-text-dim">Week {c.completedWeekNumber} ready for review</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </AnimatedEntry>

            {/* ===== RECENT CHECK-INS (WELLNESS) ===== */}
            <AnimatedEntry delay={90} animation="fade-up">
              <section className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-widest fc-text-dim mb-3">
                  Recent check-ins
                </h3>
                <p className="text-[11px] fc-text-dim mb-2">Clients with a wellness log in the last ~48 hours</p>
                {recentCheckinQueue.length === 0 ? (
                  <div className="fc-surface rounded-xl p-4 text-center">
                    <p className="text-xs fc-text-dim">No recent wellness check-ins</p>
                  </div>
                ) : (
                  <div className="flex flex-col border-y border-white/5">
                    {recentCheckinQueue.map((c) => (
                      <button
                        key={c.clientId}
                        type="button"
                        onClick={() => {
                          window.location.href = `/coach/clients/${c.clientId}/progress`;
                        }}
                        className="flex w-full items-center gap-3 border-b border-white/5 py-3 pl-2 text-left transition-colors hover:bg-white/[0.02] border-l-[3px] border-l-purple-500"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg fc-surface-elevated text-purple-400">
                          <ClipboardCheck className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium fc-text-primary">
                            {c.firstName} {c.lastName}
                          </div>
                          <p className="text-xs fc-text-dim">Last log {c.lastCheckinDate}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </AnimatedEntry>

            {/* ===== CLIENTS NEEDING ATTENTION (ALERTS) ===== */}
            <AnimatedEntry delay={100} animation="fade-up">
              <section className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-widest fc-text-dim mb-3">
                  Clients needing attention
                </h3>
                {visibleAlerts.length === 0 ? (
                  <div className="fc-surface rounded-xl p-6 text-center">
                    <div className="text-lg mb-2">All clients on track 👍</div>
                    <p className="text-xs fc-text-dim">No alerts at this time</p>
                  </div>
                ) : (
                  <div className="flex flex-col border-y border-white/5">
                    {visibleAlerts.map((alert, idx) => {
                      const getAlertIcon = () => {
                        switch (alert.type) {
                          case "highStress":
                          case "highSoreness":
                            return <AlertCircle className="w-4 h-4" />;
                          case "lowSleep":
                            return <Moon className="w-4 h-4" />;
                          case "noCheckIn3Days":
                            return <ClipboardCheck className="w-4 h-4" />;
                          case "missedWorkouts":
                            return <Dumbbell className="w-4 h-4" />;
                          case "programEnding":
                            return <Calendar className="w-4 h-4" />;
                          case "noProgram":
                            return <Flag className="w-4 h-4" />;
                          case "noMealPlan":
                            return <Utensils className="w-4 h-4" />;
                          case "overdueCheckIn":
                            return <ClipboardCheck className="w-4 h-4" />;
                          case "achievementUnlocked":
                            return <Trophy className="w-4 h-4" />;
                          default:
                            return <AlertTriangle className="w-4 h-4" />;
                        }
                      };

                      const getAlertSeverity = () => {
                        if (["highStress", "highSoreness", "lowSleep"].includes(alert.type)) {
                          return "high";
                        }
                        if (["noCheckIn3Days", "missedWorkouts", "overdueCheckIn"].includes(alert.type)) {
                          return "medium";
                        }
                        return "low";
                      };
                      const severity = getAlertSeverity();
                      const rowAccent =
                        severity === "high"
                          ? "border-l-[color:var(--fc-status-error)] bg-red-500/[0.06] dark:bg-red-500/[0.10]"
                          : severity === "medium"
                            ? "border-l-[color:var(--fc-status-warning)] bg-amber-500/[0.06] dark:bg-amber-500/[0.10]"
                            : "border-l-[color:var(--fc-status-info)] bg-cyan-500/[0.06] dark:bg-cyan-500/[0.10]";
                      const iconColorClass =
                        severity === "high"
                          ? "fc-text-error"
                          : severity === "medium"
                            ? "fc-text-warning"
                            : "fc-text-info";

                      return (
                        <button
                          key={`${alert.clientId}-${idx}`}
                          type="button"
                          onClick={() => {
                            window.location.href = `/coach/clients/${alert.clientId}`;
                          }}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 border-b border-white/5 py-3 pl-2 text-left transition-colors hover:bg-white/[0.02] border-l-[3px]",
                            rowAccent,
                          )}
                        >
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg fc-surface-elevated ${iconColorClass}`}>
                            {getAlertIcon()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium fc-text-primary">{alert.clientName}</div>
                            <p className="text-xs fc-text-dim">{alert.detail}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </AnimatedEntry>

            {/* ===== CLIENT ROSTER ===== */}
            <AnimatedEntry delay={150} animation="fade-up">
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-widest fc-text-dim">
                    Client Roster
                  </h2>
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="text-xs fc-surface rounded-lg px-2 py-1 border border-[color:var(--fc-glass-border)] fc-text-primary"
                    >
                      <option value="name">Name</option>
                      <option value="lastActive">Last Active</option>
                      <option value="streak">Streak</option>
                      <option value="compliance">Compliance</option>
                    </select>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 fc-text-dim" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 fc-surface rounded-xl border border-[color:var(--fc-glass-border)] fc-text-primary text-sm placeholder:fc-text-dim"
                  />
                </div>

                {filteredAndSortedClients.length === 0 ? (
                  <div className="fc-surface rounded-2xl p-8 text-center">
                    <Users className="w-10 h-10 mx-auto mb-3 fc-text-dim opacity-50" />
                    <p className="text-sm font-semibold fc-text-primary mb-1">No clients found</p>
                    <p className="text-xs fc-text-dim">Try adjusting your search</p>
                  </div>
                ) : (
                  <div className="flex flex-col border-y border-white/5">
                    {filteredAndSortedClients.map((client) => {
                      const dashAttention = computeClientAttentionFromSummary(client);
                      const workoutAgo = client.lastWorkoutDate
                        ? formatDaysAgo(client.lastWorkoutDate)
                        : null;
                      const checkinAgo = client.lastCheckinDate
                        ? formatDaysAgo(client.lastCheckinDate)
                        : null;
                      const sameTouchDay =
                        !!client.lastWorkoutDate &&
                        !!client.lastCheckinDate &&
                        client.lastWorkoutDate.slice(0, 10) === client.lastCheckinDate.slice(0, 10);
                      return (
                      <button
                        key={client.clientId}
                        type="button"
                        onClick={() => {
                          window.location.href = `/coach/clients/${client.clientId}`;
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 border-b border-white/5 py-3 pl-2 text-left outline-none transition-colors hover:bg-white/[0.02] focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent-cyan)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--fc-bg-deep)] sm:gap-4",
                          attentionListRowClass(dashAttention.level),
                        )}
                      >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm fc-text-primary flex-shrink-0"
                            style={{
                              background: "color-mix(in srgb, var(--fc-accent-cyan) 15%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--fc-accent-cyan) 25%, transparent)",
                            }}
                          >
                            {client.firstName?.[0] || "C"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-bold fc-text-primary leading-tight">
                                {client.firstName} {client.lastName}
                              </h4>
                              {/* Status indicators */}
                              <div className="flex items-center gap-1">
                                {client.trainedToday && (
                                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--fc-status-success)" }} title="Trained today" />
                                )}
                                {client.checkedInToday && (
                                  <div className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400" title="Checked in today" />
                                )}
                              </div>
                            </div>
                            {dashAttention.reasons.length > 0 && (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                                {dashAttention.level === "urgent" && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                                    Urgent
                                  </span>
                                )}
                                {dashAttention.level === "warning" && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                    Review
                                  </span>
                                )}
                                <span className="text-[10px] fc-text-dim leading-tight truncate">
                                  {dashAttention.reasons.slice(0, 2).join(" · ")}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-3 text-xs fc-text-dim flex-wrap">
                              {client.checkinStreak > 0 && (
                                <span className="flex items-center gap-1">
                                  <Flame className="w-3 h-3" />
                                  {client.checkinStreak}
                                </span>
                              )}
                              {sameTouchDay && workoutAgo ? (
                                <span>Last activity: {workoutAgo}</span>
                              ) : (
                                <>
                                  {client.lastWorkoutDate && (
                                    <span>Workout: {workoutAgo}</span>
                                  )}
                                  {client.lastCheckinDate && (
                                    <span>Check-in: {checkinAgo}</span>
                                  )}
                                </>
                              )}
                              {/* Wellness indicators */}
                              {client.latestStress != null && (
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ background: getWellnessColor(client.latestStress) }}
                                  title={`Stress: ${client.latestStress}/5`}
                                />
                              )}
                              {client.latestSoreness != null && (
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ background: getWellnessColor(client.latestSoreness) }}
                                  title={`Soreness: ${client.latestSoreness}/5`}
                                />
                              )}
                            </div>
                          </div>
                          <ChevronRight className="hidden h-4 w-4 shrink-0 text-cyan-400 sm:block" />
                      </button>
                    );
                    })}
                  </div>
                )}
              </section>
            </AnimatedEntry>

            {/* ===== QUICK ACTIONS ===== */}
            <AnimatedEntry delay={200} animation="fade-up">
              <section className="mb-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/coach/clients";
                    }}
                    className="fc-btn fc-btn-secondary fc-press h-11 px-4 text-sm inline-flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    View Clients
                  </button>
                </div>
              </section>
            </AnimatedEntry>
          </>
        )}
      </div>

      <WeekReviewModal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
        onComplete={() => {
          didLoadRef.current = false;
          refetchDashboard();
        }}
        programAssignmentId={reviewModal.assignmentId}
        programId={reviewModal.programId}
        weekNumber={reviewModal.weekNumber}
        clientName={reviewModal.clientName}
      />
    </AnimatedBackground>
  );
}

export default function CoachDashboard() {
  return (
    <ProtectedRoute requiredRole="coach">
      <CoachDashboardContent />
    </ProtectedRoute>
  );
}
