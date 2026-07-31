"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { LogActivityModal } from "@/components/client/activity/LogActivityModal";
import { ActivityList } from "@/components/client/activity/ActivityList";
import { ActivitiesCharts } from "@/components/client/activity/ActivitiesCharts";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, ArrowLeft, Plus, AlertTriangle } from "lucide-react";
import {
  logActivity,
  updateActivity,
  deleteActivity,
  getActivitiesByDateRange,
  getCurrentWeekBounds,
  toLocalDateString,
  ACTIVITY_META,
  type ClientActivity,
  type LogActivityInput,
  type ActivityType,
} from "@/lib/clientActivityService";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

type FilterRange = "week" | "month" | "all";
type ActivityTab = "log" | "trends";

function getDateRange(filter: FilterRange): { start: string; end: string } {
  const today = new Date();
  const end = toLocalDateString(today);

  if (filter === "week") {
    return getCurrentWeekBounds();
  }

  if (filter === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: toLocalDateString(start), end };
  }

  return { start: "2020-01-01", end };
}

function parseTab(raw: string | null): ActivityTab {
  return raw === "trends" ? "trends" : "log";
}

function activityTypeLabel(type: string, customName?: string | null): string {
  if (type === "custom") return customName?.trim() || "Custom";
  return ACTIVITY_META[type as ActivityType]?.label ?? type;
}

function ActivityHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const { addToast } = useToast();

  const [tab, setTabState] = useState<ActivityTab>(() =>
    parseTab(searchParams.get("tab")),
  );
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [trendsActivities, setTrendsActivities] = useState<ClientActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [filter, setFilter] = useState<FilterRange>("week");
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ClientActivity | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const setTab = useCallback(
    (next: ActivityTab) => {
      setTabState(next);
      const q = new URLSearchParams(searchParams.toString());
      if (next === "trends") q.set("tab", "trends");
      else q.delete("tab");
      const qs = q.toString();
      router.replace(qs ? `/client/activity?${qs}` : "/client/activity", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  useEffect(() => {
    setTabState(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  const loadActivities = useCallback(async () => {
    if (!user?.id) return;
    setLoadError(null);
    setLoading(true);
    try {
      const { start, end } = getDateRange(filter);
      const data = await getActivitiesByDateRange(user.id, start, end);
      setActivities(data);
    } catch (err) {
      console.error("Failed to load activities:", err);
      setLoadError("Could not load activity. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, filter]);

  const loadTrends = useCallback(async () => {
    if (!user?.id) return;
    setTrendsLoading(true);
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
      const data = await getActivitiesByDateRange(
        user.id,
        threeMonthsAgo.toISOString().split("T")[0],
        new Date().toISOString().split("T")[0],
      );
      setTrendsActivities(data);
    } catch {
      setTrendsActivities([]);
    } finally {
      setTrendsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    if (tab === "trends") void loadTrends();
  }, [tab, loadTrends]);

  const handleSave = async (input: LogActivityInput) => {
    if (!user?.id) return;
    if (editingActivity) {
      const updated = await updateActivity(editingActivity.id, input);
      if (updated) {
        addToast({ title: "Activity updated", variant: "default" });
        await loadActivities();
        if (tab === "trends") await loadTrends();
      } else {
        addToast({ title: "Failed to update activity", variant: "destructive" });
      }
    } else {
      const created = await logActivity(user.id, input);
      if (created) {
        addToast({ title: "Activity logged!", variant: "default" });
        await loadActivities();
        if (tab === "trends") await loadTrends();
      } else {
        addToast({ title: "Failed to log activity", variant: "destructive" });
      }
    }
    setEditingActivity(null);
  };

  const handleEdit = (activity: ClientActivity) => {
    setEditingActivity(activity);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    const ok = await deleteActivity(pendingDeleteId);
    setDeleting(false);
    if (ok) {
      addToast({ title: "Activity deleted", variant: "default" });
      setActivities((prev) => prev.filter((a) => a.id !== pendingDeleteId));
      setTrendsActivities((prev) =>
        prev.filter((a) => a.id !== pendingDeleteId),
      );
      setPendingDeleteId(null);
    } else {
      addToast({ title: "Failed to delete activity", variant: "destructive" });
    }
  };

  const totalDuration = activities.reduce(
    (sum, a) => sum + a.duration_minutes,
    0,
  );
  const typeCounts: Record<string, number> = {};
  for (const a of activities) {
    const label = activityTypeLabel(a.activity_type, a.custom_activity_name);
    typeCounts[label] = (typeCounts[label] || 0) + 1;
  }
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => router.push("/client/me")}
              className="p-2 rounded-xl fc-glass hover:opacity-80 transition-opacity shrink-0"
              aria-label="Back to Me"
            >
              <ArrowLeft className="w-5 h-5 fc-text-primary" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold fc-text-primary tracking-tight">
                Activity
              </h1>
              <p className="text-sm fc-text-dim mt-0.5">
                Extra training beyond your program
              </p>
            </div>
          </div>

          <div
            className="flex rounded-xl border border-[color:var(--fc-glass-border)] p-1 gap-1"
            role="tablist"
            aria-label="Activity view"
          >
            {(
              [
                { value: "log" as const, label: "Log" },
                { value: "trends" as const, label: "Trends" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={tab === opt.value}
                onClick={() => setTab(opt.value)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-[0.1em] transition-colors",
                  tab === opt.value
                    ? "bg-[color-mix(in_srgb,var(--fc-accent)_20%,transparent)] text-[color:var(--fc-accent)]"
                    : "fc-text-dim hover:fc-text-primary",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {tab === "log" ? (
            <>
              {activities.length > 0 && (
                <div className="rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 text-center">
                      <p className="text-base font-semibold fc-text-primary tabular-nums">
                        {activities.length}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider fc-text-dim mt-0.5">
                        Activities
                      </p>
                    </div>
                    <div
                      className="w-px h-8 bg-[color:var(--fc-glass-border)] shrink-0"
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0 text-center">
                      <p className="text-base font-semibold fc-text-primary tabular-nums">
                        {totalDuration}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider fc-text-dim mt-0.5">
                        Minutes
                      </p>
                    </div>
                    <div
                      className="w-px h-8 bg-[color:var(--fc-glass-border)] shrink-0"
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0 text-center px-1">
                      <p className="text-base font-semibold fc-text-primary truncate">
                        {topType?.[0] ?? "—"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider fc-text-dim mt-0.5">
                        Top type
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label="Activity date range"
              >
                {(["week", "month", "all"] as FilterRange[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.1em] border transition-colors",
                      filter === f
                        ? "bg-[color-mix(in_srgb,var(--fc-accent)_20%,transparent)] text-[color:var(--fc-accent)] border-[color-mix(in_srgb,var(--fc-accent)_30%,transparent)]"
                        : "fc-glass-soft fc-text-dim border-[color:var(--fc-glass-border)] hover:fc-text-primary",
                    )}
                  >
                    {f === "week"
                      ? "This Week"
                      : f === "month"
                        ? "This Month"
                        : "All Time"}
                  </button>
                ))}
              </div>

              {loading ? (
                <PageSkeleton variant="list" />
              ) : loadError ? (
                <div className="py-8 px-4 text-center rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
                  <AlertTriangle
                    className="w-8 h-8 mx-auto text-[var(--fc-status-error)] mb-3"
                    strokeWidth={1.25}
                    aria-hidden
                  />
                  <p className="text-sm fc-text-dim mb-3">{loadError}</p>
                  <Button
                    type="button"
                    className="fc-btn fc-btn-primary"
                    onClick={() => void loadActivities()}
                  >
                    Retry
                  </Button>
                </div>
              ) : activities.length > 0 ? (
                <ActivityList
                  activities={activities}
                  onEdit={handleEdit}
                  onDelete={(id) => setPendingDeleteId(id)}
                />
              ) : (
                <div className="py-8 px-4 text-center">
                  <Activity
                    className="w-8 h-8 mx-auto fc-text-subtle mb-3"
                    strokeWidth={1.25}
                    aria-hidden
                  />
                  <p className="text-sm fc-text-dim">No activities yet</p>
                  <p className="text-xs fc-text-subtle mt-1">
                    {filter === "week"
                      ? "Log your first activity this week!"
                      : "Your activity log will appear here"}
                  </p>
                </div>
              )}
            </>
          ) : trendsLoading ? (
            <PageSkeleton variant="dashboard" />
          ) : trendsActivities.length > 0 ? (
            <ActivitiesCharts recentActivities={trendsActivities} />
          ) : (
            <div className="fc-card-shell p-6 flex justify-center">
              <EmptyState
                title="No activities logged"
                description="Log cardio, walks, or other activities to see charts here."
                actionLabel="Log activity"
                onAction={() => {
                  setEditingActivity(null);
                  setShowModal(true);
                }}
              />
            </div>
          )}
        </ClientPageShell>

        {tab === "log" ? (
          <button
            type="button"
            onClick={() => {
              setEditingActivity(null);
              setShowModal(true);
            }}
            className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-[var(--fc-accent)] text-white shadow-lg shadow-[color-mix(in_srgb,var(--fc-accent)_30%,transparent)] flex items-center justify-center hover:brightness-110 active:scale-95 transition-all"
            aria-label="Log activity"
          >
            <Plus className="w-6 h-6" aria-hidden />
          </button>
        ) : null}
      </AnimatedBackground>

      <LogActivityModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingActivity(null);
        }}
        onSave={handleSave}
        editingActivity={editingActivity}
      />

      <Dialog
        open={pendingDeleteId != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDeleteId(null);
        }}
      >
        <DialogContent className="max-w-md border border-[color:var(--fc-glass-border)]">
          <DialogHeader>
            <DialogTitle className="fc-text-primary">
              Delete activity?
            </DialogTitle>
            <DialogDescription className="fc-text-dim">
              This removes the activity from your log. You can&apos;t undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-lg sm:flex-1"
              disabled={deleting}
              onClick={() => setPendingDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 rounded-lg fc-btn fc-btn-primary sm:flex-1"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ActivityLogPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <Suspense
        fallback={
          <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
            <PageSkeleton variant="list" />
          </ClientPageShell>
        }
      >
        <ActivityHubContent />
      </Suspense>
    </ProtectedRoute>
  );
}
