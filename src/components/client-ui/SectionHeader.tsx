"use client";

import React from "react";
import { cn } from "@/lib/utils";

type SectionHeaderTitleTone = "section" | "display" | "plain";

const titleToneClass: Record<SectionHeaderTitleTone, string> = {
  section: "text-sm font-bold uppercase tracking-widest fc-text-dim",
  display:
    "text-[17px] font-semibold leading-snug tracking-tight fc-text-primary normal-case",
  plain: "text-base font-semibold normal-case tracking-normal fc-text-primary",
};

interface SectionHeaderProps {
  title: React.ReactNode;
  action?: React.ReactNode;
  /** Optional icon or marker before the title (same row as title when no action split). */
  startAdornment?: React.ReactNode;
  /** Optional eyebrow row above the title + action row (e.g. `<Eyebrow>…</Eyebrow>`). */
  eyebrow?: React.ReactNode;
  /** Extra classes on the title element. */
  titleClassName?: string;
  /** `section` = uppercase label (default). `display` = Phone 1 “Recent wins”-style title. */
  titleTone?: SectionHeaderTitleTone;
  /** Optional inline style on the title (e.g. display font stack). */
  titleStyle?: React.CSSProperties;
  className?: string;
}

export function SectionHeader({
  title,
  action,
  startAdornment,
  eyebrow,
  titleClassName,
  titleTone = "section",
  titleStyle,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-3", className)}>
      {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
      <div
        className={cn(
          "flex justify-between gap-2",
          titleTone === "display" ? "items-baseline" : "items-center"
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-center gap-2",
            action && "flex-1",
            titleTone === "display" ? "items-baseline" : "items-center",
          )}
        >
          {startAdornment ? (
            <span className="shrink-0">{startAdornment}</span>
          ) : null}
          <h2
            className={cn(titleToneClass[titleTone], titleClassName)}
            style={titleStyle}
          >
            {title}
          </h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export default SectionHeader;
