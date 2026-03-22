"use client";

import React from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { Activity, Clock, TrendingUp, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  ACTIVITY_META,
  type ClientActivity,
} from "@/lib/clientActivityService";

interface ActivityWeekSummaryProps {
  activities: ClientActivity[];
  onQuickAdd?: () => void;
  maxItems?: number;
}

export function ActivityWeekSummary({
  activities,
  onQuickAdd,
  maxItems = 4,
}: ActivityWeekSummaryProps) {
  if (activities.length === 0 && !onQuickAdd) return null;

  const totalDuration = activities.reduce(
    (sum, a) => sum + a.duration_minutes,
    0
  );
  const displayed = activities.slice(0, maxItems);
  const hasMore = activities.length > maxItems;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 fc-text-dim" />
          <h3 className="text-sm font-bold fc-text-primary">
            Other Activities This Week
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {onQuickAdd && (
            <button
              type="button"
              onClick={onQuickAdd}
              className="p-1.5 rounded-lg fc-surface border border-[color:var(--fc-glass-border)] hover:opacity-80 transition-opacity"
              title="Log activity"
            >
              <Plus className="w-3.5 h-3.5 fc-text-dim" />
            </button>
          )}
        </div>
      </div>

      {activities.length === 0 ? (
        <button
          type="button"
          onClick={onQuickAdd}
          className="w-full text-left rounded-xl p-4 fc-surface border border-dashed border-[color:var(--fc-glass-border)] hover:opacity-80 transition-opacity"
        >
          <p className="text-sm fc-text-dim text-center">
            Log a run, swim, or other activity
          </p>
        </button>
      ) : (
        <ClientGlassCard className="p-3">
          {/* Summary header */}
          {activities.length > 0 && (
            <div className="flex items-center gap-4 mb-2 pb-2 border-b border-[color:var(--fc-glass-border)]">
              <span className="text-xs fc-text-dim flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span className="text-cyan-400 font-bold tabular-nums">{activities.length}</span>
                <span>activit{activities.length === 1 ? "y" : "ies"}</span>
              </span>
              <span className="text-xs fc-text-dim flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="font-bold fc-text-primary tabular-nums">{totalDuration}</span>
                <span>min total</span>
              </span>
            </div>
          )}

          {/* Activity list */}
          <div className="space-y-1.5">
            {displayed.map((a) => {
              const meta =
                ACTIVITY_META[a.activity_type] ?? ACTIVITY_META.custom;
              const displayName =
                a.activity_type === "custom"
                  ? a.custom_activity_name ?? "Custom"
                  : meta.label;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-2.5 py-1"
                >
                  <span className="text-base shrink-0">{meta.icon}</span>
                  <span className="text-sm font-medium fc-text-primary flex-1 truncate">
                    {displayName}
                  </span>
                  <span className="text-xs fc-text-dim shrink-0">
                    {a.duration_minutes} min
                  </span>
                </div>
              );
            })}
          </div>

          {/* View all link */}
          {hasMore && (
            <Link
              href="/client/activity"
              className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-[color:var(--fc-glass-border)] text-xs font-medium text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              View all {activities.length} activities
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </ClientGlassCard>
      )}
    </div>
  );
}
