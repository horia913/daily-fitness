"use client";

import React from "react";
import { useParams } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { useCoachClient } from "@/contexts/CoachClientContext";
import ClientAnalyticsView from "@/components/coach/client-views/ClientAnalyticsView";
import ClientPRTimeline from "@/components/coach/client-views/ClientPRTimeline";

export default function ClientStatsPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { clientName } = useCoachClient();

  return (
    <div className="space-y-6">
      <div className="fc-card-shell p-6 sm:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
              Stats
            </h1>
            <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
              Training analytics and PR history for {clientName}.
            </p>
          </div>
        </div>
      </div>

      <ClientPRTimeline clientId={clientId} />
      <ClientAnalyticsView clientId={clientId} />
    </div>
  );
}
