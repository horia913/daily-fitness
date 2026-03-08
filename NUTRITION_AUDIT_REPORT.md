# Nutrition/Fuel Tab — Comprehensive Audit Report

**Date:** February 17, 2026  
**Scope:** Read-only audit of all nutrition-related pages, components, API routes, services, and database structure  
**Status:** Complete

---

## 1. CLIENT-SIDE NUTRITION PAGES

### 1.1 Main Nutrition Dashboard
**File:** `src/app/client/nutrition/page.tsx`  
**Purpose:** Primary nutrition dashboard for clients  
**What it shows:**
- Daily macro tracking (calories, protein, carbs, fat) with consumed vs goal
- Water intake tracking (glasses and ml)
- Today's assigned meals from active meal plan
- Meal photo logging interface
- Nutrition goals section
- Calorie trend chart (7-day history)
- Recent history summary

**Data fetched:**
- Active meal plan assignment (`meal_plan_assignments`)
- Meal plan details (`meal_plans`)
- Meals in plan (`meals`)
- Meal food items (`meal_food_items`)
- Foods database (`foods`)
- Meal options (`meal_options`)
- Meal photo logs (`meal_photo_logs`)
- Meal completions (`meal_completions`)
- Nutrition goals (`goals`)
- Water logs (`water_logs`)

**Key features:**
- Supports meal options (variants) - clients can choose between different meal options
- Photo logging (1 photo per meal per day)
- Manual food logging via `AddFoodModal`
- Water intake tracking with expandable glass display
- Real-time macro calculations from logged meals

### 1.2 Meal Detail Page
**File:** `src/app/client/nutrition/meals/[id]/page.tsx`  
**Purpose:** View details of a specific meal  
**What it shows:**
- Meal name, type (breakfast/lunch/dinner/snack)
- Food items in the meal with quantities
- Macro breakdown (calories, protein, carbs, fat)
- Meal notes

**Data fetched:**
- Single meal by ID (`meals`)
- Meal food items (`meal_food_items`)
- Foods (`foods`)

### 1.3 Food Detail Page
**File:** `src/app/client/nutrition/foods/[id]/page.tsx`  
**Purpose:** View details of a specific food item  
**What it shows:**
- Food name, brand, serving size
- Macro breakdown with visual bars
- Editable serving size calculator
- Edit/Delete actions (for custom foods)

**Data fetched:**
- Single food by ID (`foods`)

### 1.4 Create Custom Food Page
**File:** `src/app/client/nutrition/foods/create/page.tsx`  
**Purpose:** Create a custom food item  
**What it shows:**
- Form to add food name, brand, serving size/unit
- Macro input fields (calories, protein, carbs, fat, fiber)
- Category selector
- Real-time calorie display

**Data written:**
- Inserts into `foods` table

### 1.5 Progress Nutrition Tracker
**File:** `src/app/client/progress/nutrition/page.tsx`  
**Purpose:** Alternative nutrition view focused on meal logging  
**What it shows:**
- Daily summary (total macros from logged meals)
- List of assigned meals with photo upload interface
- Meal completion status

**Data fetched:**
- Active meal plan assignment
- Meals in plan
- Meal photo logs
- Meal completions

---

## 2. COACH-SIDE NUTRITION PAGES

### 2.1 Nutrition Hub
**File:** `src/app/coach/nutrition/page.tsx`  
**Purpose:** Navigation hub for coach nutrition tools  
**What it shows:**
- Links to Meal Plans, Create Meal Plan, Meals
- Management cards: Meal Plans, Food Database, Assignments

### 2.2 Meal Plans List
**File:** `src/app/coach/nutrition/meal-plans/page.tsx`  
**Purpose:** View and manage all meal plans  
**What it shows:**
- Grid of meal plan cards
- Search functionality
- Stats: meal count, usage count (assignments)
- Actions: Edit, Delete, Assign to clients

**Data fetched:**
- All meal plans for coach (`meal_plans`)
- Meal counts (`meal_plan_items`)
- Assignment counts (`meal_plan_assignments`)

