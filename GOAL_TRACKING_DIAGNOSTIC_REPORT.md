# GOAL TRACKING DIAGNOSTIC REPORT

Generated: 2024-12-19

## 1. STRENGTH GOALS - 1RM TRACKING

- [x] **1RM calculation exists?** YES - Location: Multiple files
  - `src/lib/e1rmUtils.ts` - `calculateE1RM()` function (Epley formula: weight × (1 + 0.0333 × reps))
  - `src/lib/plateCalculator.ts` - `calculate1RM()` function (Epley formula: weight * (1 + reps/30))
  - `src/lib/smartTimer.ts` - `estimate1RM()` function (Epley formula: weight * (1 + reps/30))
  - `src/app/api/log-set/route.ts` - Calculates e1RM when sets are logged (line 637)

- [ ] **Updates goals.current_value?** NO - **CRITICAL GAP**
  - e1RM is calculated and stored in `user_exercise_metrics` table
  - e1RM is NOT linked to `goals.current_value`
  - No code found that updates goals table when e1RM changes

- [x] **personal_records table populated?** PARTIALLY - How: Manual service calls only
  - `src/lib/progressTrackingService.ts` - `PersonalRecordsService.upsertPersonalRecord()` exists (line 359)
  - Service exists but is NOT automatically called when sets are logged
  - `personal_records` table structure:
    - id, client_id, exercise_id, record_type, value, unit, reps, weight_kg, achieved_date, workout_log_id, notes, created_at, updated_at

- [x] **Columns in personal_records:** 
  - id (uuid), client_id (uuid), exercise_id (uuid), record_type (enum: 'max_weight' | 'max_reps' | 'max_volume' | 'best_time'), value (numeric), unit (text), reps (integer), weight_kg (numeric), achieved_date (date), workout_log_id (uuid), notes (text), created_at (timestamp), updated_at (timestamp)

- [ ] **Issues found:** 
  - **MAJOR:** e1RM is calculated and stored in `user_exercise_metrics` but never updates `goals.current_value`
  - **MAJOR:** `personal_records` table exists but is NOT automatically populated when PRs are achieved
  - **MAJOR:** No connection between workout logging and goal updates for strength goals
  - e1RM calculation happens in `/api/log-set` but only updates `user_exercise_metrics`, not goals

---

## 2. BODY COMPOSITION GOALS

- [x] **body_metrics table populated?** YES - How: Manual UI entry
  - `src/components/progress/CheckIns.tsx` - UI component for logging body metrics (line 172)
  - `src/lib/progressTrackingService.ts` - `BodyMetricsService.createBodyMetrics()` (line 50)
  - Data is inserted into `body_metrics` table when clients submit check-ins

- [x] **Columns in body_metrics:** 
  - id, client_id, coach_id, weight_kg, body_fat_percentage, muscle_mass_kg, visceral_fat_level, left_arm_circumference, right_arm_circumference, torso_circumference, waist_circumference, hips_circumference, left_thigh_circumference, right_thigh_circumference, left_calf_circumference, right_calf_circumference, measured_date, measurement_method, notes, created_at, updated_at

- [x] **UI to log measurements exists?** YES - Location: `src/components/progress/CheckIns.tsx`
  - Full UI component with form fields for all body measurements
  - Allows clients to log weight, body fat %, muscle mass, and circumference measurements

- [ ] **Updates goals.current_value?** NO - **CRITICAL GAP**
  - Body metrics are saved to `body_metrics` table
  - NO code found that queries `body_metrics` and updates `goals.current_value`
  - No triggers or API endpoints that sync body metrics to goals

- [ ] **Issues found:**
  - **MAJOR:** Body metrics logging works, but goals are never updated automatically
  - **MAJOR:** No connection between `body_metrics` table and `goals` table
  - No code that matches body measurement goals to actual measurements

---

## 3. CONSISTENCY GOALS

- [x] **Workout counting logic exists?** YES - Location: Multiple files (but NOT connected to goals)
  - `src/hooks/useWorkoutSummary.ts` - Calculates consistency from workout sessions (line 163)
  - `src/lib/database.ts` - `getWorkoutStats()` counts completed workouts per week (line 279)
  - `src/app/coach/progress/page.tsx` - Counts workouts per week/month (line 183)
  - Logic exists but is used for display/analytics, NOT for updating goals

- [x] **Meal counting logic exists?** YES - Location: Multiple files (but NOT connected to goals)
  - `src/hooks/useNutritionData.ts` - `useDailyNutrition()` queries meal_logs (line 143)
  - `src/app/client/nutrition/page.tsx` - Loads meal logs and counts meals (line 137)
  - Logic exists to count meal logs, but NOT used for goal updates

- [ ] **Auto-updates goals?** NO - **CRITICAL GAP**
  - Workout counting logic exists but never updates `goals.current_value`
  - Meal counting logic exists but never updates `goals.current_value`
  - No scheduled jobs or triggers that calculate weekly counts and update goals

