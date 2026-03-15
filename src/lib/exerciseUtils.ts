/**
 * Check if an exercise uses barbell-type equipment (barbell, olympic, ez bar, smith).
 * Used to conditionally show the Plate Calculator in workout execution.
 */
export function isBarbellExercise(exercise: {
  equipment_types?: string[];
  equipment?: string[];
}): boolean {
  const equipment = exercise.equipment_types || exercise.equipment || [];
  return equipment.some((eq: string) => {
    const lower = eq.toLowerCase();
    return (
      lower.includes("barbell") ||
      lower.includes("olympic") ||
      lower.includes("ez bar") ||
      lower.includes("smith")
    );
  });
}
