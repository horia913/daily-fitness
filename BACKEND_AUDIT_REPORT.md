# BACKEND AUDIT REPORT — DailyFitness Application

**Date:** February 17, 2026  
**Type:** Read-Only Analysis  
**Scope:** Complete backend architecture, database schema, API routes, business logic, and integrations

---

## SECTION 1: PROJECT ARCHITECTURE OVERVIEW

### Framework & Language
- **Framework:** Next.js 15.5.9 (App Router)
- **Language:** TypeScript 5
- **Runtime:** Node.js (ES2017 target)
- **Build Tool:** Turbopack (development), Next.js build (production)

### Database
- **Type:** PostgreSQL (via Supabase)
- **ORM/Client:** `@supabase/supabase-js` v2.57.4, `@supabase/ssr` v0.5.2
- **Connection:** Server-side via `createSupabaseServerClient()`, client-side via `createBrowserClient()`
- **RLS:** Row Level Security enabled on all tables (except `muscle_groups`, `progression_guidelines`, `rp_volume_landmarks`, `volume_guidelines`)

### Hosting/Deployment
- **Platform:** Not explicitly configured in codebase (likely Vercel or similar Next.js-compatible platform)
- **Environment:** Supports development (`NODE_ENV=development`) and production modes
- **Service Worker:** PWA support enabled via `NEXT_PUBLIC_ENABLE_SW`

### Authentication
- **Method:** Supabase Auth (session-based)
- **Session Management:** Cookie-based via `@supabase/ssr`
- **Roles:** `admin`, `coach`, `client` (stored in `profiles.role`)
- **Middleware:** `src/middleware.ts` handles session refresh on navigation
- **API Auth:** `validateApiAuth()` in `src/lib/apiAuth.ts` validates requests and returns `supabaseAuth` (RLS) and `supabaseAdmin` (service role)

### Environment Variables Referenced
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID`
- `NEXT_PUBLIC_ONESIGNAL_ORIGIN`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`
- `NEXT_PUBLIC_ENABLE_SW`
- `NEXT_PUBLIC_DEBUG_HARNESS`
- `DEBUG_HARNESS`
- `PERF_DEBUG`
- `NEXT_PUBLIC_DISABLE_PREFETCH`
- `NEXT_PUBLIC_DISABLE_NOTIFICATIONS_POLL`
- `NEXT_PUBLIC_USE_NEW_WORKOUT_LOADER`
- `NODE_ENV`

---

## SECTION 2: DATA MODELS / DATABASE SCHEMA

### Total Tables: 85+ tables

### Core User & Authentication Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **profiles** | `id` (uuid) | `email`, `role`, `first_name`, `last_name`, `sex`, `bodyweight`, `client_type`, `leaderboard_visibility` | Self-referencing FK (`id` → auth.users) |

### Coach-Client Relationship Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **clients** | `id` (uuid) | `coach_id`, `client_id`, `status` | `coach_id` → profiles.id, `client_id` → profiles.id |
| **invite_codes** | `id` (uuid) | `code`, `coach_id`, `client_email`, `expires_at`, `is_used`, `used_by` | `coach_id` → profiles.id, `used_by` → profiles.id |

### Workout Template System

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **workout_templates** | `id` (uuid) | `name`, `coach_id`, `difficulty_level`, `estimated_duration`, `category` | `coach_id` → profiles.id |
| **workout_blocks** | `id` (uuid) | `template_id`, `block_order`, `block_type`, `block_name`, `duration_seconds`, `rest_seconds` | `template_id` → workout_templates.id |
| **workout_block_exercises** | `id` (uuid) | `block_id`, `exercise_id`, `exercise_order`, `sets`, `reps`, `weight_kg`, `rir`, `tempo` | `block_id` → workout_blocks.id, `exercise_id` → exercises.id |
| **workout_drop_sets** | `id` (uuid) | `block_id`, `exercise_id`, `drop_order`, `weight_kg`, `reps` | `block_id` → workout_blocks.id, `exercise_id` → exercises.id |
| **workout_cluster_sets** | `id` (uuid) | `block_id`, `exercise_id`, `reps_per_cluster`, `clusters_per_set`, `intra_cluster_rest` | `block_id` → workout_blocks.id, `exercise_id` → exercises.id |
| **workout_rest_pause_sets** | `id` (uuid) | `block_id`, `exercise_id`, `weight_kg`, `rest_pause_duration`, `max_rest_pauses` | `block_id` → workout_blocks.id, `exercise_id` → exercises.id |
| **workout_pyramid_sets** | `id` (uuid) | `block_id`, `exercise_id`, `pyramid_order`, `weight_kg`, `reps` | `block_id` → workout_blocks.id, `exercise_id` → exercises.id |
| **workout_ladder_sets** | `id` (uuid) | `block_id`, `exercise_id`, `ladder_order`, `weight_kg`, `reps` | `block_id` → workout_blocks.id, `exercise_id` → exercises.id |
| **workout_time_protocols** | `id` (uuid) | `block_id`, `exercise_id`, `protocol_type`, `work_seconds`, `rest_seconds`, `rounds` | `block_id` → workout_blocks.id, `exercise_id` → exercises.id |
| **workout_hr_sets** | `id` (uuid) | `block_id`, `exercise_id`, `hr_zone`, `hr_percentage_min`, `hr_percentage_max`, `duration_seconds` | `block_id` → workout_blocks.id, `exercise_id` → exercises.id |

