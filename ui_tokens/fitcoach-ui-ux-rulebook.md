# FitCoach Pro UI/UX Rulebook

Single source of truth for visual design, components, interaction behavior, and layout archetypes.  
Derived strictly from the mockups in `dailyfitness-app/ui_tokens`.  
Dark mode is the original reference; Light Mode is a 1:1 mirror with tone changes only.  
No new visual mockups. No new components. No business logic changes.  
## 0) Global UX Constraints (Hard Rules)

- Do not break functionality, business logic, data flow, or API calls.
- Restructure layout and hierarchy only; no changes to features.
- One screen at a time. Await confirmation before moving on.
- No new patterns beyond defined archetypes and existing mockups.
- Dark and Light must be updated in parallel (same structure, different tones).
- Avoid pure black `#000` and pure white `#fff`.

## 0.1) UX Archetypes (Required)

Every screen must map to exactly one archetype.  
See `/docs/ux-archetypes.md` for full definitions and rules.

If an element is not covered by the mockups, add a Google Flash UI prompt here before implementing any UI for it.

## 0.2) UI+UX Redesign Rule (Mandatory)

For any item marked **UI+UX**, you are explicitly allowed and expected to:
- Change layout structure.
- Reorder and regroup content.
- Introduce visual hierarchy (headers, sections, emphasis).
- Add or remove UI elements (badges, icons, labels, dividers, progress indicators).
- Wrap, split, or restructure components as needed.

Constraints:
- Preserve all existing logic, data flow, and functionality.
- A UI+UX update that only changes classes, spacing, or wrappers is insufficient.
- The before/after should be visually obvious at a glance.

---

## 1) Design Tokens
## 1.8 Theme Rules (Critical)

Dark mode:
- Use charcoal/graphite surfaces (no pure black).

Light mode:
- Use pearl/off-white surfaces (no pure white).

Both:
- Same spacing, hierarchy, and layout.
- Only tone/contrast changes between themes.

### 1.1 Colors

Core background & text (Dark):
- `bg.deep`: `#0b0f14` (basalt base background)
- `bg.basalt`: `#121824` (basalt surface base)
- `bg.surface`: `rgba(18, 23, 33, 0.7)` (glass surface)
- `text.primary`: `#ffffff`
- `text.dim`: `#a0a6b0`
- `text.subtle`: `rgba(255,255,255,0.45)`

Core background & text (Light):
- `bg.deep.light`: `#f6f2ec` (warm off‑white base)
- `bg.basalt.light`: `#e8e3db` (warm basalt surface)
- `bg.surface.light`: `rgba(255, 255, 255, 0.7)` (glass surface)
- `text.primary.light`: `#1f2933`
- `text.dim.light`: `#59636e`
- `text.subtle.light`: `rgba(31, 41, 51, 0.45)`

Glass & borders (Dark):
- `glass.base`: `rgba(18, 23, 33, 0.7)`
- `glass.soft`: `rgba(255, 255, 255, 0.04)`
- `glass.border`: `rgba(255, 255, 255, 0.08)`
- `glass.borderStrong`: `rgba(255, 255, 255, 0.12)`
- `glass.highlight`: `rgba(255, 255, 255, 0.10)`

Glass & borders (Light):
- `glass.base.light`: `rgba(255, 255, 255, 0.7)`
- `glass.soft.light`: `rgba(255, 255, 255, 0.5)`
- `glass.border.light`: `rgba(82, 74, 66, 0.12)`
- `glass.borderStrong.light`: `rgba(82, 74, 66, 0.18)`
- `glass.highlight.light`: `rgba(82, 74, 66, 0.12)`

Accents (global, Dark):
- `accent.cyan`: `#00f2ff`
- `accent.purple`: `#8e94ff`
- `accent.indigo`: `#4f46e5`
- `accent.violet`: `#7c3aed`

Accents (global, Light):
- `accent.cyan.light`: `#0891b2`
- `accent.purple.light`: `#7c3aed`
- `accent.indigo.light`: `#4338ca`
- `accent.violet.light`: `#6d28d9`

Status / feedback (Dark):
- `status.success`: `#00ffaa` to `#10b981` (default `#10b981`)
- `status.warning`: `#ffaa00` to `#fbbf24` (default `#fbbf24`)
- `status.error`: `#ff2d55` to `#ef4444` (default `#ef4444`)

Status / feedback (Light):
- `status.success.light`: `#059669`
- `status.warning.light`: `#d97706`
- `status.error.light`: `#dc2626`

Domain system (strict, Dark):
- `domain.workouts`: `#38bdf8` (cyan/blue)
- `domain.meals`: `#4ade80` (green)
- `domain.habits`: `#fbbf24` (amber)
- `domain.challenges`: `#f43f5e` (rose/red)
- `domain.neutral`: `#64748b` (slate)

