"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { ProgramWeekState } from "@/lib/programWeekStateBuilder";

interface ProgramCompletedCardProps {
  programWeek: ProgramWeekState;
}

export function ProgramCompletedCard({ programWeek }: ProgramCompletedCardProps) {
  const { programName } = programWeek;
  const name = programName?.trim() || "your program";

  return (
    <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 shadow-[0_0_24px_rgba(16,185,129,0.08)]">
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300/80">
            PROGRAM COMPLETE
          </p>
          <p className="text-sm text-white">
            You&apos;ve completed <span className="font-semibold text-emerald-100">{name}</span>
          </p>
          <p className="text-xs text-gray-400">
            Ask your coach for your next program
          </p>
          <Link
            href="/client/progress/workout-logs"
            className="inline-flex items-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
          >
            View training history
          </Link>
        </div>
      </div>
    </div>
  );
}
