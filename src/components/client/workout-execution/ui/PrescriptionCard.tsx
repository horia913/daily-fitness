"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/badge";
import type { SetType } from "@/types/workoutSetEntries";
import { SetTypeBadge } from "./SetTypeBadge";

/** Optional visual tone for a stat — used by Target effort (Hard/Max/etc.). */
export type PrescriptionItemTone =
  | "default"
  | "effort-easy"
  | "effort-medium"
  | "effort-hard"
  | "effort-max";

export type PrescriptionItem = {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  /** Visual tone (color of `value`). Default = white. */
  tone?: PrescriptionItemTone;
  /** Mark stat as semantic so layout can prioritise (e.g. Target effort). */
  kind?: "default" | "target-effort";
};

export interface PrescriptionCardProps {
  exerciseTitle: string;
  setType: SetType | string;
  multiExerciseHint?: string;
  prescriptionItems: PrescriptionItem[];
  prescriptionGridClassName?: string;
  coachNotes?: string;
  formCues?: string;
  /** Right side of rx-log-head (set prev/next + “1 / 10”). */
  logNavRight?: React.ReactNode;
  logSectionContent?: React.ReactNode;
  /** Last session + progression (inside card, mock rx-prev). */
  lastSessionSlot?: React.ReactNode;
  titleActions?: React.ReactNode;
  /** Neutral muscle / group pill (mock .tag.muscle). */
  muscleGroupTag?: string | null;
}

function effortToneColorVar(
  tone: PrescriptionItemTone | undefined,
): string | null {
  switch (tone) {
    case "effort-easy":
      return "var(--fc-effort-easy)";
    case "effort-medium":
      return "var(--fc-effort-medium)";
    case "effort-hard":
      return "var(--fc-effort-hard)";
    case "effort-max":
      return "var(--fc-effort-max)";
    default:
      return null;
  }
}

function isTempoItem(item: PrescriptionItem): boolean {
  return String(item.label).trim().toLowerCase().startsWith("tempo");
}

/** Sets / Reps / Rest (+ optional single target effort + tempos) — workout-exec-v6 target-grid Option B. */
function canUseCompactTargetGrid(items: PrescriptionItem[]): boolean {
  const sets = items.find((i) => i.label === "Sets");
  const reps = items.find((i) => i.label === "Reps");
  const rest = items.find(
    (i) => i.label === "Rest" || i.label === "Rest between",
  );
  if (!sets || !reps || !rest) return false;
  const targets = items.filter((i) => i.kind === "target-effort");
  if (targets.length > 1) return false;
  return items.every((it) => {
    if (it.label === "Sets") return it === sets;
    if (it.label === "Reps") return it === reps;
    if (it.label === "Rest" || it.label === "Rest between") return it === rest;
    if (it.kind === "target-effort") return targets.includes(it);
    if (isTempoItem(it)) return true;
    return false;
  });
}

function PrescriptionStatCell({
  item,
  className,
}: {
  item: PrescriptionItem;
  className?: string;
}) {
  const Icon = item.icon;
  const tempoLike = isTempoItem(item);
  const isTargetEffort = item.kind === "target-effort";
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon
          className="size-[11px] shrink-0 text-zinc-500"
          aria-hidden
        />
        <Eyebrow
          tone="zinc"
          density="section"
          className="!mb-0 !text-[9.5px] !font-bold !tracking-[0.1em] !text-zinc-500"
        >
          {item.label}
        </Eyebrow>
      </div>
      <div
        className={cn(
          "text-[28px] font-bold leading-[0.9] tracking-[-0.02em] text-white",
          tempoLike &&
            "font-mono text-[22px] font-bold tracking-[0.06em]",
          isTargetEffort &&
            "text-[22px] font-semibold tracking-[-0.01em]",
        )}
        style={
          isTargetEffort
            ? {
                fontFamily:
                  "var(--font-bricolage-grotesque, var(--font-sans))",
                color: effortToneColorVar(item.tone) ?? undefined,
              }
            : undefined
        }
      >
        <span>{item.value}</span>
        {item.unit ? (
          <span
            className="ml-0.5 text-[13px] font-medium text-zinc-400"
            style={
              isTargetEffort ? { color: "var(--fc-text-dim)" } : undefined
            }
          >
            {item.unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function RxDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-px bg-[color:var(--fc-glass-border)] opacity-90",
        "my-[18px] w-[calc(100%+40px)] -mx-5",
        className,
      )}
      aria-hidden
    />
  );
}

