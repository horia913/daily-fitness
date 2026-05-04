"use client";

import { cn } from "@/lib/utils";
import styles from "./progressSuiteV1.module.css";

type Accent = "muted" | "cyan" | "lime" | "purple" | "warning" | "good";

export function PsSectionEyebrow({
  children,
  accent = "muted",
  className,
}: {
  children: React.ReactNode;
  accent?: Accent;
  className?: string;
}) {
  const accentCls =
    accent === "cyan"
      ? styles.psSectionEyebrowCyan
      : accent === "lime"
        ? styles.psSectionEyebrowLime
        : accent === "purple"
          ? styles.psSectionEyebrowPurple
          : accent === "warning"
            ? styles.psSectionEyebrowWarning
            : accent === "good"
              ? styles.psSectionEyebrowGood
              : "";
  return (
    <p className={cn(styles.psSectionEyebrow, accentCls, className)}>
      {children}
    </p>
  );
}
