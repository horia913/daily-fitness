/**
 * Constants used by the workout execution start page (LiveWorkout).
 * Extracted for maintainability; do not change without updating page.tsx.
 */

export const BARBELL_OPTIONS = [
  { weight: 20, name: "Olympic", type: "straight" },
  { weight: 15, name: "Junior", type: "straight" },
  { weight: 12, name: "Straight", type: "straight" },
  { weight: 9, name: "EZ Bar", type: "ez" },
] as const;
