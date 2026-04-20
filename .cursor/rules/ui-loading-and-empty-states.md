# UI — Loading, Empty, and Error States

**Status:** Canonical.

## LOADING

Two patterns, **only** these:

1. **Inline skeletons** — `fc-skeleton` class (from `ui-system.css`) for plain height-boxes, or the `Skeleton` / `SkeletonCard` primitives (`src/components/ui/Skeleton.tsx`) for typed shapes (`text` / `circular` / `rectangular` / `card`).
2. **`PageSkeleton`** (Phase 0, to be built) — a hero-style skeleton for first-load of a screen with a predictable top-to-bottom structure.

### Rules

- Render loading **inside the same shell** as the loaded state. Same width, same padding, same section order.
- Keep the header (title, back, menu) rendered during loading; skeletonise only below it.
- Skeleton heights should approximate real content heights so the layout does not shift on load.

### Anti-patterns (HARD-NO)

- `animate-spin` as a page loader. Always replace during the Phase 1 sweep.
- `animate-pulse` on a whole content card.
- A loading branch that renders a different shell or a bare `<div>` with no shell.

## EMPTY

Use the `EmptyState` primitive — `src/components/ui/EmptyState.tsx`:

- `variant="default"` — full-page-body empty (no program assigned, no workouts today).
- `variant="compact"` — section-level empty.
- `variant="inline"` — single muted line under a section header.

Provide a meaningful icon (Lucide or a rendered node). Provide an action when the empty state is the user's first step (e.g. `actionHref="/client/coach-connect"`).

### Anti-patterns

- Hand-rolled `<div className="text-center py-12">No items</div>` instead of the primitive.
- An empty state with no icon and no action when the user is supposed to do something next.
- Mockup-specific motivational copy. Use short, generic, data-driven text (see `.cursor/rules/no-hardcoded-mockup-data.md`).

## ERROR

Two templates — copy from the matching benchmark:

1. **Coach-dashboard style (card + Retry):**
   `fc-surface rounded-2xl p-4 mb-6 border-l-4 border-l-[color:var(--fc-status-error)]`, message left, `fc-btn-primary` "Retry" right. Use for non-fatal failures where the rest of the page can still render.
2. **Client-train style (flat bottom-bordered):**
   `border-b border-white/5 border-l-2 border-l-[color:var(--fc-status-error)] py-4 text-center` + `fc-btn-secondary` Retry below. Use inside list sections where only part of the content failed.

For **hard-fail** first-load errors where nothing else can render, the client-dashboard template (centered full-page card at `min-h-[60vh]`) is acceptable. Keep the shell and `AnimatedBackground` around it.

### Anti-patterns

- A bare `toast()` for a first-load failure. Toasts are for background actions, not the initial render.
- An error state that unmounts the shell.
- Hiding the underlying error message from the user without a retry path.
