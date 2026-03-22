"use client";

import React from "react";
import { useParams } from "next/navigation";
import ClientWorkoutsView from "@/components/coach/client-views/ClientWorkoutsView";
import { Dumbbell } from "lucide-react";

export default function ClientWorkoutsPage() {
  const params = useParams();
  const clientId = params.id as string;

  return (
    <div className="space-y-6">
      <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
              Training
            </h1>
            <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
              Active program, session history, and assignments.
            </p>
          </div>
        </div>
      </div>

      <ClientWorkoutsView clientId={clientId} />
    </div>
  );
}
