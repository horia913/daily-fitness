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
import { Search, Grid3x3, List, UserPlus, Users, Flame, Dumbbell, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { type ClientMetrics } from "@/lib/coachDashboardService";
import { dbToUiScale } from "@/lib/wellnessService";

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
      const res = await fetch("/api/coach/clients", { signal: signal ?? null });
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
      didLoadRef.current = false;
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user]);

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

  // Get program status label and color
  const getProgramStatus = (status: ClientMetrics['programStatus'], endDate: string | null) => {
    switch (status) {
      case 'active':
        return { label: 'Active', color: 'var(--fc-status-success)' };
      case 'endingSoon':
        return { label: 'Ending Soon', color: 'var(--fc-status-warning)' };
      case 'noProgram':
        return { label: 'No Program', color: 'var(--fc-text-dim)' };
    }
  };

  // Check if client needs attention
  const needsAttention = (client: Client): boolean => {
    const { metrics } = client;
    if (!metrics.lastActive) return true;
    const relative = formatRelativeTime(metrics.lastActive);
    if (relative.color === "var(--fc-status-error)") return true;
    if (metrics.programStatus === 'noProgram') return true;
    if (metrics.latestStress != null && metrics.latestStress >= 4) return true;
    if (metrics.latestSoreness != null && metrics.latestSoreness >= 4) return true;
    return false;
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

  const getStatusColor = (status: Client["status"]) => {
    switch (status) {
      case "active":
        return getSemanticColor("success").primary;
      case "inactive":
        return getSemanticColor("neutral").primary;
      case "pending":
        return getSemanticColor("neutral").primary;
      case "at-risk":
        return getSemanticColor("warning").primary;
      default:
        return getSemanticColor("neutral").primary;
    }
  };

  const getStatusLabel = (status: Client["status"]) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      case "pending":
        return "Pending";
      case "at-risk":
        return "At Risk";
      default:
        return status;
    }
  };

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
          {loading ? (
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
                const atRisk = needsAttention(client);
                const isInactiveOrPending = client.status === "inactive" || client.status === "pending";
                return (
                  <Link key={client.id} href={`/coach/clients/${client.id}`}>
                    <GlassCard
                      elevation={2}
                      className={`fc-glass fc-card overflow-hidden transition-all hover:scale-102 hover:shadow-2xl cursor-pointer ${atRisk ? "border-l-4 border-amber-500 bg-amber-50/30 dark:bg-amber-900/10" : ""} ${isInactiveOrPending ? "opacity-80" : ""}`}
                      borderColor={getStatusColor(client.status)}
                    >
                      {/* Status indicator bar */}
                      <div
                        className={`h-2 ${atRisk ? "bg-amber-500" : ""}`}
                        style={!atRisk ? { background: getStatusColor(client.status) } : undefined}
                      />

                      <div className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                              style={{
                                background: getSemanticColor("trust").gradient,
                                color: "#fff",
                              }}
                            >
                              {client.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-[color:var(--fc-text-primary)]">
                                {client.name}
                              </h3>
                              <p className="text-sm text-[color:var(--fc-text-dim)] truncate max-w-[180px]">
                                {client.email}
                              </p>
                            </div>
                          </div>
                          <span
                            className="px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                            style={{
                              background: `${getStatusColor(client.status)}20`,
                              color: getStatusColor(client.status),
                            }}
                          >
                            {getStatusLabel(client.status)}
                          </span>
                        </div>

                        {/* Last Active */}
                        <div className="mb-3">
                          <div className="text-sm font-medium" style={{ color: relative.color }}>
                            {relative.text}
                          </div>
                          <div className="text-xs fc-text-dim">Last active</div>
                        </div>

                        {/* Metrics row */}
                        <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Dumbbell className="w-3 h-3 fc-text-dim" />
                            <span className="fc-text-primary font-medium">{client.metrics.workoutsThisWeek}</span>
                            <span className="fc-text-dim">this week</span>
                          </div>
                          {client.metrics.checkinStreak > 0 && (
                            <div className="flex items-center gap-1">
                              <Flame className="w-3 h-3" style={{ color: "var(--fc-status-warning)" }} />
                              <span className="fc-text-primary font-medium">{client.metrics.checkinStreak}</span>
                            </div>
                          )}
                          <div className="text-xs" style={{ color: programStatus.color }}>
                            {programStatus.label}
                          </div>
                        </div>

                        {/* Wellness indicators */}
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
                  const programStatus = getProgramStatus(client.metrics.programStatus, client.metrics.programEndDate);
                  const atRisk = needsAttention(client);
                  const isInactiveOrPending = client.status === "inactive" || client.status === "pending";
                  return (
                    <Link
                      key={client.id}
                      href={`/coach/clients/${client.id}`}
                      className={`flex items-center gap-4 p-4 rounded-lg transition-all hover:scale-[1.01] fc-glass-soft cursor-pointer block ${atRisk ? "border-l-4 border-amber-500 bg-amber-50/30 dark:bg-amber-900/10" : ""} ${isInactiveOrPending ? "opacity-80" : ""}`}
                      style={!atRisk ? { borderLeft: `4px solid ${getStatusColor(client.status)}` } : undefined}
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
                          <span
                            className="px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0"
                            style={{
                              background: `${getStatusColor(client.status)}20`,
                              color: getStatusColor(client.status),
                            }}
                          >
                            {getStatusLabel(client.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs fc-text-dim">
                          <span style={{ color: relative.color }}>{relative.text}</span>
                          <span className="flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" />
                            {client.metrics.workoutsThisWeek} this week
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
                        <div className="text-xs text-right" style={{ color: programStatus.color }}>
                          {programStatus.label}
                        </div>
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
