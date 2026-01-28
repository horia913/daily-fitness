# UI Inventory (Current App)

This is a structured inventory of UI elements currently present in the codebase.  
Source of truth for current-state UI overrides: `dailyfitness-app/ui_tokens/override_hotspots.md`.

---

## 1) Layout Primitives

### Page Shell / App Container
- `src/components/layout/AppLayout.tsx`
- `src/components/server/MainLayout.tsx`
- `src/components/server/DashboardLayout.tsx`
- `src/components/server/PageLayout.tsx`
- `src/components/server/AuthLayout.tsx`

### Header
- `src/components/layout/Header.tsx`
- `src/components/coach/CoachDashboardHeader.tsx`

### Bottom Navigation
- `src/components/layout/BottomNav.tsx`

### Scroll Areas / Containers
- `src/components/layout/AppLayout.tsx` (main scroll container)
- `src/components/server/PageLayout.tsx`

---

## 2) Core UI Components (Base Library)

All base UI components live in `src/components/ui/`:
- `AchievementCard.tsx`
- `AchievementUnlockModal.tsx`
- `AnimatedBackground.tsx`
- `AnimatedNumber.tsx`
- `avatar.tsx`
- `badge.tsx`
- `button.tsx`
- `card.tsx`
- `ChatBubble.tsx`
- `checkbox.tsx`
- `ConversationList.tsx`
- `dialog.tsx`
- `floating-input.tsx`
- `floating-textarea.tsx`
- `FloatingParticles.tsx`
- `form.tsx`
- `GlassCard.tsx`
- `input.tsx`
- `label.tsx`
- `LeaderboardCard.tsx`
- `LoadingSkeleton.tsx`
- `LoadPercentageWeightToggle.tsx`
- `MacroBars.tsx`
- `MessageInput.tsx`
- `NutritionRing.tsx`
- `optimized-image.tsx`
- `progress-indicator.tsx`
- `progress.tsx`
- `ResponsiveModal.tsx`
- `SearchableSelect.tsx`
- `select.tsx`
- `stepper.tsx`
- `switch.tsx`
- `tabs.tsx`
- `textarea.tsx`
- `toast-provider.tsx`
- `toast.tsx`
- `WaterTracker.tsx`
- `WorkoutCompletionModal.tsx`

---

## 3) Feature UI Components (Root + Subdirectories)

### Root Components (`src/components/`)
- `BulkAssignment.tsx`
- `CategoryForm.tsx`
- `DynamicGreeting.tsx`
- `DynamicSummary.tsx`
- `GreetingSettings.tsx`
- `GymSettings.tsx`
- `HabitAnalytics.tsx`
- `HabitManager.tsx`
- `HabitTracker.tsx`
- `MealForm.tsx`
- `MealPlanBuilder.tsx`
- `MobileAuthDebug.tsx`
- `MobileCompatibilityProvider.tsx`
- `MobileDebugPanel.tsx`
- `NotificationBell.tsx`
- `NotificationCenter.tsx`
- `NotificationPrompt.tsx`
- `OneSignalProvider.tsx`
- `OneSignalScript.tsx`
- `PlateCalculator.tsx`
- `PlateCalculatorWidget.tsx`
- `PrefetchProvider.tsx`
- `ProgramDetailModal.tsx`
- `ProtectedRoute.tsx`
- `ServiceWorkerProvider.tsx`
- `SetLoggingForm.tsx`
- `SimpleDebug.tsx`
- `SimpleModal.tsx`
- `SmartTimer.tsx`
- `SummaryAnalytics.tsx`
- `TimerSettings.tsx`
- `VideoPlayerModal.tsx`
- `WorkoutAssignmentModal.tsx`
- `WorkoutDetailModal.tsx`
- `WorkoutTemplateForm.tsx`

