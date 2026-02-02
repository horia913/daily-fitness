# Performance Baseline Report

Generated: 2026-02-02

## How to Measure

### Local Development

1. Start the dev server: `npm run dev`
2. Open browser DevTools > Network tab
3. Navigate to the page/endpoint being measured
4. Find the API call in the network list
5. Check the "Timing" tab for `Server-Timing` breakdown
6. Record the values in the tables below

### Vercel Production

1. Deploy to Vercel: `vercel --prod` or push to main branch
2. Open the production URL in browser
3. Open DevTools > Network tab
4. Navigate to the same page/endpoint
5. Record the production timings

### Server-Timing Header Format

The instrumented endpoints include `Server-Timing` headers:

```
Server-Timing: total;dur=7370.5;desc="2 queries", auth;dur=45.2, rpc_get_client_dashboard;dur=312.4
```

Also includes custom headers:
- `X-Query-Count`: Number of DB queries made
- `X-Total-Time`: Total request time

---

## Top 10 Core Screens - Baseline Measurements

### 1. Client Dashboard (`/client`)

**API Route:** `/api/client/dashboard`

**Before Optimization:**
- Multiple direct Supabase calls in useEffect (10+ queries)
- Sequential fetching

| Metric | Local | Vercel | Notes |
|--------|-------|--------|-------|
| Total Time | _TBD_ | _TBD_ | Target: <500ms |
| Query Count | 10+ | 10+ | Target: 1 (RPC) |
| Slowest Query | _TBD_ | _TBD_ | |

---

### 2. Client Workouts (`/client/workouts`)

**API Route:** `/api/client/workouts/summary`

**User reported:** 7.37s load time

**Before Optimization:**
- 20-25 sequential queries

| Metric | Local | Vercel | Notes |
|--------|-------|--------|-------|
| Total Time | 7370ms | 7370ms | Target: <500ms |
| Query Count | 20-25 | 20-25 | Target: 1 (RPC) |
| Slowest Query | _TBD_ | _TBD_ | |

---

### 3. Workout Execution (`/client/workouts/[id]/start`)

**Data Loading:** Direct Supabase calls + WorkoutBlockService

**Before Optimization:**
- Multiple queries for workout data, blocks, exercises
- WorkoutBlockService fetches per block type

| Metric | Local | Vercel | Notes |
|--------|-------|--------|-------|
| Total Time | _TBD_ | _TBD_ | Target: <800ms |
| Query Count | 5-8 | 5-8 | Target: <=3 |
| Slowest Query | _TBD_ | _TBD_ | |

---

### 4. Workout Completion (`/client/workouts/[id]/complete`)

**API Route:** `/api/complete-workout`

**Before Optimization:**
- Already reasonably optimized
- Some RPC calls for progression

| Metric | Local | Vercel | Notes |
|--------|-------|--------|-------|
| Total Time | _TBD_ | _TBD_ | Target: <800ms |
| Query Count | 3-5 | 3-5 | Target: <=3 |
| Slowest Query | _TBD_ | _TBD_ | |

---

### 5. Client Progress (`/client/progress`)

**Data Loading:** Direct Supabase calls + WorkoutAnalytics component

**Before Optimization:**
- Multiple queries for stats, PRs, history
- N+1 pattern in WorkoutAnalytics (already fixed)

| Metric | Local | Vercel | Notes |
|--------|-------|--------|-------|
| Total Time | _TBD_ | _TBD_ | Target: <800ms |
| Query Count | 8-12 | 8-12 | Target: <=3 |
| Slowest Query | _TBD_ | _TBD_ | |

---

### 6. Coach Dashboard (`/coach`)

**API Route:** `/api/coach/dashboard`

**Before Optimization:**
- 6+ queries via coachDashboardService
- Promise.all with 3 parallel calls, each making 1-3 queries

| Metric | Local | Vercel | Notes |
|--------|-------|--------|-------|
| Total Time | _TBD_ | _TBD_ | Target: <500ms |
| Query Count | 6+ | 6+ | Target: 1 (RPC) |
| Slowest Query | _TBD_ | _TBD_ | |

---

