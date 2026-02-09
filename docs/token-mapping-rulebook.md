# Token Mapping: Rulebook → App (`--fc-*` and colors.ts)

Single source mapping from FitCoach UI/UX Rulebook (`ui_tokens/fitcoach-ui-ux-rulebook.md`) to app tokens in `src/styles/ui-system.css` and `src/lib/colors.ts`.  
Use this when aligning or auditing design tokens.

---

## 1.1 Colors

### Core background & text

| Rulebook (Dark) | App variable (`:root` = light, `.dark` = dark) | Notes |
|-----------------|--------------------------------------------------|-------|
| `bg.deep` `#0b0f14` | `--fc-bg-deep` (in `.dark`) | Basalt base background |
| `bg.basalt` `#121824` | `--fc-bg-basalt` (in `.dark`) | Basalt surface |
| `bg.surface` `rgba(18,23,33,0.7)` | `--fc-glass-base` (in `.dark`) | Glass surface |
| `text.primary` `#ffffff` | `--fc-text-primary` (in `.dark`) | |
| `text.dim` `#a0a6b0` | `--fc-text-dim` (in `.dark`) | |
| `text.subtle` `rgba(255,255,255,0.45)` | `--fc-text-subtle` (in `.dark`) | Rulebook: 0.45 |

| Rulebook (Light) | App variable (`:root`) | Notes |
|------------------|-------------------------|-------|
| `bg.deep.light` `#f6f2ec` | `--fc-bg-deep` | Warm off-white base |
| `bg.basalt.light` `#e8e3db` | `--fc-bg-basalt` | Warm basalt surface |
| `bg.surface.light` `rgba(255,255,255,0.7)` | `--fc-glass-base` | Rulebook: 0.7 |
| `text.primary.light` `#1f2933` | `--fc-text-primary` | |
| `text.dim.light` `#59636e` | `--fc-text-dim` | |
| `text.subtle.light` `rgba(31,41,51,0.45)` | `--fc-text-subtle` | Rulebook: 0.45 |

### Glass & borders

| Rulebook | App variable | Dark value | Light value |
|----------|---------------|------------|-------------|
| `glass.base` | `--fc-glass-base` | `rgba(18,23,33,0.7)` | `rgba(255,255,255,0.7)` |
| `glass.soft` | `--fc-glass-soft` | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.5)` |
| `glass.border` | `--fc-glass-border` | `rgba(255,255,255,0.08)` | `rgba(82,74,66,0.12)` |
| `glass.borderStrong` | `--fc-glass-border-strong` | `rgba(255,255,255,0.12)` | `rgba(82,74,66,0.18)` |
| `glass.highlight` | `--fc-glass-highlight` | `rgba(255,255,255,0.10)` | `rgba(82,74,66,0.12)` |

### Accents (global)

| Rulebook | App variable | Dark | Light |
|----------|---------------|------|-------|
| `accent.cyan` | `--fc-accent-cyan` | `#00f2ff` | `#0891b2` |
| `accent.purple` | `--fc-accent-purple` | `#8e94ff` | `#7c3aed` |
| `accent.indigo` | `--fc-accent-indigo` | `#4f46e5` | `#4338ca` |
| `accent.violet` | `--fc-accent-violet` | `#7c3aed` | `#6d28d9` |

### Status / feedback

| Rulebook | App variable | Dark | Light |
|----------|---------------|------|-------|
| `status.success` | `--fc-status-success` | `#10b981` | `#059669` |
| `status.warning` | `--fc-status-warning` | `#fbbf24` | `#d97706` |
| `status.error` | `--fc-status-error` | `#ef4444` | `#dc2626` |

### Domain system (strict)

| Rulebook | App variable | Dark | Light |
|----------|---------------|------|-------|
| `domain.workouts` | `--fc-domain-workouts` | `#38bdf8` | `#0284c7` |
| `domain.meals` | `--fc-domain-meals` | `#4ade80` | `#16a34a` |
| `domain.habits` | `--fc-domain-habits` | `#fbbf24` | `#ca8a04` |
| `domain.challenges` | `--fc-domain-challenges` | `#f43f5e` | `#be123c` |
| `domain.neutral` | `--fc-domain-neutral` | `#64748b` | `#475569` |

---

## 1.2 Typography

| Rulebook | App usage | Notes |
|----------|-----------|-------|
| `font.sans` `Inter` | `--font-sans` → Inter (globals + layout) | Primary UI font |
| `font.mono` `JetBrains Mono` | `--font-mono` → JetBrains Mono (globals + layout) | Micro labels, numbers |
| `type.hero` 48px | `--font-hero` 3rem (48px) in globals.css | |
| `type.h1` 32px | `--font-h1` 2rem (32px) | |
| `type.h2` 24px | `--font-h2` 1.5rem (24px) | |
| `type.h3` 20px | `--font-h3` 1.25rem (20px) | |
| `type.body` 16px | `--font-body` 1rem (16px) | |
| `type.caption` 14px | `--font-caption` 0.875rem (14px) | |
| `type.label` 12px | `--font-label` / `--font-small` | Rulebook 12px → 0.75rem |
| `type.micro` 10px | `.fc-micro` 10px in ui-system.css | |
| `weight.bold` 700, `weight.semibold` 600, etc. | `--font-weight-*` in globals.css | |

