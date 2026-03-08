# Meal Options System — Deep Audit (Read-Only)

**Date:** March 3, 2026  
**Scope:** Full data model, UI, and data flow for meal options. No code changes.

---

## 1. `meal_options` table — full schema

From migration `20260129_meal_options.sql`:

| Column        | Type      | Nullable | Default              | Description |
|---------------|-----------|----------|----------------------|-------------|
| `id`          | uuid      | NO       | gen_random_uuid()    | Primary key |
| `meal_id`     | uuid      | NO       | —                    | FK → meals(id) ON DELETE CASCADE |
| `name`        | text      | NO       | —                    | Display name (e.g. "Option A", "Vegetarian") |
| `order_index` | integer   | —        | 0                    | Display order (0-based) |
| `created_at`  | timestamptz | —      | now()                | Created timestamp |

**Index:** `idx_meal_options_meal_id` on `meal_options(meal_id)`.

**Relationship:** Each row is one **variant** of a meal. A meal (breakfast/lunch/dinner/snack slot) can have 0–5 options; each option has its own name and order.

---

## 2. Relationship: meals ↔ meal_options ↔ meal_food_items

- **meals:** One row per “meal slot” in a plan (e.g. “Breakfast”, “Lunch”). Columns include `id`, `meal_plan_id`, `name`, `meal_type`, `order_index`, `notes`.
- **meal_options:** Many options per meal. `meal_id` → `meals.id`. An option is a variant of that meal (e.g. “Option 1”, “High protein”).
- **meal_food_items:** Each row is one food line in a meal. It can belong to:
  - The **base meal** (legacy): `meal_option_id` IS NULL.
  - A **specific option**: `meal_option_id` = that option’s id.

So: **a meal_option is a variant of a meal, with its own set of food items** (rows in `meal_food_items` where `meal_option_id` = that option’s id).

---

## 3. `meal_food_items` and `meal_option_id`

From the same migration:

- **meal_food_items** has column:  
  `meal_option_id uuid REFERENCES meal_options(id) ON DELETE CASCADE` (nullable).
- **Semantics:**
  - `meal_option_id` IS NULL → item belongs to the meal itself (legacy “no options”).
  - `meal_option_id` = option id → item belongs to that option only.
- Index: `idx_meal_food_items_meal_option_id` on `meal_food_items(meal_option_id)`.

**Linking rule:**  
- Legacy meal: all items have `meal_option_id` NULL.  
- Meal with options: every item has `meal_option_id` set to exactly one option; no item is “shared” across options.

---

## 4. MealOptionEditor.tsx — what it does and key code

**Role:** Coach UI to create/edit/delete options for a meal and to add/remove/quantity-adjust foods per option.

**Data loading:**

- `loadOptions()` → `MealPlanService.getMealWithOptions(mealId)` (meal + options + food items).
- If the meal has legacy items (no options) but has food items, they are shown as an unsaved “Default” option; the coach can then “Add Option” which triggers migration of those items to a real “Default” option (see `migrateLegacyFoodsToDefaultOption`).

**Option management:**

- **Add option:** `handleAddOption()` → `MealPlanService.createMealOption(mealId, "Option N")` → INSERT into `meal_options`. Max 5 options per meal.
- **Delete option:** `handleDeleteOption(optionId)` → `MealPlanService.deleteMealOption(optionId)`. At least one option must remain.
- **Rename option:** `handleRenameOption(optionId, newName)` → `MealPlanService.updateMealOption(optionId, { name })`.

**Food per option:**

- **Add food:** `handleAddFood(optionId, food)` → `MealPlanService.addFoodToOption(mealId, optionId, food.id, ...)` → INSERT into `meal_food_items` with `meal_option_id: optionId`.
- **Remove food:** `handleRemoveFood(optionId, foodItemId)` → `MealPlanService.removeFoodFromOption(foodItemId)` (DELETE from `meal_food_items`).
- **Change quantity:** `handleUpdateFoodQuantity(...)` → `MealPlanService.updateFoodInOption(foodItemId, { quantity })`.

**Key code (add option + add food to option):**

