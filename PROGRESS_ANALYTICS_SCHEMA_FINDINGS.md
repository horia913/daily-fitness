# Progress & Analytics Schema Findings

## Database Schema Summary

### Key Tables Confirmed

1. **workout_sessions** - Session lifecycle (start/end, status)
   - Columns: id, assignment_id, client_id, started_at, completed_at, total_duration, status, notes, created_at
   - Purpose: Track session lifecycle (when workout was started/completed)

2. **workout_logs** - Performance data (sets/reps/weight)
   - Columns: id, workout_assignment_id, client_id, workout_session_id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted, etc.
   - **Finding**: Uses `workout_assignment_id` (correct per FK), `workout_session_id` exists but 0/2 logs have it populated (optional/unused)
   - Purpose: Track workout performance (summary data)

3. **workout_set_logs** - Individual set records
   - 52 columns total, supports all block types (straight_set, superset, giant_set, dropset, cluster, rest_pause, pre_exhaustion, amrap, emom, tabata, for_time, pyramid, ladder)
   - Purpose: Track individual set performance

4. **program_assignments** - Client's active program assignment
   - Columns: id, program_id, client_id, coach_id, start_date, total_days, duration_weeks, current_day_number, completed_days, status, etc.
   - **Finding**: Has `total_days` and `duration_weeks` - can calculate workouts per week
   - Purpose: Link client to program

5. **program_days** - Program template days
   - Columns: id, program_id, day_number, day_type, workout_template_id, name, description, etc.
   - **Finding**: NO `week_number` column - weeks must be calculated
   - Purpose: Template days in program

6. **program_day_assignments** - Actual assigned program days for client
   - Columns: id, program_assignment_id, program_day_id, workout_assignment_id, day_number, is_completed, completed_date, etc.
   - **Finding**: NO `week_number` column - weeks must be calculated from day_number
   - Purpose: Track which program days are assigned/completed for specific client

### Critical Finding: Week Calculation

**Problem**: `week_number` does NOT exist in `program_days` or `program_day_assignments`

**Solution**: Calculate weeks from `day_number`, `total_days`, and `duration_weeks`:

```sql
-- Calculate workouts per week
workouts_per_week = total_days / duration_weeks

-- Calculate week number for a day
week_number = CEIL(day_number / workouts_per_week)

-- Example: 16 total_days, 8 duration_weeks = 2 workouts/week
-- Day 1-2 = Week 1, Day 3-4 = Week 2, etc.
```

### Schema Relationships

```
workout_programs (program definition)
  └── program_assignments (client's active program)
      └── program_day_assignments (assigned days for client)
          └── workout_assignments (individual workout assignments)
              └── workout_logs (completed workout performance)
                  └── workout_set_logs (individual set records)

program_days (template days in program)
  └── program_day_assignments (links to client's assigned days)
```

### Progress Tables Confirmed

- ✅ `body_metrics` - Weight, body fat, measurements
- ✅ `goals` - Client goals with progress tracking
- ✅ `achievements` - Achievement records
- ✅ `performance_tests` - 1km run, step test
- ✅ `personal_records` - PR tracking
- ✅ `leaderboard_entries` - Pre-computed rankings

---

## Implementation Logic for Weekly Goals & Streaks

### Weekly Goal Calculation

**Query Active Program**:
```sql
SELECT 
  id,
  program_id,
  total_days,
  duration_weeks,
  (total_days::numeric / NULLIF(duration_weeks, 0))::numeric as workouts_per_week
FROM program_assignments
WHERE client_id = $1
  AND status = 'active'
LIMIT 1;
```

**Weekly Goal**: Use `workouts_per_week` from active program assignment

### Complete Week Calculation

**Logic**:
1. Get active program assignment for client
2. Calculate workouts per week: `workouts_per_week = total_days / duration_weeks`
3. For each week, get all program_day_assignments in that week:
   - `week_number = CEIL(day_number / workouts_per_week)`
4. Check if all program_day_assignments in that week have `is_completed = true`
5. A week is "complete" if ALL workouts in that week are completed

**SQL Example** (with division by zero protection):
```sql
-- Get all program day assignments grouped by calculated week
WITH week_calculations AS (
  SELECT 
    pda.*,
    pa.total_days,
    pa.duration_weeks,
    CASE 
      WHEN pa.total_days > 0 AND pa.duration_weeks > 0 THEN 
        (pa.total_days::numeric / pa.duration_weeks)::numeric
      ELSE NULL
    END as workouts_per_week,
    CASE 
      WHEN pa.total_days > 0 AND pa.duration_weeks > 0 THEN 
        CEIL(pda.day_number::numeric / NULLIF((pa.total_days::numeric / pa.duration_weeks), 0))
      ELSE NULL
    END as week_number
  FROM program_day_assignments pda
  JOIN program_assignments pa ON pa.id = pda.program_assignment_id
  WHERE pa.client_id = $1
    AND pa.status = 'active'
)
SELECT 
  week_number,
  COUNT(*) as total_workouts_in_week,
  COUNT(*) FILTER (WHERE is_completed = true) as completed_workouts_in_week,
  COUNT(*) FILTER (WHERE is_completed = true) = COUNT(*) as is_week_complete
FROM week_calculations
WHERE week_number IS NOT NULL
GROUP BY week_number
ORDER BY week_number;
```

**Note**: Must check `total_days > 0 AND duration_weeks > 0` to avoid division by zero errors

### Streak Calculation (Consecutive Complete Weeks)

**Logic**:
1. Calculate complete weeks (see above)
2. Order by week_number DESC (most recent first)
3. Count consecutive complete weeks starting from current week
4. Stop when first incomplete week is found

**Example**:
- Week 5: Complete ✅
- Week 4: Complete ✅
- Week 3: Complete ✅
- Week 2: Incomplete ❌
- Streak = 3 weeks

---

## Data Status Findings

1. **workout_logs.workout_session_id**: 0/2 logs have this populated
   - All logs use `workout_assignment_id` instead
   - `workout_session_id` appears to be optional/unused
   - **Code is correct** in using `workout_assignment_id`

2. **workout_logs**: Only 2 logs exist (limited data for testing)

3. **program_assignments**: Sample shows 16 total_days, 8 duration_weeks = 2 workouts/week

---

## Next Steps

1. ✅ Schema inspection complete
2. ⏳ Fix hardcoded data issues (see plan)
3. ⏳ Implement weekly goal calculation from active program
4. ⏳ Implement streak calculation (complete weeks)
5. ⏳ Remove all mock/hardcoded data
