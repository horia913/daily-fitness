"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Activity, Clock, TrendingUp, MapPin } from "lucide-react";
import {
  getClientActivitiesForCoach,
  ACTIVITY_META,
  INTENSITY_META,
  type ClientActivity,
} from "@/lib/clientActivityService";

export type CoachClientActivitiesPanelProps = {
  clientId: string;
  showPageHeader?: boolean;
};

export function CoachClientActivitiesPanel({
  clientId,
  showPageHeader = true,
}: CoachClientActivitiesPanelProps) {
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClientActivitiesForCoach(clientId, 50);
      setActivities(data);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const totalDuration = activities.reduce(
    (sum, a) => sum + a.duration_minutes,
    0
  );

  return (
    <div className={showPageHeader ? "mx-auto w-full max-w-4xl fc-page" : "w-full"}>
      {showPageHeader && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold fc-text-primary">Extra Activities</h1>
              <p className="text-sm fc-text-dim">
                Activities logged by the client outside their workout program
              </p>
            </div>
          </div>
        </>
      )}

      {!showPageHeader && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold fc-text-primary">Extra activities</h2>
            <p className="text-xs fc-text-dim">Outside programmed workouts</p>
          </div>
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <GlassCard elevation={1} className="fc-card-shell p-4 text-center">
            <TrendingUp className="w-4 h-4 fc-text-dim mx-auto mb-1" />
            <p className="text-xl font-bold fc-text-primary">{activities.length}</p>
            <p className="text-xs fc-text-dim">Activities</p>
          </GlassCard>
          <GlassCard elevation={1} className="fc-card-shell p-4 text-center">
            <Clock className="w-4 h-4 fc-text-dim mx-auto mb-1" />
            <p className="text-xl font-bold fc-text-primary">{totalDuration}</p>
            <p className="text-xs fc-text-dim">Total Minutes</p>
          </GlassCard>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-[color:var(--fc-glass-highlight)] animate-pulse"
            />
          ))}
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-2">
          {activities.map((a) => {
            const meta = ACTIVITY_META[a.activity_type] ?? ACTIVITY_META.custom;
            const intensityMeta = INTENSITY_META[a.intensity];
            const displayName =
              a.activity_type === "custom"
                ? a.custom_activity_name ?? "Custom"
                : meta.label;
            const dateStr = new Date(a.activity_date + "T00:00:00").toLocaleDateString(
              "en-US",
              { weekday: "short", month: "short", day: "numeric" }
            );

            return (
              <GlassCard key={a.id} elevation={1} className="px-2 py-2 border-b border-[color:var(--fc-glass-border)] rounded-none last:border-b-0">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                    style={{ backgroundColor: `${meta.color}15` }}
                  >
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold fc-text-primary truncate">
                        {displayName}
                      </span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${intensityMeta.color}20`,
                          color: intensityMeta.color,
                        }}
                      >
                        {intensityMeta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs fc-text-dim">{dateStr}</span>
                      <span className="text-xs fc-text-dim flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {a.duration_minutes} min
                      </span>
                      {a.distance_km && (
                        <span className="text-xs fc-text-dim flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {a.distance_km} km
                        </span>
                      )}
                    </div>
                    {a.notes && (
                      <p className="text-xs fc-text-dim mt-1 line-clamp-2">{a.notes}</p>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <GlassCard elevation={1} className="fc-card-shell p-12">
          <EmptyState
            icon={Activity}
            title="No extra activities"
            description="This client hasn't logged any extra activities yet."
          />
        </GlassCard>
      )}
    </div>
  );
}
