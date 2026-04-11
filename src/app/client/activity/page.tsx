"use client";

import React, { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  ClientPageShell,
  ClientGlassCard,
  SectionHeader,
} from "@/components/client-ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { LogActivityModal } from "@/components/client/activity/LogActivityModal";
import { ActivityList } from "@/components/client/activity/ActivityList";
import {
  Activity,
  ArrowLeft,
  Plus,
  Clock,
  TrendingUp,
  Calendar,
} from "lucide-react";
import {
  logActivity,
  updateActivity,
  deleteActivity,
  getActivitiesByDateRange,
  getCurrentWeekBounds,
  ACTIVITY_META,
  type ClientActivity,
  type LogActivityInput,
} from "@/lib/clientActivityService";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

type FilterRange = "week" | "month" | "all";

function getDateRange(filter: FilterRange): { start: string; end: string } {
  const today = new Date();
  const end = today.toISOString().split("T")[0];

  if (filter === "week") {
    return getCurrentWeekBounds();
  }

  if (filter === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: start.toISOString().split("T")[0], end };
  }

  const start = new Date("2020-01-01");
  return { start: start.toISOString().split("T")[0], end };
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
        <ClientPageShell className="max-w-3xl flex flex-col gap-5 pb-32">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { window.location.href = "/client/me"; }}
              className="p-2 rounded-xl fc-glass hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5 fc-text-primary" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold fc-text-primary">
                Activity Log
              </h1>
              <p className="text-sm fc-text-dim">
                Track your extra training and activities
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          {activities.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <ClientGlassCard className="p-3 text-center">
                <TrendingUp className="w-4 h-4 fc-text-dim mx-auto mb-1" />
                <p className="text-lg font-bold fc-text-primary">
                  {activities.length}
                </p>
                <p className="text-[10px] fc-text-dim uppercase tracking-wide">
                  Activities
                </p>
              </ClientGlassCard>
              <ClientGlassCard className="p-3 text-center">
                <Clock className="w-4 h-4 fc-text-dim mx-auto mb-1" />
                <p className="text-lg font-bold fc-text-primary">
                  {totalDuration}
                </p>
                <p className="text-[10px] fc-text-dim uppercase tracking-wide">
                  Minutes
                </p>
              </ClientGlassCard>
              <ClientGlassCard className="p-3 text-center">
                <span className="text-base block mb-1">
                  {topType
                    ? (ACTIVITY_META[topType[0] as keyof typeof ACTIVITY_META]
                        ?.icon ?? "⭐")
                    : "—"}
                </span>
                <p className="text-lg font-bold fc-text-primary">
                  {topType?.[1] ?? 0}
                </p>
                <p className="text-[10px] fc-text-dim uppercase tracking-wide">
                  Top Type
                </p>
              </ClientGlassCard>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {(["week", "month", "all"] as FilterRange[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all",
                  filter === f
                    ? "bg-[color-mix(in_srgb,var(--fc-accent-cyan)_20%,transparent)] text-[color:var(--fc-accent-cyan)] border border-[color-mix(in_srgb,var(--fc-accent-cyan)_30%,transparent)]"
                    : "fc-surface border border-[color:var(--fc-glass-border)] fc-text-dim hover:opacity-80"
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
              {[1, 2, 3].map((i) => (
                <ClientGlassCard key={i} className="p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[color:var(--fc-glass-highlight)]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[color:var(--fc-glass-highlight)] rounded w-1/3" />
                      <div className="h-3 bg-[color:var(--fc-glass-highlight)] rounded w-1/2" />
                    </div>
                  </div>
                </ClientGlassCard>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <ActivityList
              activities={activities}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <ClientGlassCard className="p-12">
              <EmptyState
                icon={Activity}
                title="No activities yet"
                description={
                  filter === "week"
                    ? "Log your first activity this week!"
                    : "Your activity log will appear here"
                }
              />
            </ClientGlassCard>
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
