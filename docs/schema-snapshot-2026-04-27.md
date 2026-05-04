# DailyFitness DB Schema Snapshot (2026-04-27)

Generated from live schema query exports on 2026-04-27.

## Summary

- Tables: 88
- Tables with RLS: 80
- Total columns: 1167

## Known Schema Drift

- `program_progression_rules` uses `set_entry_id` / `set_type` / `set_order` / `set_name`, while `client_program_progression_rules` still uses `block_id` / `block_type` / `block_order` / `block_name`; copy code translates.
- `program_progress` and `program_progress_v1` both exist (legacy `v1` still present).
- `program_day_completions` and `program_day_completions_v1` both exist.

## Auth & Profiles

### `profiles`

Core user profile records linked to auth identities.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `null` | — |
| `email` | `text` | NO | `null` | — |
| `role` | `text` | NO | `null` | — |
| `first_name` | `text` | YES | `null` | — |
| `last_name` | `text` | YES | `null` | — |
| `avatar_url` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |
| `sex` | `character varying` | YES | `null` | — |
| `bodyweight` | `numeric` | YES | `null` | — |
| `client_type` | `USER-DEFINED` | NO | `'online'::client_type` | — |
| `leaderboard_visibility` | `USER-DEFINED` | NO | `'public'::leaderboard_visibility` | — |

**RLS Policies**

- `Coaches can read client profiles` — SELECT — custom predicate
- `Users can insert their own profile` — INSERT — custom predicate
- `Users can view their own profile` — SELECT — custom predicate
- `profiles_select_own_or_coach` — SELECT — custom predicate
- `profiles_update_own` — UPDATE — custom predicate

### `clients`

Coach-client relationship mapping and status.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `client_id` | `uuid` | NO | `null` | — |
| `status` | `text` | NO | `'active'::text` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can view their coach relationship` — SELECT — client owns
- `Coaches can view their clients` — SELECT — coach owns
- `clients_manage_coach` — ALL — coach owns

### `coaches_public`

_Table not found in provided export._

### `invite_codes`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `code` | `character varying` | NO | `null` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `client_email` | `character varying` | YES | `null` | — |
| `client_name` | `character varying` | YES | `null` | — |
| `expires_at` | `timestamp with time zone` | YES | `null` | — |
| `is_used` | `boolean` | YES | `false` | — |
| `used_by` | `uuid` | YES | `null` | — |
| `used_at` | `timestamp with time zone` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `notes` | `text` | YES | `null` | — |
| `max_uses` | `integer` | YES | `null` | — |
| `used_count` | `integer` | YES | `0` | — |
| `last_used_at` | `timestamp with time zone` | YES | `null` | — |
| `is_active` | `boolean` | YES | `true` | — |

**RLS Policies**

- `Anyone can validate invite codes` — SELECT — broad allow guard
- `Coaches can manage their invite codes` — ALL — coach owns

## Workouts (Templates)

### `workout_templates`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `name` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `coach_id` | `uuid` | NO | `null` | `profiles.id` |
| `difficulty_level` | `text` | YES | `'intermediate'::text` | — |
| `estimated_duration` | `integer` | YES | `60` | — |
| `category` | `text` | YES | `'general'::text` | — |
| `is_active` | `boolean` | YES | `true` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can view assigned workout templates` — SELECT — custom predicate
- `Coaches can manage workout templates` — ALL — coach owns

### `workout_set_entries`

_Table not found in provided export._

### `workout_set_entry_exercises`

_Table not found in provided export._

### `workout_drop_sets`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `drop_order` | `integer` | NO | `null` | — |
| `weight_kg` | `numeric` | YES | `null` | — |
| `reps` | `character varying` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `block_id` | `uuid` | YES | `null` | `workout_blocks.id` |
| `exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `exercise_order` | `integer` | YES | `1` | — |
| `load_percentage` | `numeric` | YES | `null` | — |
| `drop_percentage` | `integer` | YES | `null` | — |

**RLS Policies**

- `Clients can view drop sets in assigned workouts` — SELECT — custom predicate
- `Coaches can delete drop sets from their blocks` — DELETE — custom predicate
- `Coaches can insert drop sets into their blocks` — INSERT — custom predicate
- `Coaches can update drop sets in their blocks` — UPDATE — custom predicate
- `Coaches can view drop sets in their blocks` — SELECT — custom predicate

### `workout_cluster_sets`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `reps_per_cluster` | `integer` | NO | `null` | — |
| `clusters_per_set` | `integer` | NO | `null` | — |
| `intra_cluster_rest` | `integer` | YES | `15` | — |
| `inter_set_rest` | `integer` | YES | `120` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `block_id` | `uuid` | YES | `null` | `workout_blocks.id` |
| `exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `exercise_order` | `integer` | YES | `1` | — |
| `load_percentage` | `numeric` | YES | `null` | — |
| `weight_kg` | `numeric` | YES | `null` | — |

**RLS Policies**

- `Clients can view cluster sets in assigned workouts` — SELECT — custom predicate
- `Coaches can delete cluster sets from their blocks` — DELETE — custom predicate
- `Coaches can insert cluster sets into their blocks` — INSERT — custom predicate
- `Coaches can update cluster sets in their blocks` — UPDATE — custom predicate
- `Coaches can view cluster sets in their blocks` — SELECT — custom predicate

