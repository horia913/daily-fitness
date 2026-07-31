"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Shared field / chip styles for goal wizard forms (flat v5). */
export const wizardInputClass =
  "h-10 rounded-[11px] border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-well)] text-sm fc-text-primary placeholder:fc-text-subtle focus-visible:border-[color:var(--fc-accent-glow)] focus-visible:ring-0";

export const wizardTextareaClass =
  "rounded-[11px] border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-well)] text-sm fc-text-primary placeholder:fc-text-subtle focus-visible:border-[color:var(--fc-accent-glow)] focus-visible:ring-0";

export const wizardSelectClass =
  "h-10 rounded-[11px] border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-well)] px-2.5 text-sm fc-text-primary";

export function WizardFieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] fc-text-subtle"
    >
      {children}
    </Label>
  );
}

export function WizardSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <legend className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] fc-text-subtle">
      {children}
    </legend>
  );
}

export function WizardOptionChip<T extends string>({
  options,
  value,
  onChange,
  name,
  columns = 1,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  name: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid gap-1.5",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 1 && "grid-cols-1",
      )}
      role="radiogroup"
      aria-label={name}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-[11px] border px-3 py-2.5 text-left transition-colors",
              selected
                ? "border-[color:var(--fc-hairline-strong,var(--fc-glass-border))] bg-[color:var(--fc-surface-tint)]"
                : "border-[color:var(--fc-hairline)] bg-transparent hover:bg-[color:var(--fc-surface-tint)]",
            )}
          >
            <span
              className={cn(
                "block text-[13px] font-semibold",
                selected ? "fc-text-primary" : "fc-text-dim",
              )}
            >
              {opt.label}
            </span>
            {opt.hint ? (
              <span className="mt-0.5 block text-[11px] leading-snug fc-text-subtle">
                {opt.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function WizardFormActions({
  onBack,
  submitting,
  submitLabel = "Create goal",
}: {
  onBack: () => void;
  submitting: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="flex gap-2 border-t border-[color:var(--fc-hairline)] pt-3">
      <Button
        type="button"
        variant="outline"
        className="h-11 flex-1 rounded-[12px] border-[color:var(--fc-hairline)] bg-transparent fc-text-dim hover:fc-text-primary"
        onClick={onBack}
        disabled={submitting}
      >
        Back
      </Button>
      <Button
        type="submit"
        className="fc-btn fc-btn-primary h-11 flex-1 rounded-[12px]"
        disabled={submitting}
      >
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}

export function WizardHint({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] leading-snug fc-text-subtle"
      style={{ fontFamily: "var(--f-mono)" }}
    >
      {children}
    </p>
  );
}
