# Design Anti-Patterns Fix Report

## Summary

Implemented the three design anti-pattern fixes across the app: (1) standardized page titles to `text-2xl font-bold`, (2) replaced full-page spinner+text loading with skeleton blocks and ensured AnimatedBackground in loading branches, (3) replaced inline hex colors and `bg-slate-*` with theme variables in the in-scope files.

---

## 1. Page titles fixed (Pattern 1)

**Count:** 35+ page/component titles updated to `text-2xl font-bold` (or removed responsive step-ups).

**Files changed:**

- **Client:** `workouts/[id]/details`, `goals`, `habits`, `challenges`, `challenges/[id]`, `clipcards`, `progress/workout-logs`, `progress/body-metrics`, `nutrition/meals/[id]`, `progress/photos`, `workouts/[id]/complete`
- **Coach:** `clients/add`, `programs/create`, `programs/[id]`, `programs/[id]/edit` (h1 + h2), `workouts/templates/[id]`, `exercises`, `exercise-categories`, `categories`, `bulk-assignments`, `clipcards`, `challenges`, `meals`, `menu`, `nutrition/meal-plans/create`, `clients/[id]/programs/[programId]`
- **Components:** `OptimizedWorkoutTemplates`, `OptimizedAnalyticsOverview`, `OptimizedAdherenceTracking`, `OptimizedNutritionAssignments`, `OptimizedComplianceDashboard`, `OptimizedComplianceAnalytics`, `OptimizedExerciseLibrary`, `OptimizedAnalyticsReporting`, `OptimizedClientProgress`, `OptimizedDetailedReports`, `ReportPreview`, `CoachDashboardHeader`

**Left unchanged (featured data):** Profile display name, PR hero number, calories/stat numbers, rank #, coach progress stat cards, bulk-assignments stat card labels, coach habits stat numbers and gradient section titles, client workout start in-modal scores/timers, OptimizedFoodDatabase stat numbers, client-views stat numbers, ComplianceSnapshot, admin achievement-templates emoji.

---

## 2. Spinner → skeleton conversions (Pattern 2)

**Count:** 8 loading states converted to skeleton (or given AnimatedBackground).

**Files changed:**

1. **client/workouts/[id]/start/page.tsx** — Replaced `ClientGlassCard` with Dumbbell + "Loading workout..." with `animate-pulse` skeleton blocks.
2. **client/programs/[id]/details/page.tsx** — Replaced GlassCard spinner + "Loading program details..." with skeleton layout.
3. **coach/programs/[id]/page.tsx** — Replaced fc-surface spinner + "Loading program..." with skeleton.
4. **coach/programs/[id]/edit/page.tsx** — Replaced spinner + "Loading program..." with skeleton.
5. **coach/progress/page.tsx** — Loading branch wrapped in `AnimatedBackground`; inline hex removed; skeleton uses `bg-[color:var(--fc-glass-highlight)]`.
6. **coach/goals/page.tsx** — Loading return wrapped in `AnimatedBackground`.
7. **app/page.tsx** — Suspense fallback changed from "Loading..." to themed skeleton (animate-pulse + fc-glass-highlight).
8. **client/workouts/[id]/start/components/PreviousPerformanceCard.tsx** — Replaced spinner + "Loading..." with small skeleton; **PreviousPerformanceCard.test.tsx** updated to assert `.animate-pulse` instead of "Loading..." text.

**Left unchanged:** Button/inline spinners (e.g. coach clients add, coach profile, coach gym-console, Completing…, RefreshCw).

---

## 3. Inline hex and bg-slate replaced (Pattern 3)

**Inline hex / style removals:**