Domain system (strict, Light):
- `domain.workouts.light`: `#0284c7`
- `domain.meals.light`: `#16a34a`
- `domain.habits.light`: `#ca8a04`
- `domain.challenges.light`: `#be123c`
- `domain.neutral.light`: `#475569`

### 1.2 Typography

Primary fonts (use everywhere unless specified):
- `font.sans`: `Inter`
- `font.mono`: `JetBrains Mono`

Alternate fonts present in mockups (reference only, not default):
- `font.sans.alt`: `Plus Jakarta Sans`
- `font.mono.alt`: `Space Mono`
- `font.sans.alt2`: `Geist`

Type scale (px):
- `type.hero`: 48
- `type.h1`: 32
- `type.h2`: 24
- `type.h3`: 20
- `type.body`: 16
- `type.caption`: 14
- `type.label`: 12
- `type.micro`: 10

Weights:
- `weight.bold`: 700
- `weight.black`: 800
- `weight.semibold`: 600
- `weight.medium`: 500
- `weight.regular`: 400

### 1.3 Spacing (8px-based with micro steps)

Use 4px micro steps for compact UI:
- `space.1`: 4
- `space.2`: 8
- `space.3`: 12
- `space.4`: 16
- `space.5`: 20
- `space.6`: 24
- `space.7`: 32
- `space.8`: 40
- `space.9`: 48
- `space.10`: 64

### 1.4 Radius

- `radius.sm`: 12
- `radius.md`: 16
- `radius.lg`: 20
- `radius.xl`: 24
- `radius.2xl`: 32
- `radius.3xl`: 40

### 1.5 Blur

Blur values are identical between themes:
- `blur.card`: 16px
- `blur.header`: 20px
- `blur.nav`: 24px
- `blur.aurora`: 80–100px (use 80px baseline)

### 1.6 Shadows & Glow

Dark:
- `shadow.card`: `0 12px 32px -12px rgba(0,0,0,0.55)`
- `shadow.nav`: `0 20px 44px rgba(0,0,0,0.45)`
- `shadow.glow.cyan`: `0 0 22px rgba(6,182,212,0.28)`
- `shadow.glow.rose`: `0 16px 42px rgba(244,63,94,0.45)`

Light:
- `shadow.card.light`: `0 12px 24px -12px rgba(31,41,51,0.22)`
- `shadow.nav.light`: `0 16px 32px rgba(31,41,51,0.18)`
- `shadow.glow.cyan.light`: `0 0 18px rgba(8,145,178,0.22)`
- `shadow.glow.rose.light`: `0 12px 28px rgba(190,18,60,0.22)`

### 1.7 Background Layers

Always include all three layers:
- Aurora blobs: cyan / purple / indigo; blur 80–100px; opacity 0.25–0.45; slow drift (15–25s).
- Grain overlay: opacity 0.03–0.05; SVG turbulence noise.
- Vignette: radial basalt darkening, transparent center → soft basalt edges.

Light equivalents:
- Aurora blobs: same hues but lower opacity (0.12–0.28) and slightly desaturated.
- Grain overlay: opacity 0.02–0.04.
- Vignette: warm radial (transparent center → soft neutral edge, no heavy darkening).

---

## 2) Standardized Components

### 2.1 Glass Card

Base:
- Background: `glass.base` or `glass.soft`
- Border: `glass.border`
- Blur: `blur.card`
- Radius: `radius.xl` (use `radius.lg` for compact)
- Top highlight line (1px gradient) optional for hero cards

Light Mode mapping:
- Background: `glass.base.light` or `glass.soft.light`
- Border: `glass.border.light`
- Highlight: `glass.highlight.light`

Variants:
- `card.hero`: left accent stripe (domain color), larger padding, optional shimmer
- `card.compact`: smaller padding, subtle border
- `card.listRow`: horizontal layout, tap-active scale

### 2.2 Buttons

Primary:
- Height 56px (desktop/large), 48px (mobile default)
- Background: domain accent or cyan; text black for high contrast
- Radius: `radius.lg`
- Hover: slight glow; Active: `scale(0.96–0.98)`

Light Mode mapping:
- Use `accent.*.light` for emphasis
- Text remains black or deep neutral for contrast

Secondary (glass):
- Glass base + border
- Hover: border brighten + soft lift

Light Mode mapping:
- Glass base + border use `glass.*.light`

Ghost:
- Transparent; text dim; hover -> text bright

Light Mode mapping:
- Text uses `text.dim.light`, hover to `text.primary.light`

Destructive:
- Rose/red background with glow
- Always paired with a neutral ghost action

