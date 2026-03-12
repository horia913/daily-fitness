# Achievements, Leaderboards & Challenges — Complete Current State Audit

**Date:** March 2026  
**Scope:** READ-ONLY audit of achievements, leaderboards, and challenges (templates, unlocking, display, notifications) for client and coach.  
**No files were modified.**

---

## PART 1: ACHIEVEMENTS SYSTEM

### 1A. Achievement Templates (Definition Layer)

**Sources:** `achievement_templates` table (schema), `src/lib/achievementService.ts`, `src/app/admin/achievement-templates/page.tsx`, `src/lib/achievements.ts` (hardcoded definitions).

| Question | Answer |
|----------|--------|
| **What achievement templates exist?** | Templates are stored in `achievement_templates`. There is **no seed/migration** that inserts rows; templates are created only via the **admin** UI at `/admin/achievement-templates`. If no admin has created any, the table is empty. |
| **What fields does each template have?** | From schema: `id`, `name`, `description`, `icon`, `category`, `achievement_type`, `is_tiered`, `tier_bronze_threshold`/`tier_bronze_label`, same for silver/gold/platinum, `single_threshold`, `is_active`, `created_at`, `updated_at`. |
| **Are templates coach-specific or global?** | **Global.** Table has no `coach_id`; RLS allows SELECT for all and INSERT/UPDATE for coach/admin (policies: `achievement_templates_insert_coach_admin`, `achievement_templates_update_coach_admin`). |
| **Can coaches create/edit/delete achievement templates?** | **Admin only** in code: template CRUD lives in `src/app/admin/achievement-templates/page.tsx`. Coaches have no dedicated template management UI; the coach achievements page does not offer create/edit templates. |
| **What TYPES of achievements are supported?** | In **achievementService** metric logic: `workout_count`, `streak_weeks`, `pr_count`, `program_completion`, `total_volume` (returns 0, not implemented). Admin page uses types: `workout_count`, `streak`, `personal_record`, `program_completion`, `volume`, `weight_lifted`, `custom` — **naming mismatch**: service uses `streak_weeks` and `pr_count`, so templates with `streak` or `personal_record` may never match. |
| **How many templates exist in seed/migration?** | **Zero.** No migration inserts into `achievement_templates`. |

**Additional:** `src/lib/achievements.ts` defines a **separate, hardcoded** list `ACHIEVEMENTS` (categories: activity, performance, volume, endurance, transformation, lifestyle) with fixed tiers. This is **not** from the DB and is used only by `WorkoutAnalytics` and `LifestyleAnalytics` for display. So there are **two sources of truth**: DB templates (admin + achievementService) and hardcoded list (analytics components).

---

### 1B. Achievement Unlocking (Logic Layer)

**Sources:** `src/lib/achievementService.ts`, `src/lib/completeWorkoutService.ts`, `src/lib/progressTrackingService.ts`.