- **coach/goals/page.tsx** — Stat cards and list cards: `backgroundColor: '#FFFFFF'`, `color: '#1A1A1A'`, `#6B7280` replaced with `className` (fc-surface, fc-text-primary, fc-text-dim). DialogContent modals: inline style replaced with `fc-surface` and `border-[color:var(--fc-glass-border)]`. Icon sizes standardized to Tailwind (w-8 h-8).
- **coach/progress/page.tsx** — Loading branch: hex removed (handled in Pattern 2). TabsTrigger `color: '#1A1A1A'` → `className="fc-text-primary"`. Content: `bg-slate-700`, `bg-slate-50`, `bg-slate-800/50` → theme vars (fc-glass-highlight, etc.).
- **coach/notifications/page.tsx** — `hover:bg-slate-50 dark:hover:bg-slate-800` → `hover:bg-[color:var(--fc-glass-highlight)]`.
- **coach/challenges/page.tsx** — Skeleton `bg-slate-200 dark:bg-slate-700` → `bg-[color:var(--fc-glass-highlight)]`.
- **coach/challenges/[id]/page.tsx** — Same skeleton replacement.
- **coach/habits/page.tsx** — Skeleton blocks `bg-slate-200 dark:bg-slate-700` / `bg-slate-800` → `bg-[color:var(--fc-glass-highlight)]`.
- **coach/clipcards/page.tsx** — DialogContent `backgroundColor: theme.card...` → `className="fc-surface ..."`.
- **coach/achievements/page.tsx** — DialogContent same treatment.
- **coach/exercise-categories/page.tsx** — Loading branch: inline hex/background replaced with `AnimatedBackground` + fc-surface and fc-glass-highlight skeleton. Category cards: inline style replaced with `className="group fc-surface rounded-2xl p-6 ..."`.
- **coach/categories/page.tsx** — Loading branch: inline hex and slate skeleton replaced with `AnimatedBackground` + theme skeleton.
- **client/habits/page.tsx** — `'text-slate-600 bg-slate-50 border-slate-200'` → theme vars (fc-text-dim, fc-glass-highlight, fc-glass-border).
- **client/clipcards/page.tsx** — Progress ring colors `#EF4444` / `#F59E0B` / `#10B981` → `var(--fc-status-error/warning/success)`; track `#E5E7EB` → `var(--fc-glass-soft)`.

**Not changed (per plan):** Admin pages (tracking-sources, habit-categories, goal-templates, achievement-templates); coach habits category color picker hex; client/workouts/[id]/start full sweep (many hex/slate in modals and overlays left for follow-up); coach/categories card grid inline style (single card replacement failed due to formatting).

---

## 4. Verification

### npm test

- **Result:** All tests passed.
- **Output:** Test Suites: 13 passed, 13 total. Tests: 150 passed, 150 total.

### Grep checks (after changes)

- **"Loading..." in app:** 0 matches in `src/app` (all full-page loading text removed or replaced).
- **text-3xl / text-4xl / text-5xl / font-extrabold:** Still present only where intended (featured data: stats, PR hero, display name, calories, rank, in-modal numbers, etc.), not as page titles.
- **backgroundColor.*# in app:** Some remaining in coach/categories, coach/exercise-categories (e.g. category color + '20'), client/workouts/[id]/start (modal/overlay styles), and admin (out of scope).
- **bg-slate in app:** Remaining in client/workouts/[id]/start, client/goals, client/clipcards, coach/clipcards, coach/achievements, coach/meal-plans/[id], admin, setup-database, etc. In-scope coach/client pages (progress, challenges, habits, notifications) were updated.

---

## 5. Recommended follow-up

- **client/workouts/[id]/start/page.tsx:** Replace remaining `backgroundColor: "#FFFFFF"` and `bg-slate-*` in modals/overlays with theme classes.
- **coach/categories/page.tsx:** Replace category card inline `backgroundColor` / boxShadow with `fc-surface` (exact match for multiline style block).
- **coach/exercise-categories/page.tsx:** Replace remaining inline color/border styles in forms and modals with theme vars.
- **client/goals/page.tsx:** Replace remaining `bg-slate-*` with theme vars if any.
