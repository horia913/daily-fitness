# Phase 1.5 Schema Mismatch Fixes

## Summary

Fixed TypeScript interface mismatches identified during Phase 1.5.1 database schema verification.

---

## Fixes Applied

### 1. program_schedule Interface - NO CHANGE NEEDED ✅

**Issue**: Database has `day_of_week` but interface has `program_day`

**Resolution**: **NO CHANGE** - This is intentional mapping:
- Database column: `day_of_week` (0-based: 0-6)
- TypeScript interface: `program_day` (1-based: 1-7)
- Service layer (`WorkoutTemplateService.getProgramSchedule`) maps `day_of_week + 1` → `program_day`
- Service layer (`WorkoutTemplateService.setProgramSchedule`) maps `program_day - 1` → `day_of_week`

**Rationale**: The interface uses a more user-friendly 1-based system (Day 1-7), while the database uses a 0-based system. The service layer handles the conversion.

**Documentation Updated**: Added comments to interface explaining the mapping.

---

### 2. ProgramAssignment Interface - UPDATED ✅

**Issue**: Interface missing 7 database columns

**Columns Added**:
- `current_day_number?: number` - Current day in the program (default: 1)
- `completed_days?: number` - Number of days completed (default: 0)
- `preferred_workout_days?: number[]` - Array of preferred workout days
- `is_customized?: boolean` - Whether assignment is customized (default: false)
- `name?: string` - Optional assignment name
- `description?: string` - Optional assignment description
- `duration_weeks?: number` - Program duration in weeks

**File**: `src/lib/workoutTemplateService.ts` (ProgramAssignment interface)

**Status**: ✅ **FIXED** - All database columns now represented in TypeScript interface

---

## Build Status

✅ **Build passes** after fixes

---

## Migration Status

✅ **Migration applied** - `add_missing_columns_to_client_program_progression_rules.sql` executed successfully

Added columns to `client_program_progression_rules`:
- `load_percentage NUMERIC(5, 2)`
- `block_name TEXT`

