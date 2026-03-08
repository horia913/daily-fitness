# UX Rule: Tab-Return Infinite Loading Prevention

## The Problem

Two recurring edge cases break the user experience on mobile web apps:

| Edge Case | What Happens |
|-----------|-------------|
| **Same-page stall** | User leaves the browser tab → comes back → the **current page** goes into infinite loading |
| **Cross-page stall** | User leaves the tab → comes back → **navigates to another screen** → that new screen goes into infinite loading |

Both stem from the same underlying causes: stale auth tokens, orphaned in-flight requests, and React re-renders triggered by token refresh events.

---

## Root Causes (What Was Breaking)

### 1. Supabase token refresh triggers unnecessary re-renders

When a user returns to a tab, the Supabase SDK fires a `TOKEN_REFRESHED` event. If `AuthContext` blindly updates `user` and `session` state with new object references, every downstream component re-renders. Hooks like `usePageData` that depend on `user` re-fire their data fetches, potentially while the SDK is still mid-refresh — causing hangs or double-fetches.

**Bad pattern:**
```typescript
// AuthContext — onAuthStateChange
setSession(session)
setUser(session?.user ?? null)
// Always sets new references, even if user ID didn't change
```

**Good pattern:**
```typescript
const newUserId = session?.user?.id ?? null
const sameUser = newUserId !== null && newUserId === lastUserIdRef.current

if (!(event === 'TOKEN_REFRESHED' && sameUser)) {
  lastUserIdRef.current = newUserId
  setSession(session ?? null)
  setUser(session?.user ?? null)
}
```

### 2. No loading timeouts — requests hang forever

A `fetch` or Supabase query that hangs (throttled background tab, network blip, token refresh deadlock) leaves the page stuck in `loading = true` permanently with no way to recover.

**Bad pattern:**
```typescript
setLoading(true)
const data = await fetchSomething()  // Can hang forever
setLoading(false)
```

**Good pattern:**
```typescript
const safetyTimeout = setTimeout(() => {
  setLoading(false)
  setError("Loading took too long. Tap Retry to try again.")
}, 20_000)

try {
  const data = await fetchSomething()
  setData(data)
} finally {
  clearTimeout(safetyTimeout)
  setLoading(false)
}
```

### 3. No AbortController — orphaned requests block connections

Browsers limit concurrent connections per domain (~6). If a page fires multiple Supabase queries and the user navigates away before they complete, those in-flight requests continue running in the background. The new page's requests get queued behind them, causing it to stall.

**Bad pattern:**
```typescript
useEffect(() => {
  fetchData()  // No cleanup — request continues after unmount
}, [deps])
```

**Good pattern:**
```typescript
useEffect(() => {
  const controller = new AbortController()
  fetchData(controller.signal)
  return () => controller.abort()  // Cancel on unmount or deps change
}, [deps])
```

### 4. Client-side navigation inherits stale auth state

`router.push()` (Next.js client-side navigation) does NOT trigger the middleware, so the auth cookie isn't refreshed. The new page loads with the old (possibly expired) session cookie, and its Supabase queries fail or hang.

**Bad pattern:**
```typescript
router.push(`/client/workouts/${id}/start`)
```

**Good pattern (for pages that make authenticated server calls on mount):**
```typescript
window.location.href = `/client/workouts/${id}/start`
// Full navigation → middleware runs → cookie refreshed → clean page
```

> **When to use which:**
> - `router.push()` — Fine for read-only pages or pages that don't make server-side auth calls on mount
> - `window.location.href` — Required when navigating TO a page that immediately makes authenticated API/Supabase calls, especially after the tab has been backgrounded

### 5. `refreshSession()` can deadlock

`supabase.auth.refreshSession()` makes a network call to exchange the refresh token. If the SDK is *already* mid-refresh (common on tab return), calling `refreshSession()` again can deadlock — both calls wait for each other.

**Bad pattern:**
```typescript
await supabase.auth.refreshSession()  // Can hang if SDK is already refreshing
const { data: { user } } = await supabase.auth.getUser()
```

**Good pattern:**
```typescript
const { data: { session } } = await supabase.auth.getSession()  // Reads from local storage, instant
const user = session?.user
```

> Use `getSession()` for reading the current session. Let the SDK handle refresh internally. Only use `refreshSession()` inside a timeout wrapper as a last resort.

### 6. Guard refs stuck on early return

Loading guard refs (like `loadInProgressRef`) must be reset on ALL exit paths, including early returns and errors. Otherwise the page is permanently locked out of loading.

