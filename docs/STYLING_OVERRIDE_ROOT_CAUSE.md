# Why Custom Backgrounds Sometimes Don’t Show (Root Cause)

## Plain-English summary

**The background was coming from two places because:**

1. **Global “default” style**  
   The app has a single CSS file (`ui-system.css`) that defines how “cards” and “buttons” look. For example, the class `.fc-surface` means “use the standard card background.” That way, all cards look the same and you can change the look in one place.

2. **Shared components always add that default**  
   The card component (`ClientGlassCard`) was built to always add the class `fc-surface` to every card. So every card gets the default background from the stylesheet.

3. **Parents sometimes pass a different look**  
   When we want one card to stand out (e.g. “Today’s Workout” in cyan), the page passes an extra class like `bg-cyan-600` on the same card.

4. **Same element, two backgrounds**  
   The card’s `<div>` ends up with both:
   - `fc-surface` → “paint default card background” (from global CSS)
   - `bg-cyan-600` → “paint cyan background” (from Tailwind)

   The browser has to pick one. Because of how CSS works (specificity and load order), the global rule often wins, so the default background covers the cyan. So it looked like “the line we changed” was right, but another style was winning.

**So it’s not “one wrong line.”** It’s the **combination** of:
- a component that always applies a default (global) style, and  
- a parent that tries to override that same property (e.g. background) via `className`,  
with no logic that says “when the parent overrides, don’t apply the default.”

---

## Fix we applied

In **`ClientGlassCard`** (`GlassCard.tsx`): when the parent passes any `bg-*` class, we **do not** add `fc-surface`. So only the parent’s background applies. The comment in that file explains this so future changes don’t repeat the mistake.

---

## Is this happening elsewhere?

Yes. The same pattern can appear anywhere a component:

- Adds a **global class** that sets background (or color/border), and  
- Also receives a **parent `className`** that tries to change that same property.

Places to be aware of:

| Location | What happens | Risk |
|----------|----------------|------|
| **ClientGlassCard** | Used to always add `fc-surface` (default card background). Parent can pass `bg-*`. | Fixed: we skip `fc-surface` when parent passes `bg-*`. |
| **GlassCard (ui)** | Sets `background` via inline style. Parent can pass `bg-*` in `className`. | Fixed: we omit `background` from inline style when `className` contains `bg-*` so Tailwind wins. |
| **GoalCard** | Same `<div>` had `fc-glass` and `getPillarTintClass()` (e.g. `bg-blue-50/30`). | Fixed: root uses pillar tint only (no `fc-glass`) so one source for background. |
| **ChallengeCard** | Same `<div>` had `fc-glass` and status-based classes that include background. | Fixed: root uses status classes only (no `fc-glass`) so one source for background. |
| **Button** (fc variants) | Variants like `fc-primary` add `fc-btn fc-btn-primary` (background in global CSS). Parent can pass `className="bg-..."`. | Document only: custom background via `className` not supported; use a variant or raw button. |

So the **general rule** is: for any shared component that applies a global-CSS class for background (or color/border) and also accepts `className`, either:

- Don’t add the global class when the parent passes an override for that property (like we did for `ClientGlassCard`), or  
- Use a wrapper so the global class is on an inner element and the parent’s class is on the outer one (no same-element conflict).

---

## How to avoid this in the future

1. **When changing “how one card/button looks”:**  
   Check whether that element uses a **shared component** that adds a global class (e.g. `fc-surface`, `fc-glass`, `fc-btn`). If yes, the fix might need to be in that component (e.g. “if parent passes `bg-*`, don’t add `fc-surface`”), not only in the page.

2. **When building new shared components:**  
   If the component adds a global class that sets background/color/border and it accepts `className`, decide:  
   - either skip the default when the parent overrides (e.g. detect `bg-*` and don’t add `fc-surface`), or  
   - document that background/color/border overrides via `className` may not work.

3. **When adding “one-off” colored cards or buttons:**  
   Prefer components that already support overrides (e.g. `ClientGlassCard` with `bg-*`), or use a plain `div` / `button` with only Tailwind classes so there’s no second source of background.
