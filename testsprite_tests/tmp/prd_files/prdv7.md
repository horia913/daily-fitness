# DailyFitness — PRD v7 (Program Schedule & Progression Rules Only)

## CRITICAL: Authentication & Login

**Login URL:** The app's login page is at the ROOT URL `/` (not `/login`).

**Every test MUST begin with these exact login steps:**
1. Navigate to `http://localhost:3000/`
2. The page shows two tabs: "Sign In" and "Sign Up"
3. Click the "Sign In" tab (it may already be selected)
4. Enter email and password in the form fields
5. Click the sign-in button
6. Wait for redirect to `/coach` (the coach dashboard)

**Role:** All tests use a COACH account only.

**IMPORTANT:** There is NO `/login` route. NEVER navigate to `/login`. ALWAYS start at `/`. Every single test must perform its own login — do NOT assume a previous test's session is still active.

---

## CRITICAL: Test Independence

**Every test is fully self-contained.** Each test:
- Logs in fresh at the start
- Creates any data it needs within the test
- Verifies within the same test
- Does NOT depend on any other test's output or data

---

## SCOPE

This PRD covers ONLY program weekly schedule customization and progression rules. Do NOT test:
- Template creation or editing
- Dashboard, client list, or navigation
- Workout assignment
- Anything not explicitly described below

---

## NAVIGATION REFERENCE

### How to reach Programs:
Click "Training" in the bottom nav bar. This goes to `/coach/programs`.

### Program form structure:
The program create/edit form has **3 tabs**:
- Tab 1: Basic Info (name, description, duration, goal, difficulty)
- Tab 2: Weekly Schedule (day cards Mon-Sun, week selector)
- Tab 3: Progression Rules

Tab labels may be hidden on mobile — look for 3 clickable tab icons at the top of the form.

### Week selector:
Inside the Schedule tab, look for week navigation: W1, W2, W3, W4 pills/tabs, or left/right arrows, or a dropdown. This allows switching between weeks to set different schedules per week.

---

## FLOW 1: Create Program with Different Schedules Per Week

**Goal:** Create a 4-week program where Week 1 and Week 2 have DIFFERENT workout schedules, proving per-week customization works.

### Login:
1. Navigate to `http://localhost:3000/`
2. Sign in with coach credentials
3. Wait for redirect to `/coach`

### Create program:
4. Click "Training" in bottom nav
5. Click "Create New" or "+" button

### Tab 1 — Basic Info:
6. Enter name: **"TS Schedule Test"**
7. Enter description: **"Per-week schedule test"**
8. Set duration to **4 weeks**
9. Select any goal and difficulty if fields exist

### Tab 2 — Weekly Schedule (Week 1):
10. Click the second tab (Schedule)
11. Confirm you are on Week 1 (look for W1 selected, or "Week 1" label)
12. Assign templates to days:
    - **Monday:** Select any available workout template
    - **Wednesday:** Select any available workout template
    - **Friday:** Select any available workout template
    - **Tuesday, Thursday, Saturday, Sunday:** Leave as Rest Day
13. Note which templates you selected for Mon/Wed/Fri — you will need to compare with Week 2

### Tab 2 — Weekly Schedule (Week 2):
14. Switch to Week 2 using the week selector (click W2 tab/pill, or next arrow, or select from dropdown)
15. Verify: You are now on Week 2
16. Assign DIFFERENT templates than Week 1:
    - **Monday:** Select any available workout template
    - **Tuesday:** Select any available workout template (this day was Rest in Week 1)
    - **Wednesday:** Select any available workout template
    - **Thursday:** Select any available workout template (this day was Rest in Week 1)
    - **Friday:** Select any available workout template
    - **Saturday, Sunday:** Leave as Rest Day
17. Week 2 now has 5 training days vs Week 1's 3 training days

### Tab 2 — Verify Week 1 unchanged:
18. Switch back to Week 1
19. Verify: Week 1 still shows only Mon/Wed/Fri with templates, and Tue/Thu/Sat/Sun are Rest Day
20. If Week 1 now shows the same schedule as Week 2, note this — it means per-week customization is NOT working (all weeks share the same schedule)

### Save:
21. Click "Save" or "Create Program"
22. Verify: Success message or redirect to program detail page
23. Verify: "TS Schedule Test" appears

---

## FLOW 2: Verify Per-Week Schedule Persisted After Save

**Goal:** Reopen the program created in Flow 1 (or any existing multi-week program) and verify that Week 1 and Week 2 have different schedules.

**Note:** Since tests are self-contained, this test will create its own program first, save it, then reopen it to verify.

### Login:
1. Navigate to `http://localhost:3000/`
2. Sign in with coach credentials
3. Wait for redirect to `/coach`

### Create a program with per-week schedules:
4. Click "Training" in bottom nav
5. Click "Create New" or "+"
6. Tab 1: Enter name **"TS Persist Check"**, description **"Verify schedule saves"**, duration **4 weeks**
7. Tab 2 (Schedule):
   - Week 1: Assign any template to **Monday and Wednesday** only
   - Switch to Week 2: Assign any template to **Monday, Tuesday, Wednesday, Thursday, Friday** (all weekdays)
