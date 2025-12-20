// Dynamic Summary System for Personalized Workout Insights
export interface WorkoutData {
  id: string
  name: string
  duration: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  exercises: ExerciseData[]
  completedAt: string
  totalSets: number
  completedSets: number
  totalWeight: number
  averageRPE?: number
  restTime?: number
}

export interface ExerciseData {
  id: string
  name: string
  category: string
  muscleGroups: string[]
  sets: number
  completedSets: number
  reps: number
  weight: number
  rpe?: number
  restTime?: number
}

export interface UserProfile {
  id: string
  name: string
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  goals: string[]
  preferences: {
    summaryStyle: 'detailed' | 'concise' | 'motivational'
    showProgress: boolean
    showRecommendations: boolean
    showComparisons: boolean
  }
  stats: {
    totalWorkouts: number
    averageWorkoutDuration: number
    favoriteExercises: string[]
    strengthProgress: number
    consistency: number
  }
}

export interface WorkoutComparison {
  previousWorkout?: WorkoutData
  personalBest?: {
    exercise: string
    weight: number
    reps: number
    date: string
  }
  weeklyProgress: {
    workoutsThisWeek: number
    totalDuration: number
    averageRPE: number
  }
}

export interface SummaryInsight {
  type: 'achievement' | 'improvement' | 'recommendation' | 'motivation' | 'warning'
  title: string
  description: string
  icon: string
  color: string
  actionable?: boolean
  actionText?: string
  actionUrl?: string
}

export interface DynamicSummary {
  greeting: string
  overallPerformance: {
    score: number
    rating: 'excellent' | 'great' | 'good' | 'fair' | 'needs_improvement'
    description: string
  }
  highlights: string[]
  insights: SummaryInsight[]
  stats: {
    duration: string
    exercisesCompleted: string
    totalVolume: string
    averageRPE: string
    consistency: string
  }
  recommendations: string[]
  nextSteps: string[]
  motivationalMessage: string
}

export class DynamicSummaryGenerator {
  private static readonly PERFORMANCE_THRESHOLDS = {
    excellent: 90,
    great: 80,
    good: 70,
    fair: 60
  }

  private static readonly GREETING_TEMPLATES = {
    morning: [
      "Good morning, {name}! 🌅",
      "Rise and grind, {name}! 💪",
      "Morning warrior, {name}! ⚡",
      "Starting strong, {name}! 🔥"
    ],
    afternoon: [
      "Great afternoon session, {name}! ☀️",
      "Powering through the day, {name}! 💥",
      "Afternoon beast mode, {name}! 🦁",
      "Crushing it this afternoon, {name}! ⚡"
    ],
    evening: [
      "Evening champion, {name}! 🌙",
      "Finishing strong, {name}! 💪",
      "Night owl gains, {name}! 🦉",
      "Evening warrior, {name}! ⚔️"
    ]
  }

  private static readonly MOTIVATIONAL_MESSAGES = {
    excellent: [
      "You're absolutely crushing your fitness goals! Keep this momentum going! 🚀",
      "Outstanding performance! You're setting the bar higher with every workout! 💎",
      "Incredible work! You're becoming the athlete you've always wanted to be! 🏆",
      "Phenomenal session! Your dedication is paying off in amazing ways! ✨"
    ],
    great: [
      "Fantastic work! You're building incredible strength and consistency! 💪",
      "Great job! Your progress is evident and inspiring! 🌟",
      "Excellent session! You're on the path to greatness! 🎯",
      "Outstanding effort! Keep pushing those boundaries! 🔥"
    ],
    good: [
      "Solid work! Every rep counts toward your goals! 💯",
      "Good job! You're building the foundation for success! 🏗️",
      "Nice work! Consistency is key, and you're nailing it! 🔑",
      "Well done! You're making steady progress toward your goals! 📈"
    ],
    fair: [
      "Good effort! Every workout is a step forward! 👣",
      "Nice try! Tomorrow is another opportunity to improve! 🌅",
      "Keep going! Progress isn't always linear, but you're moving forward! 📊",
      "Good attempt! Your commitment to showing up is what matters! 💪"
    ],
    needs_improvement: [
      "Every workout counts! You're building the habit of consistency! 🌱",
      "Great that you showed up! That's the hardest part! 🎯",
      "Progress takes time! You're laying the groundwork for success! 🏗️",
      "Consistency over perfection! You're on the right track! 🛤️"
    ]
  }

