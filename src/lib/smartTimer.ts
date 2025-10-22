// Smart Timer System for Intelligent Rest Period Management
export interface ExerciseMetadata {
  id: string
  name: string
  category: string
  muscle_groups: string[]
  equipment: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  intensity_level?: 'low' | 'moderate' | 'high' | 'maximal'
}

export interface SetData {
  weight: number
  reps: number
  rpe?: number // Rate of Perceived Exertion (1-10)
  duration?: number // For time-based exercises
  heart_rate?: number
  rest_taken?: number
}

export interface UserProfile {
  fitness_level: 'beginner' | 'intermediate' | 'advanced'
  age?: number
  weight?: number
  height?: number
  max_heart_rate?: number
  resting_heart_rate?: number
  training_goals: string[]
  preferences: {
    rest_preference: 'minimal' | 'moderate' | 'extended'
    intensity_preference: 'conservative' | 'balanced' | 'aggressive'
  }
}

export interface SmartTimerConfig {
  baseRestTime: number
  exerciseType: 'strength' | 'cardio' | 'flexibility' | 'plyometric' | 'endurance'
  intensity: 'low' | 'moderate' | 'high' | 'maximal'
  setNumber: number
  totalSets: number
  previousSetRPE?: number
  heartRateZone?: 'recovery' | 'aerobic' | 'threshold' | 'anaerobic' | 'neuromuscular'
}

export class SmartTimer {
  private static readonly REST_TIME_BASE = {
    strength: {
      beginner: { low: 60, moderate: 90, high: 120, maximal: 180 },
      intermediate: { low: 45, moderate: 75, high: 105, maximal: 150 },
      advanced: { low: 30, moderate: 60, high: 90, maximal: 120 }
    },
    cardio: {
      beginner: { low: 30, moderate: 45, high: 60, maximal: 90 },
      intermediate: { low: 20, moderate: 35, high: 50, maximal: 75 },
      advanced: { low: 15, moderate: 25, high: 40, maximal: 60 }
    },
    flexibility: {
      beginner: { low: 15, moderate: 20, high: 30, maximal: 45 },
      intermediate: { low: 10, moderate: 15, high: 20, maximal: 30 },
      advanced: { low: 5, moderate: 10, high: 15, maximal: 20 }
    },
    plyometric: {
      beginner: { low: 60, moderate: 90, high: 120, maximal: 180 },
      intermediate: { low: 45, moderate: 75, high: 105, maximal: 150 },
      advanced: { low: 30, moderate: 60, high: 90, maximal: 120 }
    },
    endurance: {
      beginner: { low: 30, moderate: 45, high: 60, maximal: 90 },
      intermediate: { low: 20, moderate: 35, high: 50, maximal: 75 },
      advanced: { low: 15, moderate: 25, high: 40, maximal: 60 }
    }
  }

  private static readonly INTENSITY_MULTIPLIERS = {
    low: 0.7,
    moderate: 1.0,
    high: 1.3,
    maximal: 1.6
  }

  private static readonly RPE_ADJUSTMENTS = {
    1: -0.3, 2: -0.2, 3: -0.1, 4: 0, 5: 0,
    6: 0.1, 7: 0.2, 8: 0.3, 9: 0.4, 10: 0.5
  }

  private static readonly HEART_RATE_ZONE_MULTIPLIERS = {
    recovery: 0.5,
    aerobic: 0.7,
    threshold: 1.0,
    anaerobic: 1.3,
    neuromuscular: 1.5
  }