### 7. Coach Client List (`/coach/clients`)

**Data Loading:** Direct Supabase calls

**Before Optimization:**
- Fetches clients + profiles
- May have N+1 for program/workout assignments per client

| Metric | Local | Vercel | Notes |
|--------|-------|--------|-------|
| Total Time | _TBD_ | _TBD_ | Target: <800ms |
| Query Count | 3-5 | 3-5 | Target: <=3 |
| Slowest Query | _TBD_ | _TBD_ | |

---

### 8. Coach Client Detail (`/coach/clients/[id]`)

**Data Loading:** Direct Supabase calls + multiple views

**Before Optimization:**
- Fetches client profile, workouts, programs, progress
- Multiple sub-components fetch their own data

| Metric | Local | Vercel | Notes |
|--------|-------|--------|-------|
| Total Time | _TBD_ | _TBD_ | Target: <800ms |
| Query Count | 6-10 | 6-10 | Target: <=3 |
| Slowest Query | _TBD_ | _TBD_ | |

---

### 9. Coach Gym Console / Pickup Mode (`/coach/gym-console`)

**API Route:** `/api/coach/pickup/next-workout`

**Before Optimization:**
- 15-20 sequential queries

| Metric | Local | Vercel | Notes |
|--------|-------|--------|-------|
| Total Time | _TBD_ | _TBD_ | Target: <500ms |
| Query Count | 15-20 | 15-20 | Target: 1 (RPC) |
| Slowest Query | _TBD_ | _TBD_ | |

---

### 10. Workout Templates List (`/coach/workouts/templates`)

**Data Loading:** Direct Supabase calls

**Before Optimization:**
- Fetches templates list
- May fetch exercise counts per template (N+1)

| Metric | Local | Vercel | Notes |
|--------|-------|--------|-------|
| Total Time | _TBD_ | _TBD_ | Target: <800ms |
| Query Count | 2-5 | 2-5 | Target: <=3 |
| Slowest Query | _TBD_ | _TBD_ | |

---

## Summary Table

| # | Screen | Path | Current Queries | Target Queries | Optimization |
|---|--------|------|-----------------|----------------|--------------|
| 1 | Client Dashboard | /client | 10+ | 1 | RPC (DONE) |
| 2 | Client Workouts | /client/workouts | 20-25 | 1 | RPC (DONE) |
| 3 | Workout Execution | /client/workouts/[id]/start | 5-8 | <=3 | Batching |
| 4 | Workout Completion | /client/workouts/[id]/complete | 3-5 | <=3 | OK |
| 5 | Client Progress | /client/progress | 8-12 | <=3 | Parallel + Batch |
| 6 | Coach Dashboard | /coach | 6+ | 1 | RPC (DONE) |
| 7 | Coach Client List | /coach/clients | 3-5 | <=3 | OK/Batch |
| 8 | Coach Client Detail | /coach/clients/[id] | 6-10 | <=3 | RPC/Parallel |
| 9 | Coach Gym Console | /coach/gym-console | 15-20 | 1 | RPC (DONE) |
| 10 | Templates List | /coach/workouts/templates | 2-5 | <=3 | OK/Batch |

---

## Migrations Required (Run in Supabase SQL Editor)

Before measuring "After" metrics, run these migrations:

1. `migrations/20260202_client_summary_rpc.sql` - Client workouts summary RPC
2. `migrations/20260202_coach_pickup_rpc.sql` - Coach pickup workout RPC  
3. `migrations/20260202_client_dashboard_rpc.sql` - Client dashboard RPC
4. `migrations/20260202_coach_dashboard_rpc.sql` - Coach dashboard RPC

---

## Success Criteria

| Endpoint/Screen | Current | Target (Local) | Target (Vercel) |
|-----------------|---------|----------------|-----------------|
| Client Dashboard | 10+ queries | 1 query | <500ms |
| Client Workouts Summary | 7.37s | <500ms | <800ms |
| Coach Dashboard | 6+ queries | 1 query | <500ms |
| Coach Pickup | 15-20 queries | 1 query | <800ms |
| All Core Screens | varies | <=3 queries | <800ms p95 |
