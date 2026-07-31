/**
 * Client nutrition adherence history — completed ÷ assigned (meal_completions).
 * Days with no assigned meals are excluded from denominators (neutral, not misses).
 */

import { supabase } from "./supabase";
import {
  getCurrentWeekBounds,
  toLocalDateString,
} from "./clientActivityService";
import type { BodyMetricsPoint } from "./metrics/body";

export type MealTypeKey = "breakfast" | "lunch" | "dinner" | "snack";

export type NutritionAdherenceDay = {
  date: string;
  assigned: number;
  completed: number;
  /** 0–1 when assigned > 0; null when nothing scheduled that day */
  value: number | null;
};

export type MealTypeCompletionRate = {
  type: MealTypeKey;
  label: string;
  assigned: number;
  completed: number;
  /** null when no assigned meals of this type in the window */
  pct: number | null;
};

export type CompletedMacrosSummary = {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
};

export type NutritionAdherenceHistory = {
  /** False when the client has never had a covering meal-plan assignment in range. */
  hasAnyAssignment: boolean;
  days: NutritionAdherenceDay[];
  thisWeekPct: number | null;
  last4WeeksPct: number | null;
  /** Consecutive full days from today backward; unplanned days skipped (do not break). */
  streakDays: number;
  /** Planned days only, compliance 0–100 — for NutritionComplianceChart. */
  chartSeries: { date: string; compliance: number }[];
  macrosCompleted: CompletedMacrosSummary | null;
  mealTypeRates: MealTypeCompletionRate[];
  bodyPoints: BodyMetricsPoint[];
};

type AssignmentRow = {
  id: string;
  meal_plan_id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean | null;
  created_at: string;
};

type MealRow = {
  id: string;
  meal_plan_id: string;
  meal_type: string | null;
};

type CompletionRow = {
  meal_id: string;
  meal_option_id: string | null;
  date: string | null;
};

type SelectionRow = {
  date: string;
  meal_plan_assignment_id: string;
};

const MEAL_TYPE_ORDER: MealTypeKey[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

const MEAL_TYPE_LABELS: Record<MealTypeKey, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

function eachYmd(start: string, end: string): string[] {
  const out: string[] = [];
  for (let ymd = start; ymd <= end; ymd = addDaysYmd(ymd, 1)) {
    out.push(ymd);
  }
  return out;
}

function normalizeMealType(raw: string | null | undefined): MealTypeKey | null {
  const t = (raw ?? "").toLowerCase();
  if (t === "breakfast" || t === "lunch" || t === "dinner" || t === "snack") {
    return t;
  }
  return null;
}

function pickAssignmentForDay(
  assignments: AssignmentRow[],
  selectionsByDate: Map<string, string>,
  dayYmd: string
): AssignmentRow | null {
  const selectedId = selectionsByDate.get(dayYmd);
  if (selectedId) {
    const selected = assignments.find((a) => a.id === selectedId);
    if (
      selected &&
      selected.start_date <= dayYmd &&
      (selected.end_date == null || selected.end_date >= dayYmd)
    ) {
      return selected;
    }
  }

  const matches = assignments.filter(
    (a) =>
      a.start_date <= dayYmd &&
      (a.end_date == null || a.end_date >= dayYmd)
  );
  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const activeDiff = Number(!!b.is_active) - Number(!!a.is_active);
    if (activeDiff !== 0) return activeDiff;
    const startDiff = b.start_date.localeCompare(a.start_date);
    if (startDiff !== 0) return startDiff;
    return b.created_at.localeCompare(a.created_at);
  });
  return matches[0] ?? null;
}

function pctFromTotals(
  completed: number,
  assigned: number
): number | null {
  if (assigned <= 0) return null;
  return Math.round((Math.min(completed, assigned) / assigned) * 100);
}

function windowPct(
  days: NutritionAdherenceDay[],
  start: string,
  end: string
): number | null {
  let assigned = 0;
  let completed = 0;
  for (const d of days) {
    if (d.date < start || d.date > end) continue;
    if (d.assigned <= 0) continue;
    assigned += d.assigned;
    completed += Math.min(d.completed, d.assigned);
  }
  return pctFromTotals(completed, assigned);
}

function computeStreak(days: NutritionAdherenceDay[], today: string): number {
  const byDate = new Map(days.map((d) => [d.date, d]));
  let streak = 0;
  for (let ymd = today; ; ymd = addDaysYmd(ymd, -1)) {
    const day = byDate.get(ymd);
    if (!day || day.assigned <= 0) {
      // Unplanned / unknown — skip without breaking (look further back a bit).
      // Stop if we walk past available data.
      if (!day) break;
      continue;
    }
    if (day.value != null && day.value >= 1) {
      streak += 1;
      continue;
    }
    break;
  }
  return streak;
}

/**
 * Load adherence history for the client Fuel progress screen.
 * Range covers ~4 months so month navigation + 90d trend have data.
 */
