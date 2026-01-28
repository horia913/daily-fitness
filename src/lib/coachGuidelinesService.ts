/**
 * Coach Guidelines Service
 * Provides volume calculations and progression recommendations based on evidence-based guidelines
 * Data is loaded from database tables with in-memory caching for performance
 */

import type { WorkoutBlock, WorkoutBlockExercise } from '@/types/workoutBlocks';
import { getVolumeCalculationMuscleGroups } from './constants/muscleGroups';
import { supabase } from './supabase';

// Extended Exercise type that includes muscle group information
// Components should load exercises with primary_muscle_group name via JOIN
type ExerciseWithMuscleGroup = {
  id: string;
  name: string;
  primary_muscle_group?: string | null; // Muscle group name (loaded from JOIN)
  primary_muscle_group_id?: string | null; // Muscle group ID (if name not loaded)
  muscle_groups?: string[]; // Legacy support
  [key: string]: any;
};

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * RP Volume Landmarks (for Hypertrophy category only)
 * Based on Renaissance Periodization volume landmarks
 */
export interface RPVolumeLandmarks {
  muscleGroup: string;
  mv: number; // Maintenance Volume
  mev: number; // Minimum Effective Volume (low)
  mevHigh: number; // Minimum Effective Volume (high)
  mavLow: number; // Maximum Adaptive Volume (low)
  mavHigh: number; // Maximum Adaptive Volume (high)
  mrv: number; // Maximum Recoverable Volume
  frequency: string; // e.g., "1.5-3x/wk"
}

/**
 * Standard Volume Guideline (for non-Hypertrophy categories)
 */
export interface VolumeGuideline {
  category: string;
  difficulty: string;
  setsPerMuscleWeekMin: number;
  setsPerMuscleWeekOptimal: number;
  setsPerMuscleWeekMax: number;
  repsPerSetMin: number;
  repsPerSetMax: number;
  rirMin: number;
  rirMax: number;
  loadPercentMin: number;
  loadPercentMax: number;
  restPeriodSec: number;
  sessionsPerWeek: string;
}

/**
 * Volume recommendation for a specific muscle group
 */
export interface MuscleGroupVolumeRecommendation {
  muscleGroup: string;
  currentSets: number;
  isPriority: boolean;
  recommendedMin: number; // Based on difficulty level
  recommendedOptimal: number; // Based on difficulty level
  recommendedMax: number; // Based on difficulty level
  maintenanceVolume: number; // MV for non-priority muscles (6 sets/week)
  status: "below" | "optimal" | "high" | "excessive";
}

/**
 * Progression guideline for program planning
 */
export interface ProgressionGuideline {
  category: string;
  difficulty: string;
  volumeIncreaseWeekMin: number;
  volumeIncreaseWeekMax: number;
  intensityIncreaseWeek: number;
  deloadFrequencyWeeks: number;
  deloadVolumeReduction: number;
  progressWhen: string;
}

/**
 * Progression suggestion for a specific week
 */
export interface ProgressionSuggestion {
  week: number;
  suggestion: string;
  type: 'volume' | 'intensity' | 'deload' | 'maintain';
  details?: string;
}

// ============================================================================
// CACHE (In-Memory)
// ============================================================================

let rpVolumeLandmarksCache: Map<string, RPVolumeLandmarks> | null = null;
let volumeGuidelinesCache: Map<string, VolumeGuideline> | null = null;
let progressionGuidelinesCache: Map<string, ProgressionGuideline> | null = null;
let cacheLoadPromise: Promise<void> | null = null;

// ============================================================================
// DATABASE LOADING FUNCTIONS
// ============================================================================

/**
 * Load all RP Volume Landmarks from database
 */
async function loadRPVolumeLandmarks(): Promise<Map<string, RPVolumeLandmarks>> {
  const { data, error } = await supabase
    .from('rp_volume_landmarks')
    .select('*')
    .order('muscle_group_name');

  if (error) {
    console.error('Error loading RP Volume Landmarks:', error);
    return new Map();
  }

  const landmarksMap = new Map<string, RPVolumeLandmarks>();
  
  if (data) {
    for (const row of data) {
      landmarksMap.set(row.muscle_group_name, {
        muscleGroup: row.muscle_group_name,
        mv: row.mv,
        mev: row.mev,
        mevHigh: row.mev_high,
        mavLow: row.mav_low,
        mavHigh: row.mav_high,
        mrv: row.mrv,
        frequency: row.frequency || '',
      });
    }
  }

  return landmarksMap;
}

