# Design System — Coach/Client Training App (v4)

> **Status:** v4 · Atomic + Composite pattern architecture for reliable cross-screen application.
> **Scope:** Mobile-first (390px viewport baseline). Dark theme primary, light theme `[verify]`.
> **Goal:** Athletic, energetic, information-dense interfaces. Visual register is "sports broadcast graphics" — not banking software, not meditation apps.
> **Critical change from v3:** v4 separates **atomic patterns** (small reusable building blocks) from **composite patterns** (domain-specific shapes built from atomics). When applying this system, always reach for atomics first. Composites are integrations of atomics; they are not screen-specific recipes to be copied wholesale onto other screens.

---

## How to use this document

This system is structured in five layers, in order of authority:

1. **Principles (§1)** — explain *why* every later rule exists. When in conflict, principles win.
2. **Tokens (§2–§5)** — colors, typography, spacing, radii, motion. Never hardcode; always reference.
3. **Atomic patterns (§6)** — small reusable building blocks. Every screen uses many of these.
4. **Composite patterns (§7)** — domain-specific shapes assembled from atomics.
5. **Screen recipes (§13) and Application Matrix (§14)** — how to compose atomics + composites into full screens.

**Critical rules of application:**
- Atomics are the unit of reuse. When you see something that "looks like" a pattern from another screen, you are looking at *the same atomic*, not at a screen-specific copy.
- Composites are documented with explicit atomic references. When converting a screen, decompose it into atomics first, then check whether a composite already exists.
- Never invent a new pattern when an existing atomic fits. If two atomics seem to fit, the more specific one wins.
- Apply screen-by-screen using §14 Application Matrix as the authoritative source of which atomics belong on which screens.

---

## 1. Design Principles

### 1.1 Energy through scarcity, not saturation
The app should feel athletic and electric. We achieve that through dramatic hierarchy — one thing on each screen pulls the eye hard, everything else supports it. Scarcity creates impact: if every element is highlighted, nothing is.

### 1.2 Color is structural, not decorative
Every accent color does **one job** and only that job. When in doubt, ask "what is this element *for*?" — not "what color would look nice here?"

### 1.3 Numbers are the content
This is a training app. Users came to log a number, see a number, beat a number. Numbers should be the largest, boldest, most prominent typography on every screen. Labels are subordinate.

### 1.4 Information density with room to breathe
Athletes mid-set don't have time to scroll padded conversational UI. Coaches reviewing 50 clients don't want spacious cards. Pack data tightly, but use whitespace and dividers to keep it scannable.

### 1.5 Action zones glow; information zones don't
Sections that drive action (Start Training, Log Set, Reach Out) get the action treatment — gradient, glow, prominence. Sections that inform (program progress, history, settings) stay restrained.

### 1.6 Preserve all backend hooks
Every original element from existing screens must be preserved when redesigning. You may change visual treatment, position, or grouping — but you must not delete it. If an element seems redundant, propose merging or hiding behind a tap; do not silently drop it.

### 1.7 Domain identity through consistent accents
Each major domain (workouts, meals, habits, challenges) has a domain color from `--fc-domain-*` tokens. Use as subtle identification stripes only, not as dominant card color.

### 1.8 Hierarchy through one headline, supporting cast
Every KPI strip must have one headline metric — visually larger, brighter, or differently treated — with the rest as supporting context. Six equal-weight stats is six pieces of noise.

### 1.9 Status colors mean status, never decoration
A color choice is a claim. If a stat is colored green, it should mean "trending positive" or "complete" — not "this is the second card in the row." Either tie color to meaning or strip color and let type carry weight.

### 1.10 Atomics are the unit of reuse (NEW IN v4)
When you see a card on Goals that looks similar to a card on Habits, they are not two patterns — they are the *same atomic* used twice. Never copy a screen-level treatment from one screen to another. Decompose into atomics first, apply atomics second. This is the single most important rule for cross-screen consistency.

### 1.11 Restraint over decoration (NEW IN v4)
Many of the existing screens use red text, color tints, and decorative pills more liberally than warranted. v4 codifies stricter rules: red is reserved for critical/destructive states, color tints are reserved for meaningful status, decorative pills are minimized. When in doubt, less color is better.

---

## 2. Tokens

This system uses your existing `--fc-*` tokens. v4 adds: `--fc-accent-lime`, `--fc-accent-gold`, macro variance tokens (§7.10), and recommends two text tier additions.

### 2.1 Surface tokens (existing)

| Token | Role |
|---|---|
| `--fc-bg-deep` | Page background (primary) |
| `--fc-bg-basalt` | Page background gradient endpoint |
| `--fc-surface-card` | Default card fill |
| `--fc-surface-elevated` | Hovered/selected/elevated card |
| `--fc-glass-base` | Glass-effect surface (floating elements) |
| `--fc-glass-soft` | Subtle glass layer (nested) |
| `--fc-glass-border` | Standard border on cards |

### 2.2 Text tokens

| Token | Role |
|---|---|
| `--fc-text-primary` | Primary content (white) |
| `--fc-text-dim` | Secondary content (~65%) |
| `--fc-text-subtle` | Tertiary / labels / eyebrows (~42%) |
| `--fc-text-quaternary` (recommended add) | Units, denominators, ghost text (~26%) |
| `--fc-text-disabled` (recommended add) | Disabled state, ghost borders (~14%) |

### 2.3 Accent tokens

| Token | Status | Role |
|---|---|---|
| `--fc-accent-cyan` | Existing | **System.** Active nav, links, system metadata, info icons, selected states, system tags, aqua left-bar on coach quotes |
| `--fc-accent-purple` | Existing | **Supplemental.** Extra training, optional/library content, secondary tracks |
| `--fc-accent-lime` | NEW | **Action.** Primary CTAs, action progress bars, today's pulsing eyebrow, completion checkmarks |
| `--fc-accent-gold` | NEW | **Achievement.** PRs, medals, leaderboard rankings, streaks, beast-mode tier |

```css
:root {
  --fc-accent-lime:        #C5FF4A;
  --fc-accent-lime-2:      #7FE89A;
  --fc-accent-lime-soft:   rgba(197, 255, 74, 0.13);
  --fc-accent-lime-glow:   rgba(197, 255, 74, 0.38);

  --fc-accent-gold:        #F5C242;
  --fc-accent-gold-soft:   rgba(245, 194, 66, 0.13);

  --fc-accent-bronze:      #CD7F32;
  --fc-accent-silver:      #C0C0C0;

  --fc-text-quaternary:    rgba(255, 255, 255, 0.26);
  --fc-text-disabled:      rgba(255, 255, 255, 0.14);
}
```

### 2.4 Status tokens (existing)

| Token | Role |
|---|---|
| `--fc-status-success` | Brief completion confirmations, positive deltas |
| `--fc-status-warning` | Slipping score, missed days, low components, needs attention |
| `--fc-status-error` | Critical/severe states, destructive confirmations |
| `--fc-status-info` | Informational states, neutral notices |

### 2.5 Domain tokens (existing — accent stripes only)

| Token | Used for |
|---|---|
| `--fc-domain-workouts` | Workout-related cards, training-track stripes |
| `--fc-domain-meals` | Nutrition cards, meal plans |
| `--fc-domain-habits` | Habit tracking, streak cards |
| `--fc-domain-challenges` | Challenge cards, leaderboard contexts |

### 2.6 Pillar tokens (NEW v4)

Goals are organized by Pillars. Each pillar gets a token for its pillar stripe (left-bar on goal cards). Reuse domain tokens where they overlap:

| Pillar | Token |
|---|---|
| Training | `--fc-domain-workouts` (cyan) |
| Nutrition | `--fc-domain-meals` (green) |
| Check-ins | `--fc-status-info` |
| Lifestyle | `--fc-accent-purple` |
| General | `--fc-text-subtle` (neutral) |

### 2.7 Achievement rarity tokens (NEW v4)

| Rarity | Token |
|---|---|
| Common | `--fc-text-dim` |
| Uncommon | `--fc-status-success` |
| Rare | `--fc-accent-cyan` |
| Epic | `--fc-accent-purple` |
| Legendary | `--fc-accent-gold` |

### 2.8 Sub-tier tokens (NEW v4)

For multi-tier achievements (Bronze → Silver → Gold → Platinum):

| Sub-tier | Token |
|---|---|
| Bronze | `--fc-accent-bronze` |
| Silver | `--fc-accent-silver` |
| Gold | `--fc-accent-gold` |
| Platinum | gradient: gold → cyan |

### 2.9 Macro variance tokens (NEW v4)

For macro-vs-target progress bars where color reflects whether you're on track:

```css
--fc-macro-on-target:    var(--fc-status-success);   /* 95–105% of target */
--fc-macro-near-target:  var(--fc-status-warning);   /* 80–94% or 105–115% */
--fc-macro-off-target:   var(--fc-status-error);     /* <80% or >115% */
```

These supersede the fixed protein/carbs/fat color assignments from v3. Color reflects **variance**, not macro identity.

### 2.10 Accent role rules — non-negotiable

| Color | Use for | Never use for |
|---|---|---|
| Cyan | System affordances only | Action CTAs, achievements, warnings, decoration |
| Lime | Action affordances only | Anything not immediately actionable |
| Gold | Achievement only | Data references, current state, neutral information |
| Warning | Genuine warnings only | Effort labels, intensity grading, generic emphasis |
| Error | Critical states only | Anything that isn't a real escalation |
| Success | Brief confirmations only | Default states, content backgrounds |
| Purple | Supplemental/optional only | Primary actions, status, achievements |

**Most-violated rule:** do not use cyan for *every* clickable thing. If everything is cyan, cyan means nothing.

