# Nutrition/Fuel Tab — Functionality Audit (Read-Only)

**Date:** March 3, 2026  
**Scope:** All nutrition, fuel, meals, macros, and dietary tracking in the app.  
**No code changes made.**

---

## 1. Pages & Routes

### Client (`src/app/client/`)

| Path | Purpose | Status |
|------|---------|--------|
| `/client/nutrition` | Main Nutrition/Fuel dashboard: today’s meals from active plan, macro totals, meal options, photo logging, goal-based/hybrid views, Add Food, water, calorie trend. | **Working** — Renders; uses `meal_plan_assignments`, `meals`, `meal_food_items`, `meal_options`, `meal_photo_logs`, `meal_completions`, `goals`, `food_log_entries`, `nutrition_logs`. |
| `/client/nutrition/meals/[id]` | Meal detail: expects URL like `breakfast-<meal_plan_id>`. Shows items from **meal_plan_items** (plan-level by meal_type). | **Working** — Renders; uses `meal_plan_assignments`, `meal_plan_items`, `foods`. **Note:** Uses `meal_plan_items` model, not `meals`/`meal_food_items` (different from main nutrition page). |
| `/client/nutrition/foods/[id]` | Food detail: name, brand, serving, macros, edit/delete. | **Working** — Renders; uses `foods`. |
| `/client/nutrition/foods/create` | Create custom food. | **Working** — Renders; inserts into `foods` (RLS: coach/admin only for write; client create may depend on RLS). |
| `/client/progress/nutrition` | “Nutrition Tracker”: assigned meals, log meal photo per meal per day, daily totals, compliance chart. | **Working** — Renders; uses `meal_plan_assignments`, `meals`, `meal_food_items`, `meal_completions`, `meal-photos` storage; writes to **meal_completions** (not `meal_photo_logs`). |

### Coach (`src/app/coach/`)

| Path | Purpose | Status |
|------|---------|--------|
| `/coach/nutrition` | Nutrition hub: links to Meal Plans, Food Database, Assignments. | **Working** — Navigation only. |
| `/coach/nutrition/meal-plans` | List meal plans; counts from **meal_plan_items**; assign plan to clients. | **Working** — Uses `meal_plans`, `meal_plan_items`, `meal_plan_assignments`; `MealPlanService`, `MealPlanCard`, `MealPlanAssignmentModal`. |
| `/coach/nutrition/meal-plans/create` | Create meal plan (name, target calories, description). | **Working** — Inserts into `meal_plans`. |
| `/coach/nutrition/meal-plans/[id]` | Meal plan detail: add/edit **meals** (entities) and options via `MealCreator` / `MealOptionEditor`. | **Working** — Uses `meals`, `meal_food_items`, `meal_options` (via MealPlanService). |
| `/coach/nutrition/meal-plans/[id]/edit` | Edit meal plan metadata (name, target_calories, description). | **Working** — Updates `meal_plans`. |
| `/coach/nutrition/foods` | Food database: list/search foods, nutrition info. | **Working** — Renders `OptimizedFoodDatabase`; uses `foods`. |
| `/coach/nutrition/assignments` | Nutrition assignments view. | **Working** — Renders `OptimizedNutritionAssignments`; uses `meal_plan_assignments`, `meal_completions`. |
| `/coach/meals` | “Nutrition Studio”: different UI (MealPlanBuilder, meal_plan_items-style?). | **Working** — Large page with MealPlanBuilder; uses `meal_plan_items` and foods. |

### Other references

- **Client:** Bottom nav label “Fuel” → `/client/nutrition` (`BottomNav.tsx`). Dashboard layout link to `/client/nutrition` (`DashboardLayout.tsx`).
- **Coach:** Menu section “Nutrition” → Meal Plans, Food Database, Assignments (`menu/page.tsx`). `DashboardWrapper` links to `/coach/nutrition`.

---

## 2. Components

### Client / shared

