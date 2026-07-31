import { MealPlanService } from "@/lib/mealPlanService";
import type { MealPlanCommitResult, MealPlanDraftState } from "@/types/mealPlanDraft";
import {
  cloneMealPlanDraft,
  isTempId,
  recomputeDraftState,
} from "./mealPlanDraftUtils";

function findBaselineMeal(baseline: MealPlanDraftState, mealId: string) {
  return baseline.meals.find((m) => m.id === mealId);
}

function findBaselineOption(
  baselineMeal: ReturnType<typeof findBaselineMeal>,
  optionId: string,
) {
  return baselineMeal?.options.find((o) => o.id === optionId);
}

/**
 * Persists workingCopy to the database by walking the tree in FK-safe order.
 * Mutates a clone of workingCopy to backfill temp ids as rows are created.
 * On partial failure, backfilled ids remain in workingCopy so retry is safe.
 */
export async function commitMealPlanTree(
  baseline: MealPlanDraftState,
  workingCopy: MealPlanDraftState,
): Promise<MealPlanCommitResult> {
  const draft = cloneMealPlanDraft(workingCopy);
  const workingMealIds = new Set(draft.meals.map((m) => m.id));

  try {
    // 1. Delete meals removed from working copy
    for (const bMeal of baseline.meals) {
      if (!workingMealIds.has(bMeal.id) && !isTempId(bMeal.id)) {
        const ok = await MealPlanService.deleteMeal(bMeal.id);
        if (!ok) throw new Error(`Failed to delete meal "${bMeal.name}"`);
      }
    }

    // 2. Meals in display order — order_index written by position
    for (let mealIndex = 0; mealIndex < draft.meals.length; mealIndex++) {
      const meal = draft.meals[mealIndex];
      let mealId = meal.id;
      const baselineMeal = findBaselineMeal(baseline, meal.id);

      if (isTempId(meal.id)) {
        const { meal: created, defaultOption } = await MealPlanService.createMeal(
          draft.mealPlanId,
          {
            name: meal.name,
            meal_type: meal.mealType,
            order_index: mealIndex,
          },
        );
        mealId = created.id;
        meal.id = mealId;
        meal.orderIndex = mealIndex;

        const firstOpt = meal.options[0];
        if (firstOpt && isTempId(firstOpt.id)) {
          firstOpt.id = defaultOption.id;
          if (firstOpt.name !== defaultOption.name) {
            await MealPlanService.updateMealOption(defaultOption.id, { name: firstOpt.name });
          }
        }
      } else {
        const needsUpdate =
          !baselineMeal ||
          baselineMeal.name !== meal.name ||
          baselineMeal.mealType !== meal.mealType ||
          baselineMeal.orderIndex !== mealIndex;
        if (needsUpdate) {
          await MealPlanService.updateMeal(meal.id, {
            name: meal.name,
            meal_type: meal.mealType,
            order_index: mealIndex,
          });
        }
        meal.orderIndex = mealIndex;
      }

      const resolvedBaselineMeal = findBaselineMeal(baseline, mealId) ?? baselineMeal;

      // Delete removed options
      if (resolvedBaselineMeal) {
        const workingOptionIds = new Set(meal.options.map((o) => o.id));
        for (const bOpt of resolvedBaselineMeal.options) {
          if (!workingOptionIds.has(bOpt.id) && !isTempId(bOpt.id)) {
            const ok = await MealPlanService.deleteMealOption(bOpt.id);
            if (!ok) throw new Error(`Failed to delete option "${bOpt.name}"`);
          }
        }
      }

      // 3. Options in order
      for (let optIndex = 0; optIndex < meal.options.length; optIndex++) {
        const opt = meal.options[optIndex];
        let optionId = opt.id;
        const bOpt = findBaselineOption(resolvedBaselineMeal, opt.id);

        if (isTempId(opt.id)) {
          const created = await MealPlanService.createMealOption(mealId, opt.name);
          optionId = created.id;
          opt.id = optionId;
          if (optIndex !== created.order_index) {
            await MealPlanService.updateMealOption(optionId, { order_index: optIndex });
          }
        } else {
          const needsUpdate =
            !bOpt || bOpt.name !== opt.name || bOpt.orderIndex !== optIndex;
          if (needsUpdate) {
            await MealPlanService.updateMealOption(opt.id, {
              name: opt.name,
              order_index: optIndex,
            });
          }
        }
        opt.orderIndex = optIndex;

        const resolvedBOpt = findBaselineOption(resolvedBaselineMeal, optionId) ?? bOpt;

        // Delete removed foods
        if (resolvedBOpt) {
          const workingFoodIds = new Set(opt.foods.map((f) => f.id));
          for (const bFood of resolvedBOpt.foods) {
            if (!workingFoodIds.has(bFood.id) && !isTempId(bFood.id)) {
              const ok = await MealPlanService.removeFoodFromOption(bFood.id);
              if (!ok) throw new Error(`Failed to remove food "${bFood.foodName}"`);
            }
          }
        }

        // 4. Foods
        for (const food of opt.foods) {
          if (isTempId(food.id)) {
            const item = await MealPlanService.addFoodToOption(
              mealId,
              optionId,
              food.foodId,
              food.quantity,
              food.unit,
            );
            if (!item) throw new Error(`Failed to add food "${food.foodName}"`);
            food.id = item.id;
          } else {
            const bFood = resolvedBOpt?.foods.find((f) => f.id === food.id);
            if (
              bFood &&
              (bFood.quantity !== food.quantity || bFood.unit !== food.unit)
            ) {
              const updated = await MealPlanService.updateFoodInOption(food.id, {
                quantity: food.quantity,
                unit: food.unit,
              });
              if (!updated) throw new Error(`Failed to update food "${food.foodName}"`);
            }
          }
        }
      }
    }

    const committed = recomputeDraftState(draft);
    return { success: true, state: committed };
  } catch (err) {
    // Backfill from partial progress is already in `draft` — caller should assign to workingCopy
    Object.assign(workingCopy, draft);
    const message = err instanceof Error ? err.message : "Save failed";
    return { success: false, error: message, state: recomputeDraftState(draft) };
  }
}
