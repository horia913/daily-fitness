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
import { IconButton } from "@/components/ui/IconButton";
import {
  Search,
  Grid3x3,
  List,
  Plus,
  Users,
  Bell,
  HeartPulse,
  ArrowDownWideNarrow,
} from "lucide-react";
import Link from "next/link";
import {
  computeClientAttention,
} from "@/lib/coachClientAttention";
import { cn } from "@/lib/utils";
import { withTimeout } from "@/lib/withTimeout";
import { fetchApi } from "@/lib/apiClient";
import type { Client } from "./coachClientsTypes";
import {
  coachClientAvatarSeverity,
  coachClientSeverityTagLabel,
  coachClientVisualTier,
} from "./coachClientsUtils";
import { CoachClientListRow } from "./CoachClientListRow";
import { CoachClientGridCard } from "./CoachClientGridCard";
import styles from "./coachClients.module.css";

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "active" | "inactive" | "pending";
type SortOption = "name" | "lastActive" | "streak" | "workouts" | "needsAttention";
type QuickFilter = "all" | "needsAttention" | "trainedToday" | "checkedInToday";

const VIEW_STORAGE_KEY = "coach-clients-view-mode";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "lastActive", label: "Last active" },
  { value: "name", label: "Name A-Z" },
  { value: "streak", label: "Check-in streak" },
  { value: "workouts", label: "Workouts this week" },
  { value: "needsAttention", label: "Needs attention" },
];