| File | Purpose | Status |
|------|---------|--------|
| `src/components/client/QuickFoodSearch.tsx` | Food search for logging. | **Working** — Used in nutrition flow. |
| `src/components/client/MealCardWithOptions.tsx` | Meal card with options. | **Working** — Used on client nutrition. |
| `src/components/client/GoalBasedNutritionView.tsx` | Goal-based macro view (no meal plan). | **Working** — Uses `food_log_entries`, goals. |
| `src/components/client/HybridNutritionView.tsx` | Hybrid (meal plan + macro goals). | **Working** — Combines plan meals and manual entries. |
| `src/components/nutrition/AddFoodModal.tsx` | Modal to add a food to a meal. | **Working** — Search foods, add to meal. |
| `src/components/client/FoodLogEntry.tsx` | Single food log entry display/edit. | **Working** — Used in goal-based/hybrid. |
| `src/components/progress/NutritionComplianceChart.tsx` | Compliance over time (1W/2W/1M/3M). | **Working** — Receives precomputed daily compliance. |
| `src/components/ui/NutritionRing.tsx` | UI ring for nutrition. | **Stub/UI** — Presentational. |

### Coach

| File | Purpose | Status |
|------|---------|--------|
| `src/components/coach/client-views/ClientMealsView.tsx` | Client nutrition tab: mode (meal_plan / goal_based / hybrid), SetNutritionGoals, compliance chart, meal plan compliance, macro adherence. | **Working** — Uses `meal_photo_logs` for “today’s meals” compliance; `meal_plan_assignments`, `meals`, `getNutritionComplianceTrend`, `getDayEntries` (food_log_entries). |
| `src/components/coach/client-views/SetNutritionGoals.tsx` | Set/remove client macro targets (calories, protein, carbs, fat, water). | **Working** — Calls `/api/coach/clients/[clientId]/nutrition-goals` (POST/DELETE); reads goals via `getClientNutritionGoals`. |
| `src/components/coach/MealCreator.tsx` | Create/edit meals (meals + meal_food_items) in a plan. | **Working** — Used on meal plan detail. |
| `src/components/coach/MealOptionEditor.tsx` | Edit meal options. | **Working** — Used on meal plan detail. |
| `src/components/coach/OptimizedFoodDatabase.tsx` | Coach food database UI. | **Working** — List/search, nutrition display. |
| `src/components/coach/OptimizedNutritionAssignments.tsx` | Assignments list; uses `meal_completions`. | **Working** — Renders; links to `/coach/nutrition`. |
| `src/components/features/nutrition/MealPlanCard.tsx` | Meal plan card. | **Working** — Used on coach meal-plans list. |
| `src/components/features/nutrition/MealPlanAssignmentModal.tsx` | Assign meal plan to clients. | **Working** — Used on coach meal-plans list. |
| `src/components/MealPlanBuilder.tsx` | Build plan from meal_plan_items (Nutrition Studio). | **Working** — Used on `/coach/meals`. |
| `src/components/MealForm.tsx` | Meal form (likely legacy/alternate). | **Present** — Usage context not fully traced. |

---

## 3. Database Tables (Schema + Migrations)

From Supabase schema CSVs and migrations:

| Table | Purpose | RLS |
|-------|---------|-----|
| `meal_plans` | Plan metadata (name, target_calories, coach_id, etc.). | Coach CRUD; client read if assigned. |
| `meal_plan_assignments` | Assign plan to client (start/end, is_active). | Coach CRUD; client read own. |
| `meals` | Meals as entities inside a plan (name, meal_type, order_index). | Coach CRUD; client read assigned. |
| `meal_food_items` | Food rows per meal (optionally per meal_option_id). | Coach CRUD; client read assigned. |
| `meal_options` | Option variants per meal. | Coach CRUD; client read assigned. |
| `meal_plan_items` | Plan-level items by meal_type (and optional day_of_week). | Coach CRUD; client read assigned. |
| `meal_completions` | Client completed a meal (meal_id, client_id, completed_at, photo_url, notes). | Client insert/read own; coach read clients’. |
| `meal_photo_logs` | Log of meal photo per client/meal/date (used for “logged today”). | Client insert/read own; coach read. |
| `foods` | Food master (name, serving, calories_per_serving, protein, carbs, fat, fiber, etc.). | Public read; coach/admin write. |
| `food_log_entries` | Goal-based manual entries (client_id, food_id, log_date, meal_slot, quantity, calculated macros). | Client CRUD own; coach read. |
| `nutrition_logs` | Daily aggregated macros per client/date (from meal plan and/or food_log_entries). | Client manage own; coach read. |
| `goals` | Includes nutrition goals (pillar = 'nutrition', goal_type = 'nutrition') for macro targets. | Set via coach API; client read. |
| `assigned_meal_plans` | Legacy? (schema CSV). | RLS present. |
| `meal_items` | Legacy meal items (food_name, quantity, etc.). | RLS present. |

