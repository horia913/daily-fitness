"use client";

import { cn } from "@/lib/utils";
import styles from "./liveCard.module.css";

function RestIcon() {
  return (
    <svg className={styles.ico} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v3.5l2.4 1.8" />
      <path d="M9.5 2.5h5" />
    </svg>
  );
}

function TempoIcon() {
  return (
    <svg className={styles.ico} viewBox="0 0 24 24" aria-hidden>
      <path d="M8.5 21h7l-2-17h-3z" />
      <path d="M12 6v10" />
    </svg>
  );
}

function LastIcon() {
  return (
    <svg className={styles.ico} viewBox="0 0 24 24" aria-hidden>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.7-6.2" />
      <path d="M3 4.5V9h4.5" />
    </svg>
  );
}

function PaceIcon() {
  return (
    <svg className={styles.ico} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </svg>
  );
}

function StatCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
}) {
  const empty = !value;
  return (
    <div className={styles.stat}>
      <div className={styles.sh}>
        {icon}
        <span className={styles.slbl}>{label}</span>
      </div>
      <span className={cn(styles.sval, empty && styles.svalNa)}>
        {empty ? "—" : value}
      </span>
    </div>
  );
}

/**
 * Fixed 3-col strip. Default labels: Rest · Tempo · Last.
 * Measurement variants override the middle label (Load / Pace) — values prop
 * stays `tempo` for backward compatibility with existing callers.
 */
export function LiveCardStats({
  rest,
  tempo,
  last,
  middleLabel = "Tempo",
}: {
  rest: string | null;
  /** Middle-column value (tempo / load / pace). */
  tempo: string | null;
  last: string | null;
  /** Override middle label: "Tempo" | "Load" | "Pace". */
  middleLabel?: "Tempo" | "Load" | "Pace" | string;
}) {
  const middleIcon =
    middleLabel === "Pace" ? <PaceIcon /> : <TempoIcon />;
  return (
    <div className={styles.stats}>
      <StatCell label="Rest" value={rest} icon={<RestIcon />} />
      <StatCell label={middleLabel} value={tempo} icon={middleIcon} />
      <StatCell label="Last" value={last} icon={<LastIcon />} />
    </div>
  );
}
