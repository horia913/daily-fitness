# Visual Polish & Mobile UX Audit — March 2026

**Date:** March 2026  
**Scope:** READ-ONLY audit of visual consistency, mobile responsiveness, touch targets, dark mode, animation, loading/empty/error states, and overall polish.  
**No files were modified.**

---

## PART 1: GLOBAL DESIGN SYSTEM AUDIT

### 1A. Theme Consistency — Issues Found

**Hardcoded colors (inline styles) — do not respect dark mode or theme tokens:**

| # | File | Issue | Severity |
|---|------|-------|----------|
| 1 | `DailyWellnessForm.tsx` | `color: '#FFFFFF'` (3 occurrences, ~771, 813, 855) | Medium |
| 2 | `coach/challenges/[id]/page.tsx` | `color: "#fff"` | Medium |
| 3 | `coach/challenges/page.tsx` | `color: "#fff"` | Medium |
| 4 | `coach/clients/[id]/page.tsx` | `color: "#fff"` | Medium |
| 5 | `coach/habits/page.tsx` | Multiple hardcoded hex colors for chart/category (e.g. `#8B5CF6`, `#3B82F6`, `#10B981`, etc.) | Low (chart data) |
| 6 | `ResponsiveModal.tsx` | `color: '#1A1A1A'`, `color: '#6B7280'`, `backgroundColor: 'transparent'` on title/subtitle/close | High |
| 7 | `TrainingBlockModal.tsx` | `color: "#ef4444"` (destructive) | Low |
| 8 | `TrainingBlockHeader.tsx` | `color: "#ef4444"` | Low |
| 9 | **`EnhancedWorkoutTemplateManager.tsx`** | **Heavy hardcoding:** `backgroundColor: "#E8E9F3"` (page), `#FFFFFF`, `#1A1A1A`, `#6B7280`, `#6C5CE7`, `#F9FAFB`, `#DBEAFE`, `#D1FAE5`, `#FEF3C7`, borders `#E5E7EB`, etc. — entire component ignores dark mode | **High** |
| 10 | **`EnhancedProgramManager.tsx`** | Same pattern: `#E8E9F3` page bg, `#FFFFFF`, `#1A1A1A`, `#6B7280`, `#6C5CE7` — does not adapt to dark mode | **High** |
| 11 | `OptimizedWorkoutTemplates.tsx` | Category fallback colors `#EF4444`, `#10B981`, `#8B5CF6` | Low |
| 12 | `WorkoutTemplateForm.tsx` | Category hex colors in constants (e.g. `#6B7280`, `#EF4444`) | Low |
| 13 | `WorkoutAssignmentModal.tsx` | `color: "#6B7280"` for category | Low |
| 14 | `coach/clients/page.tsx` | `color: "#fff"` (2 places) | Medium |
| 15 | `coach/categories/page.tsx` | `color: "#EF4444"`, `#10B981`, `#F59E0B` | Low |
| 16 | `admin/habit-categories/page.tsx` | `color: '#8B5CF6'` | Low |
| 17 | `AchievementUnlockModal.tsx` | `color: "#fff"` on close icon; backdrop `rgba(0,0,0,0.7)`; confetti hex colors; description/motivational text use rgba — partially theme-aware but close button and some text hardcoded | Medium |
| 18 | `LeaderboardCard.tsx` | `background: "#fff"`, `boxShadow` hardcoded | Medium |
| 19 | `ProgramCard_redesigned.tsx` | `color: "#6B7280"`, `color: "#1A1A1A"` | Medium |
| 20 | `ProgramCard_OLD_backup.tsx` | Multiple `#FFFFFF`, `#1A1A1A`, `#6B7280`, `#F3F4F6`, etc. | Medium (backup file) |
| 21 | `PlateCalculatorWidget.tsx` | `border: '1px solid #374151'` | Low |

**Tailwind hardcoded classes that may not respect dark mode (sample):**

