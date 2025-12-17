# Goal Sync System - Setup Guide

## Overview

The goal sync system automatically updates goals based on client activities:
- **Strength Goals**: Updated when workout sets are logged (e1RM calculated)
- **Body Composition Goals**: Updated when body metrics are logged
- **Workout Consistency Goals**: Updated when workouts are completed
- **Nutrition Tracking Goals**: Updated daily via scheduled sync

## Files Created

1. **`src/lib/goalSyncService.ts`** - Core sync service with all sync functions
2. **`src/app/api/goals/sync/route.ts`** - API endpoint for manual goal syncing
3. **`src/lib/scheduledJobs.ts`** - Scheduled job functions
4. **`src/app/api/cron/weekly-reset/route.ts`** - Weekly reset cron endpoint
5. **`src/app/api/cron/daily-reset/route.ts`** - Daily reset cron endpoint
6. **`src/app/api/cron/daily-sync/route.ts`** - Daily sync cron endpoint

## Integration Points

### 1. Workout Set Logging
**File**: `src/app/api/log-set/route.ts`
- Automatically syncs strength goals when e1RM is updated
- Non-blocking (doesn't slow down set logging)

### 2. Body Metrics Logging
**File**: `src/lib/progressTrackingService.ts`
- Automatically syncs body composition goals when metrics are created
- Non-blocking (doesn't slow down metric logging)

### 3. Workout Completion
**File**: `src/app/api/complete-workout/route.ts`
- Automatically syncs workout consistency goals when workouts are completed
- Non-blocking (doesn't slow down workout completion)

### 4. Meal Logging
- **Note**: Meal logging sync happens via daily scheduled sync
- If you add meal logging insertion points, call `/api/goals/sync` after meal logs are created

## Setting Up Cron Jobs

### Option 1: Vercel Cron Jobs (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-reset",
      "schedule": "59 23 * * 0"
    },
    {
      "path": "/api/cron/daily-reset",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/daily-sync",
      "schedule": "0 1 * * *"
    }
  ]
}
```

**Schedule Explanation:**
- `59 23 * * 0` - Sunday 11:59 PM (weekly reset)
- `0 0 * * *` - Every day at midnight (daily reset)
- `0 1 * * *` - Every day at 1 AM (daily sync)

### Option 2: External Cron Service

Use services like:
- **cron-job.org** (free)
- **EasyCron** (free tier available)
- **GitHub Actions** (free for public repos)

**Setup Steps:**
1. Create cron jobs pointing to your API endpoints
2. Add authorization header: `Authorization: Bearer YOUR_CRON_SECRET`
3. Set environment variable `CRON_SECRET` in your deployment

**Example cron-job.org setup:**
- URL: `https://your-domain.com/api/cron/weekly-reset`
- Method: GET
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`
- Schedule: Every Sunday at 23:59

### Option 3: Manual API Calls

You can manually trigger syncs by calling:
- `GET /api/cron/weekly-reset` - Reset weekly goals
- `GET /api/cron/daily-reset` - Reset daily goals
- `GET /api/cron/daily-sync` - Sync all goals
- `POST /api/goals/sync` - Sync goals for specific client

## Environment Variables

Add to your `.env` file:

```bash
# Required for admin operations
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: For cron job security
CRON_SECRET=your_random_secret_string
```

## Testing

### Test Manual Sync
```bash
curl -X POST http://localhost:3000/api/goals/sync \
  -H "Content-Type: application/json" \
  -d '{"client_id": "your-client-id"}'
```

### Test Cron Endpoints
```bash
curl -X GET http://localhost:3000/api/cron/daily-sync \
  -H "Authorization: Bearer your_cron_secret"
```

## How It Works

### Strength Goals
1. Client logs a workout set
2. e1RM is calculated and stored in `user_exercise_metrics`
3. System finds matching strength goals (by exercise name)
4. Goal `current_value` is updated with latest e1RM
5. Progress percentage and completion status are recalculated

### Body Composition Goals
1. Client logs body measurements
2. System finds matching body composition goals
3. Calculates progress from baseline (first measurement after goal creation)
4. Updates goal `current_value` with progress
5. Progress percentage and completion status are recalculated

### Consistency Goals
1. Client completes a workout
2. System counts completed workouts this week
3. Updates workout consistency goal `current_value`
4. Progress percentage and completion status are recalculated

### Weekly/Daily Resets
1. Cron job runs at scheduled time
2. Finds all weekly/daily goals
3. Resets `current_value` to 0
4. Resets `progress_percentage` to 0
5. Keeps goal status as 'active'

## Goal Matching Logic

Goals are matched by title keywords:

**Strength Goals:**
- "Bench Press" / "bench" → Bench Press exercise
- "Squat" → Squat exercise
- "Deadlift" → Deadlift exercise
- "Hip Thrust" → Hip Thrust exercise

**Body Composition Goals:**
- "Fat Loss" / "Lose Fat" → fat-loss type
- "Weight Loss" / "Lose Weight" → weight-loss type
- "Muscle Gain" / "Gain Muscle" → muscle-gain type
- "Body Recomp" / "Recomposition" → body-recomp type

**Consistency Goals:**
- "Workout Consistency" / "workouts per week" → workout consistency
- "Nutrition Tracking" / "meal logging" → nutrition tracking
- "Water Intake" / "water goal" → water intake (manual for now)

## Troubleshooting

### Goals Not Updating

1. **Check logs**: Look for sync errors in console
2. **Verify goal titles**: Ensure goal titles match expected keywords
3. **Check exercise names**: Ensure exercise names match goal titles
4. **Verify data exists**: Check that activity data exists (e1RM, body metrics, etc.)
5. **Manual sync**: Try calling `/api/goals/sync` manually

### Cron Jobs Not Running

1. **Vercel**: Check Vercel dashboard → Cron Jobs section
2. **External cron**: Verify cron service is calling correct URL
3. **Authorization**: Ensure `CRON_SECRET` matches
4. **Logs**: Check server logs for cron job execution

### Performance Issues

- Sync calls are non-blocking (won't slow down activity logging)
- Daily sync runs at 1 AM (low traffic time)
- Weekly reset runs Sunday night (low traffic time)

## Future Enhancements

- [ ] Add hydration_logs table for water intake auto-tracking
- [ ] Add goal completion notifications
- [ ] Add goal achievement celebrations
- [ ] Add goal progress history/charts
- [ ] Add goal templates/presets
- [ ] Add goal sharing/social features

