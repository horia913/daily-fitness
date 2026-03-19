/**
 * Exercise Icon Mapping Utility
 *
 * Deterministic Lucide icon selection for exercises based on available data.
 *
 * PRIORITY ORDER (waterfall):
 *   1. Primary muscle group name (most specific — when available)
 *   2. Exercise category (always available on exercises table)
 *   3. Default fallback (Dumbbell)
 *
 * DATA AVAILABILITY:
 *   - `category`  → text, NOT NULL on exercises table — always present
 *   - `primary_muscle_group` → text, only present when joined to muscle_groups table
 *   - `primary_muscle_group_id` → uuid FK — always present but requires join for name
 *
 * USAGE:
 *   import { getExerciseIconName } from "@/lib/exerciseIconMap";
 *   const iconName = getExerciseIconName({ category: "Strength", primaryMuscleGroup: "Chest" });
 *   // → "dumbbell" (or use EXERCISE_ICON_COMPONENTS for the component directly)
 */

import {
  Dumbbell,
  Heart,
  Zap,
  Target,
  Trophy,
  Shield,
  type LucideIcon,
} from "lucide-react";

// ─── MUSCLE GROUP → ICON ───────────────────────────────────────────────
// Maps standard muscle group names (from muscleGroups.ts) to Lucide icons.
// When primary_muscle_group is available, this provides the most meaningful icon.

export const MUSCLE_GROUP_ICONS: Record<string, LucideIcon> = {
  // Upper body — push
  "Chest":      Dumbbell,
  "Shoulders":  Target,
  "Triceps":    Zap,

  // Upper body — pull
  "Back":       Dumbbell,
  "Lats":       Dumbbell,
  "Biceps":     Dumbbell,
  "Forearms":   Dumbbell,
  "Traps":      Dumbbell,

  // Lower body
  "Quads":      Dumbbell,
  "Hamstrings": Dumbbell,
  "Glutes":     Dumbbell,
  "Calves":     Dumbbell,

  // Core
  "Core":       Zap,
  "Abs":        Zap,

  // Compound
  "Full Body":  Dumbbell,
};

// ─── EXERCISE CATEGORY → ICON ──────────────────────────────────────────
// Maps exercise.category (text, NOT NULL) to Lucide icons.
// These are the same categories used on the coach Exercise Library.

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Strength":       Dumbbell,
  "Cardio":         Heart,
  "Flexibility":    Zap,
  "Balance":        Target,
  "Sports":         Trophy,
  "Rehabilitation": Shield,
};

// ─── CATEGORY → COLOR ──────────────────────────────────────────────────
// Accent colors per category for icon backgrounds / tinting.

export const CATEGORY_COLORS: Record<string, string> = {
  "Strength":       "#3B82F6",  // blue
  "Cardio":         "#EF4444",  // red
  "Flexibility":    "#A855F7",  // purple
  "Balance":        "#F59E0B",  // amber
  "Sports":         "#22C55E",  // green
  "Rehabilitation": "#06B6D4",  // cyan
};

// ─── MUSCLE GROUP → COLOR ──────────────────────────────────────────────
// Accent colors grouped by body region.

export const MUSCLE_GROUP_COLORS: Record<string, string> = {
  // Upper push
  "Chest":      "#3B82F6",
  "Shoulders":  "#6366F1",
  "Triceps":    "#8B5CF6",

  // Upper pull
  "Back":       "#0EA5E9",
  "Lats":       "#0EA5E9",
  "Biceps":     "#06B6D4",
  "Forearms":   "#14B8A6",
  "Traps":      "#0EA5E9",

  // Lower body
  "Quads":      "#22C55E",
  "Hamstrings": "#16A34A",
  "Glutes":     "#84CC16",
  "Calves":     "#65A30D",

  // Core
  "Core":       "#F97316",
  "Abs":        "#F97316",

  // Compound
  "Full Body":  "#EAB308",
};

// ─── PUBLIC API ────────────────────────────────────────────────────────

interface ExerciseIconInput {
  category?: string | null;
  primaryMuscleGroup?: string | null;
}

/**
 * Returns the Lucide icon component for an exercise.
 * Priority: muscle group → category → Dumbbell fallback.
 */
export function getExerciseIcon(input: ExerciseIconInput): LucideIcon {
  if (input.primaryMuscleGroup) {
    const mgIcon = MUSCLE_GROUP_ICONS[input.primaryMuscleGroup];
    if (mgIcon) return mgIcon;
  }

  if (input.category) {
    const catIcon = CATEGORY_ICONS[input.category];
    if (catIcon) return catIcon;
  }

  return Dumbbell;
}

/**
 * Returns the accent color for an exercise.
 * Priority: muscle group color → category color → default blue.
 */
export function getExerciseColor(input: ExerciseIconInput): string {
  if (input.primaryMuscleGroup) {
    const mgColor = MUSCLE_GROUP_COLORS[input.primaryMuscleGroup];
    if (mgColor) return mgColor;
  }

  if (input.category) {
    const catColor = CATEGORY_COLORS[input.category];
    if (catColor) return catColor;
  }

  return "#3B82F6";
}

/**
 * Returns both icon and color for an exercise in one call.
 */
export function getExerciseVisuals(input: ExerciseIconInput): {
  Icon: LucideIcon;
  color: string;
} {
  return {
    Icon: getExerciseIcon(input),
    color: getExerciseColor(input),
  };
}
