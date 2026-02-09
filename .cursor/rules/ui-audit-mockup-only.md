# UI AUDIT — EVERY SCREEN FROM MOCKUP (MANDATORY — NO EXCEPTIONS)

## YOU MUST FOLLOW THIS FOR EVERY SINGLE SCREEN. NO EXCEPTIONS.

When changing, updating, or auditing **any** app screen (client, coach, admin, or utility):

### MANDATORY WORKFLOW — DO NOT SKIP ANY STEP

1. **Identify the exact route** (e.g. `/client/profile`, `/coach/clients/[id]/goals`).

2. **Find the mockup file** for that route:
   - Client screens → look in `dailyfitness-app/ui_tokens/client/` (e.g. `client profile.txt`, `coach client details.txt` for coach).
   - Coach screens → look in `dailyfitness-app/ui_tokens/coach/` (e.g. `coach client details.txt`, `coach-clients list.txt` — match by name to route).

3. **If no mockup file exists** for that route → **STOP. Do not edit the screen.** Tell the user: "There is no mockup for [route]. I will not update this screen until a mockup exists or you instruct otherwise."

4. **If a mockup file exists** → **Read the mockup file** with the Read tool. Do not assume. Do not guess. Open and read the file.

5. **Only then** edit the screen. Base the edit **on what the mockup says** (layout, structure, sections, hierarchy, tokens). Not on a generic pattern. Not on "what other screens look like." The mockup is the source of truth.

### YOU MUST NOT

- Edit any screen without first reading its mockup file.
- Apply a "same pattern as other screens" or a generic token/glass pattern instead of following the mockup.
- Update a screen that has no mockup (unless the user explicitly tells you to).
- Skip reading the mockup because "it's similar" or "I remember the pattern."

### MOCKUP LOCATIONS (ABSOLUTE)

- **Client:** `dailyfitness-app/ui_tokens/client/`
- **Coach:** `dailyfitness-app/ui_tokens/coach/`

File names may use spaces or hyphens (e.g. `client profile.txt`, `coach-adherance.txt`). Match the route to the correct file before editing.

---

## HOW TO USE THE MOCKUP

Once you have the mockup file, use it like this:

1. **Read the mockup file** (full contents) with the Read tool.

2. **Extract the spec from the mockup:**
   - **Layout** — Which sections/blocks exist and in what order (e.g. back link → header → stats row → list).
   - **Structure** — What is a title, subtitle, card, list, button, tab, filter, etc.
   - **Hierarchy** — What is primary vs secondary (main title, section titles, body).
   - **Elements** — What the screen contains (back, icon, stats, table, empty state, actions).
   - **Tokens/colors** — If the mockup mentions any (e.g. glass card, accent for CTA).

3. **Open the screen code** (the page component for that route).

4. **Implement to match the mockup:**
   - Same **sections** and **order** as in the mockup.
   - Same **structure** (e.g. back + header in one block, then cards, then list).
   - Same **hierarchy** (titles, subtitles, body) using app tokens (e.g. `fc-text-primary`, `fc-text-dim`, `fc-glass`).
   - **Do not** copy mockup placeholder text into the app; use real data or generic app copy (see rule: no hardcoded mockup data).

5. **Verify** — The implemented screen should match the mockup’s layout and structure, with app copy and tokens.

**Summary:** The mockup is the layout/structure spec. Implement that in code with app tokens and data. Never copy mockup text into the app.

---

## MOCKUP VS APP FUNCTIONS — WHAT COMES FIRST

**App functions come first.** **Mockup defines presentation.**

- **App functions** = What the screen does: data, actions, flows, behavior. These must be preserved. Do not remove or change behavior just to match a mockup.

- **Mockup** = Layout, structure, hierarchy, and visual style. Change the UI to follow the mockup.

**When implementing:**

1. **Keep all existing app functions** — Same data, same actions, same user flows.
2. **Restyle and re-layout** the screen to match the mockup — Same sections, order, titles, cards, tokens.
3. **If the mockup doesn’t show something the app already has** (e.g. a button or block) — Keep that element and place it in a way that fits the mockup’s layout, or ask the user where it should go.

**Rule:** Functions are the constraint; mockup is the visual spec. The mockup does not override or remove app functions; it defines how they are presented.

---

**Before every single screen edit: Read the mockup. Every time. Every screen. No exceptions.**
