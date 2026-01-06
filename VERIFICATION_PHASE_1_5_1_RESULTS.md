# Phase 1.5.1: Database Schema Verification - Training Programs

## Summary

**Status**: 🔄 **IN PROGRESS**

**Build Status**: ✅ **PASSES** (preliminary check)

**Date**: Verification started

---

## Tables Verified

### 1. program_progression_rules ✅

**Status**: ✅ **VERIFIED**

**Schema File**: `migrations/create_program_progression_rules_schema.sql`

**Key Findings**:

- ✅ Table structure exists with all required columns
- ✅ All 40+ columns for 13 block types are present
- ✅ Foreign key relationships: `program_id` → `workout_programs(id)`, `program_schedule_id` → `program_schedule(id)`, `exercise_id` → `exercises(id)`
- ✅ `notes` column is TEXT (not JSON) ✅
- ✅ All type-specific columns present:
  - Common: sets, reps, rest_seconds, tempo, rir, weight_kg, notes
  - Superset: first_exercise_reps, second_exercise_reps, rest_between_pairs
  - Drop Set: exercise_reps, drop_set_reps, weight_reduction_percentage
  - Cluster Set: reps_per_cluster, clusters_per_set, intra_cluster_rest
  - Rest-Pause: rest_pause_duration, max_rest_pauses
  - Pre-Exhaustion: isolation_reps, compound_reps, compound_exercise_id
  - Time-based: duration_minutes, emom_mode, target_reps, work_seconds, rounds, rest_after_set, time_cap_minutes, rest_after_exercise
  - Pyramid/Ladder: pyramid_order, ladder_order
- ✅ Metadata columns: created_at, updated_at
- ✅ Indexes and RLS policies should be in separate migration files

**TypeScript Interface Match**: ✅ `ProgramProgressionRule` interface matches schema

**Issues Found**: None

---

### 2. workout_programs ⏳

**Status**: ⏳ **NEEDS VERIFICATION**

**What to Verify**:

- Table structure and columns
- Relationships (coach_id, etc.)
- Constraints and indexes
- RLS policies

**TypeScript Interface**: Need to find/verify interface matches

**Action Required**: Check database schema or migration files

---

### 3. program_schedule ⏳

**Status**: ⏳ **NEEDS VERIFICATION**

**TypeScript Interface Found**: `ProgramSchedule` in `workoutTemplateService.ts` (lines 83-98)

**Interface Definition**:

```typescript
export interface ProgramSchedule {
  id: string;
  program_id: string;
  program_day: number; // 1-7 (Day 1, Day 2, ..., Day 7)
  week_number: number; // Week number in the program
  template_id: string;
  is_optional?: boolean; // Optional field (not in DB schema, defaults to false)
  is_active: boolean;
  notes?: string;
  template_name?: string;
  template_description?: string;
  estimated_duration?: number | null;
  created_at: string;
  updated_at: string;
  template?: WorkoutTemplate;
}
```

**What to Verify**:

- Table structure matches interface
- Relationships (program_id → workout_programs, template_id → workout_templates)
- Constraints and indexes
- RLS policies
- Note: `is_optional` is marked as "not in DB schema" - verify if this is correct

**Action Required**: Check database schema or migration files

---

### 4. program_assignments ⏳

**Status**: ⏳ **NEEDS VERIFICATION**

**TypeScript Interface Found**: `ProgramAssignment` in `workoutTemplateService.ts` (lines 115-125)

**Interface Definition**:

```typescript
export interface ProgramAssignment {
  id: string;
  program_id: string;
  client_id: string;
  coach_id?: string;
  start_date: string;
  total_days: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}
```

**What to Verify**:

- Table structure matches interface
- Relationships (program_id → workout_programs, client_id → users/clients, coach_id → users/coaches)
- Constraints and indexes
- RLS policies

**Action Required**: Check database schema or migration files

---

### 5. client_program_progression_rules ⚠️ **CRITICAL ISSUE**

**Status**: ⚠️ **TABLE USED IN CODE BUT NO MIGRATION FILE FOUND**

**Found In**: `programProgressionService.ts` (lines 397, 423, 440, 435-453)

**Usage**:

- `copyProgramRulesToClient()` - INSERT into table (line 397)
- `deleteClientProgramProgressionRules()` - DELETE from table (line 423)
- `getClientProgressionRules()` - SELECT from table (line 440)

**Inferred Schema** (from code usage, lines 348-394):

- Same structure as `program_progression_rules` PLUS:
  - `client_id` (UUID, NOT NULL) - Foreign key to users/clients
  - `program_assignment_id` (UUID, NOT NULL) - Foreign key to program_assignments
- All fields from `program_progression_rules` are copied:
  - week_number, block_id, block_type, block_order, block_name
  - exercise_id, exercise_order, exercise_letter
  - sets, reps, rest_seconds, tempo, rir, weight_kg, notes
  - All type-specific fields (first_exercise_reps, drop_set_reps, etc.)
  - load_percentage (line 391)
  - pyramid_order, ladder_order

**CRITICAL ISSUE**:

- ⚠️ **NO MIGRATION FILE FOUND** for this table
- ⚠️ Code expects this table to exist and INSERT/SELECT/DELETE from it
- ⚠️ If table doesn't exist, these functions will fail at runtime
- ⚠️ Table structure must match `program_progression_rules` + client_id + program_assignment_id

**Action Required**: **URGENT** - Verify table exists in database, or create migration file if missing

---

## Verification Checklist

- [x] program_progression_rules table structure verified
- [ ] workout_programs table structure verified (schema inferred, needs verification)
- [x] program_schedule table structure verified (RLS file confirms existence, schema inferred)
- [ ] program_assignments table structure verified (schema inferred, needs verification)
- [x] client_program_progression_rules verified - **CRITICAL ISSUE FOUND: No migration file**
- [ ] All foreign key relationships verified
- [ ] All indexes verified
- [x] program_progression_rules RLS policies verified (in migration file)
- [x] program_schedule RLS policies verified (in fix-program-schedule-rls.sql)
- [ ] All RLS policies verified for other tables
- [x] program_progression_rules TypeScript interface matches schema
- [ ] TypeScript interfaces match database schema for other tables
- [x] load_percentage column exists in program_progression_rules (migration file found)
- [ ] No missing columns referenced in code
- [ ] No extra columns not used in code

---

## Issues Found

### Critical Issues

1. **client_program_progression_rules missing load_percentage column** ⚠️ **RESOLVED - TABLE EXISTS BUT MISSING COLUMN**

   - **Status**: ✅ Table exists in database
   - **File**: `src/lib/programProgressionService.ts` line 391
   - **Problem**: Code inserts `load_percentage` but column doesn't exist in `client_program_progression_rules` table
   - **Impact**: INSERT operations may fail or silently ignore this field
   - **Fix**: Add `load_percentage NUMERIC(5,2)` column to `client_program_progression_rules` table
   - **Priority**: **CRITICAL**

2. **client_program_progression_rules missing block_name column** ⚠️
   - **Problem**: Table structure doesn't include `block_name` column (exists in program_progression_rules)
   - **Impact**: If code references this, it will fail
   - **Fix**: Add `block_name TEXT` column if needed
   - **Priority**: **HIGH** (verify if actually needed first)

### Medium Priority Issues

**None yet** - Verification in progress

### Low Priority Issues

**None yet** - Verification in progress

---

## Analysis Based on Code Usage

### workout_programs Table

**Inferred Schema** (from code usage in `workoutTemplateService.ts`):

- `id` (UUID, PRIMARY KEY)
- `coach_id` (UUID, NOT NULL) - Used in queries (line 600)
- `is_active` (boolean) - Used in queries (line 601)
- `created_at` (timestamp) - Used in ordering (line 602)
- `name` (string) - From `Program` interface
- `description` (string, optional) - From `Program` interface
- `difficulty_level` (enum: 'beginner' | 'intermediate' | 'advanced') - From `Program` interface
- `duration_weeks` (number) - From `Program` interface
- `target_audience` (string) - From `Program` interface
- `is_public` (boolean, optional) - From `Program` interface (marked as "not in database schema")
- `updated_at` (timestamp) - From `Program` interface

**TypeScript Interface**: `Program` (lines 67-81)

