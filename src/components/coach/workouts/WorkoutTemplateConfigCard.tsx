"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlignJustify,
  Link2,
  Clock,
  TrendingDown,
  ArrowUpRightFromSquare,
  Layers,
  ChevronsRight,
  RefreshCw,
  Star,
  Activity,
  Timer,
} from "lucide-react";
import wt from "./workoutTemplateEditV1.module.css";
import {
  workoutTemplateSetTypeAccent,
  type WorkoutTemplateSetAccent,
} from "./workoutTemplateSetTypeAccent";
import { cn } from "@/lib/utils";

function normType(raw: string) {
  return (raw || "").toLowerCase().replace(/\s+/g, "_");
}

const CONFIG_COPY: Record<
  string,
  { eyebrow: string; title: string; description: string; Icon: LucideIcon }
> = {
  straight_set: {
    eyebrow: "Resistance",
    title: "Straight Set",
    description:
      "Classic sets and reps with prescribed rest between completed sets.",
    Icon: AlignJustify,
  },
  cluster_set: {
    eyebrow: "Cluster",
    title: "Cluster Set",
    description:
      "Mini clusters of reps with short intra-cluster rest before the set completes.",
    Icon: Link2,
  },
  rest_pause: {
    eyebrow: "Intensity",
    title: "Rest-Pause",
    description:
      "Brief pauses mid-set to squeeze out extra reps at the same load.",
    Icon: Clock,
  },
  drop_set: {
    eyebrow: "Intensity",
    title: "Drop Set",
    description:
      "Reduce load or shift reps after the initial work without a full recovery.",
    Icon: TrendingDown,
  },
  superset: {
    eyebrow: "Superset",
    title: "Superset",
    description:
      "Pair exercises back-to-back; rest only after both movements are done.",
    Icon: ArrowUpRightFromSquare,
  },
  giant_set: {
    eyebrow: "Circuit",
    title: "Giant Set",
    description:
      "Three or more movements in a row before you take a full rest period.",
    Icon: Layers,
  },
  pre_exhaustion: {
    eyebrow: "Pre-fatigue",
    title: "Pre-Exhaustion",
    description:
      "Isolation work first, then a compound lift to overload the target tissue.",
    Icon: ChevronsRight,
  },
  amrap: {
    eyebrow: "Conditioning",
    title: "AMRAP",
    description:
      "As many quality rounds or reps as possible inside the time window.",
    Icon: RefreshCw,
  },
  emom: {
    eyebrow: "Conditioning",
    title: "EMOM",
    description:
      "Every minute: complete the work or reps, then rest the remainder.",
    Icon: Clock,
  },
  emom_reps: {
    eyebrow: "Conditioning",
    title: "EMOM",
    description:
      "Every minute: complete the work or reps, then rest the remainder.",
    Icon: Clock,
  },
  for_time: {
    eyebrow: "Conditioning",
    title: "For Time",
    description: "Hit the rep target before the time cap runs out.",
    Icon: Star,
  },
  tabata: {
    eyebrow: "Conditioning",
    title: "Tabata",
    description:
      "Short work intervals paired with short rests for dense conditioning blocks.",
    Icon: Activity,
  },
  speed_work: {
    eyebrow: "Speed",
    title: "Speed Work",
    description: "Short high-velocity efforts with structured recovery.",
    Icon: RefreshCw,
  },
  endurance: {
    eyebrow: "Endurance",
    title: "Endurance",
    description: "Longer efforts paced by time, distance, or heart rate.",
    Icon: Activity,
  },
  timed_set: {
    eyebrow: "Timed",
    title: "Timed Set",
    description: "Sets of timed work with rest between sets (e.g. plank, jump rope).",
    Icon: Timer,
  },
};

function accentTextClass(a: WorkoutTemplateSetAccent) {
  if (a === "cyan") return wt.textAccentCyan;
  if (a === "purple") return wt.textAccentPurple;
  if (a === "warning") return wt.textAccentWarning;
  return wt.textAccentGood;
}

function stripeClass(a: WorkoutTemplateSetAccent) {
  if (a === "cyan") return wt.stripeCyan;
  if (a === "purple") return wt.stripePurple;
  if (a === "warning") return wt.stripeWarning;
  return wt.stripeGood;
}

function tileClass(a: WorkoutTemplateSetAccent) {
  if (a === "cyan") return wt.tileCyan;
  if (a === "purple") return wt.tilePurple;
  if (a === "warning") return wt.tileWarning;
  return wt.tileGood;
}

export function WorkoutTemplateConfigCard({
  exerciseType,
  children,
}: {
  exerciseType: string;
  children: React.ReactNode;
}) {
  const t = normType(exerciseType);
  const meta = CONFIG_COPY[t] || CONFIG_COPY.straight_set;
  const accent = workoutTemplateSetTypeAccent(t);
  const Icon = meta.Icon;

  return (
    <div className={wt.configCard}>
      <div className={cn(wt.configStripe, stripeClass(accent))} aria-hidden />
      <div className={wt.configHead}>
        <div className={cn(wt.configIconTile, tileClass(accent))}>
          <Icon className="w-[15px] h-[15px]" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
          <div className={cn(wt.configEyebrow, accentTextClass(accent))}>
            {meta.eyebrow}
          </div>
          <div className={wt.configTitle}>{meta.title}</div>
          <p className={wt.configDesc}>{meta.description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