| Question | Answer |
|----------|--------|
| **WHEN are achievements checked?** | (1) **Workout completion:** `completeWorkoutService` (Step 7) calls `AchievementService.checkAndUnlockAchievements(clientId, 'workout_count')` and `checkAndUnlockAchievements(clientId, 'streak_weeks')`. (2) **PR creation:** `progressTrackingService` `PersonalRecordsService.upsertPersonalRecord` calls `checkAndUnlockAchievements(clientId, 'pr_count')`. **Not** triggered: check-in completion, goal completion, program completion (as a trigger), body metrics, challenges, leaderboard. |
| **HOW is the check performed?** | Service loads active templates from `achievement_templates`, filters by `achievement_type`, gets current metric via `getCurrentMetricValue(clientId, achievementType)` (workout_logs count, streak, personal_records count, program_assignments completed, or 0 for total_volume), compares to tier/single thresholds, and for each newly met tier calls `unlockAchievement` (insert into `user_achievements`). |
| **Exact code path trigger → check → unlock** | Complete workout: `POST /api/complete-workout` → `completeWorkout()` → after ledger/sync, `AchievementService.checkAndUnlockAchievements(clientId, 'workout_count')` and `'streak_weeks'`; each inserts into `user_achievements` when threshold met. PR: `progressTrackingService.upsertPersonalRecord` → after insert, `checkAndUnlockAchievements(clientId, 'pr_count')`. |
| **When an achievement is unlocked, what happens?** | A row is created in **`user_achievements`** with `client_id`, `achievement_template_id`, `tier` (or null for non-tiered), `metric_value`, `achieved_date`, `is_public`; also `user_id` and `achievement_id` are set to client_id and template id. **No** row is written to the `achievements` table. **No** in-app modal, **no** toast, **no** call to `notifyAchievementEarned` or OneSignal. |
| **Relationship between `achievements` and `user_achievements`** | **Two separate systems.** `achievements`: legacy/generic (title, achievement_type, goal_id, workout_id); used by dashboard `getRecentAchievements`, coach achievements page, and `lib/metrics/achievements.ts`. `user_achievements`: template-based, tiered; used by `achievementService` and client `/client/progress/achievements` page. The completion flow **only** writes to `user_achievements`. Dashboard “recent achievements” read from `achievements`, so they stay empty unless something else writes there. |
| **Can an achievement be “upgraded” (e.g. bronze → silver)?** | **Yes, additively.** Unique constraint on `user_achievements` is `(client_id, achievement_template_id, tier)`. When the user reaches silver, a **new** row is inserted for the same template with `tier = 'silver'`. Multiple rows per template (one per tier) are allowed. |
| **Achievements that should be checked but aren’t?** | Check-in streaks, goal completion, body metrics / weight goal, program_completion (as a trigger after program completion), total_volume, challenge completion, leaderboard rank. Only workout_count, streak_weeks, and pr_count are wired. |

---

### 1C. Achievement Display (Client UI)

**Sources:** `src/app/client/progress/achievements/page.tsx`, `src/components/ui/AchievementCard.tsx`, progress hub.

| Question | Answer |
|----------|--------|
| **What does the achievements page show?** | Grid of achievement cards; summary counts (Unlocked / In Progress / Locked); filters by Status (All, Unlocked, In Progress, Locked) and Rarity (mapped from category). |
| **Per card: what info is displayed?** | Name, icon (from template or 🏆), description + next tier/target text, rarity (from category), unlocked state, progress % (for in-progress/unlocked), requirement text (e.g. “12/25 for Silver”). |
| **Is the data REAL from the database?** | **Yes.** Page calls `AchievementService.getAchievementProgress(user.id)`, which uses `achievement_templates` and `user_achievements`. If there are no templates, the grid is empty. |
| **Are locked achievements shown?** | **Yes.** All templates are shown; locked ones have `status === 'locked'`, no progress bar, and requirement text like “0/10 for Bronze”. |
| **Progress indicator for tiered?** | **Yes.** e.g. “12/25 for Silver”, progress bar, “Unlocked: Bronze” when applicable. |
| **How are achievements categorized?** | By template `category`; UI maps category to “rarity” (e.g. milestone→common, activity→uncommon). |
| **Is `/client/achievements` a duplicate of `/client/progress/achievements`?** | **No.** Only route found is `src/app/client/progress/achievements/page.tsx`. There is no `/client/achievements` page. |

---

### 1D. Achievement Notifications & Celebrations

**Sources:** `AchievementUnlockModal`, complete-workout API and client complete page, `notificationHelpers`, `onesignalSender`, `notificationTriggers`.

