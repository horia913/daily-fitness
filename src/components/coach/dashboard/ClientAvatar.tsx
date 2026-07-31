"use client";

import { cn } from "@/lib/utils";

export type ClientAvatarSeverity = "critical" | "warning" | "neutral" | "new" | "good";

const tierGradients: Record<ClientAvatarSeverity, string> = {
  critical: "linear-gradient(135deg, var(--fc-sev-critical), #7f1d1d)",
  warning: "linear-gradient(135deg, var(--fc-sev-warning), #92400e)",
  neutral: "linear-gradient(135deg, #5EEAD4, #818CF8)",
  new: "linear-gradient(135deg, var(--fc-group-c), #0e7490)",
  good: "linear-gradient(135deg, #5EEAD4, #818CF8)",
};

const tierTextClass: Record<ClientAvatarSeverity, string> = {
  critical: "text-[var(--fc-ink)]",
  warning: "text-[var(--fc-ink)]",
  neutral: "text-[var(--fc-ink)]",
  new: "text-[var(--fc-ink)]",
  good: "text-[var(--fc-ink)]",
};

const sizeDimClass: Record<32 | 36 | 40, string> = {
  32: "h-8 w-8 text-[13px]",
  36: "h-9 w-9 text-sm",
  40: "h-10 w-10 text-[15px]",
};

export interface ClientAvatarProps {
  initial: string;
  severity?: ClientAvatarSeverity;
  size?: 32 | 36 | 40;
  className?: string;
}

export function ClientAvatar({
  initial,
  severity = "neutral",
  size = 36,
  className,
}: ClientAvatarProps) {
  const dim = sizeDimClass[size];
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        "border border-white/10",
        dim,
        tierTextClass[severity],
        className
      )}
      style={{
        background: tierGradients[severity],
        fontFamily: "var(--f-headline, var(--font-sans, ui-sans-serif))",
      }}
      aria-hidden
    >
      {(initial || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}
