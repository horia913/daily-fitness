# The 9.5 Standard — UI Specification

> **Status:** Canonical, 2026-04-16.
> **Authority:** This document and the four benchmark files below are the **only** sources of truth for UI work.
> **Precursors:** Everything in `dailyfitness-app/ui_tokens/` and the `*.DEPRECATED.md` docs in `dailyfitness-app/docs/` is retired and must not be cited.

---

## 1. The four benchmark files

These four shipped, graded screens define what a 9.5 looks like. When in doubt, **read the benchmark**, don't extrapolate.

| File | Role | Shell width (mobile) |
|---|---|---|
| `src/app/coach/page.tsx` | Coach Dashboard — dense command centre | `max-w-5xl` (inline `div`, no primitive) |
| `src/app/client/page.tsx` | Client Dashboard — hero + status + highlights | `max-w-lg` via `ClientPageShell` |
| `src/app/client/train/page.tsx` | Client Train — program week + selection | `max-w-lg` via `ClientPageShell` |
| `src/app/client/workouts/[id]/start/page.tsx` | Client Workout Start — live execution | `max-w-2xl` via `ClientPageShell` |

Three client pages, three different widths, on purpose. The Standard does **not** force "one width per role" — it forces "pick the benchmark closest to your screen's job and copy its width".

---

## 2. Root composition (mandatory)

Every route renders exactly this tree, in order:

```
<ProtectedRoute requiredRole="…">   // when route is role-gated
  <AnimatedBackground>               // exactly one per route, at the top
    {performanceSettings.floatingParticles && <FloatingParticles />}  // hero pages only
    <Shell …>                        // ClientPageShell | CoachPageShell (Phase 0) | inline only for legacy
      {/* content */}
    </Shell>
  </AnimatedBackground>
</ProtectedRoute>
```

Rules:

1. **Exactly one `AnimatedBackground` per route.** Nested `AnimatedBackground` is forbidden — it re-runs the gradient and stacks vignettes. Error states and empty states on the same route still render inside the same top-level `AnimatedBackground`.
2. **`FloatingParticles` is opt-in and gated** by `performanceSettings.floatingParticles`. It only appears on the Coach Dashboard today. Hero/premium pages may add it; data-dense pages must not.
3. **Shell wraps everything**, including error and loading states. `ClientPageShell` and (once built) `CoachPageShell` are the only allowed shells. Raw `<div className="max-w-...">` inside a page component is an anti-pattern except inside the coach dashboard where it pre-dates the primitive.
4. **`ProtectedRoute`** is only used for routes that require a specific role. Public routes (auth screens) skip it.

See: `src/components/client-ui/ClientPageShell.tsx`, `src/components/ui/AnimatedBackground.tsx`, `src/components/ui/FloatingParticles.tsx`, `src/components/ProtectedRoute.tsx`.

---

## 3. Shell widths — picking the right variant

Mobile width decisions are **copied from the benchmark closest to the screen's job**. Never invent a width.

| Screen archetype | `CoachPageShell` / shell + class | Benchmark | Notes |
|---|---|---|---|
| Client hero / dashboard / hub | `ClientPageShell className="max-w-lg"` | `/client`, `/client/train` | Single column, no dense tables. Use `overflow-x-visible` only if hero has a ring/glow that bleeds past the column (dashboard does). |
| Client execution / detail-heavy | `ClientPageShell className="max-w-2xl"` | `/client/workouts/[id]/start` | One-column but roomier so exercise cards and modals breathe. |
| Coach hero / dashboard | `CoachPageShell widthVariant="benchmark-5xl"` (`max-w-5xl`) | `/coach` | Parity-frozen variant; only used by the dashboard itself. |
| Coach default / detail (not data-dense) | `CoachPageShell widthVariant="default-5xl"` (`max-w-5xl`) | — | Same width as benchmark-5xl; separate variant so future padding/gap divergence doesn't require renaming. |
| Coach data / table / roster browse | `CoachPageShell widthVariant="data-7xl"` (`max-w-7xl`) | — | Table screens only — justified when a table > 6 columns or a card grid fills 4 columns at ≥1280px. |
| Coach single-column form / wizard | `CoachPageShell widthVariant="form-2xl"` (`max-w-2xl`) | — | Narrow form shell; matches `/coach/clients/add` audit reference. |