| Question | Answer |
|----------|--------|
| **When an achievement is unlocked, what does the client SEE?** | **Nothing.** The complete-workout API does not return `newlyUnlocked`; the client complete page does not call the modal or show any achievement message. `AchievementUnlockModal` exists but is **never imported or used** in the unlock flow. |
| **Modal / toast / push / completion screen?** | **Modal:** Component exists; not used on unlock. **Toast:** None. **Push:** `notifyAchievementEarned` and `OneSignalSender.sendAchievement` exist but are **never called** from `achievementService` or `completeWorkoutService`. **Completion screen:** No achievement section. |
| **Current notification experience** | **None.** Unlocks are silent (DB only). |
| **Does the coach see when a client unlocks an achievement?** | **No.** Coach achievements page reads from `achievements` table and uses **mock** template data for the list; client achievements are from `achievements` (not `user_achievements`), and that table is not written by the unlock flow. |
| **Achievement notification history?** | **No.** No in-app history of “achievements you may have missed.” |

---

### 1E. Coach-Side Achievements

**Sources:** `src/app/coach/achievements/page.tsx`.

| Question | Answer |
|----------|--------|
| **Can coaches see which achievements their clients have earned?** | Page **intends** to: it fetches from `achievements` (not `user_achievements`) and expects client data. Because the app only writes to `user_achievements`, the `achievements` table is not updated by the current flow, so coach view is effectively empty or stale. |
| **Can coaches create achievement templates?** | **No.** Template CRUD is only in `/admin/achievement-templates`. Coach “Create template” UI is not implemented; templates list is **hardcoded mock data** (e.g. “Workout Master”, “Streak Legend”, “Weight Loss Champion”) in the coach page, not from DB. |
| **Is this page real or placeholder?** | **Hybrid:** Real fetch from `achievements` table; template list and creation are **placeholder/mock**. |

---

## PART 2: LEADERBOARD SYSTEM

### 2A. Leaderboard Data Layer

**Sources:** Schema (`leaderboard_entries`, `leaderboard_rankings`, `leaderboard_titles`, `current_champions`), `src/lib/leaderboardService.ts`, `src/lib/progressStatsService.ts`, migration for `current_champions` view.

| Question | Answer |
|----------|--------|
| **What leaderboard categories exist?** | **leaderboard_entries:** `leaderboard_type` (e.g. pr_1rm, pr_3rm, pr_5rm, bw_multiple, tonnage_week/month/all_time), `time_window`. **leaderboard_rankings:** `category`, `sex_filter`, `time_filter` (weekly, monthly, yearly, all_time). Two different tables; client UI uses **leaderboard_entries** only. |
| **How are scores calculated?** | **leaderboardService** has helpers: `calculatePRForExercise` (best weight for rep target from workout_set_logs), `calculateBWMultiple` (PR/bodyweight), `calculateTonnage` (sum weight×reps in window). These are **never** used to write rows; they only support hypothetical reads. |
| **How often are rankings updated?** | **Never by app code.** No code path inserts or updates `leaderboard_entries` or `leaderboard_rankings`. Leaderboards are empty unless populated by a cron/trigger not in this repo. |
| **What is `current_champions`?** | A **view** on `leaderboard_rankings` where `rank = 1`, joining profiles. Used for “current champion” per category/sex. Depends on `leaderboard_rankings` being populated (which it isn’t in app). |
| **What are leaderboard_titles?** | Table: `client_id`, `category`, `sex_filter`, `rank`, `title`, `earned_at`, `lost_at`, `duration_days`. Intended for titles (e.g. “Champion”) and when they were earned/lost. **No code** in the app reads or writes this table. |
| **earned_at / lost_at on leaderboard_titles?** | Schema supports it; no app logic implements title transfer or “lost_at” when someone else takes the lead. |
| **Time windows?** | **leaderboard_entries:** `time_window` (this_week, this_month, all_time in service). **leaderboard_rankings:** `time_filter` (weekly, monthly, yearly, all_time). |
| **sex_filter?** | **leaderboard_rankings** has `sex_filter` (M/F/null). **leaderboard_entries** has no sex_filter; leaderboardService and client UI don’t filter by sex. |
| **leaderboard_visibility on client profile?** | **leaderboardService** has `updateLeaderboardVisibility(clientId, 'public'|'anonymous'|'hidden')` updating `profiles`. Client leaderboard page shows `entry.is_anonymous ? "Anonymous" : entry.display_name`. So display name/anon is supported **if** entries existed; entries are never created by the app. |

