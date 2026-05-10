"use client";

import React from "react";
import { Check } from "lucide-react";
import { Eyebrow } from "@/components/client-ui";
import { Button } from "@/components/ui/button";

interface DailyCheckInHeroCardProps {
  dailyDoneToday: boolean;
  monthlyDue: boolean;
  monthlyDoneThisCycle: boolean;
}

export function DailyCheckInHeroCard({
  dailyDoneToday,
  monthlyDue,
  monthlyDoneThisCycle,
}: DailyCheckInHeroCardProps) {
  const showDailyOnly = !dailyDoneToday && !monthlyDue;
  const showDailyAndMonthly = !dailyDoneToday && monthlyDue && !monthlyDoneThisCycle;
  const showMonthlyOnly = dailyDoneToday && monthlyDue && !monthlyDoneThisCycle;
  const showDone = dailyDoneToday && (!monthlyDue || monthlyDoneThisCycle);

  return (
    <section className="mb-[22px] px-5" aria-label="Check-in actions">
      <div
        className={`rounded-2xl border border-[var(--fc-glass-border)] bg-[var(--fc-surface-card)] ${
          showDone ? "px-4 py-3.5" : "px-4 py-4"
        }`}
      >
        {showDone ? (
          <div className="flex items-center gap-2">
            <Check
              className="h-4 w-4 shrink-0"
              style={{ color: "var(--fc-status-success)" }}
              aria-hidden
            />
            <span className="text-sm font-semibold fc-text-primary">Check-in complete</span>
          </div>
        ) : (
          <>
            <Eyebrow tone="subtle" className="mb-3">
              Check-in
            </Eyebrow>
            <div className="space-y-2.5">
              {(showDailyOnly || showDailyAndMonthly) && (
                <Button
                  type="button"
                  variant="btn-action"
                  className="h-11 w-full normal-case tracking-normal"
                  onClick={() => {
                    window.location.href = "/client/check-ins";
                  }}
                >
                  Complete daily check-in
                </Button>
              )}

              {(showMonthlyOnly || showDailyAndMonthly) && (
                <Button
                  type="button"
                  variant={showMonthlyOnly ? "btn-action" : "fc-secondary"}
                  className="h-11 w-full normal-case tracking-normal"
                  onClick={() => {
                    window.location.href = "/client/check-ins/weekly";
                  }}
                >
                  Complete monthly check-in
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
