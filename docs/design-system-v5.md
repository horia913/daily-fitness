# Design System v5 — DailyFitness (shipped)

> **Status:** v5 · **Source of truth.** Describes the app as it ships today.  
> **Authority:** shipped screens first (client + coach), plus `src/styles/ui-system.css` + `src/app/globals.css`.  
> **Supersedes:** [`design-system-v4.md`](./design-system-v4.md) (aspirational; contradicts production).  
> **Audience:** agents applying UI to a new screen — read this file and the token CSS; do not invent lime, glass tiers, or atmospheric layers.

**If this file conflicts with shipped UI, shipped UI wins** — update this document to match the screens, never the other way around. If an older doc conflicts with this file, this file wins over the older doc (until shipped UI says otherwise).

---

## Visual register

**This app is saturated, glossy and energetic** — the register is sports-broadcast graphics, not minimal SaaS. Solid colour blocks, gradient fills, glow on accents, bold display numbers. **This is deliberate.** Restraint is not the goal; legibility and hierarchy are.

**Never mute, de-saturate, soften, or flatten existing UI in the name of restraint.** Do not replace a solid colour block with a tinted outline. Do not reduce a bright accent to a hairline. If a choice is between "more restrained" and "matches the shipped screens", **match the shipped screens**.

### Reference screens (authoritative)

When in doubt, open these screens and match them. **Screenshots outrank prose in this document.**

| Screen | What it demonstrates |
|--------|----------------------|
| **Client home / Train / workout execution** | Flat near-black page, bright blue CTAs, green log button, effort tiers, mono eyebrows, left accent bars on section headers. |
| **Coach clients list rows** | Status-tinted entity cards: coloured left rail + gradient wash fading out by ~65%, saturated status chips. |
| **Program builder** (`/coach/programs/[id]/edit`) | Solid teal/orange phase bars with glow, solid green progression pills, coloured block badges, amber load %, cyan RIR. |

### Hard rules (checklist)

- **Blue `#2E7BFF` = go forward** (start, create, navigate, primary CTA). **Green `#22E56A` = commit a unit of work** (log set, save, mark done). "Complete X" buttons that *end a flow* are blue.
- **No lime.** `--fc-accent-lime` was a token name holding blue; it's been removed. Lime is not a colour in this app.
- **No card fill lighter than the page.** Cards are transparent + hairline, or page-black when floating above content, or darker (`#050608`) when nested. Never grey.
- **Status tints are correct** on entity rows/cards (coloured rail + wash). They are not "decoration to remove".
- **Saturation lives in accents**, not in card backgrounds — solid pills, coloured badges, bright status colours, glow on primary actions.
- Type: **Archivo** display (names, numbers), **JetBrains Mono** (labels, eyebrows, data — uppercase, tracked), **Inter** (body).

### Working dimensions

Some screens have layout dimensions that are **load-bearing, not cosmetic**. The program builder’s day columns (**~385px**, do not reduce) and their inner content width are one: if a column narrows, exercise names and prescription lines wrap and the screen becomes unusable for its actual job.

**Rule:** never take horizontal width from a working surface to fit a new element. New panels go above or below, or overlay; they don’t shrink the thing being worked in.

---

## How to use this document

1. **Visual register** (above) — match the shipped look; do not mute or flatten.
2. **Colour law** (§2) — pick blue vs green before any component.
3. **Surfaces** (§1) — apply `.fc-client-surfaces` on client; do not invent lighter-than-page cards.
4. **Type** (§3) — Archivo / JetBrains Mono / Inter only.
5. **Patterns & components** (§5–§6) — reuse existing pieces.
6. **Desktop** (§7) — width rules at `≥1024px`.

---

## 1 · Surfaces

### 1.1 Roles (four — not five)

