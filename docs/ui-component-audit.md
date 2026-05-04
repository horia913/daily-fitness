# UI component audit (Phase 1)

**Scope:** `dailyfitness-app/src/` — catalog of reusable UI built in the codebase.  
**Reference only (not audited as source of truth):** `docs/mockups/client-screens-v5.html`  
**Method:** Static scan of `src/components/**` and import usage across `src/` (grep-based). Inline-only route JSX is summarized under **Cross-cutting patterns**, not as one row per page.

---

## Cross-cutting patterns (not a single abstraction)

These recur across many pages/components via Tailwind / shared CSS tokens (`fc-*`), not always via one React export.

| Pattern | Where it appears | Visual / role |
|--------|-------------------|---------------|
| **Glass / prescription card shell** | `fc-card-shell`, `fc-card-shell-outline`, tone modifiers (`fc-card-shell--success`, etc.) | Frosted panel, often left accent; used inside `GlassCard`, `ClientGlassCard`, coach/client pages |
| **Primary / secondary / ghost buttons** | `fc-btn`, `fc-btn-primary`, `fc-btn-secondary`, `fc-btn-ghost`, `fc-press`; also shadcn `Button` variants `fc-primary` / `fc-secondary` | Rounded-xl CTAs, 44px touch targets on fc variants |
| **Typography: display / headline** | Mockup-aligned fonts in CSS/globals; app uses `font-mono`, `fc-text-dim`, `text-cyan-400`, etc. | Dense dashboard numerals, uppercase tracking labels |
| **Page chrome: animated vs atmospheric** | `AnimatedBackground` + `FloatingParticles` on many client/coach routes; `AtmosphericBackdrop` inside `ClientPageShell` / `CoachPageShell` | Full-screen motion layers vs tier-aware gradient wash |
| **Section titles** | `SectionHeader` (client-ui) and ad hoc `text-xs font-semibold uppercase tracking` clusters | Row with optional trailing action |
| **Pills / chips** | Inline `rounded-full` + border classes (e.g. goals history status); `Badge` (shadcn); `FilterPills` (v4 lab) | Small categorical labels |
| **Dividers** | `border-white/10`, `border-border`, hr between sections | Low-contrast separators |
| **Modal / sheet stacking** | `Dialog` (Radix), `ResponsiveModal`, `ModalPortal`, various `*Modal.tsx` | Overlay + panel |

---

## CARDS

