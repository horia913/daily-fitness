# UI Audit — 2026-04-16 Grades

> **Source:** Static-code audit conducted 2026-04-16 using the Dual-Expert Synthesis Protocol (Jonathan Ive + Julie Zhuo). Graded on seven axes — Immersion, Intuitiveness, Density-Mobile, Density-Desktop, Hierarchy, Consistency-with-benchmarks, Accessibility — with Density and Consistency weighted 1.5×.
>
> **Caveat:** Composite scores are grounded in verifiable code evidence (wrapper widths, shell usage, nested components, responsive classes, token usage, skeleton-vs-spinner). Any individual score may shift by ±0.5 after a pixel-level review. The **ranking** and **tier assignments** are robust to that uncertainty.
>
> **Use:** This is a snapshot. The target for every screen is ≥9.0 (Phase 1–4), pushing to ≥9.5 (Phase 5). Admin routes are not graded here — they will be graded when the Admin surface is in scope.

---

## Headline

| Side | Average | Verdict |
|---|---|---|
| **Client** | **8.0 / 10** | A finished, immersive product. |
| **Coach** | **7.0 / 10** | Professional but awaiting the `CoachPageShell` primitive. |
| **Product-wide** | **7.5 / 10** | Gap driven by architectural inconsistency on the coach side, not aesthetic. |

**Benchmarks (Tier S, 9.0+):**
- `/client/workouts/[id]/start` — **9.5**
- `/client` — **9.1**
- `/client/train` — **9.1**
- `/coach` — **9.0**

---

## Corrections — 2026-04-16 (post-Phase 0.3 verification)

During Phase 1.2 investigation, two discrepancies with the original audit were found and corrected:

1. **`/coach/analytics` is NOT a nested-`AnimatedBackground` offender.** The audit flagged it as one, but the delegated component `OptimizedAnalyticsReporting` does not render `AnimatedBackground` — only the page does. Its Tier C placement (6.4) stands on other merits (header hidden on mobile via `hidden sm:block`, desktop-only double-chrome with `AnalyticsNav`).
2. **`/coach/adherence` IS a nested-`AnimatedBackground` offender** — the audit missed it. Both `/coach/adherence/page.tsx` and `OptimizedAdherenceTracking.tsx` render `<AnimatedBackground>` + `<FloatingParticles>`. This does not change its Tier B (7.7) placement (the other axes carry the score), but it will be addressed as part of the **Phase 2 full rewrite** of the 4 nested offenders (`/coach/exercises`, `/coach/compliance`, `/coach/reports`, `/coach/adherence`).

**Phase 1.2 decision:** The nested-AB fix was deferred from Phase 1 entirely. The 4 offenders all carry redundant chrome beyond just the `<AnimatedBackground>` wrapper (duplicate `FloatingParticles`, duplicate `max-w-7xl mx-auto` containers, duplicate page headers) and require a coherent full-page rewrite, not a mechanical strip. They are scheduled for Phase 2.

---

## Tier S — 9.0+ (benchmarks, preserve as-is)

| Route | Composite |
|---|---|
| `/client/workouts/[id]/start` | 9.5 |
| `/client` | 9.1 |
| `/client/train` | 9.1 |
| `/coach` | 9.0 |

---

## Tier A — 8.0–8.9 (excellent; keep)

| Route | Composite |
|---|---|
| `/client/check-ins` | 8.9 |
| `/coach/training` | 8.8 |
| `/client/progress/personal-records` | 8.5 |
| `/client/check-ins/weekly` | 8.5 |
| `/client/activity` | 8.3 |
| `/coach/clients` | 8.3 |
| `/client/habits` | 8.2 |
| `/client/check-ins/history` | 8.2 |
| `/client/workouts/[id]/complete` | 8.2 |
| `/client/goals` | 8.1 |
| `/client/nutrition` | 8.0 |
| `/coach/workouts/templates` | 8.0 |
| `/coach/challenges` | 8.0 |
| `/coach/clients/add` | 8.0 |
| `/coach/challenges/[id]` | 8.0 |
| `/client/programs/[id]/details` | 8.0 |
| `/client/nutrition/foods/create` | 8.0 |
| `/client/progress/achievements` | 8.0 |
| `/client/progress/body-metrics` | 8.0 |
| `/client/progress/mobility` | 8.0 |
| `/client/progress/performance` | 8.0 |
| `/client/progress/workout-logs` | 8.0 |

---

## Tier B — 7.0–7.9 (solid; minor polish in Phase 4)

