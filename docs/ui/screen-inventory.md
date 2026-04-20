# UI Screen Inventory — 2026-04-16

> **Scope:** Every `page.tsx` under `src/app/{client,coach,admin}`, plus top-level routes. Authoritative for the 9.5-standard uplift.
>
> **How to read:**
> - **Grade** — from `docs/ui/audit-grades-2026-04-16.md`. `—` = not graded (admin, dev-only, test, redirect).
> - **Current shell** — `ClientPageShell`, inline (raw `<div className="max-w-...">`), bespoke (custom wrapper), or `verify-at-sweep` where not yet confirmed. **Do not** trust "verify-at-sweep" cells as facts — they must be confirmed in Phase 1.0.
> - **Target shell / width** — the intended shell after Phase 1. For coach routes, variants beyond `max-w-5xl` (coach dashboard benchmark) are **proposed** and must be ratified with the user during Phase 0.2 when `CoachPageShell` is built.
> - **Phase** — which uplift phase owns this screen: `1` mechanical sweep, `2` Tier D rescue, `3` Tier C polish, `4` Tier B polish, `5` 9→9.5 push, `delete` for dead routes, `hold` for admin/test/dev.
>
> **Do not edit grades here.** They are a 2026-04-16 snapshot. Re-grade during Phase 5 and write a new dated audit file.

---

## 1. Client primary (top-level hubs, hero screens)

| Route | Grade | Current shell | Target shell / width | Phase |
|---|---|---|---|---|
| `/client` | 9.1 (benchmark) | `ClientPageShell max-w-lg` (verified) | freeze | 5 — desktop-only polish only |
| `/client/train` | 9.1 (benchmark) | `ClientPageShell max-w-lg` (verified) | freeze | 5 — desktop-only polish only |
| `/client/check-ins` | 8.9 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A2 2026-04-18**: inline error → `EmptyState`; 2× `router.push`; token sweep | verify-done | done |
| `/client/progress` | 7.9 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A2 2026-04-18**: 2× `router.push`; full token sweep of header, stat card, weekly bars (cyan → `--fc-accent`), quick-stats strip, hub-links divide/hover, export row | verify-done | done |
| `/client/habits` | 8.2 | `ClientPageShell max-w-lg` + `PageSkeleton` + tokens — **verified clean Phase 4 Wave A4 2026-04-18, no edits required** | verify-done | done |
| `/client/goals` | 8.1 | **polished Phase 4 Wave A5 2026-04-18**: `useRouter` added, 1× `window.location.href = "/client/goals/history"` → `router.push`; 5× `border border-white/10 bg-white/[0.04]` → `fc-glass-soft`; 2× status/sort chip active constants (`border-cyan-500/40 bg-cyan-500/15 text-cyan-300`) → `color-mix(accent,15/40%)` + `--fc-accent`; 2× inactive constants (`border-white/10 bg-white/[0.03] text-gray-400`) → `--fc-glass-border`/`--fc-glass-highlight`/`fc-text-dim`; 4× `text-cyan-300/70` pillar labels + 1× `text-cyan-400/70` filter counter + 3× `text-cyan-400 hover:text-cyan-300` links → `--fc-accent`; stat dividers `bg-white/10` → `--fc-glass-border`; archive hover `bg-white/[0.03]` → `--fc-glass-highlight`; `text-white` headings × 3 + `text-gray-400/500` captions × 9 → `fc-text-primary`/`fc-text-dim`/`fc-text-subtle`; preset-modal close icon `text-gray-400 hover:text-white` → `fc-text-dim hover:fc-text-primary`. Pillar config `text-gray-600` (line 392) intentionally preserved — semantic pillar-identity color. | verify-done | done |
| `/client/nutrition` | 8.0 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A4 2026-04-18**: 2× `window.location.href` → `router.push`; macro labels + bars → `--fc-macro-protein/carbs/fat` vars; water/trends accents → `--fc-accent-cyan` + `--fc-accent`; cyan-pill CTAs tokenized via `color-mix()`; `dark:` variants removed (fc tokens are theme-aware) | verify-done | done |
| `/client/challenges` | 7.6 | `ClientPageShell max-w-lg` (migrated Phase 1.5c 2026-04-17) — **polished Phase 4 Wave A2 2026-04-18**: `router.push` + `shadcn/Dialog` for track-select/join modal + token sweep | verify-done | done |
| `/client/activity` | 8.3 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A1 2026-04-18** | verify-done | done |
| `/client/profile` | 7.8 | `ClientPageShell max-w-lg` verified — **Phase 4 Wave A4 2026-04-18: verified clean, no edits required**. Single `window.location.href = '/'` retained deliberately (hard reload after signOut to clear auth state) | verify-done | done |
| `/client/me` | 7.2 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A1 2026-04-18** | verify-done | done |
| `/client/workouts` | 7.6 | `max-w-3xl` (audit note) | `ClientPageShell max-w-lg` — confirm with user | 4 |

## 2. Client sub-pages

| Route | Grade | Current shell | Target shell / width | Phase |
|---|---|---|---|---|
| `/client/workouts/[id]/start` | 9.5 (benchmark) | `ClientPageShell max-w-2xl` (verified) | freeze | 5 — desktop-only polish only |
| `/client/workouts/[id]/details` | 7.7 | `ClientPageShell max-w-2xl` verified — **polished Phase 4 Wave A3.5 2026-04-18 (essentials-only)**: 3× `window.location.href` → `router.push` (+ `aria-label` on back btn); 6× `border-white/5` → `--fc-glass-border`; 1× `hover:bg-white` → `fc-glass-highlight` | verify-done | done (essentials) |
| `/client/workouts/[id]/complete` | 8.2 | `ClientPageShell max-w-2xl` verified — **polished Phase 4 Wave A3.5 2026-04-18 (essentials-only)**: 5× `window.location.href` → `router.push`; loader skeleton wrapper tokens; error/not-found text tokens; 13× border sweeps; 1× hover swap. Bespoke celebration skeleton at L1500 preserved intentionally | verify-done | done (essentials) |
| `/client/programs/[id]/details` | 8.0 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A3.5 2026-04-18 (essentials-only)**: 3× `window.location.href` → `router.push`; bulk sweep of `border-white/*` + `bg-white/[*]` → `fc-glass-*`; `text-gray-4/500/{80}` → `fc-text-dim/subtle`; `text-white/9x` → `fc-text-primary`; nav chip accent pair → `--fc-accent`; CTA gradient → `fc-btn fc-btn-primary`; secondary → `fc-btn-ghost`. Goal-dot ring classes preserved (semantic) | verify-done | done (essentials) |
| `/client/check-ins/history` | 8.2 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A2 2026-04-18**: 3× `router.push` + token sweep | verify-done | done |
| `/client/check-ins/weekly` | 8.5 | `ClientPageShell max-w-lg` — **Phase 4 Wave A1 2026-04-18: verified clean/frozen, no edits required** | verify-done | done |
| `/client/goals/history` | 7.6 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A1 2026-04-18** | verify-done | done |
| `/client/nutrition/foods/create` | 8.0 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A2 2026-04-18**: `router.push` + pervasive token sweep (labelClass, fieldClass, header, macros, footer) | verify-done | done |
| `/client/nutrition/foods/[id]` | 7.1 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A3 2026-04-18**: 3× `router.push`; error + not-found branches tokenized; main render full token sweep (back, header, serving stepper, energy card, macro mix bars); macro bars → `--fc-macro-protein/carbs/fat` (with accent/warning/success fallbacks); Edit-food FAB cyan → `color-mix(--fc-accent)` chain; `aria-label` on ± buttons | verify-done | done |
| `/client/nutrition/meals/[id]` | 6.8 | `ClientPageShell max-w-lg` — **polished Phase 4 Wave A3 2026-04-18**: 3× `router.push`; error branch wrapped in `ClientPageShell` (was bare `<div>` — resolves audit-flagged double-shell) | verify-done | done |
| `/client/progress/analytics` | 6.1 | inline `max-w-xl` (audit note — cramped, very long) — **essentials polished Phase 4 Wave A5 2026-04-18**: `useRouter` added, `window.location.href` × 2 → `router.push`; header back button + PR button + Exercises pill tokenized (`fc-glass-soft`/`color-mix(accent,10/30%)`); `rangeChip` active/inactive constants tokenized; header icon badge + title + subtitle + section captions (`text-gray-500` × 10, `text-cyan-300`, `text-cyan-400`, `text-white`) → `fc-text-primary`/`fc-text-dim`/`fc-text-subtle`/`--fc-accent`; weekly-volume chart bars `from-cyan-500 to-cyan-400` → `--fc-accent`; activity-type distribution bars `bg-cyan-500` → `--fc-accent`. **Split + promote most-used analytics to `/client/progress` hub still required** — deferred to Phase 5 as product design decision. | Phase 5 restructure | 5 |
| `/client/progress/achievements` | 8.0 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A2 2026-04-18**: `router.push` + tab chip tokens + header/stat/filter/error/empty sweeps | verify-done | done |
| `/client/progress/body-metrics` | 8.0 | **polished Phase 4 Wave A5 2026-04-18** (densest page in Bucket A): `window.location.href` × 2 → `router.push`; 4 primary CTA/FAB gradients (`from-cyan-600 to-cyan-500` + `shadow-cyan-500/25`) → `fc-btn fc-btn-primary fc-press`; 2 modal inputs tokenized (`border-white/10 bg-white/[0.04]` + `focus:ring-cyan-500/40` → `--fc-glass-border`/`fc-glass-soft`/`--fc-accent`); `tabChipActive`/`tabChipInactive` constants → `color-mix(accent,20/30%)` + `--fc-glass-highlight`; 20× `border border-white/10 bg-white/[0.04]` → `fc-glass-soft`; 7× `border-b border-white/10` + 7× `border-t border-white/10` → `--fc-glass-border`; photo comparison selects + dropdown button (`bg-white/[0.06]`) → `--fc-glass-highlight`; 11× `text-cyan-300/70` label + `text-cyan-400` accent icon + `bg-cyan-500/50` chart bar → `--fc-accent` tokens; `text-white` × 10 in headings/stats → `fc-text-primary`; 21× `text-gray-500` + 7× `text-gray-400` + 2× `text-gray-600` + 1× `text-gray-300` + 4× `text-gray-200` → `fc-text-subtle`/`fc-text-dim`/`fc-text-primary`. Overlay `text-white` on `bg-black`/`bg-black/60` fullscreen photo viewer intentionally preserved. | verify-done | done |
| `/client/progress/mobility` | 8.0 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A3 2026-04-18**: `router.push` | verify-done | done |
| `/client/progress/performance` | 8.0 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A3 2026-04-18**: `router.push` + glass-border token + `aria-label` | verify-done | done |
| `/client/progress/nutrition` | 7.0 | `ClientPageShell max-w-lg` — **polished Phase 4 Wave A4 2026-04-18**: loading skeleton width mismatch fixed (`max-w-6xl` → `ClientPageShell max-w-lg + PageSkeleton`). Main content already clean | verify-done | done |
| `/client/progress/personal-records` | 8.5 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A3 2026-04-18**: 2× `router.push`; retry cyan → `fc-btn-primary`; 8× `border-white/5` (y/b/t) → `--fc-glass-border`; 3× `text-gray-400 dark:text-gray-500` → `fc-text-dim`; hover `bg-white/[0.02]` → `fc-glass-highlight` | verify-done | done |
| `/client/progress/leaderboard` | 7.8 | `ClientPageShell max-w-lg` (migrated Phase 1.5a/b 2026-04-17) — **Phase 4 Wave A1 2026-04-18: verified clean/frozen, no edits required** | verify-done | done |
| `/client/progress/workout-logs` | 8.0 | `ClientPageShell max-w-lg` verified — **polished Phase 4 Wave A3 2026-04-18**: 2× `router.push`; retry `bg-cyan-500` → `fc-btn fc-btn-primary`; 3× `border-white/5` → `--fc-glass-border`; `text-gray-400 dark:text-gray-500` → `fc-text-dim`; hover `bg-white/[0.06]` → `fc-glass-highlight` | verify-done | done |
| `/client/progress/workout-logs/[id]` | 6.9 | `ClientPageShell` verified — **polished Phase 4 Wave A3.5 2026-04-18 (essentials-only)**: 4× `window.location.href` → `router.push`; 3× stale `text-gray-400` on already-tokenized headings removed | verify-done | done (essentials) |
| `/client/challenges/[id]` | 7.8 | `ClientPageShell max-w-lg` (migrated Phase 1.5a/b 2026-04-17) — **polished Phase 4 Wave A3 2026-04-18**: `window.location.href` → `router.push`; "Challenge not found" GlassCard → `EmptyState icon={FileQuestion}`; unused `ArrowLeft` import dropped | verify-done | done |
| `/client/progress/photos` | — (redirect) | redirect to `/client/progress/body-metrics?tab=photos` — **touched Phase 4 Wave A1 2026-04-18** (minor token pass) | keep as redirect | done |

