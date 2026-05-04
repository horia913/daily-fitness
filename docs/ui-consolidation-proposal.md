# UI consolidation proposal (Phase 1.5)

**Status:** Proposal only — **no code changes** in this phase.  
**Inputs:** `docs/ui-component-audit.md`, `docs/mockups/client-screens-v5.html` (patterns / fidelity targets), and a fresh `src/` import grep (April 2026).

**Principles:** Preserve behavior end-to-end; prefer surfacing uncertainty over silent decisions; conservative defaults where APIs or domains diverge.

---

## Section 1 — Duplicate cluster resolutions

Each row states: **(a)** strict consolidation · **(b)** scoped consolidation (keep both, clarify boundary) · **(c)** defer.

### Cluster 1 — Glass / shell cards (`Card` vs `GlassCard` vs `ClientGlassCard` vs `AppCard`)

| Field | Content |
|--------|--------|
| **Components** | `components/ui/card.tsx` (`Card`, variants default / `fc` / `shell`); `components/ui/GlassCard.tsx`; `components/client-ui/GlassCard.tsx` (`ClientGlassCard`); `components/ui/AppCard.tsx` |
| **Recommended canonical** | **No single canonical for all four** in the short term. Operational canonical for **prescription shell + elevation + press**: `GlassCard` (ui). Operational canonical for **client route default padding + outline-on-custom-bg**: `ClientGlassCard`. **`AppCard`** remains canonical for **feature row cards** that compose `AppCard` (`MealPlanCard`, `ProgramCard`, `features/workouts/WorkoutTemplateCard`). **`Card`** remains canonical for **legacy shadcn layouts** (forms, tables) where `fc-card-shell` is not required. |
| **Reasoning** | `GlassCard` implements blur toggling, `pressable` / `onPress`, `surfaceStyle`, `intensity`, `elevation`, and `overflow-hidden` (see `coach/nutrition/generator/page.tsx` comment about overflow). `ClientGlassCard` hardcodes `p-4`, uses `fc-card-shell` / `fc-card-shell-outline` with a **different** rule for custom `bg-*` vs tone. Collapsing without a merged spec risks coach generator layouts and client border treatments. `AppCard` is a higher-level row/header pattern, not a raw shell. |
| **Consumers of “non-canonical” (if you forced one shell only)** | `GlassCard`: many coach/admin/client pages (e.g. `app/coach/goals/page.tsx`, `app/coach/clients/page.tsx`, `components/coach/client-views/CoachClientDailyReview.tsx`, …). `ClientGlassCard`: `app/client/workouts/[id]/start/page.tsx`, `HybridNutritionView.tsx`, `GoalBasedNutritionView.tsx`, `EnhancedClientWorkouts.tsx`, `CheckInHistory.tsx`, `ActiveProgramCard.tsx`, `WorkoutDayPreview.tsx`, weekly check-in steps, `app/client/goals/history/page.tsx`, `app/client/check-ins/history/page.tsx`, `app/client/workouts/[id]/details/page.tsx`, `app/client/train/page.tsx`. **`EnhancedClientWorkouts.tsx` uses both `GlassCard` and `ClientGlassCard` in one file** — highest-risk merge hotspot. |
| **Risk** | **HIGH** for a blind “one shell” merge. **MEDIUM** for per-file migration from `ClientGlassCard` → `GlassCard` if props and padding are re-specified. |
| **Behavior preservation** | From `GlassCard`: preserve `pressable`, `onPress`, mouse press visual, `elevation`, `intensity`, `borderColor`, `surfaceStyle`, `overflow-hidden`, and tone + blur interaction with custom backgrounds. From `ClientGlassCard`: preserve automatic **`fc-card-shell-outline`** when `className` includes `bg-*`, and default **`p-4`**. From `AppCard`: preserve status/header/footer slots used by feature cards. |
| **Proposal** | **(c) Defer** collapsing the four into one. **(b) Scoped:** document a **decision matrix** (when to use `Card` vs `AppCard` vs `GlassCard` vs `ClientGlassCard`) in a short internal doc or comment in `GlassCard.tsx` / `ClientGlassCard.tsx`. **Optional sub-task (a), LOW risk:** in `EnhancedClientWorkouts.tsx`, pick **one** shell component per section for consistency (likely all `ClientGlassCard` for client-facing blocks) after visual QA — mechanical className pass. |

