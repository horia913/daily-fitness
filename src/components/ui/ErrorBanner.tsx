import React from "react";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorBannerProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({
  title = "Something went wrong",
  message,
  onRetry,
  onDismiss,
  className = "",
}: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "fc-surface rounded-2xl border border-[color:var(--fc-status-error)]/60 p-4 sm:p-5",
        "shadow-sm",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--fc-status-error)]/10">
          <AlertCircle
            className="w-5 h-5"
            style={{ color: "var(--fc-status-error)" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold fc-text-primary">
            {title}
          </p>
          {message && (
            <p className="mt-1 text-xs fc-text-dim">
              {message}
            </p>
          )}
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 min-h-11"
              onClick={onRetry}
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Try again
            </Button>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-glass-soft)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

