"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { useCoachClient } from "@/contexts/CoachClientContext";
import { CoachCheckInsScoreChip } from "@/components/coach/CoachCheckInsScoreChip";
import ClientProgressWellnessSection from "@/components/coach/client-views/ClientProgressWellnessSection";
import ClientProgressBodySection from "@/components/coach/client-views/ClientProgressBodySection";

export default function ClientCheckInsPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { clientName } = useCoachClient();

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-accent)]/20 text-[color:var(--fc-accent)] shrink-0">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1
                className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]"
                style={{ fontFamily: "var(--f-headline, var(--font-geist-sans))" }}
              >
                Check-ins
              </h1>
              <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                Daily wellness and scheduled check-ins for {clientName}.
              </p>
            </div>
          </div>
          <CoachCheckInsScoreChip clientId={clientId} />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-4">
        <section className="rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent p-4 min-w-0">
          <h2 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fc-accent)]">
            Daily wellness (last 14 days)
          </h2>
          <ClientProgressWellnessSection clientId={clientId} coachId={null} />
        </section>

        <section className="rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent p-4 min-w-0">
          <h2 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fc-accent)]">
            Scheduled check-ins
          </h2>
          <ClientProgressBodySection clientId={clientId} />
        </section>
      </div>
    </div>
  );
}
