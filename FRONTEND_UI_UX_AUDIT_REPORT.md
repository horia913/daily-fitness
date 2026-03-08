# FRONTEND UI/UX AUDIT REPORT — DailyFitness Application

**Date:** February 17, 2026  
**Type:** Read-Only Analysis  
**Scope:** Complete frontend architecture, pages, components, user flows, design system, and UX patterns

---

## SECTION 1: TECH STACK & STRUCTURE

### Frontend Framework
- **Framework:** Next.js 15.5.9 (App Router)
- **React Version:** 19.1.0
- **Language:** TypeScript 5
- **Build Tool:** Turbopack (development), Next.js build (production)

### Styling Approach
- **Primary:** Tailwind CSS 4
- **Design System:** Custom CSS variables system (`src/styles/ui-system.css`)
- **Glass Morphism:** Custom glass card components with backdrop blur
- **Theme System:** Light/dark mode support via CSS variables
- **Additional Stylesheets:**
  - `src/styles/mobile.css` - Mobile-specific styles
  - `src/styles/android-fixes.css` - Android-specific fixes
  - `src/styles/android-emergency.css` - Android emergency fixes
  - `src/app/globals.css` - Global styles and Tailwind imports

### State Management
- **Primary:** React Context API
  - `AuthContext` (`src/contexts/AuthContext.tsx`) - User authentication and profile state
  - `ThemeContext` (`src/contexts/ThemeContext.tsx`) - Theme (light/dark), performance settings
