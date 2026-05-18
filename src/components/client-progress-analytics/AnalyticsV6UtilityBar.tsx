"use client";

import React from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import v6 from "./progressAnalyticsV6.module.css";

export function AnalyticsV6UtilityBar({
  onBack,
  onRefresh,
  busy,
}: {
  onBack: () => void;
  onRefresh: () => void;
  busy?: boolean;
}) {
  return (
    <div className={v6.utilityRow}>
      <button
        type="button"
        className={v6.utilityBtn}
        onClick={onBack}
        aria-label="Back to progress"
      >
        <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Progress
      </button>
      <button
        type="button"
        className={v6.utilityBtn}
        onClick={onRefresh}
        disabled={busy}
        aria-busy={busy}
      >
        <RefreshCw
          className={`h-3.5 w-3.5 shrink-0 ${busy ? "animate-spin" : ""}`}
          aria-hidden
        />
        Refresh
      </button>
    </div>
  );
}
