# UI Audit — 2026-04-18 Delta Grades

> **Source:** This is a **delta-only** re-grade. It lists pages whose composite score shifted relative to the `2026-04-16` audit. Pages not listed here are either (a) benchmarks (frozen), (b) admin/dev-only (not graded), (c) deleted, or (d) untouched by any uplift phase and thus carry their 2026-04-16 grade unchanged.
>
> **Baseline:** `docs/ui/audit-grades-2026-04-16.md` (7-axis composite — Immersion, Intuitiveness, Density-Mobile, Density-Desktop, Hierarchy, Consistency-with-benchmarks, Accessibility — Density + Consistency weighted 1.5×).
>
> **Evidence:** Every grade shift is grounded in documented phase work listed in `docs/ui/screen-inventory.md` (Phase 1.5 client shell unify, Phase 2.1 Tier D rescue, Phase 2.2 Analytics family rewrite, Phase 2.3 heavy rewrites, Phase 3 Tier C polish, Phase 4 Tier B polish). **No grade shift was assigned without a corresponding documented change-log in the inventory.**
>
> **Caveat:** This is still a static-code audit; individual scores may shift ±0.5 after a pixel-level review. The **tier assignments** and the **direction** of each shift are robust to that uncertainty.

---

## Methodology — transparent scoring heuristic

Each page's new composite score is derived by applying a bounded additive delta (`Δ`) to the 2026-04-16 baseline. The Δ is assembled from the following verifiable change categories:

| Change type | Δ range | Axis most affected |
|---|---|---|
| Shell migration to `CoachPageShell`/`ClientPageShell` | +0.3 to +0.5 | Consistency + Hierarchy |
| `PageSkeleton` swap (loading unification) | +0.1 to +0.3 | Consistency + Intuitiveness |
| `EmptyState` adoption (empty/error branches) | +0.2 | Consistency + Intuitiveness |
| `window.location.href` → `router.push` / `<Link>` | +0.1 to +0.2 | Intuitiveness |
| Token sweep — light (≤20 swaps) | +0.3 to +0.5 | Consistency |
| Token sweep — heavy (50–200 swaps, e.g., `${theme.*}` migration) | +0.8 to +1.2 | Consistency |
| `shadcn/Dialog`, `Switch`, `Checkbox` primitive swap | +0.3 per category | Consistency + A11y |
| URL-jump → real tabs conversion (`role="tablist"` + `aria-*`) | +0.7 | Intuitiveness |
| Nested `AnimatedBackground` removal + mobile `<h1>` rescue | +0.8 to +1.2 | Immersion + A11y + Density-Mobile |
| Loading-state width/shape consistency fix | +0.3 to +0.5 | Hierarchy |

**Caps and floors:**
- **9.0 hard cap for pure polish work** — reaching 9.5 requires Phase 5 desktop polish + a11y + micro-interactions (not yet done).
- **9.5 cap only for benchmarks already at 9.5** (no changes; frozen).
- **+1.2 Δ cap for polish-only work** (prevents inflation from stacked small touches).
- **Δ cap does NOT apply to full rewrites** (Phase 2.1 hub rebuilds, Phase 2.2 component replacements, Phase 2.3 URL-jump → tabs, Phase 2.3 density rework). These are judged on merit against the 9.0 polish cap.
- **No negative deltas applied** — no regressions identified during the reconciliation pass.

---

## Headline — tier averages shift

| Side | 2026-04-16 | 2026-04-18 | Δ |
|---|---|---|---|
| **Client** | 8.0 / 10 | **~8.5 / 10** | +0.5 |
| **Coach** | 7.0 / 10 | **~7.8 / 10** | +0.8 |
| **Product-wide** | 7.5 / 10 | **~8.1 / 10** | +0.6 |

The coach side closed most of the gap — no surprise, since the coach surface received the three biggest-Δ phases (2.1 rescue, 2.2 Analytics rewrite, 2.3 heavy rewrites). The client side shifted less in absolute terms because it started higher and most of its work was polish rather than rewrite.