export async function getNutritionAdherenceHistory(
  clientId: string,
  options?: { endDate?: string; startDate?: string }
): Promise<NutritionAdherenceHistory> {
  const endDate = options?.endDate ?? toLocalDateString(new Date());
  const startDefault = addDaysYmd(endDate, -120);
  const startDate = options?.startDate ?? startDefault;

  const empty: NutritionAdherenceHistory = {
    hasAnyAssignment: false,
    days: eachYmd(startDate, endDate).map((date) => ({
      date,
      assigned: 0,
      completed: 0,
      value: null,
    })),
    thisWeekPct: null,
    last4WeeksPct: null,
    streakDays: 0,
    chartSeries: [],
    macrosCompleted: null,
    mealTypeRates: MEAL_TYPE_ORDER.map((type) => ({
      type,
      label: MEAL_TYPE_LABELS[type],
      assigned: 0,
      completed: 0,
      pct: null,
    })),
    bodyPoints: [],
  };

  const [
    assignmentsRes,
    selectionsRes,
    completionsRes,
    bodyRes,
  ] = await Promise.all([
    supabase
      .from("meal_plan_assignments")
      .select("id, meal_plan_id, start_date, end_date, is_active, created_at")
      .eq("client_id", clientId)
      .lte("start_date", endDate)
      .or(`end_date.is.null,end_date.gte.${startDate}`),
    supabase
      .from("client_daily_plan_selection")
      .select("date, meal_plan_assignment_id")
      .eq("client_id", clientId)
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("meal_completions")
      .select("meal_id, meal_option_id, date")
      .eq("client_id", clientId)
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("body_metrics")
      .select("measured_date, weight_kg, body_fat_percentage")
      .eq("client_id", clientId)
      .gte("measured_date", startDate)
      .lte("measured_date", endDate)
      .order("measured_date", { ascending: true }),
  ]);

  if (assignmentsRes.error) throw assignmentsRes.error;
  if (selectionsRes.error) throw selectionsRes.error;
  if (completionsRes.error) throw completionsRes.error;
  // body_metrics errors → treat as no body data
  const assignments = (assignmentsRes.data ?? []) as AssignmentRow[];
  const selections = (selectionsRes.data ?? []) as SelectionRow[];
  const completions = (completionsRes.data ?? []) as CompletionRow[];
  const bodyPoints = ((bodyRes.data ?? []) as BodyMetricsPoint[]).filter(
    (p) => p.weight_kg != null || p.body_fat_percentage != null
  );

  if (assignments.length === 0) {
    return { ...empty, bodyPoints };
  }

  const planIds = [...new Set(assignments.map((a) => a.meal_plan_id))];
  const { data: mealsData, error: mealsErr } = await supabase
    .from("meals")
    .select("id, meal_plan_id, meal_type")
    .in("meal_plan_id", planIds);
  if (mealsErr) throw mealsErr;
  const meals = (mealsData ?? []) as MealRow[];

  const mealsByPlan = new Map<string, MealRow[]>();
  for (const m of meals) {
    if (!mealsByPlan.has(m.meal_plan_id)) mealsByPlan.set(m.meal_plan_id, []);
    mealsByPlan.get(m.meal_plan_id)!.push(m);
  }

  const selectionsByDate = new Map<string, string>();
  for (const s of selections) {
    if (s.date && s.meal_plan_assignment_id) {
      selectionsByDate.set(s.date, s.meal_plan_assignment_id);
    }
  }

  const completionsByDate = new Map<string, CompletionRow[]>();
  for (const c of completions) {
    if (!c.date) continue;
    if (!completionsByDate.has(c.date)) completionsByDate.set(c.date, []);
    completionsByDate.get(c.date)!.push(c);
  }

  const days: NutritionAdherenceDay[] = [];
  for (const ymd of eachYmd(startDate, endDate)) {
    const assignment = pickAssignmentForDay(
      assignments,
      selectionsByDate,
      ymd
    );
    const planMeals = assignment
      ? mealsByPlan.get(assignment.meal_plan_id) ?? []
      : [];
    const assignedIds = new Set(planMeals.map((m) => m.id));
    const assigned = assignedIds.size;
    let completed = 0;
    if (assigned > 0) {
      const dayComps = completionsByDate.get(ymd) ?? [];
      const unique = new Set(
        dayComps.filter((c) => assignedIds.has(c.meal_id)).map((c) => c.meal_id)
      );
      completed = unique.size;
    }
    days.push({
      date: ymd,
      assigned,
      completed,
      value: assigned > 0 ? Math.min(1, completed / assigned) : null,
    });
  }

  const { start: weekStart, end: weekEnd } = getCurrentWeekBounds();
  const fourWeeksStart = addDaysYmd(weekStart, -21);
  const thisWeekPct = windowPct(days, weekStart, weekEnd);
  const last4WeeksPct = windowPct(days, fourWeeksStart, weekEnd);
  const streakDays = computeStreak(days, endDate);

  const chartSeries = days
    .filter((d) => d.assigned > 0)
    .map((d) => ({
      date: d.date,
      compliance: Math.round((d.value ?? 0) * 100),
    }));

  // Macros + meal-type over last 4 calendar weeks (Mon of 4 weeks ago → week end)
  const macroWindowStart = fourWeeksStart;
  const macroWindowEnd = weekEnd;
  const macrosCompleted = await sumCompletedMealMacros(
    completions,
    assignments,
    selectionsByDate,
    mealsByPlan,
    macroWindowStart,
    macroWindowEnd
  );

  const mealTypeRates = computeMealTypeRates(
    assignments,
    selectionsByDate,
    mealsByPlan,
    completionsByDate,
    macroWindowStart,
    macroWindowEnd
  );

  return {
    hasAnyAssignment: true,
    days,
    thisWeekPct,
    last4WeeksPct,
    streakDays,
    chartSeries,
    macrosCompleted,
    mealTypeRates,
    bodyPoints,
  };
}

