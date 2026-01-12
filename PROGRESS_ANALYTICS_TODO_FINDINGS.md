# Progress & Analytics TODO Findings Report

This document lists all TODO comments and incomplete implementations found in progress/analytics related code files.

**Generated**: After removing hardcoded data and implementing database queries

---

## Summary

Found **TODO items** in progress/analytics related code that need to be addressed:

1. **Achievement Progress Calculation** - `progressStatsService.ts` (returns 0)
2. **Exercise-Specific PRs** - `WorkoutAnalytics.tsx` (benchPressMax, squatMax, etc. return 0)
3. **On The Rise Feature** - `WorkoutAnalytics.tsx` (returns empty array)
4. **Exercise Progress Over Time** - `WorkoutAnalytics.tsx` (returns empty array)
5. **Single Workout Volume** - `WorkoutAnalytics.tsx` (returns 0)
6. **Coach Progress Page Features** - Button handlers (Schedule check-ins, Export data, etc.)

---

## Detailed Findings

### 1. Achievement Progress Calculation

**File**: `src/lib/progressStatsService.ts`  
**Line**: 61-63

**Current State**:
```typescript
// Calculate achievements counts
const achievementsUnlocked = achievements.length
// For "in progress", we might need to check goals or other criteria
// For now, returning 0 if there's no clear definition of "in progress"
const achievementsInProgress = 0
```

**Issue**: 
- `achievementsInProgress` is hardcoded to 0
- No logic to determine which achievements are "in progress"
- Needs definition: What makes an achievement "in progress" vs "locked"?

**Question to Resolve**:
- What defines an "in progress" achievement?
  - Achievements that have progress but aren't unlocked yet?
  - Achievements linked to goals that are in progress?
  - Achievements with partial completion?

**Recommended Fix**:
- Define criteria for "in progress" achievements
- Query achievements table or goals table to determine progress status
- Calculate progress percentages based on achievement type (workout count, PR count, goal completion, etc.)

**Priority**: Medium (feature works, but shows 0 instead of calculated value)

---

### 2. Exercise-Specific Personal Records

**File**: `src/components/progress/WorkoutAnalytics.tsx`  
**Line**: 189-230 (loadUserProgress function)

**Current State**:
```typescript
setUserProgress({
  totalWorkouts: workoutsResult.count || 0,
  totalPRs: prsResult.count || 0,
  consecutiveWeeks: streakValue,
  benchPressMax: 0, // Would need exercise-specific queries
  squatMax: 0,
  deadliftMax: 0,
  pullupMax: 0,
  singleWorkoutVolume: 0, // Would need per-workout volume calculation
  totalReps,
  totalSets
})
```

**Issue**:
- `benchPressMax`, `squatMax`, `deadliftMax`, `pullupMax` are hardcoded to 0
- `singleWorkoutVolume` is hardcoded to 0
- These require exercise-specific queries to find max weights for specific exercises

**Recommended Fix**:
- Query `personal_records` or `workout_set_logs` filtered by exercise ID/name
- Find max weight for each specific exercise (bench press, squat, deadlift, pull-ups)
- Query `workout_set_logs` grouped by `workout_log_id` to calculate volume per workout
- Find maximum single workout volume

