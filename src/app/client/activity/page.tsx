"use client";

import React, { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { LogActivityModal } from "@/components/client/activity/LogActivityModal";
import { ActivityList } from "@/components/client/activity/ActivityList";
import { Activity, ArrowLeft, Plus } from "lucide-react";
import {
  logActivity,
  updateActivity,
  deleteActivity,
  getActivitiesByDateRange,
  getCurrentWeekBounds,
  toLocalDateString,
  type ClientActivity,
  type LogActivityInput,
} from "@/lib/clientActivityService";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

type FilterRange = "week" | "month" | "all";

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

function ActivityHubContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const { addToast } = useToast();

  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterRange>("week");
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ClientActivity | null>(
    null
  );

  const loadActivities = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { start, end } = getDateRange(filter);
      const data = await getActivitiesByDateRange(user.id, start, end);
      setActivities(data);
    } catch (err) {
      console.error("Failed to load activities:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, filter]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleSave = async (input: LogActivityInput) => {
    if (!user?.id) return;
    if (editingActivity) {
      const updated = await updateActivity(editingActivity.id, input);
      if (updated) {
        addToast({ title: "Activity updated", variant: "default" });
        await loadActivities();
      } else {
        addToast({ title: "Failed to update activity", variant: "destructive" });
      }
    } else {
      const created = await logActivity(user.id, input);
      if (created) {
        addToast({ title: "Activity logged!", variant: "default" });
        await loadActivities();
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

  const handleDelete = async (activityId: string) => {
    const ok = await deleteActivity(activityId);
    if (ok) {
      addToast({ title: "Activity deleted", variant: "default" });
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    } else {
      addToast({ title: "Failed to delete activity", variant: "destructive" });
    }
  };

  const totalDuration = activities.reduce(
    (sum, a) => sum + a.duration_minutes,
    0
  );
  const typeCounts: Record<string, number> = {};
  for (const a of activities) {
    typeCounts[a.activity_type] = (typeCounts[a.activity_type] || 0) + 1;
  }
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => { window.location.href = "/client/me"; }}
              className="p-2 rounded-xl fc-glass hover:opacity-80 transition-opacity shrink-0"
            >
              <ArrowLeft className="w-5 h-5 fc-text-primary" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Activity Log
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Track your extra training and activities
              </p>
            </div>
          </div>

          {/* Stats strip */}
          {activities.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 text-center">
                  <p className="text-base font-semibold text-white tabular-nums">
                    {activities.length}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
                    Activities
                  </p>
                </div>
                <div className="w-px h-8 bg-white/10 shrink-0" aria-hidden />
                <div className="flex-1 min-w-0 text-center">
                  <p className="text-base font-semibold text-white tabular-nums">
                    {totalDuration}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
                    Minutes
                  </p>
                </div>
                <div className="w-px h-8 bg-white/10 shrink-0" aria-hidden />
                <div className="flex-1 min-w-0 text-center">
                  <p className="text-base font-semibold text-white tabular-nums">
                    {topType?.[1] ?? 0}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
                    Top type
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(["week", "month", "all"] as FilterRange[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.1em] border transition-colors",
                  filter === f
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                    : "bg-white/[0.03] text-gray-400 border-white/10"
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

          {/* Activity List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 animate-pulse"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="h-4 bg-white/10 rounded w-[45%]" />
                    <div className="h-5 bg-white/10 rounded-full w-16 shrink-0" />
                  </div>
                  <div className="h-3 bg-white/10 rounded w-[75%] mt-2" />
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <ActivityList
              activities={activities}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <div className="py-8 px-4 text-center">
              <Activity
                className="w-8 h-8 mx-auto text-gray-600 mb-3"
                strokeWidth={1.25}
                aria-hidden
              />
              <p className="text-sm text-gray-400">No activities yet</p>
              <p className="text-xs text-gray-500 mt-1">
                {filter === "week"
                  ? "Log your first activity this week!"
                  : "Your activity log will appear here"}
              </p>
            </div>
          )}
        </ClientPageShell>

        {/* FAB */}
        <button
          type="button"
          onClick={() => {
            setEditingActivity(null);
            setShowModal(true);
          }}
          className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-[var(--fc-accent-cyan)] text-white shadow-lg shadow-[color-mix(in_srgb,var(--fc-accent-cyan)_30%,transparent)] flex items-center justify-center hover:brightness-110 active:scale-95 transition-all"
          title="Log activity"
        >
          <Plus className="w-6 h-6" />
        </button>
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
    </>
  );
}

export default function ActivityLogPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <ActivityHubContent />
    </ProtectedRoute>
  );
}
