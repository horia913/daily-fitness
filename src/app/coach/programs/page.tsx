"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import ProgramsDashboardContent from "@/components/coach/ProgramsDashboardContent";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";

export default function CoachProgramsPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        <CoachPageShell widthVariant="canvas-full" className="!p-0">
          <ProgramsDashboardContent />
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