Paddings and bottom-safe spacing are copied from the shell primitive's default. **Do not override `px-4`, `pt-6`, `pb-32` unless the benchmark does** (e.g. client dashboard overrides pt/pb on purpose).

Desktop uplift (§14) uses `lg:` and `xl:` breakpoints only. **Never change mobile padding.**

---

## 4. Typography

All type comes from CSS custom properties defined in `src/styles/ui-system.css`. Never hardcode font sizes for heading/body text.

| Role | Token | Tailwind equivalent | Where it appears |
|---|---|---|---|
| Page h1 (client) | `var(--fc-type-h2)` = 24px | `text-2xl` | `style={{ fontSize: "var(--fc-type-h2)" }}` — client dashboard, client train |
| Page h1 (coach) | 24px bold | `text-2xl font-bold` | Coach dashboard inline |
| Section h2 | 14px semibold uppercase tracking-widest `fc-text-dim` | `text-sm font-semibold uppercase tracking-widest fc-text-dim` | Already codified in `SectionHeader` primitive (`src/components/client-ui/SectionHeader.tsx`) |
| Section h3 (sub) | 12px semibold uppercase tracking-widest `fc-text-dim` | `text-xs font-semibold uppercase tracking-widest fc-text-dim` | Coach dashboard sub-sections ("Recent check-ins", "Clients needing attention") |
| Body | 14–16px (`var(--fc-type-body)` 16 / `text-sm` 14) | `text-sm` or `text-base` | Use `text-sm` in dense lists, `text-base` only in hero copy |
| Caption | `var(--fc-type-caption)` = 14px `fc-text-dim` | `text-sm fc-text-dim` | Dates, subtitles |
| Micro | 10–11px mono `fc-text-dim` | `text-[10px] font-mono fc-text-dim` or `.fc-micro` class | Coach date strip, compact metadata |
| Tabular data | `tabular-nums` | Same | All numeric values (counts, percentages, streaks) — prevents width jitter |

Text colour: always `fc-text-primary` / `fc-text-dim` / `fc-text-subtle` / `fc-text-{domain|status}`. Never raw `text-white` / `text-black`.

---

## 5. Backgrounds & animation primitives

| Primitive | Source | Purpose | Gate |
|---|---|---|---|
| `AnimatedBackground` | `src/components/ui/AnimatedBackground.tsx` | Time-of-day gradient + vignette | Always one, at route root |
| `FloatingParticles` | `src/components/ui/FloatingParticles.tsx` | Ambient 15-particle drift | `performanceSettings.floatingParticles` only; hero routes |
| `AnimatedEntry` | `src/components/ui/AnimatedEntry.tsx` | IntersectionObserver stagger fade-up / scale-in | Optional; respects `performanceSettings.smoothAnimations`. Used on coach dashboard sections with delays 0, 50, 90, 100, 150, 200ms. Use sparingly — don't wrap every element, only top-level sections. |

Rules:

- `AnimatedEntry` is **not required**. Client dashboard and client train don't use it and still grade 9.5. Only add it when a screen has 4+ staggered sections and benefits from a choreographed entrance (coach dashboard does).
- `FloatingParticles` is **not required**. Adding it to a data-dense screen is an anti-pattern — motion competes with information.

---

## 6. Cards — four variants, pick by purpose

| Variant | Component / class | When | Benchmark usage |
|---|---|---|---|
| **Prescription shell** (neutral/semantic) | `ClientGlassCard` (client-ui) or `GlassCard` (ui, for coach) | Content cards with a left accent stripe. Default shape. | Client dashboard streak card, program % card; client train program cards |
| **Flat surface** | `fc-surface` class | Stat tiles, short info blocks, 2×2 grids | Coach dashboard stat grid (`Today's Snapshot`) |
| **Elevated surface** | `fc-surface-elevated` class | Shallow-depth floating tiles, avatars | Coach dashboard avatar circle |
| **Flat list row** | `border-b border-white/5 py-3 pl-2 border-l-[3px] border-l-<color>` | High-density scan lists (rosters, alerts, check-in queues) | Coach dashboard alerts list, client roster |

