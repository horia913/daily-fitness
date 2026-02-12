# Timezone auto-detect and profile persist (consolidated)

## Single owner

- **Canonical sync:** `src/lib/timezoneSync.ts`
  - `getDetectedTimezone()` — IANA from `Intl.DateTimeFormat().resolvedOptions().timeZone`, fallback `'UTC'`.
  - `syncProfileTimezoneOnce(userId, storedTimezone)` — if stored ≠ detected, PATCH `profiles.timezone` at most **once per user per session** (module guard). Returns `true` if an update was performed.
  - `resetTimezoneSyncGuard()` — call on sign-out so the next user can sync.

- **Wired from:** `src/contexts/AuthContext.tsx`
  - After session and profile are loaded (initial `getSession` and `onAuthStateChange`), calls `syncProfileTimezoneOnce(session.user.id, profileData?.timezone)`.
  - If it returns `true`, refetches profile so UI has updated `timezone`.
  - On `signOut`, calls `resetTimezoneSyncGuard()`.

- **API:** `PATCH /api/user/timezone` — body `{ timezone: string }` (IANA). Updates `profiles.timezone` for `auth.uid()`.

## No duplicate logic

- **useGreetingPreferences** only reads timezone for display (builds `UserContext.timezone` from `Intl`). It does **not** write to the profile; no change.
- Timezone is **not** updated anywhere else; AuthContext is the only caller of `syncProfileTimezoneOnce`.

## Assignment snapshot

- **Where:** `src/lib/workoutTemplateService.ts` — `createProgramAssignment()`.
- **Behavior:** On insert or reactivate, sets `timezone_snapshot` from the client’s `profiles.timezone` (fallback `'UTC'`). Single code path for program assignment creation.

## How to verify in Supabase

1. **profiles.timezone**
   - Table Editor → `profiles` → column `timezone`.
   - Log in as a client; after first load, `timezone` should match the browser timezone (e.g. `Europe/Bucharest`). Reload without changing OS timezone → no change (idempotent). Change OS timezone and reload → updates once to the new value.

2. **program_assignments.timezone_snapshot**
   - Table Editor → `program_assignments` → column `timezone_snapshot`.
   - Create or reactivate a program for a client; `timezone_snapshot` should equal that client’s `profiles.timezone` (or `UTC` if profile timezone is null).

## Acceptance (manual)

1. Login as client → `profiles.timezone` updates to browser timezone once if different.
2. Reload → no repeated profile updates if unchanged.
3. Change OS/browser timezone, reload → `profiles.timezone` updates once to new value.
4. Create a new program assignment → `program_assignments.timezone_snapshot` set to client’s profile timezone.
5. Auth, profile load, and assignment creation still work; no console spam.
