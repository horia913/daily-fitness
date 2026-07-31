import type { MealPlanDraftState, StoredMealPlanDraft } from "@/types/mealPlanDraft";
import { MEAL_PLAN_DRAFT_STORAGE_VERSION } from "@/types/mealPlanDraft";
import { mealPlanDraftsEqual } from "./mealPlanDraftUtils";

const KEY_PREFIX = "dailyfitness:meal-plan-draft";

export function mealPlanDraftStorageKey(coachId: string, mealPlanId: string): string {
  return `${KEY_PREFIX}:${coachId}:${mealPlanId}`;
}

export function readStoredMealPlanDraft(
  coachId: string,
  mealPlanId: string,
): StoredMealPlanDraft | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(mealPlanDraftStorageKey(coachId, mealPlanId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredMealPlanDraft;
    if (parsed?.version !== MEAL_PLAN_DRAFT_STORAGE_VERSION || !parsed.workingCopy) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredMealPlanDraft(
  coachId: string,
  mealPlanId: string,
  workingCopy: MealPlanDraftState,
): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const payload: StoredMealPlanDraft = {
      version: MEAL_PLAN_DRAFT_STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      workingCopy,
    };
    window.localStorage.setItem(
      mealPlanDraftStorageKey(coachId, mealPlanId),
      JSON.stringify(payload),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearStoredMealPlanDraft(coachId: string, mealPlanId: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(mealPlanDraftStorageKey(coachId, mealPlanId));
  } catch {
    /* ignore */
  }
}

export function storedMealPlanDraftDiffersFromBaseline(
  stored: StoredMealPlanDraft,
  baseline: MealPlanDraftState,
): boolean {
  return !mealPlanDraftsEqual(stored.workingCopy, baseline);
}
