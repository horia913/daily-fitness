"use client";

import React, { Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { CoachNutritionWorkspace } from "@/components/coach/nutrition/CoachNutritionWorkspace";

function NutritionWorkspaceFallback() {
  return (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="fc-skeleton h-10 w-48 rounded-lg" />
      <div className="fc-skeleton h-6 w-72 rounded-lg" />
      <div className="fc-skeleton h-12 w-full rounded-none" />
      <div className="fc-skeleton h-14 w-full rounded-none" />
      <div className="fc-skeleton h-14 w-full rounded-none" />
    </div>
  );
}

export default function CoachNutritionPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        <CoachPageShell widthVariant="data-7xl" className="!p-0">
          <Suspense fallback={<NutritionWorkspaceFallback />}>
            <CoachNutritionWorkspace />
          </Suspense>
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