| # | File | Issue | Severity |
|---|------|-------|----------|
| 22 | `workouts/[id]/complete/page.tsx` | `text-black` on icon | Medium |
| 23 | `workouts/[id]/start/page.tsx` | Many `text-white`, `bg-white/20`, `bg-black/80`, `text-gray-200`, `text-gray-300`, `bg-white/10`, `border-white/50`, gradient classes (e.g. `from-blue-500`, `to-indigo-600`) — intentional for overlays/modals but some cards use `text-white` on fixed gradients | Low–Medium (context-dependent) |
| 24 | `progress/page.tsx` | `iconClass: "bg-slate-500/10 text-slate-400 border border-slate-500/20"` | Low (slate has dark variants) |
| 25 | `progress/body-metrics/page.tsx` | `text-white` on icon inside colored card | Low |
| 26 | `progress/analytics/page.tsx` | Multiple `text-white` on icons in gradient cards | Low |
| 27 | `LifestyleAnalytics.tsx` | `bg-white/95 dark:bg-slate-800/95`, `text-white` on icons, `bg-slate-200 dark:bg-slate-700`, `bg-slate-800`, `bg-slate-50`, `text-slate-600` — mixed; some tokens used | Low |
| 28 | `coach/achievements/page.tsx` | `bg-gray-100`, `text-gray-800`, `dark:bg-gray-900/30`, `dark:text-gray-400`; `bg-slate-200 dark:bg-slate-700` | Low (has dark variants) |
| 29 | `HabitTracker.tsx` (root) | `text-slate-800` in empty state — no dark variant | Medium |

**Note:** Data/config files that define hex for charts, badges, or RPE/score bands (e.g. `athleteScore.ts`, `InlineRPERow.tsx`, `colors.ts`, `habitTracker.ts`, `clientCompliance.ts`, `WorkoutTemplateForm.tsx` category list, `ExerciseForm.tsx` categories) are **low severity** as long as they are used for small UI accents (dots, badges). Using them for large backgrounds or body text would be high severity.

---

### 1B. Typography Consistency

- **Design system:** `ui-system.css` and `globals.css` define a type scale (`--fc-type-hero`, `--font-h1`, etc.) and font stacks. Many components use Tailwind classes (`text-2xl`, `text-lg`, `text-sm`) rather than CSS variables, so heading levels are not guaranteed consistent (e.g. some pages may use `text-2xl` for H1, others `text-3xl`).
- **ResponsiveModal.tsx** overrides with inline `fontSize: '28px'`, `fontWeight: '700'` for title and `14px`/`400` for subtitle — duplicates design tokens.
- **Body text:** Most body copy uses `text-sm` or `text-base`; readability on mobile is generally OK. No audit of every page for sub-14px body text was done; spot checks suggest most content is at least 14px.
- **Font family:** Geist/Inter and mono are set in globals; no inconsistent font-family usage was flagged.

**Recommendation:** Standardize headings (e.g. H1 = one class or variable everywhere) and avoid inline font size/weight overrides in shared components.

---

### 1C. Button Consistency

- **Button component** (`button.tsx`) uses CVA with `fc-primary`, `fc-secondary`, `fc-ghost`, `fc-destructive` and default `h-11` (44px). `size: "sm"` is `h-8` (32px) — documented as below 44px for non-primary use.
- **Raw `<button>` + `fc-btn`:** Many pages still use raw `<button>` with classes like `fc-btn fc-btn-primary`, `fc-btn fc-btn-secondary`, `fc-btn fc-btn-ghost` instead of `<Button variant="fc-primary">`. Files include: `DailyWellnessForm.tsx`, `client/page.tsx`, `train/page.tsx`, `progress/workout-logs/[id]/page.tsx`, `progress/body-metrics/page.tsx`, `progress/analytics/page.tsx`, `habits/page.tsx`, `check-ins/page.tsx`, `LogMeasurementModal.tsx`, `ProgressMomentCard.tsx`, coach challenges/clients/FMS/clipcards/exercise-categories/meals, `ExerciseAlternativesModal.tsx`, `MealCreator.tsx`, `ClientProgressView.tsx`, `CheckInConfigEditor.tsx`, etc.
- **Destructive actions:** Some use `fc-btn` with `bg-[color:var(--fc-status-error)]` (e.g. workout-logs [id] delete), others use Button `variant="destructive"`. Not fully consistent.
- **Height:** Buttons with `h-10` (e.g. retry buttons, some secondary) are below 44px; many primary CTAs use `h-12` or `min-h-[48px]` which is good.
- **Conclusion:** Mixed use of `<Button>` and raw `<button className="fc-btn ...">`; no single source of truth for primary/secondary/ghost/destructive.

