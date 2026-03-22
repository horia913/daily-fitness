"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Grid3x3, List, UserPlus, Users, Flame, Dumbbell, ClipboardCheck, Clock, CreditCard } from "lucide-react";
import Link from "next/link";
import { type ClientMetrics } from "@/lib/coachDashboardService";
import { WeekReviewModal } from "@/components/coach/WeekReviewModal";
import {
  computeClientAttention,
  attentionCardSurfaceStyle,
  attentionPriority,
} from "@/lib/coachClientAttention";
import { dbToUiScale } from "@/lib/wellnessService";
import { withTimeout } from "@/lib/withTimeout";
interface Client {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: "active" | "inactive" | "pending" | "at-risk";
  metrics: ClientMetrics;
}

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "active" | "inactive" | "pending";
type SortOption = "name" | "lastActive" | "streak" | "workouts" | "needsAttention";
type QuickFilter = "all" | "needsAttention" | "trainedToday" | "checkedInToday";

function getAttention(client: Client) {
  return computeClientAttention(client.status, client.metrics);
}

function ClientManagementContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [clients, setClients] = useState<Client[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("lastActive");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const loadingRef = useRef(false);
  const didLoadRef = useRef(false);
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    assignmentId: string;
    programId: string;
    weekNumber: number;
    clientName: string;
  }>({ isOpen: false, assignmentId: '', programId: '', weekNumber: 0, clientName: '' });

  const loadClients = useCallback(async (signal?: AbortSignal) => {
    if (!user) return;
    if (didLoadRef.current) return;
    if (loadingRef.current) return;
    didLoadRef.current = true;
    loadingRef.current = true;
    try {
      setLoading(true);
      setLoadError(null);
      setLoadingStartedAt(Date.now());
      const res = await withTimeout(
        fetch("/api/coach/clients", { signal: signal ?? null }),
        25_000,
        "timeout"
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const { clients: list } = await res.json();
      setClients(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        didLoadRef.current = false;
        return;
      }
      console.error("Error loading clients:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load clients");
      didLoadRef.current = false;
    } finally {
      setLoading(false);
      setLoadingStartedAt(null);
      loadingRef.current = false;
    }
  }, [user]);

  const refetchClients = useCallback(() => {
    didLoadRef.current = false;
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (!user) return;
    const ac = new AbortController();
    loadClients(ac.signal);
    return () => {
      didLoadRef.current = false;
      loadingRef.current = false;
      ac.abort();
    };
  }, [user, loadClients]);

  // Format relative time (e.g., "Today", "3d ago", "2w ago")
  const formatRelativeTime = (dateStr: string | null): { text: string; color: string } => {
    if (!dateStr) {
      return { text: "Never", color: "var(--fc-status-error)" };
    }
    
    const date = new Date(dateStr + "T12:00:00Z");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return { text: "Today", color: "var(--fc-status-success)" };
    }
    if (diffDays === 1) {
      return { text: "Yesterday", color: "var(--fc-status-success)" };
    }
    if (diffDays < 3) {
      return { text: `${diffDays}d ago`, color: "var(--fc-status-success)" };
    }
    if (diffDays < 6) {
      return { text: `${diffDays}d ago`, color: "var(--fc-status-warning)" };
    }
    if (diffDays < 14) {
      return { text: `${diffDays}d ago`, color: "var(--fc-status-error)" };
    }
    const weeks = Math.floor(diffDays / 7);
    return { text: `${weeks}w ago`, color: "var(--fc-status-error)" };
  };

  // Get wellness color for stress/soreness
  const getWellnessColor = (value: number | null): string => {
    if (value == null) return "var(--fc-text-dim)";
    if (value <= 2) return "var(--fc-status-success)";
    if (value <= 3) return "var(--fc-status-warning)";
    return "var(--fc-status-error)";
  };

  /** Program callouts: only non-default states (hide redundant "Active" next to program name). */
  const getProgramStatus = (
    status: ClientMetrics["programStatus"],
    _endDate: string | null
  ): { label: string | null; color: string } => {
    switch (status) {
      case "active":
        return { label: null, color: "var(--fc-status-success)" };
      case "endingSoon":
        return { label: "Ending Soon", color: "var(--fc-status-warning)" };
      case "noProgram":
        return { label: "No Program", color: "var(--fc-text-dim)" };
    }
  };

  const needsAttention = (client: Client): boolean => {
    const { level } = getAttention(client);
    return level === "urgent" || level === "warning" || level === "inactive";
  };

  const filteredClients = clients
    .filter((client) => {
      // Search filter
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus =
        statusFilter === "all" || client.status === statusFilter;
      
      // Quick filter
      let matchesQuickFilter = true;
      if (quickFilter === "needsAttention") {
        matchesQuickFilter = needsAttention(client);
      } else if (quickFilter === "trainedToday") {
        matchesQuickFilter = client.metrics.trainedToday;
      } else if (quickFilter === "checkedInToday") {
        matchesQuickFilter = client.metrics.checkedInToday;
      }
      
      return matchesSearch && matchesStatus && matchesQuickFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "lastActive":
          const aDate = a.metrics.lastActive || "";
          const bDate = b.metrics.lastActive || "";
          return bDate.localeCompare(aDate);
        case "streak":
          return b.metrics.checkinStreak - a.metrics.checkinStreak;
        case "workouts":
          return b.metrics.workoutsThisWeek - a.metrics.workoutsThisWeek;
        case "needsAttention":
          const aNeeds = needsAttention(a);
          const bNeeds = needsAttention(b);
          if (aNeeds !== bNeeds) return aNeeds ? -1 : 1;
          // Secondary sort by last active
          const aDate2 = a.metrics.lastActive || "";
          const bDate2 = b.metrics.lastActive || "";
          return bDate2.localeCompare(aDate2);
        default:
          return 0;
      }
    });

  const activeCount = clients.filter((c) => c.status === "active").length;
  const inactiveCount = clients.filter((c) => c.status === "inactive").length;
  const pendingCount = clients.filter((c) => c.status === "pending").length;

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 mx-auto w-full max-w-7xl fc-page pb-32">
        {/* Sticky header: title, count, search, filters */}
        <header className="sticky top-0 z-40 fc-glass border-b border-[color:var(--fc-glass-border)] backdrop-blur-md">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold fc-text-primary">Clients</h1>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs fc-text-dim uppercase tracking-widest">
                    Active: {activeCount}
                  </span>
                  <Link href="/coach/clients/add">
                    <Button size="sm" variant="fc-primary" className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Add
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 fc-text-dim pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 fc-glass border border-[color:var(--fc-glass-border)] rounded-2xl pl-12 pr-4 fc-text-primary placeholder:fc-text-dim focus:ring-2 focus:ring-[color:var(--fc-domain-workouts)]/50"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {(["all", "active", "pending", "inactive"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      className={statusFilter === filter
                        ? "px-5 py-2 rounded-full font-medium bg-[color:var(--fc-accent-cyan)] text-white border border-[color:var(--fc-accent-cyan)] whitespace-nowrap"
                        : "px-5 py-2 rounded-full font-medium fc-glass border border-[color:var(--fc-glass-border)] fc-text-dim hover:fc-text-primary whitespace-nowrap"
                      }
                    >
                      {filter === "all" ? "All Clients" : filter === "active" ? "Active" : filter === "pending" ? "Pending" : "Inactive"}
                      {filter === "all" && ` (${clients.length})`}
                      {filter === "active" && ` (${activeCount})`}
                      {filter === "pending" && ` (${pendingCount})`}
                      {filter === "inactive" && ` (${inactiveCount})`}
                    </button>
                  ))}
                  {/* Quick filters */}
                  {(["needsAttention", "trainedToday", "checkedInToday"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setQuickFilter(quickFilter === filter ? "all" : filter)}
                      className={quickFilter === filter
                        ? "px-5 py-2 rounded-full font-medium bg-[color:var(--fc-accent-cyan)] text-white border border-[color:var(--fc-accent-cyan)] whitespace-nowrap"
                        : "px-5 py-2 rounded-full font-medium fc-glass border border-[color:var(--fc-glass-border)] fc-text-dim hover:fc-text-primary whitespace-nowrap"
                      }
                    >
                      {filter === "needsAttention" ? "Needs Attention" : filter === "trainedToday" ? "Trained Today" : "Checked In Today"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="text-xs fc-glass rounded-lg px-3 py-2 border border-[color:var(--fc-glass-border)] fc-text-primary bg-transparent"
                  >
                    <option value="lastActive">Last Active</option>
                    <option value="name">Name</option>
                    <option value="streak">Check-in Streak</option>
                    <option value="workouts">Workouts This Week</option>
                    <option value="needsAttention">Needs Attention</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-full border ${
                      viewMode === "grid"
                        ? "bg-[color:var(--fc-accent-cyan)] text-white border-[color:var(--fc-accent-cyan)]"
                        : "fc-glass border-[color:var(--fc-glass-border)] fc-text-dim hover:fc-text-primary"
                    }`}
                    aria-label="Grid view"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-full border ${
                      viewMode === "list"
                        ? "bg-[color:var(--fc-accent-cyan)] text-white border-[color:var(--fc-accent-cyan)]"
                        : "fc-glass border-[color:var(--fc-glass-border)] fc-text-dim hover:fc-text-primary"
                    }`}
                    aria-label="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6">
          {loadError && !loading ? (
            <GlassCard elevation={2} className="fc-glass fc-card p-8 text-center">
              <p className="text-sm fc-text-error mb-4">{loadError}</p>
              <Button
                className="fc-btn fc-btn-primary"
                onClick={() => {
                  setLoadError(null);
                  didLoadRef.current = false;
                  loadClients();
                }}
              >
                Retry
              </Button>
            </GlassCard>
          ) : loading ? (
            <div className="space-y-4">
              <div className="fc-skeleton rounded-2xl" style={{ height: 200 }} />
              <div className="fc-skeleton rounded-2xl" style={{ height: 200 }} />
            </div>
          ) : filteredClients.length === 0 ? (
            <GlassCard elevation={2} className="fc-glass fc-card p-12 text-center">
              <Users className="w-24 h-24 mx-auto mb-6 text-[color:var(--fc-text-subtle)]" />
              <h3 className="text-2xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
                {searchQuery || statusFilter !== "all" || quickFilter !== "all"
                  ? "No clients found"
                  : "Build your coaching roster"}
              </h3>
              <p className="text-sm mb-6 text-[color:var(--fc-text-dim)]">
                {searchQuery || statusFilter !== "all" || quickFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Start by adding your first client to begin tracking their progress"}
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link href="/coach/clients/add">
                  <Button className="fc-btn fc-btn-primary">
                    <UserPlus className="w-5 h-5 mr-2" />
                    Add Your First Client
                  </Button>
                </Link>
                {(searchQuery || statusFilter !== "all" || quickFilter !== "all") && (
                  <Button
                    variant="ghost"
                    className="fc-btn fc-btn-ghost"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setQuickFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </GlassCard>
          ) : viewMode === "grid" ? (
            // Grid View — each card links to Client Hub
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredClients.map((client) => {
                const relative = formatRelativeTime(client.metrics.lastActive);
                const programStatus = getProgramStatus(client.metrics.programStatus, client.metrics.programEndDate);
                const attention = getAttention(client);
                const isInactiveOrPending = client.status === "inactive" || client.status === "pending";
                const checkinRel = formatRelativeTime(client.metrics.lastCheckinDate);
                const sameActivityAndCheckin =
                  !!client.metrics.lastActive &&
                  !!client.metrics.lastCheckinDate &&
                  client.metrics.lastActive.slice(0, 10) === client.metrics.lastCheckinDate.slice(0, 10);
                const weekLabel =
                  client.metrics.programCurrentWeek != null && client.metrics.programDurationWeeks != null
                    ? `Week ${client.metrics.programCurrentWeek} of ${client.metrics.programDurationWeeks}`
                    : null;
                const displayAttentionReasons =
                  sameActivityAndCheckin
                    ? attention.reasons.filter((r) => !r.startsWith("Check-in "))
                    : attention.reasons;
                return (
                  <Link
                    key={client.id}
                    href={`/coach/clients/${client.id}`}
                    className="group block w-full max-w-full rounded-2xl border-0 outline-none text-inherit no-underline focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent-cyan)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--fc-bg-deep)]"
                  >
                    <GlassCard
                      elevation={2}
                      className={`fc-card overflow-hidden transition-all hover:scale-102 hover:shadow-2xl cursor-pointer rounded-2xl ${isInactiveOrPending ? "opacity-90" : ""}`}
                      borderColor="var(--fc-surface-card-border)"
                      surfaceStyle={attentionCardSurfaceStyle(attention.level)}
                    >
                      <div className="p-6">
                        <div className="flex items-start mb-3">
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
                              style={{
                                background: getSemanticColor("trust").gradient,
                                color: "#fff",
                              }}
                            >
                              {client.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-[color:var(--fc-text-primary)] truncate">
                                {client.name}
                              </h3>
                              <p className="text-sm text-[color:var(--fc-text-dim)] truncate">
                                {client.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        {displayAttentionReasons.length > 0 && (
                          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                            {attention.level === "urgent" && (
                              <span
                                className="shrink-0 font-semibold leading-none"
                                style={{
                                  fontSize: 11,
                                  padding: "3px 9px",
                                  borderRadius: 9999,
                                  backgroundColor: "color-mix(in srgb, var(--fc-status-error) 24%, transparent)",
                                  color: "var(--fc-status-error)",
                                }}
                              >
                                Urgent
                              </span>
                            )}
                            {attention.level === "warning" && (
                              <span
                                className="shrink-0 font-semibold leading-none"
                                style={{
                                  fontSize: 11,
                                  padding: "3px 9px",
                                  borderRadius: 9999,
                                  backgroundColor: "color-mix(in srgb, var(--fc-status-warning) 26%, transparent)",
                                  color: "var(--fc-status-warning)",
                                }}
                              >
                                Review
                              </span>
                            )}
                            {attention.level === "inactive" && displayAttentionReasons.length > 0 && (
                              <span
                                className="shrink-0 font-semibold leading-none fc-text-subtle"
                                style={{
                                  fontSize: 11,
                                  padding: "3px 9px",
                                  borderRadius: 9999,
                                  backgroundColor: "var(--fc-glass-highlight)",
                                }}
                              >
                                {client.status === "pending" ? "Pending" : "Inactive"}
                              </span>
                            )}
                            <p className="text-[11px] text-[color:var(--fc-text-dim)] leading-snug min-w-0 flex-1">
                              {displayAttentionReasons.slice(0, 2).join(" · ")}
                            </p>
                          </div>
                        )}

                        {client.metrics.weekReviewNeeded && client.metrics.completedWeekNumber != null && (
                          <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 truncate">
                                  Week {client.metrics.completedWeekNumber} review needed
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setReviewModal({
                                    isOpen: true,
                                    assignmentId: client.metrics.activeProgramAssignmentId ?? '',
                                    programId: client.metrics.activeProgramId ?? '',
                                    weekNumber: client.metrics.completedWeekNumber!,
                                    clientName: client.name,
                                  });
                                }}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 transition-colors shrink-0"
                              >
                                Review
                              </button>
                            </div>
                          </div>
                        )}

                        {sameActivityAndCheckin ? (
                          <div className="mb-3 text-xs">
                            <div className="text-sm font-medium" style={{ color: relative.color }}>
                              {relative.text}
                            </div>
                            <div className="fc-text-dim">Last activity & check-in</div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                            <div>
                              <div className="text-sm font-medium" style={{ color: relative.color }}>
                                {relative.text}
                              </div>
                              <div className="fc-text-dim">Last activity</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium" style={{ color: checkinRel.color }}>
                                {checkinRel.text}
                              </div>
                              <div className="fc-text-dim">Last check-in</div>
                            </div>
                          </div>
                        )}

                        {client.metrics.activeProgramName && (
                          <p className="text-xs text-cyan-400/70 font-medium mb-1 truncate" title={client.metrics.activeProgramName}>
                            {client.metrics.activeProgramName}
                            {weekLabel ? ` · ${weekLabel}` : ""}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2 mb-3 text-xs flex-wrap">
                          <div className="flex items-center gap-1">
                            <Dumbbell className="w-3 h-3 fc-text-dim" />
                            <span className="text-cyan-400 font-bold tabular-nums">{client.metrics.workoutsThisWeek}</span>
                            <span className="fc-text-dim">this week</span>
                          </div>
                          {client.metrics.mealCompliance7dPct != null && (
                            <span className="fc-text-dim">
                              Meals: <span className="text-cyan-400 font-bold tabular-nums">{client.metrics.mealCompliance7dPct}%</span> (7d)
                            </span>
                          )}
                          {client.metrics.checkinStreak > 0 && (
                            <div className="flex items-center gap-1">
                              <Flame className="w-3 h-3" style={{ color: "var(--fc-status-warning)" }} />
                              <span className="text-cyan-400 font-bold tabular-nums">{client.metrics.checkinStreak}</span>
                            </div>
                          )}
                          {client.metrics.subscriptionExpiringSoon && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold">
                              <CreditCard className="w-3 h-3" />
                              Sub ending
                            </span>
                          )}
                          {programStatus.label != null && (
                            <div className="text-xs" style={{ color: programStatus.color }}>
                              {programStatus.label}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {client.metrics.latestStress != null ? (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ background: getWellnessColor(client.metrics.latestStress) }}
                                title={`Stress: ${client.metrics.latestStress}/5`}
                              />
                            ) : (
                              <div className="w-2 h-2 rounded-full fc-text-dim opacity-30" />
                            )}
                            {client.metrics.latestSoreness != null ? (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ background: getWellnessColor(client.metrics.latestSoreness) }}
                                title={`Soreness: ${client.metrics.latestSoreness}/5`}
                              />
                            ) : (
                              <div className="w-2 h-2 rounded-full fc-text-dim opacity-30" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-cyan-400">View client →</span>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                );
              })}
            </div>
          ) : (
            // List View — each row links to Client Hub
            <GlassCard elevation={2} className="fc-glass fc-card p-6">
              <div className="space-y-2">
                {filteredClients.map((client) => {
                  const relative = formatRelativeTime(client.metrics.lastActive);
                  const checkinRel = formatRelativeTime(client.metrics.lastCheckinDate);
                  const sameActivityAndCheckin =
                    !!client.metrics.lastActive &&
                    !!client.metrics.lastCheckinDate &&
                    client.metrics.lastActive.slice(0, 10) === client.metrics.lastCheckinDate.slice(0, 10);
                  const programStatus = getProgramStatus(client.metrics.programStatus, client.metrics.programEndDate);
                  const attention = getAttention(client);
                  const isInactiveOrPending = client.status === "inactive" || client.status === "pending";
                  const displayAttentionReasons =
                    sameActivityAndCheckin
                      ? attention.reasons.filter((r) => !r.startsWith("Check-in "))
                      : attention.reasons;
                  return (
                    <Link
                      key={client.id}
                      href={`/coach/clients/${client.id}`}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.01] cursor-pointer w-full border-0 outline-none backdrop-blur-md focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent-cyan)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--fc-bg-deep)] ${isInactiveOrPending ? "opacity-90" : ""}`}
                      style={attentionCardSurfaceStyle(attention.level)}
                    >
                      {/* Avatar */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                        style={{
                          background: getSemanticColor("trust").gradient,
                          color: "#fff",
                        }}
                      >
                        {client.name.charAt(0)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate text-[color:var(--fc-text-primary)]">
                            {client.name}
                          </h4>
                        </div>
                        {displayAttentionReasons.length > 0 && (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                            {attention.level === "urgent" && (
                              <span
                                className="shrink-0 font-semibold leading-none"
                                style={{
                                  fontSize: 10,
                                  padding: "2px 8px",
                                  borderRadius: 9999,
                                  backgroundColor: "color-mix(in srgb, var(--fc-status-error) 24%, transparent)",
                                  color: "var(--fc-status-error)",
                                }}
                              >
                                Urgent
                              </span>
                            )}
                            {attention.level === "warning" && (
                              <span
                                className="shrink-0 font-semibold leading-none"
                                style={{
                                  fontSize: 10,
                                  padding: "2px 8px",
                                  borderRadius: 9999,
                                  backgroundColor: "color-mix(in srgb, var(--fc-status-warning) 26%, transparent)",
                                  color: "var(--fc-status-warning)",
                                }}
                              >
                                Review
                              </span>
                            )}
                            <span className="text-[10px] text-[color:var(--fc-text-dim)] leading-tight truncate min-w-0">
                              {displayAttentionReasons.slice(0, 2).join(" · ")}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs fc-text-dim flex-wrap">
                          {sameActivityAndCheckin ? (
                            <span style={{ color: relative.color }}>{relative.text} · activity & check-in</span>
                          ) : (
                            <>
                              <span style={{ color: relative.color }}>Activity {relative.text}</span>
                              <span style={{ color: checkinRel.color }}>Check-in {checkinRel.text}</span>
                            </>
                          )}
                          <span className="flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" />
                            <span className="text-cyan-400 font-bold tabular-nums">{client.metrics.workoutsThisWeek}</span>
                            <span className="fc-text-dim">this week</span>
                          </span>
                          {client.metrics.checkinStreak > 0 && (
                            <span className="flex items-center gap-1">
                              <Flame className="w-3 h-3" style={{ color: "var(--fc-status-warning)" }} />
                              {client.metrics.checkinStreak}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side: Program status and wellness */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {client.metrics.subscriptionExpiringSoon && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            title="Membership ending soon"
                          >
                            <CreditCard className="w-3 h-3" />
                            Sub
                          </span>
                        )}
                        {programStatus.label != null && (
                          <div className="text-xs text-right" style={{ color: programStatus.color }}>
                            {programStatus.label}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          {client.metrics.latestStress != null ? (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: getWellnessColor(client.metrics.latestStress) }}
                              title={`Stress: ${client.metrics.latestStress}/5`}
                            />
                          ) : (
                            <div className="w-2 h-2 rounded-full fc-text-dim opacity-30" />
                          )}
                          {client.metrics.latestSoreness != null ? (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: getWellnessColor(client.metrics.latestSoreness) }}
                              title={`Soreness: ${client.metrics.latestSoreness}/5`}
                            />
                          ) : (
                            <div className="w-2 h-2 rounded-full fc-text-dim opacity-30" />
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </main>
      </div>

      <WeekReviewModal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
        onComplete={() => {
          didLoadRef.current = false;
          loadingRef.current = false;
          loadClients();
        }}
        programAssignmentId={reviewModal.assignmentId}
        programId={reviewModal.programId}
        weekNumber={reviewModal.weekNumber}
        clientName={reviewModal.clientName}
      />
    </AnimatedBackground>
  );
}

export default function ClientManagement() {
  return (
    <ProtectedRoute requiredRole="coach">
      <ClientManagementContent />
    </ProtectedRoute>
  );
}