### `workout_rest_pause_sets`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `weight_kg` | `numeric` | YES | `null` | — |
| `rest_pause_duration` | `integer` | YES | `15` | — |
| `max_rest_pauses` | `integer` | YES | `3` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `block_id` | `uuid` | YES | `null` | `workout_blocks.id` |
| `exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `exercise_order` | `integer` | YES | `1` | — |
| `load_percentage` | `numeric` | YES | `null` | — |

**RLS Policies**

- `Clients can view rest pause sets in assigned workouts` — SELECT — custom predicate
- `Coaches can delete rest pause sets from their blocks` — DELETE — custom predicate
- `Coaches can insert rest pause sets into their blocks` — INSERT — custom predicate
- `Coaches can update rest pause sets in their blocks` — UPDATE — custom predicate
- `Coaches can view rest pause sets in their blocks` — SELECT — custom predicate

### `workout_speed_sets`

_Table not found in provided export._

### `workout_endurance_sets`

_Table not found in provided export._

### `workout_time_protocols`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `block_id` | `uuid` | NO | `null` | `workout_blocks.id` |
| `protocol_type` | `character varying` | NO | `null` | — |
| `total_duration_minutes` | `integer` | YES | `null` | — |
| `work_seconds` | `integer` | YES | `null` | — |
| `rest_seconds` | `integer` | YES | `null` | — |
| `rounds` | `integer` | YES | `null` | — |
| `reps_per_round` | `integer` | YES | `null` | — |
| `rest_after_round_seconds` | `integer` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `exercise_order` | `integer` | YES | `1` | — |
| `load_percentage` | `numeric` | YES | `null` | — |
| `set` | `integer` | YES | `null` | — |
| `rest_after_set` | `integer` | YES | `null` | — |
| `weight_kg` | `numeric` | YES | `null` | — |
| `target_reps` | `integer` | YES | `null` | — |
| `time_cap_minutes` | `integer` | YES | `null` | — |
| `emom_mode` | `character varying` | YES | `null` | — |

**RLS Policies**

- `Clients can view time protocols in assigned workouts` — SELECT — custom predicate
- `Coaches can delete time protocols from their blocks` — DELETE — custom predicate
- `Coaches can insert time protocols into their blocks` — INSERT — custom predicate
- `Coaches can update time protocols in their blocks` — UPDATE — custom predicate
- `Coaches can view time protocols in their blocks` — SELECT — custom predicate

## Workouts (Execution & Logs)

### `workout_logs`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `workout_assignment_id` | `uuid` | NO | `null` | `workout_assignments.id` |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `started_at` | `timestamp with time zone` | NO | `null` | — |
| `completed_at` | `timestamp with time zone` | YES | `null` | — |
| `total_duration_minutes` | `integer` | YES | `null` | — |
| `overall_difficulty_rating` | `integer` | YES | `null` | — |
| `perceived_effort` | `integer` | YES | `null` | — |
| `total_sets_completed` | `integer` | YES | `0` | — |
| `total_reps_completed` | `integer` | YES | `0` | — |
| `total_weight_lifted` | `numeric` | YES | `0` | — |
| `energy_level` | `integer` | YES | `null` | — |
| `muscle_fatigue_level` | `integer` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `workout_session_id` | `uuid` | YES | `null` | `workout_sessions.id` |
| `total_hr_zone2_minutes` | `numeric` | YES | `null` | — |
| `total_hr_zone45_minutes` | `numeric` | YES | `null` | — |
| `average_hr_percentage` | `numeric` | YES | `null` | — |
| `max_hr_percentage` | `numeric` | YES | `null` | — |
| `total_distance_meters` | `numeric` | YES | `null` | — |

**RLS Policies**

- `Clients can insert their own workout logs` — INSERT — client owns
- `Clients can read their own workout logs` — SELECT — client owns
- `Clients can update their own workout logs` — UPDATE — client owns

### `workout_set_logs`

Stores per-set execution logs captured in sessions.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `workout_log_id` | `uuid` | NO | `null` | `workout_logs.id` |
| `client_id` | `uuid` | NO | `null` | — |
| `block_id` | `uuid` | NO | `null` | — |
| `exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `weight` | `numeric` | YES | `null` | — |
| `reps` | `integer` | YES | `null` | — |
| `completed_at` | `timestamp with time zone` | YES | `now()` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `block_type` | `text` | YES | `null` | — |
| `set_number` | `integer` | YES | `null` | — |
| `superset_exercise_a_id` | `uuid` | YES | `null` | — |
| `superset_weight_a` | `numeric` | YES | `null` | — |
| `superset_reps_a` | `integer` | YES | `null` | — |
| `superset_exercise_b_id` | `uuid` | YES | `null` | — |
| `superset_weight_b` | `numeric` | YES | `null` | — |
| `superset_reps_b` | `integer` | YES | `null` | — |
| `giant_set_exercises` | `jsonb` | YES | `null` | — |
| `round_number` | `integer` | YES | `null` | — |
| `dropset_initial_weight` | `numeric` | YES | `null` | — |
| `dropset_initial_reps` | `integer` | YES | `null` | — |
| `dropset_final_weight` | `numeric` | YES | `null` | — |
| `dropset_final_reps` | `integer` | YES | `null` | — |
| `dropset_percentage` | `numeric` | YES | `null` | — |
| `cluster_number` | `integer` | YES | `null` | — |
| `rest_pause_initial_weight` | `numeric` | YES | `null` | — |
| `rest_pause_initial_reps` | `integer` | YES | `null` | — |
| `rest_pause_reps_after` | `integer` | YES | `null` | — |
| `rest_pause_number` | `integer` | YES | `null` | — |
| `preexhaust_isolation_exercise_id` | `uuid` | YES | `null` | — |
| `preexhaust_isolation_weight` | `numeric` | YES | `null` | — |
| `preexhaust_isolation_reps` | `integer` | YES | `null` | — |
| `preexhaust_compound_exercise_id` | `uuid` | YES | `null` | — |
| `preexhaust_compound_weight` | `numeric` | YES | `null` | — |
| `preexhaust_compound_reps` | `integer` | YES | `null` | — |
| `amrap_total_reps` | `integer` | YES | `null` | — |
| `amrap_duration_seconds` | `integer` | YES | `null` | — |
| `amrap_target_reps` | `integer` | YES | `null` | — |
| `emom_minute_number` | `integer` | YES | `null` | — |
| `emom_total_reps_this_min` | `integer` | YES | `null` | — |
| `emom_total_duration_sec` | `integer` | YES | `null` | — |
| `tabata_rounds_completed` | `integer` | YES | `null` | — |
| `tabata_total_duration_sec` | `integer` | YES | `null` | — |
| `fortime_total_reps` | `integer` | YES | `null` | — |
| `fortime_time_taken_sec` | `integer` | YES | `null` | — |
| `fortime_time_cap_sec` | `integer` | YES | `null` | — |
| `fortime_target_reps` | `integer` | YES | `null` | — |
| `pyramid_step_number` | `integer` | YES | `null` | — |
| `ladder_rung_number` | `integer` | YES | `null` | — |
| `ladder_round_number` | `integer` | YES | `null` | — |
| `rest_pause_duration` | `integer` | YES | `null` | — |
| `max_rest_pauses` | `integer` | YES | `null` | — |
| `hr_zone` | `integer` | YES | `null` | — |
| `hr_percentage` | `numeric` | YES | `null` | — |
| `hr_duration_seconds` | `integer` | YES | `null` | — |
| `hr_distance_meters` | `numeric` | YES | `null` | — |
| `hr_interval_round` | `integer` | YES | `null` | — |
| `hr_work_duration_seconds` | `integer` | YES | `null` | — |
| `hr_rest_duration_seconds` | `integer` | YES | `null` | — |
| `hr_average_percentage` | `numeric` | YES | `null` | — |

**RLS Policies**

- `Clients insert own set logs` — INSERT — client owns
- `Clients view own set logs` — SELECT — client owns

### `workout_exercise_logs`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `workout_log_id` | `uuid` | NO | `null` | `workout_logs.id` |
| `workout_exercise_assignment_id` | `uuid` | YES | `null` | `workout_exercise_assignments.id` |
| `exercise_id` | `uuid` | NO | `null` | `exercises.id` |
| `exercise_order` | `integer` | YES | `null` | — |
| `completed_sets` | `jsonb` | YES | `null` | — |
| `total_sets_planned` | `integer` | YES | `null` | — |
| `total_sets_completed` | `integer` | YES | `null` | — |
| `total_reps_completed` | `integer` | YES | `null` | — |
| `total_weight_lifted` | `numeric` | YES | `null` | — |
| `difficulty_rating` | `integer` | YES | `null` | — |
| `form_quality_rating` | `integer` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `workout_exercise_logs_delete` — DELETE — custom predicate
- `workout_exercise_logs_insert` — INSERT — custom predicate
- `workout_exercise_logs_select` — SELECT — custom predicate
- `workout_exercise_logs_update` — UPDATE — custom predicate

### `workout_giant_set_exercise_logs`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `workout_set_log_id` | `uuid` | NO | `null` | `workout_set_logs.id` |
| `exercise_id` | `uuid` | NO | `null` | `exercises.id` |
| `exercise_order` | `integer` | NO | `null` | — |
| `weight_kg` | `numeric` | YES | `null` | — |
| `reps_completed` | `integer` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Users can insert their own giant set exercise logs` — INSERT — custom predicate
- `Users can read their own giant set exercise logs` — SELECT — custom predicate

### `workout_set_details`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `workout_exercise_log_id` | `uuid` | NO | `null` | `workout_exercise_logs.id` |
| `set_number` | `integer` | NO | `null` | — |
| `weight_kg` | `numeric` | YES | `null` | — |
| `reps_completed` | `integer` | YES | `null` | — |
| `rpe` | `integer` | YES | `null` | — |
| `rest_seconds` | `integer` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `completed_at` | `timestamp with time zone` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Users can insert their own workout set details` — INSERT — custom predicate
- `Users can read their own workout set details` — SELECT — custom predicate
- `workout_set_details_update` — UPDATE — custom predicate

### `workout_set_entry_completions`

_Table not found in provided export._

### `workout_sessions`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `assignment_id` | `uuid` | NO | `null` | — |
| `client_id` | `uuid` | NO | `null` | — |
| `started_at` | `timestamp with time zone` | YES | `now()` | — |
| `completed_at` | `timestamp with time zone` | YES | `null` | — |
| `total_duration` | `integer` | YES | `null` | — |
| `status` | `text` | YES | `'in_progress'::text` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can manage their sessions` — ALL — client owns

### `workout_assignments`

Assigns workout templates to clients for execution.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `workout_template_id` | `uuid` | YES | `null` | `workout_templates.id` |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `coach_id` | `uuid` | NO | `null` | `profiles.id` |
| `name` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `estimated_duration` | `integer` | YES | `60` | — |
| `assigned_date` | `date` | NO | `CURRENT_DATE` | — |
| `scheduled_date` | `date` | YES | `null` | — |
| `status` | `text` | YES | `'assigned'::text` | — |
| `notes` | `text` | YES | `null` | — |
| `is_customized` | `boolean` | YES | `false` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can view their workout assignments` — SELECT — client owns
- `Coaches can manage workout assignments` — ALL — coach owns

