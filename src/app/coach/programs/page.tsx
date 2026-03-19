"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProgramsDashboardContent from "@/components/coach/ProgramsDashboardContent";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";

export default function CoachProgramsPage() {
  const { performanceSettings } = useTheme();

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen pb-32">
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            <Link
              href="/coach"
              className="fc-surface inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-surface-card-border)] px-3 py-2.5 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium mb-4"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to Dashboard
            </Link>
            <ProgramsDashboardContent />
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
