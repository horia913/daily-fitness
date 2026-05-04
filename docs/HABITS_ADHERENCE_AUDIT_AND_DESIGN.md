# Habits adherence — coach assignment audit & cockpit design (pre-implementation)

This document audits the coach habit assignment stubs, summarizes the database contract for `habit_assignments` / `habit_logs` / `habits`, and proposes how to wire **real** habits adherence into `/coach/clients/[id]/progress` (same patterns as nutrition). **No code changes** in this step.

---

## 1. Coach habit assignment — stub confirmation

### 1.1 Single-habit dialog (`Assign Habit to Client`)

**File:** `src/components/coach/CoachHabitsLibraryPage.tsx`  
**Handler:** `assignHabit` (wired to the primary **Assign Habit** button in the assign dialog).

**Current logic (verbatim):**

```600:612:src/components/coach/CoachHabitsLibraryPage.tsx
  const assignHabit = async () => {
    if (!selectedHabitForAssign || !assignmentForm.client_id) return

    try {
      // In a real app, this would create a UserHabit record
      addToast({ title: `Habit "${selectedHabitForAssign.name}" assigned to client successfully!`, variant: 'default' })
      setAssignDialogOpen(false)
      setSelectedHabitForAssign(null)
    } catch (error) {
      console.error('Error assigning habit:', error)
      addToast({ title: 'Error assigning habit to client', variant: 'destructive' })
    }
  }
```

**Behavior:** Shows a success toast and closes the dialog. **No Supabase insert.** Comment refers to a conceptual “UserHabit” model (aligned with `UserHabit` in `src/lib/habitTracker.ts`), not the actual `habit_assignments` table.

### 1.2 Multi-step batch flow (“Assign Habits” tab)

**Handler:** `confirmAssignment` (Step 3 **Confirm Assignment**).

**Current logic (verbatim):**

```683:703:src/components/coach/CoachHabitsLibraryPage.tsx
  const confirmAssignment = async () => {
    if (selectedHabits.length === 0 || selectedClients.length === 0) {
      addToast({ title: 'Please select at least one habit and one client', variant: 'destructive' })
      return
    }

    try {
      // In a real app, this would create UserHabit records for each client-habit combination
      const habitNames = selectedHabits.map(id => habits.find(h => h.id === id)?.name).join(', ')
      const clientNames = selectedClients.map(id => {
        const client = clients.find(c => c.id === id)
        return client ? `${client.first_name} ${client.last_name}` : ''
      }).join(', ')
      
      addToast({ title: `Successfully assigned ${selectedHabits.length} habit(s) to ${selectedClients.length} client(s)!`, variant: 'default' })
      resetAssignment()
    } catch (error) {
      console.error('Error assigning habits:', error)
      addToast({ title: 'Error assigning habits to clients', variant: 'destructive' })
    }
  }
```

**Note:** `habitNames` / `clientNames` are computed but unused — dead code left from the stub.

**Line reference:** The user message cited “683–691”; in the current file the stub comment spans **690–691**, with the rest of the no-op through **697**.

---

## 2. Intended product flow (from UI, not DB)

| Surface | Route | Flow |
|--------|-------|------|
| Coach habits library | `/coach/goals?tab=habits` → renders `CoachHabitsLibraryPage` (see `src/app/coach/goals/page.tsx`) | **Library** tab: create/edit templates. **Assign Habits** tab: multi-step — select many habits → many clients → set **start date** (+ reminder UI that has **no** `habit_assignments` columns). **Assign** on a card: single habit → pick **one** client, optional custom name/description, **start date**. |
| Client logging | `/client/habits` → `HabitTracker` | Lists **active** `habit_assignments` for `client_id = user.id`; toggle completes/uncompletes **`habit_logs`** for **today’s** `log_date`. |

**Intended writes for “real” assignment:**

- For each **(habit_id, client_id)** pair the coach confirms:
  - **INSERT** into `habit_assignments` with `habit_id`, `client_id`, `start_date` (from form / step 3 settings), optional `end_date` if the product adds it later, `is_active` defaulting to `true` per schema default.

**Batch vs single:** The UI supports **both**: single-dialog one habit × one client; multi-step **many habits × many clients** (Cartesian product of selections), one row per pair unless blocked by constraints.

**Date range:** UI exposes **start_date** only today (`assignmentForm.start_date`, `assignmentSettings.start_date`). **End date** is not in the assignment forms; schema allows `end_date` nullable for “open-ended” assignments.

---

## 3. Schema — `habit_assignments` (canonical snippet)