---

### 1D. Input Consistency

- **Input component** (`input.tsx`) has default and `variant="fc"`; both use `h-11` (44px). Default variant uses `text-slate-900 dark:text-slate-100` — theme-aware.
- **Usage:** Many forms use `<Input>`; some coach/legacy forms may still use raw `<input>` with custom classes. Not every form was verified to use the shared Input component.
- **Select:** `select.tsx` uses `SelectTrigger` with `data-[size=default]:h-11` and `data-[size=sm]:h-11` — touch-friendly.
- **Labels/required/error:** No full audit of label placement, required indicators, or error styling consistency across all forms.

---

### 1E. Card/Surface Consistency

- **Design system:** `fc-glass`, `fc-surface-card`, `fc-surface-card-border`, `fc-radius-*` are defined. Many cards use `ClientGlassCard`, `fc-glass`, or `fc-surface` with borders.
- **EnhancedWorkoutTemplateManager / EnhancedProgramManager:** Use inline `backgroundColor: "#FFFFFF"`, `#E8E9F3`, and hardcoded borders instead of `fc-glass` / `fc-surface-card` — breaks consistency and dark mode.
- **LeaderboardCard:** Inline `background: "#fff"` and shadow — not theme tokens.
- **ProgramCard_OLD_backup / WorkoutTemplateCard_OLD_backup:** Heavy hardcoded card styling; if these are still in use anywhere, they should be replaced with theme tokens.

---

## PART 2: MOBILE RESPONSIVENESS (375–414px)

### 2A. Layout Check — Summary

- **Bottom padding:** Most client/coach content uses `fc-page` (which sets `padding-bottom: 120px`) or explicit `pb-32`, `pb-36`, `pb-40` — sufficient for bottom nav. Coach progress and goals use `pb-24` in one wrapper; coach page uses `fc-page` without extra pb (relies on 120px).
- **Horizontal overflow:** Several pages use `min-w-0`, `overflow-x-hidden`, or `overflow-x-auto` on sections (e.g. client page, coach page, analytics, body-metrics, habits, nutrition, challenges). Tables/sections that need horizontal scroll use `overflow-x-auto` (e.g. body-metrics, analytics) — good.
- **Content hidden behind nav:** Not verified per route; assumption is that consistent `pb-32`/fc-page prevents it. Recommend manual check on 375px for: client dashboard, train, check-ins, progress hub, analytics, workout start/complete, coach dashboard, coach clients list, template list.
- **Charts:** Analytics and body-metrics use responsive containers; exact behavior at 375px (e.g. chart width, label truncation) should be verified in browser.
- **Modals:** ResponsiveModal and other modals use `max-h-[90vh]` or similar and `overflow`; workout start page has multiple modals (video, image, refresh, calculator) with `max-h-[90vh]` and padding — likely OK but should be tested on small viewports.

**Pages not individually verified for overflow/truncation (recommend manual pass):**  
All client and coach routes listed in the prompt — audit was code-based; no viewport testing was performed.

---

### 2B. Touch Targets (< 44px) — Violations