```ts
// MealOptionEditor.tsx — Add Option
const handleAddOption = async () => {
  if (options.length >= MAX_OPTIONS) { alert(`Maximum ${MAX_OPTIONS} options allowed per meal.`); return; }
  const optionName = `Option ${options.length + 1}`;
  setSaving(true);
  const newOption = await MealPlanService.createMealOption(mealId, optionName);
  await loadOptions();
  setExpandedOption(newOption.id);
  setSaving(false);
};

// Add food to an option
const handleAddFood = async (optionId: string, food: Food) => {
  const foodItem = await MealPlanService.addFoodToOption(
    mealId, optionId, food.id, food.serving_size, food.serving_unit
  );
  setOptions(prev => prev.map(opt =>
    opt.id === optionId
      ? { ...opt, food_items: [...opt.food_items, foodItem], totals: MealPlanService.calculateFoodItemTotals([...opt.food_items, foodItem]) }
      : opt
  ));
};
```

**Where it’s used:** Meal plan detail page (`/coach/nutrition/meal-plans/[id]`) when the coach edits a meal; `MealCreator` can open `MealOptionEditor` for that meal.

**Status:** **Working** — coach can create/rename/delete options and manage foods per option; all writes go to `meal_options` and `meal_food_items` with correct `meal_option_id`.

---

## 5. MealCardWithOptions.tsx — what the client sees and where selection is stored

**Role:** Card for one meal that supports multiple options: carousel to pick an option, then upload one photo per meal per day; the chosen option is sent when logging.

**What the client sees:**

- Meal name and emoji.
- If the meal has options (and more than one): **carousel** with prev/next, option name badge, “N of M” and dots. One option is “current” (`selectedOptionIndex`).
- For the current (or only) option: list of foods and total kcal.
- “Upload Photo” and, after selecting a file, a **preview modal** with “Confirm Photo”, option name badge, and “Option selection is locked. Discard to choose a different option.”
- After logging: photo, “Logged” badge, and **option name badge** if `meal.loggedOptionId` is set.

**Can the client pick an option?**  
Yes. They change the selected option with prev/next; that choice is kept in local state `selectedOptionIndex` (and thus `currentOption`).

**Is the selection stored anywhere?**  
Only at **log time**. When they click “Log Meal” in the preview:

- `optionId = currentOption?.id || null` is passed to `uploadMealPhoto(..., optionId)`.
- `mealPhotoService.uploadMealPhoto` inserts into **meal_photo_logs** with `meal_option_id: mealOptionId || null`.

So the **option choice is stored only in `meal_photo_logs.meal_option_id`** when the client logs via this flow. There is no separate “selected option” table; the only persistent record of “which option they chose” is that column on the photo log row.

**Key code (logging with option):**

```ts
// MealCardWithOptions.tsx
const handleLogMeal = async () => {
  const optionId = currentOption?.id || null;
  const validationError = validateMealOptionForUpload(hasOptions, optionId);
  if (validationError) { setError(validationError); return; }
  const result = await uploadMealPhoto(clientId, meal.id, previewFile, today, undefined, optionId);
  if (result.success) {
    onMealLogged(meal.id, optionId, result.photoLog?.photo_url || '');
    handleDiscardPhoto();
  }
};
```

**Critical finding:** **MealCardWithOptions is not used anywhere.** Grep shows no imports of `MealCardWithOptions` in the app. The client nutrition page builds `meals` with `options` and `loggedOptionId` (from `meal_photo_logs`) but does **not** render `MealCardWithOptions`; it only renders a compact “My Meal Plan” list (meal name, calories, display items, Add Food). So in the current app, **no screen shows the option carousel or sends optionId to meal_photo_logs**. Option selection UI exists but is dead code.

---

## 6. Meal completion and options — two paths

**Path A — Main nutrition flow (MealCardWithOptions → meal_photo_logs):**

- Implemented in `MealCardWithOptions` + `mealPhotoService.uploadMealPhoto`.
- Writes: **meal_photo_logs** (with `meal_option_id`), and storage in bucket `meal-photos`.
- Uniqueness: one row per (client_id, meal_id, log_date). `meal_option_id` is **informational only** (does not change uniqueness).
- So the system **does** know which option was chosen when the client logs via this path — but this path is **not in use** because the component is never mounted.

**Path B — Progress/Nutrition tracker (`/client/progress/nutrition`):**

- Renders a simple list of meals; no option carousel, no option selection.
- On “Upload” it writes to **meal_completions** only (and to storage bucket `meal-photos`).
- **meal_completions** has **no** `meal_option_id` column (schema: id, meal_id, client_id, completed_at, photo_url, notes, created_at). So when the client logs here, **option is never stored**.