- [ ] **Issues found:**
  - **MAJOR:** Workout consistency counting exists but is NOT connected to goals table
  - **MAJOR:** Meal logging counting exists but is NOT connected to goals table
  - **MAJOR:** No weekly reset logic for consistency goals
  - **MAJOR:** No daily reset logic for daily goals (like water intake)

---

## 4. SYNC MECHANISMS

- [ ] **API sync endpoint exists?** NO - **CRITICAL GAP**
  - No `/api/goals/sync` endpoint found
  - No `/api/goals/update` endpoint found
  - Only manual update endpoint: `src/app/client/goals/page.tsx` - `updateGoalProgress()` (line 621)
    - This is a manual UI function, not an automatic sync

- [x] **Database triggers exist?** YES - But only for `updated_at` columns
  - `update_goals_updated_at` trigger on goals table (BEFORE UPDATE)
  - `update_personal_records_updated_at` trigger on personal_records table (BEFORE UPDATE)
  - `update_user_exercise_metrics_updated_at` trigger on user_exercise_metrics table
  - **NO triggers that update goals.current_value based on other tables**

- [ ] **Cron jobs configured?** NO - **CRITICAL GAP**
  - No cron job libraries found (no node-schedule, agenda, bull)
  - No scheduled tasks found
  - No background jobs for goal syncing

- [x] **Where do goals get updated?** Manual updates only:
  - `src/app/client/goals/page.tsx` - `updateGoalProgress()` - Manual UI update (line 621)
  - `src/app/coach/goals/page.tsx` - `updateGoal()` - Manual coach update (line 305)
  - `src/lib/progressTrackingService.ts` - `GoalsService.updateGoal()` - Service method (line 180)
  - **NO automatic updates found**

- [ ] **Issues found:**
  - **MAJOR:** No automatic sync mechanism exists
  - **MAJOR:** No API endpoints for syncing goals
  - **MAJOR:** No database triggers that connect activity data to goals
  - **MAJOR:** No scheduled jobs for weekly/daily goal calculations

---

## 5. AUTO-COMPLETION

- [x] **Logic to set status='completed'?** YES - Location: Manual only
  - `src/app/client/goals/page.tsx` - `updateGoalProgress()` sets status='completed' when progress_percentage >= 100% (line 639)
  - `src/lib/progressTrackingService.ts` - `GoalsService.completeGoal()` method exists (line 201)
  - **BUT:** This only happens when manually updating goals, NOT automatically

- [ ] **Notifications sent?** NO - **CRITICAL GAP**
  - No code found that sends notifications when goals are completed
  - No notification system connected to goal completion
  - No celebration/achievement system for completed goals

- [ ] **Issues found:**
  - **MAJOR:** Goal completion logic exists but only works for manual updates
  - **MAJOR:** No automatic completion when goals reach 100% through activity tracking
  - **MAJOR:** No notifications or celebrations for goal completion

---

## 6. RESET LOGIC

- [ ] **Weekly reset implemented?** NO - **CRITICAL GAP**
  - No code found that resets weekly consistency goals
  - No scheduled jobs that run on Monday/Sunday to reset counters
  - No logic that sets `current_value = 0` for weekly goals

- [ ] **Daily reset implemented?** NO - **CRITICAL GAP**
  - No code found that resets daily goals at midnight
  - No scheduled jobs for daily resets
  - No logic for resetting daily goals like water intake

- [ ] **Issues found:**
  - **MAJOR:** No reset logic exists for any goal types
  - **MAJOR:** Consistency goals would accumulate indefinitely without reset
  - **MAJOR:** Daily goals would never reset

---

## 7. DATA FLOW DIAGRAM

### Workout logged:
  **Step 1:** Client logs a set during workout
    - Location: `src/app/client/workouts/[id]/start/page.tsx` - `completeSet()` (line 1542)
    - Calls `/api/log-set` endpoint
  
  **Step 2:** `/api/log-set` endpoint processes set
    - Location: `src/app/api/log-set/route.ts` - `POST()` handler (line 16)
    - Inserts into `workout_set_logs` table
    - Calculates e1RM and updates `user_exercise_metrics` table (line 647-748)
    - **DOES NOT update goals table**
  
  **Step 3:** Workout completion
    - Location: `src/app/client/workouts/[id]/complete/page.tsx`
    - Updates `workout_sessions` and `workout_logs` tables
    - **DOES NOT update goals table**
  
  **Result:** Goals are NEVER updated automatically from workout logging
  - e1RM is calculated and stored in `user_exercise_metrics`
  - Workout counts exist in analytics but NOT in goals
  - Strength goals remain at 0 or manual values

### Meal logged:
  **Step 1:** Client logs a meal
    - Location: `src/app/client/nutrition/page.tsx` - `loadTodayMeals()` (line 137)
    - Inserts into `meal_logs` table via meal completion
  
  **Step 2:** Meal completion recorded
    - `meal_completions` table is updated
    - `meal_logs` table contains the meal data
  
  **Step 3:** No goal update
    - **NO code found that queries meal_logs and updates goals**
    - **NO code that counts meal days per week for consistency goals**
  
  **Result:** Goals are NEVER updated automatically from meal logging
  - Meal logs exist in database
  - Nutrition tracking consistency goals remain at 0 or manual values