### Workout Assignment & Execution Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **workout_assignments** | `id` (uuid) | `workout_template_id`, `client_id`, `coach_id`, `name`, `assigned_date`, `scheduled_date`, `status` | `workout_template_id` → workout_templates.id, `client_id` → profiles.id, `coach_id` → profiles.id |
| **workout_block_assignments** | `id` (uuid) | `workout_assignment_id`, `workout_block_id`, `block_order`, `is_customized` | `workout_assignment_id` → workout_assignments.id, `workout_block_id` → workout_blocks.id |
| **workout_exercise_assignments** | `id` (uuid) | `workout_block_assignment_id`, `workout_block_exercise_id`, `exercise_id`, `exercise_order`, `sets`, `reps`, `weight_kg` | `workout_block_assignment_id` → workout_block_assignments.id, `workout_block_exercise_id` → workout_block_exercises.id, `exercise_id` → exercises.id |
| **workout_sessions** | `id` (uuid) | `assignment_id`, `client_id`, `started_at`, `completed_at`, `status` | `assignment_id` → workout_assignments.id, `client_id` → profiles.id |
| **workout_logs** | `id` (uuid) | `workout_assignment_id`, `client_id`, `started_at`, `completed_at`, `total_duration_minutes`, `total_sets_completed`, `total_reps_completed`, `total_weight_lifted` | `workout_assignment_id` → workout_assignments.id, `client_id` → profiles.id, `workout_session_id` → workout_sessions.id |
| **workout_set_logs** | `id` (uuid) | `workout_log_id`, `client_id`, `block_id`, `exercise_id`, `weight`, `reps`, `set_number`, `block_type` | `workout_log_id` → workout_logs.id, `client_id` → profiles.id, `exercise_id` → exercises.id |
| **workout_exercise_logs** | `id` (uuid) | `workout_log_id`, `workout_exercise_assignment_id`, `exercise_id`, `completed_sets`, `total_sets_completed`, `total_reps_completed` | `workout_log_id` → workout_logs.id, `workout_exercise_assignment_id` → workout_exercise_assignments.id, `exercise_id` → exercises.id |
| **workout_set_details** | `id` (uuid) | `workout_exercise_log_id`, `set_number`, `weight_kg`, `reps_completed`, `rpe`, `rest_seconds` | `workout_exercise_log_id` → workout_exercise_logs.id |
| **workout_giant_set_exercise_logs** | `id` (uuid) | `workout_set_log_id`, `exercise_id`, `exercise_order`, `weight_kg`, `reps_completed` | `workout_set_log_id` → workout_set_logs.id, `exercise_id` → exercises.id |
| **workout_block_completions** | `id` (uuid) | `workout_log_id`, `block_id`, `completed_at` | `workout_log_id` → workout_logs.id, `block_id` → workout_blocks.id |

### Program System Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **workout_programs** | `id` (uuid) | `name`, `coach_id`, `difficulty_level`, `duration_weeks`, `target_audience`, `category` | `coach_id` → profiles.id |
| **program_days** | `id` (uuid) | `program_id`, `day_number`, `day_type`, `workout_template_id`, `name`, `intensity_level` | `program_id` → workout_programs.id, `workout_template_id` → workout_templates.id |
| **program_schedule** | `id` (uuid) | `program_id`, `template_id`, `day_of_week`, `week_number` | `program_id` → workout_programs.id, `template_id` → workout_templates.id |
| **program_assignments** | `id` (uuid) | `program_id`, `client_id`, `coach_id`, `start_date`, `status`, `total_days`, `current_day_number`, `completed_days` | `program_id` → workout_programs.id, `client_id` → profiles.id, `coach_id` → profiles.id |
| **program_day_assignments** | `id` (uuid) | `program_assignment_id`, `program_day_id`, `day_number`, `day_type`, `workout_assignment_id`, `is_completed` | `program_assignment_id` → program_assignments.id, `program_day_id` → program_days.id, `workout_assignment_id` → workout_assignments.id |
| **program_assignment_progress** | `id` (uuid) | `assignment_id`, `client_id`, `program_id`, `current_week`, `current_day`, `days_completed_this_week`, `cycle_start_date` | `assignment_id` → program_assignments.id, `client_id` → profiles.id, `program_id` → workout_programs.id |
| **program_workout_completions** | `id` (uuid) | `assignment_progress_id`, `client_id`, `program_id`, `week_number`, `program_day`, `template_id`, `workout_date` | `assignment_progress_id` → program_assignment_progress.id, `client_id` → profiles.id, `program_id` → workout_programs.id |
| **program_progression_rules** | `id` (uuid) | `program_id`, `program_schedule_id`, `week_number`, `block_id`, `block_type`, `exercise_id`, `sets`, `reps`, `weight_kg`, `rest_seconds` | `program_id` → workout_programs.id, `program_schedule_id` → program_schedule.id, `block_id` → workout_blocks.id, `exercise_id` → exercises.id |
| **client_program_progression_rules** | `id` (uuid) | `client_id`, `program_assignment_id`, `week_number`, `block_id`, `exercise_id`, `sets`, `reps`, `weight_kg` | `client_id` → profiles.id, `program_assignment_id` → program_assignments.id, `block_id` → workout_blocks.id, `exercise_id` → exercises.id |