| Role | Token | Value (client) | When |
|------|--------|----------------|------|
| **Page** | `--fc-bg-deep` | `#0A0B0D` | Full-bleed screen background |
| **Inset** | `--fc-surface-inset` | **transparent** + hairline border | Cards sitting *on* the page |
| **Float** | `--fc-surface-float` | `var(--fc-bg-deep)` (opaque page-black) | Modals, sheets, toasts, nav chrome above the page |
| **Well** | `--fc-surface-well` | `#050608` | Nested inset (inputs, log slots) — darker than page |
| **Tint** | `--fc-surface-tint` | `rgba(255,255,255,.035)` | Faint callout / technique blocks |

**Rule (client baseline):** transparent inside the page · page-black when floating above · darker when nested · **never lighter than the page.**

Scoped by **`.fc-flat-surfaces`** (alias `.fc-client-surfaces`) on `/client*` and `/coach*` via `AppLayout` / `DesktopShell` / `src/app/client/layout.tsx`, plus `html[data-fc-surface-scope="flat"]` for portals. Under that scope, legacy `--fc-surface-card` / `--fc-glass-*` / `--fc-collection-card` remap to the roles above so old class names stay flat. Admin keeps milky `:root` defaults.

### 1.2 Client vs coach surfaces (current shipped split)

- **Client mobile screens** (`/client*`) are flat: transparent/hairline inset cards; no status-tinted card washes.
- **Coach desktop list rows** (client roster + briefing queues) legitimately use **status-tinted row cards** with a coloured rail.
- Both are valid shipped patterns. Do not force one pattern onto the other without a shipped-screen precedent.

### 1.3 Coach status-tinted row card spec (shipped)

For coach list-row cards (not client mobile cards):

- Keep a **left status rail** in status hue.
- Allow a **status wash gradient** in the card body: strongest at the rail edge, fading to fully transparent by about **65%** of row width.
- Keep status communicated by text + dot and maintain card readability with a border/hairline.

This spec is derived from shipped coach screens and overrides any older blanket “flat everywhere” interpretation.

### 1.4 What not to use

`AnimatedBackground` is a flat `var(--fc-bg-deep)` wrapper. `AtmosphericBackdrop` returns **`null`**. Do not reintroduce grain/noise overlays or radial “action halos” on product screens.

---

## 2 · Colour law

### 2.1 Brand / go-forward blue

| Token | Value | Role |
|--------|--------|------|
| `--fc-accent` | `#2E7BFF` | **Canonical** go-forward / primary CTA / nav / links |
| `--fc-accent-dim` | `rgba(46, 123, 255, 0.16)` | Soft fill / selected |
| `--fc-accent-glow` | `rgba(46, 123, 255, 0.30)` | Soft CTA shadow only |
| `--fc-status-info` | `var(--fc-accent)` | **Documented alias** — info |

**Blue = go forward:** start a flow, navigate, create, primary CTA.  
Examples: Train “START WORKOUT” (`.fc-btn-primary`), home “Complete daily check-in”, workout exec **Start**, FAB/create, bottom-nav active accent.

**`--fc-accent-cyan` removed.** It was only an alias of `--fc-accent` (same blue). Use `--fc-accent` for system/nav/links.

### 2.2 Commit green

| Token | Value |
|--------|--------|
| `--fc-status-success` | `#22E56A` |

**Green = commit a unit of work:** log a set, save a field, mark a discrete record done.  
Example: LiveCard **“✓ Log set”**.

### 2.3 “Complete …” buttons (explicit)

| Control | Colour | Why |
|---------|--------|-----|
| Complete daily check-in | **Blue** | Opens / finishes a **flow** (navigate into check-in) |
| Complete workout | **Blue** (`btn-action` → `--fc-accent`) | Ends the **session flow**, not a single set commit |
| Checked-in today (done state) | Green outline | Status confirmation, not a CTA |
| Log set | **Green** | Commits one set |

Do **not** paint flow-ending “Complete …” buttons green.

### 2.4 Effort tiers

| Token | Hex |
|--------|-----|
| `--fc-effort-easy` | `#34D399` |
| `--fc-effort-medium` | `#F5C242` |
| `--fc-effort-hard` | `#FF7A2F` |
| `--fc-effort-max` | `#FF5A4D` |

### 2.5 Status

