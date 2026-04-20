# Phase 5 — Plan (2026-04-18)

> **Scope chosen by user 2026-04-18:** Wide scope — re-audit all pages currently graded ≤ 8.5 and identify polish targets for a 9.0+ grade.
>
> **Source files consulted:**
> - `docs/ui/audit-grades-2026-04-16.md` — baseline grades
> - `docs/ui/audit-grades-2026-04-18-delta.md` — post-Phase-4 grades
> - `docs/ui/screen-inventory.md` — per-page change logs and current-shell facts
>
> **Output:** Scope + batch plan only (no code changes in this document). Deep per-page audits happen at execution time of each batch, matching the Phase 3 / Phase 4 pattern.

---

## Phase 5 — two distinct goals, two separate tracks

Phase 5 was originally described as "9 → 9.5 push across benchmarks" in the project-level todos. The user then chose the **wide-scope** re-audit (≤ 8.5 → 9.0) for Phase 5's first tranche. These are complementary but distinct:

| Track | Goal | In scope of THIS plan |
|---|---|---|
| **Phase 5A — Wide-scope uplift** | Lift every ≤ 8.5 page to ≥ 9.0 | **Yes** |
| **Phase 5B — Benchmark push** | Lift the 13 current 9.0+ pages (excluding the 4 frozen benchmarks) to 9.5 | Outlined only; separate execution planning |

**User decision needed (flagged at end of doc):** run 5A first, 5B first, or interleave. Default recommendation: **5A first** (broader product lift first, then chase benchmarks). Rationale below.

---

## What "≥ 9.0" actually requires

Pages at ≥ 9.0 consistently show all of the following. This is the remediation checklist used to score "polish path" pages in Phase 5A:

### Hard requirements (gate to 9.0)

1. **No `window.location.href`** (other than deliberate hard reloads for auth/signOut).
2. **No `animate-pulse` loading blocks** — all loaders use `PageSkeleton` with a correct variant.
3. **No `animate-pulse` standing in for an empty or error state** — those use `EmptyState`.
4. **No raw color classes outside semantic business colors:** `text-gray-*`, `text-white`, `border-white/*`, `bg-white/[0.0x]`, `text-cyan-*`, `bg-cyan-*`, `border-cyan-*`, `text-*-{400,500,600}` — all swept to `--fc-*` tokens or `fc-*` utility classes.
5. **No `${theme.text}` / `${theme.textSecondary}` / `${theme.border}` / `${theme.card}` / `${theme.shadow}` / `${theme.gradient}` / `${theme.primary}`** template-literal usage — all migrated to `fc-*` tokens.
6. **No `isDark ? ... : ...` ternaries** in inline styles or class strings — `fc-*` tokens are theme-aware.
7. **All icon-only buttons have `aria-label`**.
8. **All tab strips use `role="tablist"` / `role="tab"` / `aria-selected`** with min 44px touch target.
9. **All modals are `shadcn/Dialog`** (no custom `fixed inset-0 z-*` overlays).
10. **All toggles are `shadcn/Switch`** (no custom peer-checkbox hacks).
11. **All checkboxes are `shadcn/Checkbox`** (no raw HTML `<input type=checkbox>`).

### Soft requirements (gate to 9.5 — Phase 5B territory)

12. **Desktop-specific density:** layouts optimized at ≥ 1280px (not just "not-broken").
13. **Micro-interactions:** hover-lift / focus-ring / press-state present where appropriate with consistent `duration-*` / `ease-*`.
14. **Motion respects `prefers-reduced-motion`** (global `motion-reduce:*` or a utility).
15. **Typography scale matches benchmarks** (`/client/workouts/[id]/start` is the 9.5 reference).
16. **Color contrast AA+ verified** against token values.
17. **Keyboard navigation verified** (tab order, focus trap in Dialogs, `Esc` to close).
18. **`prefers-color-scheme` visual parity** (both themes equally polished).

---

## Phase 5A — candidate table (all pages currently graded ≤ 8.5)

Pages are listed with **2026-04-18 grade** (from the delta audit), the **known work already applied**, and a **remediation category** that drives batch assignment.

### Category legend

