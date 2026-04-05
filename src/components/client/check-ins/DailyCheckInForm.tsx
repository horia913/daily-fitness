"use client";

import { DailyWellnessForm } from "@/components/client/DailyWellnessForm";
import type { DailyWellnessLog } from "@/lib/wellnessService";

type Props = {
  clientId: string;
  initialTodayLog?: DailyWellnessLog | null;
  onSuccess?: () => void;
};

/** Daily check-in for /client/check-ins — immersive layout (see DailyWellnessForm `immersive`). */
export function DailyCheckInForm({ clientId, initialTodayLog, onSuccess }: Props) {
  return <DailyWellnessForm clientId={clientId} initialTodayLog={initialTodayLog} onSuccess={onSuccess} immersive />;
}
