"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PsHero, PsSectionEyebrow } from "@/components/client/progress-suite";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";
import { isFromCheckIns, progressBackHref } from "@/lib/clientProgressNav";
import { cn } from "@/lib/utils";
import {
  fetchActiveMobilityCatalog,
  fetchClientMobilityAssessments,
  formatAssessorAttribution,
  formatJointLabel,
  formatMeasureValue,
  groupCatalogByJoint,
  isMeaningfullyAsymmetric,
  type MobilityAssessment,
  type MobilityAssessmentItemRow,
  type MobilityMeasureType,
  type MobilityTestCatalogItem,
} from "@/lib/mobilityAssessmentService";

type ItemLookup = Map<string, MobilityAssessmentItemRow>;

function itemKey(testId: string, side: string): string {
  return `${testId}:${side}`;
}

function buildItemLookup(items: MobilityAssessmentItemRow[]): ItemLookup {
  const map = new Map<string, MobilityAssessmentItemRow>();
  for (const item of items) {
    map.set(itemKey(item.test_id, item.side), item);
  }
  return map;
}

function valueOf(
  lookup: ItemLookup,
  testId: string,
  side: string,
): number | null {
  const item = lookup.get(itemKey(testId, side));
  if (!item) return null;
  const n = Number(item.value);
  return Number.isFinite(n) ? n : null;
}

type TrendPoint = {
  assessedAt: string;
  value: number;
  side: string;
};

function historyByTest(
  assessments: MobilityAssessment[],
  testId: string,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  // assessments are newest-first; reverse for chronological
  for (const a of [...assessments].reverse()) {
    for (const item of a.items) {
      if (item.test_id !== testId) continue;
      const n = Number(item.value);
      if (!Number.isFinite(n)) continue;
      points.push({ assessedAt: a.assessed_at, value: n, side: item.side });
    }
  }
  return points;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function BilateralValues({
  measureType,
  left,
  right,
}: {
  measureType: MobilityMeasureType;
  left: number | null;
  right: number | null;
}) {
  const asymmetric = isMeaningfullyAsymmetric(measureType, left, right);
  return (
    <div className="flex items-end gap-3">
      <div className="min-w-[3.5rem]">
        <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ps-t3)" }}>
          L
        </p>
        <p className={cn(ps.psFontMono, "text-[15px] font-semibold")} style={{ color: "var(--ps-t1)" }}>
          {formatMeasureValue(measureType, left)}
        </p>
      </div>
      <div className="min-w-[3.5rem]">
        <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ps-t3)" }}>
          R
        </p>
        <p className={cn(ps.psFontMono, "text-[15px] font-semibold")} style={{ color: "var(--ps-t1)" }}>
          {formatMeasureValue(measureType, right)}
        </p>
      </div>
      {asymmetric ? (
        <span
          className="mb-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            borderColor: "color-mix(in srgb, var(--ps-warning) 45%, transparent)",
            color: "var(--ps-warning)",
            background: "transparent",
          }}
        >
          Asymmetry
        </span>
      ) : null}
    </div>
  );
}

