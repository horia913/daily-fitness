# UX Archetypes

Every screen must be classified into exactly one archetype and follow its rules.

Common rules (all archetypes):
- Preserve existing functionality and logic.
- No new components beyond existing system.
- Same layout structure in Dark and Light; only tone changes.
- Avoid pure black `#000` and pure white `#fff`.

---

## Dashboard / Hub

Purpose:
- Provide a high-level overview and primary next action.

Mandatory layout zones:
- Header
- Hero card
- KPI row (2–4 max)
- Up Next section
- Secondary lists

Component order:
1) Header
2) Hero card
3) KPI row
4) Up Next
5) Secondary lists

Spacing rules:
- Large vertical spacing between zones (24–32px).
- Compact spacing within KPI row (12–16px).

Visual hierarchy rules:
- Single primary CTA.
- No more than 3 visual weights.

Not allowed:
- Multiple competing hero CTAs.
- Dense tables.

Typical components:
- Glass cards, KPI tiles, list rows, CTA button.

---

## List Browser

Purpose:
- Browse and filter a set of items.

Mandatory layout zones:
- Header
- Segmented tabs or filters
- Filter chips (optional)
- List container

Component order:
1) Header
2) Tabs/segmented
3) Filter chips
4) List rows

Spacing rules:
- Tight vertical rhythm (16–20px between zones).
- List rows stacked with 8–12px gaps.

Visual hierarchy rules:
- One active filter state.
- List rows visually consistent.

Not allowed:
- Mixed card styles in one list.
- Multiple list types on the same screen.

Typical components:
- Tabs/segmented, chips, list rows, badges.

---

## Detail View

Purpose:
- Deep dive into a single entity.

Mandatory layout zones:
- Header
- Hero summary
- Detail sections
- Related items

Component order:
1) Header
2) Hero summary
3) Detail blocks
4) Related list

Spacing rules:
- Distinct section breaks with 24px spacing.

Visual hierarchy rules:
- One primary CTA.
- Secondary actions grouped.

Not allowed:
- Mixed list + analytics without separation.

Typical components:
- Hero card, section cards, list rows.

---

## Builder / Editor

Purpose:
- Create or edit structured content.

Mandatory layout zones:
- Header
- Primary editor area
- Secondary settings
- Footer actions (sticky allowed)

Component order:
1) Header
2) Primary editor
3) Secondary settings
4) CTA footer

Spacing rules:
- Clear separation between editor and settings.

Visual hierarchy rules:
- One primary save/commit CTA.
- Secondary actions grouped.

Not allowed:
- More than one primary CTA.

Typical components:
- Inputs, select, list rows, toggles, sticky CTA bar.

---

## Execution / Live

Purpose:
- Real-time task execution (workout, timer).

Mandatory layout zones:
- Header with status
- Active task card
- Step/list rows
- Sticky action bar

Component order:
1) Header
2) Active task card
3) Step list
4) Sticky actions

Spacing rules:
- Compact in-list spacing; larger gaps between zones.

Visual hierarchy rules:
- High contrast on active item.
- Clear progress indicators.

Not allowed:
- Dense analytics blocks.

Typical components:
- Active card, list rows, progress ring, sticky CTA.

---

## Analytics

Purpose:
- Present metrics, charts, and trends.

Mandatory layout zones:
- Header
- Primary chart
- Secondary metrics
- Table or list

Component order:
1) Header
2) Primary chart
3) KPI row
4) Table/list

Spacing rules:
- Charts and lists separated by 24px.

Visual hierarchy rules:
- One highlighted primary chart.

Not allowed:
- Multiple competing charts at top.

Typical components:
- Charts, KPI tiles, table rows.

---

## Form / Setup

Purpose:
- Capture structured input or onboarding.

Mandatory layout zones:
- Header
- Form blocks
- Inline help
- Sticky submit actions

Component order:
1) Header
2) Form blocks
3) Inline help
4) CTA

Spacing rules:
- Form groups spaced 16–24px.

Visual hierarchy rules:
- Primary CTA at bottom.

Not allowed:
- Mixed list browsing within form.

Typical components:
- Inputs, selects, toggles, helper cards, sticky CTA.

---

## Modal / Overlay

Purpose:
- Focused overlay action.

Mandatory layout zones:
- Title
- Content
- Actions

Component order:
1) Title
2) Content
3) Actions

Spacing rules:
- Compact spacing (12–16px).

Visual hierarchy rules:
- One primary action.

Not allowed:
- Complex multi-section layouts.

Typical components:
- Modal card, inline alert, buttons.

