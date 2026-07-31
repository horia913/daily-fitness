import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetRowShellProps {
  title: string;
  done: boolean;
  variant?: "inline" | "stacked";
  subtitle?: string;
  children: React.ReactNode;
  onLog?: () => void;
  disableLog?: boolean;
  rightSlot?: React.ReactNode;
}

export function SetRowShell({
  title,
  done,
  variant = "inline",
  subtitle,
  children,
  onLog,
  disableLog,
  rightSlot,
}: SetRowShellProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 transition-colors",
        done
          ? "border-emerald-500/35 bg-emerald-500/[0.08]"
          : "border-white/10 bg-white/[0.03]",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              "text-sm font-medium",
              done ? "text-emerald-100/90" : "text-zinc-100",
            )}
          >
            {title}
          </p>
          {subtitle ? (
            <p className="truncate text-[11px] text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {rightSlot}
          <button
            type="button"
            onClick={done ? undefined : onLog}
            disabled={disableLog || done}
            aria-label={done ? `${title} completed` : `Log ${title}`}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full border transition-colors",
              done
                ? "border-emerald-400/50 bg-emerald-500 text-white"
                : "border-[var(--fc-accent)]/40 bg-[var(--fc-accent)]/10 text-[var(--fc-accent)] hover:bg-[var(--fc-accent)]/20",
              disableLog && !done && "cursor-not-allowed opacity-50",
            )}
          >
            {done ? (
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
            ) : (
              <Check className="h-4 w-4 opacity-70" aria-hidden />
            )}
          </button>
        </div>
      </div>
      <div className={variant === "stacked" ? "space-y-1.5" : ""}>{children}</div>
    </div>
  );
}
