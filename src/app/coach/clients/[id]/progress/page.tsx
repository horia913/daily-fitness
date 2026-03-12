"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import ClientProgressView from "@/components/coach/client-views/ClientProgressView";
import { CheckInConfigEditor } from "@/components/coach/CheckInConfigEditor";
import { GenerateReportModal } from "@/components/coach/GenerateReportModal";
import { exportBodyMetricsCsv } from "@/lib/exportBodyMetricsCsv";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, TrendingUp, FileText, Download } from "lucide-react";
import Link from "next/link";

export default function ClientProgressPage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();
  const [showReportModal, setShowReportModal] = useState(false);
  const [clientName, setClientName] = useState<string | undefined>();

  const clientId = params.id as string;

  useEffect(() => {
    if (!clientId) return;
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", clientId)
      .single()
      .then(({ data }) => {
        if (data)
          setClientName(
            `${(data as { first_name?: string }).first_name ?? ""} ${(data as { last_name?: string }).last_name ?? ""}`.trim()
          );
      });
  }, [clientId]);

  if (authLoading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-32 pt-10 sm:px-6 lg:px-10">
            <GlassCard elevation={2} className="fc-glass fc-card p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-16 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="h-64 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
              </div>
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-32 pt-10 sm:px-6 lg:px-10 space-y-6">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex items-center gap-4">
              <Link href={`/coach/clients/${clientId}`} className="fc-glass fc-card inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-2.5 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium">
                <ArrowLeft className="w-5 h-5 shrink-0" />
                Back to Client Hub
              </Link>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                    Check-ins & Metrics
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                    Scheduled check-ins, measurements, and photos.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowReportModal(true)}
                  >
                    <FileText className="w-4 h-4" />
                    Generate Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => exportBodyMetricsCsv(clientId, clientName)}
                  >
                    <Download className="w-4 h-4" />
                    Export Data
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>

          {user?.id && (
            <GenerateReportModal
              open={showReportModal}
              onClose={() => setShowReportModal(false)}
              coachId={user.id}
              clientId={clientId}
              clientName={clientName}
            />
          )}

          <ClientProgressView clientId={clientId} />

          {user?.id && (
            <div className="mt-8">
              <CheckInConfigEditor coachId={user.id} clientId={clientId} />
            </div>
          )}
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