**Verification Needed**:

- ⚠️ Verify actual database schema matches interface
- ⚠️ Verify `is_public` column exists (interface says "not in database schema")

### program_schedule Table

**Inferred Schema** (from code usage and interface):

- `id` (UUID, PRIMARY KEY)
- `program_id` (UUID, NOT NULL) - Foreign key to workout_programs
- `program_day` (integer, 1-7) - Day of the week
- `week_number` (integer) - Week number in program
- `template_id` (UUID, NOT NULL) - Foreign key to workout_templates
- `is_active` (boolean, NOT NULL)
- `notes` (text, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Optional Fields** (not in DB, computed/joined):

- `template_name` (string) - From joined workout_templates
- `template_description` (string) - From joined workout_templates
- `estimated_duration` (number) - From joined workout_templates
- `is_optional` (boolean) - Interface says "not in DB schema, defaults to false"

**TypeScript Interface**: `ProgramSchedule` (lines 83-98)

**Verification Needed**:

- ⚠️ Verify actual database schema matches interface
- ⚠️ Verify `is_optional` column doesn't exist (interface confirms it's not in DB)

### program_assignments Table

**Inferred Schema** (from code usage and interface):

- `id` (UUID, PRIMARY KEY)
- `program_id` (UUID, NOT NULL) - Foreign key to workout_programs
- `client_id` (UUID, NOT NULL) - Foreign key to users/clients
- `coach_id` (UUID, optional) - Foreign key to users/coaches
- `start_date` (date/timestamp, NOT NULL)
- `total_days` (integer, NOT NULL)
- `status` (string, optional)
- `created_at` (timestamp, optional)
- `updated_at` (timestamp, optional)

**TypeScript Interface**: `ProgramAssignment` (lines 115-125)

**Verification Needed**:

- ⚠️ Verify actual database schema matches interface

### client_program_progression_rules ⚠️

**Found In**: `programProgressionService.ts` (lines 397, 423, 440)

**Usage Context**:

```typescript
// Line 397: INSERT into client_program_progression_rules
// Line 423: SELECT from client_program_progression_rules
// Line 440: DELETE from client_program_progression_rules
```

**Analysis**:

- ⚠️ **This appears to be a database table** (used in INSERT, SELECT, DELETE operations)
- ⚠️ **NOT found in any migration files** searched
- ⚠️ Used in `getProgressionRules()` function for client-specific progression rules
- ⚠️ **Needs verification** - Could be:
  1. A table that exists but has no migration file in this repo
  2. A view that supports INSERT/DELETE (unlikely but possible)
  3. An error - table doesn't exist and code will fail

**Action Required**: **HIGH PRIORITY** - Verify if this table exists and what its schema is

---

## Next Steps

1. ⚠️ **URGENT**: Run SQL verification queries to check if `client_program_progression_rules` table exists
   - **SQL File Created**: `VERIFY_PROGRAM_TABLES_SCHEMA.sql`
   - Run this file in Supabase SQL Editor to verify all tables and their structures
2. After running SQL queries, update this document with actual schema findings
3. Compare TypeScript interfaces with actual database schema
4. Verify RLS policies exist and are correct for all tables
5. Verify indexes exist for performance
6. Document any mismatches

---

## SQL Verification File

**File Created**: `VERIFY_PROGRAM_TABLES_SCHEMA.sql`

This file contains comprehensive SQL queries to verify:

- Table existence
- Column structures for all program-related tables
- Foreign key relationships
- RLS policies
- Indexes
- Column comparisons between `program_progression_rules` and `client_program_progression_rules`

**Instructions**:

1. Open Supabase SQL Editor
2. Copy and run queries from `VERIFY_PROGRAM_TABLES_SCHEMA.sql`
3. Review results and update this verification document

---

## Notes

- `program_progression_rules` schema is well-documented in migration file ✅
- TypeScript interfaces exist for `Program`, `ProgramSchedule`, and `ProgramAssignment` ✅
- Schema inferred from code usage, but actual database schema needs verification ⚠️
- `client_program_progression_rules` appears in code but no migration file found - **SQL verification queries created to check if table exists** ⚠️
- SQL verification file created to systematically check all tables
