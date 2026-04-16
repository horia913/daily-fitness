"use client";

import React from "react";
import { Trash2, Pencil } from "lucide-react";
import {
  ACTIVITY_META,
  INTENSITY_META,
  type ActivityType,
  type ClientActivity,
} from "@/lib/clientActivityService";
import { cn } from "@/lib/utils";

type ActivityCategory = "cardio" | "strength" | "flexibility" | "other";

const ACTIVITY_TYPE_CATEGORY: Record<ActivityType, ActivityCategory> = {
  running: "cardio",
  jogging: "cardio",
  cycling: "cardio",
  swimming: "cardio",
  walking: "cardio",
  hiking: "cardio",
  yoga: "flexibility",
  stretching: "flexibility",
  sports: "strength",
  martial_arts: "strength",
  dance: "cardio",
  custom: "other",
};

const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  cardio: "Cardio",
  strength: "Strength",
  flexibility: "Flexibility",
  other: "Other",
};

function categoryPillClass(cat: ActivityCategory): string {
  switch (cat) {
    case "cardio":
      return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
    case "strength":
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "flexibility":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    default:
      return "bg-white/[0.06] text-gray-400 border-white/10";
  }
}

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
  const category =
    ACTIVITY_TYPE_CATEGORY[activity.activity_type] ?? "other";

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
    <div
      className={cn(
        "group rounded-xl border border-white/10 bg-white/[0.04] p-4"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-base font-semibold text-white tracking-tight min-w-0 pr-2">
          {displayName}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] border",
              categoryPillClass(category)
            )}
          >
            {CATEGORY_LABEL[category]}
          </span>
          <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(activity)}
              className="p-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5 text-gray-400" />
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
      </div>

      <div className="text-xs text-gray-500 mt-2 flex flex-wrap items-center gap-x-1.5">
        <span>{formatDate(activity.activity_date)}</span>
        <span className="text-gray-600">·</span>
        <span className="tabular-nums">{activity.duration_minutes} min</span>
        {activity.distance_km != null ? (
          <>
            <span className="text-gray-600">·</span>
            <span>
              <span className="tabular-nums">{activity.distance_km}</span> km
            </span>
          </>
        ) : null}
        <span className="text-gray-600">·</span>
        <span>{intensityMeta.label}</span>
      </div>

      {activity.notes ? (
        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mt-2">
          {activity.notes}
        </p>
      ) : null}
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
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            {formatDate(date)}
          </p>
          <div className="space-y-3">
            {grouped[date].map((a) => (
              <ActivityRow
                key={a.id}
                activity={a}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