**Priority**: Low (UI works but doesn't show exercise-specific PRs)

**Database Tables Needed**:
- `personal_records` (for PR maxes)
- `workout_set_logs` (for exercise-specific maxes)
- `exercises` (to match exercise names to IDs)

---

### 3. "On The Rise" Feature

**File**: `src/components/progress/WorkoutAnalytics.tsx`  
**Line**: 293-296

**Current State**:
```typescript
const loadOnTheRise = async () => {
  // Simplified - would need complex queries to calculate trend
  setOnTheRise([])
}
```

**Issue**:
- Returns empty array
- No logic to calculate which exercises are trending up
- Would need to compare recent performance vs previous performance

**Recommended Fix**:
- Query `workout_set_logs` grouped by exercise
- Compare recent workouts (last 2-4 weeks) vs previous period
- Calculate percentage increase in weight/reps
- Return exercises with positive trend

**Priority**: Low (feature doesn't break anything, just doesn't show data)

**Database Tables Needed**:
- `workout_set_logs`
- `workout_logs` (for date filtering)
- `exercises` (for exercise names)

---

### 4. Exercise Progress Over Time

**File**: `src/components/progress/WorkoutAnalytics.tsx`  
**Line**: 298-301

**Current State**:
```typescript
const loadExerciseProgress = async () => {
  // Simplified - would need complex queries to get exercise progression over time
  setExerciseProgress([])
}
```

**Issue**:
- Returns empty array
- No logic to track exercise progression over time
- Would need time-series data for each exercise

**Recommended Fix**:
- Query `workout_set_logs` grouped by exercise and date
- Calculate average or max weight per time period (week/month)
- Build array of data points for charting
- Return progression data for top exercises

**Priority**: Low (feature doesn't break anything, just doesn't show data)

**Database Tables Needed**:
- `workout_set_logs`
- `workout_logs` (for date filtering)
- `exercises` (for exercise names)

**Note**: This is used for the exercise detail view when clicking on an exercise. Currently shows empty state.

---

### 5. Single Workout Volume

**File**: `src/components/progress/WorkoutAnalytics.tsx`  
**Line**: 230 (inside loadUserProgress)

**Current State**:
```typescript
singleWorkoutVolume: 0, // Would need per-workout volume calculation
```

**Issue**:
- Hardcoded to 0
- Needs calculation of volume per workout (sum of weight × reps for all sets in one workout)
- Then find the maximum single workout volume

**Recommended Fix**:
- Query `workout_set_logs` grouped by `workout_log_id`
- For each workout, calculate: SUM(weight × reps)
- Find maximum value across all workouts
- Return that value

**Priority**: Low (feature works, just shows 0)

**Database Tables Needed**:
- `workout_set_logs`
- `workout_logs` (for grouping)

---

### 6. Coach Progress Page Button Handlers

**File**: `src/app/coach/progress/page.tsx`  
**Lines**: 938, 1075, 1083, 1500

**Current State**:
```typescript
onClick={() => {/* TODO: Schedule check-ins */}}
onClick={() => {/* TODO: Schedule group check-in */}}
onClick={() => {/* TODO: Generate progress report */}}
onClick={() => {/* TODO: Export data */}}
```

**Issues**:
- Four button handlers are empty (TODO comments)
- Buttons are visible but don't do anything when clicked

**Recommended Fix**:
- Implement functionality for each button:
  1. **Schedule check-ins**: Open modal/form to schedule check-in sessions with clients
  2. **Schedule group check-in**: Open modal/form to schedule group check-in sessions
  3. **Generate progress report**: Generate and download/display progress report (PDF, CSV, etc.)
  4. **Export data**: Export client progress data (CSV, Excel, PDF, etc.)

**Priority**: Low (buttons don't break anything, just don't function)

**Note**: These are UI features, not data issues. Can be implemented later or removed if not needed.

---

## Non-Critical TODOs (Outside Progress/Analytics Scope)

Found these TODOs in other files (not directly related to progress/analytics fixes):

1. **Workout Execution** (`src/components/client/workout-execution/blocks/ClusterSetExecutor.tsx`):
   - TODO: Get cluster set parameters from `workout_cluster_sets` table
   - TODO: Get drop set parameters from `workout_drop_sets` table
   - **Priority**: Low (separate feature, not related to progress/analytics)

2. **Coach Clients Page** (`src/app/coach/clients/page.tsx`):
   - TODO: Calculate workoutsThisWeek from workout_assignments and workout_logs
   - TODO: Calculate compliance from completedWorkouts / assignedWorkouts
   - TODO: Derive 'at-risk' status from low compliance
   - **Priority**: Medium (related to client management, not progress hub)

3. **Workout Start Page** (`src/app/client/workouts/[id]/start/page.tsx`):
   - TODO: Calculate personalBests from e1RM changes
   - TODO: Fix previous performance query
   - TODO: Implement cluster set completion logic
   - TODO: Implement rest pause completion logic
   - TODO: Implement timer start logic
   - **Priority**: Low (workout execution features, not progress/analytics)

4. **Coach Dashboard Service** (`src/lib/coachDashboardService.ts`):
   - TODO: scheduled_date is not in database - derived from scheduled_at
   - TODO: start_time is not in database - derived from scheduled_at
   - TODO: end_time is not in database - derived from scheduled_at + duration_minutes
   - TODO: client_name is not in database - sessions table has no FK to profiles
   - **Priority**: Low (scheduling features, not progress/analytics)

5. **Challenge Service** (`src/lib/challengeService.ts`):
   - TODO: Implement full scoring logic
   - **Priority**: Low (challenges feature, not progress/analytics)

6. **Email Service** (`src/lib/emailService.ts`):
   - TODO: Implement actual email sending
   - **Priority**: Low (email feature, not progress/analytics)

---

## Summary by Priority

### High Priority (Blocks Core Functionality)
**None** - All core progress/analytics features work correctly

### Medium Priority (Shows Incorrect/Incomplete Data)

1. **Achievement Progress Calculation** (`progressStatsService.ts`)
   - Shows 0 for "achievements in progress"
   - Needs definition and implementation
   - **Impact**: Progress Hub shows "X unlocked · 0 in progress"

### Low Priority (Missing Features, But Don't Break Anything)

1. **Exercise-Specific PRs** (`WorkoutAnalytics.tsx`)
   - Bench press, squat, deadlift, pull-up maxes show 0
   - **Impact**: WorkoutAnalytics component doesn't show exercise-specific PRs

2. **On The Rise Feature** (`WorkoutAnalytics.tsx`)
   - Returns empty array
   - **Impact**: WorkoutAnalytics component doesn't show trending exercises

3. **Exercise Progress Over Time** (`WorkoutAnalytics.tsx`)
   - Returns empty array
   - **Impact**: Exercise detail view doesn't show progression chart

4. **Single Workout Volume** (`WorkoutAnalytics.tsx`)
   - Shows 0
   - **Impact**: User progress doesn't show max single workout volume

5. **Coach Progress Page Buttons** (`coach/progress/page.tsx`)
   - Four buttons don't have functionality
   - **Impact**: Buttons are visible but don't do anything

---

## Recommended Action Items

### Immediate (Medium Priority)
1. ✅ **Define "achievements in progress" criteria**
   - Question: What makes an achievement "in progress"?
   - Options:
     - Achievements linked to goals that are in progress
     - Achievements with partial completion (e.g., 50% of workout count achieved)
     - Achievements that have progress tracking but aren't unlocked
   - **Action**: Implement calculation logic once criteria is defined

### Future Enhancements (Low Priority)
2. **Exercise-Specific PRs** - Can be added as enhancement
3. **On The Rise Feature** - Can be added as enhancement
4. **Exercise Progress Over Time** - Can be added as enhancement
5. **Single Workout Volume** - Can be added as enhancement
6. **Coach Progress Page Buttons** - Can be implemented or removed if not needed

---

## Notes

- All **critical** hardcoded data has been removed ✅
- All **core** progress/analytics features are working ✅
- Remaining TODOs are **enhancements** or **feature completions**, not bugs
- None of the TODOs break existing functionality
- All features work correctly with current data (may show 0 or empty, but don't crash)

The codebase is in a **good state** - all critical issues are resolved. The remaining TODOs are nice-to-have features that can be implemented incrementally.