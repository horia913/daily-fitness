# UI — Page Shells & Root Composition

**Status:** Canonical.

## MANDATORY ROOT TREE

Every page under `/client`, `/coach`, `/admin` renders:

```
<ProtectedRoute requiredRole="…">      // when role-gated
  <AnimatedBackground>                  // exactly one per route
    {/* optional: <FloatingParticles /> on hero routes, gated by performanceSettings */}
    <Shell width-variant…>              // ClientPageShell | CoachPageShell | (legacy inline for coach dashboard)
      … content, including loading/error/empty branches …
    </Shell>
  </AnimatedBackground>
</ProtectedRoute>
```

## RULES

1. **Exactly one `AnimatedBackground` per route.** Nested `AnimatedBackground` is forbidden.
2. **Loading and error branches render inside the same shell.** Never return early with a bare `<div>` outside the shell.
3. **Shell width comes from the matching benchmark** (see `95-STANDARD.md` §3):
   - `max-w-lg`  → client hero/hub/dashboard
   - `max-w-2xl` → client execution/detail-heavy
   - `max-w-5xl` → coach hero/dashboard
   - `max-w-7xl` → coach data/table browse (Phase 0 `CoachPageShell` variant)
4. **Do not introduce a new shell primitive** without asking the user. The approved primitives are `ClientPageShell` and (Phase 0) `CoachPageShell`. Raw `<div className="max-w-…">` as a shell is an anti-pattern except inside `/coach/page.tsx` pre-migration.
5. **Do not override `px-4`, `pt-6`, `pb-32`** unless the benchmark you are matching does.
6. **`FloatingParticles` is hero-only.** Never on data-dense screens. Always gated by `performanceSettings.floatingParticles`.

## WHEN TO STOP AND ASK

- You need a width variant other than the four listed above.
- You are tempted to disable `AnimatedBackground` for one route.
- The page has a fullscreen-media mode (e.g. rest timer, exercise GIF) that does not fit a shell.

## ANTI-PATTERNS (HARD-NO)

- Returning `return <div>Loading…</div>` from the top of a page.
- Two `AnimatedBackground`s in the tree (e.g. one in the page, one in a layout component).
- `bg-[var(--fc-bg-deep)]` on the page root (removes the animated background).
- A page that renders `<Shell>` only on the success branch and a bare loader on the loading branch.