/**
 * Load all Volume Guidelines from database
 */
async function loadVolumeGuidelines(): Promise<Map<string, VolumeGuideline>> {
  const { data, error } = await supabase
    .from('volume_guidelines')
    .select('*')
    .order('category, difficulty');

  if (error) {
    console.error('Error loading Volume Guidelines:', error);
    return new Map();
  }

  const guidelinesMap = new Map<string, VolumeGuideline>();
  
  if (data) {
    for (const row of data) {
      const key = `${row.category}-${row.difficulty}`;
      guidelinesMap.set(key, {
        category: row.category,
        difficulty: row.difficulty,
        setsPerMuscleWeekMin: row.sets_per_muscle_week_min,
        setsPerMuscleWeekOptimal: row.sets_per_muscle_week_optimal,
        setsPerMuscleWeekMax: row.sets_per_muscle_week_max,
        repsPerSetMin: row.reps_per_set_min,
        repsPerSetMax: row.reps_per_set_max,
        rirMin: row.rir_min,
        rirMax: row.rir_max,
        loadPercentMin: row.load_percent_min,
        loadPercentMax: row.load_percent_max,
        restPeriodSec: row.rest_period_sec,
        sessionsPerWeek: row.sessions_per_week || '',
      });
    }
  }

  return guidelinesMap;
}

/**
 * Load all Progression Guidelines from database
 */
async function loadProgressionGuidelines(): Promise<Map<string, ProgressionGuideline>> {
  const { data, error } = await supabase
    .from('progression_guidelines')
    .select('*')
    .order('category, difficulty');

  if (error) {
    console.error('Error loading Progression Guidelines:', error);
    return new Map();
  }

  const guidelinesMap = new Map<string, ProgressionGuideline>();
  
  if (data) {
    for (const row of data) {
      const key = `${row.category}-${row.difficulty}`;
      guidelinesMap.set(key, {
        category: row.category,
        difficulty: row.difficulty,
        volumeIncreaseWeekMin: row.volume_increase_week_min,
        volumeIncreaseWeekMax: row.volume_increase_week_max,
        intensityIncreaseWeek: row.intensity_increase_week,
        deloadFrequencyWeeks: row.deload_frequency_weeks,
        deloadVolumeReduction: row.deload_volume_reduction,
        progressWhen: row.progress_when || '',
      });
    }
  }

  return guidelinesMap;
}

/**
 * Load all guideline data from database (with caching)
 * This function ensures data is only loaded once and cached in memory
 */