  /**
   * Calculate optimal rest time based on exercise type, intensity, and user profile
   */
  static calculateOptimalRestTime(
    exercise: ExerciseMetadata,
    setData: SetData,
    userProfile: UserProfile,
    config: SmartTimerConfig
  ): number {
    // Get base rest time for exercise type and user fitness level
    const baseRest = this.REST_TIME_BASE[config.exerciseType][userProfile.fitness_level][config.intensity]
    
    // Apply intensity multiplier
    let adjustedRest = baseRest * this.INTENSITY_MULTIPLIERS[config.intensity]
    
    // Apply RPE adjustment if available
    if (setData.rpe) {
      const rpeAdjustment = this.RPE_ADJUSTMENTS[setData.rpe as keyof typeof this.RPE_ADJUSTMENTS] || 0
      adjustedRest *= (1 + rpeAdjustment)
    }
    
    // Apply heart rate zone adjustment
    if (config.heartRateZone) {
      adjustedRest *= this.HEART_RATE_ZONE_MULTIPLIERS[config.heartRateZone]
    }
    
    // Apply set progression (later sets may need more rest)
    const setProgressionMultiplier = this.calculateSetProgressionMultiplier(config.setNumber, config.totalSets)
    adjustedRest *= setProgressionMultiplier
    
    // Apply user preferences
    const preferenceMultiplier = this.getPreferenceMultiplier(userProfile.preferences.rest_preference)
    adjustedRest *= preferenceMultiplier
    
    // Apply exercise-specific adjustments
    const exerciseMultiplier = this.getExerciseSpecificMultiplier(exercise)
    adjustedRest *= exerciseMultiplier
    
    // Ensure minimum and maximum bounds
    const minRest = this.getMinimumRestTime(config.exerciseType, userProfile.fitness_level)
    const maxRest = this.getMaximumRestTime(config.exerciseType, userProfile.fitness_level)
    
    return Math.max(minRest, Math.min(maxRest, Math.round(adjustedRest)))
  }

  /**
   * Calculate set progression multiplier (later sets may need more rest)
   */
  private static calculateSetProgressionMultiplier(setNumber: number, totalSets: number): number {
    const progression = setNumber / totalSets
    return 1 + (progression * 0.2) // Up to 20% more rest for later sets
  }

  /**
   * Get preference multiplier based on user's rest preference
   */
  private static getPreferenceMultiplier(preference: 'minimal' | 'moderate' | 'extended'): number {
    switch (preference) {
      case 'minimal': return 0.8
      case 'moderate': return 1.0
      case 'extended': return 1.2
      default: return 1.0
    }
  }

  /**
   * Get exercise-specific multiplier based on exercise characteristics
   */
  private static getExerciseSpecificMultiplier(exercise: ExerciseMetadata): number {
    let multiplier = 1.0
    
    // Compound exercises need more rest
    if (exercise.muscle_groups.length > 2) {
      multiplier += 0.2
    }
    
    // High-intensity exercises need more rest
    if (exercise.difficulty === 'advanced') {
      multiplier += 0.1
    }
    
    // Plyometric exercises need more rest
    if (exercise.category.toLowerCase().includes('plyometric') || 
        exercise.category.toLowerCase().includes('explosive')) {
      multiplier += 0.3
    }
    
    return multiplier
  }

  /**
   * Get minimum rest time for exercise type and fitness level
   */
  private static getMinimumRestTime(exerciseType: string, fitnessLevel: string): number {
    const minimums = {
      strength: { beginner: 30, intermediate: 20, advanced: 15 },
      cardio: { beginner: 15, intermediate: 10, advanced: 5 },
      flexibility: { beginner: 5, intermediate: 3, advanced: 2 },
      plyometric: { beginner: 30, intermediate: 20, advanced: 15 },
      endurance: { beginner: 15, intermediate: 10, advanced: 5 }
    }
    
    return minimums[exerciseType as keyof typeof minimums]?.[fitnessLevel as keyof typeof minimums.strength] || 15
  }

  /**
   * Get maximum rest time for exercise type and fitness level
   */
  private static getMaximumRestTime(exerciseType: string, fitnessLevel: string): number {
    const maximums = {
      strength: { beginner: 300, intermediate: 240, advanced: 180 },
      cardio: { beginner: 120, intermediate: 90, advanced: 60 },
      flexibility: { beginner: 60, intermediate: 45, advanced: 30 },
      plyometric: { beginner: 300, intermediate: 240, advanced: 180 },
      endurance: { beginner: 120, intermediate: 90, advanced: 60 }
    }
    
    return maximums[exerciseType as keyof typeof maximums]?.[fitnessLevel as keyof typeof maximums.strength] || 120
  }