| # | File | Element | Current Size | Recommended |
|---|------|---------|-------------|-------------|
| 1 | `button.tsx` | Button `size="sm"` | h-8 (32px) | Use only for non-primary actions; document that sm is &lt; 44px |
| 2 | `AchievementUnlockModal.tsx` | Close button | w-8 h-8 (32px) | min-w-11 min-h-11 (44px) or p-3 with larger hit area |
| 3 | `train/page.tsx` | Filter buttons | fc-btn h-10 (40px) | h-11 or min-h-[44px] |
| 4 | `client/page.tsx` | Secondary button | fc-btn h-10 (40px) | h-11 |
| 5 | `progress/workout-logs/[id]/page.tsx` | Retry button | h-10 | h-11 |
| 6 | `progress/body-metrics/page.tsx` | Retry button | h-10 | h-11 |
| 7 | `progress/analytics/page.tsx` | Retry button | h-10 | h-11 |
| 8 | `progress/mobility/page.tsx` | Retry button | h-10 | h-11 |
| 9 | `habits/page.tsx` | Analytics toggle | w-10 h-10 (40px) | min 44px |
| 10 | `ExerciseBlockCard.tsx` | Number badge | w-8 h-8 (32px) | Non-interactive; OK. Drag handle + number row may be tight on mobile |
| 11 | `workout start/complete` | Many icon-only buttons (e.g. h-6 w-6 with p-0, or w-8 h-8) | 24–32px | Plus/minus and key actions should be min 44px; many are in repeatable rows (sets) — consider min tap area |
| 12 | `ExerciseAlternativesModal.tsx` | Ghost button | p-2, p-1 | Ensure total tap area ≥ 44px |
| 13 | `MealCreator.tsx` | Icon button | p-2 min-w-11 min-h-11 | Already 44px min — OK |
| 14 | `programs/[programId]/page.tsx` | Small buttons | text-xs py-1.5, p-1.5 | Below 44px — use for secondary only and consider min height |
| 15 | `mobility/page.tsx` | Button size="icon" | h-10 w-10 | 40px — use h-11 w-11 for primary icon buttons |
| 16 | `coach/page.tsx` | Secondary button | h-10 | h-11 |
| 17 | `coach/challenges/page.tsx` | FAB | h-14 w-14 (56px) — OK | — |
| 18 | `LogMeasurementModal.tsx` | Close button | min-h-[44px] min-w-[44px] p-2 — OK | — |

**Summary:** Retry and secondary buttons using `h-10` (40px) and several icon-only controls (w-8 h-8 or w-10 h-10) are below the 44px minimum. Achievement unlock close and small row actions (e.g. program week buttons) are the most visible gaps.

---

### 2C. Drag and Drop on Mobile

- **ExerciseBlockCard.tsx:** Drag handle is **not** hidden on mobile — the grip is always rendered when `draggable` is true (`GripVertical` in a flex row). So mobile users see the handle; reorder may still work via touch if the drag library supports it, or may be awkward.
- **WorkoutTemplateForm.tsx:** Uses `GripVertical` for reorder; no `hidden sm:flex` found in the form’s block list in the searched snippet.
- **Workout log detail page:** The "Share" / export button is `hidden sm:flex` — hidden on mobile with no alternative (e.g. share in menu or below fold).
- **Admin habit-categories, DraggableExerciseCard, WorkoutTemplateSidebar:** Use GripVertical; visibility not explicitly hidden on small screens.

**Recommendation:** If drag reorder is not reliable on touch devices, provide an alternative (e.g. up/down arrows, or "Reorder" mode with numeric reorder). Confirm whether workout template and program block reorder work on real devices.

---

### 2D. Keyboard Behavior

- **inputMode / type:** Some number inputs use `type="number"` or `inputMode="numeric"`; not every numeric field was audited. Workout execution and modals use a mix; recommend consistent use of `inputMode="numeric"` for integer-only fields on mobile.
- **Keyboard pushing content:** Not verified (would require device testing). Standard approach is to rely on viewport resize and scroll; no obvious `position: fixed` inputs that would stay under the keyboard were noted.
- **Bottom nav when keyboard open:** Not verified; typically the nav stays fixed and content scrolls.