| Token | Hex / alias |
|--------|-------------|
| `--fc-status-success` | `#22E56A` |
| `--fc-status-warning` | `#FFB020` |
| `--fc-status-error` | `#FF5A4D` |
| `--fc-status-danger` | `var(--fc-status-error)` — prefer **error** |
| `--fc-status-info` | `var(--fc-accent)` |

### 2.6 Group hues (exercise identity) — single true cyan

| Token | Value | Role |
|--------|--------|------|
| `--fc-group-c` | `#22D3EE` | **Canonical aqua** — letter C, rest timer, deload (`--phase-deload`), celebration accents |
| `--fc-group-c-dim` | `rgba(34, 211, 238, 0.18)` | Soft border / ring |
| `--fc-group-c-soft` | `rgba(34, 211, 238, 0.12)` | Soft fill |

`--fc-group-a…d`: blue / purple / **cyan** / amber (+ `-dim`).

**One aqua only.** Former `#4FE3E8` (achievements, analytics hardcodes, `CANVAS.cyan`) collapsed into `#22D3EE`. Use `--fc-group-c` (or the hex in canvas/confetti where CSS vars cannot resolve). Do **not** invent `--fc-accent-cyan` or module `--cyan:` aliases — those previously held brand blue.

**Not cyan:** `--ps-chart-bar-end` `#34a8ad` is a chart-gradient end teal (progress/trophy bars), distinct from group-c.

### 2.7 Gold (keep)

`--fc-accent-gold` `#F5C242` + soft — achievements, pending gym-console state, rarity legendary. Distinct from effort-medium (same hex is OK when roles differ; prefer gold tokens for achievement UI).

### 2.8 Soft CTA shadow (allowed)

Primary buttons may use `box-shadow: 0 4px 24px var(--fc-accent-glow)`. No “glow zones,” no lime glows, no card elevation glows.

---

## 3 · Typography

**Loaded & primary:** Archivo (display / numbers) · JetBrains Mono (eyebrows, data) · Inter (body).  
**Removed from system:** Big Shoulders Display, SF Pro Rounded (do not specify them).

| Role | CSS vars | Typical scale (client home/train) |
|------|----------|-----------------------------------|
| Display / greeting | `--f-display`, `--font-display` | ~26px / weight 800 / tracking `-0.04em` |
| Section title | `--f-display` | ~17px / 800 |
| Mono eyebrow | `--f-mono` | 9px / 600 / `letter-spacing: 0.16em` / uppercase |
| CTA label | `--f-display` | 15px / 800 / uppercase / `0.03em` |
| Body | `--font-body` (Inter) | 16px |

---

## 4 · Spacing & radii (in use)

| Token / practice | Value |
|------------------|--------|
| Page padding | ~24×20 (home); `--fc-page-px` 16 |
| Section gap | 24 (`--fc-gap-sections`) |
| Card gap | 16 |
| Primary CTA height | 54px |
| Button radius | 15px |
| Hairline | `--fc-hairline` `rgba(255,255,255,0.07)` |
| Radius scale | `--fc-radius-sm…3xl` 12–40px (prefer 15–18 for cards/CTAs) |

Do not invent a second spacing scale in feature CSS without need.

---

## 5 · Patterns that ship

- **Hairline cards** — transparent/inset + `1px` hairline; no milky fill on client.
- **Mono uppercase eyebrows** — JetBrains, tracking ~0.16em.
- **Left accent bars** — 3×14–16px, `var(--fc-accent)` on section headers.
- **Letter badges + group hues** — workout blocks.
- **AdherenceCalendar** — `full` / `compact`; `value null` = nothing scheduled (neutral); `0` past = missed (error red); `≥1` = full (success).
- **LiveCard family** — exec logging; green log CTA; effort tier colours.
- **CoachAthleteCard** — coach roster/briefing.
- **Shells:** `ClientPageShell`, `CoachPageShell` (`widthVariant`), `DesktopShell` + `SideNav` (240px), `BottomNav` (mobile).

---