**Bad pattern:**
```typescript
const load = async () => {
  if (loadInProgressRef.current) return
  loadInProgressRef.current = true
  const user = await getUser()
  if (!user) return  // BUG: ref stays true forever
  // ... rest of loading
  loadInProgressRef.current = false
}
```

**Good pattern:**
```typescript
const load = async () => {
  if (loadInProgressRef.current) return
  loadInProgressRef.current = true
  try {
    const user = await getUser()
    if (!user) return  // finally block still runs
    // ... rest of loading
  } finally {
    loadInProgressRef.current = false  // Always resets
  }
}
```

---

## The `usePageData` Hook — Central Fix

The `usePageData` hook (`src/hooks/usePageData.ts`) implements all the good patterns above in one place. Any page that uses it gets:

- **20-second safety timeout** — never stuck loading
- **AbortController** — cancels in-flight fetch on unmount or dep change
- **Auth retry** — on 401/JWT errors, calls `getSession()` and retries once
- **Abort-aware state updates** — skips `setData`/`setLoading` if the component already unmounted

**Usage:**
```typescript
const { data, loading, error, refetch } = usePageData(
  async () => {
    // Your fetch logic here — return the data
    const res = await fetch('/api/my-endpoint', { credentials: 'include' })
    return res.json()
  },
  [dep1, dep2]  // Re-fetch when these change
)
```

Pages that manage their own loading (like the workout start page with `loadAssignment`) must manually implement:
1. A safety timeout (20s)
2. Guard ref cleanup in `finally`
3. `getSession()` instead of `refreshSession()`
4. Stale-check before state updates

---

## Retry Strategy for Supabase Queries

For individual Supabase queries that might fail with 401 (auth) or 500 (server overload), wrap them in a `safeQuery` pattern:

```typescript
const safeQuery = async (queryFn: () => Promise<Result>) => {
  const first = await queryFn()
  if (first.error) {
    const code = first.error.code || first.error.status
    if (code === 500 || code === 401) {
      await new Promise(r => setTimeout(r, 500))  // Brief pause
      if (code === 401) {
        try { await supabase.auth.getSession() } catch {}
      }
      return queryFn()  // Retry once
    }
  }
  return first
}
```

---

## Checklist for Fixing a Screen

When fixing or building any screen, verify all of the following:

- [ ] **Uses `usePageData` or equivalent** — with timeout, abort, auth retry
- [ ] **`setLoading(false)` in `finally` block** — never left stuck on error/early return
- [ ] **No `refreshSession()` on the critical path** — use `getSession()` instead
- [ ] **Navigation TO auth-heavy pages uses `window.location.href`** — not `router.push`
- [ ] **POST/mutation calls have a timeout** — `AbortController` + `setTimeout`
- [ ] **Retry button does `window.location.reload()`** — not just `refetch()`
- [ ] **No `visibilitychange` or `focus` listeners for data refetching** — load once on mount
- [ ] **Guard refs always reset** — use `try/finally` pattern
- [ ] **Sequential Supabase queries use `safeQuery` retry** — handles 401/500 gracefully

---

## Known Remaining Issues

These files still use `router.push` to navigate to the workout start page and should be updated to `window.location.href`:

| File | Lines |
|------|-------|
| `src/components/client/EnhancedClientWorkouts.tsx` | 1248, 1260, 1270, 1275, 1294 |
| `src/app/client/workouts/[id]/details/page.tsx` | 1713 |

These files still use `refreshSession()` (with timeout wrappers, but could be simplified):

| File | Context |
|------|---------|
| `src/contexts/AuthContext.tsx` | `ensureFreshSession()` — has 3s timeout wrapper |
| `src/app/client/nutrition/page.tsx` | Retry after auth error |
| `src/lib/apiClient.ts` | 401/403 retry logic |

---

## Summary

| Rule | Why |
|------|-----|
| Always timeout data loading (20s) | Background tabs throttle network; requests can hang |
| Always abort on unmount | Orphaned requests block browser connections |
| Skip re-renders on TOKEN_REFRESHED | Prevents cascade of stale re-fetches on tab return |
| Use `getSession()` not `refreshSession()` | Avoids deadlock with SDK's internal refresh |
| Use `window.location.href` for auth-heavy pages | Full navigation refreshes cookies via middleware |
| Use `try/finally` for guard refs | Prevents permanent loading lockout |
| Retry once on 401/500 | Handles transient auth/server issues gracefully |