| Component | Location | Type | Consumed by | Visual | Variants / states | Notes |
|-----------|----------|------|-------------|--------|-----------------|-------|
| **Card** (shadcn) | `components/ui/card.tsx` | Atomic (compound: CardHeader, CardTitle, …) | HabitTracker (root), NotificationPrompt, coach tools, create-user, ClientFmsAssessmentsPanel, … | Rounded-2xl bordered panel **or** `fc-card-shell` when `variant="fc"` / `shell` | `variant`: default, fc, shell | **Duplication:** overlaps conceptually with `GlassCard` / `ClientGlassCard` / `AppCard` |
| **AppCard** | `components/ui/AppCard.tsx` | Composite | Programs dashboard content, coach program UIs | Shell + optional tone / actions | Tones: neutral, success, error, warning, info | Coach-leaning shell |
| **GlassCard** | `components/ui/GlassCard.tsx` | Composite | Wide coach/admin/client usage (see any `@/components/ui/GlassCard` import) | Glass shell, optional press, elevation, custom border | `tone`, `elevation`, `pressable` | **Duplication:** same shell family as `ClientGlassCard`; coach-oriented API (intensity, onPress) |
| **ClientGlassCard** | `components/client-ui/GlassCard.tsx` | Composite | `HybridNutritionView`, `EnhancedClientWorkouts`, train/check-in/history pages, weekly check-in steps, `ActiveProgramCard`, `WorkoutDayPreview`, `GoalBasedNutritionView`, workout start/details | Padding + `fc-card-shell` / outline | `tone`; custom `bg-*` switches to outline | **Duplication:** paired with `GlassCard` (ui) — two implementations |
| **HeroActionCard** | `components/ui/HeroActionCard.tsx` | Composite | `app/dev/v4-lab/page.tsx` only (production) | Large CTA card with eyebrow, stat, action | Default layout props | Effectively **v4-lab–only** outside dev |
| **HeroWorkoutCard** | `components/client/HeroWorkoutCard.tsx` | Composite | `app/client/page.tsx` | Today’s workout hero | Data-driven | |
| **AchievementCard** | `components/ui/AchievementCard.tsx` | Composite | Achievements client page, modals | Rarity frame, icon, progress | Rarity tiers, locked/unlocked | |
| **LeaderboardCard** | `components/ui/LeaderboardCard.tsx` | Composite | **UNUSED** (no imports outside file) | Rank row / podium styling | — | **UNUSED** |
| **MealPlanCard** | `components/features/nutrition/MealPlanCard.tsx` | Composite | Coach nutrition flows | Meal plan summary card | — | |
| **ProgramCard** | `components/features/programs/ProgramCard.tsx` | Composite | Program lists | Program summary tile | — | |
| **WorkoutTemplateCard** (features) | `components/features/workouts/WorkoutTemplateCard.tsx` | Composite | Coach workout template lists | Template tile | — | **Duplication:** naming overlap with coach `WorkoutTemplateCard.tsx` (different file) |
| **WorkoutTemplateCard** (coach) | `components/coach/WorkoutTemplateCard.tsx` | Composite | Coach training UI | Template tile | — | **Duplication:** two card implementations for templates |
| **ExerciseBlockCard** | `components/features/workouts/ExerciseBlockCard.tsx` | Composite | Workout builder surfaces | Block summary | — | |
| **ExerciseCard** | `components/coach/ExerciseCard.tsx` | Composite | Libraries, pickers | Exercise row/tile | — | |
| **GoalCard** | `components/goals/GoalCard.tsx` | Composite | Goals flows | Pillar-tinted goal card | `compact`, pillar styling | |
| **CompactGoalCard** | `components/goals/CompactGoalCard.tsx` | Composite | Lists / summaries | Narrow goal row | — | |
| **ChallengeCard** | `components/client/ChallengeCard.tsx` | Composite | Challenges list | Challenge promo tile | — | |
| **ActiveProgramCard** | `components/client/train/ActiveProgramCard.tsx` | Composite | Train hub | Program progress card | — | |
| **ProgramCompletedCard** | `components/client/train/ProgramCompletedCard.tsx` | Composite | Train | Completion state | — | |
| **WorkoutDayPreview** | `components/client/train/WorkoutDayPreview.tsx` | Composite | Train | Day column preview | — | |
| **WellnessTrendsCard** | `components/client/WellnessTrendsCard.tsx` | Composite | Wellness / check-ins | Trends mini-card | — | |
| **WeeklyCheckInCard** | `components/client/WeeklyCheckInCard.tsx` | Composite | Check-ins | Weekly summary card | Done / pending styling | |
| **ProgressMomentCard** | `components/client/weekly-checkin/ProgressMomentCard.tsx` | Composite | Weekly check-in flow | Highlight moment | — | |
| **BiggestWinCard** | `components/client/BiggestWinCard.tsx` | Composite | Client surfaces | Win highlight | — | |
| **WorkoutLogCard** | `components/client/WorkoutLogCard.tsx` | Composite | Logs | Log summary row/card | — | |
| **MealCardWithOptions** | `components/client/MealCardWithOptions.tsx` | Composite | Nutrition | Meal + options | — | |
| **PrescriptionCard** | `components/client/workout-execution/ui/PrescriptionCard.tsx` | Composite | Live workout | Prescription block | — | |
| **InstructionsBox** | `components/client/workout-execution/ui/InstructionsBox.tsx` | Atomic | Executors | Coach notes callout | — | |
| **TrophyRoom** | `components/progress/TrophyRoom.tsx` | Composite | Progress | PR / trophy grid | loading | |
| **ChartsAndGraphs** | `components/progress/ChartsAndGraphs.tsx` | Composite | Progress | Chart grid wrapper | loading | |
| **GoalsAndHabits** | `components/progress/GoalsAndHabits.tsx` | Composite | Progress | Combined goals/habits | loading | |
| **ProgressPhotos** | `components/progress/ProgressPhotos.tsx` | Composite | Progress | Photo grid | — | |
| **CommunityLeaderboard** | `components/progress/CommunityLeaderboard.tsx` | Composite | Progress | Leaderboard table | loading, sex filter | |
| **WorkoutAnalytics** | `components/progress/WorkoutAnalytics.tsx` | Composite | Progress | Analytics blocks | loading | |
| **PRTimelineChart** | `components/progress/PRTimelineChart.tsx` | Composite | Client/coach PR views | Timeline viz | — | |
| **Wellness / volume / nutrition charts** | `WellnessTrendChart.tsx`, `VolumeTrendChart.tsx`, `NutritionComplianceChart.tsx` | Composite | Dashboards | Line/area charts | — | |
| **AdherenceTrendChart** | `components/coach/AdherenceTrendChart.tsx` | Composite | Coach | Trend chart | — | |
| **Client leaderboard body** | `components/client/progress/ClientLeaderboardPageBody.tsx` | Page-body composite | `app/client/progress/leaderboard` | Full leaderboard page layout | — | |
| **Challenge detail body** | `components/client/challenges/ChallengeDetailPageBody.tsx` | Page-body composite | Challenge detail route | Challenge layout | — | |
| **AuthFormContainer** (card-like) | `components/server/AuthLayout.tsx` | Composite | Auth pages | Centered form panel | — | |
| **FeatureHighlights** | `components/server/AuthLayout.tsx` | Composite | Auth marketing column | Bullet highlights | — | |

---

## BUTTONS

