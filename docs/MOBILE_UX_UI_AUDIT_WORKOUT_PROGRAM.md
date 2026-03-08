# Mobile UX/UI Audit — Workout & Program Screens

**Viewport focus:** 375–414px width (mobile)  
**Audit type:** Read-only — no files were modified.  
**Date:** February 2026

---

## 1. SCREEN: Workout Create/Edit Form

**Files reviewed:**  
`WorkoutTemplateForm.tsx`, `BasicInfoSection.tsx`, `AddExercisePanel.tsx`, `ActionButtons.tsx`, `EmptyExerciseState.tsx`

### A. Layout Analysis

- **Padding and margins:** Form uses `px-3 py-3 sm:px-6 sm:py-5` on the header and `px-3 pb-4 pt-0 sm:px-6 sm:pb-6` on content; on mobile this is 12px horizontal. BasicInfoSection cards use `px-3 py-4` / `px-3 pb-4 pt-0` and the three config cards (Category, Duration, Difficulty) use `p-2` — very tight on small screens. The main scrollable area uses `px-0` when `isPage` (edit page) and `px-3` in modal; form inner uses `space-y-4 sm:space-y-5`. Overall padding is on the tight side for 375px.
- **Information density:** High. Status banner, Basic Info card, three small config cards, then “Workout Flow” + Add Exercise button, then either drag-drop list or empty state, then Add Exercise panel when open. No mobile-specific reduction of sections.
- **Scroll depth:** When Add Exercise is open, panel is `order: 0` and list `order: 1`, so the panel appears above the list; user still scrolls through the full form. Modal has `maxHeight: min(88vh, calc(100vh - 4rem))` and `overflow-y-auto` on the content area — scroll can be long for templates with many blocks.
- **White space:** `space-y-4` between form sections; cards use `space-y-2` for fields. Config cards are `grid-cols-1 md:grid-cols-3` so on mobile they stack — reasonable, but with `p-2` they feel cramped.

### B. Typography

- **Headings:** Header uses `text-xl font-bold` for “Edit/Create Workout Template”; “Workout Flow” uses `text-xl font-bold`. Card titles use `text-lg` (Template Details) or `text-sm font-semibold` (Category, Duration, Difficulty). Sizes are readable.
- **Body/labels:** Labels are `text-sm font-medium`. Inputs use default (with `text-base` in some Input usage). Description placeholder and helper text are `text-xs` — acceptable but small on mobile.
- **Labels:** Consistent `text-sm`; sufficient for clarity.

### C. Interaction Patterns

- **Touch targets:** Primary Button uses `h-11` (44px) via `button.tsx` default — good. Add Exercise and “Add Exercise” in empty state use `px-6 py-3` and `w-full sm:w-auto` — full width on mobile, adequate height. AddExercisePanel close button is `p-2` with `w-4 h-4` icon → ~32px tap area, **below 44px**. ActionButtons: container `px-6 py-4`; buttons are `w-full sm:w-auto` and use default size (h-11) — good when stacked. Ghost icon buttons (e.g. header close) are `p-2` + `w-5 h-5` → ~36px, below 44px.
- **Inputs:** Input component uses `h-11` (44px) — good. No explicit mobile overrides.
- **Dropdowns:** SelectTrigger in `select.tsx` uses `data-[size=default]:h-9` (36px) — **below 44px** on mobile. AddExercisePanel and BasicInfoSection use `SelectTrigger className="rounded-xl"` / `mt-2 rounded-xl` without min-height override.
- **Drag-and-drop:** Drag handle is `hidden sm:flex` — **on mobile there is no visible drag handle**; `Draggable` still uses `provided.dragHandleProps` on the whole card wrapper, so the entire card is the drag handle. No explicit “long-press to reorder” or alternative reorder UI for touch.

### D. Information Hierarchy

- Header (title + close) is sticky in modal. Template Details and the three config cards establish context; “Workout Flow” and count are clear. When Add Exercise is open, the panel’s “Add Exercise” title and Exercise Type selector are prominent; the long list of block types in one Select can blur hierarchy. Primary actions (Add Exercise, Save/Cancel) are visually clear.

### What's Working Well

- Primary actions (Add Exercise, Create/Update Template, Cancel) use full-width stacking on mobile (`flex-col sm:flex-row`, `w-full sm:w-auto`) and default button height (h-11).
- Inputs use h-11 for touch-friendly height.
- Basic info and config sections stack in a single column on mobile; no horizontal squashing.
- Empty state has a single, clear CTA and readable copy.
- Add Exercise panel is shown above the list when open (order 0/1), reducing “where did it go?” confusion.