async function ensureGuidelinesLoaded(): Promise<void> {
  // If already loaded, return immediately
  if (rpVolumeLandmarksCache !== null && volumeGuidelinesCache !== null && progressionGuidelinesCache !== null) {
    return;
  }

  // If a load is already in progress, wait for it
  if (cacheLoadPromise) {
    return cacheLoadPromise;
  }

  // Start loading
  cacheLoadPromise = (async () => {
    try {
      console.log("📥 Loading guidelines from database...");
      const [rpLandmarks, volumeGuidelines, progressionGuidelines] = await Promise.all([
        loadRPVolumeLandmarks(),
        loadVolumeGuidelines(),
        loadProgressionGuidelines(),
      ]);

      rpVolumeLandmarksCache = rpLandmarks;
      volumeGuidelinesCache = volumeGuidelines;
      progressionGuidelinesCache = progressionGuidelines;
      
      console.log("✅ Guidelines loaded:", {
        rpLandmarks: rpLandmarks.size,
        volumeGuidelines: volumeGuidelines.size,
        progressionGuidelines: progressionGuidelines.size,
        volumeGuidelineKeys: Array.from(volumeGuidelines.keys()).slice(0, 5),
      });
    } catch (error) {
      console.error('❌ Error loading guidelines:', error);
      // Set empty maps to prevent infinite retries
      rpVolumeLandmarksCache = new Map();
      volumeGuidelinesCache = new Map();
      progressionGuidelinesCache = new Map();
    } finally {
      cacheLoadPromise = null;
    }
  })();

  return cacheLoadPromise;
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export function clearGuidelinesCache(): void {
  rpVolumeLandmarksCache = null;
  volumeGuidelinesCache = null;
  progressionGuidelinesCache = null;
  cacheLoadPromise = null;
}

// ============================================================================
// GUIDELINE CATEGORIES
// ============================================================================

const GUIDELINE_CATEGORIES = [
  'Hypertrophy',
  'Max Strength',
  'Strength Endurance',
  'Explosive Power',
  'Sprint Speed',
  'Aerobic Endurance',
  'Anaerobic Capacity',
] as const;

// ============================================================================
// BLOCK TYPES FOR VOLUME CALCULATOR
// ============================================================================

const VOLUME_CALCULATOR_BLOCK_TYPES: WorkoutBlock['block_type'][] = [
  'straight_set',
  'superset',
  'giant_set',
  'drop_set',
  'cluster_set',
  'rest_pause',
  'pyramid_set',
  'ladder',
  'pre_exhaustion',
];

const TIME_BASED_BLOCK_TYPES: WorkoutBlock['block_type'][] = [
  'amrap',
  'emom',
  'for_time',
  'tabata',
  'circuit',
];

// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================

/**
 * Check if a category is one of the 7 guideline categories
 */
export function isGuidelineCategory(category: string): boolean {
  return GUIDELINE_CATEGORIES.includes(category as any);
}

/**
 * Get allowed block types for volume calculator
 * Returns only block types that contribute to volume (excludes time-based blocks)
 */
export function getAllowedBlockTypesForVolumeCalculator(): WorkoutBlock['block_type'][] {
  return [...VOLUME_CALCULATOR_BLOCK_TYPES];
}

/**
 * Get RP Volume Landmarks for a muscle group (Hypertrophy category only)
 */
export async function getRPVolumeLandmarks(muscleGroup: string): Promise<RPVolumeLandmarks | null> {
  await ensureGuidelinesLoaded();
  
  if (!rpVolumeLandmarksCache) {
    return null;
  }

  // Try exact match first
  if (rpVolumeLandmarksCache.has(muscleGroup)) {
    return rpVolumeLandmarksCache.get(muscleGroup)!;
  }
  
  // Try case-insensitive match
  const normalized = muscleGroup.trim();
  for (const [key, value] of rpVolumeLandmarksCache.entries()) {
    if (key.toLowerCase() === normalized.toLowerCase()) {
      return value;
    }
  }
  
  // Map "Shoulders" to Side/Rear Delts if not found
  if (normalized.toLowerCase() === 'shoulders') {
    return rpVolumeLandmarksCache.get('Shoulders') || null;
  }
  
  return null;
}

/**
 * Get volume guidelines for non-Hypertrophy categories
 */
export async function getVolumeGuidelines(
  category: string,
  difficulty: string
): Promise<VolumeGuideline | null> {
  await ensureGuidelinesLoaded();
  
  if (!volumeGuidelinesCache) {
    console.warn("⚠️ Volume guidelines cache is null");
    return null;
  }

  const key = `${category}-${difficulty}`;
  const guideline = volumeGuidelinesCache.get(key) || null;
  
  if (!guideline) {
    console.warn("⚠️ No volume guideline found for key:", key, "Available keys:", Array.from(volumeGuidelinesCache.keys()));
  }
  
  return guideline;
}

/**
 * Get progression guidelines for a category and difficulty
 */
export async function getProgressionGuidelines(
  category: string,
  difficulty: string
): Promise<ProgressionGuideline | null> {
  await ensureGuidelinesLoaded();
  
  if (!progressionGuidelinesCache) {
    return null;
  }

  const key = `${category}-${difficulty}`;
  return progressionGuidelinesCache.get(key) || null;
}

/**
 * Get volume status based on current sets vs recommended ranges
 */
export function getVolumeStatus(
  current: number,
  min: number,
  optimal: number,
  max: number
): 'below' | 'optimal' | 'high' | 'excessive' {
  if (current < min) return 'below';
  if (current >= min && current <= optimal) return 'optimal';
  if (current > optimal && current <= max) return 'high';
  return 'excessive';
}

/**
 * Calculate volume per muscle group from workout blocks
 * Only counts PRIMARY muscle groups and excludes time-based blocks
 */
export function calculateVolumePerMuscleGroup(
  blocks: WorkoutBlock[]
): Map<string, number> {
  const volumeMap = new Map<string, number>();
  
  // Filter out time-based blocks
  const resistanceBlocks = blocks.filter(
    (block) => !TIME_BASED_BLOCK_TYPES.includes(block.block_type)
  );
  
  for (const block of resistanceBlocks) {
    if (!block.exercises || block.exercises.length === 0) {
      continue;
    }
    
    // Get number of sets for this block
    const setsForBlock = block.total_sets || 1;
    
    // For pre_exhaustion blocks, count both exercises separately
    if (block.block_type === 'pre_exhaustion') {
      for (const exercise of block.exercises) {
        const sets = exercise.sets || setsForBlock;
        const muscleGroup = getPrimaryMuscleGroup(exercise.exercise as ExerciseWithMuscleGroup);
        if (muscleGroup && muscleGroup !== 'Full Body') {
          volumeMap.set(muscleGroup, (volumeMap.get(muscleGroup) || 0) + sets);
        }
      }
    } else {
      // For all other block types, count each exercise's sets
      for (const exercise of block.exercises) {
        const sets = exercise.sets || setsForBlock;
        const muscleGroup = getPrimaryMuscleGroup(exercise.exercise);
        if (muscleGroup && muscleGroup !== 'Full Body') {
          volumeMap.set(muscleGroup, (volumeMap.get(muscleGroup) || 0) + sets);
        }
      }
    }
  }
  
  return volumeMap;
}

/**
 * Helper function to get primary muscle group name from exercise
 * Supports multiple exercise data structures:
 * 1. Exercise with primary_muscle_group name (loaded from database JOIN) - preferred
 * 2. Legacy exercise with muscle_groups array (uses first item)
 * 
 * Note: Components calling calculateVolumePerMuscleGroup should ensure exercises
 * have their primary_muscle_group name loaded via JOIN with muscle_groups table
 */
function getPrimaryMuscleGroup(exercise?: ExerciseWithMuscleGroup | null): string | null {
  if (!exercise) return null;
  
  // Check if exercise has primary_muscle_group name (from database JOIN)
  // This is the preferred structure after migration
  if (exercise.primary_muscle_group) {
    return exercise.primary_muscle_group;
  }
  
  // Legacy support: check muscle_groups array (old structure)
  if (exercise.muscle_groups && Array.isArray(exercise.muscle_groups) && exercise.muscle_groups.length > 0) {
    return exercise.muscle_groups[0];
  }
  
  return null;
}

/**
 * Detect priority muscle group (highest volume)
 * Returns null if map is empty or all volumes are 0
 */
export function detectPriorityMuscleGroup(
  volumePerMuscleGroup: Map<string, number>
): string | null {
  if (volumePerMuscleGroup.size === 0) {
    return null;
  }
  
  let maxVolume = 0;
  let priorityMuscle: string | null = null;
  
  for (const [muscleGroup, volume] of volumePerMuscleGroup.entries()) {
    if (volume > maxVolume) {
      maxVolume = volume;
      priorityMuscle = muscleGroup;
    }
  }
  
  // Return null if no muscle group has volume > 0
  return maxVolume > 0 ? priorityMuscle : null;
}

/**
 * Get volume recommendation for a muscle group
 * Uses RP landmarks for Hypertrophy, standard guidelines for other categories
 * 
 * Note: daysPerWeek is informational only - recommendations are weekly totals
 * regardless of training frequency
 */
export async function getVolumeRecommendationForMuscleGroup(
  muscleGroup: string,
  currentSets: number,
  category: string,
  difficulty: string,
  isPriority: boolean,
  daysPerWeek: number // Informational only - not used in calculations
): Promise<MuscleGroupVolumeRecommendation> {
  // For Hypertrophy category, use RP landmarks
  if (category === 'Hypertrophy') {
    const landmarks = await getRPVolumeLandmarks(muscleGroup);
    if (!landmarks) {
      // Fallback to standard guidelines if muscle group not in RP table
      return getStandardVolumeRecommendation(
        muscleGroup,
        currentSets,
        category,
        difficulty,
        isPriority
      );
    }
    
    // Determine recommended values based on difficulty
    let recommendedMin: number;
    let recommendedOptimal: number;
    let recommendedMax: number;
    
    if (isPriority) {
      // Priority muscle uses full RP landmarks
      switch (difficulty) {
        case 'beginner':
          recommendedMin = landmarks.mev;
          recommendedOptimal = landmarks.mev;
          recommendedMax = landmarks.mevHigh;
          break;
        case 'intermediate':
          recommendedMin = landmarks.mev;
          recommendedOptimal = landmarks.mevHigh;
          recommendedMax = landmarks.mavLow;
          break;
        case 'advanced':
          recommendedMin = landmarks.mavLow;
          recommendedOptimal = landmarks.mavHigh;
          recommendedMax = landmarks.mrv;
          break;
        case 'athlete':
          recommendedMin = landmarks.mavHigh;
          recommendedOptimal = landmarks.mrv;
          recommendedMax = landmarks.mrv;
          break;
        default:
          recommendedMin = landmarks.mev;
          recommendedOptimal = landmarks.mev;
          recommendedMax = landmarks.mevHigh;
      }
    } else {
      // Non-priority muscles use maintenance volume (6 sets/week, except MV=0 muscles)
      const maintenanceVolume = landmarks.mv === 0 ? 0 : 6;
      recommendedMin = maintenanceVolume;
      recommendedOptimal = maintenanceVolume;
      recommendedMax = maintenanceVolume;
    }
    
    const status = getVolumeStatus(currentSets, recommendedMin, recommendedOptimal, recommendedMax);
    
    return {
      muscleGroup,
      currentSets,
      isPriority,
      recommendedMin,
      recommendedOptimal,
      recommendedMax,
      maintenanceVolume: landmarks.mv === 0 ? 0 : 6,
      status,
    };
  }
  
  // For other categories, use standard guidelines
  return getStandardVolumeRecommendation(
    muscleGroup,
    currentSets,
    category,
    difficulty,
    isPriority
  );
}

/**
 * Get standard volume recommendation (for non-Hypertrophy categories)
 */
async function getStandardVolumeRecommendation(
  muscleGroup: string,
  currentSets: number,
  category: string,
  difficulty: string,
  isPriority: boolean
): Promise<MuscleGroupVolumeRecommendation> {
  const guideline = await getVolumeGuidelines(category, difficulty);
  
  if (!guideline) {
    // Fallback if no guideline found
    return {
      muscleGroup,
      currentSets,
      isPriority,
      recommendedMin: 0,
      recommendedOptimal: 0,
      recommendedMax: 0,
      maintenanceVolume: 0,
      status: 'below',
    };
  }
  
  // For standard guidelines, all muscles get the same recommendations
  // (no priority vs non-priority distinction like Hypertrophy)
  const recommendedMin = guideline.setsPerMuscleWeekMin;
  const recommendedOptimal = guideline.setsPerMuscleWeekOptimal;
  const recommendedMax = guideline.setsPerMuscleWeekMax;
  
  const status = getVolumeStatus(currentSets, recommendedMin, recommendedOptimal, recommendedMax);
  
  return {
    muscleGroup,
    currentSets,
    isPriority,
    recommendedMin,
    recommendedOptimal,
    recommendedMax,
    maintenanceVolume: recommendedMin, // Use min as maintenance for standard guidelines
    status,
  };
}

/**
 * Get progression suggestions for a program week
 */
export async function getProgressionSuggestions(
  programWeek: number,
  lastDeloadWeek: number,
  category: string,
  difficulty: string
): Promise<ProgressionSuggestion[]> {
  const guideline = await getProgressionGuidelines(category, difficulty);
  if (!guideline) {
    return [];
  }
  
  const suggestions: ProgressionSuggestion[] = [];
  const weeksSinceDeload = programWeek - lastDeloadWeek;
  
  // Check if deload is needed
  if (weeksSinceDeload >= guideline.deloadFrequencyWeeks) {
    suggestions.push({
      week: programWeek,
      suggestion: `Deload Week: Reduce volume by ${guideline.deloadVolumeReduction}%`,
      type: 'deload',
      details: `Maintain intensity while reducing volume. This is week ${weeksSinceDeload} since last deload.`,
    });
    return suggestions;
  }
  
  // Regular progression suggestions
  if (guideline.volumeIncreaseWeekMin > 0 || guideline.volumeIncreaseWeekMax > 0) {
    suggestions.push({
      week: programWeek,
      suggestion: `Increase volume by ${guideline.volumeIncreaseWeekMin}-${guideline.volumeIncreaseWeekMax}%`,
      type: 'volume',
      details: guideline.progressWhen,
    });
  }
  
  if (guideline.intensityIncreaseWeek > 0) {
    suggestions.push({
      week: programWeek,
      suggestion: `Increase intensity by ${guideline.intensityIncreaseWeek}%`,
      type: 'intensity',
      details: 'Only increase intensity if volume is stable.',
    });
  }
  
  return suggestions;
}