**Summary:**

- **If** the client could use MealCardWithOptions: option would be stored in `meal_photo_logs.meal_option_id`.
- **Current** behavior: the only live logging UI for “meal done” is progress/nutrition, which uses `meal_completions` only → **option selection is not tracked** in production today.

---

## 7. Coach: does the coach see which option was chosen?

- **Data:** If a log were created via MealCardWithOptions, `meal_photo_logs.meal_option_id` would hold the chosen option id; the coach could join to `meal_options` to get the option name.
- **UI:** No coach component references `meal_option_id` or “logged option”. `ClientMealsView` and related coach views show “today’s meals” and compliance but do **not** display which option was selected. So even if option were stored, **coach UI does not show it** — that part is stubbed/missing.

---

## 8. What’s working, stubbed, or broken

| Step | Status | Notes |
|------|--------|--------|
| Coach creates options | **Working** | MealOptionEditor + MealPlanService; options and option-scoped food items persist correctly. |
| Coach adds/edits foods per option | **Working** | addFoodToOption, updateFoodInOption, removeFoodFromOption with `meal_option_id`. |
| Client sees options | **Stubbed** | Data is loaded (options + items) and `loggedOptionId` is set from meal_photo_logs on main nutrition page, but the only UI that shows the option carousel is MealCardWithOptions, which is **never rendered**. Compact list does not show option picker. |
| Client picks an option | **Stubbed** | Implemented in MealCardWithOptions (local state + carousel), but that component is unused. |
| Client marks meal complete with option | **Broken / split** | (1) Path that would store option (MealCardWithOptions → meal_photo_logs) is not in the UI. (2) Path that is in the UI (progress/nutrition → meal_completions) does not capture or store option. |
| Coach sees which option was chosen | **Not implemented** | No coach UI reads or displays `meal_photo_logs.meal_option_id` (or option name). |

---

## 9. End-to-end data flow (with gaps)

```
Coach
  → meal_plans (plan)
  → meals (slots in plan)
  → meal_options (variants per meal, 1–5)
  → meal_food_items (meal_id + meal_option_id → option-specific or legacy)

Client (intended if MealCardWithOptions were used)
  → Reads: meal_plan_assignments, meals, meal_options, meal_food_items
  → Picks option in UI (local state)
  → On “Log Meal”: uploadMealPhoto(..., optionId)
  → meal_photo_logs.insert({ client_id, meal_id, log_date, photo_url, meal_option_id })
  → Storage: meal-photos bucket

Client (actual today)
  → Progress/nutrition: reads meals + meal_food_items + meal_completions
  → No option picker; upload writes only to storage + meal_completions (no meal_option_id)
  → meal_photo_logs not written from this page

Coach view
  → Reads meal_completions / meal_photo_logs for “logged today” and compliance
  → Does not read or show meal_photo_logs.meal_option_id
```

**Table relationships (options-related):**

```
meal_plans 1 ──< meals 1 ──< meal_options (0..5 per meal)
                │
                └──< meal_food_items (meal_id; meal_option_id NULL = legacy, set = that option’s foods)

meal_photo_logs (client_id, meal_id, log_date, photo_url, meal_option_id INFORMATIONAL)
  └── meal_option_id → meal_options.id (which option client chose; not in uniqueness)

meal_completions (client_id, meal_id, completed_at, photo_url, notes)
  └── no meal_option_id column
```

---

## 10. Gaps summary

1. **MealCardWithOptions is unused** — Option carousel and photo upload with optionId are implemented but no route mounts this component, so clients never get the “pick option then log” flow.
2. **Progress/nutrition ignores options** — No option selection; writes only to `meal_completions`; no `meal_option_id` there, so option is never stored when using this page.
3. **meal_completions has no meal_option_id** — Even if progress/nutrition wanted to store option, the table does not have that column (only meal_photo_logs does).
4. **Coach cannot see chosen option** — No UI shows `meal_photo_logs.meal_option_id` or the option name for a logged meal.
5. **Dual logging systems** — meal_photo_logs (with option) vs meal_completions (no option); client nutrition page uses both for *reading* (photoLog vs completion) but only progress/nutrition writes, and only to meal_completions.

---

End of audit.
