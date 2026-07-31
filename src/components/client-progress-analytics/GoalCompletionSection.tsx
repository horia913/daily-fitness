"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import { SectionCard, SectionHead } from "./AnalyticsSectionChrome";
import { GoalCompletionRing } from "./GoalCompletionRing";
import EmptyStateBlock from "@/components/coach/client-detail/EmptyStateBlock";

export function GoalCompletionSection({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const router = useRouter();
  return (
    <SectionCard>
      <SectionHead
        icon={Target}
        iconClassName="bg-[color:var(--fc-group-c-soft)] text-[var(--fc-accent)]"
        title="Goal completion"
      />
      {total === 0 ? (
        <EmptyStateBlock
          icon={Target}
          title="No goals set yet"
          description="Set targets on your Goals page to track progress."
          actions={[
            {
              label: "Open goals",
              onClick: () => router.push("/client/goals"),
              variant: "primary",
            },
          ]}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <GoalCompletionRing completed={completed} total={total} />
          <Link
            href="/client/goals"
            className="text-center text-[10px] font-medium text-[var(--fc-accent)] underline-offset-2 hover:underline"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            Manage goals
          </Link>
        </div>
      )}
    </SectionCard>
  );
}