  /**
   * Generate a dynamic, personalized workout summary
   */
  static generateSummary(
    workoutData: WorkoutData,
    userProfile: UserProfile,
    comparison?: WorkoutComparison
  ): DynamicSummary {
    const performanceScore = this.calculatePerformanceScore(workoutData, userProfile)
    const rating = this.getPerformanceRating(performanceScore)
    const greeting = this.generateGreeting(userProfile.name)
    const highlights = this.generateHighlights(workoutData, comparison)
    const insights = this.generateInsights(workoutData, userProfile, comparison)
    const recommendations = this.generateRecommendations(workoutData, userProfile, comparison)
    const nextSteps = this.generateNextSteps(workoutData, userProfile)
    const motivationalMessage = this.getMotivationalMessage(rating)

    return {
      greeting,
      overallPerformance: {
        score: performanceScore,
        rating,
        description: this.getPerformanceDescription(rating, workoutData)
      },
      highlights,
      insights,
      stats: this.generateStats(workoutData),
      recommendations,
      nextSteps,
      motivationalMessage
    }
  }

  /**
   * Calculate overall performance score (0-100)
   */
  private static calculatePerformanceScore(workoutData: WorkoutData, userProfile: UserProfile): number {
    let score = 0

    // Completion rate (40% weight)
    const completionRate = (workoutData.completedSets / workoutData.totalSets) * 100
    score += completionRate * 0.4

    // Duration efficiency (20% weight)
    const expectedDuration = this.getExpectedDuration(workoutData.difficulty, workoutData.exercises.length)
    const durationScore = Math.min(100, (expectedDuration / workoutData.duration) * 100)
    score += durationScore * 0.2

    // Volume progression (20% weight)
    const volumeScore = this.calculateVolumeScore(workoutData, userProfile)
    score += volumeScore * 0.2

    // Consistency bonus (20% weight)
    const consistencyScore = userProfile.stats.consistency
    score += consistencyScore * 0.2

    return Math.round(score)
  }

  /**
   * Get performance rating based on score
   */
  private static getPerformanceRating(score: number): 'excellent' | 'great' | 'good' | 'fair' | 'needs_improvement' {
    if (score >= this.PERFORMANCE_THRESHOLDS.excellent) return 'excellent'
    if (score >= this.PERFORMANCE_THRESHOLDS.great) return 'great'
    if (score >= this.PERFORMANCE_THRESHOLDS.good) return 'good'
    if (score >= this.PERFORMANCE_THRESHOLDS.fair) return 'fair'
    return 'needs_improvement'
  }

  /**
   * Generate personalized greeting based on time of day
   */
  private static generateGreeting(name: string): string {
    const hour = new Date().getHours()
    let timeOfDay: 'morning' | 'afternoon' | 'evening'
    
    if (hour < 12) timeOfDay = 'morning'
    else if (hour < 18) timeOfDay = 'afternoon'
    else timeOfDay = 'evening'

    const templates = this.GREETING_TEMPLATES[timeOfDay]
    const template = templates[Math.floor(Math.random() * templates.length)]
    
    return template.replace('{name}', name)
  }

