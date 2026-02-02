# Screen Inventory - Performance Analysis

Generated: 2026-02-01

## Summary

- **Total Page Routes**: 82
- **Total API Routes**: 17
- **Client Components**: ~98% (most use client-side data fetching)
- **Server Components**: ~2%

---

## Critical Screens (High Traffic)

### 1. Client Dashboard
- **Path**: `/client`
- **File**: `src/app/client/page.tsx`
- **Type**: Client Component
- **Data Loading**: Client-side via API call + direct Supabase
- **Endpoints Hit**: 
  - `/api/client/workouts/summary` (20-25 DB calls)
  - Direct Supabase: `profiles`, `body_metrics`
- **Tables Touched**: profiles, workout_assignments, workout_logs, workout_set_logs, program_assignments, program_progress, program_schedule, workout_templates, personal_records, body_metrics, clients
- **Status**: CRITICAL - 7.37s observed load time

### 2. Client Workouts
- **Path**: `/client/workouts`
- **File**: `src/app/client/workouts/page.tsx`
- **Type**: Client Component
- **Data Loading**: Client-side via `EnhancedClientWorkouts` component
- **Endpoints Hit**: `/api/client/workouts/summary`
- **Tables Touched**: Same as dashboard
- **Status**: HIGH - shares slow summary endpoint

### 3. Live Workout Execution
- **Path**: `/client/workouts/[id]/start`
- **File**: `src/app/client/workouts/[id]/start/page.tsx`
- **Type**: Client Component
- **Data Loading**: Client-side direct Supabase
- **Tables Touched**: workout_assignments, workout_templates, workout_blocks, workout_block_exercises, exercises, workout_logs, workout_set_logs
- **Status**: MEDIUM - per-action queries acceptable

### 4. Coach Dashboard
- **Path**: `/coach`
- **File**: `src/app/coach/page.tsx`
- **Type**: Client Component
- **Data Loading**: Client-side via hooks
- **Tables Touched**: profiles, clients, workout_assignments, program_assignments
- **Status**: HIGH - multiple parallel queries on mount

### 5. Coach Client Detail
- **Path**: `/coach/clients/[id]`
- **File**: `src/app/coach/clients/[id]/page.tsx`
- **Type**: Client Component
- **Data Loading**: Client-side via `ClientWorkoutsView`
- **Tables Touched**: profiles, workout_assignments, program_assignments, workout_programs, workout_templates
- **Status**: MEDIUM

### 6. Coach Pickup Workout
- **Path**: `/coach/pickup`
- **File**: `src/app/coach/pickup/page.tsx`
- **Type**: Client Component
- **Endpoints Hit**: `/api/coach/pickup/next-workout` (15-20 DB calls)
- **Tables Touched**: clients, profiles, program_assignments, program_progress, program_schedule, workout_templates, workout_blocks, exercises
- **Status**: HIGH - complex multi-table query

---

## API Routes Inventory

### Critical Performance (Page Load)

| Route | Method | DB Calls | Tables | Priority |
|-------|--------|----------|--------|----------|
| `/api/client/workouts/summary` | GET | 20-25 | 15+ | CRITICAL |
| `/api/coach/pickup/next-workout` | GET | 15-20 | 15+ | HIGH |

### Per-Action (Acceptable Latency)

| Route | Method | DB Calls | Tables | Priority |
|-------|--------|----------|--------|----------|
| `/api/log-set` | POST | 12-15 | 6 | MEDIUM |
| `/api/complete-workout` | POST | 5-8 | 5 | LOW |
| `/api/program-workouts/start-from-progress` | POST | 6-8 | 6 | LOW |
| `/api/set-rpe` | PATCH | 1-2 | 1 | LOW |

### Admin/Setup (Low Frequency)

| Route | Method | DB Calls | Tables | Priority |
|-------|--------|----------|--------|----------|
| `/api/admin/habit-categories/reorder` | POST | 2-3 | 1 | LOW |
| `/api/admin/goals` | GET/POST | 2-3 | 2 | LOW |
| `/api/clients/create` | POST | 2-3 | 2 | LOW |
| `/api/coach/programs` | GET/POST | 3-5 | 3 | LOW |
| `/api/coach/workouts` | GET/POST | 3-5 | 3 | LOW |

---

## Client-Side Data Fetching Patterns

### Hooks with Potential N+1 Issues

| Hook/Component | File | Pattern | Fix Priority |
|----------------|------|---------|--------------|
| `useWorkoutAssignments` | `src/hooks/useWorkoutData.ts` | Loops over assignments | HIGH |
| `loadWeeklyVolume` | `src/components/progress/WorkoutAnalytics.tsx` | Query per workout log | MEDIUM |
| `fetchWorkoutHistory` | `src/components/client/WorkoutHistory.tsx` | Multiple sequential queries | LOW |

### Components with Multiple Supabase Calls on Mount