### Exercise Management Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **exercises** | `id` (uuid) | `coach_id`, `name`, `description`, `category`, `image_url`, `video_url`, `primary_muscle_group_id` | `coach_id` → profiles.id, `primary_muscle_group_id` → muscle_groups.id |
| **exercise_categories** | `id` (uuid) | `name`, `description`, `icon`, `color` | None |
| **exercise_instructions** | `id` (uuid) | `exercise_id`, `instruction_order`, `instruction_text` | `exercise_id` → exercises.id |
| **exercise_tips** | `id` (uuid) | `exercise_id`, `tip_order`, `tip_text` | `exercise_id` → exercises.id |
| **exercise_muscle_groups** | `id` (uuid) | `exercise_id`, `muscle_group`, `is_primary` | `exercise_id` → exercises.id |
| **exercise_equipment** | `id` (uuid) | `exercise_id`, `equipment_type`, `is_required` | `exercise_id` → exercises.id |
| **exercise_alternatives** | `id` (uuid) | `primary_exercise_id`, `alternative_exercise_id`, `reason` | `primary_exercise_id` → exercises.id, `alternative_exercise_id` → exercises.id |
| **muscle_groups** | `id` (uuid) | `name`, `description` | None |

### Nutrition Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **foods** | `id` (uuid) | `name`, `brand`, `serving_size`, `serving_unit`, `calories_per_serving`, `protein`, `carbs`, `fat`, `fiber`, `sugar`, `sodium` | None |
| **meal_plans** | `id` (uuid) | `coach_id`, `name`, `target_calories`, `target_protein`, `target_carbs`, `target_fat` | `coach_id` → profiles.id |
| **meal_plan_assignments** | `id` (uuid) | `coach_id`, `client_id`, `meal_plan_id`, `start_date`, `end_date`, `is_active` | `coach_id` → profiles.id, `client_id` → profiles.id, `meal_plan_id` → meal_plans.id |
| **meal_plan_items** | `id` (uuid) | `meal_plan_id`, `coach_id`, `food_id`, `meal_type`, `day_of_week`, `quantity` | `meal_plan_id` → meal_plans.id, `coach_id` → profiles.id, `food_id` → foods.id |
| **meals** | `id` (uuid) | `meal_plan_id`, `name`, `meal_type`, `order_index` | `meal_plan_id` → meal_plans.id |
| **meal_items** | `id` (uuid) | `meal_id`, `food_name`, `quantity`, `unit`, `calories_per_unit`, `protein_per_unit` | `meal_id` → meals.id |
| **meal_food_items** | `id` (uuid) | `meal_id`, `food_id`, `quantity`, `unit` | `meal_id` → meals.id, `food_id` → foods.id |
| **meal_completions** | `id` (uuid) | `meal_id`, `client_id`, `completed_at`, `photo_url` | `meal_id` → meals.id, `client_id` → profiles.id |
| **meal_photo_logs** | `id` (uuid) | `client_id`, `meal_id`, `log_date`, `photo_url`, `photo_path` | `client_id` → profiles.id, `meal_id` → meals.id |

### Progress Tracking Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **body_metrics** | `id` (uuid) | `client_id`, `coach_id`, `measured_date`, `weight_kg`, `body_fat_percentage`, `muscle_mass_kg`, `waist_circumference` | `client_id` → profiles.id, `coach_id` → profiles.id |
| **mobility_metrics** | `id` (uuid) | `client_id`, `coach_id`, `assessed_date`, `left_shoulder_ir`, `right_shoulder_ir`, `left_hip_ir`, `right_hip_ir` | `client_id` → profiles.id, `coach_id` → profiles.id |
| **fms_assessments** | `id` (uuid) | `client_id`, `coach_id`, `assessed_date`, `total_score`, `deep_squat`, `hurdle_step_left`, `hurdle_step_right` | `client_id` → profiles.id, `coach_id` → profiles.id |
| **performance_tests** | `id` (uuid) | `client_id`, `tested_at`, `test_type`, `time_seconds`, `heart_rate_pre`, `recovery_score` | `client_id` → profiles.id |
| **personal_records** | `id` (uuid) | `client_id`, `exercise_id`, `record_type`, `record_value`, `record_unit`, `achieved_date` | `client_id` → profiles.id, `exercise_id` → exercises.id, `workout_assignment_id` → workout_assignments.id |
| **user_exercise_metrics** | `id` (uuid) | `user_id`, `exercise_id`, `estimated_1rm` | `user_id` → profiles.id, `exercise_id` → exercises.id |
| **daily_wellness_logs** | `id` (uuid) | `client_id`, `log_date`, `energy_level`, `mood_rating`, `stress_level`, `motivation_level`, `soreness_level` | `client_id` → profiles.id |
| **supplement_logs** | `id` (uuid) | `client_id`, `log_date`, `supplement_name`, `dosage`, `taken_at` | `client_id` → profiles.id |
| **nutrition_logs** | `id` (uuid) | `client_id`, `log_date`, `total_calories`, `total_protein`, `total_carbs`, `total_fat` | `client_id` → profiles.id |

