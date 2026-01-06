# Phase 1.5: Backend Verification - Training Programs

## Overview

This phase verifies the backend infrastructure for training programs, including database schema, service layer, and API routes. This ensures the foundation is solid before verifying the frontend (Phase 3).

## Structure

Following the same structure as Phase 1:

- **1.5.1**: Database Schema Verification
- **1.5.2**: Service Layer Verification  
- **1.5.3**: API/Route Verification

---

## 1.5.1: Database Schema Verification

### Purpose
Verify all training program-related database tables have correct structure, columns, relationships, and constraints.

### Tables to Verify

#### Primary Tables
1. **workout_programs**
   - Structure and columns
   - Relationships (coach_id, etc.)
   - Constraints and indexes
   - RLS policies

2. **program_schedule**
   - Structure and columns
   - Relationships (program_id, template_id, etc.)
   - Constraints and indexes
   - RLS policies

3. **program_assignments**
   - Structure and columns
   - Relationships (program_id, client_id, schedule_id, etc.)
   - Constraints and indexes
   - RLS policies

4. **program_progression_rules**
   - Structure and columns (all 40+ columns for 13 block types)
   - Relationships (program_id, program_schedule_id, exercise_id, etc.)
   - Constraints and indexes
   - RLS policies
   - Verify NO JSON in notes field (TEXT only)

#### Related Tables
5. **workout_assignments** (if used by programs)
6. **workout_logs** (if related to program execution)
7. Any other program-related tables

### Verification Checklist

- [ ] All tables exist with correct structure
- [ ] All required columns exist
- [ ] Column types match TypeScript interfaces
- [ ] Foreign key relationships are correct
- [ ] Indexes exist for performance
- [ ] RLS policies are configured correctly
- [ ] Constraints (NOT NULL, UNIQUE, etc.) are correct
- [ ] program_progression_rules has all columns for all 13 block types
- [ ] program_progression_rules.notes is TEXT (not JSON)
- [ ] No missing columns referenced in code
- [ ] No extra columns not used in code

### Stop and Assess Point 1.5.1
After database schema verification, document any schema mismatches before proceeding.

**Build Verification**: Run `npm run build` to ensure no build errors. Fix any build errors before proceeding.

---

## 1.5.2: Service Layer Verification

### Purpose
Verify all service functions for training programs work correctly, handle data correctly, and match database schema.

### Services to Verify

1. **ProgramProgressionService** (`src/lib/programProgressionService.ts`)
   - `copyWorkoutToProgram()` - Copies workout template data to program_progression_rules
   - `getProgressionRules()` - Loads rules with Week 1 auto-populate
   - `updateProgressionRule()` - Updates specific fields
   - `createProgressionRule()` - Creates new rules (for Week 2+ edits)
   - `replaceExercise()` - Swaps exercise keeping other params
   - `replaceWorkout()` - Replaces entire workout
   - `deleteProgressionRules()` - Cleanup helper
   - All 13 block types are supported correctly

2. **WorkoutTemplateService** (`src/lib/workoutTemplateService.ts`)
   - Program-related functions (if any)
   - Program schedule functions
   - Program assignment functions

3. **Any other program-related services**

### Verification Checklist

- [ ] All service functions exist
- [ ] Function signatures match usage
- [ ] Functions use correct table/column names
- [ ] Functions handle all block types correctly
- [ ] Functions handle errors correctly
- [ ] Functions use correct data types
- [ ] copyWorkoutToProgram() copies ALL data correctly
- [ ] getProgressionRules() auto-populates Week 1 correctly
- [ ] updateProgressionRule() updates fields correctly
- [ ] replaceExercise() and replaceWorkout() work correctly
- [ ] No references to non-existent columns
- [ ] No references to deprecated fields
- [ ] TypeScript interfaces match database schema

### Stop and Assess Point 1.5.2
After service layer verification, document any service issues before proceeding.

**Build Verification**: Run `npm run build` to ensure no build errors. Fix any build errors before proceeding.

---

## 1.5.3: API/Route Verification

### Purpose
Verify all API routes that use training program data work correctly and use services correctly.

### Routes to Verify

- API routes in `src/app/api/` that handle:
  - Program creation/editing
  - Program schedule management
  - Program assignments
  - Program progression rules
  - Any other program-related operations

### Verification Checklist

- [ ] All API routes exist
- [ ] Routes use correct services
- [ ] Routes handle authentication correctly
- [ ] Routes handle errors correctly
- [ ] Routes return correct data structures
- [ ] Routes validate input correctly
- [ ] No broken references to services/functions

### Stop and Assess Point 1.5.3
After API/route verification, document any route issues.

**Build Verification**: Run `npm run build` to ensure no build errors. Fix any build errors before proceeding.

**END OF PHASE 1.5** - Review all backend issues before proceeding to Phase 3 (Frontend Verification - Training Programs).

---

## Expected Outcomes

1. Complete understanding of training program database schema
2. Verification that all services work correctly
3. Verification that all API routes work correctly
4. Documentation of any issues found
5. Build passes without errors

## Files to Create

- `VERIFICATION_PHASE_1_5_1_RESULTS.md` - Database schema verification results
- `VERIFICATION_PHASE_1_5_2_RESULTS.md` - Service layer verification results
- `VERIFICATION_PHASE_1_5_3_RESULTS.md` - API/route verification results
- Update `VERIFICATION_ISSUES_DOCUMENTED.md` with any issues found

