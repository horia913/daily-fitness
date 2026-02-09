# UI/UX Brief: Straight Set Executor Screen

Use this brief to generate a mockup for the **Straight Set Executor** (live workout – input state). The mockup should match the same design language as the **rest timer modal**: crystal-card, glass, one idea per zone, hero numbers where relevant, and optional vitreous/schematic detail.

---

## Purpose & Context

- **Screen:** The view where the user **logs one set** of a straight-set block (weight + reps) before rest or the next set.
- **Moment:** During a live workout, after the block/exercise is shown and before the rest timer appears.
- **Goal:** Clear exercise identity, visible set progress, easy weight/reps entry, and one obvious primary action (Log set).

---

## Design Language (Match Rest Timer)

- **Background:** Dark base (`#0A0A0A`), optional soft radial gradients (e.g. blue/red at corners), optional subtle vitreous dot grid.
- **Cards:** Crystal-card style — light gradient, backdrop blur, thin border, rounded (e.g. 24px).
- **Typography:** Clear hierarchy; mono for numbers (weight, reps, stats); uppercase small labels for metadata (e.g. SETS, REST).
- **Buttons:** Primary = solid gradient (e.g. red or blue), min height ~48px, optional icon + text; secondary/ghost = glass border.
- **Touch:** Min tap targets ~44–48px; enough spacing between controls.

---

## Layout (Top to Bottom)

### 1. Block context (top of card)

- **Left:** Block type badge — e.g. pill/chip with “Straight set” (or block name if custom).
- **Right:** Optional “Block N” (e.g. Block 1) in small mono/caption.
- **Optional:** Thin schematic line (top or left edge) for consistency with rest completion card.

### 2. Exercise identity

- **Optional program label:** e.g. “A1” pill + short horizontal line (if the design uses exercise letters).
- **Exercise name:** One clear title (e.g. “Barbell Back Squat”) — main heading, bold.
- **Subtitle (coach cue):** One line of intent from notes (e.g. “Focus on depth and explosive drive”). If no notes, show parameters only (e.g. “8 reps · 60s rest”) in muted caption.
- **Optional:** Small actions (e.g. video, alternatives) as icon buttons next to the title.

### 3. Block details grid

- **Purpose:** At-a-glance prescription (sets, reps, rest, optional load/tempo/RIR).
- **Layout:** Grid of small cards or pills (e.g. 2×2 or 2×4 on desktop).
- **Per item:** Uppercase label (e.g. SETS, REPS, REST) + value (number or text) + optional unit (e.g. “s” for rest).
- **Style:** Glass/crystal-card; values can be bold mono.

### 4. Set progress

- **Label:** “Set X of Y” (e.g. Set 2 of 4).
- **Visual:** Progress bar (filled portion = completed sets or current set progress).
- **Optional:** Set bubbles (e.g. ● ● ○ ○) or percentage.
- **Hierarchy:** One line of copy + one progress element; not cluttered.

### 5. Logging inputs (hero of the screen)

- **Purpose:** Enter weight and reps for the **current** set.
- **Layout:** Two inputs side by side (Weight | Reps) in one card/section.
- **Weight:** Numeric input, unit “kg” visible; optional stepper (+/−) or quick increments (e.g. +2.5 kg).
- **Reps:** Integer input; optional stepper.
- **Suggestion (optional):** If app suggests weight (e.g. from % or last session), show one line below weight: “Suggested: 80 kg” or “70% → 80 kg” with tap-to-apply. Style: small, link-like or chip.
- **Visual weight:** Inputs are the main focus — large enough to tap easily; numbers in mono.

### 6. Primary action

- **Single main button:** “LOG SET” (or “Log set”) with checkmark icon.
- **Style:** Full-width (or near), primary gradient, bold text.
- **State:** Disabled when weight or reps missing/invalid (e.g. opacity down, no pointer).
- **Placement:** Directly below the logging inputs; no competing primary actions.

### 7. Rest timer affordance (optional)

- **If block has rest > 0:** Small hint that rest will follow (e.g. “60s rest after this set”) or a small “Rest” chip. Do not replicate the full rest timer here — just set expectation.
- **Optional:** Rest icon + “60s” next to block details or below the log button.

### 8. Navigation (block-to-block)

- **Context:** “Block 2 of 4” (or current block index).
- **Controls:** Previous / Next block (arrows or text), only if multiple blocks. Disabled states when at first/last block.
- **Placement:** Bottom of the card or below the log button; secondary to “Log set”.

---

## Content Rules for Mockup

- **No hardcoded copy:** Use generic labels (e.g. “Exercise name”, “Set 2 of 4”, “Weight”, “Reps”, “LOG SET”). Real mockups can later use real exercise names and values.
- **Example values:** You can show example numbers (e.g. 80 kg, 8 reps, 4 sets, 60s rest) to define layout and hierarchy.

---

## Viewport & Constraints

- **Mobile-first:** 375px width (e.g. iPhone SE) is primary; layout should work in one column.
- **Max width (optional):** Content can be constrained (e.g. max-w-md or max-w-lg) so the card doesn’t stretch too wide on tablet/desktop.
- **Safe area:** Account for bottom nav or system UI; primary button should sit above thumb zone or be clearly tappable.

---

## Summary Checklist for the Mockup

| Zone              | Must have                                      | Style note                    |
|-------------------|------------------------------------------------|-------------------------------|
| Block context     | Block type badge, optional “Block N”          | Crystal-card top; optional line |
| Exercise identity | Title; subtitle (cue or params)                | Title = hero; subtitle muted   |
| Block details     | SETS, REPS, REST (+ optional LOAD/TEMPO/RIR)  | Grid; mono values             |
| Set progress      | “Set X of Y” + progress bar or bubbles        | One idea, clear                |
| Logging inputs    | Weight (kg) + Reps, side by side               | Large, mono; optional suggest  |
| Primary action    | One “LOG SET” button with icon                 | Gradient, full-width           |
| Rest hint         | Optional “60s rest” or rest chip                | Small, non-competing          |
| Navigation        | Block prev/next if multiple blocks             | Secondary                      |

Use the same **crystal-card**, **glass**, **refraction/vitreous** and **typography** cues as the rest timer modal so the Straight Set Executor mockup feels part of the same “Flash UI” family.
