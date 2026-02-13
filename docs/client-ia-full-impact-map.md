# Client IA — Full Screen Impact Map

**Purpose:** Analysis-only document for the Client Information Architecture update. No implementation, refactors, code changes, or migrations. All routes under `/client` enumerated with pillar mapping, risk classification, and phased migration plan.

**Locked 5 Pillars:**
- Home
- Check-ins
- Training
- Nutrition
- Lifestyle

**Profile:** Accessed via header avatar only (not in bottom nav).

---

## Phase 1 — Full Client Route Audit

### 1.1 Complete Route Enumeration

| Route | Current Purpose | Data Read | Data Write | Touches Program | Touches Completion | Touches Compliance | Touches Workout Logging | Touches Nutrition Logging | Touches Metrics/Check-ins |
|-------|-----------------|-----------|------------|-----------------|--------------------|--------------------|-------------------------|----------------------------|---------------------------|
| `/client` | Client dashboard: today, program week cards, gauges, quick actions | RPC get_client_dashboard, API program-week; profiles | — | Yes (program week, todaysWorkout) | No | No (stats only) | No | No | No |
| `/client/workouts` | Workout list (EnhancedClientWorkouts): program + ad hoc workouts | API workouts/summary, program-week; workout_assignments, program_assignments, workout_templates | — | Yes | No | No | No | No | No |
| `/client/workouts/[id]/details` | Workout details: blocks, exercises, start CTA | workout_assignments, workout_templates, workout_blocks | — | Yes (if program) | No | No | No | No | No |
| `/client/workouts/[id]/start` | Live workout execution: blocks, log set, block complete | workout_assignments, program_day_assignments, program_assignments, workout_logs, workout_set_logs, workout_block_completions, workout_sessions, exercises, program_progression_rules | POST /api/log-set, /api/block-complete | Yes | No (delegates to API) | No | Yes (log-set, block-complete) | No | No |
| `/client/workouts/[id]/complete` | Complete workout: review sets, POST complete, next workout | workout_logs, workout_set_logs, workout_assignments, program_day_assignments, program_assignments, personal_records, exercises | POST /api/complete-workout | Yes | Yes | Yes (via completeWorkoutService) | Yes | No | No |
| `/client/programs/[id]/details` | Program overview: weeks, days, templates, start CTA | program_assignments, program_schedule, workout_templates; API program-week | — | Yes | No | No | No | No | No |
| `/client/nutrition` | Nutrition dashboard: meal plan, today's meals, water, mark completed | meal_plan_assignments, meals, meal_food_items, foods, meal_options, meal_photo_logs, meal_completions, goals (water) | meal_completions (mark meal done); goals (water current_value) | No | No | No | No | Yes | No (water via goals) |
| `/client/nutrition/meals/[id]` | Single meal view: items, mark completed, photo | meal_plan_assignments, meals, meal_items, foods | meal_completions | No | No | No | No | Yes | No |
| `/client/nutrition/foods/[id]` | Food detail (view) | foods | — | No | No | No | No | No | No |
| `/client/nutrition/foods/create` | Create food | — | foods (insert) | No | No | No | No | No | No |
| `/client/progress` | Progress hub: links to analytics, performance, body-metrics, mobility, PRs | progressStatsService (workout_logs, body_metrics, personal_records, achievements, leaderboard) | — | No | No | No | No (read) | No | Yes |
| `/client/progress/analytics` | Volume, intensity trends, strength progression | workout_logs, workout_set_logs, body_metrics, goals | — | No | No | No | No (read) | No | Yes |
| `/client/progress/workout-logs` | Workout logs list | workout_logs, workout_assignments, workout_set_logs | — | No | No | No | No (read) | No | No |
| `/client/progress/workout-logs/[id]` | Single workout log detail | workout_logs, workout_assignments, workout_set_logs, exercises | — | No | No | No | No (read) | No | No |
| `/client/progress/body-metrics` | Body metrics: weight, measurements, log check-in | body_metrics | body_metrics | No | No | No | No | No | Yes |
| `/client/progress/goals` | Goals (under Progress) | goals, goal_templates | goals | No | No | No | No | No | Yes (goals) |
| `/client/progress/nutrition` | Progress nutrition (historical meal completions) | meal_plan_assignments, meals, meal_completions, meal-photos storage | meal_completions | No | No | No | No | Yes | No |
| `/client/progress/personal-records` | PRs and lifts | user_exercise_metrics, personal_records | — | No | No | No | No (read) | No | Yes |
| `/client/progress/leaderboard` | Leaderboard ranks | exercises, user_exercise_metrics | — | No | No | No | No | No | Yes |
| `/client/progress/mobility` | Mobility screening and flexibility | (UI; data TBD) | — | No | No | No | No | No | Yes |
| `/client/progress/achievements` | Achievements (under Progress) | achievements, achievement_templates | — | No | No | No | No | No | Yes |
| `/client/goals` | Goals (standalone) | goals, goal_templates, habit_logs | goals | No | No | No | No | No | Yes |
| `/client/habits` | Habits tracking | habit_assignments, habit_logs | habit_logs | No | No | No | No | No | Yes |
| `/client/achievements` | Achievements (standalone) | achievements, achievement_templates | — | No | No | No | No | No | Yes |
| `/client/challenges` | Challenges list | (challenges data) | — | No | No | No | No | No | No |
| `/client/challenges/[id]` | Challenge detail | (challenges data) | — | No | No | No | No | No | No |
| `/client/scheduling` | Book sessions | profiles, clipcards, coach_time_slots, sessions | sessions (create) | No | No | No | No | No | No |
| `/client/sessions` | Sessions list, contact coach | clients, profiles, coach_time_slots, booked_sessions, clipcards | booked_sessions (cancel) | No | No | No | No | No | No |
| `/client/clipcards` | Clip cards (session packs) | clipcards | — | No | No | No | No | No | No |
| `/client/profile` | Profile and settings | profiles | profiles | No | No | No | No | No | No |
| `/client/menu` | Menu hub: links to profile, goals, habits, workout logs, PRs, achievements, leaderboard, challenges, clipcards, workouts; contact coach, scheduling | — | — | No | No | No | No | No | No |