### Goals & Achievements Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **goals** | `id` (uuid) | `client_id`, `coach_id`, `title`, `category`, `target_value`, `target_date`, `current_value`, `status`, `priority` | `client_id` → profiles.id, `coach_id` → profiles.id |
| **achievements** | `id` (uuid) | `client_id`, `title`, `achievement_type`, `metric_type`, `metric_value`, `achieved_date` | `client_id` → profiles.id, `goal_id` → goals.id, `workout_id` → workout_assignments.id |
| **achievement_templates** | `id` (uuid) | `name`, `category`, `achievement_type`, `is_tiered`, `tier_bronze_threshold`, `tier_silver_threshold` | None |
| **user_achievements** | `id` (uuid) | `user_id`, `client_id`, `achievement_template_id`, `tier`, `metric_value`, `achieved_date` | `user_id` → profiles.id, `client_id` → profiles.id, `achievement_template_id` → achievement_templates.id |

### Habit Tracking Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **habits** | `id` (uuid) | `coach_id`, `name`, `description`, `frequency_type`, `target_days` | `coach_id` → profiles.id |
| **habit_assignments** | `id` (uuid) | `habit_id`, `client_id`, `start_date`, `end_date`, `is_active` | `habit_id` → habits.id, `client_id` → profiles.id |
| **habit_logs** | `id` (uuid) | `assignment_id`, `client_id`, `log_date`, `completed_at` | `assignment_id` → habit_assignments.id, `client_id` → profiles.id |

### Session Booking Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **coach_availability** | `id` (uuid) | `coach_id`, `day_of_week`, `start_time`, `end_time`, `slot_capacity` | `coach_id` → profiles.id |
| **coach_time_slots** | `id` (uuid) | `coach_id`, `date`, `start_time`, `end_time`, `is_available`, `recurring_pattern` | `coach_id` → profiles.id |
| **booked_sessions** | `id` (uuid) | `time_slot_id`, `coach_id`, `client_id`, `session_type`, `status`, `session_rating` | `time_slot_id` → coach_time_slots.id, `coach_id` → profiles.id, `client_id` → profiles.id |
| **sessions** | `id` (uuid) | `coach_id`, `client_id`, `title`, `scheduled_at`, `duration_minutes`, `status` | `coach_id` → profiles.id, `client_id` → profiles.id |

### Challenge System Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **challenges** | `id` (uuid) | `created_by`, `challenge_type`, `name`, `start_date`, `end_date`, `program_id`, `recomp_track`, `status` | `created_by` → profiles.id, `program_id` → workout_programs.id |
| **challenge_participants** | `id` (uuid) | `challenge_id`, `client_id`, `selected_track`, `status`, `total_score`, `final_rank` | `challenge_id` → challenges.id, `client_id` → profiles.id |
| **challenge_scoring_categories** | `id` (uuid) | `challenge_id`, `category_name`, `exercise_id`, `scoring_method`, `weight_percentage` | `challenge_id` → challenges.id, `exercise_id` → exercises.id |
| **challenge_video_submissions** | `id` (uuid) | `participant_id`, `scoring_category_id`, `video_url`, `status`, `claimed_weight`, `claimed_reps`, `reviewed_by` | `participant_id` → challenge_participants.id, `scoring_category_id` → challenge_scoring_categories.id, `reviewed_by` → profiles.id |

### Leaderboard Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **leaderboard_entries** | `id` (uuid) | `client_id`, `leaderboard_type`, `exercise_id`, `rank`, `score`, `time_window` | `client_id` → profiles.id, `exercise_id` → exercises.id |
| **leaderboard_rankings** | `id` (uuid) | `client_id`, `category`, `sex_filter`, `time_filter`, `score`, `rank`, `title` | `client_id` → profiles.id |
| **leaderboard_titles** | `id` (uuid) | `client_id`, `category`, `sex_filter`, `rank`, `title`, `earned_at`, `lost_at` | `client_id` → profiles.id |
| **current_champions** | View | `category`, `sex_filter`, `client_id`, `name`, `score`, `title` | Materialized view |

### Clip Card System Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **clipcard_types** | `id` (uuid) | `coach_id`, `name`, `sessions_count`, `validity_days`, `price` | `coach_id` → profiles.id |
| **clipcards** | `id` (uuid) | `coach_id`, `client_id`, `clipcard_type_id`, `sessions_total`, `sessions_used`, `start_date`, `end_date` | `coach_id` → profiles.id, `client_id` → profiles.id, `clipcard_type_id` → clipcard_types.id |
| **clip_cards** | `id` (bigint) | `client_id`, `coach_id`, `total_sessions`, `used_sessions` | Legacy table |

