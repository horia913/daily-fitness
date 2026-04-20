# UI Uplift Workflow — Per-Screen Checklist

> **Purpose:** Give every contributor (human or AI) a repeatable, mechanical playbook for lifting one screen to the 9.5 Standard. Every step has a hard gate — if the gate fails, stop and ask.
>
> **Before you touch any screen, read:**
> - `docs/ui/95-STANDARD.md` — the spec.
> - `docs/ui/screen-inventory.md` — the target shell/width and phase for this screen.
> - `.cursor/rules/ui-benchmark-standard.md` — the benchmark-fidelity rule.
> - `.cursor/rules/ui-page-shells.md` — shell usage.
> - `.cursor/rules/ui-loading-and-empty-states.md` — loading, empty, error templates.
> - `.cursor/rules/ui-desktop-density.md` — desktop density rules.

---

## Mandatory preflight (every screen)

Before making any changes:

1. **Open the screen's file.** Note its current: shell (or raw `<div>`), width class, `AnimatedBackground` count, loading pattern, empty pattern, error pattern.
2. **Open the matching benchmark** (see §3 of `95-STANDARD.md`). The benchmark is your yardstick.
3. **Open the inventory row** for this screen in `screen-inventory.md` to read the assigned target shell/width and phase.
4. **If any of the following is true → STOP and ask the user:**
   - The target shell/width is unclear or not in the inventory.
   - The screen uses a bespoke shell (e.g. `ChallengesPageShell`) that the inventory marks "unify" but the unification would change visible behaviour.
   - The change would touch mobile density tokens or change a non-breakpointed class on one of the four benchmark files.
   - The screen is a benchmark (Tier S). Benchmarks are frozen; only Phase 5 desktop-only polish is allowed.
   - A primitive listed as "Phase 0, to be built" does not yet exist (`CoachPageShell`, `PageSkeleton`).

---

## The six-step template (Tier C/D screens)

### Step 1 — Composition

- Confirm root composition: `ProtectedRoute > AnimatedBackground > Shell`.
- Wrap or migrate to the target shell from the inventory.
- Remove any nested `AnimatedBackground` (Phase 1.2).
- Ensure loading, empty, and error branches all render inside the same shell.

**Gate:** the page renders one `AnimatedBackground`, inside one shell, with no raw `<div className="max-w-...">` acting as shell.

### Step 2 — Width / padding

- Apply the target width variant literally (copy from benchmark — do not invent intermediate widths).
- Keep `px-4`, `pt-6`, `pb-32` unless the benchmark deviates.
- Desktop uplift (if any): add `lg:` / `xl:` overrides only.

**Gate:** mobile width, padding, and gap classes match the benchmark's values byte-for-byte (only the width class itself may differ across the four benchmarks).

### Step 3 — Loading + empty + error

- Replace `animate-spin` full-page loaders with `<PageSkeleton>` (Phase 0.3) or inline `<Skeleton>` / `fc-skeleton`.
- Replace hand-rolled empties with `<EmptyState>` (correct variant).
- Replace hand-rolled errors with one of the two benchmark templates (card-with-Retry or flat-bottom-bordered). Hard-fail first-load errors may use the centered-card template from the client dashboard.

**Gate:** zero `animate-spin` remaining for page-level loading (button-level in-flight is fine). Empty and error states use the primitive or benchmark template.

### Step 4 — Surfaces & hierarchy

- Replace `<div style={{ background: ... }}>` and raw `bg-white/10` cards with the right variant (`ClientGlassCard` / `fc-surface` / `fc-surface-elevated` / flat list row).
- Use `SectionHeader` for section titles (uppercase tracking-widest `fc-text-dim`).
- Lists of 6+ items → flat `border-y border-white/5` wrapper with `border-b border-white/5` rows and 3px left accent (copy coach dashboard alerts / check-ins pattern).
- Numbers → `tabular-nums`.
- Text colour → `fc-text-primary` / `fc-text-dim` / `fc-text-subtle` / `fc-text-{domain|status}`. No `text-white` / `text-black`.