## 3. Coach primary (hubs, dashboards, top-level lists)

Width target legend — **ratified 2026-04-16, implemented in `src/components/coach-ui/CoachPageShell.tsx`**:
- **benchmark-5xl** — matches the coach dashboard benchmark exactly (`max-w-5xl`). Parity-frozen; only used by `/coach/page.tsx`.
- **default-5xl** — default for coach hero + detail pages that are not data-dense (`max-w-5xl`). Same width as `benchmark-5xl`; separate variant name to allow future divergence.
- **data-7xl** — table / roster views when a table > 6 columns or a grid fills 4 columns at `≥1280px` (`max-w-7xl`).
- **form-2xl** — single-column forms / wizards (`max-w-2xl`).

Per-route assignments below are **still proposed** and must be confirmed during the Phase 1.1 migration (when each file is opened and its current shell confirmed).

| Route | Grade | Current shell | Target (proposed) | Phase |
|---|---|---|---|---|
| `/coach` | 9.0 (benchmark) | `CoachPageShell widthVariant="benchmark-5xl"` with `className="px-4 sm:px-6"` — **migrated 2026-04-16, byte-identical on mobile** | freeze | 5 |
| `/coach/clients` | 8.3 | `CoachPageShell widthVariant="data-7xl" className="pb-32"` — **migrated 2026-04-17 (Phase 1.1)**. **Polished Phase 4 Wave B4 2026-04-18**: 5× `text-cyan-400(/70)` accent → `--fc-accent`; 3× `border-white/5` y/b variants → `--fc-glass-border`; `hover:bg-white/[0.02]` → `--fc-glass-highlight`. Semantic amber "invited" badges preserved | verify-done | done |
| `/coach/programs` | 7.0 | `CoachPageShell widthVariant="data-7xl" className="px-4 py-3 pb-32 sm:px-6 sm:py-4"` — **migrated 2026-04-17 (Phase 1.1, 2-layer collapse)**; no sticky toolbar (audit note) | add sticky toolbar (Phase 1.6); tier-polish in Phase 3 | 1.6 + 3 |
| `/coach/workouts/templates` | 9.0 | inherits existing shell; **polished Phase 3 2026-04-18 (Batch 3.2)** — `animate-pulse` → `PageSkeleton variant="list"`; custom fixed-inset Assign Workout Template modal → `shadcn/Dialog` with tokenized selection state; `text-gray-400` → `fc-text-dim`; unused `X`/`CopyIcon`/`Trash2` imports pruned | Phase 4 polish | done |
| `/coach/exercises` | 6.3 | **Rewritten Phase 2.2 2026-04-17**: nested `AnimatedBackground` removed from `OptimizedExerciseLibrary`; page now renders `CoachPageShell widthVariant="data-7xl"` + single `<AnimatedBackground>` (page-level) + back-`Link` to `/coach/training` + `<h1>` "Exercise library" (visible at all breakpoints, no `hidden sm:block`). Component is pure content. Uses fc-* tokens throughout | verify-done | done |
| `/coach/nutrition` | 5.6 | `CoachPageShell widthVariant="data-7xl" className="px-4 sm:px-6 py-6 pb-32 space-y-8"` — **rebuilt Phase 2.1 2026-04-17**; duplicate "Quick links" section removed; mirrors `/coach/menu` pattern (GlassCard hero + `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` of 5 GlassCard items); `Apple` icon hero, aurora-accent bubbles | Phase 4 polish | done |
| `/coach/training` | 8.8 | responsive width (`max-w-lg` → `sm:max-w-2xl`) — **not compatible with `CoachPageShell` single-variant**; kept as-is. **Polished Phase 4 Wave B3 2026-04-18**: `window.location.href` × 2 → `<Link>` components; `border-white/5` → `--fc-glass-border`; `hover:bg-white/[0.02]` → `--fc-glass-highlight`; `text-cyan-400` accents → `--fc-accent` | verify-done | done |
| `/coach/meals` | 5.9 | ~~full "Nutrition Studio" at 73KB~~ | **DELETED 2026-04-16** — user-verified as old/unused; `Meals` link also removed from `/coach/nutrition` Quick Links | — |
| `/coach/categories` | 9.0 | `CoachPageShell widthVariant="default-5xl"` — **polished Phase 3 2026-04-18 (Batch 3.2)**; `window.location.href` × 3 → `router.push`; `animate-pulse` → `PageSkeleton variant="dashboard"` (main + Suspense fallback); tab buttons → `role="tablist"`/`aria-selected`; card hover `onMouseEnter`/`Leave` → Tailwind `hover:-translate-y-0.5 hover:shadow-lg`; empty-state inline styles → `EmptyState icon={Layers}`; `group-hover:text-purple-600` → `--fc-accent` token | Phase 4 polish | done |
| `/coach/goals` | 9.0 | `CoachPageShell widthVariant="data-7xl"` — **polished Phase 3 2026-04-18 (Batch 3.3)**; duplicate `<Dialog>` bug consolidated (orphan `<DialogTrigger>` removed, plain `onClick` used); `${theme.text}` × 40 + `${theme.textSecondary}` × 16 + `${theme.border}` × 16 → `fc-*` tokens; stat cards with hardcoded linear-gradients → `GlassCard` + `color-mix` token pills; goal cards `div.fc-surface` → `GlassCard elevation={1}` with hover-lift; 3 HTML `<input type=checkbox>` → `shadcn/Checkbox`; 2 Dialogs stripped of `!important` positioning hacks; `window.location.href` × 2 → `router.push`; `animate-pulse` × 2 → `PageSkeleton variant="dashboard"` | Phase 4 polish | done |
| `/coach/challenges` | 8.0 | `max-w-screen-xl` (not a variant); deferred from Phase 1.1 shell-decision. **Polished Phase 4 Wave B2 2026-04-18**: `animate-pulse` loading → `PageSkeleton variant="dashboard"` (import added). Width decision (map to `data-7xl` or custom override) still open | width decision open; tokens done | done (tokens) |
| `/coach/adherence` | 7.7 | **Rewritten Phase 2.2 2026-04-17**: nested `AnimatedBackground`/`FloatingParticles` removed from `OptimizedAdherenceTracking`; page now renders `CoachPageShell widthVariant="data-7xl"` + single `<AnimatedBackground>` + `AnalyticsNav` + `GlassCard` hero with `Filter` icon, `<h1>` "Adherence Overview" + subtitle (visible at all breakpoints). Uses fc-* tokens | verify-done | done |
| `/coach/compliance` | 6.3 | **Rewritten Phase 2.2 2026-04-17**: nested `AnimatedBackground`/`FloatingParticles` removed from `OptimizedComplianceDashboard`; page now renders `CoachPageShell widthVariant="data-7xl"` + single `<AnimatedBackground>` + `AnalyticsNav` + `GlassCard` hero with `ShieldCheck` icon, `<h1>` "Compliance Dashboard" + subtitle (visible at all breakpoints). Uses fc-* tokens | verify-done | done |
| `/coach/analytics` | 6.4 | **Rewritten Phase 2.2 2026-04-17**: the `hidden sm:block` mobile-`<h1>` a11y gap in the old `OptimizedAnalyticsReporting.tsx` (L152-153) resolved by **replacing that component with `OptimizedAnalyticsOverview`** (new, clean — no nested `AnimatedBackground`, no hidden-mobile-header wrapper). Page now renders `CoachPageShell widthVariant="data-7xl"` + `AnalyticsNav` + `GlassCard` hero with `BarChart3` icon, `<h1>` "Analytics" + subtitle (visible at all breakpoints). Uses fc-* tokens | verify-done | done |
| `/coach/reports` | 7.1 | **Rewritten Phase 2.2 2026-04-17**: nested `AnimatedBackground`/`FloatingParticles` removed from `OptimizedDetailedReports`; page now renders `CoachPageShell widthVariant="data-7xl"` + single `<AnimatedBackground>` + `AnalyticsNav` + `GlassCard` hero with `FileText` icon, `<h1>` "Coaching Reports" + subtitle (visible at all breakpoints). Uses fc-* tokens | verify-done | done |
| `/coach/progress` | 7.1 | `CoachPageShell widthVariant="data-7xl"` on both loading + main branches — **migrated 2026-04-17 (Phase 1.1, multi-branch)**; subtitle mobile-visibility **fixed 2026-04-17 (Phase 1.6)**; audit's `h1`-ordering note re-verified and dropped. **Heavy rewrite Phase 4 Wave B5 2026-04-18**: 172 `${theme.*}` template literals swept — 77× `theme.text` → `fc-text-primary`; 61× `theme.textSecondary` → `fc-text-dim`; 27× `theme.shadow` inlined (`shadow-2xl shadow-black/25`); 7× `theme.border` → `--fc-glass-border`; 5× `theme.card` → `fc-glass-highlight` + `fc-glass-border` (with dedupe of double-borders); 1× `theme.gradient` inlined. Plus 2× `group-hover:text-purple-600` → `--fc-accent`; 15× `isDark ? ... : ...` ternaries flattened to dark branch; `useTheme` destructure cleaned (`isDark`/`getThemeStyles`/`theme` removed). Semantic 8-gradient client avatar palette + metric icon-badge gradients (blue/green/orange/purple/red/yellow/pink/indigo) + status pill colors all preserved | verify-done | done |
| `/coach/gym-console` | 7.8 | full-viewport `h-[100dvh] flex flex-col` with sticky-header + scrollable body — **not compatible with `CoachPageShell`**; deferred from Phase 1.1. **Polished Phase 4 Wave B4 2026-04-18**: 6× `text-cyan-400` → `--fc-accent`; 3× `bg-cyan-600 hover:bg-cyan-700` CTA → `fc-btn fc-btn-primary fc-press`; 4× input chrome `bg-white/5 border border-white/10` → `fc-glass-highlight` + `fc-glass-border`; `border-t border-white/10` → `fc-glass-border`; `p-3 rounded-lg bg-white/5` card → `fc-glass-highlight`; `hover:bg-white/5` → `fc-glass-highlight`; selected chip `bg-cyan-500/20 border-cyan-500/40` → `color-mix(--fc-accent, 20/40%)`. **Semantic green/amber live status colors preserved** | verify-done | done |
| `/coach/profile` | 6.8 | `CoachPageShell widthVariant="form-2xl"` — **migrated 2026-04-17 (Phase 1.1 Batch 2 Group A)**. **Polished Phase 4 Bucket C 2026-04-18**: `hover:bg-white/10` → `hover:bg-[color:var(--fc-glass-highlight)]`; **4 custom peer-checkbox toggles → `shadcn/Switch`** (each with `aria-label`); loading `animate-pulse` → `PageSkeleton variant="form"`. Imports added: `Switch`, `PageSkeleton`. Password-change modal left outside shell (fixed inset-0 positioning preserved) | verify-done | done |
| `/coach/menu` | 7.4 | `CoachPageShell widthVariant="data-7xl"` — **migrated 2026-04-17 (Phase 1.1 Batch 2 Group A)**. **Phase 4 Wave B1 2026-04-18: verified clean, no edits required** | verify-done | done |
| `/coach/habits` | — (redirect) | ~~redirect to `/coach/goals?tab=habits`~~ | **DELETED 2026-04-16** | — |
| `/coach/exercise-categories` | — (redirect) | ~~redirect to `/coach/categories?tab=exercises`~~ | **DELETED 2026-04-16** (also removed `startsWith("/coach/exercise-categories")` check in `BottomNav.tsx`) | — |

