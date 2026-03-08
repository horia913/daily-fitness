# Coach IA Target and Gap Map

**Purpose:** Define target information architecture (IA) for the coach product and map existing routes/screens to it. No implementation; analysis and documentation only.  
**Context:** Coach app is messy; moving toward high-volume coach workflow (40+ clients). Scheduling must be removed from the product surface (no nav, no primary flows).  
**Lock:** Phase 1 — no code changes, no recommendations; gaps and “what must be true” only.

---

## 1) Target IA Definition

Target Coach IA (5 pillars):

1. **Home (Control Room)** — signal-only dashboard: percentages, flags; no full client detail here.
2. **Clients** — searchable list; primary entry to client-specific drill-down.
3. **Training / Coaching** — programs, templates, assignments, progression rules.
4. **Nutrition** — meal plans and meal plan assignments.
5. **Scheduling** — **removed** from product surface (no nav, no primary flows).

**Client-specific drill-down** must live in a **Client Mini Hub** (the existing client details screen can serve this). Full details (workouts, programs, progress, meals, etc.) live inside the client page, not on the dashboard.

**Dashboard** must stay minimal: only percentages + flags; “who needs attention?” and “who is about to finish program / needs new assignment?” type signals. Full definitions of percentages are documented as current-state only; no single choice yet.

---

## 2) Mapping: Target Pillar → Existing Routes/Screens

### Home (Control Room)

| Existing route/screen | Fit | Note |
|----------------------|-----|------|
| `/coach` (dashboard) | **KEEP** | Current dashboard. Fits “Home” but is not yet signal-only: shows stats (active/total clients, today sessions count, templates, meal plans), today’s sessions list, recent clients. Has hardcoded “At Risk” = 0. No compliance/percentage signals from API. |
| — | **GAP** | No dashboard API or RPC that returns “who needs attention” or “who is about to finish program / needs new assignment.” No percentage signals (e.g. compliance, adherence) on dashboard today. |

**Candidates to demote/remove from nav (for Home):** None specifically; the current dashboard is the only “Home” screen. Quick links on dashboard to Schedule and Sessions point to scheduling-related flows that are **candidates to demote** per target (scheduling removed from surface).

---

### Clients

| Existing route/screen | Fit | Note |
|----------------------|-----|------|
| `/coach/clients` | **KEEP** | Clients list; primary entry for client drill-down. |
| `/coach/clients/add` | **KEEP** | Add client. |
| `/coach/clients/[id]` | **KEEP** | Client Mini Hub — overview, stats, tabs/links to workouts, programs, profile, progress, goals, habits, meals, analytics, adherence, clipcards, fms. |
| `/coach/clients/[id]/workouts` | **KEEP** | Client workouts view (under Client Mini Hub). |
| `/coach/clients/[id]/programs/[programId]` | **KEEP** | Client program details (under Client Mini Hub). |
| `/coach/clients/[id]/profile` | **KEEP** | Client profile (under Client Mini Hub). |
| `/coach/clients/[id]/progress` | **KEEP** | Client progress (under Client Mini Hub). |
| `/coach/clients/[id]/goals` | **KEEP** | Client goals (under Client Mini Hub). |
| `/coach/clients/[id]/habits` | **KEEP** | Client habits (under Client Mini Hub). |
| `/coach/clients/[id]/meals` | **KEEP** | Client meals (under Client Mini Hub). |
| `/coach/clients/[id]/analytics` | **KEEP** | Client analytics (under Client Mini Hub). |
| `/coach/clients/[id]/adherence` | **KEEP** (or **candidate to demote** if merged with compliance) | Client adherence view. Currently separate from Compliance; product may later unify. |
| `/coach/clients/[id]/clipcards` | **KEEP** | Client clip cards (under Client Mini Hub). |
| `/coach/clients/[id]/fms` | **KEEP** | FMS (under Client Mini Hub). |

**Candidates to demote/remove from nav:** None for Clients pillar; all are under Client Mini Hub or list. **GAP:** Searchable list — current clients list may or may not have robust search; confirm for 40+ clients.

---