### Client UI (`src/components/client/`)
- `LiveWorkoutBlockExecutor.tsx`
- `EnhancedClientWorkouts.tsx`
- `ChallengeCard.tsx`
- `ProgressCircles.tsx`
- `HabitTracker.tsx`
- `StreakCounters.tsx`
- `LogPerformanceTestModal.tsx`
- `LogMeasurementModal.tsx`

Workout execution sub-system:
- `workout-execution/BaseBlockExecutor.tsx`
- `workout-execution/RestTimerModal.tsx`
- `workout-execution/blocks/AmrapExecutor.tsx`
- `workout-execution/blocks/ClusterSetExecutor.tsx`
- `workout-execution/blocks/DropSetExecutor.tsx`
- `workout-execution/blocks/EmomExecutor.tsx`
- `workout-execution/blocks/ForTimeExecutor.tsx`
- `workout-execution/blocks/GiantSetExecutor.tsx`
- `workout-execution/blocks/HRSetExecutor.tsx`
- `workout-execution/blocks/PreExhaustionExecutor.tsx`
- `workout-execution/blocks/RestPauseExecutor.tsx`
- `workout-execution/blocks/StraightSetExecutor.tsx`
- `workout-execution/blocks/SupersetExecutor.tsx`
- `workout-execution/blocks/TabataExecutor.tsx`
- `workout-execution/ui/BlockDetailsGrid.tsx`
- `workout-execution/ui/BlockTypeBadge.tsx`
- `workout-execution/ui/ExerciseActionButtons.tsx`
- `workout-execution/ui/InstructionsBox.tsx`
- `workout-execution/ui/LargeInput.tsx`
- `workout-execution/ui/NavigationControls.tsx`
- `workout-execution/ui/ProgressIndicator.tsx`
- `workout-execution/ui/ProgressionBadge.tsx`
- `workout-execution/ui/TabataCircuitTimerModal.tsx`

### Coach UI (`src/components/coach/`)
- `ActionItems.tsx`
- `AdherenceInsights.tsx`
- `AdherenceTrendChart.tsx`
- `AnalyticsChart.tsx`
- `ClientDetailModal.tsx`
- `CoachDashboardHeader.tsx`
- `ComplianceSnapshot.tsx`
- `ComplianceSummaryWidget.tsx`
- `DailyAdherenceLog.tsx`
- `DraggableExerciseCard.tsx`
- `EnhancedProgramManager.tsx`
- `EnhancedWorkoutTemplateManager.tsx`
- `ExerciseAlternativesModal.tsx`
- `ExerciseCard.tsx`
- `ExerciseSearchFilters.tsx`
- `MealCreator.tsx`
- `NewClientRequests.tsx`
- `OptimizedAdherenceTracking.tsx`
- `OptimizedAnalyticsOverview.tsx`
- `OptimizedAnalyticsReporting.tsx`
- `OptimizedClientProgress.tsx`
- `OptimizedComplianceAnalytics.tsx`
- `OptimizedComplianceDashboard.tsx`
- `OptimizedDetailedReports.tsx`
- `OptimizedExerciseLibrary.tsx`
- `OptimizedFoodDatabase.tsx`
- `OptimizedNutritionAssignments.tsx`
- `OptimizedWorkoutTemplates.tsx`
- `ProgramDetailsModal.tsx`
- `ProgramProgressionRulesEditor.tsx`
- `ProgramTimeline.tsx`
- `ProgramVolumeCalculator.tsx`
- `ProgressionSuggestionsModal.tsx`
- `ReportGenerator.tsx`
- `ReportPreview.tsx`
- `ReportTemplateSelector.tsx`
- `TodaySchedule.tsx`
- `VolumeCalculatorWidget.tsx`
- `VolumeDetailsModal.tsx`
- `WorkoutBlockBuilder.tsx`
- `WorkoutTemplateCard.tsx`
- `WorkoutTemplateDetails.tsx`
- `WorkoutTemplateEditor.tsx`
- `WorkoutTemplateFilters.tsx`
- `WorkoutTemplateSidebar.tsx`

