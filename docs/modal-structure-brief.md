# Modal structure — how modals look in this app

**This is the canonical structure. All modals must follow it.**

---

## 1. Outer layer (overlay)

- **Position:** `fixed inset-0` (full viewport).
- **Z-index:** `z-[9999]`.
- **Backdrop:** Semi-transparent dark overlay, e.g. `bg-black/60 backdrop-blur-sm` (or `bg-black/50` for light).
- **Layout:** Flexbox to center (or align-start) the inner card, e.g. `flex items-center justify-center p-4` (or `items-start`, `pb-20`, etc. as needed).
- **Scroll:** When the modal is open, background must not scroll. Use body scroll lock and/or `body.fc-modal-open main { overflow: hidden }` so the page behind does not scroll.

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
| Outer   | Full-screen overlay | `fixed inset-0 z-[9999]`, dark backdrop (`bg-black/60 backdrop-blur-sm`), flex + padding, background scroll locked |
| Inner   | Modal card  | `fc-modal fc-card`, rounded corners, max-width, overflow controlled        |

**Wrong:** One full-bleed div that is both overlay and content (no separate card).  
**Right:** Overlay (backdrop + flex) → inside it, one card (`fc-modal fc-card` + rounded + max-width) that contains all modal content.

---

## 4. Reference components

Use these as the pattern; new modals should match their structure:

- `RestTimerModal.tsx` — overlay + `fc-modal fc-card` card with max-width.
- `ResponsiveModal.tsx` — overlay + card with `fc-glass fc-card rounded-3xl`, header/footer.
- `SimpleModal.tsx` — overlay + card with `fc-glass fc-card rounded-3xl`.
- `VolumeDetailsModal.tsx` — overlay + `fc-modal fc-card` with max-width and max-height.