---

### Cluster 2 — Primary / secondary CTAs (`Button` `fc-*` vs `PrimaryButton` / `SecondaryButton`)

| Field | Content |
|--------|--------|
| **Components** | `components/ui/button.tsx` (`variant="fc-primary"`, `fc-secondary`, …); `components/client-ui/PrimaryButton.tsx`; `components/client-ui/SecondaryButton.tsx` |
| **Recommended canonical** | **`Button`** from `components/ui/button.tsx` with `variant="fc-primary"` / `variant="fc-secondary"` (and `className` for width). |
| **Reasoning** | `Button` already encodes the same `fc-btn` / `fc-press` classes and is used across executors, coach pages, and `EmptyState`. `PrimaryButton` / `SecondaryButton` duplicate semantics with a smaller API (`h-10` + `w-full` default on primary). Consumer count for `Button` >> dedicated client buttons. |
| **Consumers to update (non-canonical)** | `app/client/workouts/[id]/complete/page.tsx`; `app/client/workouts/[id]/start/page.tsx`; `app/client/nutrition/page.tsx` (SecondaryButton); `app/client/goals/history/page.tsx`; `app/client/check-ins/history/page.tsx`; `app/client/workouts/[id]/details/page.tsx`; `components/client/EnhancedClientWorkouts.tsx`; `components/client-ui/AssignedWorkoutRow.tsx` (imports `PrimaryButton`). After migration, **`client-ui/index.ts`** can stop exporting the two wrappers (or keep thin re-exports temporarily). |
| **Risk** | **MEDIUM** — `PrimaryButton` uses `h-10` / `w-full`; shadcn `fc-primary` uses **`h-11`** per `buttonVariants`. Each swap needs **touch-target / layout check** (`className="h-10 w-full"` if preserving exact layout). |
| **Behavior preservation** | Match **`disabled`**, **`type`**, **`onClick`**, and **full-width** behavior via explicit `className` (`w-full`, `sm:w-auto` where used). Preserve **`gap-2`** / icon spacing if icons are added later. |
| **Proposal** | **(a) Strict consolidation** toward `Button`, executed **only** after a short spacing matrix is agreed (or preserve `h-10` explicitly in `className`). |

---

### Cluster 3 — Banners (`Banner` vs `ErrorBanner`)

| Field | Content |
|--------|--------|
| **Components** | `components/ui/Banner.tsx` (info / warning / error / success, optional actions); `components/ui/ErrorBanner.tsx` (narrow error strip) |
| **Recommended canonical** | **Keep `ErrorBanner` as the production error strip** until each call site is reviewed; **treat `Banner` as the v4 superset** for new work and for eventual migration. Optional later canonical: **`Banner` only**, with `ErrorBanner` implemented as `Banner variant="error"` + thin adapter (same DOM / ARIA). |
| **Reasoning** | `ErrorBanner` is wired into real flows (`app/create-user/page.tsx`, `app/client/programs/[id]/details/page.tsx`, `components/coach/OptimizedAdherenceTracking.tsx`, `components/coach/ProgramsDashboardContent.tsx`). `Banner` is used in **`app/dev/v4-lab/page.tsx`** only — mockup-aligned but not yet adopted in production. |
| **Consumers to update (if strict (a) on Banner only)** | All `ErrorBanner` import sites above → `Banner` with matching props + dismiss behavior if any. |
| **Risk** | **MEDIUM** — prop mapping (`title` / `message` vs `ErrorBanner` API), spacing, and **actions** must match. |
| **Behavior preservation** | Preserve **dismissible** behavior if present, **role** / color contrast, and **copy** semantics (user-facing strings unchanged). |
| **Proposal** | **(b) Scoped:** keep both; add a one-line **migration note** in `ErrorBanner.tsx` pointing to `Banner`. **(c) Defer** deleting `ErrorBanner` until Phase 3 mockup pass confirms a single banner API. |

---

### Cluster 4 — Skeletons (`Skeleton` / `SkeletonCard` vs `LoadingSkeleton` vs `PageSkeleton`)