  /**
   * Generate workout highlights
   */
  private static generateHighlights(workoutData: WorkoutData, comparison?: WorkoutComparison): string[] {
    const highlights: string[] = []

    // Completion highlight
    if (workoutData.completedSets === workoutData.totalSets) {
      highlights.push(`Completed all ${workoutData.totalSets} sets! 🎯`)
    } else {
      highlights.push(`Completed ${workoutData.completedSets}/${workoutData.totalSets} sets`)
    }

    // Duration highlight
    const durationText = workoutData.duration < 60 
      ? `${workoutData.duration} minutes` 
      : `${Math.floor(workoutData.duration / 60)}h ${workoutData.duration % 60}m`
    highlights.push(`Finished in ${durationText} ⏱️`)

    // Volume highlight
    if (workoutData.totalWeight > 0) {
      highlights.push(`Moved ${workoutData.totalWeight}kg total volume 💪`)
    }

    // Personal best highlight
    if (comparison?.personalBest) {
      highlights.push(`New personal best in ${comparison.personalBest.exercise}! 🏆`)
    }

    // Consistency highlight
    if (comparison?.weeklyProgress?.workoutsThisWeek && comparison.weeklyProgress.workoutsThisWeek >= 3) {
      highlights.push(`${comparison.weeklyProgress.workoutsThisWeek} workouts this week! 🔥`)
    }

    return highlights
  }

  /**
   * Generate personalized insights
   */
  private static generateInsights(
    workoutData: WorkoutData,
    userProfile: UserProfile,
    comparison?: WorkoutComparison
  ): SummaryInsight[] {
    const insights: SummaryInsight[] = []

    // Performance insight
    const performanceScore = this.calculatePerformanceScore(workoutData, userProfile)
    if (performanceScore >= 90) {
      insights.push({
        type: 'achievement',
        title: 'Outstanding Performance!',
        description: 'You exceeded expectations in every aspect of today\'s workout.',
        icon: '🏆',
        color: 'text-yellow-600',
        actionable: true,
        actionText: 'Share your achievement',
        actionUrl: '/client/achievements'
      })
    }

    // Volume insight
    if (workoutData.totalWeight > 0) {
      const avgWeightPerSet = workoutData.totalWeight / workoutData.completedSets
      if (avgWeightPerSet > 50) {
        insights.push({
          type: 'improvement',
          title: 'Heavy Lifting Champion!',
          description: `You averaged ${avgWeightPerSet.toFixed(1)}kg per set - impressive strength!`,
          icon: '💪',
          color: 'text-blue-600'
        })
      }
    }

    // Consistency insight
    if (comparison?.weeklyProgress?.workoutsThisWeek && comparison.weeklyProgress.workoutsThisWeek >= 4) {
      insights.push({
        type: 'motivation',
        title: 'Consistency King!',
        description: 'You\'re building an incredible workout streak. Keep it up!',
        icon: '🔥',
        color: 'text-orange-600'
      })
    }

    // Recovery insight
    if (workoutData.averageRPE && workoutData.averageRPE > 8) {
      insights.push({
        type: 'recommendation',
        title: 'High Intensity Session',
        description: 'You pushed hard today! Make sure to prioritize recovery.',
        icon: '⚡',
        color: 'text-purple-600',
        actionable: true,
        actionText: 'View recovery tips',
        actionUrl: '/client/recovery'
      })
    }

    // Progress insight
    if (comparison?.previousWorkout) {
      const progress = this.calculateProgress(workoutData, comparison.previousWorkout)
      if (progress > 5) {
        insights.push({
          type: 'improvement',
          title: 'Making Progress!',
          description: `You've improved by ${progress}% since your last workout!`,
          icon: '📈',
          color: 'text-green-600'
        })
      }
    }

    return insights
  }

  /**
   * Generate personalized recommendations
   */
  private static generateRecommendations(
    workoutData: WorkoutData,
    userProfile: UserProfile,
    comparison?: WorkoutComparison
  ): string[] {
    const recommendations: string[] = []

    // Based on completion rate
    const completionRate = (workoutData.completedSets / workoutData.totalSets) * 100
    if (completionRate < 80) {
      recommendations.push('Consider reducing the number of sets or exercises to improve completion rate')
    }

    // Based on RPE
    if (workoutData.averageRPE && workoutData.averageRPE > 8) {
      recommendations.push('Focus on recovery - consider lighter intensity for your next session')
    } else if (workoutData.averageRPE && workoutData.averageRPE < 6) {
      recommendations.push('You have room to push harder - try increasing intensity next time')
    }

    // Based on duration
    const expectedDuration = this.getExpectedDuration(workoutData.difficulty, workoutData.exercises.length)
    if (workoutData.duration > expectedDuration * 1.2) {
      recommendations.push('Consider reducing rest time between sets to improve workout efficiency')
    }

    // Based on user goals
    if (userProfile.goals.includes('strength')) {
      recommendations.push('Focus on progressive overload - try increasing weight or reps next session')
    }
    if (userProfile.goals.includes('endurance')) {
      recommendations.push('Consider adding cardio or circuit training to your routine')
    }

    return recommendations
  }