---

## 3. Atmospheric Backdrops

Each screen has a subtle full-bleed radial-gradient backdrop. The glow position points to the action zone, not the header.

```css
/* Action lives at top */
background:
  radial-gradient(ellipse 100% 60% at 50% -20%, var(--fc-accent-lime-soft), transparent 70%),
  linear-gradient(180deg, transparent 0%, var(--fc-bg-basalt) 100%);

/* Action lives at bottom (workout exec LOG SET) */
background:
  radial-gradient(ellipse 110% 50% at 50% 80%, color-mix(in srgb, var(--fc-accent-lime) 13%, transparent), transparent 70%),
  linear-gradient(180deg, var(--fc-bg-basalt) 0%, transparent 60%);

/* Information-dominant (Train, Settings, libraries, analytics) */
background:
  radial-gradient(ellipse 90% 50% at 50% -20%, color-mix(in srgb, var(--fc-accent-cyan) 6%, transparent), transparent 70%),
  linear-gradient(180deg, transparent 0%, var(--fc-bg-basalt) 100%);

/* Warning state (low Athlete Score, "needs attention" sections dominant) */
background:
  radial-gradient(ellipse 100% 50% at 50% 10%, color-mix(in srgb, var(--fc-status-warning) 10%, transparent), transparent 65%),
  linear-gradient(180deg, transparent 0%, var(--fc-bg-basalt) 100%);

/* Achievement state (PR celebration, beast-mode tier) */
background:
  radial-gradient(ellipse 100% 50% at 50% 10%, color-mix(in srgb, var(--fc-accent-gold) 10%, transparent), transparent 65%),
  linear-gradient(180deg, transparent 0%, var(--fc-bg-basalt) 100%);
```

A subtle SVG noise overlay at 4% opacity sits above the backdrop on every screen.

---

## 4. Typography

### 4.1 Font stack

```css
--font-geist-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
--font-geist-mono: "JetBrains Mono", ui-monospace, monospace;
--font-number:     -apple-system, BlinkMacSystemFont, "SF Pro Rounded", system-ui, sans-serif;
--font-body:       -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
--font-display:    "Big Shoulders Display", var(--font-number);  /* optional add */
```

### 4.2 Type scale

| Role | Font | Weight | Size | Line height | Tracking | When |
|---|---|---|---|---|---|---|
| Hero metric | display | 800 | 56–96px | 0.85 | -0.04em | Athlete Score, big counts |
| H1 page | sans | 700 | 30–32px | 1.0 | -0.025em | Page titles |
| H2 card | sans | 700 | 24–28px | 1.05 | -0.025em | Card hero names |
| H3 section | sans | 600 | 16–18px | 1.05 | -0.01em | Section titles within a screen |
| Stat headline | display | 700 | 26–30px | 0.9 | -0.02em | Headline KPI |
| Stat supporting | display | 600 | 18–22px | 0.9 | -0.02em | Supporting KPIs |
| Body large | body | 500–600 | 14–15px | 1.4 | 0 | Card primary text, list item names |
| Body | body | 400–500 | 12–13px | 1.4 | 0 | Descriptions, captions |
| Eyebrow | body | 700 | 9–11px | 1.0 | 0.14em–0.20em | All-caps labels |
| Sub-eyebrow | body | 700 | 9.5px | 1.0 | 0.16em | Section labels inside cards |
| Mono prescription | mono | 500–700 | 11–13px | 1.0 | 0.04–0.06em | "10 × 6 · 30s rest", tempo |

### 4.3 Type rules

- Numbers always use display or number font.
- Eyebrows always uppercase + letter-spacing.
- Tabular figures (`font-feature-settings: "tnum"`) required where numbers stack vertically.
- Italic + gradient on display headline names ("Hey, *Roxi*") reserved for greeting personalization.
- Long numerals: tighter tracking (-0.02em to -0.04em on display sizes 28+).

---

## 5. Spacing, Radii & Elevation

### 5.1 Spacing scale (8pt grid)

```
4   8   12   16   20   24   32   40   48 (px)
```

- Card padding: 16–22px (smaller 14–16, hero 20–24)
- Card vertical gap: 18–24px between major sections
- Card horizontal gap (in grids): 6–10px
- Page horizontal padding: 16–20px
- Inside-card section spacing: 14–18px

### 5.2 Border radii

`[verify]` exact values for `--fc-radius-sm` through `--fc-radius-3xl`. Conceptual mapping:

| Use | Token |
|---|---|
| Small chips, mini-icons | `--fc-radius-sm` |
| Input cells, small cards | `--fc-radius-md` |
| Standard cards, list rows, buttons | `--fc-radius-lg` |
| Large cards | `--fc-radius-xl` |
| Hero cards, prescription card | `--fc-radius-2xl` |
| Pills, status tags, bottom nav | `--fc-radius-3xl` (or `--fc-radius-pill`) |

Parent radius is bigger than child radius. Never invert.

### 5.3 Shadows

```css
/* Default card */
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);

/* Elevated/hero card */
box-shadow:
  0 30px 60px -25px rgba(0, 0, 0, 0.5),
  inset 0 1px 0 rgba(255, 255, 255, 0.05);

/* Action hero (lime glow) */
box-shadow:
  0 30px 60px -25px rgba(0, 0, 0, 0.5),
  0 20px 50px -20px var(--fc-accent-lime-glow),
  inset 0 1px 0 rgba(255, 255, 255, 0.05);

/* Action button */
box-shadow:
  0 12px 30px -8px var(--fc-accent-lime-glow),
  inset 0 1px 0 rgba(255, 255, 255, 0.4);

/* Floating nav */
box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
```

---

## 6. ATOMIC PATTERNS

This is the core of v4. Every reusable building block lives here. Each atomic is defined in terms of *what it does and what it's for*, never *which screen it lives on*.

### 6.1 Card tiers

Five tiers of card. Pick the lowest one that does the job.

| Tier | Class | Use for |
|---|---|---|
| **Plain card** | `fc-surface` or `fc-card-shell` | Default content cards, list rows, history, settings |
| **Glass card** | `fc-glass` (default), `fc-glass-soft` (nested) | Floating elements, modals, nav |
| **Elevated card** | `fc-surface` + lifted shadow + inner highlight | Page-level info cards, program card |
| **Action hero card** | `fc-hero-action` (NEW) | Dashboard hero, prescription card — accent gradient + glow |
| **Status-tinted card** | `fc-card-status-{warning,error,success,info}` (NEW) | Status-driven list rows (coach client cards, urgent attention) |

### 6.2 Status-tinted card

Subtle full-card background tint based on status. More readable than left-bar stripes alone.

```css
.fc-card-status-warning {
  background: color-mix(in srgb, var(--fc-status-warning) 7%, var(--fc-surface-card));
  border: 1px solid color-mix(in srgb, var(--fc-status-warning) 18%, transparent);
}
.fc-card-status-error {
  background: color-mix(in srgb, var(--fc-status-error) 7%, var(--fc-surface-card));
  border: 1px solid color-mix(in srgb, var(--fc-status-error) 18%, transparent);
}
.fc-card-status-success {
  background: color-mix(in srgb, var(--fc-status-success) 6%, var(--fc-surface-card));
  border: 1px solid color-mix(in srgb, var(--fc-status-success) 16%, transparent);
}
.fc-card-status-info {
  background: color-mix(in srgb, var(--fc-accent-cyan) 6%, var(--fc-surface-card));
  border: 1px solid color-mix(in srgb, var(--fc-accent-cyan) 16%, transparent);
}
```

**Use everywhere a card represents an entity with a status that needs to be visible at a glance.** Coach client list (Review/Urgent), Goals (overdue), Workouts (skipped), Achievements (in-progress).

**Restraint rule:** cap tint usage at ~30% of visible cards in any list. If most cards are tinted, none feel special.

**Never combine with status-stripe rows.** Pick one signal per card.

### 6.3 Pillar/domain stripe

3px-wide left-bar stripe in domain or pillar color. Identifies category at a glance.

```css
.pillar-stripe {
  position: relative;
}
.pillar-stripe::before {
  content: "";
  position: absolute;
  left: 0; top: 12px; bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--pillar-color);
}
```

Pass `--pillar-color` as a CSS custom property: `--fc-domain-workouts`, `--fc-domain-meals`, `--fc-accent-purple` (Lifestyle), etc.

**Use on:** Goal cards (pillar identification), mixed-domain feeds, Other Activities lists, library lists with category, anywhere card belongs to a category.

### 6.4 Hero card (Action variant)

```html
<div class="fc-hero-action">
  <div class="hero-top">
    <div class="hero-eyebrow">SECTION LABEL</div>
    <div class="hero-pill">~60 min</div>
  </div>
  <div class="hero-name">Title</div>
  <div class="hero-meta">supporting · meta · text</div>
  <div class="hero-cta">
    <button class="btn-action">Primary Action</button>
    <button class="btn-ghost-icon">Info</button>
  </div>
</div>
```

**Anatomy:**
- Border: `1px solid color-mix(in srgb, var(--fc-accent-lime) 20%, transparent)`
- Backdrop: dual radial-gradient + 135° linear gradient
- Texture: 200×200 repeating diagonal lines at 2.5% white opacity in upper-right
- Padding: 22px
- Radius: `--fc-radius-2xl`
- Shadow: lifted with accent-tinted glow

### 6.5 Stat card (telemetry unit)

A single small KPI display.

```html
<div class="stat-card" data-variant="headline|supporting">
  <div class="stat-eyebrow">LABEL</div>
  <div class="stat-value">42<span class="unit">%</span></div>
  <div class="stat-sub">optional supporting</div>
</div>
```

