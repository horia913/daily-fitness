# UI Enhancement Workflow & Rulebook

**Purpose:** Single source of truth for upgrading all app screens with the visual enhancements validated in the train page V2 prototype. Every screen update MUST follow this document.

**Scope:** Client-facing screens first, then coach screens. Visual/UX only — no business logic, API, or data model changes.

**Related docs:**
- `docs/ui-rulebook.md` — system rules and archetype classification
- `docs/ux-archetypes.md` — layout zones per archetype
- `docs/token-mapping-rulebook.md` — design token reference
- `docs/STYLING_BEST_PRACTICES_UI_UPDATES.md` — component override rules
- `src/styles/ui-system.css` — CSS variable definitions
- `src/lib/exerciseIconMap.ts` — exercise icon/color utility

---

## 1. NON-NEGOTIABLE FOUNDATIONS

These elements define the app's identity. They must NEVER be removed, replaced, or weakened during any screen update.

### 1.1 Animated Background
- Every client page wraps content in `<AnimatedBackground>`.
- Provides time-of-day gradient + vignette overlay.
- DO NOT replace with flat backgrounds, static gradients, or raw `div` styling.

### 1.2 Glass Morphism
- All content cards use `<ClientGlassCard>` (or `fc-surface` / `fc-glass` classes).
- Provides: backdrop-blur, glass border, card shadow, semi-transparent surface.
- DO NOT replace with opaque `div`s, raw inline backgrounds, or remove blur.
- When a card needs a custom background (e.g. `bg-cyan-600`), pass it via `className` — `ClientGlassCard` will automatically skip the default surface.

### 1.3 Layout Wrappers
- `<ClientPageShell>` wraps all client page content (max-width, padding, z-index).
- DO NOT use raw `<div className="max-w-...">` as a replacement.

### 1.4 Design Tokens
- All colors, borders, shadows, and text colors come from `--fc-*` CSS variables.
- DO NOT hardcode hex values for standard UI elements.
- Hardcoded hex is acceptable ONLY for:
  - One-off accent tints (e.g. goal-color gradients)
  - Exercise icon colors (from `exerciseIconMap.ts`)
  - Achievement tier colors

### 1.5 Theme Parity
- Every visual change must work in both Dark and Light mode.
- Use `var(--fc-*)` tokens that auto-adapt, or provide explicit `dark:` Tailwind variants.
- Avoid `#000` (pure black) and `#fff` (pure white).

---

## 2. VISUAL ENHANCEMENTS TO APPLY

These are the specific improvements validated in the V2 prototype. Apply them screen by screen as appropriate.

### 2.1 Progress Indicators — Ring over Bar

**Where:** Any progress percentage display (program progress, weekly completion, goal progress, challenge progress).

**Rule:** Replace flat horizontal progress bars with SVG progress rings when the metric represents a single completion percentage.

```tsx
<div className="relative w-14 h-14 flex-shrink-0">
  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
    <circle cx="28" cy="28" r="23" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
    <circle cx="28" cy="28" r="23" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"
      strokeDasharray={`${percent * 1.445} 999`} />
  </svg>
  <span className="absolute inset-0 flex items-center justify-center text-xs font-black">
    {percent}%
  </span>
</div>
```

**Keep flat bars for:** Multi-segment displays, volume tracking, macro breakdowns (where multiple bars stack).

### 2.2 Color-Coded Status States

**Where:** Week strips, day selectors, any list with completion states.

**Rule:** Every item that has a status MUST use the correct color:

| Status     | Border/Icon Color              | Background Tint          | Icon          |
|------------|--------------------------------|--------------------------|---------------|
| Completed  | `emerald-500` / `emerald-400`  | `#22c55e` at 12% opacity | `CheckCircle` |
| Today      | `cyan-500` / `cyan-400`        | `#06b6d4` at 12% opacity | `Zap`         |
| Missed     | `amber-500` / `amber-400`      | `#f59e0b` at 12% opacity | `AlertCircle` (pulse) |
| Upcoming   | `--fc-glass-border`            | transparent              | `Circle`      |
| Rest       | `--fc-glass-border`            | transparent              | `Circle` (dim) |

**Selection indicator:** `ring-2 ring-offset-2 ring-offset-[var(--fc-bg-deep)]` with color matching the item's status.

**Text coloring:** Day labels and workout names below week strip items inherit the status color (completed = emerald, today = cyan, default = `fc-text-dim`).

### 2.3 Icon System

#### Exercises — Lucide Icons (deterministic)

**Utility:** `src/lib/exerciseIconMap.ts`