Coach client views:
- `coach/client-views/ClientAdherenceView.tsx`
- `coach/client-views/ClientAnalyticsView.tsx`
- `coach/client-views/ClientClipcards.tsx`
- `coach/client-views/ClientGoalsView.tsx`
- `coach/client-views/ClientHabitsView.tsx`
- `coach/client-views/ClientMealsView.tsx`
- `coach/client-views/ClientProfileView.tsx`
- `coach/client-views/ClientProgressView.tsx`
- `coach/client-views/ClientWorkoutsView.tsx`

### Feature Modules (`src/components/features/`)
- `features/programs/ProgramCard.tsx`
- `features/programs/ProgramCard_redesigned.tsx`
- `features/programs/ProgramCard_OLD_backup.tsx`
- `features/workouts/ExerciseBlockCard.tsx`
- `features/workouts/ExerciseDetailForm.tsx`
- `features/workouts/ExerciseItem.tsx`
- `features/workouts/WorkoutTemplateCard.tsx`
- `features/workouts/WorkoutTemplateCard_redesigned.tsx`
- `features/workouts/WorkoutTemplateCard_OLD_backup.tsx`
- `features/nutrition/MealPlanAssignmentModal.tsx`
- `features/nutrition/MealPlanCard.tsx`

### Progress (`src/components/progress/`)
- `ChartsAndGraphs.tsx`
- `CheckIns.tsx`
- `CommunityLeaderboard.tsx`
- `DynamicInsights.tsx`
- `GoalsAndHabits.tsx`
- `LifestyleAnalytics.tsx`
- `MobilityFormFields.tsx`
- `ProgressPhotos.tsx`
- `SimpleCharts.tsx`
- `TrophyRoom.tsx`
- `WorkoutAnalytics.tsx`

### Goals (`src/components/goals/`)
- `GoalCard.tsx`
- `CustomGoalForm.tsx`

### Workout Blocks Display (`src/components/WorkoutBlocks/`)
- `BlockCardDisplay.tsx`
- `CircuitsDisplay.tsx`
- `DensityTrainingDisplay.tsx`
- `DropsetsDisplay.tsx`
- `FieldDisplay.tsx`
- `StraightSetsDisplay.tsx`
- `SupersetsDisplay.tsx`
- `TypeBadge.tsx`

### Hybrid / Guards / Server
- Hybrid: `AuthWrapper.tsx`, `DashboardWrapper.tsx`
- Guards: `ClientTypeGuard.tsx`, `RoleGuard.tsx`
- Server: `AuthLayout.tsx`, `DashboardLayout.tsx`, `ExerciseImage.tsx`, `MainLayout.tsx`, `PageLayout.tsx`

---

## 4) Screens (Next.js Routes)

All current screens (pages) are under:
- `src/app/client/**/page.tsx`
- `src/app/coach/**/page.tsx`
- Root and setup:
  - `src/app/page.tsx`
  - `src/app/setup-database/page.tsx`
  - `src/app/simple-auth/page.tsx`

(Full list of 87 pages captured via glob on `src/app/**/page.tsx`.)

---

## 5) Interaction States Present in Code

Derived from base components + overrides in `override_hotspots.md`:
- Active/pressed scaling (buttons/cards with `active:scale-*`)
- Hover elevation/opacity changes
- Selected/active navigation item styling
- Loading skeletons (`ui/LoadingSkeleton.tsx`)
- Toasts (`ui/toast.tsx`, `ui/toast-provider.tsx`)
- Modals/sheets (`ui/dialog.tsx`, `ui/ResponsiveModal.tsx`, `WorkoutCompletionModal.tsx`)
- Progress visuals (`ui/progress.tsx`, `ui/progress-indicator.tsx`, `NutritionRing.tsx`, `MacroBars.tsx`)

---

## 6) Current-Style Override Hotspots

See `dailyfitness-app/ui_tokens/override_hotspots.md` for the current list of per-component class overrides and styling drift.