### Issues Found

- **Critical:** On mobile, **drag handle is hidden** (`hidden sm:flex` on the GripVertical wrapper in WorkoutTemplateForm). Users have no clear affordance that reordering is possible; the whole card is draggable but this is undiscoverable.
- **Major:** **SelectTrigger height is h-9 (36px)** site-wide — below the 44px minimum recommended for touch. Affects Exercise Type, Category, Duration, Difficulty, and all Selects in AddExercisePanel and ExerciseDetailForm.
- **Major:** **Add Exercise panel** contains a single long Select with 12+ block types (straight set, superset, giant set, drop set, cluster set, rest-pause, pre-exhaustion, HR sets, AMRAP, EMOM, Tabata, For Time). On 375px with `max-h-60` the list is scrollable but dense; no grouping or search — overwhelming on small screens.
- **Major:** **Add Exercise panel close** is a ghost button with `p-2` and `w-4 h-4` icon — touch target below 44px; easy to mis-tap.
- **Minor:** Config cards (Category, Duration, Difficulty) use `p-2` and very small icons (`w-3 h-3`); on mobile the block feels cramped.
- **Minor:** ActionButtons container uses `px-6`; on narrow viewports this is consistent but the bar could use a bit more top padding for thumb reach when scrolled to bottom.
- **Minor:** Status banner (“Enhanced Training Programs”) takes vertical space on every load; on mobile this pushes primary content down.

### Recommendations

- Expose a mobile-friendly reorder control (e.g. visible handle or “Reorder” mode with up/down buttons) instead of hiding the handle on small viewports.
- Increase SelectTrigger minimum height to at least 44px on touch devices (e.g. `min-h-11` or `h-11` for default size).
- Consider grouping block types in the Add Exercise selector (e.g. “Resistance” vs “Time-based”) or a two-step picker on mobile.
- Increase close button tap area in AddExercisePanel to at least 44×44px (e.g. `p-3` or `min-w-11 min-h-11`).
- Slightly increase padding on the three config cards on mobile (e.g. `p-3`).
- Optionally make the status banner dismissible or compact on mobile.

---

## 2. SCREEN: Exercise Block Cards (in Workout Form)

**Files reviewed:**  
`ExerciseBlockCard.tsx`, `ExerciseDetailForm.tsx`, `ExerciseItem.tsx`

### A. Layout Analysis

- **Padding:** ExerciseBlockCard uses `p-3 sm:p-5` — on mobile 12px; content is number badge, title row, summary line, optional notes, then optional nested exercises with `mt-4 pt-4` and `space-y-3`, then children (ExerciseDetailForm) in `mt-5 pt-5`. Card has `rounded-2xl border` and `fc-glass fc-card` — readable but dense when expanded.
- **Information density:** Each card shows index (1-based), block type pill (icon + label), exercise name (or “Block Type N”), and a summary line (`renderExerciseSummary()` — e.g. “3 sets × 10 reps • 60s rest • 70% load”). For complex blocks, nested exercises are listed with ExerciseItem (name + details string). When `children` is present (inline ExerciseDetailForm), the full edit form appears below — many fields and sections.
- **Scroll:** Cards are in a `space-y-3` list; with multiple blocks and expanded forms, scroll depth grows quickly. No collapse/expand on the card itself — the detail form is always visible when in form mode.
- **White space:** `gap-3` between left (number + content) and right (actions); `mb-1` between title row and summary; nested section has `space-y-2` / `space-y-3`. Adequate but not generous.

### B. Typography

- **Card title:** `font-semibold fc-text-primary break-words` (no explicit size — inherits); block pill is `text-xs`. Summary is `text-sm fc-text-subtle break-words`. Notes are `text-xs`. Readable.
- **ExerciseDetailForm:** Section titles like “Straight Set Configuration” use `font-semibold` and `text` theme; labels `text-sm font-medium`. Inputs and Selects follow global styles. Straight set uses `grid grid-cols-2 gap-3 sm:gap-4` for Sets/Reps and Rest/RIR — on mobile two columns can be tight for small inputs.

### C. Interaction Patterns

