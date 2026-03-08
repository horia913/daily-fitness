"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  ClientPageShell,
  ClientGlassCard,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
} from "@/components/client-ui";
import { Activity, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

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
            <ClientGlassCard className="p-12 text-center">
              <Activity className="w-14 h-14 fc-text-dim mx-auto mb-4 opacity-50" />
              <p className="fc-text-primary font-medium mb-2">No activities logged yet.</p>
              <p className="text-sm fc-text-dim mb-6">Log your sports, cardio, and manual activities here when this feature is available.</p>
              <SecondaryButton disabled className="opacity-70 cursor-not-allowed">
                <Plus className="w-4 h-4 mr-2" />
                Log Activity — Coming soon
              </SecondaryButton>
            </ClientGlassCard>
          </section>
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
