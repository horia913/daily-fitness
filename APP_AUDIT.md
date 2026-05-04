# APP_AUDIT

## 1. SCREEN INVENTORY

Source baseline: route files under `src/app/**/page.tsx` and `src/app/**/page.client.tsx`, plus current screen mapping docs (`docs/ui/screen-inventory.md`, `docs/as-is-system-map.md`).

### Top-level and utility

| Screen | Route | File path | Audience | Primary purpose | State variants observed |
|---|---|---|---|---|---|
| Landing/Auth | `/` | `src/app/page.tsx` | both | Entry point before role-specific app sections. | `UNKNOWN` |
| Create User | `/create-user` | `src/app/create-user/page.tsx` | admin/internal | Utility flow to create user records. | form loading/success/error (`UNKNOWN` exact UI) |

### Client screens

| Screen | Route | File path | Audience | Primary purpose | State variants observed |
|---|---|---|---|---|---|
| Client Home | `/client` | `src/app/client/page.tsx` | client | Daily hub for today, program week, quick actions, score. | loading, error, no-active-program, active-program, program-complete |
| Workouts Hub | `/client/workouts` | `src/app/client/workouts/page.tsx` + `page.client.tsx` | client | List assigned workouts and entry into workout details/start. | loading, empty list, populated list |
| Workout Details | `/client/workouts/[id]/details` | `src/app/client/workouts/[id]/details/page.tsx` | client | Show one workout structure before starting. | loading, not found, normal |
| Workout Start | `/client/workouts/[id]/start` | `src/app/client/workouts/[id]/start/page.tsx` | client | Execute workout live (block logging, timers, progression cues). | loading, active execution, block-complete, error, recovery/retry |
| Workout Complete | `/client/workouts/[id]/complete` | `src/app/client/workouts/[id]/complete/page.tsx` | client | Confirm completion and show completion/next-step state. | loading, missing log/not found, completion success, error |
| Program Details | `/client/programs/[id]/details` | `src/app/client/programs/[id]/details/page.tsx` | client | Show assigned program breakdown by weeks/days. | loading, not found, active assignment, completed assignment |
| Check-ins Hub | `/client/check-ins` | `src/app/client/check-ins/page.tsx` | client | Check-in status and entry into weekly/history check-ins. | loading, no data, configured cadence, error |
| Weekly Check-in | `/client/check-ins/weekly` | `src/app/client/check-ins/weekly/page.tsx` | client | 3-step check-in flow (metrics, photos, review/submit). | step 1/2/3, submit error, progress-moment modal, achievement modal |
| Check-in History | `/client/check-ins/history` | `src/app/client/check-ins/history/page.tsx` | client | Historical check-in records and trends. | loading, empty, populated |
| Train Hub | `/client/train` | `src/app/client/train/page.tsx` | client | Program status and workout day preview actions. | no program, active program, completed program |
| Nutrition Hub | `/client/nutrition` | `src/app/client/nutrition/page.tsx` | client | Daily nutrition tracking and meal completion. | loading, no meal plan, meal plan active, error |
| Meal Details | `/client/nutrition/meals/[id]` | `src/app/client/nutrition/meals/[id]/page.tsx` | client | Single meal view with completion context. | loading, not found, normal |
| Food Details | `/client/nutrition/foods/[id]` | `src/app/client/nutrition/foods/[id]/page.tsx` | client | View nutrition facts and serving scaling for one food. | loading, not found, normal |
| Create Food | `/client/nutrition/foods/create` | `src/app/client/nutrition/foods/create/page.tsx` | client | Create a custom food item. | initial form, validation errors, submit success/error |
| Goals | `/client/goals` | `src/app/client/goals/page.tsx` | client | Goal management and status filtering. | loading, empty, filtered tabs, modal open |
| Goals History | `/client/goals/history` | `src/app/client/goals/history/page.tsx` | client | Archived/completed goal timeline. | loading, empty, populated |
| Habits | `/client/habits` | `src/app/client/habits/page.tsx` | client | Track habit adherence and streak behavior. | loading, empty assignments, active habits |
| Activity | `/client/activity` | `src/app/client/activity/page.tsx` | client | Log and review daily activities. | loading, empty, log-modal open |
| Challenges | `/client/challenges` | `src/app/client/challenges/page.tsx` | client | Browse/join active challenges. | loading, empty, join/track modal |
| Challenge Details | `/client/challenges/[id]` | `src/app/client/challenges/[id]/page.tsx` | client | View one challenge details and progress. | loading, not found, active challenge |
| Progress Hub | `/client/progress` | `src/app/client/progress/page.tsx` | client | Central navigation for progress subdomains. | loading, stats available, partial data |
| Progress Analytics | `/client/progress/analytics` | `src/app/client/progress/analytics/page.tsx` | client | Time-series analytics for training metrics. | loading, date-range filters, empty segment |
| Progress Workout Logs | `/client/progress/workout-logs` | `src/app/client/progress/workout-logs/page.tsx` | client | List completed workout logs. | loading, empty, populated |
| Progress Workout Log Detail | `/client/progress/workout-logs/[id]` | `src/app/client/progress/workout-logs/[id]/page.tsx` | client | Inspect one completed log. | loading, not found, normal |
| Progress Body Metrics | `/client/progress/body-metrics` | `src/app/client/progress/body-metrics/page.tsx` | client | Body measurement trends and photo comparisons. | loading, empty baseline, populated charts, modal states |
| Progress Mobility | `/client/progress/mobility` | `src/app/client/progress/mobility/page.tsx` | client | Mobility tracking and forms. | loading, empty, populated |
| Progress Performance | `/client/progress/performance` | `src/app/client/progress/performance/page.tsx` | client | Performance summary metrics and tests. | loading, empty, populated |
| Progress Nutrition | `/client/progress/nutrition` | `src/app/client/progress/nutrition/page.tsx` | client | Nutrition compliance and trend history. | loading, empty, populated |
| Progress PRs | `/client/progress/personal-records` | `src/app/client/progress/personal-records/page.tsx` | client | Personal records and progression events. | loading, empty, populated, retry/error |
| Progress Leaderboard | `/client/progress/leaderboard` | `src/app/client/progress/leaderboard/page.tsx` | client | Rankings and leaderboard views. | loading, empty, ranked list |
| Progress Achievements | `/client/progress/achievements` | `src/app/client/progress/achievements/page.tsx` | client | Achievement list, filters, and statuses. | loading, empty, filtered |
| Profile | `/client/profile` | `src/app/client/profile/page.tsx` | client | Profile settings, account actions, sign-out. | loading, form states, save success/error |
| Me | `/client/me` | `src/app/client/me/page.tsx` | client | Personal quick-access profile/info screen. | `UNKNOWN` |