---

## Phase 2 — Pillar Mapping Matrix

| Route | Current Purpose | New Pillar | Action | Notes |
|-------|-----------------|------------|--------|-------|
| `/client` | Dashboard: today, week, gauges | Home | KEEP | Stays as Home hub; recompose per contract |
| `/client/workouts` | Workout list | Training | KEEP | Moves under Training hub |
| `/client/workouts/[id]/details` | Workout details | Training | KEEP | Stays under Training |
| `/client/workouts/[id]/start` | Live workout execution | Training | KEEP | Critical path; no structural change |
| `/client/workouts/[id]/complete` | Complete workout | Training | KEEP | Critical path; no structural change |
| `/client/programs/[id]/details` | Program details | Training | KEEP | Stays under Training |
| `/client/nutrition` | Nutrition dashboard | Nutrition | KEEP | Stays as Nutrition hub |
| `/client/nutrition/meals/[id]` | Single meal view | Nutrition | KEEP | Stays under Nutrition |
| `/client/nutrition/foods/[id]` | Food detail | Nutrition | KEEP | Stays under Nutrition |
| `/client/nutrition/foods/create` | Create food | Nutrition | KEEP | Stays under Nutrition |
| `/client/progress` | Progress hub | — | REMOVE | Remove as tab; content redistributed (Phase C) |
| `/client/progress/analytics` | Analytics | Training | MERGE | Absorb into Training or Lifestyle hub (analytics) |
| `/client/progress/workout-logs` | Workout logs | Training | KEEP | Moves under Training hub |
| `/client/progress/workout-logs/[id]` | Workout log detail | Training | KEEP | Stays under Training |
| `/client/progress/body-metrics` | Body metrics | Check-ins | KEEP | Primary check-in surface; link from Check-ins hub |
| `/client/progress/goals` | Goals (Progress) | Lifestyle | MERGE | Merge into /client/goals; route may remain temporarily |
| `/client/progress/nutrition` | Progress nutrition | Nutrition | MERGE | Absorb into Nutrition hub or as tab |
| `/client/progress/personal-records` | PRs | Training | KEEP | Moves under Training hub |
| `/client/progress/leaderboard` | Leaderboard | Lifestyle | KEEP | Moves under Lifestyle hub |
| `/client/progress/mobility` | Mobility | Check-ins | KEEP | Link from Check-ins hub |
| `/client/progress/achievements` | Achievements (Progress) | Lifestyle | MERGE | Merge with /client/achievements; one source |
| `/client/goals` | Goals (standalone) | Lifestyle | KEEP | Stays under Lifestyle hub |
| `/client/habits` | Habits | Lifestyle | KEEP | Stays under Lifestyle hub |
| `/client/achievements` | Achievements (standalone) | Lifestyle | KEEP | Stays under Lifestyle hub |
| `/client/challenges` | Challenges list | Lifestyle | KEEP | Moves under Lifestyle hub |
| `/client/challenges/[id]` | Challenge detail | Lifestyle | KEEP | Stays under Lifestyle |
| `/client/scheduling` | Book sessions | Lifestyle | DEMOTE | Deep link from Menu/Profile; not promoted in nav |
| `/client/sessions` | Sessions list | Lifestyle | DEMOTE | Deep link; not promoted in nav |
| `/client/clipcards` | Clip cards | Lifestyle | DEMOTE | Deep link from Lifestyle or Menu; not promoted |
| `/client/profile` | Profile | Profile | KEEP | Header avatar only; no nav tab |
| `/client/menu` | Menu hub | — | REMOVE | Replaced by pillar hubs; deep link from Profile if needed |