| Route | Composite |
|---|---|
| `/client/progress` | 7.9 |
| `/coach/gym-console` | 7.8 |
| `/client/profile` | 7.8 |
| `/client/progress/leaderboard` | 7.8 |
| `/client/challenges/[id]` | 7.8 |
| `/coach/adherence` | 7.7 |
| `/client/workouts/[id]/details` | 7.7 |
| `/coach/workouts/templates/[id]/edit` | 7.6 |
| `/client/challenges` | 7.6 |
| `/client/workouts` | 7.6 |
| `/client/goals/history` | 7.6 |
| `/coach/nutrition/meal-plans` | 7.4 |
| `/coach/menu` | 7.4 |
| `/coach/nutrition/generator` | 7.4 |
| `/coach/clients/[id]/programs/[programId]` | 7.3 |
| `/client/me` | 7.2 |
| `/coach/goals` | 7.1 |
| `/coach/progress` | 7.1 |
| `/coach/reports` | 7.1 |
| `/client/nutrition/foods/[id]` | 7.1 |
| `/coach/programs` | 7.0 |
| `/coach/clients/[id]/workouts` | 7.0 |
| `/coach/clients/[id]/meals` | 7.0 |
| `/coach/programs/[id]` | 7.0 |
| `/coach/workouts/templates/create` | 7.0 |
| `/coach/workouts/templates/[id]` | 7.0 |
| `/coach/categories` | 7.0 |
| `/client/progress/nutrition` | 7.0 |

---

## Tier C — 6.0–6.9 (needs work in Phase 3)

| Route | Composite | Headline issue |
|---|---|---|
| `/client/progress/workout-logs/[id]` | 6.9 | Deep per-block set rendering is visually overloaded |
| `/coach/profile` | 6.8 | Form inside AnimatedBackground — visual mismatch |
| `/coach/clients/[id]` | 6.8 | Daily-review hero is good; tab nav is crowded |
| `/coach/clients/[id]/workout-logs/[logId]` | 6.8 | Dense set tables; no mobile card view |
| `/coach/clients/[id]/stats` | 6.8 | Stacked delegated views; no unifying hierarchy |
| `/coach/clients/[id]/check-ins` | 6.8 | No card shell around wellness/metrics sections |
| `/coach/nutrition/meal-plans/[id]` | 6.8 | Dense meal builder; no polish pass |
| `/coach/nutrition/foods` | 6.8 | Dense food table cramped on mobile |
| `/client/nutrition/meals/[id]` | 6.8 | **Error UI omits `ClientPageShell`** — visual break |
| `/coach/clients/[id]/progress` | 6.6 | **Label/route mismatch** — title "Check-ins", route "progress" |
| `/coach/analytics` | 6.4 | **Inner header hidden on mobile** (`hidden sm:block`). ~~Audit flagged nested AB — corrected 2026-04-16: delegated `OptimizedAnalyticsReporting` does NOT render `AnimatedBackground`. No nesting.~~ |
| `/coach/compliance` | 6.3 | **Double `AnimatedBackground` nesting** (page + `OptimizedComplianceDashboard`). |
| `/coach/exercises` | 6.3 | **Double `AnimatedBackground` nesting** (page + `OptimizedExerciseLibrary`); `max-w-7xl` feels too wide. |
| `/coach/nutrition/assignments` | 6.2 | **Duplicate back-navigation** button |
| `/coach/programs/create` | 6.2 | `max-w-4xl` form, no AnimatedBackground — plain |
| `/coach/nutrition/meal-plans/create` | 6.2 | `max-w-2xl` narrow form jarring vs `max-w-7xl` list it links from |
| `/client/progress/analytics` | 6.1 | Very long single-file dashboard at `max-w-xl` — cramped & endless |

---

## Tier D — <6.0 (rescue in Phase 2)

| Route | Composite | Headline issue |
|---|---|---|
| `/coach/programs/[id]/edit` | 5.9 | `max-w-7xl` schedule + blocks editor overloaded on small laptops |
| `/coach/meals` | 5.9 | Heavy "Nutrition Studio" overlaps with `/coach/nutrition` — merge or kill |
| `/coach/clients/[id]/profile` | 5.8 | URL-driven section jumps instead of proper tabs |
| `/coach/nutrition` | 5.6 | Sparse link-list hub with zero craft |
| `/coach/nutrition/meal-plans/[id]/edit` | 5.6 | Metadata-only form; half-finished vs detail page |
| `/coach/clients/[id]/workout-logs` | 5.1 | **Plain-text** loading and empty states — lowest-polished screen on coach side |

---

## Redirects / dead routes

| Route | Action in Phase 1.4 |
|---|---|
| `/client/progress/photos` | Fine as-is — legacy redirect to `/client/progress/body-metrics?tab=photos` |
| `/coach/habits` | Delete or promote. Currently redirects to `/coach/goals?tab=habits` |
| `/coach/exercise-categories` | Delete. Redirects to `/coach/categories?tab=exercises` |

---

## Scope not covered by this audit

- `/admin/**` routes were not graded. Admin surface will be audited separately once UI uplift has a coach + client baseline at ≥9.0.
- Shared components (navs, modals, drawers) are graded *indirectly* via the pages they appear on. A dedicated primitives audit happens as part of Phase 0.
- Pixel-level review was deferred. Scores are static-code-based; a later screenshot pass can recalibrate ±0.5 per screen.

---

## Attribution

Original audit report is preserved in the chat transcript at
`C:\Users\HP\.cursor\projects\c-Users-HP-Desktop-DailyFitness\agent-transcripts\c840c302-0c9f-495f-bbf7-9789e5b9ca36\c840c302-0c9f-495f-bbf7-9789e5b9ca36.jsonl`
(see [UI-UX static code audit](c840c302-0c9f-495f-bbf7-9789e5b9ca36) for the full narrative).