### Coach screens

Primary coach routes found in `src/app/coach/**/page.tsx`:
`/coach`, `/coach/menu`, `/coach/clients`, `/coach/clients/add`, `/coach/clients/[id]`, `/coach/clients/[id]/profile`, `/coach/clients/[id]/workouts`, `/coach/clients/[id]/workout-logs`, `/coach/clients/[id]/workout-logs/[logId]`, `/coach/clients/[id]/programs/[programId]`, `/coach/clients/[id]/progress`, `/coach/clients/[id]/check-ins`, `/coach/clients/[id]/stats`, `/coach/clients/[id]/meals`, `/coach/programs`, `/coach/programs/create`, `/coach/programs/[id]`, `/coach/programs/[id]/edit`, `/coach/workouts/templates`, `/coach/workouts/templates/create`, `/coach/workouts/templates/[id]`, `/coach/workouts/templates/[id]/edit`, `/coach/nutrition`, `/coach/nutrition/foods`, `/coach/nutrition/assignments`, `/coach/nutrition/generator`, `/coach/nutrition/meal-plans`, `/coach/nutrition/meal-plans/create`, `/coach/nutrition/meal-plans/[id]`, `/coach/nutrition/meal-plans/[id]/edit`, `/coach/training`, `/coach/exercises`, `/coach/categories`, `/coach/goals`, `/coach/challenges`, `/coach/challenges/[id]`, `/coach/analytics`, `/coach/progress`, `/coach/reports`, `/coach/adherence`, `/coach/compliance`, `/coach/gym-console`, `/coach/profile`.

