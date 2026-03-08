"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { WeeklyCheckInFlow } from "@/components/client/weekly-checkin/WeeklyCheckInFlow";
import { getClientCheckInConfig } from "@/lib/checkInConfigService";
import { getLatestMeasurement } from "@/lib/measurementService";
import { getPhotoTimeline } from "@/lib/progressPhotoService";
import { Skeleton } from "@/components/ui/Skeleton";

export default function WeeklyCheckInPage() {
  const { performanceSettings } = useTheme();
  const { user } = useAuth();
  const [config, setConfig] = useState<Awaited<ReturnType<typeof getClientCheckInConfig>>>(null);
  const [lastMeasurement, setLastMeasurement] = useState<Awaited<ReturnType<typeof getLatestMeasurement>>>(null);
  const [lastPhotoDate, setLastPhotoDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        const [configData, measurement, timeline] = await Promise.all([
          getClientCheckInConfig(user.id),
          getLatestMeasurement(user.id),
          getPhotoTimeline(user.id),
        ]);
        if (!cancelled) {
          setConfig(configData);
          setLastMeasurement(measurement);
          setLastPhotoDate(timeline[0]?.date ?? null);
        }
      } catch (e) {
        if (!cancelled) console.error("Error loading weekly check-in data:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading || !user?.id) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-2xl px-4 sm:px-6 pb-40">
            <Skeleton className="h-12 w-64 rounded-xl mb-6" />
            <Skeleton className="h-80 w-full rounded-2xl" />
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-2xl px-4 sm:px-6 pb-40">
          <WeeklyCheckInFlow
            clientId={user.id}
            config={config}
            lastMeasurement={lastMeasurement}
            lastPhotoDate={lastPhotoDate}
            onComplete={() => {}}
            onBack={() => window.history.back()}
          />
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
