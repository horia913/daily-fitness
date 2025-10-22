/**
 * COMPREHENSIVE ACHIEVEMENT SYSTEM
 * Tiered achievement definitions and tracking logic
 */

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum'
export type AchievementCategory = 
  | 'activity' 
  | 'performance' 
  | 'volume' 
  | 'endurance' 
  | 'transformation' 
  | 'lifestyle'

export interface AchievementDefinition {
  id: string
  name: string
  category: AchievementCategory
  description: string
  icon: string
  tiers: {
    bronze: { threshold: number; label: string }
    silver: { threshold: number; label: string }
    gold: { threshold: number; label: string }
    platinum: { threshold: number; label: string }
  }
}

// ========================================
// ACHIEVEMENT DEFINITIONS
// ========================================

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ========================================
  // 1. CORE ACTIVITY & CONSISTENCY
  // ========================================
  {
    id: 'the_regular',
    name: 'The Regular',
    category: 'activity',
    description: 'Log workouts consistently',
    icon: '📝',
    tiers: {
      bronze: { threshold: 10, label: 'First Steps' },
      silver: { threshold: 50, label: 'Regular' },
      gold: { threshold: 100, label: 'The Centurion' },
      platinum: { threshold: 250, label: 'Elite Logger' }
    }
  },
  {
    id: 'streak_keeper',
    name: 'Streak Keeper',
    category: 'activity',
    description: 'Complete weekly workout goals consecutively',
    icon: '🔥',
    tiers: {
      bronze: { threshold: 2, label: 'Starting Strong' },
      silver: { threshold: 4, label: 'Perfect Month' },
      gold: { threshold: 12, label: 'Habit Builder' },
      platinum: { threshold: 26, label: 'All-Weather Warrior' }
    }
  },
  {
    id: 'program_adherence',
    name: 'Program Adherence',
    category: 'activity',
    description: 'Complete full training programs',
    icon: '📋',
    tiers: {
      bronze: { threshold: 1, label: 'Finisher' },
      silver: { threshold: 3, label: 'Committed' },
      gold: { threshold: 5, label: 'Dedicated' },
      platinum: { threshold: 10, label: 'Program Master' }
    }
  },
  {
    id: 'the_veteran',
    name: 'The Veteran',
    category: 'activity',
    description: 'Long-term app usage',
    icon: '🎖️',
    tiers: {
      bronze: { threshold: 1, label: 'First Month' },
      silver: { threshold: 6, label: 'Half Year' },
      gold: { threshold: 12, label: 'Year of Iron' },
      platinum: { threshold: 24, label: 'Two Years Strong' }
    }
  },

  // ========================================
  // 2. PERFORMANCE & STRENGTH
  // ========================================
  {
    id: 'pr_breaker',
    name: 'PR Breaker',
    category: 'performance',
    description: 'Set new Personal Records',
    icon: '💪',
    tiers: {
      bronze: { threshold: 5, label: 'Getting Stronger' },
      silver: { threshold: 25, label: 'PR Hunter' },
      gold: { threshold: 50, label: 'Record Setter' },
      platinum: { threshold: 100, label: 'PR Legend' }
    }
  },
  {
    id: 'bench_press_club',
    name: 'Bench Press Club',
    category: 'performance',
    description: 'Bench press milestones',
    icon: '🏋️',
    tiers: {
      bronze: { threshold: 60, label: '60kg Club' },
      silver: { threshold: 85, label: '85kg Club' },
      gold: { threshold: 100, label: '100kg Club' },
      platinum: { threshold: 140, label: '140kg Club' }
    }
  },
  {
    id: 'squat_club',
    name: 'Squat Club',
    category: 'performance',
    description: 'Squat milestones',
    icon: '🦵',
    tiers: {
      bronze: { threshold: 85, label: '85kg Club' },
      silver: { threshold: 100, label: '100kg Club' },
      gold: { threshold: 140, label: '140kg Club' },
      platinum: { threshold: 185, label: '185kg Club' }
    }
  },
  {
    id: 'deadlift_club',
    name: 'Deadlift Club',
    category: 'performance',
    description: 'Deadlift milestones',
    icon: '🏋️‍♀️',
    tiers: {
      bronze: { threshold: 100, label: '100kg Club' },
      silver: { threshold: 140, label: '140kg Club' },
      gold: { threshold: 185, label: '185kg Club' },
      platinum: { threshold: 225, label: '225kg Club' }
    }
  },
  {
    id: 'bodyweight_boss',
    name: 'Bodyweight Boss',
    category: 'performance',
    description: 'Max pull-ups in a single set',
    icon: '🔝',
    tiers: {
      bronze: { threshold: 5, label: 'First Five' },
      silver: { threshold: 10, label: 'Double Digits' },
      gold: { threshold: 15, label: 'Advanced' },
      platinum: { threshold: 20, label: 'Elite Calisthenics' }
    }
  },

  // ========================================
  // 3. VOLUME & WORKLOAD
  // ========================================
  {
    id: 'volume_vanguard',
    name: 'Volume Vanguard',
    category: 'volume',
    description: 'Total weight lifted in a single workout',
    icon: '⚡',
    tiers: {
      bronze: { threshold: 5000, label: '5 Tonnes' },
      silver: { threshold: 7500, label: '7.5 Tonnes' },
      gold: { threshold: 10000, label: '10 Tonnes' },
      platinum: { threshold: 15000, label: '15 Tonnes' }
    }
  },
  {
    id: 'repetition_ruler',
    name: 'Repetition Ruler',
    category: 'volume',
    description: 'Total reps completed over time',
    icon: '🔢',
    tiers: {
      bronze: { threshold: 10000, label: '10K Reps' },
      silver: { threshold: 25000, label: '25K Reps' },
      gold: { threshold: 50000, label: '50K Reps' },
      platinum: { threshold: 100000, label: '100K Reps' }
    }
  },
  {
    id: 'the_workhorse',
    name: 'The Workhorse',
    category: 'volume',
    description: 'Total sets completed over time',
    icon: '🐴',
    tiers: {
      bronze: { threshold: 1000, label: '1K Sets' },
      silver: { threshold: 2500, label: '2.5K Sets' },
      gold: { threshold: 5000, label: '5K Sets' },
      platinum: { threshold: 10000, label: '10K Sets' }
    }
  },

  // ========================================
  // 4. ENDURANCE & CONDITIONING
  // ========================================
  {
    id: 'endurance_engine',
    name: 'Endurance Engine',
    category: 'endurance',
    description: 'Longest single cardio session (minutes)',
    icon: '🏃',
    tiers: {
      bronze: { threshold: 45, label: '45 Minutes' },
      silver: { threshold: 60, label: '1 Hour' },
      gold: { threshold: 90, label: '90 Minutes' },
      platinum: { threshold: 120, label: '2 Hours' }
    }
  },
  {
    id: 'distance_demon',
    name: 'Distance Demon',
    category: 'endurance',
    description: 'Total distance run in a month (km)',
    icon: '🏃‍♂️',
    tiers: {
      bronze: { threshold: 25, label: '25km Month' },
      silver: { threshold: 50, label: '50km Month' },
      gold: { threshold: 100, label: '100km Month' },
      platinum: { threshold: 150, label: '150km Month' }
    }
  },
  {
    id: 'hiit_hero',
    name: 'High-Intensity Hero',
    category: 'endurance',
    description: 'Total HIIT intervals completed',
    icon: '⚡',
    tiers: {
      bronze: { threshold: 100, label: '100 Intervals' },
      silver: { threshold: 250, label: '250 Intervals' },
      gold: { threshold: 500, label: '500 Intervals' },
      platinum: { threshold: 1000, label: '1K Intervals' }
    }
  },

  // ========================================
  // 5. BODY COMPOSITION & TRANSFORMATION
  // ========================================
  {
    id: 'weight_goal',
    name: 'Weight Goal',
    category: 'transformation',
    description: 'Progress towards weight goal',
    icon: '🎯',
    tiers: {
      bronze: { threshold: 25, label: 'Quarter Way' },
      silver: { threshold: 50, label: 'Halfway There' },
      gold: { threshold: 75, label: 'Almost Done' },
      platinum: { threshold: 100, label: 'Goal Achieved' }
    }
  },
  {
    id: 'measurement_milestone',
    name: 'Measurement Milestone',
    category: 'transformation',
    description: 'Total cm lost from all measurements',
    icon: '📏',
    tiers: {
      bronze: { threshold: 12.5, label: '12.5cm Lost' },
      silver: { threshold: 25, label: '25cm Lost' },
      gold: { threshold: 38, label: '38cm Lost' },
      platinum: { threshold: 63, label: '63cm Lost' }
    }
  },
  {
    id: 'body_recomposition',
    name: 'Body Recompositionist',
    category: 'transformation',
    description: 'Fat loss and muscle gain simultaneously',
    icon: '🔥',
    tiers: {
      bronze: { threshold: 1, label: 'First Instance' },
      silver: { threshold: 2, label: '2 Check-ins' },
      gold: { threshold: 3, label: '3 Check-ins' },
      platinum: { threshold: 4, label: '4 Check-ins' }
    }
  },

  // ========================================
  // 6. LIFESTYLE & WELLNESS HABITS
  // ========================================
  {
    id: 'hydration_habit',
    name: 'Hydration Habit',
    category: 'lifestyle',
    description: 'Hit daily water goal consecutively',
    icon: '💧',
    tiers: {
      bronze: { threshold: 7, label: '1 Week' },
      silver: { threshold: 14, label: '2 Weeks' },
      gold: { threshold: 30, label: '1 Month' },
      platinum: { threshold: 60, label: '2 Months' }
    }
  },
  {
    id: 'sleep_specialist',
    name: 'Sleep Specialist',
    category: 'lifestyle',
    description: 'Hit daily sleep goal consecutively',
    icon: '😴',
    tiers: {
      bronze: { threshold: 7, label: '1 Week' },
      silver: { threshold: 14, label: '2 Weeks' },
      gold: { threshold: 30, label: '1 Month' },
      platinum: { threshold: 60, label: '2 Months' }
    }
  },
  {
    id: 'nutrition_warrior',
    name: 'Nutrition Warrior',
    category: 'lifestyle',
    description: 'Follow meal plan consecutively',
    icon: '🥗',
    tiers: {
      bronze: { threshold: 7, label: '1 Week' },
      silver: { threshold: 14, label: '2 Weeks' },
      gold: { threshold: 30, label: '1 Month' },
      platinum: { threshold: 60, label: '2 Months' }
    }
  },
  {
    id: 'recovery_specialist',
    name: 'Recovery Specialist',
    category: 'lifestyle',
    description: 'Log mobility/stretching sessions',
    icon: '🧘',
    tiers: {
      bronze: { threshold: 10, label: '10 Sessions' },
      silver: { threshold: 25, label: '25 Sessions' },
      gold: { threshold: 50, label: '50 Sessions' },
      platinum: { threshold: 100, label: '100 Sessions' }
    }
  }
]

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get the tier earned for a given achievement based on current value
 */