- **POLISH-FLOOR** — already polished in Phase 4 but needs final a11y / micro-interaction / last-mile token pass to hit 9.0. Cheap wins. Typically +0.3 to +0.5 Δ.
- **STRUCTURAL-LIFT** — essentials-only passes were applied; remaining work is structural (density refinement, typography rework, shared-pattern adoption). Typically +0.5 to +0.8 Δ.
- **TIER-C-RESCUE** — untouched since 2026-04-16 or pre-polish audit note unresolved. Needs the Phase 2/Phase 3 rewrite pattern. Typically +1.0 to +2.0 Δ.
- **PRODUCT-DECISION** — blocked on a design/product decision before execution can start.
- **FROZEN/HOLD** — intentionally held (verified clean, structural constraint accepted, etc.). Not a Phase 5 target.

### Candidate table — client side

| Route | 2026-04-18 | Category | Remaining work (high level) |
|---|---|---|---|
| `/client/check-ins/weekly` | 8.5 | POLISH-FLOOR | Verified clean in Phase 4; micro-interactions + desktop density only |
| `/client/activity` | 8.5 | POLISH-FLOOR | Phase 4 A1 essentials — verify hover states + `aria-label` + benchmark density |
| `/client/check-ins/history` | 8.5 | POLISH-FLOOR | Phase 4 A2 essentials — same |
| `/client/nutrition/foods/create` | 8.5 | POLISH-FLOOR | Phase 4 A2 — check form-level a11y (labels, error patterns) |
| `/client/progress/achievements` | 8.5 | POLISH-FLOOR | Phase 4 A2 — tab strip a11y + desktop density |
| `/client/progress/workout-logs` | 8.4 | POLISH-FLOOR | Phase 4 A3 — sticky filter bar + density |
| `/client/habits` | 8.2 | POLISH-FLOOR | Verified clean Phase 4 — micro-interactions only |
| `/client/challenges/[id]` | 8.2 | POLISH-FLOOR | Phase 1.5 + 4 — polish-only |
| `/client/nutrition/foods/[id]` | 8.2 | POLISH-FLOOR | Phase 4 A3 token-heavy — verify macro bar a11y |
| `/client/workouts/[id]/details` | 8.2 | STRUCTURAL-LIFT | Phase 4 A3.5 essentials-only — structural density pass (1692 lines) |
| `/client/progress/performance` | 8.2 | POLISH-FLOOR | Phase 4 A3 essentials — light work |
| `/client/progress/mobility` | 8.2 | POLISH-FLOOR | Phase 4 A3 essentials — light work |
| `/client/progress/leaderboard` | 8.1 | POLISH-FLOOR | Phase 1.5 only — verify post-migration polish |
| `/client/goals/history` | 8.0 | POLISH-FLOOR | Phase 4 A1 essentials — light work |
| `/client/profile` | 7.8 | STRUCTURAL-LIFT | Verified clean Phase 4 — structural review needed (885 lines) |
| `/client/nutrition/meals/[id]` | 7.8 | STRUCTURAL-LIFT | Phase 4 A3 fixed error branch; main density still audit-flagged |
| `/client/me` | 7.5 | STRUCTURAL-LIFT | Phase 4 A1 essentials only — needs real content pass |
| `/client/progress/workout-logs/[id]` | 7.5 | STRUCTURAL-LIFT | Phase 4 A3.5 essentials-only; audit flagged "Deep per-block set rendering visually overloaded" |
| `/client/progress/nutrition` | 7.5 | STRUCTURAL-LIFT | Phase 4 A4 loading fix only; main content density unresolved |
| `/client/workouts` | 7.6 | HOLD | Delegate wrapper (12 lines); real work lives in `EnhancedClientWorkouts.tsx` — separate investigation |
| `/client/progress/analytics` | 7.0 | PRODUCT-DECISION | Phase 4 A5 essentials only; **split + promote to `/client/progress` hub deferred** — requires product call |

### Candidate table — coach side