function computeMealTypeRates(
  assignments: AssignmentRow[],
  selectionsByDate: Map<string, string>,
  mealsByPlan: Map<string, MealRow[]>,
  completionsByDate: Map<string, CompletionRow[]>,
  start: string,
  end: string
): MealTypeCompletionRate[] {
  const tallies: Record<
    MealTypeKey,
    { assigned: number; completed: number }
  > = {
    breakfast: { assigned: 0, completed: 0 },
    lunch: { assigned: 0, completed: 0 },
    dinner: { assigned: 0, completed: 0 },
    snack: { assigned: 0, completed: 0 },
  };

  for (const ymd of eachYmd(start, end)) {
    const assignment = pickAssignmentForDay(
      assignments,
      selectionsByDate,
      ymd
    );
    if (!assignment) continue;
    const planMeals = mealsByPlan.get(assignment.meal_plan_id) ?? [];
    if (planMeals.length === 0) continue;
    const dayComps = completionsByDate.get(ymd) ?? [];
    const completedIds = new Set(
      dayComps
        .filter((c) => planMeals.some((m) => m.id === c.meal_id))
        .map((c) => c.meal_id)
    );
    for (const m of planMeals) {
      const type = normalizeMealType(m.meal_type);
      if (!type) continue;
      tallies[type].assigned += 1;
      if (completedIds.has(m.id)) tallies[type].completed += 1;
    }
  }

  return MEAL_TYPE_ORDER.map((type) => ({
    type,
    label: MEAL_TYPE_LABELS[type],
    assigned: tallies[type].assigned,
    completed: tallies[type].completed,
    pct: pctFromTotals(tallies[type].completed, tallies[type].assigned),
  }));
}

async function sumCompletedMealMacros(
  completions: CompletionRow[],
  assignments: AssignmentRow[],
  selectionsByDate: Map<string, string>,
  mealsByPlan: Map<string, MealRow[]>,
  start: string,
  end: string
): Promise<CompletedMacrosSummary | null> {
  // Completions that count: meal was assigned that day
  const relevant: CompletionRow[] = [];
  for (const c of completions) {
    if (!c.date || c.date < start || c.date > end) continue;
    const assignment = pickAssignmentForDay(
      assignments,
      selectionsByDate,
      c.date
    );
    if (!assignment) continue;
    const planMeals = mealsByPlan.get(assignment.meal_plan_id) ?? [];
    if (!planMeals.some((m) => m.id === c.meal_id)) continue;
    relevant.push(c);
  }
  if (relevant.length === 0) return null;

  const mealIds = [...new Set(relevant.map((c) => c.meal_id))];
  const { data: foodItems, error } = await supabase
    .from("meal_food_items")
    .select(
      `
      meal_id,
      meal_option_id,
      quantity,
      foods (
        serving_size,
        calories_per_serving,
        protein,
        carbs,
        fat
      )
    `
    )
    .in("meal_id", mealIds);
  if (error) throw error;
  if (!foodItems?.length) {
    return { protein_g: 0, carbs_g: 0, fat_g: 0, calories: 0 };
  }

  let protein_g = 0;
  let carbs_g = 0;
  let fat_g = 0;
  let calories = 0;

  for (const comp of relevant) {
    const matching = (foodItems as any[]).filter(
      (item) =>
        item.meal_id === comp.meal_id &&
        (item.meal_option_id === comp.meal_option_id ||
          (item.meal_option_id == null && comp.meal_option_id == null))
    );
    for (const item of matching) {
      const food = item.foods;
      if (!food) continue;
      const mult = Number(item.quantity) / (Number(food.serving_size) || 1);
      calories += Math.round(Number(food.calories_per_serving || 0) * mult);
      protein_g += Number(food.protein || 0) * mult;
      carbs_g += Number(food.carbs || 0) * mult;
      fat_g += Number(food.fat || 0) * mult;
    }
  }

  return {
    calories,
    protein_g: Math.round(protein_g * 10) / 10,
    carbs_g: Math.round(carbs_g * 10) / 10,
    fat_g: Math.round(fat_g * 10) / 10,
  };
}

/** Calendar days for AdherenceCalendar: value 0–1 or null. */
export function toCalendarDays(
  days: NutritionAdherenceDay[]
): { date: string; value: number | null }[] {
  return days.map((d) => ({ date: d.date, value: d.value }));
}
