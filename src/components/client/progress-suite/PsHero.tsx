"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./progressSuiteV1.module.css";

type Glow = "cyan" | "lime" | "purple";

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
  /** Bricolage 18px instead of 24 */
  titleCompact?: boolean;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const glowCls =
    glow === "purple"
      ? styles.psHeroGlowPurple
      : glow === "lime"
        ? styles.psHeroGlowLime
        : styles.psHeroGlowCyan;

  return (
    <div className={cn(styles.psHero, glowCls)}>
      <div className={styles.psHeroTop}>
        {onBack ? (
          <button
            type="button"
            className={styles.psHeroIconBtn}
            onClick={onBack}
            aria-label={backAriaLabel}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
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
              styles.psFontHeadline,
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className={cn(styles.psHeroSub, styles.psFontBody)}>{subtitle}</p>
          ) : null}
        </div>
        {rightSlot ? (
          <div className="shrink-0 relative z-[1]">{rightSlot}</div>
        ) : null}
      </div>
      {children ? <div className={styles.psHeroChildren}>{children}</div> : null}
    </div>
  );
}