## 6 · Layout chrome

| Viewport | Chrome |
|----------|--------|
| `< 1024px` | Mobile: bottom nav; no sidebar |
| `≥ 1024px` | `DesktopShell` + `SideNav` 240px (`AppLayout`) |
| 768–1023 | **Same as mobile** (bottom nav) — tablet layer still open |

### Client content width

- Mobile: `max-w-lg` (~512px).
- Desktop (`lg:`): **`max-w-3xl`** (~768px) via `ClientPageShell` default + page classes `max-w-lg lg:max-w-3xl`.
- Workout exec often `max-w-2xl` — keep unless redesigning.

### Coach content width

`CoachPageShell`: `form-2xl` | `default-5xl` / `benchmark-5xl` | `data-7xl` | `canvas-full`. Container is often fine; **single-column mobile CSS** still wastes horizontal space (see report / coach pass).

---

## 7 · Token honesty (v5 contract)

- **One hex → one canonical name**, plus documented semantic aliases only (`--fc-status-info`, `--fc-status-danger`).
- **`--fc-accent-lime*` and `--fc-accent-cyan` removed.** Never reintroduce. Go-forward blue = `--fc-accent` (+ dim/glow). True aqua = `--fc-group-c` (+ `-soft`/`-dim`) only — `#4FE3E8` collapsed into `#22D3EE`.
- Module-local `--lime*` / `--cyan*` / `--ps-cyan*` / `--cs-cyan*` / `--pe-cyan*` aliases purged — they held blue; call sites use `--fc-accent` directly.
- Accent prop enums use `"action"` (not `"lime"`) for the blue go-forward role. Prop `"cyan"` on some rails still means brand blue historically — prefer `"action"` / `--fc-accent` in new code; true aqua UI uses `--fc-group-c`.
- Achievement mint is `--fc-mint` `#7fe89a`. Canvas chartreuse is `CANVAS.chartreuse` `#C5FF4A`. Canvas aqua is `CANVAS.cyan` `#22D3EE` (== group-c).

---

## Removed in v5

| Removed | Reason |
|---------|--------|
| Atmospheric backdrops / role halos | Component returns null; flat near-black ships. **Does not** mean remove saturation, gradient phase bars, CTA glow, or status washes — those still ship. |
| 4% noise / grain overlay | Defined but unused on product routes; outside effect budget |
| Action “glow zones” / hero card glows | Over-decorative page/hero glow layers removed; soft CTA shadow + accent glow on primary actions still ship. Does **not** ban coach status row washes. |
| Five-tier glass / elevated surface model | Client is flat inset + float/well/tint. Flat surfaces ≠ muted accents: solid pills, coloured badges, and saturated status colours remain. |
| Lime-as-action (`#C5FF4A` / `--fc-accent-lime*`) | Remapped to blue; name purged — use `--fc-accent` / `"action"` |
| Big Shoulders / SF Pro as system fonts | Archivo + JetBrains + Inter ship |
| Bottom-nav active as distinct cyan | Same as brand blue (`--fc-accent`; cyan alias removed) |

---

## Related docs

| Doc | Status |
|-----|--------|
| `design-system-v4.md` | **Superseded** — historical |
| `ui-visual-audit-current-state.md` | **Stale** token inventory (pre-client-surfaces / pre-v5) |
| `DESIGN_ANTIPATTERNS_FIX_REPORT.md` | Historical fix log; not the system spec |
| `ui-system.css` + `globals.css` | Runtime authority for tokens |

---

## Quick checklist for a new client screen

1. Wrap with `AnimatedBackground` + `ClientPageShell` (`max-w-lg lg:max-w-3xl`).
2. Page bg = deep black; cards = hairline inset, no milky fill.
3. Primary CTA = blue `--fc-accent`; log/save unit = green `--fc-status-success`.
4. Eyebrows = mono uppercase; section titles = Archivo; left accent bar optional.
5. No atmospheric backdrop, no lime tokens, no glass elevation theatre — keep shipped saturation (bright CTAs, solid pills, effort tiers).