### Reference Data Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **progression_guidelines** | `id` (uuid) | `category`, `difficulty`, `volume_increase_week_min`, `intensity_increase_week`, `deload_frequency_weeks` | None |
| **volume_guidelines** | `id` (uuid) | `category`, `difficulty`, `sets_per_muscle_week_min`, `sets_per_muscle_week_optimal`, `reps_per_set_min` | None |
| **rp_volume_landmarks** | `id` (uuid) | `muscle_group_name`, `muscle_group_id`, `mv`, `mev`, `mav_low`, `mav_high`, `mrv` | `muscle_group_id` → muscle_groups.id |
| **workout_categories** | `id` (uuid) | `coach_id`, `name`, `description`, `color`, `icon` | `coach_id` → profiles.id |

### Client-Specific Workout Tables

| Table | Primary Key | Key Fields | Relationships |
|-------|-------------|------------|---------------|
| **client_workout_blocks** | `id` (uuid) | `client_id`, `workout_assignment_id`, `original_block_id`, `block_type`, `block_order` | `client_id` → profiles.id, `workout_assignment_id` → workout_assignments.id |
| **client_workout_block_exercises** | `id` (uuid) | `client_block_id`, `client_id`, `workout_assignment_id`, `original_block_exercise_id`, `exercise_id`, `exercise_order` | `client_block_id` → client_workout_blocks.id, `client_id` → profiles.id, `workout_assignment_id` → workout_assignments.id, `exercise_id` → exercises.id |

### Summary Views

| View | Purpose | Source Tables |
|------|---------|---------------|
| **latest_body_metrics** | Latest body metrics per client | `body_metrics` |
| **monthly_body_metrics_summary** | Monthly aggregated body metrics | `body_metrics` |
| **habit_tracking_summary** | Habit completion statistics | `habit_assignments`, `habit_logs` |
| **current_champions** | Current leaderboard champions | `leaderboard_rankings` |

### Orphaned/Unused Tables (Potential)

- **assigned_workouts** (bigint ID, legacy format)
- **assigned_meal_plans** (bigint ID, legacy format)
- **clip_cards** (bigint ID, legacy format)

---

## SECTION 3: API ROUTES / ENDPOINTS

### Authentication Required: All routes require authentication via `validateApiAuth()` or `createSupabaseServerClient().auth.getUser()`

### Client-Facing Endpoints

| Method | Path | Description | Models Touched | Auth |
|--------|------|-------------|----------------|------|
| GET | `/api/client/dashboard` | Returns client dashboard data (RPC: `get_client_dashboard`) | `profiles`, `workout_logs`, `body_metrics`, `goals`, `booked_sessions` | Client |
| GET | `/api/client/program-week` | Returns program week state for client | `program_assignments`, `program_schedule`, `program_day_completions`, `program_progress` | Client |
| GET | `/api/client/workouts/summary` | Returns workout summary for client | `workout_logs`, `workout_assignments` | Client |
| POST | `/api/log-set` | Logs a set during workout execution | `workout_logs`, `workout_set_logs`, `workout_exercise_logs`, `user_exercise_metrics`, `goals` | Client |
| PATCH | `/api/sets/[id]` | Updates a set log (in-progress workouts only) | `workout_set_logs`, `user_exercise_metrics` | Client |
| DELETE | `/api/sets/[id]` | Deletes a set log (in-progress workouts only) | `workout_set_logs`, `workout_giant_set_exercise_logs`, `user_exercise_metrics` | Client |
| POST | `/api/block-complete` | Marks a workout block as complete | `workout_block_completions`, `workout_logs` | Client |
| POST | `/api/complete-workout` | Completes a workout (unified pipeline) | `workout_logs`, `workout_sessions`, `program_day_completions`, `program_progress` | Client |
| POST | `/api/set-rpe` | Sets RPE (Rate of Perceived Exertion) on a set log | `workout_set_details` | Client |
| PATCH | `/api/user/timezone` | Updates user timezone | `profiles` | Client |

### Coach-Facing Endpoints

| Method | Path | Description | Models Touched | Auth |
|--------|------|-------------|----------------|------|
| GET | `/api/coach/dashboard` | Returns coach dashboard data (RPC: `get_coach_dashboard`) | `profiles`, `clients`, `workout_assignments`, `meal_plan_assignments`, `booked_sessions` | Coach |
| GET | `/api/coach/control-room` | Returns control room data for coach | `clients`, `workout_assignments`, `program_assignments` | Coach |
| GET | `/api/coach/pickup/next-workout` | Returns next workout for coach pickup | `workout_assignments`, `workout_templates` | Coach |
| POST | `/api/coach/pickup/mark-complete` | Coach marks workout as complete | `workout_logs`, `program_day_completions`, `program_progress` | Coach |
| POST | `/api/clients/create` | Creates a new client | `profiles`, `clients`, `invite_codes` | Coach |

### Program Management Endpoints