## 4. Coach sub-pages

| Route | Grade | Current shell | Target (proposed) | Phase |
|---|---|---|---|---|
| `/coach/clients/add` | 8.0 | `CoachPageShell widthVariant="form-2xl"` — **migrated 2026-04-17 (Phase 1.1)**. **Polished Phase 4 Wave B2 2026-04-18**: 3× `theme.primary` CTA → `fc-btn fc-btn-primary fc-press`; 2× `border-black/5 dark:border-white/5` → `--fc-glass-border`; 1× `text-gray-400` label → `fc-text-dim`. `getThemeStyles`/`theme` destructure removed | verify-done | done |
| `/coach/clients/[id]` | 7.6 | inherits `CoachPageShell widthVariant="data-7xl"` from parent layout — **polished Phase 3 2026-04-18 (Batch 3.1)**: bespoke `animate-pulse` block → `PageSkeleton variant="list"`; resolves deferred Phase 1.3 `animate-pulse` hit | Phase 4 polish | done |
| `/coach/clients/[id]/profile` | 5.8 | **Rewritten Phase 2.3 2026-04-17**: 5-section URL-jump pattern replaced with real client-side tabs. Page now uses `useSearchParams` + `router.push({ scroll: false })` and conditional rendering per section (Personal / Subscription / Habits / Activities / Account — all rendered in-place, no hard reloads). Tab bar uses `role="tablist"` + `role="tab"` + `aria-selected` + `aria-label="Profile sections"` + 44px min-height touch target + horizontal scroll with `scrollbar-hide`. `GlassCard` hero with `User` icon + `<h1>` "Profile" + subtitle. `<PageSkeleton variant="list" />` Suspense fallback. Inherits parent layout's `CoachPageShell data-7xl`. All fc-* tokens | verify-done | done |
| `/coach/clients/[id]/workouts` | 7.0 | inherits `CoachPageShell widthVariant="data-7xl"` from parent layout — **migrated 2026-04-17 (Phase 1.1, via layout)** | tier-polish in Phase 3 | 3 |
| `/coach/clients/[id]/workout-logs` | 5.1 | **rebuilt Phase 2.1 2026-04-17**; inherits parent layout's `CoachPageShell widthVariant="data-7xl"` (inner `max-w-3xl` wrapper removed — was narrower than `CoachClientTabBar` above); `<p>Loading…</p>` → `PageSkeleton variant="list"`; plain-text empty state → `EmptyState icon={Dumbbell} variant="compact"`; plain-text error → `EmptyState icon={AlertTriangle} variant="compact"`; redundant "Back to Training" link removed (parent `CoachClientTabBar` handles nav); row cards kept as-is (already `fc-glass-soft`) | Phase 4 polish | done |
| `/coach/clients/[id]/workout-logs/[logId]` | 6.8 | verify-at-sweep; no mobile card view (audit note) | `default-5xl` + mobile card list alternative | 3 |
| `/coach/clients/[id]/stats` | 6.8 | inherits `CoachPageShell widthVariant="data-7xl"` from parent layout — **migrated 2026-04-17 (Phase 1.1, via layout)**; stacks delegated views without hierarchy (audit note) | `SectionHeader`s during Phase 3 | 3 |
| `/coach/clients/[id]/progress` | 6.6 | inherits `CoachPageShell widthVariant="data-7xl"` from parent layout — **migrated 2026-04-17 (Phase 1.1, via layout)**; **label/route mismatch** — title "Check-ins & Assessments" but route "progress" (audit note). **Phase 1.6 investigation (2026-04-17):** naming decision is non-trivial because a sibling route `/coach/clients/[id]/check-ins` already exists separately, so the title and route are likely BOTH wrong in a non-obvious way — requires a holistic look at the tab set (`CoachClientTabBar`) to decide whether this route should be renamed, its title should change, or the two sibling routes should be merged. **Deferred to Phase 3** where the full client-detail tab set is reviewed together | Phase 3 decision (rename, retitle, or merge with sibling check-ins route) | 3 |
| `/coach/clients/[id]/check-ins` | 6.8 | inherits `CoachPageShell widthVariant="data-7xl"` from parent layout — **migrated 2026-04-17 (Phase 1.1, via layout)**; no card shell around wellness/metrics sections (audit note) | `GlassCard` wrapping during Phase 3 | 3 |
| `/coach/clients/[id]/meals` | 7.0 | inherits `CoachPageShell widthVariant="data-7xl"` from parent layout — **migrated 2026-04-17 (Phase 1.1, via layout)** | tier-polish in Phase 3 | 3 |
| `/coach/clients/[id]/programs/[programId]` | 7.3 | 3-branch `fc-page max-w-7xl mx-auto w-full` wrappers (shell migration still open as Phase 1.1 follow-up). **Polished Phase 4 Bucket C 2026-04-18**: loading `animate-pulse` → `PageSkeleton variant="dashboard"`; Pause button conflicting `text-gray-400 border-gray-600 hover:bg-white/5` overrides removed (were fighting `fc-btn-secondary`); `text-gray-400` → `fc-text-dim`; `border-white/5` × multiple → `--fc-glass-border`; empty-slot `border-white/10 bg-white/[0.02]` → `--fc-glass-border` + `fc-glass-highlight/40`; workout-card active/default/hover/focus states → `color-mix` on `var(--fc-accent)` + `fc-glass-highlight`; "Edited" badge `bg-cyan-500/20 text-cyan-300` → `color-mix(--fc-accent, 20%)` + `text-[color:var(--fc-accent)]`; 3 modal action buttons + helper caption border + template-search input + divider border all tokenized. Import added: `PageSkeleton`. Semantic preserved: `text-emerald-400` completed checkmark, `text-amber-400` skipped icon, `fc-text-warning` completed-lock banner, section icon gradients, destructive reds, role badges | `data-7xl` migration still open for Phase 1.1 follow-up | 1.1-followup (done for Phase 4 tokens) |
| `/coach/programs/create` | 6.2 | `CoachPageShell widthVariant="form-2xl"` with `className="p-4 sm:p-6 pb-32"` — **migrated 2026-04-17 (Phase 1.1 Batch 2 Group A)**; 2-layer `min-h-screen` + `max-w-4xl` `<main>` collapsed to single `CoachPageShell`; `max-w-4xl` → `max-w-2xl` (~224px narrower on desktop, suits single-column form); `<main>` semantic element dropped (matches benchmark pattern) | Phase 3 polish | 3 |
| `/coach/programs/[id]` | 7.0 | `CoachPageShell widthVariant="default-5xl"` on loading + main branches — **migrated 2026-04-17 (Phase 1.1, multi-branch)**; not-found branch untouched | tier-polish in Phase 3 | 3 |
| `/coach/programs/[id]/edit` | 9.0 | `CoachPageShell widthVariant="data-7xl" className="p-3 pb-32 sm:p-6 md:p-6 space-y-4 sm:space-y-6"` — **rewritten Phase 2.3 2026-04-17 (density rework, 3 tiers applied together)**: (1) min-h-screen + max-w-7xl wrappers collapsed into shell; (2) custom `animate-pulse` → `PageSkeleton variant="form"`; (3) custom h1 header → `GlassCard` hero with `Dumbbell` icon + active/draft `Badge` + Back button (`router.push`); (4) 3 pill tabs → AnalyticsNav-style underlined tabs w/ role="tablist"/"tab"/aria-selected + 44px touch target; (5) all `style={{ isDark ? ... }}` inline styles removed from Input/Select/Textarea (shadcn defaults); (6) HTML `<input type="checkbox">` "Active" toggle → shadcn `Switch` with label + helper copy; (7) custom fixed-position modal for schedule cell editor → shadcn `Dialog` + `DialogContent`/`DialogFooter` + inner `Switch` for optional; (8) `window.location.href` on Back/Cancel/post-save → `router.push`; (9) raw color tokens (`text-gray-400`, `text-white`, `bg-white/10`, `border-white/10`, `bg-cyan-500/20`, `text-cyan-300`, `from-cyan-500`, `border-black/5 dark:border-white/5`) all swept to `--fc-*` design tokens; (10) progression empty state → `GlassCard` card; (11) `isDark`, `theme`, `getThemeStyles` destructures removed; (12) unused `TrendingUp`, `X` icons pruned. Basic-tab form now lives inside `GlassCard elevation={1}` with consistent micro-label spacing. | Phase 5 micro-interactions / sticky save header (nice-to-have) | done |
| `/coach/workouts/templates/create` | 7.0 | sticky-header + body pattern with separate `max-w-7xl` clamps — **reviewed Phase 3 2026-04-18 (Batch 3.1): SKIPPED** (already clean — uses `router.push`, sticky pattern intentional, no loading state to polish); **not compatible with single `CoachPageShell`** | refactor with shared sticky-header primitive in Phase 5 (nice-to-have) | deferred |
| `/coach/workouts/templates/[id]` | 9.0 | `CoachPageShell widthVariant="default-5xl"` unified across all 3 branches — **polished Phase 3 2026-04-18 (Batch 3.2)**; `animate-pulse` → `PageSkeleton variant="list"`; custom "not found" card with `getSemanticColor("critical")` → `EmptyState icon={FileQuestion}` + `router.push`; `text-gray-400` × 3 → `fc-text-dim`; delete button red tokens → `--fc-status-error` `color-mix` chain | Phase 4 polish | done |
| `/coach/workouts/templates/[id]/edit` | 8.6 | multi-layer `max-w-7xl` with dirty-state sticky header (preserved) — **polished Phase 3 2026-04-18 (Batch 3.1)**. **Phase 4 Wave B1 2026-04-18: verified clean, no edits required** | micro-interactions on sticky save bar deferred | 5 (enhancement) |
| `/coach/nutrition/foods` | 6.8 | `CoachPageShell widthVariant="data-7xl" className="p-4 pb-32 sm:p-6"` — **migrated 2026-04-17 (Phase 1.1, 2-layer collapse)**; dense food table cramped on mobile (audit note) | grid/list toggle during Phase 3 | 3 |
| `/coach/nutrition/assignments` | 6.2 | `CoachPageShell widthVariant="data-7xl" className="p-4 pb-32 sm:p-6"` — **migrated 2026-04-17 (Phase 1.1, 2-layer collapse)**; **duplicate back button** (audit note). **Phase 1.6 investigation (2026-04-17):** the page-level back link (`Link href="/coach/nutrition"` at L22-28) is confirmed; `OptimizedNutritionAssignments.tsx` imports `ArrowLeft` and uses it once at L430 but unconfirmed whether that's a second back button or an unrelated pagination/modal-close affordance — needs a full read of the delegated component to confirm the "duplicate" claim. **Deferred to Phase 3** where the delegated component is reviewed in context | Phase 3: confirm duplicate, remove one | 3 |
| `/coach/nutrition/generator` | 7.4 | `CoachPageShell widthVariant="default-5xl"` — **migrated 2026-04-17 (Phase 1.1)**. **Polished Phase 4 Wave B3 2026-04-18**: 5× section label `text-gray-400` → `fc-text-dim`; 2× `border-t border-black/5 dark:border-white/5` → `--fc-glass-border`. Progress-stepper component refactor still open (Phase 5 nice-to-have) | stepper component deferred | 5 (enhancement) |
| `/coach/nutrition/meal-plans` | 7.4 | `CoachPageShell widthVariant="data-7xl"` — **migrated 2026-04-17 (Phase 1.1, 2-layer collapse)**. **Polished Phase 4 Wave B2 2026-04-18**: `animate-pulse` loading → `PageSkeleton variant="list"` (import added). Macro totals strip (additive feature from Phase 2.1 follow-up) still open | macro totals strip deferred | 5 (additive) |
| `/coach/nutrition/meal-plans/create` | 6.2 | `CoachPageShell widthVariant="form-2xl" className="p-4 pb-32 sm:p-6"` — **migrated 2026-04-17 (Phase 1.1)**; `max-w-2xl` form jarring vs list's `max-w-7xl` (audit note) | resolved by list-side `data-7xl` consistency + form-2xl here | 3 |
| `/coach/nutrition/meal-plans/[id]` | 6.8 | `CoachPageShell widthVariant="default-5xl"` across all 3 branches with `className="p-4 sm:p-6"` (loading/error) and `className="p-4 sm:p-6 space-y-6"` (main) — **migrated 2026-04-17 (Phase 1.1 Batch 2 Group A)**; 2-layer wrappers collapsed; `max-w-4xl` → `max-w-5xl` (~128px wider on desktop) | Phase 3 polish | 3 |
| `/coach/nutrition/meal-plans/[id]/edit` | 5.6 | `CoachPageShell widthVariant="form-2xl" className="p-4 pb-32 sm:p-6"` across all 3 branches — **migrated Phase 2.1 2026-04-17**; 2-layer wrappers collapsed in loading/not-found/main; custom `animate-pulse` → `PageSkeleton variant="form"`; plain-text "not found" → `EmptyState icon={ChefHat} variant="compact"`; header unified (title + subtitle in `space-y-0.5` group, removed `-mt-2` negative-margin hack); form scope (name / target_calories / description) unchanged per user decision — matches `create` page scope exactly | Phase 4 polish | done |
| `/coach/challenges/[id]` | 9.0 | `CoachPageShell widthVariant="default-5xl"` unified — **polished Phase 3 2026-04-18 (Batch 3.3)**; `animate-pulse` → `PageSkeleton variant="list"`; "not found" `<p>` → `EmptyState icon={FileQuestion}`; **2 custom fixed `z-50` modals (Edit Challenge + End-Confirm) → `shadcn/Dialog`**; 3 raw HTML inputs → `Textarea`/`Input`; 1 HTML checkbox → `shadcn/Checkbox`; status dots, End-Challenge button, amber warning pill, invited badge all swept to `--fc-status-*` `color-mix` tokens; avatar gradients (business-state) intentionally preserved | Phase 4 polish | done |