---

## PART 3: LOADING, EMPTY, AND ERROR STATES

### 3A. Loading States

- **Client dashboard, train, habits, challenges, progress (workout-logs [id], body-metrics, analytics, mobility):** Use Skeleton, Loader2, or fc-skeleton; loading state is present.
- **Coach pages:** Many use loading flags and skeletons (e.g. coach page, clients, progress, templates, habits, meals, clipcards). Not every coach route was checked individually.
- **Potential gaps:** Any page that fetches data but does not set a loading state before the first render will show blank or partial content. Recommendation: ensure every data-dependent page has an explicit loading UI (skeleton or spinner) and that it uses theme variables (no hardcoded gray/white).
- **Timeout:** No global loading timeout pattern was found; long-running requests could show loading indefinitely unless the data layer (e.g. React Query) has a timeout.

---

### 3B. Empty States

- **EmptyState component** exists and is used in many places (train, habits, progress views, coach templates, programs, goals, clipcards, FMS, workout block builder, etc.). It supports icon, title, description, and action (label + href or onClick).
- **Inconsistent usage:** Some pages show a plain message only (e.g. "No measurements yet", "No meal plan assigned yet", "No participants yet", "No data yet for this exercise") without the shared EmptyState component or without an icon/CTA.
- **Pages with minimal empty UX:** Body metrics ("No measurements yet"), nutrition (no plan / no meals), challenges (no participants), leaderboard ("No data yet for this exercise"), goals (some "No goals yet" without EmptyState), performance ("No result yet", "No tests logged yet"), activity ("No activities logged yet"), coach FMS ("No assessments yet"), mobility ("No assessments yet"), clipcards ("No assignments yet"), coach meals (several empty messages). Some of these are inside tables/cards and may be intentional; others would benefit from EmptyState + CTA.

---

### 3C. Error States

- **Retry pattern:** Several pages expose a retry button on error (e.g. workout-logs [id], body-metrics, analytics, mobility, check-ins) with "Retry" and `window.location.reload()` or re-fetch.
- **Error message content:** Not all error paths were audited for user-friendly copy. Recommendation: ensure API/network errors show a short, actionable message (e.g. "Something went wrong. Please try again.") and a Retry action, and that technical messages (e.g. "TypeError", "UNIQUE constraint") are not shown to users.
- **Silent failure:** Any page that catches errors and sets state but does not render an error UI (or only logs to console) would be a gap; no full inventory was done.

---

## PART 4: ANIMATIONS AND TRANSITIONS

### 4A. Page Transitions

- Next.js app router; no custom page transition component was noted. Navigation is instant unless a loading.tsx or Suspense boundary shows a fallback.
- **Skeletons:** Many use `fc-skeleton` or Skeleton component; animation (e.g. pulse) should be confirmed in theme/CSS.
- **Modals:** Radix-based modals and custom modals use `animate-in` / `fade-in` / `zoom-in` where applicable (e.g. select.tsx). ResponsiveModal and workout modals may or may not have entrance animation — not fully verified.

### 4B. Achievement Unlock Modal

- **AchievementUnlockModal.tsx:** Has confetti particles (hardcoded colors), trophy area with gradient and pulse, and `celebrate` animation. Feels celebratory. Close button is 32px — see touch targets.
- **Backdrop:** `rgba(0,0,0,0.7)` and blur — not theme variables; works in both themes but not tokenized.
- **"Continue" button:** Uses Button component; styling is consistent. Rarity badge uses `#fff` for text.

### 4C. Progress Moment Card

- **ProgressMomentCard.tsx:** Shown after scheduled check-in. No entrance animation in code (no animate-in class or transition). Card is centered with overlay; "Continue" is `fc-btn fc-btn-primary`. Headline uses `text-2xl` and success color — readable. No celebration animation; could add a subtle scale/fade-in for polish.

### 4D. Micro-Animations

