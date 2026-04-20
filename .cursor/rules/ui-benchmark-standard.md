# UI — Benchmark-Standard Fidelity

**Status:** Canonical. Replaces the retired `ui-audit-mockup-only.DEPRECATED.md`.

## THE ONLY SOURCES OF TRUTH

When working on ANY `/client`, `/coach`, or `/admin` page, these four files and the `95-STANDARD.md` document are the **only** references you may cite:

1. `src/app/coach/page.tsx` — Coach Dashboard (target `max-w-5xl`)
2. `src/app/client/page.tsx` — Client Dashboard (target `max-w-lg`)
3. `src/app/client/train/page.tsx` — Client Train (target `max-w-lg`)
4. `src/app/client/workouts/[id]/start/page.tsx` — Client Workout Start (target `max-w-2xl`)
5. `dailyfitness-app/docs/ui/95-STANDARD.md` — the written spec derived from (1)–(4).

## MANDATORY RULES

- **Do not cite** any mockup from `dailyfitness-app/ui_tokens/`. That folder is deprecated (see `ui_tokens/DEPRECATED.md`).
- **Do not cite** any `*.DEPRECATED.md` doc in `dailyfitness-app/docs/` as current guidance. Use `docs/ui/*.md` only.
- When in doubt, **open the benchmark file closest to the screen's job and copy from it.** Do not invent.
- Width variants are not interchangeable. Read §3 of `95-STANDARD.md` and pick the correct one. If the screen does not obviously match a benchmark, STOP and ask the user before choosing.

## WHEN TO STOP AND ASK

- The target width or shell is ambiguous.
- The screen has a role/layout that no benchmark covers (e.g. multi-step wizard, full-bleed media viewer).
- Mobile density would change as a side effect of a desktop change.
- You are tempted to introduce a new primitive, new shell, or new token.

In all cases above: STOP. Post a short question describing the ambiguity and the two or three options. Do not guess.

## FAILURE MODE TO AVOID

Citing a mockup, a deprecated doc, or a generic "best practice" as justification for a UI choice on this codebase. Every UI decision must trace back to a benchmark file or the `95-STANDARD.md`.
