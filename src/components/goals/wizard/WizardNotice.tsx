"use client";

import { Info } from "lucide-react";

export function WizardNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-[color:var(--fc-glass-border)] bg-[color-mix(in_srgb,var(--fc-accent-cyan)_8%,transparent)] p-3 text-xs fc-text-dim leading-snug">
      <Info className="h-4 w-4 shrink-0 text-[color:var(--fc-accent-cyan)] mt-0.5" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