- Background: `--fc-surface-card`
- Padding: 12px
- Radius: `--fc-radius-lg`
- Eyebrow: 9.5px uppercase, `--fc-text-subtle`
- Value: `--font-display`, 26–30px (headline) or 18–22px (supporting), tabular figures
- Sub: 10.5px, `--fc-text-subtle`
- One headline per strip; rest supporting.

### 6.6 Stat strip (composition of stat cards)

Horizontal row of 2–6 stat cards. **Always one headline** stat — slightly larger, lime-accented, or first.

**Avoid:** decorative color tiles per card.

### 6.7 Delta pill

Trend indicator for numeric change.

```css
.delta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 999px;
  font-feature-settings: "tnum";
}
.delta.up      { color: var(--fc-status-success); background: color-mix(in srgb, var(--fc-status-success) 10%, transparent); }
.delta.down    { color: var(--fc-status-warning); background: color-mix(in srgb, var(--fc-status-warning) 10%, transparent); }
.delta.neutral { color: var(--fc-text-subtle);    background: rgba(255,255,255, 0.05); }
```

Always include directional arrow icon. Color alone is insufficient.

### 6.8 Inline editor (NEW v4)

Numeric value with adjacent Update button + Edit/Delete cluster. Used wherever a user updates a tracked metric in place.

```html
<div class="inline-editor">
  <div class="ie-value">
    <input type="number" class="ie-input" value="60">
    <button class="btn-action btn-action-sm">Update</button>
  </div>
  <div class="ie-actions">
    <button class="btn-ghost-icon-sm" title="Edit"><svg>...</svg> Edit</button>
    <button class="btn-ghost-icon-sm danger" title="Delete"><svg>...</svg> Delete</button>
  </div>
</div>
```

**Rules:**
- Update button uses `btn-action` (lime). It is the primary action — most common interaction.
- Edit/Delete are ghost buttons (low contrast). Edit goes to a fuller form. Delete is destructive (error tint on hover only).
- Numeric input inherits input-cell styling.

**Use on:** Goal cards (value updates), Habit cards, Body Metrics entries, anywhere "change one number quickly" is the primary task.

### 6.9 Deadline urgency text (NEW v4)

Date-relative urgency string for deadlines.

```html
<span class="deadline" data-urgency="overdue|imminent|soon|distant|none">
  Deadline: Apr 22, 2026 (-3 days left)
</span>
```

Rules for `data-urgency` (auto-derived from days-until-deadline):

| Urgency | Days range | Color |
|---|---|---|
| `overdue` | < 0 | `--fc-status-error` |
| `imminent` | 0–3 days | `--fc-status-warning` |
| `soon` | 4–14 days | `--fc-text-dim` |
| `distant` | >14 days | `--fc-text-subtle` |
| `none` | no deadline set | `--fc-text-subtle` |

**Use on:** Goal cards, Challenge cards, Program-end indicators, scheduled events.

**Critical:** don't paint *all* deadlines red. Reserve red for genuinely overdue. The current Goals screen uses red for "-3 days left" overdue, which is correct, but verify that `(57 days left)` is NOT red on overdue states elsewhere.

### 6.10 Stale-data text (NEW v4)

Date-relative staleness string for "last seen" / "last activity" / "last check-in" type values.

| Staleness | Days range | Color |
|---|---|---|
| `fresh` | 0–14 days | `--fc-text-subtle` |
| `aging` | 15–60 days | `--fc-status-warning` |
| `stale` | 60+ days, "Never" | `--fc-status-error` |

**Use on:** Coach client list ("9w ago", "Never"), Workout History ("3 weeks ago"), anywhere a "time since last X" appears.

**Don't paint everything red just because it's old.** Most stale data is neutral.

### 6.11 Target-progress bar (NEW v4)

Progress bar with target overlay. Color reflects variance from target, not progress identity.

```html
<div class="target-bar" data-variance="on-target|near-target|off-target">
  <div class="target-bar-fill" style="width: 87%;"></div>
  <div class="target-bar-target" style="left: 100%;"></div>
</div>
```

Rules for `data-variance`:

| Variance | Range | Color |
|---|---|---|
| `on-target` | 95–105% of target | `--fc-macro-on-target` |
| `near-target` | 80–94% or 105–115% | `--fc-macro-near-target` |
| `off-target` | <80% or >115% | `--fc-macro-off-target` |

Includes a vertical target marker line at the target position.

**Use on:** Macro bars (protein/carbs/fat/fiber on Meal Plans, Generator review), Volume Calculator per-muscle bars, weekly compliance bars, water intake, hydration, anywhere "current vs target."

**Note:** macro identity (protein/carbs/fat) is now communicated by **icon or label, not bar color.** Bar color is variance.

### 6.12 Variance pill (NEW v4)

Small pill showing how far from target a metric is.

```html
<span class="variance-pill" data-variance="on-target|near-target|off-target">
  ⚠ 8% off target
</span>
```

Same color logic as target-progress bar. Use as a callout next to a metric or above a stat strip.

**Use on:** Meal Plan Generator review, weekly compliance summary, anywhere "you are X% off your target" is meaningful.

### 6.13 Quote zone (coach voice)

```css
background: color-mix(in srgb, var(--fc-accent-cyan) 5%, transparent);
border-left: 2px solid var(--fc-accent-cyan);
border-radius: 2px 10px 10px 2px;
padding: 10px 14px;
```

Cyan left-bar = system/coach voice. Lime variant = action prompt. Gold variant = celebratory (sparingly).

### 6.14 Self-authored note (NEW v4)

Different from coach quote zone. This is the *user's own voice* (e.g., note on a workout session, journal entry).

```css
.self-note {
  font-style: italic;
  color: var(--fc-text-dim);
  padding: 8px 0 8px 12px;
  border-left: 2px dashed var(--fc-text-quaternary);
  font-size: 13px;
}
```

Dashed border + italic + dimmer text distinguishes from coach voice (solid cyan border, primary text).

**Use on:** Workout session summary ("Week 4 — feeling challenged but strong"), check-in personal notes, journal-style entries.

### 6.15 Priority pill (NEW v4)

Indicates user-set priority on a goal, task, or item.

```html
<span class="priority-pill" data-priority="high|medium|low">HIGH</span>
```

| Priority | Color | Background |
|---|---|---|
| High | `--fc-status-warning` | warning soft |
| Medium | `--fc-text-dim` | white-5% |
| Low | `--fc-text-subtle` | white-3% |

**Use on:** Goals (HIGH/MEDIUM/LOW), tasks, anywhere user-assigned priority differs from system urgency.

### 6.16 System tag (categorical metadata)

```html
<span class="tag tag-system">SUPERSET</span>
<span class="tag tag-system">GLUTES</span>
```

Cyan-tinted pill, 8–10px font, 700 weight, 0.10em+ tracking, uppercase.

**Use on:** Workout block types (Superset, Drop Set, etc.), muscle groups, exercise categories, system-assigned metadata.

### 6.17 Status tag

Same shape as system tag but tinted by status.

```html
<span class="tag tag-status" data-status="completed|review|urgent|paused">COMPLETED</span>
```

| Status | Color |
|---|---|
| completed | `--fc-status-success` |
| review | `--fc-status-warning` |
| urgent | `--fc-status-error` |
| paused | `--fc-text-dim` |
| generated | `--fc-status-success` (NEW v4 — for auto-generated meal plans) |
| manual | `--fc-text-subtle` |

### 6.18 Tier badge (NEW v4)