Audience: all coach screens above are coach-only.  
State variants broadly observed: loading skeletons, not-found/empty states, data-present state, modal/dialog states, and action success/error feedback.

### Admin screens

| Screen | Route | File path | Audience | Primary purpose | State variants observed |
|---|---|---|---|---|---|
| Admin Home | `/admin` | `src/app/admin/page.tsx` | admin | Admin hub/entry for template dictionaries. | `UNKNOWN` |
| Achievement Templates | `/admin/achievement-templates` | `src/app/admin/achievement-templates/page.tsx` | admin | Manage achievement template definitions. | list/form states (`UNKNOWN` specifics) |
| Goal Templates | `/admin/goal-templates` | `src/app/admin/goal-templates/page.tsx` | admin | Manage goal template definitions. | `UNKNOWN` |
| Habit Categories | `/admin/habit-categories` | `src/app/admin/habit-categories/page.tsx` | admin | Manage habit category definitions. | `UNKNOWN` |
| Tracking Sources | `/admin/tracking-sources` | `src/app/admin/tracking-sources/page.tsx` | admin | Manage tracking source taxonomy. | `UNKNOWN` |

## 2. ELEMENT INVENTORY

Grouped by screen families to stay code-backed and complete at element level without inventing missing visuals.

### Shared shell elements (seen across many screens)

- Header avatar/button (`Header`, `CoachDashboardHeader`): displays user identity; bound to `profiles.first_name`, `profiles.avatar_url`; triggers navigation/profile actions; links to role-specific profile.
- Bottom nav pill items (`BottomNav`): displays icon + label + active indicator; bound to current pathname; triggers route navigation; links to tab routes.
- Back chevrons/arrow buttons: displays left-arrow icon; bound to current flow context; triggers `router.push` or `router.back`; links to parent screen.
- Loading skeleton blocks (`PageSkeleton`, `fc-skeleton`): placeholder only; bound to loading flags; no action.
- Empty-state cards (`EmptyState` patterns): icon + title + helper text; bound to empty/error conditions; sometimes includes CTA action button.

### Client workout execution family (`/client/workouts/[id]/start`, `/complete`, `/details`)

- Block type badges/pills (`SetTypeBadge`, block badges): display block kind/status; bound to `workout_blocks.block_type`; no action.
- Exercise rows with set inputs: display exercise name, prescribed reps/weight/rest; bound to block-specific exercise fields and `workout_set_logs`; triggers set log submission/edit.
- RPE controls (`InlineRPERow`, `RPEModal`): display exertion scale; bound to set log `rpe`; triggers PATCH/update.
- Progress indicator + completion chips (`ProgressIndicator`, completion markers): display completion state by block/set; bound to local execution state plus block completion records; no direct link.
- Rest timer bars/modals (`RestTimerBar`, `RestTimerModal`): display countdown and controls; bound to timer state; start/pause/reset actions.
- Tools drawer / alternatives modal: display exercise alternatives and tool actions; bound to exercise context; triggers swap/logging helpers.

### Client check-in family (`/client/check-ins`, `/weekly`, `/history`)

- Step counter label ("Step X of 3"): display flow progress; bound to local `step` state; no link.
- Metrics input fields (weight, circumferences, body-fat, notes): display editable values; bind to `body_metrics` payload fields; submit triggers `upsertMeasurement`.
- Photo upload tiles (front/side/back): display upload slot + preview; bind to file state and photo metadata; submit triggers `uploadPhoto`.
- Wellness summary cards: display computed averages (sleep/stress/soreness); bind to `daily_wellness_logs`; no write action.
- Progress moment card + achievement modal: display milestone text and unlocked achievement; binds to achievement service results; continue button routes back to check-ins.

### Client nutrition family (`/client/nutrition`, `/nutrition/meals/[id]`, `/nutrition/foods/*`)

