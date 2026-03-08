"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { AnimatedEntry } from "@/components/ui/AnimatedEntry";
import Link from "next/link";
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
} from "lucide-react";
import { type MorningBriefing, type ClientAlert, sortAlertsByPriority } from "@/lib/coachDashboardService";

function CoachDashboardContent() {
  const { user, profile } = useAuth();
  const { performanceSettings } = useTheme();

  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [programCompliance, setProgramCompliance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "lastActive" | "streak" | "compliance">("name");
  const loadingRef = useRef(false);
  const didLoadRef = useRef(false);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (!user) return;
    if (didLoadRef.current) return;
    if (loadingRef.current) return;
    didLoadRef.current = true;
    loadingRef.current = true;
    try {
      setLoading(true);
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
      loadingRef.current = false;
    }
  }, [user]);

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
      ...alerts.programEnding,
      ...alerts.noProgram,
      ...alerts.noMealPlan,
    ];
    // Sort by severity (high → medium → low)
    return sortAlertsByPriority(allAlerts);
  };

  const allAlerts = getAllAlerts();
  const visibleAlerts = allAlerts.slice(0, 5);
  const hasMoreAlerts = allAlerts.length > 5;

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
              <Link
                href="/coach/menu"
                className="text-xs font-medium fc-text-dim hover:fc-text-primary transition-colors"
              >
                Menu
              </Link>
              <div className="w-10 h-10 rounded-full fc-surface-elevated border border-[color:var(--fc-glass-border)] flex items-center justify-center font-bold fc-text-primary text-sm">
                {profile?.first_name?.[0] || user?.email?.[0] || "C"}
              </div>
            </div>
          </header>
        </AnimatedEntry>

        {error && (
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
                    <div className="text-2xl font-bold fc-text-primary">
                      {briefing.clientsTrainedToday} / {briefing.activeClients}
                    </div>
                    <div className="text-xs fc-text-dim mt-0.5 flex items-center justify-center gap-1">
                      <Dumbbell className="w-3 h-3" />
                      Trained Today
                    </div>
                  </div>
                  <div className="fc-surface rounded-xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--fc-domain-meals) 8%, transparent)" }}>
                    <div className="text-2xl font-bold fc-text-primary">
                      {briefing.clientsCheckedInToday} / {briefing.activeClients}
                    </div>
                    <div className="text-xs fc-text-dim mt-0.5 flex items-center justify-center gap-1">
                      <ClipboardCheck className="w-3 h-3" />
                      Checked In
                    </div>
                  </div>
                  <div className="fc-surface rounded-xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--fc-domain-workouts) 8%, transparent)" }}>
                    <div className="text-2xl font-bold fc-text-primary">
                      {programCompliance != null ? `${programCompliance}%` : "—"}
                    </div>
                    <div className="text-xs fc-text-dim mt-0.5 flex items-center justify-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      Program Compliance
                    </div>
                  </div>
                  <div className="fc-surface rounded-xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--fc-accent-cyan) 8%, transparent)" }}>
                    <div className="text-2xl font-bold fc-text-primary">
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

            {/* ===== ATTENTION REQUIRED ===== */}
            <AnimatedEntry delay={100} animation="fade-up">
              <section className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-widest fc-text-dim mb-3">
                  Attention Required
                </h3>
                {visibleAlerts.length === 0 ? (
                  <div className="fc-surface rounded-xl p-6 text-center">
                    <div className="text-lg mb-2">All clients on track 👍</div>
                    <p className="text-xs fc-text-dim">No alerts at this time</p>
                  </div>
                ) : (
                  <div className="space-y-2">
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
                          default:
                            return <AlertTriangle className="w-4 h-4" />;
                        }
                      };

                      const getAlertColor = () => {
                        if (["highStress", "highSoreness", "lowSleep"].includes(alert.type)) {
                          return "var(--fc-status-error)";
                        }
                        if (["noCheckIn3Days", "missedWorkouts"].includes(alert.type)) {
                          return "var(--fc-status-warning)";
                        }
                        return "var(--fc-accent-cyan)";
                      };

                      return (
                        <Link key={`${alert.clientId}-${idx}`} href={`/coach/clients/${alert.clientId}`}>
                          <div
                            className="fc-surface rounded-xl p-4 flex items-center gap-3 transition-all hover:translate-y-[-1px] cursor-pointer"
                            style={{ borderLeft: `4px solid ${getAlertColor()}` }}
                          >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center fc-surface-elevated" style={{ color: getAlertColor() }}>
                              {getAlertIcon()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium fc-text-primary">{alert.clientName}</div>
                              <p className="text-xs fc-text-dim">{alert.detail}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 fc-text-subtle flex-shrink-0" />
                          </div>
                        </Link>
                      );
                    })}
                    {hasMoreAlerts && (
                      <Link href="/coach/clients" className="block text-center text-xs fc-text-dim hover:fc-text-primary transition-colors mt-2">
                        See all {allAlerts.length} alerts →
                      </Link>
                    )}
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
                  <div className="space-y-2">
                    {filteredAndSortedClients.map((client) => (
                      <Link key={client.clientId} href={`/coach/clients/${client.clientId}`}>
                        <div className="fc-surface rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.98] cursor-pointer">
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
                                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--fc-accent-cyan)" }} title="Checked in today" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs fc-text-dim">
                              {client.checkinStreak > 0 && (
                                <span className="flex items-center gap-1">
                                  <Flame className="w-3 h-3" />
                                  {client.checkinStreak}
                                </span>
                              )}
                              {client.lastWorkoutDate && (
                                <span>Last workout: {formatDaysAgo(client.lastWorkoutDate)}</span>
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
                          <ChevronRight className="w-4 h-4 fc-text-subtle flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </AnimatedEntry>

            {/* ===== QUICK ACTIONS ===== */}
            <AnimatedEntry delay={200} animation="fade-up">
              <section className="mb-4">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/coach/clients"
                    className="fc-btn fc-btn-secondary fc-press h-10 px-4 text-sm inline-flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    View Clients
                  </Link>
                </div>
              </section>
            </AnimatedEntry>
          </>
        )}
      </div>
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