**Note:** `nutrition_logs` and `food_log_entries` appear in migrations (e.g. `20260217_food_log_entries.sql`, `20260201_tracking_tables_...`) but are not listed in the main schema CSV excerpt searched; they are used in code and assumed to exist.

---

## 4. Services & API Routes

### Services (`src/lib/`)

| File | Purpose | Status |
|------|---------|--------|
| `nutritionLogService.ts` | Mode (meal_plan / goal_based / hybrid / none), nutrition goals from goals table, updateDailyLog (meal_photo_logs + food_log_entries → nutrition_logs), getNutritionComplianceTrend. | **Working** — Core logic for aggregation and compliance; uses **meal_photo_logs** for “logged” meals, not meal_completions. |
| `foodLogService.ts` | addEntry, updateEntry, deleteEntry, getDayEntries; writes to `food_log_entries`, calls `updateDailyLog`. | **Working** — Used for goal-based/hybrid logging. |
| `mealPlanService.ts` | MealPlans CRUD, getMealItems (meal_plan_items), getMeals (meals), meal options and food items. | **Working** — Used by coach meal-plans and meal plan detail. |
| `mealPhotoService.ts` | Meal photo handling. | **Present** — Used where meal photos are managed. |
| `metrics/nutrition.ts` | getTotalMeals, getNutritionCompliance (from **meal_completions**). | **Working** — Used by coach progress/analytics. |
| `prefetch.ts` | prefetchFoodLibrary (foods), prefetchNutritionData (disabled comment: “Using new meal plan system”). | **Partial** — Food prefetch used; nutrition prefetch disabled. |
| `validation/validators.ts` | MealPlanSchema, MealSchema, CreateMealPlanSchema, etc. | **Present** — Validation only. |
| `coachDashboardService.ts` | totalMealPlans, hasActiveMealPlan, noMealPlan alerts. | **Working** — Uses meal_plans, meal_plan_assignments. |
| `coach/controlRoomService.ts` | coachNutritionCompliancePct (signals). | **Stub** — Returns null for now. |

### API routes (`src/app/api/`)

| Path | Purpose | Status |
|------|---------|--------|
| `POST/DELETE /api/coach/clients/[clientId]/nutrition-goals` | Set or remove client nutrition goals (goals table, pillar = 'nutrition'). | **Working** — Auth + coach–client check; used by SetNutritionGoals. |
| `GET /api/coach/analytics/overview` | Includes totalMeals from meal_completions. | **Working** — Counts meal completions in period. |

No other nutrition-specific API routes found.

---

## 5. What Actually Works

- **Client Nutrition tab (Fuel):** Renders; loads active assignment, meals, options, photo logs, completions; shows macro totals; can log meal photo (writes to **meal_completions** and `meal-photos` bucket); goal-based/hybrid views use `food_log_entries` and goals; links to progress/nutrition.
- **Client Progress → Nutrition:** Renders; loads same plan/meals; **writes only to meal_completions** (and storage); compliance chart from getNutritionComplianceTrend (which uses **nutrition_logs** + goals).
- **Coach: Set nutrition goals:** SetNutritionGoals → POST nutrition-goals API → goals table; client goal-based/hybrid views read these.
- **Coach: Meal plans:** List (meal_plan_items counts), create, detail (meals + meal_food_items + options), edit metadata; assign plan to clients.
- **Coach: Food database:** List/search foods.
- **Coach: Client Meals view:** Mode, compliance chart, meal plan compliance (from **meal_photo_logs**), macro adherence (from food_log_entries + goals).
- **Compliance / analytics:** Coach progress and analytics use **meal_completions** (e.g. metrics/nutrition, analytics overview); nutritionLogService and ClientMealsView use **meal_photo_logs** for “logged today” and aggregation.