---

## Phase 3 — Impact Classification

| Route | Risk Level | Flag |
|-------|------------|------|
| `/client` | MEDIUM | Routing/state wiring for today + overdue |
| `/client/workouts` | MEDIUM | Move under Training hub; API unchanged |
| `/client/workouts/[id]/details` | SAFE | UI/nav only |
| `/client/workouts/[id]/start` | **HIGH** | Touches workout logging, program engine, log-set, block-complete |
| `/client/workouts/[id]/complete` | **HIGH** | Touches completion pipeline, program_day_completions, compliance |
| `/client/programs/[id]/details` | SAFE | UI/nav only |
| `/client/nutrition` | MEDIUM | Nutrition logging; hub placement |
| `/client/nutrition/meals/[id]` | MEDIUM | meal_completions write |
| `/client/nutrition/foods/[id]` | SAFE | Read-only |
| `/client/nutrition/foods/create` | MEDIUM | foods insert |
| `/client/progress` | MEDIUM | Remove tab; redirect logic |
| `/client/progress/analytics` | SAFE | Read-only; merge into hub |
| `/client/progress/workout-logs` | SAFE | Read-only |
| `/client/progress/workout-logs/[id]` | SAFE | Read-only |
| `/client/progress/body-metrics` | MEDIUM | body_metrics write; move to Check-ins hub |
| `/client/progress/goals` | SAFE | Merge into goals |
| `/client/progress/nutrition` | MEDIUM | meal_completions; merge |
| `/client/progress/personal-records` | SAFE | Read-only |
| `/client/progress/leaderboard` | SAFE | Read-only |
| `/client/progress/mobility` | SAFE | Move to Check-ins hub |
| `/client/progress/achievements` | SAFE | Merge with achievements |
| `/client/goals` | MEDIUM | goals write; Lifestyle hub |
| `/client/habits` | MEDIUM | habit_logs write; Lifestyle hub |
| `/client/achievements` | SAFE | Read-only |
| `/client/challenges` | SAFE | Read-only |
| `/client/challenges/[id]` | SAFE | Read-only |
| `/client/scheduling` | MEDIUM | sessions write; demote to deep link |
| `/client/sessions` | MEDIUM | booked_sessions; demote |
| `/client/clipcards` | SAFE | Read-only; demote |
| `/client/profile` | SAFE | Header avatar; no nav change |
| `/client/menu` | MEDIUM | Remove; replace with pillar hubs |

