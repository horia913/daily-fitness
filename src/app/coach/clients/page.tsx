"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Grid3x3, List, UserPlus, Users, Flame, Dumbbell, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";
import { type ClientMetrics } from "@/lib/coachDashboardService";
import {
  computeClientAttention,
  attentionCardSurfaceStyle,
  attentionListRowClass,
  attentionPriority,
} from "@/lib/coachClientAttention";
import { cn } from "@/lib/utils";
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

const AVATAR_CLASS =
  "flex shrink-0 items-center justify-center rounded-full border border-[color:var(--fc-glass-border)] bg-[color-mix(in_srgb,var(--fc-accent)_14%,transparent)] font-bold text-[color:var(--fc-accent)]";

const pillSelected =
  "shrink-0 rounded-full border border-[color-mix(in_srgb,var(--fc-accent-cyan)_42%,transparent)] bg-[color-mix(in_srgb,var(--fc-accent-cyan)_10%,transparent)] px-3 py-1.5 text-xs font-medium text-[color:var(--fc-accent-cyan)] shadow-none sm:px-4 sm:py-2 sm:text-sm";

const pillIdle =
  "shrink-0 rounded-full border border-[color:var(--fc-glass-border)] bg-transparent px-3 py-1.5 text-xs font-medium fc-text-dim transition-colors hover:bg-[color:var(--fc-glass-highlight)] hover:fc-text-primary sm:px-4 sm:py-2 sm:text-sm";

function ClientManagementContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

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

      <CoachPageShell widthVariant="data-7xl" className="pb-32">
        {/* Sticky header: title, count, search, filters */}
        <header className="sticky top-0 z-40 border-b border-[color:var(--fc-glass-border)] bg-[color-mix(in_srgb,var(--fc-surface-card)_92%,transparent)] backdrop-blur-md">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl font-bold tracking-tight text-[color:var(--fc-text-primary)] sm:text-2xl">
                  Clients
                </h1>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="inline-flex shrink-0 items-center rounded-full border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--fc-text-dim)]">
                    <span className="font-semibold tabular-nums text-[color:var(--fc-text-primary)]">{activeCount}</span>
                    <span className="ml-1">active</span>
                  </span>
                  <Link href="/coach/clients/add">
                    <Button size="sm" variant="fc-primary" className="fc-btn fc-btn-primary gap-1.5 px-3 sm:gap-2 sm:px-4">
                      <UserPlus className="h-4 w-4" />
                      Add
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 fc-text-dim" />
                <Input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="fc-input h-11 w-full rounded-2xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] pl-12 pr-4 text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-dim)] focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent)]/35"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--fc-text-dim)]">
                    Status
                  </p>
                  <div className="flex w-full min-w-0 flex-wrap content-start gap-2">
                    {(["all", "active", "pending", "inactive"] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setStatusFilter(filter)}
                        className={cn(
                          "whitespace-nowrap",
                          statusFilter === filter ? pillSelected : pillIdle,
                        )}
                      >
                        {filter === "all" ? "All" : filter === "active" ? "Active" : filter === "pending" ? "Pending" : "Inactive"}
                        {filter === "all" && ` (${clients.length})`}
                        {filter === "active" && ` (${activeCount})`}
                        {filter === "pending" && ` (${pendingCount})`}
                        {filter === "inactive" && ` (${inactiveCount})`}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--fc-text-dim)]">
                    Quick
                  </p>
                  <div className="flex w-full min-w-0 flex-wrap content-start gap-2">
                    {(["needsAttention", "trainedToday", "checkedInToday"] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setQuickFilter(quickFilter === filter ? "all" : filter)}
                        className={cn(
                          "whitespace-nowrap",
                          quickFilter === filter ? pillSelected : pillIdle,
                        )}
                      >
                        {filter === "needsAttention"
                          ? "Needs attention"
                          : filter === "trainedToday"
                            ? "Trained today"
                            : "Checked in today"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex w-full shrink-0 items-center justify-between gap-2 border-t border-[color:var(--fc-glass-border)] pt-3 sm:w-auto sm:border-t-0 sm:pt-0">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="fc-input min-h-[44px] min-w-0 max-w-[min(100%,14rem)] flex-1 rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] px-3 py-2 text-xs text-[color:var(--fc-text-primary)] sm:min-w-[10.5rem] sm:flex-none sm:max-w-none"
                  >
                    <option value="lastActive">Last Active</option>
                    <option value="name">Name</option>
                    <option value="streak">Check-in Streak</option>
                    <option value="workouts">Workouts This Week</option>
                    <option value="needsAttention">Needs Attention</option>
                  </select>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "min-h-[44px] min-w-[44px] rounded-xl border p-2 transition-colors",
                        viewMode === "grid"
                          ? "border-[color-mix(in_srgb,var(--fc-accent-cyan)_42%,transparent)] bg-[color-mix(in_srgb,var(--fc-accent-cyan)_12%,transparent)] text-[color:var(--fc-accent-cyan)]"
                          : "border-[color:var(--fc-glass-border)] bg-transparent fc-text-dim hover:bg-[color:var(--fc-glass-highlight)] hover:fc-text-primary",
                      )}
                      aria-label="Grid view"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "min-h-[44px] min-w-[44px] rounded-xl border p-2 transition-colors",
                        viewMode === "list"
                          ? "border-[color-mix(in_srgb,var(--fc-accent-cyan)_42%,transparent)] bg-[color-mix(in_srgb,var(--fc-accent-cyan)_12%,transparent)] text-[color:var(--fc-accent-cyan)]"
                          : "border-[color:var(--fc-glass-border)] bg-transparent fc-text-dim hover:bg-[color:var(--fc-glass-highlight)] hover:fc-text-primary",
                      )}
                      aria-label="List view"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6">
          {loadError && !loading ? (
            <GlassCard elevation={2} className="fc-card-shell p-8 text-center">
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
            <GlassCard elevation={2} className="fc-card-shell p-12 text-center">
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
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
                    className="group block w-full max-w-full rounded-2xl border-0 text-inherit no-underline outline-none transition-transform focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--fc-bg-deep)]"
                  >
                    <GlassCard
                      elevation={2}
                      className={cn(
                        "group/card fc-card-shell cursor-pointer overflow-hidden rounded-2xl shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_srgb,var(--fc-accent)_22%,transparent)] hover:shadow-md",
                        isInactiveOrPending && "opacity-90",
                      )}
                      borderColor="var(--fc-surface-card-border)"
                      surfaceStyle={attentionCardSurfaceStyle(attention.level)}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="mb-3 flex items-start gap-3 border-b border-[color:var(--fc-glass-border)]/60 pb-3">
                          <div className={`h-12 w-12 shrink-0 text-base sm:h-14 sm:w-14 sm:text-xl ${AVATAR_CLASS}`}>
                            {client.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="truncate text-base font-semibold tracking-tight text-[color:var(--fc-text-primary)] sm:text-lg">
                                {client.name}
                              </h3>
                              <ChevronRight
                                className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--fc-text-subtle)] opacity-70 transition group-hover/card:translate-x-0.5 group-hover/card:text-[color:var(--fc-accent)] group-hover/card:opacity-100"
                                aria-hidden
                              />
                            </div>
                            <p className="mt-0.5 truncate text-xs text-[color:var(--fc-text-dim)] sm:text-sm">{client.email}</p>
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
                          <div className="mb-3 flex items-start gap-2 rounded-lg bg-[color:var(--fc-glass-soft)] px-2.5 py-2">
                            <Dumbbell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--fc-text-dim)]" aria-hidden />
                            <p className="min-w-0 truncate text-xs leading-snug" title={client.metrics.activeProgramName}>
                              <span className="font-medium text-[color:var(--fc-text-primary)]">{client.metrics.activeProgramName}</span>
                              {weekLabel ? (
                                <span className="text-[color:var(--fc-text-dim)]"> · {weekLabel}</span>
                              ) : null}
                            </p>
                          </div>
                        )}

                        <div className="mb-1 flex flex-wrap gap-2 text-[11px] sm:text-xs">
                          <span className="inline-flex items-center gap-1 rounded-md border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-sunken)] px-2 py-1 font-medium tabular-nums text-[color:var(--fc-text-primary)]">
                            <Dumbbell className="h-3 w-3 text-[color:var(--fc-text-dim)]" aria-hidden />
                            {client.metrics.workoutsThisWeek}
                            <span className="font-normal text-[color:var(--fc-text-dim)]">wk</span>
                          </span>
                          {client.metrics.mealCompliance7dPct != null && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-sunken)] px-2 py-1 font-medium tabular-nums text-[color:var(--fc-text-primary)]">
                              <span className="font-normal text-[color:var(--fc-text-dim)]">Meals</span>
                              {client.metrics.mealCompliance7dPct}%
                              <span className="font-normal text-[color:var(--fc-text-dim)]">7d</span>
                            </span>
                          )}
                          {client.metrics.checkinStreak > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--fc-status-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-warning)_8%,transparent)] px-2 py-1 font-medium tabular-nums text-[color:var(--fc-text-primary)]">
                              <Flame className="h-3 w-3 text-[color:var(--fc-status-warning)]" aria-hidden />
                              {client.metrics.checkinStreak}
                            </span>
                          )}
                          {client.metrics.subscriptionExpiringSoon && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--fc-status-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-warning)_12%,transparent)] px-2 py-1 font-semibold text-[color:var(--fc-status-warning)]">
                              <CreditCard className="h-3 w-3" aria-hidden />
                              Sub
                            </span>
                          )}
                          {programStatus.label != null && (
                            <span
                              className="inline-flex items-center rounded-md border border-[color:var(--fc-glass-border)] px-2 py-1 font-medium"
                              style={{ color: programStatus.color }}
                            >
                              {programStatus.label}
                            </span>
                          )}
                        </div>

                        <div className="-mx-4 -mb-4 mt-3 flex items-center justify-between gap-2 border-t border-[color:var(--fc-glass-border)] bg-[color-mix(in_srgb,var(--fc-surface-sunken)_80%,transparent)] px-4 py-2.5 sm:-mx-5 sm:-mb-5 sm:px-5">
                          <div className="flex items-center gap-2" title="Stress · soreness (latest check-in)">
                            {client.metrics.latestStress != null ? (
                              <div
                                className="h-2 w-2 rounded-full ring-1 ring-[color:var(--fc-glass-border)]"
                                style={{ background: getWellnessColor(client.metrics.latestStress) }}
                              />
                            ) : (
                              <div className="h-2 w-2 rounded-full bg-[color:var(--fc-glass-border)] opacity-50" />
                            )}
                            {client.metrics.latestSoreness != null ? (
                              <div
                                className="h-2 w-2 rounded-full ring-1 ring-[color:var(--fc-glass-border)]"
                                style={{ background: getWellnessColor(client.metrics.latestSoreness) }}
                              />
                            ) : (
                              <div className="h-2 w-2 rounded-full bg-[color:var(--fc-glass-border)] opacity-50" />
                            )}
                            <span className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--fc-text-dim)]">
                              Wellness
                            </span>
                          </div>
                          <span className="text-xs font-medium text-[color:var(--fc-accent)]">Hub</span>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                );
              })}
            </div>
          ) : (
            // List View — each row links to Client Hub
            <div className="flex flex-col border-y border-[color:var(--fc-glass-border)]">
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
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-4 border-b border-[color:var(--fc-glass-border)] py-3 outline-none transition-colors hover:bg-[color:var(--fc-glass-highlight)] focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--fc-bg-deep)]",
                        attentionListRowClass(attention.level),
                        isInactiveOrPending && "opacity-90",
                      )}
                    >
                      {/* Avatar */}
                      <div className={`h-12 w-12 shrink-0 text-lg ${AVATAR_CLASS}`}>{client.name.charAt(0)}</div>

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
                            <Dumbbell className="h-3 w-3 text-[color:var(--fc-text-dim)]" aria-hidden />
                            <span className="font-bold tabular-nums text-[color:var(--fc-text-primary)]">
                              {client.metrics.workoutsThisWeek}
                            </span>
                            <span className="fc-text-dim">wk</span>
                          </span>
                          {client.metrics.checkinStreak > 0 && (
                            <span className="flex items-center gap-1">
                              <Flame className="h-3 w-3 text-[color:var(--fc-status-warning)]" aria-hidden />
                              <span className="font-semibold tabular-nums text-[color:var(--fc-text-primary)]">
                                {client.metrics.checkinStreak}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side: Program status and wellness */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {client.metrics.subscriptionExpiringSoon && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--fc-status-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-warning)_12%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--fc-status-warning)]"
                            title="Membership ending soon"
                          >
                            <CreditCard className="h-3 w-3" aria-hidden />
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
          )}
        </main>
      </CoachPageShell>

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