- Meal cards: display meal name/type/items and completion state; bind to `meals`, `meal_food_items`, `meal_completions`; completion action writes `meal_completions`.
- Macro bars/rings: display protein/carbs/fat totals; bind to nutrition aggregate fields; no direct link.
- Water tracker controls: display daily water progress; bind to goals/water values; increment/decrement updates goal current value.
- Food serving stepper (+/-): display current serving multiplier; bind to local serving amount and food base values; recalculates display values.
- CTA chips/buttons (log meal, create food, view details): display action labels/icons; bound to route context; trigger navigation.

### Coach client-management family (`/coach/clients*`, `/coach/gym-console`)

- Client status badges (active/invited/at-risk): display status text/color chip; bound to client status/compliance derived values; no direct link.
- Client rows/cards with chevron: display identity + quick metrics; bind to `clients`, `profiles`, computed compliance/streak; click navigates to client detail.
- Client tab bar (`CoachClientTabBar`): displays sub-route tabs; bound to current path and client id; triggers tab route navigation.
- Assign-workout buttons/dialog entries: display CTA and selected template/client context; bind to template/client IDs; triggers assignment create flow.
- Gym Console live state chips: display selected client/workout readiness status; bind to pickup API results; mark-complete action posts to coach pickup API.

## 3. COMPONENT INVENTORY

Reusable component inventory is large (`src/components` contains 300+ files). This section lists the primary reusable building blocks directly observed in route-level pages and shared shells.

| Component | File path | Props (high-level) | Used by screens |
|---|---|---|---|
| `ClientPageShell` | `src/components/client-ui/ClientPageShell.tsx` | `className`, children | most `/client/*` pages |
| `CoachPageShell` | `src/components/coach-ui/CoachPageShell.tsx` | `widthVariant`, `className`, children | most `/coach/*` pages |
| `BottomNav` | `src/components/layout/BottomNav.tsx` | path-aware nav config | role-based app shell routes |
| `Header` | `src/components/layout/Header.tsx` | user/session display props (`UNKNOWN` exact signature) | app shell routes |
| `GlassCard` | `src/components/ui/GlassCard.tsx` | `elevation`, `className`, children | client and coach dashboards/lists/forms |
| `PageSkeleton` | `src/components/ui/PageSkeleton.tsx` | `variant` (`dashboard/list/form`), `className` | loading branches across client and coach |
| `ResponsiveModal` | `src/components/ui/ResponsiveModal.tsx` | open/close/content props | multiple forms and assignment flows |
| `AchievementUnlockModal` | `src/components/ui/AchievementUnlockModal.tsx` | `achievement`, `visible`, `onClose` | check-in flow and achievement moments |
| `WeeklyCheckInFlow` | `src/components/client/weekly-checkin/WeeklyCheckInFlow.tsx` | `clientId`, `config`, `lastMeasurement`, callbacks | `/client/check-ins/weekly` |
| `EnhancedClientWorkouts` | `src/components/client/EnhancedClientWorkouts.tsx` | client/workout data + callbacks (`UNKNOWN` full props) | `/client/workouts` |
| `LiveWorkoutBlockExecutor` | `src/components/client/LiveWorkoutBlockExecutor.tsx` | block payload, handlers, logging state | `/client/workouts/[id]/start` |
| Block executors (`StraightSetExecutor`, `SupersetExecutor`, `DropSetExecutor`, `ClusterSetExecutor`, `RestPauseExecutor`, `GiantSetExecutor`, `PreExhaustionExecutor`, `AmrapExecutor`, `EmomExecutor`, `ForTimeExecutor`) | `src/components/client/workout-execution/blocks/*.tsx` | block-specific exercise/set props | `/client/workouts/[id]/start` |
| `WorkoutAssignmentModal` | `src/components/WorkoutAssignmentModal.tsx` | selected template/client, open state, submit handlers | coach client screens, coach workout templates |
| `CoachClientTabBar` | `src/components/coach/CoachClientTabBar.tsx` | clientId/current tab | `/coach/clients/[id]/*` |
| `AnalyticsNav` | `src/components/coach/AnalyticsNav.tsx` | active section | `/coach/analytics`, `/coach/adherence`, `/coach/compliance`, `/coach/reports` |