Light Mode mapping:
- Use `status.error.light` with reduced glow

### 2.3 Inputs & Selects

Base:
- Glass background with subtle border
- Focus: border + glow in domain color
- Radius: `radius.md`

Light Mode mapping:
- Background: `glass.soft.light`
- Border: `glass.border.light`
- Focus: `accent.*.light`

States:
- `success`: green border + faint green fill
- `error`: red border + faint red fill

### 2.4 Lists & Rows

Base:
- Basalt row style: glass surface, border + subtle hover
- Tap: scale down to 0.985
- Left icon tile (rounded, glass)
- Title + mono microline + meta text
- Right side badge(s) + chevron or action button
- Optional left accent stripe (domain colors only)

Light Mode mapping:
- Basalt surface: `bg.basalt.light` + `glass.border.light`

### 2.5 Tables

Base:
- Sticky header with blurred glass background
- Row hover: subtle lighten
- Selected: accent-muted background + left inset stripe

Light Mode mapping:
- Header uses `glass.base.light`
- Hover uses soft darkening (not brightening)

### 2.6 Badges & Pills

Base:
- Uppercase, tight tracking, mono for micro labels
- Filled, outlined, and glass variants
- Domain badges use domain colors only
- Status badges: `upcoming`, `active`, `done`, `skipped` (same component, different tokens)

Light Mode mapping:
- Filled: use `accent.*.light` or `domain.*.light`
- Outlined: `glass.border.light`

### 2.7 Toasts & Inline Alerts

Toasts:
- Glass card with left accent stripe
- Slide-in animation; stacked top-right on larger layouts

Light Mode mapping:
- Glass surfaces and borders use light tokens; accents use `accent.*.light`

Inline alerts:
- Large glass container with warning glow and icon
- Destructive banners use dashed border + rose glow

Light Mode mapping:
- Warning glow and destructive glow use lighter, lower-opacity shadows

### 2.8 Modals / Sheets

Bottom sheet:
- Glass surface, rounded top (`radius.3xl`)
- Rest timer ring style for execution flows

Light Mode mapping:
- Glass surface uses `glass.base.light` and `glass.borderStrong.light`

### 2.9 Navigation

Header:
- Sticky glass header with blur and thin border
- Uppercase mono label + bold title

Light Mode mapping:
- Glass header uses light glass tokens; text uses `text.primary.light`

Bottom nav:
- Floating glass bar with blur + glow on active icon
- Center FAB variant allowed

Light Mode mapping:
- Floating bar uses light glass tokens; active glow uses `shadow.glow.*.light`

---

## 3) Interaction States

Global states:
- Hover: raise by 1–2px or glow edge, never large movement
- Active/Pressed: `scale(0.96–0.98)`
- Selected: accent-muted background + left stripe or glow
- Disabled: opacity 0.5 + no hover
- Completed: grayscale + lowered opacity + optional line-through
- Locked: dimmed, dashed border, lock icon; no hover
- Destructive: rose glow + dashed border for banners

Light Mode mapping:
- Hover: use subtle darkening instead of brightening
- Selected: use low‑contrast tint from `accent.*.light`
- Disabled/Completed/Locked: same mechanics, lower contrast

Loading:
- Skeleton shimmer: gradient wave with low opacity

Empty:
- Glass card with icon + helper copy + CTA

---

## 4) Domain Color System (Strict Usage)

Use only for:
- Left accent stripes
- Badges/pills
- Icons
- Subtle glows

Never use domain colors as full backgrounds for containers.

Mapping:
- Workouts → `domain.workouts` (cyan/blue)
- Meals → `domain.meals` (green)
- Habits → `domain.habits` (amber)
- Challenges → `domain.challenges` (rose/red)

---

## 5) Layout Primitives
## 5.1) Layout Archetype Mapping (Required)

Before changing a screen:
1) Classify the screen into one archetype.
2) Restructure to match archetype zones and order.
3) Apply visual system.
4) Sync Light/Dark tones.
5) Verify no logic changes.

App Shell:
- Mobile max width ~430px (mockups)
- Glass background, aurora + grain + vignette behind

Light Mode mapping:
- Base background: `bg.deep.light`
- Glass + aurora use light tokens (lower opacity)

Header:
- Sticky top, glass blur, thin border, 80px height target

Light Mode mapping:
- Glass blur uses light tokens; border uses `glass.border.light`

Content:
- Vertical scroll area with bottom fade mask
- Section labels in mono uppercase with wide tracking

Light Mode mapping:
- Fade mask should use light-neutral edge tint (no heavy black)

## 5.2) Screen Hierarchy & Rhythm (Required)

