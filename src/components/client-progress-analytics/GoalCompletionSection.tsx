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
        iconClassName="bg-[rgba(79,227,232,0.12)] text-[var(--cyan)]"
        title="Goal completion"
      />
      {total === 0 ? (
        <EmptyStateBlock
          icon={Target}
          title="No goals set yet"
          description="Set targets in your profile to track progress."
          actions={[
            {
              label: "Open profile",
              onClick: () => router.push("/client/profile"),
              variant: "primary",
            },
          ]}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <GoalCompletionRing completed={completed} total={total} />
          <Link
            href="/client/profile"
            className="text-center text-[10px] font-medium text-[var(--cyan)] underline-offset-2 hover:underline"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            Manage goals in profile
          </Link>
        </div>
      )}
    </SectionCard>
  );
}
