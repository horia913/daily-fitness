"use client";

import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell } from "@/components/client-ui";
import { AthleteScoreRing } from "@/components/client-ui/AthleteScoreRing";
import type { AthleteScore } from "@/types/athleteScore";

const SCENARIOS: { score: number; tier: AthleteScore["tier"]; title: string }[] = [
  { score: 18, tier: "benched", title: "Benched (typical)" },
  { score: 44, tier: "slipping", title: "Slipping (typical)" },
  { score: 64, tier: "showing_up", title: "Showing Up (typical)" },
  { score: 82, tier: "locked_in", title: "Locked In (typical)" },
  { score: 96, tier: "beast_mode", title: "Beast Mode (typical)" },
];

export default function TestAthleteScorePage() {
  return (
    <ProtectedRoute requiredRole="client">
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <AnimatedBackground>
          <ClientPageShell className="max-w-lg px-4 pb-32 pt-6 mx-auto">
            <header className="mb-8">
              <h1
                className="font-bold text-zinc-50 mb-1"
                style={{ fontSize: "var(--fc-type-h2)" }}
              >
                Athlete score ring
              </h1>
              <p className="text-sm text-zinc-400">
                Beast Mode: Lottie background from{" "}
                <code className="text-zinc-500">/animations/beast-ring.json</code> (replace with
                your pick from LottieFiles — search “energy ring”, “fire ring”). Canvas + CSS fall
                back if the file fails, on low-end devices, or when reduced motion is on. Locked In
                stays CSS-only. Open at /client/test-athlete-score; not in navigation.
              </p>
            </header>

            <div className="flex flex-col gap-10">
              {SCENARIOS.map((s) => (
                <section
                  key={s.tier}
                  className="rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-xl"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">
                    {s.title}
                  </p>
                  <div className="flex justify-center overflow-x-auto">
                    <AthleteScoreRing
                      score={s.score}
                      tier={s.tier}
                      animated={true}
                      size={200}
                    />
                  </div>
                </section>
              ))}
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </div>
    </ProtectedRoute>
  );
}