**Rule:** All exercise items across the entire app use `getExerciseVisuals()` for icon + color.

**Priority waterfall:**
1. Primary muscle group (most specific)
2. Exercise category (always available)
3. Default: `Dumbbell` icon, blue color

**Rendering pattern:**
```tsx
const { Icon, color } = getExerciseVisuals({
  category: exercise.category,
  primaryMuscleGroup: exercise.primary_muscle_group,
});

<div className="w-8 h-8 rounded-lg flex items-center justify-center"
  style={{ background: `${color}18` }}>
  <Icon className="w-4 h-4" style={{ color }} />
</div>
```

**DO NOT** use random emojis, hardcoded emoji strings, or inconsistent icon choices for exercises.

#### Food & Nutrition — Lucide Icons (deterministic)

**Utility:** `src/lib/foodIconMap.ts`

**Rule:** All food items across the entire app use `getFoodVisuals()` for icon + color based on the food's category. For macro-focused views, use `getMacroVisuals()`.

**Two icon dimensions:**

**A) By food category** — used in food lists, search results, meal plan items:

| Category     | Icon         | Color   | Rationale                |
|--------------|--------------|---------|--------------------------|
| Protein      | `Beef`       | Red     | Meat/protein association  |
| Grains       | `Wheat`      | Amber   | Wheat/grain warmth        |
| Vegetables   | `Carrot`     | Green   | Fresh greens              |
| Fruits       | `Apple`      | Purple  | Berry/fruit variety       |
| Dairy        | `Milk`       | Cyan    | Cool/fresh                |
| Nuts         | `Nut`        | Warm amber | Nutty earth tones      |
| Beverages    | `Droplets`   | Blue    | Water/liquid              |
| Snacks       | `Cookie`     | Orange  | Energy/fun                |
| Condiments   | `Utensils`   | Slate   | Neutral/supporting        |
| Desserts     | `CakeSlice`  | Pink    | Sweet                     |
| General      | `Utensils`   | Slate   | Fallback                  |

**Rendering pattern (by category):**
```tsx
const { Icon, color } = getFoodVisuals({ category: food.category });

<div className="w-8 h-8 rounded-lg flex items-center justify-center"
  style={{ background: `${color}18` }}>
  <Icon className="w-4 h-4" style={{ color }} />
</div>
```

**B) By dominant macro** — used in daily breakdown, "top sources", meal macro summary:

| Dominant Macro | Icon         | Color   | When to use                              |
|----------------|--------------|---------|------------------------------------------|
| Protein        | `Drumstick`  | Red     | Food with highest % protein by grams     |
| Carbs          | `Wheat`      | Amber   | Food with highest % carbs by grams       |
| Fat            | `Egg`        | Blue    | Food with highest % fat by grams         |

**Rendering pattern (by macro):**
```tsx
const { Icon, color, label } = getMacroVisuals({
  protein: food.protein,
  carbs: food.carbs,
  fat: food.fat,
});

<div className="w-8 h-8 rounded-lg flex items-center justify-center"
  style={{ background: `${color}18` }}>
  <Icon className="w-4 h-4" style={{ color }} />
</div>
<span>{label} source</span>
```

**C) Special food roles** — used for "top protein source today", vegetable highlights, etc.:

| Role           | Icon       | Color   |
|----------------|------------|---------|
| proteinSource  | `Drumstick`| Red     |
| carbSource     | `Wheat`    | Amber   |
| fatSource      | `Egg`      | Blue    |
| vegetable      | `Leaf`     | Green   |
| fruit          | `Citrus`   | Purple  |
| fish           | `Fish`     | Cyan    |

```tsx
const { Icon, color } = getSpecialFoodVisuals("proteinSource");
```

**DO NOT** use emojis for food items. **DO NOT** duplicate icon mappings per component — always import from `foodIconMap.ts`.

#### Activities — Emojis

**Utility:** `src/lib/clientActivityService.ts` → `ACTIVITY_META`

**Rule:** Activities (running, swimming, yoga, etc.) use the emoji from `ACTIVITY_META`. This is intentional — activities are casual/lifestyle, emojis convey that tone.

#### Navigation & UI Actions — Lucide Icons

**Rule:** All navigation arrows, action buttons, and UI controls use Lucide icons. No emojis for structural UI.

### 2.4 Compact Grid for Secondary Actions

**Where:** Extra training, quick actions, supplemental workout lists, challenge cards.

**Rule:** When a section contains 2–4 actionable items that are NOT the primary CTA, display them in a 2-column grid of compact cards instead of a vertical list.

