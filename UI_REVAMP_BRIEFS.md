# UI Revamp Briefs - Complete List (Reorganized by Priority)

This document contains briefs for all pages, modals, forms, tabs, and UI elements in the DailyFitness application, **organized by priority:**

1. **WORKOUT RELATED** (First Priority)
2. **MEAL PLAN/NUTRITION RELATED** (Second Priority)
3. **THE REST** (Third Priority)

Each brief includes:

- Purpose/Function
- Key Elements
- UI Style Requirements (Glass style, rounded elements, keep animated background)

## IMPORTANT RULES

**CRITICAL**: When implementing UI updates from mockups:

- **Preserve Functionality at All Costs**: Only update UI/UX - all functionality must work exactly as it does now
- **Ignore Non-Existent Elements**: If mockups contain elements that don't exist in the app, ignore them completely - do not ask, do not implement
- **No New Features**: We are NOT implementing anything new - only updating existing UI
- **Ask When Unclear**: If unclear situations arise, ask clarifying questions - do not make assumptions
- **App is Source of Truth**: The app structure and functionality are the source of truth - adapt mockups to work with existing app
- **Adapt Simpler Mockups to App Structure**: If a mockup appears "simpler" than the app's UI (e.g., mockup shows flat list but app has collapsible sections), keep the app's structure and functionality exactly as-is, and only apply the mockup's visual styling (colors, borders, backgrounds, spacing, typography, glass effects) to the existing structure
- **Light Mode Must Match Dark Mode**: Light mode UI elements must have the same transparent glass morphism style as dark mode - use transparent backgrounds (rgba with low opacity), backdrop blur, and ensure the animated background is visible through all elements
- **Reuse Updated Shared Components**: If a shared component (Button, Card, Modal, Form inputs, etc.) has already been updated with the new glass style UI, reuse that updated component everywhere - do NOT re-implement the same UI changes on each page. Check `src/components/ui/` for shared components that have been updated and use them as-is

---

## PRIORITY 1: WORKOUT RELATED

### CLIENT WORKOUT PAGES

### 1. Client Workouts List - `/client/workouts/page.tsx`

**Purpose**: Display all assigned workouts, filter by status, view workout details.

**Key Elements**:

- Workout list (assigned, upcoming, completed)
- Filter/search functionality
- Workout cards showing name, date, status, difficulty
- View details button
- Start workout button (for assigned workouts)
- Empty state when no workouts

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 2. Workout Details - `/client/workouts/[id]/details/page.tsx`

**Purpose**: View workout template details before starting (exercises, sets, reps, notes).

**Key Elements**:

- Workout name and description
- Exercise list with sets/reps/rest
- Block type indicators
- Start workout button
- Back button

**UI Requirements**: Glass style, rounded cards, animated background

---

### 3. Workout Execution (Live Workout) - `/client/workouts/[id]/start/page.tsx`

**Purpose**: Full-screen immersive workout execution interface where clients log sets.

**Key Elements**:

- Workout timer (elapsed time)
- Current block/exercise display
- Set logging inputs (weight, reps)
- Completed sets counter
- Progress indicator (blocks completed)
- Rest timer (modal/overlay)
- Next exercise button
- Complete workout button
- Block executors for each block type (straight_set, superset, giant_set, drop_set, cluster_set, rest_pause, pyramid_set, ladder, pre_exhaustion, amrap, emom, for_time, tabata, circuit)
- Video player modal (for exercise demos)
- Exercise alternatives modal
- Workout stats (total weight lifted, time, sets)

**UI Requirements**: Full-screen immersive, gradient backgrounds based on intensity, glass style input fields, rounded buttons, animated background (subtle during workout)

---

### 4. Workout Completion - `/client/workouts/[id]/complete/page.tsx`

**Purpose**: Display workout completion summary with stats and achievements.

**Key Elements**:

- Completion message
- Workout stats (total time, sets completed, weight lifted)
- Personal records achieved
- Next workout suggestion
- Back to dashboard button

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 5. Client Programs - `/client/programs/[id]/details/page.tsx`

**Purpose**: View assigned program details.

**Key Elements**:

- Program name and description
- Program schedule
- Program duration
- Weekly schedule view
- Program progress
- Assigned workouts list

**UI Requirements**: Glass style cards, rounded elements, schedule view, animated background

---

### 6. Workout Analytics - `/client/progress/analytics/page.tsx`

**Purpose**: View detailed workout analytics and statistics.

**Key Elements**:

- Workout frequency charts
- Volume trends
- Exercise frequency
- Time period filters
- Charts and graphs
- Workout log history

**UI Requirements**: Glass style cards, charts/graphs, rounded elements, animated background

---

### 7. Workout Logs - `/client/progress/workout-logs/page.tsx`

**Purpose**: View history of completed workouts.

**Key Elements**:

- Workout log list
- Date filters
- Workout details (exercises, sets, reps, weights)
- Performance comparisons
- Export/share options

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 8. Workout Log Details - `/client/progress/workout-logs/[id]/page.tsx`

**Purpose**: View detailed information about a specific completed workout.

**Key Elements**:

- Workout name and date
- Complete exercise list with logged data
- Performance metrics
- Comparison with previous attempts
- Notes/comments

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### COACH WORKOUT PAGES

### 9. Programs & Workouts Hub - `/coach/programs-workouts/page.tsx`

**Purpose**: Central hub for programs and workout templates.

**Key Elements**:

- Navigation to:
  - Workout Templates
  - Programs
  - Exercise Library
- Quick create buttons
- Recent templates/programs

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 10. Workout Templates List - `/coach/workouts/templates/page.tsx`