### 2.3 Create Meal Plan
**File:** `src/app/coach/nutrition/meal-plans/create/page.tsx`  
**Purpose:** Create a new meal plan template  
**What it shows:**
- Meal plan builder interface
- Form for name, description, target macros
- Meal creation interface

### 2.4 Edit Meal Plan
**File:** `src/app/coach/nutrition/meal-plans/[id]/edit/page.tsx`  
**Purpose:** Edit existing meal plan  
**What it shows:**
- Meal plan details form
- Meal builder with meal options support
- Food item management

### 2.5 Meal Plan Detail
**File:** `src/app/coach/nutrition/meal-plans/[id]/page.tsx`  
**Purpose:** View meal plan details  
**What it shows:**
- Meal plan info
- List of meals with options
- Macro totals

### 2.6 Food Database
**File:** `src/app/coach/nutrition/foods/page.tsx`  
**Purpose:** Manage food database  
**What it shows:**
- Uses `OptimizedFoodDatabase` component
- Food CRUD operations
- Search and filter

### 2.7 Assignments
**File:** `src/app/coach/nutrition/assignments/page.tsx`  
**Purpose:** Manage meal plan assignments to clients  
**What it shows:**
- List of assignments
- Client assignment interface
- Compliance tracking

---

## 3. NUTRITION COMPONENTS

### 3.1 Client Components

**`src/components/nutrition/AddFoodModal.tsx`**
- Modal for adding foods to meals
- Food search with debouncing
- Tabs: Food, Recipes, Favorites (recipes/favorites not implemented)
- Inserts into `meal_food_items`

**`src/components/client/MealCardWithOptions.tsx`**
- Displays meal with options carousel
- Photo upload interface
- Option selection before logging
- Handles both legacy meals (no options) and meals with options
- Uses `mealPhotoService` for uploads

**`src/components/features/nutrition/MealPlanCard.tsx`**
- Card display for meal plans
- Shows target calories, meal count, usage count
- Actions: Manage Meals, Assign, Delete

**`src/components/features/nutrition/MealPlanAssignmentModal.tsx`**
- Modal for assigning meal plans to clients
- Multi-select client interface
- Deactivates existing assignments before creating new ones

### 3.2 Coach Components

**`src/components/MealPlanBuilder.tsx`**
- Builder interface for creating/editing meal plans
- Meal type selector (breakfast/lunch/dinner/snack)
- Nutrition summary display
- Meal details toggle

**`src/components/MealForm.tsx`**
- Form for creating/editing meals
- Food search and selection
- Macro totals calculation
- Supports meal options

**`src/components/coach/OptimizedFoodDatabase.tsx`**
- Food database management interface
- CRUD operations for foods
- Search, filter, pagination

**`src/components/coach/OptimizedNutritionAssignments.tsx`**
- Assignment management interface
- Client search and selection
- Compliance stats display

**`src/components/coach/client-views/ClientMealsView.tsx`**
- View of client's meal plans
- Shows active assignments
- Meal plan overview stats

**`src/components/coach/DailyAdherenceLog.tsx`**
- Daily meal adherence tracking
- Shows logged vs expected meals
- Photo log display

**`src/components/coach/MealCreator.tsx`**
- Meal creation interface
- Food item management
- Option creation support

---

## 4. NUTRITION SERVICES & HOOKS

### 4.1 Services

**`src/lib/mealPlanService.ts`**
- **MealPlanService class** - Main service for meal plan operations
- Methods:
  - `getFoods()` - Fetch all foods
  - `searchFoods(query)` - Search foods by name
  - `createFood()` - Create custom food
  - `getMealPlans(coachId)` - Get coach's meal plans
  - `createMealPlan()` - Create meal plan
  - `updateMealPlan()` - Update meal plan
  - `deleteMealPlan()` - Delete meal plan
  - `getMealItems()` - Get food items in meal plan
  - `addMealItem()` - Add food to meal plan
  - `assignMealPlanToClients()` - Assign plan to clients
  - **Meal Options Methods:**
    - `getMealOptions()` - Get options for a meal
    - `getMealWithOptions()` - Get meal with all options and foods
    - `createMealOption()` - Create meal option (auto-migrates legacy foods)
    - `updateMealOption()` - Update option
    - `deleteMealOption()` - Delete option
    - `addFoodToOption()` - Add food to option
    - `removeFoodFromOption()` - Remove food from option
    - `migrateLegacyFoodsToDefaultOption()` - Migrate legacy meals to options

