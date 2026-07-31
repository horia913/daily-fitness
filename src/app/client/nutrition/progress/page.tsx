"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Apple, ArrowLeft, ChartNoAxesCombined } from "lucide-react";
import { NutritionComplianceChart } from "@/components/progress/NutritionComplianceChart";
import {
  BodyAdherenceOverlay,
  defaultOverlayWindow,
} from "@/components/progress/BodyAdherenceOverlay";
import { AdherenceCalendar } from "@/components/client/adherence-calendar";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertTriangle } from "lucide-react";
import {
  getNutritionAdherenceHistory,
  toCalendarDays,
  type NutritionAdherenceHistory,
} from "@/lib/nutritionAdherenceHistoryService";

/**
 * Fuel history / adherence — patterns over time, not a day-by-day meal archive.
 * Daily meal completion lives on `/client/nutrition`.
 */
export default function NutritionProgressPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<NutritionAdherenceHistory | null>(
    null
  );
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getNutritionAdherenceHistory(user.id);
      setHistory(data);
    } catch (err: unknown) {
      console.error("Error loading nutrition adherence:", err);
      setHistory(null);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load adherence history."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setErrorMessage("Loading took too long. Tap Retry to try again.");
    }, 20_000);
    loadHistory().finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [user?.id, loadHistory]);

  const calendarDays = useMemo(
    () => (history ? toCalendarDays(history.days) : []),
    [history]
  );

  const overlayWindow = useMemo(() => defaultOverlayWindow(), []);

  const macroTotal =
    (history?.macrosCompleted?.protein_g ?? 0) +
    (history?.macrosCompleted?.carbs_g ?? 0) +
    (history?.macrosCompleted?.fat_g ?? 0);

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 space-y-4 overflow-x-hidden">
          <PageSkeleton variant="dashboard" />
        </ClientPageShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 space-y-4 overflow-x-hidden">
        <div className="rounded-2xl border border-[color:var(--fc-glass-border)] bg-transparent p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => router.push("/client/nutrition")}
                aria-label="Back to Fuel"
                className="w-9 h-9 flex items-center justify-center rounded-lg shrink-0 border border-[color:var(--fc-glass-border)] bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 text-[color:var(--fc-text-primary)]" />
              </button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--fc-glass-border)] bg-transparent text-[color:var(--fc-domain-meals)] shrink-0">
                  <ChartNoAxesCombined className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold tracking-tight text-[color:var(--fc-text-primary)] truncate [font-family:var(--f-headline)]">
                    Nutrition history
                  </h1>
                  <p className="text-xs text-[color:var(--fc-text-dim)] mt-0.5 [font-family:var(--font-body)]">
                    Am I sticking to the plan — patterns over time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load history"
            description={errorMessage}
            actionLabel="Retry"
            onAction={() => void loadHistory()}
          />
        ) : !history?.hasAnyAssignment ? (
          <EmptyState
            icon={Apple}
            title="No meal plan yet"
            description="When your coach assigns a plan, adherence and streaks will show up here. Open Fuel to check today's meals."
            actionLabel="Back to Fuel"
            onAction={() => router.push("/client/nutrition")}
          />
        ) : (
          <>
            {/* 1. Adherence summary */}
            <section className="rounded-2xl border border-[color:var(--fc-glass-border)] bg-transparent p-4 space-y-3">
              <div>
                <h2 className="text-base font-semibold text-[color:var(--fc-text-primary)] [font-family:var(--f-headline)]">
                  Adherence summary
                </h2>
                <p className="text-xs text-[color:var(--fc-text-dim)] mt-0.5 [font-family:var(--font-body)]">
                  Share of assigned meals completed. Days with no plan are left
                  out.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <SummaryStat
                  label="This week"
                  value={
                    history.thisWeekPct != null
                      ? `${history.thisWeekPct}%`
                      : "—"
                  }
                />
                <SummaryStat
                  label="Last 4 weeks"
                  value={
                    history.last4WeeksPct != null
                      ? `${history.last4WeeksPct}%`
                      : "—"
                  }
                />
                <SummaryStat
                  label="Streak"
                  value={
                    history.streakDays > 0
                      ? `${history.streakDays}d`
                      : "0d"
                  }
                />
              </div>
            </section>

            {/* 2. Month calendar */}
            <section className="rounded-2xl border border-[color:var(--fc-glass-border)] bg-transparent p-4">
              <div className="mb-3">
                <h2 className="text-base font-semibold text-[color:var(--fc-text-primary)] [font-family:var(--f-headline)]">
                  Month
                </h2>
                <p className="text-xs text-[color:var(--fc-text-dim)] mt-0.5 [font-family:var(--font-body)]">
                  Daily completion of assigned meals.
                </p>
              </div>
              <AdherenceCalendar
                days={calendarDays}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                aria-label="Meal plan adherence calendar"
              />
            </section>

            {/* 3. Weekly / daily trend (reuse chart) */}
            <div className="min-w-0 overflow-x-auto -mx-1 px-1">
              <NutritionComplianceChart
                data={history.chartSeries}
                defaultTimeRange="3M"
                className="w-full min-w-[280px]"
                title="Weekly adherence trend"
                subtitle="Meal completion % on planned days (~3 months)"
              />
            </div>

            {/* 4. Body overlay — omit when no body data */}
            <BodyAdherenceOverlay
              adherenceDays={history.days}
              bodyPoints={history.bodyPoints}
              startDate={overlayWindow.startDate}
              endDate={overlayWindow.endDate}
            />

            {/* 5. Macro distribution — completed meals only */}
            {history.macrosCompleted && macroTotal > 0 && (
              <section className="rounded-2xl border border-[color:var(--fc-glass-border)] bg-transparent p-4 space-y-3">
                <div>
                  <h2 className="text-base font-semibold text-[color:var(--fc-text-primary)] [font-family:var(--f-headline)]">
                    Macros from completed meals
                  </h2>
                  <p className="text-xs text-[color:var(--fc-text-dim)] mt-0.5 [font-family:var(--font-body)]">
                    Protein / carbs / fat split of meals you marked complete in
                    the last 4 weeks — not total intake.
                  </p>
                </div>
                <MacroBar
                  protein={history.macrosCompleted.protein_g}
                  carbs={history.macrosCompleted.carbs_g}
                  fat={history.macrosCompleted.fat_g}
                />
                <p className="text-[10px] text-[color:var(--fc-text-subtle)] [font-family:var(--f-mono)]">
                  {Math.round(history.macrosCompleted.calories)} kcal across
                  completed plan meals
                </p>
              </section>
            )}

            {/* 6. Meal-type completion */}
            <section className="rounded-2xl border border-[color:var(--fc-glass-border)] bg-transparent p-4 space-y-3">
              <div>
                <h2 className="text-base font-semibold text-[color:var(--fc-text-primary)] [font-family:var(--f-headline)]">
                  By meal type
                </h2>
                <p className="text-xs text-[color:var(--fc-text-dim)] mt-0.5 [font-family:var(--font-body)]">
                  Completion rate by meal type (last 4 weeks).
                </p>
              </div>
              <ul className="space-y-2.5 list-none m-0 p-0">
                {history.mealTypeRates.map((row) => (
                  <li key={row.type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[color:var(--fc-text-primary)] font-medium [font-family:var(--f-headline)]">
                        {row.label}
                      </span>
                      <span className="text-[color:var(--fc-text-dim)] tabular-nums text-xs [font-family:var(--f-mono)]">
                        {row.pct != null
                          ? `${row.pct}% · ${row.completed}/${row.assigned}`
                          : "No assigned"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full border border-[color:var(--fc-glass-border)] bg-transparent overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[color:var(--fc-domain-meals)]"
                        style={{
                          width: `${row.pct != null ? row.pct : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <p className="text-xs text-[color:var(--fc-text-subtle)] text-center px-2 pb-2">
              Log today&apos;s meals on Fuel — this screen is history only.
            </p>
          </>
        )}
      </ClientPageShell>
    </ProtectedRoute>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--fc-glass-border)] bg-transparent px-2.5 py-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-[color:var(--fc-text-subtle)] font-semibold [font-family:var(--f-mono)]">
        {label}
      </p>
      <p className="text-lg font-semibold text-[color:var(--fc-text-primary)] tabular-nums mt-0.5 [font-family:var(--f-display)]">
        {value}
      </p>
    </div>
  );
}

function MacroBar({
  protein,
  carbs,
  fat,
}: {
  protein: number;
  carbs: number;
  fat: number;
}) {
  const total = protein + carbs + fat;
  if (total <= 0) return null;
  const pPct = (protein / total) * 100;
  const cPct = (carbs / total) * 100;
  const fPct = (fat / total) * 100;
  return (
    <div className="space-y-2">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full border border-[color:var(--fc-glass-border)]"
        role="img"
        aria-label={`Protein ${Math.round(pPct)}%, carbs ${Math.round(cPct)}%, fat ${Math.round(fPct)}%`}
      >
        <div
          style={{
            width: `${pPct}%`,
            background: "var(--fc-macro-protein)",
          }}
        />
        <div
          style={{
            width: `${cPct}%`,
            background: "var(--fc-macro-carbs)",
          }}
        />
        <div
          style={{
            width: `${fPct}%`,
            background: "var(--fc-macro-fat)",
          }}
        />
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--fc-text-dim)] list-none m-0 p-0 [font-family:var(--f-mono)]">
        <li className="inline-flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-sm"
            style={{ background: "var(--fc-macro-protein)" }}
            aria-hidden
          />
          Protein {Math.round(protein)}g ({Math.round(pPct)}%)
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-sm"
            style={{ background: "var(--fc-macro-carbs)" }}
            aria-hidden
          />
          Carbs {Math.round(carbs)}g ({Math.round(cPct)}%)
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-sm"
            style={{ background: "var(--fc-macro-fat)" }}
            aria-hidden
          />
          Fat {Math.round(fat)}g ({Math.round(fPct)}%)
        </li>
      </ul>
    </div>
  );
}
