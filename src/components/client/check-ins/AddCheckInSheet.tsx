"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";

function go(href: string) {
  window.location.href = href;
}

function scheduledCheckInTitle(frequencyDays: number): string {
  if (frequencyDays === 7) return "Weekly Check-in";
  if (frequencyDays === 30) return "Monthly Check-in";
  if (frequencyDays === 14) return "Bi-weekly Check-in";
  return `Check-in (every ${frequencyDays} days)`;
}

interface AddCheckInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuickWeight: () => void;
  frequencyDays?: number;
}

const rowClass =
  "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-white/[0.06] active:bg-white/[0.08] border border-transparent hover:border-[color:var(--fc-glass-border)]";

export function AddCheckInSheet({
  open,
  onOpenChange,
  onQuickWeight,
  frequencyDays = 30,
}: AddCheckInSheetProps) {
  const scheduleTitle = scheduledCheckInTitle(frequencyDays);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fc-modal fixed left-[50%] top-[50%] z-[51] flex w-[calc(100%-2rem)] max-w-lg max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-2xl border border-[color:var(--fc-glass-border-strong)] p-0 shadow-lg outline-none duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          )}
        >
          <DialogHeader className="shrink-0 space-y-0 border-b border-[color:var(--fc-glass-border)] px-5 pb-3 pt-5 text-left">
            <DialogTitle className="fc-text-primary text-lg font-semibold">Add Check-in</DialogTitle>
            <DialogDescription className="sr-only">
              Pick a type of check-in or log to open. Options include scheduled check-in, body measurements,
              mobility, progress photos, or quick weight.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
            <button
              type="button"
              className={rowClass}
              onClick={() => {
                onOpenChange(false);
                go("/client/check-ins/weekly");
              }}
            >
              <span className="text-xl shrink-0" aria-hidden>
                📊
              </span>
              <span className="min-w-0">
                <span className="block font-medium fc-text-primary">{scheduleTitle}</span>
                <span className="mt-0.5 block text-xs fc-text-dim">Measurements, photos &amp; review</span>
              </span>
            </button>

            <button
              type="button"
              className={rowClass}
              onClick={() => {
                onOpenChange(false);
                go("/client/progress/body-metrics?from=check-ins");
              }}
            >
              <span className="text-xl shrink-0" aria-hidden>
                📐
              </span>
              <span className="min-w-0">
                <span className="block font-medium fc-text-primary">Body Measurements</span>
                <span className="mt-0.5 block text-xs fc-text-dim">Weight, body fat, waist</span>
              </span>
            </button>

            <button
              type="button"
              className={rowClass}
              onClick={() => {
                onOpenChange(false);
                go("/client/progress/mobility?from=check-ins");
              }}
            >
              <span className="text-xl shrink-0" aria-hidden>
                🤸
              </span>
              <span className="min-w-0">
                <span className="block font-medium fc-text-primary">Mobility Assessment</span>
                <span className="mt-0.5 block text-xs fc-text-dim">Flexibility &amp; ROM</span>
              </span>
            </button>

            <button
              type="button"
              className={rowClass}
              onClick={() => {
                onOpenChange(false);
                go("/client/progress/photos?from=check-ins");
              }}
            >
              <span className="text-xl shrink-0" aria-hidden>
                📸
              </span>
              <span className="min-w-0">
                <span className="block font-medium fc-text-primary">Progress Photos</span>
                <span className="mt-0.5 block text-xs fc-text-dim">Timeline &amp; compare</span>
              </span>
            </button>

            <button
              type="button"
              className={rowClass}
              onClick={() => {
                onOpenChange(false);
                onQuickWeight();
              }}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--fc-domain-workouts)]/15"
                aria-hidden
              >
                <Scale className="h-4 w-4 text-[color:var(--fc-domain-workouts)]" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium fc-text-primary">Quick Weight Log</span>
                <span className="mt-0.5 block text-xs fc-text-dim">Log without full check-in</span>
              </span>
            </button>
          </div>

          <div
            className="shrink-0 border-t border-[color:var(--fc-glass-border)] p-3"
            style={{
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <button
              type="button"
              className="w-full rounded-xl py-3 text-sm font-medium fc-text-subtle transition-colors hover:bg-white/[0.04] hover:fc-text-primary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