- **Touch targets:** Edit and Delete on the card are `Button variant="ghost" size="sm"` — shadcn `sm` is `h-8` (32px) — **below 44px**. No drag handle on mobile (handled at parent list level). In ExerciseDetailForm, type selector and SearchableSelect are full width on mobile (`grid-cols-1 sm:grid-cols-2` → one column); Load %/Weight toggle and inputs are standard.
- **Set/rep/weight layout:** Straight set uses two-column grid: Sets, Reps, then Rest, RIR, then Tempo. On 375px each cell is narrow; inputs remain usable but labels and values can wrap. No single “set row” (e.g. Set 1: reps × weight) — it’s one set of parameters for the block.
- **Advanced techniques:** Drop set, cluster set, rest-pause, etc. each have their own sections with multiple inputs; same grid and spacing patterns. Dense on small screens.
- **Edit/delete/reorder:** Edit and Delete are icon-only on the card (size sm); reorder is at list level (whole card draggable, no handle on mobile). Two icon buttons side-by-side can be hit with a thumb but are small.

### D. Information Hierarchy

- Block number and type pill establish identity; exercise name (or block type label) is primary; summary line is secondary. In form mode, the inline detail form below is the main editing surface — hierarchy is clear but the amount of content in one card is high when expanded.

### What's Working Well

- Card layout is consistent: number, title, pill, summary, notes, then nested list or form. Break-words avoids overflow.
- Block type pill (icon + label) gives quick scanning.
- ExerciseDetailForm uses responsive grid (1 col mobile, 2 col sm) for type + exercise selector.
- Nested exercises (tabata/circuit/giant set, etc.) are structured with set headers and ExerciseItem rows.

### Issues Found

- **Major:** **Edit and Delete buttons** use `size="sm"` (h-8) — touch targets below 44px; risk of mis-tap, especially when multiple cards are stacked.
- **Major:** **No collapsed state** for exercise cards in form mode. Every card shows the full ExerciseDetailForm when there are many blocks, leading to very long scroll and high density.
- **Major:** **SelectTrigger** in ExerciseDetailForm (exercise type, and any Select) remains h-9 — same touch issue as above.
- **Minor:** Two-column grids in Straight Set (and similar sections) with `gap-3` and small inputs are cramped on 375px; labels and values could use more breathing room.
- **Minor:** Nested ExerciseItem rows are compact; on small screens many nested items increase scroll and cognitive load.
- **Minor:** Drag handle hidden on mobile applies here too — reorder affordance is missing at the card level.

### Recommendations

- Use at least 44px-tall targets for Edit and Delete (e.g. default or `size="default"` and ensure min height, or larger tap area with padding).
- Add a collapsed/expanded state per card in form mode: show summary + “Edit” to expand inline form; reduce initial scroll length.
- Increase SelectTrigger height globally (or for these forms) to meet 44px.
- Consider stacking set/rep/rest fields in a single column on very narrow viewports (e.g. &lt; 400px) for easier tapping and reading.

---

## 3. SCREEN: Program Create/Edit Form

**Files reviewed:**  
`src/app/coach/programs/[id]/edit/page.tsx` (Edit Program page with 3 tabs: Basic Info, Weekly Schedule, Progression Rules). No separate “ProgramForm.tsx”; the form is in the edit page.

### A. Layout Analysis

