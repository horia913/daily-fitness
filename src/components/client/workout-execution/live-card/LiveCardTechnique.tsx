"use client";

import type { ReactNode } from "react";
import styles from "./liveCard.module.css";

/** Technique instruction block — only render when technique is present. */
export function LiveCardTechnique({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.tech}>
      <div className={styles.tl}>{title}</div>
      <div className={styles.tt}>{children}</div>
    </div>
  );
}

/** Client-facing coach note slot — below technique when exercise has notes. */
export function LiveCardNote({ children }: { children: ReactNode }) {
  return (
    <div className={styles.notes}>
      <span className={styles.nl}>Note</span>
      <span className={styles.nt}>{children}</span>
    </div>
  );
}

export function formatDropTechniqueBody(
  dropPercentage: number | null | undefined,
): ReactNode {
  const pct =
    dropPercentage != null && Number.isFinite(Number(dropPercentage))
      ? String(dropPercentage)
      : "—";
  return (
    <>
      After your reps, drop <b>{pct}%</b> and go again to failure.
    </>
  );
}

export function formatClusterTechniqueBody(opts: {
  repsPerCluster?: number | null;
  intraRest?: number | null;
  clustersPerSet?: number | null;
}): ReactNode {
  const reps = opts.repsPerCluster ?? "—";
  const rest = opts.intraRest ?? "—";
  const clusters = opts.clustersPerSet ?? "—";
  return (
    <>
      Do <b>{reps} reps</b>, rest <b>{rest} s</b> — <b>{clusters} times</b>{" "}
      through, same load.
    </>
  );
}

export function formatRestPauseTechniqueBody(opts: {
  pauseSeconds?: number | null;
  maxPauses?: number | null;
}): ReactNode {
  const pause = opts.pauseSeconds ?? "—";
  const bursts = opts.maxPauses ?? "—";
  return (
    <>
      To failure, rest <b>{pause} s</b>, go again — <b>{bursts} bursts</b> total.
    </>
  );
}