export function getAchievementTier(
  achievementId: string, 
  currentValue: number
): { tier: AchievementTier | null; nextTier: AchievementTier | null; nextThreshold: number | null } {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId)
  if (!achievement) return { tier: null, nextTier: null, nextThreshold: null }

  const tiers: AchievementTier[] = ['platinum', 'gold', 'silver', 'bronze']
  
  for (const tier of tiers) {
    if (currentValue >= achievement.tiers[tier].threshold) {
      return { tier, nextTier: null, nextThreshold: null }
    }
  }

  // Not yet earned bronze, find next threshold
  return { 
    tier: null, 
    nextTier: 'bronze', 
    nextThreshold: achievement.tiers.bronze.threshold 
  }
}

/**
 * Get achievement progress percentage
 */
export function getAchievementProgress(achievementId: string, currentValue: number): number {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId)
  if (!achievement) return 0

  const { tier, nextTier, nextThreshold } = getAchievementTier(achievementId, currentValue)
  
  if (tier === 'platinum') return 100

  const targetThreshold = nextThreshold || achievement.tiers.platinum.threshold
  return Math.min((currentValue / targetThreshold) * 100, 100)
}

/**
 * Get all achievements by category
 */
export function getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(a => a.category === category)
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: AchievementTier): string {
  const colors = {
    bronze: 'from-amber-600 to-orange-700',
    silver: 'from-slate-300 to-slate-500',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-cyan-400 to-blue-600'
  }
  return colors[tier]
}

/**
 * Get tier icon
 */
export function getTierIcon(tier: AchievementTier): string {
  const icons = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎'
  }
  return icons[tier]
}