## 5. Admin (not graded; out of scope for this uplift)

| Route | Grade | Current shell | Target | Phase |
|---|---|---|---|---|
| `/admin/tracking-sources` | — | verify-at-sweep | hold for separate admin uplift | hold |
| `/admin/habit-categories` | — | verify-at-sweep | hold for separate admin uplift | hold |
| `/admin/goal-templates` | — | verify-at-sweep | hold for separate admin uplift | hold |
| `/admin/achievement-templates` | — | verify-at-sweep | hold for separate admin uplift | hold |

## 6. Top-level / auth / dev-only

| Route | Grade | Notes | Phase |
|---|---|---|---|
| `/create-user` | — | setup/admin utility | hold |
| `/client/test-challenges` | — | ~~dev-only test route~~ | **DELETED 2026-04-16** |
| `/client/test-workout-execution` | — | ~~dev-only test route~~ | **DELETED 2026-04-16** |
| `/client/test-celebrations` | — | ~~dev-only test route~~ | **DELETED 2026-04-16** |
| `/client/test-athlete-score` | — | ~~dev-only test route~~ | **DELETED 2026-04-16** |
| `/client/test-train-v2` | — | ~~dev-only test route~~ | **DELETED 2026-04-16** |
| `/client/test-leaderboard` | — | ~~dev-only test route~~ | **DELETED 2026-04-16** |
| `/client/test-train` | — | ~~dev-only test route~~ | **DELETED 2026-04-16** |

---

## Phase 4 — Tier B polish (2026-04-18)

**43 pages polished** across 3 buckets (A: client verify-sweep, B: coach Tier B, C: two deferred heavies). Scope: navigation fixes (`window.location.href` → `router.push` / `<Link>`), hardcoded-color → design-token sweeps (`text-cyan-*`, `text-gray-*`, `border-white/*`, `bg-white/[0.0x]`, `theme.*` template literals → `--fc-accent`, `--fc-text-*`, `--fc-glass-*`, `fc-*` utility classes), loading skeleton unification (`animate-pulse` → `PageSkeleton`), error/empty state standardization (→ `EmptyState`), `shadcn` primitive adoption (`Dialog`, `Switch`, `Checkbox`, `Textarea`, `Input`), `isDark`-ternary flattening, and dead destructure cleanup. **0 lint errors** across the full phase. Semantic colors (status success/warn/error, macronutrient pillar colors, business-state gradients) intentionally preserved throughout.

### Bucket breakdown

| Bucket | Pages | Waves | Notes |
|---|---|---|---|
| A — Client verify-sweep | 31 | A1 (trivial), A2 (small), A3 (medium), A3.5 (heavies-rescue), A4 (heavy), A5 (very heavy) | Full client-surface pass; 5 pages verified clean with no edits, rest polished |
| B — Coach Tier B | 10 | B1 (verify-only), B2 (small), B3 (medium), B4 (heavy/careful), B5 (heavy rewrite) | `/coach/progress` was reclassified mid-phase from "medium" to heavy rewrite (~172 `${theme.*}` hits) and given its own wave |
| C — Two deferred heavies | 2 | — | `/coach/profile` + `/coach/clients/[id]/programs/[programId]` — the two pages carried forward from Phase 3 |

### Bucket A — Client verify-sweep (31 pages)

