"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { AnimatedEntry } from "@/components/ui/AnimatedEntry";
import { CoachPageShell } from "@/components/coach-ui";
import {
  Users,
  ClipboardCheck,
  ChevronRight,
  Bell,
  MessageCircle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import type { ClientSummary, MorningBriefing, ClientAlert } from "@/lib/coachDashboardService";
import { sortAlertsByPriority } from "@/lib/coachDashboardService";
import {
  attentionPriority,
  computeClientAttentionFromSummary,
  daysSinceIsoDate,
  type AttentionLevel,
} from "@/lib/coachClientAttention";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/lib/apiClient";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/badge";
import { ClientAvatar, type ClientAvatarSeverity } from "@/components/coach/dashboard/ClientAvatar";
import { DaysBadge, type DaysBadgeTier } from "@/components/coach/dashboard/DaysBadge";
import styles from "./coachDashboard.module.css";

type SortKey = "name" | "lastActive" | "streak" | "compliance" | "severity";

type AttentionVisualTier = "critical" | "warning" | "new";

type AttentionEntry = {
  client: ClientSummary;
  attention: { level: AttentionLevel; reasons: string[] };
  daysSinceCheckin: number | null;
  daysSinceActivity: number | null;
};

function attentionVisualTier(entry: AttentionEntry): AttentionVisualTier {
  if (entry.attention.level === "urgent") return "critical";
  if (entry.attention.level === "warning") return "warning";
  if (entry.attention.level === "inactive" && !entry.client.lastCheckinDate) return "new";
  return "warning";
}

function heroSeverityLabel(entry: AttentionEntry): string {
  if (entry.attention.level === "urgent") return "CRITICAL";
  if (entry.attention.level === "warning") return "WARNING";
  if (entry.attention.level === "inactive" && !entry.client.lastCheckinDate) return "NEW";
  return "INACTIVE";
}

function heroBadgeVariant(
  entry: AttentionEntry
): "status-critical" | "status-warning" | "status-new" {
  const t = attentionVisualTier(entry);
  if (t === "critical") return "status-critical";
  if (t === "new") return "status-new";
  return "status-warning";
}

function rowStripeClass(tier: AttentionVisualTier): string {
  if (tier === "critical") return styles.attentionRowStripeCritical;
  if (tier === "new") return styles.attentionRowStripeNew;
  return styles.attentionRowStripeWarning;
}

function daysBadgeTierFromVisual(v: AttentionVisualTier): DaysBadgeTier {
  if (v === "critical") return "critical";
  if (v === "new") return "new";
  return "warning";
}

function rosterAvatarSeverity(
  level: AttentionLevel,
  lastCheckinDate: string | null
): ClientAvatarSeverity {
  if (level === "urgent") return "critical";
  if (level === "warning") return "warning";
  if (level === "inactive" && !lastCheckinDate) return "new";
  if (level === "inactive") return "warning";
  if (level === "good") return "good";
  return "neutral";
}

function rosterRowClass(level: AttentionLevel, lastCheckinDate: string | null): string {
  if (level === "urgent") return styles.rosterRowCritical;
  if (level === "warning") return styles.rosterRowWarning;
  if (level === "inactive") return styles.rosterRowWarning;
  return styles.rosterRowNeutral;
}

function rosterTagPill(
  client: ClientSummary,
  attention: { level: AttentionLevel; reasons: string[] }
): { label: string; variant: "status-critical" | "status-info" | "status-warning" | "status-new" } | null {
  const d = daysSinceIsoDate(client.lastCheckinDate);
  if (attention.level === "urgent") {
    if (d == null || d >= 14) return { label: "Critical", variant: "status-critical" };
    return { label: "Urgent", variant: "status-info" };
  }
  if (attention.level === "warning") {
    return { label: "Inactive", variant: "status-warning" };
  }
  if (attention.level === "inactive") {
    if (!client.lastCheckinDate) return { label: "New", variant: "status-new" };
    return { label: "Inactive", variant: "status-warning" };
  }
  return null;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "lastActive", label: "Recent activity" },
  { value: "severity", label: "Severity" },
  { value: "streak", label: "Streak" },
  { value: "compliance", label: "Compliance" },
];