### `workout_block_assignments`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `workout_assignment_id` | `uuid` | NO | `null` | `workout_assignments.id` |
| `workout_block_id` | `uuid` | YES | `null` | `workout_blocks.id` |
| `block_order` | `integer` | NO | `null` | — |
| `block_name` | `character varying` | YES | `null` | — |
| `block_notes` | `text` | YES | `null` | — |
| `duration_seconds` | `integer` | YES | `null` | — |
| `rest_seconds` | `integer` | YES | `null` | — |
| `total_sets` | `integer` | YES | `null` | — |
| `reps_per_set` | `character varying` | YES | `null` | — |
| `is_customized` | `boolean` | YES | `false` | — |
| `is_exercises_customized` | `boolean` | YES | `false` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `workout_block_assignments_delete` — DELETE — custom predicate
- `workout_block_assignments_insert` — INSERT — custom predicate
- `workout_block_assignments_select` — SELECT — custom predicate
- `workout_block_assignments_update` — UPDATE — custom predicate

### `workout_exercise_assignments`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `workout_block_assignment_id` | `uuid` | NO | `null` | `workout_block_assignments.id` |
| `workout_block_exercise_id` | `uuid` | YES | `null` | `workout_block_exercises.id` |
| `exercise_id` | `uuid` | NO | `null` | `exercises.id` |
| `exercise_order` | `integer` | NO | `null` | — |
| `exercise_letter` | `character varying` | YES | `null` | — |
| `sets` | `integer` | YES | `null` | — |
| `reps` | `character varying` | YES | `null` | — |
| `weight_kg` | `numeric` | YES | `null` | — |
| `rir` | `integer` | YES | `null` | — |
| `tempo` | `character varying` | YES | `null` | — |
| `rest_seconds` | `integer` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `is_customized` | `boolean` | YES | `false` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `workout_exercise_assignments_delete` — DELETE — custom predicate
- `workout_exercise_assignments_insert` — INSERT — custom predicate
- `workout_exercise_assignments_select` — SELECT — custom predicate
- `workout_exercise_assignments_update` — UPDATE — custom predicate

### `client_workout_blocks`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | `clients.id` |
| `workout_assignment_id` | `uuid` | NO | `null` | `workout_assignments.id` |
| `original_block_id` | `uuid` | YES | `null` | — |
| `block_type` | `text` | NO | `null` | — |
| `block_order` | `integer` | NO | `null` | — |
| `block_name` | `text` | YES | `null` | — |
| `block_notes` | `text` | YES | `null` | — |
| `total_sets` | `integer` | YES | `null` | — |
| `reps_per_set` | `text` | YES | `null` | — |
| `rest_seconds` | `integer` | YES | `null` | — |
| `duration_seconds` | `integer` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | NO | `now()` | — |
| `updated_at` | `timestamp with time zone` | NO | `now()` | — |

**RLS Policies**

- `Coaches delete client workout blocks` — DELETE — custom predicate
- `Coaches insert client workout blocks` — INSERT — custom predicate
- `Coaches select client workout blocks` — SELECT — custom predicate
- `client_workout_blocks_update` — UPDATE — custom predicate
- `clients_view_client_blocks` — SELECT — custom predicate
- `coaches_manage_client_blocks` — ALL — custom predicate

### `client_workout_block_exercises`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_block_id` | `uuid` | NO | `null` | `client_workout_blocks.id` |
| `client_id` | `uuid` | NO | `null` | `clients.id` |
| `workout_assignment_id` | `uuid` | NO | `null` | `workout_assignments.id` |
| `original_block_exercise_id` | `uuid` | YES | `null` | — |
| `exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `exercise_order` | `integer` | YES | `null` | — |
| `exercise_letter` | `text` | YES | `null` | — |
| `sets` | `integer` | YES | `null` | — |
| `reps` | `text` | YES | `null` | — |
| `rest_seconds` | `integer` | YES | `null` | — |
| `tempo` | `text` | YES | `null` | — |
| `rir` | `integer` | YES | `null` | — |
| `weight_kg` | `numeric` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `drop_sets` | `jsonb` | YES | `null` | — |
| `cluster_sets` | `jsonb` | YES | `null` | — |
| `pyramid_sets` | `jsonb` | YES | `null` | — |
| `ladder_sets` | `jsonb` | YES | `null` | — |
| `rest_pause_sets` | `jsonb` | YES | `null` | — |
| `amrap_config` | `jsonb` | YES | `null` | — |
| `emom_config` | `jsonb` | YES | `null` | — |
| `tabata_config` | `jsonb` | YES | `null` | — |
| `circuit_config` | `jsonb` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | NO | `now()` | — |
| `updated_at` | `timestamp with time zone` | NO | `now()` | — |
| `load_percentage` | `numeric` | YES | `null` | — |

**RLS Policies**

- `Coaches delete client workout exercises` — DELETE — custom predicate
- `Coaches insert client workout exercises` — INSERT — custom predicate
- `Coaches select client workout exercises` — SELECT — custom predicate
- `client_workout_block_exercises_update` — UPDATE — custom predicate
- `clients_view_block_exercises` — SELECT — custom predicate
- `coaches_manage_block_exercises` — ALL — custom predicate

## Programs

### `workout_programs`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `name` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `coach_id` | `uuid` | NO | `null` | `profiles.id` |
| `difficulty_level` | `text` | YES | `'intermediate'::text` | — |
| `duration_weeks` | `integer` | YES | `4` | — |
| `target_audience` | `text` | YES | `'general_fitness'::text` | — |
| `is_active` | `boolean` | YES | `true` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |
| `category` | `text` | YES | `null` | — |

**RLS Policies**

- `Clients can view assigned workout programs` — SELECT — custom predicate
- `Coaches can manage workout programs` — ALL — coach owns

### `program_schedule`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `program_id` | `uuid` | NO | `null` | — |
| `template_id` | `uuid` | NO | `null` | — |
| `day_of_week` | `integer` | NO | `null` | — |
| `week_number` | `integer` | NO | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can view schedule for assigned programs` — SELECT — custom predicate
- `Coaches can delete schedules for their programs` — DELETE — custom predicate
- `Coaches can insert schedules for their programs` — INSERT — custom predicate
- `Coaches can update schedules for their programs` — UPDATE — custom predicate
- `Coaches can view schedules for their programs` — SELECT — custom predicate

### `program_days`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `program_id` | `uuid` | NO | `null` | `workout_programs.id` |
| `day_number` | `integer` | NO | `null` | — |
| `day_type` | `text` | NO | `null` | — |
| `workout_template_id` | `uuid` | YES | `null` | `workout_templates.id` |
| `name` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `estimated_duration` | `integer` | YES | `null` | — |
| `target_muscles` | `ARRAY` | YES | `null` | — |
| `intensity_level` | `text` | YES | `null` | — |
| `rest_focus` | `text` | YES | `null` | — |
| `recommended_activities` | `ARRAY` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `program_days_delete` — DELETE — custom predicate
- `program_days_insert` — INSERT — custom predicate
- `program_days_select` — SELECT — custom predicate
- `program_days_update` — UPDATE — custom predicate

### `program_day_assignments`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `program_assignment_id` | `uuid` | NO | `null` | `program_assignments.id` |
| `program_day_id` | `uuid` | YES | `null` | `program_days.id` |
| `day_number` | `integer` | NO | `null` | — |
| `day_type` | `text` | NO | `null` | — |
| `workout_assignment_id` | `uuid` | YES | `null` | `workout_assignments.id` |
| `name` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `estimated_duration` | `integer` | YES | `null` | — |
| `target_muscles` | `ARRAY` | YES | `null` | — |
| `intensity_level` | `text` | YES | `null` | — |
| `rest_focus` | `text` | YES | `null` | — |
| `recommended_activities` | `ARRAY` | YES | `null` | — |
| `is_completed` | `boolean` | YES | `false` | — |
| `completed_date` | `date` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `is_customized` | `boolean` | YES | `false` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |
| `program_day` | `integer` | YES | `null` | — |
| `workout_template_id` | `uuid` | YES | `null` | — |

**RLS Policies**

- `Clients view own program day assignments` — SELECT — custom predicate
- `Coaches manage program day assignments` — ALL — custom predicate

### `program_day_completions`

_Table not found in provided export._

### `program_assignments`

Assigns workout programs to clients and tracks assignment lifecycle.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `program_id` | `uuid` | NO | `null` | `workout_programs.id` |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `coach_id` | `uuid` | NO | `null` | `profiles.id` |
| `current_day_number` | `integer` | YES | `1` | — |
| `completed_days` | `integer` | YES | `0` | — |
| `total_days` | `integer` | NO | `null` | — |
| `start_date` | `date` | NO | `CURRENT_DATE` | — |
| `preferred_workout_days` | `ARRAY` | YES | `null` | — |
| `status` | `text` | YES | `'active'::text` | — |
| `is_customized` | `boolean` | YES | `false` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |
| `name` | `text` | YES | `null` | — |
| `description` | `text` | YES | `null` | — |
| `duration_weeks` | `integer` | YES | `null` | — |