- **Padding:** Page uses `p-4 sm:p-6`; main content `max-w-5xl mx-auto space-y-6`. Tab content panels use `p-6` or `p-6 sm:p-10` (header card). Tab bar is `p-2` with `flex gap-2`; each tab is `flex-1 rounded-xl`. On mobile, horizontal padding 16px is acceptable.
- **Information density:** Basic Info tab: name, description, difficulty, duration, category, is_active — all in one scroll. Schedule tab: info card, week selector, then **grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`** for 7 days — on mobile 1 column, so 7 tall day cards. Each day card has icon, “Day N”, and a Select for template. Progression tab: week selector, day selector (flex-wrap buttons), then ProgramProgressionRulesEditor. Density is high in Schedule (7 selects) and in Progression (many day buttons + editor).
- **Scroll:** All three tabs can scroll; Schedule has the most content (week selector + 7 day cards + info + optional ProgramVolumeCalculator). Progression has week + day buttons + editor — long if many days.
- **White space:** `space-y-6` between sections; day cards use `p-5` and `gap-4` in grid. Reasonable.

### B. Typography

- **Headings:** “Edit Program” is `text-3xl`; tab content titles `text-2xl` (Schedule, Progression). Labels are `text-sm font-semibold`. Body text and descriptions are `text-sm` or default. Readable.
- **Tab labels:** On mobile, tab text is **hidden**: `span className="hidden sm:inline"` for “Basic Info”, “Weekly Schedule”, “Progression Rules” — so **tabs show only icons** (BookOpen, Calendar, TrendingUp). Icons are `w-4 h-4`. Users must infer meaning from icons alone.

### C. Interaction Patterns

- **Tab navigation:** Tabs are `Button` with `flex-1`; no explicit min-height — they use default (h-11), so touch height is OK. **Labels hidden on mobile** — icon-only tabs are ambiguous (e.g. BookOpen vs Calendar vs TrendingUp) and may confuse.
- **Week selector:** Select with `w-40` (Schedule) or `w-32` (Progression); SelectTrigger again h-9.
- **Day cards (Schedule):** Each card has a Select for “Rest Day” or template name. Full width on mobile; trigger uses default Select height (h-9). Seven cards stacked — a lot of scrolling and tapping.
- **Progression day selector:** `flex-wrap gap-2` buttons showing “Day N - Template Name”. Buttons use default size; text can wrap on narrow width; many buttons create a long strip or multiple rows.
- **Basic Info:** Input, Textarea, Select, checkbox; inputs are full width on mobile. Checkbox is `w-5 h-5` — small for touch.

### D. Information Hierarchy

- “Edit Program” and program name at top set context. Tabs separate Basic / Schedule / Progression clearly. Within Schedule, “Select Week” and then the 7 day cards are clear; info box explains Week 1 auto-apply. Progression header explains rules; week and day selectors then editor. Hierarchy is good; density and icon-only tabs weaken it on mobile.

### What's Working Well

- Three-tab structure keeps Basic Info, Schedule, and Progression separated.
- Schedule day cards stack in one column on mobile — no horizontal scroll.
- Week selector and Progression week selector are compact and understandable.
- Save/Cancel in Basic Info use flex and spacing; primary action is clear.
- Info callouts (Week 1 auto-apply, progression copy) are visible and readable.

### Issues Found

- **Critical:** **Tab labels are hidden on mobile** (`hidden sm:inline`). Only BookOpen, Calendar, and TrendingUp icons show; new users may not know which tab is “Basic Info” vs “Weekly Schedule” vs “Progression Rules”.
- **Major:** **SelectTrigger h-9** again — week and day template selects are below 44px touch target.
- **Major:** **Schedule tab:** 7 day cards in one column means long scroll; each card has a Select. Repetitive and tiring on small screens; no sticky week selector when scrolling.
- **Major:** **Progression day buttons** can be many (e.g. 5–7); wrapped in a flex row they take vertical space and require scrolling to see “Select a day” and the editor below.
- **Minor:** Basic Info checkbox (`w-5 h-5`) is below 44px; “Program is active” label is beside it — tap target for the label could be enlarged.
- **Minor:** Program editor header card uses `p-6 sm:p-10` — on mobile p-6 is fine but the icon (w-14 h-14) and title take a chunk of space before the tab bar.

### Recommendations

- Show tab labels on mobile (e.g. short labels like “Info”, “Schedule”, “Progression” under or next to icons, or always show text with `text-xs`).
- Increase SelectTrigger height to at least 44px.
- Consider a more compact Schedule view on mobile (e.g. week strip + single day focus, or horizontal day pills with a detail panel) to reduce vertical scroll.
- Make “Program is active” a larger touch target (e.g. tap area on label or larger checkbox).
- Consider sticky week selector in Schedule tab when scrolling through day cards.

---

## 4. SCREEN: Workout Template Details Page

**Files reviewed:**  
`src/app/coach/workouts/templates/[id]/page.tsx`

### A. Layout Analysis

- **Padding:** Page uses `p-4 sm:p-6 pt-10`; content `max-w-5xl mx-auto space-y-8`. Nav and header have flex-wrap and gap; stats grid is `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — on mobile 1 column, 4 stat cards stacked. Workout Flow section has `space-y-3` and list in `max-h-[600px] sm:max-h-[700px] overflow-y-auto`. Padding is consistent; 16px on mobile is fine.
- **Information density:** Nav (two back links + Duplicate, Delete, Edit Template); header (badges, name, description); 4 stat cards (Duration, Exercises, Assignments, Rating); then “Workout Flow” with block count and scrollable list of ExerciseBlockCards. Each block card shows block type, name/summary, and nested exercises when applicable. Density is moderate to high in the flow list.
- **Scroll:** Nav and header stay in flow; stats then flow list. Flow list has a max height and its own scroll — **nested scroll** (page scroll + list scroll). On short viewports this can be confusing (scroll inside a box vs page).
- **White space:** `space-y-8` between major sections; `space-y-4` in header; `gap-6` in stats grid; `space-y-3` between block cards. Adequate.