**Purpose**: View, create, edit, and manage workout templates.

**Key Elements**:

- Workout templates list/grid
- Template cards (name, difficulty, category, block count)
- Search/filter functionality
- Create template button
- Edit/delete buttons
- Template categories filter
- Template preview

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 11. Create Workout Template - `/coach/workouts/templates/create/page.tsx`

**Purpose**: Create a new workout template with blocks and exercises.

**Key Elements**:

- Workout template form (name, description, category, difficulty)
- Block builder interface
- Exercise selection
- Block type selector (13 types)
- Block configuration forms
- Save/cancel buttons
- Template preview

**UI Requirements**: Glass style form, rounded elements, drag-and-drop areas, animated background

---

### 12. Edit Workout Template - `/coach/workouts/templates/[id]/edit/page.tsx`

**Purpose**: Edit an existing workout template.

**Key Elements**:

- Pre-filled workout template form
- Existing blocks display
- Add/edit/delete blocks
- Exercise selection
- Save/cancel buttons
- Template preview

**UI Requirements**: Glass style form, rounded elements, animated background

---

### 13. Workout Template Details - `/coach/workouts/templates/[id]/page.tsx`

**Purpose**: View detailed information about a workout template.

**Key Elements**:

- Template name and description
- Complete block list with exercises
- Block type indicators
- Edit button
- Assign to clients button
- Template usage statistics

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 14. Programs List - `/coach/programs/page.tsx`

**Purpose**: View and manage training programs.

**Key Elements**:

- Programs list/grid
- Program cards (name, duration, difficulty)
- Create program button
- Edit/delete buttons
- Program categories
- Search/filter

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 15. Create Program - `/coach/programs/create/page.tsx`

**Purpose**: Create a new training program.

**Key Elements**:

- Program basic info form (name, description, duration, difficulty, target audience)
- Weekly schedule builder
- Template selection per day/week
- Progression rules editor
- Save/cancel buttons

**UI Requirements**: Glass style forms, rounded elements, schedule builder, animated background

---

### 16. Edit Program - `/coach/programs/[id]/edit/page.tsx`

**Purpose**: Edit an existing program.

**Key Elements**:

- Tabs:
  - Basic Info
  - Weekly Schedule
  - Progression Rules
- Pre-filled forms
- Schedule editor
- Progression rules editor
- Save/cancel buttons

**UI Requirements**: Glass style forms, rounded tabs, rounded elements, animated background

---

### 17. Program Details - `/coach/programs/[id]/page.tsx`

**Purpose**: View detailed program information.

**Key Elements**:

- Program name and description
- Program schedule display
- Progression rules overview
- Assigned clients list
- Edit button
- Assign to clients button

**UI Requirements**: Glass style cards, rounded elements, schedule view, animated background

---

### 18. Exercise Library - `/coach/exercises/page.tsx`

**Purpose**: Manage exercise database.

**Key Elements**:

- Exercises list/grid
- Exercise cards (name, category, image, video)
- Search/filter functionality
- Create exercise button
- Edit/delete buttons
- Exercise categories filter
- Exercise preview

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 19. Exercise Categories - `/coach/exercise-categories/page.tsx`

**Purpose**: Manage exercise categories.

**Key Elements**:

- Categories list
- Category cards
- Create category button
- Edit/delete buttons
- Category usage counts

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 20. Workout Categories - `/coach/categories/page.tsx`

**Purpose**: Manage workout template and program categories.

**Key Elements**:

- Categories list
- Category cards
- Create category button
- Edit/delete buttons
- Category usage counts

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 21. Client Workouts (Coach View) - `/coach/clients/[id]/workouts/page.tsx`

**Purpose**: View and manage workouts assigned to a specific client.

**Key Elements**:

- Assigned workouts list
- Workout assignment button
- Workout status indicators
- Workout completion history
- Performance metrics
- Bulk assignment option

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 22. Bulk Assignments - `/coach/bulk-assignments/page.tsx`

**Purpose**: Assign workouts/programs to multiple clients at once.

**Key Elements**:

- Client selection (multi-select)
- Workout/program selector
- Assignment date settings
- Bulk assignment form
- Preview assignments
- Execute button

**UI Requirements**: Glass style form, rounded elements, animated background

---

### WORKOUT MODALS

### 23. Workout Assignment Modal

**Purpose**: Assign workout templates to clients.

**Key Elements**:

- Client selector (single or multi-select)
- Workout template selector
- Assignment date picker
- Save/cancel buttons

**UI Requirements**: Glass style modal, rounded corners, backdrop blur, animated background visible through backdrop

---

### 24. Workout Detail Modal

**Purpose**: Quick preview of workout template details.

**Key Elements**:

- Workout name and description
- Exercise list preview
- Start/assign buttons
- Close button

**UI Requirements**: Glass style modal, rounded corners, animated background

---

### 25. Program Detail Modal

**Purpose**: Quick preview of program details.

**Key Elements**:

- Program name and description
- Schedule overview
- Assign button
- Close button

**UI Requirements**: Glass style modal, rounded corners, animated background

---

### 26. Program Details Modal (Coach)

**Purpose**: Detailed program view in modal.

**Key Elements**:

- Complete program information
- Schedule details
- Progression rules
- Assign/edit buttons

**UI Requirements**: Glass style modal, rounded corners, animated background

---

### 27. Workout Completion Modal

**Purpose**: Display workout completion summary.

**Key Elements**:

- Completion message
- Workout stats
- Achievements unlocked
- Next workout suggestion
- Close/done button

**UI Requirements**: Glass style modal, rounded corners, celebration effects, animated background

---