| Route | 2026-04-18 | Category | Remaining work (high level) |
|---|---|---|---|
| `/coach/adherence` | 8.5 | POLISH-FLOOR | Phase 2.2 rewrite — verify desktop density inside `OptimizedAdherenceTracking` |
| `/coach/gym-console` | 8.5 | POLISH-FLOOR | Phase 4 B4 — verify live-status a11y + full-viewport density |
| `/coach/progress` | 8.5 | POLISH-FLOOR | Phase 4 B5 heavy rewrite — verify chart/icon a11y + typography scale |
| `/coach/clients/add` | 8.4 | POLISH-FLOOR | Phase 4 B2 — form-level a11y + sticky save pattern |
| `/coach/reports` | 8.2 | STRUCTURAL-LIFT | Phase 2.2 rewrite — delegated component still dense |
| `/coach/challenges` | 8.2 | STRUCTURAL-LIFT | Phase 4 B2 skeleton-only; width decision still open (map to `data-7xl` or custom) |
| `/coach/clients/[id]/programs/[programId]` | 8.2 | STRUCTURAL-LIFT | Phase 4 C token-heavy; shell migration still pending (Phase 1.1 follow-up) |
| `/coach/clients/[id]/profile` | 8.0 | POLISH-FLOOR | Phase 2.3 rewrite — verify desktop density inside each tab panel |
| `/coach/nutrition/meal-plans` | 7.6 | PRODUCT-DECISION | Phase 4 B2 skeleton-only; **macro totals strip** additive feature still open (Phase 2.1 follow-up) |
| `/coach/clients/[id]` | 7.6 | STRUCTURAL-LIFT | Phase 3 skeleton polish only; audit flagged "tab nav is crowded" — structural |
| `/coach/profile` | 7.5 | STRUCTURAL-LIFT | Phase 4 C Switch conversion + skeleton; audit flagged "form inside AnimatedBackground — visual mismatch" still open |
| `/coach/menu` | 7.4 | POLISH-FLOOR | Verified clean; just needs micro-interactions + desktop density |
| `/coach/clients/[id]/workouts` | 7.0 | STRUCTURAL-LIFT | Untouched since 2026-04-16 — inherits layout shell; content density unaudited in detail |
| `/coach/clients/[id]/meals` | 7.0 | STRUCTURAL-LIFT | Untouched since 2026-04-16 — inherits layout shell; content density unaudited |
| `/coach/programs` | 7.0 | STRUCTURAL-LIFT | Untouched; audit flagged "no sticky toolbar" (Phase 1.6 deferral) |
| `/coach/programs/[id]` | 7.0 | STRUCTURAL-LIFT | Phase 1.1 migrated; not-found branch untouched |
| `/coach/workouts/templates/create` | 7.0 | HOLD | Phase 3 SKIPPED (already clean); not compatible with `CoachPageShell` — refactor deferred |
| `/coach/nutrition` | 7.0 | STRUCTURAL-LIFT | Phase 2.1 hub rebuild — polish-floor opportunities in nav cards |
| `/coach/clients/[id]/workout-logs/[logId]` | 6.8 | TIER-C-RESCUE | Untouched; audit flagged "dense set tables; no mobile card view" |
| `/coach/clients/[id]/stats` | 6.8 | TIER-C-RESCUE | Untouched; audit flagged "stacked delegated views; no unifying hierarchy" |
| `/coach/clients/[id]/check-ins` | 6.8 | TIER-C-RESCUE | Untouched; audit flagged "no card shell around wellness/metrics sections" |
| `/coach/nutrition/meal-plans/[id]` | 6.8 | TIER-C-RESCUE | Untouched; audit flagged "dense meal builder; no polish pass" |
| `/coach/nutrition/foods` | 6.8 | TIER-C-RESCUE | Untouched; audit flagged "dense food table cramped on mobile" |
| `/coach/clients/[id]/workout-logs` | 6.8 | HOLD | Phase 2.1 rescue completed the full polish path; structural re-design deferred |
| `/coach/nutrition/meal-plans/[id]/edit` | 6.8 | PRODUCT-DECISION | Phase 2.1 rescue; deeper rebuild blocked on "metadata-only vs full meal-plan editor" product call |
| `/coach/clients/[id]/progress` | 6.6 | PRODUCT-DECISION | Untouched; audit flagged "title/route mismatch — requires holistic `CoachClientTabBar` decision" (Phase 1.6 deferral) |
| `/coach/nutrition/assignments` | 6.2 | TIER-C-RESCUE | Untouched; audit flagged "duplicate back-navigation" (Phase 1.6 deferral) |
| `/coach/programs/create` | 6.2 | TIER-C-RESCUE | Untouched; audit flagged "plain form, no visual craft" |
| `/coach/nutrition/meal-plans/create` | 6.2 | TIER-C-RESCUE | Untouched; audit flagged "narrow form jarring vs list" |

### Category totals (Phase 5A)

| Category | Count | Combined |
|---|---|---|
| POLISH-FLOOR | 17 | Cheap 9.0 wins |
| STRUCTURAL-LIFT | 15 | Real structural work |
| TIER-C-RESCUE | 8 | Untouched coach residuals |
| PRODUCT-DECISION | 4 | Blocked on product/design |
| HOLD | 3 | Not a Phase 5 target |
| **Total** | **47** | — |

---

## Proposed batch plan (Phase 5A)