**RLS Policies**

- `Clients can view their program assignments` — SELECT — client owns
- `Coaches can manage program assignments` — ALL — coach owns

### `program_assignment_progress`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `assignment_id` | `uuid` | NO | `null` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `program_id` | `uuid` | NO | `null` | — |
| `current_week` | `integer` | NO | `1` | — |
| `current_day` | `integer` | NO | `1` | — |
| `days_completed_this_week` | `integer` | YES | `0` | — |
| `cycle_start_date` | `date` | NO | `CURRENT_DATE` | — |
| `last_workout_date` | `date` | YES | `null` | — |
| `total_weeks_completed` | `integer` | YES | `0` | — |
| `is_program_completed` | `boolean` | YES | `false` | — |
| `completed_at` | `timestamp with time zone` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `program_assignment_progress_delete` — DELETE — client owns
- `program_assignment_progress_insert` — INSERT — client owns
- `program_assignment_progress_select` — SELECT — client owns
- `program_assignment_progress_update` — UPDATE — client owns

### `program_progress`

_Table not found in provided export._

### `program_workout_completions`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `assignment_progress_id` | `uuid` | NO | `null` | `program_assignment_progress.id` |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `program_id` | `uuid` | NO | `null` | — |
| `week_number` | `integer` | NO | `null` | — |
| `program_day` | `integer` | NO | `null` | — |
| `template_id` | `uuid` | NO | `null` | — |
| `workout_date` | `date` | NO | `CURRENT_DATE` | — |
| `completed_at` | `timestamp with time zone` | YES | `now()` | — |
| `duration_minutes` | `integer` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `program_workout_completions_delete` — DELETE — client owns
- `program_workout_completions_insert` — INSERT — client owns
- `program_workout_completions_select` — SELECT — client owns
- `program_workout_completions_update` — UPDATE — client owns

### `program_progression_rules`

Stores progression prescriptions used by program and client workout flows.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `program_id` | `uuid` | NO | `null` | — |
| `week_number` | `integer` | NO | `null` | — |
| `sets` | `integer` | YES | `null` | — |
| `reps` | `text` | YES | `null` | — |
| `weight_guidance` | `text` | YES | `null` | — |
| `rest_time` | `integer` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |
| `field` | `text` | YES | `null` | — |
| `change_type` | `text` | YES | `null` | — |
| `amount` | `text` | YES | `null` | — |
| `program_schedule_id` | `uuid` | YES | `null` | `program_schedule.id` |
| `block_id` | `uuid` | YES | `null` | — |
| `block_type` | `text` | NO | `null` | — |
| `exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `exercise_order` | `integer` | YES | `null` | — |
| `exercise_letter` | `character varying` | YES | `null` | — |
| `rest_seconds` | `integer` | YES | `null` | — |
| `tempo` | `character varying` | YES | `null` | — |
| `rir` | `integer` | YES | `null` | — |
| `second_exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `compound_exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `first_exercise_reps` | `character varying` | YES | `null` | — |
| `second_exercise_reps` | `character varying` | YES | `null` | — |
| `isolation_reps` | `character varying` | YES | `null` | — |
| `compound_reps` | `character varying` | YES | `null` | — |
| `rest_between_pairs` | `integer` | YES | `null` | — |
| `exercise_reps` | `character varying` | YES | `null` | — |
| `drop_set_reps` | `character varying` | YES | `null` | — |
| `weight_reduction_percentage` | `integer` | YES | `null` | — |
| `reps_per_cluster` | `integer` | YES | `null` | — |
| `clusters_per_set` | `integer` | YES | `null` | — |
| `intra_cluster_rest` | `integer` | YES | `null` | — |
| `rest_pause_duration` | `integer` | YES | `null` | — |
| `max_rest_pauses` | `integer` | YES | `null` | — |
| `rounds` | `integer` | YES | `null` | — |
| `work_seconds` | `integer` | YES | `null` | — |
| `rest_after_exercise` | `integer` | YES | `null` | — |
| `rest_after_set` | `integer` | YES | `null` | — |
| `duration_minutes` | `integer` | YES | `null` | — |
| `emom_mode` | `character varying` | YES | `null` | — |
| `target_reps` | `integer` | YES | `null` | — |
| `time_cap_minutes` | `integer` | YES | `null` | — |
| `block_order` | `integer` | NO | `null` | — |
| `block_name` | `text` | YES | `null` | — |
| `weight_kg` | `numeric` | YES | `null` | — |
| `pyramid_order` | `integer` | YES | `null` | — |
| `ladder_order` | `integer` | YES | `null` | — |
| `load_percentage` | `numeric` | YES | `null` | — |

**RLS Policies**

- `Coaches can delete progression rules for their programs` — DELETE — custom predicate
- `Coaches can insert progression rules for their programs` — INSERT — custom predicate
- `Coaches can update progression rules for their programs` — UPDATE — custom predicate
- `Coaches can view progression rules for their programs` — SELECT — custom predicate

### `client_program_progression_rules`

Stores progression prescriptions used by program and client workout flows.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `program_assignment_id` | `uuid` | NO | `null` | `program_assignments.id` |
| `week_number` | `integer` | NO | `null` | — |
| `block_id` | `uuid` | YES | `null` | — |
| `block_type` | `text` | YES | `null` | — |
| `exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `exercise_order` | `integer` | YES | `null` | — |
| `exercise_letter` | `character varying` | YES | `null` | — |
| `sets` | `integer` | YES | `null` | — |
| `reps` | `character varying` | YES | `null` | — |
| `rest_seconds` | `integer` | YES | `null` | — |
| `tempo` | `character varying` | YES | `null` | — |
| `rir` | `integer` | YES | `null` | — |
| `second_exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `compound_exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `first_exercise_reps` | `character varying` | YES | `null` | — |
| `second_exercise_reps` | `character varying` | YES | `null` | — |
| `isolation_reps` | `character varying` | YES | `null` | — |
| `compound_reps` | `character varying` | YES | `null` | — |
| `rest_between_pairs` | `integer` | YES | `null` | — |
| `exercise_reps` | `character varying` | YES | `null` | — |
| `drop_set_reps` | `character varying` | YES | `null` | — |
| `weight_reduction_percentage` | `integer` | YES | `null` | — |
| `reps_per_cluster` | `integer` | YES | `null` | — |
| `clusters_per_set` | `integer` | YES | `null` | — |
| `intra_cluster_rest` | `integer` | YES | `null` | — |
| `rest_pause_duration` | `integer` | YES | `null` | — |
| `max_rest_pauses` | `integer` | YES | `null` | — |
| `rounds` | `integer` | YES | `null` | — |
| `work_seconds` | `integer` | YES | `null` | — |
| `rest_after_exercise` | `integer` | YES | `null` | — |
| `rest_after_set` | `integer` | YES | `null` | — |
| `duration_minutes` | `integer` | YES | `null` | — |
| `emom_mode` | `character varying` | YES | `null` | — |
| `target_reps` | `integer` | YES | `null` | — |
| `time_cap_minutes` | `integer` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |
| `block_order` | `integer` | YES | `null` | — |
| `weight_kg` | `numeric` | YES | `null` | — |
| `pyramid_order` | `integer` | YES | `null` | — |
| `ladder_order` | `integer` | YES | `null` | — |
| `load_percentage` | `numeric` | YES | `null` | — |
| `block_name` | `text` | YES | `null` | — |

**RLS Policies**

- `Clients can view their own progression rules` — SELECT — client owns
- `Coaches delete client program rules` — DELETE — custom predicate
- `Coaches insert client program rules` — INSERT — custom predicate
- `Coaches select client program rules` — SELECT — custom predicate
- `client_program_progression_rules_update` — UPDATE — custom predicate

### `training_blocks`

_Table not found in provided export._

### `program_week_time_override`

_Table not found in provided export._