### B. Typography

- **Header:** Template name `text-3xl sm:text-4xl font-bold`; description `text-lg`; badges `text-xs sm:text-sm`. Stats use `text-2xl font-bold` for numbers and `text-xs` for labels. “Workout Flow” is `text-2xl font-bold`. Block cards use default/semibold for title and `text-sm` for summary. Readable.
- **Labels:** “Duration”, “Exercises”, etc. are `text-xs`; block type pill in card is `text-xs`. Clear.

### C. Interaction Patterns

- **Action buttons:** Nav has Duplicate and Delete as `variant="outline" size="sm"` — icon + `hidden sm:inline` text, so **on mobile only icons** (CopyIcon, Trash2). Edit Template is full “Edit Template” with icon. Duplicate and Delete are small (sm = h-8) — touch targets below 44px. Edit is a Link + Button, default size (h-11) — good.
- **Back links:** Two links (“Back to Training”, “Back to Templates”); one is a button-style link, one is icon + text. Both readable and tappable.
- **Block cards:** View-only (renderMode="view"); no edit/delete on this page. Left border color indicates block type. Cards are not interactive except as a whole (no expand/collapse).
- **List scroll:** The flow list has fixed max height and overflow-y-auto; on mobile the inner scroll competes with outer page scroll — users may try to scroll the page and hit the list boundary.

### D. Information Hierarchy

- Template name and category/difficulty badges are top; description follows. Stats give a quick overview; “Workout Flow” and block count set context for the list. Each card’s left border, block type pill, and summary support scanning. Good hierarchy; nested scroll and icon-only actions weaken clarity.

### What's Working Well

- Single, clear layout: nav → header → stats → flow. No tabs.
- Stats grid stacks to one column on mobile; numbers are prominent.
- Block cards reuse ExerciseBlockCard in view mode; consistent with app.
- Block type indicated by border color and pill; easy to scan.
- Edit Template is the primary action and is full-width friendly.

### Issues Found

- **Major:** **Duplicate and Delete** show only icons on mobile (`hidden sm:inline` on label). Icon-only with `size="sm"` (h-8) — small touch target and ambiguous (copy vs delete) without labels or tooltips.
- **Major:** **Nested scrolling:** Workout Flow list has `max-h-[600px] sm:max-h-[700px] overflow-y-auto`. On 375px the list box is tall; scrolling inside the box vs scrolling the page can feel inconsistent and trap focus.
- **Minor:** Two “back” links (Back to Training, Back to Templates) may be redundant on mobile; one clear “Back to Templates” might suffice.
- **Minor:** Stats cards are quite tall on mobile (icon + number + label each); could be slightly more compact to reduce scroll before the flow list.
- **Minor:** No “Assign” or “Assign to client” on this page (only Edit, Duplicate, Delete); if assignment is a key action, it’s missing here.

### Recommendations

- On mobile, show Duplicate/Delete labels (e.g. “Duplicate” / “Delete” under icon or always visible) and use at least 44px touch targets (e.g. default button size or min tap area).
- Reconsider nested scroll: either make the flow list full-height with a single page scroll, or use a clear visual cue (e.g. “Scroll list” hint or different background) so the inner scroll is obvious.
- Consider a single primary “Back” (to templates) on mobile to simplify nav.
- If “Assign template” is a primary action, add it to this page’s actions.

---

## 5. SCREEN: Program Details Page

**Files reviewed:**  
`src/app/coach/programs/[id]/page.tsx`

### A. Layout Analysis