### 28. Rest Timer Modal

**Purpose**: Display rest timer during workout.

**Key Elements**:

- Countdown timer (circular progress)
- Time remaining
- Skip rest button
- Exercise name (next exercise)

**UI Requirements**: Glass style modal, circular progress indicator, rounded elements, animated background

---

### 29. Exercise Alternatives Modal

**Purpose**: Show alternative exercises.

**Key Elements**:

- Alternative exercises list
- Exercise cards with images
- Select alternative button
- Close button

**UI Requirements**: Glass style modal, rounded cards, animated background

---

### 30. Video Player Modal

**Purpose**: Play exercise demonstration videos.

**Key Elements**:

- Video player
- Exercise name
- Video controls
- Close button

**UI Requirements**: Glass style modal, rounded video player, animated background

---

### 31. Tabata Circuit Timer Modal

**Purpose**: Timer for Tabata/circuit workouts.

**Key Elements**:

- Countdown timer
- Round counter
- Exercise name
- Rest/work indicator
- Skip/pause buttons

**UI Requirements**: Glass style modal, circular timer, rounded elements, animated background

---

### WORKOUT FORMS

### 32. Workout Template Form

**Purpose**: Create/edit workout templates (can be modal or page).

**Key Elements**:

- Workout basic info (name, description, category, difficulty)
- Block builder interface
- Block type selector
- Exercise selection
- Block configuration (sets, reps, rest, etc.)
- Block ordering (drag and drop)
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded inputs, drag-and-drop areas, animated background

---

### 33. Exercise Form

**Purpose**: Create/edit exercises.

**Key Elements**:

- Exercise name
- Exercise category
- Muscle groups
- Equipment
- Instructions/notes
- Image upload
- Video URL
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded inputs, file upload areas, animated background

---

### 34. Exercise Category Form

**Purpose**: Create/edit exercise categories.

**Key Elements**:

- Category name
- Category description
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded inputs, animated background

---

### 35. Category Form (Workout Categories)

**Purpose**: Create/edit workout/program categories.

**Key Elements**:

- Category name
- Category description
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded inputs, animated background

---

### 36. Set Logging Form

**Purpose**: Log sets during workout (embedded in workout execution).

**Key Elements**:

- Weight input
- Reps input
- RIR input (optional)
- Notes (optional)
- Log set button

**UI Requirements**: Glass style inputs, rounded corners, large touch targets, animated background

---

### 37. Exercise Set Form

**Purpose**: Configure exercise sets in workout builder.

**Key Elements**:

- Sets input
- Reps input
- Rest seconds input
- Weight input
- RIR input
- Tempo input
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded inputs, animated background

---

### 38. Exercise Detail Form

**Purpose**: Detailed exercise configuration in workout builder.

**Key Elements**:

- Exercise selector
- Sets/reps/rest inputs
- Advanced options (RIR, tempo, load percentage)
- Notes
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded inputs, animated background

---

### WORKOUT TABS

### 39. Program Edit Tabs

**Location**: `/coach/programs/[id]/edit/page.tsx`
**Tabs**:

- Basic Info
- Weekly Schedule
- Progression Rules

**UI Requirements**: Glass style tabs, rounded tab buttons, animated background

---

### WORKOUT SPECIAL COMPONENTS

### 40. Workout Block Executors (13 Types)

**Purpose**: Execute different workout block types during live workout.

**Block Types**:

1. Straight Set Executor
2. Superset Executor
3. Giant Set Executor
4. Drop Set Executor
5. Cluster Set Executor
6. Rest Pause Executor
7. Pyramid Set Executor
8. Ladder Executor
9. Pre Exhaustion Executor
10. AMRAP Executor
11. EMOM Executor
12. For Time Executor
13. Tabata Executor

**Key Elements** (each):

- Block details display (sets, reps, rest)
- Set logging inputs
- Progress indicators
- Completed sets display
- Next set/block buttons
- Timer integration

**UI Requirements**: Full-screen or large card format, glass style inputs, rounded elements, clear visual hierarchy, animated background (subtle)

---

### 41. Plate Calculator Widget

**Purpose**: Calculate plate loading for barbells.

**Key Elements**:

- Weight input
- Unit selector (kg/lbs)
- Plate breakdown display
- Visual plate representation
- Clear button

**UI Requirements**: Glass style widget, rounded elements, animated background

---

### 42. Timer Settings

**Purpose**: Configure workout timers.

**Key Elements**:

- Timer duration settings
- Rest timer settings
- Sound settings
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded inputs, animated background

---

## PRIORITY 2: MEAL PLAN/NUTRITION RELATED

### CLIENT NUTRITION PAGES

### 43. Client Nutrition - `/client/nutrition/page.tsx`

**Purpose**: View assigned meal plans, log meals, track daily nutrition.

**Key Elements**:

- Daily nutrition summary (calories, macros, water)
- Meal plan display (breakfast, lunch, dinner, snacks)
- Meal logging interface
- Food search/selection
- Macro breakdown charts/rings
- Water intake tracker
- Daily progress indicators
- Meal photo upload (1 per day)

**UI Requirements**: Glass style cards, nutrition rings/bars, rounded elements, animated background

---

### 44. Create Custom Food - `/client/nutrition/foods/create/page.tsx`

**Purpose**: Allow clients to create custom food entries with nutritional information.

**Key Elements**:

- Food name input
- Nutritional information inputs (calories, protein, carbs, fats, fiber, etc.)
- Serving size inputs
- Save button
- Cancel button

**UI Requirements**: Glass style form, rounded inputs, animated background

---