function CoachDashboardContent() {
  const { user, profile } = useAuth();
  const { performanceSettings } = useTheme();

  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [programCompliance, setProgramCompliance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortWrapRef = useRef<HTMLDivElement>(null);
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

      const res = await fetchApi("/api/coach/dashboard", { signal: signal ?? null });
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

  useEffect(() => {
    if (!sortMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!sortWrapRef.current?.contains(e.target as Node)) setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortMenuOpen]);

  const getAllAlerts = (): ClientAlert[] => {
    if (!briefing) return [];
    const { alerts } = briefing;
    return sortAlertsByPriority([
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
    ]);
  };

  const allAlerts = getAllAlerts();

  const attentionEntries = useMemo((): AttentionEntry[] => {
    if (!briefing) return [];
    const rows: AttentionEntry[] = briefing.clientSummaries.map((client) => {
      const attention = computeClientAttentionFromSummary(client);
      const daysSinceCheckin = daysSinceIsoDate(client.lastCheckinDate);
      const daysSinceActivity = daysSinceIsoDate(
        client.lastWorkoutDate ?? client.lastCheckinDate
      );
      return { client, attention, daysSinceCheckin, daysSinceActivity };
    });
    const filtered = rows.filter((r) => r.attention.level !== "good");
    filtered.sort((a, b) => {
      const pa = attentionPriority(a.attention.level);
      const pb = attentionPriority(b.attention.level);
      if (pa !== pb) return pa - pb;
      const da = a.daysSinceCheckin ?? 1_000_000;
      const db = b.daysSinceCheckin ?? 1_000_000;
      if (da !== db) return db - da;
      return (b.daysSinceActivity ?? 0) - (a.daysSinceActivity ?? 0);
    });
    return filtered;
  }, [briefing]);

  const attentionCount = attentionEntries.length;
  const bellHasSignal = attentionCount > 0 || allAlerts.length > 0;

  const recentCheckinQueue = useMemo(() => {
    if (!briefing) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 2);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return briefing.clientSummaries.filter((c) => c.lastCheckinDate && c.lastCheckinDate >= cutoffStr);
  }, [briefing]);

  const filteredAndSortedClients = useMemo(() => {
    if (!briefing) return [];
    const q = searchQuery.trim().toLowerCase();
    const list = briefing.clientSummaries.filter((client) => {
      if (!q) return true;
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      return fullName.includes(q);
    });
    return list.sort((a, b) => {
      switch (sortBy) {
        case "lastActive": {
          const aDate = a.lastWorkoutDate || a.lastCheckinDate || "";
          const bDate = b.lastWorkoutDate || b.lastCheckinDate || "";
          return bDate.localeCompare(aDate);
        }
        case "streak":
          return b.checkinStreak - a.checkinStreak;
        case "compliance": {
          const aComp = a.programCompliance ?? 0;
          const bComp = b.programCompliance ?? 0;
          return bComp - aComp;
        }
        case "severity": {
          const pa = attentionPriority(computeClientAttentionFromSummary(a).level);
          const pb = attentionPriority(computeClientAttentionFromSummary(b).level);
          return pa - pb;
        }
        case "name":
        default:
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
    });
  }, [briefing, searchQuery, sortBy]);

  const getTimeGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  };

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const formatDaysAgo = (dateStrIn: string | null): string => {
    if (!dateStrIn) return "Never";
    const date = new Date(dateStrIn + "T12:00:00Z");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1d ago";
    return `${diffDays}d ago`;
  };

  const getWellnessColor = (value: number | null): string => {
    if (value == null) return "var(--fc-text-dim)";
    if (value <= 2) return "var(--fc-status-success)";
    if (value <= 3) return "var(--fc-status-warning)";
    return "var(--fc-status-error)";
  };

  const coachInitial =
    (profile?.first_name?.[0] || user?.email?.[0] || "C").toUpperCase();

  const featuredAttention = attentionEntries[0];
  const restAttention = attentionEntries.length > 1 ? attentionEntries.slice(1) : [];

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Name";

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <CoachPageShell widthVariant="benchmark-5xl" className="px-4 sm:px-6">
        <AnimatedEntry delay={0} animation="fade-up">
          <header className={styles.topbar}>
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
              <Bell className="h-[18px] w-[18px] text-[var(--fc-text-dim)]" />
            </IconButton>
          </header>
        </AnimatedEntry>

        {!loading && briefing && (
          <AnimatedEntry delay={20} animation="fade-up">
            <div className="mb-5">
              <div className="mb-3 flex items-center gap-2">
                {attentionCount > 0 ? (
                  <>
                    <span className={styles.greetingPulse} aria-hidden />
                    <span
                      className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[color:var(--fc-accent-lime)]"
                    >
                      {attentionCount} clients need attention
                    </span>
                  </>
                ) : (
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[color:var(--fc-accent-lime)]">
                    All clear today
                  </span>
                )}
              </div>
              <h1
                className="text-[30px] font-bold leading-none tracking-[-0.025em] text-[var(--fc-text-primary)]"
                style={{ fontFamily: "var(--f-headline, var(--font-sans, ui-sans-serif))" }}
              >
                {getTimeGreeting()},{" "}
                <span className={styles.titleCoachGradient}>Coach.</span>
              </h1>
              <p
                className="mt-2 text-[13px] font-medium text-[var(--fc-text-dim)]"
                style={{ fontFamily: "var(--font-sans, ui-sans-serif)" }}
              >
                {dateStr}
              </p>
            </div>
          </AnimatedEntry>
        )}

        {error && !loading && (
          <div className="fc-surface mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border-l-4 border-l-[color:var(--fc-status-error)] p-4 sm:flex-row sm:items-center">
            <p className="text-sm fc-text-error">{error}</p>
            <Button
              type="button"
              variant="fc-secondary"
              onClick={() => {
                setError(null);
                didLoadRef.current = false;
                loadData();
              }}
            >
              Retry
            </Button>
          </div>
        )}
        {error && loading && (
          <div className="fc-surface mb-6 rounded-2xl border-l-4 border-l-[color:var(--fc-status-error)] p-4">
            <p className="text-sm fc-text-error">{error}</p>
          </div>
        )}

        {loading && (
          <div className="mb-8 space-y-4">
            <div className="fc-skeleton rounded-2xl" style={{ height: 72 }} />
            <div className="fc-skeleton rounded-3xl" style={{ height: 220 }} />
            <div className="fc-skeleton rounded-2xl" style={{ height: 120 }} />
          </div>
        )}

        {!loading && briefing && (
          <>
            <AnimatedEntry delay={50} animation="fade-up">
              <section className="mb-5">
                <Eyebrow
                  density="statStrip"
                  className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.18em] text-[color:var(--fc-accent-cyan)]"
                >
                  Today&apos;s roster
                </Eyebrow>
                <div className={styles.heroRoster}>
                  <div className="relative z-[1]">
                    <div className="flex flex-wrap items-baseline gap-1">
                      <span className={styles.heroNumber}>{briefing.clientsTrainedToday}</span>
                      <span className={styles.heroTotal}>/{briefing.activeClients}</span>
                    </div>
                    <p className="mt-1 text-[13px] font-medium text-[var(--fc-text-subtle)]">
                      athletes have trained today
                    </p>
                    <div className={styles.heroDivider} />
                    <div className={styles.heroStatGrid}>
                      <div className={styles.heroStatCell}>
                        <div>
                          <span className={styles.heroStatValue}>
                            {briefing.clientsCheckedInToday}
                            <span className={styles.heroStatSuffix}>/{briefing.activeClients}</span>
                          </span>
                        </div>
                        <div className={styles.heroStatLabel}>Checked in</div>
                      </div>
                      <div className={styles.heroStatCell}>
                        <div>
                          <span className={styles.heroStatValue}>
                            {programCompliance != null ? programCompliance : "—"}
                            {programCompliance != null ? (
                              <span className={styles.heroStatSuffix}>%</span>
                            ) : null}
                          </span>
                        </div>
                        <div className={styles.heroStatLabel}>Compliance</div>
                      </div>
                      <div className={styles.heroStatCell}>
                        <div>
                          <span className={styles.heroStatValue}>{briefing.activeClients}</span>
                        </div>
                        <div className={styles.heroStatLabel}>Active</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </AnimatedEntry>

            <AnimatedEntry delay={90} animation="fade-up">
              <section className="mb-5">
                <div className="mb-3 flex items-center justify-between">
                  <Eyebrow
                    density="default"
                    tone="dim"
                    className="mb-0 !text-[10.5px] !tracking-[0.18em]"
                  >
                    Recent wellness
                  </Eyebrow>
                  <button type="button" className={styles.sectionLink}>
                    Last 48h
                  </button>
                </div>
                {recentCheckinQueue.length === 0 ? (
                  <div className={styles.wellnessEmpty}>
                    <div className={styles.wellnessEmptyIcon}>
                      <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--fc-text-primary)]">
                        No check-ins yet today
                      </p>
                      <p className="mt-1 text-[11.5px] text-[var(--fc-text-dim)]">
                        Wellness logs from the last 48h will appear here
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recentCheckinQueue.map((c) => (
                      <button
                        key={c.clientId}
                        type="button"
                        onClick={() => {
                          window.location.href = `/coach/clients/${c.clientId}/progress`;
                        }}
                        className={cn(styles.attentionRow, "border-[color:var(--fc-glass-border)]")}
                      >
                        <div className={styles.wellnessEmptyIcon}>
                          <ClipboardCheck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <div className="text-sm font-semibold text-[var(--fc-text-primary)]">
                            {c.firstName} {c.lastName}
                          </div>
                          <p className="text-[11.5px] text-[var(--fc-text-dim)]">
                            Last log {c.lastCheckinDate}
                          </p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--fc-text-quaternary)]" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </AnimatedEntry>

            {attentionCount > 0 && featuredAttention && (
              <AnimatedEntry delay={100} animation="fade-up">
                <section className="mb-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <Eyebrow
                        density="default"
                        className="mb-0 !text-[10.5px] !tracking-[0.18em] text-[color:var(--fc-accent-cyan)]"
                      >
                        Needs attention
                      </Eyebrow>
                      <span className={styles.attentionCountBadge}>{attentionCount}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.sectionLink}
                      onClick={() => {
                        window.location.href = "/coach/clients";
                      }}
                    >
                      See all
                    </button>
                  </div>

                  <div
                    className={styles.featuredHero}
                    data-variant={attentionVisualTier(featuredAttention)}
                  >
                    <div className={styles.featuredHeroInner}>
                      <div className="flex gap-3">
                        <DaysBadge
                          days={featuredAttention.daysSinceCheckin}
                          tier={daysBadgeTierFromVisual(attentionVisualTier(featuredAttention))}
                          size="lg"
                          displayText={
                            attentionVisualTier(featuredAttention) === "new" ? "New" : undefined
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <Badge variant={heroBadgeVariant(featuredAttention)} className="mb-2">
                            {heroSeverityLabel(featuredAttention)}
                          </Badge>
                          <div
                            className="text-lg font-bold leading-tight text-[var(--fc-text-primary)]"
                            style={{ fontFamily: "var(--f-headline, var(--font-sans, ui-sans-serif))" }}
                          >
                            {featuredAttention.client.firstName} {featuredAttention.client.lastName}
                          </div>
                          <p className="mt-1 text-[11.5px] text-[var(--fc-text-dim)]">
                            {featuredAttention.daysSinceCheckin != null
                              ? `No check-in for ${featuredAttention.daysSinceCheckin} days`
                              : featuredAttention.attention.reasons[0] ?? "Needs follow-up"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                        <Button
                          type="button"
                          variant="btn-action"
                          className="w-full min-w-0 tracking-[0.04em]"
                          onClick={() => {
                            window.location.href = `/coach/clients/${featuredAttention.client.clientId}`;
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Reach out
                        </Button>
                        <button
                          type="button"
                          className="rounded-xl border border-[color:var(--fc-glass-border)] bg-white/[0.04] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--fc-text-primary)]"
                          onClick={() => {
                            window.location.href = `/coach/clients/${featuredAttention.client.clientId}/profile`;
                          }}
                        >
                          View profile
                        </button>
                      </div>
                    </div>
                  </div>

                  {restAttention.map((entry) => {
                    const v = attentionVisualTier(entry);
                    const tier = daysBadgeTierFromVisual(v);
                    const isNewRow = v === "new";
                    return (
                      <button
                        key={entry.client.clientId}
                        type="button"
                        onClick={() => {
                          window.location.href = `/coach/clients/${entry.client.clientId}`;
                        }}
                        className={cn(styles.attentionRow, rowStripeClass(v))}
                      >
                        <DaysBadge
                          days={entry.daysSinceCheckin}
                          tier={tier}
                          displayText={isNewRow ? "New" : undefined}
                        />
                        <div className="min-w-0 flex-1 text-left">
                          <div
                            className="text-sm font-semibold text-[var(--fc-text-primary)]"
                            style={{ fontFamily: "var(--f-headline, var(--font-sans, ui-sans-serif))" }}
                          >
                            {entry.client.firstName} {entry.client.lastName}
                          </div>
                          <p className="mt-0.5 text-[11.5px] text-[var(--fc-text-dim)]">
                            {entry.attention.reasons.slice(0, 2).join(" · ") || "Review client"}
                          </p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--fc-text-quaternary)]" />
                      </button>
                    );
                  })}
                </section>
              </AnimatedEntry>
            )}

            <AnimatedEntry delay={150} animation="fade-up">
              <section className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <Eyebrow
                    density="default"
                    tone="dim"
                    className="mb-0 !text-[10.5px] !tracking-[0.18em]"
                  >
                    Client roster
                  </Eyebrow>
                  <span className="text-[11.5px] font-semibold text-[color:var(--fc-accent-cyan)]">
                    {briefing.activeClients} active
                  </span>
                </div>

                <div className="mb-3 flex gap-2" ref={sortWrapRef}>
                  <div className={styles.searchWrap}>
                    <input
                      type="search"
                      placeholder="Search clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={styles.searchInput}
                      aria-label="Search clients"
                    />
                  </div>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      className={styles.sortTrigger}
                      onClick={() => setSortMenuOpen((o) => !o)}
                      aria-expanded={sortMenuOpen}
                      aria-haspopup="listbox"
                    >
                      {sortLabel}
                      <ChevronDown className="h-3 w-3 opacity-70" />
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
                </div>

                {filteredAndSortedClients.length === 0 ? (
                  <div className="fc-surface rounded-2xl p-8 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 fc-text-dim opacity-50" />
                    <p className="mb-1 text-sm font-semibold fc-text-primary">No clients found</p>
                    <p className="text-xs fc-text-dim">Try adjusting your search</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
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
                      const tag = rosterTagPill(client, dashAttention);
                      const avatarSev = rosterAvatarSeverity(
                        dashAttention.level,
                        client.lastCheckinDate
                      );
                      return (
                        <button
                          key={client.clientId}
                          type="button"
                          onClick={() => {
                            window.location.href = `/coach/clients/${client.clientId}`;
                          }}
                          className={cn(styles.rosterRow, rosterRowClass(dashAttention.level, client.lastCheckinDate))}
                        >
                          <ClientAvatar
                            initial={client.firstName?.[0] || "C"}
                            severity={avatarSev}
                          />
                          <div className="min-w-0 flex-1 text-left">
                            <div className="mb-0.5 flex flex-wrap items-center gap-2">
                              <span
                                className="text-sm font-semibold text-[var(--fc-text-primary)]"
                                style={{ fontFamily: "var(--f-headline, var(--font-sans, ui-sans-serif))" }}
                              >
                                {client.firstName} {client.lastName}
                              </span>
                              {tag ? (
                                <Badge variant={tag.variant} className="!px-1.5 !py-0 !text-[9px]">
                                  {tag.label}
                                </Badge>
                              ) : null}
                              <span className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
                                {client.trainedToday && (
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ background: "var(--fc-status-success)" }}
                                    title="Trained today"
                                  />
                                )}
                                {client.checkedInToday && (
                                  <span
                                    className="h-2 w-2 rounded-full bg-purple-500 dark:bg-purple-400"
                                    title="Checked in today"
                                  />
                                )}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--fc-text-dim)]">
                              {dashAttention.reasons.length > 0 ? (
                                <span>{dashAttention.reasons.slice(0, 2).join(" · ")}</span>
                              ) : sameTouchDay && workoutAgo ? (
                                <span>Last activity: {workoutAgo}</span>
                              ) : (
                                <>
                                  {client.lastWorkoutDate && <span>Workout: {workoutAgo}</span>}
                                  {client.lastWorkoutDate && client.lastCheckinDate && (
                                    <span className="mx-1">·</span>
                                  )}
                                  {client.lastCheckinDate && <span>Check-in: {checkinAgo}</span>}
                                  {!client.lastWorkoutDate && !client.lastCheckinDate && (
                                    <span>No activity yet</span>
                                  )}
                                </>
                              )}
                              {client.latestStress != null && (
                                <span
                                  className="ml-2 inline-block h-2 w-2 rounded-full align-middle"
                                  style={{ background: getWellnessColor(client.latestStress) }}
                                  title={`Stress: ${client.latestStress}/5`}
                                />
                              )}
                              {client.latestSoreness != null && (
                                <span
                                  className="ml-1 inline-block h-2 w-2 rounded-full align-middle"
                                  style={{ background: getWellnessColor(client.latestSoreness) }}
                                  title={`Soreness: ${client.latestSoreness}/5`}
                                />
                              )}
                            </div>
                            {!sameTouchDay && client.lastWorkoutDate && (
                              <p className="mt-0.5 text-[10.5px] text-[var(--fc-text-quaternary)]">
                                Last workout: {workoutAgo}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--fc-text-quaternary)]" />
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-center">
                  <button
                    type="button"
                    className={styles.viewAllClients}
                    onClick={() => {
                      window.location.href = "/coach/clients";
                    }}
                  >
                    <Users className="h-4 w-4" />
                    View all clients
                  </button>
                </div>
              </section>
            </AnimatedEntry>
          </>
        )}
      </CoachPageShell>
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