### Measurement logged:
  **Step 1:** Client logs body measurement
    - Location: `src/components/progress/CheckIns.tsx` - `handleSubmit()` (line 172)
    - Calls `BodyMetricsService.createBodyMetrics()`
  
  **Step 2:** Body metrics saved
    - Location: `src/lib/progressTrackingService.ts` - `BodyMetricsService.createBodyMetrics()` (line 50)
    - Inserts into `body_metrics` table
  
  **Step 3:** No goal update
    - **NO code found that queries body_metrics and updates goals**
    - **NO code that matches body measurement goals to actual measurements**
  
  **Result:** Goals are NEVER updated automatically from body measurements
  - Body metrics exist in database
  - Body composition goals remain at 0 or manual values

---

## 8. IDENTIFIED GAPS

### Critical Missing Features:

1. **NO automatic goal updates from workout logging**
   - e1RM is calculated but never updates strength goals
   - Workout counts exist but never update consistency goals
   - Need: API endpoint or trigger that updates goals when sets are logged

2. **NO automatic goal updates from meal logging**
   - Meal logs exist but never update nutrition tracking goals
   - Need: Scheduled job or trigger that counts meal days per week

3. **NO automatic goal updates from body measurements**
   - Body metrics exist but never update body composition goals
   - Need: Trigger or API endpoint that matches measurements to goals

4. **NO weekly reset logic**
   - Consistency goals accumulate indefinitely
   - Need: Scheduled job that runs weekly to reset counters

5. **NO daily reset logic**
   - Daily goals (like water intake) never reset
   - Need: Scheduled job that runs daily at midnight

6. **NO automatic goal completion**
   - Goals only complete when manually updated
   - Need: Logic that checks goals when activities are logged

7. **NO goal completion notifications**
   - No celebration or notification when goals are achieved
   - Need: Notification system integration

8. **NO API sync endpoint**
   - No way to manually trigger goal sync
   - Need: `/api/goals/sync` endpoint for manual/automatic syncing

9. **NO database triggers for goal updates**
   - No triggers that connect activity tables to goals table
   - Need: Triggers on workout_set_logs, meal_logs, body_metrics

10. **NO scheduled jobs/cron tasks**
    - No background jobs for goal calculations
    - Need: Cron job system (node-schedule or similar)

---

## 9. WHAT'S WORKING

### Existing Infrastructure:

1. **✅ Goal creation and management**
   - Full UI for creating goals (`src/app/client/goals/page.tsx`)
   - Coach can create goals for clients (`src/app/coach/goals/page.tsx`)
   - Goals table structure exists with all necessary columns

2. **✅ Manual goal updates**
   - Clients can manually update goal progress (`updateGoalProgress()`)
   - Progress percentage calculation works
   - Goal completion status updates correctly

3. **✅ e1RM calculation**
   - e1RM is accurately calculated using Epley formula
   - Stored in `user_exercise_metrics` table
   - PR detection works (identifies new PRs)

4. **✅ Body metrics logging**
   - Full UI for logging body measurements
   - Data is properly stored in `body_metrics` table
   - All measurement types supported

5. **✅ Workout counting logic**
   - Logic exists to count workouts per week/month
   - Used in analytics and progress pages
   - Just not connected to goals

6. **✅ Meal logging**
   - Meal logs are properly stored
   - Daily nutrition tracking works
   - Data exists in database

7. **✅ Personal records service**
   - Service exists to create/update PRs
   - Table structure is correct
   - Just not automatically called

8. **✅ Goal display**
   - Goals are displayed correctly in UI
   - Progress bars work
   - Filtering and sorting works

---

## SUMMARY

### Current State:
- **Goal infrastructure exists** ✅
- **Activity tracking works** ✅
- **Data is being collected** ✅
- **NO connection between activities and goals** ❌

### What Needs to Be Built:

1. **Goal Sync Service** - Service that queries activity data and updates goals
2. **API Sync Endpoint** - `/api/goals/sync` for manual/automatic syncing
3. **Database Triggers** - Triggers that update goals when activities are logged
4. **Scheduled Jobs** - Cron jobs for weekly/daily resets and syncing
5. **Goal Matching Logic** - Logic that matches activities to specific goals
6. **Auto-completion Logic** - Logic that checks and completes goals automatically
7. **Notification System** - Notifications when goals are completed

### Priority Order:
1. **HIGH:** Connect workout logging to strength goals (e1RM → goals.current_value)
2. **HIGH:** Connect body metrics to body composition goals
3. **HIGH:** Connect workout counts to consistency goals
4. **HIGH:** Connect meal logging to nutrition tracking goals
5. **MEDIUM:** Weekly reset logic for consistency goals
6. **MEDIUM:** Daily reset logic for daily goals
7. **MEDIUM:** Auto-completion logic
8. **LOW:** Goal completion notifications

---

**END OF REPORT**

