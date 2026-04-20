"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProgramsDashboardContent from "@/components/coach/ProgramsDashboardContent";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";

export default function CoachProgramsPage() {
  const { performanceSettings } = useTheme();

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="data-7xl" className="px-4 py-3 pb-32 sm:px-6 sm:py-4">
            <Link
              href="/coach"
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)]"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              Dashboard
            </Link>
            <ProgramsDashboardContent />
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
