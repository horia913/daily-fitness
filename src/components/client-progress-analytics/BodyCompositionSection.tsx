"use client";

import React, { useMemo } from "react";
import { Scale } from "lucide-react";
import { SectionCard, SectionHead } from "./AnalyticsSectionChrome";
import WellnessTable, {
  type WellnessTableRow,
} from "@/components/coach/client-detail/WellnessTable";
import EmptyStateBlock from "@/components/coach/client-detail/EmptyStateBlock";
import { WeightDeltaPill, type BodyGoalIntent } from "./DeltaPill";

export interface BodyCompositionPoint {
  date: string;
  weight: number;
  bodyFat?: number;
}

export function BodyCompositionSection({
  bodyComposition,
  goalIntent = "unknown",
}: {
  bodyComposition: BodyCompositionPoint[];
  goalIntent?: BodyGoalIntent;
}) {
  const { rows, labels, deltaKg } = useMemo(() => {
    if (!bodyComposition.length) {
      return {
        rows: [] as WellnessTableRow[],
        labels: ["—", "—"] as const,
        deltaKg: 0,
      };
    }
    const first = bodyComposition[0]!;
    const last = bodyComposition[bodyComposition.length - 1]!;
    const bf0 =
      first.bodyFat != null && Number.isFinite(first.bodyFat)
        ? `${first.bodyFat.toFixed(1)}%`
        : null;
    const bf1 =
      last.bodyFat != null && Number.isFinite(last.bodyFat)
        ? `${last.bodyFat.toFixed(1)}%`
        : null;

    const rows: WellnessTableRow[] = [
      {
        metric: "Weight",
        previous: `${first.weight.toFixed(1)} kg`,
        current: `${last.weight.toFixed(1)} kg`,
      },
      {
        metric: "Body fat",
        previous: bf0 != null ? `${bf0}` : null,
        current:
          bf1 != null ? (
            `${bf1}`
          ) : (
            <span className="italic" style={{ color: "var(--t4)" }}>
              not tracked
            </span>
          ),
      },
    ];

    return {
      rows,
      labels: [first.date, last.date] as const,
      deltaKg: last.weight - first.weight,
    };
  }, [bodyComposition]);

  if (!bodyComposition.length) {
    return (
      <SectionCard>
        <SectionHead
          icon={Scale}
          iconClassName="bg-[rgba(52,211,153,0.12)] text-[var(--good)]"
          title="Body composition"
          description="Weight & body fat trends"
        />
        <EmptyStateBlock
          icon={Scale}
          title="No body metrics logged yet"
          description="Log a check-in to track changes."
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionHead
        icon={Scale}
        iconClassName="bg-[rgba(52,211,153,0.12)] text-[var(--good)]"
        title="Body composition"
        description="Weight & body fat trends"
      />
      <WellnessTable
        rows={rows}
        compareDateLabels={labels}
        valueDisplayFont
      />
      {bodyComposition.length >= 2 ? (
        <div className="flex items-center justify-between px-0.5 pt-1">
          <span
            className="text-[9.5px] text-[var(--t3)]"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            Weight change
          </span>
          <WeightDeltaPill kgDelta={deltaKg} intent={goalIntent} />
        </div>
      ) : null}
    </SectionCard>
  );
}
