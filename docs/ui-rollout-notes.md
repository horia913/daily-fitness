# UI Rollout Notes

This file accumulates learnings during the v4 rollout. Read at the start of every screen conversion. Append a per-phase entry as work progresses.

Reference docs:
- `docs/design-system-v4.md` — authoritative design source of truth (architecture, tokens, atomics, anti-patterns — **visuals defer to mockups when they conflict; see P-9**)
- `docs/ui-rollout-plan.md` — phased execution plan
- `docs/mockups/client-screens-v5.html` — canonical visuals for client Phone 1–3 routes (see **P-9**)
- `docs/mockups/dashboard-v2.html` — canonical for `/coach` when present (see **P-9**)

Per Section 6.C of the rollout plan, this file is the running log. New entries go at the **bottom**; oldest stays at the top so the chronology is readable top-to-bottom.

---

## Phase 0a — Additive foundation

- **Date completed:** Sun Apr 26, 2026

### Tokens added to `src/styles/ui-system.css`
Added to **both** `:root` and `.dark` blocks. Light-theme values mirror dark; each new token in `:root` is flagged `/* [verify-light-theme] */` for the post-Phase-8 light-theme audit.

| Group | Tokens | Spec |
|---|---|---|
| Lime accent (action) | `--fc-accent-lime`, `--fc-accent-lime-2`, `--fc-accent-lime-soft`, `--fc-accent-lime-glow` | v4 §2.3 |
| Gold (achievement) | `--fc-accent-gold`, `--fc-accent-gold-soft` | v4 §2.3 |
| Sub-tier | `--fc-accent-bronze`, `--fc-accent-silver` | v4 §2.3 / §2.8 |
| Text tier extensions | `--fc-text-quaternary`, `--fc-text-disabled` | v4 §2.2 |
| Macro variance | `--fc-macro-on-target`, `--fc-macro-near-target`, `--fc-macro-off-target` | v4 §2.9 |
| Pillars (aliases) | `--fc-pillar-training`, `--fc-pillar-nutrition`, `--fc-pillar-checkins`, `--fc-pillar-lifestyle`, `--fc-pillar-general` | v4 §2.6 |
| Rarity (aliases) | `--fc-rarity-common`, `--fc-rarity-uncommon`, `--fc-rarity-rare`, `--fc-rarity-epic`, `--fc-rarity-legendary` | v4 §2.7 |

No existing tokens were modified. Pillar and rarity tokens are aliases that point to existing tokens (status / accent / text) so role mapping doesn't introduce new colors.

### Utility classes added to `src/styles/ui-system.css`
All under a clearly demarcated section header (`v4 ADDITIVE UTILITY CLASSES — added in Phase 0a`). Existing `.fc-attention-*`, `.fc-fab`, `.fc-btn-primary`, etc. were **not** modified.

| ID | Classes | Spec |
|---|---|---|
| 1.B.1 | `.fc-hero-action` (with `::after` diagonal-line texture) | v4 §6.4 |
| 1.B.2 | `.fc-card-status-warning/error/success/info` | v4 §6.30 |
| 1.B.3 | `.fc-backdrop-action-top/action-bottom/info/warning/achievement` | v4 §3 |
| 1.B.4 | `.fc-pillar-stripe` (consumes `--pillar-color` CSS var) | v4 §6.3 |
| 1.B.5 | `.btn-action`, `.btn-action-sm`, `.btn-success`, `.btn-pill`, `.btn-ghost-icon`, `.btn-ghost-icon-sm` | v4 §6.20 |
| 1.B.6 | `.fab-action` (lime gradient — Phase 0b will migrate `.fc-fab`) | v4 §6.21 |
| 1.B.7 | `.input-cell` with `.label` / `.num` descendants | v4 §6.22 |
| 1.B.8 | `.delta`, `.variance-pill`, `.priority-pill`, `.tag-system`, `.tag-status`, `.tier-badge`, `.rarity-pill` (data-attribute variants) | v4 §6.7 / §6.12 / §6.15–6.19 |
| 1.B.9 | `.target-bar` / `.target-bar-fill` / `.target-bar-target` | v4 §6.11 |
| 1.B.10 | `.deadline[data-urgency]`, `.stale-data[data-staleness]` | v4 §6.9 / §6.10 |
| 1.B.11 | `.self-note` (italic dashed-border, user voice) | v4 §6.14 |
| 1.B.12 | `.coach-quote` (cyan left-border, system/coach voice) | v4 §6.13 |
| 1.B.13 | `.difficulty-rating` (with `.scale` descendant) | v4 §6.28 |
| 1.B.14 | `.filter-pills`, `.filter-pill` (with `.active` state) | v4 §6.34 |
| 1.B.15 | `.add-placeholder` (dashed-border CTA) | v4 §6.37 |
| 1.B.17 | `.archive-section`, `.archive-header`, `.archive-eyebrow`, `.archive-count` | v4 §6.36 |

`1.B.16` was not in the Phase 0a scope list (the rollout plan jumps from .15 to .17). See Open questions.

### Components created (all new files; no existing component modified)
- `src/components/ui/HeroActionCard.tsx` — v4 §6.4
- `src/components/ui/InlineEditor.tsx` — v4 §6.6
- `src/components/ui/TargetProgressBar.tsx` — v4 §6.11
- `src/components/ui/TierBadge.tsx` — v4 §6.18
- `src/components/ui/Banner.tsx` — v4 §6.30 (coexists with `ErrorBanner`; not a migration)
- `src/components/ui/FilterPills.tsx` — v4 §6.34
- `src/components/ui/WeekMiniGrid.tsx` — v4 §6.29
- `src/components/ui/FrequencySelector.tsx` — v4 §6.26
- `src/components/ui/AtmosphericBackdrop.tsx` — v4 §3 (Option 2 — layered; renders on top of `AnimatedBackground`, NOT yet wired into shells)

Conventions used (matching project: `GlassCard`, `EmptyState`, `ErrorBanner`):
- `"use client"` on all stateful/interactive atomics
- `import { cn } from "@/lib/utils"`
- Named export + `export default`
- TypeScript prop interfaces with optional fields fully documented
- Spec ref `§…` cited in the file's top JSDoc per v4 §15.2

### Helpers created
- `src/lib/deadlineUrgency.ts` — pure function returning `{ urgency, daysRemaining, label }` per v4 §6.9 thresholds (overdue `<0`, imminent `0–3`, soon `4–14`, distant `>14`, none)
- `src/lib/staleData.ts` — pure function returning `{ staleness, daysSince, label }` per v4 §6.10 thresholds (fresh `0–14`, aging `15–60`, stale `60+ / Never`)

Both are React-free, no side effects, no DB calls. Use local-day comparisons (start-of-day) to make day-boundary behaviour deterministic.

### Existing components verified (READ-ONLY — no modifications)

| Component | v4 ref | Result | Notes |
|---|---|---|---|
| `src/components/ui/EmptyState.tsx` | §6.35 | **Partial** | Has `default` / `compact` / `inline` variants — NOT v4's `encouraging` / `celebratory` / `setup`. Never says "No data found" itself, but copy is caller-controlled. Refactor for Phase 0b. |
| `src/components/client-ui/SectionHeader.tsx` | §6.25 | **Insufficient** | Single uppercase `<h2>` only — does NOT support v4's three variants (page eyebrow with optional pulse, section header, sub-eyebrow). Refactor needed. |
| `src/components/layout/BottomNav.tsx` | §6.23 | **Partially compliant** | Active state IS cyan (`text-cyan-400`) — but uses Tailwind color class, not `var(--fc-accent-cyan)`. Coach inactive uses `text-gray-500` (Tailwind). Center "Train" button uses `text-white` (no lime); "Train" is the action lane and per the rollout plan §0 should be lime — that conflict was already flagged. Token migration + lime decision in Phase 0b. |
| `src/components/ui/stepper.tsx` | §6.27 | **Different component** | This is a numeric input stepper (Plus/Minus on a value), NOT v4's multi-step flow step counter. Heavy `slate-*` / `red-50` / `green-50` / `blue-50` Tailwind colors — outside token system. v4 §6.27 step counter does not yet exist as a component; it's needed for wizard flows (Phase 3+). |
| `src/components/coach/CoachClientTabBar.tsx` | §6.33 | **Compliant** | Active state = cyan border + cyan text + cyan-tinted background, all via `var(--fc-accent-cyan)` color-mix. No tokens missing. |
| `src/components/coach/AnalyticsNav.tsx` | §6.33 | **Broken token reference** | Uses `var(--fc-accent)` for the active border + text — `--fc-accent` (bare) is **not defined** in `ui-system.css`. Active state silently falls back to inheriting (probably visually broken or reliant on some other CSS). Should be `var(--fc-accent-cyan)`. Fix in Phase 0b. |

### Showcase page
- `src/app/dev/v4-lab/page.tsx` — built. Renders every Phase 0a atomic, helper output, and the five backdrop variants. Self-contained (no shared shell), not linked from any user-facing route.

### Surprises / unexpected findings
1. **`AnalyticsNav` references an undefined token** (`--fc-accent`). This is silently broken and was not flagged in Section 0 of the rollout plan. Worth adding to the Risks list before Phase 0b.
2. **`stepper.tsx` is not the v4 §6.27 component** — it's a numeric-input stepper. Phase 3 will need a *new* `StepCounter` (or similar) component for multi-step flows. The naming overlap is a trap waiting for someone to assume reuse.
3. **`SectionHeader` is a one-shot `<h2>`** with no support for the three v4 variants. Larger refactor than initially expected.
4. **`BottomNav` uses Tailwind named colors** (`text-cyan-400`, `text-gray-500`) instead of tokens. Migration to tokens is straightforward but is **not** purely cosmetic — `text-cyan-400` is `#22d3ee`, while `--fc-accent-cyan` may be a different cyan. Need to confirm visual delta is acceptable in Phase 0b.
5. **The rollout plan skips `1.B.16`** in the Phase 0a class list (jumps from .15 to .17). Either intentional (reserved) or an editing artifact. Did not author anything for `.16`.