From **`Supabase Snippet Public Schema Column Inventory.csv`**:

| Column | Type | NULL | Default |
|--------|------|------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `habit_id` | uuid | NO | — |
| `client_id` | uuid | NO | — |
| `start_date` | date | NO | `CURRENT_DATE` |
| `end_date` | date | YES | null |
| `is_active` | boolean | YES | `true` |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

**Related tables (same snippets):**

- **`habit_logs`:** `id`, `assignment_id` (FK → `habit_assignments.id`), `client_id`, `log_date` (date, default `CURRENT_DATE`), `completed_at`, `notes`, `created_at`.
- **`habits` (template):** `id`, `coach_id`, `name`, `description`, `frequency_type`, `target_days`, `is_active`, timestamps.  
  **CHECK (inventory file 4):** `frequency_type` ∈ `('daily','weekly')`; `target_days` between **1 and 7**.

**Constraints / keys (inventory file 1 — treat layout as machine export):** includes **PRIMARY KEY** on `habit_assignments.id`, **FOREIGN KEY** `habit_id` → `habits.id`, and **FOREIGN KEY** on `client_id` (snippet shows `client_id` FK target as null in export — verify in Supabase UI before relying on ON DELETE behavior). **UNIQUE** rows in the export suggest a uniqueness rule involving **`(client_id, habit_id)`** (and possibly `start_date`) — **confirm the exact unique index in Supabase** before implementing bulk assign (duplicate pair + same start may fail).

**RLS (inventory file 2, summary):**

- Coaches: policy **“Coaches can manage assignments for their habits”** — **ALL** when the linked `habits.coach_id = auth.uid()`.
- Clients: **SELECT** own `habit_assignments`; **habit_logs** insert/update scoped to `client_id = auth.uid()` for client writes; coaches can **SELECT** client logs via client relationship policies.

**No `assignHabitToClient` service:** Repository-wide search shows **no** dedicated server helper. `clientAnalyticsService.ts` only **selects** `habit_assignments` / `habit_logs`. Implementation will be **new** Supabase writes from the coach page (or a small shared helper), aligned with RLS.

**Schema drift note:** `CoachHabitsLibraryPage` inserts/updates `habits` with columns such as `icon`, `color`, `category_id`, `unit`, `target_value` (“New columns added by migration”). The **snippet CSV excerpt** for `habits` in this repo may be **incomplete vs production**. Before adherence math uses `target_value`, **re-sync column inventory** with live Supabase.

---

## 4. Client logging path (verified in code)

**File:** `src/components/client/HabitTracker.tsx`

1. Load `habit_assignments` for `client_id = user.id`, `is_active = true`, embed `habits` (name, `frequency_type`, `target_days`).
2. Load recent `habit_logs` by `assignment_id`.
3. **`handleHabitToggle`:** If completing → **`insert`** into `habit_logs` with `assignment_id`, `client_id`, `log_date: today` (UTC `YYYY-MM-DD` from `toISOString().split('T')[0]`). If uncompleting → **`delete`** where `assignment_id` + `log_date` = today.

So logging is **real** once a row exists in `habit_assignments`. The coach stub is the **hard prerequisite** for most clients to ever see assignments.

---

## 5. Walk-through: Horica → Alice (code path)

1. **Navigate:** `/coach/goals?tab=habits` (`page.tsx` switches to `<CoachHabitsLibraryPage />`).
2. **Assign (single):** Open assign dialog via `openAssignDialog(habit)` → choose client / start date → **Assign Habit** → `assignHabit` → **no DB write** (stub).
3. **Assign (batch):** “Assign Habits” tab → steps 1–3 → **Confirm Assignment** → `confirmAssignment` → **no DB write** (stub).
4. **Alice:** `/client/habits` → would see assignments only if rows were created (e.g. manual SQL, seeds, or future fix).

---

## 6. Canonical habits adherence formula (design recommendation)

### 6.1 How `frequency_type` / `target_days` matter

| Template | Meaning in DB | Logging reality |
|----------|----------------|-----------------|
| `daily` | CHECK allows only `daily` / `weekly` in snippet | At most **one** `habit_logs` row per `(assignment_id, log_date)` (unique pair in export). Client UI treats “today” as one check. |
| `weekly` | `target_days` is **1–7** per CHECK — interpret as **“N times per week”** in product copy, not “N days of week mask” | Same logging: still **one row per day** when they check; **HabitTracker** uses `completedDays in last 7` vs `expectedDays = frequency === 'daily' ? 7 : target_days` for a **local completion rate** display. |