- **Button:** Button component uses `active:scale-[0.94]` and hover shadow — good.
- **Toasts:** If using a toast provider, slide-in and auto-dismiss are typically handled by the library; not verified.
- **Charts:** Recharts/other chart libs may animate on mount; not verified.
- **Cards:** Hover/active states exist on many cards; glass and surface styles are consistent.

---

## PART 5: CONTENT AND COPY AUDIT

### 5A. Terminology Consistency

- **"Scheduled Check-In":** Used correctly in `WeeklyCheckInFlow.tsx`, `CheckInConfigEditor.tsx`, and `WeeklyCheckInCard.tsx`. No "Monthly Check-In" or "Weekly Check-In" as a standalone title was found; frequency is appended (e.g. "Scheduled Check-In · Weekly").
- **"Exercise" vs "Block":** Not fully audited; workout builder and client-facing copy should use "Exercise" where appropriate; "Block" reserved for periodization (training blocks).
- **Check-in frequency labels:** "Weekly", "Every 2 weeks", "Monthly" appear in config and card; consistent.

### 5B. Grammar and Spelling

- No systematic spell-check was run. Placeholder text: many inputs use descriptive placeholders (e.g. "Enter weight in kg", "Search exercises..."); a few use "Optional" or "0". No "Lorem ipsum" or obvious test-only copy was found in user-facing strings.
- **TODO in code:** `workout start/page.tsx` contains TODOs (e.g. cluster set completion, rest pause completion, timer start). These are dev comments, not user-facing.

### 5C. User-Facing Error Messages

- No inventory of every `catch` block or error state message was done. Recommendation: standardize on a short, friendly message and avoid exposing stack traces or DB errors.

---

## PART 6: ACCESSIBILITY BASICS

### 6A. Color Contrast

- Not measured with a contrast tool. Theme uses `--fc-text-primary`, `--fc-text-dim`, and surface colors; dark mode values are set in ui-system.css. Recommendation: run contrast checks on primary text on card/surface backgrounds and on disabled state text.

### 6B. Focus States

- Button component includes `focus-visible:ring-ring/50` and outline. Input and Select use focus-visible border/ring. Not every custom button (raw `<button>` with fc-btn) was checked for focus ring; recommend ensuring all interactive elements have a visible focus style.

### 6C. Screen Reader Basics

- **aria-label:** Used in some places (e.g. ResponsiveModal close "Close modal", habits "Weekly performance"). Many icon-only buttons do not have aria-label in the snippets found.
- **Images:** ProgressMomentCard photo thumbnails use `alt=""` (decorative). Other images (e.g. exercise, profile) should have meaningful alt text where appropriate.
- **Form labels:** Many inputs are wrapped with labels or use placeholder; not every form was checked for proper `<label>` and `id` association.
- **Modal focus trap:** Radix-based modals typically trap focus; custom modals (e.g. workout start modals) were not verified for focus trap and return focus on close.

---

## PART 7: PERFORMANCE INDICATORS

### 7A. Large Components / Files

| # | File | Lines | Note |
|---|------|-------|------|
| 1 | EnhancedProgramManager.tsx | 3,570 | Very large; consider splitting by feature (e.g. block editor, week list, rules). |
| 2 | AddExercisePanel.tsx | 2,404 | Workout form; consider splitting by block type or panel. |
| 3 | coach/habits/page.tsx | 2,337 | Page + list + modals; consider extracting list and editor. |
| 4 | ExerciseDetailForm.tsx | 2,152 | Consider splitting sections. |
| 5 | client/goals/page.tsx | 2,072 | Large page; consider subcomponents. |
| 6 | EnhancedWorkoutTemplateManager.tsx | 2,043 | Same as EnhancedProgramManager; heavy hardcoded UI. |
| 7 | ClientMealsView.tsx | 2,019 | Consider splitting meal list, assignment, and empty states. |
| 8 | workoutTemplateService.ts | 1,978 | Library; consider splitting by domain. |
| 9 | coach/progress/page.tsx | 1,888 | Dashboard; consider widgets. |
| 10 | GoalsAndHabits.tsx | 1,635 | Consider splitting goals vs habits. |
| 11 | coach/meals/page.tsx | 1,622 | Consider extracting tables/modals. |
| 12 | EnhancedClientWorkouts.tsx | 1,562 | Consider splitting list vs detail. |
| 13 | client/nutrition/page.tsx | 1,500 | Consider extracting sections. |
| 14 | WorkoutDetailModal.tsx | 1,372 | Consider splitting header/body/actions. |
| 15 | WorkoutTemplateForm.tsx | 1,328 | Consider block list vs block editor. |
| 16 | WorkoutAnalytics.tsx | 1,263 | Consider chart vs table sections. |
| 17 | client/workouts/[id]/start/page.tsx | (very large) | Single execution page; already split into components; consider further extraction. |

