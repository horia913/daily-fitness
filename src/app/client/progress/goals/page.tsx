"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import { GoalsAndHabits } from "@/components/progress/GoalsAndHabits";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GoalsAndHabitsPage() {
  const router = useRouter();
  const { performanceSettings } = useTheme();

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen">
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Back Button */}
            <Button
              onClick={() => router.push("/client/progress")}
              variant="outline"
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Progress
            </Button>

            {/* Goals & Habits Component */}
            <GoalsAndHabits loading={false} />
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
