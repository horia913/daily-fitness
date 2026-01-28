"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { GlassCard } from "@/components/ui/GlassCard";

export default function MealPlansPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main nutrition page with meal-plans tab
    router.replace("/coach/nutrition");
  }, [router]);

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        <div className="flex items-center justify-center min-h-screen p-4">
          <GlassCard elevation={2} className="fc-glass fc-card p-8 text-center">
            <p className="text-[color:var(--fc-text-dim)]">
              Redirecting to Nutrition page...
            </p>
          </GlassCard>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
