"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ArrowLeft,
  Activity,
  Clock,
  TrendingUp,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import {
  getClientActivitiesForCoach,
  ACTIVITY_META,
  INTENSITY_META,
  type ClientActivity,
} from "@/lib/clientActivityService";

function CoachClientActivitiesContent() {
  const params = useParams();
  const clientId = params.id as string;
  const { performanceSettings } = useTheme();

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
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="relative z-10 mx-auto w-full max-w-4xl fc-page p-4 sm:p-6 pb-32">
        <Link href={`/coach/clients/${clientId}`} className="inline-flex mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="fc-btn fc-btn-ghost"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Client
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold fc-text-primary">
              Extra Activities
            </h1>
            <p className="text-sm fc-text-dim">
              Activities logged by the client outside their workout program
            </p>
          </div>
        </div>

        {/* Summary */}
        {!loading && activities.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <GlassCard elevation={1} className="fc-glass fc-card p-4 text-center">
              <TrendingUp className="w-4 h-4 fc-text-dim mx-auto mb-1" />
              <p className="text-xl font-bold fc-text-primary">
                {activities.length}
              </p>
              <p className="text-xs fc-text-dim">Activities</p>
            </GlassCard>
            <GlassCard elevation={1} className="fc-glass fc-card p-4 text-center">
              <Clock className="w-4 h-4 fc-text-dim mx-auto mb-1" />
              <p className="text-xl font-bold fc-text-primary">
                {totalDuration}
              </p>
              <p className="text-xs fc-text-dim">Total Minutes</p>
            </GlassCard>
          </div>
        )}

        {/* Activity List */}
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
              const meta =
                ACTIVITY_META[a.activity_type] ?? ACTIVITY_META.custom;
              const intensityMeta = INTENSITY_META[a.intensity];
              const displayName =
                a.activity_type === "custom"
                  ? a.custom_activity_name ?? "Custom"
                  : meta.label;
              const dateStr = new Date(
                a.activity_date + "T00:00:00"
              ).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });

              return (
                <GlassCard
                  key={a.id}
                  elevation={1}
                  className="fc-glass fc-card p-4"
                >
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
                        <p className="text-xs fc-text-dim mt-1 line-clamp-2">
                          {a.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        ) : (
          <GlassCard elevation={1} className="fc-glass fc-card p-12">
            <EmptyState
              icon={Activity}
              title="No extra activities"
              description="This client hasn't logged any extra activities yet."
            />
          </GlassCard>
        )}
      </div>
    </AnimatedBackground>
  );
}

export default function CoachClientActivitiesPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <CoachClientActivitiesContent />
    </ProtectedRoute>
  );
}