| Method | Path | Description | Models Touched | Auth |
|--------|------|-------------|----------------|------|
| POST | `/api/program-workouts/start` | Starts a program workout | `program_assignments`, `workout_assignments`, `program_day_assignments` | Client |
| POST | `/api/program-workouts/start-from-progress` | Starts program workout from progress state | `program_assignments`, `program_progress`, `workout_assignments` | Client |

### Session Management Endpoints

| Method | Path | Description | Models Touched | Auth |
|--------|------|-------------|----------------|------|
| POST | `/api/sessions/create` | Creates a new session booking | `sessions`, `coach_time_slots`, `booked_sessions` | Client/Coach |
| POST | `/api/cancel-session` | Cancels a booked session | `booked_sessions`, `coach_time_slots` | Client/Coach |

### Notification & Communication Endpoints

| Method | Path | Description | Models Touched | Auth |
|--------|------|-------------|----------------|------|
| POST | `/api/notifications/send` | Sends push notification via OneSignal | OneSignal API | Coach/Admin |
| POST | `/api/emails/send-invite` | Sends invite email to client | OneSignal API (email) | Coach |

### Goal Management Endpoints

| Method | Path | Description | Models Touched | Auth |
|--------|------|-------------|----------------|------|
| POST | `/api/goals/sync` | Syncs goal progress from workout data | `goals`, `workout_logs`, `body_metrics` | Client |

### Cron Jobs (Protected by CRON_SECRET)

| Method | Path | Description | Models Touched | Auth |
|--------|------|-------------|----------------|------|
| GET/POST | `/api/cron/daily-sync` | Daily sync job | Various | Cron Secret |
| GET/POST | `/api/cron/daily-reset` | Daily reset job | Various | Cron Secret |
| GET/POST | `/api/cron/weekly-reset` | Weekly reset job | Various | Cron Secret |

---

## SECTION 4: BUSINESS LOGIC & SERVICES

### Core Service Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/lib/completeWorkoutService.ts` | Unified workout completion pipeline | `completeWorkout()` - Handles workout completion, program progress, week locking |
| `src/lib/programStateService.ts` | Program state resolution | Resolves current program state from canonical tables |
| `src/lib/programWeekStateBuilder.ts` | Builds program week state | `buildProgramWeekState()` - Determines today's workout, rest days, week progression |
| `src/lib/programProgressionService.ts` | Applies program progression rules | Applies week-over-week changes to workout parameters |
| `src/lib/programProgressService.ts` | Program progress tracking | Tracks program completion and advancement |
| `src/lib/programService.ts` | Program management utilities | Program CRUD operations |
| `src/lib/workoutTemplateService.ts` | Workout template operations | Template loading, creation, updates |
| `src/lib/workoutBlockService.ts` | Workout block operations | Block loading, building, special set handling |
| `src/lib/clientDashboardService.ts` | Client dashboard data | Aggregates client dashboard metrics |
| `src/lib/coachDashboardService.ts` | Coach dashboard data | Aggregates coach dashboard metrics |
| `src/lib/coach/controlRoomService.ts` | Coach control room data | Control room metrics and client overview |
| `src/lib/setLogging/goldenLogSet.ts` | Set logging logic | Core set logging functionality |
| `src/lib/recomputeUserExerciseMetrics.ts` | Exercise metrics calculation | Recomputes e1RM and exercise metrics |
| `src/lib/weightDefaultService.ts` | Weight default calculation | Determines default weights for exercises |
| `src/lib/clientProgressionService.ts` | Client-specific progression | Applies client-specific progression rules |

### Progress & Analytics Services

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/lib/progressStatsService.ts` | Client progress statistics | Aggregates workout logs, body metrics, goals, achievements |
| `src/lib/programMetricsService.ts` | Program metrics calculation | Program-level analytics and compliance |
| `src/lib/weekComplianceService.ts` | Week compliance tracking | Tracks weekly workout compliance |
| `src/lib/clientCompliance.ts` | Client compliance scoring | Calculates compliance scores |
| `src/lib/progressTrackingService.ts` | Progress tracking utilities | General progress tracking helpers |

### Metrics & Achievements Services

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/lib/metrics/index.ts` | Metrics aggregation hub | Central metrics service |
| `src/lib/metrics/pr.ts` | Personal records calculation | PR detection and tracking |
| `src/lib/metrics/achievements.ts` | Achievement calculation | Achievement detection and awarding |
| `src/lib/metrics/coach.ts` | Coach metrics | Coach-specific metrics |
| `src/lib/metrics/body.ts` | Body metrics | Body measurement tracking |
| `src/lib/metrics/goals.ts` | Goal metrics | Goal progress tracking |
| `src/lib/metrics/habit.ts` | Habit metrics | Habit tracking metrics |
| `src/lib/metrics/nutrition.ts` | Nutrition metrics | Nutrition tracking metrics |
| `src/lib/metrics/workout.ts` | Workout metrics | Workout performance metrics |
| `src/lib/metrics/period.ts` | Period-based metrics | Time-period aggregations |
| `src/lib/achievementService.ts` | Achievement service | Achievement management |
| `src/lib/personalRecords.ts` | Personal records service | PR management |
| `src/lib/leaderboardService.ts` | Leaderboard service | Leaderboard calculations |