---

## 1.3 Spacing (8px-based, 4px micro)

| Rulebook | Value (px) | App usage |
|----------|------------|-----------|
| `space.1`–`space.10` | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 | Density vars: `--fc-page-px`, `--fc-gap-sections`, `--fc-card-padding`, etc. |

No direct `--fc-space-1` … `--fc-space-10` in ui-system; spacing is applied via page/card/gap/section/list-row tokens.

---

## 1.4 Radius

| Rulebook | App variable | Value |
|----------|---------------|-------|
| `radius.sm` | `--fc-radius-sm` | 12px |
| `radius.md` | `--fc-radius-md` | 16px |
| `radius.lg` | `--fc-radius-lg` | 20px |
| `radius.xl` | `--fc-radius-xl` | 24px |
| `radius.2xl` | `--fc-radius-2xl` | 32px |
| `radius.3xl` | `--fc-radius-3xl` | 40px |

---

## 1.5 Blur

| Rulebook | App variable | Value |
|----------|---------------|-------|
| `blur.card` | `--fc-blur-card` | 16px |
| `blur.header` | `--fc-blur-header` | 20px |
| `blur.nav` | `--fc-blur-nav` | 24px |
| `blur.aurora` | `--fc-blur-aurora` | 80px (rulebook: 80–100px baseline) |

---

## 1.6 Shadows & glow

| Rulebook | App variable | Dark | Light |
|----------|---------------|------|-------|
| `shadow.card` | `--fc-shadow-card` | `0 12px 32px -12px rgba(0,0,0,0.55)` | `0 12px 24px -12px rgba(31,41,51,0.22)` |
| `shadow.nav` | `--fc-shadow-nav` | `0 20px 44px rgba(0,0,0,0.45)` | `0 16px 32px rgba(31,41,51,0.18)` |
| `shadow.glow.cyan` | `--fc-glow-cyan` | `0 0 22px rgba(6,182,212,0.28)` | `0 0 18px rgba(8,145,178,0.22)` |
| `shadow.glow.rose` | `--fc-glow-rose` | `0 16px 42px rgba(244,63,94,0.45)` | `0 12px 28px rgba(190,18,60,0.22)` |

---

## 1.7 Background layers (aurora, grain, vignette)

- **Aurora blobs:** Cyan / purple / indigo; blur 80–100px; opacity 0.25–0.45; slow drift.  
  **colors.ts:** `timeBasedGradients` dark/light arrays use rulebook-aligned hues (cyan `#00f2ff` / `#0891b2`, purple `#8e94ff` / `#7c3aed`, indigo `#4f46e5` / `#4338ca`) and basalt/deep (`#0b0f14`, `#121824` for dark; `#f6f2ec`, `#e8e3db` for light).  
  **ui-system.css:** `--fc-blur-aurora` 80px; `.fc-aurora-layer`, `.fc-aurora-blob`, `.fc-grain-layer`, `.fc-vignette-layer`; vignette uses `--fc-vignette-edge`.

- **Grain:** Opacity 0.03–0.05 (dark), 0.02–0.04 (light). `.fc-grain-layer` opacity in ui-system.

- **Vignette:** Radial; transparent center → soft basalt edges. `.fc-vignette-layer` uses `--fc-vignette-edge`.

---

## colors.ts (AnimatedBackground only)

Only **color values** used by AnimatedBackground are aligned to the rulebook; no logic/structure changes.

- **Dark gradients:** Base from `bg.deep` / `bg.basalt` (#0b0f14, #121824); accent hues from cyan/purple/indigo (Section 1.1 + 1.7).
- **Light gradients:** Base from `bg.deep.light` / `bg.basalt.light` (#f6f2ec, #e8e3db); same accent hues at lower saturation/opacity where specified.

All other exports in `colors.ts` (semanticColors, rarityColors, backgroundColors) are unchanged by this mapping.

---

## Phase 2 layout checklist (mockup → app)

Use mockup as **layout/hierarchy reference only**; apply token classes; no new data/features.

| Screen | Mockup | App component(s) | Status |
|--------|--------|-------------------|--------|
| Client Workouts list | `client/client workouts.txt` | `EnhancedClientWorkouts.tsx` | Done: Hero → Weekly Progress (standalone) → This Week; token classes applied |
| Client Workout details | `client/client workout detail page.txt` | Workout details page | Token classes applied (prior pass) |
| Start workout | `client/live workout straight set.txt` | Start workout page | Token classes applied (prior pass) |
| Complete workout | `client/client workout completion summary.txt` | Complete workout page | Token classes applied (prior pass) |
| Client Dashboard (workout block) | — | `src/app/client/page.tsx` | Token classes applied (prior pass) |
| Remaining client screens | `client/*.txt` | See ui-inventory.md | To do: progress, nutrition, goals, habits, etc. |
| Coach screens | `coach/*.txt` | See ui-inventory.md | To do |
| Auth / shared | — | AuthLayout, shared components | To do |
