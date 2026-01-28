## Debugging Playbook

Enable the debug harness:
- Set `NEXT_PUBLIC_DEBUG_HARNESS=true` (client logs)
- Optional: set `DEBUG_HARNESS=true` (server logs)

What gets logged:
- Request counts per route
- `/api` request payloads and response status (tokens redacted)
- Auth state changes and refresh attempts

Where to look:
- Browser console for client logs
- Server logs for API route logs
- `src/lib/debugHarness.ts` for logging behavior
- `src/lib/apiClient.ts` for retry and `/api` logging
- `src/contexts/AuthContext.tsx` for auth state logging
- `src/lib/supabaseQueryLogger.ts` for Supabase request counts

How to reproduce issues:
- Start on the failing route and keep the console open.
- Capture the route path, request count, and the last 3 `/api` requests.
- If auth-related, note refresh attempts and auth state changes.
- If performance-related, capture total request counts for 30s.

Checklist for reporting:
- Route path and time window
- `/api` request payloads (redacted) and status codes
- Auth events: state changes + refresh attempts
- Total request counts per route