| Field | Content |
|--------|--------|
| **Components** | `components/ui/Skeleton.tsx`; `components/ui/LoadingSkeleton.tsx`; `components/ui/PageSkeleton.tsx` |
| **Recommended canonical** | **Keep all three roles** — they address different scopes (inline pulse vs list row vs full page layout). |
| **Reasoning** | `PageSkeleton` encodes layout variants (`dashboard` | `list` | `form`) used across routes; `LoadingSkeleton` is tuned for coach list rows; `Skeleton` / `SkeletonCard` are generic primitives. Merging risks losing **variant-specific layout** or bloating one mega-component. |
| **Consumers** | Widespread (`PageSkeleton` in many `app/**/page.tsx`, `Skeleton` on `app/client/page.tsx`, `LoadingSkeleton` in coach dashboard content). |
| **Risk** | **HIGH** if merged blindly; **LOW** if only documenting. |
| **Behavior preservation** | Preserve **variant selection** and **animation / reduced-motion** behavior per existing components. |
| **Proposal** | **(c) Defer** code consolidation. **(b) Scoped:** add a short **when-to-use** comment block in `PageSkeleton.tsx` header (or internal doc) so new screens do not invent a fourth skeleton pattern. |

---

### Cluster 5 — Modals (`Dialog` vs `ResponsiveModal` vs `SimpleModal` vs `ModalPortal` vs domain modals)

| Field | Content |
|--------|--------|
| **Components** | Radix `components/ui/dialog.tsx`; `components/ui/ResponsiveModal.tsx`; `components/ui/ModalPortal.tsx`; `components/SimpleModal.tsx`; plus many domain `*Modal.tsx` |
| **Recommended canonical** | **No single canonical** without a dedicated modal working group. **Default stack for new UI:** Radix `Dialog` for standard modal semantics; **`ResponsiveModal`** where mobile sheet / desktop modal split is already required; **`ModalPortal`** when portaling is explicitly needed. |
| **Reasoning** | Domain modals embed **business logic, forms, and RLS-sensitive fetches**. Collapsing risks regressions unrelated to visuals. `SimpleModal` and `ResponsiveModal` serve overlapping but not identical UX. |
| **Consumers** | Dozens across coach/client (`ClientFmsAssessmentsPanel`, `CoachClientSubscriptionSection`, `ClientMealsView`, `WeekReviewModal`, `VideoPlayerModal`, …). |
| **Risk** | **HIGH** for strict merge. |
| **Behavior preservation** | Focus trap, scroll lock, **z-index** stacking with `ToastProvider`, mobile keyboard behavior, and **close on route change** where implemented. |
| **Proposal** | **(c) Defer** structural consolidation. **(b) Scoped:** when touching a file, prefer **`Dialog` + ResponsiveModal pattern** already used in that feature area; do not cross-refactor unrelated modals. |

---

### Cluster 6 — Progress indicators (`components/ui/progress-indicator.tsx` vs `components/client/workout-execution/ui/ProgressIndicator.tsx`)

| Field | Content |
|--------|--------|
| **Components** | `components/ui/progress-indicator.tsx` — **wizard step dots** (`steps`, `currentStep`); `components/client/workout-execution/ui/ProgressIndicator.tsx` — **set progress** (`current`, `total`, `label`, `segmented`, uses shadcn `Progress`) |
| **Recommended canonical** | **Keep both implementations**; **rename exports** so filenames or component names cannot be confused (e.g. `WizardStepIndicator` vs `SetProgressIndicator`). |
| **Reasoning** | Completely different **APIs and semantics** (multi-step onboarding vs set x of y). Name collision is the real defect. |
| **Consumers to update (rename only)** | `app/coach/clients/add/page.tsx` imports `ProgressIndicator` from `ui/progress-indicator`; all block executors / `LargeInput` import workout `ProgressIndicator`. |
| **Risk** | **LOW** for pure rename + re-export alias period; **MEDIUM** if bundler path aliases or lazy chunks reference old names (grep after change). |
| **Behavior preservation** | Do not merge logic — only **identifiers** and import paths change. |
| **Proposal** | **(a) Strict** only in the sense of **naming / file export consolidation** (no behavioral merge). |

