# Single Active Assignment Implementation

## Overview

This implementation ensures that:
1. **Programs**: A client can only have ONE program assignment at a time. When a new program is assigned, all existing programs for that client are set to status='completed' (preserving progress history).
2. **Meal Plans**: A client can have multiple meal plans assigned, but only ONE can be active at a time. When a new meal plan is set to active, all other active meal plans are deactivated.
3. **Workout Templates**: No changes needed - they are simply assigned (no active status) and clients can complete them voluntarily.

## Implementation Approach

We used a **two-layer defense strategy** for maximum reliability:

### 1. Database Triggers (Primary Defense)
- **File**: `ENFORCE_SINGLE_ACTIVE_ASSIGNMENT.sql`
- **Why**: Prevents bugs even if application code has issues, handles race conditions, ensures data integrity at database level
- **How**: Triggers run BEFORE INSERT/UPDATE to automatically enforce rules

### 2. Application-Level Logic (Secondary Defense)
- **Why**: Provides immediate feedback, cleaner code flow, faster execution
- **How**: Code explicitly deactivates old assignments before creating/updating new ones

## Files Modified

### 1. Database Triggers
- **File**: `ENFORCE_SINGLE_ACTIVE_ASSIGNMENT.sql` (NEW)
  - `enforce_single_program_assignment()` function
  - `enforce_single_active_meal_plan()` function
  - Triggers: `trigger_enforce_single_program_assignment`, `trigger_enforce_single_active_meal_plan`

### 2. Service Layer
- **File**: `src/lib/workoutTemplateService.ts`
  - **Function**: `createProgramAssignment()`
  - **Changes**: 
    - Sets all existing active programs to 'completed' before creating/updating
    - Explicitly sets status='active' for new assignments

- **File**: `src/lib/mealPlanService.ts`
  - **Function**: `assignMealPlanToClients()`
  - **Changes**:
    - Deactivates existing active meal plans for each client before assigning new one
    - Explicitly sets `is_active=true` for new assignments

### 3. UI Layer
- **File**: `src/app/coach/meals/page.tsx`
  - **Function**: `handleAssignMealPlan()`
  - **Changes**:
    - Deactivates existing active meal plans before inserting new one
    - Explicitly sets `is_active=true` for new assignment

## How It Works

### Programs

1. **When a new program is assigned:**
   - Application code sets all existing active programs to `status='completed'`
   - Database trigger also enforces this (as backup)
   - New program is created/updated with `status='active'`
   - Old programs remain in database with `status='completed'` (preserves progress history)

2. **Result:**
   - Only ONE program with `status='active'` per client
   - Coach can see completed programs in history
   - Progress data is preserved

### Meal Plans

1. **When a new meal plan is assigned:**
   - Application code sets all existing active meal plans to `is_active=false`
   - Database trigger also enforces this (as backup)
   - New meal plan is created with `is_active=true`
   - Old meal plans remain in database with `is_active=false`

2. **Result:**
   - Only ONE meal plan with `is_active=true` per client
   - Client can have multiple meal plans assigned (in their list)
   - Only the active one is used for daily meal display

## Database Schema

### program_assignments
- **status** field: `'active' | 'completed' | 'paused' | 'cancelled'`
- **Constraint**: Only one `status='active'` per client (enforced by trigger)

### meal_plan_assignments
- **is_active** field: `boolean`
- **Constraint**: Only one `is_active=true` per client (enforced by trigger)

## Testing

### To Test Programs:
1. Assign Program A to Client X → should be active
2. Assign Program B to Client X → Program A should be 'completed', Program B should be 'active'
3. Query `program_assignments` → should show only ONE active program for Client X

### To Test Meal Plans:
1. Assign Meal Plan A to Client X → should be active (`is_active=true`)
2. Assign Meal Plan B to Client X → Meal Plan A should be inactive (`is_active=false`), Meal Plan B should be active
3. Query `meal_plan_assignments` → should show only ONE active meal plan for Client X

## Next Steps

1. **Run SQL Script**: Execute `ENFORCE_SINGLE_ACTIVE_ASSIGNMENT.sql` in your database to create triggers
2. **Test**: Verify the behavior with the testing steps above
3. **Monitor**: Check application logs for any issues during assignment operations

## Notes

- **Workout Templates**: No changes needed - they don't have active status, clients can complete multiple assigned workouts
- **Data Preservation**: Old program assignments are set to 'completed' (not deleted) to preserve progress history
- **Race Conditions**: Database triggers prevent race conditions where multiple assignments happen simultaneously
- **Backward Compatibility**: Existing code will continue to work, with the added safety of database-level enforcement