### High-Risk Routes (explicit flag)

- **`/client/workouts/[id]/start`** — Workout logging, program engine, log-set, block-complete. Do not modify program engine or logging logic.
- **`/client/workouts/[id]/complete`** — Completion pipeline, program_day_completions, compliance. Do not modify completeWorkoutService or compliance math.

---

## Phase 4 — Structured Migration Plan

### Phase A — IA Shell

**Goal:** Establish new nav and hub pages without deletions. No DB, API, or logic changes.

**Actions:**
1. Update BottomNav: 5 tabs — Home | Check-ins | Training | Nutrition | Lifestyle. Profile via header avatar only.
2. Create hub pages:
   - `/client` — Home hub (already exists; recompose later)
   - `/client/check-ins` — New thin hub: links to body-metrics, mobility
   - `/client/workouts` — Training hub (already exists; rename label to "Training")
   - `/client/nutrition` — Nutrition hub (already exists)
   - `/client/lifestyle` — New thin hub: links to goals, habits, achievements, challenges, leaderboard, scheduling, sessions, clipcards
3. Update nav items to point to correct hubs.
4. Do not delete Progress tab yet; keep as fallback or redirect.

**Output:** New IA shell; all existing routes remain accessible.

---

### Phase B — Route Consolidation

**Goal:** Move screens under correct hubs; merge duplicate routes; remove Progress tab from nav.

**Actions:**
1. **Check-ins hub:**
   - `/client/check-ins` links to body-metrics, mobility.
   - Ensure body-metrics and mobility are reachable from Check-ins.
2. **Training hub:**
   - Workout logs, workout log detail, personal-records under Training.
   - Analytics: either under Training (workout analytics) or Lifestyle (general analytics). Decide and link.
3. **Lifestyle hub:**
   - Goals, habits, achievements, challenges, leaderboard under Lifestyle.
   - Merge progress/goals into goals; merge progress/achievements into achievements (one route each).
   - Scheduling, sessions, clipcards: deep links from Lifestyle hub or Profile.
4. **Nutrition hub:**
   - Progress/nutrition: absorb as tab or sub-page within Nutrition, or link from Nutrition.
5. **Remove Progress tab** from BottomNav.
6. **Progress hub** (`/client/progress`): Redirect to appropriate pillar or keep as legacy deep link. Do not delete route.

**Output:** Content under correct pillars; Progress tab removed from nav.

---

### Phase C — Cleanup (Optional)

**Goal:** Decommission redundant routes; remove legacy navigation. Only after Phase A and B are stable.

**Actions:**
1. Evaluate `/client/progress` redirect vs removal.
2. Remove `/client/menu` from any remaining links if fully replaced by pillar hubs and Profile.
3. Consolidate duplicate routes (e.g. progress/goals → goals, progress/achievements → achievements) if not already done in Phase B.
4. Audit all internal links; update any broken references.

**Output:** Cleaner route structure; no orphaned links.

---

## Hard Constraints (reminder)

- No DB schema changes.
- No API changes.
- No logic refactors.
- Do not modify program engine.
- Do not modify completion pipeline.
- Do not modify compliance math.
- Analysis and planning only.

---

**Document version:** 1.0  
**Generated:** From repository inspection and as-is system map.  
**Reference:** `docs/as-is-system-map.md`, `.cursor/plans/today_overdue_home_nav_ec9ca4aa.plan.md`
