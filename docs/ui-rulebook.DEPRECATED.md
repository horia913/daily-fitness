# DEPRECATED 2026-04-16

> **This document is no longer authoritative.** It was built around the mockup-driven UI workflow that has been retired.
>
> The new source of truth for UI work is:
>
> - [`dailyfitness-app/docs/ui/95-STANDARD.md`](./ui/95-STANDARD.md) — the 9.5 Standard specification (extracted from the four benchmark screens)
> - [`dailyfitness-app/.cursor/rules/ui-benchmark-standard.md`](../.cursor/rules/ui-benchmark-standard.md) — the benchmark-fidelity cursor rule
> - [`dailyfitness-app/docs/ui/UI-UPLIFT-WORKFLOW.md`](./ui/UI-UPLIFT-WORKFLOW.md) — the current per-screen workflow
>
> **Specifically deprecated content below:** references to `ui_tokens/` as authoritative (that folder is now deprecated, see [`dailyfitness-app/ui_tokens/DEPRECATED.md`](../ui_tokens/DEPRECATED.md)), the "UX archetypes" classification system, and the "mockup is the source of truth" workflow.
>
> Content preserved for historical reference only. **Do not apply any of the rules below to new work.**

---

# UI Rulebook (System + Archetypes)

This document extends `ui_tokens/fitcoach-ui-ux-rulebook.md` with UX archetypes and workflow rules.

Authoritative sources:
- `ui_tokens/fitcoach-ui-ux-rulebook.md`
- `docs/ux-archetypes.md`
- `ui_tokens/override_hotspots.md`

---

## System Rules (Non‑Negotiable)

- No business logic, API, or data flow changes.
- One screen at a time; stop for user approval.
- Dark and Light updated in parallel with identical layout.
- No new UI components beyond the defined system.
- No mockup generation beyond provided references.

---

## UX Archetypes (Required)

Every screen must map to exactly one archetype.  
Follow the layout zones and ordering in `docs/ux-archetypes.md`.

Workflow per screen:
1) Classify archetype.
2) Restructure layout to match the archetype.
3) Apply visual system (glass, aurora, spacing).
4) Sync Light/Dark theme tones.
5) Verify no logic regressions.

---

## Theme Contract

Theme toggle uses `ThemeProvider` (`src/contexts/ThemeContext.tsx`) and the `dark` class on `document.documentElement`.  
Differences between Dark/Light are CSS variables only; no component logic changes.

Avoid:
- Pure black `#000`
- Pure white `#fff`

---

## Reference Mockups (Required)

Use only these sources for layout and component behavior:
- `ui_tokens/main style example.md`
- `ui_tokens/navigation shell.md`
- `ui_tokens/Tabs  Segmented  Filters.md`
- `ui_tokens/Analytics Table + Empty State.md`
- `ui_tokens/Drag & Drop Workout Builder.md`
- `ui_tokens/Toasts + Inline Alerts.md`
- `ui_tokens/universal list pattern.md`
- `ui_tokens/workout execution screen.md`
- `ui_tokens/empty + loading states.md`
- `ui_tokens/form pattern screen.md`
- `ui_tokens/component gallery.md`
- `ui_tokens/override_hotspots.md`