```tsx
<div className="grid grid-cols-2 gap-3">
  {items.map((item) => (
    <ClientGlassCard key={item.id} className="p-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `${accentColor}18` }}>
        <IconComponent className="w-5 h-5" style={{ color: accentColor }} />
      </div>
      <p className="text-sm font-bold fc-text-primary truncate">{item.name}</p>
      <p className="text-xs fc-text-dim">{item.subtitle}</p>
    </ClientGlassCard>
  ))}
</div>
```

**Keep vertical lists for:** Primary workout lists (5+ items), exercise lists within a workout, data tables.

### 2.5 Motivational / Contextual Micro-Copy

**Where:** Rest days, empty states, workout previews.

**Rule:** Add short, encouraging micro-copy in appropriate places:

| Context           | Example                                                    |
|-------------------|------------------------------------------------------------|
| Rest day          | "Recovery is when the magic happens. Stay hydrated."       |
| Today's workout   | "Leg day — time to build a foundation!"                    |
| Empty workout log | "Your first workout awaits. Start when you're ready."      |
| No achievements   | "Keep pushing — your first achievement is within reach."   |
| Streak active     | "3 weeks strong! Don't break the chain."                   |

**Rules:**
- Max 1 line of micro-copy per section.
- Use `fc-text-dim` or goal accent color for styling.
- Never use micro-copy on data-dense screens (analytics, logs) — it adds noise.

### 2.6 Rest Day Personality

**Where:** Any screen that shows a rest day or "no workout today" state.

**Rule:** Replace blank/minimal rest day indicators with:
- `Coffee` icon (Lucide) as the visual anchor
- Friendly message (see micro-copy table above)
- Wrapped in a `ClientGlassCard` with center alignment

### 2.7 Celebration Modals (PR & Achievement)

**Where:** Workout execution flow, workout completion page.

**Rule:** Already implemented. Key requirements for any future modal work:
- Use `createPortal(content, document.body)` to escape layout transforms
- Fire `canvas-confetti` at t=0ms, show modal card at t=500ms
- No auto-dismiss — user closes manually
- PR modal shows before achievement modals (sequenced queue)

---

## 3. WHAT NOT TO DO

These are anti-patterns discovered during the prototype process. Avoid them.

| Anti-Pattern | Why It's Wrong | Correct Approach |
|---|---|---|
| Raw `div` with `style={{ background: "#1c2333" }}` for cards | Bypasses glass morphism, breaks theme parity | Use `<ClientGlassCard>` |
| Flat `#0b0f14` background on page | Removes animated background + vignette | Use `<AnimatedBackground>` |
| Random emojis for exercise icons | Inconsistent, unscalable, breaks when coach adds exercises | Use `getExerciseVisuals()` from `exerciseIconMap.ts` |
| Emojis for food items | Inconsistent across screens, not theme-aware | Use `getFoodVisuals()` from `foodIconMap.ts` |
| Per-component food icon maps | Duplicated in OptimizedFoodDatabase, food detail page, etc. | Single source: `foodIconMap.ts` |
| `position: fixed` inside `<main>` for modals | Broken by `transform` and `overflow` on ancestors | Use `createPortal(content, document.body)` |
| Hardcoding `color: white` / `color: black` | Breaks opposite theme | Use `fc-text-primary`, `fc-text-dim`, etc. |
| Long vertical list for 2–3 action items | Wastes space, looks sparse | Use 2-column compact grid |
| Auto-dismiss on celebration modals | User misses the moment | Manual close only |
| Separate icon/color maps per component | Duplicated, inconsistent | Single utility: `exerciseIconMap.ts` |

---

## 4. PER-SCREEN WORKFLOW

Follow this exact sequence for every screen being updated.

### Step 1: Classify
- Identify the screen's UX archetype (from `docs/ux-archetypes.md`): Dashboard/Hub, List Browser, Detail View, Form, Execution, Analytics.

### Step 2: Audit Current State
- Confirm `<AnimatedBackground>` and `<ClientPageShell>` are present.
- Confirm all cards use `<ClientGlassCard>` or `fc-surface`.
- List all progress indicators, status displays, icon usage, and secondary action sections.

### Step 3: Apply Enhancements (in order)
1. **Progress rings** — replace flat bars where applicable (§2.1).
2. **Status colors** — apply color-coded states to any day/item strips (§2.2).
3. **Exercise icons** — replace any emoji or hardcoded icons with `getExerciseVisuals()` (§2.3).
4. **Compact grids** — convert short secondary lists to 2-col grids (§2.4).
5. **Micro-copy** — add motivational text to rest/empty states (§2.5).
6. **Rest day personality** — upgrade blank rest states with Coffee icon + message (§2.6).