### `daily_workout_cache`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | — |
| `program_id` | `uuid` | NO | `null` | — |
| `workout_date` | `date` | NO | `null` | — |
| `workout_data` | `jsonb` | NO | `null` | — |
| `expires_at` | `timestamp with time zone` | YES | `(now() + '7 days'::interval)` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can manage their workout cache` — ALL — client owns

## Exercises

### `exercises`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `name` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `category` | `text` | NO | `null` | — |
| `image_url` | `text` | YES | `null` | — |
| `is_active` | `boolean` | YES | `true` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |
| `video_url` | `text` | YES | `null` | — |
| `equipment_types` | `jsonb` | YES | `'[]'::jsonb` | — |
| `instructions` | `jsonb` | YES | `'[]'::jsonb` | — |
| `tips` | `jsonb` | YES | `'[]'::jsonb` | — |
| `primary_muscle_group_id` | `uuid` | YES | `null` | `muscle_groups.id` |
| `secondary_muscle_group_1_id` | `uuid` | YES | `null` | `muscle_groups.id` |
| `secondary_muscle_group_2_id` | `uuid` | YES | `null` | `muscle_groups.id` |

**RLS Policies**

- `Coaches can manage their exercises` — ALL — coach owns
- `exercises_delete_coach` — DELETE — coach owns
- `exercises_insert_coach` — INSERT — coach owns
- `exercises_select_public` — SELECT — custom predicate
- `exercises_update_coach` — UPDATE — coach owns

### `exercise_categories`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `name` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `icon` | `text` | YES | `null` | — |
| `color` | `text` | YES | `'#3B82F6'::text` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Anyone can read exercise categories` — SELECT — custom predicate
- `Coaches can delete exercise categories` — DELETE — custom predicate
- `Coaches can insert exercise categories` — INSERT — custom predicate
- `Coaches can update exercise categories` — UPDATE — custom predicate

### `exercise_alternatives`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `primary_exercise_id` | `uuid` | NO | `null` | `exercises.id` |
| `alternative_exercise_id` | `uuid` | NO | `null` | `exercises.id` |
| `reason` | `text` | NO | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Anyone can read exercise alternatives` — SELECT — custom predicate
- `Coaches can delete exercise alternatives for their exercises` — DELETE — custom predicate
- `Coaches can insert exercise alternatives for their exercises` — INSERT — custom predicate
- `Coaches can update exercise alternatives for their exercises` — UPDATE — custom predicate

### `exercise_equipment`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `exercise_id` | `uuid` | NO | `null` | `exercises.id` |
| `equipment_type` | `text` | NO | `null` | — |
| `is_required` | `boolean` | YES | `true` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Anyone can read exercise equipment` — SELECT — broad allow guard
- `Coaches can manage their exercise equipment` — ALL — custom predicate

### `exercise_instructions`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `exercise_id` | `uuid` | NO | `null` | `exercises.id` |
| `instruction_order` | `integer` | NO | `null` | — |
| `instruction_text` | `text` | NO | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Anyone can read exercise instructions` — SELECT — broad allow guard
- `Coaches can manage their exercise instructions` — ALL — custom predicate

### `exercise_muscle_groups`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `exercise_id` | `uuid` | NO | `null` | `exercises.id` |
| `muscle_group` | `text` | NO | `null` | — |
| `is_primary` | `boolean` | YES | `false` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Anyone can read exercise muscle groups` — SELECT — broad allow guard
- `Coaches can manage their exercise muscle groups` — ALL — custom predicate

### `exercise_tips`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `exercise_id` | `uuid` | NO | `null` | `exercises.id` |
| `tip_order` | `integer` | NO | `null` | — |
| `tip_text` | `text` | NO | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Anyone can read exercise tips` — SELECT — broad allow guard
- `Coaches can manage their exercise tips` — ALL — custom predicate

### `muscle_groups`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `name` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- None in export.

## Nutrition

### `meal_plans`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `name` | `text` | NO | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `target_calories` | `integer` | YES | `null` | — |
| `target_protein` | `numeric` | YES | `null` | — |
| `target_carbs` | `numeric` | YES | `null` | — |
| `target_fat` | `numeric` | YES | `null` | — |
| `is_active` | `boolean` | YES | `true` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can read assigned meal plans` — SELECT — custom predicate
- `Clients can view assigned meal plans` — SELECT — custom predicate
- `Coaches can manage their meal plans` — ALL — coach owns

### `meal_plan_items`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `meal_plan_id` | `uuid` | NO | `null` | `meal_plans.id` |
| `food_id` | `uuid` | NO | `null` | `foods.id` |
| `meal_type` | `text` | NO | `null` | — |
| `day_of_week` | `integer` | YES | `null` | — |
| `quantity` | `numeric` | NO | `1` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `coach_id` | `uuid` | NO | `null` | `profiles.id` |

**RLS Policies**

- `Clients can read assigned meal plan items` — SELECT — custom predicate
- `Coaches can manage meal plan items` — ALL — coach owns

### `meal_plan_assignments`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `client_id` | `uuid` | NO | `null` | — |
| `meal_plan_id` | `uuid` | NO | `null` | `meal_plans.id` |
| `start_date` | `date` | NO | `null` | — |
| `end_date` | `date` | YES | `null` | — |
| `is_active` | `boolean` | YES | `true` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can read their own assignments` — SELECT — client owns
- `Clients can view their own assignments` — SELECT — client owns
- `Clients can view their own meal plan assignments` — SELECT — client owns
- `Coaches can manage assignments for their clients` — ALL — coach owns
- `Coaches can manage their meal plan assignments` — ALL — coach owns
- `Coaches can manage their own assignments` — ALL — coach owns
- `meal_plan_assignments_delete` — DELETE — coach owns
- `meal_plan_assignments_insert` — INSERT — coach owns
- `meal_plan_assignments_select` — SELECT — client owns
- `meal_plan_assignments_update` — UPDATE — coach owns

### `meals`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `meal_plan_id` | `uuid` | NO | `null` | `meal_plans.id` |
| `name` | `text` | NO | `null` | — |
| `meal_type` | `text` | NO | `null` | — |
| `order_index` | `integer` | YES | `0` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |
| `notes` | `text` | YES | `null` | — |

**RLS Policies**

- `Clients can read meals from assigned meal plans` — SELECT — custom predicate
- `Clients can view meals from assigned meal plans` — SELECT — client owns
- `Coaches can manage meals for their meal plans` — ALL — coach owns
- `Coaches can manage meals in their meal plans` — ALL — custom predicate
- `Coaches can read meals from their meal plans` — SELECT — custom predicate

### `meal_options`

_Table not found in provided export._

### `meal_food_items`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `meal_id` | `uuid` | NO | `null` | `meals.id` |
| `food_id` | `uuid` | NO | `null` | `foods.id` |
| `quantity` | `numeric` | NO | `null` | — |
| `unit` | `text` | NO | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can view food items from assigned meals` — SELECT — client owns
- `Coaches can manage food items for their meals` — ALL — coach owns
- `Coaches can manage meal food items` — ALL — custom predicate

### `meal_items`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `meal_id` | `uuid` | NO | `null` | `meals.id` |
| `food_name` | `character varying` | NO | `null` | — |
| `quantity` | `numeric` | NO | `null` | — |
| `unit` | `character varying` | NO | `null` | — |
| `calories_per_unit` | `numeric` | NO | `0` | — |
| `protein_per_unit` | `numeric` | NO | `0` | — |
| `carbs_per_unit` | `numeric` | NO | `0` | — |
| `fat_per_unit` | `numeric` | NO | `0` | — |
| `order_index` | `integer` | NO | `0` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can read assigned meal items` — SELECT — custom predicate
- `Coaches can manage meal items` — ALL — custom predicate

### `meal_completions`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `meal_id` | `uuid` | NO | `null` | `meals.id` |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `completed_at` | `timestamp with time zone` | NO | `now()` | — |
| `photo_url` | `text` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can insert their own meal completions` — INSERT — client owns
- `Clients can read their own meal completions` — SELECT — client owns
- `Coaches can read client meal completions` — SELECT — custom predicate

### `meal_photo_logs`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `meal_id` | `uuid` | NO | `null` | `meals.id` |
| `log_date` | `date` | NO | `null` | — |
| `photo_url` | `text` | NO | `null` | — |
| `photo_path` | `text` | NO | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `meal_photo_logs_update` — UPDATE — client owns
- `meal_photos_delete_coach` — DELETE — custom predicate
- `meal_photos_insert_own` — INSERT — client owns
- `meal_photos_select_coach` — SELECT — custom predicate

### `meal_template_slots`

_Table not found in provided export._

### `meal_templates`

_Table not found in provided export._

### `foods`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `name` | `text` | NO | `null` | — |
| `brand` | `text` | YES | `null` | — |
| `serving_size` | `numeric` | NO | `null` | — |
| `serving_unit` | `text` | NO | `'g'::text` | — |
| `calories_per_serving` | `numeric` | NO | `null` | — |
| `protein` | `numeric` | YES | `0` | — |
| `carbs` | `numeric` | YES | `0` | — |
| `fat` | `numeric` | YES | `0` | — |
| `fiber` | `numeric` | YES | `0` | — |
| `category` | `text` | YES | `'General'::text` | — |
| `is_active` | `boolean` | YES | `true` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |
| `sugar` | `numeric` | YES | `0` | — |
| `sodium` | `numeric` | YES | `0` | — |

