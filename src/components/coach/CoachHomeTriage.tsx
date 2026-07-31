"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchApi } from "@/lib/apiClient";
import type {
  CoachInsightsBriefing,
  CoachInsightsTriage,
} from "@/lib/coachInsightsBundle";
import {
  CoachHomeQueueSection,
  CoachHomeTodayRow,
} from "@/components/coach/home/CoachHomeQueues";
import {
  coachHomeDateLine,
  coachTimeGreeting,
  statValueColor,
} from "@/components/coach/home/coachHomeUtils";
import styles from "@/components/coach/home/coachHomePage.module.css";

type TriageResponse = {
  briefing: CoachInsightsBriefing;
  triage: CoachInsightsTriage;
};

const ON_TRACK_PREVIEW = 8;

function StatCell({
  value,
  denominator,
  label,
  valueColor,
}: {
  value: number;
  denominator?: number;
  label: string;
  valueColor?: string;
}) {
  return (
    <div className={styles.stat}>
      <div
        className={styles.statValue}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
        {denominator != null ? (
          <span className={styles.statDenom}>/{denominator}</span>
        ) : null}
      </div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

export default function CoachHomeTriage() {
  const { user } = useAuth();

  const triageQuery = useQuery({
    queryKey: ["coach-home-triage", user?.id],
    queryFn: async ({ signal }) => {
      const res = await fetchApi("/api/coach/home/triage", {
        signal: signal ?? null,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string })?.error ?? `HTTP ${res.status}`,
        );
      }
      return (await res.json()) as TriageResponse;
    },
    enabled: !!user?.id,
  });

  const briefing = triageQuery.data?.briefing ?? null;
  const triage = triageQuery.data?.triage ?? null;
  const loading = triageQuery.isLoading;
  const error = triageQuery.isError
    ? triageQuery.error instanceof Error
      ? triageQuery.error.message
      : "Failed to load briefing"
    : null;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingStack} aria-busy="true">
          <div className="fc-skeleton h-16 rounded-xl" />
          <div className="fc-skeleton h-24 rounded-xl" />
          <div className="fc-skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const activeClients = briefing?.activeClients ?? 0;
  const trainedToday = briefing?.clientsTrainedToday ?? 0;
  const checkedInToday = briefing?.clientsCheckedInToday ?? 0;

  const needsCount = triage?.counts.needsAttention ?? 0;
  const monitorCount = triage?.counts.monitor ?? 0;
  const onTrackCount = triage?.counts.onTrack ?? 0;
  const actionTotal = needsCount + monitorCount;

  return (
    <div className={styles.page}>
      <header className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <p className={styles.eyebrow}>
            Briefing · {actionTotal} need a look
          </p>
          <h1 className={styles.h1}>
            {coachTimeGreeting()}, <span className={styles.h1Dim}>Coach.</span>
          </h1>
          <p className={styles.sub}>
            {coachHomeDateLine()} · {trainedToday}/{activeClients} trained today ·{" "}
            {checkedInToday} checked in
          </p>
        </div>
        <Link href="/coach/insights" className={styles.ghostBtn}>
          ▥ Roster insights
        </Link>
      </header>

      {error ? (
        <div className={styles.errorBlock} role="alert">
          {error}
          <button
            type="button"
            className={styles.errorRetry}
            onClick={() => void triageQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {briefing && triage ? (
        <>
          <section className={styles.statStrip} aria-label="Attention levels">
            <StatCell
              value={needsCount}
              label="Needs attention"
              valueColor={statValueColor("needsAttention", needsCount)}
            />
            <StatCell
              value={monitorCount}
              label="Monitor"
              valueColor={statValueColor("monitor", monitorCount)}
            />
            <StatCell
              value={onTrackCount}
              label="On track"
              valueColor={statValueColor("onTrack", onTrackCount)}
            />
            <StatCell
              value={trainedToday}
              denominator={activeClients}
              label="Trained today"
            />
            <StatCell
              value={checkedInToday}
              denominator={activeClients}
              label="Checked in"
            />
          </section>

          <div className={styles.queues}>
            <div className="min-w-0">
              <CoachHomeQueueSection
                title="Needs attention"
                count={needsCount}
                countTone={needsCount > 0 ? "bad" : "mute"}
                clients={triage.needsAttention}
                allClearText="No clients need attention"
              />

              <CoachHomeQueueSection
                title="Monitor"
                count={monitorCount}
                countTone={monitorCount > 0 ? "warn" : "mute"}
                clients={triage.monitor}
                allClearText="Nothing to monitor"
                className={styles.queueBlockSpaced}
              />
            </div>

            <div className="min-w-0">
              <CoachHomeQueueSection
                title="On track"
                count={onTrackCount}
                countTone={onTrackCount > 0 ? "good" : "mute"}
                clients={triage.onTrack}
                allClearText="No assigned clients on track yet"
                previewLimit={ON_TRACK_PREVIEW}
                viewAllLabel={
                  onTrackCount > ON_TRACK_PREVIEW
                    ? `View all ${onTrackCount} →`
                    : undefined
                }
              />
            </div>

            <div className="min-w-0">
              <section aria-label="Today">
                <div className={styles.queueHead}>
                  <h2 className={styles.sectionTitle}>Today</h2>
                </div>
                <div className={styles.queueList}>
                  <CoachHomeTodayRow
                    icon="✓"
                    iconTone="good"
                    name="Trained today"
                    sub="So far today"
                    value={`${trainedToday}/${activeClients}`}
                    valueColor={
                      trainedToday > 0 ? undefined : "var(--fc-text-subtle)"
                    }
                  />
                  <CoachHomeTodayRow
                    icon="◔"
                    iconTone="accent"
                    name="Checked in"
                    sub="Daily wellness"
                    value={`${checkedInToday}/${activeClients}`}
                  />
                  <CoachHomeTodayRow
                    icon="◔"
                    iconTone="accent"
                    name="Check-ins due"
                    sub="Daily"
                    value={String(activeClients)}
                  />
                </div>
              </section>

              <section
                className={styles.queueBlockSpaced}
                aria-label="Quick actions"
              >
                <div className={styles.queueHead}>
                  <h2 className={styles.sectionTitle}>Quick actions</h2>
                </div>
                <div className={styles.quickActions}>
                  <Link
                    href="/coach/clients/add"
                    className={styles.ghostBtnBlock}
                  >
                    ＋ Add client
                  </Link>
                  <Link
                    href="/coach/programs/create"
                    className={styles.ghostBtnBlock}
                  >
                    ▲ Create program
                  </Link>
                  <Link href="/coach/insights" className={styles.ghostBtnBlock}>
                    ▥ Open roster insights
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
