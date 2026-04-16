"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { useCoachClient } from "@/contexts/CoachClientContext";
import ClientProgressWellnessSection from "@/components/coach/client-views/ClientProgressWellnessSection";
import ClientProgressBodySection from "@/components/coach/client-views/ClientProgressBodySection";

export default function ClientCheckInsPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { clientName } = useCoachClient();

  return (
    <div className="space-y-6">
      <div className="fc-card-shell p-6 sm:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
              Check-ins
            </h1>
            <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
              Daily wellness and scheduled check-ins for {clientName}.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-cyan-300/70">
          Daily wellness (last 14 days)
        </h2>
        <ClientProgressWellnessSection clientId={clientId} coachId={null} />
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-cyan-300/70">
          Scheduled check-ins
        </h2>
        <ClientProgressBodySection clientId={clientId} />
      </section>
    </div>
  );
}
