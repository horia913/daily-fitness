# Modal structure — how modals look in this app

**This is the canonical structure. All modals must follow it.**

---

## 1. Outer layer (overlay)

- **Position:** `fixed inset-0` (full viewport).
- **Z-index:** `z-[9999]`.
- **Backdrop:** Semi-transparent dark overlay, e.g. `bg-black/60 backdrop-blur-sm` (or `bg-black/50` for light).
- **Layout:** Flexbox to center (or align-start) the inner card, e.g. `flex items-center justify-center p-4` (or `items-start`, `pb-20`, etc. as needed).
- **Overflow:** The overlay must **not** have `overflow-y-auto` or `overflow-auto`. Only the **inner modal card** may scroll (use `overflow-y-auto` and `max-h-[90vh]` on the card). Putting overflow on the overlay causes the modal to drift (e.g. “climb” up the screen) when the browser scrolls.
- **Scroll lock:** When the modal is open, the background must not scroll. Call `preventBackgroundScroll()` from `@/lib/mobile-compatibility` when opening and `restoreBackgroundScroll()` when closing. This uses the `fc-modal-open` class and `body.style.overflow`; `body.fc-modal-open main { overflow: hidden }` in `globals.css` locks the main content.
- **Portal:** For stable viewport centering (no drift from ancestor scroll/transform), render the overlay + card via `ModalPortal` from `@/components/ui/ModalPortal`: wrap the overlay in `<ModalPortal isOpen={isOpen}>…</ModalPortal>` so the modal is rendered into `document.body`.

---

## 2. Inner layer (the modal card)

- **Element:** A single inner `div` that is the **modal card**.
- **Classes:** Must include `fc-modal fc-card`.
- **Shape:** Card has rounded corners, e.g. `rounded-3xl` or `rounded-2xl`.
- **Size:** Constrained width, e.g. `w-full max-w-md` / `max-w-lg` / `max-w-4xl` etc. — not full-bleed; the card floats in the overlay.
- **Overflow:** `overflow-hidden` or `overflow-y-auto` on the card so content doesn’t spill.
- **Optional:** `fc-glass`, theme borders (`border`, `theme.border`), `shadow-2xl`, for consistency with the rest of the app.

---

## 3. Summary

| Layer   | Role        | Must have                                                                 |
|---------|-------------|---------------------------------------------------------------------------|
| Outer   | Full-screen overlay | `fixed inset-0 z-[9999]`, dark backdrop, flex + padding, **no overflow** on overlay, background scroll locked via `preventBackgroundScroll` / `restoreBackgroundScroll`, prefer `ModalPortal` to body |
| Inner   | Modal card  | `fc-modal fc-card`, rounded corners, max-width, **overflow-y-auto** (and max-height) on card for scrollable content |

**Wrong:** One full-bleed div that is both overlay and content (no separate card). Overlay with `overflow-y-auto` (causes modal drift).  
**Right:** Overlay (backdrop + flex, no overflow) → inside it, one card (`fc-modal fc-card` + rounded + max-width + overflow-y-auto) that contains all modal content. Use `ModalPortal` and scroll-lock helpers.

---

## 4. Reference components

Use these as the pattern; new modals should match their structure:

- `ModalPortal.tsx` — use `<ModalPortal isOpen={isOpen}>` to render the overlay + card into `document.body` for viewport-stable centering.
- `RestTimerModal.tsx` — uses `ModalPortal`, overlay (no overflow) + `fc-modal fc-card`, `preventBackgroundScroll` / `restoreBackgroundScroll`.
- `TabataCircuitTimerModal.tsx` — uses `ModalPortal` and shared scroll-lock helpers.
- `VideoPlayerModal.tsx` — uses `ModalPortal` and scroll-lock helpers.
- `ExerciseAlternativesModal.tsx` — uses `ModalPortal`, overlay without overflow, scroll-lock helpers.
- `ResponsiveModal.tsx` — overlay + card with `fc-glass fc-card rounded-3xl`, header/footer.
- `SimpleModal.tsx` — overlay + card with `fc-glass fc-card rounded-3xl`.
- `VolumeDetailsModal.tsx` — overlay + `fc-modal fc-card` with max-width and max-height.
