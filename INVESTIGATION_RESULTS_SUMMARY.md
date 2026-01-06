# JSON Refactoring Investigation Results Summary

## Overview

This document summarizes the results from running the investigation SQL queries and provides recommendations for the migration strategy.

## JSON Column Inventory Results

### Tables with JSON Columns

| Table | JSON Columns | Rows with Data | Status |
|-------|-------------|----------------|--------|
| `exercises` | 4 (muscle_groups, equipment_types, instructions, tips) | 18 rows, all empty arrays `[]` | ✅ Ready for migration (no data to migrate) |
| `workout_blocks` | 1 (block_parameters) | 43 rows with data (100%) | ⚠️ Needs analysis - may be redundant |
| `client_workout_blocks` | 1 (block_parameters) | 13 rows with data (100%) | ⚠️ Needs analysis - may be redundant |
| `client_workout_block_exercises` | 9 (all special set configs) | 0 rows with data (all NULL) | ✅ No migration needed - mark deprecated |
| `workout_set_logs` | 1 (giant_set_exercises) | 3 rows with data, 20 NULL | ✅ Ready for migration |
| `workout_exercise_logs` | 1 (completed_sets) | 0 rows (table empty) | ✅ No migration needed |
| `workout_block_assignments` | 1 (block_parameters) | 0 rows (table empty) | ✅ No migration needed |
| `daily_workout_cache` | 1 (workout_data) | 0 rows (table empty) | ✅ Acceptable as JSON (cache table) |

### Key Findings

1. **Exercises JSON Columns**: All are empty arrays `[]`. Migration will create relational structure but no data to migrate.

2. **block_parameters**: Contains actual data in `workout_blocks` and `client_workout_blocks`. Data includes:
   - `amrap_duration`, `time_cap`, `target_reps`
   - `drop_set_reps`, `drop_percentage`
   - `work_seconds`, `emom_duration`, `emom_reps`
   - `rounds`, `rest_after`, `tabata_sets` (complex nested structure)
   
   **Decision Needed**: Verify if this data is already in relational tables (`workout_time_protocols`, `workout_drop_sets`, etc.). If redundant, deprecate. If missing, migrate.

3. **giant_set_exercises**: Has 3 rows with actual data. Structure:
   ```json
   [
     {
       "exercise_id": "uuid",
       "order": 1,
       "weight": 12,
       "reps": 4
     },
     ...
   ]
   ```
   Migration script updated to handle `order` (not `exercise_order`) and `weight` (not `weight_kg`).

4. **client_workout_block_exercises JSON columns**: All NULL - no migration needed, just deprecation.

## Duplicate Table Investigation Results

### Tables Analyzed

1. **sessions vs booked_sessions**
   - Both exist, both have 0 rows
   - `booked_sessions`: More complex (time_slot_id, ratings, feedback, etc.)
   - `sessions`: Simpler (title, description, scheduled_at, duration_minutes)
   - **Decision**: Keep both - serve different purposes

2. **clip_cards vs clipcards**
   - `clip_cards`: bigint id, simpler, 0 rows (unused/legacy)
   - `clipcards`: uuid id, more fields, 16 rows (active)
   - **Decision**: `clipcards` is canonical, `clip_cards` is deprecated

3. **coach_availability vs coach_time_slots**
   - `coach_availability`: Weekly recurring (day_of_week, start_time, end_time)
   - `coach_time_slots`: Specific dates (date, start_time, end_time, recurring_pattern)
   - **Decision**: Keep both - serve different purposes

## Migration Strategy Updates

### Phase 1: Exercises (✅ Ready)
- Create relational tables
- No data migration needed (all empty)
- Update code to use relational structure

### Phase 2: block_parameters (⚠️ Needs Verification)
- Verify if data in `block_parameters` exists in relational tables
- If redundant: Mark as deprecated
- If missing: Migrate to appropriate relational tables

### Phase 3: giant_set_exercises (✅ Ready)
- Migration script updated to match actual data structure
- Will migrate 3 rows of data

### Phase 4: client_workout_block_exercises (✅ No Action)
- All JSON columns are NULL
- Mark as deprecated, no migration needed

### Phase 5: Duplicate Tables (✅ Resolved)
- `clip_cards`: Mark as deprecated
- `sessions`/`booked_sessions`: Keep both
- `coach_availability`/`coach_time_slots`: Keep both

## Next Steps

1. ✅ Run migration 04 (exercises) - creates structure, no data
2. ⚠️ Verify block_parameters data against relational tables
3. ✅ Run migration 07 (giant_set_exercises) - migrates 3 rows
4. ✅ Add deprecation comments to unused JSON columns
5. ✅ Mark clip_cards as deprecated
6. Update code to use relational structure
7. Test all changes
8. Remove JSON columns in future migration (after code updated)

## Data Volume Summary

- **Total exercises**: 18 (all with empty JSON arrays)
- **Total workout_blocks with block_parameters**: 43
- **Total client_workout_blocks with block_parameters**: 13
- **Total workout_set_logs with giant_set_exercises**: 3
- **Total clipcards (active)**: 16
- **Total clip_cards (unused)**: 0

## Risk Assessment

- **Low Risk**: Exercises migration (no data to migrate)
- **Low Risk**: giant_set_exercises migration (only 3 rows)
- **Medium Risk**: block_parameters (needs verification before action)
- **No Risk**: client_workout_block_exercises (all NULL, just deprecation)