### Step 4: Theme Verify
- Toggle between Dark and Light mode.
- Confirm all text is readable, all borders visible, all tints appropriate.
- No hardcoded colors that only look right in one theme.

### Step 5: Mobile Verify
- Check on 375px viewport (iPhone SE).
- Confirm no horizontal overflow, all tap targets ≥ 44px, grid items don't clip.

### Step 6: No Logic Regression
- Confirm all data fetching, navigation, and user actions still work.
- No changes to API calls, Supabase queries, or state management.

---

## 5. SCREEN PRIORITY ORDER

Update screens in this order (highest user impact first):

### Phase 1 — Core Client Flow
1. `/client/train` — Train page (apply V2 prototype enhancements)
2. `/client` — Client dashboard/hub
3. `/client/workouts/[id]/start` — Live workout execution
4. `/client/workouts/[id]/complete` — Workout completion

### Phase 2 — Client Progress
5. `/client/progress` — Progress hub
6. `/client/progress/achievements` — Achievements (already partially upgraded)
7. `/client/progress/personal-records` — PR display
8. `/client/progress/workout-logs` — Workout log list
9. `/client/progress/analytics` — Analytics

### Phase 3 — Client Secondary
10. `/client/nutrition` — Nutrition page
11. `/client/habits` — Habits
12. `/client/goals` — Goals
13. `/client/challenges` — Challenges
14. `/client/activity` — Activity log
15. `/client/check-ins` — Check-ins
16. `/client/profile` — Profile

### Phase 4 — Coach Screens
17. `/coach` — Coach dashboard
18. `/coach/clients/[id]` — Client detail
19. Remaining coach screens (follow same principles adapted for coach context)

---

## 6. COMPONENT REFERENCE

Quick reference for which component to use where.

| Need | Component | Import |
|---|---|---|
| Page background | `<AnimatedBackground>` | `@/components/ui/AnimatedBackground` |
| Page layout shell | `<ClientPageShell>` | `@/components/client-ui` |
| Content card | `<ClientGlassCard>` | `@/components/client-ui` |
| Exercise icon + color | `getExerciseVisuals()` | `@/lib/exerciseIconMap` |
| Food icon by category | `getFoodVisuals()` | `@/lib/foodIconMap` |
| Food icon by macro | `getMacroVisuals()` | `@/lib/foodIconMap` |
| Food icon by role | `getSpecialFoodVisuals()` | `@/lib/foodIconMap` |
| Activity emoji | `ACTIVITY_META` | `@/lib/clientActivityService` |
| Celebration modal (PR) | `<PRCelebrationModal>` | `@/components/client/workout-execution/ui/PRCelebrationModal` |
| Celebration modal (Achievement) | `<AchievementUnlockModal>` | `@/components/ui/AchievementUnlockModal` |
| Achievement card | `<AchievementCard>` | `@/components/ui/AchievementCard` |
| Week day strip | `<WeekStrip>` | `@/components/client/train/WeekStrip` |
| Section header | `<SectionHeader>` | `@/components/client-ui` |

---

## 7. DECISION LOG

Decisions made during the prototype process that inform all future work.

| Decision | Rationale |
|---|---|
| Keep animated background on all client pages | Gives the app a living, breathing feel. Removing it makes pages feel flat. |
| Keep glass morphism on all cards | The blur + border + shadow combination makes cards feel premium. Opaque cards feel dead. |
| Progress ring > flat bar for single percentages | Rings are more engaging and take less horizontal space. Validated in prototype. |
| Lucide icons for exercises, emojis for activities | Exercises are structured data (coach-created) → consistent icons. Activities are casual → playful emojis. |
| 2-col grid for secondary actions | Validated that vertical lists of 2–3 items look sparse. Grid feels intentional and balanced. |
| No auto-dismiss on celebrations | User feedback: they want to savor the moment and close manually. |
| Portal-based modals | Required because `<main>` has `transform` animation that breaks `position: fixed`. |
| Preset icon map (not coach-customizable) | Cleaner, more predictable. Coach-defined icons add complexity without meaningful benefit. |
| Two-dimensional food icons (category + dominant macro) | Category icons for browsing/listing (what is it?), macro icons for nutrition analysis (what does it contribute?). Different contexts need different visual cues. |
| Lucide for food, emojis only for activities | Food is structured data (coach-created, categorized) → consistent Lucide icons. Activities are casual/lifestyle → playful emojis. |