---

### Cluster 7 — Week strips (`ThisWeekStrip` vs `WeekStrip` vs `WeeklyStrip`)

| Field | Content |
|--------|--------|
| **Components** | `components/client/ThisWeekStrip.tsx`; `components/client/train/WeekStrip.tsx`; `components/client/check-ins/WeeklyStrip.tsx` |
| **Recommended canonical** | **`WeekStrip` (train)** and **`WeeklyStrip` (check-ins)** remain separate **domain** components after cleanup. **`ThisWeekStrip`** has **no imports** in `src/` — not canonical. |
| **Reasoning** | Train vs check-in week models (props: program week vs `weekStart` / `logsThisWeek`) are different; one generic component would need a wide prop union and **HIGH** regression risk. |
| **Consumers** | `WeekStrip` → `app/client/train/page.tsx`. `WeeklyStrip` → `app/client/check-ins/page.tsx`. `ThisWeekStrip` → **none**. |
| **Risk** | **LOW** — delete unused `ThisWeekStrip`. **MEDIUM** if later merging `WeekStrip` + `WeeklyStrip` into one parameterized component. |
| **Behavior preservation** | N/A for delete of unused file. For any future merge: preserve **selection state**, **today highlight**, and **data keys** used by parents. |
| **Proposal** | **(a) Strict:** delete `ThisWeekStrip.tsx` after you confirm no planned feature branch uses it. **(b) Scoped:** rename files for clarity in a follow-up (e.g. `TrainWeekStrip.tsx`, `CheckInWeekStrip.tsx`) — optional, **LOW** value but aids discovery. **(c) Defer** merging the two live strips into one component. |

---

### Cluster 8 — Workout template cards (`features/workouts/WorkoutTemplateCard` vs `coach/WorkoutTemplateCard` vs inline duplicate)

| Field | Content |
|--------|--------|
| **Components** | `components/features/workouts/WorkoutTemplateCard.tsx` (uses `AppCard`); `components/coach/WorkoutTemplateCard.tsx` (standalone, **no `src/` imports found**); **local** `WorkoutTemplateCard` function(s) inside `components/coach/EnhancedWorkoutTemplateManager.tsx` (~lines 870+) |
| **Recommended canonical** | **`components/features/workouts/WorkoutTemplateCard.tsx`** for shared coach list/grid UX. |
| **Reasoning** | Coach templates **page** already imports the **features** card (`app/coach/workouts/templates/page.tsx`). The **`coach/WorkoutTemplateCard.tsx` file appears orphaned** (grep shows no imports from `src/`). The **Enhanced** manager re-implements a template card inline — highest duplication debt. |
| **Consumers to update** | Refactor **`EnhancedWorkoutTemplateManager.tsx`** to import **`features/workouts/WorkoutTemplateCard`** (or extract shared subcomponents) and **delete or archive** `components/coach/WorkoutTemplateCard.tsx` after confirming dead. |
| **Risk** | **MEDIUM–HIGH** — props differ today (`viewMode`, `isSelected`, … on coach file vs `layout`, `assignmentCount`, callbacks on features file). Requires an **adapter layer** or extending the features card with optional props without breaking the templates page. |
| **Behavior preservation** | Preserve **selection**, **drag-and-drop** hooks if the inline card participates in DnD, **keyboard** focus, and **all coach actions** (edit/delete/duplicate/assign/view) exposed today in whichever implementation is live for that surface. |
| **Proposal** | **(a) Strict** toward **features** card + removal of dead coach file, **provided** you accept a **dedicated QA pass** on Enhanced Workout Template Manager. **(c) Defer** if that manager is not in active use and risk is unknown — confirm with product which coach entry points hit it. |

---

### Cluster 9 — Habit trackers (root `HabitTracker` vs `client/HabitTracker`)

