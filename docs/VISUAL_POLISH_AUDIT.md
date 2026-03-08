# Visual Polish Audit — Read-Only

**Standard:** Client and Coach dashboards are the quality bar. This document compares other pages to that standard and records specific gaps. **No files were modified.**

---

## THE STANDARD: What Makes the Dashboards Look Good

### 1. Client Dashboard (`src/app/client/page.tsx`)

| Pattern | Implementation |
|--------|-----------------|
| **Background** | `AnimatedBackground` wrapping entire page; FloatingParticles optional via `performanceSettings` |
| **Shell** | `ClientPageShell` with `max-w-lg px-4 pb-32 pt-6` |
| **Cards** | `ClientGlassCard` with `p-4` or `p-3`; glass morphism, rounded, subtle border |
| **Header** | Compact: h1 with `var(--fc-type-h2)` font-bold fc-text-primary; caption with `var(--fc-type-caption)` fc-text-dim; avatar 10x10 rounded-full with border |
| **Typography** | Section/card titles: text-sm font-semibold; secondary: text-xs fc-text-dim |
| **Spacing** | Sections `mb-6`; inside cards `space-y-3`; no oversized hero |
| **Loading** | Skeleton + SkeletonCard + AthleteScoreRing; animate-pulse style |
| **Error** | ClientGlassCard, p-6 text-center, fc-btn fc-btn-secondary |
| **Buttons** | fc-btn fc-btn-primary, rounded-xl, py-3; fc-btn-secondary for secondary |
| **Icons** | w-4 h-4; semantic colors (fc-text-warning, fc-text-primary, fc-text-success) |
| **Empty** | Not shown on main dashboard; elsewhere uses EmptyState with icon + title + description |

### 2. Coach Dashboard (`src/app/coach/page.tsx`)

| Pattern | Implementation |
|--------|-----------------|
| **Background** | `AnimatedBackground` + `FloatingParticles` (when performanceSettings) |
| **Shell** | `div` with `relative z-10 mx-auto max-w-5xl fc-page` (no named shell) |
| **Cards** | `fc-surface` with `rounded-xl` or `rounded-2xl`, `p-4` or `p-6`; color-mix accent for snapshot tiles |
| **Header** | Greeting + date; text-2xl font-bold fc-text-primary; text-[11px] fc-text-dim font-mono; avatar in fc-surface-elevated 10x10 |
| **Section labels** | `text-sm font-semibold uppercase tracking-widest fc-text-dim mb-4` |
| **Loading** | `fc-skeleton rounded-2xl` with fixed heights |
| **Empty** | fc-surface rounded-2xl p-8 text-center, icon (w-10 h-10), text-sm font-semibold, text-xs fc-text-dim |
| **Interactions** | Cards: hover:translate-y-[-1px]; borderLeft for alerts; fc-btn fc-btn-secondary fc-press |
| **Client rows** | fc-surface rounded-2xl p-4, avatar with color-mix accent, ChevronRight |

---

## PAGES COMPARED — Quick Rating