Every primary screen uses this order:
1) Header block: mono eyebrow label + large title with subtle secondary word.
2) Hero card: primary CTA + key metadata row.
3) Metrics row: compact tiles with mono number + micro uppercase label.
4) Secondary sections: each with a small uppercase label + list rows.

Spacing rhythm:
- Section gaps: 24–32px
- Card inner padding: 20–32px (hero larger)
- List rows: 16–20px vertical padding, 16–24px horizontal

### 5.3 Unified Hero Card (Client Workouts Pattern)

When a screen has overlapping “today / progress / program” elements, unify them in one hero card:
- Eyebrow label: “Next Up” (glass pill)
- Program context: badge + “Week X of Y” + % complete (if available)
- Next workout title + metadata row (exercises / sets / time)
- Embedded progress snapshot: weekly progress bar + volume/time micro stats
- Primary CTA + secondary CTA grouped at bottom

Bottom Navigation:
- Floating glass bar, rounded, bottom spacing 24–34px

Light Mode mapping:
- Floating bar uses light glass tokens + light nav shadow

---

## 6) Theme Switch Contract

Theme toggling is already handled by `ThemeProvider` in `src/contexts/ThemeContext.tsx`:
- Dark mode is enabled by adding the `dark` class on `document.documentElement`.
- Light mode is enabled by removing the `dark` class.
- Theme preference is persisted in `localStorage` under `theme`.

Contract:
- Light/Dark differences must be implemented only through CSS variables and theme classes.
- Do not change component structure or logic to switch theme.
- Map tokens to CSS variables at `:root` (Light) and override in `.dark` (Dark).

---

## 7) Missing Coverage Prompts (Google Flash UI)

Use the prompts below to generate missing mockups for current UI elements not covered by the provided designs.

- Chat & Messaging (ChatBubble, ConversationList, MessageInput):
  - Prompt: "Design a dark-mode glassmorphism chat interface for FitCoach Pro with aurora + grain + vignette background, using Inter + JetBrains Mono. Include: conversation list panel, active chat thread with left/right bubbles, input composer with attachment + send icon, message timestamps, unread badges. Use subtle cyan/purple accent glows and soft glass cards; no flat backgrounds."

- Notifications (NotificationBell, NotificationCenter, NotificationPrompt):
  - Prompt: "Create a dark glass notification center for FitCoach Pro with stacked notification cards, unread indicator dots, and a compact bell dropdown. Use glass cards with left accent stripes for type (info/success/warning/error) and subtle glow. Include empty state and loading state."

- Achievements & Unlocks (AchievementCard, AchievementUnlockModal):
  - Prompt: "Design a dark-mode achievement card grid and unlock modal with glass cards, shimmer highlight on new unlocks, and a celebratory glow ring. Include badge, title, description, progress indicator, and CTA."

- Leaderboards (LeaderboardCard, CommunityLeaderboard, TrophyRoom):
  - Prompt: "Design a dark glass leaderboard view with ranked rows, avatar chips, score columns, and a highlighted top-3 podium panel. Use cyan/purple accents and subtle hover elevation."

- Progress Rings & Widgets (NutritionRing, MacroBars, WaterTracker, ProgressCircles):
  - Prompt: "Design compact progress widgets for macros, hydration, and goal rings in the FitCoach Pro glass/aurora style. Include circular ring, numeric center, label, and micro progress chips."

- Charts & Analytics (ChartsAndGraphs, AnalyticsChart, SimpleCharts, LifestyleAnalytics, DynamicInsights):
  - Prompt: "Design dark glass analytics cards with line/area charts and minimal axes. Include tabbed time-range filter, legend chips, and a selected state row. Use subtle gridlines and cyan/indigo accents."

- Progress Photos (ProgressPhotos):
  - Prompt: "Design a dark-mode progress photo gallery with glass frame cards, date labels, comparison toggle, and an empty state. Include a full-screen preview modal with soft glass overlay."

- Video Player Modal (VideoPlayerModal):
  - Prompt: "Design a dark glass video player modal with blurred background, playback controls, scrubber, and action buttons. Use minimal chrome and a soft cyan glow for active controls."

- Plate Calculator & Tools (PlateCalculator, PlateCalculatorWidget, LoadPercentageWeightToggle):
  - Prompt: "Design a dark glass plate calculator widget with numeric input, plate stack visualization, and quick preset chips. Include toggle for percentage loading and a compact summary row."

- Timers (SmartTimer, TimerSettings):
  - Prompt: "Design a dark glass timer card with large mono time display, start/stop controls, and preset chips. Include settings modal with toggles and segmented controls."

- Onboarding / Setup Utilities (setup-database, create-user, database-status, simple-auth):
  - Prompt: "Design a dark glass onboarding/setup screen with stepper, status badges, and primary CTA. Include info callouts and error banners matching FitCoach Pro style."

