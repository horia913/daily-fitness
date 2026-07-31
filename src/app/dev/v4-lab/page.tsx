"use client";

/**
 * /dev/v4-lab — v4 atomic showcase page (hidden, dev-only)
 *
 * Phase 0a — Additive foundation.
 * Renders every NEW v4 atomic side-by-side. This is a self-contained showcase
 * page for visual review of tokens, utility classes, and components added in
 * Phase 0a. It does NOT share layout chrome with client/coach pages and is NOT
 * linked from the bottom nav or any user-facing route.
 *
 * Spec refs: design-system-v4 §3, §6.x.
 */

import React from "react";
import HeroActionCard from "@/components/ui/HeroActionCard";
import InlineEditor from "@/components/ui/InlineEditor";
import TargetProgressBar from "@/components/ui/TargetProgressBar";
import TierBadge from "@/components/ui/TierBadge";
import Banner from "@/components/ui/Banner";
import FilterPills from "@/components/ui/FilterPills";
import WeekMiniGrid from "@/components/ui/WeekMiniGrid";
import FrequencySelector from "@/components/ui/FrequencySelector";
import AtmosphericBackdrop, {
  type AtmosphericVariant,
} from "@/components/ui/AtmosphericBackdrop";
import { deadlineUrgency } from "@/lib/deadlineUrgency";
import { staleData } from "@/lib/staleData";