| Component | Location | Type | Consumed by | Visual | Variants / states | Notes |
|-----------|----------|------|-------------|--------|-----------------|-------|
| **Button** + `buttonVariants` | `components/ui/button.tsx` | Atomic | Widespread (`@/components/ui/button`) | shadcn + fc variants | default, destructive, outline, secondary, ghost, link, **fc-primary**, **fc-secondary**, **fc-ghost**, **fc-destructive**, energy, trust, success, warning; sizes default/sm/lg/xl/icon | **Duplication:** overlaps `PrimaryButton` / `SecondaryButton` (client-ui) |
| **PrimaryButton** | `components/client-ui/PrimaryButton.tsx` | Atomic | Workout complete/start, check-in history, workout details, goals history (via barrel) | Full-width fc primary CTA | disabled | **Duplication:** vs `Button variant="fc-primary"` |
| **SecondaryButton** | `components/client-ui/SecondaryButton.tsx` | Atomic | Same family as Primary + nutrition retry | fc secondary | disabled | **Duplication:** vs `Button variant="fc-secondary"` |
| **NotificationBell** | `components/NotificationBell.tsx` | Composite | Shell / headers | Icon button | — | |
| **LogSetButton** | `components/client/workout-execution/ui/LogSetButton.tsx` | Atomic | Executors | Prominent log CTA | — | |
| **ActionButtons** (workout form) | `components/workout-form/ActionButtons.tsx` | Composite | Template form | Save/cancel row | — | |
| **CoachClientTabBar** | `components/coach/CoachClientTabBar.tsx` | Composite | Client detail layout | Horizontal tab buttons | active route | |
| **AnalyticsNav** | `components/coach/AnalyticsNav.tsx` | Composite | Coach analytics | Nav pills | — | |
| **Raw `<button className="fc-btn…">`** | Many pages | Inline pattern | Numerous | Same look as Button fc-* | — | **Duplication:** documented in `button.tsx` header comment |

---

## INDICATORS / BADGES

| Component | Location | Type | Consumed by | Visual | Variants / states | Notes |
|-----------|----------|------|-------------|--------|-----------------|-------|
| **TierBadge** | `components/ui/TierBadge.tsx` | Atomic | `app/client/page.tsx`, tier backdrop typing | Tier-colored pill | bronze → diamond | |
| **Badge** + `badgeVariants` | `components/ui/badge.tsx` | Atomic | Goals, habits, coach tables, … | Small pill | variants via CVA | |
| **AthleteScoreRing** | `components/client-ui/AthleteScoreRing.tsx` | Composite | `AthleteScoreSummary`, `ClientScoreInsightsSection` | Circular score ring | sizes, motion hook | |
| **BeastRingMotionLayer** | `components/client-ui/BeastRingMotionLayer.tsx` | Composite | Inside `AthleteScoreRing` | Motion overlay for ring | — | |
| **ScoreBreakdown** | `components/client-ui/ScoreBreakdown.tsx` | Composite | `ClientScoreInsightsSection` | Pillars / trends list | — | |
| **ProgressCircles** | `components/client/ProgressCircles.tsx` | Composite | Client home / progress | Circular indicators | — | |
| **StreakCounters** | `components/client/StreakCounters.tsx` | Composite | Client home | Streak numerals | — | |
| **Progress** (shadcn) | `components/ui/progress.tsx` | Atomic | Bars across app | Horizontal bar | indeterminate? (radix) | |
| **TargetProgressBar** | `components/ui/TargetProgressBar.tsx` | Composite | `app/dev/v4-lab/page.tsx` | Bar vs target tick | variance coloring | v4-lab–heavy |
| **MetricGauge** | `components/ui/MetricGauge.tsx` | Composite | **UNUSED** | Arc gauge | — | **UNUSED** |
| **MacroBars** | `components/ui/MacroBars.tsx` | Composite | **UNUSED** | P/F/C bars | — | **UNUSED** |
| **NutritionRing** | `components/ui/NutritionRing.tsx` | Composite | **UNUSED** | Ring macro viz | — | **UNUSED** |
| **WaterTracker** | `components/ui/WaterTracker.tsx` | Composite | Active (client fuel tab) | Water glasses UI | — | User-confirmed active on fuel tab; treat as in-use |
| **AnimatedNumber** | `components/ui/AnimatedNumber.tsx` | Atomic | Coach template detail page, others | Counting animation | — | |
| **SetTypeBadge** | `components/client/workout-execution/ui/SetTypeBadge.tsx` | Atomic | Executors | Set type label | — | |
| **HabitLucideIcon** | `components/client/habitLucideIcon.tsx` | Atomic | Client `HabitTracker` | Category icon | — | |
| **AchievementIconDisplay** | `components/ui/achievementIconDisplay.tsx` | Atomic | `AchievementCard`, `AchievementUnlockModal` | Icon in frame | — | |
| **WorkoutProgressBar** | `components/client/workout-execution/ui/WorkoutProgressBar.tsx` | Composite | Live workout | Session progress | — | |
| **ProgressIndicator** (ui) | `components/ui/progress-indicator.tsx` | Atomic | `app/coach/clients/add/page.tsx` | Step dots (wizard) | steps, currentStep | **Duplication:** name collision with client workout `ProgressIndicator` |
| **ProgressIndicator** (workout) | `components/client/workout-execution/ui/ProgressIndicator.tsx` | Atomic | Block executors | Set “x of y” + bar | segmented option | **Duplication:** same name, different file/API |
| **Stepper** (numeric) | `components/ui/stepper.tsx` | Composite | `app/client/workouts/[id]/start/page.tsx` | +/- steppers | — | |
| **WeekMiniGrid** | `components/ui/WeekMiniGrid.tsx` | Composite | `app/dev/v4-lab/page.tsx` | 7-cell week stats | per-day state | Mostly dev lab |
| **ThisWeekStrip** | `components/client/ThisWeekStrip.tsx` | Composite | **UNUSED** | Week strip | — | **UNUSED**; **Duplication:** vs `WeekStrip`, `WeeklyStrip` |
| **WeekStrip** | `components/client/train/WeekStrip.tsx` | Composite | `app/client/train/page.tsx` | Train week selector | — | |
| **WeeklyStrip** | `components/client/check-ins/WeeklyStrip.tsx` | Composite | `app/client/check-ins/page.tsx` | Check-in week strip | — | **Duplication:** three week-strip components |
| **ActivityWeekSummary** | `components/client/activity/ActivityWeekSummary.tsx` | Composite | Activity | Week summary | — | |
| **RestTimerBar** | `components/client/workout-execution/RestTimerBar.tsx` | Composite | Live workout | Thin rest countdown | — | |
| **RestTimerOverlay** | `components/workout/RestTimerOverlay.tsx` | Composite | Global rest | Full-screen overlay | — | |
| **PlateCalculatorInline** | `components/client/workout-execution/ui/PlateCalculatorInline.tsx` | Composite | Workout tools | Plate math | — | |
| **ProgressionNudge** (+ helpers in file) | `components/client/workout-execution/ui/ProgressionNudge.tsx` | Composite | Executors | Suggestion callout | — | Multiple exports in file |