For multi-tier achievements (Bronze → Silver → Gold → Platinum) and rank badges (#1, #2, #3 leaderboards).

```html
<span class="tier-badge" data-tier="bronze|silver|gold|platinum">Bronze</span>
<span class="rank-badge" data-rank="1">#1</span>
```

Visual treatment:
- Bronze: bronze-tinted text on bronze-soft background
- Silver: silver-tinted text on silver-soft background
- Gold: gold-tinted text on gold-soft background
- Platinum: gold-cyan gradient text

Rank badges (#1–#3) use bronze/silver/gold respectively. Ranks #4+ use neutral.

**Use on:** Achievement sub-tiers, leaderboard ranks, any podium display.

### 6.19 Rarity pill (NEW v4)

For achievements with rarity classification.

```html
<span class="rarity-pill" data-rarity="common|uncommon|rare|epic|legendary">Rare</span>
```

| Rarity | Color (per §2.7) |
|---|---|
| Common | `--fc-text-dim` |
| Uncommon | `--fc-status-success` |
| Rare | `--fc-accent-cyan` |
| Epic | `--fc-accent-purple` |
| Legendary | `--fc-accent-gold` |

### 6.20 Buttons

```css
.btn-action {
  background: linear-gradient(135deg, var(--fc-accent-lime), var(--fc-accent-lime-2));
  color: #061018;
  font-weight: 700;
  font-size: 14px;
  padding: 13–15px;
  border-radius: var(--fc-radius-lg);
  text-transform: uppercase;
  letter-spacing: 0.04–0.06em;
  box-shadow: 0 12px 30px -8px var(--fc-accent-lime-glow), inset 0 1px 0 rgba(255,255,255,0.4);
}
.btn-action-sm { /* same but smaller */
  padding: 8–10px;
  font-size: 12px;
}
.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: var(--fc-text-primary);
  border: 1px solid var(--fc-glass-border);
}
.btn-ghost-icon, .btn-ghost-icon-sm {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--fc-glass-border);
  color: var(--fc-text-dim);
}
.btn-ghost-icon-sm.danger:hover {
  color: var(--fc-status-error);
  border-color: color-mix(in srgb, var(--fc-status-error) 30%, transparent);
}
.btn-pill {
  background: rgba(255, 255, 255, 0.04);
  color: var(--fc-accent-cyan);
  border: 1px solid var(--fc-glass-border);
  border-radius: 999px;
}
.btn-success {
  background: var(--fc-status-success);
  color: #061018;
  font-weight: 700;
}
```

**One lime primary per screen visible at a time.** Demote secondary actions to neutral.

**btn-success vs btn-action:** `btn-action` (lime) drives a NEW action. `btn-success` (green) confirms END of an action (e.g., Mark Complete after a session). They serve different functions.

### 6.21 Floating Action Button (FAB) (NEW v4)

Floating circular button for primary "create new" actions.

```html
<button class="fab" data-action="create-goal">
  <svg>...</svg>
</button>
```

```css
.fab {
  position: fixed;
  bottom: calc(64px + 16px);  /* above bottom nav */
  right: 16px;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--fc-accent-lime), var(--fc-accent-lime-2));
  color: #061018;
  box-shadow: 0 16px 40px -8px var(--fc-accent-lime-glow);
  display: grid; place-items: center;
}
.fab svg { width: 24px; height: 24px; }
```

**Critical rules:**
- FAB is **lime, not red**. The current red `+` FAB on Goals/Habits is wrong — it reads as destructive when its function is creative.
- One FAB per screen maximum.
- Icon must clearly indicate what is created (`+` for generic add, target icon for new goal, dumbbell for new workout).
- Reserve for the *most common* primary action on the screen. If no single action dominates, don't use a FAB.

### 6.22 Inputs

```css
.input-cell {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--fc-glass-border);
  border-radius: var(--fc-radius-lg);
  padding: 10px 12px;
}
.input-cell .label {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  color: var(--fc-text-subtle);
  font-weight: 700;
  margin-bottom: 5–6px;
  display: flex;
  justify-content: space-between;
}
.input-cell .num {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 28–30px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--fc-text-primary);
}
```

Numeric inputs always pair with vertical stepper (+/−, 22×16px stacked, 3px gap). Trailing icons (calculator, info) sit in the label row.

### 6.23 Bottom nav

Fixed-position floating pill, 14px from edges, 8px padding, 999px radius, dark glass effect. **Active state always cyan** — never lime.

### 6.24 Progress indicators

| Type | When |
|---|---|
| Horizontal bar (6px, lime gradient) | Linear progress: program, week |
| Segment bar (4 × 26×3px, lime when active) | Step-through: workout exercises, multi-step flow steps |
| Ring (8px stroke, gradient, glow) | Composite scores: Athlete Score |
| Circle dots (in week strip) | Day completion: 16–18px |
| Target-progress bar (§6.11) | Current vs target: macros, volume, hydration |

### 6.25 Eyebrows + section headers

```html
<!-- Page-level greeting eyebrow -->
<div class="eyebrow">
  <span class="pulse"></span>
  Up next · Day 1 of 4
</div>

<!-- Section header -->
<div class="section-head">
  <h2 class="section-title">Recent wins</h2>
  <a class="section-link">All →</a>
</div>

<!-- Sub-eyebrow (inside cards) -->
<div class="sub-eyebrow">YOUR TARGET TODAY</div>
```

Greeting eyebrows: max two clauses joined by `·`. Never three.

### 6.26 Frequency selector (NEW v4)

For Habits, recurring tasks, scheduling.

```html
<select class="frequency-select">
  <option>Daily</option>
  <option>Weekly</option>
  <option>Custom</option>
</select>
<input type="number" class="target-days-input" min="1" max="7" placeholder="Target days (1-7)">
```

Standard select styling (matches input-cell), pairs with target-days numeric input where applicable.

### 6.27 Step counter (multi-step flow)

```html
<div class="step-counter">
  <span class="step done">1 ✓ Targets</span>
  <span class="step active">2 Food Rules</span>
  <span class="step">3 Review</span>
</div>
```

- Done: lime checkmark, label
- Active: cyan-tinted, primary text
- Upcoming: t3 text, ghost circle

**Use on:** Weekly Check-in, Meal Plan Generator, any 2-N step flow.

### 6.28 Difficulty rating (NEW v4)

Numeric rating on a session ("8/5", "3/5"). The denominator can vary (5-point, 10-point, RPE 10).

```html
<span class="difficulty-rating" data-rating="8" data-scale="10">8/10</span>
```

Rating value uses `--font-display` weight 600, denominator uses `--fc-text-quaternary`.

**Use on:** Workout History session cards, completed session detail, any "rate this session" output.

### 6.29 Session summary stat strip (NEW v4)

A specialized 5-stat row for session-level summaries: Workouts / Hours / Volume / New PRs / Streak.

This is just a `stat-strip` (§6.6) with conventional labels for fitness sessions. Documented separately because it appears on Progress Hub, Workout History, monthly summaries.

### 6.30 Per-week mini-stat grid (NEW v4)

5-column grid showing per-week workouts (W1 W2 W3 W4 W5), each cell a small numeric value.

```html
<div class="week-grid">
  <div class="week-cell"><span class="v">3</span><span class="l">W1</span></div>
  <div class="week-cell"><span class="v">3</span><span class="l">W2</span></div>
  ...
</div>
```

**Use on:** Progress Hub monthly summary, any "month broken into weeks" visualization.

### 6.31 Per-set table (NEW v4)

Compact table showing sets logged per exercise within a session. Format varies by block type but core shape is:

```
#  EXERCISES                    REPS · WEIGHT · RPE
1  A: 77.5 kg × 8 + B: 77.5 kg × 20    RPE 9
2  A: 77.5 kg × 8 + B: 77.5 kg × 20    RPE 9
3  A: 77.5 kg × 8 + B: 77.5 kg × 20    RPE 9
```

- Set numbers in `--font-mono`, t3
- Weight × reps in `--font-headline`, primary
- RPE right-aligned, t-dim
- Per-row borders on white-4%

**Use on:** Workout session detail, workout exec history table, any "review what you logged" view.

### 6.32 Banner (info, warning, success)

Full-width informational banner at top of card or screen.

```html
<div class="banner banner-info">
  <svg class="ico">...</svg>
  <div class="content">All portions are for raw / uncooked ingredients</div>
</div>
```

Banner variants: `banner-info` (cyan), `banner-warning` (amber), `banner-success` (green), `banner-error` (red).

**Critical disclaimers** (like the raw-ingredients note on meal plans) should be `banner-info`, not casual decorative text. They are load-bearing for user understanding.

### 6.33 Tab strip

Horizontal tab navigation within a screen.

```html
<nav class="tab-strip">
  <a class="tab active">Overview</a>
  <a class="tab">Compliance</a>
  <a class="tab">Progress</a>
  <a class="tab">Reports</a>
</nav>
```

- Active: cyan underline + primary text
- Inactive: t3 text, no underline
- Horizontal scroll on mobile (don't squish)
- Sticky position below hero header when used in detail screens

**Use on:** Coach Client Detail, Coach Analytics (Overview/Compliance/Progress/Reports), Coach Progress dashboard sub-tabs, Achievement filters.

### 6.34 Filter pill row

Horizontal scrollable row of filter pills.

```html
<div class="filter-pills">
  <button class="filter-pill active">All (9)</button>
  <button class="filter-pill">Active (9)</button>
  <button class="filter-pill">Pending (0)</button>
  <button class="filter-pill">Inactive (0)</button>
</div>
```

- Active: cyan-tinted background, cyan text, cyan border
- Inactive: neutral background, t-dim text, transparent border
- Includes count in parentheses where applicable

**Use on:** Coach Client list (Status, Quick), Goals (status filter), Achievements (Status, Rarity), Workout History (All Time / This Month / This Week).

### 6.35 Empty section state

Three variants:

- **Encouraging empty:** dashed-border card, centered, soft message + CTA. ("No goals in this pillar yet · + ADD GOAL")
- **Celebratory empty:** treat as positive moment. ("Rest day — All workouts this week completed")
- **Setup empty:** when feature isn't configured. ("Get set up to start tracking → [CTA]")

Never "No data found." Database voice forbidden.

### 6.36 Archive section

Collapsed/grouped section at bottom of a list for completed/archived items.

```html
<div class="archive-section">
  <div class="archive-header">
    <span class="ach-eyebrow">ARCHIVE</span>
    <span class="archive-count">Completed goals · 0 completed</span>
  </div>
  <!-- archive items collapsed by default -->
</div>
```

Visually subordinate (smaller font, dimmer color) to the main list.

**Use on:** Goals (completed goals archive), Programs (completed assignments), Workout History (older months collapsed).

### 6.37 Add-item placeholder

Inline "add new" affordance at end of a list.

```html
<button class="add-placeholder">+ ADD TRAINING GOAL</button>
```

- Dashed border, t-dim text, transparent background
- On hover/focus: cyan-tinted border, cyan text

**Use on:** End of every pillar's goal list, end of habit list, end of section where adding is the natural next action.

---

## 7. COMPOSITE PATTERNS

These are domain-specific shapes assembled from atomics. Each composite explicitly references which atomics it composes. **Never copy a composite onto a different domain — decompose into atomics and reassemble.**

### 7.1 Athlete Score hero (§6.4 hero card + tier system + ring)

5-tier system: `beast_mode (≥90)` / `locked_in (≥75)` / `showing_up (≥55)` / `slipping (≥35)` / `benched (<35)`.

Composed of:
- Hero card (action variant)
- Ring progress indicator (atomic §6.24)
- Tier badge (atomic §6.18) for status icon
- Stat strip (atomic §6.6) for component breakdown
- Coach quote zone OR action nudge for contextual message

| Tier | Score | Ring color | Backdrop | Nudge tone |
|---|---|---|---|---|
| Beast Mode | ≥90 | Gold gradient | Gold glow | "You're locked in." |
| Locked In | ≥75 | Lime gradient | Lime glow | "Strong week." |
| Showing Up | ≥55 | Cyan gradient | Cyan glow | "On track." |
| Slipping | ≥35 | Warning gradient | Warning glow | "Momentum is fading." |
| Benched | <35 | Error gradient | Error glow | "You've been off the radar." |

Component count: 3 (Train/Check-in/Daily) when nutrition not configured, 4 (+ Nutrition) when configured.

### 7.2 Workout block prescription card

Composed of:
- Card tier (elevated or action-hero, depending on whether logging is active)
- System tag (§6.16) for block type — always cyan
- Sub-eyebrow (§6.25) for "PREVIOUS SESSION", "YOUR TARGET TODAY", "LOG SET"
- Stat strip (§6.6) for target panel
- Quote zone (§6.13) for coach notes
- Inline editor (§6.8) variants for each input cell
- Primary action button (§6.20)

12 block types: Straight Set, Drop Set, Superset, Cluster Set, Rest-Pause, Giant Set, Pre-Exhaustion, AMRAP, EMOM, For Time, Tabata, plus future.

All block-type tags use system cyan. Done-button copy varies by block: LOG SET, LOG DROP SET, DONE CLUSTER N, END AMRAP, etc.

### 7.3 Goal card (NEW v4)

Composed of:
- Plain card or status-tinted card (§6.1, §6.2)
- Pillar stripe (§6.3)
- Sub-eyebrow with pillar name + status ("TRAINING · ACTIVE · HIGH")
- Goal name (H3)
- Inline editor (§6.8) with current value, Update button, Edit/Delete cluster
- Target-progress bar (§6.11) showing progress
- Deadline urgency text (§6.9)
- Priority pill (§6.15) when set

**Decomposition note:** the visible goal card pattern looks specific to Goals, but every component is a reused atomic. The Goal card is the *integration*; the atomics are reused on Habits, Body Metrics, and any "track and update one number" surface.

### 7.4 Habit card (NEW v4)

Composed of:
- Plain card
- Pillar stripe (§6.3) or domain stripe (`--fc-domain-habits`)
- Habit name + frequency text
- Frequency selector (§6.26) when editing
- Streak counter (atomic — display number with flame icon)
- Per-day calendar dot grid (atomic — see §6.30 for similar shape)
- Inline editor (§6.8) for target days

### 7.5 Achievement card (NEW v4)

Three states: Earned, In Progress, Locked.

Composed of:
- Plain card with state-driven treatment
- Achievement icon (gold trophy variant for earned, neutral for in-progress, lock for locked)
- Name (H3)
- Rarity pill (§6.19)
- Tier badge (§6.18) for sub-tier indicator (Bronze/Silver/Gold/Platinum)
- Tier-progress description ("Next: Silver at 50")
- Target-progress bar (§6.11) showing progress within current tier
- Description / criteria text

**Achievement multi-tier semantics:** earning an achievement at Bronze unlocks the next tier (Silver). The card progresses through tiers as the user advances. Show current sub-tier prominently.

### 7.6 Personal Record card (NEW v4)

Composed of:
- Plain card or hero-action card (when on PR celebration moment)
- Gold trophy icon
- Exercise name (H3)
- New value (display large, primary)
- Delta pill (§6.7) showing delta from previous (`+2.5 kg ↑` in success)
- Date

### 7.7 Top Performers podium / Leaderboard rows

Composed of:
- Plain card or list row variant
- Rank badge (§6.18) with bronze/silver/gold for top 3
- Avatar + name
- Adherence pill colored by tier (lime ≥75%, cyan ≥55%, warning ≥35%, error <35%)
- Delta pill (§6.7) for trend

For Leaderboard rows (per-exercise): same shape, but rank badge can extend beyond top 3, current user gets cyan highlight + "You" indicator.

### 7.8 Volume Calculator card (NEW v4 — domain-specific to template/program editor)

Composed of:
- Elevated card with sub-eyebrow row (VOLUME CALCULATOR + N MUSCLE GROUPS)
- Form field for Days/Week + Exclude toggle
- Banner (§6.32) for priority muscle indicator
- Per-muscle row stack:
  - Status icon (✓ on target, ⚠ below, 🔻 below) + name + optional priority tag
  - Status tag (§6.17) "OPTIMAL" / "BELOW" / "ABOVE"
  - Target-progress bar (§6.11) using variance coloring
  - Sub-line: target range + delta needed
- "View Detailed Breakdown" expand link

This composite is genuinely Volume-Calculator-specific. The atomics it uses are not.

### 7.9 Coaching Insights & Quick Actions card

Two-column card:
- Sub-eyebrow ⚠ "Clients Needing Attention" (left col) — list of status-tinted rows
- Sub-eyebrow ⚡ "Quick Actions" (right col) — buttons (Generate Progress Report, etc.)

Composed of:
- Plain card
- Two sub-eyebrows
- Status-tinted rows (§6.2) on left
- Buttons (§6.20) on right

**Use on:** Coach Home, Coach Progress, Coach Adherence/Compliance dashboards.

### 7.10 Macro pill row + Daily Totals card

Composed of:
- Banner (§6.32) "All portions are for raw / uncooked ingredients" — info banner
- Sub-eyebrow "Daily Totals · (Option 1 of each meal)"
- Stat strip (§6.6) for 5 macros (Calories headline + Protein/Carbs/Fat/Fiber supporting)
- Variance pill (§6.12) "8% off target" when applicable
- Per-target target-progress bars (§6.11) — variance-colored
- Macro identification via icon, not bar color

### 7.11 Progress Hub monthly summary card (NEW v4)

Composed of:
- Elevated card with header eyebrow "THIS MONTH · April 2026"
- Big workouts count (display 36px) + label
- Session summary stat strip (§6.29) — 5 stats (Workouts/Hours/Volume/New PRs/Streak)
- Per-week mini-stat grid (§6.30)
- Sub-summary delta row ("This Week / 0 kg / Volume Δ-945 / 4 PRs")

### 7.12 Workout History session card (NEW v4)

Composed of:
- Plain card
- Date header ("TUE, APR 21")
- Session name (H3)
- Stat strip variant: "45 min · 3 sets · 0 kg · 8/5"
- Difficulty rating (§6.28)
- Optional self-authored note (§6.14) preview
- Tappable to session detail

### 7.13 Workout History session detail (NEW v4)

Composed of:
- Top nav with date navigator (prev/next session)
- Hero card: Status tag (§6.17) "COMPLETED", session name (H2), date+duration, stats summary (sets/reps/volume), difficulty rating (§6.28)
- Self-authored note (§6.14)
- "PRS THIS SESSION" sub-eyebrow + PR rows (each is a §7.6 PR card variant)
- "EXERCISES" section with per-block-type sub-eyebrows + per-set table (§6.31)

### 7.14 Meal Plan Generator wizard (NEW v4)

3-step flow:

**Step 1 — Targets:** Targets card with plan name, daily calories, macro auto-calc/manual toggle, macro inputs, meals/day, options/meal selectors. Next CTA.

**Step 2 — Food Rules:** Dietary restrictions checkboxes, meal style selectors (Breakfast/Lunch/Dinner), exclude foods search, required foods search. Generate Plan CTA.

**Step 3 — Review:** Plan name + variance pill (§6.12) "X% off target" + macro target-progress bars (§6.11) + warnings ("Only 1 fruit serving — recommend at least 2"), per-meal cards with options, Regenerate / Save Plan CTAs.

Composed of:
- Step counter (§6.27) at top
- Step content cards (per step, multi-step flow recipe)
- Step-action footer with Back (neutral) + Next/Generate/Save (lime)

### 7.15 Gym Console roster (composite domain-specific)

Composed of:
- Header with page title + count + freshness ("6 clients · 44s ago") + refresh + add
- Sectioned list with sub-eyebrows + state dots (CURRENTLY LIFTING / HASN'T STARTED YET / DONE)
- Per-section count (parenthesized)
- Per-client expandable cards (collapsed by default):
  - Name + week/day pill + workout name + state line
  - Action set varies by state (Log Set lime + View/Skip + Mark Complete success-green when lifting; Start Workout lime when not started)

### 7.16 Builder/Editor

Composed of:
- Page H1 + breadcrumb + saved indicator
- Section cards (basic info, configuration, items list)
- Item rows with drag handle + numeric index + name + tag pill + prescription summary (mono) + action icons cluster (expand/edit/delete)
- Inline-expandable configuration sub-cards
- Sticky footer action bar: Cancel (neutral) + Save/Update (lime)

### 7.17 Live Roster (generalized §7.15)

Whenever you need a list of currently-active people/things with state-driven sections. Same atomics as Gym Console, applicable to: live leaderboards, real-time challenge tracking, "who's logging right now" views.

---

## 8. Iconography

### 8.1 Rules

- All icons SVG, stroke-based (`stroke-width: 2`, `stroke-linecap: round`). No emoji, no icon fonts, no PNGs.
- Standard sizes: 11px (inline label), 14px (badge/icon-square), 16px (button inline), 18–22px (nav, primary), 24px+ (decorative).
- Color: icons inherit `currentColor` from parent.
- Icon containers: 28×28 or 32×32 rounded-rectangle (10px radius), `*-soft` tint at 13% opacity, icon at full color.

### 8.2 Icon role mapping

| Icon | Role | Color |
|---|---|---|
| Dumbbell | Training, workouts | Cyan or Lime per context |
| Trophy/medal/star | Achievement | Gold |
| Target/bullseye | Goals, sets | Cyan |
| Clock | Time, rest, duration | t2/t3 (neutral) |
| Refresh arrows | Swap, reset | t2 (neutral) |
| Lightning bolt | Extra/bonus content | Warning amber |
| Heart | Daily wellness, vitals | Error (when "not done"), neutral otherwise |
| Check (in circle) | Completion | Lime (action) or Success (passive confirm) |
| Bell | Notifications | t2, with lime dot when active |
| Apple/leaf | Nutrition | `--fc-domain-meals` |
| Calendar | Schedule, dates | t2 |
| Plus | Add/create | Cyan or Lime per context |
| Stopwatch | Live timer | Lime when running, t2 when paused |
| Fire | Streak | Warning amber |
| Camera | Photo capture | t2 |
| Scale | Weight, measurement | t2 |
| Drag handle (⋮⋮) | Reorderable item | t3 |

---

## 9. State System

### 9.1 Empty states

See §6.35. Three variants: Encouraging, Celebratory, Setup.

### 9.2 Loading states

Skeletons via `PageSkeleton` with `variant`. Skeleton blocks: `--fc-surface-card` shade pulsing to `--fc-surface-elevated` over 1.4s.

### 9.3 Error states

Three tiers:
- Inline field error: error-tinted text below input, no extra container.
- Card-level error: error left-bar (3px) + error-tinted background at 8% + retry CTA.
- Page-level error: centered error icon-circle, headline, supporting text, CTA. Catastrophic only.

### 9.4 Active/pressed/disabled

- Active (pressed): scale 0.98, 100ms ease-out
- Hover: subtle background brightening (10% lighter)
- Disabled: text → `--fc-text-quaternary`, background → `rgba(255,255,255,0.03)`, no shadow, `cursor: not-allowed`

### 9.5 Severity escalation

- Normal: plain row, neutral
- Warning: warning-amber 3px left-bar + warning-tinted icon container, OR status-tinted card (§6.2)
- Critical: full callout card, error gradient backdrop, error border, severity tag with icon, big display-number badge, action buttons

Don't apply critical treatment to more than one item per section.

### 9.6 Pause states (Programs)

- Paused: program card gets a `[verify]` neutral or amber left-bar, "Paused — X days" pill, CTA changes from "Continue" to "Resume." Atmospheric backdrop softens.
- Resume action: lime CTA. Pause action: secondary neutral.

### 9.7 Optional slot handling

Don't visually penalize missing optional slots. Mark with smaller, neutral check or empty circle — never warning/error.

### 9.8 Stale-data states

See §6.10. Don't paint everything red.

---

## 10. Motion

```css
--ease-snap:    cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-soft:    cubic-bezier(0.4, 0, 0.2, 1);
--dur-instant:  100ms;
--dur-fast:     180ms;
--dur-base:     240ms;
--dur-slow:     400ms;
```

**Pulse animation:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(0.85); }
}
animation: pulse 2s ease-in-out infinite;
```

Rules:
- Never animate decoratively. Animation must communicate state change.
- Wrap non-essential animation in `@media (prefers-reduced-motion: no-preference)`.
- Atmospheric backdrops are static.

---

## 11. Accessibility

- Tap targets: minimum 44×44pt. Visual element can be smaller; hit area must extend.
- Color contrast: `--fc-text-primary` ≥ 7:1, `--fc-text-dim` ≥ 4.5:1, `--fc-text-subtle` ≥ 3:1 (AA Large only).
- Lime CTA text: uses #061018 (dark ink) — never white on lime.
- Focus states: `outline: 2px solid var(--fc-accent-cyan); outline-offset: 2px;`. Don't disable.
- Information beyond color: all status states (Slipping, Completed, Critical, paused, optional, stale) include icon or text label.

---

## 12. Localization & Content

### 12.1 Copy voice

- Warm but direct. "Hey, [Name]." not "Greetings."
- Action-oriented. "Start Training," "Log Set," "Reach Out." Not "Submit," "OK."
- Athletic register without slang. "Today's Work," "Up next," "On deck" — yes. "Time to crush it" — no.
- Honest in negative states. "Slipping," "Critical," "No check-in for 66 days." Not "Could be improved."

### 12.2 Localization

- All visible strings via i18n keys.
- Containers handle multiline gracefully (no fixed heights).
- Romanian, Spanish, Portuguese first-class.
- RTL not yet scoped, but use `inline-start/inline-end` over `left/right` where practical.

### 12.3 Vocabulary alignment

| Use | Don't use |
|---|---|
| Workout (a session) | "Training session" in client copy |
| Training (the activity / domain) | "Workouts" as a top-level concept |
| Program (an assigned plan) | varies — keep "program" |
| Check-in (a wellness log) | "Log," "Entry" |
| Compliance (objective: % completed) | — |
| Adherence (subjective: behavior over time) | — |

### 12.4 Tier copy reference (Athlete Score)

- Beast Mode: "You're locked in."
- Locked In: "Strong week."
- Showing Up: "On track."
- Slipping: "Momentum is fading."
- Benched: "You've been off the radar."

### 12.5 Block-aware button copy

| Block type | Button text |
|---|---|
| Straight Set | LOG SET |
| Drop Set | LOG DROP SET |
| Superset | LOG SUPERSET |
| Cluster Set | DONE CLUSTER N (intra) / DONE SET N (final) |
| Rest-Pause | LOG REST-PAUSE |
| Giant Set | LOG ROUND |
| Pre-Exhaustion | LOG PAIR |
| AMRAP | END AMRAP |
| EMOM | END EMOM |
| For Time | FINISH |
| Tabata | END TABATA |

### 12.6 Subtitle banner discipline

Don't add explanatory subtitle banners under page titles. The user already chose the screen; they don't need it described back. If onboarding context is needed, use a one-time tooltip or first-run modal.

---

## 13. Screen Recipes

How to compose atomics + composites into common screen shapes.

### 13.1 Action-Hero screen

1. Status bar
2. Topbar (avatar + meta pill + notification bell)
3. Greeting (page H1 + date)
4. Action hero card — primary daily moment + primary CTA
5. Stat strip (3 small stats — one headline, two supporting)
6. Today's-thing secondary card
7. Duo cards (2-column small status pair)
8. List section
9. Footer link
10. Bottom nav

### 13.2 Information-Dominant screen

1. Status bar
2. Topbar (lighter — avatar only)
3. Page H1 (no descriptive subtitle banner)
4. Subtle hero card (`fc-surface` + lift, no glow)
5. Section breaks with section-head + content
6. Optional "extra/related" sections with restrained treatment
7. Tertiary footer link
8. Bottom nav

### 13.3 Single-task-focus screen

1. Status bar
2. Top nav row (back + progress segments OR step counter)
3. Single consolidated card with internal hierarchy
4. Meta-navigation row (Prev/Next entity)
5. History or supporting context card
6. Bottom nav

### 13.4 List-of-things screen

1. Status bar
2. Topbar
3. Page H1 + count pill + Add CTA
4. Search bar
5. Filter pill row (§6.34)
6. Section header with count badge
7. Severity-sorted list (status-tinted cards for items needing attention)
8. Empty state if applicable
9. Bottom nav + optional FAB (§6.21)

### 13.5 Detail screen

1. Status bar
2. Top nav (back + share/menu)
3. Hero header (avatar/icon + name + status tags + key metric)
4. Tab strip (§6.33) or segmented control
5. Body sections: card per data domain
6. Action footer (sticky CTA if primary action exists)
7. Bottom nav

### 13.6 Multi-step flow screen

1. Status bar
2. Top nav (back + step counter "Step X of N" + close)
3. Step counter (§6.27)
4. Step content card
5. Step-action footer: previous (neutral) + primary action (lime)

### 13.7 Live/timer screen

1. Top nav (back + minimal)
2. Massive timer display (full-screen-dominant)
3. Supporting info (current exercise, target, rep counter)
4. Live action zone
5. Stop/end CTA in tertiary position

### 13.8 Analytics/dashboard screen

1. Status bar
2. Topbar
3. Page H1 + date-range picker pill (no descriptive subtitle)
4. Top stat strip (§6.6 — one headline + supporting, no decorative color tiles)
5. Primary chart card (large, full-width)
6. Secondary chart grid (2-column when fits)
7. Detail list (filtered by chart selection)
8. Bottom nav

### 13.9 Builder/Editor screen

Per §7.16. Pattern:
1. Status bar
2. Top nav (back + saved indicator)
3. Page H1 + breadcrumb
4. Section cards
5. Item rows with drag handle + name+tag + prescription + action icons + expandable config
6. Sticky footer action bar

### 13.10 Live Roster screen

Per §7.17. Pattern:
1. Status bar
2. Top nav (back, refresh, add)
3. Page H1 + count + freshness
4. Sectioned by state (with state dots)
5. Per-state count + section eyebrow
6. Collapsed cards by default; expand reveals action set
7. Bottom nav

### 13.11 Pillar-organized list (NEW v4)

For Goals (and any future surface organized by Pillar/category sections).

1. Status bar
2. Topbar
3. Page H1 + History link in top-right
4. Stat strip (Total / Active / Completed / Adherence)
5. Filter dropdown
6. **Per-pillar section:**
   - Sub-eyebrow with pillar name + pillar count + adherence %
   - List of pillar items (Goal cards / Habit cards / etc.)
   - "+ ADD X GOAL" placeholder at end of section
7. Archive section (§6.36) at bottom
8. FAB (§6.21) floating bottom-right (lime, not red)
9. Bottom nav

---

## 14. PATTERN APPLICATION MATRIX

This is the authoritative source for which atomics belong on which screens. **When converting a screen, look here first.**

### How to read this matrix
- Atomics are listed across the top.
- Screens are listed down the side.
- An "X" means the atomic is used on that screen.
- An "(X)" means the atomic is used in a domain-specific composite on that screen.
- This matrix is not exhaustive — any atomic CAN appear on any screen if needed; the matrix shows the *expected* uses.

### Critical reading rule

If you find yourself creating an atomic that already exists in §6, **stop**. Reuse the existing atomic. The matrix is the wrong source if the atomic isn't listed for your screen — you're correct to use it; the matrix needs updating.

### Atomic application table

(Abbreviated — focus on the atomics most commonly miscopied.)

| Atomic | Client Home | Workout Exec | Train | Workouts Hub | Goals | Habits | Body Metrics | Achievements | Progress Hub | Workout History | Meal Plans | Meal Generator | Coach Clients | Coach Gym Console | Coach Templates Editor | Coach Analytics |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Status-tinted card (§6.2) | | | | | X | | | (X) | | | | | X | | | |
| Pillar/domain stripe (§6.3) | | | | | X | X | | | | | X | | | | | |
| Hero (action) card (§6.4) | X | (X) | | | | | | | | | | | | | | |
| Stat card / strip (§6.5–6.6) | X | X | X | X | X | | X | X | X | X | X | X | X | | X | X |
| Delta pill (§6.7) | | | | | | | X | | X | X | | X | X | | | X |
| Inline editor (§6.8) | | (X) | | | X | X | X | | | | | | | | | |
| Deadline urgency (§6.9) | | | | | X | X | | | | | | | | | | |
| Stale-data text (§6.10) | | | | | | | | | | | | | X | | | |
| Target-progress bar (§6.11) | | | (X) | | X | X | X | X | | | X | X | | | (X) | |
| Variance pill (§6.12) | | | | | | | X | | | | X | X | | | | |
| Quote zone (§6.13) | | X | | | | | | | | | | | | | | |
| Self-authored note (§6.14) | | | | | | | X | | | X | | | | | | |
| Priority pill (§6.15) | | | | | X | | | | | | | | | | | |
| System tag (§6.16) | | X | | X | | | | | | X | | | | | X | |
| Status tag (§6.17) | X | | X | X | X | X | | X | | X | X | X | X | X | | |
| Tier badge (§6.18) | | | | | | | | X | | | | | | | | |
| Rarity pill (§6.19) | | | | | | | | X | | | | | | | | |
| Buttons (§6.20) | X | X | X | X | X | X | X | X | X | X | X | X | X | X | X | X |
| FAB (§6.21) | | | | | X | X | | | | | | | X | | | |
| Inputs (§6.22) | | X | | | X | X | X | | | | X | X | X | | X | |
| Bottom nav (§6.23) | X | X | X | X | X | X | X | X | X | X | X | X | X | X | X | X |
| Progress indicators (§6.24) | X | X | X | | X | X | X | X | X | X | | X | X | | X | X |
| Eyebrows + section heads (§6.25) | X | X | X | X | X | X | X | X | X | X | X | X | X | X | X | X |
| Frequency selector (§6.26) | | | | | | X | | | | | | X | | | X | |
| Step counter (§6.27) | | | | | | | | | | | | X | | | | |
| Difficulty rating (§6.28) | | | | | | | | | | X | | | | | | |
| Per-week mini-grid (§6.30) | | | | | | | | | X | | | | | | | |
| Per-set table (§6.31) | | X | | | | | | | | X | | | | | | |
| Banner (§6.32) | | | | | | | X | | | | X | X | | | | |
| Tab strip (§6.33) | | | | | | | | | X | | | | (X) | | | X |
| Filter pill row (§6.34) | | | | X | X | | | X | | X | | | X | | | |
| Empty section state (§6.35) | | | | X | X | X | X | X | X | X | X | | X | X | X | |
| Archive section (§6.36) | | | | | X | | | | | X | | | | | | |
| Add-item placeholder (§6.37) | | | | | X | X | | | | | | | | | | |

### Composite application

| Composite | Used on |
|---|---|
| Athlete Score hero (§7.1) | Client Home |
| Workout block prescription card (§7.2) | Workout Execution |
| Goal card (§7.3) | Goals (per pillar) |
| Habit card (§7.4) | Habits |
| Achievement card (§7.5) | Achievements (Progress sub-domain) |
| Personal Record card (§7.6) | Personal Records, PR celebration moment, Workout session detail |
| Top Performers / Leaderboard (§7.7) | Coach Progress, Leaderboard, Achievements (top tier) |
| Volume Calculator (§7.8) | Coach Templates Editor, Coach Programs Editor |
| Coaching Insights & Quick Actions (§7.9) | Coach Home, Coach Progress, Coach Adherence/Compliance |
| Macro pill row + Daily Totals (§7.10) | Meal Plan Detail, Meal Generator review, Client Nutrition |
| Progress Hub monthly summary (§7.11) | Progress Hub, Workout History (monthly variant) |
| Workout History session card (§7.12) | Workout History list, Coach Client Workout Logs |
| Workout History session detail (§7.13) | Workout log detail (client and coach views) |
| Meal Plan Generator wizard (§7.14) | Coach Meal Generator |
| Gym Console roster (§7.15) | Coach Gym Console |
| Builder/Editor (§7.16) | Coach Templates Editor, Coach Programs Editor, Coach Meal Plans Editor |
| Live Roster (§7.17) | Generalized — anywhere live state matters |

---

## 15. Component Inventory Mapping

### 15.1 Existing components — wrapper guidance

Don't replace wholesale. Style via design system.

| Component | Design-system role |
|---|---|
| `ClientPageShell`, `CoachPageShell` | Atmospheric backdrop + safe-area + nav |
| `BottomNav` | §6.23 |
| `Header` | Topbar pattern in recipes |
| `GlassCard` | Glass card tier |
| `PageSkeleton` | Loading state, variants match recipes |
| `ResponsiveModal` | Modal container, internals styled per design system |
| `AchievementUnlockModal` | Achievement card pattern (§7.5) inside modal |
| `WeeklyCheckInFlow` | Multi-step flow recipe (§13.6) |
| `LiveWorkoutBlockExecutor` + block executors | Single-task-focus recipe (§13.3) + per-block layouts (§7.2) |
| `CoachClientTabBar` | Tab strip (§6.33) |
| `WorkoutAssignmentModal` | Modal + builder/editor for selection state |

### 15.2 Component naming alignment

Follow existing conventions (`Optimized*`, `*Executor`, `*PageShell`, `*Card`, `*Modal`, `*View`). v4 doesn't introduce new naming patterns.

---

## 16. Working with this system in Cursor

### 16.1 The 7-pass workflow (revised v4)

For every screen conversion, apply these passes in order:

1. **Audit pass.** List every backend-connected element. Confirm none will be silently dropped.
2. **Atomic decomposition pass.** Walk through the screen and identify which atomics (§6) each element corresponds to. Use the Application Matrix (§14) as guide. Note which atomics are missing or new.
3. **Token replacement pass.** Replace hardcoded colors/font-sizes/radii with `--fc-*` tokens. **No layout changes yet.**
4. **Atomic application pass.** Replace ad-hoc UI with canonical atomics from §6. This is where consistency is enforced.
5. **Composite check pass.** If the screen has a composite (per §14 Composite Application table), verify it matches §7. If atomics are right but composite shape is wrong, fix the composite assembly.
6. **Polish pass.** Add atmospheric backdrop, noise overlay, motion tokens, focus states. Verify accent role assignments (§2.10).
7. **Review pass.** Check against principles (§1). Anti-cargo-culting check: any element that "feels copied from another screen" — is it actually a shared atomic per §14? If yes, good. If no, it should be.

### 16.2 The anti-cargo-culting rules

These rules prevent the most common AI-driven design system failure: copying a screen-level treatment onto a screen where it doesn't belong.

**Rule 1: Decompose before copying.** When a screen reminds you of another screen, do not copy the layout. Ask: which atomics does the source screen use? Which atomics does the target screen need? Apply atomics, not layouts.

**Rule 2: Composites are not portable.** A composite (§7) describes how to assemble atomics on a specific domain. The Goal card composite belongs only on Goals. The Athlete Score hero belongs only on Client Home. If you need a similar shape on another screen, decompose to atomics and rebuild.

**Rule 3: New atomics require documentation.** If a screen needs a building block not in §6, propose adding it. Don't invent one-off treatments. Once the atomic exists, it's reusable everywhere appropriate.

**Rule 4: The Application Matrix is the consistency check.** Before finishing a screen, look it up in §14 and verify all listed atomics are applied. If you've used atomics not listed, ask whether the matrix needs updating or whether you've introduced unnecessary variance.

**Rule 5: When in doubt, fewer treatments wins.** A bare element using only tokens is closer to right than an over-decorated element. Decoration is the failure mode. Restraint is the design.

### 16.3 What never to do

- Don't introduce new accent colors without a clear new role. Six accents max.
- Don't replace lime with a different action color per-screen.
- Don't make information-dominant screens feel as energetic as Action-Hero screens.
- Don't use icon fonts, emoji, or PNGs. SVG only.
- Don't hardcode pixel values. Always tokens.
- Don't ship a screen with more than one Action hero card.
- Don't ship a screen where bottom-nav active state isn't cyan.
- Don't drop original elements without explicit flagging.
- Don't bulk-rewrite. One screen per session.
- Don't add descriptive subtitle banners under page titles.
- Don't paint stat cards with decorative colors.
- Don't use 6 equal-weight KPIs without one headline.
- Don't use red for normal stale data or normal deadlines.
- Don't combine status-tinted cards with status-stripe rows — pick one.
- Don't use red for the "Add" FAB. Lime.
- Don't paint macro bars by macro identity. Color is variance.
- Don't copy a screen-level treatment from one screen to another. Decompose to atomics.

---

## 17. Common Cross-Screen Issues from Screenshots

These anti-patterns are observed in current screens. v4 corrects them:

1. Cards have no atmospheric backdrop — every screen looks flat.
2. CTAs are teal/cyan, not lime — actions don't pop.
3. Block-type tags are mustard/orange instead of cyan.
4. Generic typography — exercise names, KPIs, hero numbers all use sans.
5. Status colors used decoratively — green/orange/purple on KPI cards without semantic logic.
6. Stale data painted red — "Never" / "9w ago" in red shouts when neutral would work.
7. Multiple competing CTAs per screen.
8. Subtitle banners eat space.
9. KPIs without hierarchy — 6 equal-weight stats with no headline.
10. Inconsistent macro colors — protein green, carbs yellow, fat red. Inconsistent mental model.
11. Buried primary actions — "Hub" link bottom-right, "+ Add exercise" purple.
12. Volume Calculator BELOW/OPTIMAL tags using off-token colors.
13. **Red FAB on Goals/Habits.** It reads as destructive when its function is creative. Should be lime.
14. **Heavy red text on deadlines and metrics.** Red is reserved for genuinely critical/overdue. Most deadline text should be neutral.
15. **Inline editors with weak primary action.** "Update" is the most common action on a Goal card; should be the most prominent button, not third in line.
16. **Decorative pillar emoji icons.** When pillar is identified by stripe color (atomic §6.3), emoji icon becomes redundant.

Cursor should specifically check these 16 issues during the **Polish pass** (step 6 of §16.1).

---

## 18. Open Questions / Future Work

### 18.1 Light theme
Dark-only currently. Light theme:
- Same accent hue family, reduce saturation 20–30%
- Invert text tiers (`--fc-text-primary` → near-black)
- Surfaces lift instead of deepen
- Lime stays as action; gold stays as achievement
- Gradient backdrops much subtler

`[verify]` Light theme not in any mockup.

### 18.2 Tablet/desktop layouts
Mobile-first. Wider viewports need:
- Sidebar nav alternative to bottom nav
- Two-column hero+detail patterns
- Three-column dashboard for coach analytics
- Modal sizing rules

### 18.3 Onboarding visual language
Likely needs softer, more illustrative treatment. Don't force into existing system.

### 18.4 Charts and graphs
When charts ship, derive palette from existing accents:
- Series 1: lime (primary metric)
- Series 2: cyan (secondary)
- Series 3: gold (achievement/PR overlays)
- Series 4: purple (supplemental)
- Negative trend: warning amber
- No rainbow defaults

### 18.5 Tabata block executor
`[verify]` log shape and target panel structure.

### 18.6 Notification screens / push UI
Not yet designed.

### 18.7 Vocabulary alignment
Decisions needed: compliance vs adherence, Training vs Workouts, /client/profile vs /client/me, meal_plan_assignments vs assigned_meal_plans.

### 18.8 Token system consolidation
Two-layer (shadcn + `--fc-*`). Long-term: standardize on `--fc-*`.

### 18.9 Surface class consolidation
`fc-glass`, `fc-glass-soft`, `fc-surface`, `fc-card-shell` overlap. v4 §6.1 maps tiers. Consolidation is a separate refactor decision.

### 18.10 Volume Calculator extension
Pattern in §7.8 could power adjacent features. Worth considering as generalized "X vs target" component.

### 18.11 Real-time collaborative editing
Builder/editor "SAVED" indicator suggests autosave. If multi-coach editing exists, need presence indicators, conflict resolution, lock states. `[verify]`

---

## 19. Rollout Priority

The audit identifies 75+ screens. Don't convert all at once.

### Phase 1 — High impact, low risk
1. `/client` (Client Home)
2. `/client/workouts/[id]/start` (Workout Execution — Straight Set baseline)
3. `/client/train` (Train Hub)
4. `/client/workouts` (Workouts Hub)

After Phase 1: pause, refine system to v5 if needed.

### Phase 2 — Designed patterns, untested screens
5. `/client/workouts/[id]/details`
6. `/client/workouts/[id]/complete`
7. `/client/programs/[id]/details`
8. `/client/profile`
9. `/client/check-ins` (Hub)

### Phase 3 — Multi-step flows + remaining workout block executors
10. `/client/check-ins/weekly`
11. `/client/check-ins/history`
12. **All block executors** — apply §7.2 one block at a time

### Phase 4 — Goals/Habits/Activity (NEW v4 patterns)
13. `/client/goals` (apply §7.3 Goal card + §13.11 Pillar-organized list)
14. `/client/goals/history` (§6.36 Archive)
15. `/client/habits` (apply §7.4 Habit card)
16. `/client/activity`

### Phase 5 — Nutrition (apply §7.10, §7.14)
17. `/client/nutrition`, `/client/nutrition/meals/[id]`, `/client/nutrition/foods/[id]`

### Phase 6 — Progress sub-domains
18. `/client/progress` (apply §7.11 Monthly summary)
19. `/client/progress/personal-records` (§7.6)
20. `/client/progress/achievements` (§7.5)
21. `/client/progress/leaderboard` (§7.7)
22. `/client/progress/body-metrics`
23. `/client/progress/analytics`
24. `/client/progress/workout-logs` (§7.12) + detail (§7.13)
25. `/client/progress/mobility`, `/performance`, `/nutrition`

### Phase 7 — Challenges
26. `/client/challenges`, `/client/challenges/[id]`

### Phase 8 — Coach side (likely needs design-system v5)
27. `/coach` (apply §14.1 + §7.9)
28. `/coach/clients` (apply §6.2 status-tints)
29. `/coach/clients/[id]` + sub-routes
30. `/coach/gym-console` (§7.15)
31. `/coach/programs`, `/coach/workouts/templates` (libraries)
32. `/coach/programs/create`, `/coach/programs/[id]/edit` (§7.16 + §7.8)
33. `/coach/workouts/templates/create`, `/coach/workouts/templates/[id]/edit` (§7.16 + §7.8)
34. `/coach/nutrition/*` (§7.10 + §7.14)
35. `/coach/analytics`, `/coach/reports`, `/coach/adherence`, `/coach/compliance`
36. `/coach/progress`
37. Remaining coach screens

### Phase 9 — Admin
38. All `/admin/*` — utility, minimal styling

### Phase 10 — Auth/onboarding
39. `/`, `/create-user`, onboarding — likely needs new patterns

---

## 20. Risks & Caveats

### 20.1 Things v4 still gets wrong (likely)
- Tabata executor layout — not seen, only inferred
- Light theme treatment — speculative
- Chart styling — deferred
- Some atomics may need refinement after Phase 1
- Application Matrix (§14) is best-effort; may need updates as real screens reveal usage patterns

### 20.2 Things to confirm before applying
- Exact pixel values for `--fc-radius-*` tokens
- Whether `--fc-text-quaternary` and `--fc-text-disabled` exist
- Real Tabata executor structure
- Light theme spec
- Multi-coach editing presence
- Vocabulary decisions (compliance vs adherence, etc.)

### 20.3 What this system can't do
- Resolve product-level naming inconsistencies
- Design coach builder workflows for unseen screens
- Specify chart styling without dedicated pass
- Drive light theme without dedicated mockups
- Replace genuine user research

### 20.4 Critical anti-pattern: cross-screen cargo-culting
The single most likely failure mode for AI-driven design system application is: an LLM sees a styled screen, picks up its visual conventions, and applies them to a different screen where they don't belong. v4 is structured specifically to prevent this. The Atomic-first decomposition (§16.1 step 2), Anti-Cargo-Culting Rules (§16.2), and Application Matrix (§14) are the three lines of defense. If Cursor is producing inconsistent cross-screen results, the likely cause is skipping one of these.

---

## 21. Version Log

- **v1:** Initial system from dashboard/train/workout-execution mockups.
- **v2:** Grounded in APP_AUDIT (75+ screens). Token mapping. Athlete Score 5-tier.
- **v3:** Real-screen screenshots for coach side. Volume Calculator, Status-tinted card, Macro tokens, Live Roster, Builder/Editor, Top Performers, Coaching Insights, Tabata, Cluster Set, Block-aware buttons, Stale-data rules, KPI hierarchy, Status-color discipline, Subtitle banner discipline, Stat-card empty-state.
- **v4 (current):** Restructured into Atomic + Composite pattern architecture. Added: Inline editor, Deadline urgency, Stale-data text, Target-progress bar with variance, Variance pill, Self-authored note, Priority pill, Tier badge, Rarity pill, FAB, Frequency selector, Step counter, Difficulty rating, Per-week mini-grid, Per-set table, Banner, Tab strip, Filter pill row, Empty section state, Archive section, Add-item placeholder atomic patterns. Composite patterns for Goal card, Habit card, Achievement card, Personal Record card, Top Performers, Volume Calculator, Coaching Insights, Macro pill row + Daily Totals, Progress Hub monthly summary, Workout History session card+detail, Meal Plan Generator wizard, Gym Console roster, Builder/Editor, Live Roster. Added Pattern Application Matrix (§14) for cross-screen consistency. Added 7-pass workflow with explicit Atomic Decomposition and Composite Check passes. Added Anti-Cargo-Culting Rules (§16.2). Added Pillar-organized list screen recipe (§13.11). Cataloged 16 cross-screen anti-patterns observed in current UI.
- **v5 (planned):** After Phase 1–3 conversions, refine atomics based on what broke. Light theme spec. Chart styling spec. Tabata layout. Real Program editor pattern.
