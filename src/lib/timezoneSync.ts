/**
 * Canonical timezone sync: auto-detect on client boot/login, persist to profiles.timezone
 * at most once per session per user. No manual timezone UI; no duplicate updates.
 *
 * IMPORTANT: Do NOT invoke syncProfileTimezoneOnce from AuthContext or on every auth init.
 * If timezone sync is reintroduced, call it only from the profile/settings page or on
 * first-ever login — not on every page load.
 */

const FALLBACK_TZ = 'UTC'

/** Guard: we only run the sync check (and at most one PATCH) per user per page session. */
let lastSyncedUserId: string | null = null

/**
 * Detect IANA timezone from the environment (browser). Fallback 'UTC' if unavailable.
 */
export function getDetectedTimezone(): string {
  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat === 'undefined') {
    return FALLBACK_TZ
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz && tz.length > 0 ? tz : FALLBACK_TZ
  } catch {
    return FALLBACK_TZ
  }
}

/**
 * Sync detected timezone to profiles.timezone if different.
 * Runs at most once per user per session; idempotent (no PATCH if stored === detected).
 * Call from the single place that owns boot/login (e.g. AuthProvider after profile is known).
 *
 * @param userId - auth user id
 * @param storedTimezone - current profiles.timezone (from cached profile or fetch)
 * @returns true if an update was performed (caller may refresh profile)
 */
export async function syncProfileTimezoneOnce(
  userId: string,
  storedTimezone: string | null | undefined
): Promise<boolean> {
  if (!userId) return false

  const detected = getDetectedTimezone()
  const stored = (storedTimezone ?? '').trim() || null

  if (stored === detected) {
    lastSyncedUserId = userId
    return false
  }

  if (lastSyncedUserId === userId) {
    return false
  }

  try {
    const res = await fetch('/api/user/timezone', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: detected }),
    })
    if (res.ok) {
      lastSyncedUserId = userId
      return true
    }
  } catch {
    // Non-fatal; do not set lastSyncedUserId so a retry elsewhere could try again
  }
  return false
}

/**
 * Reset the session guard (e.g. on sign-out so next user can sync).
 * Call from auth signOut if you want a fresh sync when a different user logs in on the same tab.
 */
export function resetTimezoneSyncGuard(): void {
  lastSyncedUserId = null
}
