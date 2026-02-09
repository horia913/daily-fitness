# Mockup generation prompt (client dashboard & live workout)

Use this prompt to generate HTML mockups that match the app’s Crystalline Kinetic style and client/live-workout needs. Paste the sections below into your generator, then add the specific screen name and requirements.

---

## 1. Style and tech stack (required)

Generate a **single, self-contained HTML file** that:

- Uses **only** technologies that work as static assets on Vercel:
  - HTML5
  - Tailwind CSS via CDN: `https://cdn.tailwindcss.com`
  - Google Fonts: Inter (400, 500, 600, 700) and JetBrains Mono (500)
  - Lucide icons via `https://unpkg.com/lucide@latest` with `data-lucide` attributes and `lucide.createIcons()` in a script at the end
- No server-side code, no Node `require()`, no experimental or unsupported CSS/JS.
- Follow the **Crystalline Kinetic** visual system below.

### Crystalline Kinetic visual system

- **Colors**: `--primary: #EF4444`, `--secondary: #3B82F6`, `--accent: #10B981`, `--bg-dark: #0A0A0A`, `--glass: rgba(255,255,255,0.03)`, `--glass-border: rgba(255,255,255,0.1)`.
- **Cards**: `.crystal-card` — gradient background, `backdrop-filter: blur(20px)`, border, `border-radius: 24px`; optional `.kinetic-shimmer` with a subtle animated shine.
- **Background**: `.refraction-bg` — fixed full-viewport layer with soft radial gradients (e.g. blue and red at corners).
- **Typography**: `.text-h1` (30px bold), `.text-h2` (20px semibold), `.text-h3` (18px medium), `.text-body` (16px), `.text-caption` (14px, muted); `.mono` for numbers.
- **Buttons**: Primary = gradient (e.g. red), shadow, min height 48px, hover lift; secondary = outline/glass; all with `cursor-pointer`, transitions, and active scale.
- **Touch**: Minimum touch targets 44–48px; spacing between tap targets at least 16px.

---

## 2. Client dashboard & live workout requirements (from checklist)

When generating **client dashboard** or **live workout** screens, include these where they apply:

### Client dashboard (e.g. home / today)

- **Personalization**: Time-based greeting (“Good morning, [Name]!”), subtitle (“Ready to crush your goals today?” or similar).
- **Workout recommendation**: Prominent “Today’s workout” card with protocol label, duration, exercise/set count, and a clear “Start Workout” primary button; optional progress ring (e.g. weekly goal %).
- **Stats**: Up to two hero cards — e.g. “Weekly Activity” (workouts done vs goal, streak, volume, time, PRs) and “Progress Snapshot” (weight trend, strength trend); optional small heatmap or progress bar.
- **Coach communication**: One card showing last coach message (avatar, name, time, short message) and a message/reply affordance; optional “New Milestone” or motivation card.
- **Thumb zone**: Bottom nav with clear labels (e.g. Dash, Plan, Stats) and a central primary CTA (e.g. “Quick Log” or “Start Workout”) — all with icons + text, no icon-only without label.

### Live workout – straight set (and similar blocks)

- **Current exercise hero**: Exercise name dominant (e.g. large bold title); set/rep target and rest clearly visible; block type badge if needed (e.g. “Straight set”).
- **Set progress**: “Set X of Y” with a progress bar or set bubbles (e.g. ○ ○ ● ○); color cue for current set (e.g. blue = upcoming, orange = current, green = done).
- **Input**: Large weight and reps inputs (touch-friendly); optional quick +/- buttons; optional “Same as last” or suggested weight.
- **Completion / rest (Straight Set Completion view)**:
  - Confirmation: “Set X of Y completed” with checkmark and logged weight × reps.
  - Optional PR badge: “Personal Record!” when the set is a PR.
  - Rest timer: Large countdown (MM:SS), circular progress, “Next set” (or “Next exercise”) label; “Skip rest” and optional “+30s”.
  - Next set preview: e.g. “Next: Set 3 of 4” or next exercise name.
- **Safety**: Exit/pause clearly available; no critical action without confirmation where appropriate.
- **Feedback**: Success state on log (e.g. checkmark); optional short haptic on button press (`navigator.vibrate` if available).

### Universal (all mockups)

- **Hierarchy**: One H1 per page; consistent H2/H3/body/caption.
- **Affordances**: Buttons look clickable (shadow, hover); icon + text where space allows, or `aria-label` for icon-only.
- **Contrast**: Text readable on dark background; semantic use of primary (urgency/action), secondary (info), accent (success).

---

## 3. What to generate (replace with your screen)

**Screen to generate:** [e.g. “Live Workout Straight Set Completion”]

**Description:**  
[One or two sentences: when this screen appears and what the user sees — e.g. “The view right after the user logs one set in a straight set block: set completed confirmation, optional PR badge, rest timer with countdown, Skip rest / +30s, and Next set.”]

**Required UI elements:**  
[List key elements so nothing is missed — e.g. header with back, exercise name, “Set 2 of 4 completed”, weight × reps, PR badge (optional), rest timer ring + MM:SS, “Next set”, “Skip rest” button, “+30s” button.]

Output a single HTML file that:
1. Uses the Crystalline Kinetic style and tech stack above.
2. Uses only Vercel-compatible HTML/CSS/JS (Tailwind CDN, Lucide CDN, no Node/server).
3. Includes all required UI elements with placeholder or example content (no real API or backend).
4. Is self-contained (no external CSS/JS files except the CDN links already specified).
