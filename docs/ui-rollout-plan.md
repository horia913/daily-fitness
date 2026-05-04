# UI Rollout Plan — design-system-v4 Conversion (75+ screens)

> **Status:** Plan only — no code changes. Authoritative reference for converting every screen in this app to `design-system-v4.md`.
> **Read this together with:** [`docs/design-system-v4.md`](docs/design-system-v4.md). Every claim in this plan cites a `§` from v4. If something here disagrees with v4, **v4 wins**.
> **Scope:** ~84 `page.tsx` + 1 `page.client.tsx` route file (Phase 1.4 cleanup brought count to 82+1; my glob shows 84 currently — see Section 5C "codebase-specific risks" for the small reconciliation).

---

## 0. Contradictory UI docs already in this repo (FLAGGED)

Before reading the rest of this plan, the following docs disagree with v4 in ways that will mislead any future Cursor session if not retired or sidelined. Per user instruction, **v4 is the source of truth**; these docs are useful for *some* mechanical rules (shells, tokens, file paths) but their style decisions are out of date.

### A. Active docs that contradict v4 on style

| Doc | What it says | What v4 says (§ ref) | Action |
|---|---|---|---|
| [`docs/ui/95-STANDARD.md`](docs/ui/95-STANDARD.md) §8 | Primary CTA = `fc-btn-primary` = **cyan gradient** (`#0891b2 → #22d3ee`) | Primary CTA = `btn-action` = **lime gradient** (`#C5FF4A → #7FE89A`) (§2.3, §6.20, §17 anti-pattern #2) | Sideline its color guidance. Shell + composition rules still useful. |
| [`docs/ui/95-STANDARD.md`](docs/ui/95-STANDARD.md) §10 | "Today / active" status uses cyan; no concept of lime as action color | "Action affordances only" use lime; cyan is **system only**, never CTA (§2.10) | Sideline its accent-role table. |
| [`docs/ui/95-STANDARD.md`](docs/ui/95-STANDARD.md) §11 | "Activities (cardio / lifestyle): intentionally use the emoji from `ACTIVITY_META`" | "All icons SVG, stroke-based. No emoji, no icon fonts, no PNGs." (§8.1) | **OVERRIDDEN by user decision 2026-04-26 — see subsection A.1 below.** Emoji are PERMITTED on activity-type identification icons. All other UI icons remain SVG stroke-based. |
| [`docs/ui/95-STANDARD.md`](docs/ui/95-STANDARD.md) §6 | Primary card = "prescription shell" with cyan-950/60 background + cyan-500/40 left bar (the `fc-card-shell` pattern) | Primary card tier is **plain card** (`fc-surface`); cyan-tinted full-card body is reserved for `fc-card-status-info` only (§6.1, §6.2) | Sideline. The `fc-card-shell` pattern is still in use across many pages and is a rewrite target. |
| [`src/styles/ui-system.css`](src/styles/ui-system.css) `.fc-fab` (lines 441–463) | FAB = **red gradient** (`var(--fc-status-error)` → `#b91c1c`) with red glow shadow | FAB must be **lime, not red.** Red FAB reads destructive when function is creative. (§6.21, §17 anti-pattern #13) | The CSS rule must be rewritten in Phase 0. |
| [`docs/ui/UI-UPLIFT-WORKFLOW.md`](docs/ui/UI-UPLIFT-WORKFLOW.md) | 6-step "9.5" template + per-screen self-grade rubric built around 95-STANDARD | v4 introduces a different 7-pass workflow (atomic decomposition + composite check) (§16.1) | Sideline as a workflow document. v4 §16.1 supersedes it. The screen-inventory's *target shells/widths* remain useful. |
| [`docs/ui/screen-inventory.md`](docs/ui/screen-inventory.md) | Marks screens "verify-done" / "Phase 4 polished" against the cyan-CTA / red-FAB / mostly-`fc-card-shell` standard | v4 invalidates that "done" status — every "verify-done" screen still needs full token-and-atomic conversion | Use only as a **shell/width inventory**, not as a "done" log. |
| [`docs/ui/phase-5-plan.md`](docs/ui/phase-5-plan.md) | "9.0 → 9.5 push" against 95-STANDARD | Superseded by this v4 plan | Sideline. |
| [`docs/RULEBOOK.md`](docs/RULEBOOK.md), [`docs/STYLING_BEST_PRACTICES_UI_UPDATES.md`](docs/STYLING_BEST_PRACTICES_UI_UPDATES.md), [`docs/token-mapping-rulebook.md`](docs/token-mapping-rulebook.md), [`docs/ui-visual-audit-current-state.md`](docs/ui-visual-audit-current-state.md) | Various, generally pre-v4 | v4 supersedes color/atomic decisions | Treat as v3-era reference; cite v4 for any conflict. |

### A.1. Override decisions on top of v4 (user-approved exceptions)

These are user-approved exceptions to v4 captured during the rollout planning process. They will be folded into design-system v5 when v5 is produced. Until then, treat each item below as having priority over the v4 rule it overrides.

**Override #1 — Activity-type emoji icons (overrides v4 §8.1).**

> **Per user decision 2026-04-26, v4 §8.1 SVG-only rule does NOT apply to activity-type identification icons. Emoji are permitted on cardio / sport / lifestyle activity-type indicators where visual recognition matters more than stylistic uniformity. All other UI icons remain SVG stroke-based per v4 §8.1.**

Scope: applies wherever the codebase uses `ACTIVITY_META` (or equivalent activity-type registry) to render an activity-type icon — primarily `/client/activity` ([`src/components/client/activity/ActivityList.tsx`](src/components/client/activity/ActivityList.tsx)) and any place that surfaces a per-activity glyph (e.g. workout list rows tagged with cardio type, weekly check-in lifestyle entries).

Out of scope: every other icon in the app (CTAs, navigation, status indicators, block-type tags, achievements) remains SVG-stroke per v4 §8.1.

This decision will be codified in design-system v5.

### B. Already-deprecated docs (no action required, just don't read them)

These already carry `.DEPRECATED` in their filename and should not be cited:

- `docs/ui-rulebook.DEPRECATED.md`
- `docs/ui-audit-checklist.DEPRECATED.md`
- `docs/screen-inventory.DEPRECATED.md`
- `docs/UI_ENHANCEMENT_WORKFLOW.DEPRECATED.md`
- `docs/ui-update-tracker.DEPRECATED.md`

### C. Useful from existing docs (keep)

| Doc | Useful for |
|---|---|
| [`docs/ui/95-STANDARD.md`](docs/ui/95-STANDARD.md) §2 (root composition) | The `ProtectedRoute > AnimatedBackground > Shell` order is still right structurally |
| [`docs/ui/95-STANDARD.md`](docs/ui/95-STANDARD.md) §3 (shell widths) | Width-variant decisions (`max-w-lg` / `max-w-2xl` / `max-w-5xl` / `max-w-7xl`) for `ClientPageShell` / `CoachPageShell` are ratified |
| [`docs/ui/95-STANDARD.md`](docs/ui/95-STANDARD.md) §16 (a11y) | Tap targets, focus rings, AA contrast — aligns with v4 §11 |
| [`docs/ui/screen-inventory.md`](docs/ui/screen-inventory.md) | Per-route shell + width assignments (`benchmark-5xl` / `default-5xl` / `data-7xl` / `form-2xl`) |
| `.cursor/rules/ui-page-shells.md` | Shell usage rules (still aligned with v4 atomic §15.1) |

---

═══════════════════════════════════════════════
## SECTION 1 — Phase 0: Foundation (split into 0a + 0b per user decision 2026-04-26)
═══════════════════════════════════════════════

> **Why this phase exists:** Per v4 §16.1 step 4 (Atomic application pass), a screen converts cleanly **only** if the canonical atomics already exist as reusable building blocks. The current codebase has many atomic-shaped pieces, but they encode the v3/95-STANDARD style (cyan CTAs, red FAB, prescription-shell cards). Phase 0 fixes the foundation so Phase 1+ becomes mechanical.

> **Phase 0 is split into TWO sub-phases that MUST be sequential:**
>
> - **Phase 0a — Additive only.** Add tokens, classes, new components, helpers, and the `/dev/v4-lab` showcase. **No existing code is modified. No existing classes are renamed, redirected, aliased, or deprecated. No callers are touched.** Phase 0a is mechanically safe — it cannot break a running screen because nothing existing is changed.
>
> - **Phase 0b — Migration decisions.** Audit and migrate the v3-era artefacts that contradict v4: `.fc-fab` (red), `.fc-btn-primary` (cyan-as-action), `.fc-attention-*` (status fills without v4-correct borders), `ClientGlassCard` (defaults to `fc-card-shell` prescription-shell), `AnimatedBackground` (time-of-day vs v4 §3 role-based backdrops). Each item requires a usage-audit grep first, a per-call-site categorization, and a user-approved migration plan **before any class rule is rewritten or any caller is touched.**
>
> **Phase 0a completion is required before Phase 0b starts. Phase 0b completion is required before Phase 1 starts.** Do not interleave 0a and 0b work.

### A. Token additions to [`src/styles/ui-system.css`](src/styles/ui-system.css)

> **Read against v4 §2.1 through §2.9.**

> **Light-theme policy during Phases 1–8 (user decision 2026-04-26):** New tokens are added to BOTH the `:root` (light) and `.dark` blocks, with light-theme values mirroring dark for now and flagged `[verify-light-theme]`. **No screen converted in Phases 1–8 is responsible for producing correct light-theme output.** A dedicated light-theme pass happens post-Phase-8. If a converted screen's light-theme rendering breaks, that is acceptable until that pass. Cursor must NOT spend effort tuning per-screen light-theme behavior during Phases 1–8 unless the user explicitly requests it for a specific screen.

**A.1 — `.dark` block extensions (the app runs dark by default; light theme is `[verify]` per v4 scope note + the policy above).**

| Token | New / Existing | v4 § | Value to add |
|---|---|---|---|
| `--fc-accent-lime` | **NEW** | §2.3 | `#C5FF4A` |
| `--fc-accent-lime-2` | **NEW** | §2.3 | `#7FE89A` |
| `--fc-accent-lime-soft` | **NEW** | §2.3 | `rgba(197, 255, 74, 0.13)` |
| `--fc-accent-lime-glow` | **NEW** | §2.3 | `rgba(197, 255, 74, 0.38)` |
| `--fc-accent-gold` | **NEW** | §2.3 | `#F5C242` |
| `--fc-accent-gold-soft` | **NEW** | §2.3 | `rgba(245, 194, 66, 0.13)` |
| `--fc-accent-bronze` | **NEW** | §2.3, §2.8 | `#CD7F32` |
| `--fc-accent-silver` | **NEW** | §2.3, §2.8 | `#C0C0C0` |
| `--fc-text-quaternary` | **NEW** | §2.2 | `rgba(255, 255, 255, 0.26)` |
| `--fc-text-disabled` | **NEW** | §2.2 | `rgba(255, 255, 255, 0.14)` |
| `--fc-macro-on-target` | **NEW** | §2.9 | `var(--fc-status-success)` |
| `--fc-macro-near-target` | **NEW** | §2.9 | `var(--fc-status-warning)` |
| `--fc-macro-off-target` | **NEW** | §2.9 | `var(--fc-status-error)` |
| `--fc-pillar-training` | **NEW (alias)** | §2.6 | `var(--fc-domain-workouts)` |
| `--fc-pillar-nutrition` | **NEW (alias)** | §2.6 | `var(--fc-domain-meals)` |
| `--fc-pillar-checkins` | **NEW (alias)** | §2.6 | `var(--fc-status-info)` |
| `--fc-pillar-lifestyle` | **NEW (alias)** | §2.6 | `var(--fc-accent-purple)` |
| `--fc-pillar-general` | **NEW (alias)** | §2.6 | `var(--fc-text-subtle)` |
| `--fc-rarity-common` | **NEW (alias)** | §2.7 | `var(--fc-text-dim)` |
| `--fc-rarity-uncommon` | **NEW (alias)** | §2.7 | `var(--fc-status-success)` |
| `--fc-rarity-rare` | **NEW (alias)** | §2.7 | `var(--fc-accent-cyan)` |
| `--fc-rarity-epic` | **NEW (alias)** | §2.7 | `var(--fc-accent-purple)` |
| `--fc-rarity-legendary` | **NEW (alias)** | §2.7 | `var(--fc-accent-gold)` |

> **Already exist (don't redefine):** `--fc-bg-deep`, `--fc-bg-basalt`, `--fc-text-primary`, `--fc-text-dim`, `--fc-text-subtle`, `--fc-glass-base`, `--fc-glass-soft`, `--fc-glass-border`, `--fc-glass-border-strong`, `--fc-glass-highlight`, `--fc-accent-cyan`, `--fc-accent-purple`, `--fc-status-success/warning/error/info/inactive`, `--fc-domain-workouts/meals/habits/challenges/neutral`, `--fc-radius-sm/md/lg/xl/2xl/3xl`. Confirmed via direct read of [`src/styles/ui-system.css`](src/styles/ui-system.css) lines 1–167.

**A.2 — Existing tokens that need values revisited (NOT redefinition, but used differently).**

| Token | Current value | v4 use | Note |
|---|---|---|---|
| `--fc-domain-habits` | `#fbbf24` (yellow) in dark | v4 §6.16 says block-type tags are cyan, **not yellow** (§17 anti-pattern #3). For habit pillar, v4 §2.6 doesn't override domain-habits, but block-type tags must NEVER use yellow. | Keep token value (used elsewhere); ensure block-type tags use `--fc-accent-cyan`, not `--fc-domain-habits`. |
| `--fc-domain-challenges` | `#f43f5e` (rose) | v4 has no specific challenge color guidance besides `--fc-domain-challenges` for stripe. | Keep. |
| `--fc-radius-*` (sm 12, md 16, lg 20, xl 24, 2xl 32, 3xl 40) | Defined | v4 §5.2 marks "exact pixel values `[verify]`" | Document as confirmed values; surface as a `[verify]` flag (Section 3D) so the design owner can confirm they match v4's intent. |

**A.3 — Atmospheric backdrop classes (per v4 §3).**

v4 §3 specifies five named backdrop variants (action-top / action-bottom / information / warning / achievement). The current app uses [`src/components/ui/AnimatedBackground.tsx`](src/components/ui/AnimatedBackground.tsx) which renders a **time-of-day gradient** via `getTimeBasedGradientColors()`. **This is a structural mismatch with v4 §3.** See Section 1D below for proposed reconciliation.

For tokens, add:

```css
.fc-backdrop-action-top { background: radial-gradient(ellipse 100% 60% at 50% -20%, var(--fc-accent-lime-soft), transparent 70%), linear-gradient(180deg, transparent 0%, var(--fc-bg-basalt) 100%); }
.fc-backdrop-action-bottom { background: radial-gradient(ellipse 110% 50% at 50% 80%, color-mix(in srgb, var(--fc-accent-lime) 13%, transparent), transparent 70%), linear-gradient(180deg, var(--fc-bg-basalt) 0%, transparent 60%); }
.fc-backdrop-info { background: radial-gradient(ellipse 90% 50% at 50% -20%, color-mix(in srgb, var(--fc-accent-cyan) 6%, transparent), transparent 70%), linear-gradient(180deg, transparent 0%, var(--fc-bg-basalt) 100%); }
.fc-backdrop-warning { background: radial-gradient(ellipse 100% 50% at 50% 10%, color-mix(in srgb, var(--fc-status-warning) 10%, transparent), transparent 65%), linear-gradient(180deg, transparent 0%, var(--fc-bg-basalt) 100%); }
.fc-backdrop-achievement { background: radial-gradient(ellipse 100% 50% at 50% 10%, color-mix(in srgb, var(--fc-accent-gold) 10%, transparent), transparent 65%), linear-gradient(180deg, transparent 0%, var(--fc-bg-basalt) 100%); }
```

Plus a 4%-opacity SVG noise overlay (already implemented as `.fc-grain-layer` lines 210–217 — reuse as-is).

### B. New utility classes (per v4 §6.1, §6.2, plus selected helpers)

**B.1 — Card tiers (§6.1).**

```css
.fc-hero-action {
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--fc-accent-lime) 22%, transparent), transparent 50%),
    radial-gradient(80% 80% at 100% 100%, color-mix(in srgb, var(--fc-accent-lime-2) 14%, transparent), transparent 60%),
    linear-gradient(135deg, color-mix(in srgb, var(--fc-accent-lime) 8%, var(--fc-surface-card)), var(--fc-surface-card));
  border: 1px solid color-mix(in srgb, var(--fc-accent-lime) 20%, transparent);
  border-radius: var(--fc-radius-2xl);
  padding: 22px;
  box-shadow:
    0 30px 60px -25px rgba(0, 0, 0, 0.5),
    0 20px 50px -20px var(--fc-accent-lime-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
}
/* Diagonal-line texture overlay */
.fc-hero-action::after {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 8px);
  pointer-events: none;
}
```

**B.2 — Status-tinted cards (§6.2).**

```css
.fc-card-status-warning {
  background: color-mix(in srgb, var(--fc-status-warning) 7%, var(--fc-surface-card));
  border: 1px solid color-mix(in srgb, var(--fc-status-warning) 18%, transparent);
}
.fc-card-status-error {
  background: color-mix(in srgb, var(--fc-status-error) 7%, var(--fc-surface-card));
  border: 1px solid color-mix(in srgb, var(--fc-status-error) 18%, transparent);
}
.fc-card-status-success {
  background: color-mix(in srgb, var(--fc-status-success) 6%, var(--fc-surface-card));
  border: 1px solid color-mix(in srgb, var(--fc-status-success) 16%, transparent);
}
.fc-card-status-info {
  background: color-mix(in srgb, var(--fc-accent-cyan) 6%, var(--fc-surface-card));
  border: 1px solid color-mix(in srgb, var(--fc-accent-cyan) 16%, transparent);
}
```

> **Distinction from existing `.fc-attention-*`** (current lines 555–593): those are subtle background tints with no border. v4 §6.2 needs both background AND tinted border. Either rename or augment the `.fc-attention-*` set; the cleaner path is to add `.fc-card-status-*` as the v4 atomic and gradually deprecate `.fc-attention-*`. Flag for human review (Section 3E).

**B.3 — Atmospheric backdrops** — see A.3 above.

**B.4 — Pillar/domain stripe (§6.3).**

```css
.fc-pillar-stripe { position: relative; }
.fc-pillar-stripe::before {
  content: "";
  position: absolute;
  left: 0; top: 12px; bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--pillar-color, var(--fc-text-subtle));
}
```

**B.5 — Buttons (§6.20).**

```css
.btn-action {
  background: linear-gradient(135deg, var(--fc-accent-lime), var(--fc-accent-lime-2));
  color: #061018;
  font-weight: 700;
  font-size: 14px;
  padding: 14px 18px;
  border-radius: var(--fc-radius-lg);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow:
    0 12px 30px -8px var(--fc-accent-lime-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.btn-action-sm { padding: 9px 12px; font-size: 12px; }
.btn-success {
  background: var(--fc-status-success);
  color: #061018;
  font-weight: 700;
}
.btn-pill {
  background: rgba(255,255,255,0.04);
  color: var(--fc-accent-cyan);
  border: 1px solid var(--fc-glass-border);
  border-radius: 999px;
  padding: 6px 14px;
}
.btn-ghost-icon, .btn-ghost-icon-sm {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--fc-glass-border);
  color: var(--fc-text-dim);
  border-radius: var(--fc-radius-md);
}
.btn-ghost-icon-sm.danger:hover {
  color: var(--fc-status-error);
  border-color: color-mix(in srgb, var(--fc-status-error) 30%, transparent);
}
```

> **Anti-pattern to fix:** `.fc-btn-primary` (lines 315–328) is the **cyan** gradient and is currently used as the app-wide primary. Per v4 §2.10 cyan is "system only, never CTA." **Strategy:** keep `.fc-btn-primary` for backwards compatibility but redirect it to alias `.btn-action` style (lime), OR add `.btn-action` and migrate per-screen. Decision flagged in Section 3E.

**B.6 — FAB (§6.21).**

```css
.fab-action {
  position: fixed;
  bottom: calc(64px + 16px);
  right: 16px;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--fc-accent-lime), var(--fc-accent-lime-2));
  color: #061018;
  box-shadow: 0 16px 40px -8px var(--fc-accent-lime-glow);
  display: grid; place-items: center;
  border: none;
  cursor: pointer;
}
.fab-action svg { width: 24px; height: 24px; }
```

> **The existing `.fc-fab` (lines 441–463) is RED.** v4 §17 anti-pattern #13. Either rewrite `.fc-fab` (preferred — fewer code touches downstream) or add `.fab-action` and migrate. Decision flagged in Section 3E.

**B.7 — Inputs (§6.22).**

```css
.input-cell {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--fc-glass-border);
  border-radius: var(--fc-radius-lg);
  padding: 10px 12px;
}
.input-cell .label {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  color: var(--fc-text-subtle);
  font-weight: 700;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
}
.input-cell .num {
  font-family: var(--font-display, var(--font-number));
  font-weight: 700;
  font-size: 28px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--fc-text-primary);
}
```

**B.8 — Pills, tags, badges (§6.7, §6.12, §6.15, §6.16, §6.17, §6.18, §6.19).**

```css
.delta { display:inline-flex; align-items:center; gap:3px; font-size:11px; font-weight:600; padding:2px 6px; border-radius:999px; font-feature-settings:"tnum"; }
.delta.up { color: var(--fc-status-success); background: color-mix(in srgb, var(--fc-status-success) 10%, transparent); }
.delta.down { color: var(--fc-status-warning); background: color-mix(in srgb, var(--fc-status-warning) 10%, transparent); }
.delta.neutral { color: var(--fc-text-subtle); background: rgba(255,255,255,0.05); }

.variance-pill { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:999px; font-size:11px; font-weight:600; }
.variance-pill[data-variance="on-target"]   { color: var(--fc-macro-on-target);   background: color-mix(in srgb, var(--fc-macro-on-target)   10%, transparent); }
.variance-pill[data-variance="near-target"] { color: var(--fc-macro-near-target); background: color-mix(in srgb, var(--fc-macro-near-target) 10%, transparent); }
.variance-pill[data-variance="off-target"]  { color: var(--fc-macro-off-target);  background: color-mix(in srgb, var(--fc-macro-off-target)  10%, transparent); }

.priority-pill { display:inline-flex; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.10em; text-transform:uppercase; }
.priority-pill[data-priority="high"]   { color: var(--fc-status-warning); background: color-mix(in srgb, var(--fc-status-warning) 12%, transparent); }
.priority-pill[data-priority="medium"] { color: var(--fc-text-dim);       background: rgba(255,255,255,0.05); }
.priority-pill[data-priority="low"]    { color: var(--fc-text-subtle);    background: rgba(255,255,255,0.03); }

.tag-system { display:inline-flex; padding:2px 8px; border-radius:999px; font-size:9px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase;
              color: var(--fc-accent-cyan); background: color-mix(in srgb, var(--fc-accent-cyan) 10%, transparent); border: 1px solid color-mix(in srgb, var(--fc-accent-cyan) 20%, transparent); }

.tag-status[data-status="completed"] { color: var(--fc-status-success); background: color-mix(in srgb, var(--fc-status-success) 12%, transparent); }
.tag-status[data-status="review"]    { color: var(--fc-status-warning); background: color-mix(in srgb, var(--fc-status-warning) 12%, transparent); }
.tag-status[data-status="urgent"]    { color: var(--fc-status-error);   background: color-mix(in srgb, var(--fc-status-error)   12%, transparent); }
.tag-status[data-status="paused"]    { color: var(--fc-text-dim);       background: rgba(255,255,255,0.05); }
.tag-status[data-status="generated"] { color: var(--fc-status-success); background: color-mix(in srgb, var(--fc-status-success) 12%, transparent); }
.tag-status[data-status="manual"]    { color: var(--fc-text-subtle);    background: rgba(255,255,255,0.03); }

.tier-badge[data-tier="bronze"]   { color: var(--fc-accent-bronze); background: color-mix(in srgb, var(--fc-accent-bronze) 14%, transparent); }
.tier-badge[data-tier="silver"]   { color: var(--fc-accent-silver); background: color-mix(in srgb, var(--fc-accent-silver) 12%, transparent); }
.tier-badge[data-tier="gold"]     { color: var(--fc-accent-gold);   background: var(--fc-accent-gold-soft); }
.tier-badge[data-tier="platinum"] { background-image: linear-gradient(90deg, var(--fc-accent-gold), var(--fc-accent-cyan)); -webkit-background-clip: text; background-clip: text; color: transparent; }

.rarity-pill[data-rarity="common"]    { color: var(--fc-rarity-common); }
.rarity-pill[data-rarity="uncommon"]  { color: var(--fc-rarity-uncommon); background: color-mix(in srgb, var(--fc-rarity-uncommon) 10%, transparent); }
.rarity-pill[data-rarity="rare"]      { color: var(--fc-rarity-rare);     background: color-mix(in srgb, var(--fc-rarity-rare) 10%, transparent); }
.rarity-pill[data-rarity="epic"]      { color: var(--fc-rarity-epic);     background: color-mix(in srgb, var(--fc-rarity-epic) 10%, transparent); }
.rarity-pill[data-rarity="legendary"] { color: var(--fc-rarity-legendary); background: var(--fc-accent-gold-soft); }
```

**B.9 — Target-progress bar with variance (§6.11).**

```css
.target-bar { position: relative; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
.target-bar-fill { height: 100%; border-radius: 3px; transition: width 600ms cubic-bezier(0.65,0,0.35,1); }
.target-bar[data-variance="on-target"]   .target-bar-fill { background: var(--fc-macro-on-target); }
.target-bar[data-variance="near-target"] .target-bar-fill { background: var(--fc-macro-near-target); }
.target-bar[data-variance="off-target"]  .target-bar-fill { background: var(--fc-macro-off-target); }
.target-bar-target { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--fc-text-quaternary); }
```

**B.10 — Deadline urgency / Stale-data text (§6.9, §6.10).**

```css
.deadline[data-urgency="overdue"]  { color: var(--fc-status-error); }
.deadline[data-urgency="imminent"] { color: var(--fc-status-warning); }
.deadline[data-urgency="soon"]     { color: var(--fc-text-dim); }
.deadline[data-urgency="distant"]  { color: var(--fc-text-subtle); }
.deadline[data-urgency="none"]     { color: var(--fc-text-subtle); }

.stale-data[data-staleness="fresh"] { color: var(--fc-text-subtle); }
.stale-data[data-staleness="aging"] { color: var(--fc-status-warning); }
.stale-data[data-staleness="stale"] { color: var(--fc-status-error); }
```

**B.11 — Self-authored note (§6.14).**

```css
.self-note { font-style: italic; color: var(--fc-text-dim); padding: 8px 0 8px 12px; border-left: 2px dashed var(--fc-text-quaternary); font-size: 13px; }
```

**B.12 — Quote zone (§6.13) — already partially exists in current code but not as a named class.**

```css
.coach-quote {
  background: color-mix(in srgb, var(--fc-accent-cyan) 5%, transparent);
  border-left: 2px solid var(--fc-accent-cyan);
  border-radius: 2px 10px 10px 2px;
  padding: 10px 14px;
  color: var(--fc-text-primary);
}
```

**B.13 — Difficulty rating (§6.28).**

```css
.difficulty-rating { font-family: var(--font-display, var(--font-number)); font-weight: 600; font-size: 16px; }
.difficulty-rating .scale { color: var(--fc-text-quaternary); font-weight: 500; }
```

**B.14 — Filter pill row (§6.34).**

```css
.filter-pills { display:flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; }
.filter-pill { padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid transparent; background: rgba(255,255,255,0.04); color: var(--fc-text-dim); white-space: nowrap; }
.filter-pill.active { background: color-mix(in srgb, var(--fc-accent-cyan) 12%, transparent); color: var(--fc-accent-cyan); border-color: color-mix(in srgb, var(--fc-accent-cyan) 30%, transparent); }
```

**B.15 — Add-item placeholder (§6.37).**

```css
.add-placeholder {
  display: flex; align-items: center; justify-content: center;
  width: 100%;
  padding: 14px;
  border: 1px dashed var(--fc-glass-border);
  border-radius: var(--fc-radius-lg);
  background: transparent;
  color: var(--fc-text-dim);
  font-size: 12px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase;
}
.add-placeholder:hover, .add-placeholder:focus-visible {
  border-color: color-mix(in srgb, var(--fc-accent-cyan) 40%, transparent);
  color: var(--fc-accent-cyan);
}
```

**B.16 — Empty section state (§6.35).** Existing [`EmptyState`](src/components/ui/EmptyState.tsx) covers this; verify it supports the three variants (Encouraging / Celebratory / Setup) and the "Never 'No data found.'" rule. If not, extend.

**B.17 — Archive section (§6.36).**

```css
.archive-section { margin-top: 32px; opacity: 0.65; }
.archive-header { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 8px; border-bottom: 1px solid var(--fc-glass-border); }
.archive-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--fc-text-subtle); }
.archive-count   { font-size: 11px; color: var(--fc-text-dim); }
```

### C. Shared atomic components — build/refactor first

> **For each atomic in v4 §6, what already exists, what must change, and (when new) the proposed path.** Path conventions follow v4 §15.2 (existing patterns: `*Card`, `*Modal`, `*Shell`, `*View`, `Optimized*`).

#### §6.1 Card tiers

| Tier | Existing component | Status | Action |
|---|---|---|---|
| Plain card | `fc-surface` class (lines 1035–1041) | Exists | Keep. v4 default. |
| Glass card | `fc-glass`, `fc-glass-soft`, `fc-glass-heavy` classes (lines 244–263); also [`GlassCard`](src/components/ui/GlassCard.tsx) and [`ClientGlassCard`](src/components/client-ui/GlassCard.tsx) component | Exists | Keep. Stop using `ClientGlassCard` for *content* cards (it currently maps to `fc-card-shell` which is the v3 prescription-shell pattern — not a default v4 card). Use it only when a card genuinely needs a left accent and tinted background. |
| Elevated card | `fc-surface-elevated` class (lines 1043–1050) | Exists | Keep. |
| Action hero card | None | **NEW** | Add class `fc-hero-action` per Section 1B.1. New component: [`src/components/ui/HeroActionCard.tsx`](src/components/ui/HeroActionCard.tsx) accepting `eyebrow`, `pill`, `title`, `meta`, `cta`, `infoSlot`. |
| Status-tinted card | `fc-attention-{urgent,warning,good,info,inactive}` (lines 555–593) — partial; missing tinted border | Partial | Add `fc-card-status-{warning,error,success,info}` per §6.2 (Section 1B.2). Migrate `fc-attention-*` callers in Phase 1. |

#### §6.2 Status-tinted card
See above and Section 1B.2.

#### §6.3 Pillar/domain stripe
**Existing:** `fc-accent-workouts/meals/habits/challenges` classes (lines 486–500) — **4px** left border with `border-left: 4px solid …`.
**v4 wants:** **3px** left bar offset 12px from top/bottom, with 0/3px border-radius.
**Action:** Add new `.fc-pillar-stripe` per Section 1B.4 (3px, ::before pseudo). Keep existing `fc-accent-*` for `fc-card-shell` legacy usage; migrate Goals / Habits / Activity callers in Phase 4.

#### §6.4 Hero card (action variant)
**Existing:** `fc-hero-card` class (lines 1297–1313) — neutral elevated card with top edge highlight, no glow.
**v4 wants:** Lime-glow gradient action hero (different shape).
**Action:** Add `.fc-hero-action` (Section 1B.1) plus a wrapper component [`src/components/ui/HeroActionCard.tsx`](src/components/ui/HeroActionCard.tsx). Keep `fc-hero-card` as-is — it's actually closer to v4's "elevated card" tier and useful for Information-Dominant screens.

#### §6.5 Stat card / §6.6 Stat strip
**Existing:** `fc-stats-strip`, `fc-stats-strip-item`, `fc-stats-strip-value`, `fc-stats-strip-label` (lines 1138–1180) — already good shape, but no headline/supporting variant distinction.
**Action:** Augment with `data-variant="headline|supporting"` selector that lifts headline value font-size to ~28px, applies `var(--font-display)`, and demotes supporting to ~18–20px. Per v4 §6.5–§6.6. **No new component needed**; CSS-only update. Stat strip already has the structure.

#### §6.7 Delta pill — **NEW**, per Section 1B.8.

#### §6.8 Inline editor — **NEW** atomic.
Propose new component [`src/components/ui/InlineEditor.tsx`](src/components/ui/InlineEditor.tsx) accepting `value`, `unit`, `onUpdate`, `onEdit`, `onDelete`. Used on Goals, Habits, Body Metrics. Replaces the bespoke "current value + Update + Edit + Delete" patterns currently inlined on those screens.

#### §6.9 Deadline urgency text — **NEW** styling per Section 1B.10 plus a small helper [`src/lib/deadlineUrgency.ts`](src/lib/deadlineUrgency.ts) returning `{ urgency: "overdue" | "imminent" | "soon" | "distant" | "none", label: string }` from a date.

#### §6.10 Stale-data text — **NEW** styling per Section 1B.10 plus helper [`src/lib/staleData.ts`](src/lib/staleData.ts) returning `{ staleness: "fresh" | "aging" | "stale", label: string }`.

#### §6.11 Target-progress bar — **NEW** component [`src/components/ui/TargetProgressBar.tsx`](src/components/ui/TargetProgressBar.tsx) accepting `current`, `target`, optional unit, computing variance.
**Existing related:** [`MacroBars`](src/components/ui/MacroBars.tsx), [`NutritionRing`](src/components/ui/NutritionRing.tsx), `fc-progress-track`/`fc-progress-fill` (lines 667–679, hardcoded cyan→success gradient — **wrong** per v4 §6.11). Migrate existing callers in Phases 5–6.

#### §6.12 Variance pill — **NEW**, per Section 1B.8.

#### §6.13 Quote zone (coach voice) — **NEW** style per Section 1B.12.

#### §6.14 Self-authored note — **NEW** style per Section 1B.11.

#### §6.15 Priority pill — **NEW**, per Section 1B.8.

#### §6.16 System tag — **NEW** style per Section 1B.8.
**Existing:** `fc-pill` (lines 595–607) is generic. Existing tag use across pages mixes Tailwind utility colors. Migrate to `.tag-system` for block-types, muscle groups, exercise categories.

#### §6.17 Status tag — **NEW** style per Section 1B.8 (`.tag-status[data-status=…]`).

#### §6.18 Tier badge / rank badge — **NEW** style per Section 1B.8.
Propose `<TierBadge tier="bronze|silver|gold|platinum" />` component co-located with achievements: [`src/components/ui/TierBadge.tsx`](src/components/ui/TierBadge.tsx).

#### §6.19 Rarity pill — **NEW** style per Section 1B.8.

#### §6.20 Buttons — **NEW** classes per Section 1B.5.
**Existing:** `fc-btn-primary` (cyan), `fc-btn-secondary` (glass), `fc-btn-ghost` (transparent), `fc-btn-destructive` (red). v4 maps:
- `fc-btn-primary` → keep name but **redirect to lime gradient** OR introduce `btn-action` and migrate. Decision flagged 3E.
- `fc-btn-secondary` → keeps. Maps to v4 secondary.
- `fc-btn-ghost` → keeps. Maps to v4 `btn-ghost-icon` (close enough; rename optional).
- `fc-btn-destructive` → keeps. Used only for "Delete this thing" confirmation buttons per v4 §11 status discipline.
- **NEW:** `btn-action`, `btn-action-sm`, `btn-success`, `btn-pill`, `btn-ghost-icon`, `btn-ghost-icon-sm`.

#### §6.21 FAB — **NEW** class `.fab-action` per Section 1B.6.
**Existing:** `.fc-fab` (lines 441–463) — RED. **MUST be rewritten** in Phase 0. Keeps name, swaps to lime per v4 §17 anti-pattern #13.

#### §6.22 Inputs — **NEW** class `.input-cell` per Section 1B.7.
**Existing:** `fc-input/select/textarea` (lines 347–354) — generic glass-style inputs. **Different shape** from v4 input-cell (which has display-font numeric value + label row). Both can coexist: keep `fc-input/select/textarea` for text inputs; use `.input-cell` for numeric trackers (weight, reps, target days).

#### §6.23 Bottom nav
**Existing:** [`src/components/layout/BottomNav.tsx`](src/components/layout/BottomNav.tsx) + `fc-bottom-nav-float`/`-inner`/`-item`/`-pill` classes (lines 866–989). Active color = `text-cyan-400` (line 155). **Already correct per v4 §6.23** (active = cyan, never lime). Center "Train" button is currently a `fc-bottom-nav-center-button` cyan-filled circle with cyan ring pulse; v4 doesn't explicitly forbid this (it's not a CTA button, it's nav). **Keep**.
**Action:** Replace inline `text-cyan-400` (lines 155, 166) with `text-[color:var(--fc-accent-cyan)]` token. Replace `text-gray-500` (lines 157, 168) with `var(--fc-text-dim)`/`var(--fc-text-subtle)` to honor v4 §1.2 "color is structural, not decorative."

#### §6.24 Progress indicators
**Existing:** `fc-progress-track`/`-fill` (cyan→success gradient — wrong per v4 §6.24, should be lime gradient for linear progress); `fc-gauge-*` (lines 1091–1135 for ring); `fc-activity-bar` (lines 1316–1332).
**Action:** Add `.fc-progress-fill-action` variant using lime gradient. The `fc-gauge-fill` already accepts arbitrary stroke; ring color logic is per-screen.

#### §6.25 Eyebrows + section headers
**Existing:** [`SectionHeader`](src/components/client-ui/SectionHeader.tsx) component (uppercase tracking-widest).
**Action:** Verify it supports the three v4 patterns (greeting eyebrow with pulse dot, section header with link, sub-eyebrow inside cards). If not, augment with optional `pulse?: boolean` prop and `variant="page" | "section" | "sub"`.

#### §6.26 Frequency selector — **NEW**.
Propose [`src/components/ui/FrequencySelector.tsx`](src/components/ui/FrequencySelector.tsx). Could be a thin wrapper over `<select>` with the v4 input-cell styling.

#### §6.27 Step counter — **NEW**.
**Existing:** [`stepper`](src/components/ui/stepper.tsx) — verify it matches v4 step-counter shape (done/active/upcoming with checkmark/cyan-tinted/ghost). If not, augment.

#### §6.28 Difficulty rating — **NEW** style per Section 1B.13. Tiny CSS, no component needed.

#### §6.29 Session summary stat strip
This is just §6.6 with conventional fitness labels (Workouts/Hours/Volume/New PRs/Streak). **No new atomic; document as a usage of §6.6.**

#### §6.30 Per-week mini-grid — **NEW**.
Propose [`src/components/ui/WeekMiniGrid.tsx`](src/components/ui/WeekMiniGrid.tsx) accepting an array of `{ value, label }`.

#### §6.31 Per-set table — **NEW**.
Probably a simple inline pattern using `<table>` + `var(--font-mono)` for set numbers + `var(--font-display)` for weight×reps. May not need a component; document as a CSS class set `.set-table`.

#### §6.32 Banner — **NEW**.
**Existing:** [`ErrorBanner`](src/components/ui/ErrorBanner.tsx) (specific to errors). Propose generalized [`src/components/ui/Banner.tsx`](src/components/ui/Banner.tsx) with `variant="info|warning|success|error"`.

#### §6.33 Tab strip
**Existing:** [`CoachClientTabBar`](src/components/coach/CoachClientTabBar.tsx); also [`AnalyticsNav`](src/components/coach/AnalyticsNav.tsx); `tabs` from shadcn ([`src/components/ui/tabs.tsx`](src/components/ui/tabs.tsx)).
**Action:** Audit all three — they should converge on cyan underline + primary text active state per v4 §6.33. Likely all three already do; verify in Phase 0.

#### §6.34 Filter pill row — **NEW** class set per Section 1B.14. Build [`src/components/ui/FilterPills.tsx`](src/components/ui/FilterPills.tsx) wrapper.

#### §6.35 Empty section state
**Existing:** [`EmptyState`](src/components/ui/EmptyState.tsx). Likely covers v4 §6.35; verify it supports `variant="encouraging" | "celebratory" | "setup"` (or close equivalents) and that copy never says "No data found." per v4 explicit prohibition.

#### §6.36 Archive section — **NEW** style per Section 1B.17. No component needed; pattern is `<section className="archive-section">`.

#### §6.37 Add-item placeholder — **NEW** class per Section 1B.15.

### D. Atmospheric backdrop wrapper

> **Critical structural decision.**

Per v4 §3, every screen has one of five **static** radial-gradient backdrops driven by *what role the screen plays* (action / information / warning / achievement). Per the current code, every screen wraps in [`AnimatedBackground`](src/components/ui/AnimatedBackground.tsx) which renders a **time-of-day** animated gradient.

**Two options:**

1. **Replace `AnimatedBackground` with a v4-aligned `AtmosphericBackdrop`** that picks one of five static backdrops based on a `variant` prop set by the screen's recipe. The existing time-of-day system would be retired.

2. **Layer**: keep `AnimatedBackground` (as the page-level color wash) but add a per-screen `<AtmosphericBackdrop variant="action-top" />` overlay inside `ClientPageShell` / `CoachPageShell` that paints the focal radial-gradient on top.

> **Recommendation:** Option 2 (layered) is lower-risk for Phase 0. The time-of-day gradient is a beloved feature (per the screen-inventory's "verify-done" notes) and removing it touches every screen. Adding a focal lime/cyan/warning/gold halo on top is additive.

**Proposed:**
- New component [`src/components/ui/AtmosphericBackdrop.tsx`](src/components/ui/AtmosphericBackdrop.tsx) with `variant: "action-top" | "action-bottom" | "info" | "warning" | "achievement"`.
- Plumb `backdrop` prop into [`ClientPageShell`](src/components/client-ui/ClientPageShell.tsx) and [`src/components/coach-ui/CoachPageShell.tsx`](src/components/coach-ui/CoachPageShell.tsx) — default to `"info"` so unmodified callers get a calm cyan halo, never a lime CTA halo. Each screen overrides per its v4 recipe (§13).
- The `.fc-grain-layer` (existing lines 210–217) is already global per v4 §3 noise overlay — keep as-is.

> **`[verify]` flag:** the user must approve which option (1 vs 2). Logged in Section 3D.

### E. Phase 0a completion criteria (additive only)

All must be true before Phase 0b starts. Nothing in this list modifies existing code, renames existing classes, or touches existing callers.

1. **New tokens added** to `:root` and `.dark` blocks of [`src/styles/ui-system.css`](src/styles/ui-system.css) per Section 1A. Per the light-theme policy (Section 1A callout): `:root` values mirror `.dark` and are flagged `[verify-light-theme]`. No existing token is changed.
2. **New utility classes added** per Section 1B (B.1 through B.17). The new `.fc-card-status-{warning,error,success,info}`, `.btn-action`, `.fab-action`, `.input-cell`, `.target-bar`, etc. coexist with the old classes. The old `.fc-attention-*`, `.fc-fab`, `.fc-btn-primary` rules are **untouched in Phase 0a**.
3. **`AtmosphericBackdrop` component** built per Section 1D (Option 2 — layered). The component exists and renders correctly inside the `/dev/v4-lab` showcase. **It is NOT yet wired into `ClientPageShell` / `CoachPageShell` in Phase 0a** — that wiring is a Phase 0b decision because it changes a shared component used by all screens.
4. **New atomic components built** as additive files only: `HeroActionCard`, `InlineEditor`, `TargetProgressBar`, `TierBadge`, `FrequencySelector`, `WeekMiniGrid`, `Banner`, `FilterPills`. Helper libraries: `deadlineUrgency.ts`, `staleData.ts`. Each is a new file at the proposed path; no existing component is modified.
5. **Existing-component verification against v4** is performed READ-ONLY in Phase 0a. Cursor reads `BottomNav`, `SectionHeader`, `EmptyState`, `stepper`, `CoachClientTabBar`, `AnalyticsNav`, `MacroBars`, `ClientGlassCard`, `AnimatedBackground` and produces a per-component compliance report (in chat or in `docs/ui-rollout-notes.md`). **No edits to those components in Phase 0a** — any required edits move to Phase 0b.
6. **`/dev/v4-lab` showcase page** built that renders every new atomic side-by-side for visual confirmation. **Required, not optional**, in the new Phase 0a/0b split — it's the only way to validate the new atomics before any caller is migrated.
7. **Lints clean** on all newly created files.
8. **Section 0 of this doc** — "Contradictory UI docs" plus the user-approved override list (A.1) — is reviewed with the user; the user has explicitly approved which contradicting docs are sidelined and which are kept.

> **Phase 0a guarantee:** at the end of Phase 0a, the running app behaves exactly as it did before Phase 0a, because nothing existing was changed. Only `/dev/v4-lab` (a new route) and new files exist. If something breaks, the new code is the only suspect.

### F. Phase 0b — Migration decisions (each requires audit-first, user approval, then migration)

Each of the five migration items below follows the same process:

1. **Usage-audit grep.** Find every call site of the artefact in the codebase. Output a categorized list (path + line + role).
2. **Per-call-site categorization.** Tag each call site with its semantic role per v4 (CTA / system / decorative / structural).
3. **Migration plan.** Propose the per-call-site migration: which call sites change to which v4 atomic/class, and which (if any) keep the old class because their role is legitimate.
4. **User approval.** The plan is presented to the user. **No migration begins without explicit approval.**
5. **Migration.** Per-screen, per-component migration is executed in scope-disciplined batches (Section 6.E).
6. **Verification.** After each batch, the running app is verified against the unchanged screens to ensure no regression.

#### F.1 — `.fc-fab` (red → lime)

- **Item:** [`src/styles/ui-system.css`](src/styles/ui-system.css) lines 441–463 currently render the FAB in red. v4 §6.21 / §17 anti-pattern #13 requires lime.
- **Audit:** grep `fc-fab` across `src/` to enumerate every caller (likely Goals, Habits, possibly Body Metrics — confirm).
- **Categorization:** confirm every caller treats the FAB as a creative/additive action (per v4 §6.21). If any caller treats it as destructive, that is a **separate bug** that needs design review before the rule is rewritten.
- **Migration:** rewrite `.fc-fab` rule to lime per Section 1B.6, OR add `.fab-action` (Phase 0a) and migrate callers individually. User chooses.
- **Recovery note:** because the rule change is a single CSS edit, recovery is by user-controlled means per Section 6.A.

#### F.2 — `.fc-btn-primary` (audit-first per Amendment 6)

- **Item:** [`src/styles/ui-system.css`](src/styles/ui-system.css) lines 315–328 render the cyan gradient currently treated as the app-wide primary. v4 §2.10 says cyan is system, never CTA.
- **Audit:** grep all `.fc-btn-primary` usage in `src/`. Categorize each call site as either **(a) CTA** → migrates to `btn-action` (lime), or **(b) system-cyan** → migrates to `btn-pill` or remains as a cyan element under a different class.
- **Categorization output is a deliverable** — share with the user before any migration.
- **Migration:** per-call-site, in batches grouped by feature area.
- **Explicitly NOT done:** redirecting the existing rule globally. (That earlier idea is rejected per Amendment 6.)

#### F.3 — `.fc-attention-*` (fill-only) → `.fc-card-status-*` (fill + tinted border)

- **Item:** [`src/styles/ui-system.css`](src/styles/ui-system.css) lines 555–593. v4 §6.2 needs both background tint AND a tinted border. Current rules have fill only.
- **Audit:** grep `fc-attention-` across `src/` to enumerate callers.
- **Categorization:** for each caller, determine whether the v4 status-tinted-card semantic applies (yes → migrate to `.fc-card-status-*`) or whether it was being used for a different visual purpose (no → flag for design review).
- **Migration:** per-caller, in batches.

#### F.4 — `ClientGlassCard` (defaults to prescription-shell `fc-card-shell`)

- **Item:** [`src/components/client-ui/GlassCard.tsx`](src/components/client-ui/GlassCard.tsx) wraps content in `fc-card-shell` (prescription-shell with cyan accent). v4 §6.1 default is plain `fc-surface`.
- **Audit:** grep `ClientGlassCard` callers across `src/`. The blast radius is large — likely most client surfaces.
- **Categorization:** for each call site, decide whether the card needs a meaningful left accent (some Goals/Habits do; most don't). Most call sites should migrate to plain `fc-surface`. A subset stays with a v4 status-tinted variant for semantic accent.
- **Migration:** **deliberately staged across phases.** Not a single Phase 0b edit. Each screen's conversion (Phase 1 onward) carries the responsibility for migrating its own `ClientGlassCard` callers as part of that screen's atomic-application pass. Phase 0b's job is only the audit + categorization + migration plan.

#### F.5 — `AnimatedBackground` (time-of-day) vs v4 §3 (role-based backdrops)

- **Item:** [`src/components/ui/AnimatedBackground.tsx`](src/components/ui/AnimatedBackground.tsx) renders a time-of-day gradient. v4 §3 specifies role-based backdrops.
- **Decision required:** Option 1 (replace) vs Option 2 (layer) per Section 1D. Default recommendation: Option 2 (layered) — additive, lower risk, preserves the time-of-day feature.
- **Audit:** identify every screen / shell that wraps in `AnimatedBackground`. Confirm Option 2 layering can apply at the shell level without per-screen edits.
- **Migration (Option 2):** wire the new `AtmosphericBackdrop` (built in Phase 0a) into `ClientPageShell` and `CoachPageShell` with default `info` variant. Each Phase 1+ screen overrides per its v4 recipe. `AnimatedBackground` itself is not modified.
- **Migration (Option 1, if user picks it):** retire `AnimatedBackground`, unwind theme-context dependencies, replace per-shell. Significantly more work; flagged risk.

### G. Phase 0b completion criteria

All must be true before Phase 1 starts:

1. F.1 through F.5 each have an **audit + categorization + user-approved migration plan** in writing (in `docs/ui-rollout-notes.md`).
2. F.1 (FAB) migration is complete OR explicitly deferred to Phase 4 (where the FAB lives, on Goals/Habits) with user approval.
3. F.2 (btn-primary) audit and categorization are complete; migration is staged across Phases 1–8 per user-approved plan.
4. F.3 (attention) audit is complete; migration staged.
5. F.4 (ClientGlassCard) audit + categorization are complete; per-screen migration is staged into the relevant phases.
6. F.5 (atmospheric backdrop) decision is made; if Option 2, the shell wiring is done.
7. The user has visually reviewed `/dev/v4-lab` against the proposed v4 atomics.
8. Cursor's drift self-check (Section 6.B) is run against Phase 0 (which atomics, tokens, principles were applied; what was deferred to Phase 0b instead of done).

> **Why this matters:** v4 §16.1 step 4 ("Atomic application pass") is the consistency-enforcement step. Without these atomics ready, Cursor cannot reliably apply v4 across 75+ screens — each screen would invent its own version, defeating §1.10 ("atomics are the unit of reuse") and §16.2 ("anti-cargo-culting rules"). The 0a/0b split makes the foundation safe to build (0a) before it becomes risky to migrate (0b).

---

═══════════════════════════════════════════════
## SECTION 2 — Per-Screen Conversion Plan
═══════════════════════════════════════════════

> **Convention:** every screen has the same template. Phases 1, 2, and 3 are fully expanded (per user decision 2026-04-26). Phases 4–10 remain listed compactly for now and will be expanded in detail at the start of each phase. Per user instruction, all Sections 1–5 are present for every screen even if light.

### Pre-conversion screen audit (MANDATORY before any screen converts)

Before the first screen of each phase begins conversion, Cursor must perform a **Pre-conversion screen audit** for that screen. The audit produces an authoritative inventory of the screen's actual backend-connected elements by **reading the file directly**.

The audit MUST capture:

- **Data fetches.** Every Supabase query, REST call, hook (`useQuery`, custom data hooks), and direct context read that supplies content to the screen. Cite line numbers.
- **Mutations.** Every write (`update`, `insert`, `delete`), modal-driven mutation, and inline editor save. Cite line numbers.
- **State.** Local state (`useState`, `useReducer`), context state, URL state (search params, route params), and any state lifted to a parent. Cite line numbers.
- **Props.** Every prop the page component reads from the route layer or passes down to children that participates in rendered output.
- **Side effects.** Every `useEffect`, debounced action, navigation push, optimistic UI update, achievement-toast trigger, etc.
- **Existing children that own backend hooks of their own.** When the page delegates to a large child (e.g. `EnhancedClientWorkouts`, `LiveWorkoutBlockExecutor`, `WeeklyCheckInFlow`, `OptimizedAnalyticsOverview`), audit the child too — at least to the depth of identifying which hooks exist.

The audit's purpose is to **replace** the "Backend-connected elements to preserve" list in this rollout plan, which is best-guess. The audit's findings are the authoritative list.

Audit output is captured in **one** of two ways (user chooses per screen):

1. **Append to this plan** as a sub-section under the screen's entry — `Audit findings (YYYY-MM-DD):`
2. **Capture in chat and confirm by user** — the user pastes the audit summary back as approved, and Cursor proceeds.

**Conversion of the screen does not begin until the audit is complete and confirmed.** Per v4 §1.6, no backend-connected element may be silently dropped — the audit is the only way to enforce that rule honestly.

> **Definition-of-done checklist (the v4 contract):** the user-supplied list of 21 checkboxes is **identical for every screen**. To avoid duplicating it 75+ times, the contract is captured **once below**, then each screen's "Definition of done" section just lists screen-specific exceptions.

### The v4 universal Definition-of-done contract (applies to every screen)

This screen is converted when ALL of the following are true:

1. [ ] All hardcoded colors replaced with `--fc-*` tokens (no `text-white`, `text-black`, `text-cyan-{300,400,500}`, `text-gray-{400,500,600}`, `bg-white/[0.0x]`, `border-white/{5,10}`, `bg-cyan-*`, `from-cyan-*`, `to-cyan-*`, etc.).
2. [ ] All atomics from this screen's "Atomics used" section applied as canonical components/classes from §6 (no per-screen reimplementations).
3. [ ] Atmospheric backdrop applied per §3 (the screen's recipe assigns one of: action-top, action-bottom, info, warning, achievement).
4. [ ] All CTAs are lime (`var(--fc-accent-lime)`) via `btn-action` / `fab-action` — **not** cyan/teal (§2.10, §6.20).
5. [ ] Bottom-nav active state remains cyan (§6.23) — verified via `BottomNav` component, no per-page override.
6. [ ] No descriptive subtitle banner under the page title (§12.6).
7. [ ] No decorative color tiles on stat cards (§1.9, §6.5–6.6) — color tied to meaning or stripped.
8. [ ] One headline metric per stat strip (§1.8, §6.6).
9. [ ] No red text on stale data ≤60 days (§6.10).
10. [ ] No red text on deadlines unless overdue (§6.9).
11. [ ] One primary lime CTA visible at a time (§6.20).
12. [ ] FAB (if present) is lime via `fab-action`, **not** red (§6.21, §17 anti-pattern #13).
13. [ ] No status-tinted card combined with status-stripe row (§6.2 — pick one signal per card).
14. [ ] Macro bars (if present) colored by variance, **not** identity (§6.11, §2.9).
15. [ ] All backend-connected elements from the screen's pre-conversion inventory still present (§1.6 — none silently dropped).
16. [ ] Atomic decomposition matches v4 §14 Application Matrix.
17. [ ] Block-type tags (if a workout screen) are cyan via `tag-system`, **not** yellow (§17 anti-pattern #3).
18. [ ] Every Cursor-introduced component on this screen reuses Phase 0 atomics — not a one-off reinvention (§16.2 Rule 3).
19. [ ] All `[verify]` flags from v4 affecting this screen are resolved or escalated to the user (no silent assumptions).
20. [ ] Visual review: the screen feels athletic, has hierarchy, uses color with restraint (§1.1, §1.11).
21. [ ] Lints clean; no regressions to data flow, queries, or routes (per the existing user rules in `.cursor/rules`).

> Each screen's "Definition of done — exceptions" subsection below lists only the items above that **don't apply** to that screen (e.g. "no FAB on this screen — item 12 N/A"), or any **screen-specific extra checks** layered on top.

---

## PHASE 1 — High impact, low risk (per v4 §19 Phase 1)

### 1.1 — `/client` (Client Home)

- **Screen path:** `/client`
- **File path:** [`src/app/client/page.tsx`](src/app/client/page.tsx)
- **Phase:** 1
- **Recipe applied:** §13.1 Action-Hero screen
- **v4 §14 row:** Client Home

**Atomics used:**
- §6.4 Hero (action) card — primary daily moment + primary CTA ("Start Training" / "Log Check-in" depending on state)
- §6.6 Stat strip — 3 small stats; one headline (e.g. Athlete Score), two supporting (e.g. Streak, Today's Compliance)
- §6.5 Stat card — within the stat strip
- §6.20 Buttons — `btn-action` for primary, `btn-secondary` for "View Plan", `btn-ghost-icon` for header bell
- §6.23 Bottom nav (inherits)
- §6.24 Progress indicators — Athlete Score ring (composite §7.1)
- §6.25 Eyebrows + section headers — page greeting eyebrow ("Up next · Day 1 of 4") + per-section headers
- §6.17 Status tag — current program status, today's workout state
- §6.32 Banner (if first-time setup nudge)
- §6.35 Empty section state (rest day variant — celebratory)

**Composites used:**
- §7.1 Athlete Score hero — the central feature of this screen
- §7.9 Coaching Insights & Quick Actions — `[verify]` whether this composite belongs on Client Home or only Coach Home; Application Matrix (§14) doesn't list it for Client Home, so likely **not** here. Flag.

**New atomics needed:** None (all covered by §6).

**Backend-connected elements to preserve** (per §1.6, none can be silently dropped — to be enumerated by Cursor in the audit pass before conversion; from a quick read of the inventory, this is the benchmark file at 9.1, so the backend reads include: Athlete Score components (Train/Check-in/Daily/Nutrition), today's program assignment, weekly compliance, current program week/day):
- Athlete Score read + tier classification (per existing `client-ui/AthleteScoreRing` and `ScoreBreakdown` components)
- Today's workout assignment (program_id + week/day)
- Current program metadata (name, week X of Y)
- Weekly check-in status
- Today's nutrition plan (if assigned)
- Streak count
- Greeting based on user.first_name + time of day
- Notification bell (count/state)

**Anti-patterns from §17 currently present on this screen:**
- #1 No atmospheric backdrop differentiated by role (currently uses time-of-day `AnimatedBackground` only) — fix via §3 + Phase 0 `AtmosphericBackdrop` variant `action-top`
- #2 CTAs are cyan/teal, not lime — fix via `btn-action`
- #5 Status colors used decoratively on stat tiles (likely — verify) — fix per §1.9
- #6 Stale data possibly painted red on streak/last-check-in — fix per §6.10
- #7 Multiple competing CTAs — verify; v4 wants one primary lime visible at a time

**`[verify]` flags relevant:**
- v4 §3 backdrop: confirm `action-top` variant for this screen (likely yes; the screen's primary moment is "Start Training" at the top).
- v4 §7.1 component count: 3 (Train/Check-in/Daily) when nutrition not configured, 4 (+ Nutrition) when configured — implementation must read the user's nutrition-plan-assignment state.

**Definition of done — exceptions:**
- All 21 contract items apply.
- Item 17 (block-type tags cyan) — N/A on Home unless today's workout preview shows a block-type tag (it shouldn't; that's Workout Exec).
- Extra: This is the v3 9.1-graded benchmark and a high-traffic screen. Per v4 §1.4 "information density with room to breathe" — visual review must confirm no degradation in density or scannability.

---

### 1.2 — `/client/workouts/[id]/start` (Workout Execution — Straight Set baseline)

- **Screen path:** `/client/workouts/[id]/start`
- **File path:** [`src/app/client/workouts/[id]/start/page.tsx`](src/app/client/workouts/[id]/start/page.tsx)
- **Phase:** 1
- **Recipe applied:** §13.3 Single-task-focus screen + §13.7 Live/timer screen for time-bound blocks
- **v4 §14 row:** Workout Exec

**Atomics used:**
- §6.4 Hero (action) card — when LOG SET is the dominant action, prescription card uses action variant
- §6.5 Stat card / §6.6 Stat strip — target panel (target reps, target weight, RPE target)
- §6.13 Quote zone — coach notes appearing in the prescription
- §6.16 System tag — block-type tag (Straight Set / Drop Set / Superset / etc.) — must be **cyan** (§17 anti-pattern #3)
- §6.20 Buttons — `btn-action` for "LOG SET" / "DONE CLUSTER N" / "END AMRAP" with v4 §12.5 block-aware copy
- §6.22 Inputs — `input-cell` for weight/reps/RPE/intra-set rest
- §6.23 Bottom nav — **hidden** on this route per `BottomNav.tsx` line 93 (verified)
- §6.24 Progress indicators — segment bar across exercises (4 × 26×3px, lime when active)
- §6.25 Eyebrows + section headers — "PREVIOUS SESSION", "YOUR TARGET TODAY", "LOG SET"
- §6.31 Per-set table — review what you logged within this exercise

**Composites used:**
- §7.2 Workout block prescription card — per block type (12 types listed in v4 §7.2)

**New atomics needed:** None.

**Backend-connected elements to preserve:**
- Workout assignment + program week/day
- Block configuration (block_type, exercises, sets_target, reps_target, rest)
- Per-set logs (workout_logs table per the user-rule "workout_logs represent completed workouts or sets")
- Live timer state (intra-set rest, cluster rest)
- Previous session reference (last completion of same exercise)
- Coach notes attached to block / exercise
- Exercise icon visuals via `getExerciseVisuals()` (existing helper)
- Pause/resume of session
- "Mark complete" terminating action

**Anti-patterns from §17 currently present:**
- #2 CTAs are cyan, not lime — fix
- #3 Block-type tags use mustard/orange — fix to cyan
- #4 Generic typography on exercise names + KPIs — fix via display font for numbers, sans-bold for hero names
- #11 "+ Add exercise" purple — N/A on this screen

**`[verify]` flags:**
- v4 §18.5 Tabata block executor — `[verify]` log shape and target panel structure. Phase 1 covers Straight Set baseline only; other 11 block executors are Phase 3 per v4 §19.
- v4 §13.7 Live/timer — applies during AMRAP/EMOM/For Time/Tabata blocks; for Straight Set, §13.3 single-task-focus is the right recipe.

**Definition of done — exceptions:**
- Item 5 (bottom-nav active = cyan) — N/A; bottom nav is **hidden** on this route (correct per §13.7 Live screen).
- Item 12 (FAB) — N/A; no FAB.
- Extra: All 12 block executors share the §7.2 composite. Phase 1 only does Straight Set; the **same atomic-application pass** must hold for the other 11 executors in Phase 3 — meaning every block-type tag goes cyan, every "LOG ___" CTA goes lime, every input cell uses §6.22.

---

### 1.3 — `/client/train` (Train Hub)

- **Screen path:** `/client/train`
- **File path:** [`src/app/client/train/page.tsx`](src/app/client/train/page.tsx)
- **Phase:** 1
- **Recipe applied:** §13.2 Information-Dominant screen
- **v4 §14 row:** Train

**Atomics used:**
- §6.5/§6.6 Stat card / strip — program progress (Week X of Y, % complete)
- §6.11 Target-progress bar — week-level compliance against target days
- §6.16 System tag — workout categories ("Strength", "Hypertrophy", "Cardio")
- §6.17 Status tag — workout state (Today / Upcoming / Completed / Skipped / Rest)
- §6.20 Buttons — `btn-action` "Start" only on today's workout; "View" / "Reschedule" as secondary
- §6.23 Bottom nav (inherits)
- §6.24 Progress indicators — week strip (16–18px circle dots) for daily completion
- §6.25 Eyebrows + section headers — eyebrow + "THIS WEEK" / "OTHER ACTIVITIES" / "RECENT"
- §6.35 Empty section state — when no program assigned (encouraging variant)

**Composites used:**
- None specific. The Active Program card and week strip use the atomics above; not a composite.

**Existing components on this screen:**
- [`ActiveProgramCard`](src/components/client/train/ActiveProgramCard.tsx) — verify it composes the atomics above and is not duplicating them
- [`ProgramCompletedCard`](src/components/client/train/ProgramCompletedCard.tsx) — celebratory empty state per §6.35

**New atomics needed:** None.

**Backend-connected elements to preserve:**
- Active program assignment + week/day cursor
- Per-day workout state for current week (today, completed, skipped, rest)
- Other Activities feed (logged cardio / activity entries)
- "Start Workout" button → routes to `/client/workouts/[id]/start`
- "Recent Activities" / "All Activities" footer link
- Program completion state (when finished — celebratory variant)

**Anti-patterns from §17 currently present:**
- #2 CTAs cyan not lime — fix
- #5 Status colors decorative — verify per-card colors are tied to status, not just decoration
- #8 Subtitle banner under page title — verify; if a "Train" subtitle exists, remove
- #16 Decorative pillar emoji icons — verify Other Activities aren't using emoji per §11.1

**`[verify]` flags:**
- §3 backdrop: `info` variant (information-dominant) confirmed — not action-top.

**Definition of done — exceptions:**
- All 21 contract items apply. Item 12 (FAB) likely N/A — no FAB on Train Hub.

---

### 1.4 — `/client/workouts` (Workouts Hub)

- **Screen path:** `/client/workouts`
- **File path:** [`src/app/client/workouts/page.client.tsx`](src/app/client/workouts/page.client.tsx) (the only `page.client.tsx`); delegate target [`src/components/client/EnhancedClientWorkouts.tsx`](src/components/client/EnhancedClientWorkouts.tsx) is where the real work lives.
- **Phase:** 1
- **Recipe applied:** §13.4 List-of-things screen
- **v4 §14 row:** Workouts Hub

**Atomics used:**
- §6.16 System tag — workout categories / muscle groups
- §6.17 Status tag — workout availability (Active / Completed / Library)
- §6.20 Buttons — `btn-action` only when "Start a workout right now" is the dominant CTA
- §6.23 Bottom nav (inherits)
- §6.25 Eyebrows + section headers — section per category
- §6.34 Filter pill row — by muscle group / category / difficulty
- §6.35 Empty section state — when no workouts available
- §6.21 FAB — `[verify]` whether v4 §14 puts a FAB here (matrix shows "X" for Coach Clients but not Client Workouts Hub — flag)

**Composites used:** None specific.

**New atomics needed:** None.

**Backend-connected elements to preserve:**
- Workout templates (assigned + library)
- Filters: category, difficulty, muscle groups, length
- Search input
- Per-workout: name, duration estimate, block summary, tags, last-completed
- Sort/order

**Anti-patterns from §17 currently present:**
- #2 CTAs cyan — fix
- #11 Buried primary actions — verify
- #16 Decorative emojis on category tiles — verify

**`[verify]` flags:**
- v4 §14 Application Matrix doesn't explicitly list FAB for Workouts Hub. If a "+ Create" or "+ Quick log" affordance is needed, it should be a `btn-action` in the page header, not a FAB. Confirm with user.

**Definition of done — exceptions:**
- Item 12 (FAB) — likely N/A on this hub. If kept, must be lime.
- Extra: Most of the work happens in [`EnhancedClientWorkouts.tsx`](src/components/client/EnhancedClientWorkouts.tsx). The page file itself is a 12-line wrapper — Phase 1 must edit the delegate, not just the route file.

---

> **PAUSE POINT after Phase 1.** Per v4 §19: "After Phase 1: pause, refine system to v5 if needed." Section 4 below codifies this pause.

---

## PHASE 2 — Designed patterns, untested screens (per v4 §19)

> **Phase 2 is now expanded to Phase-1 detail per user decision 2026-04-26.** Backend-connected elements lists below remain best-guess until the **Pre-conversion screen audit** (Section 2 intro) is performed for each screen.

### 2.1 — `/client/profile`

- **Screen path:** `/client/profile`
- **File path:** [`src/app/client/profile/page.tsx`](src/app/client/profile/page.tsx)
- **Phase:** 2
- **Recipe applied:** §13.2 Information-Dominant
- **v4 §14 row:** Profile (client)

**Atomics used:**
- §6.5 / §6.6 Stat card / strip — at-a-glance settings status (e.g. plan tier, member-since)
- §6.20 Buttons — predominantly `btn-secondary` and `btn-ghost-icon`; primary `btn-action` only when there's a single dominant edit moment
- §6.22 Inputs (`input-cell`) — for inline-editable fields (display name, height, weight, units)
- §6.23 Bottom nav (inherits)
- §6.25 Eyebrows + section headers — per-section ("ACCOUNT", "PREFERENCES", "UNITS", "DANGER ZONE")
- §6.32 Banner — info banner for unconfirmed email / unset fields if any
- §6.35 Empty section state — for unset sub-sections (encouraging variant)

**Composites used:** None specific.

**New atomics needed:** None.

**Backend-connected elements to preserve (best-guess; audit required):**
- User profile read (display name, email, units, timezone, time-of-day preferences)
- Avatar upload / preview
- Password change flow (if surfaced here)
- Sign-out action
- Theme preference toggle (`useTheme()`)
- Performance settings toggles (animated background, reduced motion)
- Subscription / plan tier read

**Anti-patterns from §17 currently present:**
- #1 atmospheric backdrop not differentiated by role (currently `AnimatedBackground` only) — fix via `info` backdrop variant
- #2 CTAs cyan, not lime — fix
- #5 status colors used decoratively on stat tiles (verify)
- #11 buried primary actions (verify; profile screens often hide "Save" at bottom)

**`[verify]` flags relevant:**
- §3 backdrop: `info` variant.
- Light-theme handling: per Section 1A policy, deferred.

**Definition of done — exceptions:**
- Item 12 (FAB) — N/A; no FAB on profile.
- Item 17 (block-type tags) — N/A.
- Extra: Profile is mostly form fields. Apply §6.22 input-cell discipline strictly; resist the temptation to wrap each field in an `fc-card-shell`.

---

### 2.2 — `/client/check-ins` (Hub)

- **Screen path:** `/client/check-ins`
- **File path:** [`src/app/client/check-ins/page.tsx`](src/app/client/check-ins/page.tsx)
- **Phase:** 2
- **Recipe applied:** §13.2 Information-Dominant (with a single primary CTA when a check-in is due)
- **v4 §14 row:** Check-ins

**Atomics used:**
- §6.4 Hero (action) card — only when "Start weekly check-in" is the dominant moment (i.e. due / overdue); otherwise no hero
- §6.6 Stat strip — compliance %, streak, last-check-in
- §6.10 Stale-data text — "Last check-in 4 days ago" (neutral; per §6.10, NOT red unless overdue per the `staleData.ts` helper)
- §6.17 Status tag — current week status (Pending / Submitted / Skipped)
- §6.20 Buttons — `btn-action` lime only on the "Start weekly check-in" CTA when due; otherwise secondary
- §6.23 Bottom nav (inherits)
- §6.25 Eyebrows + section headers — eyebrow ("THIS WEEK") + "RECENT CHECK-INS"
- §6.34 Filter pill row — for history filter (if surfaced from this hub)
- §6.35 Empty section state — when no check-ins yet (encouraging)

**Composites used:** None specific.

**New atomics needed:** None.

**Backend-connected elements to preserve (best-guess; audit required):**
- Current week's check-in state (pending / submitted / skipped)
- Compliance % over rolling window
- Streak
- Last-check-in timestamp
- Recent check-ins feed (paginated)
- "Start weekly check-in" → routes to `/client/check-ins/weekly`
- "View history" → routes to `/client/check-ins/history`

**Anti-patterns from §17 currently present:**
- #2 cyan CTAs — fix
- #6 stale data painted red on "X days ago" — fix per §6.10
- #8 descriptive subtitle banner under page title — verify and remove if present

**`[verify]` flags relevant:**
- §3 backdrop: `action-top` if a CTA is due; `info` otherwise. Decide per render state.
- §6.10 staleness thresholds (fresh ≤ 7d, aging 7–60d, stale > 60d) — confirm with user during conversion.

**Definition of done — exceptions:**
- Item 12 (FAB) — N/A.
- Item 17 — N/A.
- Extra: dual-state screen — user reviews both "due" and "not due" rendering.

---

### 2.3 — `/client/programs/[id]/details`

- **Screen path:** `/client/programs/[id]/details`
- **File path:** [`src/app/client/programs/[id]/details/page.tsx`](src/app/client/programs/[id]/details/page.tsx)
- **Phase:** 2
- **Recipe applied:** §13.5 Detail
- **v4 §14 row:** Program detail (client)

**Atomics used:**
- §6.6 Stat strip — program % complete (headline), weeks total, sessions/week (supporting)
- §6.11 Target-progress bar — program % complete
- §6.13 Quote zone — coach notes attached to the program (when present)
- §6.17 Status tag — Active / Paused / Completed (per §9.6 Pause states)
- §6.20 Buttons — `btn-secondary` for "View week" / "Switch program"; `btn-action` for "Start today's workout" if applicable
- §6.23 Bottom nav (inherits)
- §6.24 Progress indicators — per-week and per-day grid
- §6.25 Eyebrows + section headers — "PROGRAM OVERVIEW", "WEEK X — Y", etc.
- §6.30 Per-week mini-grid — week-by-week dot grid

**Composites used:** None new; v4 §9.6 Pause states define the visual treatment for paused programs.

**New atomics needed:** None.

**Backend-connected elements to preserve (best-guess; audit required):**
- Program metadata (name, description, weeks, sessions/week)
- Per-week / per-day workout list
- Current cursor (week X day Y)
- Pause / resume state
- Coach attribution + coach notes (if any)
- Program completion state
- "Switch program" / "Pause program" / "Resume" actions
- Routes back to `/client/train` and forward to `/client/workouts/[id]/start`

**Anti-patterns from §17 currently present:**
- #1 backdrop — apply `info`
- #2 cyan CTAs — fix
- #5 decorative color tiles on stat cards (verify)

**`[verify]` flags relevant:**
- §9.6 Pause states (Programs) — "neutral or amber left-bar" needs visual confirmation against this screen's actual Pause UI.
- §3 backdrop: `info`.

**Definition of done — exceptions:**
- Item 12 (FAB) — N/A.
- Item 17 — N/A unless an embedded today's-workout preview shows block-type tags.
- Extra: pause/resume rendering must be reviewed in both states.

---

### 2.4 — `/client/workouts/[id]/details`

- **Screen path:** `/client/workouts/[id]/details`
- **File path:** [`src/app/client/workouts/[id]/details/page.tsx`](src/app/client/workouts/[id]/details/page.tsx) (1692 lines)
- **Phase:** 2
- **Recipe applied:** §13.5 Detail
- **v4 §14 row:** Workout detail (client, non-active)

**Atomics used:**
- §6.5 / §6.6 Stat strip — duration estimate, total volume, total sets (one headline)
- §6.13 Quote zone — coach notes attached to the workout / blocks
- §6.16 System tag — block-type tags **CYAN** (§17 anti-pattern #3 fix)
- §6.20 Buttons — `btn-action` lime "Start workout"; secondary for "View previous session"
- §6.23 Bottom nav (inherits)
- §6.25 Eyebrows + section headers — per-block headers
- §6.31 Per-set table — preview of recent sessions on each exercise (if rendered)
- §6.32 Banner — info banner (e.g. "Last completed 4 days ago")

**Composites used:**
- §7.2 Workout block prescription card — non-active variant (preview-mode rendering of each block, no "LOG SET" buttons)

**New atomics needed:** None.

**Backend-connected elements to preserve (best-guess; audit required):**
- Workout template metadata (name, duration estimate, difficulty, tags)
- Per-block configuration (block_type, exercises with sets_target, reps_target, rest, RPE)
- Per-exercise visuals (icon set)
- Previous session reference (last completion of this workout)
- Coach notes
- "Start workout" action → `/client/workouts/[id]/start`
- "View previous session" → `/client/progress/workout-logs/[logId]`

**Anti-patterns from §17 currently present:**
- #1 atmospheric backdrop — apply `info`
- #2 cyan CTAs — fix to lime
- #3 yellow block tags — fix to cyan
- #4 generic typography on exercise names + KPIs — fix per §10
- #11 buried primary actions (verify)

**`[verify]` flags relevant:**
- §18.5 Tabata block executor — preview rendering may differ; verify when audit reaches Tabata blocks.
- §3 backdrop: `info`.

**Definition of done — exceptions:**
- Item 12 (FAB) — N/A.
- Extra: This is a 1692-line file. The audit pass (§16.1 step 1 + Section 2 mandatory pre-conversion audit) is the critical gate. Backend hook drop risk is highest here.

---

### 2.5 — `/client/workouts/[id]/complete`

- **Screen path:** `/client/workouts/[id]/complete`
- **File path:** [`src/app/client/workouts/[id]/complete/page.tsx`](src/app/client/workouts/[id]/complete/page.tsx) (1948 lines)
- **Phase:** 2
- **Recipe applied:** §13.5 Detail (celebratory variant on success path; informational fallback on partial completion)
- **v4 §14 row:** Workout completion (client)

**Atomics used:**
- §6.4 Hero (action) card — celebratory hero when PRs were set or session was completed in full
- §6.7 Delta pill — per-set delta vs target (e.g. "+2 reps over plan")
- §6.14 Self-authored note — session reflection field (italicized, dashed left border)
- §6.18 Tier badge — when achievements unlock at PR thresholds
- §6.19 Rarity pill — when achievements unlock
- §6.20 Buttons — `btn-action` lime "Done" / "Save reflection"; secondary "Share" / "View history"
- §6.23 Bottom nav (inherits)
- §6.28 Difficulty rating — user's session rating
- §6.29 Session summary stat strip — Workouts / Hours / Volume / New PRs / Streak
- §6.31 Per-set table — full set history for the session
- §6.35 Empty section state — celebratory variant for "no PRs this session, but you're showing up"

**Composites used:**
- §7.5 Achievement card — when achievements unlocked (§3 backdrop variant `achievement`)
- §7.6 PR card — when PRs detected

**New atomics needed:** None — but the bespoke "celebration skeleton" at ~L1500 (preserved per inventory's Phase 1.3 deferred list) must be reviewed against §6.35 celebratory empty state and §6.4 hero-action card. If the celebration is structurally a hero card, retire the bespoke skeleton.

**Backend-connected elements to preserve (best-guess; audit required):**
- Session log read (workout_logs)
- PR detection / persistence
- Achievement unlock detection + celebration state
- Self-reflection note save (mutation)
- Difficulty rating save (mutation)
- "Done" action → routes back to `/client/train` or `/client`
- "Share" action (if implemented)
- Streak update (cascades from completion)
- Per-set summary aggregation
- Routes to `/client/progress/workout-logs/[id]`

**Anti-patterns from §17 currently present:**
- #1 backdrop — apply `achievement` when PRs/achievements; otherwise `info`
- #2 cyan CTAs — fix
- #5 status colors used decoratively on stat tiles
- #9 KPIs without hierarchy (no headline metric on session summary)

**`[verify]` flags relevant:**
- §3 backdrop: `achievement` vs `info` — render-state-driven.
- §7.5 Achievement card structure when chained with §7.6 PR card.

**Definition of done — exceptions:**
- Item 12 (FAB) — N/A.
- Item 17 (block-type tags) — N/A unless per-block summary lists block-types.
- Extra: dual-state screen (PRs vs no-PRs); both states reviewed. Bespoke celebration skeleton must be replaced by canonical atomics or explicitly re-justified by the user.

---

> **PAUSE POINT after Phase 2.** User reviews celebration treatment (2.5) and pause-state rendering (2.3) before Phase 3 starts.

---

## PHASE 3 — Multi-step flows + remaining workout block executors

> **Phase 3 is now expanded to Phase-1 detail per user decision 2026-04-26.** Block executors share a common template (3.3.0 below); per-block-type variations are listed compactly to honor "same level of detail" without restating the same template 12 times.

### 3.1 — `/client/check-ins/weekly`

- **Screen path:** `/client/check-ins/weekly`
- **File path:** [`src/app/client/check-ins/weekly/page.tsx`](src/app/client/check-ins/weekly/page.tsx)
- **Phase:** 3
- **Recipe applied:** §13.6 Multi-step flow
- **v4 §14 row:** Multi-step flow (check-in)

**Atomics used:**
- §6.20 Buttons — Back neutral (`btn-ghost-icon` or `btn-secondary`); Next / Submit lime (`btn-action`)
- §6.22 Inputs (`input-cell`) — for numeric fields (weight, sleep hrs, energy 1-10, stress 1-10, mood 1-10)
- §6.23 Bottom nav — typically **hidden** during a multi-step flow (verify against current behavior — `[verify]`)
- §6.25 Eyebrows + section headers — per-step header
- §6.27 Step counter — done / active / upcoming dots at top
- §6.28 Difficulty rating — for energy / stress / mood scales (or a domain-specific equivalent)
- §6.32 Banner — info banner on each step explaining the "why" (per §6.32 use cases)

**Composites used:**
- Existing [`WeeklyCheckInFlow`](src/components/client/weekly-checkin/WeeklyCheckInFlow.tsx) component — verify it composes step counter + step content + step-action footer per §13.6. If yes, refactor it to use Phase-0a atomics; if no, restructure.

**New atomics needed:** None — but if the existing flow uses bespoke step indicators, it must adopt §6.27.

**Backend-connected elements to preserve (best-guess; audit required):**
- Check-in form schema (which fields, which step they belong to)
- Per-step validation rules
- Auto-save / draft persistence (if implemented)
- Submit mutation (writes check-in record)
- Photo upload (if part of weekly check-in)
- Compliance % cascade after submit
- Streak update after submit
- Achievement-unlock check after submit
- Route after success (back to `/client/check-ins` or to a confirmation page)

**Anti-patterns from §17 currently present:**
- #2 cyan CTAs — fix
- #11 buried primary actions (multi-step flows often have "Next" buried in the bottom of the form — must be sticky or visually elevated)

**`[verify]` flags relevant:**
- Bottom-nav hiding during the flow — confirm against current behavior. If currently visible, decide with user whether to hide.
- Step counter atomic — the existing [`stepper`](src/components/ui/stepper.tsx) component must be verified as compliant.

**Definition of done — exceptions:**
- Item 5 (bottom-nav active = cyan) — N/A if hidden.
- Item 12 (FAB) — N/A.
- Item 17 — N/A.
- Extra: multi-step UX must be tested with browser back button and partial completion (draft preservation).

---

### 3.2 — `/client/check-ins/history`

- **Screen path:** `/client/check-ins/history`
- **File path:** [`src/app/client/check-ins/history/page.tsx`](src/app/client/check-ins/history/page.tsx)
- **Phase:** 3
- **Recipe applied:** §13.4 List-of-things
- **v4 §14 row:** List (history)

**Atomics used:**
- §6.10 Stale-data text — per-row "X days ago" (neutral)
- §6.17 Status tag — Submitted / Skipped per row
- §6.20 Buttons — secondary "View" per row; `btn-action` not present (history is read-only)
- §6.23 Bottom nav (inherits)
- §6.25 Eyebrows + section headers — "RECENT" section, "OLDER" section (or grouped by month)
- §6.34 Filter pill row — by status (All / Submitted / Skipped) and date range
- §6.35 Empty section state — encouraging when no check-ins; setup variant if first-time
- §6.36 Archive section — if check-ins older than 90 days are collapsed

**Composites used:** None specific.

**New atomics needed:** None.

**Backend-connected elements to preserve (best-guess; audit required):**
- Paginated check-in history read
- Per-row navigation (to detail, if rendered) or expansion
- Filter state (status, date range)
- Photo thumbnail (if stored on the check-in record)

**Anti-patterns from §17 currently present:**
- #2 cyan CTAs — fix (mostly secondary, but verify)
- #6 stale data painted red — fix per §6.10

**`[verify]` flags relevant:**
- §6.36 archive threshold — confirm archive cutoff with user (90 days? 6 months?).
- §3 backdrop: `info`.

**Definition of done — exceptions:**
- Item 12 (FAB) — N/A.
- Item 17 — N/A.

---

### 3.3 — Workout Block Executors (apply §7.2 per block type)

> **3.3 is the shared baseline for all block executors. Phase 1.2 covered the Straight Set baseline; this section covers the remaining block types. Each subsection (3.3.1+) lists only the differences from the shared baseline.**

#### 3.3.0 — Shared baseline (applies to every block executor)

- **Screen path (parent):** `/client/workouts/[id]/start` (block executors are children of the workout execution page)
- **File path (parent):** [`src/components/client/workout-execution/blocks/`](src/components/client/workout-execution/blocks)
- **Phase:** 3
- **Recipe applied:** §13.3 Single-task-focus (rep-bound blocks) OR §13.7 Live/timer (time-bound blocks)
- **v4 §14 row:** Workout Exec / block executor

**Atomics used (baseline — shared by every executor):**
- §6.4 Hero (action) card — when LOG SET is the dominant action
- §6.6 Stat strip — target panel (target reps, target weight, RPE target, target time, etc.)
- §6.13 Quote zone — coach notes
- §6.16 System tag — block-type tag, **CYAN** (§17 anti-pattern #3)
- §6.20 Buttons — `btn-action` lime per §12.5 block-aware copy
- §6.22 Inputs (`input-cell`) — for weight/reps/RPE/time
- §6.24 Progress indicators — segment bar across exercises within the block
- §6.25 Eyebrows + section headers — "PREVIOUS SESSION", "YOUR TARGET TODAY", "LOG SET"
- §6.31 Per-set table — review what was logged within the current exercise

**Composites used:**
- §7.2 Workout block prescription card — variant per block type (rep-bound vs time-bound; cluster vs straight; etc.)

**New atomics needed:** None.

**Backend-connected elements to preserve (shared, audit required per executor):**
- Block configuration (block_type, exercises, sets, reps, rest, time targets, RPE targets)
- Per-set / per-round logs
- Live timer state (intra-set rest, inter-round rest, work/rest interval state for time-bound blocks)
- Previous session reference
- Coach notes attached to block / exercise
- Exercise icon visuals via `getExerciseVisuals()`
- Pause / resume of session
- Mark-complete terminating action (per-block and per-session)

**Anti-patterns from §17 currently present (shared baseline):**
- #2 CTAs cyan, not lime — fix (per §12.5 block-aware copy)
- #3 Block-type tags use mustard / orange — fix to cyan
- #4 Generic typography — fix per §10

**`[verify]` flags relevant (shared):**
- §18.5 Tabata block executor structure — see 3.3.13 below.
- §13.7 Live/timer recipe — applies to AMRAP/EMOM/For Time/Tabata/Circuit; rep-bound blocks use §13.3.

**Definition of done — exceptions (shared):**
- Item 5 (bottom-nav active = cyan) — N/A; bottom nav is hidden on `/client/workouts/[id]/start` (verified).
- Item 12 (FAB) — N/A.
- Extra: every executor must use canonical atomics from Phase 0; bespoke per-block layouts are forbidden per §16.2 Rule 3.

---

#### 3.3.1 — Drop Set executor

- **File:** [`src/components/client/workout-execution/blocks/DropSetExecutor.tsx`](src/components/client/workout-execution/blocks/DropSetExecutor.tsx) (verify path)
- **Differences from baseline:** intra-block "drop" steps within a single set; per-drop weight + reps log; cumulative volume per top set
- **Block-aware button copy:** "LOG DROP" → "DROP COMPLETE"
- **Backend-specific:** writes to `workout_drop_sets` (per the user's hierarchy rule)

#### 3.3.2 — Superset executor

- **File:** [`src/components/client/workout-execution/blocks/SupersetExecutor.tsx`](src/components/client/workout-execution/blocks/SupersetExecutor.tsx) (verify path)
- **Differences from baseline:** alternates between paired exercises within a round; transition cue between A and B
- **Block-aware button copy:** "LOG A" / "LOG B" → "DONE ROUND N"
- **Backend-specific:** writes to `workout_block_exercises` (per the user's hierarchy rule, supersets use this table)

#### 3.3.3 — Giant Set executor

- **File:** likely shares `BaseBlockExecutor.tsx` — `[verify]` whether a dedicated `GiantSetExecutor.tsx` exists
- **Differences from baseline:** 3+ exercises in rotation; transition cues between each
- **Block-aware button copy:** "LOG N" → "DONE ROUND N"
- **Backend-specific:** writes to `workout_block_exercises`

#### 3.3.4 — Pre-Exhaustion executor

- **File:** likely shares `BaseBlockExecutor.tsx` — `[verify]` whether a dedicated executor exists
- **Differences from baseline:** ordered isolation→compound pairing; emphasis on first-exercise fatigue tracking
- **Block-aware button copy:** "LOG ISOLATION" → "LOG COMPOUND"
- **Backend-specific:** writes to `workout_block_exercises`

#### 3.3.5 — Cluster Set executor

- **File:** `[verify]` whether a dedicated `ClusterSetExecutor.tsx` exists in the codebase
- **Differences from baseline:** mini-set bursts within a top set, separated by short intra-cluster rests; per-cluster log entry
- **Block-aware button copy:** "DONE CLUSTER N" → "END SET" per §12.5
- **Backend-specific:** writes to `workout_cluster_sets`

#### 3.3.6 — Rest-Pause executor

- **File:** `[verify]` whether a dedicated executor exists
- **Differences from baseline:** primary set to failure → short rest → reps to failure → repeat; per-burst log
- **Block-aware button copy:** "LOG BURST" → "END REST-PAUSE"
- **Backend-specific:** writes to `workout_rest_pause_sets`

#### 3.3.7 — Pyramid Set executor

- **File:** `[verify]`
- **Differences from baseline:** ascending or descending weight pyramid; per-step weight + reps log
- **Block-aware button copy:** "LOG STEP N"
- **Backend-specific:** writes to `workout_pyramid_sets`

#### 3.3.8 — Ladder executor

- **File:** `[verify]`
- **Differences from baseline:** rep-ladder up/down; per-rung log
- **Block-aware button copy:** "LOG RUNG N"
- **Backend-specific:** writes to `workout_ladder_sets`

#### 3.3.9 — AMRAP executor

- **File:** [`src/components/client/workout-execution/blocks/EnduranceExecutor.tsx`](src/components/client/workout-execution/blocks/EnduranceExecutor.tsx) (likely; `[verify]`)
- **Recipe:** §13.7 Live/timer (time-bound)
- **Differences from baseline:** elapsed-time clock; running rep counter across rounds; "End AMRAP" terminator
- **Block-aware button copy:** "LOG ROUND" → "END AMRAP"
- **Backend-specific:** writes to `workout_time_protocols`

#### 3.3.10 — EMOM executor

- **File:** likely `EnduranceExecutor.tsx` (shared; `[verify]`)
- **Recipe:** §13.7 Live/timer
- **Differences from baseline:** per-minute interval timer; per-interval log; "Skip / Done" per minute
- **Block-aware button copy:** "DONE MINUTE N"
- **Backend-specific:** writes to `workout_time_protocols`

#### 3.3.11 — For Time executor

- **File:** likely `EnduranceExecutor.tsx` (shared; `[verify]`)
- **Recipe:** §13.7 Live/timer
- **Differences from baseline:** count-up timer; total-time terminator
- **Block-aware button copy:** "FINISH" → final time captured
- **Backend-specific:** writes to `workout_time_protocols`

#### 3.3.12 — Tabata executor (`[verify]` per §18.5)

- **File:** **`[verify]`** — Tabata block executor structure unknown per v4 §18.5
- **Recipe:** §13.7 Live/timer
- **Differences from baseline:** 8 rounds × 20s work / 10s rest; work-rest indicator; per-round rep count (optional)
- **Block-aware button copy:** "READY" → "WORK" → "REST" cycles; per §12.5 block-aware copy
- **Backend-specific:** writes to `workout_time_protocols`
- **Audit pass MUST happen before conversion** — until §18.5 is resolved, this executor is BLOCKED.

#### 3.3.13 — Circuit executor

- **File:** `[verify]`
- **Recipe:** §13.7 Live/timer
- **Differences from baseline:** rotation across 3+ exercises with timed work / rest per station; per-station log
- **Block-aware button copy:** "DONE STATION N" → "END CIRCUIT"
- **Backend-specific:** writes to `workout_time_protocols`

#### Speed Work executor (existing file — categorize)

- **File:** [`src/components/client/workout-execution/blocks/SpeedWorkExecutor.tsx`](src/components/client/workout-execution/blocks/SpeedWorkExecutor.tsx) (verify path)
- **Categorization required:** which block_type does this map to in the database hierarchy? It is not directly a §7.2 block type. **Audit required before conversion.** Likely maps to a time-protocol variant.

> **PAUSE POINT after Phase 3.** User reviews each block executor's rendering against the actual block-type fixtures from the database. Tabata stays blocked until §18.5 is resolved.

---

## PHASE 4 — Goals / Habits / Activity (NEW v4 patterns)

### 4.1 — `/client/goals` (apply §7.3 + §13.11)
- **File:** [`src/app/client/goals/page.tsx`](src/app/client/goals/page.tsx) (2122 lines)
- **Recipe:** §13.11 Pillar-organized list
- **Atomics:** §6.2 status-tinted card (overdue), §6.3 pillar stripe (Training/Nutrition/Check-ins/Lifestyle/General), §6.6 stat strip (Total/Active/Completed/Adherence), §6.8 inline editor (Update value), §6.9 deadline urgency, §6.11 target-progress bar, §6.15 priority pill (HIGH/MEDIUM/LOW), §6.17 status tag, §6.21 FAB **(lime not red)**, §6.25 eyebrows, §6.34 filter pill row, §6.35 empty section state, §6.36 archive section, §6.37 add-item placeholder
- **Composites:** §7.3 Goal card
- **Anti-patterns to fix (every one of v4 §17 anti-patterns #13–#16 originated here):** #13 red FAB, #14 red deadline text, #15 weak primary on inline editor, #16 decorative pillar emoji icons
- **DoD exceptions:** This screen carries the most v4-divergent UI on the client side. Audit pass is critical.

### 4.2 — `/client/goals/history`
- **File:** [`src/app/client/goals/history/page.tsx`](src/app/client/goals/history/page.tsx)
- **Recipe:** §13.4 with §6.36 archive section dominant
- **Atomics:** §6.36, §6.7 delta (closed vs target), §6.34 filter pills

### 4.3 — `/client/habits` (apply §7.4)
- **File:** [`src/app/client/habits/page.tsx`](src/app/client/habits/page.tsx)
- **Recipe:** §13.11 Pillar-organized list
- **Atomics:** §6.3 pillar stripe / domain-habits stripe, §6.8 inline editor, §6.21 FAB lime, §6.26 frequency selector, §6.30 per-week mini-grid (calendar dots), §6.37 add-item placeholder
- **Composites:** §7.4 Habit card
- **Existing component:** [`HabitTracker`](src/components/client/HabitTracker.tsx) — refactor to compose v4 atomics
- **Anti-patterns:** #13 red FAB

### 4.4 — `/client/activity`
- **File:** [`src/app/client/activity/page.tsx`](src/app/client/activity/page.tsx)
- **Recipe:** §13.4 List-of-things
- **Atomics:** §6.3 domain stripe (mixed-domain feed: workout / nutrition / habit / check-in), §6.7 delta, §6.10 stale-data, §6.17 status tag
- **Existing:** [`ActivityList`](src/components/client/activity/ActivityList.tsx)
- **Activity-type emoji icons:** **PRESERVED.** Per Override #1 in Section 0.A.1 (user decision 2026-04-26), v4 §8.1 SVG-only rule does NOT apply to activity-type identification icons. The existing `ACTIVITY_META` emoji glyphs (cardio / sport / lifestyle) stay as-is on this screen. All other icons on this screen (status indicators, action affordances, navigation chevrons) must remain SVG stroke-based per v4 §8.1.
- **Anti-patterns to fix:** None related to activity-type icons. Standard cleanup: #2 cyan CTAs (if any) → lime; #5 status colors used decoratively; #11 buried primary actions if present.

---

## PHASE 5 — Nutrition (apply §7.10, §7.14)

### 5.1 — `/client/nutrition`
- **File:** [`src/app/client/nutrition/page.tsx`](src/app/client/nutrition/page.tsx)
- **Recipe:** §13.5 Detail (or §13.2 Info-Dominant if no active plan)
- **Atomics:** §6.5/6.6 stat strip (calories headline + macros supporting), §6.11 target-progress bar (variance-colored, **NOT** macro-identity-colored — §17 anti-pattern #10), §6.12 variance pill, §6.32 banner (raw/uncooked disclaimer)
- **Composites:** §7.10 Macro pill row + Daily Totals
- **Existing:** [`MacroBars`](src/components/ui/MacroBars.tsx) — refactor to use variance coloring
- **Anti-patterns:** #10 inconsistent macro colors

### 5.2 — `/client/nutrition/meals/[id]`
- **File:** [`src/app/client/nutrition/meals/[id]/page.tsx`](src/app/client/nutrition/meals/[id]/page.tsx)
- **Recipe:** §13.5 Detail
- **Atomics:** §6.5/6.6, §6.11, §6.32 banner

### 5.3 — `/client/nutrition/foods/[id]`
- **File:** [`src/app/client/nutrition/foods/[id]/page.tsx`](src/app/client/nutrition/foods/[id]/page.tsx)
- **Recipe:** §13.5 Detail
- **Atomics:** §6.5/6.6, §6.11, §6.21 FAB (Edit food)
- **Anti-patterns:** Edit-food FAB currently uses `color-mix(--fc-accent)` (cyan-ish per inventory note) — must move to lime.

### 5.4 — `/client/nutrition/foods/create`
- **File:** [`src/app/client/nutrition/foods/create/page.tsx`](src/app/client/nutrition/foods/create/page.tsx)
- **Recipe:** §13.6 Multi-step flow OR §13.9 Builder
- **Atomics:** §6.22 inputs, §6.20 buttons, §6.27 step counter (if multi-step)

---

## PHASE 5.5 — Chart Styling pass (BLOCKS Phase 6)

> **Why this exists:** v4 §18.4 explicitly defers chart styling. Several Phase 6 screens (and `/coach/analytics`, `/coach/reports`, `/coach/progress` in Phase 8) embed charts. Without a defined chart visual system, those screens cannot complete the v4 §16.1 step 6 polish pass. **No screen containing charts may be converted in Phase 6 (or later) until Phase 5.5 is complete.**

### 5.5 tasks

**Task A — Chart-specific tokens.** Add to [`src/styles/ui-system.css`](src/styles/ui-system.css) (`:root` and `.dark`, with `[verify-light-theme]` per Section 1A policy):

- `--fc-chart-series-1` — primary series (default cyan, system info)
- `--fc-chart-series-2` — secondary series (purple)
- `--fc-chart-series-3` — tertiary series (lime — used sparingly; remember §1.2 color is structural)
- `--fc-chart-series-4` — quaternary series (gold)
- `--fc-chart-grid` — grid line color (low-opacity white-on-dark)
- `--fc-chart-axis` — axis label / tick color (`var(--fc-text-subtle)`)
- `--fc-chart-tooltip-bg` — tooltip background (glass-style)
- `--fc-chart-tooltip-border` — tooltip border (`var(--fc-glass-border)`)
- `--fc-chart-positive` — gain / increase (`var(--fc-status-success)`)
- `--fc-chart-negative` — loss / decrease (`var(--fc-status-warning)` — note: **NOT** `--fc-status-error`; charts use warning for "down" so error is reserved for actual errors per §11)
- `--fc-chart-target-line` — target reference line (dashed, `var(--fc-text-quaternary)`)

Final token names and values **`[verify]`** with the user before adoption.

**Task B — Refactor chart wrapper components to read these tokens.** Confirmed chart components in this codebase:

- [`PRTimelineChart`](src/components/progress/PRTimelineChart.tsx)
- [`AdherenceTrendChart`](src/components/coach/AdherenceTrendChart.tsx)
- [`WorkoutAnalytics`](src/components/progress/WorkoutAnalytics.tsx)
- Plus any other charts surfaced during the audit pass on `/client/progress`, `/client/progress/analytics`, `/client/progress/personal-records`, `/coach/analytics`, `/coach/reports`, `/coach/progress`.

Chart wrappers must accept tokens via CSS custom properties (so dark/light flip with the theme). No hardcoded chart colors.

**Task C — Visual confirmation against v4 principles.**
- §1.1 athletic / tactile (charts feel data-dense, not decorative)
- §1.2 color is structural (series colors don't randomize per dataset; they map to a meaningful axis like "this metric vs target")
- §1.4 information density with room to breathe (no chart junk)
- §11 status discipline (red only for genuine errors; warning for "down" trends)

**Task D — Document the chart palette.** Append a short "Chart styling addendum" subsection to this rollout plan (Section 6 or as an appendix) capturing the final token mapping and which series colors map to which semantic role.

### 5.5 completion criteria

1. All chart-related tokens added and approved.
2. All listed chart components refactored to read tokens, not hex.
3. Visual review of at least three chart instances under each variant (line, bar, ring).
4. Phase 6 screen list re-classified: which Phase 6 screens contain charts (so the user knows which need extra care).
5. User approves Phase 6 may proceed for chart-bearing screens.

> **Until Phase 5.5 completion: do NOT convert any screen that renders a chart, even if it falls in Phase 6 by default ordering. Convert chart-free Phase 6 screens (e.g. `/client/progress/photos` redirect, `/client/progress/mobility/performance/nutrition` if chart-free) first; chart-bearing screens are blocked.**

---

## PHASE 6 — Progress sub-domains

### 6.1 — `/client/progress`
- **File:** [`src/app/client/progress/page.tsx`](src/app/client/progress/page.tsx)
- **Recipe:** §13.8 Analytics/dashboard
- **Atomics:** §6.6 stat strip with one headline, §6.7 delta, §6.30 per-week mini-grid
- **Composites:** §7.11 Progress Hub monthly summary

### 6.2 — `/client/progress/personal-records`
- **File:** [`src/app/client/progress/personal-records/page.tsx`](src/app/client/progress/personal-records/page.tsx)
- **Recipe:** §13.4 / §13.8
- **Atomics:** §6.7 delta pill (with arrow), §6.18 tier badge (when applicable)
- **Composites:** §7.6 PR card

### 6.3 — `/client/progress/achievements`
- **File:** [`src/app/client/progress/achievements/page.tsx`](src/app/client/progress/achievements/page.tsx)
- **Recipe:** §13.4
- **Atomics:** §6.18 tier badge, §6.19 rarity pill, §6.34 filter pill row, §6.35 empty section state
- **Composites:** §7.5 Achievement card
- **Existing:** [`AchievementCard`](src/components/ui/AchievementCard.tsx), [`AchievementUnlockModal`](src/components/ui/AchievementUnlockModal.tsx) — refactor to compose v4 atomics; modal becomes celebratory hero-action card with `achievement` backdrop

### 6.4 — `/client/progress/leaderboard`
- **File:** [`src/app/client/progress/leaderboard/page.tsx`](src/app/client/progress/leaderboard/page.tsx)
- **Recipe:** §13.4
- **Atomics:** §6.18 rank badge (#1/#2/#3 = bronze/silver/gold; #4+ neutral), §6.7 delta, §6.34 filter pills
- **Composites:** §7.7 Top Performers / Leaderboard rows
- **Existing:** [`LeaderboardCard`](src/components/ui/LeaderboardCard.tsx), [`ClientLeaderboardPageBody`](src/components/client/progress/ClientLeaderboardPageBody.tsx)

### 6.5 — `/client/progress/body-metrics`
- **File:** [`src/app/client/progress/body-metrics/page.tsx`](src/app/client/progress/body-metrics/page.tsx) (1857 lines)
- **Recipe:** §13.4 / §13.5
- **Atomics:** §6.7 delta, §6.8 inline editor (most-common interaction is "log a number"), §6.11 target-progress bar, §6.14 self-authored note, §6.21 FAB lime (Add entry)

### 6.6 — `/client/progress/analytics`
- **File:** [`src/app/client/progress/analytics/page.tsx`](src/app/client/progress/analytics/page.tsx) (1405 lines)
- **Recipe:** §13.8 Analytics/dashboard
- **Atomics:** §6.6, §6.7
- **Risk:** Charts not in v4 yet (§18.4). Use existing chart components but apply v4 series palette guidance.

### 6.7 — `/client/progress/workout-logs`
- **File:** [`src/app/client/progress/workout-logs/page.tsx`](src/app/client/progress/workout-logs/page.tsx)
- **Recipe:** §13.4
- **Atomics:** §6.10 stale-data, §6.17 status, §6.28 difficulty rating, §6.34 filter pills, §6.36 archive section
- **Composites:** §7.12 Workout History session card

### 6.8 — `/client/progress/workout-logs/[id]`
- **File:** [`src/app/client/progress/workout-logs/[id]/page.tsx`](src/app/client/progress/workout-logs/[id]/page.tsx) (1245 lines)
- **Recipe:** §13.5 Detail
- **Atomics:** §6.14 self-authored note, §6.17 status, §6.28 difficulty rating, §6.31 per-set table
- **Composites:** §7.13 Workout History session detail
- **Anti-patterns:** dense per-block set rendering visually overloaded — must apply §6.31 per-set table strictly, with per-row borders on white-4%, no decorative tinting

### 6.9 — `/client/progress/mobility`, `/performance`, `/nutrition`
- **Files:** [`src/app/client/progress/mobility/page.tsx`](src/app/client/progress/mobility/page.tsx), [`src/app/client/progress/performance/page.tsx`](src/app/client/progress/performance/page.tsx), [`src/app/client/progress/nutrition/page.tsx`](src/app/client/progress/nutrition/page.tsx)
- **Recipe:** §13.8 / §13.5
- **Atomics:** §6.6, §6.7, §6.11

### 6.10 — `/client/progress/photos` (redirect)
- **File:** [`src/app/client/progress/photos/page.tsx`](src/app/client/progress/photos/page.tsx)
- **Status:** Redirect to body-metrics?tab=photos. **No conversion needed** — verify redirect still works.

### 6.11 — `/client/me`
- **File:** [`src/app/client/me/page.tsx`](src/app/client/me/page.tsx)
- **Recipe:** §13.2 / §13.5
- **Atomics:** §6.20 buttons (mostly secondary), §6.25 eyebrows, §6.35 empty states for unset sections
- **Vocabulary risk:** §18.7 — `/client/profile` vs `/client/me` is one of the unresolved vocabulary decisions. Flag.

---

## PHASE 7 — Challenges

### 7.1 — `/client/challenges`
- **File:** [`src/app/client/challenges/page.tsx`](src/app/client/challenges/page.tsx)
- **Recipe:** §13.4
- **Atomics:** §6.3 challenge domain stripe, §6.9 deadline urgency, §6.17 status, §6.34 filter pills

### 7.2 — `/client/challenges/[id]`
- **File:** [`src/app/client/challenges/[id]/page.tsx`](src/app/client/challenges/[id]/page.tsx)
- **Recipe:** §13.5 Detail
- **Atomics:** §6.4 hero (action when challenge active), §6.9 deadline urgency, §6.11 target-progress bar, §6.18 tier badge, §6.20 buttons
- **Existing:** [`ChallengeCard`](src/components/client/ChallengeCard.tsx), [`ChallengeDetailPageBody`](src/components/client/challenges/ChallengeDetailPageBody.tsx)

---

## PHASE 8 — Coach side (likely needs v5)

> v4 §19 explicitly notes coach side may need a v5 refinement after Phase 1–7 lessons. Each coach screen is listed compactly here; deep audits per screen happen at the start of Phase 8.

### 8.1 — `/coach` (Coach Home)
- **File:** [`src/app/coach/page.tsx`](src/app/coach/page.tsx)
- **Recipe:** §13.1 Action-Hero (Coach variant)
- **Composites:** §7.9 Coaching Insights & Quick Actions
- **Atomics:** §6.2 status-tinted cards (Clients Needing Attention rows), §6.6 stat strip, §6.10 stale-data ("X days ago" — most stale-data is **not** red per §6.10), §6.17 status, §6.20 buttons

### 8.2 — `/coach/clients`
- **File:** [`src/app/coach/clients/page.tsx`](src/app/coach/clients/page.tsx)
- **Recipe:** §13.4
- **Atomics:** §6.2 status-tinted card (Review/Urgent rows — cap ~30%), §6.10 stale-data text ("9w ago", "Never"), §6.17 status, §6.21 FAB lime (Add client), §6.34 filter pill row

### 8.3 — `/coach/clients/add`
- **File:** [`src/app/coach/clients/add/page.tsx`](src/app/coach/clients/add/page.tsx)
- **Recipe:** §13.6 Multi-step flow

### 8.4 — `/coach/clients/[id]` and sub-routes
- **Files:** [`src/app/coach/clients/[id]/page.tsx`](src/app/coach/clients/[id]/page.tsx), `/profile`, `/workouts`, `/workout-logs`, `/workout-logs/[logId]`, `/stats`, `/progress`, `/check-ins`, `/meals`, `/programs/[programId]` — 10 sub-routes total
- **Recipe:** §13.5 Detail + §6.33 Tab strip via [`CoachClientTabBar`](src/components/coach/CoachClientTabBar.tsx)
- **Atomics:** §6.2, §6.6, §6.7, §6.13, §6.17, §6.31, §6.33
- **Composites:** §7.13 (workout-logs/[logId])
- **Vocabulary risk:** §18.7 — `/coach/clients/[id]/progress` titled "Check-ins & Assessments" with sibling `/check-ins`. Flag for product decision.

### 8.5 — `/coach/gym-console`
- **File:** [`src/app/coach/gym-console/page.tsx`](src/app/coach/gym-console/page.tsx)
- **Recipe:** §13.10 Live Roster
- **Composites:** §7.15 Gym Console roster
- **Note:** full-viewport `h-[100dvh]`, doesn't use `CoachPageShell`. Backdrop must still apply.

### 8.6 — `/coach/programs` and editor
- **Files:** [`src/app/coach/programs/page.tsx`](src/app/coach/programs/page.tsx), `/create`, `/[id]`, `/[id]/edit`
- **Recipe:** §13.4 (list), §13.9 Builder/Editor
- **Composites:** §7.16 Builder/Editor, §7.8 Volume Calculator (in editor)

### 8.7 — `/coach/workouts/templates` and editor
- **Files:** [`src/app/coach/workouts/templates/page.tsx`](src/app/coach/workouts/templates/page.tsx), `/create`, `/[id]`, `/[id]/edit`
- **Recipe:** §13.4 (list), §13.9 Builder/Editor
- **Composites:** §7.16, §7.8

### 8.8 — `/coach/exercises`, `/coach/categories`, `/coach/training`, `/coach/menu`
- **Files:** [`src/app/coach/exercises/page.tsx`](src/app/coach/exercises/page.tsx), [`src/app/coach/categories/page.tsx`](src/app/coach/categories/page.tsx), [`src/app/coach/training/page.tsx`](src/app/coach/training/page.tsx), [`src/app/coach/menu/page.tsx`](src/app/coach/menu/page.tsx)
- **Recipe:** §13.4 (libraries) and §13.2 (hub)

### 8.9 — `/coach/profile`, `/coach/goals`, `/coach/challenges`, `/coach/challenges/[id]`
- **Files:** [`src/app/coach/profile/page.tsx`](src/app/coach/profile/page.tsx), [`src/app/coach/goals/page.tsx`](src/app/coach/goals/page.tsx), [`src/app/coach/challenges/page.tsx`](src/app/coach/challenges/page.tsx), [`src/app/coach/challenges/[id]/page.tsx`](src/app/coach/challenges/[id]/page.tsx)
- **Recipe:** §13.2 / §13.4 / §13.5

### 8.10 — `/coach/nutrition` family (8 routes)
- **Files:** [`src/app/coach/nutrition/page.tsx`](src/app/coach/nutrition/page.tsx), `/foods`, `/meal-plans`, `/meal-plans/create`, `/meal-plans/[id]`, `/meal-plans/[id]/edit`, `/generator`, `/assignments`
- **Recipe:** §13.4 / §13.5 / §13.6 / §13.9
- **Composites:** §7.10 (meal plan detail), §7.14 (generator wizard), §7.16 (editors)

### 8.11 — `/coach/analytics`, `/coach/reports`, `/coach/adherence`, `/coach/compliance`, `/coach/progress`
- **Files:** [`src/app/coach/analytics/page.tsx`](src/app/coach/analytics/page.tsx), [`src/app/coach/reports/page.tsx`](src/app/coach/reports/page.tsx), [`src/app/coach/adherence/page.tsx`](src/app/coach/adherence/page.tsx), [`src/app/coach/compliance/page.tsx`](src/app/coach/compliance/page.tsx), [`src/app/coach/progress/page.tsx`](src/app/coach/progress/page.tsx)
- **Recipe:** §13.8 Analytics/dashboard
- **Composites:** §7.7 (top performers on /progress), §7.9 (coaching insights)
- **Vocabulary risk:** §18.7 — `compliance` vs `adherence` decision. Two routes exist. Flag.

---

## PHASE 9 — Admin

### 9.1 — `/admin/tracking-sources`, `/admin/habit-categories`, `/admin/goal-templates`, `/admin/achievement-templates`
- **Files:** [`src/app/admin/tracking-sources/page.tsx`](src/app/admin/tracking-sources/page.tsx), [`src/app/admin/habit-categories/page.tsx`](src/app/admin/habit-categories/page.tsx), [`src/app/admin/goal-templates/page.tsx`](src/app/admin/goal-templates/page.tsx), [`src/app/admin/achievement-templates/page.tsx`](src/app/admin/achievement-templates/page.tsx)
- **Recipe:** §13.4 / §13.9 — utility forms; minimal styling per v4 §19 ("utility, minimal styling")
- **Atomics:** §6.20 buttons, §6.22 inputs, §6.34 filter pills, §6.35 empty state. Skip §3 atmospheric backdrop or use `info` at low intensity.

---

## PHASE 10 — Auth / onboarding

### 10.1 — `/` (root)
- **File:** [`src/app/page.tsx`](src/app/page.tsx)
- **Status:** Likely a redirect or auth gate. Verify before treating as a screen.

### 10.2 — `/create-user`
- **File:** [`src/app/create-user/page.tsx`](src/app/create-user/page.tsx)
- **Recipe:** §13.6 Multi-step flow
- **Note:** v4 §18.3 explicitly defers onboarding visual language ("likely needs softer, more illustrative treatment. Don't force into existing system."). **Flag for product/design decision before conversion.**

---

═══════════════════════════════════════════════
## SECTION 3 — Cross-Cutting Concerns
═══════════════════════════════════════════════

### A. Shared components used by multiple screens

| Component | Path | Affects | What changes propagate (per v4) |
|---|---|---|---|
| `ClientPageShell` | [`src/components/client-ui/ClientPageShell.tsx`](src/components/client-ui/ClientPageShell.tsx) | All ~33 client routes | Add `backdrop` prop; render `<AtmosphericBackdrop variant=… />` inside. Default variant `"info"`. |
| `CoachPageShell` | [`src/components/coach-ui/CoachPageShell.tsx`](src/components/coach-ui/CoachPageShell.tsx) | All ~43 coach routes | Same as above; default `"info"`. |
| `BottomNav` | [`src/components/layout/BottomNav.tsx`](src/components/layout/BottomNav.tsx) | All routes except `/client/workouts/[id]/start` | Replace inline `text-cyan-400`, `text-gray-500` with token references (Section 1C §6.23). Active state already cyan per v4 §6.23 — ✓. |
| `AnimatedBackground` | [`src/components/ui/AnimatedBackground.tsx`](src/components/ui/AnimatedBackground.tsx) | Every route | If Option 2 (layered) chosen — **no change required** here, just augment the shell. If Option 1 (replace) — retire entirely (high blast radius). Logged in 3D. |
| `GlassCard` | [`src/components/ui/GlassCard.tsx`](src/components/ui/GlassCard.tsx) | Coach surfaces, modals | Map to v4 §6.1 glass tier. Likely no change. |
| `ClientGlassCard` | [`src/components/client-ui/GlassCard.tsx`](src/components/client-ui/GlassCard.tsx) | Client surfaces (extensive) | Currently maps to `fc-card-shell` (prescription-shell) which is **v3-aligned**, not v4 default. Most Client surfaces should migrate to `fc-surface` (plain card) per v4 §6.1 unless they have a meaningful left accent. **Highest-impact refactor in Phase 0.** |
| `CoachClientTabBar` | [`src/components/coach/CoachClientTabBar.tsx`](src/components/coach/CoachClientTabBar.tsx) | All 10 `/coach/clients/[id]/*` routes | Verify it matches §6.33 (cyan underline + primary text active). |
| `AnalyticsNav` | [`src/components/coach/AnalyticsNav.tsx`](src/components/coach/AnalyticsNav.tsx) | `/coach/analytics`, `/coach/reports`, `/coach/adherence`, `/coach/compliance` | Verify §6.33. |
| `EmptyState` | [`src/components/ui/EmptyState.tsx`](src/components/ui/EmptyState.tsx) | All routes | Verify §6.35 three variants (encouraging/celebratory/setup) and "no 'No data found.'" rule. |
| `PageSkeleton` | [`src/components/ui/PageSkeleton.tsx`](src/components/ui/PageSkeleton.tsx) | All routes (loading branches) | Likely no change — skeleton variants `dashboard`/`list`/`form` already match v4 §9.2 style. |
| `SectionHeader` | [`src/components/client-ui/SectionHeader.tsx`](src/components/client-ui/SectionHeader.tsx) | All routes | Augment with optional `pulse?: boolean` prop and variants per §6.25. |
| `MacroBars` | [`src/components/ui/MacroBars.tsx`](src/components/ui/MacroBars.tsx) | Nutrition family | Refactor to color by **variance** not macro identity (§6.11, §17 anti-pattern #10). |
| `AchievementCard`, `AchievementUnlockModal` | [`src/components/ui/AchievementCard.tsx`](src/components/ui/AchievementCard.tsx), [`src/components/ui/AchievementUnlockModal.tsx`](src/components/ui/AchievementUnlockModal.tsx) | Achievements + unlock toasts | Compose §7.5 atomics (rarity pill, tier badge, target-progress bar). |
| `LeaderboardCard` | [`src/components/ui/LeaderboardCard.tsx`](src/components/ui/LeaderboardCard.tsx) | Leaderboard, Top Performers | Compose §7.7. |
| `GoalCard`, `CompactGoalCard`, `EditGoalModal`, `GoalWizard` | [`src/components/goals/`](src/components/goals) | Goals + wizard | Compose §7.3. |
| `HabitTracker` | [`src/components/client/HabitTracker.tsx`](src/components/client/HabitTracker.tsx) | Habits | Compose §7.4. |
| `WeeklyCheckInFlow` | [`src/components/client/weekly-checkin/WeeklyCheckInFlow.tsx`](src/components/client/weekly-checkin/WeeklyCheckInFlow.tsx) | Weekly check-in | Compose §13.6 + §6.27. |
| Block executors | [`src/components/client/workout-execution/blocks/`](src/components/client/workout-execution/blocks) (`StraightSetExecutor`, `DropSetExecutor`, `SupersetExecutor`, `EnduranceExecutor`, `SpeedWorkExecutor`, plus `BaseBlockExecutor`) | Workout Execution — 12 block types | All compose §7.2. Per-block-type button copy per §12.5. |
| `MealPlanCard`, `MealPlanAssignmentModal` | [`src/components/features/nutrition/`](src/components/features/nutrition) | Meal plans + assignments | Compose §7.10. |

### B. Vocabulary decisions blocking conversion (per v4 §12.3, §18.7)

| Decision needed | Affects screens | Default v4 stance |
|---|---|---|
| **Compliance vs Adherence** | `/coach/compliance`, `/coach/adherence`, `/coach/progress`, `/coach/clients/[id]/progress`, `/coach/clients/[id]` (compliance widget), client `/client/progress` (compliance %) | v4 §12.3: compliance = % completed (objective); adherence = behavior over time (subjective). **Both terms exist** — they describe different metrics. But two routes (`/coach/compliance` and `/coach/adherence`) suggest duplication. Flag for product call. |
| **Training vs Workouts** | `/client/train` vs `/client/workouts` | v4 §12.3: "Training (the activity / domain)" / "Workout (a session)". Both are valid but the route names blur them. |
| **`/client/profile` vs `/client/me`** | Two screens that may overlap | v4 §18.7 explicit unresolved decision. Flag. |
| **`meal_plan_assignments` vs `assigned_meal_plans`** | DB-side; affects how `/coach/nutrition/assignments` and `/coach/nutrition/meal-plans` query | v4 §18.7. Per the user's database-contract rule — do NOT change DB; verify the canonical column. |
| **`/coach/clients/[id]/progress` titled "Check-ins & Assessments"** | One screen with sibling `/check-ins` | v4 doesn't decide. Per inventory, this needs holistic `CoachClientTabBar` review. |

> **Per the user's "no assumptions" rule:** every vocabulary item above is a hard pause point. Conversion of the affected screens cannot proceed until decided.

### C. Token migration risks — screens with most hardcoded colors

(Per the existing screen-inventory's Phase-4 "polished" notes, several screens had **hundreds** of hardcoded hits already swept to tokens. Those tokens were the *cyan-CTA* family. v4 forces another migration — cyan-CTA → lime-action.)

| Screen | Lines | Risk | Why |
|---|---|---|---|
| `/client/goals` | 2122 | **Highest** | Already swept once for tokens; will need a second sweep for lime-action + the new pillar-stripe + inline-editor + FAB-lime work. |
| `/client/workouts/[id]/complete` | 1948 | High | Bespoke 1500-line celebration block to unify with §6.35. |
| `/client/progress/body-metrics` | 1857 | High | Most "polished" page in Bucket A — densest. |
| `/client/workouts/[id]/details` | 1692 | High | Essentials-only; structural density pass needed. |
| `/coach/progress` | 1887 | High | 172 `${theme.*}` hits already swept; another full pass for accent-role v4 |
| `/client/progress/analytics` | 1405 | Medium-high | Charts deferred to v4 §18.4; structure restructure pending. |
| `/client/progress/workout-logs/[id]` | 1245 | Medium-high | Per-set table density (§6.31). |
| `/coach/profile` | 1249 | Medium | Form inside `AnimatedBackground` visual mismatch. |
| `/coach/clients/[id]/programs/[programId]` | 992 | Medium | Shell migration still pending. |

### D. `[verify]` flag inventory (from v4)

| § | Flag | Resolution path |
|---|---|---|
| §1, §5.2 | Light theme spec; exact `--fc-radius-*` values | User input. Until then, dark-only. |
| §2.2 | New text tokens `--fc-text-quaternary`, `--fc-text-disabled` recommended. | Phase 0 adds them per Section 1A. |
| §3 | Atmospheric backdrop — replace `AnimatedBackground` (Option 1) or layer (Option 2)? | **User decision needed.** Default recommendation: Option 2 (layer). |
| §6.9 | Verify red is reserved only for genuine overdue, not "(57 days left) overdue". | Mechanical check during Phase 4 Goals. |
| §9.6 | Pause states (Programs) — "neutral or amber left-bar". | Verify against [`src/app/coach/clients/[id]/programs/[programId]/page.tsx`](src/app/coach/clients/[id]/programs/[programId]/page.tsx) Pause UI (Phase 8). |
| §18.5 | Tabata block executor structure unknown. | Verify in Phase 3 when reviewing block executors. |
| §18.6 | Notification screens / push UI not designed. | Out of scope until designed. |
| §18.7 | Vocabulary: compliance vs adherence; Training vs Workouts; profile vs me; meal_plan_assignments vs assigned_meal_plans. | **User decisions** — Section 3B. |
| §18.11 | Real-time collaborative editing presence indicators. | Out of scope until product decides. |
| §20.2 | Multi-coach editing. | Same. |

### E. Component naming conflicts (per §15.2)

| Existing | Proposed (v4) | Conflict | Resolution |
|---|---|---|---|
| `.fc-fab` (red) | v4 `fab-action` (lime) | Same role, opposite color | **Rewrite** the existing `.fc-fab` rule to lime per Section 1B.6 (preferred — no caller change). |
| `.fc-btn-primary` (cyan) | v4 `btn-action` (lime) | Same role, opposite color | **Audit-first migration (user decision 2026-04-26 — replaces earlier "redirect during transition" plan, which is rejected as too risky).** Phase 0b step: (1) grep all usage of `.fc-btn-primary` across the codebase; (2) categorize each call site as either **(a) CTA usage** — will migrate to `btn-action` (lime), or **(b) system-cyan usage** (e.g. a navigation control, a non-action button styled cyan for system reasons) — will migrate to `btn-pill` or remain a cyan element under a different class. Categorization output is required and approved by the user **before** any class redirect, alias, or deprecation begins. Do not redirect the existing rule globally. |
| `.fc-attention-{urgent,warning,good,info,inactive}` | v4 `.fc-card-status-{warning,error,success,info}` | Overlap; v4 needs tinted *border*, current rule is fill only | **Add v4 classes**, leave attention classes as-is. Migrate callers per phase. Drop attention classes after Phase 8. |
| `.fc-hero-card` | v4 `.fc-hero-action` | Different intent (neutral elevated vs lime action) | **Co-exist.** `fc-hero-card` is closer to v4 elevated-card; `fc-hero-action` is the lime action variant. Both have a place. |
| `ClientGlassCard` (`fc-card-shell` prescription-shell) | v4 plain card / status-tinted | Most calls are styled wrong (default 4px cyan accent on every content card) | **Audit per call site** in each phase. Migrate to `fc-surface` when no semantic accent; to `fc-card-status-*` when accent is meaningful. |
| `ResponsiveModal` | v4 doesn't have a "Modal" atomic but §15.1 lists it as preserved | No conflict | Keep. |
| `ChallengesPageShell` (deleted Phase 1.5c) | n/a | n/a | Already gone. |

---

═══════════════════════════════════════════════
## SECTION 4 — Execution Order Within a Phase
═══════════════════════════════════════════════

### Phase 0a — Foundation, additive only
**Order:** strict. Nothing existing is modified.
1. (Low) Add new tokens to `ui-system.css` per Section 1A — `:root` and `.dark` blocks; light values mirror dark and are flagged `[verify-light-theme]` per Section 1A policy.
2. (Low) Add new utility classes per Section 1B (`.fc-card-status-*`, `.btn-action`, `.fab-action`, `.input-cell`, `.target-bar`, etc.). The old `.fc-attention-*`, `.fc-fab`, `.fc-btn-primary` rules are NOT touched.
3. (Med) Build `AtmosphericBackdrop` component as a new file. Do NOT yet wire into shells.
4. (Med) Build new components as new files (no cross-deps): `HeroActionCard`, `InlineEditor`, `TargetProgressBar`, `TierBadge`, `Banner`, `FilterPills`, `WeekMiniGrid`, `FrequencySelector`.
5. (Med) Build helper libraries as new files: `deadlineUrgency.ts`, `staleData.ts`.
6. (Med) READ-ONLY verification of existing components against v4 (`BottomNav`, `SectionHeader`, `EmptyState`, `stepper`, `CoachClientTabBar`, `AnalyticsNav`, `MacroBars`, `ClientGlassCard`, `AnimatedBackground`). Output is a per-component compliance report; **no edits**.
7. (Med) Build `/dev/v4-lab` showcase page that renders every new atomic.
**Pause point at end of 0a:** user visually reviews `/dev/v4-lab`. Phase 0a is "complete" only after user sign-off.

### Phase 0b — Migration decisions
**Order:** strict. Each item below requires audit-first, user approval, then migration.
1. (Med) F.1 — `.fc-fab` audit + migration plan + execute (or explicitly defer to Phase 4 with user approval).
2. (High) F.2 — `.fc-btn-primary` audit + per-call-site categorization + user-approved migration plan. **No global redirect.** Migration staged across Phases 1–8.
3. (Med) F.3 — `.fc-attention-*` audit + categorization + migration plan. Migration staged.
4. (High) F.4 — `ClientGlassCard` audit + categorization + per-screen migration plan. Migration staged into Phases 1–8.
5. (High) F.5 — `AnimatedBackground` decision (Option 1 vs Option 2). If Option 2: wire `AtmosphericBackdrop` into shells with default `info` variant. Pause point.
**Pause points:** at every numbered step. Each requires explicit user approval before the next begins.

**Phase 0a completion is required before Phase 0b starts. Phase 0b completion is required before Phase 1 starts. Do not interleave 0a and 0b.**

### Phase 1 — High impact, low risk (4 screens)
**Order:** sequential, not parallel — each one teaches the next.
1. **`/client` (Client Home)** — Low complexity (it's already the 9.1 benchmark; mostly token + lime-CTA + backdrop swap).
2. **`/client/workouts/[id]/start`** — High complexity. The 9.5 benchmark, but block-type tag color + lime-action CTA changes ripple into 11 other executors in Phase 3. **Get this right first** so Phase 3 is mechanical.
3. **`/client/train`** — Low-Medium. Inherits `ClientPageShell` v4 backdrop change from step 1 (info variant). Mostly atomic-application pass.
4. **`/client/workouts`** — Medium. Most logic in `EnhancedClientWorkouts.tsx`; conversion happens in the delegate.
**Pause points:** after each screen, user reviews. v4 §19 explicitly says "After Phase 1: pause, refine system to v5 if needed."

### Phase 2 — Designed patterns, untested screens (5 screens)
**Order:** by dependency.
1. `/client/profile` (Low) — info-dominant baseline.
2. `/client/check-ins` (Low) — info-dominant.
3. `/client/programs/[id]/details` (Med) — uses pause-states (§9.6), introduces variant.
4. `/client/workouts/[id]/details` (High — 1692 lines) — backend hook audit critical.
5. `/client/workouts/[id]/complete` (High — 1948 lines) — celebration treatment introduces achievement backdrop variant.
**Pause point:** after #5, user reviews celebration treatment.

### Phase 3 — Multi-step flows + remaining workout block executors
**Order:**
1. `/client/check-ins/weekly` and `/client/check-ins/history` (Med, Low) — apply step counter atomic.
2. Block executors in alphabetical order, except Tabata last because §18.5 verify needed.
**Pause point:** before Tabata — confirm block structure.

### Phase 4 — Goals / Habits / Activity (NEW v4 patterns)
**Order:** by complexity ascending so the easier ones de-risk the hardest.
1. `/client/activity` (Low) — replaces emoji icons with Lucide.
2. `/client/habits` (Med) — applies §7.4 first.
3. `/client/goals/history` (Med) — archive section atomic baseline.
4. `/client/goals` (High — 2122 lines) — applies §7.3 + §13.11; **the most v4-divergent screen on the client side** (red FAB, decorative pillar emojis, weak inline editor, red deadlines).
**Pause point:** after Goals — full visual review. This is where v4's restraint principle is most tested.

### Phase 5 — Nutrition (4 screens + 1 form)
**Order:**
1. `/client/nutrition/foods/create` (Low — multi-step builder).
2. `/client/nutrition/foods/[id]` (Med).
3. `/client/nutrition/meals/[id]` (Med).
4. `/client/nutrition` (High — composes §7.10 macro pill row).
**Pause point:** macro-bar variance coloring (§17 anti-pattern #10) is highest-risk; review after #4.

### Phase 5.5 — Chart Styling pass (BLOCKS Phase 6)
**Order:** strictly sequential — Section 5.5 above governs.
1. (Med) Define chart tokens; user approval before adoption.
2. (Med) Refactor `PRTimelineChart`, `AdherenceTrendChart`, `WorkoutAnalytics` (and any other chart wrappers found in the audit) to read tokens.
3. (Low) Visual review of three chart instances per variant (line, bar, ring).
4. (Low) Append chart-palette addendum to this rollout plan.
**Pause point:** at every step. Phase 6 chart-bearing screens are blocked until completion.

### Phase 6 — Progress sub-domains (11 screens)
**Order:** by dependency.
1. `/client/progress` (Med) — applies §7.11 monthly summary.
2. `/client/progress/personal-records` (Med) — applies §7.6.
3. `/client/progress/achievements` (Med) — applies §7.5.
4. `/client/progress/leaderboard` (Med) — applies §7.7.
5. `/client/progress/body-metrics` (High — 1857 lines).
6. `/client/progress/workout-logs` (Med) → `/[id]` (High — 1245 lines): apply §7.12 then §7.13.
7. `/client/progress/mobility`, `/performance`, `/nutrition` (Low each).
8. `/client/progress/analytics` (Blocked — product decision per §18.4 charts + the user's deferred analytics restructure).
9. `/client/progress/photos` (redirect — verify only).
**Pause points:** after #2 (PRs unlock the gold-accent token in real use); after #5 (most-dense); analytics blocked.

### Phase 7 — Challenges (2 screens)
**Order:** `/client/challenges` then `/client/challenges/[id]`.
Low complexity overall.

### Phase 8 — Coach side (~25 screens)
**Order:** likely needs v5 refinement first per v4 §19.
1. `/coach` (High) — applies §7.9.
2. `/coach/clients` (High — list with status-tints).
3. `/coach/clients/[id]` parent + 10 sub-routes (Highest — needs holistic Tab strip review).
4. `/coach/gym-console` (High — applies §7.15 Live Roster).
5. `/coach/programs` family (4 routes) — applies §7.16 + §7.8.
6. `/coach/workouts/templates` family (4 routes) — same.
7. `/coach/exercises`, `/coach/categories`, `/coach/training`, `/coach/menu` — libraries + hubs.
8. `/coach/profile`, `/coach/goals`, `/coach/challenges`, `/coach/challenges/[id]`.
9. `/coach/nutrition` family (8 routes) — applies §7.10 + §7.14.
10. `/coach/analytics`, `/coach/reports`, `/coach/adherence`, `/coach/compliance`, `/coach/progress` — analytics dashboards.
**Pause points:** after `/coach/clients/[id]` (vocabulary & tab decisions); after `/coach/gym-console` (Live Roster pattern); before `/coach/nutrition/generator` (Meal Plan Generator wizard — apply §7.14).

### Phase 9 — Admin (4 screens)
**Order:** any. Utility-grade. Apply minimum tokens; no §3 backdrop or use info at low intensity.

### Phase 10 — Auth / onboarding (3+ screens)
**Order:** product decision required first. v4 §18.3 defers onboarding visual language. **Do not start until product decides** whether onboarding follows v4 strict or gets a softer illustrative system.

---

═══════════════════════════════════════════════
## SECTION 5 — Risks and Open Questions
═══════════════════════════════════════════════

### A. Things I am uncertain about

1. **`AnimatedBackground` decision (Section 1D, 3D).** I recommend Option 2 (layered). I am guessing the user prefers the time-of-day gradient stays. Confirm.
2. **`ClientGlassCard` migration.** Most client surfaces use it as the default content card with a 4px cyan accent. v4's default is `fc-surface` (no accent). Migration is large but necessary. I cannot fully estimate the blast radius without grepping every call site — flagged as a risk for Phase 0.
3. **Light-theme values for new tokens.** Per user decision 2026-04-26 (captured in Section 1A's light-theme policy callout), light-theme values mirror dark and are flagged `[verify-light-theme]`. No converted screen in Phases 1–8 must produce correct light-theme output; light theme is intentionally deferred until a dedicated post-Phase-8 pass. If a converted screen breaks light-theme, that is acceptable. Cursor must NOT optimize for light theme on a per-screen basis during the rollout.
4. **`.fc-btn-primary` rename strategy.** Resolved per user decision 2026-04-26: audit-first approach in Phase 0b. See Section 3E. The earlier "redirect during transition" idea is explicitly rejected.
5. **Activity emoji icons.** v4 §8.1 forbids emoji; 95-STANDARD §11 allowed them on activity types. v4 wins per user instruction, but losing the recognizable activity emojis (🏃 🚴 etc.) is a UX loss without good Lucide replacements. Low confidence in this trade.
6. **Tabata structure** (§18.5). I do not know what shape this block executor takes; the audit pass is the only way to find out.
7. **Whether all 75+ screens actually need conversion.** Some are nearly trivial (admin, redirects). The "75+" figure from v4 §19 is an upper bound; real count of *meaningful* conversions is likely closer to 60.
8. **Coach side may need v5.** v4 §19 says "likely needs design-system v5". I have built the plan assuming v4 is sufficient. After Phase 1–4 lessons, this assumption may break.
9. **Backend hooks per screen.** I have NOT done the §16.1 step 1 audit pass per screen. The "Backend-connected elements to preserve" lists in Section 2 are best-guess from filenames + the inventory's Phase-4 notes. **Each screen's audit must happen before its conversion** — per the user's "no assumptions" rule.

### B. Things v4 doesn't cover that this codebase needs

1. **Charts** (§18.4 explicit defer). [`PRTimelineChart`](src/components/progress/PRTimelineChart.tsx), [`AdherenceTrendChart`](src/components/coach/AdherenceTrendChart.tsx), [`WorkoutAnalytics`](src/components/progress/WorkoutAnalytics.tsx) — all need a chart styling spec. v4 says "use existing accents"; I recommend deferring chart polish to a v4.1 chart pass.
2. **Coach Goals hub (`/coach/goals`)** — v4 §13/14 doesn't have a "Coach client-goals overview" recipe. Likely §13.4 list + §13.5 detail per client; **flag for v5**.
3. **Coach Habits library (`CoachHabitsLibraryPage`)** — same.
4. **Program Progression Grid** ([`ProgramProgressionGrid`](src/components/coach/ProgramProgressionGrid.tsx)) — a coach editor pattern not directly described by §7.16. Composite candidate for v5.
5. **Workout Assignment Modal** ([`WorkoutAssignmentModal`](src/components/features/nutrition/MealPlanAssignmentModal.tsx)) — partly §7.16 builder. Add to atomic application.
6. **Authentication / onboarding** (§18.3 explicit defer).
7. **Notification screens / push UI** (§18.6 explicit defer).
8. **Full-viewport screens** like `/coach/gym-console` (`h-[100dvh] flex flex-col`) — v4 doesn't address this layout shape. Section 8.5 flags it.
9. **Modal patterns at large.** v4 §15.1 says modals exist; doesn't define their interior. Likely composite of existing atomics, but worth a future spec.
10. **Coach client filters/segments** beyond the simple filter pill row (§6.34). The `/coach/clients` page has rich filters not covered by §6.34 alone.

### C. Risks specific to this codebase

1. **Two contradictory style standards co-exist.** 95-STANDARD says cyan CTAs, v4 says lime CTAs. The 75+ screens were "Phase-4 polished" against 95-STANDARD. Every "verify-done" screen needs another full pass for v4. **The screen-inventory's "verify-done" cells must NOT be read as "screen is done."**
2. **The `fc-card-shell` prescription-shell pattern** is the de-facto default content card (via `ClientGlassCard`). v4 makes this a *status-tinted-card-info* variant only. **A large surface of cards needs to change from `fc-card-shell` → `fc-surface`.**
3. **`AnimatedBackground` is theme-context-driven** ([`useTheme()`](src/contexts/ThemeContext.tsx) `getTimeBasedGradientColors`). Replacing it (Option 1) requires unwinding theme-context dependencies. Layering (Option 2) avoids that but adds a wrapper layer that may compound visual complexity.
4. **`.fc-fab` is red** and used live on Goals, Habits, possibly Body Metrics. Phase 0 rewrites the rule globally; if any caller was relying on the red color *as a destructive signal* (none should be — FAB is creative per §6.21), behavior changes.
5. **`text-cyan-400` was massively swept** to `--fc-accent` already (per Phase 4 inventory notes). v4 needs another sweep — many of those `--fc-accent` references should become `--fc-accent-lime` for CTAs and stay `--fc-accent-cyan` for system. **Discriminating by role, not by token, is the hard part.**
6. **Block executors share `BaseBlockExecutor`** ([`src/components/client/workout-execution/BaseBlockExecutor.tsx`](src/components/client/workout-execution/BaseBlockExecutor.tsx)). Phase 1.2 changes here propagate to all 12+ executors. High leverage if right; high risk if wrong.
7. **Page count drift.** v4 §19 says "75+ screens"; my glob found 84 `page.tsx` + 1 `page.client.tsx` = 85. Inventory said 82+1=83 post-Phase-1.4. The discrepancy is likely 2-3 routes added since 2026-04-16. Actual count of *meaningful* screens for conversion: ~60–70 (excluding admin, redirects, root, dev-only).
8. **Database contract is sacred.** Per the user rules at the top of this session, no schema changes are permitted. v4 §18.7 vocabulary decisions like `meal_plan_assignments` vs `assigned_meal_plans` cannot be resolved by changing DB — only by deciding what the UI *says* and verifying which column the code reads.
9. **The `coach/clients/[id]/programs/[programId]` Pause/Resume UI** has a deferred shell migration. Phase 8 must conclude this.
10. **The `Optimized*` family of components** ([`OptimizedAnalyticsOverview`](src/components/coach/OptimizedAnalyticsOverview.tsx), [`OptimizedAdherenceTracking`](src/components/coach/OptimizedAdherenceTracking.tsx), etc.) was rewritten in Phase 2.2 to remove nested `AnimatedBackground`. v4 conversion happens **inside** these components; the page files are already clean shells.

---

═══════════════════════════════════════════════
## SECTION 6 — Operational protocols
═══════════════════════════════════════════════

> These protocols govern how Cursor operates during the rollout. They are non-negotiable. Any conflict between v4, this rollout plan, and Section 6 is resolved by Section 6 winning on operational matters (recovery, scope, drift, review cadence). v4 still governs the visual outcome.

### A. Recovery strategy (no version-control involvement by Cursor)

When a screen conversion produces output the user is unhappy with, recovery happens through one of three paths. **All three paths are controlled by the user manually, outside this Cursor session.**

1. **The user reverts changes through their own workflow.** Cursor takes no action and is not informed of the mechanics. Cursor must not ask, suggest, or speculate about how the revert will happen.
2. **The user asks Cursor to re-do the conversion from a clean starting state, working ONLY on the file paths the user specifies.** Cursor does not assume which files to touch. If the user does not list a file, Cursor does not touch it.
3. **The user leaves the bad output in place and asks Cursor to iteratively correct specific issues, identified one at a time.** Cursor addresses only the issue named, in only the file(s) named, and reports back in chat.

**Cursor's responsibility for recovery is strictly limited to:**
- Not making things worse by editing files outside the scope the user just specified.
- Not silently expanding scope beyond what was asked.
- Reporting clearly what it changed in each session so the user can decide independently how to handle it.

**Cursor must not:**
- Initiate recovery on its own.
- Propose any version-control workflow as part of recovery.
- Reference any version-control concept in any plan, summary, or next-steps suggestion.
- Ask the user to perform any version-control operation on Cursor's behalf.
- Assume the state of any file beyond what is currently visible in its open editor or read-tool output.

If a tool or workflow appears to require a version-control operation, **Cursor stops and tells the user it cannot proceed**. Cursor does not attempt a workaround.

### B. Cursor drift self-check

After each screen conversion is declared complete, Cursor must produce a self-report **in chat** (not in a file) that contains the following, written **without re-reading [`docs/design-system-v4.md`](docs/design-system-v4.md) at the moment of writing**:

> "List the design system rules I applied to this screen — atomics, tokens, principles, anti-patterns I checked. Be specific to this screen, not generic."

If the report is vague, generic, or contradicts what was actually done (e.g. "I applied lime CTAs and atmospheric backdrop" without naming which atomics/tokens/§ refs), **the screen is NOT considered done.** The user pins the design system again, Cursor re-reads the relevant sections, and the screen is reviewed from scratch against v4.

This self-check is the operational guardrail against the §16.2 "anti-cargo-culting" failure mode. v4's atomics only stay coherent if Cursor can articulate why each was chosen for each screen.

### C. Accumulated learnings file

Create [`docs/ui-rollout-notes.md`](docs/ui-rollout-notes.md) during Phase 0a as an append-only journal. Per-screen learnings to capture:

- **What worked.** Atomics that mapped cleanly. Tokens that needed no hand-holding.
- **What broke.** Compositions that didn't fit any v4 recipe. Atomics that needed a variant not in §6.
- **What surprised.** Backend hooks or props discovered during the audit pass that were not captured in this rollout plan.
- **What Cursor got wrong.** Cases where the conversion missed a rule, regressed a backend hook, invented an atomic, or violated scope.

**Read this file at the start of every subsequent screen conversion.** Do not start a new conversion without reading the latest entries. If a recurring failure mode appears, escalate to the user before starting a new conversion that risks the same failure.

### D. Per-phase pause and review

- **No phase begins until the user has visually reviewed the completed prior phase and explicitly approved proceeding.**
- The plan-as-written authority does NOT extend across phase boundaries without user sign-off.
- Per-phase user-review pause points already captured in Section 4 are minima, not maxima — the user may insert additional reviews mid-phase.
- A phase is "complete" only when:
  1. Every screen in the phase passes its v4 universal Definition-of-done contract (Section 2).
  2. The user has visually reviewed each completed screen.
  3. The accumulated learnings file (Section 6.C) has an entry for each screen.
  4. The Cursor drift self-check (Section 6.B) has been produced and accepted for each screen.

If a screen fails any of the four criteria, the phase is not complete and the next phase does not start.

### E. Scope discipline

Every Cursor session in this project operates on an explicit list of files specified by the user.

- **Cursor does not touch files outside that list.**
- If a conversion appears to require touching a file the user did not specify, **Cursor stops and asks before proceeding**.
- This rule applies even when v4 or this rollout plan would otherwise authorize the change. v4 authority is screen-bound; per-session scope authority belongs to the user.
- If the user says "convert /client/goals" and the conversion needs to update [`src/components/goals/GoalCard.tsx`](src/components/goals/GoalCard.tsx), Cursor confirms that side-edit is in scope before making it.
- If a side-edit is denied, Cursor proposes alternative paths (inline the change in the page file with a TODO note, or skip the touch) — never silent edits.

This rule overrides the rollout plan's per-screen "Atomics used" / "Composites used" / "Existing components to refactor" lists. Those lists are the **target state**. The **session scope** is determined by the user at the start of each session.

---

> Screens marked `[delegate]` mean the page file is a thin wrapper; conversion lives in the named component.

**Phase 1 (4):** `/client`, `/client/workouts/[id]/start`, `/client/train`, `/client/workouts` `[delegate → EnhancedClientWorkouts]`

**Phase 2 (5):** `/client/workouts/[id]/details`, `/client/workouts/[id]/complete`, `/client/programs/[id]/details`, `/client/profile`, `/client/check-ins`

**Phase 3 (3+12 block executors):** `/client/check-ins/weekly`, `/client/check-ins/history`, block executors for all 12 v4 §7.2 block types

**Phase 4 (4):** `/client/goals`, `/client/goals/history`, `/client/habits`, `/client/activity`

**Phase 5 (4):** `/client/nutrition`, `/client/nutrition/meals/[id]`, `/client/nutrition/foods/[id]`, `/client/nutrition/foods/create`

**Phase 6 (11):** `/client/progress`, `/client/progress/personal-records`, `/client/progress/achievements`, `/client/progress/leaderboard`, `/client/progress/body-metrics`, `/client/progress/analytics`, `/client/progress/workout-logs`, `/client/progress/workout-logs/[id]`, `/client/progress/mobility`, `/client/progress/performance`, `/client/progress/nutrition`, `/client/progress/photos` (redirect — verify)

**Phase 7 (2):** `/client/challenges`, `/client/challenges/[id]`

**Phase 8 (≈37):**
- Hubs/lists: `/coach`, `/coach/clients`, `/coach/clients/add`, `/coach/training`, `/coach/menu`, `/coach/exercises`, `/coach/categories`, `/coach/programs`, `/coach/workouts/templates`, `/coach/nutrition`, `/coach/nutrition/foods`, `/coach/nutrition/meal-plans`, `/coach/nutrition/assignments`, `/coach/goals`, `/coach/challenges`, `/coach/profile`, `/coach/adherence`, `/coach/compliance`, `/coach/analytics`, `/coach/reports`, `/coach/progress`, `/coach/gym-console`
- Detail/editor/wizard: `/coach/clients/[id]`, `/coach/clients/[id]/profile`, `/coach/clients/[id]/workouts`, `/coach/clients/[id]/workout-logs`, `/coach/clients/[id]/workout-logs/[logId]`, `/coach/clients/[id]/stats`, `/coach/clients/[id]/progress`, `/coach/clients/[id]/check-ins`, `/coach/clients/[id]/meals`, `/coach/clients/[id]/programs/[programId]`, `/coach/programs/create`, `/coach/programs/[id]`, `/coach/programs/[id]/edit`, `/coach/workouts/templates/create`, `/coach/workouts/templates/[id]`, `/coach/workouts/templates/[id]/edit`, `/coach/nutrition/meal-plans/create`, `/coach/nutrition/meal-plans/[id]`, `/coach/nutrition/meal-plans/[id]/edit`, `/coach/nutrition/generator`, `/coach/challenges/[id]`

**Phase 9 (4):** `/admin/tracking-sources`, `/admin/habit-categories`, `/admin/goal-templates`, `/admin/achievement-templates`

**Phase 10 (≥3):** `/`, `/create-user`, plus any onboarding screens that emerge from the product decision flagged in §18.3.

**Total in plan:** ~80 routes (matches v4 §19 "75+").

---

## Appendix — How to use this document during a screen conversion (Cursor instruction)

For every screen, the agent must:
1. Open this plan, locate the screen's section.
2. Open [`docs/design-system-v4.md`](docs/design-system-v4.md) and read every § cited in the screen's Atomics / Composites / Anti-patterns / `[verify]` flags.
3. Run v4 §16.1's 7-pass workflow against the screen, in order:
   a. Audit pass (enumerate backend hooks)
   b. Atomic decomposition pass (use the screen's Atomics list as the starting set)
   c. Token replacement pass (strip remaining hardcoded colors)
   d. Atomic application pass (use Phase 0 atomics as canonical)
   e. Composite check pass (verify §7 composites)
   f. Polish pass (apply §3 backdrop, motion, focus, accent role rules)
   g. Review pass (anti-cargo-culting check per §16.2)
4. Verify against the §14 Application Matrix.
5. Confirm every item in the universal v4 Definition-of-done contract (Section 2 above) is checked.
6. Surface any new `[verify]` flag immediately — never silently assume.

If at any step v4 says one thing and 95-STANDARD or any retired doc says another: **v4 wins**.