| Page | Matches dashboard? | Key gaps |
|------|-------------------|----------|
| /client/train | 🟢 Good | No FloatingParticles (optional); otherwise ClientPageShell, ClientGlassCard, SkeletonCard, EmptyState |
| /client/nutrition | 🟢 Good | AnimatedBackground + FloatingParticles; ClientPageShell, ClientGlassCard; header text-xl (slightly larger than dashboard h2) |
| /client/check-ins | 🟢 Good | AnimatedBackground, FloatingParticles, ClientPageShell, ClientGlassCard, SectionHeader; header text-[30px] (inconsistent size) |
| /client/progress/analytics | 🟡 Partial | Large hero header (back link + icon + "Analytics Overview"), text-2xl sm:text-4xl; fc-surface cards; hardcoded gradient (from-sky-500 to-indigo-600, from-orange-500 to-amber-600); loading = spinner + "Loading analytics..." not skeleton |
| /client/progress/personal-records | 🟡 Partial | fc-surface cards; hero PR block with text-4xl sm:text-5xl font-black; EXERCISE_ICON_CLASSES hardcoded red/blue/green/amber/purple; no ClientPageShell (custom max-w-6xl) |
| /client/progress/body-metrics | 🟢 Good | AnimatedBackground, FloatingParticles, fc-surface, proper skeleton (animate-pulse + fc-glass-highlight), back link + breadcrumb header |
| /client/workouts | 🟡 Partial | Delegates to EnhancedClientWorkouts; component uses AnimatedBackground, ClientPageShell, ClientGlassCard — layout matches but content density and card patterns vary |
| /client/profile | 🟡 Partial | AnimatedBackground, FloatingParticles, ClientPageShell, ClientGlassCard; also uses Card/CardContent/CardHeader from ui/card; mix of glass and standard Card |
| /client/me (menu) | 🟡 Partial | AnimatedBackground, ClientPageShell; header "Me" is text-3xl (larger than dashboard); avatar 16x16 with gradient (from-cyan-500 to-blue-600); uses GlassCard not ClientGlassCard |
| /coach/clients | 🟡 Partial | AnimatedBackground, FloatingParticles; GlassCard (fc-glass fc-card); header in large GlassCard with filters; loading = fc-skeleton; empty state good; filter pills use bg-white text-[fc-bg-deep] (hardcoded contrast) |
| /coach/clients/[id] | 🟡 Partial | AnimatedBackground, FloatingParticles; loading = custom skeleton (no GlassCard wrapper); content uses GlassCard; section "Quick access" uses text-sm uppercase tracking-widest; avatar 20–24 with gradient |
| /coach/clients/add | 🟡 Partial | AnimatedBackground, FloatingParticles; GlassCard + Card/CardContent; stepper UI; some text-slate-* with dark: pairs (theme vars preferred for consistency) |
| /coach/training/programs | 🟢 Good | Wrapper only; content is ProgramsDashboardContent (fc-surface, EmptyState, theme vars) |
| /coach/workouts/templates | 🟢 Good | Uses same layout pattern as programs; EmptyState, filters, fc styling |
| /coach/exercises | — | Renders OptimizedExerciseLibrary; follows coach layout (AnimatedBackground etc.); consistency depends on component |
| /coach/nutrition | — | Hub; likely links to meal-plans, foods, assignments |
| /coach/nutrition/meal-plans | 🟡 Partial | AnimatedBackground, FloatingParticles, GlassCard; loading skeleton uses bg-white/20 dark:bg-slate-700/20 (custom) |
| /coach/nutrition/meal-plans/create | — | Not read in full; typically form page |
| /coach/nutrition/foods | — | Component-driven |
| /coach/nutrition/assignments | — | Component-driven |
| /coach/gym-console | 🟡 Partial | AnimatedBackground, FloatingParticles; GlassCard; skeleton uses bg-white/10; dense in-person workflow UI |
| /coach/bulk-assignments | 🟡 Partial | AnimatedBackground; layout similar to other coach pages |
| /coach/goals | 🟡 Partial | AnimatedBackground, FloatingParticles; GlassCard; loading skeleton uses inline style backgroundColor #FFFFFF and bg-slate-200/bg-slate-700 (hardcoded); gradient icon (from-blue-600 to-purple-600) |
| /coach/profile | 🟡 Partial | Uses Card, theme vars; toggle uses after:bg-white; some hardcoded slate in toggle area |
| /coach/menu | 🟢 Good | AnimatedBackground, FloatingParticles, GlassCard, section titles, link grid; consistent with coach hub pattern |

---

## Detailed Findings for 🔴 and 🟡 Pages

### /client/progress/analytics — 🟡

- **BACKGROUND:** AnimatedBackground + FloatingParticles ✓  
- **SHELL:** Custom `max-w-5xl` div, not ClientPageShell (progress section uses its own pattern).  
- **HEADER:** Large hero: back link + 12x12 icon box + "Performance" label (uppercase tracking) + "Analytics Overview" (text-2xl sm:text-4xl). More "landing page" than dashboard.  
- **CARDS:** fc-surface rounded-2xl border; also fc-glass-soft for small tiles.  
- **TYPOGRAPHY:** Section headings use "text-sm font-semibold uppercase tracking-wider" (dashboard uses similar for coach; client dashboard avoids uppercase).  
- **COLOR:** Hardcoded gradients: workout frequency bars `from-sky-500 to-indigo-600`; Strength icon box `from-orange-500 to-amber-600` + shadow.  
- **LOADING:** Single card with spinner + "Loading analytics..." instead of skeleton blocks.  
- **INTERACTIVE:** Time range pills and "All Exercises" button match fc-btn style.

### /client/progress/personal-records — 🟡