---

## FORMS / INPUTS

| Component | Location | Type | Consumed by | Visual | Variants / states | Notes |
|-----------|----------|------|-------------|--------|-----------------|-------|
| **Input** | `components/ui/input.tsx` | Atomic | Many forms | Bordered field | disabled | |
| **Textarea** | `components/ui/textarea.tsx` | Atomic | Forms, notes | Multiline | — | |
| **Label** | `components/ui/label.tsx` | Atomic | Paired with inputs | Form label | — | |
| **Checkbox** | `components/ui/checkbox.tsx` | Atomic | Goals, assignments | Radix checkbox | — | |
| **Switch** | `components/ui/switch.tsx` | Atomic | Settings | Toggle | — | |
| **Select** family | `components/ui/select.tsx` | Atomic (compound) | Widespread | Radix select | — | |
| **FloatingInput** | `components/ui/floating-input.tsx` | Atomic | `app/coach/clients/add/page.tsx` | Floating label input | — | |
| **FloatingTextarea** | `components/ui/floating-textarea.tsx` | Atomic | **UNUSED** | Floating label textarea | — | **UNUSED** |
| **SearchableSelect** | `components/ui/SearchableSelect.tsx` | Composite | `WorkoutTemplateForm`, `AddExercisePanel`, `ExerciseDetailForm` | Search + list | — | |
| **FrequencySelector** | `components/ui/FrequencySelector.tsx` | Composite | `app/dev/v4-lab/page.tsx` | Day/week/month chips | — | Mostly dev lab |
| **FilterPills** | `components/ui/FilterPills.tsx` | Composite | `app/dev/v4-lab/page.tsx` | Horizontal filter chips | — | Mostly dev lab |
| **InlineEditor** | `components/ui/InlineEditor.tsx` | Composite | `app/dev/v4-lab/page.tsx` | Inline editable value | — | Mostly dev lab |
| **LoadPercentageWeightToggle** | `components/ui/LoadPercentageWeightToggle.tsx` | Atomic | `ProgramProgressionGridCell`, `WorkoutTemplateForm` | % / kg toggle | — | |
| **LargeInput** | `components/client/workout-execution/ui/LargeInput.tsx` | Atomic | Executors | Big numeric entry | optional stepper | |
| **MessageInput** | `components/ui/MessageInput.tsx` | Composite | **UNUSED** | Chat composer | — | **UNUSED** |
| **Form** primitives | `components/ui/form.tsx` | Atomic (compound) | shadcn forms | Field layout | error states | |
| **DailyWellnessForm** | `components/client/DailyWellnessForm.tsx` | Composite | Wellness routes | Multi-step wellness | `immersive` | |
| **DailyCheckInForm** | `components/client/check-ins/DailyCheckInForm.tsx` | Composite | Check-ins | Daily fields | — | |
| **AddCheckInSheet** | `components/client/check-ins/AddCheckInSheet.tsx` | Composite | Check-ins | Sheet content | — | |
| **CategoryPicker** | `components/goals/wizard/CategoryPicker.tsx` | Composite | Goal wizard | Category tiles | — | |
| **Wizard forms** | `BodyCompositionForm`, `OutcomeForm`, `NutritionForm`, `PerformanceForm` | Composite | Goal wizard | Per-category inputs | — | |
| **SetLoggingForm** | `components/SetLoggingForm.tsx` | Composite | Logging flows | Set grid | — | |
| **ExerciseSetForm** | `components/ExerciseSetForm.tsx` | Composite | Builder | Set editor | — | |
| **ExerciseForm** / **ExerciseSelector** / **ExerciseDetailForm** | `components/` | Composite | CRUD / library | Exercise editing | — | |
| **MealForm** / **MealCreator** / **MealOptionEditor** | `components/` | Composite | Nutrition | Meal editing | — | |
| **CategoryForm** / **ExerciseCategoryForm** | `components/` | Composite | Admin/coach | Category CRUD | — | |
| **CheckInConfigEditor** | `components/coach/CheckInConfigEditor.tsx` | Composite | Coach | Check-in config | — | |
| **BasicInfoSection** (workout form) | `components/workout-form/BasicInfoSection.tsx` | Composite | Template form | Title/description | — | |
| **AddExercisePanel** | `components/workout-form/AddExercisePanel.tsx` | Composite | Template form | Exercise picker panel | — | |
| **WorkoutBlockBuilder** | `components/coach/WorkoutBlockBuilder.tsx` | Composite | Coach | Block editor shell | — | |
| **ProgramProgressionRulesEditor** | `components/coach/ProgramProgressionRulesEditor.tsx` | Composite | Coach | Rules grid | — | |
| **ProgramProgressionGrid** / **Row** / **Cell** | `components/coach/ProgramProgressionGrid*.tsx` | Composite | Progression UI | Spreadsheet-like | — | |
| **VolumeCalculatorWidget** / **ProgramVolumeCalculator** | `components/coach/` | Composite | Volume tools | Calculator panels | — | |

