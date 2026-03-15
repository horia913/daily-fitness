# Dashboard Page Data Audit — /client (page.tsx)

## Step 1: What the Dashboard Actually Renders

### Cards/Sections and Data Used

| # | Section | What it shows | Data source (current) |
|---|--------|----------------|------------------------|
| 1 | **Header** | "Hey, {userName}" + formatted date + avatar | `dashboard.firstName` or `profile.first_name`; `dashboard.avatarUrl` or fallback; date from `formatDate()` |
| 2 | **Athlete Score Ring** | Score (0–100), tier, breakdown (workout, program, checkin, goals, nutrition), sparkline + trend text | `athleteScore` (score, tier, workout_completion_score, program_adherence_score, checkin_completion_score, goal_progress_score, nutrition_compliance_score); `scoreHistory` (date, score) |
| 3 | **Today's Quick Actions** | Today's workout name, type (program/assignment), week/day if program; or "Rest day" | `dashboard.todaysWorkout` (hasWorkout, type, name, weekNumber, dayNumber) |
| 4 | **Daily Check-in (prompt)** | "How are you feeling today?" + streak CTA or "Start your check-in streak" | Shown when `hasCheckInToday === false`; `checkinStreak` |
| 5 | **Daily Check-in (done)** | "Checked in today" + time, sleep, sleep quality, stress, soreness, steps, streak, Edit link | Shown when `hasCheckInToday === true`; `todayWellnessLog` (created_at, sleep_hours, sleep_quality, stress_level, soreness_level, steps); `checkinStreak` |
| 6 | **Streak & Stats row** | Workout streak number; weekly progress "X/Y this week"; program progress "Week W of T (P%)" with bar | `dashboard.streak`; `dashboard.weeklyProgress` (current, goal); `dashboard.programProgress` (currentWeek, totalWeeks, completedCount, totalSlots, percent) |
| 7 | **Highlights row** | PRs this month; latest achievement name + tier; best leaderboard rank + exercise name | `dashboard.highlights` (prsThisMonth, latestAchievement { name, icon, tier }, bestLeaderboardRank { rank, exerciseName }) |
| 8 | **View full progress** | Link to /client/progress | No data |

### What the existing get_client_dashboard RPC returns

- `avatarUrl`, `firstName`, `clientType`, `nextSession`
- `streak` (workout streak)
- `weeklyProgress` (current, goal)
- `weeklyStats` (volume, time, prsCount)
- `workoutDays`, `bodyWeight`, `todaysWorkout`
- `todayWellnessLog`, `checkinStreak`
- `highlights` (prsThisMonth, latestAchievement, bestLeaderboardRank)
- `athleteScore`, `scoreHistory`

### What is fetched OUTSIDE the RPC (causing 85+ queries)

- **Dashboard API** calls the RPC once, then calls **buildProgramWeekState()** (many Supabase queries: active assignment, slots, completions, progress, etc.) to add `todaySlot`, `isRestDay`, `overdueSlots`, **programProgress**. So all extra queries come from that builder.
- The **page** itself only calls `fetch("/api/client/dashboard")` once; it does not call Supabase directly. The 85+ queries are on the server: 1 RPC + dozens from `buildProgramWeekState` and any other internal calls.

To get to **one RPC call**, the RPC must also compute and return **programProgress** (currentWeek, totalWeeks, completedCount, totalSlots, percent) so the API (or the page, if it calls the RPC directly) does not need to run `buildProgramWeekState`.
