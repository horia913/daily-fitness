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
import { Calendar, Ruler, Accessibility, ImageIcon, Scale, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import checkinSuiteStyles from "@/components/client/check-ins/checkinSuite/checkinSuiteV1.module.css";

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
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-[13px] border p-3 text-left transition-colors",
        checkinSuiteStyles.fontBody,
      )}
      style={{
        borderColor: "var(--cs-line-2)",
        background: "var(--cs-card-2)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#0F2334";
        e.currentTarget.style.borderColor = "var(--cs-cyan-dim)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--cs-card-2)";
        e.currentTarget.style.borderColor = "var(--cs-line-2)";
      }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={iconWrapStyle}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold" style={{ color: "var(--cs-t1)" }}>
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: "var(--cs-t3)" }}>
          {subtitle}
        </span>
      </span>
      <ChevronRight className="h-[13px] w-[13px] shrink-0" style={{ color: "var(--cs-t4)" }} aria-hidden />
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
            "fixed inset-x-0 bottom-0 z-[10021] flex max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-bottom)-12px))] w-full flex-col gap-1.5 overflow-hidden rounded-t-[24px] border-t border-[color:var(--cs-line)] p-0 shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4 duration-300",
          )}
          style={{
            background: "var(--cs-card)",
            paddingTop: "18px",
            paddingLeft: "16px",
            paddingRight: "16px",
            paddingBottom: "max(28px, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="mx-auto mb-3.5 h-1 w-10 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} aria-hidden />

          <DialogTitle className={cn(checkinSuiteStyles.fontHeadline, "px-1 pb-2 text-[17px] font-bold")} style={{ color: "var(--cs-t1)" }}>
            Add check-in
          </DialogTitle>

          <DialogDescription className="sr-only">
            Pick a type of check-in or log to open. Options include scheduled check-in, body measurements, mobility,
            progress photos, or quick weight.
          </DialogDescription>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pb-2">
            <OptionRow
              title={scheduleTitle}
              subtitle="Measurements, photos & review"
              onClick={() => {
                onOpenChange(false);
                go("/client/check-ins/weekly");
              }}
              iconWrapStyle={{ background: "var(--cs-cyan-soft)", color: "var(--cs-cyan)" }}
              icon={<Calendar className="h-4 w-4" strokeWidth={2} />}
            />
            <OptionRow
              title="Body measurements"
              subtitle="Weight, body fat, waist"
              onClick={() => {
                onOpenChange(false);
                go("/client/progress/body-metrics?from=check-ins");
              }}
              iconWrapStyle={{ background: "var(--cs-warning-soft)", color: "var(--cs-warning)" }}
              icon={<Ruler className="h-4 w-4" strokeWidth={2} />}
            />
            <OptionRow
              title="Mobility assessment"
              subtitle="Flexibility & ROM"
              onClick={() => {
                onOpenChange(false);
                go("/client/progress/mobility?from=check-ins");
              }}
              iconWrapStyle={{ background: "var(--cs-orange-soft)", color: "var(--cs-orange)" }}
              icon={<Accessibility className="h-4 w-4" strokeWidth={2} />}
            />
            <OptionRow
              title="Progress photos"
              subtitle="Timeline & compare"
              onClick={() => {
                onOpenChange(false);
                go("/client/progress/body-metrics?from=check-ins&tab=photos");
              }}
              iconWrapStyle={{ background: "var(--cs-purple-soft)", color: "var(--cs-purple)" }}
              icon={<ImageIcon className="h-4 w-4" strokeWidth={2} />}
            />
            <OptionRow
              title="Quick weight log"
              subtitle="Log without full check-in"
              onClick={() => {
                onOpenChange(false);
                onQuickWeight();
              }}
              iconWrapStyle={{ background: "var(--cs-good-soft)", color: "var(--cs-good)" }}
              icon={<Scale className="h-4 w-4" strokeWidth={2} />}
            />
          </div>

          <button
            type="button"
            className={cn(checkinSuiteStyles.fontBody, "mt-1 w-full rounded-[13px] border py-3 text-sm font-medium transition-colors")}
            style={{
              borderColor: "var(--cs-line)",
              background: "transparent",
              color: "var(--cs-t2)",
            }}
            onClick={() => onOpenChange(false)}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--cs-t1)";
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--cs-t2)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            Cancel
          </button>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
