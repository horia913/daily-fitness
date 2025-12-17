import clsx from "clsx";

type SupportedBlockType =
  | "straight_set"
  | "straight_sets"
  | "superset"
  | "drop_set"
  | "circuit"
  | "density"
  | "density_training"
  | "giant_set"
  | "rest_pause"
  | "cluster_set"
  | "pyramid_set"
  | "ladder"
  | "amrap"
  | "emom"
  | "tabata"
  | "for_time";

const TYPE_STYLES: Record<
  SupportedBlockType,
  { label: string; className: string }
> = {
  straight_set: {
    label: "STRAIGHT SETS",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  straight_sets: {
    label: "STRAIGHT SETS",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  superset: {
    label: "SUPERSETS",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  drop_set: {
    label: "DROPSETS",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  circuit: {
    label: "CIRCUITS",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  density: {
    label: "DENSITY",
    className:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200",
  },
  density_training: {
    label: "DENSITY",
    className:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200",
  },
  giant_set: {
    label: "GIANT SET",
    className:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  },
  rest_pause: {
    label: "REST-PAUSE",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  },
  cluster_set: {
    label: "CLUSTER SET",
    className:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  },
  pyramid_set: {
    label: "PYRAMID SET",
    className:
      "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  },
  ladder: {
    label: "LADDER",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  amrap: {
    label: "AMRAP",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  emom: {
    label: "EMOM",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  tabata: {
    label: "TABATA",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  for_time: {
    label: "FOR TIME",
    className:
      "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300",
  },
};

const DEFAULT_STYLE = {
  label: "WORKOUT",
  className:
    "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200",
};

export interface TypeBadgeProps {
  blockType?: string | null;
  label?: string | null;
  className?: string;
}

function formatLabel(label?: string | null, fallback?: string) {
  if (label && label.trim().length > 0) {
    return label.trim().toUpperCase();
  }
  if (fallback && fallback.trim().length > 0) {
    return fallback.trim().toUpperCase();
  }
  return DEFAULT_STYLE.label;
}

export function TypeBadge({ blockType, label, className }: TypeBadgeProps) {
  const normalized = (blockType || "straight_set").toLowerCase() as
    | SupportedBlockType
    | undefined;

  const style = (normalized && TYPE_STYLES[normalized]) || DEFAULT_STYLE;
  const fallbackLabelFromType =
    blockType?.replace(/_/g, " ").replace(/\s+/g, " ") ?? undefined;
  const displayLabel =
    style === DEFAULT_STYLE
      ? formatLabel(label, fallbackLabelFromType)
      : style.label;

  return (
    <span
      className={clsx(
        "text-xs font-semibold rounded-full px-3 py-1 inline-block tracking-wide uppercase",
        style.className,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}

export function getTypeBadgeLabel(type?: string | null) {
  const normalized = (type || "straight_set").toLowerCase() as
    | SupportedBlockType
    | undefined;
  const style = (normalized && TYPE_STYLES[normalized]) || DEFAULT_STYLE;
  return style.label;
}
