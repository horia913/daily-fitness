"use client";

import { cn } from "@/lib/utils";

const mono =
  "text-[8.5px] font-semibold uppercase tracking-[0.08em] rounded-[5px] px-[6px] py-[2px] border";
const monoFont = { fontFamily: "var(--f-mono, Geist Mono, monospace)" } as const;

function normType(raw: string): string {
  return (raw || "").toLowerCase().replace(/\s+/g, "_");
}

export function programEditSetTypeShortLabel(setType: string): string {
  const t = normType(setType);
  if (t === "straight_set" || t === "straight") return "Straight";
  if (t === "cluster_set") return "Cluster";
  if (t === "drop_set") return "Drop";
  if (t === "warm_up" || t === "warmup" || t === "warm_up_set") return "Warm-up";
  if (t === "optional") return "Optional";
  if (t === "superset") return "Superset";
  if (t === "giant_set") return "Giant";
  if (t === "pre_exhaustion" || t === "pre_exhaust") return "Pre-exh.";
  if (t === "rest_pause") return "Rest-pause";
  if (t === "amrap") return "AMRAP";
  if (t === "emom") return "EMOM";
  if (t === "emom_reps") return "EMOM";
  if (t === "for_time") return "For time";
  if (t === "tabata") return "Tabata";
  if (t === "speed_work") return "Speed";
  if (t === "endurance") return "Endurance";
  return setType.replace(/_/g, " ").slice(0, 14);
}

export function ProgramEditSetTypePill({
  setType,
  className,
}: {
  setType: string;
  className?: string;
}) {
  const t = normType(setType);
  const label = programEditSetTypeShortLabel(setType);

  if (t === "optional") {
    return (
      <span
        style={monoFont}
        className={cn(
          mono,
          "bg-white/[0.05] text-[rgba(255,255,255,0.42)] border-[rgba(255,255,255,0.08)]",
          className,
        )}
      >
        {label}
      </span>
    );
  }
  if (t === "warm_up" || t === "warmup" || t === "warm_up_set") {
    return (
      <span
        style={monoFont}
        className={cn(
          mono,
          "border-[rgba(52,211,153,0.25)] text-[#34D399] bg-[rgba(52,211,153,0.12)]",
          className,
        )}
      >
        {label}
      </span>
    );
  }
  if (t === "cluster_set") {
    return (
      <span
        style={monoFont}
        className={cn(
          mono,
          "border-[rgba(167,139,250,0.25)] text-[#A78BFA] bg-[rgba(167,139,250,0.12)]",
          className,
        )}
      >
        {label}
      </span>
    );
  }
  if (t === "drop_set") {
    return (
      <span
        style={monoFont}
        className={cn(
          mono,
          "border-[rgba(245,194,66,0.25)] text-[#F5C242] bg-[rgba(245,194,66,0.12)]",
          className,
        )}
      >
        {label}
      </span>
    );
  }
  if (
    t === "superset" ||
    t === "giant_set" ||
    t === "pre_exhaustion" ||
    t === "pre_exhaust"
  ) {
    return (
      <span
        style={monoFont}
        className={cn(
          mono,
          "border-[rgba(245,194,66,0.25)] text-[#F5C242] bg-[rgba(245,194,66,0.12)]",
          className,
        )}
      >
        {label}
      </span>
    );
  }
  if (t === "rest_pause") {
    return (
      <span
        style={monoFont}
        className={cn(
          mono,
          "border-[rgba(167,139,250,0.25)] text-[#A78BFA] bg-[rgba(167,139,250,0.12)]",
          className,
        )}
      >
        {label}
      </span>
    );
  }
  if (
    t === "amrap" ||
    t === "emom" ||
    t === "emom_reps" ||
    t === "for_time" ||
    t === "tabata" ||
    t === "speed_work" ||
    t === "endurance"
  ) {
    return (
      <span
        style={monoFont}
        className={cn(
          mono,
          "border-[rgba(52,211,153,0.25)] text-[#34D399] bg-[rgba(52,211,153,0.12)]",
          className,
        )}
      >
        {label}
      </span>
    );
  }
  if (t === "straight_set" || t === "straight") {
    return (
      <span
        style={monoFont}
        className={cn(
          mono,
          "border-[rgba(34, 211, 238, 0.18)] text-[color:var(--fc-group-c)] bg-[color:var(--fc-group-c-soft)]",
          className,
        )}
      >
        {label}
      </span>
    );
  }
  /* Fallback → cyan */
  return (
    <span
      style={monoFont}
      className={cn(
        mono,
        "border-[rgba(34, 211, 238, 0.18)] text-[color:var(--fc-group-c)] bg-[color:var(--fc-group-c-soft)]",
        className,
      )}
    >
      {label}
    </span>
  );
}