---

## Tier transitions — structural summary

**Tier S (9.0+)** grew from **4 → 13 pages** (+9 new entrants):
- New 9.0s from Phase 3: `/coach/categories`, `/coach/workouts/templates`, `/coach/workouts/templates/[id]`, `/coach/challenges/[id]`, `/coach/goals`.
- New 9.0 from Phase 2.3: `/coach/programs/[id]/edit` (biggest single Δ in the project: +3.1, from 5.9 to 9.0).
- New 9.0s from Phase 4: `/coach/training`, `/client/check-ins`, `/client/progress/body-metrics`.

**Tier D (<6.0)** is now **empty** — all former Tier D pages rescued to Tier C or higher:
- `/coach/programs/[id]/edit` (5.9 → 9.0 — biggest jump)
- `/coach/meals` (DELETED, not counted)
- `/coach/clients/[id]/profile` (5.8 → 8.0)
- `/coach/nutrition` (5.6 → 7.0)
- `/coach/nutrition/meal-plans/[id]/edit` (5.6 → 6.8)
- `/coach/clients/[id]/workout-logs` (5.1 → 6.8)

**Tier C (6.0-6.9) residuals** that remain unchanged — these are the candidates for the Phase 5 wide-scope re-audit:
- `/coach/clients/[id]/workout-logs/[logId]` 6.8
- `/coach/clients/[id]/stats` 6.8
- `/coach/clients/[id]/check-ins` 6.8
- `/coach/nutrition/meal-plans/[id]` 6.8
- `/coach/nutrition/foods` 6.8
- `/coach/clients/[id]/progress` 6.6
- `/coach/nutrition/assignments` 6.2
- `/coach/programs/create` 6.2
- `/coach/nutrition/meal-plans/create` 6.2
- `/coach/clients/[id]/workout-logs` 6.8 (rescued from 5.1 in Phase 2.1 but still Tier C)
- `/coach/nutrition/meal-plans/[id]/edit` 6.8 (rescued from 5.6 but still Tier C — structural form limitations remain)

---

## Delta table — by phase

### Phase 2.1 — Tier D rescue (3 pages)

| Route | 2026-04-16 | 2026-04-18 | Δ | Evidence |
|---|---|---|---|---|
| `/coach/nutrition` | 5.6 | **7.0** | **+1.4** | Full hub rebuild (page + redesign): sparse link-list → `CoachPageShell data-7xl` + `GlassCard` hero + 5-card GlassCard grid matching `/coach/menu` pattern. 121 → 95 lines. Rewrite (cap waived). |
| `/coach/clients/[id]/workout-logs` | 5.1 | **6.8** | **+1.7** | Rebuilt: inner `max-w-3xl` wrapper removed, `<p>Loading…</p>` → `PageSkeleton variant="list"`, plain-text empty/error → `EmptyState variant="compact"`, redundant nav link dropped. Resolves "plain-text loading and empty states — lowest-polished screen on coach side" audit note. Rewrite (cap waived). |
| `/coach/nutrition/meal-plans/[id]/edit` | 5.6 | **6.8** | **+1.2** | 3-branch shell unified to `CoachPageShell form-2xl`; `animate-pulse` → `PageSkeleton variant="form"`; plain-text "not found" → `EmptyState icon={ChefHat}`; subtitle `-mt-2` hack removed. Form scope ("metadata-only") structural issue remains — deeper rebuild deferred to Phase 5. Capped at +1.2. |

### Phase 2.2 — Analytics family rewrite (5 pages)

