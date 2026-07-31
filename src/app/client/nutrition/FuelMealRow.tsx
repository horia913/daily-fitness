"use client";

import type { ReactNode } from "react";
import {
  Check,
  ChevronDown,
  Sun,
  Leaf,
  Moon,
  Cookie,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./fuelPage.module.css";

export type FuelMealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_VISUAL: Record<
  FuelMealType,
  { Icon: LucideIcon; hueVar: string }
> = {
  breakfast: { Icon: Sun, hueVar: "var(--fc-meal-breakfast, var(--fc-accent-gold))" },
  lunch: { Icon: Leaf, hueVar: "var(--fc-meal-lunch)" },
  dinner: { Icon: Moon, hueVar: "var(--fc-meal-dinner)" },
  snack: { Icon: Cookie, hueVar: "var(--fc-meal-snack, var(--fc-group-c))" },
};

export type FuelMealRowProps = {
  mealType: FuelMealType;
  mealName: string;
  optionName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  completed: boolean;
  completing?: boolean;
  expanded?: boolean;
  onToggleExpand: () => void;
  onToggleComplete: () => void;
  children?: ReactNode;
};

export function FuelMealRow({
  mealType,
  mealName,
  optionName,
  calories,
  protein,
  carbs,
  fat,
  completed,
  completing,
  expanded,
  onToggleExpand,
  onToggleComplete,
  children,
}: FuelMealRowProps) {
  const visual = MEAL_VISUAL[mealType] ?? MEAL_VISUAL.snack;
  const { Icon } = visual;

  return (
    <div
      className={cn(styles.mealRow, completed && styles.mealRowDone)}
      style={{ ["--h" as string]: visual.hueVar }}
    >
      <div className={styles.mealRowHeader}>
        <button
          type="button"
          className={styles.mealRowMain}
          onClick={onToggleExpand}
          aria-expanded={!!expanded}
          aria-label={expanded ? `Collapse ${mealName}` : `Expand ${mealName}`}
        >
          <span className={styles.mealIcon} aria-hidden>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className={styles.mealBody}>
            <span className={styles.mealName}>{mealName}</span>
            <span className={styles.mealOption}>{optionName}</span>
            <span className={styles.mealMacros}>
              <b>{Math.round(calories).toLocaleString()}</b> kcal ·{" "}
              {Math.round(protein)} P · {Math.round(carbs)} C ·{" "}
              {Math.round(fat)} F
            </span>
          </span>
        </button>
        <button
          type="button"
          className={cn(styles.mealTick, completed && styles.mealTickOn)}
          onClick={(e) => {
            e.stopPropagation();
            if (!completing) onToggleComplete();
          }}
          disabled={completing}
          aria-label={completed ? `Undo ${mealName}` : `Mark ${mealName} complete`}
          aria-pressed={completed}
        >
          <Check className="h-[15px] w-[15px]" strokeWidth={2.4} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.mealChevron}
          onClick={onToggleExpand}
          aria-label={expanded ? `Collapse ${mealName}` : `Expand ${mealName}`}
          aria-expanded={!!expanded}
        >
          <ChevronDown
            className={cn("h-4 w-4", expanded && styles.mealChevronOpen)}
            strokeWidth={2.2}
            aria-hidden
          />
        </button>
      </div>
      {expanded ? <div className={styles.mealExpand}>{children}</div> : null}
    </div>
  );
}