| Field | Content |
|--------|--------|
| **Components** | `components/HabitTracker.tsx` (`HabitTrackerComponent` — shadcn-heavy legacy UI); `components/client/HabitTracker.tsx` (client habits / templates integration) |
| **Recommended canonical** | **`components/client/HabitTracker.tsx`** — sole importer is `app/client/habits/page.tsx`. |
| **Reasoning** | **No `src/` import** of `@/components/HabitTracker` or `components/HabitTracker` was found (grep April 2026). Client variant matches rollout docs (`ui-rollout-plan.md` references client path). Root file still references **`HabitTracker` class from `@/lib/habitTracker`** — naming collision with the **lib** export, not the React route. |
| **Consumers to update** | If root file removed: **none** in `src/` today — verify **coach** routes outside this repo or **dynamic** strings (none found for component). |
| **Risk** | **MEDIUM** if a route or storybook outside `src/` imports it; **LOW** if monorepo confirms `src` is complete. **HIGH** if product still expects a “coach habit manager” UI from the root file. |
| **Behavior preservation** | Only applies if root is ever reconnected: preserve **coachId** optional flows and **lib/HabitTracker** analytics helpers used inside root file. |
| **Proposal** | **(c) Defer** physical deletion until **you explicitly confirm** the root component is not used from an untracked entry or planned coach screen. **(a) DELETE** candidate if confirmation is “unused by design.” |

---

### Cluster 10 — Exercise swap modals (coach vs client)

| Field | Content |
|--------|--------|
| **Components** | `components/coach/ExerciseAlternativesModal.tsx` (used from `OptimizedExerciseLibrary.tsx`); `components/client/workout-execution/ui/ClientExerciseAlternativesModal.tsx` (used from `LiveWorkoutBlockExecutor.tsx`) |
| **Recommended canonical** | **Keep two modals** — different **security contexts** (coach library vs client live session) and likely different **data contracts**. |
| **Reasoning** | Merging risks **widening queries** or mixing coach/client assumptions — violates stated security priority. |
| **Consumers** | Coach: `components/coach/OptimizedExerciseLibrary.tsx`. Client: `components/client/LiveWorkoutBlockExecutor.tsx`. |
| **Risk** | **HIGH** for strict single-modal merge. **LOW** for rename-only. |
| **Behavior preservation** | Preserve **swap persistence** rules, **filtering** of alternatives, and **modal close** semantics per side. |
| **Proposal** | **(b) Scoped:** rename for clarity (e.g. `CoachExerciseAlternativesModal` / keep `ClientExerciseAlternativesModal` explicit) and document **shared non-data** subcomponents (list row, search field) as a **future** extraction. **(c) Defer** shared implementation until both flows are spec’d for identical UX. |

---

### Section 1 — Recommendation tally

| Type | Clusters |
|------|----------|
| **(a) Strict** (collapse or mechanical replace) | **2** (buttons), **6** (rename / disambiguate progress indicators), **7** (delete unused `ThisWeekStrip`), **8** (adopt features template card + remove dead coach file + refactor Enhanced manager — **conditional on QA**) |
| **(b) Scoped** (keep both, boundary / docs / rename) | **1** (glass family matrix), **3** (banners coexist), **4** (skeleton usage guide), **10** (coach vs client modals + naming) |
| **(c) Defer** (too risky or needs product confirmation) | **1** (full glass merge), **5** (modal megacluster), **4** (structural skeleton merge), **9** (delete root `HabitTracker` until confirmed), **7** (merging live week strips), **8** (if Enhanced manager scope unclear) |

---

## Section 2 — Unused atomic resolutions

**Re-verification:** Grep across `src/**/*.tsx` and `src/**/*.ts` for imports of each symbol / path; **`import()`** dynamic usage checked for these names — **no dynamic imports** of these UI modules found (only libs such as `supabase`, `WorkoutBlockService`, etc.).