**RLS Policies**

- `foods_delete_coach_admin` — DELETE — custom predicate
- `foods_insert_coach_admin` — INSERT — custom predicate
- `foods_select_public` — SELECT — custom predicate
- `foods_update_coach_admin` — UPDATE — custom predicate

### `food_log_entries`

_Table not found in provided export._

### `food_slot_types`

_Table not found in provided export._

### `food_tags`

_Table not found in provided export._

### `nutrition_logs`

_Table not found in provided export._

### `client_meal_overrides`

_Table not found in provided export._

### `client_daily_plan_selection`

_Table not found in provided export._

### `restriction_presets`

_Table not found in provided export._

### `water_logs`

_Table not found in provided export._

### `supplement_logs`

_Table not found in provided export._

## Wellness & Body

### `daily_wellness_logs`

_Table not found in provided export._

### `sleep_logs`

_Table not found in provided export._

### `step_logs`

_Table not found in provided export._

### `body_metrics`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `coach_id` | `uuid` | YES | `null` | `profiles.id` |
| `weight_kg` | `numeric` | YES | `null` | — |
| `body_fat_percentage` | `numeric` | YES | `null` | — |
| `muscle_mass_kg` | `numeric` | YES | `null` | — |
| `visceral_fat_level` | `integer` | YES | `null` | — |
| `left_arm_circumference` | `numeric` | YES | `null` | — |
| `right_arm_circumference` | `numeric` | YES | `null` | — |
| `torso_circumference` | `numeric` | YES | `null` | — |
| `waist_circumference` | `numeric` | YES | `null` | — |
| `hips_circumference` | `numeric` | YES | `null` | — |
| `left_thigh_circumference` | `numeric` | YES | `null` | — |
| `right_thigh_circumference` | `numeric` | YES | `null` | — |
| `left_calf_circumference` | `numeric` | YES | `null` | — |
| `right_calf_circumference` | `numeric` | YES | `null` | — |
| `measured_date` | `date` | NO | `CURRENT_DATE` | — |
| `measurement_method` | `text` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can view their own body metrics` — SELECT — client owns
- `Coaches can view their clients' body metrics` — ALL — custom predicate

### `progress_photos`

_Table not found in provided export._

### `fms_assessments`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `coach_id` | `uuid` | YES | `null` | `profiles.id` |
| `total_score` | `integer` | YES | `null` | — |
| `deep_squat` | `integer` | YES | `null` | — |
| `hurdle_step_left` | `integer` | YES | `null` | — |
| `hurdle_step_right` | `integer` | YES | `null` | — |
| `inline_lunge_left` | `integer` | YES | `null` | — |
| `inline_lunge_right` | `integer` | YES | `null` | — |
| `shoulder_mobility_left` | `integer` | YES | `null` | — |
| `shoulder_mobility_right` | `integer` | YES | `null` | — |
| `active_straight_leg_raise_left` | `integer` | YES | `null` | — |
| `active_straight_leg_raise_right` | `integer` | YES | `null` | — |
| `trunk_stability_pushup` | `integer` | YES | `null` | — |
| `rotary_stability_left` | `integer` | YES | `null` | — |
| `rotary_stability_right` | `integer` | YES | `null` | — |
| `assessed_date` | `date` | NO | `CURRENT_DATE` | — |
| `assessor_certified` | `boolean` | YES | `false` | — |
| `notes` | `text` | YES | `null` | — |
| `pain_points` | `ARRAY` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `fms_assessments_delete` — DELETE — client owns; coach owns
- `fms_assessments_insert` — INSERT — client owns; coach owns
- `fms_assessments_select` — SELECT — client owns; coach owns
- `fms_assessments_update` — UPDATE — client owns; coach owns

### `mobility_metrics`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `coach_id` | `uuid` | YES | `null` | `profiles.id` |
| `left_shoulder_ir` | `numeric` | YES | `null` | — |
| `left_shoulder_er` | `numeric` | YES | `null` | — |
| `left_shoulder_abduction` | `numeric` | YES | `null` | — |
| `right_shoulder_ir` | `numeric` | YES | `null` | — |
| `right_shoulder_er` | `numeric` | YES | `null` | — |
| `right_shoulder_abduction` | `numeric` | YES | `null` | — |
| `left_hip_ir` | `numeric` | YES | `null` | — |
| `left_hip_er` | `numeric` | YES | `null` | — |
| `right_hip_ir` | `numeric` | YES | `null` | — |
| `right_hip_er` | `numeric` | YES | `null` | — |
| `left_foot_dorsiflexion` | `numeric` | YES | `null` | — |
| `right_foot_dorsiflexion` | `numeric` | YES | `null` | — |
| `assessed_date` | `date` | NO | `CURRENT_DATE` | — |
| `assessment_type` | `text` | YES | `'manual'::text` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |
| `left_shoulder_flexion` | `numeric` | YES | `null` | — |
| `right_shoulder_flexion` | `numeric` | YES | `null` | — |
| `left_hip_straight_leg_raise` | `numeric` | YES | `null` | — |
| `left_hip_knee_to_chest` | `numeric` | YES | `null` | — |
| `right_hip_straight_leg_raise` | `numeric` | YES | `null` | — |
| `right_hip_knee_to_chest` | `numeric` | YES | `null` | — |
| `left_ankle_plantar_flexion` | `numeric` | YES | `null` | — |
| `right_ankle_plantar_flexion` | `numeric` | YES | `null` | — |
| `forward_lean` | `numeric` | YES | `null` | — |
| `toe_touch` | `numeric` | YES | `null` | — |
| `squat_depth` | `numeric` | YES | `null` | — |
| `photos` | `ARRAY` | YES | `null` | — |

**RLS Policies**

- `mobility_metrics_delete` — DELETE — client owns; coach owns
- `mobility_metrics_insert` — INSERT — client owns; coach owns
- `mobility_metrics_select` — SELECT — client owns; coach owns
- `mobility_metrics_update` — UPDATE — client owns; coach owns

### `performance_tests`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `tested_at` | `date` | NO | `null` | — |
| `test_type` | `text` | NO | `null` | — |
| `time_seconds` | `integer` | YES | `null` | — |
| `heart_rate_pre` | `integer` | YES | `null` | — |
| `heart_rate_1min` | `integer` | YES | `null` | — |
| `heart_rate_2min` | `integer` | YES | `null` | — |
| `heart_rate_3min` | `integer` | YES | `null` | — |
| `recovery_score` | `numeric` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `conditions` | `text` | YES | `null` | — |
| `perceived_effort` | `integer` | YES | `null` | — |
| `tested_by` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `performance_tests_delete_own` — DELETE — client owns
- `performance_tests_insert_own` — INSERT — client owns
- `performance_tests_select_coach` — SELECT — custom predicate
- `performance_tests_select_own` — SELECT — client owns
- `performance_tests_update` — UPDATE — client owns

### `check_in_configs`

_Table not found in provided export._

## Goals & Habits

### `goals`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `coach_id` | `uuid` | YES | `null` | `profiles.id` |
| `title` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `category` | `text` | NO | `null` | — |
| `target_value` | `numeric` | YES | `null` | — |
| `target_date` | `date` | YES | `null` | — |
| `current_value` | `numeric` | YES | `null` | — |
| `status` | `text` | YES | `'active'::text` | — |
| `priority` | `text` | YES | `'medium'::text` | — |
| `start_date` | `date` | NO | `CURRENT_DATE` | — |
| `completed_date` | `date` | YES | `null` | — |
| `progress_percentage` | `numeric` | YES | `0.00` | — |
| `is_public` | `boolean` | YES | `false` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |
| `target_unit` | `text` | YES | `null` | — |

**RLS Policies**

- `Coaches can view client goals` — SELECT — coach owns
- `Users can delete their own goals` — DELETE — client owns
- `Users can insert their own goals` — INSERT — client owns
- `Users can view their own goals` — SELECT — client owns
- `goals_update_own` — UPDATE — client owns

### `goal_source_links`

_Table not found in provided export._

### `goal_templates`

_Table not found in provided export._

