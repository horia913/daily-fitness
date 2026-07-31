"use client";

import { Info } from "lucide-react";

export function WizardNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-[11px] border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-tint)] p-3 text-[12px] leading-snug fc-text-dim">
      <Info
        className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--fc-accent)]"
        strokeWidth={2}
        aria-hidden
      />
      <p>{children}</p>
    </div>
  );
}