### Batch 5.1 — Polish-floor sweep (17 pages, ~3-4 days)

Cheap 9.0 wins. All already polished in earlier phases — this is a last-mile a11y + micro-interaction + desktop-density pass.

**Wave 5.1.1 — Client essentials (9 pages):** `/client/check-ins/weekly`, `/client/activity`, `/client/check-ins/history`, `/client/nutrition/foods/create`, `/client/progress/achievements`, `/client/progress/workout-logs`, `/client/habits`, `/client/challenges/[id]`, `/client/nutrition/foods/[id]`, `/client/progress/performance`, `/client/progress/mobility`, `/client/progress/leaderboard`, `/client/goals/history`.

**Wave 5.1.2 — Coach essentials (4 pages):** `/coach/adherence`, `/coach/gym-console`, `/coach/progress`, `/coach/clients/add`, `/coach/clients/[id]/profile`, `/coach/menu`.

**Per-page standard work:**
- Re-verify all 11 hard requirements on the 9.0 gate checklist.
- Add missing `aria-label` on icon-only buttons (mostly back/settings/close).
- Add `hover:`, `focus-visible:`, `motion-reduce:` variants where missing.
- Re-check desktop density at 1280px/1536px (most likely gap).
- Unify typography scale to benchmark (`text-lg`/`text-xl` audit).

**Exit criterion:** each page lands at **9.0 minimum**. No new components, no new features.

### Batch 5.2 — Structural-lift (15 pages, ~5-7 days)

Pages that had essentials-only or partial polish and now need real structural touches. Per-page work varies, so this batch runs as a series of **targeted deep-audits** at execution time (same pattern as Phase 3/4 waves).

**Wave 5.2.1 — Client heavies (6 pages):** `/client/workouts/[id]/details`, `/client/profile`, `/client/nutrition/meals/[id]`, `/client/me`, `/client/progress/workout-logs/[id]`, `/client/progress/nutrition`.

**Wave 5.2.2 — Coach heavies (9 pages):** `/coach/reports`, `/coach/challenges`, `/coach/clients/[id]/programs/[programId]`, `/coach/clients/[id]`, `/coach/profile`, `/coach/clients/[id]/workouts`, `/coach/clients/[id]/meals`, `/coach/programs`, `/coach/programs/[id]`, `/coach/nutrition`.

**Per-page pattern:** deep recon first → identify the 2-4 structural items blocking 9.0 → propose scope → execute. Representative items:
- `/client/workouts/[id]/details` — 1692-line file: density pass, section typography, possibly extract a shared "per-block" component.
- `/coach/profile` — original audit flagged "form inside AnimatedBackground — visual mismatch"; revisit backdrop / hero.
- `/coach/challenges` — still on `max-w-screen-xl` (not a variant); pick a shell decision.
- `/coach/clients/[id]/programs/[programId]` — shell migration (Phase 1.1 follow-up) still open.
- `/coach/clients/[id]` — audit flagged "tab nav is crowded"; crowded-tab redesign.
- `/coach/programs` — "no sticky toolbar" (Phase 1.6 deferral); add sticky toolbar.

**Exit criterion:** each page lands at **9.0 minimum**. Some pages may leapfrog to 9.2-9.3 if structural fixes resolve multiple audit axes at once.

### Batch 5.3 — Tier C rescue (8 pages, ~1-2 weeks)

Pages that were untouched since the 2026-04-16 audit and still carry their original audit note. This is Phase-2-style rewrite work, not polish.

**Wave 5.3.1 — Coach `/coach/clients/[id]/*` sub-tabs (3 pages):** `/coach/clients/[id]/workout-logs/[logId]`, `/coach/clients/[id]/stats`, `/coach/clients/[id]/check-ins`.

**Wave 5.3.2 — Coach nutrition deep tabs (2 pages):** `/coach/nutrition/meal-plans/[id]`, `/coach/nutrition/foods`.

**Wave 5.3.3 — Coach form pages (3 pages):** `/coach/nutrition/assignments`, `/coach/programs/create`, `/coach/nutrition/meal-plans/create`.

**Per-page pattern:** deep recon → decide "polish path" vs "full rewrite" per page → execute. Each of these has a specific audit-flagged headline issue that needs to be resolved before polish can even be measured.

### Batch 5.4 — Product-decision items (4 pages, blocked)

These are blocked on product/design decisions before Phase 5A execution can proceed. Listed here as explicit scope; will move into 5.2 / 5.3 once unblocked.

