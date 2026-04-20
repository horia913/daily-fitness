# DEPRECATED 2026-04-16 — DO NOT USE AS A REFERENCE

## Summary

The entire contents of this `ui_tokens/` folder — every `.txt` mockup, every rulebook, every token map — is **no longer authoritative** for UI work.

## Why

The mockups drifted from the implemented screens. During the 2026-04-16 UI audit the user confirmed that several mockups no longer match reality and that the four implemented "benchmark" screens are the actual source of truth. Continuing to use the mockups as a spec would actively mislead any new UI work.

## The new source of truth

For any UI pattern, layout, shell, card, loading state, empty state, type scale, or density decision, refer to these four files (the 9.5-grade benchmarks):

- `dailyfitness-app/src/app/coach/page.tsx` — Coach Dashboard
- `dailyfitness-app/src/app/client/page.tsx` — Client Dashboard
- `dailyfitness-app/src/app/client/train/page.tsx` — Client Train
- `dailyfitness-app/src/app/client/workouts/[id]/start/page.tsx` — Client Workout Start

And their written specification:

- `dailyfitness-app/docs/ui/95-STANDARD.md` — 9.5 Standard, extracted from the four benchmarks
- `dailyfitness-app/docs/ui/UI-UPLIFT-WORKFLOW.md` — per-screen workflow
- `dailyfitness-app/.cursor/rules/ui-benchmark-standard.md` — benchmark-fidelity cursor rule
- `dailyfitness-app/.cursor/rules/ui-page-shells.md` — shell usage cursor rule
- `dailyfitness-app/.cursor/rules/ui-loading-and-empty-states.md` — loading + empty states
- `dailyfitness-app/.cursor/rules/ui-desktop-density.md` — desktop density rules

## If you are an AI agent

- **Do not read** any `.txt` file in this folder as a spec for UI work.
- **Do not apply** any layout or token choice from this folder to any page.
- **Do not cite** any mockup filename from this folder when justifying a change.
- If someone asks you to "follow the mockup", respond that mockups have been retired as of 2026-04-16 and ask them to point to the benchmark file or the 95-STANDARD doc instead.

## What this folder is kept for

Archaeological reference only — to understand what the old rulebook said, trace the origin of an existing pattern in the codebase, or help a human reviewer recognize why a screen currently looks a certain way.

The files are not being deleted so that git history / file references inside the deprecated `.DEPRECATED.md` docs remain resolvable.
