"use client";
import { Coffee, Clock, Info, PauseCircle } from "lucide-react";
import type { DashboardData } from "@/lib/clientDashboardPageData";

export interface HeroWorkoutCardProps {
  todaysWorkout: DashboardData["todaysWorkout"] | undefined;
  programProgress?: DashboardData["programProgress"] | null;
  activeProgramPauseStatus?: string | null;
}

function isPausedAssignment(pauseStatus: string | null | undefined): boolean {
  return (pauseStatus ?? "").toLowerCase() === "paused";
}

/**
 * Phone 1 hero (client-screens-v5.html `.hero-workout` / `.rest-card`).
 * Lime-glow training card or cyan-tint rest / empty-state card. Mount after greeting on `/client`.
 */
export function HeroWorkoutCard({
  todaysWorkout,
  programProgress,
  activeProgramPauseStatus,
}: HeroWorkoutCardProps) {
  const tw = todaysWorkout ?? { hasWorkout: false };
  const hasActiveProgram = programProgress != null;
  const paused = isPausedAssignment(activeProgramPauseStatus);

  if (tw.hasWorkout) {
    return <HeroWorkoutActiveCard tw={tw} />;
  }

  if (hasActiveProgram && paused) {
    return (
      <section className="mb-[22px] mx-4">
        <div
          className="rounded-[18px] border border-[var(--fc-glass-border)] py-[22px] px-4 text-center"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, var(--fc-status-warning) 8%, transparent) 0%, transparent 100%), var(--fc-surface-card)`,
          }}
        >
          <div
            className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full"
            style={{
              background: "color-mix(in srgb, var(--fc-status-warning) 15%, transparent)",
            }}
          >
            <PauseCircle className="h-[18px] w-[18px] text-[var(--fc-status-warning)]" aria-hidden />
          </div>
          <p
            className="mb-1 font-semibold fc-text-primary"
            style={{
              fontFamily: "var(--f-headline, var(--font-body))",
              fontSize: "18px",
            }}
          >
            Program paused. Talk to your coach to resume.
          </p>
        </div>
      </section>
    );
  }

  if (!hasActiveProgram) {
    return (
      <section className="mb-[22px] mx-4">
        <div
          className="rounded-[18px] border border-[var(--fc-glass-border)] py-[22px] px-4 text-center"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, var(--fc-accent-cyan) 5%, transparent) 0%, transparent 100%), var(--fc-surface-card)`,
          }}
        >
          <div
            className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--fc-accent-cyan) 13%, transparent)" }}
          >
            <Coffee className="h-[18px] w-[18px] text-[var(--fc-accent-cyan)]" aria-hidden />
          </div>
          <p
            className="mb-1 font-semibold fc-text-primary"
            style={{
              fontFamily: "var(--f-headline, var(--font-body))",
              fontSize: "18px",
            }}
          >
            Your coach hasn&apos;t assigned a program yet.
          </p>
          <p className="text-xs fc-text-dim">Check back soon!</p>
        </div>
      </section>
    );
  }

  // Active program, not paused, no workout today (scheduled rest / off day in program).
  return (
    <section className="mb-[22px] mx-4">
      <div
        className="rounded-[18px] border border-[var(--fc-glass-border)] py-[22px] px-4 text-center"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, var(--fc-accent-cyan) 5%, transparent) 0%, transparent 100%), var(--fc-surface-card)`,
        }}
      >
        <div
          className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full"
          style={{ background: "color-mix(in srgb, var(--fc-accent-cyan) 13%, transparent)" }}
        >
          <Coffee className="h-[18px] w-[18px] text-[var(--fc-accent-cyan)]" aria-hidden />
        </div>
        <p
          className="mb-1 font-semibold fc-text-primary"
          style={{
            fontFamily: "var(--f-headline, var(--font-body))",
            fontSize: "18px",
          }}
        >
          Rest Day
        </p>
        <p className="text-xs fc-text-dim">
          Recovery is when the magic happens. Stay hydrated.
        </p>
        <p className="mt-2 text-xs fc-text-dim">
          Open Train to see the rest of this week&apos;s schedule.
        </p>
      </div>
    </section>
  );
}

function HeroWorkoutActiveCard({ tw }: { tw: DashboardData["todaysWorkout"] }) {
  const name =
    tw.name?.trim() ||
    (tw.type === "program" && tw.weekNumber != null && tw.dayNumber != null
      ? `Week ${tw.weekNumber} · Day ${tw.dayNumber}`
      : "Workout");

  const metaParts: string[] = [];
  if (typeof tw.totalSets === "number" && tw.totalSets > 0) {
    metaParts.push(`${tw.totalSets} exercise${tw.totalSets === 1 ? "" : "s"}`);
  }
  if (tw.type === "program" && tw.weekNumber != null && tw.dayNumber != null) {
    metaParts.push(`Week ${tw.weekNumber} · Day ${tw.dayNumber}`);
  }
  if (tw.type === "assignment") {
    metaParts.push("Assigned workout");
  } else if (tw.type === "program") {
    metaParts.push("Program workout");
  }
  const metaLine = metaParts.join(" · ") || tw.name || "";

  const durationMin =
    typeof tw.estimatedDuration === "number" && Number.isFinite(tw.estimatedDuration)
      ? tw.estimatedDuration
      : null;
  /** TODO(backend): expose reliable `estimatedDuration` on all `todaysWorkout` branches in `get_client_dashboard`. */
  const durationLabel = durationMin != null ? `~${durationMin} min` : "~60 min";

  const templateId = tw.templateId?.trim();
  const detailsHref =
    templateId && templateId.length > 0 ? `/client/workouts/${templateId}/details` : null;

  return (
    <section className="mb-[22px] mx-4">
      <div
        className="relative overflow-hidden rounded-[28px] border p-[22px]"
        style={{
          borderColor: "color-mix(in srgb, var(--fc-accent-lime) 20%, transparent)",
          background: `
            radial-gradient(ellipse 80% 60% at 100% 0%, color-mix(in srgb, var(--fc-accent-lime-2) 18%, transparent), transparent 60%),
            radial-gradient(ellipse 100% 80% at 0% 100%, color-mix(in srgb, var(--fc-accent-lime) 14%, transparent), transparent 65%),
            linear-gradient(135deg, color-mix(in srgb, var(--fc-surface-elevated) 80%, var(--fc-bg-base)) 0%, var(--fc-surface-card) 100%)`,
          boxShadow: `
            0 20px 50px -20px var(--fc-accent-lime-glow),
            inset 0 1px 0 color-mix(in srgb, var(--fc-text-primary) 6%, transparent)`,
        }}
      >
        <div
          className="pointer-events-none absolute right-0 top-0 h-[220px] w-[220px] opacity-60"
          style={{
            backgroundImage: `repeating-linear-gradient(
              135deg,
              color-mix(in srgb, var(--fc-text-primary) 2.5%, transparent) 0px,
              color-mix(in srgb, var(--fc-text-primary) 2.5%, transparent) 1px,
              transparent 1px,
              transparent 8px
            )`,
          }}
          aria-hidden
        />
        <div className="relative z-[1]">
          <div className="mb-[14px] flex items-start justify-between">
            <p
              className="font-bold uppercase fc-text-primary"
              style={{
                fontFamily: "var(--f-headline, var(--font-body))",
                fontSize: "10.5px",
                letterSpacing: "0.2em",
                color: "var(--fc-accent-lime)",
              }}
            >
              Today&apos;s Work
            </p>
            <div
              className="inline-flex items-center gap-[5px] rounded-full border px-[10px] py-[5px] text-[10.5px] font-semibold tracking-[0.04em] fc-text-primary"
              style={{
                background: "color-mix(in srgb, var(--fc-text-primary) 6%, transparent)",
                borderColor: "color-mix(in srgb, var(--fc-text-primary) 10%, transparent)",
              }}
            >
              <Clock className="h-[11px] w-[11px] shrink-0 fc-text-dim" strokeWidth={2.4} />
              {durationLabel}
            </div>
          </div>

          <h2
            className="mb-1.5 font-semibold fc-text-primary"
            style={{
              fontFamily: "var(--f-headline, var(--font-body))",
              fontSize: "28px",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {name}
          </h2>

          {metaLine ? (
            <p
              className="mb-[18px] text-[12.5px] leading-snug"
              style={{ color: "var(--fc-text-dim)" }}
            >
              {metaLine}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/client/train";
              }}
              className="btn-action flex min-h-0 flex-1 items-center justify-center gap-2 normal-case px-4 py-3.5 text-[14.5px] tracking-[0.01em]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden>
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
              Start Training
            </button>
            {detailsHref ? (
              <button
                type="button"
                onClick={() => {
                  window.location.href = detailsHref;
                }}
                className="btn-ghost-icon grid h-[50px] w-[50px] shrink-0 place-items-center rounded-[14px] border p-0"
                style={{
                  background: "color-mix(in srgb, var(--fc-text-primary) 5%, transparent)",
                  borderColor: "var(--fc-glass-border)",
                  color: "var(--fc-text-dim)",
                }}
                aria-label="Workout details"
              >
                <Info className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
