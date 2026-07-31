"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar,
  Ruler,
  Accessibility,
  ImageIcon,
  Scale,
  HeartPulse,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import checkinSuiteStyles from "@/components/client/check-ins/checkinSuite/checkinSuiteV1.module.css";

function go(href: string) {
  window.location.href = href;
}

function scheduledCheckInTitle(_frequencyDays: number): string {
  // Settled product name — frequency lives in subtitle/config, not the title.
  return "Periodical check-in";
}

interface AddCheckInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuickWeight: () => void;
  frequencyDays?: number;
}

function OptionRow({
  icon,
  iconWrapStyle,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode;
  iconWrapStyle: React.CSSProperties;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(checkinSuiteStyles.sheetOptionRow, checkinSuiteStyles.fontBody)}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={iconWrapStyle}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-[13px] font-semibold"
          style={{ color: "var(--cs-t1)" }}
        >
          {title}
        </span>
        <span
          className="mt-0.5 block text-[11px] leading-snug"
          style={{ color: "var(--cs-t3)" }}
        >
          {subtitle}
        </span>
      </span>
      <ChevronRight
        className="h-[13px] w-[13px] shrink-0"
        style={{ color: "var(--cs-t4)" }}
        aria-hidden
      />
    </button>
  );
}

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
        <DialogOverlay className={checkinSuiteStyles.sheetBackdrop} />
        <DialogPrimitive.Content
          className={cn(
            checkinSuiteStyles.root,
            "fixed inset-x-0 bottom-0 z-[10021] flex max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-bottom)-12px))] w-full flex-col gap-1.5 overflow-hidden rounded-t-[24px] border-t border-[color:var(--cs-line)] p-0 shadow-none outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4 duration-300",
          )}
          style={{
            background: "var(--fc-bg-deep)",
            paddingTop: "18px",
            paddingLeft: "16px",
            paddingRight: "16px",
            paddingBottom: "max(28px, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div
            className="mx-auto mb-3.5 h-1 w-10 rounded-full"
            style={{ background: "var(--cs-line)" }}
            aria-hidden
          />

          <DialogTitle
            className={cn(
              checkinSuiteStyles.fontHeadline,
              "px-1 pb-2 text-[17px] font-bold",
            )}
            style={{ color: "var(--cs-t1)" }}
          >
            Add check-in
          </DialogTitle>

          <DialogDescription className="sr-only">
            Pick a type of check-in or log to open. Options include scheduled
            check-in, body measurements, mobility, progress photos, or quick
            weight.
          </DialogDescription>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pb-2">
            <OptionRow
              title={scheduleTitle}
              subtitle="Measurements, photos & review"
              onClick={() => {
                onOpenChange(false);
                go("/client/check-ins/weekly");
              }}
              iconWrapStyle={{
                background: "var(--fc-accent-dim)",
                color: "var(--fc-accent)",
              }}
              icon={<Calendar className="h-4 w-4" strokeWidth={2} />}
            />
            <OptionRow
              title="Body measurements"
              subtitle="Weight, body fat, waist"
              onClick={() => {
                onOpenChange(false);
                go("/client/progress/body-metrics?from=check-ins");
              }}
              iconWrapStyle={{
                background: "var(--cs-warning-soft)",
                color: "var(--cs-warning)",
              }}
              icon={<Ruler className="h-4 w-4" strokeWidth={2} />}
            />
            <OptionRow
              title="Mobility"
              subtitle="View coach assessments"
              onClick={() => {
                onOpenChange(false);
                go("/client/progress/mobility?from=check-ins");
              }}
              iconWrapStyle={{
                background: "var(--cs-good-soft)",
                color: "var(--cs-good)",
              }}
              icon={<Accessibility className="h-4 w-4" strokeWidth={2} />}
            />
            <OptionRow
              title="Recovery & wellness"
              subtitle="Load, soreness & sleep trends"
              onClick={() => {
                onOpenChange(false);
                go("/client/progress/recovery?from=check-ins");
              }}
              iconWrapStyle={{
                background: "var(--fc-accent-dim)",
                color: "var(--fc-accent)",
              }}
              icon={<HeartPulse className="h-4 w-4" strokeWidth={2} />}
            />
            <OptionRow
              title="Progress photos"
              subtitle="Timeline & compare"
              onClick={() => {
                onOpenChange(false);
                go("/client/progress/body-metrics?from=check-ins&tab=photos");
              }}
              iconWrapStyle={{
                background: "var(--fc-accent-dim)",
                color: "var(--fc-accent)",
              }}
              icon={<ImageIcon className="h-4 w-4" strokeWidth={2} />}
            />
            <OptionRow
              title="Quick weight log"
              subtitle="Log without full check-in"
              onClick={() => {
                onOpenChange(false);
                onQuickWeight();
              }}
              iconWrapStyle={{
                background: "var(--cs-good-soft)",
                color: "var(--cs-good)",
              }}
              icon={<Scale className="h-4 w-4" strokeWidth={2} />}
            />
          </div>

          <button
            type="button"
            className={cn(
              checkinSuiteStyles.fontBody,
              "mt-1 w-full rounded-[13px] border py-3 text-sm font-medium transition-colors",
            )}
            style={{
              borderColor: "var(--cs-line)",
              background: "transparent",
              color: "var(--cs-t2)",
            }}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
