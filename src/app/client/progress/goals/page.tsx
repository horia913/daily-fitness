"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import { GoalsAndHabits } from "@/components/progress/GoalsAndHabits";
import { ChevronLeft, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function GoalsAndHabitsPage() {
  const router = useRouter();
  const { performanceSettings } = useTheme();

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen fc-page">
          {/* Fixed top nav */}
          <nav className="fixed top-0 left-0 right-0 z-50 fc-glass border-b border-[color:var(--fc-glass-border)] backdrop-blur-md">
            <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
              <Link
                href="/client/progress"
                className="flex items-center gap-3 fc-text-dim hover:fc-text-primary transition-colors group"
              >
                <div className="p-2 rounded-xl fc-glass-soft group-hover:bg-white/10 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </div>
                <span className="font-medium">Dashboard</span>
              </Link>
              <h1 className="text-xl font-bold tracking-tight fc-text-primary">Goals & Habits</h1>
              <div className="w-20" aria-hidden />
            </div>
          </nav>

          <main className="max-w-4xl mx-auto pt-24 pb-24 px-4 sm:px-6">
            <GoalsAndHabits loading={false} />
          </main>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