---

### 2B. Leaderboard Display (Client UI)

**Sources:** `src/app/client/progress/leaderboard/page.tsx`, `src/lib/leaderboardService.ts`.

| Question | Answer |
|----------|--------|
| **What does the leaderboard page show?** | “Global ranks” for selected exercise and metric (1RM/3RM/5RM/tonnage); time window (This Month / This Week / All Time); lift set A/B or custom exercise; table with rank, display name (or “Anonymous”), score, highlight for current user. |
| **Is the data REAL from the database?** | **Yes** — it reads from `leaderboard_entries` via `getLeaderboard()`. Because **no code writes** to `leaderboard_entries`, the list is **always empty** in practice. |
| **Filters?** | Category (exercise + metric type), time period, lift set or custom exercise. All functional against the query. |
| **Current user highlighted?** | **Yes.** `currentUserEntry` and border/emphasis for `entry.client_id === user?.id`. |
| **“View My Rank”?** | No separate button; “You’re #X of Y” and score appear when `currentUserEntry` exists. |
| **Anonymous clients?** | **Yes.** `entry.is_anonymous ? "Anonymous" : entry.display_name`. |
| **Podium / top-3 visual?** | **Yes.** Top 3 get distinct styling (gold/silver/bronze-style circles). |

---

### 2C. Leaderboard Population

| Question | Answer |
|----------|--------|
| **What triggers a leaderboard entry to be created/updated?** | **Nothing in the app.** No inserts/updates to `leaderboard_entries` or `leaderboard_rankings` in the codebase. |
| **Service that recalculates rankings?** | **No.** `leaderboardService` only reads and provides calculation helpers (PR, tonnage, BW multiple); it does not write. |
| **Are rankings currently populated?** | **No.** Client leaderboard and progress stats (leaderboard rank / total athletes) will show empty or zero unless an external process fills the tables. |

---

## PART 3: CHALLENGE SYSTEM

### 3A. Challenge Creation (Coach Side)

**Sources:** `src/app/coach/challenges/page.tsx`, `src/app/coach/challenges/[id]/page.tsx`, `src/lib/challengeService.ts`.

| Question | Answer |
|----------|--------|
| **Can a coach create a challenge?** | **No.** “Create Challenge” button shows toast: “This feature is in development.” No form, no API that inserts into `challenges`. |
| **What fields would a challenge have?** | Schema: `created_by`, `challenge_type` (coach_challenge | recomp_challenge), `name`, `description`, `start_date`, `end_date`, `program_id`, `recomp_track` (fat_loss | muscle_gain | both), `reward_*`, `requires_video_proof`, `max_participants`, `is_public`, `status`. |
| **Challenge types?** | `coach_challenge`, `recomp_challenge`. |
| **Scoring categories?** | Table `challenge_scoring_categories` exists (category_name, exercise_id, scoring_method, weight_percentage). **No UI** to define them when creating a challenge; creation is unimplemented. |
| **Link to program?** | `program_id` FK exists; no create flow to set it. |
| **Recomp track?** | Field exists; used when client **joins** (select fat_loss or muscle_gain). Not set in creation (no creation). |
| **Challenge creation page real or placeholder?** | **Placeholder.** List is real (getAllChallenges); create is toast-only. |
| **Manage participants (invite, remove, approve)?** | Coach can **view** participants on challenge detail; no UI to invite/remove/approve. Join is client-side only (`joinChallenge`). |

---

### 3B. Challenge Participation (Client Side)

**Sources:** `src/app/client/challenges/page.tsx`, `src/app/client/challenges/[id]/page.tsx`, `challengeService.ts`.

