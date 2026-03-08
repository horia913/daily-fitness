# Mobile + Dark Mode Audit — Inventory Only (No Changes)

## 1. Modals / Dialogs

| File path | What it does | Fixed inset-0 or absolute? | items-center justify-center? |
|-----------|--------------|----------------------------|------------------------------|
| **Shared / reusable** | | | |
| `src/components/ui/ResponsiveModal.tsx` | Generic responsive modal (program assignment, exercise replacement, plan picker, etc.) | Fixed inset-0 | **items-start** justify-center p-4 |
| `src/components/ui/dialog.tsx` | Radix Dialog (overlay + content); used by AddFoodModal | Fixed inset-0 (overlay); Content: fixed left-[50%] top-[50%] translate | No flex centering; transform translate-x/y -50% |
| `src/components/SimpleModal.tsx` | Generic alert/confirm modal | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/components/goals/AddGoalModal.tsx` | Add goal (training/nutrition/lifestyle/check-ins) | Fixed inset-0 | **items-start** justify-center p-4 overflow-y-auto |
| `src/components/client/workout-execution/RestTimerModal.tsx` | Rest timer between sets | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/components/client/workout-execution/ui/TabataCircuitTimerModal.tsx` | Tabata/Circuit full-screen timer | Fixed inset-0 (inner overlay + wrapper) | Yes (flex items-center justify-center p-4) |
| `src/components/VideoPlayerModal.tsx` | Exercise video playback (YouTube/Vimeo/direct) | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/components/client/RPEModal.tsx` | RPE (Rate of Perceived Exertion) picker | Fixed inset-0 | **items-end** sm:items-center justify-center p-4 |
| `src/components/client/LogMeasurementModal.tsx` | Log body measurement (check-ins) | Fixed inset-0 | **items-start** justify-center p-4 |
| `src/components/client/QuickFoodSearch.tsx` | Quick food search (client Fuel); two states: list + selected food log | Fixed inset-0 | **items-end** sm:items-center justify-center (bottom sheet on mobile) |
| `src/components/client/MealCardWithOptions.tsx` | Photo preview modal (meal photo) | Fixed inset-0 | No (overflow-y-auto; content scrollable) |
| `src/components/WorkoutDetailModal.tsx` | Workout template/details view | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/components/WorkoutTemplateForm.tsx` | Workout template create/edit (can render as modal or page) | Fixed inset-0 when modal | Not in wrapper (form is the content) |
| `src/components/ProgramDetailModal.tsx` | Program details (full-screen style) | Fixed inset-0; content **fixed inset-4 sm:inset-8 md:inset-16** | No; content is inset, not centered |
| `src/components/coach/programs/TrainingBlockModal.tsx` | New/Edit training block | Fixed inset-0 | **items-end** sm:items-center justify-center p-4 |
| `src/components/coach/ExerciseAlternativesModal.tsx` | Exercise alternatives (swap exercise) | Fixed inset-0 | Yes (items-center justify-center p-4 pb-24) |
| `src/components/nutrition/AddFoodModal.tsx` | Add food (uses Radix Dialog) | Via Dialog: fixed overlay + content transform center | Radix: left-[50%] top-[50%] translate -50% |
| `src/components/coach/MealCreator.tsx` | Meal creator (coach meal plans) | Fixed inset-0 | **items-start** justify-center p-4 pt-20 pb-20 |
| `src/components/ui/AchievementUnlockModal.tsx` | Achievement unlock celebration | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/components/ui/WorkoutCompletionModal.tsx` | Workout completion celebration | Fixed inset-0 | Yes (items-center justify-center p-4) |
| **Feature-specific** | | | |
| `src/components/features/nutrition/MealPlanAssignmentModal.tsx` | Assign meal plan to client(s); uses ResponsiveModal | Via ResponsiveModal | items-start justify-center |
| `src/components/coach/client-views/ClientMealsView.tsx` | Assign another plan flow: ResponsiveModal + MealPlanAssignmentModal | Via ResponsiveModal | items-start justify-center |
| `src/app/coach/nutrition/meal-plans/[id]/page.tsx` | Meal creator / meal options editor modal | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/app/coach/nutrition/generator/page.tsx` | Food swap modal (replace food in generator) | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/app/client/workouts/[id]/start/page.tsx` | Video modal, Exercise Image modal, Exercise Alternatives modal, Plate Calculator, Completion modal, Drop Set Calculator, Cluster Timer modal, **Full-screen Timer modal** | Fixed inset-0 for all | Yes for most (items-center justify-center p-4); Timer modal has custom layout |
| `src/components/coach/ProgramProgressionRulesEditor.tsx` | Replace workout modal | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/components/coach/EnhancedProgramManager.tsx` | Assignment modal (ResponsiveModal); Exercise replacement modal (ResponsiveModal); ProgramDetailsModal (inline) | ResponsiveModal / fixed inset-0 | items-start (ResponsiveModal); ProgramDetailsModal uses fixed inset-0 **items-start** justify-center |
| `src/components/coach/WorkoutBlockBuilder.tsx` | Add block modal (comment only; may be inline UI) | — | — |
| `src/components/SetLoggingForm.tsx` | Video modal (exercise video) | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/components/coach/client-views/ClientClipcards.tsx` | Two modals (clipcard flows) | Fixed inset-0 | One items-center; one **items-start** justify-center pt-6 |
| `src/components/progress/CheckIns.tsx` | Check-in modals (e.g. log measurement, photo) | Fixed inset-0 | items-start (2x); one items-center (full-screen style) |
| `src/components/progress/GoalsAndHabits.tsx` | Goals/habits modals (3x) | Fixed inset-0 | **items-start** justify-center p-4 overflow-y-auto |
| `src/app/client/profile/page.tsx` | Profile modals (e.g. avatar crop, confirm) | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/app/coach/profile/page.tsx` | Coach profile modal | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/app/client/goals/page.tsx` | Goal-related modals (add/edit, etc.) | Fixed inset-0 (and one absolute for empty state) | Yes (items-center justify-center p-4) |
| `src/app/client/progress/photos/page.tsx` | Photo viewer modal | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/app/client/challenges/page.tsx` | Challenge modal | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/components/coach/ProgramsDashboardContent.tsx` | Two modals | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/components/coach/ReportPreview.tsx` | Report preview | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/app/coach/workouts/templates/page.tsx` | Template modal | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/app/coach/meals/page.tsx` | Meals modals (3x) | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/components/TimerSettings.tsx` | Timer settings | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/components/HabitAnalytics.tsx` | Habit analytics modal | Fixed inset-0 | Yes (items-center justify-center p-4) |
| `src/components/coach/EnhancedWorkoutTemplateManager.tsx` | Modal (e.g. replace exercise) | Fixed inset-0 | Yes (items-center justify-center p-4) |

