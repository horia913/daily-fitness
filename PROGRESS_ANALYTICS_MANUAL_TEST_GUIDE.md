# Progress & Analytics Manual Test Guide

This guide helps verify all fixes made to remove hardcoded data and connect progress/analytics features to the database.

---

## Prerequisites

1. **Database Setup**: Ensure you have test data in the database:
   - At least one client user with an active program assignment
   - Some workout logs (`workout_logs`)
   - Some program day assignments (`program_day_assignments`)
   - Some personal records (`personal_records`)
   - Some achievements (`achievements`)
   - Some body metrics (`body_metrics`)
   - Some leaderboard entries (`leaderboard_entries`)

2. **Test Accounts**:
   - One client account (to test client-facing pages)
   - One coach account (to test coach-facing pages)

3. **Browser DevTools**: Open browser console to check for errors

---

## Test 1: Client Progress Hub (`/client/progress`)

### What Was Fixed
- Removed all 12 hardcoded stats
- Now uses `getProgressStats()` service to fetch real data

### Test Steps

1. **Login as a client user**
2. **Navigate to `/client/progress`**
3. **Check Browser Console**: Should see no errors related to data fetching

### Verify Each Stat

#### 1.1 Weekly Progress Ring
- **Check**: Weekly workouts completed vs goal
- **Expected**: Shows actual completed workouts this week vs weekly goal from active program
- **Verify**: 
  - If client has active program → Shows correct goal (e.g., 4 workouts/week)
  - If client has no active program → Shows 0/0
  - Completed count should match actual completed workouts this week
- **Data Source**: `program_assignments`, `program_day_assignments`

#### 1.2 Streak (Day Streak)
- **Check**: Flame icon with streak number
- **Expected**: Shows consecutive complete weeks (not days)
- **Verify**: 
  - Should show number of consecutive weeks where ALL workouts in that week are completed
  - If client has incomplete week → streak should reset
- **Data Source**: `program_day_assignments` via `getStreak()` from `programService`

#### 1.3 Total Workouts
- **Check**: Total workouts number
- **Expected**: Shows actual count of completed workout logs
- **Verify**: Count matches number of records in `workout_logs` for this client
- **Data Source**: `workout_logs` table (count query)

#### 1.4 Personal Records
- **Check**: PR count number
- **Expected**: Shows actual count of personal records
- **Verify**: Count matches number of records in `personal_records` for this client
- **Data Source**: `personal_records` table (count query)

#### 1.5 Leaderboard Rank Card
- **Check**: Rank #X of Y athletes
- **Expected**: Shows actual rank from leaderboard entries
- **Verify**: 
  - Rank should match `leaderboard_entries.rank` for this client
  - Total athletes should match distinct count of clients in `leaderboard_entries`
- **Data Source**: `leaderboard_entries` table

#### 1.6 Achievements Card
- **Check**: "X unlocked · Y in progress"
- **Expected**: Shows actual achievement counts
- **Verify**: 
  - Unlocked count matches records in `achievements` table for this client
  - In progress should show 0 (or calculated value if implemented)
- **Data Source**: `achievements` table

#### 1.7 Body Metrics Card
- **Check**: Weight display and change
- **Expected**: Shows latest weight and monthly change
- **Verify**: 
  - Weight should match latest `body_metrics.weight_kg`
  - Weight change should be current month vs previous month
  - If no weight data → Shows "Not recorded"
- **Data Source**: `body_metrics` table

### Edge Cases to Test

1. **No Active Program**: 
   - Weekly goal should show 0/0
   - Streak should show 0
   - Weekly completed should show 0

2. **Program with total_days = 0**:
   - Should not crash (division by zero protection)
   - Weekly goal should show 0
   - Streak should show 0

3. **No Data**:
   - All stats should show 0 (not hardcoded values)
   - No console errors

4. **Empty States**:
   - Weight should show "Not recorded" if null
   - Weight change should not show if no previous month data

---

## Test 2: Achievements Page (`/client/progress/achievements`)

### What Was Fixed
- Removed all 8 hardcoded achievements
- Now queries real achievements from database

### Test Steps

1. **Login as a client user**
2. **Navigate to `/client/progress/achievements`**
3. **Check Browser Console**: Should see no errors

### Verify

#### 2.1 Achievements List
- **Check**: List of achievements displayed
- **Expected**: Shows actual achievements from `achievements` table
- **Verify**:
  - Each achievement shows: title, description, icon, rarity
  - All achievements should show "unlocked: true" (since database stores earned achievements)
  - Achievement dates should match `achieved_date` from database
  - No hardcoded achievements should appear