| Question | Answer |
|----------|--------|
| **Can client see available challenges?** | **Yes.** `getActiveChallenges()` (status=active, is_public=true). Real. |
| **Can client join?** | **Yes.** `joinChallenge(challengeId, clientId, selectedTrack)` inserts into `challenge_participants` (status=registered). Recomp challenges get a track selector (fat_loss / muscle_gain). |
| **Challenge leaderboard?** | **Yes.** Detail page uses `getChallengeLeaderboard(challengeId)` (= participants ordered by total_score). Shows rank, total_score, selected_track. |
| **Scoring categories and own scores per category?** | **No.** Detail page shows only `total_score` and `final_rank` per participant. No UI for scoring categories or per-category scores. |
| **Can client submit a video for a scoring category?** | **Service:** `submitVideoProof` in challengeService exists (upload to storage, insert into `challenge_video_submissions`). **UI:** No client page found that calls it; client challenge detail has no “Submit video” flow. |
| **Video submission flow?** | Backend: upload to `challenge-videos` bucket, insert with participant_id, scoring_category_id, video_url, video_path, claimed_weight/claimed_reps, status=pending. Frontend submission UI: **missing** for client. |
| **Challenge detail page real or placeholder?** | **Real.** Challenge info, dates, leaderboard (participants + scores), “Your performance” when participating. No video submission or scoring category breakdown. |

---

### 3C. Challenge Scoring & Review

**Sources:** `challengeService.ts`, coach challenge detail page.

| Question | Answer |
|----------|--------|
| **How are challenge scores calculated?** | `calculateParticipantScore(participantId, challengeId)` is a **stub**: returns 0 and logs “TODO: Implement full scoring logic.” No logic for weight_percentage or scoring_method. |
| **Can coaches review video submissions?** | **Yes.** Coach challenge detail loads `getPendingVideoSubmissions(challengeId)`; coach can Approve/Reject with notes. `reviewVideoSubmission` updates status, reviewed_by, reviewed_at, review_notes. |
| **Are final_rank and total_score updated when scores change?** | **No.** Review only updates submission status. No code updates `challenge_participants.total_score` or `final_rank` on approve or anywhere else. |
| **End-of-challenge flow?** | **No.** No “finalize rankings”, “announce winners”, or update of final_rank/is_winner. |
| **Scoring logic implemented?** | **Schema and services exist;** calculation and propagation to participant totals are **not** implemented. |

---

## PART 4: CROSS-SYSTEM ANALYSIS

### 4A. Achievement ↔ Challenge

- **Do challenges grant achievements?** No. No template or check for “completed first challenge”, “won a challenge”, “participated in 3 challenges”.
- **Achievement templates tied to challenge completion?** No.

### 4B. Achievement ↔ Leaderboard

- **Do leaderboard positions trigger achievements?** No. No checks for “reached top 3”, “became champion”.
- **Templates tied to leaderboard rankings?** No.

### 4C. Achievement ↔ Workout / Check-in

- **Workout milestones:** Yes — `workout_count` and `streak_weeks` checked on workout completion.
- **Check-in milestones:** No — no trigger on check-in completion.
- **Body metrics / weight goal:** No — no trigger; `total_volume` returns 0.
- **All wired?** No — only workout_count, streak_weeks, pr_count are wired.

### 4D. Notification System Audit

| Event | In-app modal? | Toast? | Push? | Coach sees? | Celebration quality |
|-------|----------------|--------|-------|-------------|---------------------|
| Achievement unlocked | No (modal exists, unused) | No | No (helpers exist, never called) | No | None |
| New PR | No | No | No | No | N/A |
| Leaderboard rank change | N/A (no writes) | No | No | No | N/A |
| Challenge joined/won | No | Join: alert() only | No | No | Minimal |

---

## PART 5: DATA FLOW INTEGRITY

### 5A. Write Paths

