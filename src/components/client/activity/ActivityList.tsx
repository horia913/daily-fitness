"use client";

import React from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { Trash2, Pencil, Clock, MapPin } from "lucide-react";
import {
  ACTIVITY_META,
  INTENSITY_META,
  type ClientActivity,
} from "@/lib/clientActivityService";
import { cn } from "@/lib/utils";

interface ActivityListProps {
  activities: ClientActivity[];
  onEdit: (activity: ClientActivity) => void;
  onDelete: (activityId: string) => void;
  compact?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function groupByDate(
  activities: ClientActivity[]
): Record<string, ClientActivity[]> {
  const groups: Record<string, ClientActivity[]> = {};
  for (const a of activities) {
    if (!groups[a.activity_date]) groups[a.activity_date] = [];
    groups[a.activity_date].push(a);
  }
  return groups;
}

function ActivityRow({
  activity,
  onEdit,
  onDelete,
  compact,
}: {
  activity: ClientActivity;
  onEdit: (a: ClientActivity) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const meta = ACTIVITY_META[activity.activity_type] ?? ACTIVITY_META.custom;
  const intensityMeta = INTENSITY_META[activity.intensity];
  const displayName =
    activity.activity_type === "custom"
      ? activity.custom_activity_name ?? "Custom"
      : meta.label;

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="text-lg shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium fc-text-primary truncate block">
            {displayName}
          </span>
        </div>
        <span className="text-xs fc-text-dim shrink-0">
          {activity.duration_minutes} min
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-3 group">
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
          <span className="text-xs fc-text-dim flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {activity.duration_minutes} min
          </span>
          {activity.distance_km && (
            <span className="text-xs fc-text-dim flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {activity.distance_km} km
            </span>
          )}
        </div>

        {activity.notes && (
          <p className="text-xs fc-text-dim mt-1 line-clamp-1">
            {activity.notes}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          onClick={() => onEdit(activity)}
          className="p-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors"
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5 fc-text-dim" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(activity.id)}
          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}

export function ActivityList({
  activities,
  onEdit,
  onDelete,
  compact = false,
}: ActivityListProps) {
  if (compact) {
    return (
      <div className="divide-y divide-[color:var(--fc-glass-border)]">
        {activities.map((a) => (
          <ActivityRow
            key={a.id}
            activity={a}
            onEdit={onEdit}
            onDelete={onDelete}
            compact
          />
        ))}
      </div>
    );
  }

  const grouped = groupByDate(activities);
  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedDates.map((date) => (
        <div key={date}>
          <p className="text-xs font-semibold fc-text-dim uppercase tracking-wider mb-1 px-1">
            {formatDate(date)}
          </p>
          <ClientGlassCard className="p-3">
            <div className="divide-y divide-[color:var(--fc-glass-border)]">
              {grouped[date].map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </ClientGlassCard>
        </div>
      ))}
    </div>
  );
}