**`src/lib/mealPhotoService.ts`**
- **Meal photo upload and logging service**
- Key functions:
  - `uploadMealPhoto()` - Upload photo and create log (enforces 1 photo per meal per day)
  - `getMealPhotoForDate()` - Get photo for specific date
  - `getMealPhotosForDay()` - Get all photos for a day
  - `getMealPhotoHistory()` - Get photos for date range
  - `getMealAdherenceStats()` - Calculate adherence rates
  - `isMealLoggedToday()` - Check if meal logged today
  - `getTodayAdherence()` - Get today's adherence percentage
- **Storage:** Uses Supabase storage bucket `meal-photos`
- **Constraint:** 1 photo per meal per day (not per option)
- **meal_option_id:** Informational only (records which option was chosen)

### 4.2 Hooks

**`src/hooks/useNutritionData.ts`**
- `useFoodLibrary()` - Fetch food database
- `useDailyNutrition(userId, date)` - Get daily nutrition data
- `useNutritionGoals(userId)` - Get nutrition goals (currently returns defaults)

**Note:** `useDailyNutrition` currently has limited implementation - it only fetches `meal_completions` but doesn't aggregate actual macro data from meal plans.

---

## 5. API ROUTES

**No dedicated nutrition API routes found.**

All nutrition operations use direct Supabase client calls from components/services. This is different from workout execution which has dedicated API routes (`/api/log-set`, `/api/complete-workout`, etc.).

**Potential API routes that could exist but don't:**
- `/api/nutrition/log-meal` - Log meal completion
- `/api/nutrition/log-food` - Log custom food entry
- `/api/nutrition/assign-meal-plan` - Assign meal plan (coach)
- `/api/nutrition/create-meal-plan` - Create meal plan (coach)

---

## 6. DATABASE TABLES

### 6.1 Core Tables

**`meal_plans`**
- `id` (uuid, PK)
- `coach_id` (uuid, FK → profiles)
- `name` (text)
- `description` / `notes` (text, nullable)
- `target_calories` (integer, nullable)
- `target_protein` (numeric, nullable)
- `target_carbs` (numeric, nullable)
- `target_fat` (numeric, nullable)
- `difficulty_level` (text, nullable)
- `is_active` (boolean)
- `created_at`, `updated_at` (timestamptz)

**`meals`**
- `id` (uuid, PK)
- `meal_plan_id` (uuid, FK → meal_plans)
- `name` (text)
- `meal_type` (text: 'breakfast' | 'lunch' | 'dinner' | 'snack')
- `order_index` (integer)
- `notes` (text, nullable)
- `created_at`, `updated_at` (timestamptz)

**`meal_options`**
- `id` (uuid, PK)
- `meal_id` (uuid, FK → meals, CASCADE)
- `name` (text)
- `order_index` (integer)
- `created_at` (timestamptz)

**`meal_food_items`**
- `id` (uuid, PK)
- `meal_id` (uuid, FK → meals, CASCADE)
- `meal_option_id` (uuid, FK → meal_options, nullable, CASCADE)
- `food_id` (uuid, FK → foods)
- `quantity` (numeric)
- `unit` (text)
- `created_at` (timestamptz)

**Note:** `meal_option_id` is nullable for backward compatibility. NULL = legacy meal without options.

**`foods`**
- `id` (uuid, PK)
- `name` (text)
- `brand` (text, nullable)
- `serving_size` (numeric)
- `serving_unit` (text)
- `calories_per_serving` (numeric)
- `protein` (numeric)
- `carbs` (numeric)
- `fat` (numeric)
- `fiber` (numeric)
- `sodium` (numeric, nullable)
- `category` (text)
- `is_active` (boolean)
- `created_at`, `updated_at` (timestamptz)