### `habits`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `name` | `character varying` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `frequency_type` | `character varying` | NO | `null` | — |
| `target_days` | `integer` | YES | `1` | — |
| `is_active` | `boolean` | YES | `true` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Coaches can manage their own habits` — ALL — coach owns
- `habits_delete` — DELETE — coach owns
- `habits_insert` — INSERT — coach owns
- `habits_select` — SELECT — coach owns
- `habits_update` — UPDATE — coach owns

### `habit_logs`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `assignment_id` | `uuid` | NO | `null` | `habit_assignments.id` |
| `client_id` | `uuid` | NO | `null` | — |
| `log_date` | `date` | NO | `CURRENT_DATE` | — |
| `completed_at` | `timestamp with time zone` | YES | `now()` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can manage their own habit logs` — ALL — client owns
- `habit_logs_delete` — DELETE — client owns
- `habit_logs_insert` — INSERT — client owns
- `habit_logs_select` — SELECT — client owns
- `habit_logs_update` — UPDATE — client owns

### `habit_templates`

_Table not found in provided export._

### `habit_categories`

_Table not found in provided export._

## Reference / Static Data

### `rp_volume_landmarks`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `muscle_group_name` | `text` | NO | `null` | — |
| `muscle_group_id` | `uuid` | YES | `null` | `muscle_groups.id` |
| `mv` | `integer` | NO | `0` | — |
| `mev` | `integer` | NO | `0` | — |
| `mev_high` | `integer` | NO | `0` | — |
| `mav_low` | `integer` | NO | `0` | — |
| `mav_high` | `integer` | NO | `0` | — |
| `mrv` | `integer` | NO | `0` | — |
| `frequency` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- None in export.

### `volume_guidelines`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `category` | `text` | NO | `null` | — |
| `difficulty` | `text` | NO | `null` | — |
| `sets_per_muscle_week_min` | `integer` | NO | `null` | — |
| `sets_per_muscle_week_optimal` | `integer` | NO | `null` | — |
| `sets_per_muscle_week_max` | `integer` | NO | `null` | — |
| `reps_per_set_min` | `integer` | NO | `null` | — |
| `reps_per_set_max` | `integer` | NO | `null` | — |
| `rir_min` | `integer` | NO | `0` | — |
| `rir_max` | `integer` | NO | `0` | — |
| `load_percent_min` | `integer` | NO | `0` | — |
| `load_percent_max` | `integer` | NO | `0` | — |
| `rest_period_sec` | `integer` | NO | `60` | — |
| `sessions_per_week` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- None in export.

### `progression_guidelines`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `category` | `text` | NO | `null` | — |
| `difficulty` | `text` | NO | `null` | — |
| `volume_increase_week_min` | `integer` | NO | `0` | — |
| `volume_increase_week_max` | `integer` | NO | `0` | — |
| `intensity_increase_week` | `integer` | NO | `0` | — |
| `deload_frequency_weeks` | `integer` | NO | `4` | — |
| `deload_volume_reduction` | `integer` | NO | `40` | — |
| `progress_when` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- None in export.

### `tracking_sources`

_Table not found in provided export._

## Engagement (Achievements / Leaderboard / Challenges)

### `achievements`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `title` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `achievement_type` | `text` | NO | `null` | — |
| `metric_type` | `text` | YES | `null` | — |
| `metric_value` | `numeric` | YES | `null` | — |
| `metric_unit` | `text` | YES | `null` | — |
| `achieved_date` | `date` | NO | `CURRENT_DATE` | — |
| `is_public` | `boolean` | YES | `true` | — |
| `goal_id` | `uuid` | YES | `null` | `goals.id` |
| `workout_id` | `uuid` | YES | `null` | `workout_assignments.id` |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `achievements_delete` — DELETE — client owns
- `achievements_insert` — INSERT — client owns
- `achievements_select` — SELECT — client owns
- `achievements_update` — UPDATE — client owns

### `achievement_templates`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `name` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `icon` | `text` | YES | `null` | — |
| `category` | `text` | NO | `null` | — |
| `achievement_type` | `text` | NO | `null` | — |
| `is_tiered` | `boolean` | NO | `false` | — |
| `tier_bronze_threshold` | `numeric` | YES | `null` | — |
| `tier_bronze_label` | `text` | YES | `null` | — |
| `tier_silver_threshold` | `numeric` | YES | `null` | — |
| `tier_silver_label` | `text` | YES | `null` | — |
| `tier_gold_threshold` | `numeric` | YES | `null` | — |
| `tier_gold_label` | `text` | YES | `null` | — |
| `tier_platinum_threshold` | `numeric` | YES | `null` | — |
| `tier_platinum_label` | `text` | YES | `null` | — |
| `single_threshold` | `numeric` | YES | `null` | — |
| `is_active` | `boolean` | NO | `true` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Achievement templates are viewable by everyone` — SELECT — broad allow guard
- `achievement_templates_insert_coach_admin` — INSERT — custom predicate
- `achievement_templates_update_coach_admin` — UPDATE — custom predicate

### `user_achievements`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `user_id` | `uuid` | NO | `null` | — |
| `achievement_id` | `uuid` | NO | `null` | — |
| `earned_at` | `timestamp with time zone` | YES | `now()` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `achievement_template_id` | `uuid` | NO | `null` | `achievement_templates.id` |
| `tier` | `text` | YES | `null` | — |
| `metric_value` | `numeric` | NO | `null` | — |
| `achieved_date` | `date` | NO | `CURRENT_DATE` | — |
| `is_public` | `boolean` | NO | `true` | — |

**RLS Policies**

- `Users can insert their own achievements` — INSERT — client owns
- `Users can view their own achievements` — SELECT — client owns
- `user_achievements_insert_own` — INSERT — client owns

### `athlete_scores`

_Table not found in provided export._

### `leaderboard_entries`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `leaderboard_type` | `text` | NO | `null` | — |
| `exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `rank` | `integer` | NO | `null` | — |
| `score` | `numeric` | NO | `null` | — |
| `time_window` | `text` | YES | `null` | — |
| `display_name` | `text` | YES | `null` | — |
| `is_anonymous` | `boolean` | YES | `false` | — |
| `last_updated` | `timestamp with time zone` | YES | `now()` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `leaderboard_entries_manage_coach` — ALL — custom predicate
- `leaderboard_entries_select_all` — SELECT — broad allow guard

### `leaderboard_rankings`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `category` | `character varying` | NO | `null` | — |
| `sex_filter` | `character varying` | YES | `null` | — |
| `time_filter` | `character varying` | NO | `'all_time'::character varying` | — |
| `score` | `numeric` | NO | `null` | — |
| `rank` | `integer` | NO | `null` | — |
| `title` | `character varying` | YES | `null` | — |
| `calculated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Anyone can view leaderboard rankings` — SELECT — broad allow guard
- `System can manage rankings` — ALL — custom predicate

### `leaderboard_titles`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `category` | `character varying` | NO | `null` | — |
| `sex_filter` | `character varying` | YES | `null` | — |
| `rank` | `integer` | NO | `null` | — |
| `title` | `character varying` | NO | `null` | — |
| `earned_at` | `timestamp with time zone` | YES | `now()` | — |
| `lost_at` | `timestamp with time zone` | YES | `null` | — |
| `duration_days` | `integer` | YES | `null` | — |

**RLS Policies**

- `Anyone can view leaderboard titles` — SELECT — broad allow guard

### `challenges`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `created_by` | `uuid` | NO | `null` | `profiles.id` |
| `challenge_type` | `text` | NO | `null` | — |
| `name` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `start_date` | `date` | NO | `null` | — |
| `end_date` | `date` | NO | `null` | — |
| `program_id` | `uuid` | YES | `null` | `workout_programs.id` |
| `recomp_track` | `text` | YES | `null` | — |
| `reward_description` | `text` | YES | `null` | — |
| `reward_value` | `text` | YES | `null` | — |
| `requires_video_proof` | `boolean` | YES | `false` | — |
| `max_participants` | `integer` | YES | `null` | — |
| `is_public` | `boolean` | YES | `true` | — |
| `status` | `text` | NO | `'draft'::text` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `challenges_manage_coach` — ALL — custom predicate
- `challenges_select_public` — SELECT — broad allow guard

