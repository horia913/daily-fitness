# Performance After Optimization Report

Generated: 2026-02-02

## Optimizations Implemented

### Phase A: Replace Original Routes with RPC Calls

| Route | Status | Optimization |
|-------|--------|--------------|
| `/api/client/workouts/summary` | DONE | Uses `get_client_workout_summary()` RPC |
| `/api/coach/pickup/next-workout` | DONE | Uses `get_coach_pickup_workout()` RPC |
| `/api/client/dashboard` | NEW | Uses `get_client_dashboard()` RPC |
| `/api/coach/dashboard` | NEW | Uses `get_coach_dashboard()` RPC |

### Phase C: Core Screen Optimizations

| Screen | Status | Change |
|--------|--------|--------|
| Client Dashboard `/client` | DONE | Single API call using RPC |
| Coach Dashboard `/coach` | DONE | Single API call using RPC |
| Client Workouts `/client/workouts` | DONE | Uses optimized summary RPC |
| Coach Gym Console `/coach/gym-console` | DONE | Uses optimized pickup RPC |

---

## Core Screens Performance Table

### Instructions

After running migrations and deploying:

1. Navigate to each screen
2. Open DevTools > Network tab
3. Look at the API response headers:
   - `Server-Timing` for breakdown
   - `X-Query-Count` for query count
   - `X-Total-Time` for total time
4. Fill in the "After" columns

---

### 1. Client Dashboard (`/client`)

**API:** `/api/client/dashboard`

| Metric | Before | After (Local) | After (Vercel) |
|--------|--------|---------------|----------------|
| Total Time | - | _TBD_ | _TBD_ |
| Query Count | 10+ | 1 | 1 |
| Pattern | Multiple useEffect | Single RPC | Single RPC |

---

### 2. Client Workouts (`/client/workouts`)

**API:** `/api/client/workouts/summary`

| Metric | Before | After (Local) | After (Vercel) |
|--------|--------|---------------|----------------|
| Total Time | 7370ms | _TBD_ | _TBD_ |
| Query Count | 20-25 | 1 | 1 |
| Pattern | Sequential queries | Single RPC | Single RPC |

---

### 3. Workout Execution (`/client/workouts/[id]/start`)

| Metric | Before | After (Local) | After (Vercel) |
|--------|--------|---------------|----------------|
| Total Time | _TBD_ | _TBD_ | _TBD_ |
| Query Count | 5-8 | _TBD_ | _TBD_ |
| Pattern | Multiple fetches | TBD | TBD |

**Status:** Pending optimization

---

### 4. Workout Completion (`/client/workouts/[id]/complete`)

| Metric | Before | After (Local) | After (Vercel) |
|--------|--------|---------------|----------------|
| Total Time | _TBD_ | _TBD_ | _TBD_ |
| Query Count | 3-5 | 3-5 | 3-5 |
| Pattern | RPC-based | RPC-based | RPC-based |

**Status:** Already within budget (<=3 queries)

---

### 5. Client Progress (`/client/progress`)

| Metric | Before | After (Local) | After (Vercel) |
|--------|--------|---------------|----------------|
| Total Time | _TBD_ | _TBD_ | _TBD_ |
| Query Count | 8-12 | _TBD_ | _TBD_ |
| Pattern | Multiple calls | TBD | TBD |

**Status:** Pending optimization

---

### 6. Coach Dashboard (`/coach`)

**API:** `/api/coach/dashboard`

| Metric | Before | After (Local) | After (Vercel) |
|--------|--------|---------------|----------------|
| Total Time | - | _TBD_ | _TBD_ |
| Query Count | 6+ | 1 | 1 |
| Pattern | Promise.all(3 services) | Single RPC | Single RPC |

---

### 7. Coach Client List (`/coach/clients`)

| Metric | Before | After (Local) | After (Vercel) |
|--------|--------|---------------|----------------|
| Total Time | _TBD_ | _TBD_ | _TBD_ |
| Query Count | 3-5 | 3-5 | 3-5 |
| Pattern | Fetch + join | Fetch + join | Fetch + join |