Additional reusable pools: base primitives in `src/components/ui/*`, client feature components in `src/components/client/*`, coach feature components in `src/components/coach/*`, and feature modules in `src/components/features/*` (listed in `ui_tokens/ui-inventory.md`).

## 4. DATA MODEL SUMMARY

Top-level entities (3-6 lines each, summarized from `docs/as-is-system-map.md` and service usage):

- **Program assignment domain**
  - `program_assignments` represents one assigned program instance per client (active/completed/paused state).
  - `program_schedule` defines program slots (`week_number`, `day_number`, `template_id`).
  - `program_day_completions` is the completion ledger per assignment + schedule slot.
  - `program_progress` is a cache of current week/day and completion status.

- **Workout execution domain**
  - `workout_templates` and `workout_blocks` define planned workouts and block structures.
  - `workout_assignments` is the assigned workout instance (coach/admin-created or start flow-created).
  - `workout_logs` tracks one workout execution instance and completion totals.
  - `workout_set_logs` stores per-set outputs (weight/reps/rpe/etc.).

- **Nutrition domain**
  - `meal_plans` and `meals` define plan structure.
  - `meal_plan_assignments` links active plans to clients.
  - `meal_food_items` links foods to meals; `foods` stores nutrient base records.
  - `meal_completions` and `meal_photo_logs` capture adherence/logging outcomes.

- **Check-in and progress domain**
  - `body_metrics` stores periodic measurements/photos metadata references.
  - `daily_wellness_logs` stores sleep/stress/soreness style daily check-in fields.
  - `personal_records` and `user_exercise_metrics` store performance progression.
  - `achievements`/template tables support unlock surfaces.

- **User and role domain**
  - `profiles` holds role, display identity, timezone, avatar.
  - `clients` associates client records to coach ownership/status.
  - Role-based access is enforced through Supabase auth + RLS policies (`UNKNOWN` detailed policy text in this file).

## 5. STATE & FLOW NOTES

- **Workout execution states**
  - Session/log starts via program start routes and can reuse existing in-progress session/log.
  - Set-level state includes block progress, set completion, rest timers, and optional RPE edits.
  - Completion pipeline sets `workout_logs.completed_at`, aggregates totals, optionally updates session status.

- **Program/phase states**
  - Program assignment status includes active/completed and pause metadata (`pause_status`, `paused_at`, `pause_accumulated_days`).
  - Program state resolution is ledger-first: slots, completed slots, next slot, and completed program detection.
  - Week unlock is calendar-based in current `computeUnlockedWeekMax` implementation, with assignment timezone normalization.

- **Check-in cadence and scoring effect**
  - Weekly check-in flow is a 3-step UI (body metrics -> photos -> review/submit).
  - Check-in scoring in athlete score uses distinct logged days in `daily_wellness_logs` with non-null `sleep_hours`.
  - Score normalization is per 7-day window (`days logged / 7 * 100`).

- **Athlete Score calculation inputs (visible in code)**
  - Rolling 28 days in four weighted weeks: `[0.50, 0.17, 0.17, 0.16]`.
  - Inputs: program completion score, check-in score, optional nutrition score (if nutrition configured).
  - Weighting: if nutrition enabled `program 0.65 + check-in 0.25 + nutrition 0.10`; else `program 0.75 + check-in 0.25`.
  - Tier thresholds: `beast_mode >=90`, `locked_in >=75`, `showing_up >=55`, `slipping >=35`, else `benched`.

- **Other UI-critical state machines**
  - Week compliance service tracks structural completion, days-to-finish decay, optional manual override (`program_week_time_override`), and composite scoring.
  - Coach pickup flow state: selected client -> next workout lookup -> mark complete -> refresh.
  - Modal/dialog state is pervasive (assignment, confirmation, edit, achievement, details).

## 6. EDGE CASES & EMPTY STATES

