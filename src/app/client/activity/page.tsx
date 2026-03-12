"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  ClientPageShell,
  ClientGlassCard,
  SectionHeader,
} from "@/components/client-ui";
import { Activity, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ActivityLogPage() {
  const { performanceSettings } = useTheme();

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-3xl flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Link href="/client/me" className="p-2 rounded-xl fc-glass hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-5 h-5 fc-text-primary" />
            </Link>
            <div>
              <h1 className="text-xl font-bold fc-text-primary">Activity Log</h1>
              <p className="text-sm fc-text-dim">Log sports, cardio, and manual activities</p>
            </div>
          </div>

          <section>
            <SectionHeader title="Activities" />
            <ClientGlassCard className="p-12">
              <EmptyState
                icon={Activity}
                title="No activities yet"
                description="Your activity log will appear here"
              />
            </ClientGlassCard>
          </section>
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
