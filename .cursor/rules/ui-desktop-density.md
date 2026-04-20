# UI — Desktop Density Rules (Mobile-Is-Sacred)

**Status:** Canonical.

## PRINCIPLE

The four benchmark screens grade 9.5 on mobile. **Desktop work must not change any mobile density.**

## HARD RULES

1. **Mobile density tokens are frozen.** Do not change these CSS variables without explicit user approval:
   - `--fc-page-px: 16px`, `--fc-page-px-md: 24px`
   - `--fc-page-pt: 16px`, `--fc-page-pb: 120px`
   - `--fc-card-padding: 24px`
   - `--fc-gap-cards: 16px`, `--fc-gap-sections: 24px`
   - `--fc-list-row-min-height: 48px`, `--fc-list-row-py: 12px`, `--fc-list-row-px: 16px`
2. **Desktop improvements use `lg:` (≥1024px) and `xl:` (≥1280px) only.** Never use `md:` or a breakpoint that affects tablets, and never change a non-breakpointed class that was set by the benchmark.
3. **Centered-column model only.** The same column layout as mobile, upscaled via width + padding — not a sidebar, not a multi-pane layout, not a "desktop-first" redesign.
4. **Width variants:**
   - `max-w-lg` stays `max-w-lg` on desktop. Add `lg:px-8` breathing padding only.
   - `max-w-2xl` stays `max-w-2xl` on desktop.
   - `max-w-5xl` (coach hero/dashboard) stays `max-w-5xl`; interior grids may go from 2-up to 3-up at `xl:`.
   - `max-w-7xl` (coach data/table browse) may introduce a true table at `lg:` replacing the mobile card-list — but the card-list version must remain for `<lg` breakpoints.
5. **Type scale:**
   - `text-2xl` headings → `lg:text-3xl` is acceptable.
   - Body `text-sm` stays `text-sm` on desktop unless the benchmark does otherwise.
   - Micro (`text-[10px]`) never changes.
6. **Grids:**
   - `grid-cols-1` → `lg:grid-cols-2` is acceptable for secondary sections (highlights, metric tiles) when the content is truly parallel.
   - Never 2-up a hero card.
   - Never 3-up on anything but secondary dense tiles at `xl:`.

## REGRESSION CHECK BEFORE ANY DESKTOP CHANGE

Ask yourself:

- Does any class I added lack `lg:` or `xl:` prefix?  → If yes, STOP; that change will affect mobile.
- Does my change alter any variable in `ui-system.css`? → If yes, STOP; ask the user.
- Did I replace a benchmark-set class, rather than adding a breakpointed override? → If yes, revert and use an override.

## WHEN TO STOP AND ASK

- The screen genuinely does not fit the centered-column model at `lg:` (e.g. calendar, kanban, map).
- The mobile version would benefit from density changes that would cross breakpoints.
- A table needs to exist on mobile and desktop with different shapes.

## ANTI-PATTERNS (HARD-NO)

- Changing mobile padding as a side effect of a desktop fix.
- Introducing a sidebar layout for desktop.
- Using `md:` to opt in to "tablet" density — all uplift is `lg:` and above.
- Redesigning a mobile layout to "also work on desktop" — the mobile layout is authoritative; desktop adapts via breakpointed overrides only.
