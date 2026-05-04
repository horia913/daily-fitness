"use client";

import * as React from "react";
import { ChevronLeft, Plus, Check, Clock, ChevronRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import s from "./checkinSuiteV1.module.css";

export function CheckinHero({
  onBack,
  backAriaLabel = "Back",
  eyebrow,
  eyebrowColor,
  title,
  titleCompact,
  subtitle,
  rightSlot,
}: {
  onBack?: () => void;
  backAriaLabel?: string;
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  titleCompact?: boolean;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className={cn(s.hero, s.heroGlowCyan)}>
      <div className={s.heroTop}>
        {onBack ? (
          <button type="button" className={s.heroIconBtn} onClick={onBack} aria-label={backAriaLabel}>
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : null}
        <div className={s.heroMeta}>
          <div className={s.heroEyebrowRow}>
            <span
              className={s.heroEyebrowDot}
              style={{ backgroundColor: eyebrowColor, color: eyebrowColor }}
              aria-hidden
            />
            <span className={s.heroEyebrowText} style={{ color: eyebrowColor }}>
              {eyebrow}
            </span>
          </div>
          <h1 className={cn(s.heroTitle, titleCompact && s.heroTitleCompact)}>{title}</h1>
          {subtitle ? <p className={cn(s.heroSub, s.fontBody)}>{subtitle}</p> : null}
        </div>
        {rightSlot ? <div className="shrink-0 relative z-[1]">{rightSlot}</div> : null}
      </div>
    </div>
  );
}

export function CheckinLimeAddButton({
  onClick,
  children = "Add",
  className,
  showDot,
}: {
  onClick: () => void;
  children?: React.ReactNode;
  className?: string;
  showDot?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className={cn(s.limePrimaryBtn, "relative", className)}>
      <Plus className="h-[11px] w-[11px]" strokeWidth={2.5} aria-hidden />
      {children}
      {showDot ? (
        <span
          className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-[color:var(--cs-card)]"
          style={{ background: "var(--cs-cyan)" }}
          aria-hidden
        />
      ) : null}
    </button>
  );
}

const stripeMap = {
  cyan: s.stripeCyan,
  purple: s.stripePurple,
  warning: s.stripeWarning,
  good: s.stripeGood,
  lime: s.stripeLime,
} as const;

export type CheckinStripe = keyof typeof stripeMap;

export function CheckinSectionCard({
  stripe,
  title,
  titleRight,
  children,
  className,
}: {
  stripe?: CheckinStripe | null;
  title: React.ReactNode;
  titleRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(s.sectionCard, stripe != null && s.sectionCardStripe, stripe != null && stripeMap[stripe], className)}
    >
      <div className={s.sectionTitleRow}>
        <h3 className={s.sectionTitle}>{title}</h3>
        {titleRight ? <span className={s.optHelper}>{titleRight}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function CheckinStepper({
  minusDisabled,
  plusDisabled,
  onMinus,
  onPlus,
  center,
  unit,
}: {
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  onMinus: () => void;
  onPlus: () => void;
  center: React.ReactNode;
  unit: string;
}) {
  return (
    <div className={s.stepperRow}>
      <button type="button" className={s.stepperBtn} onClick={onMinus} disabled={minusDisabled} aria-label="Decrease">
        <Minus className="h-4 w-4" strokeWidth={2} />
      </button>
      <div className={s.stepperCenter}>
        <div className={s.stepperValue}>{center}</div>
        <span className={s.stepperUnit}>{unit}</span>
      </div>
      <button type="button" className={s.stepperBtn} onClick={onPlus} disabled={plusDisabled} aria-label="Increase">
        <Plus className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

export function CheckinPresetGrid({
  items,
  selectedValue,
  onSelect,
}: {
  items: { value: number; label: string }[];
  selectedValue: number | null;
  onSelect: (v: number) => void;
}) {
  return (
    <div className={s.presetGrid}>
      {items.map((it) => {
        const active = selectedValue === it.value;
        return (
          <button
            key={it.value}
            type="button"
            className={cn(s.presetChip, active && s.presetChipActive)}
            onClick={() => onSelect(it.value)}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

type ScaleTier = "critical" | "warning" | "warningLite" | "good" | "lime";

const tierActive: Record<ScaleTier, React.CSSProperties> = {
  critical: {
    borderColor: "var(--cs-critical-dim)",
    background: "var(--cs-critical-soft)",
    boxShadow: "inset 0 0 0 1.5px var(--cs-critical)",
  },
  warning: {
    borderColor: "var(--cs-warning-dim)",
    background: "var(--cs-warning-soft)",
    boxShadow: "inset 0 0 0 1.5px var(--cs-warning)",
  },
  warningLite: {
    borderColor: "rgba(248,214,122,0.35)",
    background: "var(--cs-warning-lite-soft)",
    boxShadow: "inset 0 0 0 1.5px var(--cs-warning-lite)",
  },
  good: {
    borderColor: "var(--cs-good-dim)",
    background: "var(--cs-good-soft)",
    boxShadow: "inset 0 0 0 1.5px var(--cs-good)",
  },
  lime: {
    borderColor: "rgba(197,255,74,0.45)",
    background: "var(--cs-lime-soft)",
    boxShadow: "inset 0 0 0 1.5px var(--cs-lime)",
  },
};

const tierLabel: Record<ScaleTier, string> = {
  critical: "var(--cs-critical)",
  warning: "var(--cs-warning)",
  warningLite: "var(--cs-warning-lite)",
  good: "var(--cs-good)",
  lime: "var(--cs-lime)",
};

export function CheckinScalePills({
  options,
  value,
  onChange,
  variant,
}: {
  options: readonly { readonly value: number; readonly emoji: string; readonly label: string }[];
  value: number | null;
  onChange: (v: number) => void;
  variant: "sleep" | "inverted";
}) {
  const tiers: ScaleTier[] =
    variant === "sleep"
      ? ["critical", "warning", "warningLite", "good", "lime"]
      : ["good", "warningLite", "warningLite", "warning", "critical"];

  return (
    <div className={s.scaleGrid}>
      {options.map((opt, i) => {
        const selected = value === opt.value;
        const tier = tiers[i] ?? "good";
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={s.scalePill}
            style={selected ? tierActive[tier] : undefined}
            aria-pressed={selected}
          >
            <span className={s.scaleEmoji} aria-hidden>
              {opt.emoji}
            </span>
            <span
              className={s.scaleLabel}
              style={selected ? { color: tierLabel[tier] } : undefined}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CheckinSaveCta({
  disabled,
  submitting,
  label,
  helper,
}: {
  disabled: boolean;
  submitting: boolean;
  label: string;
  helper?: string;
}) {
  return (
    <div>
      <button type="submit" className={s.saveCta} disabled={disabled || submitting}>
        {submitting ? (
          <>
            <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            Saving...
          </>
        ) : (
          <>
            <Check className="h-[14px] w-[14px] shrink-0" strokeWidth={2.5} />
            {label}
          </>
        )}
      </button>
      {helper ? <p className={cn(s.saveHelper, s.fontBody)}>{helper}</p> : null}
    </div>
  );
}

export function CheckinStatusPill({ variant, label }: { variant: "completed" | "due"; label?: string }) {
  if (variant === "completed") {
    return (
      <span className={cn(s.statusPill, s.statusCompleted)}>
        <Check className="h-[9px] w-[9px]" strokeWidth={3} aria-hidden />
        {label ?? "Done"}
      </span>
    );
  }
  return (
    <span className={cn(s.statusPill, s.statusDue)}>
      <Clock className="h-[9px] w-[9px]" strokeWidth={2.5} aria-hidden />
      {label ?? "Due"}
    </span>
  );
}

export type DeltaTone = "stable" | "up" | "down";

export function CheckinDeltaPill({ tone, text }: { tone: DeltaTone; text: string }) {
  return (
    <span
      className={cn(s.deltaPill, tone === "up" && s.deltaUp, tone === "down" && s.deltaDown)}
    >
      {text}
    </span>
  );
}

export function CheckinLinkRow({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={s.linkCyan} onClick={onClick}>
      {children}
      <ChevronRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
    </button>
  );
}

export { default as checkinSuiteStyles } from "./checkinSuiteV1.module.css";