function Section({
  id,
  title,
  spec,
  children,
}: {
  id: string;
  title: string;
  spec: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10">
      <header className="mb-3">
        <div
          className="text-[9px] font-bold tracking-[0.16em] uppercase"
          style={{ color: "var(--fc-text-subtle)" }}
        >
          {spec}
        </div>
        <h2
          className="text-lg font-bold"
          style={{ color: "var(--fc-text-primary)" }}
        >
          {title}
        </h2>
      </header>
      <div
        className="rounded-2xl border p-5"
        style={{
          background: "var(--fc-surface-card)",
          borderColor: "var(--fc-glass-border)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

const BACKDROP_VARIANTS: AtmosphericVariant[] = [
  "action-top",
  "action-bottom",
  "info",
  "warning",
  "achievement",
];

export default function V4LabPage() {
  const [pillFilter, setPillFilter] = React.useState<"all" | "active" | "done">(
    "all",
  );
  const [freq, setFreq] = React.useState<{
    count: number;
    period: "day" | "week" | "month";
  }>({ count: 3, period: "week" });

  const today = new Date();
  const inTwoDays = new Date();
  inTwoDays.setDate(today.getDate() + 2);
  const inTenDays = new Date();
  inTenDays.setDate(today.getDate() + 10);
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(today.getDate() - 10);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(today.getDate() - 90);

  return (
    <main
      className="min-h-screen"
      style={{
        background: "var(--fc-bg-basalt)",
        color: "var(--fc-text-primary)",
      }}
    >
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8">
          <div
            className="text-[10px] font-bold tracking-[0.16em] uppercase"
            style={{ color: "var(--fc-accent)" }}
          >
            Dev only · v4-lab
          </div>
          <h1
            className="font-bold leading-tight"
            style={{
              fontFamily:
                "var(--font-display, var(--font-number, var(--font-mono, ui-monospace, monospace)))",
              fontSize: "clamp(28px, 6vw, 36px)",
              letterSpacing: "-0.02em",
            }}
          >
            v4 atomic showcase
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--fc-text-dim)" }}
          >
            Phase 0a additive foundation. Every component below is new and
            uses only Phase 0a tokens, utility classes, and components.
          </p>
        </header>

        <Section
          id="hero-action"
          title="Hero (Action) card"
          spec="§6.4 — Hero action card / 1.B.1 fc-hero-action"
        >
          <HeroActionCard
            eyebrow="Today"
            pill={
              <span className="tag-system">Push Day</span>
            }
            title="Upper Body Strength"
            meta="6 exercises · 45 min · Last done 4 days ago"
            cta={
              <button type="button" className="btn-action w-full sm:w-auto">
                Start workout
              </button>
            }
          />
        </Section>

        <Section
          id="inline-editor"
          title="Inline editor"
          spec="§6.8 — Inline editor / .input-cell"
        >
          <InlineEditor
            label={<>Current weight <span style={{ color: "var(--fc-text-quaternary)" }}>(target 78 kg)</span></>}
            value={82.4}
            unit="kg"
            onUpdate={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </Section>

        <Section
          id="target-progress"
          title="Target progress bar (with variance)"
          spec="§6.11 — Target-progress bar / 1.B.9 .target-bar"
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs" style={{ color: "var(--fc-text-dim)" }}>Calories — on target</span>
                <span className="text-xs" style={{ color: "var(--fc-text-dim)" }}>2,038 / 2,000 kcal</span>
              </div>
              <TargetProgressBar current={2038} target={2000} unit="kcal" showTargetTick />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs" style={{ color: "var(--fc-text-dim)" }}>Protein — near target</span>
                <span className="text-xs" style={{ color: "var(--fc-text-dim)" }}>132 / 150 g</span>
              </div>
              <TargetProgressBar current={132} target={150} unit="g" showTargetTick />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs" style={{ color: "var(--fc-text-dim)" }}>Carbs — off target</span>
                <span className="text-xs" style={{ color: "var(--fc-text-dim)" }}>340 / 220 g</span>
              </div>
              <TargetProgressBar current={340} target={220} unit="g" showTargetTick />
            </div>
          </div>
        </Section>

        <Section
          id="tier-badge"
          title="Tier badge"
          spec="§6.18 — Tier badge / .tier-badge"
        >
          <div className="flex flex-wrap gap-2">
            <TierBadge tier="bronze" />
            <TierBadge tier="silver" />
            <TierBadge tier="gold" />
            <TierBadge tier="platinum" />
          </div>
        </Section>

        <Section
          id="banner"
          title="Banner (info / warning / error / success)"
          spec="§6.32 — Banner / 1.B.2 fc-card-status-*"
        >
          <div className="space-y-3">
            <Banner variant="info" title="Coach scheduled a check-in" message="Your next check-in is on Friday." />
            <Banner
              variant="warning"
              title="Subscription expires in 5 days"
              message="Renew to keep your training plan active."
              actions={[{ label: "Renew", onClick: () => {}, primary: true }]}
            />
            <Banner variant="error" title="Connection lost" message="Failed to save. Check your network." />
            <Banner variant="success" title="Personal record!" message="New best on bench: 92.5 kg." />
          </div>
        </Section>

        <Section
          id="filter-pills"
          title="Filter pill row"
          spec="§6.34 — Filter pills / 1.B.14 .filter-pills"
        >
          <FilterPills
            value={pillFilter}
            onChange={setPillFilter}
            options={[
              { value: "all", label: "All", count: 12 },
              { value: "active", label: "Active", count: 5 },
              { value: "done", label: "Completed", count: 7 },
            ]}
          />
        </Section>

        <Section
          id="week-grid"
          title="Per-week mini grid"
          spec="§6.30 — Per-week mini-stat grid"
        >
          <div className="space-y-4">
            <WeekMiniGrid
              ariaLabel="Workouts last 7 days (binary)"
              days={[
                { label: "M", value: 1 },
                { label: "T", value: 0 },
                { label: "W", value: 1 },
                { label: "T", value: 1 },
                { label: "F", value: 0 },
                { label: "S", value: 1 },
                { label: "S", value: 1 },
              ]}
            />
            <WeekMiniGrid
              ariaLabel="Sets logged last 7 days (scaled)"
              mode="scale"
              accent="var(--fc-accent)"
              days={[
                { label: "M", value: 6 },
                { label: "T", value: 0 },
                { label: "W", value: 12 },
                { label: "T", value: 18 },
                { label: "F", value: 4 },
                { label: "S", value: 22 },
                { label: "S", value: 9 },
              ]}
            />
          </div>
        </Section>

        <Section
          id="frequency"
          title="Frequency selector"
          spec="§6.26 — Frequency selector / .input-cell"
        >
          <FrequencySelector value={freq} onChange={setFreq} label="How often?" />
          <div className="mt-3 text-xs" style={{ color: "var(--fc-text-subtle)" }}>
            Selected: {freq.count} times {freq.period === "day" ? "per day" : freq.period === "week" ? "per week" : "per month"}
          </div>
        </Section>

        <Section
          id="atmospheric"
          title="Atmospheric backdrop variants (Option 2 — layered)"
          spec="§3 — Atmospheric backdrops / 1.B.3 fc-backdrop-*"
        >
          <p className="mb-4 text-xs" style={{ color: "var(--fc-text-subtle)" }}>
            Each tile shows the role-based overlay only. In production, this overlay sits on top of the page-level
            <code className="mx-1 rounded px-1.5 py-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>AnimatedBackground</code>
            inside the page shells.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BACKDROP_VARIANTS.map((v) => (
              <div
                key={v}
                className="relative h-24 overflow-hidden rounded-2xl border"
                style={{ borderColor: "var(--fc-glass-border)" }}
              >
                <AtmosphericBackdrop variant={v} />
                <div className="absolute inset-0 flex items-end p-3">
                  <span
                    className="text-[10px] font-bold tracking-[0.12em] uppercase"
                    style={{ color: "var(--fc-text-primary)" }}
                  >
                    {v}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="deadline"
          title="Deadline urgency text"
          spec="§6.9 — Deadline urgency / .deadline[data-urgency]"
        >
          <ul className="space-y-1 text-sm">
            {[
              { label: "Overdue (-3 days)", res: deadlineUrgency(new Date(Date.now() - 3 * 86400000)) },
              { label: "Imminent (today)", res: deadlineUrgency(today) },
              { label: "Imminent (in 2 days)", res: deadlineUrgency(inTwoDays) },
              { label: "Soon (in 10 days)", res: deadlineUrgency(inTenDays) },
              { label: "Distant (in 30 days)", res: deadlineUrgency(new Date(Date.now() + 30 * 86400000)) },
              { label: "None", res: deadlineUrgency(null) },
            ].map((row) => (
              <li key={row.label} className="flex items-baseline justify-between gap-3">
                <span style={{ color: "var(--fc-text-subtle)" }}>{row.label}</span>
                <span className="deadline" data-urgency={row.res.urgency}>
                  {row.res.label}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="stale"
          title="Stale-data text"
          spec="§6.10 — Stale data / .stale-data[data-staleness]"
        >
          <ul className="space-y-1 text-sm">
            {[
              { label: "Fresh (10 days ago)", res: staleData(tenDaysAgo) },
              { label: "Aging (30 days ago)", res: staleData(thirtyDaysAgo) },
              { label: "Stale (90 days ago)", res: staleData(ninetyDaysAgo) },
              { label: "Never", res: staleData(null) },
            ].map((row) => (
              <li key={row.label} className="flex items-baseline justify-between gap-3">
                <span style={{ color: "var(--fc-text-subtle)" }}>{row.label}</span>
                <span className="stale-data" data-staleness={row.res.staleness}>
                  {row.res.label}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="utility-snippets"
          title="Utility class samples (delta / variance / priority / system / status)"
          spec="§6.7, §6.12, §6.15–6.17 / 1.B.8"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="delta up">+2.4 kg</span>
            <span className="delta down">-180 kcal</span>
            <span className="delta neutral">0 reps</span>
            <span className="variance-pill" data-variance="on-target">On target</span>
            <span className="variance-pill" data-variance="near-target">Near</span>
            <span className="variance-pill" data-variance="off-target">Off</span>
            <span className="priority-pill" data-priority="high">High</span>
            <span className="priority-pill" data-priority="medium">Medium</span>
            <span className="priority-pill" data-priority="low">Low</span>
            <span className="tag-system">System</span>
            <span className="tag-status" data-status="completed">Completed</span>
            <span className="tag-status" data-status="review">Review</span>
            <span className="tag-status" data-status="urgent">Urgent</span>
            <span className="rarity-pill" data-rarity="common">Common</span>
            <span className="rarity-pill" data-rarity="uncommon">Uncommon</span>
            <span className="rarity-pill" data-rarity="rare">Rare</span>
            <span className="rarity-pill" data-rarity="epic">Epic</span>
            <span className="rarity-pill" data-rarity="legendary">Legendary</span>
          </div>
        </Section>

        <Section
          id="add-placeholder"
          title="Add-item placeholder"
          spec="§6.37 — Add-item placeholder / 1.B.15"
        >
          <button type="button" className="add-placeholder">
            + Add new goal
          </button>
        </Section>

        <Section
          id="archive"
          title="Archive section"
          spec="§6.36 — Archive section / 1.B.17"
        >
          <div className="archive-section">
            <div className="archive-header">
              <span className="archive-eyebrow">Completed</span>
              <span className="archive-count">12 archived</span>
            </div>
            <div className="mt-3 text-sm" style={{ color: "var(--fc-text-dim)" }}>
              (Archived items would appear here at 0.65 opacity.)
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}
