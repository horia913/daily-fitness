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
      return "bg-[color-mix(in_srgb,var(--fc-accent)_20%,transparent)] text-[color:var(--fc-accent)] border-[color-mix(in_srgb,var(--fc-accent)_30%,transparent)]";
    case "strength":
      return "bg-[color-mix(in_srgb,var(--fc-status-warning)_20%,transparent)] text-[color:var(--fc-status-warning)] border-[color-mix(in_srgb,var(--fc-status-warning)_30%,transparent)]";
    case "flexibility":
      return "bg-[color-mix(in_srgb,var(--fc-status-success)_20%,transparent)] text-[color:var(--fc-status-success)] border-[color-mix(in_srgb,var(--fc-status-success)_30%,transparent)]";
    default:
      return "bg-[color:var(--fc-glass-highlight)] fc-text-dim border-[color:var(--fc-glass-border)]";
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
        "group rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] p-4"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-base font-semibold fc-text-primary tracking-tight min-w-0 pr-2">
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
              className="p-1.5 rounded-lg hover:bg-[color-mix(in_srgb,var(--fc-accent)_10%,transparent)] transition-colors"
              aria-label={`Edit ${displayName}`}
            >
              <Pencil className="w-3.5 h-3.5 fc-text-dim" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onDelete(activity.id)}
              className="p-1.5 rounded-lg hover:bg-[color-mix(in_srgb,var(--fc-status-error)_10%,transparent)] transition-colors"
              aria-label={`Delete ${displayName}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-[color:var(--fc-status-error)]" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs fc-text-subtle mt-2 flex flex-wrap items-center gap-x-1.5">
        <span>{formatDate(activity.activity_date)}</span>
        <span className="fc-text-subtle">·</span>
        <span className="tabular-nums">{activity.duration_minutes} min</span>
        {activity.distance_km != null ? (
          <>
            <span className="fc-text-subtle">·</span>
            <span>
              <span className="tabular-nums">{activity.distance_km}</span> km
            </span>
          </>
        ) : null}
        <span className="fc-text-subtle">·</span>
        <span>{intensityMeta.label}</span>
      </div>

      {activity.notes ? (
        <p className="text-sm fc-text-dim leading-relaxed line-clamp-2 mt-2">
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
          <p className="text-xs font-semibold uppercase tracking-wider fc-text-subtle mb-2">
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