**`meal_plan_assignments`**
- `id` (uuid, PK)
- `coach_id` (uuid, FK → profiles)
- `client_id` (uuid, FK → profiles)
- `meal_plan_id` (uuid, FK → meal_plans)
- `start_date` (date, nullable)
- `end_date` (date, nullable)
- `is_active` (boolean)
- `notes` (text, nullable)
- `created_at`, `updated_at` (timestamptz)

**`meal_photo_logs`**
- `id` (uuid, PK)
- `client_id` (uuid, FK → profiles)
- `meal_id` (uuid, FK → meals)
- `meal_option_id` (uuid, FK → meal_options, nullable, **INFORMATIONAL ONLY**)
- `log_date` (date)
- `photo_url` (text)
- `photo_path` (text)
- `notes` (text, nullable)
- `created_at`, `updated_at` (timestamptz)
- **Constraint:** UNIQUE (client_id, meal_id, log_date) - 1 photo per meal per day

**`meal_completions`**
- `id` (uuid, PK)
- `client_id` (uuid, FK → profiles)
- `meal_id` (uuid, FK → meals)
- `completed_at` (timestamptz)
- `notes` (text, nullable)
- `created_at` (timestamptz)

**Note:** `meal_completions` appears to be legacy/backward compatibility. Primary logging is via `meal_photo_logs`.

### 6.2 Related Tables

**`nutrition_logs`** (from migration)
- `id` (uuid, PK)
- `client_id` (uuid, FK → profiles)
- `log_date` (date)
- `calories` (integer, nullable)
- `protein_g` (numeric, nullable)
- `carbs_g` (numeric, nullable)
- `fat_g` (numeric, nullable)
- `fiber_g` (numeric, nullable)
- `water_ml` (integer, nullable)
- `notes` (text, nullable)
- `created_at`, `updated_at` (timestamptz)
- **Constraint:** UNIQUE (client_id, log_date)

**Note:** `nutrition_logs` table exists but is **not actively used** in the current UI. Macro tracking is calculated on-the-fly from meal plans and photo logs.

**`water_logs`** (from migration)
- `id` (uuid, PK)
- `client_id` (uuid, FK → profiles)
- `log_date` (date)
- `amount_ml` (integer)
- `logged_at` (timestamptz)
- `notes` (text, nullable)
- `created_at` (timestamptz)

**`goals`** (used for nutrition goals)
- `id` (uuid, PK)
- `client_id` (uuid, FK → profiles)
- `coach_id` (uuid, FK → profiles, nullable)
- `title` (text)
- `target_value` (numeric, nullable)
- `target_unit` (text, nullable)
- `current_value` (numeric, nullable)
- `status` (text)
- `goal_type` (text) - can be 'nutrition'
- `pillar` (text, nullable)
- `start_date`, `completed_date` (date, nullable)
- `created_at`, `updated_at` (timestamptz)

---

## 7. CURRENT USER FLOW

### 7.1 Client Experience

**When client taps "Fuel" tab:**
1. **Main Dashboard (`/client/nutrition`):**
   - Checks for active meal plan assignment
   - If no assignment: Shows empty state with "No active meal plan" message
   - If assignment exists:
     - Loads meals from assigned meal plan
     - Shows today's meals with photo upload interface
     - Displays macro tracking (consumed vs goal from meal plan targets)
     - Shows water intake tracker
     - Displays nutrition goals section
     - Shows calorie trend chart (7-day history)