---

## NAV ELEMENTS

| Component | Location | Type | Consumed by | Visual | Variants / states | Notes |
|-----------|----------|------|-------------|--------|-----------------|-------|
| **BottomNav** | `components/layout/BottomNav.tsx` | Composite | Client shell | Fixed bottom icons | active route | |
| **Header** | `components/layout/Header.tsx` | Composite | Layouts | Top bar | — | |
| **AppLayout** | `components/layout/AppLayout.tsx` | Composite | App shell | Layout grid | — | |
| **ClientPageShell** | `components/client-ui/ClientPageShell.tsx` | Composite | Most `/client/*` pages | Top safe area + `AtmosphericBackdrop` + content slot | `tier`, scroll | |
| **CoachPageShell** | `components/coach-ui/CoachPageShell.tsx` | Composite | Coach pages using shell | Backdrop + width variant | width variant | |
| **DashboardLayout** | `components/server/DashboardLayout.tsx` | Composite | Dashboard routes | Sidebar / chrome | — | |
| **MainLayout** | `components/server/MainLayout.tsx` | Composite | Marketing/main | Header/footer | — | |
| **AuthLayout** | `components/server/AuthLayout.tsx` | Composite | Auth | Split hero + form | — | |
| **NavigationControls** | `components/client/workout-execution/ui/NavigationControls.tsx` | Atomic | Live workout | Prev/next | — | |
| **PrefetchProvider** | `components/PrefetchProvider.tsx` | Infrastructure | Layout | (non-visual wrapper) | — | Minimal UI |

---

## SECTION ELEMENTS

| Component | Location | Type | Consumed by | Visual | Variants / states | Notes |
|-----------|----------|------|-------------|--------|-----------------|-------|
| **SectionHeader** | `components/client-ui/SectionHeader.tsx` | Atomic | Workouts, check-ins, enhanced workouts, goals history | Title row + optional `action` | — | |
| **WizardNotice** | `components/goals/wizard/WizardNotice.tsx` | Atomic | Wizard | Notice callout | — | |
| **TrainingBlockHeader** | `components/coach/programs/TrainingBlockHeader.tsx` | Composite | Program editor | Block title row | — | |
| **EmptyExerciseState** | `components/workout-form/EmptyExerciseState.tsx` | Composite | Empty block | CTA empty | — | |

---

## TYPOGRAPHY

| Item | Location | Type | Consumed by | Visual | Variants | Notes |
|------|----------|------|-------------|--------|----------|-------|
| **Design tokens (CSS)** | `globals.css`, Tailwind theme, mockup vars in HTML reference | Token / pattern | Entire app | `fc-text-primary`, `fc-text-dim`, `text-muted-foreground`, `font-mono`, display fonts where configured | light/dark | Not a single React component; **mockup** defines `--f-display`, `--f-headline`, etc. |
| **CardTitle / DialogTitle** (shadcn) | `card.tsx`, `dialog.tsx` | Atomic | Many | Semantic headings inside shells | — | |