Rules:

- **`fc-card-shell` has a 4px left accent by default** (`var(--fc-card-shell-border-l)`). `ClientGlassCard` applies this automatically. Semantic tones (`success` / `error` / `warning` / `info`) change both the left accent and background via `fc-card-shell--*` modifiers.
- **When a card needs a custom `bg-*`** Tailwind class, `ClientGlassCard` auto-switches to `fc-card-shell-outline` (accent + radius only, no fill). This is documented in the component — leverage it, don't fight it.
- **Flat list rows > card stacks** for 6+ items. The coach dashboard's check-ins, alerts, and roster all use a single `border-y border-white/5` wrapper with `border-b border-white/5` per row, a 3px left accent, and a left icon tile — not individual cards. This is the target pattern for any list of 6+ rows.
- **Do not** wrap cards in `fc-glass` when the content is already a prescription shell. Double-blurred surfaces hurt performance and look muddy.

---

## 7. Section headers

Always use the `SectionHeader` primitive (`src/components/client-ui/SectionHeader.tsx`):

```tsx
<SectionHeader title="TODAY'S SNAPSHOT" action={<select …>…</select>} />
```

It renders an uppercase tracking-widest `fc-text-dim` title with an optional right-aligned action slot. The coach dashboard uses the manual equivalent class (`text-sm font-semibold uppercase tracking-widest fc-text-dim`) which matches exactly — migrating it to the primitive during Phase 1 is a pure mechanical change.

Sub-sections use `text-xs` (one tick smaller) but the same semantic style.

---

## 8. Buttons

| Component / class | When |
|---|---|
| `fc-btn fc-btn-primary fc-press` (+ `h-11 px-4 text-sm`) | Primary CTA (Retry, Submit, Start). Cyan gradient. |
| `fc-btn fc-btn-secondary fc-press` | Secondary actions (View Clients, Cancel, Export). Glass surface. |
| `fc-btn fc-btn-ghost` | Tertiary / inline (Menu header button, Dismiss). |
| `fc-btn fc-btn-destructive` | Delete / destructive only. |
| `Button variant="fc-primary"` / `variant="outline"` | When inside an `EmptyState` — the primitive uses shadcn `Button`. |
| Raw `<button>` with Tailwind | Allowed for icon-only headers, pressable list rows, compact chips. Must include `focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent-cyan)]/35` for a11y. |

All pressable surfaces use `fc-press` (scale(0.97) on active) or a Tailwind equivalent `active:scale-[0.98] transition-transform`.

Tap target minimum: **44×44 px** on mobile. Coach dashboard roster rows meet this via `py-3 pl-2` + 40px avatar.

---

## 9. Inputs

Use `fc-input`, `fc-select`, `fc-textarea` base classes, or the shadcn components configured with `variant="fc"`. The coach dashboard's search input is a good reference — `pl-10 pr-4 py-2 fc-surface rounded-xl border border-[color:var(--fc-glass-border)]`.

---

## 10. Status colour system (carried over, still valid)

| Status | Border / icon | Background tint | Icon |
|---|---|---|---|
| Completed / done | `var(--fc-status-success)` / emerald | 12% opacity | `CheckCircle` |
| Today / active | `var(--fc-accent-cyan)` | 12% opacity | `Zap` / domain icon |
| Missed / overdue | `var(--fc-status-warning)` / amber | 12% opacity | `AlertCircle` (pulsing) |
| Urgent / error | `var(--fc-status-error)` / red | 12% opacity | `AlertTriangle` |
| Info | `var(--fc-status-info)` / blue | 12% opacity | `AlertCircle` |
| Upcoming / neutral | `var(--fc-glass-border)` | transparent | `Circle` |
| Rest / locked | `var(--fc-glass-border)` | transparent, `fc-completed`/`fc-locked` | `Coffee` / `Circle` (dim) |