**Summary – centering approach**

- **items-center justify-center:** Most small dialogs (confirm, video, image, plate calculator, completion, etc.).
- **items-start justify-center:** ResponsiveModal, AddGoalModal, LogMeasurementModal, MealCreator, coach meal plan editor, ProgramDetailsModal, CheckIns, GoalsAndHabits, clipcard (one of two). Better for scrollable content on mobile.
- **items-end sm:items-center:** RPEModal, TrainingBlockModal, QuickFoodSearch (bottom-sheet on mobile, centered on sm+).
- **Transform-based (no flex):** Radix `dialog.tsx` (AddFoodModal) — `left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]`.
- **Inset full-area:** ProgramDetailModal — `fixed inset-4 sm:inset-8 md:inset-16` (no centering).

---

## 2. Theme Toggle / Dark Mode

- **ThemeContext** (`src/contexts/ThemeContext.tsx`): Provides `isDark`, `toggleTheme()`, `getThemeStyles()`, etc. Theme is persisted in `localStorage` ("theme": "dark" | "light") and respects `prefers-color-scheme: dark` if no saved preference.
- **Theme toggle exists:** Yes.
  - **Header** (`src/components/layout/Header.tsx`): Single button that calls `toggleTheme`; icon switches between Sun (when dark) and Moon (when light). Title: "Switch to Light Mode" / "Switch to Dark Mode".
  - **Client profile** (`src/app/client/profile/page.tsx`): Sun/Moon buttons; active state styled (e.g. `fc-text-primary fc-glass border` for active, `fc-text-dim` for inactive). Toggling only when switching to the other mode (e.g. `!isDark || toggleTheme()` for Sun).
