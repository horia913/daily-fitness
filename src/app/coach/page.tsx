"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui";
import CoachHomeTriage from "@/components/coach/CoachHomeTriage";

function CoachDashboardContent() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <AnimatedBackground>
      <CoachPageShell widthVariant="canvas-full" className="!p-0">
        <CoachHomeTriage />
      </CoachPageShell>
    </AnimatedBackground>
  );
}

export default function CoachDashboard() {
  return (
    <ProtectedRoute requiredRole="coach">
      <CoachDashboardContent />
    </ProtectedRoute>
  );
}
