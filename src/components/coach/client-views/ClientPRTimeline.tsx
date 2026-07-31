"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  formatPersonalRecordCaption,
  formatPrKindTag,
} from "@/lib/personalRecordDisplay";
import { fetchApi } from "@/lib/apiClient";
import type { PRMilestone } from "@/components/progress/PRTimelineChart";
import type { PRTimelineTimeRange } from "@/components/progress/PRTimelineChart";
import CoachPrV6Chart from "@/components/coach/client-detail/CoachPrV6Chart";
import sec from "@/components/coach/client-detail/coachClientDetailUi.module.css";
import prStyles from "@/components/coach/client-views/ClientPRTimeline.module.css";

type RecentPrItem = {
  exerciseId: string | null;
  exerciseName: string | null;
  recordType?: string;
  recordValue?: number;
  recordUnit?: string | null;
  caption: string;
  achievedDate: string;
  workoutLogId: string | null;
};

type ChartSeries = {
  key: string;
  exerciseId: string;
  exerciseName: string;
  recordType: string;
  recordUnit: string | null;
  milestones: PRMilestone[];
};

export type ClientPRTimelinePrefetched = {
  lifetimePrCount?: number;
  chart?: {
    series: ChartSeries[];
    defaultSeriesKey: string | null;
  };
  recent: RecentPrItem[];
};

type ApiResponse = ClientPRTimelinePrefetched & { clientId?: string };

const RANGE_OPTIONS: PRTimelineTimeRange[] = ["3M", "6M", "1Y", "ALL"];

export default function ClientPRTimeline({
  clientId,
  prefetched,
  timeRange: controlledRange,
  onTimeRangeChange,
  hideRangeTabs = false,
}: {
  clientId: string;
  prefetched?: ApiResponse | null;
  /** When set with onTimeRangeChange, range is controlled by parent (shared Performance control). */
  timeRange?: PRTimelineTimeRange;
  onTimeRangeChange?: (r: PRTimelineTimeRange) => void;
  hideRangeTabs?: boolean;
}) {
  const [loading, setLoading] = useState(!prefetched);
  const [error, setError] = useState<string | null>(null);
  const [seriesList, setSeriesList] = useState<ChartSeries[]>([]);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentPrItem[]>([]);
  const [internalRange, setInternalRange] = useState<PRTimelineTimeRange>("1Y");

  const timeRange = controlledRange ?? internalRange;
  const setTimeRange = (r: PRTimelineTimeRange) => {
    if (onTimeRangeChange) onTimeRangeChange(r);
    else setInternalRange(r);
  };

  useEffect(() => {
    if (prefetched) {
      const series = Array.isArray(prefetched.chart?.series) ? prefetched.chart!.series : [];
      const defKey = prefetched.chart?.defaultSeriesKey ?? null;
      setSeriesList(series);
      setSelectedSeriesKey(defKey ?? series[0]?.key ?? null);
      setRecent(Array.isArray(prefetched.recent) ? prefetched.recent : []);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSeriesList([]);
    setSelectedSeriesKey(null);
    fetchApi(`/api/coach/clients/${clientId}/pr-timeline`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error ?? `Failed to load PR timeline (${res.status})`);
        }
        return body as ApiResponse;
      })
      .then((data) => {
        if (cancelled) return;
        const series = Array.isArray(data.chart?.series) ? data.chart!.series : [];
        const defKey = data.chart?.defaultSeriesKey ?? null;
        setSeriesList(series);
        setSelectedSeriesKey(defKey ?? series[0]?.key ?? null);
        setRecent(Array.isArray(data.recent) ? data.recent : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load PR timeline");
          setSeriesList([]);
          setSelectedSeriesKey(null);
          setRecent([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, prefetched]);

  const selectedSeries = useMemo(() => {
    if (seriesList.length === 0) return null;
    if (!selectedSeriesKey) return seriesList[0];
    return seriesList.find((s) => s.key === selectedSeriesKey) ?? seriesList[0];
  }, [seriesList, selectedSeriesKey]);

  const hasAnyPrData = recent.length > 0 || seriesList.length > 0;
  const recentDisplay = recent.slice(0, 10);
  const showViewAll = recent.length > 10;

  return (
    <section className={sec.section}>
      <p className={prStyles.prEyebrow}>PR HISTORY</p>

      {loading ? (
        <p className="text-sm text-[color:var(--fc-text-subtle)] py-6">Loading PR timeline...</p>
      ) : error ? (
        <p className="text-sm text-[color:var(--fc-effort-max)] py-4">{error}</p>
      ) : !hasAnyPrData ? (
        <p className="text-sm text-[color:var(--fc-text-subtle)] py-6">No PRs recorded yet</p>
      ) : (
        <div className="space-y-3">
          {seriesList.length > 0 && selectedSeries && (
            <>
              <div className="flex flex-col gap-1.5">
                <span className={prStyles.fieldLabel}>Exercise / PR type</span>
                <div className={prStyles.selectWrap}>
                  <select
                    className={prStyles.select}
                    value={selectedSeries.key}
                    onChange={(e) => setSelectedSeriesKey(e.target.value)}
                  >
                    {seriesList.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.exerciseName} — {formatPrKindTag(s.recordType)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={prStyles.selectChevron} aria-hidden size={12} />
                </div>
              </div>

              {!hideRangeTabs ? (
              <div className={sec.rangeRow}>
                {RANGE_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`${sec.rangeTab} ${timeRange === r ? sec.rangeTabActive : ""}`}
                    onClick={() => setTimeRange(r)}
                  >
                    {r === "ALL" ? "All" : r}
                  </button>
                ))}
              </div>
              ) : null}

              <CoachPrV6Chart milestones={selectedSeries.milestones} timeRange={timeRange} />
            </>
          )}

          <div>
            <p className={prStyles.prEyebrow}>
              RECENT PRS · {recent.length}
            </p>
            {recent.length === 0 ? (
              <p className="text-sm text-[color:var(--fc-text-subtle)]">No recent PRs</p>
            ) : (
              <ul className="list-none p-0 m-0">
                {recentDisplay.map((item, idx) => (
                  <li
                    key={`${item.achievedDate}-${item.exerciseId ?? "x"}-${idx}`}
                    className={idx === 0 ? prStyles.prRow : `${prStyles.prRow} ${prStyles.prRowBorder}`}
                  >
                    <button
                      type="button"
                      className={prStyles.prRowBtn}
                      onClick={() => {
                        if (item.workoutLogId) {
                          window.location.href = `/coach/clients/${clientId}/workout-logs/${item.workoutLogId}`;
                        }
                      }}
                      disabled={!item.workoutLogId}
                    >
                      <div className={prStyles.prRowLeft}>
                        <span className={prStyles.prExercise}>{item.exerciseName ?? "Exercise"}</span>
                        <span
                          className={
                            item.recordType === "strength_endurance"
                              ? prStyles.prValueSecondary
                              : prStyles.prValue
                          }
                        >
                          {item.caption ??
                            formatPersonalRecordCaption(
                              item.recordType,
                              item.recordValue,
                              item.recordUnit ?? null,
                            )}
                        </span>
                      </div>
                      <span className={prStyles.prDate}>
                        {new Date(`${item.achievedDate}T12:00:00`).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showViewAll ? (
              <button
                type="button"
                className={prStyles.viewAll}
                onClick={() => {
                  window.location.href = `/coach/clients/${clientId}`;
                }}
              >
                View all PRs →
              </button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
