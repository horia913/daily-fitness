"use client";

import React, { useMemo } from "react";
import { Moon } from "lucide-react";
import type { WellnessStats } from "@/lib/wellnessAnalytics";
import { SectionCard, SectionHead } from "./AnalyticsSectionChrome";
import EmptyStateBlock from "@/components/coach/client-detail/EmptyStateBlock";

export function SleepVsPerformanceSection({
  wellnessStats,
  message,
}: {
  wellnessStats: WellnessStats | null;
  message: string;
}) {
  const sleepDays = useMemo(() => {
    return (
      wellnessStats?.dailyData?.filter((d) => d.sleepHours != null).length ?? 0
    );
  }, [wellnessStats?.dailyData]);

  const enough = sleepDays >= 7;

  return (
    <SectionCard>
      <SectionHead
        icon={Moon}
        iconClassName="bg-[rgba(168,85,247,0.14)] text-[var(--purple)]"
        title="Sleep vs performance"
        description="How rest affects your training"
      />
      {!enough ? (
        <EmptyStateBlock
          icon={Moon}
          title="Need more sleep data"
          description="Log sleep for at least 7 days to unlock this insight."
        />
      ) : (
        <p
          className="text-[12.5px] font-medium leading-relaxed text-[var(--t1)]"
          style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
        >
          {message}
        </p>
      )}
    </SectionCard>
  );
}
