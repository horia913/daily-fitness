"use client";

import React from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { Trophy, History } from "lucide-react";
import { ProgramWeekState } from "@/lib/programWeekStateBuilder";
import { useRouter } from "next/navigation";

interface ProgramCompletedCardProps {
  programWeek: ProgramWeekState;
}

export function ProgramCompletedCard({ programWeek }: ProgramCompletedCardProps) {
  const router = useRouter();
  const { programName, totalWeeks } = programWeek;

  return (
    <ClientGlassCard className="p-6 mb-6 text-center">
      <div className="flex justify-center mb-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, var(--fc-accent-cyan)20, var(--fc-accent-cyan)40)",
            border: "2px solid var(--fc-accent-cyan)",
          }}
        >
          <Trophy className="w-8 h-8" style={{ color: "var(--fc-accent-cyan)" }} />
        </div>
      </div>

      <h2 className="text-xl font-bold fc-text-primary mb-2">
        Program Complete!
      </h2>
      <p className="text-sm fc-text-dim mb-1">
        You finished <span className="font-semibold fc-text-primary">{programName || "your program"}</span>
      </p>
      {totalWeeks > 0 && (
        <p className="text-xs fc-text-dim mb-6">
          {totalWeeks} week{totalWeeks !== 1 ? "s" : ""} of consistent training
        </p>
      )}

      <button
        onClick={() => router.push("/client/progress/workout-logs")}
        className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
        style={{ background: "var(--fc-accent-cyan)" }}
      >
        <History className="w-4 h-4" />
        View History
      </button>
    </ClientGlassCard>
  );
}