---

## STATUS / FEEDBACK

| Component | Location | Type | Consumed by | Visual | Variants / states | Notes |
|-----------|----------|------|-------------|--------|-----------------|-------|
| **Toast** / **ToastProvider** / `useToast` | `components/ui/toast.tsx`, `toast-provider.tsx` | Composite | `app/layout.tsx` + many callers | Corner toasts | variants | |
| **Banner** | `components/ui/Banner.tsx` | Composite | `app/dev/v4-lab/page.tsx` | Full-width status (info/warning/error/success) | variant, actions | **Duplication:** vs `ErrorBanner` |
| **ErrorBanner** | `components/ui/ErrorBanner.tsx` | Atomic | create-user, programs details, adherence, programs dashboard, … | Error strip | — | **Duplication:** vs `Banner` |
| **EmptyState** | `components/ui/EmptyState.tsx` | Composite | Many list pages | Icon + title + CTA | — | |
| **Skeleton** / **SkeletonCard** | `components/ui/Skeleton.tsx` | Atomic | Client home, me, … | Pulse blocks | — | |
| **LoadingSkeleton** | `components/ui/LoadingSkeleton.tsx` | Atomic | Coach loading rows | List skeleton | — | **Duplication:** vs `Skeleton` family |
| **PageSkeleton** | `components/ui/PageSkeleton.tsx` | Composite | Many routes | Full-page placeholder | dashboard / list / form | |
| **ResponsiveModal** | `components/ui/ResponsiveModal.tsx` | Composite | Many flows | Adaptive modal | — | |
| **ModalPortal** | `components/ui/ModalPortal.tsx` | Atomic | Portaled dialogs | Portal host | — | |
| **Dialog** primitives | `components/ui/dialog.tsx` | Atomic (compound) | Widespread | Radix overlay | — | |
| **SimpleModal** | `components/SimpleModal.tsx` | Composite | Legacy flows | Basic modal | — | **Duplication:** multiple modal stacks |
| **VideoPlayerModal** | `components/VideoPlayerModal.tsx` | Composite | Media | Video overlay | — | |
| **AchievementUnlockModal** | `components/ui/AchievementUnlockModal.tsx` | Composite | Workout complete/start, body-metrics | Celebration overlay | tier | |
| **PRCelebrationModal** | `components/client/workout-execution/ui/PRCelebrationModal.tsx` | Composite | PR flow | Celebration | — | |
| **RestTimerModal** / **TabataTimerModal** | `components/client/workout-execution/` | Composite | Timers | Countdown modals | — | |
| **ClientExerciseAlternativesModal** | `components/client/workout-execution/ui/ClientExerciseAlternativesModal.tsx` | Composite | Swap flow | List modal | — | |
| **ExerciseAlternativesModal** (coach) | `components/coach/ExerciseAlternativesModal.tsx` | Composite | Coach | Swap UI | — | **Duplication:** coach vs client modals |
| **Various `*Modal.tsx`** | Workout detail/assignment, program detail, week review, training block, add food, goal wizard, edit goal, … | Composite | Domain pages | Domain-specific overlays | — | See inventory below |

---

## SURFACES / ATMOSPHERE (layout-adjacent)

| Component | Location | Type | Consumed by | Visual | Variants | Notes |
|-----------|----------|------|-------------|--------|--------|-------|
| **AnimatedBackground** | `components/ui/AnimatedBackground.tsx` | Composite | Most client/coach pages | Animated gradient mesh | reduced motion aware | |
| **FloatingParticles** | `components/ui/FloatingParticles.tsx` | Composite | Paired with AnimatedBackground | Particle layer | toggled by perf settings | |
| **AtmosphericBackdrop** | `components/ui/AtmosphericBackdrop.tsx` | Atomic | `ClientPageShell`, `CoachPageShell`, `tierBackdrop` types | Tier-aware wash | `AtmosphericVariant` | |
| **AnimatedEntry** | `components/ui/AnimatedEntry.tsx` | Atomic | `app/coach/page.tsx` | Staggered fade-up wrapper | delay, animation | |

---

## MEDIA / MISC ATOMICS

| Component | Location | Type | Consumed by | Notes |
|-----------|----------|------|-------------|-------|
| **OptimizedImage** / **ExerciseThumbnail** / **AvatarImage** / **ResponsiveImage** | `components/ui/optimized-image.tsx` | Atomic / composite | Galleries, thumbs | |
| **Avatar** primitives | `components/ui/avatar.tsx` | Atomic | Profiles, lists | |
| **ChatBubble** (+ `WorkoutFeedbackBubble`, etc.) | `components/ui/ChatBubble.tsx` | Composite | **UNUSED** (no external imports) | **UNUSED** |
| **ConversationList** (+ pinned/unread) | `components/ui/ConversationList.tsx` | Composite | **UNUSED** | **UNUSED** |
| **Pill** | `components/client-ui/Pill.tsx` | Atomic | **UNUSED** | **UNUSED** — not to be confused with Lucide `Pill` icon in `habitLucideIcon.tsx` |