| Component | Path | Why it might exist | Recommendation | Notes |
|-----------|------|-------------------|----------------|-------|
| **Pill** | `components/client-ui/Pill.tsx` | Small chip primitive for client-ui barrel | **(a) DELETE** or **(c) DEFER** — zero consumers; if mockup “tinted chips” are desired, **(b) KEEP and adopt** into `features/workouts/WorkoutTemplateCard` / `ProgramCard` **subtitle** row **instead of** raw `span` pills | Prefer **DELETE** until a screen explicitly needs this exact primitive vs `Badge` |
| **MetricGauge** | `components/ui/MetricGauge.tsx` | Arc gauge for dashboard metrics | **(c) DEFER** — could match mockup **score / ring** motifs; no wire-up proof | If product wants gauges: **(b)** adopt on `app/client/page.tsx` or `AthleteScoreSummary` **only after** mockup spec for which metric is gauge vs ring |
| **WaterTracker** | `components/ui/WaterTracker.tsx` | Hydration habit UI | **Active — no action** | User-confirmed active on client fuel tab; do not treat as deletion/adoption candidate in this batch |
| **MacroBars** | `components/ui/MacroBars.tsx` | Macro P/F/C visualization | **(b) KEEP and adopt** in `HybridNutritionView.tsx` / `app/client/nutrition/page.tsx` where macros are text-first | Alternative: **(a) DELETE** if nutrition redesign abandons bar visualization |
| **NutritionRing** | `components/ui/NutritionRing.tsx` | Ring macro summary | **(b) KEEP and adopt** same targets as `MacroBars` — **pick one** ring *or* bars to avoid duplicate viz | **(c) DEFER** if Figma/mockup does not specify ring for current nutrition layout |
| **LeaderboardCard** | `components/ui/LeaderboardCard.tsx` | Leaderboard row / podium | **(b) KEEP and adopt** in `components/client/progress/ClientLeaderboardPageBody.tsx` **or** `components/progress/CommunityLeaderboard.tsx` if mockup row chrome matches | Else **(a) DELETE** |
| **ChatBubble** (+ variants) | `components/ui/ChatBubble.tsx` | Messaging / coach tips | **(c) DEFER** — may be future messaging feature | **(a) DELETE** only if product confirms no chat phase |
| **MessageInput** | `components/ui/MessageInput.tsx` | Chat composer | Same as ChatBubble | **(c) DEFER** default |
| **ConversationList** | `components/ui/ConversationList.tsx` | Inbox list | Same | **(c) DEFER** default |
| **FloatingTextarea** | `components/ui/floating-textarea.tsx` | Floating-label textarea | **(b) KEEP and adopt** on `app/coach/clients/add/page.tsx` next to existing **`FloatingInput`** for multi-line fields **if** any; else **(a) DELETE** | Grep: only definition file references `FloatingTextarea` |
| **ThisWeekStrip** | `components/client/ThisWeekStrip.tsx` | Week navigator | Likely superseded by `WeekStrip` / `WeeklyStrip` | **(a) DELETE** — zero imports |

---

### Section 2 — Resolution tally

| Resolution | Count |
|------------|------|
| **(a) DELETE** (clear dead / duplicate strip) | **2** firm (`Pill` if no adoption plan, `ThisWeekStrip`); up to **+6** if user rejects adoption paths for unused widgets |
| **(b) KEEP and adopt** (targeted) | **Up to 4** (`MacroBars` / `NutritionRing` / `LeaderboardCard` / `FloatingTextarea`) — mutually exclusive in some pairs (ring vs bars) |
| **(c) DEFER** | **Chat / conversation** trio + **MetricGauge** + any nutrition viz pending mockup decision |

---

## Section 3 — Standardization opportunities (top 12)

Grounded in **grep volume** + **mockup** constructs (e.g. `.greeting .eyebrow`, `.section-head`, `.icon-btn.has-dot`, `.hero-workout` hatch / gradients in `client-screens-v5.html`).