- **Wave A1 — trivial (6 pages):** `/client/progress/photos`, `/client/me`, `/client/activity`, `/client/goals/history` polished; `/client/check-ins/weekly`, `/client/progress/leaderboard` verified clean/frozen (Phase 1.5 migration already covered them).
- **Wave A2 — small (6 pages):** `/client/challenges` (router.push + `shadcn/Dialog` for join modal + token sweep), `/client/check-ins/history` (3× router.push + tokens), `/client/nutrition/foods/create` (router.push + pervasive `labelClass`/`fieldClass`/header/macros/footer token sweep), `/client/progress/achievements` (router.push + tab chip + header/stat/filter/error/empty tokens), `/client/check-ins` (`EmptyState` for inline error + 2× router.push + tokens), `/client/progress` (2× router.push + full header/stat/weekly-bars/quick-stats/hub-links/export token sweep — cyan → `--fc-accent`).
- **Wave A3 — medium (8 pages, 1 skipped):** `/client/workouts/page.client.tsx` **skipped** (12-line delegate wrapper, nothing to polish). Polished: `/client/challenges/[id]` (`router.push` + "Challenge not found" → `EmptyState icon={FileQuestion}` + dropped unused import), `/client/nutrition/foods/[id]` (3× router.push + error/not-found tokens + macro bars tokenized with `--fc-macro-protein/carbs/fat` + Edit-food FAB `color-mix(--fc-accent)`), `/client/nutrition/meals/[id]` (3× router.push + error branch wrapped in `ClientPageShell` — removed double-shell), `/client/progress/workout-logs` (2× router.push + retry → `fc-btn fc-btn-primary` + 3 borders + dim tokens + hover swap), `/client/progress/performance` (router.push + border + `aria-label`), `/client/progress/personal-records` (2× router.push + cyan retry → `fc-btn-primary` + 8 borders + 3 dim tokens + hover swap), `/client/progress/mobility` (router.push).
- **Wave A3.5 — heavies rescue (4 pages, essentials-only):** `/client/progress/workout-logs/[id]` (1245 lines — 4× router.push + 3 stale `text-gray-400` on already-tokenized headings removed), `/client/workouts/[id]/details` (1692 lines — 3× router.push + `aria-label` + 6× `border-white/5` → `fc-glass-border` + hover swap), `/client/workouts/[id]/complete` (1948 lines — 5× router.push + loader wrapper tokens + error/not-found text + 13× border sweeps + hover swap), `/client/programs/[id]/details` (1081 lines — 3× router.push + bulk `border-white/*` + `bg-white/[*]` + `text-gray-4/500` + `text-white/9x` + nav chip accent pair + CTA gradient → `fc-btn fc-btn-primary` + secondary → `fc-btn-ghost`). Goal-dot ring classes preserved (semantic).
- **Wave A4 — heavy (4 pages):** `/client/habits` (749 lines) and `/client/profile` (885 lines) both **verified clean**, no edits (profile's 1 `window.location.href = '/'` deliberately kept — hard reload after signOut to clear auth state). `/client/nutrition` (1146 lines) — 2× router.push + macro labels/bars → `--fc-macro-*` vars + water/trends accents → `--fc-accent-cyan`/`--fc-accent` + cyan-pill CTAs via `color-mix()` + dark: variants removed (fc tokens are theme-aware). `/client/progress/nutrition` (655 lines) — main already clean; fixed loading skeleton width mismatch (`max-w-6xl` → `ClientPageShell max-w-lg + PageSkeleton`).
- **Wave A5 — very heavy (3 pages):** `/client/goals` (2122 lines), `/client/progress/analytics` (1405 lines), `/client/progress/body-metrics` (1857 lines). See individual table rows (above) for full per-page detail; body-metrics was the densest page in the bucket (4 CTA gradients + 20 glass shells + 11 accent labels + 4 tab tokens + 14 border-t/b + 34 gray-token swaps). **`/client/progress/analytics` restructure (split + promote most-used analytics to `/client/progress` hub) deferred to Phase 5** as product design decision.

### Bucket B — Coach Tier B polish (10 pages)

- **Wave B1 — verify-only (2 pages):** `/coach/menu` and `/coach/workouts/templates/[id]/edit` both confirmed clean (Phase 3-polished).
- **Wave B2 — small essentials (3 pages):** `/coach/challenges` (`animate-pulse` → `PageSkeleton variant="dashboard"`), `/coach/nutrition/meal-plans` (`animate-pulse` → `PageSkeleton variant="list"`), `/coach/clients/add` (3× `theme.primary` → `fc-btn fc-btn-primary fc-press` + 2 border tokens + 1 label → `fc-text-dim`; removed `getThemeStyles`/`theme` destructure).
- **Wave B3 — medium (2 pages):** `/coach/training` (`window.location.href` × 2 → `<Link>` + `border-white/5` → `fc-glass-border` + `hover:bg-white/[0.02]` → `fc-glass-highlight` + `text-cyan-400` accents → `--fc-accent`), `/coach/nutrition/generator` (5× label `text-gray-400` → `fc-text-dim` + 2× border `black/5 dark:white/5` → `fc-glass-border`).
- **Wave B4 — heavy/careful (2 pages):** `/coach/clients` (5 accent swaps `text-cyan-400(/70)` → `--fc-accent` + 3 glass-border swaps `border-white/5` y/b variants + `hover:bg-white/[0.02]` → `fc-glass-highlight`; semantic amber "invited" badges preserved), `/coach/gym-console` (6× `text-cyan-400` → `--fc-accent` + 3× `bg-cyan-600 hover:bg-cyan-700` CTA → `fc-btn fc-btn-primary fc-press` + 4× input chrome `bg-white/5 border border-white/10` → `fc-glass-highlight/border` + card + hover + selected-chip `bg-cyan-500/20 border-cyan-500/40` → `color-mix(--fc-accent, 20/40%)`; semantic green/amber live status colors preserved).
- **Wave B5 — heavy rewrite (1 page):** `/coach/progress` (1887 lines) — **172 `${theme.*}` template-literal hits swept**: `theme.text` × 77 → `fc-text-primary`, `theme.textSecondary` × 61 → `fc-text-dim`, `theme.shadow` × 27 → inline `shadow-2xl shadow-black/25`, `theme.border` × 7 → `border-[color:var(--fc-glass-border)]`, `theme.card` × 5 → `bg-[color:var(--fc-glass-highlight)] border border-[color:var(--fc-glass-border)]` (+ dedupe of resulting double-borders), `theme.gradient` × 1 inlined. Plus: 2× `group-hover:text-purple-600` → `--fc-accent`; 15× `isDark ? ... : ...` ternaries flattened to dark branch; `useTheme` destructure cleaned (`isDark`, `getThemeStyles`, `theme` all removed). Semantic colors preserved: client avatar 8-gradient hash palette, metric icon-badge gradients (blue/green/orange/purple/red/yellow/pink/indigo), status pill colors.

### Bucket C — Two deferred heavies (2 pages)

- **`/coach/profile`** (1249 lines) — `hover:bg-white/10` → `hover:bg-[color:var(--fc-glass-highlight)]`; **4 custom peer-checkbox toggles → `shadcn/Switch`** (each with `aria-label`); loading `animate-pulse` → `PageSkeleton variant="form"`. Imports added: `Switch`, `PageSkeleton`.
- **`/coach/clients/[id]/programs/[programId]`** (992 lines) — loading block → `PageSkeleton variant="dashboard"`; Pause button: removed conflicting `text-gray-400 border-gray-600 hover:bg-white/5` overrides fighting `fc-btn-secondary`; `text-gray-400` → `fc-text-dim`; `border-white/5` → `fc-glass-border`; empty-slot styling tokenized (`border-white/10 bg-white/[0.02]` → `fc-glass-border` + `fc-glass-highlight/40`); workout card active/default/hover/focus states → `color-mix` tokens on `var(--fc-accent)` + `fc-glass-highlight`; "Edited" badge `bg-cyan-500/20 text-cyan-300` → `color-mix(--fc-accent, 20%)` + accent text; 3 modal action buttons tokenized; helper caption border + template search input + divider border tokenized. Import added: `PageSkeleton`. Semantic colors preserved: `text-emerald-400` completed checkmark, `text-amber-400` skipped icon, `fc-text-warning` completed-lock banner, all section icon gradients, all destructive reds, all role badges.

### Files modified (Phase 4)

**Bucket A (26 edited, 4 verified clean, 1 skipped trivial-delegate = 31 total):**
- `src/app/client/progress/photos/page.tsx`
- `src/app/client/me/page.tsx`
- `src/app/client/activity/page.tsx`
- `src/app/client/goals/history/page.tsx`
- `src/app/client/challenges/page.tsx`
- `src/app/client/check-ins/history/page.tsx`
- `src/app/client/nutrition/foods/create/page.tsx`
- `src/app/client/progress/achievements/page.tsx`
- `src/app/client/check-ins/page.tsx`
- `src/app/client/progress/page.tsx`
- `src/app/client/challenges/[id]/page.tsx`
- `src/app/client/nutrition/foods/[id]/page.tsx`
- `src/app/client/nutrition/meals/[id]/page.tsx`
- `src/app/client/progress/workout-logs/page.tsx`
- `src/app/client/progress/performance/page.tsx`
- `src/app/client/progress/personal-records/page.tsx`
- `src/app/client/progress/mobility/page.tsx`
- `src/app/client/progress/workout-logs/[id]/page.tsx`
- `src/app/client/workouts/[id]/details/page.tsx`
- `src/app/client/workouts/[id]/complete/page.tsx`
- `src/app/client/programs/[id]/details/page.tsx`
- `src/app/client/nutrition/page.tsx`
- `src/app/client/progress/nutrition/page.tsx`
- `src/app/client/goals/page.tsx`
- `src/app/client/progress/analytics/page.tsx`
- `src/app/client/progress/body-metrics/page.tsx`

**Bucket B (8 edited, 2 verified clean):**
- `src/app/coach/challenges/page.tsx`
- `src/app/coach/nutrition/meal-plans/page.tsx`
- `src/app/coach/clients/add/page.tsx`
- `src/app/coach/training/page.tsx`
- `src/app/coach/nutrition/generator/page.tsx`
- `src/app/coach/clients/page.tsx`
- `src/app/coach/gym-console/page.tsx`
- `src/app/coach/progress/page.tsx`

**Bucket C (2 edited):**
- `src/app/coach/profile/page.tsx`
- `src/app/coach/clients/[id]/programs/[programId]/page.tsx`

### Observations / follow-ups

- **No breaking changes to data flow or Supabase queries** — scope was strictly presentational across all 43 pages.
- **Semantic-color discipline held**: macronutrient pillar colors (`--fc-macro-protein/carbs/fat`), business-state status colors (`--fc-status-success/warning/error/info`), and identity gradients (avatars, goal-pillar maps, metric icon badges) were preserved wherever found — only arbitrary decoration (generic cyan accents, generic gray neutrals, theme-object template literals) was tokenized.
- **Scope reclassifications**: Wave A3 (4 pages moved to new Wave A3.5 after line-count measurement revealed "heavy" not "medium"); Wave B5 (created mid-bucket when `/coach/progress` recon revealed ~172 `${theme.*}` template literals — a full rewrite, not medium polish).
- **Deferred to Phase 5**: `/client/progress/analytics` split + promote restructure (product design decision); desktop-only polish + a11y + micro-interactions across benchmarks.
- **Verified-clean no-edit pages** (5): `/client/check-ins/weekly`, `/client/progress/leaderboard` (Phase 1.5 covered), `/client/habits`, `/client/profile` (already clean), `/coach/menu`, `/coach/workouts/templates/[id]/edit` (Phase 3 covered). Count reads as "6" above because the 2 Phase-1.5 pages are counted together in Wave A1.
- **`animate-pulse` deferred list fully resolved**: the remaining 3 Phase 1.3 deferrals (`coach/profile`, `coach/clients/[id]/programs/[programId]`, `coach/nutrition/meal-plans/[id]`) all swept in Phase 4 Bucket C.
- **`/coach/nutrition/meal-plans/[id]` detail page** — flagged in the Phase 1.3 deferred list but not touched in Phase 4; no Tier B polish target was open for it. Remains open for Phase 5 if re-graded.

---

## Phase 3 — Tier C polish (2026-04-18)

**7 Tier C pages polished** across 3 batches (3.1 Lite, 3.2 Medium, 3.3 Heavy). Scope: unify `CoachPageShell`/`PageSkeleton`/`EmptyState` primitives, convert custom fixed modals → `shadcn/Dialog`, replace HTML `<input type=checkbox>` → `shadcn/Checkbox`, swap hardcoded colors (red/blue/green/amber/purple + `theme.*` template strings) for design tokens (`--fc-status-*`, `--fc-accent`, `--fc-text-*`, `--fc-glass-*`), convert `window.location.href` → `router.push`, and strip redundant inline styles / mouse handlers in favor of Tailwind + tokens. 1 page (`/coach/workouts/templates/create`) reviewed and **skipped** — already clean.

### Grade deltas (Phase 3)

| Page | Before | After |
|------|--------|-------|
| `/coach/clients/[id]` | 6.8 | 7.6 |
| `/coach/workouts/templates/[id]/edit` | 7.6 | 8.6 |
| `/coach/categories` | 7.0 | 9.0 |
| `/coach/workouts/templates` | 8.0 | 9.0 |
| `/coach/workouts/templates/[id]` | 7.0 | 9.0 |
| `/coach/challenges/[id]` | 8.0 | 9.0 |
| `/coach/goals` | 7.1 | 9.0 |

### Batch 3.1 — Lite (2 edits, 1 skipped)

- **`/coach/clients/[id]/page.tsx`** — bespoke `animate-pulse` loading block → `PageSkeleton variant="list"`; added `PageSkeleton` import. Resolved deferred Phase 1.3 `animate-pulse` hit.
- **`/coach/workouts/templates/create/page.tsx`** — **skipped** (already clean: thin wrapper, sticky-header pattern intentional per Phase 1.1 deferral, uses `router.push`, no loading state to polish).
- **`/coach/workouts/templates/[id]/edit/page.tsx`** — bespoke `animate-pulse` loading + raw "Template not found" `<p>` → `PageSkeleton variant="form"` + `EmptyState icon={FileQuestion}` with `Back to templates` action. Sticky-header (dirty-state) pattern preserved. Resolved deferred Phase 1.3 `animate-pulse` hit.

### Batch 3.2 — Medium (3 edits)

- **`/coach/categories/page.tsx`** — added `CoachPageShell widthVariant="default-5xl"`; `window.location.href` × 3 (back button + 2 tab switchers) → `router.push`; bespoke `animate-pulse` → `PageSkeleton variant="dashboard"` (main + Suspense fallback both); 2 tab buttons now `role="tablist"`/`role="tab"`/`aria-selected`; card grid stripped of `onMouseEnter`/`onMouseLeave` transform+shadow handlers → single `hover:-translate-y-0.5 hover:shadow-lg` Tailwind class; nested `style={{}}` layouts for card sections → Tailwind flex+gap+padding utilities; `group-hover:text-purple-600` → `group-hover:text-[color:var(--fc-accent)]`; custom 12-line gradient empty-state with inline scale handlers → `EmptyState icon={Layers}`; delete button hover state (4-line handlers) → `hover:bg-[color-mix(...status-error...)]` utility; removed `isDark` destructure (unused after sweep); resolved deferred Phase 1.3 `animate-pulse` hit.
- **`/coach/workouts/templates/page.tsx`** — bespoke `animate-pulse` loading tree (8 blocks) → `PageSkeleton variant="list"`; `text-gray-400` × 1 (stats bar) → `fc-text-dim`; **custom fixed-inset `z-[9999]` Assign Workout Template modal (~190 lines of inline-style client list, gradient selected-badge, manual close button) → `shadcn/Dialog`** with clean tokens (`--fc-status-success` for selected/badge colors, `Check` icon from lucide for the selection indicator, `fc-btn fc-btn-primary/ghost` for footer). Client row buttons now `aria-pressed`. Replaced inline `<svg>` checkmark with `lucide/Check`. Removed unused `X`, `CopyIcon`, `Trash2` imports.
- **`/coach/workouts/templates/[id]/page.tsx`** — added `CoachPageShell widthVariant="default-5xl"` (main + loading + error branches all unified); bespoke `animate-pulse` → `PageSkeleton variant="list"`; custom "Template not found" card with `getSemanticColor("critical")` inline → `EmptyState icon={FileQuestion}` + `router.push` action; `text-gray-400` × 3 → `fc-text-dim`; delete button hardcoded `border-red-500/30 text-red-500 hover:bg-red-500/10` → `border-[color-mix(...status-error_30%,transparent)] text-[color:var(--fc-status-error)] hover:bg-[color-mix(...status-error_10%,transparent)]` token chain. Category/difficulty badges kept with `getSemanticColor` (business-colored, out of scope).

### Batch 3.3 — Heavy (2 edits)

- **`/coach/challenges/[id]/page.tsx`** — bespoke `animate-pulse` loading skeleton → `PageSkeleton variant="list"`; "Challenge not found" bare `<p>` → `EmptyState icon={FileQuestion}`; **2 custom fixed `z-50` modals (Edit Challenge + End-Confirm) → `shadcn/Dialog`** with proper `DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter`; 3 raw HTML inputs (`<textarea>`, `<input type=date>`, `<input type=number>`) → `Textarea`/`Input` shadcn; `aria-label="Review notes"` added to previously-unlabeled review textarea; **HTML `<input type=checkbox>` × 1 → `shadcn/Checkbox`** (invite clients) with label-for pairing + hover-state accent border; status indicator dots `bg-emerald-500 animate-pulse / bg-blue-500 / bg-gray-500` → `bg-[color:var(--fc-status-success)]` + `animate-pulse` (active), `bg-[color:var(--fc-status-info)]` (completed), `bg-[color:var(--fc-text-subtle)]` (other); End Challenge button 2 hardcoded red tokens (`border-red-500/50 text-red-600`, `bg-red-600 hover:bg-red-700`) → status-error token chain; amber warning pill (`bg-amber-500/10 border-amber-500/30 text-amber-600`) → `color-mix(...status-warning)` chain; participant "Invited" badge `text-amber-600` → `text-[color:var(--fc-status-warning)]`. Kept `getSemanticColor` for trust/warning/energy/critical avatar gradients (business-styled icon pills, out of scope).
- **`/coach/goals/page.tsx`** — massive cleanup across the full file (~1100 lines). **Consolidated duplicate `<Dialog>` bug for `showCreateGoal`** (one `<Dialog>` wrapped an orphan `<DialogTrigger>`, a second `<Dialog>` owned the `<DialogContent>` — both bound to the same state and firing double-opens) → removed the orphan Dialog wrapper; trigger button now uses plain `onClick={() => setShowCreateGoal(true)}`, matching the pattern used on every other page. Added `CoachPageShell widthVariant="data-7xl"` (main + loading + Suspense fallback). Stripped unused `isDark`, `getThemeStyles`, `theme` destructure. `window.location.href` × 2 (Goals/Habits tab switchers) → `router.push` with `{ scroll: false }` + `role="tablist"`/`aria-selected`. Bespoke `animate-pulse` × 2 → `PageSkeleton variant="dashboard"`. Template-literal theme vars scrubbed: `${theme.text}` × 40 → `fc-text-primary`, `${theme.textSecondary}` × 13 → `fc-text-dim`, `${theme.border}` × 16 → `border-[color:var(--fc-glass-border)]`, `className={theme.textSecondary}` × 3 → `className="fc-text-dim"`. Hardcoded-gradient stat-card inline styles (4 cards with `linear-gradient(135deg, #667EEA...)` etc.) → `GlassCard` primitives with token icon pills (`bg-[color-mix(...accent/status-info/status-success...)]`). Status badges using `bg-blue-100 text-blue-800 dark:bg-blue-900/30`-style color pairs → `color-mix` token triads (`--fc-status-info`, `--fc-status-success`). `group-hover:text-purple-600` → `group-hover:text-[color:var(--fc-accent)]`. Tracking-info pills (`bg-blue-50 dark:bg-blue-900/20`) → `fc-glass-soft`. Auto-tracking banner (`bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800`) → `color-mix` status-success tokens. Edit button color (`text-blue-600 hover:text-blue-700`) → neutral outline; delete button (`text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20`) → status-error token chain. 4 card `rounded-2xl p-6 fc-surface mb-5` raw divs → `GlassCard elevation={1}` with hover transform. **HTML `<input type=checkbox>` × 3** (exercises, body parts, nutrients — inside the Create dialog) → `shadcn/Checkbox`. Removed `!fixed !top-1/2 !left-1/2 !transform !-translate-x-1/2 !-translate-y-1/2 !z-[9999] !max-w-[95vw] !max-h-[90vh] !w-[min(600px,95vw)] !m-0 !p-0` override hacks from both Dialog instances (shadcn handles positioning). Dialog footers standardized (`variant="fc-primary"` + `variant="outline"` instead of hardcoded `bg-gradient-to-r from-blue-600 to-purple-600`). Dropped unused `TrendingUp`/`TrendingDown`/`Card`/`CardContent`/`DialogTrigger` imports.

### Files modified (Phase 3)

- `src/app/coach/clients/[id]/page.tsx`
- `src/app/coach/workouts/templates/[id]/edit/page.tsx`
- `src/app/coach/categories/page.tsx`
- `src/app/coach/workouts/templates/page.tsx`
- `src/app/coach/workouts/templates/[id]/page.tsx`
- `src/app/coach/challenges/[id]/page.tsx`
- `src/app/coach/goals/page.tsx`

### Observations / follow-ups

- **No breaking changes to data flow or Supabase queries** — scope was strictly presentational.
- **Business-colored icons preserved**: `/coach/challenges/[id]` avatar gradients (`getSemanticColor("trust/warning/energy")`) and `/coach/workouts/templates/[id]` difficulty badges (`getSemanticColor("success/warning/critical")`) intentionally kept — they encode business state (status, difficulty) rather than arbitrary decoration.
- **Sticky-header pattern retained on 2 pages**: `/coach/workouts/templates/create` (skipped) and `/coach/workouts/templates/[id]/edit` (loading/error branches updated but sticky Dirty-state header preserved) — consistent with Phase 1.1 deferral note "not compatible with single `CoachPageShell`".
- **`animate-pulse` deferred list now resolved**: all 6 remaining hits from Phase 1.3 (categories, workouts/templates list+view+edit, challenges/[id], goals) fixed in Phase 3.
- **Suspense fallbacks also unified**: `/coach/categories` (`CategoriesHubFallback`) and `/coach/goals` (`GoalsHabitsHubFallback`) now use `CoachPageShell` + `PageSkeleton` (matches main loading branches).
- Remaining Tier C candidate `/coach/clients/[id]/programs/[programId]` (≈1000 lines, 3-branch wrapper soup) was pre-flagged as **too heavy for Phase 3** and carried to Phase 4 alongside `/coach/profile`.

---

## Phase 2.1 — Tier D rescue Batch 1 (2026-04-17)

**3 low-complexity Tier D pages rescued** as the first batch of Phase 2. All 3 migrated to `CoachPageShell`, with `PageSkeleton`/`EmptyState` primitives replacing plain-text loading/empty/error states. No feature-expansion; strictly UX-polish + shell migration per Phase 2 charter.

### Files modified

| File | Prior shell | New shell + variant | Notes |
|---|---|---|---|
| `src/app/coach/nutrition/page.tsx` | Bare `<div className="mx-auto max-w-7xl p-6">` + `AnimatedBackground` | `CoachPageShell widthVariant="data-7xl"` | Full hub rebuild: dropped duplicate "Quick links" nav section (was a subset of manage cards); rebuilt as GlassCard hero (`Apple` icon, aurora accent) + `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` of 5 GlassCard nav items (Meal Plans / Generator / Food Database / Assignments / Create Meal Plan). Matches `/coach/menu` pattern exactly. `useTheme().getSemanticColor` usage dropped in favour of class-based aurora tokens. 121 → 95 lines. |
| `src/app/coach/clients/[id]/workout-logs/page.tsx` | `<div className="space-y-6 max-w-3xl">` inside parent layout's `CoachPageShell data-7xl` | Inherits parent `data-7xl` (inner `max-w-3xl` dropped) | `<p>Loading…</p>` → `PageSkeleton variant="list"`; plain-text empty state → `EmptyState icon={Dumbbell} variant="compact"`; plain-text error → `EmptyState icon={AlertTriangle} variant="compact"`; redundant "Back to Training" link dropped (parent `CoachClientTabBar` handles nav). Row cards unchanged (already `fc-glass-soft`). 139 → 128 lines. |
| `src/app/coach/nutrition/meal-plans/[id]/edit/page.tsx` | 2-layer wrappers in 3 branches (outer `p-4 sm:p-6` + inner `max-w-2xl mx-auto`) + `AnimatedBackground` (not Phase-1-migrated) | `CoachPageShell widthVariant="form-2xl" className="p-4 pb-32 sm:p-6"` in all 3 branches | All 3 branches collapsed to single shell; custom `animate-pulse` → `PageSkeleton variant="form"`; plain-text "not found" heading + button → `EmptyState icon={ChefHat} action={{label: "Back to meal plans", href: "/coach/nutrition/meal-plans"}} variant="compact"`; hacky `-mt-2` negative margin on subtitle removed by unifying header block (title + subtitle in `space-y-0.5` group, back button on the right). Form scope unchanged (name / target_calories / description) per user decision. 252 → 218 lines. |

### Primitives used

- `CoachPageShell` (widthVariants `data-7xl` and `form-2xl`)
- `GlassCard elevation={2}` (for hub hero and nav items on `/coach/nutrition`)
- `PageSkeleton variant="list"` (workout-logs loading) and `variant="form"` (edit page loading)
- `EmptyState variant="compact"` (three empty/error states across the 3 files)

### Verification

- `ReadLints` clean on all 3 files.
- Mobile/desktop byte-delta: `/coach/nutrition` is a full redesign (expected visual change); `/coach/clients/[id]/workout-logs` changes loading/empty/error visuals only (main rendered state identical); `/coach/nutrition/meal-plans/[id]/edit` widens desktop from `max-w-2xl` (inherited wrapper) to `form-2xl` (`max-w-2xl`) — same 42rem, no change.

### Latent product decision logged (out of Phase 2 UX-polish scope)

- `MealPlan` type supports `target_protein`, `target_carbs`, `target_fat`, `difficulty_level`, `category` — none of which are exposed anywhere in the coach flow (create / edit / detail pages all show only `name` / `description` / `target_calories`).
- **User decision 2026-04-17:** `target_protein`/`target_carbs`/`target_fat` **should** be surfaced in the coach flow (latent macro targets feature); `difficulty_level` and `category` **are not meaningful for meal plans** and can remain unused (DB columns stay; UI does not expose them).
- **Follow-up work (Phase 2.5 / Phase 3):** expose `target_protein` / `target_carbs` / `target_fat` in `/coach/nutrition/meal-plans/create`, `/coach/nutrition/meal-plans/[id]/edit`, and `/coach/nutrition/meal-plans/[id]` (detail card). Schema change not required — columns already exist. This is an additive feature, NOT a data-model refactor. DB columns for `difficulty_level` and `category` stay as-is per "don't touch DB without instructions" rule.

### Phase 2.1 closeout

- 3/3 files complete, lints clean, 1 follow-up logged.
- **Next:** Phase 2.2 — Analytics family (5 pages with nested-`AnimatedBackground` offenders + 1 hidden-mobile-header fix). Pages: `/coach/analytics`, `/coach/adherence`, `/coach/reports`, `/coach/compliance`, `/coach/exercises`. All 5 page files are already Phase-1-migrated to `CoachPageShell`; the work lives inside the 5 delegated `Optimized*` components (each 27-40 KB) which each re-render `<AnimatedBackground>` + `<FloatingParticles>` + their own `max-w-7xl` container.

---

## Phase 2.2 — Analytics family rewrite (2026-04-17, documented 2026-04-18)

**5 Analytics-family pages rewritten** to fix the nested-`AnimatedBackground` offender pattern + the hidden-mobile-header a11y gap in one coherent pass. All 5 page files now follow an identical clean shape: single page-level `<AnimatedBackground>` + `CoachPageShell widthVariant="data-7xl"` + `AnalyticsNav` (where applicable) + `GlassCard` hero with icon + `<h1>` + subtitle (all visible at every breakpoint — no `hidden sm:block` header-hiding anywhere) + delegated pure-content `Optimized*` component.

### Pages + per-file treatment

| Page | Component | Change |
|---|---|---|
| `/coach/analytics` | `OptimizedAnalyticsReporting` → **`OptimizedAnalyticsOverview`** (new, clean) | Old component (which contained the `hidden sm:block shrink-0` wrapper at L153 that hid the entire header block on mobile) **replaced** with a new clean component. Page hero `<h1>` "Analytics" with `BarChart3` icon + subtitle "High-level insights into client progress and performance." |
| `/coach/adherence` | `OptimizedAdherenceTracking` (cleaned in-place) | Nested `<AnimatedBackground>` + `<FloatingParticles>` + `max-w-7xl` container + duplicate page header stripped. Page hero `<h1>` "Adherence Overview" with `Filter` icon + subtitle "Track client follow-through and identify at-risk clients." |
| `/coach/compliance` | `OptimizedComplianceDashboard` (cleaned in-place) | Same sweep. Page hero `<h1>` "Compliance Dashboard" with `ShieldCheck` icon + subtitle "Highlight follow-through, missed sessions, and at-risk clients." |
| `/coach/reports` | `OptimizedDetailedReports` (cleaned in-place) | Same sweep. Page hero `<h1>` "Coaching Reports" with `FileText` icon + subtitle "Build client-ready summaries and performance narratives." Uses `--fc-aurora-green` + `--fc-accent-green` for the icon pill (this is the only Analytics-family hero using the green aurora; the other four use cyan). |
| `/coach/exercises` | `OptimizedExerciseLibrary` (cleaned in-place) | Nested chrome stripped. Page uses a simpler shape — no `AnalyticsNav` (exercise library isn't part of the analytics tab strip), just a back-`Link` "← Training" at the top and a flat `<h1>` "Exercise library". `CoachPageShell widthVariant="data-7xl"`. |

### Verification (2026-04-18 reconciliation pass)

- **Grepped all 5 `Optimized*` components** for `AnimatedBackground` / `FloatingParticles` / `hidden sm:block` / `hidden md:block`: **zero hits**.
- All 5 page files inspected: each has a visible `<h1>` at the page level (no breakpoint-hiding wrappers), each renders exactly one `AnimatedBackground`, each uses `CoachPageShell widthVariant="data-7xl"`, each uses fc-* design tokens.
- The `/coach/analytics` inventory row's old Phase 1.6 deferred note about "page has no `<h1>` landmark on mobile — an a11y gap" is **resolved** — the new page renders `<h1>Analytics</h1>` unconditionally.

### Scope notes

- This phase **was executed** during the Phase 2 window but its inventory rows weren't updated at the time; the updates in this file are a 2026-04-18 reconciliation backed by direct file inspection (not memory).
- The old `OptimizedAnalyticsReporting.tsx` component file was replaced with `OptimizedAnalyticsOverview.tsx` during the rewrite — the `Optimized*` file list (10 files) now reads `OptimizedAnalyticsOverview` where it used to read `OptimizedAnalyticsReporting`.

---

## Phase 2.3 — Heavy rewrites (2026-04-17, documented 2026-04-18 for `/coach/clients/[id]/profile`)

**2 heavy-rewrite pages** — `/coach/clients/[id]/profile` (URL-jump → real tabs conversion) and `/coach/programs/[id]/edit` (density rework, three tiers of edits applied together). The `/coach/programs/[id]/edit` treatment was already documented in its own table row (see row above); the `/coach/clients/[id]/profile` treatment is documented here as part of the 2026-04-18 reconciliation.

### `/coach/clients/[id]/profile` — URL-jump → real tabs conversion

**Before:** 5 profile sections (Personal / Subscription / Habits / Activities / Account) were navigated via URL-jump pattern — each section click triggered a full page re-render through `searchParams` change, with the section-picker UI being a plain button strip (no `role="tablist"`/`aria-selected`, no sticky active-state styling, no 44px touch target). This hurt Intuitiveness + Accessibility axes in the original audit (5.8 composite).

**After:** Page rewritten as true client-side tabs:
- `useSearchParams` + `router.push({ scroll: false })` — section switches no longer trigger page re-renders or scroll jumps; the URL still reflects the active section for shareability.
- Tab bar: `<nav role="tablist" aria-label="Profile sections">` with horizontal-scroll overflow on narrow viewports (`scrollbar-hide`), each `<button role="tab" aria-selected={isActive}>` with 44px min-height touch target and `border-b-2` active-state styling in `--fc-accent`.
- Conditional rendering per section: each active section renders its `<div role="tabpanel">` in-place. No page remount on tab switch.
- `GlassCard` hero with `User` icon + `<h1>` "Profile" + subtitle "Personal info, subscription, habits, activities, and account." — page-level, visible at all breakpoints.
- `<PageSkeleton variant="list" />` Suspense fallback (replaces whatever loading state was there before).
- Inherits parent layout's `CoachPageShell widthVariant="data-7xl"` (no page-level shell wrapper needed).
- All fc-* design tokens throughout.

### Scope note

- The Phase 2.3 `/coach/programs/[id]/edit` rewrite was documented in its own inventory row at the time (see that row for the 12-tier change list).
- `/coach/clients/[id]/profile` was **executed** in the same window but the inventory row wasn't updated — the row update in this file is a 2026-04-18 reconciliation backed by direct file inspection.

---

## Phase 1.6 — Label/a11y polish (2026-04-17)

**Original scope (from Phase-1 planning):** 4 "single-line" copy/accessibility fixes (`/coach/analytics` subtitle, `/coach/progress` h1 ordering, `/coach/clients/[id]/progress` title/route mismatch, `/coach/nutrition/assignments` duplicate back button).

**Investigation outcome (2026-04-17):** only 1 of the 4 was actually a true 1-line mechanical fix. The other 3 required either design decisions, a multi-file rewrite, or further investigation to confirm the bug exists — so they were deferred to their natural later-phase home instead of being patched in isolation.

### Fix applied

- `src/app/coach/progress/page.tsx` L593 — removed `hidden sm:block` from the hero-card subtitle (`<p>` element). Previously "Monitor client momentum, streaks, and completion metrics." was hidden below 640px; now visible at all breakpoints. Desktop unchanged. Single-line diff, `ReadLints` clean.

### Items dropped from scope (reason)

- **`/coach/progress` `h1` ordering** — the original audit note turned out to be incorrect on re-read. The `<h1>` at L590 ("Progress Dashboard") is the first heading in render order; all subsequent headings are correctly `<h2>`/`<h3>`. No ordering problem exists — the note is dropped from all future phase work.

### Items deferred (reason)

- **`/coach/analytics` hidden mobile header → Phase 2.** The issue is inside `OptimizedAnalyticsReporting.tsx` L153 (not the page file): `<div className="hidden sm:block shrink-0">` hides the entire header block (`<h1>` + subtitle + action buttons) on mobile. Same pattern recurs in `/coach/adherence`, `/coach/reports`, `/coach/compliance`. Since all 4 Analytics-family pages are already Phase-2 rewrite candidates (nested-AnimatedBackground offenders), the mobile-`<h1>` a11y fix is folded into that rewrite rather than done as 4 scattered one-liners.
- **`/coach/clients/[id]/progress` title/route mismatch → Phase 3.** A sibling route `/coach/clients/[id]/check-ins` already exists, which means the page titled "Check-ins & Assessments" is likely misrouted rather than just mislabeled. Fix requires a holistic look at `CoachClientTabBar` (which drives both tabs) — not something to patch in isolation.
- **`/coach/nutrition/assignments` duplicate back button → Phase 3.** Page-level back link at L22-28 is confirmed; the suspected second back button is inside `OptimizedNutritionAssignments.tsx` L430 but not confirmed to actually be a back button. Deferred to Phase 3 where the delegated component is reviewed in context.

### Scope notes

- All 3 deferred items have been re-targeted in their respective table rows above.
- This phase is closed as **"1 fix applied, 3 rescoped, 1 dropped"**.
- Phase 1 is now complete from a mechanical-sweep perspective. Remaining Phase-1 items on the todo list (Phase 1.1 Batch 2 Group B, the 8 complex deferred coach shells) are still open but can be picked up opportunistically during Phase 2 rewrites rather than in a separate mechanical batch.

---

## Phase 1.1 Batch 2 Group A — Coach shell migration (2026-04-17)

**6 coach pages migrated to `CoachPageShell`** with per-file width-variant decisions ratified with the user. Mobile visual output unchanged (all `max-w-*` values sit well above any phone viewport); desktop widths deliberately rationalised per Approach B. Inline `animate-pulse` skeletons preserved in-place (not migrated to `PageSkeleton` — held for a future pass to keep this batch strictly a shell-swap).

### Files modified

**Width decisions (user-approved 2026-04-17):**

| File | Prior wrapper(s) | New variant | Desktop Δ | Notes |
|---|---|---|---|---|
| `src/app/coach/profile/page.tsx` | main `max-w-3xl` + loading `max-w-4xl` (2-layer each) | `form-2xl` (unified, both branches) | main −96px, loading −352px | Two-layer `min-h-screen pb-32` + inner `max-w-3xl fc-page px-4 sm:px-6 pt-10 flex flex-col gap-8` **collapsed** to single `CoachPageShell widthVariant="form-2xl" className="px-4 sm:px-6 pt-10 pb-32 flex flex-col gap-8"`. Loading branch similarly collapsed to `CoachPageShell widthVariant="form-2xl" className="p-6 pb-[100px]"`. Password-change modal (`{showPasswordModal && (...)}`) kept outside shell (it's positioned `fixed inset-0`). |
| `src/app/coach/menu/page.tsx` | single `max-w-6xl` wrapper | `data-7xl` | +128px | Direct swap: `<div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 pb-32 space-y-8">` → `<CoachPageShell widthVariant="data-7xl" className="px-4 sm:px-6 py-6 pb-32 space-y-8">`. Card grid gets breathing room for the 4-column layout at ≥1280px. |
| `src/app/coach/challenges/[id]/page.tsx` | **3 inconsistent wrappers**: loading+error used `container mx-auto px-4 py-8`, main used `<main className="max-w-3xl mx-auto px-6 py-8 space-y-8">` | `default-5xl` (unified all 3 branches) | main +256px, loading/error ~−250px | Main branch's outer `<div className="relative z-10 min-h-screen pb-40">` kept intact so the sticky `<header>` at L274 stays full-width. Only the inner `<main>` swapped to `CoachPageShell` — the `<main>` semantic element is dropped (matches benchmark pattern; `CoachPageShell` renders `<div>`). All 3 branches now render at visually identical width. |
| `src/app/coach/programs/create/page.tsx` | 2-layer `min-h-screen p-4 sm:p-6 relative z-10 pb-32` + `<main className="max-w-4xl mx-auto">` | `form-2xl` | −224px (biggest narrow of the batch) | 2-layer collapsed to single `CoachPageShell widthVariant="form-2xl" className="p-4 sm:p-6 pb-32"`. Single-column form benefits from narrower `max-w-2xl`. `<main>` semantic dropped (matches benchmark). |
| `src/app/coach/nutrition/meal-plans/[id]/page.tsx` | **3 branches** each 2-layer: outer `p-4 sm:p-6` + inner `max-w-4xl mx-auto [space-y-6]` | `default-5xl` (all 3 branches) | +128px (all branches) | Each 2-layer wrapper collapsed to `CoachPageShell widthVariant="default-5xl" className="p-4 sm:p-6"` (loading/error) or `className="p-4 sm:p-6 space-y-6"` (main). Meal Creator + Meal Options Editor modals kept outside (already outside `<AnimatedBackground>` in the file). |
| `src/app/coach/clients/[id]/page.tsx` | main: no wrapper (already clean); loading: `max-w-6xl px-4 lg:px-8 fc-page flex flex-col min-w-0 overflow-x-hidden` **inside** layout's `CoachPageShell widthVariant="data-7xl"` (**double-wrap bug**) | inherits `data-7xl` from parent `layout.tsx` (no page-level shell) | loading +128px (now matches tab bar above it) | Bespoke loading wrapper **removed entirely**; loading skeleton now just `<div className="animate-pulse space-y-4 py-2">...</div>` as a direct child — parent layout already provides `CoachPageShell`, `AnimatedBackground`, `FloatingParticles`, `CoachClientTabBar`. Main branch was already a bare `<CoachClientDailyReview ... />`, already inheriting correctly. This fix ends the visual asymmetry where the `CoachClientTabBar` (from layout, max-w-7xl) was wider than the content below it (max-w-6xl). |

### Imports added

`import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";` was added to 5 of the 6 files (inserted between `AnimatedBackground` and `FloatingParticles` imports). `/coach/clients/[id]/page.tsx` needed no new import since it removed (rather than added) a shell.

### Verification

- **Lint:** `ReadLints` on all 6 modified files: **No linter errors found.**
- **Structural integrity:** all opening `<CoachPageShell>` tags have a matching `</CoachPageShell>` close at the correct JSX nesting level. Confirmed via TypeScript/JSX lint pass (unbalanced tags would fail type-check).
- **Mobile parity:** no class change below `sm:` or `md:` breakpoints affects layout — verified by inspection of each new `className` (all `max-w-*` values are ≥ `max-w-2xl` = 672px, which is wider than any realistic phone viewport including iPad mini in portrait).

### Scope notes

- **Skeleton migration to `PageSkeleton` intentionally NOT performed in this batch** — all `animate-pulse` blocks (in profile loading, challenges loading, meal-plans loading) preserved in-place. These can be swept in a future `PageSkeleton` pass; keeping this batch strictly a shell-swap avoided scope creep and kept the review surface focused on width decisions.
- **`<main>` semantic dropped in 2 files** (`challenges/[id]`, `programs/create`). The benchmark coach dashboard (`/coach/page.tsx`) also uses `<div>` via `CoachPageShell`, so this matches the standard — but flagged here for future accessibility audit if a `<main>` landmark is desired at the page level.
- **`/coach/clients/[id]` double-wrap bug** was a pre-existing asymmetry (not caused by this phase). It's only noticeable during the loading state — the main render was always correct.

### Batch counts

- Files modified: **6**
- Branches touched: **10** (profile 2, menu 1, challenges 3, programs/create 1, meal-plans 3, clients 1)
- `CoachPageShell` imports added: **5**
- 2-layer wrapper collapses: **6** (profile main + loading, programs/create main, meal-plans all 3 branches)
- `<main>` semantic drops: **2** (challenges/[id] main, programs/create main)
- `CoachPageShell` StrReplace ops executed: **21** across 5 rounds (imports parallel, then opens, then closes) — see chat log

---

## Phase 1.5 — Client shell unify (2026-04-17)

**3 bespoke client shells migrated to `ClientPageShell max-w-lg`**, ~800 lines of dead code removed (deferred branches of `layoutVariant="legacy"` and `denseLayout=false` orphaned by Phase 1.4 test-route deletions), 1 shell component deleted, 2 orphan mock-data files deleted.

### Files modified

**Phase 1.5a — dead-code strip (visual parity; zero change to live branches):**
- `src/components/client/progress/ClientLeaderboardPageBody.tsx` — 1085 → 559 lines. Removed `denseLayout` prop + all `denseLayout===false` branches (unreferenced after `/client/test-leaderboard` deletion in Phase 1.4). Removed `Link` import (only used in removed non-dense back-control). Kept all live dense-layout paths byte-identical.
- `src/components/client/challenges/ChallengeDetailPageBody.tsx` — 851 → 472 lines. Removed `layoutVariant` prop + all `isLegacy === true` branches (unreferenced after `/client/test-challenges` deletion in Phase 1.4). Removed `GlassCard` import (only used in removed legacy branches). Simplified `DetailSection` helper from `{legacy, legacyClassName, children}` → `{children}` (always-compact shape).
- `src/app/client/progress/leaderboard/page.tsx` — removed the one-liner `denseLayout={true}` prop from the single live caller. No other behaviour change.

**Phase 1.5b — outer wrapper `<div>` → `<ClientPageShell>` (executed inline with 1.5a rewrites):**
- Both body components above had their outer `<div className="relative z-10 mx-auto w-full max-w-lg px-4 pb-32 pt-... fc-page space-y-4 overflow-x-hidden">` replaced with `<ClientPageShell className="max-w-lg px-4 pb-32 pt-... space-y-4">`. Net new class: `min-w-0` (flex-truncation safety). `max-w-lg` preserved via `cn()` tailwind-merge override of shell default `max-w-3xl`.

**Phase 1.5c — `ChallengesPageShell` migration (reviewed diff, user-approved):**
- `src/app/client/challenges/page.tsx` — removed `ChallengesPageShell` import; added `Link` + `PageSkeleton` imports. Inlined ~120 lines of header (breadcrumb + h1 + subtitle + active-count chip) and 4-tab JSX that previously lived inside `ChallengesPageShell`. Swapped main-render wrapper to `ClientPageShell max-w-lg px-4 pb-32 pt-6 space-y-4`. Swapped loading-branch bespoke `fc-card-shell max-w-6xl` block to `ClientPageShell max-w-lg + PageSkeleton variant="dashboard"` (this also retroactively completes the Phase 1.3 skeleton swap previously deferred for this file). Error branch was already `ClientPageShell max-w-lg` — untouched.
- `src/components/client/challenges/ChallengesPageShell.tsx` — **deleted** (4734 bytes). Zero remaining source-code references.

**Phase 1.5 — orphan cleanup (user-approved):**
- `src/lib/testChallengesMockData.ts` — **deleted** (4440 bytes). Orphaned when `/client/test-challenges` was deleted in Phase 1.4.
- `src/lib/testLeaderboardMockData.ts` — **deleted** (3987 bytes). Orphaned when `/client/test-leaderboard` was deleted in Phase 1.4.

### Verification

- `ReadLints` on all 4 modified source files: **No linter errors found.**
- Grep for `ChallengesPageShell` in `src/`: **0 matches** (only documentation references remain in `docs/ui/screen-inventory.md` + `docs/ui/UI-UPLIFT-WORKFLOW.md`, which are illustrative).
- Grep for `testChallengesMockData`, `testLeaderboardMockData`, `denseLayout`, `layoutVariant` in `src/`: **0 matches.**
- Live callers of migrated components: 1 each (`client/challenges/page.tsx`, `client/progress/leaderboard/page.tsx`, `client/challenges/[id]/page.tsx`). All preserved their exact surviving-branch behaviour. No prop contract changes required at the caller side beyond the `denseLayout={true}` one-liner removal on the leaderboard caller.

### Line count deltas

| File | Before | After | Delta |
|---|---|---|---|
| `ClientLeaderboardPageBody.tsx` | 1085 | 559 | -526 |
| `ChallengeDetailPageBody.tsx` | 851 | 472 | -379 |
| `client/challenges/page.tsx` | 301 | ~360 | +~60 (header+tabs inlined from deleted shell) |
| `ChallengesPageShell.tsx` | 122 | **deleted** | -122 |
| `testChallengesMockData.ts` | ~130 | **deleted** | -~130 |
| `testLeaderboardMockData.ts` | ~115 | **deleted** | -~115 |
| **Net** | | | **-~1200 lines** |

---

## Phase 1.3 — Skeleton sweep Batch 1 (2026-04-17)

**18 files / 19 loading branches migrated from ad-hoc `animate-pulse` to `PageSkeleton` primitive.** Shells untouched, loaded branches untouched — only the first-load skeleton block replaced. All loaders now use the benchmark `fc-skeleton` shimmer (via `PageSkeleton`) instead of flat `animate-pulse bg-[color:var(--fc-glass-highlight)]`.

Dashboard variant (16 branches):
- `coach/programs/[id]/page.tsx` L176
- `client/goals/page.tsx` L1148
- `client/progress/analytics/page.tsx` L1484 (Suspense fallback — second loading branch only; L697 in-page section loader preserved)
- `client/workouts/[id]/complete/page.tsx` L2078 (second loading branch only; L1500 bespoke celebration skeleton preserved)
- `client/nutrition/foods/[id]/page.tsx` L140
- `client/progress/body-metrics/page.tsx` L643 + L1944
- `client/habits/page.tsx` L427
- `client/programs/[id]/details/page.tsx` L786
- `client/nutrition/meals/[id]/page.tsx` L248
- `client/progress/workout-logs/[id]/page.tsx` L972
- `client/progress/mobility/page.tsx` L259 + L623
- `client/progress/performance/page.tsx` L186
- `client/progress/personal-records/page.tsx` L274
- `client/challenges/[id]/page.tsx` L167

List variant (1 branch):
- `client/progress/workout-logs/page.tsx` L412

Form variant (1 branch):
- `client/profile/page.tsx` L521

Exclusions (intentional):
- **Benchmarks frozen:** `client/workouts/[id]/start/page.tsx` inner animate-pulse blocks (L4113/L4337).
- **Pattern B (section loaders, not top-level):** `client/nutrition/page.tsx` L726 (per-meal-tile), `client/activity/page.tsx` L209 (per-row), `client/goals/history/page.tsx` L178 (per-row), `client/progress/page.tsx` L302 (chart bar), `client/programs/[id]/details/page.tsx` L311 (per-row), `client/habits/page.tsx` L562 (indicator dot), `client/progress/analytics/page.tsx` L697 (in-page section), `coach/clients/[id]/progress/page.tsx` L44-45 (Suspense fallback for one section), `coach/nutrition/meal-plans/page.tsx` L208 (in-GlassCard section).
- **Bespoke shells (Phase 1.5 unify or Phase 4):** ~~`client/challenges/page.tsx` L129 (`fc-card-shell` bespoke)~~ **migrated Phase 1.5c 2026-04-17 → `ClientPageShell + PageSkeleton variant="dashboard"`**, `client/progress/nutrition/page.tsx` L637 (non-standard `max-w-6xl`), `coach/challenges/page.tsx` L82 (`container mx-auto` bespoke).
- **Deferred (Phase 1.1 Batch 2 / Group A/B / Phase 2):** all `animate-pulse` hits in `coach/profile/page.tsx`, ~~`coach/programs/[id]/edit/page.tsx`~~ **(fixed Phase 2.3 → `PageSkeleton variant="form"`)**, `coach/clients/[id]/programs/[programId]/page.tsx`, ~~`coach/clients/[id]/page.tsx`~~ **(fixed Phase 3 → `PageSkeleton variant="list"`)**, ~~`coach/clients/[id]/profile/page.tsx`~~ **(fixed Phase 2.3 → `PageSkeleton variant="list"`)**, `coach/nutrition/meal-plans/[id]/page.tsx`, ~~`coach/nutrition/meal-plans/[id]/edit/page.tsx`~~ **(fixed Phase 2.1 → `PageSkeleton variant="form"`)**, ~~`coach/goals/page.tsx`~~ **(fixed Phase 3 → `PageSkeleton variant="dashboard"`)**, ~~`coach/categories/page.tsx`~~ **(fixed Phase 3 → `PageSkeleton variant="dashboard"`)**, ~~`coach/workouts/templates/page.tsx`~~ **(fixed Phase 3 → `PageSkeleton variant="list"`)**, ~~`coach/workouts/templates/[id]/page.tsx`~~ **(fixed Phase 3 → `PageSkeleton variant="list"`)**, ~~`coach/workouts/templates/[id]/edit/page.tsx`~~ **(fixed Phase 3 → `PageSkeleton variant="form"`)**, ~~`coach/challenges/[id]/page.tsx`~~ **(fixed Phase 3 → `PageSkeleton variant="list"`)**. **Remaining**: `coach/profile/page.tsx`, `coach/clients/[id]/programs/[programId]/page.tsx`, `coach/nutrition/meal-plans/[id]/page.tsx` (Phase 4).
- **Special layout preserved:** `client/workouts/[id]/complete/page.tsx` L1500 — centered circle avatar + title + subtitle + 4-item list (celebration layout, not a generic variant shape).

---

## Counts

| Surface | Count (pre-2026-04-16) | Count (post-Phase-1.4 deletions) |
|---|---|---|
| Client total (incl. redirects) | 41 | 34 |
| Coach total (incl. redirects) | 46 | 43 |
| Admin | 4 | 4 |
| Top-level | 1 (`/create-user`) | 1 |
| Grand total `page.tsx` files | 92 | **82** |
| Graded by 2026-04-16 audit | 80 | 79 (minus deleted `/coach/meals`) |

## 7. Orphan empty directories (flagged 2026-04-16)

The Phase 1.4 sweep surfaced **10 empty directories** in `src/app/` with no `page.tsx` or any file. These are left-over shells from prior deletions:

- `src/app/coach/achievements`
- `src/app/coach/clipcards`
- `src/app/coach/messages`
- `src/app/coach/notifications`
- `src/app/coach/programs-workouts`
- `src/app/client/clipcards`
- `src/app/client/lifestyle`
- `src/app/client/messages`
- `src/app/client/preview-ui`
- `src/app/client/test-biggest-win`

**Status:** not deleted. Awaiting user instruction per the "never delete without explicit instruction" rule. They don't affect runtime (Next.js only treats folders as routes when a `page.tsx` exists), but they're file-system clutter.

---

## Hard rules for editing this file

1. **No grade invention.** Only copy from `audit-grades-2026-04-16.md`.
2. **No current-shell invention.** If the cell says `verify-at-sweep`, leave it until Phase 1.0 has opened the file and confirmed.
3. **Coach width variant set is ratified 2026-04-16** (`benchmark-5xl` / `default-5xl` / `data-7xl` / `form-2xl`). Per-route assignments in this file are still proposed — confirm each during Phase 1.1 migration.
4. **Do not re-grade here.** Grades are a 2026-04-16 snapshot. New audits go in dated files.