### 7B. Image/Asset Optimization

- **Lazy loading:** Not verified for all images. `optimized-image.tsx` exists and is used in some places.
- **Large unoptimized images:** No audit of static assets or user-uploaded image sizing was done.
- **Icons:** Lucide React is used; tree-shaking is typical. No full icon-bundle check was done.

---

## OUTPUT TABLES (CONSOLIDATED)

### VISUAL CONSISTENCY ISSUES (Theme / Colors)

| # | File | Issue | Severity | Category |
|---|------|-------|----------|----------|
| 1 | EnhancedWorkoutTemplateManager.tsx | Entire UI uses hardcoded hex (#E8E9F3, #FFFFFF, #1A1A1A, etc.); no dark mode | High | Theme |
| 2 | EnhancedProgramManager.tsx | Same as above | High | Theme |
| 3 | ResponsiveModal.tsx | Title/subtitle/close use #1A1A1A, #6B7280 | High | Theme |
| 4 | DailyWellnessForm.tsx | color: '#FFFFFF' on buttons | Medium | Theme |
| 5 | coach/challenges/[id], page, clients/[id], clients/page | color: "#fff" on text/buttons | Medium | Theme |
| 6 | AchievementUnlockModal.tsx | Close icon #fff; backdrop and confetti hex | Medium | Theme |
| 7 | LeaderboardCard.tsx | background: "#fff", hardcoded shadow | Medium | Theme |
| 8 | ProgramCard_redesigned.tsx | #1A1A1A, #6B7280 | Medium | Theme |
| 9 | workouts/[id]/complete/page.tsx | text-black on icon | Medium | Theme |
| 10 | HabitTracker.tsx (root) | text-slate-800 without dark variant | Medium | Theme |
| 11 | input.tsx | text-slate-900 dark:text-slate-100 — OK | — | — |
| 12 | Various | Chart/category/score hex in data only | Low | Theme |

### MOBILE RESPONSIVENESS ISSUES

| # | Page/Route | Issue | Severity |
|---|------------|-------|----------|
| 1 | All client/coach pages | Layout at 375px not manually tested; code uses pb-32/fc-page and overflow controls | Recommend manual pass |
| 2 | progress/workout-logs/[id] | Share/export button hidden on mobile (hidden sm:flex) with no alternative | Medium |
| 3 | Coach progress, goals | Some wrappers use pb-24 instead of 32+ | Low |
| 4 | Workout execution modals | Max height and scroll on small viewports — verify on device | Low |

### TOUCH TARGET VIOLATIONS (< 44px)

| # | File | Element | Current Size | Recommended |
|---|------|---------|-------------|-------------|
| 1 | AchievementUnlockModal.tsx | Close button | 32px | min 44px |
| 2 | Multiple pages | Retry / secondary buttons | h-10 (40px) | h-11 |
| 3 | client/page, coach/page, train | Secondary/filter buttons | h-10 | h-11 |
| 4 | habits/page.tsx | Analytics toggle | 40px | 44px |
| 5 | mobility/page.tsx | Icon buttons (edit/delete) | h-10 w-10 | h-11 w-11 |
| 6 | programs/[programId]/page | Week/day buttons | Small (py-1.5, p-1.5) | Min height 44px or secondary only |
| 7 | Workout start/complete | Plus/minus, icon buttons in sets | 24–32px | Min tap area 44px for primary actions |
| 8 | button.tsx | size="sm" | 32px | Document as non-primary only |

### LOADING/EMPTY/ERROR STATE GAPS

| # | Page/Route | Missing State | Description |
|---|------------|---------------|-------------|
| 1 | Various | Empty state not using EmptyState | Body metrics, nutrition (no plan), leaderboard, performance, activity, FMS, mobility, clipcards, coach meals — some show text only without icon/CTA |
| 2 | All | Loading timeout | No global timeout; long requests can spin forever |
| 3 | Various | Error copy | Ensure no technical errors (e.g. DB/TypeError) shown to user; add Retry where missing |

### CONTENT/COPY ISSUES

| # | File | Issue | Current Text | Suggested Fix |
|---|------|-------|-------------|---------------|
| 1 | Terminology | "Scheduled Check-In" | Used correctly | — |
| 2 | Placeholders | Various | "Optional", "0", "Search..." | OK; no Lorem or test strings found |
| 3 | Code TODOs | start/page.tsx | TODO comments in logic | Resolve before release if they affect behavior |

### PERFORMANCE FLAGS

| # | File | Issue | Metric |
|---|------|-------|--------|
| 1 | EnhancedProgramManager.tsx | Very large component | 3,570 lines |
| 2 | AddExercisePanel.tsx | Very large form component | 2,404 lines |
| 3 | coach/habits/page.tsx | Large page | 2,337 lines |
| 4 | ExerciseDetailForm.tsx | Large form | 2,152 lines |
| 5 | client/goals/page.tsx | Large page | 2,072 lines |
| 6 | EnhancedWorkoutTemplateManager.tsx | Large + hardcoded theme | 2,043 lines |
| 7 | ClientMealsView.tsx | Large view | 2,019 lines |
| 8 | workoutTemplateService.ts | Large service | 1,978 lines |
| 9+ | (see 7A table) | Multiple files 900–1,900 lines | Consider splitting |

### TOP ISSUES (by visual impact for a new client)

1. **Coach workout/program managers (EnhancedWorkoutTemplateManager, EnhancedProgramManager)** — Hardcoded light-only colors and no dark mode; large, dense screens. These will look broken or outdated in dark mode and hurt trust.
2. **Achievement Unlock modal** — Close button is 32px and hardcoded white; in dark mode the icon may be fine but the size is below touch guideline. Confetti and trophy are good; small fix would improve polish.
3. **ResponsiveModal** — Title and subtitle use fixed dark gray; in dark mode text could be low contrast. Used in multiple flows; fix once in component.
4. **Retry and secondary buttons at 40px** — On mobile, "Retry" and filter/secondary actions are below 44px; users may tap adjacent elements by mistake.
5. **Share/export on workout log detail** — Hidden on mobile with no alternative; users on phone cannot share or export that log.
6. **Empty states that are text-only** — e.g. "No measurements yet", "No data yet for this exercise" with no icon or CTA feel unfinished compared to screens that use EmptyState.
7. **Mixed button system** — Raw `<button className="fc-btn">` next to `<Button>` and inconsistent destructive styling; not a single "broken" screen but reduces consistency.
8. **LeaderboardCard and ProgramCard** — White background and hardcoded colors; in dark mode cards will not match the rest of the app.
9. **Progress Moment Card** — No entrance animation after check-in; a quick scale/fade would make the moment feel more intentional.
10. **Large files (EnhancedProgramManager, AddExercisePanel, habits page)** — Harder to maintain and refactor; splitting would help future polish and performance.

---

**End of audit.** No files were modified. Use this document to prioritize theme fixes (dark mode + tokens), touch target and empty/error state improvements, and component splits as you prepare for real-user testing.
