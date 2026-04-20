# Schema Reconnaissance Report — Test Persona Seed Preparation

## Table of Contents
- [auth.users](#authusers)
- [public.profiles](#publicprofiles)
- [public.clients](#publicclients)
- [public.workout_programs](#publicworkout_programs)
- [public.program_assignments](#publicprogram_assignments)
- [public.program_schedule](#publicprogram_schedule)
- [public.program_day_assignments](#publicprogram_day_assignments)
- [public.program_day_completions](#publicprogram_day_completions)
- [public.program_progress](#publicprogram_progress)
- [public.workout_templates](#publicworkout_templates)
- [public.workout_set_entries](#publicworkout_set_entries)
- [public.workout_set_entry_exercises](#publicworkout_set_entry_exercises)
- [public.exercises](#publicexercises)
- [public.workout_sessions](#publicworkout_sessions)
- [public.workout_logs](#publicworkout_logs)
- [public.workout_set_logs](#publicworkout_set_logs)
- [public.workout_assignments](#publicworkout_assignments)
- [public.user_exercise_metrics](#publicuser_exercise_metrics)
- [public.personal_records](#publicpersonal_records)
- [public.athlete_scores](#publicathlete_scores)
- [public.body_metrics](#publicbody_metrics)
- [public.daily_wellness_logs](#publicdaily_wellness_logs)
- [public.check_ins](#publiccheck_ins)
- [public.client_goals](#publicclient_goals)
- [public.coach_week_reviews](#publiccoach_week_reviews)
- [Additional Questions](#additional-questions)
- [Additional Tables Found](#additional-tables-found)

### auth.users

**Columns** (name · type · nullable · default):
- instance_id · uuid · null · —
- id · uuid · not null · —
- aud · character varying · null · —
- role · character varying · null · —
- email · character varying · null · —
- encrypted_password · character varying · null · —
- email_confirmed_at · timestamptz · null · —
- invited_at · timestamptz · null · —
- confirmation_token · character varying · null · —
- confirmation_sent_at · timestamptz · null · —
- recovery_token · character varying · null · —
- recovery_sent_at · timestamptz · null · —
- email_change_token_new · character varying · null · —
- email_change · character varying · null · —
- email_change_sent_at · timestamptz · null · —
- last_sign_in_at · timestamptz · null · —
- raw_app_meta_data · jsonb · null · —
- raw_user_meta_data · jsonb · null · —
- is_super_admin · boolean · null · —
- created_at · timestamptz · null · —
- updated_at · timestamptz · null · —
- phone · text · null · NULL::character varying
- phone_confirmed_at · timestamptz · null · —
- phone_change · text · null · ''::character varying
- phone_change_token · character varying · null · ''::character varying
- phone_change_sent_at · timestamptz · null · —
- confirmed_at · timestamptz · null · —
- email_change_token_current · character varying · null · ''::character varying
- email_change_confirm_status · smallint · null · 0
- banned_until · timestamptz · null · —
- reauthentication_token · character varying · null · ''::character varying
- reauthentication_sent_at · timestamptz · null · —
- is_sso_user · boolean · not null · false
- deleted_at · timestamptz · null · —
- is_anonymous · boolean · not null · false

**Primary key:** `id`

**Foreign keys:**
- none reported in packet for this table as source

**Unique constraints / indexes relevant to inserts:**
- `users_phone_key`: (`phone`)
- `users_email_partial_key`: (`email`)
- `confirmation_token_idx`: (`confirmation_token`)
- `email_change_token_current_idx`: (`email_change_token_current`)
- `email_change_token_new_idx`: (`email_change_token_new`)
- `reauthentication_token_idx`: (`reauthentication_token`)
- `recovery_token_idx`: (`recovery_token`)

**Check constraints:**
- `users_email_change_confirm_status_check`: `email_change_confirm_status >= 0 AND <= 2`

**RLS enabled?** yes. `pg_policies` returned no row for `auth.users`; policy model for this relation is not exposed in this packet. ⚠️

**Triggers:**
- `on_auth_user_created`: AFTER INSERT, executes `public.handle_new_user()` (auto-creates/syncs profile data).

**Notes:** For seed planning, the practical create-user fields are `id`, `email`, `encrypted_password`, `email_confirmed_at/confirmed_at`, plus optional metadata and timestamps.

### public.profiles

**Columns** (name · type · nullable · default):
- id · uuid · not null · —
- email · text · not null · —
- role · text · not null · —
- first_name · text · null · —
- last_name · text · null · —
- avatar_url · text · null · —
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()
- sex · varchar · null · —
- bodyweight · numeric · null · —
- client_type · client_type · not null · 'online'::client_type
- leaderboard_visibility · leaderboard_visibility · not null · 'public'::leaderboard_visibility
- timezone · text · not null · 'UTC'::text
- athlete_score_visible · boolean · null · false
- bio · text · null · —
- phone · text · null · —
- height_cm · numeric · null · —
- date_of_birth · date · null · —
- fitness_level · text · null · —
- medical_conditions · text · null · —
- injuries · text · null · —

**Primary key:** `id`

**Foreign keys:**
- `id` -> `auth.users.id` (on delete: CASCADE)

**Unique constraints / indexes relevant to inserts:**
- none reported besides PK

**Check constraints:**
- `profiles_role_check`: `role IN ('admin','coach','client')`
- `profiles_sex_check`: `sex IN ('M','F')` when not null
- `profiles_fitness_level_check`: null or `('beginner','intermediate','advanced')`

**RLS enabled?** yes. Most restrictive insert-visible policy in packet: `Users can insert their own profile` (`WITH CHECK auth.uid() = id`).

**Triggers:**
- `tr_profiles_updated_at`: BEFORE UPDATE, sets `updated_at`.

**Notes:** This is the core app identity surface; `id` must align with `auth.users.id`.

### public.clients

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- coach_id · uuid · not null · —
- client_id · uuid · not null · —
- status · text · not null · 'active'::text
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()

**Primary key:** `id`

**Foreign keys:**
- `coach_id` -> `public.profiles.id` (on delete: NO ACTION)
- `client_id` -> `public.profiles.id` (on delete: CASCADE)

**Unique constraints / indexes relevant to inserts:**
- `clients_coach_id_client_id_key`: (`coach_id`, `client_id`)

**Check constraints:**
- `clients_status_check`: `status IN ('active','inactive','pending')`

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `clients_manage_coach` (`WITH CHECK coach_id = auth.uid()`).

**Triggers:**
- none reported in packet

**Notes:** Status is text with check constraint (not enum).

### public.workout_programs

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- name · text · not null · —
- description · text · null · —
- coach_id · uuid · not null · —
- difficulty_level · text · null · 'intermediate'::text
- duration_weeks · integer · null · 4
- target_audience · text · null · 'general_fitness'::text
- is_active · boolean · null · true
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()
- category · text · null · —

**Primary key:** `id`

**Foreign keys:**
- `coach_id` -> `public.profiles.id` (on delete: CASCADE)

**Unique constraints / indexes relevant to inserts:**
- none reported besides PK

**Check constraints:**
- `workout_programs_difficulty_level_check`: allowed difficulty set
- `workout_programs_category_check`: allowed category set (Hypertrophy, Max Strength, etc.)

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `Coaches can manage workout programs` (coach-owned rows).

**Triggers:**
- `update_workout_programs_updated_at`: BEFORE UPDATE, sets `updated_at`.

**Notes:** Program `96ff2e6d...` exists and is 24 weeks.

### public.program_assignments

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- program_id · uuid · not null · —
- client_id · uuid · not null · —
- coach_id · uuid · not null · —
- current_day_number · integer · null · 1
- completed_days · integer · null · 0
- total_days · integer · not null · —
- start_date · date · not null · CURRENT_DATE
- preferred_workout_days · _text · null · —
- status · text · null · 'active'::text
- is_customized · boolean · null · false
- notes · text · null · —
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()
- name · text · null · —
- description · text · null · —
- duration_weeks · integer · null · —
- timezone_snapshot · text · null · —
- progression_mode · text · not null · 'auto'::text
- coach_unlocked_week · integer · null · —
- pause_status · text · not null · 'active'::text
- paused_at · timestamptz · null · —
- pause_reason · text · null · —
- pause_accumulated_days · integer · not null · 0

**Primary key:** `id`

**Foreign keys:**
- `program_id` -> `public.workout_programs.id` (on delete: CASCADE)
- `client_id` -> `public.profiles.id` (on delete: CASCADE)
- `coach_id` -> `public.profiles.id` (on delete: CASCADE)

**Unique constraints / indexes relevant to inserts:**
- `program_assignments_program_id_client_id_key`: (`program_id`, `client_id`)
- `uq_one_active_program_per_client`: (`client_id`) unique index

**Check constraints:**
- `program_assignments_status_check`: `status IN ('active','completed','paused','cancelled')`
- `program_assignments_progression_mode_check`: `progression_mode IN ('auto','coach_managed')`
- `program_assignments_pause_status_check`: `pause_status IN ('active','paused')`
- `program_assignments_paused_at_when_paused_check`: if paused, `paused_at IS NOT NULL`
- `program_assignments_coach_unlocked_week_check`: null or `>= 1`
- `program_assignments_pause_accumulated_days_check`: `>= 0`

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `Coaches can manage program assignments` (coach-owned rows).

**Triggers:**
- `trigger_enforce_single_program_assignment`: BEFORE INSERT/UPDATE; enforces one-assignment rule.
- `update_program_assignments_updated_at`: BEFORE UPDATE; sets `updated_at`.

**Notes:** Both `status` and `pause_status` are independently constrained.

### public.program_schedule

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- program_id · uuid · not null · —
- template_id · uuid · not null · —
- day_of_week · integer · not null · —
- week_number · integer · not null · —
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()
- day_number · integer · not null · —
- training_block_id · uuid · null · —
- is_optional · boolean · null · false

**Primary key:** `id`

**Foreign keys:**
- `program_id` -> `public.workout_programs.id` (on delete: CASCADE)
- `training_block_id` -> `public.training_blocks.id` (on delete: CASCADE)

**Unique constraints / indexes relevant to inserts:**
- `program_schedule_program_id_day_of_week_week_number_key`: (`program_id`,`day_of_week`,`week_number`)
- `uq_schedule_program_week_day`: (`program_id`,`week_number`,`day_number`)
- `ux_program_schedule_triplet`: (`program_id`,`day_of_week`,`week_number`)

**Check constraints:**
- `program_schedule_day_of_week_check`: `day_of_week BETWEEN 0 AND 6`
- `program_schedule_week_number_check`: `week_number >= 1`
- `chk_day_number`: `day_number BETWEEN 1 AND 7`

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `Coaches can insert schedules for their programs` (`WITH CHECK` validates coach ownership via `workout_programs`).

**Triggers:**
- none reported in packet

**Notes:** Two unique indexes overlap the table-level unique triplet.

### public.program_day_assignments

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- program_assignment_id · uuid · not null · —
- program_day_id · uuid · null · —
- day_number · integer · not null · —
- day_type · text · not null · —
- workout_assignment_id · uuid · null · —
- name · text · not null · —
- description · text · null · —
- estimated_duration · integer · null · —
- target_muscles · _text · null · —
- intensity_level · text · null · —
- rest_focus · text · null · —
- recommended_activities · _text · null · —
- is_completed · boolean · null · false
- completed_date · date · null · —
- notes · text · null · —
- is_customized · boolean · null · false
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()
- program_day · integer · null · —
- workout_template_id · uuid · null · —

**Primary key:** `id`

**Foreign keys:**
- `program_assignment_id` -> `public.program_assignments.id` (on delete: CASCADE)
- `program_day_id` -> `public.program_days.id` (on delete: NO ACTION)
- `workout_assignment_id` -> `public.workout_assignments.id` (on delete: NO ACTION)

**Unique constraints / indexes relevant to inserts:**
- `program_day_assignments_program_assignment_id_day_number_key`: (`program_assignment_id`,`day_number`)

**Check constraints:**
- `program_day_assignments_day_type_check`: `day_type IN ('workout','rest','assessment')`

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: coach `ALL` policy scopes rows via related coached programs.

**Triggers:**
- none reported in packet

**Notes:** This table links assignment days to either program-day references and/or ad hoc workout assignments.

### public.program_day_completions

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- program_assignment_id · uuid · not null · —
- program_schedule_id · uuid · not null · —
- completed_at · timestamptz · not null · now()
- completed_by · uuid · not null · —
- notes · text · null · —

**Primary key:** `id` (`program_day_completions_pkey1`)

**Foreign keys:**
- `program_assignment_id` -> `public.program_assignments.id` (on delete: CASCADE)
- `program_schedule_id` -> `public.program_schedule.id` (on delete: CASCADE)
- `completed_by` -> `public.profiles.id` (on delete: NO ACTION)

**Unique constraints / indexes relevant to inserts:**
- `uq_pdc_assignment_schedule`: (`program_assignment_id`,`program_schedule_id`)

**Check constraints:**
- none reported in packet

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `pdc_insert_client` requires assignment ownership (`program_assignment_id` belongs to `auth.uid()`).

**Triggers:**
- none reported in packet

**Notes:** Composite uniqueness prevents duplicate completion for same assignment+schedule row.

### public.program_progress

**Columns** (name · type · nullable · default):
- program_assignment_id · uuid · not null · —
- current_week_number · integer · not null · 1
- current_day_number · integer · not null · 1
- is_completed · boolean · not null · false
- updated_at · timestamptz · not null · now()
- created_at · timestamptz · not null · now()

**Primary key:** `program_assignment_id` (`program_progress_pkey1`)

**Foreign keys:**
- `program_assignment_id` -> `public.program_assignments.id` (on delete: CASCADE)

**Unique constraints / indexes relevant to inserts:**
- none reported besides PK

**Check constraints:**
- `chk_progress_week`: `current_week_number >= 1`
- `chk_progress_day`: `current_day_number BETWEEN 1 AND 7`

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `program_progress_insert_client` scopes insert to owned assignment.

**Triggers:**
- none reported in packet

**Notes:** One-row-per-assignment design due PK on `program_assignment_id`.

### public.workout_templates

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- name · text · not null · —
- description · text · null · —
- coach_id · uuid · not null · —
- difficulty_level · text · null · 'intermediate'::text
- estimated_duration · integer · null · 60
- category · text · null · 'general'::text
- is_active · boolean · null · true
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()

**Primary key:** `id`

**Foreign keys:**
- `coach_id` -> `public.profiles.id` (on delete: CASCADE)

**Unique constraints / indexes relevant to inserts:**
- none reported besides PK

**Check constraints:**
- `workout_templates_difficulty_level_check`: allowed difficulty set

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `Coaches can manage workout templates` (coach ownership).

**Triggers:**
- `update_workout_templates_updated_at`: BEFORE UPDATE, sets `updated_at`.

**Notes:** Referenced heavily by program/workout assignment flows.

### public.workout_set_entries

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- template_id · uuid · not null · —
- set_order · integer · not null · —
- set_name · varchar · null · —
- set_notes · text · null · —
- duration_seconds · integer · null · —
- rest_seconds · integer · null · —
- total_sets · integer · null · —
- reps_per_set · varchar · null · —
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()
- set_type · workout_set_type · not null · 'straight_set'::workout_set_type
- hr_zone_target · integer · null · —
- hr_percentage_min · numeric · null · —
- hr_percentage_max · numeric · null · —

**Primary key:** `id` (`workout_blocks_pkey`)

**Foreign keys:**
- `template_id` -> `public.workout_templates.id` (on delete: CASCADE)

**Unique constraints / indexes relevant to inserts:**
- none reported besides PK

**Check constraints:**
- `workout_set_entries_set_type_check`: set_type in declared enum-like set (straight_set, superset, giant_set, drop_set, cluster_set, rest_pause, pre_exhaustion, amrap, emom, tabata, for_time, speed_work, endurance)
- `workout_blocks_hr_zone_target_check`: zone bounds
- `workout_blocks_hr_percentage_min_check`: bounds
- `workout_blocks_hr_percentage_max_check`: bounds

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: insert requires template ownership by coach.

**Triggers:**
- `update_workout_blocks_updated_at`: BEFORE UPDATE, sets `updated_at`.

**Notes:** Naming still reflects legacy `workout_blocks` identifiers in PK/FK/trigger names.

### public.workout_set_entry_exercises

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- set_entry_id · uuid · not null · —
- exercise_id · uuid · not null · —
- exercise_order · integer · not null · —
- exercise_letter · varchar · null · —
- sets · integer · null · —
- reps · varchar · null · —
- weight_kg · numeric · null · —
- rir · integer · null · —
- tempo · varchar · null · —
- rest_seconds · integer · null · —
- notes · text · null · —
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()
- load_percentage · numeric · null · —

**Primary key:** `id` (`workout_block_exercises_pkey`)

**Foreign keys:**
- `set_entry_id` -> `public.workout_set_entries.id` (on delete: CASCADE)
- `exercise_id` -> `public.exercises.id` (on delete: NO ACTION)

**Unique constraints / indexes relevant to inserts:**
- `idx_wse_unique_set_entry_exercise`: (`set_entry_id`,`exercise_id`)

**Check constraints:**
- none reported in packet

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: insert requires parent set entry to belong to coach-owned template.

**Triggers:**
- `update_workout_block_exercises_updated_at`: BEFORE UPDATE, sets `updated_at`.

**Notes:** Legacy naming persists (`workout_block_exercises_*`).

### public.exercises

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- coach_id · uuid · not null · —
- name · text · not null · —
- description · text · null · —
- category · text · not null · —
- image_url · text · null · —
- is_active · boolean · null · true
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()
- video_url · text · null · —
- equipment_types · jsonb · null · '[]'::jsonb
- instructions · jsonb · null · '[]'::jsonb
- tips · jsonb · null · '[]'::jsonb
- primary_muscle_group_id · uuid · null · —
- secondary_muscle_group_1_id · uuid · null · —
- secondary_muscle_group_2_id · uuid · null · —

**Primary key:** `id`

**Foreign keys:**
- `primary_muscle_group_id` -> `public.muscle_groups.id` (on delete: SET NULL)
- `secondary_muscle_group_1_id` -> `public.muscle_groups.id` (on delete: SET NULL)
- `secondary_muscle_group_2_id` -> `public.muscle_groups.id` (on delete: SET NULL)

**Unique constraints / indexes relevant to inserts:**
- `unique_exercise_name_per_coach`: (`name`,`coach_id`)

**Check constraints:**
- none reported in packet

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `exercises_insert_coach` (`coach_id = auth.uid()` or admin).

**Triggers:**
- none reported in packet

**Notes:** JSONB instructional fields default to empty arrays; sample rows look like real exercise catalog entries.

### public.workout_sessions

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- assignment_id · uuid · not null · —
- client_id · uuid · not null · —
- started_at · timestamptz · null · now()
- completed_at · timestamptz · null · —
- total_duration · integer · null · —
- status · text · null · 'in_progress'::text
- notes · text · null · —
- created_at · timestamptz · null · now()
- current_block_index · integer · not null · 0
- current_exercise_index · integer · not null · 0
- last_activity_at · timestamptz · null · —
- total_exercises · integer · null · —
- program_assignment_id · uuid · null · —
- program_schedule_id · uuid · null · —

**Primary key:** `id`

**Foreign keys:**
- `program_assignment_id` -> `public.program_assignments.id` (on delete: SET NULL)
- `program_schedule_id` -> `public.program_schedule.id` (on delete: SET NULL)

**Unique constraints / indexes relevant to inserts:**
- `idx_unique_in_progress_session`: (`client_id`,`program_assignment_id`,`program_schedule_id`)

**Check constraints:**
- none reported in packet

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: client `ALL` on own rows (`auth.uid() = client_id`).

**Triggers:**
- none reported in packet

**Notes:** `assignment_id` is required but no FK was returned for it in packet output. ⚠️

### public.workout_logs

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- workout_assignment_id · uuid · not null · —
- client_id · uuid · not null · —
- started_at · timestamptz · not null · —
- completed_at · timestamptz · null · —
- total_duration_minutes · integer · null · —
- overall_difficulty_rating · integer · null · —
- perceived_effort · integer · null · —
- total_sets_completed · integer · null · 0
- total_reps_completed · integer · null · 0
- total_weight_lifted · numeric · null · 0
- energy_level · integer · null · —
- muscle_fatigue_level · integer · null · —
- notes · text · null · —
- created_at · timestamptz · null · now()
- workout_session_id · uuid · null · —
- total_hr_zone2_minutes · numeric · null · —
- total_hr_zone45_minutes · numeric · null · —
- average_hr_percentage · numeric · null · —
- max_hr_percentage · numeric · null · —
- total_distance_meters · numeric · null · —
- program_assignment_id · uuid · null · —
- program_schedule_id · uuid · null · —

**Primary key:** `id`

**Foreign keys:**
- `workout_assignment_id` -> `public.workout_assignments.id` (on delete: CASCADE)
- `client_id` -> `public.profiles.id` (on delete: CASCADE)
- `workout_session_id` -> `public.workout_sessions.id` (on delete: SET NULL)
- `program_assignment_id` -> `public.program_assignments.id` (on delete: SET NULL)
- `program_schedule_id` -> `public.program_schedule.id` (on delete: SET NULL)

**Unique constraints / indexes relevant to inserts:**
- `idx_workout_logs_one_active_per_assignment`: (`workout_assignment_id`,`client_id`)
- `idx_workout_logs_one_incomplete_per_assignment`: (`client_id`,`workout_assignment_id`)

**Check constraints:**
- range checks on rating/effort/energy/fatigue and HR/distance totals

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `Clients can insert their own workout logs` (`WITH CHECK auth.uid() = client_id`).

**Triggers:**
- none reported in packet

**Notes:** Supports both classic assignment logs and program-linked logging (`program_assignment_id`/`program_schedule_id`).

### public.workout_set_logs

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- workout_log_id · uuid · not null · —
- client_id · uuid · not null · —
- set_entry_id · uuid · not null · —
- exercise_id · uuid · null · —
- weight · numeric · null · —
- reps · integer · null · —
- completed_at · timestamptz · null · now()
- created_at · timestamptz · null · now()
- set_type · text · null · —
- set_number · integer · null · —
- superset_exercise_a_id · uuid · null · —
- superset_weight_a · numeric · null · —
- superset_reps_a · integer · null · —
- superset_exercise_b_id · uuid · null · —
- superset_weight_b · numeric · null · —
- superset_reps_b · integer · null · —
- giant_set_exercises · jsonb · null · —
- round_number · integer · null · —
- dropset_initial_weight · numeric · null · —
- dropset_initial_reps · integer · null · —
- dropset_final_weight · numeric · null · —
- dropset_final_reps · integer · null · —
- dropset_percentage · numeric · null · —
- cluster_number · integer · null · —
- rest_pause_initial_weight · numeric · null · —
- rest_pause_initial_reps · integer · null · —
- rest_pause_reps_after · integer · null · —
- rest_pause_number · integer · null · —
- preexhaust_isolation_exercise_id · uuid · null · —
- preexhaust_isolation_weight · numeric · null · —
- preexhaust_isolation_reps · integer · null · —
- preexhaust_compound_exercise_id · uuid · null · —
- preexhaust_compound_weight · numeric · null · —
- preexhaust_compound_reps · integer · null · —
- amrap_total_reps · integer · null · —
- amrap_duration_seconds · integer · null · —
- amrap_target_reps · integer · null · —
- emom_minute_number · integer · null · —
- emom_total_reps_this_min · integer · null · —
- emom_total_duration_sec · integer · null · —
- tabata_rounds_completed · integer · null · —
- tabata_total_duration_sec · integer · null · —
- fortime_total_reps · integer · null · —
- fortime_time_taken_sec · integer · null · —
- fortime_time_cap_sec · integer · null · —
- fortime_target_reps · integer · null · —
- pyramid_step_number · integer · null · —
- ladder_rung_number · integer · null · —
- ladder_round_number · integer · null · —
- rest_pause_duration · integer · null · —
- max_rest_pauses · integer · null · —
- hr_zone · integer · null · —
- hr_percentage · numeric · null · —
- hr_duration_seconds · integer · null · —
- hr_distance_meters · numeric · null · —
- hr_interval_round · integer · null · —
- hr_work_duration_seconds · integer · null · —
- hr_rest_duration_seconds · integer · null · —
- hr_average_percentage · numeric · null · —
- rpe · integer · null · —
- actual_time_seconds · numeric · null · —
- actual_distance_meters · numeric · null · —
- actual_hr_avg · numeric · null · —
- actual_speed_kmh · numeric · null · —

**Primary key:** `id`

**Foreign keys:**
- `workout_log_id` -> `public.workout_logs.id` (on delete: CASCADE)
- `client_id` -> `auth.users.id` (on delete: NO ACTION)
- `exercise_id` -> `public.exercises.id` (on delete: NO ACTION)

**Unique constraints / indexes relevant to inserts:**
- none reported besides PK

**Check constraints:**
- range checks for HR/RPE and other metric bounds

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `Clients insert own set logs` (`WITH CHECK auth.uid() = client_id`).

**Triggers:**
- `tr_set_log_update_activity`: AFTER INSERT, updates session last activity via `update_session_last_activity()`.

**Notes:** Wide polymorphic schema for many set protocols (superset, giant set, drop set, AMRAP, EMOM, etc.).

### public.workout_assignments

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- workout_template_id · uuid · null · —
- client_id · uuid · not null · —
- coach_id · uuid · not null · —
- name · text · not null · —
- description · text · null · —
- estimated_duration · integer · null · 60
- assigned_date · date · not null · CURRENT_DATE
- scheduled_date · date · null · —
- status · text · null · 'assigned'::text
- notes · text · null · —
- is_customized · boolean · null · false
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()

**Primary key:** `id`

**Foreign keys:**
- `workout_template_id` -> `public.workout_templates.id` (on delete: NO ACTION)
- `client_id` -> `public.profiles.id` (on delete: CASCADE)
- `coach_id` -> `public.profiles.id` (on delete: CASCADE)

**Unique constraints / indexes relevant to inserts:**
- none reported besides PK

**Check constraints:**
- `workout_assignments_status_check`: `status IN ('assigned','in_progress','completed','skipped')`

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `Coaches can manage workout assignments` (coach-owned rows).

**Triggers:**
- `update_workout_assignments_updated_at`: BEFORE UPDATE, sets `updated_at`.

**Notes:** This is standalone/non-program assignment surface.

### public.user_exercise_metrics

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- user_id · uuid · not null · —
- exercise_id · uuid · not null · —
- estimated_1rm · numeric · not null · —
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()
- best_weight · numeric · null · —
- best_reps · integer · null · —
- best_volume · numeric · null · —
- best_volume_weight · numeric · null · —
- best_volume_reps · integer · null · —

**Primary key:** `id`

**Foreign keys:**
- `user_id` -> `auth.users.id` (on delete: CASCADE)
- `exercise_id` -> `public.exercises.id` (on delete: CASCADE)

**Unique constraints / indexes relevant to inserts:**
- `user_exercise_metrics_user_id_exercise_id_key`: (`user_id`,`exercise_id`)

**Check constraints:**
- none reported in packet

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `user_exercise_metrics_insert_own` (`WITH CHECK user_id = auth.uid()`).

**Triggers:**
- `update_user_exercise_metrics_updated_at`: BEFORE UPDATE, sets timestamp.

**Notes:** Uniqueness enforces one aggregate metric row per user+exercise.

### public.personal_records

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- client_id · uuid · not null · —
- exercise_id · uuid · not null · —
- record_type · text · not null · —
- record_value · numeric · not null · —
- record_unit · text · not null · —
- achieved_date · date · not null · CURRENT_DATE
- workout_assignment_id · uuid · null · —
- previous_record_value · numeric · null · —
- improvement_percentage · numeric · null · —
- is_current_record · boolean · null · true
- notes · text · null · —
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()

**Primary key:** `id`

**Foreign keys:**
- `client_id` -> `public.profiles.id` (on delete: CASCADE)
- `exercise_id` -> `public.exercises.id` (on delete: NO ACTION)
- `workout_assignment_id` -> `public.workout_assignments.id` (on delete: NO ACTION)

**Unique constraints / indexes relevant to inserts:**
- none reported besides PK

**Check constraints:**
- `personal_records_record_type_check`: `record_type IN ('weight','reps','distance','time','score')`

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `personal_records_insert` (`WITH CHECK client_id = auth.uid()`).

**Triggers:**
- `update_personal_records_updated_at`: BEFORE UPDATE, sets `updated_at`.

**Notes:** Client-facing PR store with optional linkage back to workout assignment.

### public.athlete_scores

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- client_id · uuid · not null · —
- score · integer · not null · 0
- tier · text · not null · 'benched'::text
- workout_completion_score · integer · not null · 0
- program_adherence_score · integer · not null · 0
- checkin_completion_score · integer · not null · 0
- goal_progress_score · integer · not null · 0
- nutrition_compliance_score · integer · not null · 0
- window_start · date · not null · —
- window_end · date · not null · —
- calculated_at · timestamptz · not null · now()
- created_at · timestamptz · not null · now()
- updated_at · timestamptz · not null · now()

**Primary key:** `id`

**Foreign keys:**
- `client_id` -> `public.profiles.id` (on delete: CASCADE)

**Unique constraints / indexes relevant to inserts:**
- `athlete_scores_client_id_window_start_window_end_key`: (`client_id`,`window_start`,`window_end`)

**Check constraints:**
- score component checks (0..100)
- `athlete_scores_tier_check`: tier in `('beast_mode','locked_in','showing_up','slipping','benched')`

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: only explicit ALL policy shown is `Service role can manage athlete scores`.

**Triggers:**
- `athlete_scores_updated_at`: BEFORE UPDATE sets timestamp.

**Notes:** Tier values are strict via check.

### public.body_metrics

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- client_id · uuid · not null · —
- coach_id · uuid · null · —
- weight_kg · numeric · null · —
- body_fat_percentage · numeric · null · —
- muscle_mass_kg · numeric · null · —
- visceral_fat_level · integer · null · —
- left_arm_circumference · numeric · null · —
- right_arm_circumference · numeric · null · —
- torso_circumference · numeric · null · —
- waist_circumference · numeric · null · —
- hips_circumference · numeric · null · —
- left_thigh_circumference · numeric · null · —
- right_thigh_circumference · numeric · null · —
- left_calf_circumference · numeric · null · —
- right_calf_circumference · numeric · null · —
- measured_date · date · not null · CURRENT_DATE
- measurement_method · text · null · —
- notes · text · null · —
- created_at · timestamptz · null · now()
- updated_at · timestamptz · null · now()

**Primary key:** `id`

**Foreign keys:**
- `client_id` -> `public.profiles.id` (on delete: CASCADE)
- `coach_id` -> `public.profiles.id` (on delete: NO ACTION)

**Unique constraints / indexes relevant to inserts:**
- `body_metrics_client_id_measured_date_key`: (`client_id`,`measured_date`)

**Check constraints:**
- `body_metrics_visceral_fat_level_check`: range check

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `body_metrics_clients_insert_own` (`WITH CHECK client_id = auth.uid()`).

**Triggers:**
- `update_body_metrics_updated_at`: BEFORE UPDATE sets timestamp.

**Notes:** One metric row per client/day due unique key.

### public.daily_wellness_logs

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- client_id · uuid · not null · —
- log_date · date · not null · CURRENT_DATE
- energy_level · integer · null · —
- mood_rating · integer · null · —
- stress_level · integer · null · —
- motivation_level · integer · null · —
- soreness_level · integer · null · —
- notes · text · null · —
- created_at · timestamptz · null · now()
- sleep_hours · numeric · null · —
- sleep_quality · integer · null · —
- steps · integer · null · —

**Primary key:** `id`

**Foreign keys:**
- `client_id` -> `public.profiles.id` (on delete: CASCADE)

**Unique constraints / indexes relevant to inserts:**
- `daily_wellness_logs_client_id_log_date_key`: (`client_id`,`log_date`)

**Check constraints:**
- `wellness_energy_range`, `wellness_mood_range`, `wellness_stress_range`, `wellness_motivation_range`, `wellness_soreness_range`

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: `Clients can manage own wellness logs` (`WITH CHECK client_id = auth.uid()`).

**Triggers:**
- none reported in packet

**Notes:** One row/day/client enforced by unique constraint.

### public.check_ins

**Columns** (name · type · nullable · default):
- ⚠️ TABLE_NOT_FOUND

**Primary key:** ⚠️ table does not exist under this name.

**Foreign keys:**
- ⚠️ n/a (table missing)

**Unique constraints / indexes relevant to inserts:**
- ⚠️ n/a (table missing)

**Check constraints:**
- ⚠️ n/a (table missing)

**RLS enabled?** no table found.

**Triggers:**
- ⚠️ n/a (table missing)

**Notes:** Related tables found include `check_in_configs` (see Additional Tables Found).

### public.client_goals

**Columns** (name · type · nullable · default):
- ⚠️ TABLE_NOT_FOUND

**Primary key:** ⚠️ table does not exist under this name.

**Foreign keys:**
- ⚠️ n/a (table missing)

**Unique constraints / indexes relevant to inserts:**
- ⚠️ n/a (table missing)

**Check constraints:**
- ⚠️ n/a (table missing)

**RLS enabled?** no table found.

**Triggers:**
- ⚠️ n/a (table missing)

**Notes:** Goals candidates detected: `public.goals`, `public.goal_templates`.

### public.coach_week_reviews

**Columns** (name · type · nullable · default):
- id · uuid · not null · gen_random_uuid()
- program_assignment_id · uuid · not null · —
- week_number · integer · not null · —
- reviewed_at · timestamptz · not null · now()
- coach_id · uuid · not null · —
- action · text · not null · —
- coach_notes · text · null · —
- performance_summary · jsonb · null · —
- created_at · timestamptz · not null · now()

**Primary key:** `id`

**Foreign keys:**
- `program_assignment_id` -> `public.program_assignments.id` (on delete: CASCADE)
- `coach_id` -> `public.profiles.id` (on delete: NO ACTION)

**Unique constraints / indexes relevant to inserts:**
- none reported besides PK

**Check constraints:**
- `coach_week_reviews_action_check`: `action IN ('advance','repeat','adjust_and_advance','note')`

**RLS enabled?** yes. Most restrictive insert-facing policy in packet: coach `ALL` (`coach_id = auth.uid()`).

**Triggers:**
- none reported in packet

**Notes:** `performance_summary` JSONB can support richer week analytics payloads.

## Additional Questions

1. **User creation path**
   - Evidence: trigger `auth.users.on_auth_user_created` calls `public.handle_new_user()`, and `create_user_profile`/`handle_new_user` functions exist.
   - Practical supported path: Supabase Auth (Admin API / dashboard) is the standard path; it triggers profile sync automatically.
   - Direct SQL insert into `auth.users` appears technically possible with privileged SQL editor/service role, but it is lower-level and easier to get wrong (password hashing, auth metadata). Use Admin API unless you explicitly need SQL seeding. ⚠️

2. **Coach-client linkage (`clients.status`)**
   - `clients.status` is **text with check constraint**, not enum.
   - Allowed values: `active`, `inactive`, `pending`.
   - Observed data: only `active` appears in sampled current rows (`active` count 4).
   - App-side interpretation from DB evidence: active uses `status = 'active'`; archived/removed is not a declared value in this table. ⚠️

3. **Assignment status values (`program_assignments.status`)**
   - `program_assignments.status` is text with check constraint:
     - `active`, `completed`, `paused`, `cancelled`
   - `archived` is **not** an allowed DB value (would violate check).
   - Observed current values: `active`, `completed`.
   - Separate lifecycle flag exists: `pause_status` (`active`/`paused`).

4. **Hybrid Program v2 shape for `96ff2e6d...`**
   - `duration_weeks`: `24`
   - `program_schedule` rows: `143`
   - Distinct weeks present: all weeks `1` through `24` (output list included all).
   - Representative row:
     - `id=0488b395-e8fe-527d-a09a-85805f229bb4`
     - `program_id=96ff2e6d-3eb0-0054-bf4e-9de2edd466ca`
     - `week_number=1`
     - `day_number=1`
     - `template_id=cc9e9e51-9ff0-d756-f226-b385ad062576`
   - Distinct `template_id` count: `6`

5. **Exercise catalog size + realism**
   - ⚠️ Total row count was expected from Q12a but was not included in returned results.
   - Sampled records look like real exercise rows (e.g., "Machine Lateral Raise", "Cable Curl", "TRX Side Plank", "BB Strict Overhead Press").
   - 5 sample rows were provided and are suitable naming references for PR seed payloads.

6. **Potential email collisions in `auth.users`**
   - All five test emails returned `exists_in_auth_users = no`:
     - `alice.test@dailyfitness.app`
     - `bob.test@dailyfitness.app`
     - `carol.test@dailyfitness.app`
     - `dan.test@dailyfitness.app`
     - `eve.test@dailyfitness.app`
   - No immediate collision detected.

7. **Safety rails: ON DELETE CASCADE to non-listed tables**
   - Yes, extensive cascade edges exist beyond your 25-table list.
   - Highest-risk roots:
     - Deleting from `auth.users` cascades into many auth tables and public coach/client feature tables.
     - Deleting from `public.profiles` cascades broadly into achievements, nutrition, logs, scheduling, and progression tables.
     - Deleting from `public.program_assignments`, `workout_assignments`, `workout_logs`, `workout_set_entries`, `workout_programs`, and `exercises` also cascades into non-listed children.
   - Teardown scripts should target only isolated persona IDs and avoid broad parent deletions unless fully scoped.

## Additional Tables Found

- `public.goal_templates`, `public.goals`
- `public.check_in_configs`
- `public.program_days`, `public.program_progress_v1`, `public.program_day_completions_v1`, `public.program_week_time_override`, `public.program_assignment_progress`, `public.program_workout_completions`, `public.program_progression_rules`
- `public.workout_block_assignments`, `public.workout_set_entry_completions`, `public.workout_time_protocols`, `public.workout_drop_sets`, `public.workout_cluster_sets`, `public.workout_rest_pause_sets`, `public.workout_speed_sets`, `public.workout_endurance_sets`, `public.workout_exercise_logs`, `public.workout_exercise_assignments`, `public.workout_giant_set_exercise_logs`, `public.workout_set_details`
- `public.exercise_alternatives`, `public.exercise_categories`, `public.exercise_equipment`, `public.exercise_instructions`, `public.exercise_muscle_groups`, `public.exercise_tips`
- `public.meal_plan_assignments`, `public.meal_photo_logs`, `public.food_log_entries`, `public.nutrition_logs`, `public.sleep_logs`, `public.step_logs`, `public.water_logs`, `public.mobility_metrics`, `public.sessions`, and others listed in Q15/Q14.