- No active program assignment (client home/train and dependent flows show fallback states).
- Program completed state (no `nextSlot`, completed program card/path).
- Workout not found / log not found branches on detail/start/complete routes.
- Empty lists handled: no clients, no workouts, no meal plan, no check-ins, no achievements, no logs.
- Mark-complete idempotency: already-completed logs return safely; ledger insert uses conflict protection.
- Optional slots in schedule do not block progression logic (`is_optional` handling in compliance calculations).
- Missing `is_optional` column compatibility fallback in schedule reads.
- Nutrition-configuration branch in athlete score (nutrition sub-score disabled if no active nutrition assignment).
- Brand-new check-in user handling in weekly flow ("first check-in" progress moment).

## 7. STYLING REALITY

### Current color/theme tokens (as implemented)

Primary token sets are defined in:
- `src/styles/ui-system.css` (`--fc-*` design tokens)
- `src/app/globals.css` (`--background`, `--foreground`, `--primary`, `--accent`, chart/sidebar/radius tokens)

Key active tokens include:
- Core palette: `--fc-bg-deep`, `--fc-bg-basalt`, `--fc-text-primary`, `--fc-text-dim`, `--fc-text-subtle`
- Glass/surface: `--fc-glass-base`, `--fc-glass-soft`, `--fc-glass-border`, `--fc-surface-card`, `--fc-surface-elevated`
- Accent/status: `--fc-accent-cyan`, `--fc-accent-purple`, `--fc-status-success`, `--fc-status-warning`, `--fc-status-error`, `--fc-status-info`
- Domain colors: `--fc-domain-workouts`, `--fc-domain-meals`, `--fc-domain-habits`, `--fc-domain-challenges`
- Radius scale: `--fc-radius-sm` through `--fc-radius-3xl`
- Theme toggle via `.dark` redefines both base and `--fc-*` values.

### Font choices

- `globals.css` sets:
  - `--font-geist-sans: "Inter", ui-sans-serif, system-ui, sans-serif`
  - `--font-geist-mono: "JetBrains Mono", ui-monospace, monospace`
- Additional stacks in use:
  - `--font-number: -apple-system, BlinkMacSystemFont, "SF Pro Rounded", system-ui, sans-serif`
  - `--font-body: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`

### Observed consistency/inconsistency notes (descriptive only)

- Two token layers coexist: shadcn-style base tokens (`--primary`, `--card`, etc.) and app-specific `--fc-*` tokens.
- Both utility classes and inline color-mix expressions are used, including semantic status/domain colors.
- Legacy hardcoded colors still appear in some files according to prior audit docs; many pages were migrated to `fc-*`.
- Multiple surface styles are concurrently present (`fc-glass`, `fc-glass-soft`, `fc-surface`, `fc-card-shell`), each with different visual semantics.

## 8. NAMING CONVENTIONS

- **Primary domain vocabulary used**
  - Program: `program_assignments`, `program_schedule`, `program_day_completions`, `program_progress`
  - Workout: `workout_templates`, `workout_blocks`, `workout_assignments`, `workout_logs`, `workout_set_logs`
  - Nutrition: `meal_plans`, `meal_plan_assignments`, `meal_completions`, `foods`
  - Progress/check-ins: `body_metrics`, `daily_wellness_logs`, `athlete_scores`, `personal_records`

- **Same concept with multiple names (observed in code/docs)**
  - Compliance vs adherence (used on separate coach surfaces with partially different data definitions).
  - Training vs workouts (nav label and route labels vary by context).
  - Program week progression cache vs ledger (`program_progress` cache vs `program_day_completions` ledger).
  - Nutrition assignment naming includes both `meal_plan_assignments` and legacy `assigned_meal_plans` checks.
  - Profile/me/account naming appears across routes (`/client/profile`, `/client/me`) and component contexts.

- **Conventions in component naming**
  - Prefix `Optimized*` is common for large coach/client feature components.
  - `*Executor` is used for workout execution block components.
  - `*PageShell`, `*Card`, `*Modal`, `*View` patterns are used consistently for layout/presentation type hints.

If any section requires row-by-row deepening to every individual route component internals (including every delegated child element on each coach/admin page), that can be expanded in a second pass with per-file extraction.
