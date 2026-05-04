"use client";

import * as React from "react";
import {
  Award,
  BarChart3,
  CheckCircle2,
  Dumbbell,
  Flag,
  Flame,
  LucideIcon,
  Medal,
  Star,
  Trophy,
} from "lucide-react";
import type { AchievementTemplate } from "@/lib/achievementService";

const BY_EXACT_NAME: Record<string, LucideIcon> = {
  "Program Completer": Trophy,
  "Streak Legend": Flame,
  "Workout Master": Dumbbell,
  "Challenge Champion": Award,
  "Challenge Competitor": Flag,
  "Podium Finisher": Medal,
  "First Steps": CheckCircle2,
  "PR Champion": Star,
  "Volume Warrior": BarChart3,
};

export function TrophyAchievementIcon({
  template,
  className,
  "aria-hidden": ariaHidden = true,
}: {
  template: AchievementTemplate;
  className?: string;
  "aria-hidden"?: boolean;
}) {
  const raw = template.icon?.trim() ?? "";
  if (raw && /\p{Extended_Pictographic}/u.test(raw)) {
    return (
      <span className={className} aria-hidden={ariaHidden}>
        {raw}
      </span>
    );
  }
  const Icon = BY_EXACT_NAME[template.name] ?? Trophy;
  return <Icon className={className} strokeWidth={2} aria-hidden={ariaHidden} />;
}