**Gate:** no raw bg/color hexes, no raw white/black text classes, no free-standing title without `SectionHeader` (for sections), `h1` matches the benchmark's scale.

### Step 5 — Density & tap targets (mobile)

- Tap targets ≥44×44px. Lists use `py-3` + ≥40px leading avatar/icon tile.
- Section gap uses `var(--fc-gap-sections)` (24px) or `var(--fc-gap-cards)` (16px) — do not invent.
- **Do not change** any `--fc-*` density token on mobile.

**Gate:** mobile density unchanged; all pressable rows meet 44px.

### Step 6 — Desktop uplift (`lg:` / `xl:` only)

- `text-2xl` `h1` → `lg:text-3xl` if the benchmark tolerates it.
- Secondary sections may go `grid-cols-1 lg:grid-cols-2` if content is parallel.
- Shell may add `lg:px-8`.
- Coach data screens may swap card-list for true table at `lg:` — but the card-list must remain for `<lg:`.

**Gate:** no class added without `lg:` / `xl:` prefix; mobile view visually identical to pre-change; desktop view improves proportion.

---

## The three-step template (Tier B screens — already ≥7.0)

Skip Steps 1–3 if the screen already passes their gates. Apply only:

- Step 4 (surfaces & hierarchy) — correct any small deviations.
- Step 5 (density) — confirm no deviation.
- Step 6 (desktop) — add breakpointed polish.

---

## Tier S (benchmarks) — Phase 5 only

The four benchmarks are frozen on mobile. Only these are allowed:

- Desktop-only `lg:` / `xl:` polish (Step 6).
- Pure refactors that preserve byte-identical rendered output (e.g. migrating `/coach/page.tsx` from its inline `max-w-5xl` to `<CoachPageShell variant="benchmark-5xl">` in Phase 1.1 only if the primitive renders byte-identical output).
- Accessibility fixes that do not change visual output.

Any change that affects mobile rendering of a benchmark → **STOP and ask the user.**

---

## Self-grade after every screen

After finishing the steps, self-grade on the seven axes from `95-STANDARD.md` §19:

1. Composition
2. Typography hierarchy
3. Cards & surfaces
4. Loading & empty
5. Density & tap targets
6. Motion & responsiveness
7. Accessibility

All seven must be ≥9.0 to declare the screen "done for this phase". If any axis is <9.0, document what's blocking it (often waiting on a Phase 0 primitive or a user decision) and move on.

---

## Phase-by-phase ordering

### Phase 0 — Foundation (no user-visible change)

1. **0.1** Ship `docs/ui/95-STANDARD.md` — **DONE 2026-04-16**.
2. **0.2** Build `CoachPageShell` primitive — **DONE 2026-04-16** (`src/components/coach-ui/CoachPageShell.tsx`, four variants ratified: `benchmark-5xl` / `default-5xl` / `data-7xl` / `form-2xl`).
3. **0.3** Confirm `EmptyState` and `SectionHeader` exist (they do — ratified) and build `PageSkeleton` primitive — **DONE 2026-04-16** (`src/components/ui/PageSkeleton.tsx`, three variants ratified: `dashboard` / `list` / `form`, width-agnostic by design).
4. **0.4** Cursor rules — **DONE 2026-04-16** (`ui-benchmark-standard.md`, `ui-page-shells.md`, `ui-loading-and-empty-states.md`, `ui-desktop-density.md`) and `ui_tokens/DEPRECATED.md`.
5. **0.5** This workflow doc — **DONE 2026-04-16**.

### Phase 1 — Mechanical sweep (applies across all graded screens)