  /**
   * Generate next steps
   */
  private static generateNextSteps(workoutData: WorkoutData, userProfile: UserProfile): string[] {
    const nextSteps: string[] = []

    nextSteps.push('Schedule your next workout to maintain consistency')
    nextSteps.push('Log your nutrition to support your training')
    
    if (workoutData.averageRPE && workoutData.averageRPE > 7) {
      nextSteps.push('Prioritize sleep and recovery for optimal results')
    }

    if (userProfile.stats.consistency < 70) {
      nextSteps.push('Set a weekly workout goal to improve consistency')
    }

    return nextSteps
  }

  /**
   * Generate workout statistics
   */
  private static generateStats(workoutData: WorkoutData) {
    const duration = workoutData.duration < 60 
      ? `${workoutData.duration}m` 
      : `${Math.floor(workoutData.duration / 60)}h ${workoutData.duration % 60}m`

    return {
      duration,
      exercisesCompleted: `${workoutData.exercises.length} exercises`,
      totalVolume: `${workoutData.totalWeight}kg`,
      averageRPE: workoutData.averageRPE ? `${workoutData.averageRPE}/10` : 'N/A',
      consistency: `${Math.round((workoutData.completedSets / workoutData.totalSets) * 100)}%`
    }
  }

  /**
   * Get motivational message based on performance rating
   */
  private static getMotivationalMessage(rating: string): string {
    const messages = this.MOTIVATIONAL_MESSAGES[rating as keyof typeof this.MOTIVATIONAL_MESSAGES]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  /**
   * Get performance description
   */
  private static getPerformanceDescription(rating: string, workoutData: WorkoutData): string {
    const descriptions = {
      excellent: `Outstanding performance! You completed ${workoutData.completedSets}/${workoutData.totalSets} sets with exceptional effort.`,
      great: `Great work! You completed ${workoutData.completedSets}/${workoutData.totalSets} sets and showed strong commitment.`,
      good: `Good session! You completed ${workoutData.completedSets}/${workoutData.totalSets} sets and maintained consistency.`,
      fair: `Solid effort! You completed ${workoutData.completedSets}/${workoutData.totalSets} sets and showed up for yourself.`,
      needs_improvement: `Every workout counts! You completed ${workoutData.completedSets}/${workoutData.totalSets} sets and are building the habit.`
    }
    return descriptions[rating as keyof typeof descriptions]
  }

  /**
   * Helper methods
   */
  private static getExpectedDuration(difficulty: string, exerciseCount: number): number {
    const baseTime = { beginner: 30, intermediate: 45, advanced: 60 }
    return baseTime[difficulty as keyof typeof baseTime] + (exerciseCount * 5)
  }

  private static calculateVolumeScore(workoutData: WorkoutData, userProfile: UserProfile): number {
    // Simplified volume scoring based on user's fitness level
    const baseVolume = { beginner: 100, intermediate: 200, advanced: 300 }
    const expectedVolume = baseVolume[userProfile.fitnessLevel]
    return Math.min(100, (workoutData.totalWeight / expectedVolume) * 100)
  }

  private static calculateProgress(current: WorkoutData, previous: WorkoutData): number {
    const currentVolume = current.totalWeight
    const previousVolume = previous.totalWeight
    return ((currentVolume - previousVolume) / previousVolume) * 100
  }
}