| Table | UI/code that writes? | Trigger | Verified? |
|-------|----------------------|---------|-----------|
| achievement_templates | Admin page only | Manual create/edit | Yes |
| achievements | progressTrackingService.createAchievement (manual/other flows only); not completeWorkout | N/A for unlock flow | No writes from unlock |
| user_achievements | achievementService.unlockAchievement | Workout complete, PR upsert | Yes |
| leaderboard_entries | None | — | No |
| leaderboard_rankings | None | — | No |
| leaderboard_titles | None | — | No |
| challenges | None (Create = toast) | — | No |
| challenge_participants | challengeService.joinChallenge | Client joins | Yes |
| challenge_scoring_categories | None (no create challenge UI) | — | No |
| challenge_video_submissions | challengeService.submitVideoProof; coach reviewVideoSubmission | Client submit (no UI), coach approve/reject | Submit: service only; review: Yes |

### 5B. Read Paths

| Table | UI that reads? | Component/page | What's shown? |
|-------|----------------|----------------|---------------|
| achievement_templates | Yes | Client achievements page, achievementService | Template list and progress |
| achievements | Yes | Dashboard (getRecentAchievements), coach achievements, metrics/achievements | Recent achievements (empty from unlock flow), coach list, counts |
| user_achievements | Yes | Client achievements page (via getAchievementProgress), progressStatsService | Unlocked count, in-progress count, tier progress |
| leaderboard_entries | Yes | Client leaderboard page, progressStatsService | Ranks, scores (empty in practice) |
| leaderboard_rankings | View only | current_champions view (no direct UI found) | — |
| leaderboard_titles | None | — | — |
| challenges | Yes | Coach + client challenge list, client detail | Name, dates, type, status |
| challenge_participants | Yes | Coach + client challenge detail | Participants, score, rank |
| challenge_scoring_categories | Yes | challengeService.getChallengeScoringCategories (no UI for categories) | Service only |
| challenge_video_submissions | Yes | Coach challenge detail (pending review) | Pending submissions, approve/reject |

### 5C. Orphan / Dead Components

- **AchievementUnlockModal:** Exists, never used in unlock flow or anywhere else.
- **Coach achievements page:** Uses mock template list and reads `achievements` table (not updated by unlock flow).
- **lib/achievements.ts (ACHIEVEMENTS):** Hardcoded list used only by WorkoutAnalytics and LifestyleAnalytics; not aligned with DB templates.
- **notifyAchievementEarned, OneSignalSender.sendAchievement:** Never called.
- **Dashboard “recent achievements”:** From `achievements` table; unlock flow writes only to `user_achievements`, so dashboard stays empty for new unlocks.

---

## PART 6: FULL USER FLOW WALKTHROUGH

### Flow 1: Client completes a workout and unlocks an achievement

1. Client finishes workout → complete-workout API called. **Yes.**
2. Does the API check for achievement criteria? **Yes** — workout_count and streak_weeks (non-blocking).
3. If criteria met → what happens? **user_achievements** row(s) inserted; no notification, no response field for newly unlocked.
4. Does the workout completion screen show the achievement? **No.**
5. Does the achievements page reflect the new unlock? **Yes** — next time they open `/client/progress/achievements` (data from user_achievements + templates).
6. Does the coach see it? **No** — coach reads `achievements` table; nothing writes there from this flow.

### Flow 2: Client views the leaderboard

1. Client goes to leaderboard page. **Yes.**
2. Data loaded? **leaderboard_entries** via getLeaderboard (type, exercise, time window).
3. Filters functional? **Yes** (time, metric type, exercise).
4. Client’s rank shown? **Yes** when an entry exists; in practice **no entries** exist.
5. Data real or empty? **Real query, empty result** because nothing writes to leaderboard_entries.

### Flow 3: Coach creates a challenge and client participates

1. Coach creates challenge → **Nothing.** Toast “in development”; no DB write.
2. Client sees challenge → **Yes** for challenges already in DB (e.g. created elsewhere).
3. Client joins → **Yes** — challenge_participants row created.
4. Client submits video → **Service exists;** no client UI to submit.
5. Coach reviews submission → **Yes** — approve/reject updates status; total_score/final_rank not updated.
6. Challenge ends → **No** end flow; no finalization of rankings or winners.

### Flow 4: Client earns a tiered achievement (bronze → silver)

