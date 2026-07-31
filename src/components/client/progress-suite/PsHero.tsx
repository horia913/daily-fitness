"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./progressSuiteV1.module.css";

/** Hue for the left rail (legacy prop name `glow` kept for call-site compat). */
type Glow = "cyan" | "action" | "purple";

export function PsHero({
  glow = "cyan",
  onBack,
  backAriaLabel = "Back",
  eyebrow,
  eyebrowColor,
  title,
  titleCompact,
  subtitle,
  rightSlot,
  children,
}: {
  glow?: Glow;
  onBack?: () => void;
  backAriaLabel?: string;
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  /** Smaller display title */
  titleCompact?: boolean;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const railCls =
    glow === "purple"
      ? styles.psHeroRailPurple
      : glow === "action"
        ? styles.psHeroRailAction
        : styles.psHeroRailCyan;

  return (
    <div className={cn(styles.psHero, railCls)}>
      <div className={styles.psHeroTop}>
        {onBack ? (
          <button
            type="button"
            className={styles.psHeroIconBtn}
            onClick={onBack}
            aria-label={backAriaLabel}
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}
        <div className={styles.psHeroMeta}>
          <div className={styles.psEyebrowRow}>
            <span
              className={styles.psEyebrowDot}
              style={{ color: eyebrowColor, backgroundColor: eyebrowColor }}
              aria-hidden
            />
            <span
              className={styles.psEyebrowText}
              style={{ color: eyebrowColor }}
            >
              {eyebrow}
            </span>
          </div>
          <h1
            className={cn(
              styles.psHeroTitle,
              titleCompact && styles.psHeroTitleCompact,
            )}
          >
            {title}
          </h1>
          {subtitle ? <p className={styles.psHeroSub}>{subtitle}</p> : null}
        </div>
        {rightSlot ? (
          <div className="shrink-0 relative z-[1]">{rightSlot}</div>
        ) : null}
      </div>
      {children ? <div className={styles.psHeroChildren}>{children}</div> : null}
    </div>
  );
}