#### 2.2 Empty State
- **Check**: If client has no achievements
- **Expected**: Shows "No achievements found" message
- **Verify**: No mock/hardcoded achievements appear
- **Data Source**: `achievements` table

#### 2.3 Filters
- **Check**: Filter by rarity and status
- **Expected**: Filters should work correctly
- **Verify**: 
  - Rarity filter works (if multiple rarity types exist)
  - Status filter works (though most should be "unlocked" since database stores earned achievements)

### Edge Cases to Test

1. **No Achievements**: 
   - Should show empty state, not hardcoded achievements
   - Filter counts should show 0

2. **Multiple Achievements**:
   - Should display all achievements from database
   - Should be sorted correctly

---

## Test 3: Personal Records Service

### What Was Fixed
- Removed `getFallbackPersonalRecords()` function
- Changed to query `workout_logs` directly (not via `workout_sessions`)
- Returns empty array on error instead of mock data

### Test Steps

1. **Login as a client user**
2. **Navigate to any page that uses Personal Records** (e.g., `/client/progress/personal-records`)
3. **Check Browser Console**: Should see no errors

### Verify

#### 3.1 Personal Records Display
- **Check**: List of personal records
- **Expected**: Shows actual PRs from database or empty if none
- **Verify**:
  - Should show records from `workout_set_logs` grouped by exercise
  - Each PR should show: exercise name, weight, reps, date
  - No hardcoded PRs (Bench Press 85kg, Squat 120kg, etc.) should appear

#### 3.2 No Personal Records
- **Check**: If client has no workout logs
- **Expected**: Shows empty list (not fallback mock data)
- **Verify**: No hardcoded PRs appear

#### 3.3 Data Source Verification
- **Check**: Database query logic
- **Expected**: Queries `workout_logs` directly using `client_id`
- **Verify**: 
  - Should NOT query `workout_sessions` first
  - Should use `workout_logs.client_id` directly
  - Then queries `workout_set_logs` via `workout_log_id`

### Edge Cases to Test

1. **No Workout Logs**: 
   - Should return empty array (not mock data)
   - UI should show empty state

2. **Workout Logs with No Set Logs**:
   - Should return empty array or handle gracefully

3. **Error Cases**:
   - Should return empty array (not mock data)
   - Should log error to console

---

## Test 4: Coach Progress Page (`/coach/progress`)

