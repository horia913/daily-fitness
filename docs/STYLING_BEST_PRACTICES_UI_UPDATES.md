# Styling Best Practices — Unblocking UI Updates

**Goal:** One clear rule and a small set of patterns so custom card/button colors work every time and future UI updates are not blocked by "two sources of truth."

---

## 1. The Golden Rule: One Element, One Source Per Property

For any **single HTML element**, only **one** place should control a given property (e.g. background, border, text color):

- **Either** the component applies it (via a global class or Tailwind),
- **Or** the parent passes it (via `className` or a dedicated prop),

but **not both** on the same element. If both apply, cascade/specificity will pick a winner and overrides will feel broken.

---

## 2. Component Contract: How Shared Components Should Behave

### Cards (e.g. `ClientGlassCard`)

- **Default:** Component adds the standard surface (e.g. `fc-surface` or equivalent) so cards look consistent.
- **Override:** When the parent wants a custom background:
  - **Option A (current):** Parent passes `className` including a `bg-*` class; component **does not** add the default surface class so the parent’s background wins.
  - **Option B (explicit):** Add a prop like `appearance="default" | "custom"`. When `appearance="custom"`, component never adds the default surface; parent is responsible for background via `className`.

Document on the component: *"To use a custom background, pass a Tailwind `bg-*` class in `className`; the default card background will be skipped."*

### Buttons

- **Default:** Variant (e.g. `fc-primary`) adds the correct global button class. `className` is for layout/size, not for replacing background.
- **Override:** If you need a one-off button color:
  - Use a variant that supports it (e.g. a new `"highlight"` variant), or
  - Use a plain `<button className="...">` with Tailwind only (no `Button` + `fc-*` variant) so there’s no second source of background.

### Any component that adds a global class for background/color/border

- If it accepts `className`, decide and document:
  - **Override allowed:** When parent passes a relevant class (e.g. `bg-*`), component skips the default for that property (like `ClientGlassCard`).
  - **Override not supported:** Document that "background/color/border are controlled by the component; use a variant or a different component if you need a different look."

---

## 3. Immediate Actions (Stop It Blocking UI Work)

1. **Use the rule everywhere we already know it’s wrong**
   - **GoalCard:** Fixed — root uses pillar tint only (no `fc-glass`).
   - **ChallengeCard:** Fixed — root uses status classes only (no `fc-glass`).
   - **ui/GlassCard:** Fixed — when `className` contains `bg-*`, default background is omitted from inline style.
   - **Button:** Document that `className` is for layout/utility, not for replacing variant background; for custom colors use a new variant or a raw button.

2. **Make the rule visible where it matters**
   - Keep the comment in `GlassCard.tsx` (why we skip `fc-surface` when `bg-*` is passed).
   - In `docs/STYLING_OVERRIDE_ROOT_CAUSE.md`, keep the "Why" and "Is this happening elsewhere?" sections.
   - Point new UI work at this doc and at this best-practice file.

3. **Before any "change how this card/button looks" task**
   - Check: is this a shared component that adds a global style? If yes, fix the component (or add a variant), not only the page.

---

## 4. Post-fix verification

After applying the styling fixes, spot-check:

- **Client Goals page** (`/client/goals`): GoalCard pillar tints (blue, emerald, purple, amber, gray by pillar) are visible.
- **Client Challenges page** (`/client/challenges`): ChallengeCard status tints (green active, amber participating, gray completed, blue draft/upcoming) are visible.
- **Client dashboard / Train** (e.g. Today's Workout card): ClientGlassCard with custom `bg-*` shows the intended background.
- **Any page using ui/GlassCard with a custom `bg-*`** (if added later): Custom background is visible.

---

## 5. Checklist for Future UI Updates

When you want to change how something looks (color, background, border):

- [ ] **Identify the element:** Is it a `ClientGlassCard`, a `Button` with `fc-*`, a `GoalCard`, etc.?
- [ ] **One source:** Will only one place set background/color/border on that element? If the component already adds a global class, either use the component’s override (e.g. `bg-*` on `ClientGlassCard`) or change the component (variant / skip default).
- [ ] **No double-apply:** Avoid adding both a global class and a competing Tailwind class for the same property on the same element.
- [ ] **Document:** If you add a new override behavior, add a one-line comment or update this doc.

---

## 6. Long-Term Direction (Optional)

- **Prefer Tailwind for one-offs:** Use Tailwind (`bg-*`, `text-*`, `border-*`) for page-specific or one-off styling; use global classes for the shared "default" look. Components then either apply the default or yield to Tailwind (e.g. skip default when `bg-*` is present).
- **Explicit overrides:** For high-use components, consider a prop like `appearance="default" | "custom"` or `background="default" | "custom"` so override behavior is explicit and discoverable instead of relying on class-name detection.
- **Lint (later):** A custom ESLint rule could warn when both a global class like `fc-surface`/`fc-glass` and a Tailwind `bg-*` appear in the same `className` (or on the same component usage), to catch the pattern early.

---

Following this removes the "two sources of truth" trap and keeps UI updates predictable and unblocked.