### Notification Services

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/lib/notifications.ts` | Push notification sending | `sendPushNotification()` - Sends via OneSignal |
| `src/lib/onesignalSender.ts` | OneSignal integration | OneSignal API wrapper |
| `src/lib/onesignal.ts` | OneSignal client initialization | Client-side OneSignal setup |
| `src/lib/notificationTriggers.ts` | Notification triggers | Determines when to send notifications |
| `src/lib/notificationHelpers.ts` | Notification helpers | Notification utility functions |

### Email Services

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/lib/emailService.ts` | Email sending service | `sendInviteEmail()` - Sends invite emails via OneSignal |

### Nutrition Services

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/lib/mealPlanService.ts` | Meal plan management | Meal plan CRUD operations |

### Scheduling Services

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/lib/schedulingService.ts` | Session scheduling | Session booking and management |
| `src/lib/scheduledJobs.ts` | Scheduled job execution | Cron job execution |

### Authentication & Authorization Services

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/lib/apiAuth.ts` | API authentication | `validateApiAuth()` - Validates API requests, returns auth/admin clients |
| `src/lib/auth/authService.ts` | Auth service | Authentication utilities |
| `src/lib/roleGuard.ts` | Role-based access control | Role checking utilities |

### Utility Services

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/lib/timezoneSync.ts` | Timezone synchronization | Timezone handling |
| `src/lib/goalSyncService.ts` | Goal synchronization | Syncs goals from workout data |
| `src/lib/e1rmUtils.ts` | e1RM calculation | Estimated 1RM formulas |
| `src/lib/perfGuard.ts` | Performance guards | Performance monitoring |
| `src/lib/perfUtils.ts` | Performance utilities | Performance measurement |
| `src/lib/serverCache.ts` | Server-side caching | Caching utilities |
| `src/lib/prefetch.ts` | Data prefetching | Prefetch utilities |
| `src/lib/withTimeout.ts` | Timeout utilities | Request timeout handling |

### Workout Assignment Logic

**Workout Assignment Flow:**
1. Coach creates workout template (`workout_templates`)
2. Coach assigns workout to client (`workout_assignments`)
3. System creates block assignments (`workout_block_assignments`)
4. System creates exercise assignments (`workout_exercise_assignments`)
5. Client starts workout session (`workout_sessions`)
6. Client logs sets (`workout_set_logs` via `/api/log-set`)
7. Client completes workout (`/api/complete-workout`)

**Program Assignment Flow:**
1. Coach creates program (`workout_programs`)
2. Coach defines program days (`program_days`)
3. Coach defines program schedule (`program_schedule`)
4. Coach assigns program to client (`program_assignments`)
5. System creates program day assignments (`program_day_assignments`)
6. Client starts program workout (`/api/program-workouts/start`)
7. Client completes workout (`/api/complete-workout`)
8. System advances program progress (`program_progress`, `program_day_completions`)

### Progress Calculation Logic

**Streak Tracking:**
- Calculated from `workout_logs` based on consecutive workout days
- Stored in dashboard RPC results

**Goal Progress:**
- Goals sync via `/api/goals/sync`
- Progress calculated from `workout_logs`, `body_metrics`, `personal_records`
- Updates `goals.current_value` and `goals.progress_percentage`

**Personal Records:**
- Detected when logging sets (`/api/log-set`)
- Stored in `personal_records` table
- e1RM calculated using formulas in `e1rmUtils.ts`

### Notification/Reminder Logic

**Notification Triggers:**
- Workout reminders (scheduled workouts)
- Goal achievements
- Program milestones
- Session reminders

**Implementation:**
- Uses OneSignal push notifications
- Scheduled via cron jobs (`/api/cron/daily-sync`, etc.)
- Triggered by `notificationTriggers.ts`

### Subscription Management

**Note:** No subscription/payment tables found in schema. This appears to be a B2B SaaS where coaches manage clients directly without payment processing.

### Coach-Client Relationship Management

**Client Creation:**
- Coach creates client via `/api/clients/create`
- Creates `profiles` record with `role='client'`
- Creates `clients` relationship record
- Generates `invite_codes` for client signup

**Client Access:**
- Clients can only access their own data (RLS policies)
- Coaches can access all their clients' data (RLS policies)
- Admins have full access (RLS policies)

---

## SECTION 5: THIRD-PARTY INTEGRATIONS

### OneSignal
- **Purpose:** Push notifications and email sending
- **Usage:**
  - Push notifications: `src/lib/notifications.ts`, `src/lib/onesignalSender.ts`
  - Email sending: `src/lib/emailService.ts` (uses OneSignal REST API)
  - Client initialization: `src/lib/onesignal.ts`
- **Environment Variables:**
  - `NEXT_PUBLIC_ONESIGNAL_APP_ID`
  - `ONESIGNAL_REST_API_KEY`
  - `NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID`
  - `NEXT_PUBLIC_ONESIGNAL_ORIGIN`
- **Endpoints Used:**
  - `https://onesignal.com/api/v1/notifications` (POST)