### What Was Fixed
- Removed fallback mock data (3 fake clients)
- Fixed streak calculation to use `program_day_assignments` (complete weeks)
- Changed to use `DatabaseService.getClients()` (only coach's clients)
- Changed to use `workout_logs` instead of `workout_sessions`

### Test Steps

1. **Login as a coach user**
2. **Navigate to `/coach/progress`**
3. **Check Browser Console**: Should see no errors

### Verify

#### 4.1 Client List
- **Check**: List of clients displayed
- **Expected**: Shows only clients assigned to this coach
- **Verify**:
  - Should use `DatabaseService.getClients(coachId)` 
  - Should NOT show all clients (only coach's clients)
  - Client names should match actual profiles
  - No fake clients (Jane Doe, John Smith, Sarah Wilson) should appear

#### 4.2 Each Client's Stats

##### 4.2.1 Total Workouts
- **Check**: Total workouts count per client
- **Expected**: Count from `workout_logs` (not `workout_sessions`)
- **Verify**: Matches count of `workout_logs` for that client

##### 4.2.2 This Week / This Month
- **Check**: Weekly and monthly workout counts
- **Expected**: Based on `completed_at` dates from `workout_logs`
- **Verify**: 
  - This week: workouts completed since start of current week
  - This month: workouts completed since start of current month

##### 4.2.3 Streak
- **Check**: Streak number
- **Expected**: Consecutive complete weeks (using `getStreak()`)
- **Verify**:
  - Should use `program_day_assignments` to calculate complete weeks
  - Should NOT use consecutive days logic
  - Should count weeks where ALL workouts in that week are completed
  - Should reset if a week is incomplete

##### 4.2.4 Completion Rate
- **Check**: Completion rate percentage
- **Expected**: (Completed workouts / Assigned workouts) * 100
- **Verify**: 
  - Should calculate from `workout_logs` and `workout_assignments`
  - Should show actual percentage (not hardcoded 85%)

##### 4.2.5 Adherence
- **Check**: Adherence percentage
- **Expected**: Based on active program weekly goal
- **Verify**: 
  - Should use `program_assignments` to get weekly goal
  - Should calculate: (This month workouts / Expected monthly workouts) * 100
  - Should not assume 20 workouts/month

##### 4.2.6 Last Workout
- **Check**: Last workout date
- **Expected**: Most recent `completed_at` from `workout_logs`
- **Verify**: Matches latest workout log date

#### 4.3 Error Handling
- **Check**: If error occurs during data loading
- **Expected**: Should show empty client list (not fallback mock data)
- **Verify**: 
  - No fake clients appear on error
  - Stats should show zeros/defaults
  - Error should be logged to console

### Edge Cases to Test

1. **No Clients Assigned**:
   - Should show empty list (not fake clients)
   - Stats should show zeros

2. **Client with No Workouts**:
   - All counts should show 0
   - Streak should show 0
   - Completion rate should show 0% or N/A

3. **Client with No Active Program**:
   - Adherence might show 0 or N/A
   - Streak should show 0

4. **Client with Program (total_days = 0)**:
   - Should not crash
   - Streak should handle gracefully

---

## Test 5: WorkoutAnalytics Component

### What Was Fixed
- Removed all hardcoded metrics (streak, workouts, volume, PRs, activity calendar, etc.)
- Added `useAuth` hook to get user ID
- Added data fetching with `useEffect`
- All metrics now come from database

### Test Steps

1. **Find where WorkoutAnalytics component is used** (check imports)
2. **Navigate to that page as a client user**
3. **Check Browser Console**: Should see no errors

### Verify Each Metric

#### 5.1 Basic Metrics

##### 5.1.1 Streak
- **Check**: Streak number (weeks)
- **Expected**: Uses `getStreak()` from `programService`
- **Verify**: Should match streak calculation from complete weeks

##### 5.1.2 Workouts This Month
- **Check**: Monthly workout count
- **Expected**: Count from `workout_logs` filtered by month
- **Verify**: Matches actual completed workouts this month

##### 5.1.3 Workouts This Week
- **Check**: Weekly workout count
- **Expected**: Count from `workout_logs` filtered by week
- **Verify**: Matches actual completed workouts this week

##### 5.1.4 Time Spent This Month
- **Check**: Total minutes spent
- **Expected**: Sum of `total_duration_minutes` from `workout_logs` this month
- **Verify**: Matches sum of duration values

##### 5.1.5 Total Volume Lifted
- **Check**: Total volume (kg)
- **Expected**: Sum of (weight × reps) from `workout_set_logs`
- **Verify**: Should calculate: Σ(weight × reps) for all set logs

#### 5.2 User Progress Object

##### 5.2.1 Total Workouts
- **Check**: Total workouts count
- **Expected**: Count from `workout_logs`
- **Verify**: Matches database count

##### 5.2.2 Total PRs
- **Check**: Personal records count
- **Expected**: Count from `personal_records`
- **Verify**: Matches database count

##### 5.2.3 Consecutive Weeks
- **Check**: Streak value
- **Expected**: Uses `getStreak()`
- **Verify**: Should match streak calculation

##### 5.2.4 Total Reps / Total Sets
- **Check**: Total reps and sets
- **Expected**: Sum from `workout_set_logs`
- **Verify**: Should calculate totals correctly

#### 5.3 Activity Calendar
- **Check**: 30-day calendar view
- **Expected**: Shows which days had workouts
- **Verify**: 
  - Should query `workout_logs` for last 30 days
  - Should mark days with workouts
  - Should NOT use random data
  - Days without workouts should be unmarked

#### 5.4 Recent PRs
- **Check**: List of recent personal records
- **Expected**: Shows recent PRs from database
- **Verify**:
  - Should query `personal_records` ordered by date
  - Should show exercise name, weight, reps, date
  - Should NOT show hardcoded PRs (Bench Press 85kg, Squat 120kg)
  - Date format should be readable ("3 days ago", "1 week ago")

#### 5.5 Weekly Volume
- **Check**: Volume chart for last 4 weeks
- **Expected**: Shows volume per week
- **Verify**:
  - Should calculate volume per week from `workout_set_logs`
  - Should group by week correctly
  - Should NOT show hardcoded values (38000, 41000, etc.)

#### 5.6 Exercise Progress
- **Check**: Exercise progression over time
- **Expected**: Shows weight progression for exercises
- **Note**: This is simplified in current implementation (returns empty array)
- **Verify**: Should handle empty state gracefully

#### 5.7 On The Rise
- **Check**: Exercises trending up
- **Expected**: Shows exercises with increasing performance
- **Note**: This is simplified in current implementation (returns empty array)
- **Verify**: Should handle empty state gracefully

### Edge Cases to Test

1. **No Data**:
   - All metrics should show 0 or empty
   - Activity calendar should show all days unmarked
   - Recent PRs should be empty
   - Weekly volume should be empty
   - Should NOT show hardcoded values

2. **Loading State**:
   - Component should show loading state while fetching
   - Should not flash hardcoded data

3. **Error Cases**:
   - Should handle errors gracefully
   - Should not crash
   - Should log errors to console

4. **User Not Logged In**:
   - Should not attempt to fetch data
   - Should handle gracefully

---

## Test 6: Program Service (`programService.ts`)

### What Was Created
- New service for program-related queries
- Functions: `getActiveProgram()`, `getWeeklyGoal()`, `getStreak()`, `getCompleteWeeks()`, `getCurrentWeekCompletedWorkouts()`

### Test Steps

1. **These functions are used by other components**, so test them indirectly through:
   - Progress Hub (uses `getStreak`, `getWeeklyGoal`, `getCurrentWeekCompletedWorkouts`)
   - Coach Progress Page (uses `getStreak`)

### Verify Functions

#### 6.1 getActiveProgram()
- **Check**: Returns active program assignment
- **Expected**: Returns program with calculated `workouts_per_week`
- **Verify**:
  - Should handle `total_days = 0` or `duration_weeks = 0` (returns null for `workouts_per_week`)
  - Should calculate: `total_days / duration_weeks`
  - Should only return programs with `status = 'active'`

#### 6.2 getStreak()
- **Check**: Returns consecutive complete weeks
- **Expected**: Counts weeks where ALL workouts in that week are completed
- **Verify**:
  - Should use `program_day_assignments.is_completed`
  - Should calculate weeks correctly using `CEIL(day_number / workouts_per_week)`
  - Should count from most recent week backwards
  - Should stop at first incomplete week
  - Should handle programs with `total_days = 0` (returns 0)

#### 6.3 getCompleteWeeks()
- **Check**: Returns array of weeks with completion status
- **Expected**: Each week shows total workouts, completed workouts, and completion status
- **Verify**:
  - Should group `program_day_assignments` by calculated week number
  - Should correctly identify complete weeks (all workouts completed)
  - Should handle division by zero (returns empty array)

#### 6.4 getWeeklyGoal()
- **Check**: Returns weekly workout goal
- **Expected**: Number of workouts per week from active program
- **Verify**:
  - Should return `workouts_per_week` from active program
  - Should return `null` if no active program
  - Should handle invalid programs (returns `null`)

#### 6.5 getCurrentWeekCompletedWorkouts()
- **Check**: Returns completed workouts for current week
- **Expected**: Count of completed workouts in current week
- **Verify**:
  - Should use `getCompleteWeeks()` to find current week
  - Should return `completed_workouts_in_week` for current week
  - Should return 0 if no active program or no weeks

### Edge Cases to Test

1. **No Active Program**:
   - All functions should return 0 or null
   - Should not crash

2. **Program with total_days = 0**:
   - Should handle division by zero
   - Should return empty arrays or nulls
   - Should not crash

3. **Invalid Program Data**:
   - Should handle gracefully
   - Should return safe defaults

---

## Test 7: Progress Stats Service (`progressStatsService.ts`)

### What Was Created
- New centralized service for all progress stats
- Function: `getProgressStats()` - fetches all stats in parallel

### Test Steps

1. **Used by Progress Hub**, so test indirectly through Progress Hub
2. **Or test directly** by calling the function in browser console (if accessible)

### Verify

#### 7.1 getProgressStats()
- **Check**: Returns all progress stats
- **Expected**: Returns object with all 12 stats
- **Verify**:
  - Should fetch all stats in parallel (Promise.all)
  - Should handle errors gracefully (returns default values)
  - Should return correct structure:
    ```typescript
    {
      weeklyWorkouts: { completed: number, goal: number },
      streak: number,
      totalWorkouts: number,
      personalRecords: number,
      leaderboardRank: number,
      totalAthletes: number,
      achievementsUnlocked: number,
      achievementsInProgress: number,
      currentWeight: number | null,
      weightChange: number
    }
    ```

#### 7.2 Error Handling
- **Check**: If any query fails
- **Expected**: Should return default values (zeros/null)
- **Verify**: 
  - Should not throw errors
  - Should log errors to console
  - Should return safe defaults

### Edge Cases to Test

1. **Partial Failures**:
   - If one query fails, others should still work
   - Should return defaults for failed queries

2. **All Queries Fail**:
   - Should return all defaults (zeros/null)
   - Should not crash

---

## General Test Checklist

### ✅ Data Source Verification

For each page/component, verify:
- [ ] No hardcoded/mock data is displayed
- [ ] All data comes from database queries
- [ ] Data matches what's in the database
- [ ] Data updates correctly when database changes

### ✅ Error Handling

For each page/component, verify:
- [ ] No console errors appear
- [ ] Empty states show correctly (not mock data)
- [ ] Error cases handled gracefully
- [ ] Loading states work correctly

### ✅ Database Relationships

Verify correct table usage:
- [ ] Uses `workout_logs` (not `workout_sessions`) where appropriate
- [ ] Uses `program_day_assignments` for streak calculations
- [ ] Uses `program_assignments` for weekly goals
- [ ] Uses correct foreign keys and relationships

### ✅ Edge Cases

Test edge cases:
- [ ] No data scenarios
- [ ] Invalid data scenarios (total_days = 0)
- [ ] Missing relationships (no active program)
- [ ] Empty arrays/null values
- [ ] Division by zero protection

### ✅ Performance

Verify:
- [ ] No excessive database queries
- [ ] Parallel queries where appropriate (Promise.all)
- [ ] Loading states prevent UI flickering
- [ ] Component doesn't re-render excessively

---

## SQL Verification Queries

Run these queries to verify data matches UI:

### Verify Weekly Goal
```sql
SELECT 
  client_id,
  total_days,
  duration_weeks,
  CASE 
    WHEN total_days > 0 AND duration_weeks > 0 THEN 
      ROUND((total_days::numeric / duration_weeks)::numeric, 2)
    ELSE NULL
  END as workouts_per_week
FROM program_assignments
WHERE client_id = 'YOUR_CLIENT_ID'
  AND status = 'active';
```

### Verify Streak
```sql
-- Run the complete weeks query from PROGRESS_ANALYTICS_SCHEMA_FINDINGS.md
-- to verify streak calculation matches UI
```

### Verify Total Workouts
```sql
SELECT COUNT(*) as total_workouts
FROM workout_logs
WHERE client_id = 'YOUR_CLIENT_ID';
```

### Verify Personal Records
```sql
SELECT COUNT(*) as total_prs
FROM personal_records
WHERE client_id = 'YOUR_CLIENT_ID';
```

### Verify Achievements
```sql
SELECT COUNT(*) as total_achievements
FROM achievements
WHERE client_id = 'YOUR_CLIENT_ID';
```

### Verify Body Metrics
```sql
SELECT weight_kg, measured_date
FROM body_metrics
WHERE client_id = 'YOUR_CLIENT_ID'
ORDER BY measured_date DESC
LIMIT 2;
```

---

## Common Issues to Watch For

1. **Hardcoded Data Still Showing**:
   - Check browser console for errors
   - Verify data matches database
   - Check if component is using cached/old code

2. **Division by Zero Errors**:
   - Check programs with `total_days = 0`
   - Should not crash, should handle gracefully

3. **Incorrect Streak Calculation**:
   - Should be based on complete weeks (all workouts in week completed)
   - Should NOT be based on consecutive days
   - Should use `program_day_assignments.is_completed`

4. **Wrong Client Data**:
   - Coach Progress Page should only show coach's clients
   - Should use `DatabaseService.getClients(coachId)`

5. **Missing Data**:
   - Empty states should show (not mock data)
   - All counts should show 0 if no data exists

---

## Success Criteria

All tests pass if:
- ✅ No hardcoded/mock data appears in UI
- ✅ All data comes from database
- ✅ Data matches database values
- ✅ Error cases handled gracefully
- ✅ Empty states show correctly
- ✅ No console errors
- ✅ Performance is acceptable
- ✅ Edge cases handled correctly

---

## Notes

- Some features like "On The Rise" and "Exercise Progress" are simplified in current implementation (return empty arrays)
- These can be enhanced later with more complex queries
- The important thing is they don't show hardcoded data

- Test with different data scenarios:
  - Client with lots of data
  - Client with no data
  - Client with partial data
  - Client with invalid data (total_days = 0)

- Compare before/after:
  - Before: Hardcoded values always shown
  - After: Real data from database, zeros if no data