---

## DOMAIN COMPOSITES (inventory — exported UI from `src/components`)

Each row is a **distinct file-level component** (default or named export) with UI responsibility. Parentheticals name primary consumer routes or parents.

| Component | Location | Type | Notes |
|-----------|----------|------|-------|
| ProtectedRoute | `components/ProtectedRoute.tsx` | Composite | Auth gate (minimal UI) |
| AuthWrapper | `components/hybrid/AuthWrapper.tsx` | Composite | Hybrid login UI |
| NotificationPrompt | `components/NotificationPrompt.tsx` | Composite | Permission / prompt |
| HabitTrackerComponent | `components/HabitTracker.tsx` | Composite | Legacy coach habit manager UI | **Duplication:** vs `client/HabitTracker.tsx` |
| HabitTracker | `components/client/HabitTracker.tsx` | Composite | Client habits page | **Duplication:** two habit UIs |
| ClientScoreInsightsSection | `components/client/ClientScoreInsightsSection.tsx` | Composite | Home |
| AthleteScoreSummary | `components/client/AthleteScoreSummary.tsx` | Composite | Home |
| HybridNutritionView / GoalBasedNutritionView | `components/client/` | Composite | Nutrition |
| EnhancedClientWorkouts | `components/client/EnhancedClientWorkouts.tsx` | Composite | Home / workouts |
| CheckInHistory | `components/client/CheckInHistory.tsx` | Composite | History |
| ActivityList / LogActivityModal | `components/client/activity/` | Composite | Activity |
| WeeklyCheckInFlow / StepReview / StepPhotos / StepBodyMetrics | `components/client/weekly-checkin/` | Composite | Weekly flow |
| WeeklyComparison | `components/client/WeeklyComparison.tsx` | Composite | Insights |
| LiveWorkoutBlockExecutor | `components/client/LiveWorkoutBlockExecutor.tsx` | Composite | Live session |
| Block executors | `StraightSet`, `Superset`, `GiantSet`, `DropSet`, `ClusterSet`, `RestPause`, `PreExhaustion`, `Amrap`, `Emom`, `ForTime`, `Tabata`, `Endurance`, `SpeedWork` under `workout-execution/blocks/` | Composite | One screen family |
| BaseBlockExecutorLayout (+ format utils) | `components/client/workout-execution/BaseBlockExecutor.tsx` | Layout + utils | Shared executor chrome |
| ToolsDrawer | `components/client/workout-execution/ui/ToolsDrawer.tsx` | Composite | In-workout tools |
| LogMeasurementModal / LogPerformanceTestModal | `components/client/` | Composite | Logging |
| OverdueWorkouts / ExtraTraining | `components/client/train/` | Composite | Train hub |
| CompletedCheckInSummary / WellnessTrends | `components/client/check-ins/` | Composite | Check-ins |
| OneSignalProvider | `components/OneSignalProvider.tsx` | Infrastructure | Mostly non-visual |

**Coach / admin (selection):** `CoachExerciseCategoriesPanel`, `OptimizedWorkoutTemplates`, `OptimizedExerciseLibrary`, `ClientProgressionEditor`, `CoachClientDailyReview`, `OptimizedAdherenceTracking`, `ClientAnalyticsView`, `ClientHabitsView`, `ClientProgressWellnessSection`, `ProgramVolumeCalculator`, `VolumeCalculatorWidget`, `ClientMealsView`, `CoachClientProgressHub`, `ClientGoalsView`, `ClientPRTimeline`, `ClientWorkoutsView`, `OptimizedComplianceDashboard`, `OptimizedAnalyticsOverview`, `OptimizedDetailedReports`, `CoachDashboardHeader`, `NewClientRequests`, `OptimizedNutritionAssignments`, `OptimizedFoodDatabase`, `OptimizedClientProgress`, `CreateChallengeModal`, `MealCreator`, `MealOptionEditor`, `ReportGenerator`, `ReportTemplateSelector`, `ProgramTimeline`, `ProgramDetailsModal`, `WorkoutTemplateDetails`, `WorkoutBlockBuilder`, `ClientFmsAssessmentsPanel`, `CoachClientSubscriptionSection`, `SetNutritionGoals`, `CoachClientActivitiesPanel`, `ClientProgressBodySection`, `ClientProgressPhotosSection`, `ClientAccountSection`, `ClientProfileView`, `ClientMealEditor`, `ExerciseSwapModal`, `ClientDetailModal`, `ActionItems`, `ProgramsDashboardContent`, `EnhancedWorkoutTemplateManager`, `WorkoutTemplateSidebar`, `ProgressionPreview`, `ProgressionSuggestionsModal`, `WeekReviewModal`, `TrainingBlockModal`, `ProgramProgressionGrid*`, `CheckInConfigEditor`, `AnalyticsNav`, `CoachClientTabBar`, `AdherenceTrendChart`, etc.

