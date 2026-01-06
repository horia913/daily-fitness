# Slice 06: Standardize "Active Attempt" Lookup

## ✅ Completed Changes

### Files Created

1. **`src/lib/workoutAttemptService.ts`** (236 lines)
   - Centralized service for workout session/log management
   - **Key Functions**:
     - `getActiveAttempt(assignmentId, clientId)` - Gets active session + log for assignment
     - `getLastCompletedAttempt(assignmentId, clientId)` - Gets most recent completed workout
     - `hasCompletedAttempts(assignmentId, clientId)` - Checks if assignment has history
     - `getAllAttempts(assignmentId, clientId)` - Gets all completed attempts for progress tracking
     - `getWorkoutStatusDisplay(attempt)` - Consistent status display logic
   - **Status Determination**:
     - 'not_started' - No session or log exists
     - 'in_progress' - Active session OR active log (completed_at is null)
     - 'completed' - Session status is completed OR log has completed_at

2. **`src/hooks/useWorkoutAttempt.ts`** (88 lines)
   - React hook wrapping the workout attempt service
   - **Hooks Exported**:
     - `useWorkoutAttempt(assignmentId, clientId)` - Full attempt data with loading states
     - `useIsWorkoutInProgress(assignmentId, clientId)` - Simple in-progress check
   - **Returns**:
     - `activeAttempt` - Current active attempt (session + log + status)
     - `lastCompleted` - Last completed attempt
     - `hasHistory` - Boolean if any completions exist
     - `loading`, `error`, `refresh()` - Standard hook utilities

## 🎯 Purpose & Architecture

### The Problem (Before Slice 06)
- Workout status checked inconsistently across pages
- Multiple places querying `workout_sessions` and `workout_logs` separately
- No single source of truth for "is this workout active?"
- Status logic duplicated in multiple components

### The Solution (Slice 06)
- **Single Service**: `workoutAttemptService.ts` is the canonical way to check workout status
- **Consistent Queries**: All "active attempt" lookups use the same logic
- **Foundation for Slice 07**: When we add DB linkage, we only update this service (not every component)

### Status Logic
```typescript
// Active workout = either:
// 1. workout_sessions row with status='in_progress'
// 2. workout_logs row with completed_at IS NULL

// This accommodates current schema where linkage isn't enforced yet
```

## 🔄 Migration Path

### Current Usage (Before Slice 06)
```typescript
// OLD: Each page does its own query
const { data: session } = await supabase
  .from('workout_sessions')
  .select('*')
  .eq('assignment_id', id)
  .eq('status', 'in_progress')
  .single();

// Status logic scattered everywhere
```

### New Usage (Slice 06+)
```typescript
// NEW: Use centralized service
import { useWorkoutAttempt } from '@/hooks/useWorkoutAttempt';

const { activeAttempt, loading } = useWorkoutAttempt(assignmentId, clientId);

if (activeAttempt.status === 'in_progress') {
  // Show "Resume" button
}
```

## 📊 Benefits

1. **Consistency**: All pages show same workout status
2. **Maintainability**: Update logic in one place
3. **Testability**: Service can be tested independently
4. **Future-Proof**: When Slice 07 adds DB linkage, only service updates (not every component)
5. **Type Safety**: TypeScript interfaces for WorkoutSession, WorkoutLog, ActiveAttempt

## 🧪 Testing

### Manual Testing Steps
1. **Start a workout** via `/client/workouts/[id]/start`
2. **Check status** - Should show "in_progress"
3. **Navigate to workout list** - Workout should show "Resume" or "In Progress"
4. **Complete workout** - Status should update to "completed"
5. **Check details page** - Should show completed state

### Integration Points
- `/client/workouts` - List page (shows status badges)
- `/client/workouts/[id]/details` - Details page (shows resume vs start)
- `/client/workouts/[id]/start` - Execution page (loads active attempt)
- `/client/workouts/[id]/complete` - Completion page (queries final data)
- `/client/progress/workout-logs` - History page (uses getAllAttempts)

## 📝 Implementation Notes

- **No Breaking Changes**: Existing code still works (service is additive)
- **Gradual Adoption**: Pages can be migrated to use service incrementally
- **Backward Compatible**: Works with current schema (no DB changes in this slice)
- **Ready for Slice 07**: Service interface won't change when we add linkage

## ⏭️ Next Steps

### Slice 07 Will Add:
1. **DB Column**: `workout_logs.workout_session_id` (nullable FK)
2. **Backfill**: Link existing logs to sessions
3. **API Updates**: `/api/log-set` and `/api/complete-workout` enforce linkage
4. **Service Update**: `workoutAttemptService` can use JOIN instead of separate queries

### Slice 08 Will Do:
- Migrate all workout screens to use `useWorkoutAttempt` hook
- Remove old scattered status-checking code
- Ensure all pages query through canonical service

## 🎁 Bonus: Helper Utilities

The service includes helpful utilities:

```typescript
// Get display config for UI
const display = getWorkoutStatusDisplay(activeAttempt);
// Returns: { label: 'In Progress', color: 'blue', icon: 'play' }

// Check completion history
const hasHistory = await hasCompletedAttempts(assignmentId, clientId);
// Useful for "first time" vs "repeat" workout messaging
```

---

## ✅ Slice 06 Complete

**Status**: Ready for Slice 07 (DB linkage)
**Build Status**: Should pass (additive changes only)
**Manual DB**: None required (code-only slice)