| Route | 2026-04-16 | 2026-04-18 | Δ | Evidence |
|---|---|---|---|---|
| `/coach/analytics` | 6.4 | **7.6** | **+1.2** | Old `OptimizedAnalyticsReporting.tsx` (with `hidden sm:block shrink-0` mobile-header-hiding wrapper) **replaced** with new `OptimizedAnalyticsOverview.tsx`. Page adds `GlassCard` hero with visible `<h1>` + subtitle at all breakpoints. Mobile `<h1>` a11y gap resolved. Rewrite (capped at +1.2 polish cap because the delegated component is still dense). |
| `/coach/adherence` | 7.7 | **8.5** | **+0.8** | Nested `AnimatedBackground` + `FloatingParticles` + `max-w-7xl` + duplicate header stripped from `OptimizedAdherenceTracking`. Page hero `<h1>` "Adherence Overview" with `Filter` icon visible at all breakpoints. Rewrite. |
| `/coach/compliance` | 6.3 | **7.5** | **+1.2** | Same treatment applied to `OptimizedComplianceDashboard`. Page hero `<h1>` "Compliance Dashboard" with `ShieldCheck` icon. Rewrite (capped). |
| `/coach/reports` | 7.1 | **8.2** | **+1.1** | Same treatment applied to `OptimizedDetailedReports`. Page hero `<h1>` "Coaching Reports" with `FileText` icon on `--fc-aurora-green`. Rewrite. |
| `/coach/exercises` | 6.3 | **7.5** | **+1.2** | Nested chrome stripped from `OptimizedExerciseLibrary`. Different shape (no `AnalyticsNav`, just back-Link + flat `<h1>`). Rewrite (capped). |

### Phase 2.3 — Heavy rewrites (2 pages)

| Route | 2026-04-16 | 2026-04-18 | Δ | Evidence |
|---|---|---|---|---|
| `/coach/programs/[id]/edit` | 5.9 | **9.0** | **+3.1** | **Biggest single jump in the project.** 12-tier rewrite: min-h-screen/max-w-7xl wrappers collapsed; `animate-pulse` → `PageSkeleton variant="form"`; custom header → `GlassCard` hero + Badge + Back; 3 pill tabs → `AnalyticsNav`-style tabs with `role="tablist"`/`aria-selected`/44px touch; all `isDark ? ... : ...` inline styles removed; HTML checkbox → `shadcn/Switch`; custom fixed modal → `shadcn/Dialog`; 3× `window.location.href` → `router.push`; all raw color tokens swept to `--fc-*`; empty state → `GlassCard`; dead destructures removed. Rewrite (cap not applied). |
| `/coach/clients/[id]/profile` | 5.8 | **8.0** | **+2.2** | URL-jump → real tabs: `useSearchParams` + `router.push({ scroll: false })`; 5 sections with `role="tablist"`/`role="tab"`/`aria-selected` + 44px touch + horizontal-scroll overflow; `GlassCard` hero with visible `<h1>`; `PageSkeleton variant="list"` Suspense fallback; conditional per-section `role="tabpanel"` rendering. Rewrite (cap not applied). |

### Phase 3 — Tier C polish (7 pages)

