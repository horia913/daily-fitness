# Day Tracking Analysis - Current State & Recommended Approach

## Current State (How It Works Now)

### ❌ **Problem: All Day Tracking Uses UTC (Server Time)**

The app currently uses **UTC timezone** for all "today" calculations, which means:
- A client in Bucharest (UTC+2) sees "today" based on UTC, not their local time
- Daily resets happen at UTC midnight, not the client's local midnight
- Counters reset at the wrong time for clients

### Where Day Tracking Is Used

1. **"Today" Date Calculations** (26+ places in code):
   ```typescript
   const today = new Date().toISOString().split("T")[0]; // Returns "2025-01-11" in UTC
   ```
   - Used in: workout assignments, meal plan queries, habit logs, meal completions, etc.
   - **Problem**: Always returns UTC date, not client's local date

2. **Daily Goal Resets** (`src/lib/scheduledJobs.ts`):
   ```typescript
   // Runs at UTC midnight (cron job: 0 0 * * *)
   export async function runDailyGoalReset() {
     // Resets all clients' daily goals at UTC midnight
     // Problem: A client in Bucharest's goals reset at 02:00 AM their time
   }
   ```

3. **Meal Completions** (`src/app/client/progress/nutrition/page.tsx`):
   ```typescript
   const today = new Date(); // UTC time
   const startOfDay = new Date(today);
   startOfDay.setHours(0, 0, 0, 0); // UTC midnight
   const endOfDay = new Date(today);
   endOfDay.setHours(23, 59, 59, 999); // UTC 23:59:59
   ```
   - **Problem**: Queries for meal completions use UTC day boundaries

4. **Habit Logs** (`src/components/client/HabitTracker.tsx`):
   ```typescript
   const today = new Date().toISOString().split('T')[0]; // UTC date
   // Query: .eq('log_date', today)
   ```
   - **Problem**: Uses UTC date string, not client's local date

5. **Workout Assignments** (`src/lib/clientDashboardService.ts`):
   ```typescript
   const today = new Date().toISOString().split('T')[0]; // UTC date
   // Query: .eq('scheduled_date', today)
   ```
   - **Problem**: "Today's workout" might show/hide at wrong time

### Current Timezone Handling

- **Greetings Only**: `timeBasedGreetings.ts` uses `Intl.DateTimeFormat().resolvedOptions().timeZone` (browser timezone) but **only for greetings**, not for day tracking
- **No Database Storage**: No `timezone` column in `profiles` table
- **No Default**: No default timezone set for clients

---

## How It Should Work

### ✅ **Recommended Approach: Client-Specific Timezones**

1. **Store Timezone in Database**:
   - Add `timezone` column to `profiles` table (TEXT, default: 'Europe/Bucharest')
   - Store IANA timezone strings (e.g., 'Europe/Bucharest', 'America/New_York')

2. **Helper Function for "Today"**:
   ```typescript
   // src/lib/timezone.ts (NEW)
   export function getClientToday(clientId: string, timezone: string): string {
     // Get today's date in client's timezone
     // Returns: "2025-01-11" in client's local timezone
   }
   ```

3. **Update All "Today" Queries**:
   - Replace all `new Date().toISOString().split("T")[0]` with timezone-aware function
   - Pass client's timezone to all queries
   - Use client's timezone for date comparisons

4. **Daily Resets Per Client Timezone**:
   - **Option A (Recommended)**: Run resets every hour, check if it's midnight in client's timezone
   - **Option B**: Run resets at UTC midnight but calculate "client's yesterday" to reset
   - **Option C**: Client-side reset check when app loads (checks if new day in their timezone)

5. **Default Timezone**: 
   - New clients: Default to 'Europe/Bucharest'
   - Existing clients: Set default to 'Europe/Bucharest' via migration

---

## Implementation Complexity

### **Simple Approach** (Easier, Good Enough):
- ✅ Add `timezone` column to profiles (default: 'Europe/Bucharest')
- ✅ Create helper function: `getClientToday(timezone)` 
- ✅ Replace all "today" calculations with timezone-aware function
- ✅ Daily resets: Check client timezone on each reset (or reset when client logs in)

**Effort**: Medium (2-3 hours)
**Reliability**: High (works correctly for all clients)

### **Complex Approach** (More Robust, More Work):
- ✅ All of Simple Approach, PLUS:
- ✅ Timezone-aware daily reset scheduler (runs every hour, checks each client's timezone)
- ✅ Background jobs for timezone-aware resets
- ✅ Caching of timezone conversions

**Effort**: High (4-6 hours)
**Reliability**: Very High (perfect for all edge cases)

---

## Recommendation

**Use the Simple Approach** because:
1. ✅ Solves the main problem (correct "today" dates)
2. ✅ Default timezone (Bucharest) works for most clients
3. ✅ Clients can change timezone in settings
4. ✅ Daily resets can happen on app load (checks if new day in client timezone)
5. ✅ Much less complex than timezone-aware cron jobs

**For Daily Resets**: 
- When client opens app, check if it's a new day in their timezone
- If yes, reset daily goals
- Also keep cron job at UTC midnight as backup (but primary reset on app load)

---

## Files That Need Changes

1. **Database Migration**:
   - Add `timezone TEXT DEFAULT 'Europe/Bucharest'` to `profiles` table

2. **New File**: `src/lib/timezone.ts`
   - Helper functions for timezone-aware date calculations

3. **Update ~26+ files** that use `new Date().toISOString().split("T")[0]`:
   - `clientDashboardService.ts`
   - `database.ts`
   - `mealPlanService.ts`
   - `workoutTemplateService.ts`
   - `goalSyncService.ts`
   - `scheduledJobs.ts`
   - `nutrition/page.tsx`
   - `progress/nutrition/page.tsx`
   - `HabitTracker.tsx`
   - And 17+ more files

4. **Update Daily Reset Logic**:
   - Check client timezone on reset
   - Or reset on app load when client opens app

---

## Example: How It Would Work

**Before** (Current - Wrong):
```typescript
// Client in Bucharest (UTC+2)
// Current time: 02:00 AM Bucharest time (00:00 UTC)
const today = new Date().toISOString().split("T")[0]; 
// Returns: "2025-01-11" (UTC date - WRONG for client)
```

**After** (Fixed - Correct):
```typescript
// Client in Bucharest (UTC+2)
// Current time: 02:00 AM Bucharest time (00:00 UTC)
const clientTimezone = 'Europe/Bucharest'; // From profiles table
const today = getClientToday(clientTimezone);
// Returns: "2025-01-11" (Bucharest date - CORRECT for client)
```

---

## Summary

**Current Problem**: All day tracking uses UTC, so clients see wrong "today" dates and counters reset at wrong times.

**Solution**: Store client timezone in database, use timezone-aware date calculations everywhere, default to Bucharest.

**Complexity**: Medium (2-3 hours) - manageable, not too complicated.

**Is it too complicated?** No, it's a standard requirement for multi-timezone apps. The Simple Approach is straightforward to implement.
