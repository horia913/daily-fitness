"use client";

import React from "react";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import ClientMealsView from "@/components/coach/client-views/ClientMealsView";
import { Utensils } from "lucide-react";

export default function ClientMealsPage() {
  const params = useParams();
  const clientId = params.id as string;

  return (
    <div className="space-y-6">
      <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora-green)]/20 text-[color:var(--fc-accent-green)] shrink-0">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
              Assigned Meal Plans
            </h1>
            <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
              View and manage nutrition plans.
            </p>
          </div>
        </div>
      </GlassCard>

      <ClientMealsView clientId={clientId} />
    </div>
  );
}