### Training / Coaching

| Existing route/screen | Fit | Note |
|----------------------|-----|------|
| `/coach/programs` | **KEEP** | Programs list. |
| `/coach/programs/create` | **KEEP** | Create program. |
| `/coach/programs/[id]` | **KEEP** | Program view. |
| `/coach/programs/[id]/edit` | **KEEP** | Program edit (schedule, progression rules). |
| `/coach/workouts/templates` | **KEEP** | Workout templates list (reached via `/coach/programs-workouts` redirect). |
| `/coach/workouts/templates/create` | **KEEP** | Create template. |
| `/coach/workouts/templates/[id]` | **KEEP** | Template view. |
| `/coach/workouts/templates/[id]/edit` | **KEEP** | Template edit. |
| `/coach/programs-workouts` | **Candidate to demote/remove from nav** | Only redirects to `/coach/workouts/templates`. Redundant with having “Programs” and “Workouts” (templates) both in nav; can be a single “Training” or “Workouts” entry later. |
| `/coach/gym-console` | **KEEP** | Pickup / mark complete; core coaching flow. Not in bottom nav today; reachable via Menu or link. |
| `/coach/bulk-assignments` | **KEEP** | Bulk assignments. |
| `/coach/exercises` | **KEEP** | Exercise library (support for training). |
| `/coach/exercise-categories` | **KEEP** | Exercise categories. |
| `/coach/categories` | **KEEP** | Workout categories. |

**Candidates to demote/remove from nav:**  
- **Programs–Workouts** as a separate bottom nav item that only redirects to templates (redundant with “Programs” and templates).  
**GAP:** Single clear “Training” or “Programs + Workouts” entry in nav that matches target pillar (no implementation recommendation here).

---

### Nutrition

| Existing route/screen | Fit | Note |
|----------------------|-----|------|
| `/coach/nutrition` | **KEEP** | Nutrition dashboard (meal plans, assignments). |
| `/coach/nutrition/meal-plans` | **KEEP** | Meal plans list (if present as route). |
| `/coach/nutrition/meal-plans/create` | **KEEP** | Create meal plan. |
| `/coach/nutrition/meal-plans/[id]` | **KEEP** | Meal plan view. |
| `/coach/nutrition/meal-plans/[id]/edit` | **KEEP** | Meal plan edit. |

**Candidates to demote/remove from nav:** None for Nutrition pillar.  
**GAP:** None identified for Nutrition pillar structure.

---

### Scheduling (REMOVED from surface)

| Existing route/screen | Fit | Note |
|----------------------|-----|------|
| `/coach/scheduling` | **Candidate to demote/remove from nav** | Scheduling; target is to remove from product surface. |
| `/coach/sessions` | **Candidate to demote/remove from nav** | Sessions list; scheduling-related. |
| `/coach/availability` | **Candidate to demote/remove from nav** | Availability for session bookings. |

Dashboard currently links to “Schedule” (`/coach/scheduling`) and “View All” sessions (`/coach/sessions`). “Today’s Schedule” and today’s sessions are part of dashboard data; target says no scheduling as primary surface — so these routes are **candidates to demote/remove from nav** and from primary dashboard prominence. (No implementation step here; mark only.)

---

### Other (Analytics, Compliance, Adherence, Progress, Reports, Menu, etc.)