  /**
   * Determine exercise type from exercise metadata
   */
  static determineExerciseType(exercise: ExerciseMetadata): 'strength' | 'cardio' | 'flexibility' | 'plyometric' | 'endurance' {
    const category = exercise.category.toLowerCase()
    const name = exercise.name.toLowerCase()
    
    if (category.includes('cardio') || category.includes('endurance') || 
        name.includes('running') || name.includes('cycling') || name.includes('rowing')) {
      return 'cardio'
    }
    
    if (category.includes('flexibility') || category.includes('stretching') || 
        name.includes('stretch') || name.includes('yoga')) {
      return 'flexibility'
    }
    
    if (category.includes('plyometric') || category.includes('explosive') || 
        name.includes('jump') || name.includes('explosive') || name.includes('power')) {
      return 'plyometric'
    }
    
    if (category.includes('strength') || category.includes('resistance') || 
        exercise.equipment.some(eq => ['dumbbell', 'barbell', 'kettlebell'].includes(eq.toLowerCase()))) {
      return 'strength'
    }
    
    return 'endurance' // Default fallback
  }

  /**
   * Determine intensity level from set data
   */
  static determineIntensityLevel(setData: SetData, exercise: ExerciseMetadata): 'low' | 'moderate' | 'high' | 'maximal' {
    // Use RPE if available
    if (setData.rpe) {
      if (setData.rpe <= 3) return 'low'
      if (setData.rpe <= 6) return 'moderate'
      if (setData.rpe <= 8) return 'high'
      return 'maximal'
    }
    
    // Use heart rate if available
    if (setData.heart_rate && exercise.name.toLowerCase().includes('cardio')) {
      // This would need user's max heart rate to be accurate
      // For now, use a simple heuristic
      if (setData.heart_rate < 120) return 'low'
      if (setData.heart_rate < 150) return 'moderate'
      if (setData.heart_rate < 170) return 'high'
      return 'maximal'
    }
    
    // Use weight/reps ratio for strength exercises
    if (exercise.equipment.some(eq => ['dumbbell', 'barbell'].includes(eq.toLowerCase()))) {
      // This is a simplified heuristic - in practice, you'd need 1RM data
      if (setData.reps >= 15) return 'low'
      if (setData.reps >= 8) return 'moderate'
      if (setData.reps >= 3) return 'high'
      return 'maximal'
    }
    
    return 'moderate' // Default fallback
  }

  /**
   * Get smart recommendations during rest
   */
  static getRestRecommendations(
    exercise: ExerciseMetadata,
    setData: SetData,
    userProfile: UserProfile,
    restTimeRemaining: number
  ): string[] {
    const recommendations: string[] = []
    
    // Hydration reminder
    if (restTimeRemaining > 60) {
      recommendations.push('💧 Stay hydrated - take a sip of water')
    }
    
    // Breathing exercises for high intensity
    if (setData.rpe && setData.rpe >= 8) {
      recommendations.push('🫁 Practice deep breathing to recover')
    }
    
    // Mobility for compound exercises
    if (exercise.muscle_groups.length > 2) {
      recommendations.push('🤸 Light mobility work for active recovery')
    }
    
    // Mental preparation for next set
    if (restTimeRemaining < 30) {
      recommendations.push('🎯 Prepare mentally for your next set')
    }
    
    // Stretching for flexibility exercises
    if (exercise.category.toLowerCase().includes('flexibility')) {
      recommendations.push('🧘 Gentle stretching to maintain flexibility')
    }
    
    return recommendations
  }

  /**
   * Calculate heart rate zone from current heart rate
   */
  static calculateHeartRateZone(currentHR: number, maxHR: number): 'recovery' | 'aerobic' | 'threshold' | 'anaerobic' | 'neuromuscular' {
    const percentage = (currentHR / maxHR) * 100
    
    if (percentage < 60) return 'recovery'
    if (percentage < 70) return 'aerobic'
    if (percentage < 80) return 'threshold'
    if (percentage < 90) return 'anaerobic'
    return 'neuromuscular'
  }

  /**
   * Estimate 1RM from weight and reps (simplified formula)
   */
  static estimate1RM(weight: number, reps: number): number {
    if (reps === 1) return weight
    if (reps <= 0) return 0
    
    // Epley formula: 1RM = weight * (1 + reps/30)
    return weight * (1 + reps / 30)
  }

  /**
   * Calculate training intensity percentage
   */
  static calculateTrainingIntensity(currentWeight: number, estimated1RM: number): number {
    if (estimated1RM <= 0) return 0
    return (currentWeight / estimated1RM) * 100
  }
}