### Decisions made during execution
- **`AtmosphericBackdrop` is positioned absolute by default** (`fixed=true` prop, defaults to `absolute inset-0 pointer-events-none`). Caller can opt out with `fixed={false}`. The phrasing "fixed" in the prop is a misnomer (it's `absolute`, not `position: fixed`) — flagging for rename in Phase 0b before the component is consumed.
- **`WeekMiniGrid` includes a `mode="scale"` opacity-by-value option** beyond the literal §6.29 binary spec. Default is `binary`. The scale mode is needed for "sets per day" use cases visible in Athlete Score / Workout History.
- **`Banner.actions` accepts an array** (multiple buttons), where v4 §6.30 typically shows 0–1 actions. Kept the array shape to avoid future API churn. Showcase demos only single-action banners.
- **`InlineEditor` `Update` button uses `.btn-action btn-action-sm`** (lime), and `Edit`/`Delete` use `.btn-ghost-icon-sm` (subtle). Per v4 §6.6 the primary "Update" is the only emphasised action. Consistent with v4's "energy through scarcity".
- **`TierBadge` "platinum" variant uses gradient text** (gold→cyan via `background-clip: text`). Background is transparent so the badge has no fill in platinum mode. Confirmed against §2.8 / §6.18 from memory but worth a visual check in `/dev/v4-lab`.
- **`deadlineUrgency` returns `"imminent"` for `days === 0`** with label "Due today" (treated as imminent, not overdue). v4 §6.9 says imminent = 0–3 days, so 0 belongs in imminent.
- **`staleData` clamps `daysSince` to `>= 0`** (a future `lastSeen` returns `fresh / "Today"`).

### Open questions for user (need answer before Phase 0b)
1. **`1.B.16` in the rollout plan** — is this intentionally skipped (reserved for a future class), or was a class accidentally omitted? If a class is missing from the plan that should be in 0a, please clarify.
2. **`AnalyticsNav` broken `--fc-accent` reference** — Phase 0b fix or out-of-scope (separate ticket)?
3. **`BottomNav` Tailwind `cyan-400` vs token `--fc-accent-cyan`** — confirm migration is acceptable; we may have a visual shift.
4. **`stepper.tsx` rename** — when we build the v4 §6.27 step counter, should it live as `src/components/ui/StepCounter.tsx` to avoid the naming collision with the existing numeric-input `stepper.tsx`?
5. **`AtmosphericBackdrop` `fixed` prop name** — rename to `absolute` (more accurate) before any caller adopts it?

---

## Phase 0a — Closeout (user-confirmed answers, Apr 26, 2026)

Phase 0a was reviewed and **approved**. The answers below resolve the open questions above and capture human-review notes for future phases.

### Resolved questions

1. **`1.B.16` numbering gap.** Numbering error in the rollout plan, NOT a reserved or omitted atomic. No new atomic is missing from Phase 0a. Action: leave the gap as-is for now (or renumber the plan contiguously if cleanup happens later — author's call).
2. **`AnalyticsNav` `--fc-accent` reference.** Fix scheduled for Phase 0b alongside the existing-component verification follow-up. Concrete change: replace `var(--fc-accent)` with `var(--fc-accent-cyan)` in `src/components/coach/AnalyticsNav.tsx`.
3. **`BottomNav` `text-cyan-400` → `var(--fc-accent-cyan)`.** Accepted. Any visual shift is desired — all cyan must flow from the same token. **Separate question** to resolve in Phase 0b: the color of the center "Train" button (likely stays cyan as system/nav, NOT lime). Phase 0b prompt will need options here.
4. **`stepper.tsx` naming collision.** Decision: build v4 §6.27 step counter as a NEW file at `src/components/ui/StepCounter.tsx`. Leave the existing `stepper.tsx` (numeric input) as-is. Default position: coexist. Rename only if there's a documented reason and it can be done in one focused session.
5. **`AtmosphericBackdrop.fixed` prop rename.** Approved. Rename `fixed` → `absolute` as the **first task** of Phase 0b, before any caller integration.
6. **Hex value spot-check.** All confirmed against v4 §2.3:
   - `--fc-accent-lime: #C5FF4A` ✓
   - `--fc-accent-lime-2: #7FE89A` ✓
   - `--fc-accent-gold: #F5C242` ✓
   No correction needed.

### Approved deliberate deviations (codify in v5 if relevant)

- **`WeekMiniGrid` `mode="scale"` extension** — approved. Default stays `binary`. Will be codified in v5.
- **`Banner.actions` array** — approved. Documented intended use is 0–1 actions; the array shape exists for forward compatibility.
- **`add-placeholder` cyan hover** — approved.
- **`InlineEditor` `Update` CTA = `btn-action-sm` (lime)** — correct per v4 §6.8 (the canonical inline-editor section).
- **Platinum tier gradient text** — approved. v5 will confirm text-vs-fill intent.

### Calibration — citation drift in my self-report

Two of my section citations were off by one or two in the Phase 0a self-check above. The components themselves match v4 spec; only the citations drifted. **No code correction needed.** Recorded here so future self-checks improve:

| Component | Cited (incorrectly) | Actual v4 § |
|---|---|---|
| `Banner` | §6.30 | **§6.32** |
| `WeekMiniGrid` | §6.29 | **§6.30** |
| `InlineEditor` (note) | §6.6 | **§6.8** is the canonical inline-editor section |

**Lesson for next phase:** when citing v4 sections from memory, double-check against the actual §6.x table of contents before publishing the self-check.

### Pre-loaded Phase 0b task list (for when the user sends the Phase 0b prompt)

In execution order:

1. Rename `AtmosphericBackdrop.fixed` → `absolute`.
2. Fix `AnalyticsNav` token reference (`var(--fc-accent)` → `var(--fc-accent-cyan)`).
3. Migrate `BottomNav` from Tailwind named colors to tokens (`text-cyan-400` → `var(--fc-accent-cyan)`; coach-side `text-gray-500` → appropriate dim token).
4. Resolve and apply the `BottomNav` center "Train" button color (await user decision; default proposal: stays cyan as system/nav).
5. Other Phase 0b migration decisions per Section 1 of the rollout plan (e.g., `.fc-fab` migration audit, `.fc-btn-primary` audit per amendment 6, `EmptyState` variants refactor, `SectionHeader` variants refactor).

Phase 0a is **closed**. Awaiting explicit Phase 0b prompt from user before any further work.

---

## Phase 0b — Migration phase (in progress)

Per-task entries are appended as each task completes. Tasks run AUDIT-FIRST, MIGRATE-LATER: every audit is reported and approved before any code change.

### Task 6 — `.fc-fab` migration audit + create-CTA migration

- **Date completed:** Sun Apr 26, 2026
- **v4 ref:** §6.21 Floating Action Button
- **Mode:** Audit, then migration (after approval)

#### Audit findings (approved)

- **Total `fc-fab` callers in `src/`:** 1 (case-sensitive, exact-token match).
- **Single caller:** `src/app/client/goals/page.tsx` — "Add new goal" button rendered via `createPortal(..., document.body)`.
- **Category:** `create` (high confidence). No destructive cases. No ambiguous cases.
- **Sibling classes / context (pre-migration):**
  - Wrapper `<div className="fixed bottom-24 right-4 z-40 pointer-events-auto">` (Tailwind utilities).
  - Button: `className="fc-fab group"` + `aria-label="Add new goal"` + `onClick` opens the goal-creation wizard.
  - Glyph: `<Plus className="w-8 h-8 text-white" />`.
  - Tooltip span (kept as-is): `fc-glass`-tinted, `group-hover:opacity-100`.
- **Incidental issues found during audit:** none. No undefined-token references, no Tailwind-named-color literals beyond `text-white` on the glyph, no drifted v4 citations on touched files.

#### Migration applied (per user decisions, this task)

1. **Glyph color tokenization.** Dropped `text-white` from the `<Plus />` icon. Glyph now inherits `.fab-action`'s dark color (`#061018` per v4 §6.21).
2. **Wrapper removed.** Outer `<div className="fixed bottom-24 right-4 z-40 pointer-events-auto">` deleted. The button is now portaled directly to `document.body` (still via `createPortal`).
3. **Class swap.** `className="fc-fab group"` → `className="fab-action group"`. The `group` class was preserved because the existing hover-tooltip span uses `group-hover:opacity-100`.
4. **`.fab-action` position adjusted.** In `src/styles/ui-system.css`, `.fab-action`'s `bottom` value changed from `calc(64px + 16px)` (= 80px, the Phase 0a spec guess) to `calc(64px + 32px)` (= 96px, the proven-working position previously held by the `fc-fab` caller's `bottom-24` Tailwind class). Formula style chosen for readability — 64px is bottom-nav height, 32px is clearance.
5. **Audit-trail JSDoc.** Inline JSDoc-style comment added in `goals/page.tsx` immediately above the migrated FAB block, recording the "Was → Now" diff and the spec ref.

#### Standard verifications (this task)

- **Token sweep on touched files:** `goals/page.tsx` and `ui-system.css` use only defined tokens — no undefined token references. Glyph inherits `.fab-action`'s color (set to `#061018` literal per v4 §6.21).
- **Tailwind named-color sweep on `goals/page.tsx`:** the FAB JSX block contains zero Tailwind named-color classes after migration. (`text-white` was the only one; it's gone. The wrapper's `bottom-24 right-4 z-40 pointer-events-auto` are also gone.)
- **Citation re-verification:** v4 §6.21 (Floating Action Button) confirmed against the design-system-v4 ToC.
- **Linter:** clean.
- **Active `fc-fab` callers in `src/` after migration:** 0. (The literal still appears on one line in `goals/page.tsx` — inside the audit-trail JSDoc comment, marked `Was: ...` — and inside two explanatory comments in `ui-system.css`.)

#### `pointer-events-auto` and portal-rendering verification

- `.fab-action` does not set `pointer-events`; default for a `<button>` is `auto`. Because the button is portaled to `document.body`, the only ancestor in the rendered DOM tree is `<body>` (no `pointer-events: none` applied there in this codebase).
- `position: fixed` resolves against the viewport regardless of portal target, so the button anchors to `bottom: 96px; right: 16px`.
- **User-side visual verification still required** (the agent cannot verify pixel-level visuals): confirm in the browser that the FAB (a) is clickable from any scroll position, (b) sits at the same bottom offset as before, and (c) is lime with a dark glyph. If a parent of `document.body` ever sets `pointer-events: none`, the button can be re-protected by adding `pointer-events: auto` to `.fab-action`.

#### Visual deltas the user should confirm

The migration intentionally adopts the v4 spec for `.fab-action`, which differs from the legacy `.fc-fab`. Expected changes:

- **FAB diameter:** 64px → 56px (per v4 §6.21).
- **Glyph rendered size:** the `.fab-action svg { width: 24px; height: 24px }` rule overrides the `w-8 h-8` (32px) Tailwind classes left on the `<Plus />` element. Visual size: 24px.
- **Glyph color:** white → `#061018` (dark) on the lime gradient — high-contrast per v4.
- **Bottom-edge anchor:** unchanged (96px). Top edge sits 8px lower than before because the FAB shrunk while staying bottom-anchored.

#### `.fc-fab` CSS rule disposition

`.fc-fab` and its variants in `ui-system.css` (lines ~516–536) are **left in place** for now. No active caller uses the rule. Removal deferred until a separate "is `.fc-fab` needed for genuinely destructive FABs?" decision after Phase 1+ surfaces (or doesn't surface) such cases.

#### Files touched (this task)

- `src/styles/ui-system.css` — `.fab-action` bottom value updated; explanatory header comment expanded.
- `src/app/client/goals/page.tsx` — FAB block migrated; inline audit-trail JSDoc comment added.

#### Phase 0b Task 6.5 — FAB icon size cleanup

- **Date completed:** Sun Apr 26, 2026
- **File:** `src/app/client/goals/page.tsx`
- **Change:** Removed stale `w-8 h-8` Tailwind classes from the `<Plus />` icon inside `.fab-action`; rendered size comes from `.fab-action svg` (24px) in `ui-system.css`.
- **Lint:** clean.

---

## Task 7 — `.fc-btn-primary` migration audit (approved)

- **Date:** Sun Apr 26, 2026
- **Mode:** AUDIT-ONLY (no caller migrations in Phase 0b for `.fc-btn-primary`; migrations are staged across Phase 1+ per `docs/ui-rollout-plan.md`).
- **Approved categorization split:** **154 CTA** / **47 System-cyan** / **4 Ambiguous** (205 JSX call sites, excluding CSS + wrapper definitions).
- **Confidence calibration:** approved as honest; skepticism on CTA bias held.
- **v4 refs used in audit framing:** §6.20 (buttons), §6.21 (FAB), §6.23 (bottom nav), §2.3 / §2.10 (accent roles).

### Plan adjustments after Task 7 (execution order)

1. **Task 8 (next, highest priority):** bulk fix undefined `var(--fc-accent)` → `var(--fc-accent-cyan)` across `src/` (audit first, then migrate in batches of 5 files; see Task 8 section below — **audit complete; migration awaits user approval**).
2. **Task 6 extension (after Task 8):** migrate **six** cyan FAB-shaped buttons from `.fc-btn fc-btn-primary` to `.fab-action` (same pattern as `client/goals/page.tsx` Task 6). Remove these six from `.fc-btn-primary` migration scope so they are not migrated twice.
3. **Task 9 (after Task 8 + FAB extension):** update the `.fc-btn-primary` migration plan with scope removals, duplicate-CTA fixes, user-judgment flags, and accept-as-is list (detailed under **Task 9 — `.fc-btn-primary` migration plan adjustments** below).
4. **Stop** after Task 8 + FAB extension; await approval before any `.fc-btn-primary` migration strategy is finalized for Phase 1+.

### Task 6 extension — six cyan-FABs (pending until after Task 8)

Migrate to `.fab-action` using the Task 6 pattern (no wrapper; glyph inherits dark color; keep `group` if tooltip); verify **bottom `calc(64px + 32px)`** alignment matches goals FAB.

| File | Line (approx.) | Notes |
|------|----------------|-------|
| `src/app/client/progress/body-metrics/page.tsx` | 1728 | FAB “log metrics” |
| `src/app/client/progress/performance/page.tsx` | 463 | FAB |
| `src/app/coach/challenges/page.tsx` | 227 | FAB |
| `src/components/coach/OptimizedExerciseLibrary.tsx` | 691 | FAB |
| `src/components/coach/OptimizedWorkoutTemplates.tsx` | 995 | FAB |
| `src/components/coach/CoachExerciseCategoriesPanel.tsx` | 266 | FAB (mobile) |

### Task 9 — `.fc-btn-primary` migration plan adjustments (reference for Phase 1+)

**Remove from `.fc-btn-primary` migration scope (handled elsewhere):**

- **6** cyan-FAB usages → Task 6 extension (`.fab-action`).
- **16** leaderboard filter pill usages (`CommunityLeaderboard.tsx` + `ClientLeaderboardPageBody.tsx`) → future `<FilterPills>` atomic (rollout **Phase 6**), not `.fc-btn-primary` token migration.
- **12** Optimized* family grid/list view-mode toggles → future `<ViewModeToggle>` atomic (rollout **Phase 8**).
- **5** Cancel/Back/Close anti-patterns → `btn-secondary` (or equivalent), per-screen — not `btn-action`.

**Genuine duplicate-CTA bugs to fix during migration (per user):**

- `coach/challenges/page.tsx` — keep FAB; demote header CTA.
- `coach/clients/[id]/programs/[programId]/page.tsx` — keep header Resume; remove body-card “Resume Program”.
- `coach/nutrition/generator/page.tsx` — keep sticky “Save Plan”; remove result-card duplicate.
- `OptimizedExerciseLibrary.tsx` + `OptimizedWorkoutTemplates.tsx` — after FAB migration, keep FAB; demote header CTA.
- `WeeklyCheckInCard.tsx`, `ChallengeCard.tsx` — one layout branch canonical; remove duplicate.
- `ClientFmsAssessmentsPanel.tsx` — one header render path; remove duplicate.
- `MealOptionEditor.tsx` — one “Add Option” becomes secondary.
- `ExerciseAlternativesModal.tsx` — body control secondary; footer stays primary.

**Flag for user judgment during per-screen migration:**

- `app/client/workouts/[id]/start/page.tsx` — Cluster Set panel: “Start Rest Timer” vs “Log Cluster Set” (Phase 3).
- `app/client/progress/body-metrics/page.tsx` — hero “Log Today’s Metrics” vs FAB (likely keep FAB, demote hero; confirm Phase 6).

**Accept as-is (not duplicate-CTA violations):**

- Per-row / per-card density: `HabitTracker` “Log {habit}”, `gym-console` per-row “Log Set”, `MealPlanBuilder` per-section “Add {mealType}”, `GoalsAndHabits` per-row “Log {activity}”, `GoalCard` per-card “Update”.
- Viewport–mutually-exclusive duplicates: mobile/desktop “Edit Program” / “Save” on program detail + program edit screens; empty-state vs populated-state pairs where only one shows.

---

## Surfaced during Task 7 audit — deferred work

*Not in Phase 0b scope; logged for later tracking.*

| Item | Location / pattern | Notes |
|------|-------------------|-------|
| Dead CTAs (no `onClick`) | `StreakCounters.tsx`, `ProgressCircles.tsx` | “Start Streak” / “Start Tracking” read as primary but do nothing — separate bug fix (wire navigation or downgrade to static copy per §6.35). |
| `div` styled as button | `MealCreator.tsx` (~L286) | Non-interactive `div` with `fc-btn fc-btn-primary` — separate a11y fix. |
| `.fc-btn-primary` CSS hardcoded hex | `src/styles/ui-system.css` (~L390+) | Definition uses raw `#0891b2` / `#22d3ee` / RGBA shadows — tokenize after JSX migrations land (end of rollout / dedicated pass). |
| `<ViewModeToggle>` atomic | Optimized* family (12 sites) | Phase 8 per rollout plan. |
| `<FilterPills>` consolidation | Leaderboards (16 sites) | Phase 6 per rollout plan. |

---

## Task 8 — `var(--fc-accent)` bulk fix (Phase 0b)

**Priority:** highest — undefined `--fc-accent` causes silent `currentColor` fallback; visual verification of later UI work is unreliable until fixed.

**Constraints:** no version-control operations; token sweep + citation check + lint on every touched file during migration; migrate **only after** audit approval.

### Task 8 — AUDIT (complete — awaiting user approval before migration)

**Search:** case-sensitive literal `var(--fc-accent)` in `src/` (does **not** match `var(--fc-accent-cyan)`, `var(--fc-accent-lime)`, etc.).

**Totals (workspace grep, case-sensitive):**

| Metric | Value |
|--------|-------|
| Files with ≥1 match | **65** |
| Total string matches | **204** |

**Default migration rule (per user):** replace every runtime `var(--fc-accent)` with `var(--fc-accent-cyan)` — matches legacy v3 “cyan as general accent” and v4 §2.3 / §2.10 (structural / system cyan for non-lime surfaces).

**Special cases:**

| Item | Detail |
|------|--------|
| `src/components/coach/AnalyticsNav.tsx` | **1** match — occurs only inside the Phase 0b Task 3 **JSDoc audit-trail** (not in runtime `className`). On migration: either leave wording that avoids the substring or rephrase so the doc stays accurate after bulk replace. |
| `src/app/coach/goals/page.tsx` (~L607) | Uses **`var(--fc-accent-secondary, var(--fc-accent))`** — `--fc-accent-secondary` is **not** defined in `ui-system.css` (verified grep). The inner fallback is the same broken token. **Flagged for user judgment:** (A) replace inner fallback with `var(--fc-accent-cyan)` so the whole expression resolves to cyan when secondary is missing; (B) or replace the outer token with a defined semantic (e.g. domain / status) if “Active Clients” tile should not be cyan. **Do not invent `--fc-accent-secondary` in CSS without an explicit user order.** |

**Optional low-priority judgment (defaults to cyan if user does not intervene):**

- Goal wizard surfaces (`CategoryPicker.tsx`, wizard form radio borders, `WizardNotice.tsx`) — could theoretically use gold/lime for “achievement / action” emphasis; **intent in code reads as generic accent / info**, so audit classification is **default cyan** for Task 8.

**Categorization table (by file — migration batching):**

| # | File | Matches | Audit category | Notes |
|---|------|---------|----------------|-------|
| 1 | `src/app/client/goals/page.tsx` | 10 | Default cyan | Filters / status / sort / pillar UI on client goals hub |
| 2 | `src/app/coach/programs/[id]/edit/page.tsx` | 8 | Default cyan | Program editor chrome, tabs, selects |
| 3 | `src/components/coach/AnalyticsNav.tsx` | 1 | JSDoc only | See special cases |
| 4 | `src/components/coach/client-views/ClientProgressWellnessSection.tsx` | 1 | Default cyan | Progress bar segment |
| 5 | `src/app/coach/clients/[id]/progress/page.tsx` | 1 | Default cyan | Hero icon tint |
| 6 | `src/components/goals/wizard/CategoryPicker.tsx` | 2 | Default cyan | Optional judgment — default cyan |
| 7 | `src/app/coach/clients/[id]/profile/page.tsx` | 2 | Default cyan | Hero + tab active |
| 8 | `src/components/coach/client-views/ClientHabitsView.tsx` | 1 | Default cyan | Active chip |
| 9 | `src/components/goals/wizard/PerformanceForm.tsx` | 4 | Default cyan | Radio `has-[:checked]:border` + `accent-*` |
| 10 | `src/components/goals/wizard/NutritionForm.tsx` | 4 | Default cyan | Same pattern |
| 11 | `src/components/goals/wizard/OutcomeForm.tsx` | 4 | Default cyan | Same pattern |
| 12 | `src/components/goals/wizard/BodyCompositionForm.tsx` | 4 | Default cyan | Same pattern |
| 13 | `src/components/client/HabitTracker.tsx` | 1 | Default cyan | Today ring |
| 14 | `src/components/coach/client-views/ClientAnalyticsView.tsx` | 3 | Default cyan | Links / bar / emphasis |
| 15 | `src/app/client/nutrition/page.tsx` | 6 | Default cyan | Fuel chips, CTAs, icons |
| 16 | `src/components/goals/wizard/WizardNotice.tsx` | 2 | Default cyan | Info callout (system voice) |
| 17 | `src/components/coach/OptimizedAdherenceTracking.tsx` | 4 | Default cyan | Today / selection rings (shadow already sky-hued) |
| 18 | `src/components/coach/CoachHabitsLibraryPage.tsx` | 1 | Default cyan | Hero icon |
| 19 | `src/app/coach/progress/page.tsx` | 6 | Default cyan | Icons / links / hover |
| 20 | `src/app/coach/gym-console/page.tsx` | 8 | Default cyan | Loaders, selection list, icons |
| 21 | `src/components/coach/ProgramProgressionRulesEditor.tsx` | 1 | Default cyan | Badge |
| 22 | `src/components/coach/ProgramProgressionGridCell.tsx` | 1 | Default cyan | Hover border |
| 23 | `src/components/coach/ProgramProgressionGrid.tsx` | 1 | Default cyan | Header cell text |
| 24 | `src/components/coach/ProgramProgressionGridRow.tsx` | 1 | Default cyan | Badge |
| 25 | `src/app/client/progress/personal-records/page.tsx` | 1 | Default cyan | Spinner border |
| 26 | `src/app/client/progress/workout-logs/[id]/page.tsx` | 4 | Default cyan | Segmented control + template link |
| 27 | `src/components/coach/client-views/CoachClientDailyReview.tsx` | 10 | Default cyan | KPI tiles / links / icons / bar |
| 28 | `src/app/coach/clients/[id]/programs/[programId]/page.tsx` | 6 | Default cyan | Focus ring + UI chrome |
| 29 | `src/app/coach/clients/page.tsx` | 7 | Default cyan | List / CTAs / accents |
| 30 | `src/app/coach/nutrition/generator/page.tsx` | 12 | Default cyan | Wizard steps, inputs, tabs (full cyan fills → token fix preserves intent) |
| 31 | `src/app/coach/clients/[id]/check-ins/page.tsx` | 1 | Default cyan | Accent |
| 32 | `src/app/coach/nutrition/meal-plans/[id]/page.tsx` | 2 | Default cyan | UI chrome |
| 33 | `src/app/coach/clients/[id]/workout-logs/[logId]/page.tsx` | 1 | Default cyan | Accent |
| 34 | `src/app/client/profile/page.tsx` | 1 | Default cyan | Accent |
| 35 | `src/app/client/activity/page.tsx` | 1 | Default cyan | Accent |
| 36 | `src/app/client/progress/body-metrics/page.tsx` | 17 | Default cyan | Tabs, section labels, chart accents, focus rings |
| 37 | `src/app/client/programs/[id]/details/page.tsx` | 5 | Default cyan | Hero / links / emphasis |
| 38 | `src/app/client/progress/achievements/page.tsx` | 2 | Default cyan | Accents |
| 39 | `src/app/coach/compliance/page.tsx` | 1 | Default cyan | Accent |
| 40 | `src/app/client/goals/history/page.tsx` | 2 | Default cyan | Accents |
| 41 | `src/app/client/progress/page.tsx` | 9 | Default cyan | Hub accents |
| 42 | `src/components/client/progress/ClientLeaderboardPageBody.tsx` | 1 | Default cyan | Filter pill (Phase 6 FilterPills — token still fixed first) |
| 43 | `src/app/coach/categories/page.tsx` | 1 | Default cyan | Accent |
| 44 | `src/app/coach/menu/page.tsx` | 2 | Default cyan | Accents |
| 45 | `src/app/client/check-ins/page.tsx` | 1 | Default cyan | Accent |
| 46 | `src/app/client/nutrition/foods/create/page.tsx` | 3 | Default cyan | Form / focus |
| 47 | `src/app/coach/training/page.tsx` | 4 | Default cyan | Accents |
| 48 | `src/app/coach/goals/page.tsx` | 6 | **Flagged** | Includes `var(--fc-accent-secondary, var(--fc-accent))` — see special cases |
| 49 | `src/components/client/challenges/ChallengeDetailPageBody.tsx` | 1 | Default cyan | Accent |
| 50 | `src/app/client/progress/performance/page.tsx` | 3 | Default cyan | Accents |
| 51 | `src/app/client/nutrition/foods/[id]/page.tsx` | 1 | Default cyan | Accent |
| 52 | `src/app/coach/challenges/[id]/page.tsx` | 1 | Default cyan | Accent |
| 53 | `src/app/coach/nutrition/page.tsx` | 2 | Default cyan | Accents |
| 54 | `src/app/client/progress/analytics/page.tsx` | 5 | Default cyan | Analytics chrome |
| 55 | `src/app/coach/clients/[id]/stats/page.tsx` | 1 | Default cyan | Accent |
| 56 | `src/components/coach/client-views/CoachClientSubscriptionSection.tsx` | 4 | Default cyan | Subscription UI |
| 57 | `src/components/coach/client-views/ClientFmsAssessmentsPanel.tsx` | 2 | Default cyan | FMS accents |
| 58 | `src/app/create-user/page.tsx` | 1 | Default cyan | Accent |
| 59 | `src/app/admin/tracking-sources/page.tsx` | 1 | Default cyan | Accent |
| 60 | `src/app/admin/habit-categories/page.tsx` | 1 | Default cyan | Accent |
| 61 | `src/app/admin/goal-templates/page.tsx` | 1 | Default cyan | Accent |
| 62 | `src/app/admin/achievement-templates/page.tsx` | 1 | Default cyan | Accent |
| 63 | `src/app/coach/clients/[id]/workouts/page.tsx` | 1 | Default cyan | Accent |
| 64 | `src/components/nutrition/AddFoodModal.tsx` | 1 | Default cyan | Accent |
| 65 | `src/components/client/HybridNutritionView.tsx` | 3 | Default cyan | Accent |

**Citation re-verification (read-only):** v4 §2.3 (accent tokens — cyan = structural / system), §2.10 (lime reserved for in-flow CTAs; bulk replace targets non-lime surfaces). §6.33 tab strip remains satisfied by explicit `--fc-accent-cyan` on `AnalyticsNav` runtime classes (Task 3).

### Task 8 — Migration COMPLETE (Sun Apr 26, 2026)

User approvals applied: skip `AnalyticsNav.tsx`; `coach/goals/page.tsx` Option A (inner fallback only, then remaining bare accents); wizard chrome stays default cyan; all other files naive `var(--fc-accent)` → `var(--fc-accent-cyan)`.

| Metric | Value |
|--------|-------|
| **Files migrated** | **64** (`AnalyticsNav.tsx` intentionally untouched) |
| **String replacements of** `var(--fc-accent)` → `var(--fc-accent-cyan)` | **203** (audit total **204** substring matches in `src/`, minus **1** left in `AnalyticsNav.tsx` JSDoc prose only) |
| **`coach/goals/page.tsx` Option A** | `var(--fc-accent-secondary,var(--fc-accent))` → `var(--fc-accent-secondary,var(--fc-accent-cyan))` (**2** occurrences on Active Clients tile); then remaining bare `var(--fc-accent)` → cyan. File header **audit-trail JSDoc** added. |

**Batch progress (5-file cadence; batch 10 had 6 files because `coach/goals` + 5 peers were applied together):**

| Batch | Files | Notes |
|-------|-------|-------|
| 1 | `client/goals/page.tsx`, `coach/programs/[id]/edit/page.tsx`, `ClientProgressWellnessSection.tsx`, `coach/clients/[id]/progress/page.tsx`, `CategoryPicker.tsx` | Naive replace |
| 2 | `coach/clients/[id]/profile/page.tsx`, `ClientHabitsView.tsx`, `PerformanceForm.tsx`, `NutritionForm.tsx`, `OutcomeForm.tsx` | Naive replace |
| 3 | `HabitTracker.tsx`, `ClientAnalyticsView.tsx`, `BodyCompositionForm.tsx`, `client/nutrition/page.tsx`, `WizardNotice.tsx` | Naive replace |
| 4 | `OptimizedAdherenceTracking.tsx`, `CoachHabitsLibraryPage.tsx`, `coach/progress/page.tsx`, `gym-console/page.tsx`, `ProgramProgressionRulesEditor.tsx` | Naive replace |
| 5 | `ProgramProgressionGridCell.tsx`, `ProgramProgressionGrid.tsx`, `ProgramProgressionGridRow.tsx`, `personal-records/page.tsx`, `workout-logs/[id]/page.tsx` (client) | Naive replace |
| 6 | `CoachClientDailyReview.tsx`, `coach/clients/[id]/programs/[programId]/page.tsx`, `coach/clients/page.tsx`, `nutrition/generator/page.tsx`, `coach/clients/[id]/check-ins/page.tsx` | Naive replace |
| 7 | `nutrition/meal-plans/[id]/page.tsx`, `coach/clients/[id]/workout-logs/[logId]/page.tsx`, `client/profile/page.tsx`, `client/activity/page.tsx`, `body-metrics/page.tsx` | Naive replace |
| 8 | `programs/[id]/details/page.tsx`, `achievements/page.tsx`, `compliance/page.tsx`, `goals/history/page.tsx`, `client/progress/page.tsx` | Naive replace |
| 9 | `ClientLeaderboardPageBody.tsx`, `coach/categories/page.tsx`, `coach/menu/page.tsx`, `client/check-ins/page.tsx`, `nutrition/foods/create/page.tsx` | Naive replace |
| 10 | `coach/training/page.tsx`, **`coach/goals/page.tsx` (Option A + naive)**, `ChallengeDetailPageBody.tsx`, `performance/page.tsx`, `nutrition/foods/[id]/page.tsx` | See `coach/goals` row above |
| 11 | `coach/challenges/[id]/page.tsx`, `coach/nutrition/page.tsx`, `client/progress/analytics/page.tsx`, `coach/clients/[id]/stats/page.tsx`, `CoachClientSubscriptionSection.tsx` | Naive replace |
| 12 | `ClientFmsAssessmentsPanel.tsx`, `create-user/page.tsx`, `admin/tracking-sources/page.tsx`, `admin/habit-categories/page.tsx`, `admin/goal-templates/page.tsx` | Naive replace |
| 13 | `admin/achievement-templates/page.tsx`, `coach/clients/[id]/workouts/page.tsx`, `AddFoodModal.tsx`, `HybridNutritionView.tsx` | Naive replace |

**Post-migration verification**

- **Remaining** `var(--fc-accent)` **in** `src/`: **1** — only inside `AnalyticsNav.tsx` JSDoc line documenting Task 3 (preserved per user).
- **ESLint (CLI):** `npm run lint` / `npx eslint` **fail** in this repo because **no** `eslint.config.*` / `.eslintrc.*` is present (ESLint 9 flat-config expectation). **Not introduced by Task 8.** Spot-check: `read_lints` on representative migrated files reports **no issues**.
- **Token sweep (log-only, not fixed in Task 8):**
  - **`--fc-accent-secondary`** — still **not** defined in `ui-system.css`; used only on `coach/goals/page.tsx` Active Clients tile with **valid** fallback to `var(--fc-accent-cyan)` (Option A).
  - **`--fc-accent-primary`** — referenced in multiple `src/` files (e.g. `client/goals/page.tsx` pillar icon style, `client/progress/analytics/page.tsx`, `coach/categories/page.tsx`, `workouts/[id]/start/page.tsx`, `CoachExerciseCategoriesPanel.tsx`, …); **not** defined in `ui-system.css` (grep). Pre-existing silent-fallback issue; **deferred** to a future token-definition or call-site cleanup pass.

**STOP after Task 8.** Six-FAB extension waits for explicit user go-ahead.

---

## Task 8.5 — `var(--fc-accent-primary)` audit + migration

**Date:** Sun Apr 26, 2026  
**Problem:** `--fc-accent-primary` is **not** defined in `src/styles/ui-system.css`; every `var(--fc-accent-primary)` silently falls back like the old `--fc-accent` bug.  
**Search:** case-sensitive `var(--fc-accent-primary` in `src/` (also catches `var(--fc-accent-primary)]` / SVG `stroke="var(--fc-accent-primary)"` / etc.). **No** `var(--fc-accent-primary, <fallback>)` forms were found.

**Totals**

| Metric | Value |
|--------|-------|
| Files with ≥1 occurrence | **9** |
| Total `var(--fc-accent-primary)` occurrences | **29** |

### Per-file / per-line audit table

| File | Line | Context | Apparent intent | Migration target | Confidence | Rationale |
|------|------|-----------|-----------------|------------------|------------|-----------|
| `src/app/coach/goals/page.tsx` | 526 | “Automated Progress Tracking” card — Zap icon tile `bg-[color:var(--fc-accent-primary)]` | system/structural | `var(--fc-accent-cyan)` | high | Explainer / info surface beside coach Goals/Habits tabs — not a forward CTA. |
| `src/app/client/progress/analytics/page.tsx` | 1157 | “Sleep vs Performance” insight card — icon tile `bg` + `shadow` (**×2** vars on one line) | system/structural | `var(--fc-accent-cyan)` | high | Analytics insight; same lane as other insight tiles that already use `--fc-accent-cyan` (e.g. L1314). |
| `src/app/client/progress/analytics/page.tsx` | 1274 | “Goal Completion” card — Target icon tile `bg` + `shadow` (**×2**) | achievement | `var(--fc-accent-gold)` | medium | Goal completion / achievement framing; v4 §2.3 gold = achievement. |
| `src/app/client/progress/analytics/page.tsx` | 1291 | Same card — radial SVG progress ring `stroke="var(--fc-accent-primary)"` | achievement | `var(--fc-accent-gold)` | medium | Should match L1274 header treatment for one coherent “completion” accent. |
| `src/app/coach/categories/page.tsx` | 376 | Per-category **Edit** button — `hover:bg` + `hover:border` (**×2**) | system/structural | `var(--fc-accent-cyan)` | medium | Secondary edit affordance; lime is for primary in-flow CTAs per §2.10 / §6.20. |
| `src/app/client/progress/page.tsx` | 61 | `HUB_NAV_ITEMS` — “Workout History” row `iconClass` only (**×4** in string) | system/structural (hub) | **`var(--fc-domain-workouts)`** | high | **Skepticism signal:** every sibling hub tile uses domain/status/pillar tokens (`fc-domain-workouts`, `fc-status-success`, `fc-accent-cyan`, `fc-domain-meals`, …); this row alone used `accent-primary` → intent reads as **training lane**, not generic accent. |
| `src/app/client/progress/page.tsx` | 397 | “Full analytics” promo `button` — BarChart3 icon bubble (**×4** in string) | system/structural | `var(--fc-accent-cyan)` | high | Navigation / analytics entry — align with system cyan used elsewhere on hub (e.g. Mobility tile). |
| `src/app/client/progress/personal-records/page.tsx` | 53 | `EXERCISE_ICON_CLASSES[4]` preset string (**×3** vars) | system/structural | `var(--fc-accent-cyan)` | medium | Rotating metadata chips for exercise names — decorative differentiation, not “PR achievement gold.” |
| `src/app/client/nutrition/page.tsx` | 888 | Fuel header — kcal `consumed / goal` mono span `style={{ color: … }}` | system/structural (nutrition) | **`var(--fc-domain-meals)`** (alias `--fc-pillar-nutrition`) | high | Same block already uses `--fc-accent-cyan` on ring and macro-colored spans; kcal should follow **nutrition / meals domain**, not a second mystery accent. |
| `src/app/client/goals/page.tsx` | 572 | Pillar section header — `<PillarIcon style={{ color: … }} />` inside `PILLAR_SECTIONS.map` | **Use pillar token** | **Map `pillarId` →** `var(--fc-pillar-training)` \| `var(--fc-pillar-nutrition)` \| `var(--fc-pillar-checkins)` \| `var(--fc-pillar-lifestyle)` **(or equivalent domain/status per pillar)** | high | Eyebrow already `fc-accent-cyan`; icon color should be **per-pillar** per v4 §2.6, not one generic accent for Training/Nutrition/Body/Lifestyle. |
| `src/app/client/workouts/[id]/start/page.tsx` | 4876 | Tabata details header — icon tile (non-Tabata error branch uses `accent-primary`) | system/structural (training) | **`var(--fc-domain-workouts)`** | high | Active-session block chrome — training domain, not lime CTA. |
| `src/app/client/workouts/[id]/start/page.tsx` | 5243 | Cluster Set flow header — dumbbell icon tile | system/structural (training) | **`var(--fc-domain-workouts)`** | high | Same as above — block header chrome. |
| `src/app/client/workouts/[id]/start/page.tsx` | 6553 | Set logging header — inline `background: var(--fc-accent-primary)` on 56px exercise icon | system/structural (training) | **`var(--fc-domain-workouts)`** | high | In-workout exercise identity tile — training surface. |
| `src/app/client/workouts/[id]/start/page.tsx` | 6584–6585 | “{targetReps} reps” chip — `/20` bg + text (**×2**) | system/structural | `var(--fc-accent-cyan)` | medium | Set metadata chip (siblings use status tokens for RPE/suggested weight). |
| `src/app/client/workouts/[id]/start/page.tsx` | 7899 | Workout completion modal — “Back to Dashboard” `Button variant="outline"` text color | **Ambiguous** | **`fc-text-primary`** or **`var(--fc-accent-cyan)`** or ghost pattern | medium | “Back” is not a lime CTA (§6.20); current choice looks like **link emphasis** — pick neutral text vs cyan vs explicit secondary styling on migration. |
| `src/app/client/workouts/[id]/start/page.tsx` | 8007 | Drop Set Calculator — manual weight input `focus:border-[color:…]` | **Ambiguous** | **`var(--fc-accent-cyan)`** *or* **`var(--fc-domain-workouts)`** to match L7958 | medium | Sibling “Working Weight” control uses `--fc-domain-workouts`; focus ring could follow **domain** for consistency or **cyan** for generic focus — user pick. |
| `src/components/coach/CoachExerciseCategoriesPanel.tsx` | 233 | Empty state — “Create Category” primary `button` (`bg-[color:var(--fc-accent-primary)]`, white text) | action/CTA | **`var(--fc-accent-lime)`** (or `.btn-action` / lime gradient utility per §6.20) | high | Primary forward CTA on empty state — v4 lime = action; mirrors FAB / primary create pattern. |

### Summary (audit)

| Bucket | Rows in table | Notes |
|--------|---------------|-------|
| **system/structural** (→ cyan or domain as listed) | 11 | Includes hub/analytics/edit/metadata/workout chrome where lime is wrong. |
| **achievement** (→ gold) | 2 | `analytics/page.tsx` Goal Completion tile (L1274 + L1291). |
| **action/CTA** (→ lime) | 1 | `CoachExerciseCategoriesPanel.tsx` empty-state Create. |
| **Ambiguous** (user pick) | 2 | `workouts/[id]/start` L7899 (Back to Dashboard), L8007 (drop calc focus border). |
| **Pillar / domain instead of generic accent** | **3 files** | `client/goals/page.tsx` L572 (per-`pillarId` map); `client/progress/page.tsx` L61 (→ `--fc-domain-workouts`); `client/nutrition/page.tsx` L888 (→ `--fc-domain-meals`). |

**No `var(--fc-accent-primary, …)` fallback chain** was found — nothing to split into a separate migration mechanic.

**User decisions (post-audit):** Goal Completion tile (**analytics** L1274 + L1291) uses **`--fc-accent-cyan`** (not gold) — in-progress completion must not read as “achieved gold” until Phase 6 state-aware work. **workouts/[id]/start** L7899 → **`--fc-text-primary`**; L8007 → **`--fc-domain-workouts`** (match L7958).

### Task 8.5 — Migration COMPLETE (Sun Apr 26, 2026)

- **Replacements:** all **29** occurrences of `var(--fc-accent-primary)` across **9** files, per approved row-level targets.
- **Post-migration grep:** `var(--fc-accent-primary` in `src/` → **0** matches.
- **Batches (5 + 4 files):**
  - **Batch 1:** `coach/goals/page.tsx` (L526 → cyan), `client/goals/page.tsx` (`PILLAR_SECTION_ICON_COLOR` map + pillar icon), `client/progress/analytics/page.tsx` (L1157, L1274, L1291 → cyan), `coach/categories/page.tsx` (L376), `client/progress/page.tsx` (L61 → `--fc-domain-workouts`, L397 → cyan).
  - **Batch 2:** `personal-records/page.tsx` (L53), `client/nutrition/page.tsx` (L888 → `--fc-domain-meals`), `CoachExerciseCategoriesPanel.tsx` (L233 → `--fc-accent-lime`, token only), `client/workouts/[id]/start/page.tsx` (L4876, L5243, L6553 → `--fc-domain-workouts`; L6584–6585 → cyan; L7899 → `--fc-text-primary`; L8007 → `--fc-domain-workouts`).
- **Pillar map:** `PILLAR_SECTIONS` only renders `training` \| `nutrition` \| `checkins` \| `lifestyle`; `Goal["pillar"]` also includes `general` — **`PILLAR_SECTION_ICON_COLOR.general`** maps to `var(--fc-pillar-general)` for exhaustiveness (defined in `ui-system.css`). No other pillar IDs appear in this UI.
- **IDE `read_lints`:** clean on all touched files. **`npm run lint`** still unavailable (no ESLint flat config in repo — same as Task 8).
- **Token sweep (log-only):** No new undefined tokens introduced; `--fc-accent-purple` (via `--fc-pillar-lifestyle`) and all pillar aliases were verified present in `ui-system.css` before migration. **Note:** `CoachExerciseCategoriesPanel` “Create Category” keeps `text-white` on `bg-[color:var(--fc-accent-lime)]` — contrast vs v4 §6.21 dark glyph was **not** changed (token-only task); revisit in Phase 1+ if needed.

### Phase 0b — 6-FAB extension (cyan `.fc-btn-primary` FABs → `.fab-action`) COMPLETE

**Date:** Sun Apr 26, 2026  
**Spec ref:** design-system-v4 §6.21 (same mechanical pattern as Task 6 on `client/goals/page.tsx`).

| # | File | Notes |
|---|------|-------|
| 1 | `src/app/client/progress/body-metrics/page.tsx` | FAB: removed `absolute bottom-24` + `fc-btn fc-btn-primary` + `h-14 w-14` + Plus `w-8 h-8` → `fab-action` + `<Plus />`. No wrapper. |
| 2 | `src/app/client/progress/performance/page.tsx` | FAB: removed `fixed bottom-24` + sizing + `fc-btn fc-btn-primary` → `fab-action` + `<Plus />`. No wrapper. |
| 3 | `src/app/coach/challenges/page.tsx` | FAB: `Button` with `fixed bottom-8 right-8 z-50` + `fc-btn-primary` → native `<button className="fab-action">`. **Header create CTAs not touched** (Phase 1+ duplicate-CTA work). Legacy offset was **32px bottom / 32px right** vs `.fab-action` **96px bottom / 16px right** — standardized to Task 6 slot. |
| 4 | `src/components/coach/OptimizedExerciseLibrary.tsx` | Removed wrapper `div` `fixed bottom-6 right-6`; `Button` FAB → native `fab-action`. **Header “Add Exercise” not touched.** Dropped `hover:scale-110` (`.fab-action` has its own hover). |
| 5 | `src/components/coach/OptimizedWorkoutTemplates.tsx` | Same pattern as exercise library. **Header create CTA not touched.** |
| 6 | `src/components/coach/CoachExerciseCategoriesPanel.tsx` | Mobile-only FAB: `fab-action md:hidden`. **Desktop “New category” button not touched.** |

**Global FAB inventory:** `fab-action` now appears on **7** call sites (Task 6 goals + these six). **`fc-fab`:** no active JSX callers (only JSDoc / CSS comments on `client/goals/page.tsx`). **Cyan FAB + `fc-btn-primary`:** the six audited call sites are cleared; remaining `fc-btn-primary` usages are the non-FAB CTA inventory from Task 7.

**Verification:** `read_lints` clean on all six touched files. Token sweeps on touched files: no new undefined `var(--fc-*)` in FAB blocks. **Logged (not fixed):** `CoachExerciseCategoriesPanel.tsx` still has `text-gray-400` on a list row (`~L185`) — outside FAB scope.

---

### Phase 0b — AtmosphericBackdrop shell wiring (FINAL, Sun Apr 26, 2026)

**Spec / plan:** Phase 0b F.5 Option 2 (layered); `AnimatedBackground` unchanged; `AtmosphericBackdrop` from Phase 0a.

| File | Change |
|------|--------|
| `src/components/client-ui/ClientPageShell.tsx` | Optional prop `backdrop?: AtmosphericVariant` (imported type name from `AtmosphericBackdrop.tsx`), default **`"info"`**. Renders `<AtmosphericBackdrop variant={backdrop} absolute className="z-0" />` as first child; `{children}` wrapped in `<div className="relative z-10 min-w-0">` so content stacks above the overlay. |
| `src/components/coach-ui/CoachPageShell.tsx` | Same pattern + JSDoc audit trail. |

**Integration reality:** Routes wrap `<AnimatedBackground>…<Shell>…</Shell></AnimatedBackground>`. The backdrop is **inside** the shell (not inside `AnimatedBackground.tsx`), so it fills the **shell column** (`absolute inset-0` within `relative` `fc-page`), visually layered **above** the gradient only under that column — full viewport width remains the animated gradient + vignette from `AnimatedBackground`.

**Wrapper layouts:** No new props on `client-ui/index` barrels or intermediate layout components in this task; Phase 1+ passes `backdrop={…}` on `ClientPageShell` / `CoachPageShell` where a screen recipe differs from `info`.

**Verification:** `read_lints` clean on both shell files. **Token sweep (log-only):** No new `var(--fc-*)` in shell sources; `.fc-backdrop-info` uses existing tokens (`--fc-accent-cyan`, `--fc-bg-basalt`) per `ui-system.css`. No consumer files modified.

---

## Phase 0b — CLOSED (Sun Apr 26, 2026)

Phase 0b is **closed**. Delivered:

- Tasks through **6-FAB extension** plus **AtmosphericBackdrop shell wiring** (this entry).
- **`docs/ui-rollout-notes.md`** is the running log; **`docs/design-system-v4.md`** remains authoritative for Phase 1+ screen work.

**Phase 1** may begin when the product owner sends an explicit go-ahead (this note does not substitute for that message).

### Deferred bug cleanup — dead CTAs (post–Phase 0b, Sun Apr 26, 2026)

Task 7 audit **Related issue D — Dead-CTA anti-pattern**; **Phase 0b remains CLOSED** (cleanup only).

| File | Fix |
|------|-----|
| `src/components/client/StreakCounters.tsx` | Extracted mock loader to `loadStreaks` (`useCallback`); `useEffect` calls `void loadStreaks()`. Empty-state **Start Streak** → `router.push('/client/habits')`. Empty-state **Refresh** → `void loadStreaks()`. |
| `src/components/client/ProgressCircles.tsx` | Empty-state **Start Tracking** → `router.push('/client/progress')` (new user + error paths). **Refresh Data** → `void loadProgressData()` (retry semantics). |

**Verification:** `read_lints` clean on both files.

---

## Phase 1 — Screen 1 (`/client`) — Precedents (Sun Apr 26, 2026)

Precedents discovered during the conversion of `src/app/client/page.tsx` to design-system v4. These rules generalise beyond Screen 1 and apply to all subsequent screens unless explicitly overridden.

**Precedence order:** **P-9 first** (project-wide mockup fidelity). Where **P-9** conflicts with any earlier precedent (**P-1** through **P-8**, rollout-plan wording, or v4 **visual** prescriptions), **P-9 wins**. Earlier precedents remain valid for non-visual concerns (layout invariants, helper ground truth, security, etc.) until they collide with mockup-mandated visuals — then defer to the mockup.

### P-9 — Mockup-first visual fidelity (project-wide; highest priority)

> **Every screen** in DailyFitness must match the **visual style** of the **canonical mockup HTML** files. This rule **supersedes** `docs/design-system-v4.md` **where they conflict on visual outcomes** (colors, typography, spacing, component shapes, hierarchy, motion). v4 remains authoritative for what the mockups do **not** specify: architecture, tokens/atomics as implementation plumbing, RLS, data contracts, anti-cargo-culting, accessibility baselines, and non-visual patterns.

**Canonical mockup files** (under `dailyfitness-app/docs/mockups/`):

| File | Canonical for |
|---|---|
| `client-screens-v5.html` | **Phone 1** → `/client` · **Phone 2** → `/client/train` · **Phone 3** → `/client/workouts/[id]/start` |
| `dashboard-v2.html` | `/coach` dashboard (when file is present in `docs/mockups/`) |

**Screens without a phone-specific mockup** still inherit the **shared style language** from these files:

- **Fonts:** Bricolage Grotesque (headlines), Big Shoulders Display (display numerals), Geist (body), Geist Mono (mono numerals)
- **Palette (mockup CSS vars):** `--aqua`, `--lime`, `--gold`, `--warning`, `--danger`, and surfaces `--bg-page`, `--bg-card`, `--bg-card-hi`, `--bg-elevated`, `--border`, `--border-hi`, text `--t1`–`--t5` — map to app tokens (`--fc-*`) where equivalents exist; **visual weight** matches the mockup
- **Card chrome:** `bg-card` + border; glass with backdrop blur where the mockup uses it; **hero** cards: lime-glow, **diagonal hatch** (`::before` repeating-linear-gradient ~135°), glow shadow
- **Typography scale:** per mockup blocks (e.g. `.greeting`, `.section-title`, `.strip-card`, `.duo-card`, `.hw-name`, `.nav-item`)
- **Spacing rhythm:** per mockup margin/padding values
- **Bottom nav:** **five equal items** + **cyan dot** under active item — **not** an elevated center hub
- **Hero pattern:** lime-glow + hatch + Bricolage headline + display numerals + `.btn-action` lime CTA
- **Stat strip:** three equal cards, display-font value, uppercase eyebrow label, sub caption
- **Status:** tinted **icon chips** — not card-wide semantic tints for routine states
- **Semantic color lanes:** **lime** = primary action · **cyan** = system / nav active · **gold** = achievement · **warning orange** = warning · **danger red** = critical only
- **Section heads:** Bricolage 600 **17px** + optional **“All →”** link in **t3**-style muted text

**Every future screen conversion must:**

1. **Identify** whether a **specific** mockup (phone/section) exists for that screen.
2. **If yes** — **read the HTML/CSS from disk** before implementation; **audit** the live (or skeleton) UI against it before writing final UI code.
3. **If no** — read `client-screens-v5.html` (client surfaces) or `dashboard-v2.html` (coach) for **shared style language** and apply consistently.
4. Target **≥90% visual fidelity** to the mockup or inherited style language.
5. Apply **v4** only where it **does not conflict** with the mockup (tokens as wiring, atomics, structure, documentation discipline).

**Retroactive:** this rule applies to all in-flight and future work. **Phase 1 Screen 1 Cluster 7** is the first full execution; Phase 1 Screens 2–4 and Phases 2–10 follow the same pattern.

### P-1 — Layout invariants on consumers

> Layout-context utilities (`flex-shrink-0`, `flex-grow-1`, `min-w-0`, `shrink-0`, etc.) are preserved on consumer elements when atomics don't ship them. Atomics handle chrome (color, padding, border, radius, hover); consumers handle layout context.

**Origin:** Cluster 1 JC-1 (`src/app/client/page.tsx` avatar button). Phase B mapping listed `btn-ghost-icon w-10 h-10 rounded-full overflow-hidden p-0` without `flex-shrink-0`. The avatar lives in a `<header className="flex items-center justify-between">` next to a sibling text block — without `flex-shrink-0`, long usernames could compress the avatar on narrow viewports. Layout invariant preserved (additive — no conflict with the atomic).

**Precedent:** every atomic-swap that touches a flex/grid child must check whether layout-shrink/grow context is needed, and preserve it on the consumer.

### P-2 — Content-occluded hover affordance

> When an atomic's hover affordance is occluded by content (image, overlay, etc.), add a content-level hover on the consumer (e.g., `hover:opacity-90`). Use **subtle intensity** (90% > 80%) when stacked on top of an atomic's existing hover so the combined effect doesn't feel draggy.

**Origin:** Cluster 1 JC-2 (`src/app/client/page.tsx` avatar button). `.btn-ghost-icon`'s hover (`color`/`border-color`) is invisible on the avatar because `<img className="w-full h-full object-cover">` covers the entire button surface. Resolution: `hover:opacity-90 transition-opacity` on top of `.btn-ghost-icon` — image-level dim restores affordance at reduced intensity (was original `opacity-80`).

**Precedent:** Will recur on coach client cards with avatars (Phase 8) and any tile/card whose surface is fully occluded by an image, badge, or overlay.

### P-3 — Helper output is ground truth

> When Phase B mappings reference helper outputs, helper enum names, or any data shape from existing code, the consumption-site implementation must verify the actual shape before applying. If a Phase B mapping uses key names that don't match the helper's real output, **STOP and ask** before applying — the user-side instruction may have been written from memory and the helper's actual API is the ground truth.

**Origin:** Cluster 3 (`STREAK_TIER_COLOR` mapping for `src/app/client/page.tsx` Section 5). The Phase B / cluster instruction listed tier keys `starting / solid / consistent / unstoppable` (4 keys). The actual `WorkoutStreakTierKey` enum at `src/lib/workoutStreakDisplay.ts` exports `starting / building / on_fire / unstoppable / legend` (5 keys). Stopped, surfaced the discrepancy, received corrected mapping with `legend` color before proceeding.

**Precedent:** before applying any consumption-site code that references a helper's output, **read the helper file first** to verify enum/object shape. If a mismatch exists with the instruction, halt and present options — never silently rename or pad.

### P-4 — Helper output: color vs behavior outputs

> When migrating helper outputs to v4 design tokens, distinguish **color/style outputs** (replace at the consumption site — V7 excludes them) from **behavior outputs** (preserve — V7 does **not** exclude them). Color/style outputs include `flameClass`, `accentClass`, `cardBorderClass`, `cardBgClass`, etc. — they ship Tailwind named-color or surface classes the v4 system replaces. Behavior outputs include `pulseClass` (animate-pulse), conditional render gates, derived label strings, and any non-decorative output the helper produces.

**Origin:** Cluster 3 JC-3e (`src/app/client/page.tsx` Section 5 streak chip). The `getWorkoutStreakDisplay` helper returns both `flameClass` (color) and `pulseClass` (behavior). The migration dropped `flameClass`, `accentClass`, `cardBorderClass`, `cardBgClass` (color outputs) and replaced them with token-driven inline styles + `STREAK_TIER_COLOR`, but **kept `pulseClass`** on the inner Flame+number row to preserve the `on_fire` / `legend` tier pulse animation. The pulse is a UX behavior signal, not a color signal.

**Precedent:** when reading a helper's return shape, classify each field:
- **Color/style** (`*Class` carrying Tailwind colors, surface classes, decorative gradients) → **drop** at consumption site, replace with v4 tokens.
- **Behavior** (`pulseClass`, animation classes, conditional booleans, derived strings) → **preserve** at consumption site.

This will recur on `/client/habits`, `/client/check-ins`, and other helper-driven screens in Phase 1 screens 2–4 and Phase 2–8.

### P-5 — Status temporality needs consumer-level opacity modifiers

> Status atomics (`.fc-card-status-*`) ship status chrome (background, border, base semantic color). Status **temporality** (`active complete`, `archived`, `de-emphasized`) is a consumer concern and requires consumer-level opacity modifier preservation.

**Origin:** Cluster 4 JC-4b (`src/app/client/page.tsx` check-in duo). Done-state cards migrated to `.fc-card-status-success` but retained `opacity-75` from the pre-conversion implementation. Dropping opacity changed semantic weight; preserving it kept the "completed/de-emphasized" feel while still using tokenized status chrome.

**Precedent:** apply status atomics first, then preserve or add consumer opacity where temporal salience needs differentiation. This is the same consumer-level pattern family as P-1 (layout invariants).

### P-6 — Validate "already correct" claims against live consumption code

> When phase mapping says a field/component is "already correct", but live consumption-site code contradicts that claim, surface the contradiction to the user instead of silently absorbing it into residue or auto-correcting.

**Origin:** Cluster 4 JC-4a (`src/app/client/page.tsx` check-in icons). The mapping said icons were already correct, but icon classes were still Tailwind named colors (`text-emerald-400/60`, `text-cyan-400`) and not tokenized. Resolution path: surface discrepancy, get user decision, then apply explicit migration (`color-mix(...var(--fc-status-success)...` and `var(--fc-accent-cyan)`).

**Precedent:** this is P-3's "ground truth first" principle applied to instruction validation at consumption sites. Real code state wins over memory-based mapping language.

### P-7 — Visual review is primary for substantial restructures

> Visual review of substantial restructures is mandatory and primary. Token-correct code can still render as visually broken when token values stack against unexpected backgrounds. The "imperceptible visual delta" contract applies to token-only migrations, not to structural/layout rewrites.

**Origin:** Phase 1 Screen 1 (`/client`) Cluster 3 stat-strip restructure. Although Section 5 was token-clean and lint-clean, screenshot review surfaced rendering bugs: streak headline number effectively disappearing at the "starting" state, supporting sublabels reading too weak in context, and mini-ring track contrast collapse on glass surfaces.

**Precedent:** every substantial restructure requires screenshot/browser verification before the cluster is considered done. If visual issues appear, diagnose token stacking in the rendered context (surface + text/icon/ring) and fix before advancing to subsequent steps.

### P-8 — Mockups are canonical visual references

> For screens with an explicit user-supplied mockup file (e.g. `docs/mockups/client-screens-v5.html`), that HTML/CSS is the **ground truth** for layout, proportions, typography, and treatments. Token correctness, lint cleanliness, and v4 spec text are **secondary** when they conflict with the mockup. When in doubt on a visual choice (icon size, padding, radii, hierarchy), **defer to the mockup**.

**Origin:** Phase 1 Screen 1 Cluster 7 — user-directed full `/client` rebuild against Phone 1 of `client-screens-v5.html` after Cluster 3’s token-correct stat strip still missed mockup fidelity.

**Precedent:** name the mockup file and phone/section in rollout notes when closing a screen; future regressions compare against that file first.

**Scope note:** P-8 remains the Screen-1 / file-specific articulation. **P-9** generalises mockup-first fidelity **project-wide**, lists canonical files (Phones 1–3, coach dashboard), the shared style-language checklist, the mandatory conversion workflow, and **explicit supremacy** over conflicting precedents and v4 **visual** claims — read **P-9** first.

---

## Phase 1 Screen 1 — Cluster 7 mockup rebuild (Apr 2026)

**Canonical reference:** `docs/mockups/client-screens-v5.html` — Phone 1 label `01 Client · Dashboard` (lines ~1249–1394; shared CSS lines ~10–1242).

**Supersedes:** Cluster 3 stat-strip layout (headline + supporting row + mini-ring + `fc-pillar-stripe` / tier-colored streak numeral). Cluster 7 flattens to three equal strip cards per mockup `.strip` / `.strip-card` and removes tier-driven streak numeral color.

### Standing decisions applied (execution)

1. Topbar **circle-check** → `/client/check-ins`; **bell** → `/client` until `/client/notifications` exists (`TODO` in `page.tsx`); lime dot when `hasUnreadNotifications` (placeholder `false`, `TODO` product).
2. **Greeting eyebrow** copy: program + `dayNumber` + `programProgress.totalWeeks` → `Up next · Day {n} of {total}`; generic workout → `Up next · Today's training`; rest → `Rest day · Recovery`; loading → no eyebrow.
3. **Hero card:** `HeroWorkoutCard.tsx` — lime-glow surface from mockup `.hero-workout`; duration uses RPC `estimatedDuration` when present, else `~60 min` with `TODO(backend)` in source; ghost **Info** → `/client/workouts/{templateId}/details` when `templateId` present (RPC returns `templateId` for program + assignment branches per `20260407_get_client_dashboard_program_counters.sql`).
4. **Athlete score:** **S1** compact band — `AthleteScoreSummary.tsx` (ring `140px`), one-line summary, **View breakdown →** → `/client/me`. Full `AthleteScoreRing` + `ScoreBreakdown` + `BiggestWinCard` moved to **`/client/me`** via `ClientScoreInsightsSection.tsx` (minimal scaffolding; full Me redesign deferred).
5. **Duo cards:** neutral outer chrome; **Daily** = `Clock` / `CheckCircle` in 28×28 neutral chip; **Check-in** = lime chip + `CheckCircle` only when done, else neutral + `Calendar`. Lime uses **`var(--fc-accent-lime)`** (defined in `ui-system.css` Phase 0a).
6. **Recent wins:** section head + **All →** → `/client/progress`; full-width `.ach-row`-style rows (no highlights pills).
7. **View full progress** link on `/client` **removed** (redundant with All →).
8. **Bottom nav:** `BottomNav.tsx` — **flat five items** for client and coach; removed `isCenter` / `fc-bottom-nav-item-center` hub. Active = **cyan dot** (`.fc-bottom-nav-active-dot`) per mockup; pill no longer rendered from this component. **Intentional:** this **replaces** design-system-v4 §6.23 elevated hub pattern for v5 mockup alignment (documented here; spec doc may lag).
9. **Fonts:** `layout.tsx` loads **Bricolage Grotesque**, **Big Shoulders Display**, **Geist**, **Geist Mono** (Google Fonts). `:root` in `globals.css` sets `--f-headline`, `--f-display`, `--f-mono`, `--font-display`, and extends `--font-geist-sans` / `--font-geist-mono` stacks.
10. **Eyebrow pulse:** `.fc-client-dashboard-eyebrow` + `::before` in `ui-system.css` (mock `.greeting .eyebrow`).

### Files touched

- `src/app/layout.tsx` — font link
- `src/app/globals.css` — font variables
- `src/styles/ui-system.css` — eyebrow + bottom-nav item flex + active dot
- `src/lib/clientDashboardPageData.ts` — **new** shared fetch/map/types (+ `todaysWorkout` optional `templateId`, `estimatedDuration`, etc.)
- `src/app/client/page.tsx` — full Phone-1-aligned recompose
- `src/components/client/HeroWorkoutCard.tsx` — **new**
- `src/components/client/AthleteScoreSummary.tsx` — **new**
- `src/components/client/ClientScoreInsightsSection.tsx` — **new**
- `src/app/client/me/page.tsx` — score insights + same RPC fetch
- `src/components/layout/BottomNav.tsx` — flat nav + dot active state

### Phase D — Drift self-check (Cluster 7)

| Mockup element (Phone 1) | Match? | Notes |
|---|---|---|
| Topbar 38px avatar + two 38px icon buttons | **Yes** | Lucide `CircleCheck` / `Bell`; avatar uses image + gradient border shell. |
| Greeting eyebrow lime + pulse | **Yes** | `.fc-client-dashboard-eyebrow`. |
| H1 30px Bricolage, name gradient italic | **Near** | H1 uses `--f-headline` + 30px; `.fc-greeting-name` remains cyan→lime (user spec), mock accent uses lime→lime-2. |
| Hero lime-glow card + CTA + optional info | **Near** | Surfaces mapped to `--fc-surface-*` / lime tokens; hatch overlay toned to fc text mix. |
| Stat strip 3× equal cards, 28px display nums | **Yes** | `--f-display` / `--font-display`; flame `--fc-status-warning`; no mini-ring. |
| Duo 16px radius, 14px padding, 28px ico | **Near** | Tailwind `rounded-2xl` (16px), `p-3.5` (14px). |
| Recent wins section + rows | **Near** | Row order: achievement (+ PR value), else PR-only, then leaderboard. |
| Bottom nav pill bar + 5 equal + dot active | **Near** | Shell still `fc-bottom-nav-float` (v4 chrome); inner items `flex:1` + dot. |
| Status bar (OS) | **N/A** | Web app. |
| Featured challenge strip on Phone 1 | **No** | Phone 1 HTML has no challenge block — `/client` **drops** `FeaturedChallengeBanner` for fidelity. |
| Mock body font Geist | **Partial** | Geist added to stack; much UI still `fc-page` / theme defaults. |

**v4 atomics retained on `/client`:** `btn-ghost-icon`, `btn-action`, `fc-text-*`, surface/border tokens, `ClientPageShell` + `tierBackdropVariant`, `TierBadge` in wins row.

**Dropped / restructured:** `fc-pillar-stripe` + `fc-glass` on stat strip; `STREAK_TIER_COLOR`; `ScoreBreakdown` + large ring + `BiggestWinCard` on `/client`; highlights **pills**; **View full progress** button; **FeaturedChallengeBanner** on `/client`; bottom-nav **center hub** + **active pill**.

---

## Component conventions

### Glass card decision matrix

- `Card` (`src/components/ui/card.tsx`) is for legacy shadcn layouts (forms/tables) where `fc-card-shell` is not required.
- `AppCard` (`src/components/ui/AppCard.tsx`) is for feature row cards that need status/header/footer slots (for example MealPlanCard/ProgramCard/features workout template cards).
- `GlassCard` (`src/components/ui/GlassCard.tsx`) is for coach/admin prescription-shell surfaces that need elevation and optional press behavior.
- `ClientGlassCard` (`src/components/client-ui/GlassCard.tsx`) is for client routes with default `p-4` and automatic `fc-card-shell-outline` when `className` contains `bg-*`.

### Skeleton usage

- `Skeleton` / `SkeletonCard` (`src/components/ui/Skeleton.tsx`) are generic inline pulse primitives for ad-hoc component loading.
- `LoadingSkeleton` (`src/components/ui/LoadingSkeleton.tsx`) is tuned for coach dashboard list-row loading.
- `PageSkeleton` (`src/components/ui/PageSkeleton.tsx`) is route-level full-page loading with `dashboard` / `list` / `form` layout variants.

### Modal default stack

For new modal UI:

- Default to Radix `Dialog` (`src/components/ui/dialog.tsx`) for standard modal semantics.
- Use `ResponsiveModal` (`src/components/ui/ResponsiveModal.tsx`) when mobile-sheet / desktop-modal split is required.
- Use `ModalPortal` (`src/components/ui/ModalPortal.tsx`) when explicit portaling is needed.
- Domain modals (`*Modal.tsx` in feature folders) are not the default for new work; they exist because of embedded business logic.
- Do not introduce `SimpleModal` in new code; it remains for legacy compatibility only.

### Pillar/domain color tokens

- `--fc-domain-*` tokens (`workouts`, `nutrition`, `checkins`, `lifestyle`, `general`) live in `src/styles/ui-system.css`.
- Use these tokens via the existing `fc-pillar-stripe` atomic for left-edge card accents.
- For inline tinted borders/accents in new code, use `border-[var(--fc-domain-X)]` or `color-mix()` with the relevant domain token (not Tailwind named colors).
- No `DomainAccent` wrapper component is introduced; consume the tokens directly.

### Glass shell usage

- For new card UI, prefer `GlassCard` or `ClientGlassCard` over raw `fc-card-shell` on a `div`.
- These shell components encode the canonical border/background/blur/tone combinations that raw class-only usage can drift from.
- Existing raw `fc-card-shell` usages stay as-is; no mass refactor is implied by this convention.

### Section dividers

- Canonical divider class for new code: `border-[color:var(--fc-glass-border)]`.
- Apply it directly on `hr`, `div`, or `border-b` / `border-t` utilities on existing elements.
- No `StackDivider` atomic is introduced.
- Avoid `border-white/X` divider patterns in new code.

---

## Phase 3 — Client UI consolidation (Groups 4–7)

- **Date completed:** Thu Apr 30, 2026

### Group 4 — Train / Active program parity

- **`/client/train`** loads dashboard page data in parallel with `get_train_page_data` via `fetchDashboardPageData` and passes `weeklyProgress` (`current` / `goal` from `get_client_dashboard`) into **`ActiveProgramCard`**.
- **`ActiveProgramCard`** uses that single source for the “This week” ring, fraction, and 6px lime bar; **Phase** / **Today** rows use `programWeek` week index and Monday-first day-in-week. Paused state unchanged.
- **`/dev/ui-gallery`**: `ActiveProgramCard` mock includes `weeklyProgress` for type/prop parity.

### Group 5 — Consumer migrations (buttons + atomics)

- **Primary / secondary CTAs** migrated on: workout **complete** and **details** pages, **start** page (prior), **`EnhancedClientWorkouts`**, **nutrition** retry, **goals/history**, **check-ins/history**, **`AssignedWorkoutRow`**, **ui-gallery** preview (shows `Button` `btn-action` / `fc-secondary` instead of legacy demos).
- **`PrimaryButton` / `SecondaryButton`** are thin re-exports of **`Button`** from `@/components/ui/button` with **`@deprecated`** JSDoc; **`index.ts`** still exports them for backwards compatibility.
- **Atomic adoption sweep (client surfaces, Apr 30 2026):** Extended **`Eyebrow`** (`dashboardEyebrow`, `density` = default | section | statStrip, `as` = div | span, extra tones: cyanMuted, cyanEmphasis, subtle, amber, zinc, emerald) and **`SectionHeader`** (`eyebrow`, `titleClassName`, `titleStyle`, `titleTone` = section | display | plain). Re-exported **`Eyebrow`** + **`IconButton`** from **`client-ui/index.ts`**. Migrated inline eyebrows / section titles / pills / topbar icons across **`/client`**, **`WeeklyCheckInCard`**, **`WellnessTrendsCard`**, **`BiggestWinCard`**, **`ChallengeCard`**, **`WorkoutLogCard`**, **`ProgramCompletedCard`**, **`ClientScoreInsightsSection`**, **`EnhancedClientWorkouts`** (performance labels), **all block executors** + **`ProgressIndicator`**, **`/client/workouts/[id]/details`** nav, **`/client/goals/history`**, **`/client/check-ins`**, **`/client/train`** coach note, etc.
- **Routes / components not yet fully converted** (inline uppercase pills, labels, or icon rows may remain): **`/client/nutrition`**, **`/client/goals`** (main), **`/client/progress`** hub + subroutes, **`/client/habits`**, **`/client/challenges`**, **`/client/activity`**, **`/client/check-ins/history`**, **`/client/check-ins/weekly`**, **`/client/workouts/[id]/start`**, **`/client/workouts/[id]/complete`**, **`HybridNutritionView`**, **`GoalBasedNutritionView`**, **`HabitTracker`**, **`MealCardWithOptions`**, **`ProgressCircles`**, **`StreakCounters`**, **`CheckInHistory`**, **`client/activity/*`**, **`client/progress/*`**, **`client/challenges/*`**, **`client/check-ins/*`** (beyond daily page), **`client/weekly-checkin/*`**, remaining **`workout-execution/ui/*`** (e.g. `PrescriptionCard`, `RestTimerModal`, `SetTypeBadge`), and **`client-ui/ScoreBreakdown`**, **`AthleteScoreRing`** chrome.

### Group 6 — Wellness / check-in typography

- **`WellnessTrendsCard`**: table numerals use the dashboard-aligned stack (`--f-display` → `--font-display` → `--font-number` → mono) plus **`tabular-nums`** (replacing bare `font-mono` on value cells).
- **`WeeklyCheckInCard`**: main metric values and delta chips use the same **`metricNumClass`** for numerals.

### Group 7 — Documentation and checks

- This entry records Phase 3 Groups 4–7 outcomes.
- **`npx tsc --noEmit`**: project currently reports parse errors in unrelated files (`coach/nutrition/generator/page.tsx`, `OptimizedAdherenceTracking.tsx`, `useSetLoggingOrchestrator.ts`, `goldenLogSet.ts`); none were introduced by the Phase 3 Group 4–7 edits listed above. Resolve those separately before CI can go green.

**Phase 3 status:** Group 4 complete; Group 5 button path + deprecated wrappers complete; Group 6 complete; Group 7 notes + lint on touched files — **complete for this batch**, with TS debt noted.