- **Padding:** `p-4 sm:p-6 pb-32`; content `max-w-5xl mx-auto space-y-8`. Header is flex-wrap; stats grid `grid-cols-2 lg:grid-cols-4` — on mobile **2 columns**, so 4 stat cards in a 2×2 grid. Training Schedule section has one card with “Week 1” and `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for days — on mobile 1 column, 7 day rows. Padding 16px; bottom padding 32px likely for a fixed bottom bar or safe area.
- **Information density:** Nav (Back + Share + MoreHorizontal icon buttons); header (badge, ID, name, description, “Assigned Clients” card with link to Manage Access); Progression CTA card; 4 stats (Total Weeks, Active Clients, Avg Duration, Target Audience); then “Training Schedule” with Week 1 and 7 day cards. Each day card shows Day N, icon (Dumbbell or Coffee), and template name or “Rest Day”. No drill-down into weeks 2+ or into workout/exercise details on this page — **only Week 1** is shown.
- **Scroll:** Single page scroll; no nested scroll. Length is moderate (header + progression + stats + 7 day cards).
- **White space:** `space-y-8`; stats `gap-4`; day grid `gap-4`. Day cards use `rounded-xl p-4`. Adequate.

### B. Typography

- **Header:** Name `text-3xl font-bold`; description `text-lg`; badge `text-[10px]` uppercase. Stats use AnimatedNumber with size “h2” and `text-xs` labels. “Training Schedule” is `text-xs font-bold uppercase tracking-widest`; “Week 1” is `text-lg font-bold`. Day labels “Day 1”… “Day 7” are `text-sm font-semibold`; template name is `text-sm`. Readable; “Week 1” is prominent.

### C. Interaction Patterns

- **Nav:** Back is a Link (text + arrow); Share2 and MoreHorizontal are `Button variant="ghost" size="icon"` with `w-10 h-10` — 40px, slightly below 44px. “Edit Program” in the Progression card is a Link + Button — clear.
- **Week navigation:** **Only “Week 1” is shown.** No week selector or tabs to view Week 2, 3, etc. So “Training Schedule” is Week 1 only; users cannot see other weeks on this page.
- **Day cards:** Not clickable; they only display day + template name. No link to workout template or to edit that day’s assignment from here.
- **Assigned Clients:** Shows “0 ACTIVE” and “Manage Access” link to edit page. No list of clients on this view.

### D. Information Hierarchy

- Program name and badge at top; description; then Assigned Clients card and Progression CTA. Stats summarize program; Training Schedule section with Week 1 and 7 days gives a clear at-a-glance view. Hierarchy is good; limitation is that only Week 1 is visible and days are not interactive.

### What's Working Well

- Simple, single-scroll layout; no tabs on this page.
- Stats in 2×2 on mobile are compact and scannable.
- Week 1 schedule is clearly laid out with day labels and template/rest.
- Progression CTA and “Edit Program” direct users to the edit page.
- Bottom padding (pb-32) suggests awareness of fixed UI or safe area.

### Issues Found

- **Critical:** **Only Week 1 is displayed.** There is no way on the Program Details page to view Week 2, 3, … N. For multi-week programs, users cannot see the full schedule without going to Edit.
- **Major:** **Share and More icon buttons** are `w-10 h-10` (40px) — just under 44px; and icon-only with no labels or tooltips — purpose (Share vs More) may be unclear.
- **Major:** **Day cards are not interactive** — no tap to open template or to see exercises; no link to the assigned workout template. Users must go to Edit to change or inspect a day.
- **Minor:** “Assigned Clients” shows “0 ACTIVE” and “Manage Access” — if there is no way to assign from this page, the card might feel like dead-end or duplicate of Edit.
- **Minor:** Section label “Training Schedule” is very small (`text-xs uppercase`); on mobile it could be slightly larger for hierarchy.

### Recommendations

- Add week navigation on Program Details (e.g. week selector or “Week 1 of N” with prev/next) so users can view all weeks, or at least indicate “Week 1 of N” and link to Edit for full schedule.
- Increase Share/More button size to at least 44px and add aria-labels or tooltips (and optionally short labels on mobile).
- Make day cards tappable: e.g. link to the workout template detail or open a small modal with template name and “View template” / “Edit assignment”.
- Consider an “Assign to client” action on this page if it’s a primary use case, to avoid going to Edit only for assignment.

---

## Cross-Cutting Summary

| Area | Recurring issues |
|------|-------------------|
| **Touch targets** | SelectTrigger h-9 (36px); several icon/ghost buttons (close, edit, delete, duplicate, share, more) below 44px; some `size="sm"` buttons. |
| **Mobile-specific UX** | Drag handle hidden on mobile; tab labels hidden (icon-only); Duplicate/Delete icon-only on template details; no week navigation on program details. |
| **Density / scroll** | Add Exercise panel has one long block-type list; exercise cards always expanded in form; Schedule tab has 7 stacked day cards; nested scroll on template details flow list. |
| **Clarity** | Icon-only controls without labels or tooltips on several screens; “Week 1 only” on program details without way to see other weeks. |

**Suggested priority order for fixes:**  
1) Touch targets (SelectTrigger + small buttons) to meet 44px.  
2) Mobile reorder affordance and tab labels (or equivalent).  
3) Program details week navigation and day card interactivity.  
4) Reduce density (collapsible exercise cards, optional grouping of block types, single scroll where possible).

---

*End of audit. No files were modified.*
