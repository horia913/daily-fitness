"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { TrendingUp } from "lucide-react";
import CoachClientProgressHub from "@/components/coach/client-views/CoachClientProgressHub";
function ProgressHubWithSearchParams({
  clientId,
}: {
  clientId: string;
}) {
  return <CoachClientProgressHub clientId={clientId} />;
}

export default function ClientProgressMergedPage() {
  const params = useParams();

  const clientId = params.id as string;

  return (
    <div className="space-y-6">
      <GlassCard elevation={2} className="fc-card-shell p-4 sm:p-6 lg:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex gap-3 min-w-0 flex-1">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                Check-ins &amp; Assessments
              </h1>
              <p className="text-sm text-[color:var(--fc-text-dim)] mt-1.5 leading-relaxed text-pretty max-w-prose">
                Body metrics, wellness, photos, FMS, goals, and analytics in one hub.
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="animate-pulse h-12 fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)]" />
            <div className="animate-pulse h-64 fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)]" />
          </div>
        }
      >
        <ProgressHubWithSearchParams
          clientId={clientId}
        />
      </Suspense>
    </div>
  );
}