- **Conclusion:** App supports both light and dark. It is **not** dark-only. Theme can be switched from the header and from the client profile page.

---

## 3. Main Client Screens (for mobile testing)

| Screen | Notes |
|--------|--------|
| Train page | Program cards, start workout, etc. |
| Fuel page | Plan picker, water, meals, goals; multiple modals (AddGoal, QuickFoodSearch, photo preview) |
| Check-ins page | Log measurements, photos; modals in CheckIns.tsx |
| Progress pages | Analytics, photos; photo viewer modal |
| Workout execution screen | Many modals: rest timer, video, image, alternatives, plate calc, completion, drop set calc, cluster timer, full-screen tabata/circuit timer |
| Goals page | Goals list, add/edit goal modals |
| Settings / Profile | Theme toggle, avatar crop, other profile modals |

---

## 4. Main Coach Screens (for mobile testing)

| Screen | Notes |
|--------|--------|
| Dashboard | Overview, no modal list in this inventory |
| Client list | — |
| Client detail (all tabs) | Nutrition: MealPlanAssignmentModal, ResponsiveModal; Clipcards: 2 modals; etc. |
| Program builder | ProgramDetailsModal, TrainingBlockModal, ProgressionSuggestionsModal, Replace workout (ProgramProgressionRulesEditor), Exercise replacement (EnhancedProgramManager) |
| Meal plan pages | Meal creator modal, meal options editor, generator swap modal |
| Gym console | As per coach flows that use the same modals (e.g. workout templates, exercises) |

---

## 5. Quick reference – centering by component

- **Flex items-center justify-center:** RestTimerModal, TabataCircuitTimerModal, VideoPlayerModal, SimpleModal, WorkoutDetailModal, ExerciseAlternativesModal, AchievementUnlockModal, WorkoutCompletionModal, coach meal plan editor overlay, generator swap, workout start (video/image/alternatives/plate/completion/drop set/cluster), ProgramProgressionRulesEditor, SetLoggingForm, client/coach profile modals, client goals modals, progress photos viewer, challenges, ProgramsDashboardContent, ReportPreview, coach templates page, coach meals page, TimerSettings, HabitAnalytics, EnhancedWorkoutTemplateManager, one ClientClipcards modal.
- **Flex items-start justify-center:** (After Phase S2 these were changed to items-center where applicable.)
- **Flex items-end sm:items-center:** RPEModal, TrainingBlockModal, QuickFoodSearch.
- **Transform center (Radix):** dialog.tsx (AddFoodModal).
- **Inset (no flex center):** ProgramDetailModal.

---

## 6. Phase S2 Part 3: Mobile responsiveness check (375px) — report

Audit at 375px viewport. Fixes applied:

| Screen | Horizontal scroll | Touch &lt; 44px | Text overflow | Layout | Fixes applied |
|--------|-------------------|-----------------|---------------|--------|----------------|
| /client/train | Prevent | — | — | OK | ClientPageShell: min-w-0 overflow-x-hidden; train already has px-4. |
| /client/nutrition | Prevent | — | — | OK | Already had overflow-x-hidden px-4 (prior work). |
| /client/check-ins | Prevent | — | — | OK | ClientPageShell + px-4 sm:px-6 on check-ins page. |
| /client/goals | Prevent | — | — | OK | Outer div: min-w-0 overflow-x-hidden px-4 sm:px-6; inner: min-w-0. |
| /client/workouts/[id]/start | — | — | — | OK | Spot-check only; already tested. |
| /coach (dashboard) | Prevent | — | — | OK | Main content div: min-w-0 overflow-x-hidden px-4 sm:px-6. |
| /coach/clients/[id] | Prevent | — | — | OK | Main content: min-w-0 overflow-x-hidden px-4 sm:p-6 pb-32. |
| /coach/nutrition/generator | Prevent | — | — | OK | Wrapper: min-w-0 overflow-x-hidden (already had px-4 sm:px-6). |
| /coach/nutrition/meal-plans | Prevent | — | — | OK | Container: min-w-0 overflow-x-hidden (already had p-4 sm:p-6). |
| /coach/nutrition/meal-plans/[id] | — | — | — | — | Not changed; uses modal + existing layout. |

No layout redesign; only defensive overflow and padding for 375px.