| Component | File | Calls on Mount | Fix Priority |
|-----------|------|----------------|--------------|
| `EnhancedClientWorkouts` | `src/components/client/EnhancedClientWorkouts.tsx` | 3-4 | HIGH |
| `ClientWorkoutsView` | `src/components/coach/client-views/ClientWorkoutsView.tsx` | 2-3 | MEDIUM |
| `WorkoutAnalytics` | `src/components/progress/WorkoutAnalytics.tsx` | 4-5 | MEDIUM |
| `HabitManager` | `src/components/HabitManager.tsx` | 2-3 | LOW |

---

## All Page Routes (82 Total)

### Auth Routes (4)
- `/` - Landing/Login
- `/signup` - Registration
- `/login` - Login page
- `/auth/callback` - OAuth callback

### Client Routes (25)
- `/client` - Dashboard (CRITICAL)
- `/client/workouts` - Workouts list (HIGH)
- `/client/workouts/[id]` - Workout detail
- `/client/workouts/[id]/start` - Live workout execution
- `/client/workouts/[id]/complete` - Completion screen
- `/client/programs/[id]/details` - Program details
- `/client/progress` - Progress tracking
- `/client/nutrition` - Nutrition dashboard
- `/client/nutrition/[date]` - Daily nutrition
- `/client/nutrition/search` - Food search
- `/client/nutrition/meals/[id]` - Meal detail
- `/client/goals` - Goals management
- `/client/habits` - Habits tracking
- `/client/achievements` - Achievements
- `/client/profile` - Profile settings
- `/client/settings` - App settings
- `/client/body-metrics` - Body measurements
- `/client/personal-records` - PR history
- `/client/schedule` - Weekly schedule
- `/client/history` - Workout history
- `/client/analytics` - Performance analytics
- `/client/notifications` - Notifications
- `/client/messages` - Messages
- `/client/support` - Support/help
- `/client/onboarding` - Onboarding flow

### Coach Routes (35)
- `/coach` - Dashboard (HIGH)
- `/coach/clients` - Client list
- `/coach/clients/[id]` - Client detail (MEDIUM)
- `/coach/clients/[id]/programs/[programId]` - Client program detail
- `/coach/pickup` - Pickup workout (HIGH)
- `/coach/workouts` - Workout templates
- `/coach/workouts/templates/[id]` - Template detail
- `/coach/workouts/create` - Create workout
- `/coach/workouts/[id]/edit` - Edit workout
- `/coach/programs` - Program list
- `/coach/programs/[id]` - Program detail
- `/coach/programs/create` - Create program
- `/coach/programs/[id]/edit` - Edit program
- `/coach/exercises` - Exercise library
- `/coach/exercises/create` - Create exercise
- `/coach/exercises/[id]/edit` - Edit exercise
- `/coach/nutrition` - Nutrition management
- `/coach/habits` - Habit templates
- `/coach/analytics` - Coach analytics
- `/coach/schedule` - Coach schedule
- `/coach/messages` - Messages
- `/coach/profile` - Coach profile
- `/coach/settings` - Coach settings
- `/coach/gym-console` - Gym management
- `/coach/calendar` - Calendar view
- + 10 additional coach management routes

### Admin Routes (8)
- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/goals` - Goal template management
- `/admin/habits` - Habit category management
- `/admin/achievements` - Achievement management
- `/admin/tracking-sources` - Tracking source management
- `/admin/settings` - Admin settings
- `/admin/analytics` - Platform analytics

### API Routes (17)
See "API Routes Inventory" section above.

---

## Data Flow Diagram

```
Client Dashboard Load:
┌─────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│  └── /client (page.tsx)                                     │
│       └── useEffect                                          │
│            ├── fetch(/api/client/workouts/summary)          │
│            │    └── 20-25 Supabase queries (7.37s)          │
│            └── supabase.from('profiles')                    │
│                 └── 1 query                                  │
└─────────────────────────────────────────────────────────────┘

Target State:
┌─────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│  └── /client (page.tsx)                                     │
│       └── useEffect                                          │
│            └── fetch(/api/client/workouts/summary)          │
│                 └── supabase.rpc('get_client_workout_summary')
│                      └── 1 RPC call (<500ms)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Optimization Priorities

### Phase 1: Critical (Must Fix First)
1. `/api/client/workouts/summary` → Single RPC
2. `/api/coach/pickup/next-workout` → Single RPC

### Phase 2: High (Fix After Phase 1)
3. `useWorkoutAssignments` hook → Batched query
4. `EnhancedClientWorkouts` → Consolidate calls

### Phase 3: Medium (If Time Permits)
5. `WorkoutAnalytics.loadWeeklyVolume` → Batched query
6. `/api/log-set` → Review and optimize

### Deferred (Backlog)
- Secondary analytics endpoints
- Admin routes (low frequency)
- Image/asset optimization
- Bundle size optimization
