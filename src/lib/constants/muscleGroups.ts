/**
 * Muscle Group Constants
 * Standard muscle group names and mapping functions for volume calculations
 */

/**
 * Standard muscle group names as defined in the database
 * These match the names in the muscle_groups table
 */
export const STANDARD_MUSCLE_GROUPS = [
  'Quads',
  'Chest',
  'Hamstrings',
  'Glutes',
  'Lats',
  'Biceps',
  'Triceps',
  'Shoulders',
  'Back',
  'Calves',
  'Core',
  'Abs',
  'Forearms',
  'Traps',
  'Full Body',
] as const;

export type MuscleGroupName = typeof STANDARD_MUSCLE_GROUPS[number];

/**
 * Mapping of common variations to standard muscle group names
 * Used to normalize muscle group names from various sources
 */
const MUSCLE_GROUP_MAPPING: Record<string, MuscleGroupName> = {
  // Quads variations
  'quadriceps': 'Quads',
  'quad': 'Quads',
  'thighs': 'Quads',
  'thigh': 'Quads',
  
  // Chest variations
  'pecs': 'Chest',
  'pectorals': 'Chest',
  'chest muscles': 'Chest',
  'pectoral': 'Chest',
  
  // Hamstrings variations
  'hamstring': 'Hamstrings',
  'hams': 'Hamstrings',
  'posterior chain': 'Hamstrings',
  
  // Glutes variations
  'glute': 'Glutes',
  'gluteal': 'Glutes',
  'butt': 'Glutes',
  'buttocks': 'Glutes',
  
  // Lats variations
  'lat': 'Lats',
  'latissimus': 'Lats',
  'latissimus dorsi': 'Lats',
  
  // Biceps variations
  'bicep': 'Biceps',
  'biceps brachii': 'Biceps',
  
  // Triceps variations
  'tricep': 'Triceps',
  'triceps brachii': 'Triceps',
  
  // Shoulders variations
  'shoulder': 'Shoulders',
  'delts': 'Shoulders',
  'deltoids': 'Shoulders',
  'deltoid': 'Shoulders',
  
  // Back variations
  'upper back': 'Back',
  'mid back': 'Back',
  'lower back': 'Back',
  'back muscles': 'Back',
  
  // Calves variations
  'calf': 'Calves',
  'gastrocnemius': 'Calves',
  'soleus': 'Calves',
  
  // Core variations (Core and Abs are separate)
  'core muscles': 'Core',
  'abdominals': 'Abs',
  'abdominal': 'Abs',
  'abs': 'Abs',
  
  // Forearms variations
  'forearm': 'Forearms',
  
  // Traps variations
  'trap': 'Traps',
  'trapezius': 'Traps',
  
  // Full Body variations
  'full body': 'Full Body',
  'fullbody': 'Full Body',
  'whole body': 'Full Body',
};

/**
 * Maps a muscle group name (potentially non-standard) to the standard name
 * @param name - The muscle group name to normalize
 * @returns The standard muscle group name, or null if not found
 */
export function mapToStandardMuscleGroup(name: string): MuscleGroupName | null {
  if (!name) return null;
  
  const normalized = name.trim();
  
  // Check if it's already a standard name (case-insensitive)
  const standardMatch = STANDARD_MUSCLE_GROUPS.find(
    (mg) => mg.toLowerCase() === normalized.toLowerCase()
  );
  if (standardMatch) return standardMatch;
  
  // Check mapping table (case-insensitive)
  const mappingKey = Object.keys(MUSCLE_GROUP_MAPPING).find(
    (key) => key.toLowerCase() === normalized.toLowerCase()
  );
  if (mappingKey) {
    return MUSCLE_GROUP_MAPPING[mappingKey];
  }
  
  return null;
}

/**
 * Checks if a muscle group name is a standard name
 * @param name - The muscle group name to check
 * @returns True if the name is a standard muscle group name
 */
export function isStandardMuscleGroup(name: string): boolean {
  return STANDARD_MUSCLE_GROUPS.some(
    (mg) => mg.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Gets all standard muscle group names (excluding Full Body for volume calculations)
 * @returns Array of standard muscle group names
 */
export function getVolumeCalculationMuscleGroups(): MuscleGroupName[] {
  return STANDARD_MUSCLE_GROUPS.filter((mg) => mg !== 'Full Body') as MuscleGroupName[];
}