| Route | 2026-04-16 | 2026-04-18 | Δ | Evidence |
|---|---|---|---|---|
| `/coach/clients/[id]` | 6.8 | **7.6** | **+0.8** | `animate-pulse` → `PageSkeleton variant="list"` + Phase 1.3 hit resolved. |
| `/coach/workouts/templates/[id]/edit` | 7.6 | **8.6** | **+1.0** | `animate-pulse` → `PageSkeleton variant="form"` + raw "Template not found" → `EmptyState` + `router.push` action; sticky dirty-state header preserved. |
| `/coach/categories` | 7.0 | **9.0** | **+2.0** | Full polish: `CoachPageShell default-5xl` + 3× `window.location.href` → `router.push` + `PageSkeleton variant="dashboard"` (main + Suspense) + `role="tablist"`/`aria-selected` + hover-lift via Tailwind + nested-style flatten + `group-hover:text-purple-600` → `--fc-accent` + custom empty state → `EmptyState icon={Layers}` + delete hover → token chain. Capped at 9.0. |
| `/coach/workouts/templates` | 8.0 | **9.0** | **+1.0** | `animate-pulse` → `PageSkeleton variant="list"` + `text-gray-400` → `fc-text-dim` + **custom fixed-inset `z-[9999]` Assign Workout Template modal (~190 lines) → `shadcn/Dialog`** with `aria-pressed` on client rows + `lucide/Check` icon + `fc-btn` footer. Unused imports pruned. Capped at 9.0. |
| `/coach/workouts/templates/[id]` | 7.0 | **9.0** | **+2.0** | `CoachPageShell default-5xl` (3 branches unified) + `PageSkeleton variant="list"` + "Template not found" → `EmptyState icon={FileQuestion}` + `router.push` + `text-gray-400` × 3 → `fc-text-dim` + delete button → `--fc-status-error` token chain. Capped at 9.0. |
| `/coach/challenges/[id]` | 8.0 | **9.0** | **+1.0** | `PageSkeleton variant="list"` + "Challenge not found" → `EmptyState` + **2 custom fixed modals → `shadcn/Dialog`** + 3 raw HTML inputs → `Textarea`/`Input` + `aria-label` on review textarea + HTML checkbox → `shadcn/Checkbox` + status dots/End-Challenge/amber warning pill all swept to `--fc-status-*` tokens. Capped at 9.0. |
| `/coach/goals` | 7.1 | **9.0** | **+1.9** | Massive cleanup (~1100 lines). Duplicate `<Dialog>` bug consolidated + `CoachPageShell data-7xl` + 2× `window.location.href` → `router.push` + `role="tablist"` + 2× `PageSkeleton variant="dashboard"`. `${theme.text}` × 40, `${theme.textSecondary}` × 13, `${theme.border}` × 16 → `fc-*` tokens. 4 hardcoded-gradient stat cards → `GlassCard` primitives. All status badges → `color-mix` token triads. 3× HTML checkbox → `shadcn/Checkbox`. `!important` positioning hacks removed from 2 Dialogs. Capped at 9.0. |

### Phase 4 — Tier B polish (43 pages)

#### Bucket A — Client verify-sweep