**Implication:** For cockpit **adherence**, we should not invent a second logging model. Adherence should be computed from **`habit_logs`** (which days had a completion) plus **expected completions** derived from **assignments + template** for the **Mon–Sun window** (client timezone, same as nutrition).

### 6.2 Recommended weekly formula (aggregate across assignments)

Align with nutrition style: **ratio of completed to expected, capped**, summed across all **active** assignments that overlap the week.

For each **assignment** `a` overlapping calendar day `d` (client TZ):

- **Active on day `d`:** `is_active = true` and `start_date <= d` and (`end_date` is null or `end_date >= d`).
- Join template `habits` for `frequency_type` and `target_days`.

**Expected completions in the Mon–Sun week** (per assignment):

- **Daily:** `expected_a =` number of days in Mon–Sun that are **≥ `start_date`** and **≤ `end_date` if set**, and **≤ today** if we only count elapsed days in the current week (match nutrition: past + today are “slots”; future days optional — **product call**: recommend **count only days ≤ client-local today** within the week for expected, so the week-to-date score can rise through Sunday; **alternative**: full 7 days expected — document choice at implement time).
- **Weekly:** `expected_a = target_days` for that week (capped at 7), optionally only counting weeks where the assignment is active for at least one day (same as daily overlap).

**Completed in week** (per assignment):

- Count `habit_logs` where `log_date` falls Mon–Sun, `client_id` matches, `assignment_id = a.id`, and optionally `completed_at` not null.

**Aggregate:**

- `weekly_adherence = round( 100 * sum_a min(completed_a, expected_a) / sum_a expected_a )` when `sum expected > 0`, else **null** for trend / “no plan” semantics.

**Per-day strip (`habit_day_strip`):** align with user’s “simplest meaningful signal” option:

- `has_slot`: that calendar day has **≥1** active assignment whose **expected > 0 for that day** under the chosen daily/weekly rule (daily → slot each active day; weekly → slot only on days we treat as “could log” **or** simpler: **has_slot true** for every day the week overlaps any active assignment, and “done” = **≥1** log that day for **any** assignment — **weakest but visualizable**).
- **Recommended `done`:** `done =` (count of logs that day for any active assignment) **≥ 1** **if** that day is a “required” day for at least one habit **OR** (simpler) **`done =`** logged **any** habit on that day when `has_slot` is true for “any active assignment on that day”.

**Explicit simpler alternative (easier to explain to coaches):**

- **Day strip:** `has_slot` = any active assignment on that day; `done` = **any** `habit_log` on that day for those assignments.
- **Week %:** `sum(logs in week across assignments) / sum(expected_week across assignments)` with **per-assignment weekly expected** as above and **min(cap)** like nutrition.

**Multiple habits:** Always **one combined %** for the tile and trend (coach signal: “how did habits go this week overall?”). Per-habit drill-down can be a later enhancement.

**Historical trend:** `habits: number | null` — **`null`** when `sum(expected) === 0` that week (no overlapping active assignments), else **0–100**. Chart draws **gaps** for `null` (same as nutrition).

---

## 7. API integration plan (`src/app/api/coach/analytics/adherence/route.ts`)

**Extend** the existing GET handler (mirror nutrition batching):

1. **Queries (batched, no N+1):**
   - `habit_assignments`: filter `client_id IN (...)`, fetch columns needed: `id`, `client_id`, `habit_id`, `start_date`, `end_date`, `is_active` — widen window to **overlap trend** (`trendStartStr` … `today`) plus active flags (same spirit as meal plans).
   - `habits`: `.in('id', habitIdsFromAssignments)` for `frequency_type`, `target_days` (and any extra columns **only** if confirmed in schema).
   - `habit_logs`: `.in('client_id', clientIds)`, `log_date >= trendStartStr`, `log_date <= todayStr` (and/or join filter by assignment ids).

2. **In-memory structure:**
   - Map `client_id → assignments[]` (with template).
   - Map `assignment_id → logs by log_date`.
   - For each client + Mon–Sun week start, compute **`habit_adherence`**, **`habit_assigned_required`**, **`habit_completed_required`**, **`habit_day_strip[]`** (`day_of_week` 0–6 Mon–Sun, `has_slot`, `done`, optional `completed`/`expected` ints if you want parity with nutrition cells).

3. **`weekAdherence` merge:** Same pattern as nutrition: merge onto existing `weekAdherence` rows by `client_id`, and **append** synthetic rows for clients without a program row so roster clients still get habit fields.