| # | Pattern | Occurrences / examples | Recommendation | Drift prevention | Mockup fidelity | Standardization risk |
|---|---------|-------------------------|----------------|-----------------|-----------------|----------------------|
| 1 | **Eyebrow label** (uppercase, wide tracking, dim or accent color) | **~90+** TSX files match `uppercase` + `tracking` patterns (grep); mockup: `.greeting .eyebrow`, `.phone-label` | **Extract** `Eyebrow` atomic (props: `tone`: default / lime / aqua; `showPulseDot` optional per mockup) **or** extend `SectionHeader` with `eyebrow` slot | **HIGH** | **HIGH** | **MEDIUM** (many call sites) |
| 2 | **Section header row** (title + optional “See all” link) | `SectionHeader` exists; many pages still hand-roll `flex justify-between` + title | **Prefer** `SectionHeader` + optional **`SectionLink`** child; migrate highest-traffic client pages first | **MEDIUM** | **HIGH** (mockup `.section-head`) | **LOW** |
| 3 | **Status / filter pill** (`rounded-full`, `text-[10px]`, `uppercase`, border tint) | `goals/history` `statusPillClasses`, `WeeklyCheckInCard`, `ActivityList` `categoryPillClass`, inline pills in `features/workouts/WorkoutTemplateCard` | **Extract** `StatusPill` atomic with **variant enum** (avoid unbounded Tailwind strings) or formalize **`Badge`** variants for status | **HIGH** | **MEDIUM** | **MEDIUM** |
| 4 | **`fc-domain-*` tinted borders / accents** | **~50+** matches across client workout shell, coach dashboards, `GoalCard` | **Document tokens** + optional **`DomainAccent`** wrapper (prop `domain: workouts | nutrition | …`) — **not** a behavior change | **HIGH** | **HIGH** (pillar / domain colors) | **LOW** (wrapper only) |
| 5 | **Icon button + notification dot** | Mockup `.icon-btn.has-dot`; app uses `NotificationBell` + various header icons | **Extract** `IconButton` with `dot` / `badgeCount` props **or** document pattern on `BottomNav` / headers | **MEDIUM** | **HIGH** | **MEDIUM** |
| 6 | **Glass shell without component** (raw `fc-card-shell` on `div`) | Many pages apply `fc-card-shell` in JSX without `GlassCard` | **Gradual:** prefer **`GlassCard` / `ClientGlassCard`** for new work; **lint rule** or comment-only standard (no big-bang) | **MEDIUM** | **MEDIUM** | **LOW** (policy) / **HIGH** (mass refactor) |
| 7 | **Primary CTA duplication** (`fc-btn` vs `Button`) | Raw `fc-btn` in pages + `Button` + `PrimaryButton` | Execute **Cluster 2** consolidation | **HIGH** | **MEDIUM** | **MEDIUM** |
| 8 | **Display numerals / headline scale** | Mockup `--f-display`, greeting `h1`; app mixes `text-3xl`, `font-mono`, score rings | Map **token → utility** in Tailwind theme once; **do not** atomize every number — **HeroWorkoutCard** + home score first | **MEDIUM** | **HIGH** | **MEDIUM** |
| 9 | **Divider / hairline** (`border-white/10`, `border-[color:var(--fc-glass-border)]`) | Very common between sections | **Optional** `<StackDivider />` atomic or utility class `@apply` in one place | **MEDIUM** | **LOW** | **LOW** |
| 10 | **Empty / error / retry row** | `EmptyState` + inline retry buttons (`SecondaryButton` / `Button`) | Standardize **retry** as `EmptyState` action prop using **`Button`** post Cluster 2 | **MEDIUM** | **MEDIUM** | **LOW** |
| 11 | **Loading: route vs inline** | `PageSkeleton` vs local spinners | Document in Cluster 4; add **eslint** comment pattern optional | **MEDIUM** | **LOW** | **LOW** |
| 12 | **Hero workout hatch / multi-layer gradient** | Mockup `.hero-workout` background stack; `HeroWorkoutCard` likely partial match | **Defer** atom until Phase 3 mockup diff; then **single** `HeroWorkoutCard` background prop or CSS module | **HIGH** fidelity | **HIGH** | **HIGH** (visual regression) |

---

## Section 3 — Tally by standardization risk

| Risk level | Count of rows |
|-------------|----------------|
| **LOW** | 5 (rows 2, 4 policy-only, 6 policy, 9, 11) |
| **MEDIUM** | 5 (rows 1, 3, 5, 7, 8) |
| **HIGH** | 2 (rows 6 mass refactor path, 12 hero visual) |

---

## What we are **not** deciding here

- **No** automatic deletion of files until you approve per row.  
- **No** merge of coach/client modals or RLS-touching surfaces without explicit approval.  
- **No** assumption that `components/coach/WorkoutTemplateCard.tsx` is safe to delete until you confirm no external/legacy import path.

---

## Next step (for you)

Reply with **per-cluster (a)/(b)/(c)** and **per-unused DELETE vs ADOPT vs DEFER**, then batch implementation **LOW risk first** (naming, unused file removal with grep proof, `Button` migration with spacing QA).