function readInitialViewMode(): ViewMode {
  if (typeof window === "undefined") return "list";
  try {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    if (raw === "list" || raw === "grid") return raw;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(max-width: 767px)").matches ? "list" : "grid";
}

function getAttention(client: Client) {
  return computeClientAttention(client.status, client.metrics);
}

function needsAttention(client: Client): boolean {
  const { level } = getAttention(client);
  return level === "urgent" || level === "warning" || level === "inactive";
}

function ClientManagementContent() {
  const { user, profile } = useAuth();
  const { performanceSettings } = useTheme();

  const [clients, setClients] = useState<Client[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("lastActive");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const didLoadRef = useRef(false);

  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewMode(readInitialViewMode());
  }, []);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!sortWrapRef.current?.contains(e.target as Node)) setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortMenuOpen]);

  const persistViewMode = (next: ViewMode) => {
    setViewMode(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const loadClients = useCallback(async (signal?: AbortSignal) => {
    if (!user) return;
    if (didLoadRef.current) return;
    if (loadingRef.current) return;
    didLoadRef.current = true;
    loadingRef.current = true;
    try {
      setLoading(true);
      setLoadError(null);
      const res = await withTimeout(
        fetchApi("/api/coach/clients", { signal: signal ?? null }),
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

  const formatMetaPart = (dateStr: string | null, neverLabel: string): { text: string; color: string } => {
    if (!dateStr) return { text: neverLabel, color: "var(--fc-text-dim)" };
    return formatRelativeTime(dateStr);
  };

  const filteredClients = clients
    .filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
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
        case "lastActive": {
          const aDate = a.metrics.lastActive || "";
          const bDate = b.metrics.lastActive || "";
          return bDate.localeCompare(aDate);
        }
        case "streak":
          return b.metrics.checkinStreak - a.metrics.checkinStreak;
        case "workouts":
          return b.metrics.workoutsThisWeek - a.metrics.workoutsThisWeek;
        case "needsAttention": {
          const aNeeds = needsAttention(a);
          const bNeeds = needsAttention(b);
          if (aNeeds !== bNeeds) return aNeeds ? -1 : 1;
          const aDate2 = a.metrics.lastActive || "";
          const bDate2 = b.metrics.lastActive || "";
          return bDate2.localeCompare(aDate2);
        }
        default:
          return 0;
      }
    });

  const activeCount = clients.filter((c) => c.status === "active").length;
  const inactiveCount = clients.filter((c) => c.status === "inactive").length;
  const pendingCount = clients.filter((c) => c.status === "pending").length;
  const attentionCount = clients.filter(needsAttention).length;
  const bellHasSignal = attentionCount > 0;

  const coachInitial = (profile?.first_name?.[0] || user?.email?.[0] || "C").toUpperCase();
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Last active";

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <CoachPageShell widthVariant="data-7xl" className="pb-[var(--fc-bottom-safe-area)] px-0 sm:px-0">
        <header className="sticky top-0 z-40 border-b border-[color:var(--fc-glass-border)] bg-[color:color-mix(in_srgb,var(--fc-bg-deep)_88%,transparent)] backdrop-blur-md">
          <div className="px-4 pt-1 sm:px-6 sm:pt-2">
            <div className={styles.topbar}>
              <div className={styles.coachAvatar} aria-hidden>
                {coachInitial}
              </div>
              <IconButton
                type="button"
                variant="filled"
                showDot={bellHasSignal}
                aria-label="Notifications"
                onClick={() => {
                  window.location.href = "/coach/profile";
                }}
              >
                <Bell className="h-[18px] w-[18px] text-[color:var(--fc-text-dim)]" />
              </IconButton>
            </div>

            <div className={styles.pageHeader}>
              <div className={styles.pageHeaderLeft}>
                <h1 className={styles.pageTitle}>Clients</h1>
                <p className={styles.pageMeta}>
                  <span className={styles.pageMetaNum}>{activeCount}</span>
                  active ·<span className={styles.pageMetaNum}> {attentionCount}</span>
                  {" need attention"}
                </p>
              </div>
              <Link href="/coach/clients/add" className={styles.addBtn}>
                <Plus className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
                Add
              </Link>
            </div>
          </div>

          <div className={styles.filtersStack}>
            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} aria-hidden />
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search clients"
              />
            </div>

            <div className={styles.pillRowScroll}>
              {(["all", "active", "pending", "inactive"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={cn(styles.pill, statusFilter === filter && styles.pillActiveCyan)}
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter === "all" ? "All" : filter === "active" ? "Active" : filter === "pending" ? "Pending" : "Inactive"}
                  <span className={styles.pillCount}>
                    {filter === "all" && clients.length}
                    {filter === "active" && activeCount}
                    {filter === "pending" && pendingCount}
                    {filter === "inactive" && inactiveCount}
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.pillRowWrap}>
              {(["needsAttention", "trainedToday", "checkedInToday"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={cn(styles.pill, quickFilter === filter && styles.pillActiveLime)}
                  onClick={() => setQuickFilter(quickFilter === filter ? "all" : filter)}
                >
                  {filter === "needsAttention" ? (
                    <span className="inline-flex items-center gap-1">
                      <HeartPulse className="h-3 w-3 shrink-0" aria-hidden />
                      Needs attention
                    </span>
                  ) : filter === "trainedToday" ? (
                    "Trained today"
                  ) : (
                    "Checked in today"
                  )}
                </button>
              ))}
            </div>
          </div>

          {!loadError && !loading && clients.length > 0 ? (
            <div className={styles.toolbar}>
              <p className={styles.toolbarLeft}>
                <span className={styles.toolbarCount}>{filteredClients.length}</span>
                clients
              </p>
              <div className={styles.toolbarRight}>
                <div className={styles.sortWrap} ref={sortWrapRef}>
                  <button
                    type="button"
                    className={styles.sortTrigger}
                    onClick={() => setSortMenuOpen((o) => !o)}
                    aria-expanded={sortMenuOpen}
                    aria-haspopup="listbox"
                  >
                    <ArrowDownWideNarrow className="h-[11px] w-[11px] shrink-0 opacity-80" aria-hidden />
                    {sortLabel}
                  </button>
                  {sortMenuOpen ? (
                    <div className={styles.sortMenu} role="listbox">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={sortBy === opt.value}
                          className={cn(
                            styles.sortMenuItem,
                            sortBy === opt.value && styles.sortMenuItemActive
                          )}
                          onClick={() => {
                            setSortBy(opt.value);
                            setSortMenuOpen(false);
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className={styles.viewToggle} role="group" aria-label="View mode">
                  <button
                    type="button"
                    className={cn(styles.viewToggleBtn, viewMode === "list" && styles.viewToggleBtnActive)}
                    aria-pressed={viewMode === "list"}
                    aria-label="List view"
                    onClick={() => persistViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={cn(styles.viewToggleBtn, viewMode === "grid" && styles.viewToggleBtnActive)}
                    aria-pressed={viewMode === "grid"}
                    aria-label="Grid view"
                    onClick={() => persistViewMode("grid")}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </header>

        <main className="px-0 pb-6 pt-2">
          {loadError && !loading ? (
            <div className="px-4 sm:px-6">
              <GlassCard elevation={2} className="fc-card-shell p-8 text-center">
                <p className="mb-4 text-sm text-[color:var(--fc-status-error)]">{loadError}</p>
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
            </div>
          ) : loading ? (
            <div className="space-y-4 px-4 sm:px-6">
              <div className="fc-skeleton rounded-2xl" style={{ height: 120 }} />
              <div className="fc-skeleton rounded-2xl" style={{ height: 120 }} />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="px-4 sm:px-6">
              <GlassCard elevation={2} className="fc-card-shell p-12 text-center">
                <Users className="mx-auto mb-6 h-24 w-24 text-[color:var(--fc-text-subtle)]" />
                <h3 className="mb-2 text-2xl font-bold text-[color:var(--fc-text-primary)]">
                  {searchQuery || statusFilter !== "all" || quickFilter !== "all"
                    ? "No clients found"
                    : "Build your coaching roster"}
                </h3>
                <p className="mb-6 text-sm text-[color:var(--fc-text-dim)]">
                  {searchQuery || statusFilter !== "all" || quickFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Start by adding your first client to begin tracking their progress"}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link href="/coach/clients/add">
                    <Button className="fc-btn fc-btn-primary">
                      <Plus className="mr-2 h-5 w-5" />
                      Add your first client
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
                      Clear filters
                    </Button>
                  )}
                </div>
              </GlassCard>
            </div>
          ) : viewMode === "grid" ? (
            <div className={styles.gridWrap}>
              {filteredClients.map((client) => {
                const attention = getAttention(client);
                const tier = coachClientVisualTier(client.status, attention.level, client.metrics);
                const avatarSev = coachClientAvatarSeverity(tier);
                const tagLabel = coachClientSeverityTagLabel(tier, attention, client.metrics);
                const act = formatRelativeTime(client.metrics.lastActive);
                const chk = formatRelativeTime(client.metrics.lastCheckinDate);
                const weekLabel =
                  client.metrics.programCurrentWeek != null && client.metrics.programDurationWeeks != null
                    ? `Week ${client.metrics.programCurrentWeek} of ${client.metrics.programDurationWeeks}`
                    : null;
                const chip =
                  client.metrics.activeProgramName != null
                    ? weekLabel
                      ? `${client.metrics.activeProgramName} · ${weekLabel}`
                      : client.metrics.activeProgramName
                    : null;
                return (
                  <CoachClientGridCard
                    key={client.id}
                    href={`/coach/clients/${client.id}`}
                    name={client.name}
                    email={client.email}
                    initialLetter={client.name.charAt(0).toUpperCase()}
                    avatarSev={avatarSev}
                    tier={tier}
                    tagLabel={tagLabel}
                    lastActivityLabel={act.text}
                    lastActivityColor={act.color}
                    lastCheckinLabel={chk.text}
                    lastCheckinColor={chk.color}
                    programName={client.metrics.activeProgramName}
                    mealPct={client.metrics.mealCompliance7dPct}
                    workoutsWeek={client.metrics.workoutsThisWeek}
                    checkinStreak={client.metrics.checkinStreak}
                    subscriptionExpiringSoon={client.metrics.subscriptionExpiringSoon}
                    programChipLabel={chip}
                  />
                );
              })}
            </div>
          ) : (
            <div className={styles.listCol}>
              {filteredClients.map((client) => {
                const attention = getAttention(client);
                const tier = coachClientVisualTier(client.status, attention.level, client.metrics);
                const avatarSev = coachClientAvatarSeverity(tier);
                const tagLabel = coachClientSeverityTagLabel(tier, attention, client.metrics);
                const act = formatMetaPart(client.metrics.lastActive, "Never trained");
                const chk = formatMetaPart(client.metrics.lastCheckinDate, "Never checked in");
                const metaNeverOnly = !client.metrics.lastActive && !client.metrics.lastCheckinDate;
                const weekShort =
                  client.metrics.programCurrentWeek != null ? `W${client.metrics.programCurrentWeek}` : null;
                return (
                  <CoachClientListRow
                    key={client.id}
                    href={`/coach/clients/${client.id}`}
                    name={client.name}
                    initialLetter={client.name.charAt(0).toUpperCase()}
                    avatarSev={avatarSev}
                    tier={tier}
                    tagLabel={tagLabel}
                    activityText={act.text}
                    activityColor={act.color}
                    checkinText={chk.text}
                    checkinColor={chk.color}
                    programName={client.metrics.activeProgramName}
                    weekShort={weekShort}
                    metaNeverOnly={metaNeverOnly}
                  />
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
