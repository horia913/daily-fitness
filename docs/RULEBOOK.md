## Stability + Security + Performance Rulebook

Priority order: SECURITY > STABILITY/CORRECTNESS > UX > PERFORMANCE

- Never weaken RLS; never rely on frontend filtering for security.
- Never fix performance by broadening queries or removing ownership filters.
- No request storms: no Supabase queries in loops; no polling on client workout routes.
- Any change must preserve existing working features; if unsure, add instrumentation first.
- Do not retry 400. Retry 401/403 once after refresh. Backoff retry for network errors.
- Use offline/workout mode guard to disable background prefetch/polling on live workout routes.
