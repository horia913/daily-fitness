export type {
  DisplayFoodItem,
  DisplayMealOption,
  DisplayPlanMeal,
  MealHueIndex,
} from "./types";

export {
  computePlanTotalsFromMeals,
  loadPlanBuilderMeals,
} from "./loadPlanBuilderMeals";

export {
  computeGramDelta,
  computeItemMacros,
  computeKcalDelta,
  formatFoodMacros,
  formatKcal,
  formatMacroLine,
  formatQty,
  mealTypeBadge,
  optionHueIndex,
  roundInt,
} from "./mealDisplayUtils";

export { PlanMacroStrip, hueBadgeClass, hueOptClass } from "./PlanMacroStrip";
export { MealListDisplay } from "./MealListDisplay";
export { MealListEditor } from "./MealListEditor";
export { CoachPlanBuilderView } from "./CoachPlanBuilderView";
export { MealPlanSaveButton } from "./MealPlanSaveButton";
export { InlineFoodSearch, type InlineFoodSearchHandle } from "./InlineFoodSearch";
export { InlineCreateFoodForm } from "./InlineCreateFoodForm";
export { MealPlanDraftResumeDialog } from "./MealPlanDraftResumeDialog";
export type { MealListEditorHandle } from "./MealListEditor";