- **BACKGROUND:** AnimatedBackground + FloatingParticles ✓  
- **SHELL:** Custom `max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-10` (no ClientPageShell).  
- **HEADER:** Back link + icon box (fc-aurora/accent) + "Personal Records" (text-2xl) + subtitle.  
- **CARDS:** fc-surface rounded-2xl; hero PR block with large number (text-4xl sm:text-5xl font-black).  
- **COLOR:** EXERCISE_ICON_CLASSES: bg-red-500/10, bg-blue-500/10, bg-amber-500/10, bg-purple-500/10 (hardcoded; not theme vars).  
- **LOADING:** Proper skeleton (animate-pulse, fc-glass-highlight).  
- **SPACING:** space-y-6; p-6 sm:p-10 for main card — consistent.

### /client/me (menu) — 🟡

- **BACKGROUND:** AnimatedBackground ✓ (FloatingParticles not present in snippet).  
- **SHELL:** ClientPageShell ✓  
- **HEADER:** "Me" is text-3xl font-bold (dashboard uses var(--fc-type-h2)). Avatar 16x16 with `bg-gradient-to-br from-cyan-500 to-blue-600`.  
- **CARDS:** GlassCard (from ui), not ClientGlassCard; nav cards in grid.  
- **TYPOGRAPHY:** Larger title than dashboard; rest is consistent.

### /client/profile — 🟡

- **BACKGROUND:** AnimatedBackground + FloatingParticles ✓  
- **SHELL:** ClientPageShell ✓  
- **CARDS:** Mix of ClientGlassCard and Card/CardContent/CardHeader (shadcn).  
- **STYLING:** Toggle uses `after:bg-white`; some sections feel form-heavy; overall theme-aware.

### /coach/clients — 🟡

- **BACKGROUND:** AnimatedBackground + FloatingParticles ✓  
- **CARDS:** GlassCard with fc-glass fc-card; grid/list of client cards.  
- **HEADER:** Large header block with search, status pills, sort, view toggle. Filter pills: selected state `bg-white text-[color:var(--fc-bg-deep)]` (hardcoded white).  
- **LOADING:** fc-skeleton rounded-2xl with height.  
- **EMPTY:** GlassCard p-12, icon w-24 h-24, h3 text-2xl, CTA — good.

### /coach/clients/[id] — 🟡

- **BACKGROUND:** AnimatedBackground + FloatingParticles ✓  
- **LOADING:** Custom skeleton (avatar + 2 bars + grid of 4 + content block) with fc-glass-highlight ✓  
- **CONTENT:** GlassCard for main client card; avatar 20–24 with getSemanticColor("trust").gradient.  
- **SECTION:** "Quick access" uses text-sm font-semibold uppercase tracking-widest fc-text-dim (matches coach dashboard section style).  
- **NAV CARDS:** GlassCard with hover:scale-[1.02]; icon box with getSemanticColor("trust").primary.

### /coach/clients/add — 🟡

- **BACKGROUND:** AnimatedBackground + FloatingParticles ✓  
- **CARDS:** GlassCard + Card/CardContent for steps; FloatingInput, ProgressIndicator.  
- **COLOR:** text-slate-* with dark: pairs (acceptable; could align to fc-* for consistency).

### /coach/nutrition/meal-plans — 🟡

- **BACKGROUND:** AnimatedBackground + FloatingParticles ✓  
- **LOADING:** Skeleton with h-8/h-64 and `bg-white/20 dark:bg-slate-700/20` (not fc-glass-highlight).  
- **CARDS:** GlassCard; MealPlanCard; layout consistent with other coach pages.

### /coach/goals — 🟡

- **BACKGROUND:** AnimatedBackground + FloatingParticles ✓  
- **LOADING:** Inline style `backgroundColor: '#FFFFFF'` and Tailwind `bg-slate-200` / `bg-slate-700` (not fc vars).  
- **CARDS:** GlassCard; one card with `bg-gradient-to-br from-blue-600 to-purple-600` for icon.  
- **SPACING:** min-h-screen pb-32; px-6 pt-10; space-y-6.

### /coach/gym-console — 🟡

- **BACKGROUND:** AnimatedBackground + FloatingParticles ✓  
- **SKELETON:** Uses bg-white/10 for placeholders.  
- **DENSE UI:** Built for in-person flow; many controls; styling generally fc/glass.

---

## Cross-Cutting Patterns

### 1. Most common gaps