1. **1.0** Read every file in the inventory and fill in the `Current shell` cells. Commit the annotated `screen-inventory.md`.
2. **1.1** Migrate every `/coach/**` route to `CoachPageShell` with the agreed width variant. One PR per sub-directory, mobile-byte-identical.
3. **1.2** Remove nested `AnimatedBackground` on the four confirmed offenders (`/coach/exercises`, `/coach/compliance`, `/coach/analytics`, `/coach/reports`) and any others surfaced by Phase 1.0.
4. **1.3** Replace full-page `animate-spin` with `<PageSkeleton>` or inline `<Skeleton>` everywhere. Keep button-level in-flight spinners.
5. **1.4** Delete dead redirect routes (`/coach/habits`, `/coach/exercise-categories`). **Before deletion, confirm no nav link references them.**
6. **1.5** Unify bespoke client shells (`ChallengesPageShell`, `ClientLeaderboardPageBody` wrappers, `/client/challenges/[id]` wrapper) to `ClientPageShell`.
7. **1.6** Label + header hygiene: fix `/coach/analytics` `hidden sm:block` subtitle, fix `/coach/clients/[id]/progress` title/route mismatch, audit sidebar labels.

### Phase 2 — Tier D rescue

Per the six-step template, targeting the six Tier D screens listed in `audit-grades-2026-04-16.md`. **Some require user decisions before rework** (`/coach/meals` merge vs delete; `/coach/programs/[id]/edit` hierarchy refactor). Surface those decisions first.

### Phase 3 — Tier C polish

Per the six-step template. Seventeen screens.

### Phase 4 — Tier B polish

Per the three-step template. ~28 screens.

### Phase 5 — 9 → 9.5 push

Across all ≥9.0 screens, including the four benchmarks: desktop-only polish (Step 6), micro-interactions, accessibility pass. Re-grade and publish `docs/ui/audit-grades-YYYY-MM-DD.md`.

---

## When to stop and ask the user (non-exhaustive)

- Any primitive listed as "to be built" does not yet exist.
- A screen needs a shell variant that isn't in `CoachPageShell`.
- A rework would change a Supabase query, a prop contract, or a route.
- A mobile change is the only way to reach 9.5 on a non-benchmark screen.
- A merge/delete decision affects a user-visible nav entry (e.g. `/coach/meals`).
- An admin route's grade / target would need to be set (admin is out of scope here).
- A regrade would change the published 2026-04-16 snapshot (don't edit it; publish a new dated file).

---

## Per-screen compliance checklist (copy/paste into PR description)

```
Route: <path>
Phase: <1|2|3|4|5>
Target shell/width: <CoachPageShell variant="..." | ClientPageShell max-w-...>

Step 1 — Composition
[ ] One AnimatedBackground at route root
[ ] Shell wraps loading, loaded, empty, and error branches
[ ] No nested AnimatedBackground

Step 2 — Width / padding
[ ] Mobile width matches target variant
[ ] Mobile padding/gap unchanged vs pre-change (benchmarks) or matches target (non-benchmarks)
[ ] Desktop changes use lg:/xl: prefixes only

Step 3 — Loading + empty + error
[ ] No full-page animate-spin
[ ] Skeletons used (inline or PageSkeleton)
[ ] EmptyState primitive for empty sections
[ ] Error matches one of the two benchmark templates (or hard-fail template)

Step 4 — Surfaces & hierarchy
[ ] No raw bg-white/10 or inline hex cards
[ ] SectionHeader used for section titles
[ ] 6+ item lists use flat border-y pattern
[ ] Numbers use tabular-nums
[ ] Text colour uses fc-text-* only

Step 5 — Density (mobile)
[ ] No change to --fc-* tokens
[ ] Tap targets ≥44×44 px
[ ] Gaps use existing tokens

Step 6 — Desktop
[ ] All new classes have lg:/xl: prefix
[ ] Mobile rendering unchanged
[ ] h1 upsized at lg: where applicable

Accessibility
[ ] Focus-visible rings on all pressable
[ ] aria-label on icon-only buttons
[ ] Colour not the only status signal

Self-grade (out of 10 on each axis, all must be ≥9.0 for this phase)
Composition:        __
Typography:         __
Surfaces:           __
Loading/empty:      __
Density:            __
Motion/responsive:  __
Accessibility:      __
```