4. **`historicalAdherence`:** Replace `habits: null` with `habits: number | null` per week.

5. **`habitTrackedIds`:** **Keep as-is** today — derived only from **`habit_assignments`** rows (`is_active = true`) in the current route. (If product wants “goals pillar = habits” parity with nutrition, that would be a **separate** explicit change.)

---

## 8. Cockpit consumer (`OptimizedAdherenceTracking.tsx`)

- Replace **`habitAdherence: 0`** with server `weekRow.habit_adherence` when **`habitTracked`** (and optionally **`habit_assigned_required > 0`** for tile parity with nutrition’s `nutritionHasWeeklyPlan` — **recommend** same pattern to avoid “0%” when tracked by stale assignment with no expectation).
- Build **`weeklyData[].habit`** from **`habit_day_strip`** (not hardcoded `habit: false`), with calendar visuals:
  - Not tracked → row muted / N/A (match nutrition).
  - `has_slot: false` → muted N/A.
  - Past days, slot, not done → red X; done → green; today → highlight; future → neutral outline.

- **`historicalAdherence` typing:** `habits: number | null` instead of `null` only.

---

## 9. Trend chart (`AdherenceTrendChart.tsx`)

- Extend **`HistoricalTrendDataPoint`** with **`habits: number | null`**.
- **Fourth line:** e.g. **purple** or **amber** (distinct from workout blue, check-in teal, nutrition green).
- **Gaps:** reuse the same “path with pen-up on null” approach as nutrition.
- Legend + tooltip line for habits when non-null.

---

## 10. What blocks implementation

| Blocker | Severity |
|---------|----------|
| Coach assignment stubs | **Hard** — without inserts, most clients have no assignments; adherence stays empty / “Not tracked”. |
| Unique constraint on `(client_id, habit_id[, start_date])` | **Medium** — bulk assign must handle conflicts (skip, upsert, or deactivate old row). |
| **Daily vs weekly expected** definition | **Medium** — needs a one-paragraph product rule (especially weekly + which days count as “slots” on the 7-day strip). |
| Snippet vs live `habits` columns | **Low** — confirm before using `target_value` in formulas. |

---

## 11. Work units & rough complexity

| # | Unit | Complexity | Notes |
|---|------|------------|-------|
| 1 | **Replace assignment stubs** | **M** | Not a one-liner: single + batch paths, error handling, possible unique-constraint handling, toasts on partial failure. Optional small `assignHabitsToClients()` helper. No existing service. |
| 2 | **Extend adherence API** | **M** | Same class as nutrition block: batch queries, week + 8-week trend, merge onto `weekAdherence`. |
| 3 | **OptimizedAdherenceTracking mapper + calendar** | **S–M** | Mirror nutrition strip; fix `habit: false` loop. |
| 4 | **AdherenceTrendChart** | **S** | Clone nutrition gap path for habits. |

**Total:** ~**3–5 dev days** calendar time depending on QA and constraint edge cases (not wall-clock AI).

---

## 12. Gotchas

1. **Weekly habits on a daily calendar strip:** If `done = any log that day`, a client could satisfy “3× week” with three logs on one day — the **strip looks green** those days and **gray** others; the **weekly %** should still use **weekly expected** (e.g. cap completed at expected per week) so the headline isn’t fooled by 10 logs in one day.
2. **`habit_logs` delete on toggle:** Uncomplete removes today’s row — adherence recomputes correctly.
3. **`log_date` vs timezone:** Client uses **UTC date string** for today in `HabitTracker`. Cockpit should use **client profile timezone** for Mon–Sun and “today” to avoid off-by-one vs nutrition/workout.
4. **`habit_tracking_summary` view:** Exists in snippets with `expected_completions` / `completion_percentage` — optional future read path; initial implementation can stay on base tables for parity with nutrition approach.
5. **Headline `/coach/progress` Avg Adherence:** Out of scope here; prior decision was **workout-only** — habits should follow same **explicit** choice unless product revisits.

---

## 13. Approvals checklist (before coding)

- [ ] Confirm **unique constraint(s)** on `habit_assignments` in live DB.  
- [ ] Pick **weekly expected** rule for `weekly` frequency (and whether future days count in the current week).  
- [ ] Confirm **tile** uses `habitTrackedIds` only vs also require `habit_assigned_required > 0` (nutrition parity).  
- [ ] Replace **both** stubs (`assignHabit` and `confirmAssignment`) in one milestone or split single vs batch.

---

*Document generated from repo state; re-verify CSV snippets against Supabase before implementation.*
