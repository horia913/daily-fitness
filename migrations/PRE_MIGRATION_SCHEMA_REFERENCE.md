# Pre-Migration Schema Reference
## Phase 1: block → set entry rename (2026-02-28)

This file is the authoritative record of the schema STATE BEFORE
`20260228_phase1_block_to_set_entry_rename.sql` was applied.
Source: Supabase Snippet CSV files (the Database Contract files).

---

## Tables being renamed

| Old name                   | New name                        |
|----------------------------|---------------------------------|
| workout_blocks             | workout_set_entries             |
| workout_block_exercises    | workout_set_entry_exercises     |
| workout_block_completions  | workout_set_entry_completions   |

---

## workout_blocks — column inventory (pre-migration)

| column          | data_type        | nullable | default                           |
|-----------------|------------------|----------|-----------------------------------|
| id              | uuid             | NO       | gen_random_uuid()                 |
| template_id     | uuid             | NO       | null                              |
| block_order     | integer          | NO       | null                              |
| block_name      | varchar          | YES      | null                              |
| block_notes     | text             | YES      | null                              |
| duration_seconds| integer          | YES      | null                              |
| rest_seconds    | integer          | YES      | null                              |
| total_sets      | integer          | YES      | null                              |
| reps_per_set    | varchar          | YES      | null                              |
| created_at      | timestamptz      | YES      | now()                             |
| updated_at      | timestamptz      | YES      | now()                             |
| block_type      | USER-DEFINED     | NO       | 'straight_set'::workout_block_type|
| hr_zone_target  | integer          | YES      | null                              |
| hr_percentage_min| numeric         | YES      | null                              |
| hr_percentage_max| numeric         | YES      | null                              |

**Renamed to:** `workout_set_entries` with `block_type→set_type`, `block_order→set_order`, `block_name→set_name`, `block_notes→set_notes`

---

## workout_block_exercises — column inventory (pre-migration)

| column         | data_type  | nullable | default           |
|----------------|------------|----------|-------------------|
| id             | uuid       | NO       | gen_random_uuid() |
| block_id       | uuid       | NO       | null              |
| exercise_id    | uuid       | NO       | null              |
| exercise_order | integer    | NO       | null              |
| exercise_letter| varchar    | YES      | null              |
| sets           | integer    | YES      | null              |
| reps           | varchar    | YES      | null              |
| weight_kg      | numeric    | YES      | null              |
| rir            | integer    | YES      | null              |
| tempo          | varchar    | YES      | null              |
| rest_seconds   | integer    | YES      | null              |
| notes          | text       | YES      | null              |
| created_at     | timestamptz| YES      | now()             |
| updated_at     | timestamptz| YES      | now()             |
| load_percentage| numeric    | YES      | null              |

**Renamed to:** `workout_set_entry_exercises` with `block_id→set_entry_id`

---

## FK constraints referencing workout_blocks.id (pre-migration)

| child table                  | child column      |
|------------------------------|-------------------|
| workout_block_exercises      | block_id          |
| workout_cluster_sets         | block_id          |
| workout_rest_pause_sets      | block_id          |
| workout_time_protocols       | block_id          |
| workout_ladder_sets          | block_id          |
| workout_block_assignments    | workout_block_id  |
| workout_hr_sets              | block_id          |
| workout_drop_sets            | block_id          |
| workout_pyramid_sets         | block_id          |
| workout_block_completions    | workout_block_id  |

Note: `workout_set_logs.block_id` and `program_progression_rules.block_id` are plain UUID columns with NO FK constraint to workout_blocks.

---

## FK constraint referencing workout_block_exercises.id (pre-migration)

| child table                   | child column                  |
|-------------------------------|-------------------------------|
| workout_exercise_assignments  | workout_block_exercise_id     |

---

## Tables NOT renamed (left as-is)

- `workout_block_assignments` — business table for assignment flow, not referenced in src/ code that we are renaming
- `workout_exercise_assignments` — references `workout_block_exercises.id`, left as-is
- `client_workout_blocks` — separate client-copy table, not the template table
- `client_workout_block_exercises` — separate client-copy table, not the template table

---

## Enum type

- Old: `workout_block_type`
- New: `workout_set_type`
- Values (unchanged): `straight_set`, `superset`, `giant_set`, `drop_set`, `cluster_set`, `rest_pause`, `pyramid_set`, `ladder`, `pre_exhaustion`, `amrap`, `emom`, `tabata`, `circuit`, `for_time`, `hr_sets`

---

## RLS policies dropped and recreated by the migration

### On workout_blocks (7 policies)
1. Clients can read assigned workout blocks
2. Clients can view blocks in assigned workouts
3. Coaches can delete blocks from their templates
4. Coaches can insert blocks into their templates
5. Coaches can manage workout blocks
6. Coaches can update blocks in their templates
7. Coaches can view blocks in their templates

### On workout_block_exercises (6 policies)
1. Clients can read assigned workout block exercises
2. Clients can view exercises in assigned workouts
3. Coaches can delete exercises from their blocks
4. Coaches can insert exercises into their blocks
5. Coaches can update exercises in their blocks
6. Coaches can view exercises in their blocks

### On workout_block_completions (4 policies)
1. Clients select own block completions
2. Clients insert own block completions
3. Clients update own block completions
4. Clients delete own block completions

### On special tables (all reference workout_blocks wb in USING/WITH CHECK)
- workout_cluster_sets: 5 policies
- workout_time_protocols: 5 policies
- workout_rest_pause_sets: 5 policies
- workout_hr_sets: 2 policies
- workout_ladder_sets: 4 policies
- workout_drop_sets: 5 policies
- workout_pyramid_sets: 4 policies

---

## columns renamed in workout_set_logs

| old column | new column    | nullable |
|------------|---------------|----------|
| block_id   | set_entry_id  | YES (no FK) |
| block_type | set_type      | YES (text)  |

## columns renamed in program_progression_rules

| old column  | new column    | nullable |
|-------------|---------------|----------|
| block_id    | set_entry_id  | YES (no FK) |
| block_type  | set_type      | NO (text)   |
| block_order | set_order     | NO (integer)|
| block_name  | set_name      | YES (text)  |

---

## Special tables: block_id → set_entry_id

All 7 tables have `block_id` renamed to `set_entry_id`:
- workout_drop_sets
- workout_cluster_sets
- workout_rest_pause_sets
- workout_pyramid_sets
- workout_ladder_sets
- workout_time_protocols
- workout_hr_sets