| Page | Decision needed | Owner |
|---|---|---|
| `/client/progress/analytics` | Split + promote most-used analytics to `/client/progress` hub. Current structure is "very long single-file dashboard at `max-w-xl` — cramped & endless" (audit). Needs product call on which analytics live on the hub vs on the dedicated page. | User |
| `/coach/nutrition/meal-plans` (and `/create`, `/[id]`, `/[id]/edit`) | Expose `target_protein` / `target_carbs` / `target_fat` — additive feature previously logged as Phase 2.1 follow-up. Requires DB-contract check + UI layout decision (where the macro strip lives in each of the 4 meal-plan screens). | User + backend review |
| `/coach/clients/[id]/progress` | Title/route mismatch ("Check-ins & Assessments" / `progress`). Sibling `/coach/clients/[id]/check-ins` exists — requires holistic `CoachClientTabBar` decision: rename route, retitle page, or merge siblings. | User |
| `/coach/nutrition/meal-plans/[id]/edit` | "Metadata-only vs full meal-plan editor" direction. Current form exposes name/calories/description only; deeper rebuild would match the detail page's scope. | User |

---

## Phase 5B — Benchmark push (9.0 → 9.5) outline only

**Target pages (9 non-benchmark 9.0s):** `/coach/categories`, `/coach/workouts/templates`, `/coach/workouts/templates/[id]`, `/coach/challenges/[id]`, `/coach/goals`, `/coach/programs/[id]/edit`, `/coach/training`, `/client/check-ins`, `/client/progress/body-metrics`.

**Plus** any page that crosses from Phase 5A into ≥ 9.0 and is considered benchmark-track.

**Per-page scope:** soft requirements from the 9.0 gate (items 12-18 above) — desktop density, micro-interactions, motion respect, typography parity, contrast AA+, keyboard nav, `prefers-color-scheme` parity.

**Reference:** `/client/workouts/[id]/start` is the 9.5 reference. A pixel-by-pixel diff against that page for typography, motion, density is the target.

**Sequencing:** runs after 5A, or interleaved at the batch level if desired. **Not planned in detail here.**

---

## Sequencing + estimated effort

| Batch | Pages | Est. effort | Blocks |
|---|---|---|---|
| 5.1 Polish-floor | 17 | ~3-4 days | None — can start immediately |
| 5.2 Structural-lift | 15 | ~5-7 days | None — depth will vary per page |
| 5.3 Tier C rescue | 8 | ~1-2 weeks | None — but each page needs deep recon first |
| 5.4 Product-decisions | 4 | Variable | Waiting on user decisions listed above |
| **5A total** | **44** | **~3-4 weeks** | — |
| 5B Benchmark push | 9+ | Estimate after 5A | Runs after 5A |

---

## Open questions (user decisions needed before execution)

### Q1 — Sequencing of 5A vs 5B

1. **5A first, then 5B** (recommended — broader product lift first, benchmark push last).
2. **5B first, then 5A** (benchmark push before widening scope).
3. **Interleave** — 5.1 → 5B.1 → 5.2 → 5B.2 ...

### Q2 — Size of first batch

1. **Do 5.1 in full** (17 pages, ~3-4 days) — the sweep pattern proven in Phase 4.
2. **Do 5.1 as 2 sub-waves** (9 client + 8 coach, with a check-in between).
3. **Do a proof-of-concept first** — pick one POLISH-FLOOR page (e.g., `/client/check-ins/weekly` at 8.5), apply the 9.0 gate-checklist end-to-end, measure the actual Δ, then size the rest of 5.1 based on learning.

### Q3 — Product decisions

Do you want to tackle any of the 4 PRODUCT-DECISION items (Q from 5.4 table) before or during 5A, or defer them all until after 5A is complete?

### Q4 — Batch 5.3 (Tier C rescue) gate

Do you want to:

1. **Proceed with 5.3 as planned** — each page gets its own deep-audit → execute.
2. **Sample-audit first** — I deep-audit 2-3 representative 5.3 pages and propose a unified pattern (since they're all coach sub-tabs with similar structural issues), then mass-apply.
3. **Defer 5.3 entirely to Phase 6** — ship Phase 5A without rescuing the 8 Tier C residuals. Their audit notes remain open but no worse than they are today.

---

## What this plan does NOT do

- Does not modify any code.
- Does not create or update any audit files.
- Does not start executing any batch.
- Does not make design or product decisions — those are listed as Q3 items for the user.

It is a **scope + sequencing proposal**. User approval required before any batch execution begins.