function LatestAssessmentView({
  assessment,
  catalog,
}: {
  assessment: MobilityAssessment;
  catalog: MobilityTestCatalogItem[];
}) {
  const lookup = useMemo(() => buildItemLookup(assessment.items), [assessment.items]);
  const testedIds = useMemo(
    () => new Set(assessment.items.map((i) => i.test_id)),
    [assessment.items],
  );
  const groups = useMemo(() => {
    const active = catalog.filter((t) => testedIds.has(t.id));
    return groupCatalogByJoint(active);
  }, [catalog, testedIds]);

  if (groups.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ps-t2)" }}>
        This assessment has no recorded values.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-[12px]" style={{ color: "var(--ps-t3)" }}>
        {formatAssessorAttribution(assessment, { preferGenericCoach: true })}
      </p>
      {assessment.notes ? (
        <p className="text-[13px]" style={{ color: "var(--ps-t2)" }}>
          {assessment.notes}
        </p>
      ) : null}
      {groups.map((group) => (
        <section key={group.joint}>
          <h3
            className={cn(ps.psFontDisplay, "mb-2 text-[13px] font-semibold uppercase tracking-[0.08em]")}
            style={{ color: "var(--ps-t2)" }}
          >
            {formatJointLabel(group.joint)}
          </h3>
          <ul
            className="divide-y border-y"
            style={{ borderColor: "var(--ps-line)" }}
          >
            {group.items.map((test) => {
              if (test.bilateral) {
                const left = valueOf(lookup, test.id, "left");
                const right = valueOf(lookup, test.id, "right");
                if (left == null && right == null) return null;
                return (
                  <li key={test.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className={cn(ps.psFontHeadline, "text-[14px]")} style={{ color: "var(--ps-t1)" }}>
                        {test.display_name}
                      </p>
                    </div>
                    <BilateralValues
                      measureType={test.measure_type}
                      left={left}
                      right={right}
                    />
                  </li>
                );
              }
              const val = valueOf(lookup, test.id, "bilateral");
              if (val == null) return null;
              return (
                <li key={test.id} className="flex items-center justify-between gap-2 py-2.5">
                  <p className={cn(ps.psFontHeadline, "text-[14px]")} style={{ color: "var(--ps-t1)" }}>
                    {test.display_name}
                  </p>
                  <p className={cn(ps.psFontMono, "text-[15px] font-semibold")} style={{ color: "var(--ps-t1)" }}>
                    {formatMeasureValue(test.measure_type, val)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ChangeOverTime({
  assessments,
  catalog,
}: {
  assessments: MobilityAssessment[];
  catalog: MobilityTestCatalogItem[];
}) {
  const catalogById = useMemo(
    () => new Map(catalog.map((t) => [t.id, t])),
    [catalog],
  );

  const trends = useMemo(() => {
    const testIds = new Set<string>();
    for (const a of assessments) {
      for (const item of a.items) testIds.add(item.test_id);
    }
    const rows: {
      test: MobilityTestCatalogItem;
      side: string;
      points: { assessedAt: string; value: number }[];
    }[] = [];

    for (const testId of testIds) {
      const test = catalogById.get(testId);
      if (!test) continue;
      const all = historyByTest(assessments, testId);
      const sides = test.bilateral ? (["left", "right"] as const) : (["bilateral"] as const);
      for (const side of sides) {
        const points = all
          .filter((p) => p.side === side)
          .map((p) => ({ assessedAt: p.assessedAt, value: p.value }));
        if (points.length < 2) continue;
        rows.push({ test, side, points });
      }
    }

    rows.sort(
      (a, b) =>
        a.test.sort_order - b.test.sort_order ||
        a.side.localeCompare(b.side),
    );
    return rows;
  }, [assessments, catalogById]);

  if (trends.length === 0) return null;

  return (
    <div className="space-y-3">
      {trends.map(({ test, side, points }) => {
        const first = points[0];
        const last = points[points.length - 1];
        const delta = last.value - first.value;
        const sideLabel =
          side === "left" ? "L" : side === "right" ? "R" : null;
        return (
          <div
            key={`${test.id}:${side}`}
            className="border-b py-2.5"
            style={{ borderColor: "var(--ps-line-2)" }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className={cn(ps.psFontHeadline, "text-[13px]")} style={{ color: "var(--ps-t1)" }}>
                {test.display_name}
                {sideLabel ? ` · ${sideLabel}` : ""}
              </p>
              <p className={cn(ps.psFontMono, "text-[12px]")} style={{ color: "var(--ps-t2)" }}>
                {formatMeasureValue(test.measure_type, first.value)}
                {" → "}
                {formatMeasureValue(test.measure_type, last.value)}
                {test.measure_type !== "passfail" && delta !== 0 ? (
                  <span style={{ color: "var(--ps-t3)" }}>
                    {" "}
                    ({delta > 0 ? "+" : ""}
                    {delta}
                    {test.measure_type === "degrees"
                      ? "°"
                      : test.measure_type === "cm"
                        ? " cm"
                        : ""})
                  </span>
                ) : null}
              </p>
            </div>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--ps-t3)" }}>
              {formatShortDate(first.assessedAt)} → {formatShortDate(last.assessedAt)} ·{" "}
              {points.length} readings
            </p>
          </div>
        );
      })}
    </div>
  );
}

function MobilityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCheckIns = isFromCheckIns(searchParams);
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<MobilityAssessment[]>([]);
  const [catalog, setCatalog] = useState<MobilityTestCatalogItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [a, c] = await Promise.all([
        fetchClientMobilityAssessments(user.id),
        fetchActiveMobilityCatalog(),
      ]);
      setAssessments(a);
      setCatalog(c);
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : "Could not load mobility");
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user || authLoading) return;
    void load();
  }, [user, authLoading, load]);

  const latest = assessments[0] ?? null;
  const older = assessments.slice(1);

  return (
    <ClientPageShell className={cn(ps.psV1, "px-4 pb-[var(--fc-bottom-safe-area)] pt-4")}>
      <PsHero
        glow="cyan"
        onBack={() => router.push(progressBackHref(fromCheckIns))}
        eyebrow="Progress"
        eyebrowColor="var(--fc-accent)"
        title="Mobility"
        subtitle="Coach-assessed ROM and strength grades"
      />

      {loading ? (
        <PageSkeleton variant="dashboard" className="mt-6" />
      ) : loadError ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm" style={{ color: "var(--ps-critical)" }}>
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm font-medium"
            style={{ color: "var(--fc-accent)" }}
          >
            Retry
          </button>
        </div>
      ) : !latest ? (
        <div
          className="mt-8 border-y py-8"
          style={{ borderColor: "var(--ps-line)" }}
        >
          <p
            className={cn(ps.psFontDisplay, "text-[18px] font-semibold")}
            style={{ color: "var(--ps-t1)" }}
          >
            No assessments yet
          </p>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed" style={{ color: "var(--ps-t2)" }}>
            Your coach performs mobility assessments during sessions. Results
            will show up here when they save one — you can&apos;t log these
            yourself.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <section>
            <PsSectionEyebrow accent="cyan" className="mb-3">
              Latest
            </PsSectionEyebrow>
            <LatestAssessmentView assessment={latest} catalog={catalog} />
          </section>

          {assessments.length > 1 ? (
            <section>
              <PsSectionEyebrow accent="action" className="mb-3">
                Change over time
              </PsSectionEyebrow>
              <ChangeOverTime assessments={assessments} catalog={catalog} />
            </section>
          ) : null}

          {older.length > 0 ? (
            <section>
              <PsSectionEyebrow accent="purple" className="mb-3">
                History
              </PsSectionEyebrow>
              <ul
                className="divide-y border-y"
                style={{ borderColor: "var(--ps-line)" }}
              >
                {older.map((a) => (
                  <li key={a.id} className="py-3">
                    <p className={cn(ps.psFontHeadline, "text-[14px]")} style={{ color: "var(--ps-t1)" }}>
                      {formatShortDate(a.assessed_at)}
                    </p>
                    <p className="text-[12px]" style={{ color: "var(--ps-t3)" }}>
                      {formatAssessorAttribution(a, { preferGenericCoach: true })} · {a.items.length} value
                      {a.items.length === 1 ? "" : "s"}
                    </p>
                    {a.notes ? (
                      <p className="mt-1 text-[12px]" style={{ color: "var(--ps-t2)" }}>
                        {a.notes}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </ClientPageShell>
  );
}

export default function MobilityPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <Suspense fallback={<PageSkeleton variant="dashboard" className="p-4" />}>
        <MobilityPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
