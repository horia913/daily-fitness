"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  onConfirm: () => void;
  /** Destructive / primary confirm styling. Default primary. */
  variant?: "primary" | "destructive";
};

/**
 * Shared styled confirm — same pattern as Me sign-out / leaderboard hide.
 * Use for every destructive (or discard) confirmation on client surfaces.
 */
export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirming = false,
  onConfirm,
  variant = "primary",
}: ConfirmActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-bg-deep)]">
        <DialogHeader>
          <DialogTitle className="fc-text-primary">{title}</DialogTitle>
          <DialogDescription className="fc-text-dim">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-lg sm:flex-1"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className={
              variant === "destructive"
                ? "h-11 rounded-lg sm:flex-1 bg-[color:var(--fc-status-error)] hover:opacity-90 text-[color:var(--fc-bg-base)] border-0"
                : "h-11 rounded-lg fc-btn fc-btn-primary sm:flex-1"
            }
            disabled={confirming}
            onClick={onConfirm}
          >
            {confirming ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