### `challenge_participants`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `challenge_id` | `uuid` | NO | `null` | `challenges.id` |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `selected_track` | `text` | YES | `null` | — |
| `status` | `text` | NO | `'registered'::text` | — |
| `joined_at` | `timestamp with time zone` | YES | `now()` | — |
| `total_score` | `numeric` | YES | `0` | — |
| `final_rank` | `integer` | YES | `null` | — |
| `is_winner` | `boolean` | YES | `false` | — |
| `award_notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `participants_insert_own` — INSERT — client owns
- `participants_select_coach` — SELECT — custom predicate
- `participants_select_own` — SELECT — client owns

### `challenge_scoring_categories`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `challenge_id` | `uuid` | NO | `null` | `challenges.id` |
| `category_name` | `text` | NO | `null` | — |
| `exercise_id` | `uuid` | YES | `null` | `exercises.id` |
| `scoring_method` | `text` | NO | `null` | — |
| `weight_percentage` | `numeric` | YES | `100.00` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `scoring_categories_select_all` — SELECT — broad allow guard

### `challenge_video_submissions`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `participant_id` | `uuid` | NO | `null` | `challenge_participants.id` |
| `scoring_category_id` | `uuid` | NO | `null` | `challenge_scoring_categories.id` |
| `video_url` | `text` | NO | `null` | — |
| `video_path` | `text` | NO | `null` | — |
| `submitted_at` | `timestamp with time zone` | YES | `now()` | — |
| `status` | `text` | NO | `'pending'::text` | — |
| `reviewed_by` | `uuid` | YES | `null` | `profiles.id` |
| `reviewed_at` | `timestamp with time zone` | YES | `null` | — |
| `review_notes` | `text` | YES | `null` | — |
| `claimed_weight` | `numeric` | YES | `null` | — |
| `claimed_reps` | `integer` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `video_submissions_insert_own` — INSERT — custom predicate
- `video_submissions_manage_coach` — ALL — custom predicate
- `video_submissions_select_own` — SELECT — custom predicate

### `client_activities`

_Table not found in provided export._

## Sessions & Booking

### `sessions`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `client_id` | `uuid` | NO | `null` | — |
| `title` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `scheduled_at` | `timestamp with time zone` | NO | `null` | — |
| `duration_minutes` | `integer` | YES | `60` | — |
| `status` | `text` | NO | `'scheduled'::text` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can view their sessions` — SELECT — client owns
- `Coaches can manage their sessions` — ALL — coach owns

### `booked_sessions`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `time_slot_id` | `uuid` | NO | `null` | `coach_time_slots.id` |
| `coach_id` | `uuid` | NO | `null` | `profiles.id` |
| `client_id` | `uuid` | NO | `null` | `profiles.id` |
| `session_type` | `text` | NO | `'personal_training'::text` | — |
| `status` | `text` | NO | `'scheduled'::text` | — |
| `notes` | `text` | YES | `null` | — |
| `coach_notes` | `text` | YES | `null` | — |
| `client_feedback` | `text` | YES | `null` | — |
| `session_rating` | `integer` | YES | `null` | — |
| `actual_start_time` | `timestamp with time zone` | YES | `null` | — |
| `actual_end_time` | `timestamp with time zone` | YES | `null` | — |
| `cancelled_at` | `timestamp with time zone` | YES | `null` | — |
| `cancelled_by` | `uuid` | YES | `null` | `profiles.id` |
| `cancellation_reason` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can book sessions` — INSERT — client owns
- `Clients can cancel their own sessions` — UPDATE — client owns
- `Clients can view their own booked sessions` — SELECT — client owns; coach owns
- `Coaches can update session details` — UPDATE — coach owns
- `Coaches can view their sessions` — SELECT — coach owns

### `coach_availability`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `day_of_week` | `integer` | NO | `null` | — |
| `start_time` | `time without time zone` | NO | `null` | — |
| `end_time` | `time without time zone` | NO | `null` | — |
| `slot_capacity` | `integer` | YES | `4` | — |
| `is_active` | `boolean` | YES | `true` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can view coach availability` — SELECT — broad allow guard
- `Coaches can manage their own availability` — ALL — coach owns

### `coach_time_slots`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `coach_id` | `uuid` | NO | `null` | `profiles.id` |
| `date` | `date` | NO | `null` | — |
| `start_time` | `time without time zone` | NO | `null` | — |
| `end_time` | `time without time zone` | NO | `null` | — |
| `is_available` | `boolean` | YES | `true` | — |
| `recurring_pattern` | `text` | YES | `null` | — |
| `recurring_end_date` | `date` | YES | `null` | — |
| `notes` | `text` | YES | `null` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Anyone can view available time slots` — SELECT — broad allow guard
- `Coaches can manage their own time slots` — ALL — coach owns

### `clipcards`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `client_id` | `uuid` | NO | `null` | — |
| `clipcard_type_id` | `uuid` | NO | `null` | `clipcard_types.id` |
| `sessions_total` | `integer` | NO | `null` | — |
| `sessions_used` | `integer` | YES | `0` | — |
| `sessions_remaining` | `integer` | YES | `null` | — |
| `start_date` | `date` | NO | `null` | — |
| `end_date` | `date` | NO | `null` | — |
| `is_active` | `boolean` | YES | `true` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can view their own clipcards` — SELECT — client owns
- `Coaches can manage their clients' clipcards` — ALL — coach owns
- `Coaches can view their clipcards` — SELECT — coach owns
- `clipcards_delete` — DELETE — coach owns
- `clipcards_insert` — INSERT — coach owns
- `clipcards_select` — SELECT — client owns; coach owns
- `clipcards_update` — UPDATE — coach owns

### `clipcard_types`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `name` | `text` | NO | `null` | — |
| `sessions_count` | `integer` | NO | `null` | — |
| `validity_days` | `integer` | NO | `null` | — |
| `price` | `numeric` | NO | `null` | — |
| `is_active` | `boolean` | YES | `true` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Clients can view clipcard types` — SELECT — broad allow guard
- `Coaches can view their own clipcard types` — SELECT — coach owns
- `clipcard_types_delete` — DELETE — coach owns
- `clipcard_types_insert` — INSERT — coach owns
- `clipcard_types_update` — UPDATE — coach owns

### `clip_cards`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `bigint` | NO | `null` | — |
| `client_id` | `uuid` | NO | `null` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `total_sessions` | `integer` | NO | `null` | — |
| `used_sessions` | `integer` | NO | `0` | — |

**RLS Policies**

- `clip_cards_delete` — DELETE — coach owns
- `clip_cards_insert` — INSERT — coach owns
- `clip_cards_select` — SELECT — client owns
- `clip_cards_update` — UPDATE — coach owns

### `assigned_meal_plans`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `bigint` | NO | `null` | — |
| `client_id` | `uuid` | NO | `null` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `meal_plan_template_id` | `bigint` | NO | `null` | — |
| `assigned_date` | `date` | NO | `null` | — |

**RLS Policies**

- `assigned_meal_plans_delete` — DELETE — coach owns
- `assigned_meal_plans_insert` — INSERT — coach owns
- `assigned_meal_plans_select` — SELECT — client owns
- `assigned_meal_plans_update` — UPDATE — coach owns

### `assigned_workouts`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `bigint` | NO | `null` | — |
| `client_id` | `uuid` | NO | `null` | — |
| `coach_id` | `uuid` | NO | `null` | — |
| `workout_template_id` | `bigint` | NO | `null` | — |
| `assigned_date` | `date` | NO | `null` | — |
| `status` | `text` | YES | `'pending'::text` | — |

**RLS Policies**

- `Coaches can manage workouts` — ALL — coach owns
- `Users can see workouts assigned to them` — SELECT — client owns; coach owns

## Coach Workflow

### `coach_week_reviews`

_Table not found in provided export._

### `workout_categories`

Schema snapshot for this table.

| column | type | nullable | default | fk |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | — |
| `coach_id` | `uuid` | YES | `null` | — |
| `name` | `text` | NO | `null` | — |
| `description` | `text` | YES | `null` | — |
| `color` | `text` | YES | `'#3B82F6'::text` | — |
| `icon` | `text` | YES | `'Dumbbell'::text` | — |
| `is_active` | `boolean` | YES | `true` | — |
| `created_at` | `timestamp with time zone` | YES | `now()` | — |
| `updated_at` | `timestamp with time zone` | YES | `now()` | — |

**RLS Policies**

- `Coaches can delete workout categories` — DELETE — coach owns
- `Coaches can insert workout categories` — INSERT — coach owns
- `Coaches can manage their workout categories` — ALL — coach owns
- `Coaches can update workout categories` — UPDATE — coach owns
- `Coaches can view workout categories` — SELECT — coach owns
- `workout_categories_delete_coach_admin` — DELETE — custom predicate
- `workout_categories_insert_coach_admin` — INSERT — custom predicate
- `workout_categories_select_public` — SELECT — custom predicate
- `workout_categories_update_coach_admin` — UPDATE — custom predicate

---

This snapshot was generated on 2026-04-27. Run `supabase/scripts/snapshot-schema.sql` to refresh.