**Inconsistency (no fix applied):**  
- **Client progress/nutrition** writes to **meal_completions** (and storage).  
- **nutritionLogService** and **ClientMealsView** “today’s meals” compliance use **meal_photo_logs**.  
If nothing else writes to `meal_photo_logs` when the client logs on progress/nutrition, coach-side “today’s meals” and daily aggregation may not reflect those logs. Either both tables are kept in sync elsewhere, or this is a known gap.

---

## 6. Coach vs Client Split & Intended Workflow

| Who | Can do |
|-----|--------|
| **Coach** | Create/edit meal plans (meal_plans, meals, meal_food_items, meal_options). Use meal_plan_items in Nutrition Studio and list counts. Assign/unassign meal plans. Set client macro goals (goals with pillar = 'nutrition'). View client nutrition (ClientMealsView: compliance, macro adherence, food log). Manage food database (foods). |
| **Client** | See assigned plan and meals (meals + meal_food_items + options). Log “meal completed” (progress/nutrition → **meal_completions** + photo). In goal_based/hybrid mode, log foods (food_log_entries). View nutrition dashboard, progress nutrition tracker, meal detail (meal_plan_items), food detail/create. |

**Intended workflow (inferred):**  
Coach assigns a meal plan and/or sets macro goals. Client follows the plan and/or logs food; client can log completion per meal (photo) and/or log individual foods. Compliance and daily totals are derived from meal_photo_logs + food_log_entries and stored in nutrition_logs; coach sees compliance and macro adherence in the client’s Nutrition tab. The only confirmed inconsistency is client progress/nutrition writing to **meal_completions** while aggregation/compliance for “logged meals” in services and ClientMealsView use **meal_photo_logs**.

---

## 7. Summary Table

| Item | Location | Status |
|------|----------|--------|
| Client Nutrition (Fuel) dashboard | `app/client/nutrition/page.tsx` | Working, real data |
| Client Progress Nutrition tracker | `app/client/progress/nutrition/page.tsx` | Working; writes meal_completions |
| Client meal detail | `app/client/nutrition/meals/[id]/page.tsx` | Working; uses meal_plan_items |
| Client food detail/create | `app/client/nutrition/foods/` | Working |
| Coach Nutrition hub | `app/coach/nutrition/page.tsx` | Working |
| Coach Meal Plans (list/create/detail/edit) | `app/coach/nutrition/meal-plans/` | Working; meals + meal_plan_items |
| Coach Foods | `app/coach/nutrition/foods/page.tsx` | Working |
| Coach Assignments | `app/coach/nutrition/assignments/page.tsx` | Working |
| Coach Meals (Nutrition Studio) | `app/coach/meals/page.tsx` | Working; MealPlanBuilder |
| ClientMealsView | `components/coach/client-views/ClientMealsView.tsx` | Working; uses meal_photo_logs |
| SetNutritionGoals | `components/coach/client-views/SetNutritionGoals.tsx` | Working |
| nutritionLogService | `lib/nutritionLogService.ts` | Working; uses meal_photo_logs |
| foodLogService | `lib/foodLogService.ts` | Working |
| mealPlanService | `lib/mealPlanService.ts` | Working |
| Nutrition goals API | `api/coach/clients/[clientId]/nutrition-goals/route.ts` | Working |
| meal_completions vs meal_photo_logs | Multiple | Inconsistency: progress page writes completions; service/coach view use photo_logs |

End of audit.