2. **Meal Logging:**
   - Client sees assigned meals for today
   - Each meal shows:
     - Meal name and type (breakfast/lunch/dinner/snack)
     - Food items in meal (if meal has options, shows selected option's foods)
     - Macro totals
     - Photo upload button (if not logged)
     - Photo display (if logged)
   - **Meal Options:** If meal has multiple options, client can swipe through options before logging
   - **Photo Upload:** Client uploads photo → creates `meal_photo_logs` entry → marks meal as logged
   - **Constraint:** 1 photo per meal per day (cannot replace)

3. **Manual Food Logging:**
   - Client can tap "Add Food" button
   - Opens `AddFoodModal`
   - Searches food database
   - Adds food to a meal (creates `meal_food_items` entry)
   - **Note:** This adds food to the meal plan itself, not a daily log

4. **Water Tracking:**
   - Client can log water intake
   - Creates `water_logs` entries
   - Displays as expandable glasses (up to 16 glasses)
   - Goal can be set via `goals` table

5. **Custom Foods:**
   - Client can create custom foods (`/client/nutrition/foods/create`)
   - Saves to `foods` table
   - Can be used in meal plans or manual logging

### 7.2 Coach Experience

**Meal Plan Management:**
1. Coach creates meal plan (`/coach/nutrition/meal-plans/create`)
2. Coach adds meals to plan (breakfast/lunch/dinner/snack)
3. For each meal, coach can:
   - Add food items directly (legacy mode)
   - Create meal options (variants) and add foods to each option
4. Coach sets target macros for meal plan
5. Coach assigns meal plan to clients (`/coach/nutrition/assignments`)

**Food Database Management:**
- Coach can view/edit/delete foods (`/coach/nutrition/foods`)
- Coach can create foods
- Foods are shared across all coaches/clients

**Assignment Management:**
- Coach assigns meal plan to one or more clients
- System deactivates existing active assignments before creating new one
- Coach can view compliance/adherence stats

---

## 8. ANSWERS TO SPECIFIC QUESTIONS

### 8.1 Is there a meal plan assignment system? How does it work?

**Yes.** 
- Coaches create meal plan templates (`meal_plans`)
- Coaches assign meal plans to clients via `meal_plan_assignments`
- Only one active assignment per client at a time (system deactivates old ones)
- Assignments have `start_date` and optional `end_date`
- Client sees assigned meals on their nutrition dashboard

### 8.2 Can clients log what they ate vs what was planned?

**Partially.**
- Clients can upload photos of meals (1 per meal per day)
- Clients can add custom foods to meals via `AddFoodModal` (but this modifies the meal plan, not a daily log)
- **Gap:** There's no separate "daily food log" table. The system tracks:
  - What was planned (from `meal_plans` → `meals` → `meal_food_items`)
  - What was logged (via `meal_photo_logs` and `meal_completions`)
  - But there's no way to log "I ate X instead of Y" without modifying the meal plan

### 8.3 Is there macro tracking (protein, carbs, fat, calories)?

**Yes, but calculated on-the-fly.**
- Macros are calculated from `meal_food_items` × `foods` nutrition data
- Displayed as "consumed vs goal" where goal comes from `meal_plans.target_*` fields
- **Gap:** There's a `nutrition_logs` table that could store daily totals, but it's not used. All calculations are done client-side from meal plan data.

### 8.4 Is there a food database or does the coach create all meals?

**Both.**
- There's a shared `foods` database
- Coaches can create/edit foods
- Clients can create custom foods (saved to same `foods` table)
- Meals are built from foods in the database
- **No external food API integration** (like USDA, MyFitnessPal, etc.)

### 8.5 What does the coach-side nutrition management look like?

**Comprehensive meal plan builder:**
- Create/edit meal plans with target macros
- Add meals (breakfast/lunch/dinner/snack)
- Add foods to meals (with quantities)
- Create meal options (variants) for flexibility
- Assign meal plans to clients
- View food database
- Track client compliance/adherence

### 8.6 Are there any nutrition-related notifications or reminders?

**Not found in codebase.** No notification system for:
- Meal logging reminders
- Macro goal alerts
- Assignment notifications

### 8.7 What's the biggest gap between backend capabilities and frontend UI?

**Major Gaps:**

1. **No Daily Food Logging vs Planned:**
   - Backend has `nutrition_logs` table (unused)
   - No way to log "I ate X grams of chicken" separately from meal plan
   - Adding food via `AddFoodModal` modifies meal plan, not daily log

2. **Macro Tracking is Calculated, Not Stored:**
   - Macros calculated on-the-fly from meal plans
   - No historical daily totals stored
   - `nutrition_logs` table exists but unused

3. **No Meal Plan vs Actual Comparison:**
   - Can't see "planned 2000 cal vs ate 1800 cal"
   - Only shows "consumed from meal plan vs goal"

4. **Limited Food Search:**
   - Only searches `foods` table
   - No barcode scanning
   - No external food database integration

5. **No Meal Timing:**
   - No way to log "ate breakfast at 8am"
   - `meal_completions.completed_at` exists but not prominently displayed

6. **Water Tracking is Separate:**
   - Water logs exist but not integrated with meal logging flow
   - No "hydration goal" integration with meal plan

7. **No Recipe Support:**
   - `AddFoodModal` has "Recipes" tab but not implemented
   - No way to create recipes from multiple foods

8. **No Nutrition Analytics:**
   - No trends over time (beyond 7-day calorie chart)
   - No macro distribution charts
   - No adherence reports

---

## 9. FILE INVENTORY

### Client Pages
- `src/app/client/nutrition/page.tsx` (Main dashboard)
- `src/app/client/nutrition/meals/[id]/page.tsx` (Meal detail)
- `src/app/client/nutrition/foods/[id]/page.tsx` (Food detail)
- `src/app/client/nutrition/foods/create/page.tsx` (Create food)
- `src/app/client/progress/nutrition/page.tsx` (Progress tracker)

### Coach Pages
- `src/app/coach/nutrition/page.tsx` (Hub)
- `src/app/coach/nutrition/meal-plans/page.tsx` (List)
- `src/app/coach/nutrition/meal-plans/create/page.tsx` (Create)
- `src/app/coach/nutrition/meal-plans/[id]/page.tsx` (Detail)
- `src/app/coach/nutrition/meal-plans/[id]/edit/page.tsx` (Edit)
- `src/app/coach/nutrition/foods/page.tsx` (Food database)
- `src/app/coach/nutrition/assignments/page.tsx` (Assignments)

### Components
- `src/components/nutrition/AddFoodModal.tsx`
- `src/components/client/MealCardWithOptions.tsx`
- `src/components/features/nutrition/MealPlanCard.tsx`
- `src/components/features/nutrition/MealPlanAssignmentModal.tsx`
- `src/components/MealPlanBuilder.tsx`
- `src/components/MealForm.tsx`
- `src/components/coach/OptimizedFoodDatabase.tsx`
- `src/components/coach/OptimizedNutritionAssignments.tsx`
- `src/components/coach/client-views/ClientMealsView.tsx`
- `src/components/coach/DailyAdherenceLog.tsx`
- `src/components/coach/MealCreator.tsx`

### Services
- `src/lib/mealPlanService.ts`
- `src/lib/mealPhotoService.ts`

### Hooks
- `src/hooks/useNutritionData.ts`

### Migrations (Nutrition-Related)
- `migrations/20260129_meal_options.sql` (Meal options support)
- `migrations/20260201_tracking_tables_and_admin_permissions.sql` (nutrition_logs, water_logs)

---

## 10. SUMMARY

### Current State
- **Functional meal plan assignment system** with coach → client flow
- **Photo-based meal logging** (1 photo per meal per day)
- **Meal options support** (variants for flexibility)
- **Macro tracking** (calculated from meal plans)
- **Water intake tracking**
- **Custom food creation**
- **Food database** (shared between coaches/clients)

### Key Limitations
1. **No separate daily food logging** - can't log "ate X" separately from meal plan
2. **Macro tracking is calculated, not stored** - no historical daily totals
3. **No meal plan vs actual comparison** - can't see deviations
4. **Limited food search** - no external APIs, barcode scanning
5. **No nutrition analytics** - basic 7-day chart only
6. **No notifications/reminders**
7. **No recipe support** (UI exists but not implemented)

### Architecture Notes
- **No API routes** - all operations use direct Supabase client calls
- **Heavy client-side calculations** - macros calculated on-the-fly
- **Batch fetching** - optimized queries in main nutrition page (avoids N+1)
- **Backward compatibility** - supports legacy meals without options
- **Storage integration** - meal photos stored in Supabase storage bucket

---

**End of Audit Report**