8. Click "Save" or "Create Program"
9. Verify: Program saved successfully

### Reopen and verify:
10. Navigate to programs list (click "Training" in bottom nav)
11. Find **"TS Persist Check"** in the list and click it
12. Click "Edit Program"
13. Click the Schedule tab (second tab)
14. Verify Week 1: Only Monday and Wednesday have templates assigned
15. Switch to Week 2
16. Verify Week 2: All five weekdays (Mon-Fri) have templates assigned
17. If Week 1 and Week 2 are identical, note this — per-week schedule persistence is broken

---

## FLOW 3: Configure Progression Rules and Save

**Goal:** Create a program and set progression rules, then verify they save.

### Login:
1. Navigate to `http://localhost:3000/`
2. Sign in with coach credentials
3. Wait for redirect to `/coach`

### Create program:
4. Click "Training" in bottom nav
5. Click "Create New" or "+"
6. Tab 1: Enter name **"TS Progression Test"**, description **"Progression rules test"**, duration **4 weeks**
7. Tab 2 (Schedule): Assign any template to Monday and Wednesday (quick setup, just needs some workouts scheduled)

### Tab 3 — Progression Rules:
8. Click the third tab (Progression Rules)
9. Document what you see:
    - Are there input fields for weight progression (%, kg, lb)?
    - Are there input fields for rep progression?
    - Are there input fields for set progression?
    - Is there a per-week breakdown (Week 1→2, Week 2→3, Week 3→4)?
    - Is there a per-exercise breakdown?
    - Or is the tab empty / showing an empty state?

10. If progression fields exist:
    - Set weight progression to **+5** (or +5%, whatever the field accepts)
    - Set rep progression to **+1** if the field exists
    - If per-week configuration is available:
      - Week 1→2: weight +5
      - Week 2→3: weight +0, reps +2
      - Week 3→4: weight +5, reps +0
    - If per-exercise configuration is available, configure at least 2 exercises with different progression values

11. If the tab is empty or has no editable fields, note this as a finding — "Progression Rules tab has no configurable fields"

### Save:
12. Click "Save" or "Create Program"
13. Verify: Program saved successfully

---

## FLOW 4: Verify Progression Rules Persisted After Save

**Goal:** Reopen a program and verify progression rules were saved.

### Login:
1. Navigate to `http://localhost:3000/`
2. Sign in with coach credentials
3. Wait for redirect to `/coach`

### Create program with progression rules:
4. Click "Training" in bottom nav
5. Click "Create New" or "+"
6. Tab 1: Enter name **"TS Prog Persist"**, description **"Check progression saves"**, duration **4 weeks**
7. Tab 2: Assign any template to Monday
8. Tab 3 (Progression Rules): Set any available progression values (weight +5, reps +1, or whatever fields exist)
9. Click "Save"
10. Verify: Program saved

### Reopen and verify:
11. Navigate to programs list (click "Training" in bottom nav)
12. Find **"TS Prog Persist"** and click it
13. Click "Edit Program"
14. Click the Progression Rules tab (third tab)
15. Verify: The progression values you set are still present
16. If the values are gone or reset to defaults, note this — "Progression rules did not persist after save"

---

## FLOW 5: Edit Existing Program Schedule — Change a Day and Verify

**Goal:** Open any existing program, change one day's assignment, save, and verify the change stuck.

### Login:
1. Navigate to `http://localhost:3000/`
2. Sign in with coach credentials
3. Wait for redirect to `/coach`

### Edit program:
4. Click "Training" in bottom nav
5. Click on ANY existing program (the first one in the list is fine)
6. Click "Edit Program"
7. Click the Schedule tab (second tab)
8. Note what is currently assigned to Monday
9. Change Monday: if it has a template, change it to Rest Day. If it's Rest Day, assign any template.
10. Click "Save"
11. Verify: Success message or redirect

### Verify persistence:
12. Click "Training" in bottom nav
13. Click on the same program
14. Click "Edit Program"
15. Click Schedule tab
16. Verify: Monday now shows the value you changed it to (not the original value)

---

## KNOWN PATTERNS

- **Login is at `/` NOT `/login`** — EVERY test starts by logging in at `/`
- **Program form tabs:** 3 tabs in order: Basic Info, Schedule, Progression Rules. Labels may be hidden on mobile — look for 3 clickable tab icons.
- **Week selector:** Inside Schedule tab, look for W1/W2/W3/W4 pills, tabs, prev/next arrows, or dropdown to switch weeks.
- **Bottom nav:** Home, Clients, Training, Nutrition, Analytics
- **Programs list:** Bottom nav → Training
- **Save buttons:** Look for "Save", "Create", "Update", or checkmark icon
- **Loading:** Wait for skeleton loaders to disappear before interacting
- **Empty states:** "No [items] yet" messages are expected, not errors
- **Rest Day:** When no template is assigned to a day, it shows as "Rest Day" or empty
