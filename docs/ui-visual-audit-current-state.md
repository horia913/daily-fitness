# UI VISUAL AUDIT (CURRENT STATE)

Add-on to the FitCoach Pro UI/UX Improvement Plan. Token-level and small component-level alignment only. No implementation in this step.

---

## 1) Token inventory & usage

### Current `--fc-*` tokens (from [ui-system.css](dailyfitness-app/src/styles/ui-system.css) and [globals.css](dailyfitness-app/src/app/globals.css))

**Background / surfaces**

- `--fc-bg-deep` (light: #f6f2ec, dark: #0b0f14)
- `--fc-bg-basalt` (light: #e8e3db, dark: #121824)
- `--fc-muted-overlay-start/mid/end` (gradient overlay)
- `--fc-vignette-edge`
- `.fc-app-bg` uses `--fc-bg-deep`

**Glass / opacity / border**

- `--fc-glass-base` (light: rgba(255,255,255,0.7), dark: rgba(18,23,33,0.7))
- `--fc-glass-soft` (light: 0.5, dark: 0.04)
- `--fc-glass-border` (light: rgba(82,74,66,0.12), dark: rgba(255,255,255,0.08))
- `--fc-glass-border-strong`, `--fc-glass-highlight`
- `--fc-blur-card`, `--fc-blur-header`, `--fc-blur-nav`, `--fc-blur-aurora`
- `--fc-shadow-card`, `--fc-shadow-nav`

**Text**

- `--fc-text-primary` (light: #1f2933, dark: #ffffff)
- `--fc-text-dim` (light: #59636e, dark: #a0a6b0)
- `--fc-text-subtle` (rgba, ~0.45 opacity on primary)
- Semantic: `--fc-text-workouts`, `--fc-text-meals`, `--fc-text-habits`, `--fc-text-challenges`, `--fc-text-neutral`, `--fc-text-success`, `--fc-text-warning`, `--fc-text-error`

**Accent / domain / status**

- `--fc-accent-cyan`, `--fc-accent-purple`, `--fc-accent-indigo`, `--fc-accent-violet`
- `--fc-domain-workouts`, `--fc-domain-meals`, `--fc-domain-habits`, `--fc-domain-challenges`, `--fc-domain-neutral`
- `--fc-status-success`, `--fc-status-warning`, `--fc-status-error`
- `--fc-glow-cyan`, `--fc-glow-rose`

**Radius**

- `--fc-radius-sm` (12px) through `--fc-radius-3xl` (40px)

**globals.css (Tailwind theme)**  
- `--background`, `--foreground`, `--primary` (oklch blue), `--accent` (gold), `--radius`, typography scale (`--font-hero`, `--font-h1`–`--font-small`). No `--fc-bg-flow-*` for AnimatedBackground yet.

---

### Top 10 token violations (file path + what to change)

| # | File | Line(s) | Violation | Change to |
|---|------|---------|-----------|-----------|
| 1 | [AuthWrapper.tsx](dailyfitness-app/src/components/hybrid/AuthWrapper.tsx) | 380, 390–391, 406–407 | Segmented control: `bg-slate-100`, `bg-white text-blue-600`, `text-slate-600` | Use `--fc-glass-soft`, `--fc-text-primary` / domain, `--fc-text-dim` |
| 2 | AuthWrapper.tsx | 423–425, 433–435 | Error/success: `bg-red-50`, `border-red-200`, `text-red-700`, `bg-green-50`, etc. | Use `--fc-status-error` / `--fc-status-success` with glass (e.g. `fc-glass-soft` + `fc-text-error` / `fc-text-success`) |
| 3 | AuthWrapper.tsx | 447–699 | Labels, inputs, hints: `text-slate-700`, `border-slate-200`, `focus:border-blue-500`, `text-slate-500`, `bg-slate-200`, `bg-red-500`, etc. | Use `fc-text-primary`/`fc-text-dim`, `var(--fc-glass-border)`, focus ring from `--fc-accent-*` or `--ring`, `fc-input`-style or tokens for strength bar |
| 4 | AuthWrapper.tsx | 661 | Submit button: `from-blue-600 to-blue-700` gradient | Use `fc-btn fc-btn-primary` or Button `variant="fc-primary"` |
| 5 | [workouts/[id]/details/page.tsx](dailyfitness-app/src/app/client/workouts/[id]/details/page.tsx) | 639–641, 656–657 | Loading/error cards: `border-white/20`, `bg-white/80`, `dark:border-slate-700`, `dark:bg-slate-800/80`, `border-purple-500`, `text-slate-600` | Use `fc-glass`, `fc-card`, `fc-text-dim`; spinner border `var(--fc-accent-purple)` or `--fc-domain-workouts` |
| 6 | workouts/[id]/details/page.tsx | 437–471, 693–758, 1351–1352, 1428, 1473–1489, 1523, 1582, 1594–1610, 1644 | Block badges, cards, section title, CTA: hardcoded rgba/hex (#3B82F6, #F97316, #A855F7, #EF4444, #6366F1, #14B8A6, #22C55E, #EAB308, #fff, #1A1A1A, #6B7280) | Map to `--fc-domain-*`, `--fc-status-*`, `--fc-text-primary`, `--fc-text-dim`, `--fc-glass-soft`, `--fc-glass-border`; CTA use `fc-btn-primary` |
| 7 | workouts/[id]/details/page.tsx | 1330–1332 | Shimmer gradient: `#fff`, `#1A1A1A`, `#3B82F6` | Use `var(--fc-text-primary)` and `var(--fc-accent-indigo)` or `--primary` |
| 8 | [workouts/[id]/details/page.tsx](dailyfitness-app/src/app/client/workouts/[id]/details/page.tsx) | 1295–1318 (fixed CTA) | "Initialize Session" button: `background: "#FFFFFF"`, `color: "#000000"`, `boxShadow` inline | Replace with `<Button variant="fc-primary">` and token-based classes; keep safe-area bottom offset |
| 9 | [GlassCard.tsx](dailyfitness-app/src/components/ui/GlassCard.tsx) | 31–46, 54–61 | Elevation shadows and base style: `rgba(0,0,0,...)`, `rgba(28,28,30,0.80)`, `rgba(255,255,255,0.08)` | Use `var(--fc-shadow-card)` and `var(--fc-glass-base)` / `var(--fc-glass-border)` (or add elevation tokens to ui-system) |
| 10 | [ProtectedRoute.tsx](dailyfitness-app/src/components/ProtectedRoute.tsx) | 50–51 | Loading: `bg-slate-100`, `text-slate-500` | Use `fc-app-bg` and `fc-text-dim`; add minimal branded wrapper |

Additional (not in top 10): [AuthLayout.tsx](dailyfitness-app/src/components/server/AuthLayout.tsx) — full layout uses `from-slate-50`, `from-blue-600`, `text-blue-100`, etc. (auth-only; align to tokens only if touching auth in PR3). [globals.css](dailyfitness-app/src/app/globals.css) 199–203 — tab active state uses hardcoded `#667EEA`, `#764BA2`; should use `--fc-accent-indigo` / `--fc-accent-violet` or domain tokens. [Coach menu](dailyfitness-app/src/app/coach/menu/page.tsx) — menu item `color: "bg-blue-100 text-blue-600"` etc.; use `--fc-domain-*` or icon-tile classes.

---

## 2) Visual consistency audit (component-level)

**Buttons**

- **Consistent:** Many screens use `fc-btn fc-btn-primary`, `fc-btn-secondary`, `fc-btn-ghost`; Button component has `variant="fc-primary"` etc.
- **Drift:** Auth submit uses raw gradient class. Workout details fixed CTA uses inline styles (white/black). Sessions page has `fc-btn bg-red-100 text-red-700`. Profile has `rounded-2xl` without fc-btn.
- **Standardize:** One primary CTA per screen with `fc-btn-primary` or `variant="fc-primary"`; destructive use `fc-btn-destructive`; replace inline CTA on details page with Button.

**Inputs / form fields**

- **Consistent:** shadcn Input/Select/Label used across app; some forms use `fc-input` in ui-system.
- **Drift:** Auth page uses `border-slate-200 focus:border-blue-500 focus:ring-blue-500`, `text-slate-700`, `text-slate-500` — not fc-* or design tokens. ui-system `.fc-input` uses `rgba(0,0,0,0.3)` (dark-oriented); no light-mode variant.
- **Standardize:** Auth inputs: use `fc-input` or tokens (`--fc-glass-border`, `--fc-text-primary`, focus ring from theme). Ensure fc-input in ui-system works in light mode (or add light variant).

**Cards**

- **Consistent:** GlassCard used widely (client dashboard, workouts, progress, coach menu); `fc-glass fc-card` often composed with GlassCard.
- **Drift:** GlassCard uses its own elevation rgba shadows and base background/border (not `--fc-glass-base`/`--fc-glass-border`). Card (shadcn) used in workout start and elsewhere; mix of both is OK if hierarchy is clear.
- **Standardize:** Prefer GlassCard + fc-glass/fc-card for content cards; use design tokens inside GlassCard for background/border in one pass so glass tone matches nav/header.

**BottomNav**

- **Consistent:** Uses `var(--fc-glass-border)`, `fc-glass`, `fc-card`, domain/text tokens for active state; icons and labels use fc-text-workouts, fc-text-habits, etc.
- **Drift:** Active state is exact-path only (no segment match for deep routes). Heavy duplication (per-tab active styling, dots, sparkles, glows) — same visual outcome could use one active class + single indicator.
- **Standardize:** Fix active state to segment-based (already in main plan). Optionally refactor to one active style + one indicator element; no visual change.

**Toasts and alerts**

- **Consistent:** Toast component uses `border`, `bg-background`, `text-foreground`; success/warning use `border-green-200 bg-green-50 text-green-800` and `border-yellow-200 bg-yellow-50 text-yellow-800`.
- **Drift:** Toast success/warning are light-only (green/yellow); in dark mode they may not match fc-status-* or glass. No use of `fc-toast` from ui-system.
- **Standardize:** Toast variants could use `--fc-status-success`, `--fc-status-warning` with glass-friendly contrast; or keep current but ensure dark mode uses theme tokens so contrast holds.

---

## 3) Contrast & readability (dark glass)

**Risk zones**

- **fc-text-subtle** (rgba 0.45 on primary): On dark glass (`--fc-glass-soft` dark = 0.04), subtle text can be weak in sunlight. **Fix by token:** Slightly increase opacity (e.g. 0.55) or use `--fc-text-dim` for body secondary instead of subtle where readability matters.
- **fc-text-dim** (dark: #a0a6b0): On glass-soft dark, may be borderline for small type. **Fix:** Ensure helper text and captions use at least `--fc-text-dim`; avoid lighter. Optionally nudge dark `--fc-text-dim` toward a higher contrast gray (candidate adjustment).
- **Pills / chips** (fc-pill-glass): Background `rgba(255,255,255,0.06)` + border on dark can make label low contrast. **Fix:** Use `--fc-text-primary` or domain color for pill text; avoid `--fc-text-subtle` on pills.
- **BottomNav inactive:** `fc-text-subtle` for inactive tabs. **Fix:** Prefer `--fc-text-dim` for inactive so active remains unmistakable without making inactive too faint.
- **Toast description:** `opacity-90` on description. **Fix:** Ensure description uses `--fc-text-primary` or `--fc-text-dim` and avoid layering opacity if it drops below ~4.5:1.

**WCAG / mobile**

- Primary text on glass cards: Use `--fc-text-primary` on `--fc-glass-base`; in dark mode contrast is generally OK. **Acceptance:** Primary text readable on glass in mobile sunlight (practical check).
- Muted text: Keep `--fc-text-dim` for secondary; avoid using `--fc-text-subtle` for long copy. **Acceptance:** Muted text still readable (not too faint).
- Active tab: Segment-based active + same styling as today. **Acceptance:** Active tab unmistakable on deep routes.
- Primary CTA: Use `fc-btn-primary` (cyan) or primary; avoid white-on-white or low-contrast custom buttons. **Acceptance:** Primary CTA always stands out without neon.
- AnimatedBackground: See section 5. **Acceptance:** Background motion does not reduce legibility.

**Fix-by-token recommendations**

- **--fc-text-subtle (dark):** Candidate: increase from 0.45 to 0.55 for better legibility on glass; or reserve for non-essential decoration only.
- **--fc-glass-soft (dark):** Currently 0.04; if cards feel too transparent and text washes out, consider 0.06–0.08 for card surfaces only (e.g. new class) so nav stays lighter.
- **--fc-glass-border (dark):** Slightly stronger border (e.g. 0.12) can help card edges and inputs; already have `--fc-glass-border-strong` — use consistently for inputs/focus.

---

## 4) Hierarchy & density (mobile SaaS)

**Screens that feel dense or flat**

- **Client dashboard:** Many sections (hero, weekly snapshot, progress snapshot, quick actions); spacing is already sectioned. Small improvement: ensure section titles use a consistent scale (e.g. one level below page title) and 12–16px rhythm between blocks.
- **Client workouts list:** Tabs + hero + lists; OK. Ensure empty state has breathing room (padding) and one clear CTA.
- **Workout details:** Blocks are compact; "Workout Protocol" section title uses inline 12px monospace — consistent with tokens. Fixed CTA at bottom: ensure content has enough padding-bottom so hierarchy is clear (one primary action).
- **Coach menu:** Many cards in grid; card style is uniform. Optional: slightly larger title vs description (already present); no layout change needed for this plan.

**Recommendations (tokens / small tweaks only)**

- **Typography:** Use `--font-h1`/`--font-h2`/`--font-h3` and `--font-caption`/`--font-label` from globals for page title, section title, label so scale is consistent. No new classes required if existing components already use them where appropriate.
- **Spacing:** Prefer 12–16px (e.g. `gap-4`/`gap-6`, `p-4`/`p-6`) between sections and inside cards; already common. No layout redesign.
- **CTA emphasis:** One primary CTA per screen (e.g. dashboard = Start Workout; workout details = Initialize Session; complete = Back to Home). Others secondary/outline. Enforce via component usage, not new tokens.

---

## 5) AnimatedBackground harmony

**Where colors are defined**

- [AnimatedBackground.tsx](dailyfitness-app/src/components/ui/AnimatedBackground.tsx) reads colors from `getTimeBasedGradientColors()` (ThemeContext).
- [ThemeContext](dailyfitness-app/src/contexts/ThemeContext.tsx) calls [getTimeBasedGradient(isDark)](dailyfitness-app/src/lib/colors.ts).
- [colors.ts](dailyfitness-app/src/lib/colors.ts): `timeBasedGradients` — morning/afternoon/evening/night, each with `light` and `dark` arrays of hex colors (no CSS variables).

**Current palette (colors.ts)**

- **Light:** Morning blues + orange/cream; afternoon blue/teal/cream; evening blue/gold; night purple/indigo.
- **Dark:** Dark teals/blues; browns (evening); deep purples (night).

**Clash / wash-out risk**

- Evening light uses strong gold (`#FBBF24`, `#FDE68A`); on top of that, white glass can look washed or warm. Dark evening uses browns that are close to glass-soft dark — generally fine.
- Night purple/indigo can align well with fc-accent-purple/indigo; no clash.
- AnimatedBackground is behind content; with fc-muted-overlay and grain/vignette, legibility is generally OK. Main risk is very bright light gradients (afternoon/evening) making glass feel flat if opacity is low.

**Recommendation: palette tuning (colors only)**

- Keep animation mechanics and time-based logic; only adjust hex values (or move to tokens).
- Propose 3–5 flow colors aligned to accent (indigo/purple/blue/teal family) so background and UI accents feel one system:
  - **Dark:** e.g. `#0f172a`, `#1e293b`, `#334155`, `#0c4a6e`, `#1e3a5f` (slate/blue) for evening; keep night purple; adjust morning/afternoon to same hue family.
  - **Light:** Softer versions of same (e.g. `#e0e7ff`, `#c7d2fe`, `#a5b4fc`, `#818cf8`, `#6366f1`) to avoid harsh yellow and keep premium feel.
- **Tokenize:** Add `--fc-bg-flow-1` … `--fc-bg-flow-5` in ui-system (light/dark) and have `getTimeBasedGradient` return those var() values or map hex to these tokens; then AnimatedBackground can use tokens. Enables future tuning in one place.

**Acceptance**

- Background motion does not reduce legibility (already true with overlay/grain; keep as-is).
- Flow colors feel aligned with domain/accent palette (indigo/purple/blue/teal) without introducing new hue families.

---

## A) What already looks premium (KEEP)

- Glass system (`fc-glass`, `fc-glass-soft`, `fc-card`) and blur/shadow tokens.
- Domain and status tokens (workouts, meals, habits, success, warning, error) used across nav and content.
- AnimatedBackground + muted overlay + grain + vignette (structure and motion).
- Typography scale in globals; Geist fonts.
- GlassCard elevation and press/hover behavior (only align to tokens, don’t remove).
- BottomNav structure (fixed, portal, icon + label) and domain-colored active states once segment-based.
- Client dashboard hero, weekly ring, and quick-action grid layout.
- Workout details block cards and block-type badges (only replace hardcoded colors with tokens).

---

## B) Visual inconsistencies hurting SaaS feel (FIX)

- Auth page: Slate/blue everywhere instead of fc-*; submit button and segment control not using design system.
- Workout details: Large block of inline colors and fixed CTA not using Button/tokens.
- Loading (ProtectedRoute): Plain "Loading..." with slate background; not branded.
- Toast: success/warning use Tailwind green/yellow; not aligned with fc-status-* or glass in dark mode.
- GlassCard: Custom rgba for background/border/shadow instead of fc tokens.
- globals.css: Tab active gradient hardcoded (#667EEA, #764BA2).
- Coach menu: Item icon backgrounds use Tailwind (e.g. bg-blue-100) instead of domain/icon-tile tokens.

---

## C) Token violations list (file path + what to change)

(Same as "Top 10 token violations" above; summarized here for the required format.)

1. **AuthWrapper.tsx** — Segmented control, error/success blocks, labels, inputs, hints, submit button: replace slate/blue/red/green with `--fc-*` and `fc-btn-primary`, `fc-input`-style.
2. **workouts/[id]/details/page.tsx** — Loading/error cards, block badges, exercise cards, section title color, shimmer gradient, fixed "Initialize Session" CTA: use `fc-glass`, `--fc-domain-*`, `--fc-status-*`, `--fc-text-primary`/`--fc-text-dim`, Button `variant="fc-primary"`.
3. **GlassCard.tsx** — Elevation and base style: use `var(--fc-shadow-card)`, `var(--fc-glass-base)`, `var(--fc-glass-border)` (or new elevation tokens).
4. **ProtectedRoute.tsx** — Loading wrapper: `fc-app-bg`, `fc-text-dim`, minimal branded loader.
5. **globals.css** (tab active) — Replace #667EEA, #764BA2 with `var(--fc-accent-indigo)` / `var(--fc-accent-violet)`.
6. **Coach menu page** — Menu item icon colors: use `fc-icon-*` or `--fc-domain-*` instead of bg-blue-100 etc.
7. **AuthLayout.tsx** — If touching auth layout: replace gradient and text colors with tokens or fc-* (optional in PR3).
8. **toast.tsx** — success/warning variants: use `--fc-status-success`, `--fc-status-warning` and ensure dark mode contrast.

---

## D) Contrast risk checklist (what + how to fix via tokens)

| What | Risk | Fix via tokens |
|------|------|----------------|
| fc-text-subtle on dark glass | Low contrast in sun | Use for decoration only; or increase opacity to 0.55 in dark |
| fc-text-dim on nav (inactive) | Could be too faint | Keep; ensure active uses primary/domain so contrast ratio is clear |
| Helper text / captions | Too light if subtle | Use --fc-text-dim for all helper text |
| Pills / chips | Low contrast on glass | Pill text: --fc-text-primary or domain color |
| Toast description opacity | May fail AA in dark | Use --fc-text-primary or dim; avoid extra opacity |
| Primary CTA | Must stand out | Always fc-btn-primary or variant fc-primary; no white-on-glass without border |

**Acceptance checks (must include)**

- Primary text readable on glass cards in mobile sunlight (practical check).
- Muted text still readable (not too faint).
- Active tab unmistakable on deep routes (segment-based active state).
- Primary CTA always stands out without neon.
- Background motion does not reduce legibility.

---

## E) AnimatedBackground harmony notes + proposed flow palette (colors only)

**Current:** [lib/colors.ts](dailyfitness-app/src/lib/colors.ts) `timeBasedGradients` — hex arrays per time-of-day; no tokens. Evening light uses strong gold; dark uses browns/teals/purples.

**Proposed flow palette (align to indigo/purple/blue/teal):**

- **Dark:**  
  - `--fc-bg-flow-1` … `--fc-bg-flow-5`: e.g. #0f172a, #1e293b, #1e3a5f, #0c4a6e, #312e81 (slate/blue/indigo).
  - Map morning/afternoon/evening/night dark arrays to these or similar so all times stay in same hue family.
- **Light:**  
  - Softer: e.g. #e0e7ff, #c7d2fe, #a5b4fc, #818cf8, #6366f1 (indigo tint) or add one teal (#ccfbf1) for afternoon.
  - Reduce or replace strong yellow in evening light.

**Steps:** (1) Add `--fc-bg-flow-1` … `--fc-bg-flow-5` in ui-system.css `:root` and `.dark`. (2) In colors.ts, either return `var(--fc-bg-flow-1)` etc. from getTimeBasedGradient or keep hex but document mapping to tokens for future. (3) No animation or structure change in AnimatedBackground.

---

## F) Minimal UI alignment recommendations (strictly PR1–PR4 touched areas)

- **PR1 (Navigation & layout):** No visual token changes required; only active state and layout visibility. Optional: ensure BottomNav inactive uses `--fc-text-dim` (already may).
- **PR2 (EmptyState, ProtectedRoute, details CTA):**  
  - ProtectedRoute: use `fc-app-bg`, `fc-text-dim`, small logo + spinner (tokens only).  
  - Workout details: replace fixed CTA with `<Button variant="fc-primary">` and token-based spacing; no new tokens.  
  - EmptyState: use `fc-text-primary`, `fc-text-dim`, `fc-btn-primary` for CTA.
- **PR3 (Auth & dashboard error):**  
  - Auth: "Forgot password?" hide/disable. Submit button: add `fc-btn fc-btn-primary` or Button variant; optionally swap segment/input borders to `--fc-glass-border` and focus ring (candidate).  
  - Dashboard error: use `fc-text-dim` or `fc-text-error` and one `fc-btn-secondary` or primary for action.
- **PR4 (Complete page + copy):**  
  - Workout complete: primary CTA `fc-btn-primary`, secondary `fc-btn-secondary`; no new components.  
  - Empty state copy: keep tone; no token change unless reusing EmptyState.

**Candidate token adjustments (with acceptance)**

- **--fc-text-subtle (dark):** 0.45 → 0.55. Acceptance: small text on glass still readable in daylight.
- **--fc-glass-border (dark):** Use `--fc-glass-border-strong` for inputs/focus. Acceptance: input borders visible and consistent.
- **Tab active (globals):** Use `var(--fc-accent-indigo)` and `var(--fc-accent-violet)`. Acceptance: tab matches rest of app accent.

No full redesign; no new features; no backend changes.