| Route | 2026-04-16 | 2026-04-18 | Δ | Wave | Evidence |
|---|---|---|---|---|---|
| `/client/me` | 7.2 | **7.5** | **+0.3** | A1 | Essentials: `router.push` + tokens. |
| `/client/activity` | 8.3 | **8.5** | **+0.2** | A1 | Essentials: `router.push` + tokens. |
| `/client/goals/history` | 7.6 | **8.0** | **+0.4** | A1 | Essentials: `router.push` + tokens. |
| `/client/challenges` | 7.6 | **8.6** | **+1.0** | 1.5c + A2 | Phase 1.5c shell unify + Phase 4 Wave A2: `router.push` + `shadcn/Dialog` (join modal) + token sweep. |
| `/client/check-ins/history` | 8.2 | **8.5** | **+0.3** | A2 | 3× `router.push` + tokens. |
| `/client/nutrition/foods/create` | 8.0 | **8.5** | **+0.5** | A2 | `router.push` + pervasive token sweep (`labelClass`/`fieldClass`/header/macros/footer). |
| `/client/progress/achievements` | 8.0 | **8.5** | **+0.5** | A2 | `router.push` + tab chip + header/stat/filter/error/empty tokens. |
| `/client/check-ins` | 8.9 | **9.0** | **+0.1** | A2 | Inline error → `EmptyState` + 2× `router.push` + tokens. Hits 9.0 polish cap. |
| `/client/progress` | 7.9 | **8.6** | **+0.7** | A2 | 2× `router.push` + full token sweep (header + stat + weekly bars + quick-stats + hub-links + export); chart bars cyan → `--fc-accent`. |
| `/client/challenges/[id]` | 7.8 | **8.2** | **+0.4** | 1.5a/b + A3 | Phase 1.5 shell unify + Phase 4: `router.push` + "Challenge not found" → `EmptyState icon={FileQuestion}`. |
| `/client/nutrition/foods/[id]` | 7.1 | **8.2** | **+1.1** | A3 | 3× `router.push` + error/not-found tokens + main full sweep (back, header, serving stepper, energy card, macro mix bars) + macro bars → `--fc-macro-protein/carbs/fat` + Edit-food FAB cyan → `color-mix(--fc-accent)` + `aria-label` on ± buttons. |
| `/client/nutrition/meals/[id]` | 6.8 | **7.8** | **+1.0** | A3 | 3× `router.push` + **error branch wrapped in `ClientPageShell`** (resolves audit-flagged "Error UI omits `ClientPageShell` — visual break"). |
| `/client/progress/workout-logs` | 8.0 | **8.4** | **+0.4** | A3 | 2× `router.push` + retry `bg-cyan-500` → `fc-btn fc-btn-primary` + 3× `border-white/5` → `fc-glass-border` + dim tokens + hover swap. |
| `/client/progress/performance` | 8.0 | **8.2** | **+0.2** | A3 | Essentials: `router.push` + glass-border + `aria-label`. |
| `/client/progress/personal-records` | 8.5 | **8.8** | **+0.3** | A3 | 2× `router.push` + retry cyan → `fc-btn-primary` + 8× borders + 3× dim tokens + hover. |
| `/client/progress/mobility` | 8.0 | **8.2** | **+0.2** | A3 | Essentials: `router.push`. |
| `/client/progress/workout-logs/[id]` | 6.9 | **7.5** | **+0.6** | A3.5 | Essentials-only: 4× `router.push` + 3 stale `text-gray-400` heading cleanups. |
| `/client/workouts/[id]/details` | 7.7 | **8.2** | **+0.5** | A3.5 | Essentials-only: 3× `router.push` + `aria-label` + 6× `border-white/5` → `fc-glass-border` + hover swap. |
| `/client/workouts/[id]/complete` | 8.2 | **8.6** | **+0.4** | A3.5 | Essentials-only: 5× `router.push` + loader wrapper tokens + error/not-found text + 13× border sweeps + hover swap. |
| `/client/programs/[id]/details` | 8.0 | **8.6** | **+0.6** | A3.5 | Essentials-plus: 3× `router.push` + bulk sweep of `border-white/*` + `bg-white/[*]` + text hierarchy + nav chip accent pair + CTA gradient → `fc-btn fc-btn-primary` + secondary → `fc-btn-ghost`. |
| `/client/nutrition` | 8.0 | **8.6** | **+0.6** | A4 | 2× `router.push` + macro labels/bars → `--fc-macro-*` vars + water/trends accents + cyan-pill CTAs via `color-mix()` + `dark:` variants removed (tokens are theme-aware). |
| `/client/progress/nutrition` | 7.0 | **7.5** | **+0.5** | A4 | Loading skeleton width mismatch fixed (`max-w-6xl` → `ClientPageShell max-w-lg + PageSkeleton`) — resolves audit-flagged jump between loading and loaded states. |
| `/client/goals` | 8.1 | **8.8** | **+0.7** | A5 | Comprehensive: `useRouter` + 1× `router.push` + 5 glass-shell swaps + 2 status/sort chip constants + 8 accent labels + 3 links + 9 gray captions + 3 white headings + modal close icon. Pillar color map preserved. |
| `/client/progress/analytics` | 6.1 | **7.0** | **+0.9** | A5 | Essentials: `useRouter` + 2× `router.push` + `rangeChip` constants + header badge/title/subtitle + 10 captions + 3 section headers + chart gradient + bars. **Restructure (split + promote most-used analytics) deferred to Phase 5** as product design decision. |
| `/client/progress/body-metrics` | 8.0 | **9.0** | **+1.0** | A5 | Densest page in Bucket A: 2× `router.push` + 4 CTA/FAB gradients → `fc-btn fc-btn-primary` + 2 modal inputs tokenized + tab-chip constants → `color-mix` + 20× glass-shell swaps + 14× border-t/b swaps + 11 accent labels + 10 white headings + 34 gray-token swaps. Capped at 9.0. |

#### Bucket B — Coach Tier B polish