Selected row indicator: left `border-l-[3px] border-l-<status>` plus subtle full-row tint (coach dashboard alerts do this — copy the pattern).

---

## 11. Icon system (carried over, still valid)

- **Exercises:** always `getExerciseVisuals()` from `src/lib/exerciseIconMap.ts`. Never emoji.
- **Food:** always `getFoodVisuals()` / `getMacroVisuals()` / `getSpecialFoodVisuals()` from `src/lib/foodIconMap.ts`. Never emoji.
- **Activities (cardio / lifestyle):** intentionally use the emoji from `ACTIVITY_META` in `src/lib/clientActivityService.ts`. This is on-purpose — activities are casual.
- **Navigation / structural UI:** Lucide only (`ChevronRight`, `Search`, `Users`, etc.).

Icon tiles: 32–40px rounded square, background = tinted colour 12–15% opacity, icon colour = the domain / status full colour. Coach dashboard's alert rows use `h-9 w-9 rounded-lg fc-surface-elevated`.

---

## 12. Loading states

There are **only two acceptable loading patterns**:

1. **Inline skeletons** — `fc-skeleton` (token class from `ui-system.css`) for small placeholders (single heights), and the `Skeleton` / `SkeletonCard` primitives in `src/components/ui/Skeleton.tsx` for typed shapes (`text`, `circular`, `rectangular`, `card`).
2. **`PageSkeleton` primitive** (Phase 0, to be built) — a composed hero-like layout for initial page loads when the screen has a predictable top-to-bottom structure.

Anti-patterns:

- `animate-spin` as the whole-page loader. It's an anti-pattern and must be replaced during the Phase 1 mechanical sweep.
- Replacing the header with a spinner. Always keep the header rendered and skeletonise below it (see client dashboard loading branch).
- Using a different shell/layout in the loading state than in the loaded state. It must be the **same shell, same hierarchy, same approximate heights**, just greyed blocks.

Reference: client dashboard's `loading` branch and client train's `loading ? (…) : null` pattern.

---

## 13. Empty and error states

### Empty
Use the `EmptyState` primitive from `src/components/ui/EmptyState.tsx`. It supports:

- `variant="default"` — full card with rounded tile, title, description, CTA. Used when the empty state **is** the screen's body.
- `variant="compact"` — 2/3 the size, for sub-sections.
- `variant="inline"` — single muted line, for "No items" under a section title.
- Icon may be passed as a Lucide component or a rendered node.
- Action may be a link (`actionHref` + `actionLabel`) or a button (`onAction` + `actionLabel`), or the legacy `action={{ label, href, onClick }}` object.

Reference: client train's `<EmptyState icon={<Dumbbell …/>} title="No program assigned yet" description="…"/>`.

### Error

All four benchmarks show errors inline, not as a toast for the initial load. Two templates, copy from the benchmark that matches:

- **Coach dashboard style (card + CTA):** full-width red-left-bordered `fc-surface rounded-2xl p-4 mb-6 border-l-4 border-l-[color:var(--fc-status-error)]` with the message on the left and a `fc-btn-primary` "Retry" on the right.
- **Client train style (flat bottom-bordered):** `border-b border-white/5 border-l-2 border-l-[color:var(--fc-status-error)] py-4 text-center` with a `fc-btn-secondary` Retry below the message.

Client dashboard has a third template (centered full-page card at `min-h-[60vh]`) for the "could not load the page at all" case. Only use that for hard-fail scenarios where the loaded content would be empty.

---

## 14. Density — mobile rulebook (untouchable)

The four benchmarks grade 9.5 on mobile. **Phase-1 through Phase-5 work must not change any mobile density token.** Specifically:

- `--fc-page-px: 16px` / `--fc-page-px-md: 24px`
- `--fc-page-pt: 16px`, `--fc-page-pb: 120px`
- `--fc-card-padding: 24px`
- `--fc-gap-cards: 16px`
- `--fc-gap-sections: 24px`
- `--fc-list-row-min-height: 48px`
- `--fc-list-row-py: 12px`
- `--fc-list-row-px: 16px`

Any density changes apply at `lg:` (≥1024px) or `xl:` (≥1280px) **only**, via Tailwind breakpoint prefixes, so mobile is physically untouched.

---

## 15. Desktop uplift — centered-column model

The agreed desktop approach is:

- **Keep the same centered column** as mobile (max-w-lg / max-w-2xl / max-w-5xl / max-w-7xl depending on role).
- **Add `lg:` and `xl:` refinements**, not full-desktop redesigns:
  - Slightly larger type on headers (`lg:text-3xl`) where the benchmark has `text-2xl`.
  - Two-up grids that were single-col on mobile (`grid-cols-1 lg:grid-cols-2`) only for secondary-action sections, never for hero blocks.
  - More horizontal padding (`lg:px-8`) on the shell when the column is wide.
  - Tables (coach data screens only) may switch from card-list to true table at `lg:`.
- **Never** introduce a sidebar-first layout or a multi-pane desktop composition. The mobile composition up-scales; it does not restructure.

Rationale: the mobile experience is "rock solid almost" on the benchmarks. Desktop must not regress it. Centered-column lets the same components render on both without branching.

---

## 16. Accessibility

- All pressable surfaces must have an accessible name (`aria-label` for icon-only buttons; text for labelled buttons).
- Focus-visible: `focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent-cyan)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--fc-bg-deep)]` — see coach dashboard roster row.
- Tap target minimum 44×44px on mobile; lists use `py-3` + ≥40px avatar to meet this.
- Colour contrast: `fc-text-primary` on `fc-bg-deep` passes AA in both themes — verified via token definitions. Never swap `fc-text-primary` for a domain colour on body text.
- `aria-hidden` on decorative particles, vignettes, and skeleton shimmer.
- Form fields must have associated labels; `<label htmlFor>` or `aria-labelledby`.
- Status: never communicated by colour alone — always pair with a label or icon (the status pill already does this).

---

## 17. Motion

- Respect `useTheme().performanceSettings.smoothAnimations`, `floatingParticles`, and `animatedBackground`. `AnimatedBackground`, `AnimatedEntry`, and `FloatingParticles` all read this — copy that pattern for any new motion.
- Entrance animations: `fc-fade-up` (opacity + 16px translateY), `fc-scale-in` (opacity + scale 0.92 → 1), stagger in 40–60ms increments. Max 200ms total stagger for a screen.
- Press feedback: `fc-press` or `active:scale-[0.98] transition-transform duration-150`.
- Skeleton: `fc-skeleton` shimmer animation only; never a generic `animate-pulse` on a whole card.

---

## 18. Anti-patterns (hard-no)

| Anti-pattern | Why | Correct |
|---|---|---|
| Nested `AnimatedBackground` | Stacks vignettes; doubles the gradient timer | One at route root only |
| `animate-spin` as a page loader | No structural preview; feels broken | `Skeleton` / `PageSkeleton` / inline `fc-skeleton` |
| `animate-pulse` on a whole card | Blurs content in a way that looks like a render bug | Use `fc-skeleton` only on skeleton shapes |
| Raw `<div className="max-w-…">` as a shell | Drifts from primitive | `ClientPageShell` / `CoachPageShell` |
| Raw `style={{ background: "#1c2333" }}` card | Bypasses theme + tokens | `ClientGlassCard` / `fc-surface` |
| Flat `bg-[var(--fc-bg-deep)]` page background | Removes `AnimatedBackground` | Keep `AnimatedBackground` at root |
| `text-white` / `text-black` | Breaks opposite theme | `fc-text-primary` / `fc-text-dim` |
| `position: fixed` modal inside a transformed parent | Breaks on mobile (AnimatedBackground uses transform via entry wrappers) | `createPortal(content, document.body)` |
| Auto-dismiss on celebration / PR modals | User loses the moment | Manual close only |
| Per-component icon maps (food / exercise) | Diverges from the canonical mapping | Always import from `exerciseIconMap.ts` / `foodIconMap.ts` |
| Emoji for exercises or food items | Inconsistent, not theme-aware | Lucide via the icon utilities |
| Mockup-file references in a page component comment | Mockups are retired | Reference the benchmark file + this spec |