export function PrescriptionCard({
  exerciseTitle,
  setType,
  multiExerciseHint,
  prescriptionItems,
  prescriptionGridClassName,
  coachNotes,
  formCues,
  logNavRight,
  logSectionContent,
  lastSessionSlot,
  titleActions,
  muscleGroupTag,
}: PrescriptionCardProps) {
  const hasRx = prescriptionItems.length > 0;
  const useCompactGrid = canUseCompactTargetGrid(prescriptionItems);
  const hasLog =
    logSectionContent !== undefined &&
    logSectionContent !== null &&
    logSectionContent !== false;
  const hasCoachNotes = Boolean(coachNotes && coachNotes.trim().length > 0);
  const hasFormCues = Boolean(formCues && formCues.trim().length > 0);
  const hasNotesRegion = hasCoachNotes || hasFormCues;
  const hasTitle = Boolean(exerciseTitle?.trim());
  const hasLastSession = Boolean(lastSessionSlot);

  if (!hasTitle && !hasRx && !hasLog) return null;

  const headEyebrowText = multiExerciseHint ?? "Exercise · Up now";

  return (
    <div
      className={cn(
        "relative mx-4 mb-4 overflow-hidden rounded-[28px] border border-[color:var(--fc-glass-border)] px-5 pb-5 pt-[22px]",
        "shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)]",
        "bg-[linear-gradient(180deg,#112335_0%,#0E1F2E_100%)]",
      )}
      style={{
        boxShadow:
          "0 30px 60px -25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        backgroundImage: `radial-gradient(ellipse 70% 40% at 50% 0%, rgba(127,232,154,0.04), transparent 70%), linear-gradient(180deg, #112335 0%, #0E1F2E 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute right-0 top-0 h-[200px] w-[200px] opacity-100"
        style={{
          backgroundImage: `repeating-linear-gradient(135deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 9px)`,
        }}
        aria-hidden
      />

      {hasTitle ? (
        <div className="relative mb-3.5 flex justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Eyebrow
              tone="action"
              density="default"
              className="!mb-2 !text-[10.5px] !font-bold !tracking-[0.14em]"
            >
              {headEyebrowText}
            </Eyebrow>
            <h2
              className="mb-2.5 break-words text-[26px] font-bold leading-[1.05] tracking-[-0.025em] text-white"
              style={{
                fontFamily:
                  "var(--font-bricolage-grotesque, var(--font-sans), ui-sans-serif)",
              }}
            >
              {exerciseTitle}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <SetTypeBadge setType={setType} />
              {muscleGroupTag?.trim() ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-300"
                >
                  {muscleGroupTag.trim()}
                </Badge>
              ) : null}
            </div>
          </div>
          {titleActions ? (
            <div className="relative flex shrink-0 items-start pt-0.5">
              {titleActions}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasLastSession ? (
        <>
          <RxDivider />
          <Eyebrow
            tone="zinc"
            density="section"
            className="relative !mb-2.5 !text-[9.5px] !font-bold !tracking-[0.16em] !text-zinc-400"
          >
            Last session
          </Eyebrow>
          <div className="relative">{lastSessionSlot}</div>
        </>
      ) : null}

      {hasRx ? (
        <>
          <RxDivider />
          <Eyebrow
            tone="cyan"
            density="section"
            className="relative !mb-3 !text-[9.5px] !font-bold !tracking-[0.16em] !text-[color-mix(in_srgb,var(--fc-group-c)_95%,white)]"
          >
            Your target today
          </Eyebrow>
          <div
            className={cn(
              "relative grid grid-cols-2 gap-x-6 gap-y-4",
              prescriptionGridClassName,
            )}
          >
            {useCompactGrid ? (
              (() => {
                const sets = prescriptionItems.find((i) => i.label === "Sets")!;
                const reps = prescriptionItems.find((i) => i.label === "Reps")!;
                const rest = prescriptionItems.find(
                  (i) => i.label === "Rest" || i.label === "Rest between",
                )!;
                const target = prescriptionItems.find(
                  (i) => i.kind === "target-effort",
                );
                const tempos = prescriptionItems.filter(isTempoItem);
                const row2Right = target ?? tempos[0] ?? null;
                const trailingTempos =
                  target != null ? tempos : tempos.slice(1);
                return (
                  <>
                    <PrescriptionStatCell key="rx-sets" item={sets} />
                    <PrescriptionStatCell key="rx-reps" item={reps} />
                    <PrescriptionStatCell
                      key="rx-rest"
                      item={rest}
                      className={!row2Right ? "col-span-2" : undefined}
                    />
                    {row2Right ? (
                      <PrescriptionStatCell key="rx-row2-right" item={row2Right} />
                    ) : null}
                    {trailingTempos.map((t, ti) => (
                      <PrescriptionStatCell
                        key={`rx-tempo-${ti}-${t.label}`}
                        item={t}
                        className="col-span-2"
                      />
                    ))}
                  </>
                );
              })()
            ) : (
              prescriptionItems.map((item, index) => {
                const tempoLike = isTempoItem(item);
                return (
                  <PrescriptionStatCell
                    key={`${item.label}-${index}`}
                    item={item}
                    className={tempoLike ? "col-span-2" : undefined}
                  />
                );
              })
            )}
          </div>
        </>
      ) : null}

      {hasNotesRegion ? (
        <>
          <RxDivider className="mt-5" />
          <div className="relative rounded-r-[10px] border-l-2 border-[color-mix(in_srgb,var(--fc-group-c)_80%,transparent)] bg-[color-mix(in_srgb,var(--fc-group-c)_0.05,transparent)] py-2.5 pl-3.5 pr-3">
            <Eyebrow
              tone="cyan"
              density="section"
              className="!mb-1 !text-[9.5px] !font-bold !tracking-[0.16em] !text-[color-mix(in_srgb,var(--fc-group-c)_70%,white)]"
            >
              Coach notes
            </Eyebrow>
            {hasCoachNotes ? (
              <p className="whitespace-pre-line text-[13px] font-medium leading-relaxed text-zinc-100">
                {coachNotes}
              </p>
            ) : null}
            {hasCoachNotes && hasFormCues ? (
              <div className="my-2 h-px bg-[color-mix(in_srgb,var(--fc-group-c)_25%,transparent)]" aria-hidden />
            ) : null}
            {hasFormCues ? (
              <>
                {hasCoachNotes ? (
                  <Eyebrow
                    tone="zinc"
                    density="section"
                    className="mb-1 !text-[10px] !text-zinc-500"
                  >
                    Form cues
                  </Eyebrow>
                ) : null}
                <p className="whitespace-pre-line text-xs leading-relaxed text-zinc-400">
                  {formCues}
                </p>
              </>
            ) : null}
          </div>
        </>
      ) : null}

      {hasLog ? (
        <>
          {hasRx || hasNotesRegion || hasLastSession ? <RxDivider /> : null}
          <div
            className="relative -mx-5 -mb-5 mt-[18px] rounded-b-[28px] border-t border-[color:var(--fc-glass-border)] px-5 pb-5 pt-[18px]"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 100% 100%, color-mix(in srgb, var(--fc-accent) 6%, transparent), transparent 65%),
                radial-gradient(ellipse 60% 50% at 0% 0%, color-mix(in srgb, var(--fc-accent) 4%, transparent), transparent 65%)
              `,
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Eyebrow
                tone="cyan"
                density="section"
                className="!mb-0 !text-[9px] !font-semibold !tracking-[0.14em] !text-[var(--fc-text-dim)]"
              >
                Log set
              </Eyebrow>
              {logNavRight ? (
                <div className="flex shrink-0 items-center">{logNavRight}</div>
              ) : null}
            </div>
            <div className="space-y-3">{logSectionContent}</div>
          </div>
        </>
      ) : null}
    </div>
  );
}