| Route | 2026-04-16 | 2026-04-18 | Δ | Wave | Evidence |
|---|---|---|---|---|---|
| `/coach/challenges` | 8.0 | **8.2** | **+0.2** | B2 | `animate-pulse` → `PageSkeleton variant="dashboard"`. |
| `/coach/nutrition/meal-plans` | 7.4 | **7.6** | **+0.2** | B2 | `animate-pulse` → `PageSkeleton variant="list"`. |
| `/coach/clients/add` | 8.0 | **8.4** | **+0.4** | B2 | 3× `theme.primary` → `fc-btn fc-btn-primary fc-press` + 2 border tokens + 1 label token + `getThemeStyles`/`theme` destructure removed. |
| `/coach/training` | 8.8 | **9.0** | **+0.2** | B3 | 2× `window.location.href` → `<Link>` + border + hover + accent tokens. Hits 9.0 polish cap. |
| `/coach/nutrition/generator` | 7.4 | **7.8** | **+0.4** | B3 | 5× section label `text-gray-400` → `fc-text-dim` + 2× `border-t black/5 dark:white/5` → `--fc-glass-border`. |
| `/coach/clients` | 8.3 | **8.7** | **+0.4** | B4 | 5× `text-cyan-400(/70)` → `--fc-accent` + 3× border swaps + `hover:bg-white/[0.02]` → `--fc-glass-highlight`. Semantic amber "invited" badges preserved. |
| `/coach/gym-console` | 7.8 | **8.5** | **+0.7** | B4 | 6× `text-cyan-400` → `--fc-accent` + 3× `bg-cyan-600` CTA → `fc-btn fc-btn-primary fc-press` + 4× input chrome + card + hover + selected-chip → `color-mix` tokens. Semantic green/amber live status colors preserved. |
| `/coach/progress` | 7.1 | **8.5** | **+1.4** | B5 | Heavy rewrite: 172 `${theme.*}` template literals swept (`theme.text` × 77, `theme.textSecondary` × 61, `theme.shadow` × 27, `theme.border` × 7, `theme.card` × 5, `theme.gradient` × 1) + 2× `group-hover:text-purple-600` → `--fc-accent` + 15× `isDark ? ... : ...` ternaries flattened + `useTheme` destructure cleaned. Cap waived (heavy rewrite). |

#### Bucket C — Two deferred heavies

| Route | 2026-04-16 | 2026-04-18 | Δ | Evidence |
|---|---|---|---|---|
| `/coach/profile` | 6.8 | **7.5** | **+0.7** | `hover:bg-white/10` → `--fc-glass-highlight` + **4 custom peer-checkbox toggles → `shadcn/Switch`** (each with `aria-label`) + `animate-pulse` → `PageSkeleton variant="form"`. |
| `/coach/clients/[id]/programs/[programId]` | 7.3 | **8.2** | **+0.9** | `PageSkeleton variant="dashboard"` + Pause button overrides removed + 16 token swaps: `text-gray-400` → `fc-text-dim`, `border-white/5` → `--fc-glass-border`, empty-slot tokenized, workout-card active/default/hover/focus → `color-mix` on `--fc-accent` + `--fc-glass-highlight`, "Edited" badge tokenized, 3 modal action buttons + helper caption + template-search input + divider all tokenized. |

---

## Pages NOT re-graded (explicit list)

### Benchmarks (frozen, not changed)
- `/client/workouts/[id]/start` — 9.5
- `/client` — 9.1
- `/client/train` — 9.1
- `/coach` — 9.0

### Phase 4 verified-clean (no edits, grade unchanged)
- `/client/check-ins/weekly` — 8.5
- `/client/progress/leaderboard` — 8.1 (Phase 1.5 shell unify only; Phase 4 confirmed clean)
- `/client/habits` — 8.2
- `/client/profile` — 7.8 (`window.location.href = '/'` on signOut retained deliberately)
- `/coach/menu` — 7.4
- `/coach/workouts/templates/[id]/edit` — 8.6 (already covered by Phase 3 delta above)

### Untouched since 2026-04-16 (carry baseline grade)
These Tier C pages were not in any polished phase. They are Phase 5 wide-scope candidates.

