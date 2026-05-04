"use client";

import React from "react";
import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  Waves,
  Mountain,
  Sparkles,
  Trophy,
  Heart,
  type LucideIcon,
} from "lucide-react";
import type { ActivityType, ClientActivity, Intensity } from "@/lib/clientActivityService";
import { ACTIVITY_META } from "@/lib/clientActivityService";
import styles from "./ActivityRow.module.css";

function activityIcon(type: ActivityType): LucideIcon {
  switch (type) {
    case "walking":
      return Footprints;
    case "running":
    case "jogging":
      return Activity;
    case "cycling":
      return Bike;
    case "swimming":
      return Waves;
    case "hiking":
      return Mountain;
    case "yoga":
    case "stretching":
      return Sparkles;
    case "sports":
      return Trophy;
    case "martial_arts":
      return Dumbbell;
    case "dance":
      return Heart;
    default:
      return Activity;
  }
}

function intensityPillClass(i: Intensity): string {
  if (i === "moderate") return styles.pillMod;
  if (i === "vigorous") return styles.pillVig;
  return styles.pill;
}

function intensityLabel(i: Intensity): string {
  if (i === "moderate") return "Moderate";
  if (i === "vigorous") return "Vigorous";
  return "Light";
}

type Props = { activity: ClientActivity };

export default function ActivityRow({ activity: a }: Props) {
  const meta = ACTIVITY_META[a.activity_type] ?? ACTIVITY_META.custom;
  const displayName =
    a.activity_type === "custom" ? a.custom_activity_name ?? "Custom" : meta.label;
  const Icon = activityIcon(a.activity_type);
  const dateStr = new Date(a.activity_date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const parts = [`${dateStr}`, `${a.duration_minutes}min`];
  if (a.distance_km != null && String(a.distance_km).trim() !== "") {
    parts.push(`${a.distance_km}km`);
  }
  if (a.notes?.trim()) {
    parts.push(a.notes.trim());
  }
  return (
    <div className={styles.row}>
      <div className={styles.icon}>
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </div>
      <div className={styles.meta}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{displayName}</span>
          <span className={`${styles.pill} ${intensityPillClass(a.intensity)}`.trim()}>
            {intensityLabel(a.intensity)}
          </span>
        </div>
        <div className={styles.stats}>{parts.join(" · ")}</div>
      </div>
    </div>
  );
}