---

## 19. Self-grade rubric — the path from 9.0 to 9.5

Grade a screen on these seven axes out of 10. Every axis must be ≥9.0 for a 9.0 screen, and ≥9.5 average for a 9.5 screen.

1. **Composition** — Uses `ProtectedRoute > AnimatedBackground > Shell`; exactly one `AnimatedBackground`; shell width matches benchmark; `pb-32` bottom-safe.
2. **Typography hierarchy** — h1 at `var(--fc-type-h2)` or `text-2xl font-bold`; `SectionHeader` for section titles; `tabular-nums` on numeric data; no raw `text-white` / `text-black`.
3. **Cards & surfaces** — Correct variant for the job; prescription shell for content cards; flat list row for 6+ items; no nested glass.
4. **Loading & empty** — Structural skeletons (not spinners); `EmptyState` primitive for empty sections; error surfaces match one of the two benchmark templates.
5. **Density & tap targets** — No changes to mobile density tokens; ≥44×44px tap targets; lists use `border-y border-white/5` flat wrapper where ≥6 items.
6. **Motion & responsiveness** — Respects `performanceSettings`; enter animations ≤200ms total; press feedback on every tappable; desktop `lg:`/`xl:` uplift never regresses mobile.
7. **Accessibility** — Focus-visible rings; `aria-label` on icon-only buttons; colour not the sole status signal; dark + light both pass.

A screen at 9.0 meets all seven.
A screen at 9.5 additionally:

- Uses `AnimatedEntry` staggered entrance when it has 4+ sections worth of payoff.
- Has a single motivational / contextual micro-copy line in each empty / rest state (see §11 of the deprecated `UI_ENHANCEMENT_WORKFLOW.md` for examples — that content is still valid).
- Has at least one "delight" micro-interaction (streak pulse, ring fill, celebration modal path, or `fc-hover-rise` on a hero card).
- Desktop uplift is applied: h1 `lg:text-3xl`, optional two-up at `lg:`, breathing padding `lg:px-8` — without regressing mobile.

---

## 20. Related artefacts

| Artefact | Where |
|---|---|
| Benchmark files | `src/app/coach/page.tsx`, `src/app/client/page.tsx`, `src/app/client/train/page.tsx`, `src/app/client/workouts/[id]/start/page.tsx` |
| Per-screen grades (snapshot) | `dailyfitness-app/docs/ui/audit-grades-2026-04-16.md` |
| Screen inventory + target widths | `dailyfitness-app/docs/ui/screen-inventory.md` |
| Per-screen uplift workflow | `dailyfitness-app/docs/ui/UI-UPLIFT-WORKFLOW.md` |
| Cursor rules | `dailyfitness-app/.cursor/rules/ui-benchmark-standard.md`, `ui-page-shells.md`, `ui-loading-and-empty-states.md`, `ui-desktop-density.md` |
| Tokens | `dailyfitness-app/src/styles/ui-system.css` |
| Primitives (existing) | `ClientPageShell`, `ClientGlassCard`, `GlassCard`, `SectionHeader`, `EmptyState`, `Skeleton`/`SkeletonCard`, `AnimatedBackground`, `FloatingParticles`, `AnimatedEntry` |
| Primitives (Phase 0, built 2026-04-16) | `CoachPageShell` (`src/components/coach-ui/CoachPageShell.tsx`) |
| Primitives (Phase 0, to be built) | `PageSkeleton` |

---

## 21. Rule of thumb

> When you are not sure, open the benchmark file that best matches the screen you are working on and copy from it. Do not invent. Do not improvise. Do not cite a mockup.