1. Client hits bronze → **user_achievements** row with tier=bronze.
2. Later hits silver → **New** row with tier=silver (additive).
3. Upgraded or new row? **New row** per tier (unique on client_id, achievement_template_id, tier).
4. UI show current tier? **Yes** — getAchievementProgress returns unlockedTiers and status; client achievements page shows them.

---

## SUMMARY TABLES

### System Status

| System | Schema exists? | Service layer? | Client UI? | Coach UI? | Data populated? | End-to-end functional? | Notification on trigger? |
|--------|----------------|----------------|------------|------------|-----------------|-------------------------|---------------------------|
| Achievements | Yes | Yes (templates + user_achievements) | Yes (progress page) | Partial (reads wrong table + mock templates) | Templates: only if admin created; unlocks: yes on workout/PR | Partial (unlock works; no celebration/notification) | No |
| Leaderboards | Yes (entries + rankings + titles + view) | Read + calc helpers only | Yes | — | No | No (no writes) | No |
| Challenges | Yes | Yes (CRUD participants, submissions, review) | List + join + detail (no video submit UI) | List + detail + video review | Depends on challenges existing | Partial (join, review; no create, no scoring) | No |

### Achievement Types

| Achievement Type | Template exists? | Check logic exists? | Triggers correctly? | UI shows it? |
|------------------|------------------|--------------------|--------------------|--------------|
| Workout milestones | If admin created (type workout_count) | Yes | Yes (on complete) | Yes |
| Check-in streaks | If admin created (type streak*); service uses streak_weeks | Mismatch possible | No check-in trigger | If template exists, progress page |
| Body metrics goals | If admin created | total_volume=0; no weight goal check | No | If template exists |
| PR achievements | If admin created (pr_count) | Yes | Yes (on PR upsert) | Yes |
| Challenge completion | No | No | No | N/A |
| Leaderboard ranks | No | No | No | N/A |

### Notification Experience

| Event | In-app modal? | Toast? | Push? | Coach sees? | Celebration quality |
|-------|----------------|--------|-------|-------------|---------------------|
| Achievement unlocked | No (component unused) | No | No | No | None |
| New PR | No | No | No | No | N/A |
| Leaderboard rank change | N/A | No | No | No | N/A |
| Challenge joined/won | No | Join: alert() | No | No | Minimal |

---

## TOP ISSUES (by impact)

1. **Achievement unlock is invisible** — No modal, toast, or push when an achievement is unlocked; `AchievementUnlockModal` and `notifyAchievementEarned`/OneSignal are never called. Celebration experience is missing.
2. **Leaderboards are never populated** — No code inserts into `leaderboard_entries` or `leaderboard_rankings`; client leaderboard and “your rank” are always empty.
3. **Coach cannot create challenges** — “Create Challenge” is placeholder; no form or API to insert into `challenges` or `challenge_scoring_categories`.
4. **Two achievement systems** — `achievements` (dashboard, coach, metrics) vs `user_achievements` (unlock flow, client progress page). Unlock flow only writes `user_achievements`, so dashboard and coach views don’t reflect new unlocks.
5. **Coach achievements page is mock + wrong table** — Templates list is hardcoded; client achievements are read from `achievements` (unused by unlock flow). Coaches don’t see real template-based unlocks.
6. **Challenge scoring not implemented** — `calculateParticipantScore` is stub; approving video doesn’t update `total_score` or `final_rank`; no end-of-challenge flow.
7. **Client cannot submit challenge videos** — `submitVideoProof` exists but no client UI to upload and submit for a scoring category.
8. **Achievement type naming mismatch** — Admin types (e.g. `streak`, `personal_record`) vs service (`streak_weeks`, `pr_count`); templates may not match and never unlock.
9. **Dashboard “recent achievements”** — From `achievements` table; never updated by current unlock flow; stays empty.
10. **Only three achievement triggers wired** — workout_count, streak_weeks, pr_count. No check-in, goal, body metrics, program completion, or challenge/leaderboard triggers.

---

*End of audit. No files were modified.*