### 45. Food Details - `/client/nutrition/foods/[id]/page.tsx`

**Purpose**: View detailed information about a specific food item.

**Key Elements**:

- Food name and image (if available)
- Nutritional breakdown
- Serving size information
- Add to meal button
- Edit button (if user's custom food)

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 46. Create Meal - `/client/nutrition/meals/[id]/page.tsx` (if exists)

**Purpose**: Create or edit a custom meal with multiple foods.

**Key Elements**:

- Meal name input
- Food search/selection
- Quantity inputs for each food
- Nutritional totals
- Save button

**UI Requirements**: Glass style form, rounded elements, animated background

---

### 47. Meal Details - `/client/nutrition/meals/[id]/page.tsx`

**Purpose**: View details of a specific meal.

**Key Elements**:

- Meal name and description
- Foods included with quantities
- Nutritional breakdown
- Edit button (if user's meal)

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### COACH NUTRITION PAGES

### 48. Coach Nutrition - `/coach/nutrition/page.tsx`

**Purpose**: Manage meal plans and food database.

**Key Elements**:

- Tabs:
  - Meal Plans
  - Food Database
  - Assignments
- Meal plans list
- Create meal plan button
- Food database interface
- Meal plan assignments overview

**UI Requirements**: Glass style cards, rounded tabs, rounded elements, animated background

---

### 49. Meal Plans List - `/coach/nutrition/meal-plans/page.tsx`

**Purpose**: View and manage meal plans.

**Key Elements**:

- Meal plans list
- Meal plan cards
- Create meal plan button
- Edit/delete buttons
- Meal plan details preview

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 50. Create Meal Plan - `/coach/nutrition/meal-plans/create/page.tsx`

**Purpose**: Create a new meal plan.

**Key Elements**:

- Meal plan form (name, description, calories, macros)
- Meal builder (breakfast, lunch, dinner, snacks)
- Food selection interface
- Nutritional totals
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded elements, animated background

---

### 51. Edit Meal Plan - `/coach/nutrition/meal-plans/[id]/edit/page.tsx`

**Purpose**: Edit an existing meal plan.

**Key Elements**:

- Pre-filled meal plan form
- Existing meals display
- Add/edit/delete meals
- Food selection
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded elements, animated background

---

### 52. Meal Plan Details - `/coach/nutrition/meal-plans/[id]/page.tsx`

**Purpose**: View detailed meal plan information.

**Key Elements**:

- Meal plan name and description
- Complete meal breakdown
- Nutritional information
- Edit button
- Assign to clients button

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 53. Coach Meals - `/coach/meals/page.tsx`

**Purpose**: Manage meals and food database (alternative nutrition page).

**Key Elements**:

- Tabs:
  - Meal Plans
  - Foods
  - Assignments
- Meal plans management
- Food database management
- Assignment interface

**UI Requirements**: Glass style cards, rounded tabs, rounded elements, animated background

---

### 54. Client Nutrition (Coach View) - `/coach/clients/[id]/meals/page.tsx`

**Purpose**: View client's nutrition and assign meal plans.

**Key Elements**:

- Client's current meal plan
- Meal plan assignment interface
- Nutrition tracking overview
- Meal logging history
- Assign meal plan button

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### NUTRITION MODALS

### 55. Meal Plan Assignment Modal

**Purpose**: Assign meal plans to clients.

**Key Elements**:

- Client selector
- Meal plan selector
- Start date picker
- Save/cancel buttons

**UI Requirements**: Glass style modal, rounded elements, animated background

---

### NUTRITION FORMS

### 56. Meal Form

**Purpose**: Create/edit meals.

**Key Elements**:

- Meal name
- Meal type (breakfast, lunch, dinner, snack)
- Food selection
- Food quantities
- Nutritional totals
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded inputs, animated background

---

### NUTRITION TABS

### 57. Coach Meals/Nutrition Tabs

**Location**: `/coach/meals/page.tsx` and `/coach/nutrition/page.tsx`
**Tabs**:

- Meal Plans
- Foods/Food Database
- Assignments

**UI Requirements**: Glass style tabs, rounded tab buttons, animated background

---

## PRIORITY 3: THE REST

### CLIENT PAGES (Non-Workout, Non-Nutrition)

### 58. Client Dashboard (Home) - `/client/page.tsx`

**Purpose**: Main landing page for clients showing overview, today's workout, stats, and quick actions.

**Key Elements**:

- Time-based greeting (Good morning/afternoon/evening)
- User avatar/name
- Today's workout card (with start button)
- Stats cards (streak, weekly progress, weekly volume, weekly time, PRs count)
- Body weight display with change indicator
- Max deadlift PR with change indicator
- Quick action buttons (Workouts, Nutrition, Progress, Profile, WhatsApp CTA if in_gym client)
- Next session card (for in_gym clients)
- Recent activity section
- Weekly progress visualization

**UI Requirements**: Glass style cards, rounded corners, animated background must stay

---

### 59. Client Progress Hub - `/client/progress/page.tsx`

**Purpose**: Central hub for all progress tracking features.

**Key Elements**:

- Progress stats overview (weekly workouts, streak, PRs, achievements)
- Navigation cards to sub-pages:
  - Body Metrics
  - Mobility Metrics
  - Personal Records
  - Achievements
  - Goals & Habits
- In-page components:
  - Check-Ins
  - Workout Analytics
  - Lifestyle Analytics
  - Community Leaderboard
- Weekly progress ring visualization
- Quick stats cards

**UI Requirements**: Glass style cards, rounded elements, progress rings, animated background

---

### 60. Body Metrics - `/client/progress/body-metrics/page.tsx`

**Purpose**: Track and view body measurements over time.

**Key Elements**:

- Measurement input form (weight, body fat, muscle mass, measurements)
- Measurement history chart/graph
- Current measurements display
- Add measurement button
- Measurement trends (weight change, etc.)
- Monthly tracking visualization

**UI Requirements**: Glass style form and cards, rounded inputs, charts, animated background

---

### 61. Mobility Metrics - `/client/progress/mobility/page.tsx`

**Purpose**: Track flexibility tests and FMS assessments.

**Key Elements**:

- Mobility test input forms
- Test history
- FMS assessment results
- Flexibility scores
- Charts/graphs showing progress
- Add test button

**UI Requirements**: Glass style forms, rounded elements, charts, animated background

---

### 62. Personal Records - `/client/progress/personal-records/page.tsx`

**Purpose**: View and track personal records (1RM, 3RM, 5RM, bodyweight multiples).

**Key Elements**:

- PR list organized by exercise
- PR type indicators (1RM, 3RM, 5RM, BW multiple)
- PR history
- Leaderboard rankings (if public)
- Filter by exercise
- Add PR button (if manual entry allowed)

**UI Requirements**: Glass style cards, rounded elements, PR badges, animated background

---

### 63. Achievements - `/client/progress/achievements/page.tsx`

**Purpose**: Display unlocked and in-progress achievements.

**Key Elements**:

- Achievement cards (unlocked and locked states)
- Achievement categories
- Progress indicators for in-progress achievements
- Unlock dates
- Achievement descriptions
- Filter by category
- Trophy/medal icons

**UI Requirements**: Glass style cards with gradient effects, rounded elements, achievement badges, animated background

---

### 64. Goals & Habits - `/client/progress/goals/page.tsx`

**Purpose**: View and manage goals and habits.

**Key Elements**:

- Active goals list
- Goal progress indicators
- Habits list with tracking
- Habit streak counters
- Add goal button
- Add habit button
- Goal completion status
- Habit completion calendar/view

**UI Requirements**: Glass style cards, progress bars/rings, rounded elements, animated background

---

### 65. Performance Tests - `/client/progress/performance/page.tsx`

**Purpose**: Track performance tests (1km run, step test).

**Key Elements**:

- Test input forms
- Test history
- Performance charts
- Add test button
- Test type selector

**UI Requirements**: Glass style forms, rounded elements, charts, animated background

---

### 66. Client Goals - `/client/goals/page.tsx`

**Purpose**: Manage personal goals (separate from progress/goals).

**Key Elements**:

- Goals list (active, completed, archived)
- Goal creation form
- Goal progress tracking
- Goal categories
- Due dates
- Add goal button
- Edit/delete goal buttons

**UI Requirements**: Glass style cards and forms, rounded elements, progress indicators, animated background

---

### 67. Client Habits - `/client/habits/page.tsx`

**Purpose**: Track daily habits and build streaks.

**Key Elements**:

- Habits list
- Habit completion checkboxes/buttons
- Streak counters
- Habit calendar view
- Add habit button
- Habit analytics
- Streak visualization

**UI Requirements**: Glass style cards, rounded elements, habit checkboxes, streak indicators, animated background

---

### 68. Client Challenges - `/client/challenges/page.tsx`

**Purpose**: View and participate in challenges.

**Key Elements**:

- Active challenges list
- Challenge details (rules, prizes, duration)
- Leaderboard
- Progress tracking
- Join/leave challenge buttons
- Challenge categories

**UI Requirements**: Glass style cards, rounded elements, leaderboard tables, animated background

---

### 69. Challenge Details - `/client/challenges/[id]/page.tsx`

**Purpose**: View detailed information about a specific challenge.

**Key Elements**:

- Challenge name and description
- Rules and requirements
- Leaderboard
- User's current ranking
- Progress indicators
- Join/leave button

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 70. Client Sessions - `/client/sessions/page.tsx`

**Purpose**: View and manage training sessions (for in_gym clients).

**Key Elements**:

- Upcoming sessions list
- Session calendar view
- Session details (time, duration, coach)
- Cancel session button
- Book session button
- Session history

**UI Requirements**: Glass style cards, calendar component, rounded elements, animated background

---

### 71. Client Scheduling - `/client/scheduling/page.tsx`

**Purpose**: Book training sessions with coach (for in_gym clients).

**Key Elements**:

- Coach availability calendar
- Time slot selection
- Session booking form
- Booked sessions display
- Cancel booking button

**UI Requirements**: Glass style form and cards, calendar, rounded elements, animated background

---

### 72. Client Clipcards - `/client/clipcards/page.tsx`

**Purpose**: View and manage session clipcards/packages (for in_gym clients).

**Key Elements**:

- Clipcard list (active, expired, used)
- Remaining sessions counter
- Purchase clipcard button
- Clipcard history

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 73. Client Profile - `/client/profile/page.tsx`

**Purpose**: View and edit user profile information.

**Key Elements**:

- Profile picture/avatar
- Personal information (name, email, phone)
- Bio/about section
- Settings
- Edit profile button
- Logout button
- Account settings
- Privacy settings
- Notification preferences

**UI Requirements**: Glass style cards, rounded elements, profile image, animated background

---

### 74. Client Achievements (separate page) - `/client/achievements/page.tsx`

**Purpose**: Dedicated achievements page (if separate from progress/achievements).

**Key Elements**:

- All achievements grid
- Unlocked achievements
- In-progress achievements
- Locked achievements
- Achievement categories
- Filter/search

**UI Requirements**: Glass style cards, rounded elements, achievement badges, animated background

---

### COACH PAGES (Non-Workout, Non-Nutrition)

### 75. Coach Dashboard - `/coach/page.tsx`

**Purpose**: Main dashboard showing overview, client stats, quick actions.

**Key Elements**:

- Greeting and stats summary
- Active clients count
- Recent activity
- Quick actions (add client, create workout, create meal plan)
- Upcoming sessions
- Client compliance overview
- Today's schedule

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 76. Coach Menu - `/coach/menu/page.tsx`

**Purpose**: Central menu/hub with links to all coach features.

**Key Elements**:

- Menu grid with feature cards:
  - Client Management
  - Programs & Workouts
  - Exercise Library
  - Exercise Categories
  - Workout Categories
  - Nutrition Management
  - Analytics & Reports
  - Client Progress
  - Goals & Habits
  - Session Management
  - Challenges
  - Availability Settings
  - Coach Profile
- Quick actions section
- Feature icons and descriptions

**UI Requirements**: Glass style cards in grid layout, rounded corners, hover effects, animated background

---

### 77. Coach Clients List - `/coach/clients/page.tsx`

**Purpose**: View and manage all clients.

**Key Elements**:

- Clients list/grid
- Client cards (name, avatar, status, type)
- Search/filter functionality
- Add client button
- Client status indicators (online/in_gym)
- Quick actions (view, edit, assign workout)
- Client statistics overview

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 78. Add Client - `/coach/clients/add/page.tsx`

**Purpose**: Add a new client to the system.

**Key Elements**:

- Client information form (name, email, phone, type)
- Client type selector (online/in_gym)
- Initial settings
- Save button
- Cancel button

**UI Requirements**: Glass style form, rounded inputs, animated background

---

### 79. Client Detail View - `/coach/clients/[id]/page.tsx`

**Purpose**: Comprehensive view of a single client with tabs.

**Key Elements**:

- Client header (name, avatar, status, type)
- Tab navigation:
  - Overview tab
  - Workouts tab
  - Nutrition tab
  - Progress tab
- Quick actions (assign workout, create meal plan, FMS assessment)
- Client stats cards
- Recent activity
- Compliance indicators

**UI Requirements**: Glass style cards, rounded tabs, tab content areas, animated background

---

### 80. Client Profile (Coach View) - `/coach/clients/[id]/profile/page.tsx`

**Purpose**: View and edit client profile information.

**Key Elements**:

- Client information display
- Edit profile form
- Client settings
- Contact information
- Client type settings
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded elements, animated background

---

### 81. Client Progress (Coach View) - `/coach/clients/[id]/progress/page.tsx`

**Purpose**: View comprehensive client progress data.

**Key Elements**:

- Progress metrics overview
- Body metrics charts
- Workout analytics
- Achievement progress
- Goals and habits status
- Progress reports

**UI Requirements**: Glass style cards, charts/graphs, rounded elements, animated background

---

### 82. Client Goals (Coach View) - `/coach/clients/[id]/goals/page.tsx`

**Purpose**: View and manage client goals.

**Key Elements**:

- Client's goals list
- Goal creation/editing
- Goal progress tracking
- Add goal button
- Goal categories

**UI Requirements**: Glass style cards and forms, rounded elements, animated background

---

### 83. Client Habits (Coach View) - `/coach/clients/[id]/habits/page.tsx`

**Purpose**: View and manage client habits.

**Key Elements**:

- Client's habits list
- Habit assignment interface
- Habit completion tracking
- Habit analytics
- Assign habit button

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 84. Client Clipcards (Coach View) - `/coach/clients/[id]/clipcards/page.tsx`

**Purpose**: Manage client's clipcard packages.

**Key Elements**:

- Client's clipcards list
- Remaining sessions
- Purchase history
- Add clipcard button

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 85. Client Adherence (Coach View) - `/coach/clients/[id]/adherence/page.tsx`

**Purpose**: View client's adherence to workouts and nutrition.

**Key Elements**:

- Adherence metrics
- Compliance charts
- Workout completion rates
- Nutrition adherence
- Time period filters

**UI Requirements**: Glass style cards, charts, rounded elements, animated background

---

### 86. Client Analytics (Coach View) - `/coach/clients/[id]/analytics/page.tsx`

**Purpose**: Detailed analytics for a specific client.

**Key Elements**:

- Performance analytics
- Progress charts
- Workout volume trends
- Exercise frequency
- Time period filters
- Export reports

**UI Requirements**: Glass style cards, charts/graphs, rounded elements, animated background

---

### 87. FMS Assessment - `/coach/clients/[id]/fms/page.tsx`

**Purpose**: Conduct and view Functional Movement Screen assessments.

**Key Elements**:

- FMS test forms (7 tests)
- Scoring inputs
- Assessment history
- Save assessment button
- Test descriptions/instructions
- Results display

**UI Requirements**: Glass style forms, rounded elements, animated background

---

### 88. Coach Analytics - `/coach/analytics/page.tsx`

**Purpose**: View comprehensive analytics across all clients.

**Key Elements**:

- Tabs:
  - Overview
  - Client Progress
  - Compliance
  - Reports
- Analytics charts and graphs
- Client comparison tools
- Time period filters
- Export reports

**UI Requirements**: Glass style cards, charts/graphs, rounded tabs, rounded elements, animated background

---

### 89. Coach Progress - `/coach/progress/page.tsx`

**Purpose**: View progress tracking across all clients.

**Key Elements**:

- Client progress overview
- Progress metrics
- Charts and graphs
- Client selection/filter
- Progress reports

**UI Requirements**: Glass style cards, charts, rounded elements, animated background

---

### 90. Coach Goals - `/coach/goals/page.tsx`

**Purpose**: Manage goals library and client goal assignments.

**Key Elements**:

- Goals library
- Goal templates
- Create goal button
- Goal assignment interface
- Client goals overview
- Goal analytics

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 91. Coach Habits - `/coach/habits/page.tsx`

**Purpose**: Manage habits library and client habit assignments.

**Key Elements**:

- Tabs:
  - Habit Library
  - Create Habit
  - Assign to Clients
  - Progress Tracking
- Habits library
- Habit creation form
- Client assignment interface
- Habit analytics

**UI Requirements**: Glass style cards and forms, rounded tabs, rounded elements, animated background

---

### 92. Coach Sessions - `/coach/sessions/page.tsx`

**Purpose**: Manage training sessions and schedule.

**Key Elements**:

- Sessions calendar/view
- Upcoming sessions list
- Session details
- Client information
- Session status management
- Create session button
- Session history

**UI Requirements**: Glass style cards, calendar component, rounded elements, animated background

---

### 93. Coach Scheduling - `/coach/scheduling/page.tsx`

**Purpose**: Manage schedule and availability.

**Key Elements**:

- Schedule calendar
- Availability settings
- Session management
- Time slot management
- Client bookings view

**UI Requirements**: Glass style cards, calendar, rounded elements, animated background

---

### 94. Coach Availability - `/coach/availability/page.tsx`

**Purpose**: Set availability for client session bookings.

**Key Elements**:

- Availability calendar
- Time slot configuration
- Recurring availability settings
- Save availability button
- Availability rules

**UI Requirements**: Glass style form, calendar, rounded elements, animated background

---

### 95. Coach Clipcards - `/coach/clipcards/page.tsx`

**Purpose**: Manage clipcard packages and client purchases.

**Key Elements**:

- Clipcards list
- Create clipcard package button
- Client purchases
- Remaining sessions tracking
- Clipcard management

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 96. Coach Challenges - `/coach/challenges/page.tsx`

**Purpose**: Create and manage challenges.

**Key Elements**:

- Challenges list
- Create challenge button
- Challenge details (rules, duration, prizes)
- Leaderboard management
- Challenge analytics

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 97. Challenge Details (Coach) - `/coach/challenges/[id]/page.tsx`

**Purpose**: View and manage a specific challenge.

**Key Elements**:

- Challenge details
- Leaderboard
- Participant management
- Challenge settings
- Edit challenge button

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 98. Coach Achievements - `/coach/achievements/page.tsx`

**Purpose**: Manage achievement templates and system.

**Key Elements**:

- Achievement templates list
- Create achievement button
- Achievement configuration
- Achievement categories
- Edit/delete buttons

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 99. Coach Compliance - `/coach/compliance/page.tsx`

**Purpose**: View client compliance metrics.

**Key Elements**:

- Compliance dashboard
- Client compliance scores
- Compliance charts
- Time period filters
- Compliance details

**UI Requirements**: Glass style cards, charts, rounded elements, animated background

---

### 100. Coach Adherence - `/coach/adherence/page.tsx`

**Purpose**: View client adherence tracking.

**Key Elements**:

- Adherence dashboard
- Client adherence metrics
- Adherence charts
- Filter options

**UI Requirements**: Glass style cards, charts, rounded elements, animated background

---

### 101. Coach Reports - `/coach/reports/page.tsx`

**Purpose**: Generate and view reports.

**Key Elements**:

- Report templates
- Report generator
- Client selection
- Report parameters
- Generate report button
- Report preview
- Export options

**UI Requirements**: Glass style cards and forms, rounded elements, animated background

---

### 102. Coach Notifications - `/coach/notifications/page.tsx`

**Purpose**: View and manage notifications.

**Key Elements**:

- Notifications list
- Notification filters
- Mark as read/unread
- Notification settings
- Clear all button

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 103. Coach Profile - `/coach/profile/page.tsx`

**Purpose**: View and edit coach profile.

**Key Elements**:

- Profile information
- Profile picture/avatar
- Contact information
- Bio/about section
- Settings
- Edit profile button
- Account settings

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### OTHER MODALS

### 104. Achievement Unlock Modal

**Purpose**: Celebrate achievement unlocks.

**Key Elements**:

- Achievement name and icon
- Unlock message
- Achievement description
- Close button
- Celebration animation

**UI Requirements**: Glass style modal, gradient effects, rounded corners, celebration animations, animated background

---

### 105. Client Detail Modal

**Purpose**: Quick client overview in modal.

**Key Elements**:

- Client information
- Quick stats
- Quick actions
- Close button

**UI Requirements**: Glass style modal, rounded corners, animated background

---

### 106. Log Measurement Modal

**Purpose**: Log body measurements.

**Key Elements**:

- Measurement form (weight, body fat, measurements)
- Date picker
- Save/cancel buttons

**UI Requirements**: Glass style modal, rounded form inputs, animated background

---

### 107. Log Performance Test Modal

**Purpose**: Log performance test results.

**Key Elements**:

- Test type selector
- Test results form
- Date picker
- Save/cancel buttons

**UI Requirements**: Glass style modal, rounded form inputs, animated background

---

### 108. Simple Modal (Generic)

**Purpose**: Generic modal component for various uses.

**Key Elements**:

- Title
- Content area
- Footer (buttons)
- Close button
- Variants (success, error, warning, info)

**UI Requirements**: Glass style, rounded corners, animated background

---

### 109. Responsive Modal (Generic)

**Purpose**: Responsive modal for larger content.

**Key Elements**:

- Header with title/subtitle
- Scrollable content
- Footer actions
- Close button
- Responsive sizing

**UI Requirements**: Glass style, rounded corners, animated background

---

### OTHER FORMS

### 110. Custom Goal Form

**Purpose**: Create custom goals.

**Key Elements**:

- Goal name
- Goal description
- Goal type
- Target value
- Due date
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded inputs, animated background

---

### 111. Mobility Form Fields

**Purpose**: Input fields for mobility tests.

**Key Elements**:

- Test type selector
- Measurement inputs
- Score inputs
- Date picker
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded inputs, animated background

---

### 112. Habit Manager Form

**Purpose**: Create/edit habits.

**Key Elements**:

- Habit name
- Habit description
- Frequency settings
- Reminder settings
- Category
- Save/cancel buttons

**UI Requirements**: Glass style form, rounded inputs, animated background

---

### OTHER TABS

### 113. Client Progress Page Tabs

**Location**: `/client/progress/page.tsx`
**Tabs**:

- Check-Ins (in-page component)
- Workout Analytics (in-page component)
- Lifestyle Analytics (in-page component)
- Community Leaderboard (in-page component)

**UI Requirements**: Glass style tabs, rounded tab buttons, smooth transitions, animated background

---

### 114. Coach Client Detail Tabs

**Location**: `/coach/clients/[id]/page.tsx`
**Tabs**:

- Overview
- Workouts
- Nutrition
- Progress

**UI Requirements**: Glass style tabs, rounded tab buttons, tab content areas, animated background

---

### 115. Coach Habits Tabs

**Location**: `/coach/habits/page.tsx`
**Tabs**:

- Habit Library
- Create Habit
- Assign to Clients
- Progress Tracking

**UI Requirements**: Glass style tabs, rounded tab buttons, animated background

---

### 116. Coach Analytics Tabs

**Location**: `/coach/analytics/page.tsx`
**Tabs**:

- Overview
- Client Progress
- Compliance
- Reports

**UI Requirements**: Glass style tabs, rounded tab buttons, animated background

---

### OTHER SPECIAL COMPONENTS

### 117. Bottom Navigation

**Purpose**: Main navigation bar at bottom of screen.

**Key Elements**:

- Client nav items: Home, Workouts, Nutrition, Progress, Profile
- Coach nav items: Dashboard, Workouts, Programs, Nutrition, Menu
- Active state indicators
- Icons and labels

**UI Requirements**: Glass style (backdrop blur), rounded corners, smooth transitions, elevated design

---

### 118. Progress Charts/Graphs

**Purpose**: Visualize progress data.

**Key Elements**:

- Various chart types (line, bar, pie, ring)
- Time period filters
- Data points
- Trend indicators

**UI Requirements**: Glass style chart containers, rounded corners, animated transitions, animated background

---

### 119. Leaderboard Components

**Purpose**: Display rankings and competitions.

**Key Elements**:

- Rank list
- User cards with stats
- Filter options
- Privacy indicators

**UI Requirements**: Glass style cards, rounded elements, animated background

---

### 120. Achievement Cards

**Purpose**: Display achievement information.

**Key Elements**:

- Achievement icon/badge
- Achievement name
- Description
- Progress indicator (for in-progress)
- Unlock date (for unlocked)

**UI Requirements**: Glass style cards with gradients, rounded corners, badge effects, animated background

---

## NOTES

### UI Style Requirements

- **Animated Background**: Must be preserved on ALL pages and components
- **Glass Style**: All cards, modals, forms should use glass morphism (backdrop blur, transparency)
- **Rounded Elements**: All buttons, inputs, cards should have rounded corners (typically 12px-24px radius)
- **User-Friendly**: Large touch targets, clear hierarchy, smooth animations
- **Responsive**: All components must work on mobile and desktop
- **Accessibility**: Maintain proper contrast, focus states, ARIA labels

### Implementation Rules

- **Preserve Functionality**: Functionality must be preserved at all costs - UI changes only
- **No New Features**: If mockups contain elements that don't exist in the app, ignore them completely - do not ask about them, do not implement them
- **Existing UI Only**: Only update existing UI elements - we are not implementing anything new
- **Unclear Situations**: If unclear situations arise, ask clarifying questions - do not make assumptions
- **Mockup to App**: The app is the source of truth - everything from the mockup must be adapted to work with the existing app structure and functionality
- **Adapt Simpler Mockups**: When mockups appear "simpler" than the app's UI (e.g., flat list vs collapsible sections), keep the app's structure and only apply the mockup's visual styling to the existing structure
- **Light Mode Glass Effect**: Light mode must match dark mode - use transparent backgrounds (rgba with low opacity like 0.4 for white in light mode), backdrop blur, transparent borders, and ensure animated background is visible through all elements
- **Reuse Shared Components**: Before updating any element, check if it's a shared component from `src/components/ui/` (Button, Card, Modal, Input, Form, etc.). If a shared component has already been updated with the new glass style UI, reuse that updated component everywhere - do NOT duplicate UI work by re-implementing the same changes on each page that uses it

---

## SUMMARY

**Total Items to Revamp: 120 UI Elements**

**Priority Breakdown**:

- **Priority 1 (Workout Related)**: 42 items (1-42)
- **Priority 2 (Meal Plan/Nutrition Related)**: 15 items (43-57)
- **Priority 3 (The Rest)**: 63 items (58-120)

**Execution Order**:

1. Complete all workout-related items first (1-42)
2. Then complete all meal plan/nutrition-related items (43-57)
3. Finally complete all remaining items (58-120)

Each element will receive a mockup from Google Studios Flash UI tool, and then be updated to match while preserving all functionality.