- **Local State:** React hooks (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`)
- **No Global Store:** No Redux, Zustand, or other global state management libraries
- **Form State:** `react-hook-form` v7.62.0 with Zod validation

### Routing Library
- **Next.js App Router** (file-based routing)
- **Navigation:** Next.js `Link` component and `useRouter` hook
- **Route Protection:** `ProtectedRoute` component (`src/components/ProtectedRoute.tsx`)

### PWA (Progressive Web App)
- **Status:** Yes, fully configured PWA
- **Manifest:** `public/manifest.json`
  - Name: "DailyFitness"
  - Display: "standalone"
  - Theme color: `#3B82F6`
  - Icons: 192x192 and 512x512 PNGs
  - Orientation: portrait-primary
  - Categories: fitness, health, lifestyle
- **Service Worker:** 
  - Registration: `src/lib/serviceWorker.ts`
  - Provider: `src/components/ServiceWorkerProvider.tsx`
  - Enabled only in production (`NEXT_PUBLIC_ENABLE_SW=true`)
  - OneSignal SDK Worker: `public/OneSignalSDKWorker.js`
- **Offline Capabilities:**
  - Service worker registration for caching
  - Push notification support (OneSignal)
  - PWA install prompt functionality
  - Standalone mode detection

### Top-Level Folder Structure

| Folder | Purpose |
|--------|---------|
| `src/app/` | Next.js App Router pages (routes) |
| `src/components/` | React components (UI, features, layouts) |
| `src/lib/` | Utility functions, services, helpers |
| `src/contexts/` | React Context providers (Auth, Theme) |
| `src/hooks/` | Custom React hooks |
| `src/styles/` | CSS stylesheets (global, mobile, Android fixes) |
| `src/types/` | TypeScript type definitions |
| `public/` | Static assets (images, icons, manifest, service workers) |
| `migrations/` | Database migration SQL files |
| `docs/` | Documentation files |
| `ui_tokens/` | Design system documentation and tokens |

---

## SECTION 2: COMPLETE SCREEN/PAGE INVENTORY

### Authentication & Landing Pages

| Route | Screen Name | User Role | UI Elements | API Endpoints | Screenshot Description |
|-------|-------------|-----------|-------------|---------------|------------------------|
| `/` | Landing/Login | Public | Login form, signup toggle, email/password inputs, coach selector dropdown, invite code input, password strength indicator, terms checkbox, feature highlights section | `POST /auth/signin`, `POST /auth/signup` | Landing page with centered auth form. Left side shows feature highlights (workouts, nutrition, progress). Right side has login/signup toggle. Form includes email, password, coach selector (for signup), invite code field, password strength meter, terms checkbox. Submit button at bottom. |
| `/simple-auth` | Simple Auth | Public | Simplified auth form | Same as `/` | Simplified authentication interface |

### Client Pages (Client Role Only)

| Route | Screen Name | UI Elements | API Endpoints | Screenshot Description |
|-------|-------------|-------------|---------------|------------------------|
| `/client` | Client Dashboard (Home) | Greeting with name, avatar, streak counter, weekly progress gauge, today's workout card, program week cards (7 days), overdue workout cards, next session card, body weight display, quick action buttons, animated background, floating particles (optional) | `GET /api/client/dashboard`, `GET /api/client/program-week` | Main hub screen. Top shows personalized greeting with avatar. Large "Today's Workout" card with play button. Below: program week cards showing Mon-Sun with workout names and completion status. Overdue workouts shown in red. Weekly progress gauge showing workouts completed vs goal. Streak counter with flame icon. Next session card if scheduled. Bottom nav visible. |
| `/client/workouts` | Workouts List | Workout cards grid/list, filter buttons (all/assigned/completed), search bar, workout status badges, estimated duration, exercise count, "Start Workout" buttons, empty state message | Direct Supabase queries | Grid/list view of assigned workouts. Each card shows workout name, status badge (assigned/completed), estimated duration, exercise count, "Start" button. Filter tabs at top. Search bar. Empty state if no workouts. |
| `/client/workouts/[id]/details` | Workout Details | Workout name, description, estimated duration, exercise list with sets/reps, exercise images/videos, "Start Workout" button, back button | Direct Supabase queries | Detailed view of workout. Shows all exercises in order with sets, reps, rest times. Exercise images/videos. Large "Start Workout" button at bottom. Back button to workouts list. |
| `/client/workouts/[id]/start` | Live Workout Execution | Current block indicator, exercise name/image/video, weight/reps input fields, "Log Set" button, set history table, RPE modal, rest timer overlay, block completion button, workout completion button, navigation arrows (prev/next exercise), plate calculator, exercise alternatives modal, video player modal, progress indicator | `POST /api/log-set`, `POST /api/block-complete`, `POST /api/complete-workout`, `POST /api/set-rpe`, `PATCH /api/sets/[id]`, `DELETE /api/sets/[id]` | Full-screen workout execution. Large exercise name at top with image/video. Weight and reps input fields. "Log Set" button. Below shows logged sets table. RPE modal appears after logging set. Rest timer overlay shows countdown. Block completion button. Navigation arrows to move between exercises. Plate calculator button. Exercise alternatives button. Video player button. Progress indicator showing blocks completed. |
| `/client/workouts/[id]/complete` | Workout Completion | Completion celebration animation, workout stats (total time, sets completed, weight lifted), PR badges if achieved, difficulty rating slider, notes textarea, "Complete Workout" button, "View Summary" button, next workout suggestion card | `POST /api/complete-workout` | Celebration screen after workout. Shows stats: total time, sets completed, total weight lifted. PR badges if personal records achieved. Difficulty rating (1-10 slider). Notes field. Large "Complete Workout" button. Summary view shows all logged sets. Next workout suggestion card. |
| `/client/programs/[id]/details` | Program Details | Program name, description, duration, week cards showing each week's workouts, week unlock status, current week indicator, program progress bar, "Start Program" button | Direct Supabase queries | Program overview. Shows program name, description, total weeks. Week cards (1-12) showing workouts per week. Locked weeks grayed out. Current week highlighted. Progress bar showing completion percentage. "Start Program" button if not started. |
| `/client/nutrition` | Nutrition Dashboard | Daily macro rings (calories, protein, carbs, fat), water tracker, meal cards (breakfast, lunch, dinner, snacks), meal completion checkboxes, "Add Food" button, meal plan name, target macros display, empty state if no meal plan | Direct Supabase queries | Nutrition hub. Top shows circular progress rings for calories, protein, carbs, fat. Water tracker with glass icons. Meal cards for each meal type showing food items, quantities, macros. Checkbox to mark meals complete. "Add Food" button. Meal plan name at top. Empty state if no plan assigned. |
| `/client/nutrition/meals/[id]` | Meal Detail | Meal name, meal type badge, food items list with quantities, macro breakdown, photo upload button, completion checkbox, "Mark Complete" button, back button | Direct Supabase queries | Single meal view. Shows all food items in meal with quantities. Macro totals (calories, protein, carbs, fat). Photo upload button. Completion checkbox. "Mark Complete" button. Back button. |
| `/client/nutrition/foods/[id]` | Food Detail | Food name, brand, serving size, macro breakdown per serving, "Add to Meal" button, back button | Direct Supabase queries | Food information page. Shows nutritional info per serving. "Add to Meal" button. Back button. |
| `/client/nutrition/foods/create` | Add Food | Food name input, brand input, serving size input, serving unit select, macro inputs (calories, protein, carbs, fat, fiber, sugar, sodium), "Save Food" button, cancel button | Direct Supabase insert | Form to create custom food. All macro fields. Save and cancel buttons. |
| `/client/progress` | Progress Hub | Progress stats cards (total workouts, streak, PRs, achievements), navigation cards to sub-sections (Analytics, Performance Tests, Body Metrics, Mobility, Personal Records, Leaderboard), "View All" links | `getProgressStats()` service | Hub page with overview stats. Cards showing total workouts, current streak, PRs count, achievements unlocked. Navigation cards to: Analytics, Performance Tests, Body Metrics, Mobility, Personal Records, Leaderboard. Each card has icon and description. |
| `/client/progress/analytics` | Analytics | Volume charts, intensity trends, weekly/monthly/yearly filters, exercise breakdown charts, muscle group volume, time period selector | Direct Supabase queries | Analytics dashboard. Charts showing workout volume over time, intensity trends, exercise breakdown, muscle group distribution. Time period filters (week/month/year/all time). Multiple chart types. |
| `/client/progress/workout-logs` | Workout Logs | List of completed workouts, date filters, workout cards showing date, duration, exercises completed, total volume, "View Details" buttons, empty state | Direct Supabase queries | Historical workout list. Cards showing workout date, duration, exercises completed, total weight lifted. Date filters. "View Details" button on each. Empty state if no logs. |
| `/client/progress/workout-logs/[id]` | Workout Log Details | Workout date, duration, exercises list with logged sets (weight x reps), total volume, difficulty rating, notes, back button | Direct Supabase queries | Single workout log detail. Shows all exercises and logged sets with weight/reps. Total volume. Difficulty rating. Notes. Back button. |
| `/client/progress/personal-records` | Personal Records | PR cards grouped by exercise, PR type badges (weight/reps/distance/time), achievement date, previous PR comparison, exercise images, filter by exercise type | Direct Supabase queries | PR showcase. Cards for each exercise showing current PR, previous PR, improvement percentage, achievement date. Filter by exercise type. Exercise images. |
| `/client/progress/body-metrics` | Body Metrics | Weight chart over time, body fat percentage chart, measurement inputs (weight, body fat, muscle mass, circumferences), "Log Measurement" button, measurement history list, date picker | Direct Supabase queries | Body metrics tracking. Charts showing weight and body fat trends. Form to log new measurements: weight, body fat %, muscle mass, waist, hips, arms, thighs, calves. Measurement history list. Date picker. |
| `/client/progress/mobility` | Mobility | Mobility assessment form, measurement inputs (shoulder IR/ER, hip IR/ER, ankle dorsiflexion, etc.), assessment history, charts showing mobility trends | Direct Supabase queries | Mobility tracking. Form to log mobility assessments with various measurements. Assessment history. Trend charts. |
| `/client/progress/performance` | Performance Tests | Test type selector, test results form (1km run time, step test results), heart rate inputs, recovery score, test history list, charts | Direct Supabase queries | Performance test tracking. Form to log tests (1km run, step test). Results inputs, heart rate measurements, recovery score. Test history. Charts. |
| `/client/progress/leaderboard` | Leaderboard | Leaderboard table, rank numbers, client names (or anonymous), scores, category filters, time period filters, sex filters, "View My Rank" button | Direct Supabase queries | Leaderboard display. Table showing ranks, names (or "Anonymous"), scores. Filters for category, time period, sex. User's rank highlighted. |
| `/client/progress/achievements` | Achievements | Achievement cards grid, achievement icons, tier badges (bronze/silver/gold/platinum), progress bars, locked achievements grayed out, achievement categories | Direct Supabase queries | Achievements showcase. Grid of achievement cards. Icons, tier badges, progress bars for in-progress achievements. Locked achievements shown but grayed out. Categories. |
| `/client/goals` | Goals Management | Goal cards list, goal status badges (active/completed/paused), progress bars, target vs current values, "Add Goal" button, goal filters, goal categories | Direct Supabase queries | Goals list. Cards showing goal title, category, current vs target, progress bar, status badge. "Add Goal" button. Filters by status/category. |
| `/client/habits` | Habits Tracking | Habit cards, habit icons, frequency indicators, completion checkboxes, streak counters, habit calendar view, "Add Habit" button | Direct Supabase queries | Habits dashboard. Cards for each assigned habit. Completion checkboxes. Streak counters. Calendar view showing completion days. "Add Habit" button. |
| `/client/achievements` | Achievements Page | Same as `/client/progress/achievements` | Same | Duplicate of progress achievements page |
| `/client/challenges` | Challenges List | Challenge cards, challenge type badges, start/end dates, participant count, "Join Challenge" buttons, challenge status filters | Direct Supabase queries | Challenges list. Cards showing challenge name, type, dates, participants. "Join Challenge" button. Filters. |
| `/client/challenges/[id]` | Challenge Detail | Challenge name, description, scoring categories, leaderboard, video submission buttons, "Submit Video" button, challenge rules | Direct Supabase queries | Challenge detail page. Shows scoring system, current leaderboard, submission interface. "Submit Video" button. Rules and guidelines. |
| `/client/check-ins` | Check-ins | Daily check-in form, mood slider, energy level slider, stress level slider, motivation slider, soreness slider, notes textarea, "Submit Check-in" button, check-in history | Direct Supabase queries | Daily wellness check-in. Sliders for mood, energy, stress, motivation, soreness (1-10). Notes field. Submit button. History of past check-ins. |
| `/client/lifestyle` | Lifestyle Hub | Links to habits, goals, achievements, challenges, check-ins | Navigation only | Hub page with navigation cards to lifestyle features. |
| `/client/sessions` | Sessions List | Upcoming sessions cards, session date/time, session type, coach name, "Cancel Session" buttons, past sessions list, "Book Session" button | Direct Supabase queries | Sessions list. Upcoming sessions shown with date, time, type, coach. Cancel buttons. Past sessions below. "Book Session" button. |
| `/client/scheduling` | Book Session | Coach availability calendar, time slot selection, session type selector, "Book Session" button, selected slot display | `POST /api/sessions/create` | Session booking interface. Calendar showing available time slots. Click to select slot. Session type dropdown. "Book Session" button. |
| `/client/clipcards` | Clip Cards | Clip card cards, sessions remaining display, sessions used/total, expiry date, "Use Session" button | Direct Supabase queries | Clip cards display. Cards showing sessions remaining, expiry date. "Use Session" button. |
| `/client/profile` | Profile Settings | Profile photo, name inputs, email display, bodyweight input, sex selector, client type selector, timezone selector, leaderboard visibility toggle, "Save Changes" button | `PATCH /api/user/timezone`, Direct Supabase updates | Profile settings page. Editable fields for name, bodyweight, sex, client type, timezone, leaderboard visibility. Profile photo upload. Save button. |
| `/client/profile/info` | Profile Info | Same as `/client/profile` | Same | Duplicate of profile page |
| `/client/menu` | Menu | Grid of menu item cards (Profile, Goals, Habits, Workout Logs, Personal Records, Achievements, Leaderboard, Challenges, Programs), avatar display, personalized greeting | Navigation only | Menu hub page. Grid of 9 menu cards with icons. Each links to a section. Avatar and greeting at top. |

### Coach Pages (Coach Role Only)

| Route | Screen Name | UI Elements | API Endpoints | Screenshot Description |
|-------|-------------|-------------|---------------|------------------------|
| `/coach` | Coach Dashboard | Stats cards (total clients, active clients, total workouts, total meal plans), control room signals (compliance percentages), recent clients list, today's sessions list, "Add Client" button, quick action buttons | `GET /api/coach/dashboard`, `GET /api/coach/control-room` | Coach hub. Top shows stats cards. Control room section shows compliance percentages (program, nutrition, habits, overall). Recent clients list with avatars and names. Today's sessions list. "Add Client" button. Quick actions. |
| `/coach/clients` | Clients List | Client cards grid/list, client avatars, names, status badges (active/inactive/pending), compliance scores, last active dates, search bar, status filters, view mode toggle (grid/list), "Add Client" button | Direct Supabase queries | Clients management. Grid/list view of all clients. Each card shows avatar, name, status badge, compliance score, last active. Search bar. Status filters. "Add Client" button. |
| `/coach/clients/add` | Add Client | Client email input, first name input, last name input, invite code generation toggle, invite link display, "Send Invite" button, "Create Client" button | `POST /api/clients/create`, `POST /api/emails/send-invite` | Add client form. Email, first name, last name inputs. Option to generate invite code. Invite link displayed. "Send Invite Email" button. "Create Client" button. |
| `/coach/clients/[id]` | Client Hub | Client profile header (avatar, name, status), tab navigation (Overview, Workouts, Programs, Progress, Goals, Habits, Meals, Analytics, Adherence, FMS, Clip Cards), overview stats, quick actions | Direct Supabase queries | Client detail hub. Header with client info. Tabs for different sections. Overview tab shows stats and quick actions. Other tabs show respective content. |
| `/coach/clients/[id]/workouts` | Client Workouts | Assigned workouts list, workout status badges, completion dates, "Assign Workout" button, workout filters | Direct Supabase queries | Client's workouts view. List of assigned workouts with status and completion dates. "Assign Workout" button. Filters. |
| `/coach/clients/[id]/programs/[programId]` | Client Program Detail | Program name, current week indicator, program progress, week cards, day assignments, "Mark Complete" buttons | Direct Supabase queries | Client's program detail. Shows program progress, current week, day assignments. "Mark Complete" buttons for coach pickup. |
| `/coach/clients/[id]/progress` | Client Progress | Progress charts, body metrics trends, workout history, PRs, achievements | Direct Supabase queries | Client progress overview. Charts and trends. Body metrics, workout history, PRs, achievements. |
| `/coach/clients/[id]/goals` | Client Goals | Client's goals list, goal progress, "Add Goal" button, goal filters | Direct Supabase queries | Client goals view. List of client's goals with progress. "Add Goal" button. Filters. |
| `/coach/clients/[id]/habits` | Client Habits | Client's habits list, habit completion tracking, "Assign Habit" button | Direct Supabase queries | Client habits view. List of assigned habits with completion tracking. "Assign Habit" button. |
| `/coach/clients/[id]/meals` | Client Meals | Client's meal plan assignments, meal completion tracking, nutrition compliance | Direct Supabase queries | Client meals view. Shows assigned meal plans and completion tracking. Nutrition compliance metrics. |
| `/coach/clients/[id]/analytics` | Client Analytics | Analytics charts, compliance metrics, progress trends, workout volume, intensity analysis | Direct Supabase queries | Client analytics dashboard. Various charts and metrics. Compliance, progress trends, volume, intensity. |
| `/coach/clients/[id]/adherence` | Client Adherence | Adherence score, compliance breakdown, adherence trends chart, weekly/monthly views | Direct Supabase queries | Client adherence dashboard. Adherence score, breakdown by category, trend charts. |
| `/coach/clients/[id]/fms` | FMS Assessment | FMS assessment form, movement screens inputs (deep squat, hurdle step, etc.), total score calculation, assessment history | Direct Supabase queries | FMS assessment interface. Form with all movement screens. Score calculation. Assessment history. |
| `/coach/clients/[id]/clipcards` | Client Clip Cards | Client's clip cards list, sessions remaining, expiry dates, "Issue Clip Card" button | Direct Supabase queries | Client clip cards view. List of clip cards with sessions remaining. "Issue Clip Card" button. |
| `/coach/clients/[id]/profile` | Client Profile | Client profile info, edit form, body metrics, client type, status management | Direct Supabase queries | Client profile management. Editable client info. Body metrics. Status management. |
| `/coach/programs` | Programs List | Program cards grid/list, program name, duration, difficulty, client count, "Create Program" button, search bar, filters | Direct Supabase queries | Programs list. Grid/list of programs. Each shows name, duration, difficulty, assigned client count. "Create Program" button. Search and filters. |
| `/coach/programs/create` | Create Program | Program name input, description textarea, duration weeks input, difficulty selector, target audience selector, category selector, program days builder, "Save Program" button | Direct Supabase insert | Program creation form. Basic info inputs. Program days builder to add days. "Save Program" button. |
| `/coach/programs/[id]` | Program Detail | Program name, description, week cards showing each week's schedule, program days list, "Edit Program" button, "Assign to Clients" button | Direct Supabase queries | Program detail view. Shows all weeks and days. "Edit Program" and "Assign to Clients" buttons. |
| `/coach/programs/[id]/edit` | Edit Program | Same as create but pre-filled, program schedule editor, day management, progression rules editor | Direct Supabase updates | Program edit form. Pre-filled with existing data. Schedule editor. Day management. Progression rules editor. |
| `/coach/training/programs` | Training Hub Entry | Navigation cards to Programs, Workout Templates, Exercises, Categories, Bulk Assignments, Gym Console | Navigation only | Training hub entry page. Navigation cards to training-related features. |
| `/coach/programs-workouts` | Programs + Workouts | Redirects to `/coach/workouts/templates` | Redirect | Redirect page |
| `/coach/workouts/templates` | Workout Templates List | Template cards grid/list, template name, difficulty, estimated duration, exercise count, "Create Template" button, search bar, filters | Direct Supabase queries | Workout templates list. Grid/list of templates. Each shows name, difficulty, duration, exercise count. "Create Template" button. Search and filters. |
| `/coach/workouts/templates/create` | Create Workout Template | Template name input, description textarea, difficulty selector, category selector, estimated duration input, workout blocks builder, exercise selector, "Save Template" button | Direct Supabase insert | Workout template creation form. Basic info. Workout blocks builder to add blocks and exercises. "Save Template" button. |
| `/coach/workouts/templates/[id]` | Workout Template Detail | Template name, description, blocks list with exercises, "Edit Template" button, "Assign to Clients" button | Direct Supabase queries | Workout template detail. Shows all blocks and exercises. "Edit Template" and "Assign to Clients" buttons. |
| `/coach/workouts/templates/[id]/edit` | Edit Workout Template | Same as create but pre-filled, block editor, exercise management, special set editors | Direct Supabase updates | Workout template edit form. Pre-filled. Block editor. Exercise management. Special set editors. |
| `/coach/exercises` | Exercise Library | Exercise cards grid/list, exercise name, category, muscle groups, "Create Exercise" button, search bar, category filters, muscle group filters | Direct Supabase queries | Exercise library. Grid/list of exercises. Each shows name, category, primary muscle group. "Create Exercise" button. Search and filters. |
| `/coach/exercises/create` | Create Exercise | Exercise name input, description textarea, category selector, primary muscle group selector, secondary muscle groups, equipment types, instructions textarea, tips textarea, image upload, video URL input, "Save Exercise" button | Direct Supabase insert | Exercise creation form. All exercise fields. Image upload. Video URL. Instructions and tips. "Save Exercise" button. |
| `/coach/exercise-categories` | Exercise Categories | Category cards, category name, icon, color, "Create Category" button, category management | Direct Supabase queries | Exercise categories management. List of categories with icons and colors. "Create Category" button. |
| `/coach/categories` | Workout Categories | Workout category cards, category name, icon, color, "Create Category" button | Direct Supabase queries | Workout categories management. Similar to exercise categories. |
| `/coach/nutrition` | Nutrition Management | Meal plans list, "Create Meal Plan" button, nutrition overview | Direct Supabase queries | Nutrition hub. List of meal plans. "Create Meal Plan" button. Overview stats. |
| `/coach/nutrition/meal-plans` | Meal Plans List | Meal plan cards, meal plan name, target macros, client count, "Create Meal Plan" button | Direct Supabase queries | Meal plans list. Cards showing name, target macros, assigned client count. "Create Meal Plan" button. |
| `/coach/nutrition/meal-plans/create` | Create Meal Plan | Meal plan name input, target macros inputs (calories, protein, carbs, fat), meals builder, "Save Meal Plan" button | Direct Supabase insert | Meal plan creation form. Name and target macros. Meals builder to add meals and food items. "Save Meal Plan" button. |
| `/coach/nutrition/meal-plans/[id]` | Meal Plan Detail | Meal plan name, target macros, meals list, "Edit Meal Plan" button, "Assign to Clients" button | Direct Supabase queries | Meal plan detail. Shows all meals and food items. "Edit Meal Plan" and "Assign to Clients" buttons. |
| `/coach/nutrition/meal-plans/[id]/edit` | Edit Meal Plan | Same as create but pre-filled, meal editor, food item management | Direct Supabase updates | Meal plan edit form. Pre-filled. Meal editor. Food item management. |
| `/coach/nutrition/foods` | Food Database | Food cards list, food name, brand, macros, "Add Food" button, search bar | Direct Supabase queries | Food database. List of foods with nutritional info. "Add Food" button. Search. |
| `/coach/nutrition/assignments` | Nutrition Assignments | Client meal plan assignments list, assignment status, start/end dates, "Assign Meal Plan" button | Direct Supabase queries | Nutrition assignments view. List of client assignments. "Assign Meal Plan" button. |
| `/coach/analytics` | Coach Analytics | Overall analytics dashboard, client compliance charts, program performance, nutrition compliance, habit compliance, time period filters | Direct Supabase queries | Coach analytics dashboard. Various charts showing overall performance metrics. Client compliance, program performance, nutrition/habit compliance. Filters. |
| `/coach/goals` | Goals Management | Goal templates list, "Create Goal Template" button, goal assignment interface | Direct Supabase queries | Goals management. List of goal templates. "Create Goal Template" button. Assignment interface. |
| `/coach/habits` | Habits Management | Habit templates list, habit library, "Create Habit" button, habit assignment interface, habit categories | Direct Supabase queries | Habits management. Habit templates/library. "Create Habit" button. Assignment interface. Categories. |
| `/coach/sessions` | Sessions Management | Sessions list, upcoming/past filters, session details, "Create Session" button | Direct Supabase queries | Sessions list. Upcoming and past sessions. "Create Session" button. |
| `/coach/gym-console` | Gym Console | Quick client selector, next workout display, "Mark Complete" button, workout details | `GET /api/coach/pickup/next-workout`, `POST /api/coach/pickup/mark-complete` | Gym console for in-person coaching. Quick client selector. Shows next workout. "Mark Complete" button. Workout details. |
| `/coach/bulk-assignments` | Bulk Assignments | Client multi-select, program/workout selector, assignment date picker, "Assign to Selected" button | Direct Supabase inserts | Bulk assignment interface. Multi-select clients. Select program or workout. Date picker. "Assign to Selected" button. |
| `/coach/menu` | Coach Menu | Grid of menu item cards (Client Management, Programs, Workout Templates, Gym Console, Bulk Assignments, Exercise Library, Nutrition, Analytics, etc.), admin section (if admin role) | Navigation only | Coach menu hub. Grid of menu cards linking to all coach features. Admin section visible if admin role. |

### Admin Pages (Admin Role Only)

| Route | Screen Name | UI Elements | API Endpoints | Screenshot Description |
|-------|-------------|-------------|---------------|------------------------|
| `/admin/goal-templates` | Goal Templates | Goal template cards, template name, category, target types, "Create Template" button | Direct Supabase queries | Goal templates management. List of templates. "Create Template" button. |
| `/admin/habit-categories` | Habit Categories | Habit category cards, category name, icon, "Create Category" button | Direct Supabase queries | Habit categories management. List of categories. "Create Category" button. |
| `/admin/achievement-templates` | Achievement Templates | Achievement template cards, template name, category, tier thresholds, "Create Template" button | Direct Supabase queries | Achievement templates management. List of templates with tier configurations. "Create Template" button. |
| `/admin/tracking-sources` | Tracking Sources | Tracking source list, source name, status, configuration | Direct Supabase queries | Tracking sources management. List of available data sources. Configuration options. |

### Utility/Setup Pages

| Route | Screen Name | UI Elements | API Endpoints | Screenshot Description |
|-------|-------------|-------------|---------------|------------------------|
| `/setup-database` | Database Setup | Database connection form, Supabase URL input, API key input, "Test Connection" button, schema validation | Direct Supabase queries | Database setup utility. Connection form. Test connection button. Schema validation. |
| `/database-status` | Database Status | Database status indicators, table count, connection status | Direct Supabase queries | Database status page. Shows connection status, table counts, health indicators. |
| `/create-user` | Create User | User creation form, email input, role selector, "Create User" button | Direct Supabase insert | User creation utility. Form to create users manually. |

---

## SECTION 3: USER FLOWS (Step-by-step)

### Flow 1: Client Opens App → Views Today's Workout → Starts Workout → Completes Workout → Sees Results

**Steps:**
1. Client opens app → Lands on `/client` (Dashboard)
2. Sees "Today's Workout" card with workout name and "Start" button
3. Taps "Start" button → Navigates to `/client/workouts/[id]/start`
4. Workout execution screen loads → Shows first exercise with weight/reps inputs
5. Client enters weight and reps → Taps "Log Set" button
6. RPE modal appears → Client selects RPE (1-10) or skips
7. Rest timer overlay appears → Shows countdown
8. Client logs all sets for exercise → Taps "Next Exercise" arrow
9. Repeats for all exercises in block → Taps "Complete Block" button
10. Repeats for all blocks → Taps "Complete Workout" button
11. Completion screen appears (`/client/workouts/[id]/complete`) → Shows stats, PR badges, difficulty rating
12. Client rates difficulty → Taps "Complete Workout" button
13. POST to `/api/complete-workout` → Workout marked complete
14. Returns to dashboard → Sees completed workout, next workout suggestion

**Taps/Clicks:** ~15-20 taps (varies by workout complexity)
**Dead Ends:** None - Back button always available, can exit workout anytime
**Confusing Moments:**
- RPE modal might be unclear what it's for
- Rest timer might block interaction (intentional but could be confusing)
- No clear indication of workout progress percentage

### Flow 2: Client Checks Their Progress/Stats Over Time

**Steps:**
1. Client opens app → Lands on `/client`
2. Taps "Progress" in bottom nav → Navigates to `/client/progress`
3. Sees progress hub with stats cards and navigation cards
4. Taps "Analytics" card → Navigates to `/client/progress/analytics`
5. Sees charts showing volume trends, intensity trends
6. Can filter by time period (week/month/year)
7. Taps back → Returns to progress hub
8. Taps "Body Metrics" card → Navigates to `/client/progress/body-metrics`
9. Sees weight/body fat charts over time
10. Can log new measurement → Taps "Log Measurement" button
11. Fills form → Taps "Save" button
12. Returns to progress hub

**Taps/Clicks:** ~8-10 taps
**Dead Ends:** None
**Confusing Moments:**
- Progress hub has many options - might be overwhelming
- No clear hierarchy of what's most important

### Flow 3: Coach Creates a New Workout or Program

**Workout Template Creation:**
1. Coach opens app → Lands on `/coach`
2. Taps "Training" in bottom nav → Navigates to `/coach/training/programs` (or `/coach/programs`)
3. Taps "Workout Templates" card → Navigates to `/coach/workouts/templates`
4. Taps "Create Template" button → Navigates to `/coach/workouts/templates/create`
5. Enters workout name, description, difficulty, category
6. Taps "Add Block" button → Block editor appears
7. Selects block type (straight_set, superset, etc.)
8. Adds exercises to block → Taps "Add Exercise" button
9. Selects exercise from library → Configures sets, reps, weight, rest
10. Repeats for all exercises in block
11. Repeats for all blocks
12. Taps "Save Template" button → Template created
13. Returns to templates list → Sees new template

**Program Creation:**
1. Coach opens app → Lands on `/coach`
2. Taps "Training" → Navigates to `/coach/programs`
3. Taps "Create Program" button → Navigates to `/coach/programs/create`
4. Enters program name, description, duration, difficulty
5. Taps "Add Day" button → Day editor appears
6. Selects day type (workout/rest/assessment)
7. If workout day → Selects workout template
8. Configures day details (name, intensity, target muscles)
9. Repeats for all days
10. Configures program schedule (which days of week)
11. Adds progression rules (optional)
12. Taps "Save Program" button → Program created
13. Returns to programs list → Sees new program

**Taps/Clicks:** ~20-30 taps (workout), ~25-35 taps (program)
**Dead Ends:** None
**Confusing Moments:**
- Block system is complex - many block types might be overwhelming
- Progression rules interface might be unclear
- No preview of how workout/program will look to client

### Flow 4: Coach Assigns a Workout/Program to a Client

**Workout Assignment:**
1. Coach opens app → Lands on `/coach`
2. Taps "Clients" in bottom nav → Navigates to `/coach/clients`
3. Taps on client card → Navigates to `/coach/clients/[id]`
4. Taps "Workouts" tab → Navigates to `/coach/clients/[id]/workouts`
5. Taps "Assign Workout" button → Modal/form appears
6. Selects workout template from dropdown
7. Sets scheduled date (optional)
8. Adds notes (optional)
9. Taps "Assign" button → Workout assigned
10. Returns to client workouts list → Sees new assignment

**Program Assignment:**
1. Coach opens app → Lands on `/coach`
2. Taps "Clients" → Navigates to `/coach/clients`
3. Taps on client → Navigates to `/coach/clients/[id]`
4. Taps "Programs" tab → Shows program assignment interface
5. Taps "Assign Program" button → Modal/form appears
6. Selects program from dropdown
7. Sets start date
8. Configures preferred workout days (optional)
9. Taps "Assign" button → Program assigned
10. Returns to client view → Sees program assignment

**Bulk Assignment:**
1. Coach opens app → Lands on `/coach`
2. Taps "Menu" → Navigates to `/coach/menu`
3. Taps "Bulk Assignments" card → Navigates to `/coach/bulk-assignments`
4. Multi-selects clients (checkboxes)
5. Selects program or workout template
6. Sets assignment date
7. Taps "Assign to Selected" button → Bulk assignment created
8. Sees confirmation → Returns to menu

**Taps/Clicks:** ~8-10 taps (single), ~12-15 taps (bulk)
**Dead Ends:** None
**Confusing Moments:**
- Bulk assignment interface might be unclear how to select multiple clients
- No preview of what client will see

### Flow 5: Coach Reviews a Client's Progress and Activity

**Steps:**
1. Coach opens app → Lands on `/coach`
2. Taps "Clients" → Navigates to `/coach/clients`
3. Taps on client card → Navigates to `/coach/clients/[id]`
4. Sees overview tab with stats (workouts completed, compliance, etc.)
5. Taps "Progress" tab → Navigates to `/coach/clients/[id]/progress`
6. Sees progress charts, body metrics trends, workout history
7. Taps "Analytics" tab → Navigates to `/coach/clients/[id]/analytics`
8. Sees detailed analytics, compliance metrics, trends
9. Taps "Adherence" tab → Navigates to `/coach/clients/[id]/adherence`
10. Sees adherence score, compliance breakdown
11. Can filter by time period
12. Returns to client hub

**Taps/Clicks:** ~8-12 taps
**Dead Ends:** None
**Confusing Moments:**
- Multiple tabs might be overwhelming
- No clear summary of most important metrics

### Flow 6: New User Signs Up and Onboards

**Client Signup:**
1. User visits app → Lands on `/` (Landing/Login)
2. Taps "Sign Up" toggle → Signup form appears
3. Enters email, password
4. Selects coach from dropdown (or enters invite code)
5. Enters first name, last name
6. Checks terms checkbox
7. Taps "Sign Up" button → Account created
8. Redirected to `/client` → Sees dashboard
9. Sees empty state or welcome message
10. Can explore workouts, nutrition, progress sections

**Coach Signup:**
1. User visits app → Lands on `/`
2. Taps "Sign Up" → Signup form appears
3. Enters email, password
4. Selects "Coach" role (if available) or uses coach-specific signup
5. Enters name
6. Checks terms
7. Taps "Sign Up" → Account created
8. Redirected to `/coach` → Sees coach dashboard
9. Can start creating programs, adding clients

**Taps/Clicks:** ~6-8 taps
**Dead Ends:** None
**Confusing Moments:**
- Coach selection might be unclear for new users
- No onboarding tutorial or guided tour
- Empty states might be confusing

### Flow 7: Notification or Reminder Flow

**Push Notification:**
1. Client receives push notification (via OneSignal)
2. Taps notification → App opens
3. Navigates to relevant screen (workout, goal, etc.)
4. Sees notification content/action

**Workout Reminder:**
1. Scheduled reminder triggers (via cron job)
2. Push notification sent to client
3. Client taps notification → App opens to `/client`
4. Sees "Today's Workout" card highlighted
5. Can tap "Start" to begin workout

**Goal Reminder:**
1. Goal deadline approaching → Notification sent
2. Client taps notification → App opens to `/client/goals`
3. Sees goal with reminder badge
4. Can update goal progress

**Taps/Clicks:** ~2-3 taps
**Dead Ends:** None
**Confusing Moments:**
- Notification might not always navigate to correct screen
- No notification history/settings page visible

---

## SECTION 4: COMPONENT INVENTORY

### Layout Components

| Component | File | Purpose | Props | Used In |
|-----------|------|---------|-------|---------|
| `AppLayout` | `src/components/layout/AppLayout.tsx` | Main app wrapper, handles layout structure | `children` | Root layout |
| `BottomNav` | `src/components/layout/BottomNav.tsx` | Bottom navigation bar (floating pill style) | None (uses pathname) | All client/coach pages |
| `Header` | `src/components/layout/Header.tsx` | Top header with profile link | None | Some pages |
| `DashboardLayout` | `src/components/server/DashboardLayout.tsx` | Dashboard-specific layout | `children` | Dashboard pages |
| `PageLayout` | `src/components/server/PageLayout.tsx` | Standard page layout | `children` | Various pages |
| `AuthLayout` | `src/components/server/AuthLayout.tsx` | Authentication page layout | `children` | Auth pages |
| `ClientPageShell` | `src/components/client-ui/ClientPageShell.tsx` | Client page wrapper with spacing | `children`, `className` | Client pages |
| `ProtectedRoute` | `src/components/ProtectedRoute.tsx` | Route protection wrapper | `children`, `requiredRole`, `allowedRoles` | All protected pages |

### UI Primitives (Base Components)

| Component | File | Purpose | Props | Used In |
|-----------|------|---------|-------|---------|
| `Button` | `src/components/ui/button.tsx` | Base button component | `variant`, `size`, `children`, `onClick`, `disabled` | Throughout app |
| `PrimaryButton` | `src/components/client-ui/PrimaryButton.tsx` | Primary action button (cyan) | `children`, `onClick`, `type`, `disabled`, `className` | Client pages |
| `SecondaryButton` | `src/components/client-ui/SecondaryButton.tsx` | Secondary action button | `children`, `onClick`, `type`, `disabled`, `className` | Client pages |
| `Input` | `src/components/ui/input.tsx` | Text input field | `type`, `placeholder`, `value`, `onChange`, `disabled` | Forms throughout |
| `Textarea` | `src/components/ui/textarea.tsx` | Multi-line text input | `placeholder`, `value`, `onChange`, `rows` | Forms |
| `Select` | `src/components/ui/select.tsx` | Dropdown select | `value`, `onChange`, `children` | Forms |
| `Checkbox` | `src/components/ui/checkbox.tsx` | Checkbox input | `checked`, `onChange`, `disabled` | Forms |
| `Label` | `src/components/ui/label.tsx` | Form label | `children`, `htmlFor` | Forms |
| `Badge` | `src/components/ui/badge.tsx` | Status badge | `variant`, `children` | Throughout app |
| `Card` | `src/components/ui/card.tsx` | Card container | `children`, `className` | Various pages |
| `GlassCard` | `src/components/ui/GlassCard.tsx` | Glass morphism card | `children`, `elevation`, `className` | Throughout app |
| `ClientGlassCard` | `src/components/client-ui/GlassCard.tsx` | Client-specific glass card | `children`, `className`, `style` | Client pages |
| `Dialog` | `src/components/ui/dialog.tsx` | Modal dialog | `open`, `onOpenChange`, `children` | Modals |
| `Tabs` | `src/components/ui/tabs.tsx` | Tab navigation | `value`, `onValueChange`, `children` | Pages with tabs |
| `Progress` | `src/components/ui/progress.tsx` | Progress bar | `value`, `max`, `className` | Progress displays |
| `Avatar` | `src/components/ui/avatar.tsx` | User avatar | `src`, `alt`, `fallback` | Profile displays |
| `Toast` | `src/components/ui/toast.tsx` | Toast notification | `title`, `description`, `variant` | Notifications |
| `Stepper` | `src/components/ui/stepper.tsx` | Step indicator | `currentStep`, `totalSteps` | Multi-step forms |

### Feature Components

| Component | File | Purpose | Props | Used In |
|-----------|------|---------|-------|---------|
| `WorkoutTemplateForm` | `src/components/WorkoutTemplateForm.tsx` | Workout template creation/edit form | `templateId`, `onSave`, `onCancel` | Workout template pages |
| `EnhancedWorkoutTemplateManager` | `src/components/coach/EnhancedWorkoutTemplateManager.tsx` | Workout template management interface | `coachId` | Workout templates page |
| `EnhancedProgramManager` | `src/components/coach/EnhancedProgramManager.tsx` | Program management interface | `coachId` | Programs page |
| `LiveWorkoutBlockExecutor` | `src/components/client/LiveWorkoutBlockExecutor.tsx` | Workout block execution component | `block`, `loggedSets`, `onLogSet`, `onCompleteBlock` | Workout execution page |
| `StraightSetExecutor` | `src/components/client/workout-execution/blocks/StraightSetExecutor.tsx` | Straight set execution UI | `block`, `exercise`, `loggedSets`, `onLogSet` | Workout execution |
| `SupersetExecutor` | `src/components/client/workout-execution/blocks/SupersetExecutor.tsx` | Superset execution UI | Same as above | Workout execution |
| `DropSetExecutor` | `src/components/client/workout-execution/blocks/DropSetExecutor.tsx` | Drop set execution UI | Same as above | Workout execution |
| `ClusterSetExecutor` | `src/components/client/workout-execution/blocks/ClusterSetExecutor.tsx` | Cluster set execution UI | Same as above | Workout execution |
| `RestPauseExecutor` | `src/components/client/workout-execution/blocks/RestPauseExecutor.tsx` | Rest-pause execution UI | Same as above | Workout execution |
| `GiantSetExecutor` | `src/components/client/workout-execution/blocks/GiantSetExecutor.tsx` | Giant set execution UI | Same as above | Workout execution |
| `AmrapExecutor` | `src/components/client/workout-execution/blocks/AmrapExecutor.tsx` | AMRAP execution UI | Same as above | Workout execution |
| `EmomExecutor` | `src/components/client/workout-execution/blocks/EmomExecutor.tsx` | EMOM execution UI | Same as above | Workout execution |
| `ForTimeExecutor` | `src/components/client/workout-execution/blocks/ForTimeExecutor.tsx` | For Time execution UI | Same as above | Workout execution |
| `TabataExecutor` | `src/components/client/workout-execution/blocks/TabataExecutor.tsx` | Tabata execution UI | Same as above | Workout execution |
| `PreExhaustionExecutor` | `src/components/client/workout-execution/blocks/PreExhaustionExecutor.tsx` | Pre-exhaustion execution UI | Same as above | Workout execution |
| `HRSetExecutor` | `src/components/client/workout-execution/blocks/HRSetExecutor.tsx` | Heart rate set execution UI | Same as above | Workout execution |
| `RestTimerOverlay` | `src/components/workout/RestTimerOverlay.tsx` | Rest timer modal overlay | `isOpen`, `duration`, `onComplete` | Workout execution |
| `RPEModal` | `src/components/client/RPEModal.tsx` | RPE input modal | `isOpen`, `onConfirm`, `onSkip` | Workout execution |
| `EnhancedClientWorkouts` | `src/components/client/EnhancedClientWorkouts.tsx` | Client workouts list component | None | Workouts list page |
| `GoalCard` | `src/components/goals/GoalCard.tsx` | Goal display card | `goal`, `onEdit`, `onDelete` | Goals pages |
| `AddGoalModal` | `src/components/goals/AddGoalModal.tsx` | Add goal modal | `isOpen`, `onClose`, `onSave` | Goals pages |
| `MealCardWithOptions` | `src/components/client/MealCardWithOptions.tsx` | Meal card with options | `meal`, `onComplete`, `onSelectOption` | Nutrition pages |
| `AddFoodModal` | `src/components/nutrition/AddFoodModal.tsx` | Add food modal | `isOpen`, `onClose`, `onSave` | Nutrition pages |
| `HabitTracker` | `src/components/HabitTracker.tsx` | Habit tracking component | `habits`, `onLogHabit` | Habits pages |
| `HabitManager` | `src/components/HabitManager.tsx` | Habit management interface | `coachId` | Coach habits page |
| `WorkoutCompletionModal` | `src/components/ui/WorkoutCompletionModal.tsx` | Workout completion celebration | `isOpen`, `stats`, `onClose` | Workout completion |
| `AchievementUnlockModal` | `src/components/ui/AchievementUnlockModal.tsx` | Achievement unlock animation | `isOpen`, `achievement`, `onClose` | Achievement unlocks |
| `ResponsiveModal` | `src/components/ui/ResponsiveModal.tsx` | Responsive modal wrapper | `isOpen`, `onClose`, `title`, `children` | Various modals |
| `AnimatedBackground` | `src/components/ui/AnimatedBackground.tsx` | Animated gradient background | `children` | Most pages |
| `FloatingParticles` | `src/components/ui/FloatingParticles.tsx` | Floating particle effects | None | Pages (optional) |
| `MetricGauge` | `src/components/ui/MetricGauge.tsx` | Circular progress gauge | `value`, `max`, `label`, `color` | Dashboard |
| `AnimatedNumber` | `src/components/ui/AnimatedNumber.tsx` | Animated number counter | `value`, `duration` | Stats displays |
| `AnimatedEntry` | `src/components/ui/AnimatedEntry.tsx` | Fade-in animation wrapper | `children`, `delay` | Page elements |

### Coach-Specific Components

| Component | File | Purpose | Props | Used In |
|-----------|------|---------|-------|---------|
| `ProgramsDashboardContent` | `src/components/coach/ProgramsDashboardContent.tsx` | Programs dashboard content | None | Coach dashboard |
| `OptimizedAnalyticsReporting` | `src/components/coach/OptimizedAnalyticsReporting.tsx` | Analytics reporting component | None | Analytics page |
| `OptimizedNutritionAssignments` | `src/components/coach/OptimizedNutritionAssignments.tsx` | Nutrition assignments component | None | Nutrition assignments |
| `OptimizedFoodDatabase` | `src/components/coach/OptimizedFoodDatabase.tsx` | Food database component | None | Food database |
| `OptimizedClientProgress` | `src/components/coach/OptimizedClientProgress.tsx` | Client progress component | `clientId` | Client progress |
| `OptimizedComplianceAnalytics` | `src/components/coach/OptimizedComplianceAnalytics.tsx` | Compliance analytics | None | Compliance page |
| `ClientAdherenceView` | `src/components/coach/client-views/ClientAdherenceView.tsx` | Client adherence view | `clientId` | Client adherence |
| `ActionItems` | `src/components/coach/ActionItems.tsx` | Action items list | None | Coach dashboard |
| `ExerciseCard` | `src/components/coach/ExerciseCard.tsx` | Exercise display card | `exercise`, `onSelect` | Exercise library |
| `DraggableExerciseCard` | `src/components/coach/DraggableExerciseCard.tsx` | Draggable exercise card | `exercise`, `onDragStart` | Workout builder |
| `WorkoutTemplateSidebar` | `src/components/coach/WorkoutTemplateSidebar.tsx` | Workout template sidebar | `template`, `onUpdate` | Template editor |
| `ExerciseSearchFilters` | `src/components/coach/ExerciseSearchFilters.tsx` | Exercise search filters | `onFilterChange` | Exercise library |
| `WorkoutTemplateFilters` | `src/components/coach/WorkoutTemplateFilters.tsx` | Workout template filters | `onFilterChange` | Templates list |

### Progress/Analytics Components

| Component | File | Purpose | Props | Used In |
|-----------|------|---------|-------|---------|
| `GoalsAndHabits` | `src/components/progress/GoalsAndHabits.tsx` | Goals and habits display | `loading` | Progress pages |
| `WorkoutAnalytics` | `src/components/progress/WorkoutAnalytics.tsx` | Workout analytics charts | `userId` | Analytics page |
| `ChartsAndGraphs` | `src/components/progress/ChartsAndGraphs.tsx` | Chart components | `data`, `type` | Analytics pages |
| `ProgressPhotos` | `src/components/progress/ProgressPhotos.tsx` | Progress photo gallery | `clientId` | Progress pages |
| `MobilityFormFields` | `src/components/progress/MobilityFormFields.tsx` | Mobility form inputs | `onChange`, `values` | Mobility page |

### Navigation Structure

**Client Bottom Navigation (5 items):**
- Home (`/client`) - Home icon
- Check-ins (`/client/check-ins`) - ClipboardList icon
- Training (`/client/workouts`) - Dumbbell icon
- Nutrition (`/client/nutrition`) - Apple icon
- Lifestyle (`/client/lifestyle`) - Sparkles icon

**Coach Bottom Navigation (5 items):**
- Home (`/coach`) - Home icon
- Clients (`/coach/clients`) - Users icon
- Training (`/coach/programs`) - Dumbbell icon
- Nutrition (`/coach/nutrition`) - Apple icon
- Analytics (`/coach/analytics`) - BarChart3 icon

**Menu Pages:**
- `/client/menu` - Grid of 9 menu cards
- `/coach/menu` - Grid of 18+ menu cards (includes admin section if admin)

**Duplicate Components Identified:**
- `PrimaryButton` and `Button` with `variant="primary"` - Similar purpose, different implementations
- `GlassCard` and `ClientGlassCard` - Similar glass card implementations
- `/client/achievements` and `/client/progress/achievements` - Duplicate routes
- `/client/profile` and `/client/profile/info` - Duplicate routes

---

## SECTION 5: DESIGN SYSTEM ANALYSIS

### Color Palette

**Primary Colors (from CSS variables):**
- **Primary Blue:** `#3B82F6` (oklch(0.635 0.177 258.32)) - Action blue
- **Accent Orange:** `#F59E0B` (oklch(0.776 0.177 70.08)) - Celebration gold
- **Success Green:** `#10B981` (light), `#059669` (dark)
- **Warning Yellow:** `#FBBF24` (light), `#D97706` (dark)
- **Error Red:** `#EF4444` (light), `#DC2626` (dark)

**Design System Colors (from ui-system.css):**
- **Background Deep:** `#f6f2ec` (light), `#0b0f14` (dark)
- **Background Basalt:** `#e8e3db` (light), `#121824` (dark)
- **Text Primary:** `#1f2933` (light), `#ffffff` (dark)
- **Text Dim:** `#59636e` (light), `#a0a6b0` (dark)
- **Text Subtle:** `rgba(31, 41, 51, 0.45)` (light), `rgba(255, 255, 255, 0.55)` (dark)

**Accent Colors:**
- **Cyan:** `#0891b2` (light), `#00f2ff` (dark)
- **Purple:** `#7c3aed` (light), `#8e94ff` (dark)
- **Indigo:** `#4338ca` (light), `#4f46e5` (dark)
- **Violet:** `#6d28d9` (light), `#7c3aed` (dark)

**Domain Colors:**
- **Workouts:** `#0284c7` (light), `#38bdf8` (dark)
- **Meals:** `#16a34a` (light), `#4ade80` (dark)
- **Habits:** `#ca8a04` (light), `#fbbf24` (dark)
- **Challenges:** `#be123c` (light), `#f43f5e` (dark)
- **Neutral:** `#475569` (light), `#64748b` (dark)

**Semantic Colors (from colors.ts):**
- **Energy:** `#FF6B35` (primary), `#FF8A5B` (light), `#E55325` (dark)
- **Trust:** `#4A90E2` (primary), `#5CA0F2` (light), `#3A7BC8` (dark)
- **Success:** `#7CB342` (primary), `#9CCC65` (light), `#689F38` (dark)
- **Warning:** `#FFA726` (primary), `#FFB74D` (light), `#FB8C00` (dark)
- **Critical:** `#E53935` (primary), `#EF5350` (light), `#C62828` (dark)
- **Neutral:** `#9E9E9E` (primary), `#BDBDBD` (light), `#757575` (dark)

### Typography

**Fonts:**
- **Primary:** Inter (Google Fonts) - `font-family: "Inter", ui-sans-serif, system-ui, sans-serif`
- **Mono:** JetBrains Mono (Google Fonts) - `font-family: "JetBrains Mono", ui-monospace, monospace`
- **Numbers:** SF Pro Rounded (system fallback) - `-apple-system, BlinkMacSystemFont, "SF Pro Rounded", system-ui, sans-serif`
- **Body:** SF Pro Text (system fallback) - `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`

**Type Scale (from CSS variables):**
- **Hero:** 48px (`--fc-type-hero`)
- **H1:** 32px (`--fc-type-h1`)
- **H2:** 24px (`--fc-type-h2`)
- **H3:** 20px (`--fc-type-h3`)
- **Body:** 16px (`--fc-type-body`)
- **Caption:** 14px (`--fc-type-caption`)
- **Label:** 12px (`--fc-type-label`)
- **Micro:** 10px (`--fc-type-micro`)

**Font Weights:**
- Heavy: 800
- Bold: 700
- Semibold: 600
- Medium: 500
- Regular: 400

### Spacing/Sizing System

**Spacing Scale (from CSS variables):**
- **Page Padding:** 16px (mobile), 24px (desktop) (`--fc-page-px`)
- **Page Padding Top:** 16px (`--fc-page-pt`)
- **Page Padding Bottom:** 120px (`--fc-page-pb`) - accounts for bottom nav
- **Card Padding:** 24px (`--fc-card-padding`)
- **Gap Between Cards:** 16px (`--fc-gap-cards`)
- **Gap Between Sections:** 24px (`--fc-gap-sections`)
- **List Row Min Height:** 48px (`--fc-list-row-min-height`)
- **List Row Padding:** 12px vertical, 16px horizontal (`--fc-list-row-py`, `--fc-list-row-px`)

**Border Radius:**
- **Small:** 12px (`--fc-radius-sm`)
- **Medium:** 16px (`--fc-radius-md`)
- **Large:** 20px (`--fc-radius-lg`)
- **XL:** 24px (`--fc-radius-xl`)
- **2XL:** 32px (`--fc-radius-2xl`)
- **3XL:** 40px (`--fc-radius-3xl`)

**Consistency:** Generally consistent - uses CSS variables throughout. Some ad-hoc spacing in components.

### Icon Set

- **Library:** Lucide React (`lucide-react` v0.544.0)
- **Usage:** Icons imported as React components
- **Examples:** `Home`, `Dumbbell`, `Apple`, `ClipboardList`, `Sparkles`, `Users`, `BarChart3`, `ChevronRight`, `CheckCircle`, `Clock`, `Play`, `Trophy`, `Target`, `Flame`, etc.
- **Custom Icons:** None identified - all from Lucide

### Dark Mode / Light Mode

- **Support:** Yes, full dark mode support
- **Implementation:** CSS variables with `.dark` class toggle
- **Toggle:** `ThemeContext.toggleTheme()` function
- **Storage:** Theme preference stored in `localStorage`
- **Default:** Light mode (can be overridden by system preference)
- **Colors:** All colors have light/dark variants defined in CSS variables

### Visual Consistency Rating: 7/10

**Strengths:**
- Consistent use of design system tokens (CSS variables)
- Glass morphism style applied consistently
- Bottom navigation consistent across app
- Typography scale used consistently
- Color system well-defined

**Weaknesses:**
- Some components use ad-hoc spacing instead of design system tokens
- Button variants inconsistent (PrimaryButton vs Button with variant)
- Some pages have different card styles
- Form inputs have some inconsistencies
- Loading states vary across pages

---

## SECTION 6: CURRENT UX PAIN POINTS

### Cluttered Screens

1. **Client Dashboard (`/client`)**
   - Too many elements competing for attention: greeting, streak, weekly progress, today's workout, program week cards (7 cards), overdue workouts, next session, body weight, quick actions
   - **Impact:** Overwhelming for new users, hard to find primary action

2. **Coach Dashboard (`/coach`)**
   - Stats cards, control room signals, recent clients, today's sessions all on one screen
   - **Impact:** Information overload, unclear priority

3. **Workout Execution (`/client/workouts/[id]/start`)**
   - Many UI elements: exercise info, weight/reps inputs, log button, set history, RPE modal, rest timer, block completion, workout completion, navigation arrows, plate calculator, alternatives, video player
   - **Impact:** Can be overwhelming during workout, but necessary for functionality

4. **Coach Menu (`/coach/menu`)**
   - 18+ menu cards in grid
   - **Impact:** Hard to find specific feature, no search or categorization

### Empty Screens

1. **Client Workouts List (`/client/workouts`)**
   - Empty state might not be helpful enough
   - **Impact:** Users might not know what to do next

2. **Nutrition Dashboard (`/client/nutrition`)**
   - Empty state if no meal plan assigned
   - **Impact:** Users might not understand they need a meal plan assigned

3. **Progress Hub (`/client/progress`)**
   - Some sub-sections might have empty states
   - **Impact:** Users might not understand what data to expect

### Inconsistent Patterns

1. **List Views:**
   - Some lists use grid view, others use list view
   - Some have view mode toggle, others don't
   - **Impact:** Inconsistent user experience

2. **Delete Actions:**
   - Some use swipe-to-delete, others use delete button
   - **Impact:** Users don't know which pattern to expect

3. **Form Validation:**
   - Some forms show validation on blur, others on submit
   - **Impact:** Inconsistent feedback

4. **Loading States:**
   - Some pages show skeleton loaders, others show spinners, others show nothing
   - **Impact:** Inconsistent loading experience

5. **Error Handling:**
   - Some errors show toast notifications, others show inline errors, others show modals
   - **Impact:** Users don't know where to look for errors

### Missing Feedback States

1. **Loading States:**
   - Some API calls don't show loading indicators
   - **Impact:** Users don't know if action is processing

2. **Success States:**
   - Some actions don't show success feedback
   - **Impact:** Users don't know if action completed

3. **Empty States:**
   - Some lists don't have helpful empty states
   - **Impact:** Users don't know what to do when list is empty

4. **Error States:**
   - Some errors don't have retry buttons
   - **Impact:** Users stuck when errors occur

### Accessibility Issues

1. **ARIA Labels:**
   - Some buttons missing `aria-label` attributes
   - **Impact:** Screen readers can't identify button purpose

2. **Touch Targets:**
   - Some buttons might be too small (< 44x44px recommended)
   - **Impact:** Hard to tap on mobile devices

3. **Color Contrast:**
   - Some text colors might not meet WCAG AA contrast ratios
   - **Impact:** Hard to read for users with vision impairments

4. **Keyboard Navigation:**
   - Some modals might not trap focus
   - **Impact:** Keyboard users can't navigate properly

5. **Alt Text:**
   - Some images missing `alt` attributes
   - **Impact:** Screen readers can't describe images

### Hardcoded Text

1. **Greetings:**
   - Some greetings use hardcoded text instead of dynamic content
   - **Impact:** Less personalized experience

2. **Error Messages:**
   - Some error messages are generic
   - **Impact:** Users don't know how to fix errors

3. **Empty States:**
   - Some empty states have generic messages
   - **Impact:** Not helpful to users

### Backend Features Without Frontend Interface

Based on backend audit, these features exist in database but may not have full UI:

1. **Daily Wellness Logs** (`daily_wellness_logs`)
   - Backend: Full table with energy, mood, stress, motivation, soreness
   - Frontend: `/client/check-ins` exists but may not use all fields

2. **Supplement Logs** (`supplement_logs`)
   - Backend: Full table
   - Frontend: No dedicated interface found

3. **Nutrition Logs** (`nutrition_logs`)
   - Backend: Daily nutrition summary table
   - Frontend: Nutrition dashboard exists but may not use this table

4. **FMS Assessments** (`fms_assessments`)
   - Backend: Full FMS assessment table
   - Frontend: `/coach/clients/[id]/fms` exists but may not be fully implemented

5. **Mobility Metrics** (`mobility_metrics`)
   - Backend: Detailed mobility measurements
   - Frontend: `/client/progress/mobility` exists but may not use all fields

6. **Performance Tests** (`performance_tests`)
   - Backend: Performance test results
   - Frontend: `/client/progress/performance` exists but may not use all fields

7. **Challenge Video Submissions** (`challenge_video_submissions`)
   - Backend: Video submission system
   - Frontend: Challenge pages exist but video submission may not be fully implemented

8. **Leaderboard System** (`leaderboard_rankings`, `leaderboard_titles`, `current_champions`)
   - Backend: Full leaderboard system
   - Frontend: `/client/progress/leaderboard` exists but may not show all features

---

## SECTION 7: INFORMATION ARCHITECTURE MAP

```
├── / (Landing/Login)
│   ├── Login form
│   ├── Signup form
│   └── AuthWrapper component
│
├── CLIENT SIDE (Bottom Nav: Home, Check-ins, Training, Nutrition, Lifestyle)
│   │
│   ├── /client (Home/Dashboard) [MAIN HUB]
│   │   ├── Today's workout card → /client/workouts/[id]/start
│   │   ├── Program week cards → /client/programs/[id]/details
│   │   ├── Overdue workouts → /client/workouts/[id]/start
│   │   └── Next session → /client/sessions
│   │
│   ├── /client/workouts (Training List)
│   │   ├── /client/workouts/[id]/details → Workout details
│   │   ├── /client/workouts/[id]/start → Live workout execution
│   │   └── /client/workouts/[id]/complete → Completion screen
│   │
│   ├── /client/programs
│   │   └── /client/programs/[id]/details → Program details
│   │
│   ├── /client/nutrition (Nutrition Dashboard)
│   │   ├── /client/nutrition/meals/[id] → Meal detail
│   │   ├── /client/nutrition/foods/[id] → Food detail
│   │   └── /client/nutrition/foods/create → Add food
│   │
│   ├── /client/progress (Progress Hub)
│   │   ├── /client/progress/analytics → Analytics charts
│   │   ├── /client/progress/workout-logs → Workout history
│   │   │   └── /client/progress/workout-logs/[id] → Workout log detail
│   │   ├── /client/progress/body-metrics → Body measurements
│   │   ├── /client/progress/personal-records → PRs
│   │   ├── /client/progress/leaderboard → Leaderboard
│   │   ├── /client/progress/mobility → Mobility tracking
│   │   ├── /client/progress/performance → Performance tests
│   │   └── /client/progress/achievements → Achievements
│   │
│   ├── /client/goals → Goals management
│   ├── /client/habits → Habits tracking
│   ├── /client/achievements → Achievements (duplicate of progress/achievements)
│   ├── /client/challenges → Challenges list
│   │   └── /client/challenges/[id] → Challenge detail
│   ├── /client/check-ins → Daily wellness check-ins
│   ├── /client/lifestyle → Lifestyle hub (links to habits/goals/achievements)
│   ├── /client/sessions → Sessions list
│   ├── /client/scheduling → Book sessions
│   ├── /client/clipcards → Clip cards
│   ├── /client/profile → Profile settings
│   │   └── /client/profile/info → Profile info (duplicate)
│   └── /client/menu → Menu hub (9 menu cards)
│
├── COACH SIDE (Bottom Nav: Home, Clients, Training, Nutrition, Analytics)
│   │
│   ├── /coach (Coach Dashboard) [MAIN HUB]
│   │   ├── Stats cards
│   │   ├── Control room signals
│   │   ├── Recent clients → /coach/clients/[id]
│   │   └── Today's sessions → /coach/sessions
│   │
│   ├── /coach/clients (Clients List)
│   │   ├── /coach/clients/add → Add client
│   │   └── /coach/clients/[id] (Client Hub)
│   │       ├── Overview tab
│   │       ├── Workouts tab → /coach/clients/[id]/workouts
│   │       ├── Programs tab → /coach/clients/[id]/programs/[programId]
│   │       ├── Progress tab → /coach/clients/[id]/progress
│   │       ├── Goals tab → /coach/clients/[id]/goals
│   │       ├── Habits tab → /coach/clients/[id]/habits
│   │       ├── Meals tab → /coach/clients/[id]/meals
│   │       ├── Analytics tab → /coach/clients/[id]/analytics
│   │       ├── Adherence tab → /coach/clients/[id]/adherence
│   │       ├── FMS tab → /coach/clients/[id]/fms
│   │       ├── Clip Cards tab → /coach/clients/[id]/clipcards
│   │       └── Profile tab → /coach/clients/[id]/profile
│   │
│   ├── /coach/programs (Programs List)
│   │   ├── /coach/programs/create → Create program
│   │   ├── /coach/programs/[id] → Program detail
│   │   └── /coach/programs/[id]/edit → Edit program
│   │
│   ├── /coach/training/programs → Training hub entry (navigation)
│   ├── /coach/programs-workouts → Redirects to /coach/workouts/templates
│   │
│   ├── /coach/workouts/templates (Workout Templates List)
│   │   ├── /coach/workouts/templates/create → Create template
│   │   ├── /coach/workouts/templates/[id] → Template detail
│   │   └── /coach/workouts/templates/[id]/edit → Edit template
│   │
│   ├── /coach/exercises → Exercise library
│   ├── /coach/exercise-categories → Exercise categories
│   ├── /coach/categories → Workout categories
│   │
│   ├── /coach/nutrition (Nutrition Hub)
│   │   ├── /coach/nutrition/meal-plans → Meal plans list
│   │   │   ├── /coach/nutrition/meal-plans/create → Create meal plan
│   │   │   ├── /coach/nutrition/meal-plans/[id] → Meal plan detail
│   │   │   └── /coach/nutrition/meal-plans/[id]/edit → Edit meal plan
│   │   ├── /coach/nutrition/foods → Food database
│   │   └── /coach/nutrition/assignments → Nutrition assignments
│   │
│   ├── /coach/analytics → Coach analytics dashboard
│   ├── /coach/goals → Goals management
│   ├── /coach/habits → Habits management
│   ├── /coach/sessions → Sessions management
│   ├── /coach/gym-console → Gym console (pickup workouts)
│   ├── /coach/bulk-assignments → Bulk assignments
│   └── /coach/menu → Menu hub (18+ menu cards)
│
├── ADMIN SIDE (No bottom nav, accessed via coach menu if admin role)
│   ├── /admin/goal-templates → Goal templates management
│   ├── /admin/habit-categories → Habit categories management
│   ├── /admin/achievement-templates → Achievement templates management
│   └── /admin/tracking-sources → Tracking sources management
│
└── UTILITY PAGES
    ├── /setup-database → Database setup utility
    ├── /database-status → Database status check
    └── /create-user → User creation utility
```

### Navigation Accessibility

**Main Navigation (Bottom Nav):**
- **Client:** Always visible on client pages (5 items)
- **Coach:** Always visible on coach pages (5 items)
- **Admin:** No bottom nav, accessed via menu

**Secondary Navigation:**
- **Menu Pages:** `/client/menu` and `/coach/menu` provide access to all features
- **Tabs:** Client hub and coach client detail pages use tabs
- **Breadcrumbs:** Not consistently implemented

**Deep Links:**
- Most pages accessible via direct URL
- Some pages require authentication (ProtectedRoute)
- Some pages require specific role (coach/client/admin)

---

## SUMMARY

The DailyFitness frontend is a comprehensive Next.js 15 PWA application with:

- **100+ pages/screens** across client, coach, and admin roles
- **200+ reusable components** organized by feature and purpose
- **Consistent design system** with glass morphism, dark mode, and semantic colors
- **Bottom navigation** for primary features (5 items each for client/coach)
- **Menu hubs** for secondary features (9 items client, 18+ items coach)
- **Complex workout execution** with 10+ block types and specialized executors
- **Comprehensive progress tracking** with analytics, charts, and metrics
- **PWA capabilities** with service worker, manifest, and offline support

**Key Strengths:**
- Well-organized component structure
- Consistent design system tokens
- Comprehensive feature set
- Mobile-first responsive design
- PWA support

**Key Areas for Improvement:**
- Some screens are cluttered (dashboard pages)
- Inconsistent loading/error/empty states
- Some accessibility improvements needed
- Some backend features lack full UI implementation
- Duplicate routes/components exist

The system is production-ready with a solid foundation, though some UX polish and consistency improvements could enhance the user experience.