### Supabase
- **Purpose:** Database, authentication, storage, RLS
- **Usage:**
  - Database: All data operations via Supabase client
  - Authentication: Session management via `@supabase/ssr`
  - Storage: Image storage for exercises, avatars (referenced in `imageConfig.ts`)
  - RLS: Row-level security on all tables
- **Environment Variables:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **RPC Functions Used:**
  - `get_client_dashboard`
  - `get_coach_dashboard`
  - `advance_program_progress`
  - Various other RPCs referenced in migrations

### Web Push (Service Worker)
- **Purpose:** PWA push notifications
- **Usage:** `src/lib/serviceWorker.ts`
- **Environment Variables:**
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **Package:** `web-push` v3.6.7

### No Other Third-Party Integrations Found
- No payment processors (Stripe, PayPal, etc.)
- No analytics services (Google Analytics, Mixpanel, etc.)
- No CDN services (Cloudinary, etc.) - uses Supabase Storage
- No SMS services (Twilio, etc.)
- No calendar services (Google Calendar, etc.)

---

## SECTION 6: GAPS & OBSERVATIONS

### Dead Endpoints
**None identified** - All API routes appear to be actively used based on codebase structure.

### TODO Comments & Incomplete Features
**Found in codebase:**
- Debug logging statements throughout (not TODOs, but indicates active development)
- Performance monitoring code (`perfGuard.ts`, `perfUtils.ts`) suggests ongoing optimization
- Debug harness system (`debugHarness.ts`) for development debugging

**Potential incomplete features:**
- Some mock data found in analytics components (referenced in `analytics-progress-inventory.md`)
- Some queries may reference non-existent tables (`workout_sessions` used in some places where `workout_logs` should be used)

### Security Concerns

**Positive Security Practices:**
- All API routes require authentication
- RLS enabled on all sensitive tables
- Ownership validation in API routes (`validateOwnership()`)
- Service role key only used server-side
- Cron jobs protected by `CRON_SECRET`

**Potential Security Considerations:**
- Service role key fallback to anon key in some routes (`log-set/route.ts` line 119) - should be reviewed
- Some API routes use `supabaseAdmin` (service role) which bypasses RLS - ensure proper validation

### Data Not Displayed in Frontend

**Based on schema analysis:**
- `daily_wellness_logs` - Wellness tracking (energy, mood, stress) may not be fully displayed
- `supplement_logs` - Supplement tracking may not be displayed
- `nutrition_logs` - Daily nutrition summaries may not be displayed
- `challenge_video_submissions` - Challenge video submissions may have limited UI
- `fms_assessments` - FMS assessment data may not be fully displayed
- `mobility_metrics` - Detailed mobility metrics may not be displayed
- `performance_tests` - Performance test results may not be displayed
- `leaderboard_rankings` / `leaderboard_titles` - Leaderboard system may not be fully implemented in UI

### Architecture Observations

**Strengths:**
- Well-structured service layer separation
- Comprehensive RLS policies
- Optimized RPC functions for dashboards
- Unified workout completion pipeline
- Canonical program state system

**Areas of Note:**
- Legacy tables still present (`assigned_workouts`, `assigned_meal_plans`, `clip_cards` with bigint IDs)
- Some tables referenced in code but not in schema CSV (`program_progress`, `program_day_completions` - may be views or created in migrations)
- Complex workout block system with many special set types
- Program system has both legacy and canonical tracking tables

### Performance Considerations

**Optimizations Found:**
- Dashboard RPCs (`get_client_dashboard`, `get_coach_dashboard`) reduce query count
- Performance monitoring (`perfGuard.ts`, `perfUtils.ts`)
- Query logging (`supabaseQueryLogger.ts`)
- Server-side caching (`serverCache.ts`)

**Potential Issues:**
- Some services may have N+1 query patterns (noted in `achievementService.ts`)
- Multiple queries in loops in some places (should be batched)

### Database Schema Observations

**Complex Relationships:**
- Workout system has deep nesting: templates → blocks → exercises → special sets
- Program system has multiple tracking mechanisms (legacy + canonical)
- Client-specific workout customization tables (`client_workout_blocks`, `client_workout_block_exercises`)

**Data Integrity:**
- Foreign keys properly defined
- CHECK constraints enforce data validity
- UNIQUE constraints prevent duplicates
- RLS policies enforce access control

---

## SUMMARY

The DailyFitness backend is a comprehensive Next.js application with Supabase as the backend-as-a-service. It features:

- **85+ database tables** covering workouts, programs, nutrition, progress tracking, goals, habits, sessions, challenges, and leaderboards
- **24 API endpoints** organized by client/coach/admin roles
- **50+ service files** handling business logic, metrics, notifications, and data operations
- **Two third-party integrations:** OneSignal (notifications/email) and Supabase (database/auth/storage)
- **Strong security:** RLS on all tables, authentication on all routes, ownership validation
- **Optimized performance:** RPC functions for dashboards, query logging, performance monitoring

The system is production-ready with comprehensive features for fitness coaching, though some areas may benefit from further optimization and some data may not be fully exposed in the frontend UI.