- **Inconsistent page title size:** Dashboard uses var(--fc-type-h2) or text-2xl; many pages use text-3xl, text-[30px], or text-2xl sm:text-4xl for the main heading.  
- **Missing or different loading treatment:** Several pages use a single spinner + "Loading..." instead of skeleton blocks (e.g. analytics).  
- **Hardcoded gradients and colors:** Progress analytics (sky/indigo, orange/amber), personal records (red/blue/amber/purple icon classes), coach goals (blue/purple gradient, #FFFFFF, slate), meal-plans (white/20, slate-700/20).  
- **Shell inconsistency:** Client dashboard uses ClientPageShell; progress sub-pages often use a custom max-w-5xl/max-w-6xl div with similar padding. Coach dashboard uses a plain max-w-5xl div; coach child pages mix GlassCard and fc-surface.  
- **Card component mix:** Client: ClientGlassCard vs GlassCard (me, profile). Coach: GlassCard vs fc-surface in dashboard.

### 2. Easiest wins

- **Standardize loading:** Replace "Loading..." spinner blocks with skeleton layouts (animate-pulse + fc-glass-highlight) on analytics and any other spinner-only pages.  
- **Replace hardcoded loading colors:** In coach goals (and similar), replace #FFFFFF and bg-slate-* with fc-surface / fc-glass-highlight.  
- **Unify page title size:** Use one of var(--fc-type-h2) or text-2xl font-bold for all main page titles.  
- **Use theme for gradients:** Replace from-sky-500/to-indigo-600 and from-orange-500/to-amber-600 with color-mix or CSS vars (e.g. var(--fc-domain-workouts), var(--fc-accent)).

### 3. Pages that need full restyle

- **None** in the list are far enough off to call "full restyle." The furthest are analytics (hero + gradients) and coach goals (loading + gradient icon); both can be brought in line with targeted changes.

### 4. Pages already good

- **Client:** train, nutrition, check-ins, body-metrics.  
- **Coach:** training/programs (wrapper), workouts/templates, menu.  
- These already use AnimatedBackground, the right shell or layout, glass/fc cards, and consistent spacing.

### 5. Recommended fix approach

- **Option A (shared layout):** Create shared layout components (e.g. ClientProgressLayout, CoachSubpageLayout) that enforce: AnimatedBackground + FloatingParticles, shell (max-width + padding + pb-32), standard back link + breadcrumb + title (single size), and optional skeleton slot. Reduces drift but requires refactoring each page into the layout.  
- **Option B (per-page):** Fix each page individually: align title size, replace spinner with skeleton, swap hardcoded colors/gradients for theme vars, and standardize on ClientGlassCard or fc-surface where it makes sense.  
- **Option C (priority batch):** Fix the most-used and most visible first: client progress (analytics, personal-records), client me, coach clients list and client hub, coach goals. Then batch the rest (nutrition, gym-console, profile, etc.) using the same checklist.

**Recommendation:** Start with **Option C** using the **Option B** checklist (title, loading, colors, card choice). Add **Option A** later if many more pages are added or if drift continues.

---

## Summary Table: Background & Shell

| Page | AnimatedBackground | FloatingParticles | Shell / wrapper |
|------|--------------------|-------------------|-----------------|
| Client dashboard | ✓ | optional | ClientPageShell max-w-lg |
| Coach dashboard | ✓ | ✓ | div max-w-5xl fc-page |
| client/train | ✓ | no | ClientPageShell |
| client/nutrition | ✓ | ✓ | ClientPageShell |
| client/check-ins | ✓ | ✓ | ClientPageShell max-w-4xl |
| client/progress/analytics | ✓ | ✓ | div max-w-5xl |
| client/progress/personal-records | ✓ | ✓ | div max-w-6xl |
| client/progress/body-metrics | ✓ | ✓ | div max-w-5xl |
| client/workouts | (in EnhancedClientWorkouts) | ✓ | ClientPageShell |
| client/profile | ✓ | ✓ | ClientPageShell |
| client/me | ✓ | — | ClientPageShell |
| coach/clients | ✓ | ✓ | custom header + main |
| coach/clients/[id] | ✓ | ✓ | div fc-page |
| coach/clients/add | ✓ | ✓ | (stepper layout) |
| coach/training/programs | ✓ | ✓ | wrapper + ProgramsDashboardContent |
| coach/workouts/templates | ✓ | ✓ | (component-driven) |
| coach/goals | ✓ | ✓ | min-h-screen pb-32 |
| coach/menu | ✓ | ✓ | (menu grid) |

---

*End of audit. No files were modified.*
