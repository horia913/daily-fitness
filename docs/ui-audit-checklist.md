# UI Audit Checklist

Track status for Full UI Audit plan. Build runs after each phase; no git operations.

**Screens that lack a mockup** (skip mockup-driven alignment; token/header pass only):  
/client (dashboard), /client/progress/mobility, /client/progress/nutrition, /client/progress/achievements, /client/nutrition (mockup marked “not OK”), /coach/compliance, /coach/reports, /coach/menu, /coach/progress, /coach/goals, /coach/achievements, /coach/gym-console, /coach/clients/[id]/* sub-tabs (workouts, profile, goals, progress, habits, adherence, analytics, meals, clipcards, fms, programs/[programId]) — no dedicated mockups in ui_tokens. Admin screens — no mockups in ui_tokens.

## Phase 2: Screens

| Route / area | Status |
|--------------|--------|
| /client | done (prior pass) — no mockup |
| /client/workouts | done — aligned to client workouts.txt mockup |
| /client/workouts/[id]/details | done — aligned to client workout detail page.txt mockup |
| /client/workouts/[id]/start | done (prior pass) — mockup: live workout straight set.txt (set-completion/rest view) |
| /client/workouts/[id]/complete | done — aligned to client workout completion summary.txt mockup |
| /client/goals | done — aligned to client goals.txt mockup |
| /client/habits | done — aligned to client habits.txt mockup |
| /client/nutrition | done — mockup not OK, skip alignment |
| /client/progress (Progress Hub) | done — aligned to client progress hub.txt mockup (subtitle: insights into your physical progress) |
| /client/progress/personal-records | done — aligned to client personal records.txt mockup |
| /client/progress/body-metrics | done — aligned to client body metrics.txt mockup |
| /client/progress/performance | done — aligned to client performance tests.txt mockup |
| /client/progress/* (other sub-routes) | token base applied (fc-page where present) |
| /client/challenges | done — aligned to client challenges.txt mockup |
| /client/challenges/[id] | done — aligned to client challenge details.txt mockup (share button in header added) |
| /client/progress/leaderboard | done — aligned to client leaderboards.txt mockup |
| /client/progress/analytics | done — aligned to client analitycs.txt mockup |
| /client/sessions | done — aligned to client sessions list.txt mockup (FAB Book session added) |
| /client/progress/workout-logs | done — aligned to client workout logs.txt mockup |
| /client/progress/workout-logs/[id] | done — aligned to client workout log detail.txt mockup |
| /client/programs/[id]/details | done — aligned to client program details.txt mockup |
| /client/achievements | done — aligned to client achievements.txt mockup |
| /client/clipcards | done — aligned to client clipcards.txt mockup |
| /client/scheduling | done — aligned to client scheduleing.txt mockup |
| /client/programs/* | done — only [id]/details exists; aligned to client program details.txt |
| /client/sessions | had fc-page |
| /client/scheduling | done |
| /client/clipcards | done |
| /client/profile | done — aligned to client profile.txt mockup |
| /client/nutrition/foods/create | done — aligned to client create food.txt mockup |
| /client/nutrition/foods/[id] | done — aligned to client food details.txt mockup |
| /client/nutrition/meals/[id] | done — aligned to client meal details.txt mockup |
| /client/workouts | done — aligned to client workouts.txt mockup |
| /client/progress/goals | done — aligned to client-progress-goals.txt mockup |
| /client/menu | done — aligned to client menu.txt mockup |
| /client (dashboard) | token/layout pass — no mockup |
| /client/nutrition | token/layout pass — mockup “not OK”, skip alignment |
| /coach (dashboard) | done — aligned to coach dashboard.txt |
| /coach/clients | done — aligned to coach clients list.txt |
| /coach/clients/[id] | done — aligned to coach client details.txt (max-w-6xl) |
| /coach/programs | done — aligned to coach programs list.txt (breadcrumb) |
| /coach/workouts/templates | done — aligned to coach workout templates.txt (sticky search) |
| /coach/clients/add | done — aligned to coach add new client.txt (max-w-2xl, header, glass card, sticky footer) |
| /coach/sessions | done — aligned to coach-sessions.txt (Session Management, view toggle, FAB, fc cards) |
| /coach/analytics | done — aligned to coach-analytics.txt (header, live line, Export, time-range segment) |
| /coach/profile | done — aligned to coach-profile.txt (max-w-3xl, nav, section headers) |
| /coach/workouts/templates/[id] | done — aligned to coach workout template details.txt (nav, header, stats, Workout Flow, block borders) |
| /coach/programs/[id] | done — aligned to coach-programs-id.txt (nav, hero, Assigned Clients card, Progression card, Training Schedule) |
| /coach/clipcards | done — aligned to coach clipcards.txt (Voucher Matrix header, tabs Package Types/Active Assignments, fc cards) |
| /coach/adherence | done — aligned to coach-adherance.txt (Adherence Overview header, breadcrumb, Filter/Export, max-w-4xl) |
| /coach/availability | done — aligned to coach-avalability.txt (System Config header, Session Availability title) |
| /coach/scheduling | done — aligned to coach-scheduling.txt (Schedule & Capacity header, Availability Settings, Quick Block, max-w-6xl) |
| /coach/challenges | done — aligned to coach-challenges.txt (Challenges Management header, Coach Portal, Analytics/History, Active Now, FAB) |
| /coach/challenges/[id] | done — aligned to coach-challenges-id.txt (sticky header, Challenge Detail, hero card Day X/30, rules) |
| /coach/notifications | done — aligned to coach-notifications.txt (Command Center header, Mark all read, filter tabs, max-w-2xl) |
| /coach/bulk-assignments | done — aligned to coach-bulk-assigments.txt (back, Bulk Assignment title, subtitle, max-w-3xl) |
| /coach/exercises | done — aligned to coach-exercises.txt (Exercise Archive title, Database index, FAB) |
| /coach/categories | done — aligned to coach-categories.txt (breadcrumb Coach > Management, max-w-5xl, filter pills, New Category) |
| /coach/exercise-categories | done — aligned to coach-exercise-categories.txt (Library Management, max-w-7xl, Create New Category, FAB mobile) |
| /coach/meals | done — aligned to coach-meals.txt (Nutrition Studio header) |
| /coach/nutrition | done — aligned to coach-nutrition.txt (Nutrition, Client compliance overview, search in header) |
| /coach/nutrition meal-plans tab | done — aligned to coach-nutrition-meal-plans-list.txt (Meal Plan Templates title, sticky search) |
| /coach/programs/create | done — aligned to coach create program basic info tab (breadcrumb, max-w-4xl, header) |
| /coach/workouts/templates/create | done — aligned to coach create workout template (sticky header Create Template, Builder Mode, Preview) |
| /coach/workouts/templates/[id]/edit | done — aligned to coach edit workout template (sticky nav, Edit Template, Revert, Preview) |
| /coach/nutrition/meal-plans/create | done — aligned to coach-nutrition-meal-plans-create (header back/title/more, max-w-4xl, crystal card) |
| /coach/programs/[id]/edit (Schedule tab) | done — aligned to coach create program weekly schedule tab (header, info card, fc-glass day cards, max-w-6xl) |
| /coach/programs/[id]/edit (Progression tab) | done — aligned to coach create program progression rules tab (header, max-w-4xl) |
| /coach/compliance | done — fc-glass header, token icon — no mockup |
| /coach/reports | done — fc-glass header, token icon — no mockup |
| /coach/menu | done — fc-glass header, token icon — no mockup |
| /coach/progress | done — fc-glass header card — no mockup |
| /coach/goals | done — fc-glass header, token icon — no mockup |
| /coach/achievements | done — fc-glass header, token icon — no mockup |
| /coach/gym-console | done — fc-glass header, token icon — no mockup |
| /coach/nutrition/meal-plans/[id] | done — fc-glass header, ChefHat token icon, back link to nutrition (Meal Plan detail) |
| /coach/habits | done — fc-glass header, token icon (Sparkles), Habits Management |
| /coach/nutrition/meal-plans/[id]/edit | done — fc-glass header, ChefHat token icon — no dedicated mockup |
| /coach/clients/[id]/workouts | done — fc-glass header, Dumbbell token icon — no mockup |
| /coach/clients/[id]/profile | done — fc-glass header, User token icon — no mockup |
| /coach/clients/[id]/goals | done — fc-glass header, Target token icon — no mockup |
| /coach/clients/[id]/progress | done — fc-glass header, TrendingUp token icon — no mockup |
| /coach/clients/[id]/habits | done — fc-glass header, Sparkles token icon — no mockup |
| /coach/clients/[id]/adherence | done — fc-glass header, CheckCircle token icon — no mockup |
| /coach/clients/[id]/analytics | done — fc-glass header, BarChart3 token icon — no mockup |
| /coach/clients/[id]/meals | done — fc-glass header, Utensils token icon — no mockup |
| /coach/clients/[id]/clipcards | done — fc-glass header, CreditCard token icon — no mockup |
| /coach/clients/[id]/fms | done — fc-glass header, Activity token icon — no mockup |
| /coach/clients/[id]/programs/[programId] | done — glass back link — no mockup |
| Coach screens (other) | fc-page applied |
| **Admin** | |
| /admin/goal-templates | done — fc-glass header card, Target token icon, max-w-7xl, fc-btn |
| /admin/habit-categories | done — fc-glass header card, FolderOpen token icon, max-w-7xl, fc-btn |
| /admin/achievement-templates | done — fc-glass header card, Trophy token icon, max-w-7xl, fc-btn |
| /admin/tracking-sources | done — fc-glass header card, Database token icon, max-w-7xl |
| Admin screens (other) | pending — no mockup |
| /coach/programs-workouts | done — max-w-7xl container (redirect page) |
| /client/progress/mobility | done — fc-glass header — no mockup |
| /client/progress/nutrition | done — fc-glass header — no mockup |
| /client/progress/achievements | done — fc-glass header — no mockup |
| /client/progress/analytics | done — fc-glass header card, BarChart3 token icon, glass back link |
| /client/progress/body-metrics | done — fc-glass header card, Scale token icon, glass back link |
| /client/progress/workout-logs | done — fc-glass header card, FileText token icon, glass back link |
| /client/progress/leaderboard | done — fc-glass header card, Trophy token icon, glass back link |
| /client/progress/personal-records | done — fc-glass header card, Trophy token icon, glass back link |
| /client/progress/performance | done — fc-glass header card, Timer token icon, glass back link |
| /client/progress/workout-logs/[id] | done — fc-glass header card, FileText token icon, Link back to logs |
| /client/progress/goals | done — glass back pill in nav, Target token icon (Goals & Habits) |
| /client/progress (Progress Hub) | done — fc-glass header card, Layers token icon, Settings link |
| /client/programs/[id]/details | done — fc-glass header card, BookOpen token icon, Link back to /client |
| /create-user | done — fc-glass header card, UserPlus token icon, fc tokens |
| /simple-auth | done — fc tokens in CardHeader (icon, title, description) |
| /database-status | done — fc-glass header card, Database token icon, fc tokens |
| /setup-database | done — fc-glass header card, Database token icon, fc tokens |
| Auth / shared | done (simple-auth, create-user token pass) |

## Phase 3: Modals
Done: dialog.tsx (fc-modal), ResponsiveModal, WorkoutCompletionModal, AchievementUnlockModal, SimpleModal; token text/buttons.

## Phase 4: Forms
Done: SelectTrigger (fc-select), Label (fc-text-primary); Input/Textarea already had variant fc.

## Phase 5: Icons and badges
Done: BlockTypeBadge (fc-outline, fc-text-workouts); goals page status icon (fc-text-error); badge.tsx had fc variants.

## Phase 6: Layout primitives
Done: Header, BottomNav, AppLayout already used fc-*; LoadingSkeleton uses token-based gradient; toasts use fc tokens.