**Goals:** `GoalWizard`, `EditGoalModal`, `GoalCard`, `CompactGoalCard`, wizard forms, `CategoryPicker`, `WizardNotice`.

**Root modals / heavy forms:** `WorkoutTemplateForm`, `WorkoutDetailModal`, `WorkoutAssignmentModal`, `ProgramDetailModal`, `SetLoggingForm`, `AddFoodModal`, `MealPlanAssignmentModal`, `VideoPlayerModal`, `SimpleModal`, `PlateCalculator`, `TimerSettings`, `HabitManager`, `HabitAnalytics`, `ClientComplianceDetail`, `CategoryForm`, `ExerciseCategoryForm`, `ExerciseForm`, `MealForm`.

**Workout blocks display:** `WorkoutBlocks/BlockCardDisplay.tsx`, `WorkoutBlocks/TabataSetsDisplay.tsx`.

**Features:** `ExerciseItem.tsx`, `ExerciseDetailForm.tsx`, `ExerciseBlockCard.tsx`, `WorkoutTemplateCard.tsx`, `ProgramCard.tsx`, `MealPlanCard.tsx`, `MealPlanAssignmentModal.tsx`.

**Progress:** Listed in CARDS section; `WorkoutAnalytics`, `PRTimelineChart`, chart trio, `TrophyRoom`, etc.

**Utils (non-UI but exported alongside):** `clientProgressHubUtils.ts` exports helper functions — **not UI components**.

---

## Duplication summary (flagged)

1. **Glass / shell cards:** `GlassCard` (ui) vs `ClientGlassCard` vs `AppCard` vs shadcn `Card` variants.  
2. **Primary/secondary CTAs:** `Button` (`fc-primary` / `fc-secondary`) vs `PrimaryButton` / `SecondaryButton`.  
3. **Banners:** `Banner` vs `ErrorBanner`.  
4. **Skeletons:** `Skeleton` / `SkeletonCard` vs `LoadingSkeleton` vs `PageSkeleton`.  
5. **Modals:** Radix `Dialog`, `ResponsiveModal`, `SimpleModal`, `ModalPortal`, many bespoke `*Modal.tsx`.  
6. **Progress indicators:** `components/ui/progress-indicator.tsx` vs `client/workout-execution/ui/ProgressIndicator.tsx`.  
7. **Week navigation:** `ThisWeekStrip` (unused) vs `WeekStrip` vs `WeeklyStrip`.  
8. **Workout template cards:** `features/workouts/WorkoutTemplateCard` vs `coach/WorkoutTemplateCard`.  
9. **Habit UI:** root `HabitTracker` vs `client/HabitTracker`.  
10. **Exercise swap modals:** coach vs client naming overlap.

---

## UNUSED summary (no imports from other `src/` files found)

| Component | Location |
|-----------|----------|
| Pill | `components/client-ui/Pill.tsx` |
| MetricGauge | `components/ui/MetricGauge.tsx` |
| MacroBars | `components/ui/MacroBars.tsx` |
| NutritionRing | `components/ui/NutritionRing.tsx` |
| LeaderboardCard | `components/ui/LeaderboardCard.tsx` |
| ChatBubble (+ specialized exports) | `components/ui/ChatBubble.tsx` |
| MessageInput | `components/ui/MessageInput.tsx` |
| ConversationList (+ variants) | `components/ui/ConversationList.tsx` |
| FloatingTextarea | `components/ui/floating-textarea.tsx` |
| ThisWeekStrip | `components/client/ThisWeekStrip.tsx` |

*Caveat:* Unused is **import-based**; dynamic imports or string-based routes would not appear. Re-verify before deletion.

---

## Counts (audit entries)

| Metric | Count |
|--------|------|
| **Category table rows** (CARDS) | 42 |
| **BUTTONS** | 9 |
| **INDICATORS / BADGES** | 28 |
| **FORMS / INPUTS** (table) | 32 |
| **NAV** | 11 |
| **SECTION** | 4 |
| **TYPO** | 2 |
| **STATUS / FEEDBACK** | 18 |
| **SURFACES / ATMOSPHERE** | 4 |
| **MEDIA / MISC** | 4 |
| **Cross-cutting pattern rows** | 8 |
| **Domain inventory summary** | Treated as **1** roll-up block + bullet lists (not re-counted per file to avoid double-counting table rows) |

**Unique component entries (tables, incl. shadcn group rows):** **154**  
**Duplication clusters flagged:** **10**  
**UNUSED atomics listed:** **10**  

If every file-level exported composite in the inventory appendix were counted separately as its own “entry,” the total would exceed **220**; the tables above prioritize atoms and high-impact composites; the inventory section lists the remainder without duplicating full metadata rows.

---

## Next steps (Phase 2 — do not start until you approve)

After you approve this audit, Phase 2 will add `src/app/dev/ui-gallery/page.tsx` importing these components with static props, grouped by the same categories.