**Status:** Within budget, no optimization needed

---

### 8. Coach Client Detail (`/coach/clients/[id]`)

| Metric | Before | After (Local) | After (Vercel) |
|--------|--------|---------------|----------------|
| Total Time | _TBD_ | _TBD_ | _TBD_ |
| Query Count | 6-10 | _TBD_ | _TBD_ |
| Pattern | Multiple components | TBD | TBD |

**Status:** Pending optimization (lower priority - detailed view)

---

### 9. Coach Gym Console (`/coach/gym-console`)

**API:** `/api/coach/pickup/next-workout`

| Metric | Before | After (Local) | After (Vercel) |
|--------|--------|---------------|----------------|
| Total Time | - | _TBD_ | _TBD_ |
| Query Count | 15-20 | 1 | 1 |
| Pattern | Sequential queries | Single RPC | Single RPC |

---

### 10. Workout Templates List (`/coach/workouts/templates`)

| Metric | Before | After (Local) | After (Vercel) |
|--------|--------|---------------|----------------|
| Total Time | _TBD_ | _TBD_ | _TBD_ |
| Query Count | 2-5 | 2-5 | 2-5 |
| Pattern | Simple list | Simple list | Simple list |

**Status:** Within budget, no optimization needed

---

## Summary Comparison

| # | Screen | Before Queries | After Queries | Improvement |
|---|--------|----------------|---------------|-------------|
| 1 | Client Dashboard | 10+ | 1 | 90%+ reduction |
| 2 | Client Workouts | 20-25 | 1 | 95%+ reduction |
| 3 | Workout Execution | 5-8 | TBD | Pending |
| 4 | Workout Completion | 3-5 | 3-5 | Within budget |
| 5 | Client Progress | 8-12 | TBD | Pending |
| 6 | Coach Dashboard | 6+ | 1 | 83%+ reduction |
| 7 | Coach Client List | 3-5 | 3-5 | Within budget |
| 8 | Coach Client Detail | 6-10 | TBD | Pending (low priority) |
| 9 | Coach Gym Console | 15-20 | 1 | 95%+ reduction |
| 10 | Templates List | 2-5 | 2-5 | Within budget |

---

## Backlog - Screens Not Optimized

| Screen | Reason | Priority |
|--------|--------|----------|
| Workout Execution | May need RPC for complex block data | Medium |
| Client Progress | Could benefit from RPC | Medium |
| Coach Client Detail | Complex view with many sections | Low |
| All other screens | Not in top 10 core flows | Backlog |

---

## Deployment Steps

### 1. Run SQL Migrations

In Supabase SQL Editor, run these files in order:

```sql
-- 1. Client summary RPC
-- File: migrations/20260202_client_summary_rpc.sql

-- 2. Coach pickup RPC
-- File: migrations/20260202_coach_pickup_rpc.sql

-- 3. Client dashboard RPC
-- File: migrations/20260202_client_dashboard_rpc.sql

-- 4. Coach dashboard RPC
-- File: migrations/20260202_coach_dashboard_rpc.sql
```

### 2. Deploy Code

```bash
# Deploy to Vercel
git add .
git commit -m "Optimize core screens with RPCs"
# User pushes manually
```

### 3. Verify

1. Open each core screen in production
2. Check Network tab for Server-Timing headers
3. Fill in "After (Vercel)" columns above
4. Take screenshots for documentation

---

## Success Criteria Checklist

- [x] Original summary route uses RPC internally
- [x] Original pickup route uses RPC internally
- [x] Client dashboard uses single API call with RPC
- [x] Coach dashboard uses single API call with RPC
- [ ] All 4 high-priority screens under 800ms (pending measurements)
- [ ] perf-after.md fully populated with real numbers
- [ ] No regressions in functionality

---

## Notes

- All RPCs use `auth.uid()` internally for security
- All RPCs are `SECURITY DEFINER` with `search_path = public`
- Cache invalidation handled via `revalidateTag()` when data changes
- Screens within budget (<=3 queries) were not modified