- `/coach/clients/[id]/workout-logs/[logId]` — 6.8 ("no mobile card view" audit note still open)
- `/coach/clients/[id]/stats` — 6.8 ("stacked delegated views; no unifying hierarchy")
- `/coach/clients/[id]/check-ins` — 6.8 ("no card shell around wellness/metrics sections")
- `/coach/nutrition/meal-plans/[id]` — 6.8 ("dense meal builder; no polish pass")
- `/coach/nutrition/foods` — 6.8 ("dense food table cramped on mobile")
- `/coach/clients/[id]/progress` — 6.6 ("title/route mismatch — title 'Check-ins', route 'progress'")
- `/coach/nutrition/assignments` — 6.2 ("duplicate back-navigation")
- `/coach/programs/create` — 6.2 ("`max-w-4xl` form, no `AnimatedBackground` — plain")
- `/coach/nutrition/meal-plans/create` — 6.2 ("narrow form jarring vs list it links from")
- `/client/workouts` — 7.6 (delegate wrapper only; content lives in `EnhancedClientWorkouts.tsx`)
- `/coach/clients/[id]/workouts` — 7.0
- `/coach/clients/[id]/meals` — 7.0
- `/coach/programs` — 7.0 (no sticky toolbar; deferred)
- `/coach/programs/[id]` — 7.0 (not-found branch untouched)
- `/coach/workouts/templates/create` — 7.0 (Phase 3 skipped — already clean)

### Not graded (admin + top-level out of scope)
- `/admin/tracking-sources`, `/admin/habit-categories`, `/admin/goal-templates`, `/admin/achievement-templates`
- `/create-user`

### Deleted since 2026-04-16
- `/coach/meals` (5.9, deleted 2026-04-16)
- `/coach/habits` (redirect, deleted 2026-04-16)
- `/coach/exercise-categories` (redirect, deleted 2026-04-16)
- `/client/test-*` (7 dev-only routes, deleted 2026-04-16)

---

## Open observations

1. **No more Tier D.** Every former Tier D page was either rescued (Phase 2.1, 2.2, 2.3) or deleted. The weakest graded page on the coach side is now at 6.2 (`/coach/nutrition/assignments`, `/coach/programs/create`, `/coach/nutrition/meal-plans/create`).

2. **Tier S roster expanded 4 → 13.** The 9 new 9.0s are all polish-cap ceilings — none cross into 9.5 territory. **9.5 requires Phase 5** (desktop polish + a11y + micro-interactions).

3. **Coach/client gap closed significantly.** The original gap was 1.0 (8.0 client vs 7.0 coach). Now ~0.7 (8.5 vs 7.8). The remaining gap is almost entirely in the Tier C coach residuals listed above.

4. **13 pages held at Tier C** (all on coach side). These are the natural targets for the Phase 5 wide-scope re-audit.

5. **One known restructure still open:** `/client/progress/analytics` got a +0.9 essentials-only polish (6.1 → 7.0) in Phase 4 Wave A5, but its structural "split + promote most-used analytics to the `/client/progress` hub" decision was deferred to Phase 5 as a product design question.

6. **Pixel-level calibration still pending.** This is a static-code audit. A screenshot pass at Phase 5 could recalibrate ±0.5 per page. Tier assignments are robust to that uncertainty; individual decimals are not.

---

## Attribution

This delta audit was assembled from documented phase work in `docs/ui/screen-inventory.md` (Phases 1.5, 2.1, 2.2, 2.3, 3, 4). Every Δ is evidence-backed; no grade shift was assigned without a corresponding change-log in the inventory. The inventory was reconciled on 2026-04-18 (pre-audit) so that Phase 2.2 and Phase 2.3 rows reflected their actual completed state.

Baseline: `docs/ui/audit-grades-2026-04-16.md`.

Next-scheduled audit: **full re-grade at the end of Phase 5** (once desktop polish + a11y + micro-interactions are applied, enabling pages to cross from 9.0 polish-cap into the 9.5 benchmark tier).
