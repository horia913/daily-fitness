/**
 * Pure helpers for the workout execution start page.
 * No React state or hooks — safe to use from anywhere.
 */

/** Validate UUID format (e.g. for sessionId). */
export function isValidUuid(
  value: string | null | undefined,
): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export interface PlateOption {
  weight: number;
  count: number;
  color: string;
  border: string;
}

export interface CalculatePlateLoadingResult {
  option1: { plates: PlateOption[]; remainder: number };
  option2: { plates: PlateOption[]; remainder: number };
  barbellWeight: number;
}

/** Calculate plate loading with barbell selection — prioritizes 20kg and 10kg. */
export function calculatePlateLoading(
  targetWeight: number,
  barbellWeight: number = 20,
): CalculatePlateLoadingResult {
  const plates = [
    { weight: 20, color: "bg-blue-600", border: "border-blue-800" },
    { weight: 10, color: "bg-green-500", border: "border-green-700" },
    { weight: 25, color: "bg-red-600", border: "border-red-800" },
    { weight: 15, color: "bg-yellow-500", border: "border-yellow-700" },
    { weight: 5, color: "bg-white", border: "border-slate-400" },
    { weight: 2.5, color: "bg-black", border: "border-slate-600" },
    { weight: 1.25, color: "bg-gray-400", border: "border-gray-600" },
  ];

  const plateWeight = targetWeight - barbellWeight;
  const weightPerSide = plateWeight / 2;

  const option1: PlateOption[] = [];
  let remaining1 = weightPerSide;
  for (const plate of plates) {
    const count = Math.floor(remaining1 / plate.weight);
    if (count > 0) {
      option1.push({
        weight: plate.weight,
        count: count,
        color: plate.color,
        border: plate.border,
      });
      remaining1 -= count * plate.weight;
    }
  }

  const platesAlt = [
    { weight: 25, color: "bg-red-600", border: "border-red-800" },
    { weight: 20, color: "bg-blue-600", border: "border-blue-800" },
    { weight: 15, color: "bg-yellow-500", border: "border-yellow-700" },
    { weight: 10, color: "bg-green-500", border: "border-green-700" },
    { weight: 5, color: "bg-white", border: "border-slate-400" },
    { weight: 2.5, color: "bg-black", border: "border-slate-600" },
    { weight: 1.25, color: "bg-gray-400", border: "border-gray-600" },
  ];

  const option2: PlateOption[] = [];
  let remaining2 = weightPerSide;
  for (const plate of platesAlt) {
    const count = Math.floor(remaining2 / plate.weight);
    if (count > 0) {
      option2.push({
        weight: plate.weight,
        count: count,
        color: plate.color,
        border: plate.border,
      });
      remaining2 -= count * plate.weight;
    }
  }

  const isSame = JSON.stringify(option1) === JSON.stringify(option2);
  if (isSame && option1.length > 1) {
    option2.length = 0;
    remaining2 = weightPerSide;
    for (const plate of platesAlt.slice(1)) {
      const count = Math.floor(remaining2 / plate.weight);
      if (count > 0) {
        option2.push({
          weight: plate.weight,
          count: count,
          color: plate.color,
          border: plate.border,
        });
        remaining2 -= count * plate.weight;
      }
    }
  }

  return {
    option1: { plates: option1, remainder: remaining1 },
    option2: { plates: option2, remainder: remaining2 },
    barbellWeight,
  };
}
