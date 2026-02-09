# 🚫 NEVER HARDCODE MOCKUP DATA — MANDATORY RULE

## THIS IS NON-NEGOTIABLE

When implementing UI from mockups, wireframes, or design files:

**You MUST NOT:**
- Copy any **text**, **labels**, **headlines**, **captions**, or **placeholder copy** from the mockup into the codebase.
- Invent or hardcode **status labels**, **section titles**, **button labels**, **tooltips**, or **empty-state messages** that are specific to the mockup.
- Use mockup-specific wording (e.g. "PERFORMANCE ARCHIVE", "Active Trajectories", "NEW ARCHIVE", "On Track ✓", "Urgent ▲", "Monthly Yield", "Next Milestone", "Completed Archives", "ARCHIVED") unless that exact string already exists in the app or comes from the database/config.

**You MUST:**
- Treat mockups **only** as a reference for **layout**, **structure**, **hierarchy**, **spacing**, and **visual style** (tokens, colors, typography).
- Use **data from the database** or **existing app copy** for all user-facing text.
- Use **generic UI labels** (e.g. "Active goals", "Completed", "Add goal", "Next goal") when no data source exists — never mockup-specific phrases.

## WHY THIS EXISTS

A previous implementation copied mockup copy into the app, violating explicit "no hardcoded data" and "no copying mockup-specific content" requirements. This rule exists so that **never happens again**.

## BEFORE WRITING ANY LABEL OR STRING

1. Can this value come from the **database** or **API**? → Use it.
2. Does this label already exist **elsewhere in the app**? → Reuse it.
3. Otherwise → Use a **short, generic** label (e.g. "Goals", "Completed", "Add"). **Never** pull wording from the mockup.

---

**If you are about to paste or type any text that appears in a mockup/design file, STOP. Use data or a generic label instead.**