| Existing route/screen | Fit | Note |
|----------------------|-----|------|
| `/coach/compliance` | **KEEP** (or merge later) | Compliance dashboard — real data. Overlaps in concept with Adherence; product may unify. For this phase: **KEEP**; mark as **candidate to demote from nav** if merged into Client Mini Hub or a single “Insights” area later. |
| `/coach/adherence` | **Candidate to demote/remove from nav** | Adherence overview — **mock data**. Redundant with Compliance in naming; until real data and definition are aligned, can be demoted or merged. |
| `/coach/analytics` | **KEEP** | Analytics/reporting. May feed “signals” for Control Room later. |
| `/coach/progress` | **KEEP** (or merge) | Client progress monitoring. Overlaps with Analytics; **candidate to demote from nav** if merged into Analytics or Client Mini Hub. |
| `/coach/reports` | **Unclear** | Reports; distinction from Analytics/Progress not defined. **Open question** for Phase 2. |
| `/coach/goals` | **KEEP** | Goals (coach-level). Could live under Clients or Training depending on product choice. |
| `/coach/habits` | **KEEP** | Habits (coach-level). Same as above. |
| `/coach/meals` | **KEEP** | Meals (coach-level). May align with Nutrition. |
| `/coach/clipcards` | **KEEP** | Clip cards (coach-level). |
| `/coach/notifications` | **KEEP** | Notifications. |
| `/coach/challenges` | **KEEP** | Challenges. |
| `/coach/achievements` | **KEEP** | Achievements. |
| `/coach/profile` | **KEEP** | Coach profile. |
| `/coach/menu` | **KEEP** | Menu (hub to all sections). Target IA may reduce primary nav items and keep Menu for secondary access. |

---

## 3) “What Must Be True” for the Final Coach Dashboard (Control Room)

- **Minimal, signal-only:** Dashboard shows only high-level signals (percentages, flags, counts), not full client detail. Full detail lives in Client Mini Hub.
- **Percentages (current definitions — document only; do not choose yet):**
  - **Client hub compliance %:** `(weeklyProgress.current / weeklyProgress.goal) * 100`; goal = program current-week slots or workout_assignments in local week; current = workout_logs completed in that local week. Week = Monday–Sunday **local** (browser).
  - **Compliance dashboard (coach-wide):** Workout = (workout_logs in period / workout_assignments in period)*100; nutrition = (days with meal_completions / daysInPeriod)*100; habit = similar. Period = **UTC** (this_week, this_month, last_4_weeks).
  - **Adherence page:** No current definition (mock). When real, definition must be decided (align with compliance or week-lock).
- **“Who needs attention?”:** Not implemented today. Dashboard has no API or RPC that returns “at risk” or “needs attention” clients; “At Risk” is hardcoded 0. For target: some signal (e.g. low compliance, missed sessions) must be defined and sourced from data.
- **“Who is about to finish program / needs new assignment?”:** Not implemented on dashboard. Program completion state lives in program_progress and program_day_completions; no dashboard summary of “clients near program end” or “needs new assignment.” For target: this must be defined and sourced (e.g. from program_progress + program_schedule, or from a dedicated RPC).

---

## 4) Open Questions (Must Be Answered Before Implementation Planning — Phase 2)

1. **Dashboard data contract:** What exact signals (percentages, flags, counts) will the Control Room show? Which are per-client vs coach-wide? What is the single definition of “compliance” vs “adherence” for the product?
2. **“At Risk” / “Needs attention”:** How is “at risk” or “needs attention” defined (e.g. compliance threshold, days since last workout, program stalled)? Which tables/APIs will supply this?
3. **“About to finish program / needs new assignment”:** How is “about to finish” defined (e.g. N days left, last week of program)? Where will this come from (program_progress, program_schedule, RPC)?
4. **Timezone for dashboard:** Use server date only, or coach timezone for “today” and “this week”? Same for client hub “this week” (local vs UTC)?
5. **Scheduling removal:** Confirm scope: remove from nav only, or also remove “Today’s Schedule” from dashboard? If removed from dashboard, what replaces that space (signals only)?
6. **Compliance vs Adherence:** Unify into one surface and one term, or keep two with clear definitions? When will Adherence page use real data?
7. **Analytics vs Progress vs Reports:** Final distinction and which stays in primary nav (if any)?
8. **Client list at 40+ clients:** Is the current clients list searchable and performant enough, or is search/filter a required gap to close?
9. **Programs–Workouts in nav:** Single “Training” entry (programs + templates) or keep separate “Programs” and “Workouts” (templates)? What happens to `/coach/programs-workouts` redirect?
10. **Menu vs bottom nav:** Which routes remain in bottom nav vs only in Menu for high-volume coach workflow?

---

**Document version:** 1.0  
**Generated from:** Coach As-Is System Map and target IA definition; no code changes.
