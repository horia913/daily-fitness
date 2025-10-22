// Habit Tracker Core Logic for Daily Fitness Habits
export interface HabitCategory {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Habit {
  id: string
  coach_id?: string
  category_id: string
  name: string
  description?: string
  icon: string
  color: string
  frequency_type: 'daily' | 'weekly' | 'monthly'
  target_value: number
  unit: string
  is_public: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  category?: HabitCategory
}

export interface UserHabit {
  id: string
  user_id: string
  habit_id: string
  coach_id?: string
  custom_name?: string
  custom_description?: string
  target_value: number
  frequency_type: 'daily' | 'weekly' | 'monthly'
  is_active: boolean
  start_date: string
  end_date?: string
  reminder_time?: string
  reminder_enabled: boolean
  created_at: string
  updated_at: string
  habit?: Habit
  streak?: HabitStreak
  recent_entries?: HabitEntry[]
}

export interface HabitEntry {
  id: string
  user_habit_id: string
  entry_date: string
  completed_value: number
  target_value: number
  is_completed: boolean
  notes?: string
  mood_rating?: number
  created_at: string
  updated_at: string
}

export interface HabitStreak {
  id: string
  user_habit_id: string
  current_streak: number
  longest_streak: number
  total_completions: number
  completion_rate: number
  last_completion_date?: string
  streak_start_date: string
  streak_end_date: string
  created_at: string
  updated_at: string
}

export interface HabitAnalytics {
  id: string
  user_id: string
  habit_id: string
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  period_start: string
  period_end: string
  total_completions: number
  total_target: number
  completion_rate: number
  average_mood?: number
  streak_count: number
  longest_streak: number
  created_at: string
  updated_at: string
}

export interface HabitReminder {
  id: string
  user_habit_id: string
  reminder_time: string
  days_of_week: number[]
  is_active: boolean
  last_sent?: string
  created_at: string
  updated_at: string
}

export class HabitTracker {
  private static readonly FREQUENCY_TYPES = {
    daily: { label: 'Daily', days: 1 },
    weekly: { label: 'Weekly', days: 7 },
    monthly: { label: 'Monthly', days: 30 }
  }

  private static readonly MOOD_RATINGS = [
    { value: 1, label: '😞', description: 'Very Bad' },
    { value: 2, label: '😕', description: 'Bad' },
    { value: 3, label: '😐', description: 'Neutral' },
    { value: 4, label: '😊', description: 'Good' },
    { value: 5, label: '😄', description: 'Excellent' }
  ]

  /**
   * Create a new user habit
   */
  static async createUserHabit(
    userId: string,
    habitId: string,
    options: {
      coachId?: string
      customName?: string
      customDescription?: string
      targetValue?: number
      frequencyType?: 'daily' | 'weekly' | 'monthly'
      reminderTime?: string
      reminderEnabled?: boolean
    } = {}
  ): Promise<UserHabit> {
    const userHabit: UserHabit = {
      id: `user_habit_${Date.now()}`,
      user_id: userId,
      habit_id: habitId,
      coach_id: options.coachId,
      custom_name: options.customName,
      custom_description: options.customDescription,
      target_value: options.targetValue || 1,
      frequency_type: options.frequencyType || 'daily',
      is_active: true,
      start_date: new Date().toISOString().split('T')[0],
      reminder_time: options.reminderTime,
      reminder_enabled: options.reminderEnabled || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return userHabit
  }

  /**
   * Log a habit entry for a specific date
   */
  static async logHabitEntry(
    userHabitId: string,
    entryDate: string,
    options: {
      completedValue?: number
      targetValue?: number
      notes?: string
      moodRating?: number
    } = {}
  ): Promise<HabitEntry> {
    const entry: HabitEntry = {
      id: `entry_${Date.now()}`,
      user_habit_id: userHabitId,
      entry_date: entryDate,
      completed_value: options.completedValue || 1,
      target_value: options.targetValue || 1,
      is_completed: (options.completedValue || 1) >= (options.targetValue || 1),
      notes: options.notes,
      mood_rating: options.moodRating,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return entry
  }

  /**
   * Calculate habit streak
   */
  static calculateStreak(entries: HabitEntry[]): {
    currentStreak: number
    longestStreak: number
    totalCompletions: number
    completionRate: number
    lastCompletionDate?: string
  } {
    if (entries.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        completionRate: 0
      }
    }

    // Sort entries by date (most recent first)
    const sortedEntries = entries.sort((a, b) => 
      new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    )

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let totalCompletions = 0
    let lastCompletionDate: string | undefined

    // Calculate streaks
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i]
      
      if (entry.is_completed) {
        totalCompletions++
        if (!lastCompletionDate) {
          lastCompletionDate = entry.entry_date
        }
        
        // Check if this continues the current streak
        if (i === 0 || tempStreak > 0) {
          tempStreak++
          if (i === 0) {
            currentStreak = tempStreak
          }
        } else {
          tempStreak = 1
        }
        
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        // Streak broken
        if (i === 0) {
          currentStreak = 0
        }
        tempStreak = 0
      }
    }

    const completionRate = entries.length > 0 ? (totalCompletions / entries.length) * 100 : 0

    return {
      currentStreak,
      longestStreak,
      totalCompletions,
      completionRate,
      lastCompletionDate
    }
  }

  /**
   * Get habit statistics for a period
   */
  static getHabitStats(
    entries: HabitEntry[],
    periodType: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ): {
    totalCompletions: number
    totalTarget: number
    completionRate: number
    averageMood?: number
    streakCount: number
    longestStreak: number
    periodCompletions: number
    periodTarget: number
    periodCompletionRate: number
  } {
    const streak = this.calculateStreak(entries)
    
    const totalCompletions = entries.reduce((sum, entry) => 
      sum + (entry.is_completed ? entry.completed_value : 0), 0
    )
    
    const totalTarget = entries.reduce((sum, entry) => 
      sum + entry.target_value, 0
    )
    
    const completionRate = totalTarget > 0 ? (totalCompletions / totalTarget) * 100 : 0
    
    const moodEntries = entries.filter(entry => entry.mood_rating)
    const averageMood = moodEntries.length > 0 
      ? moodEntries.reduce((sum, entry) => sum + (entry.mood_rating || 0), 0) / moodEntries.length
      : undefined

    // Calculate period-specific stats (last 30 days for monthly)
    const now = new Date()
    const periodStart = new Date(now)
    periodStart.setDate(now.getDate() - 30) // Last 30 days
    
    const periodEntries = entries.filter(entry => 
      new Date(entry.entry_date) >= periodStart
    )
    
    const periodCompletions = periodEntries.reduce((sum, entry) => 
      sum + (entry.is_completed ? entry.completed_value : 0), 0
    )
    
    const periodTarget = periodEntries.reduce((sum, entry) => 
      sum + entry.target_value, 0
    )
    
    const periodCompletionRate = periodTarget > 0 ? (periodCompletions / periodTarget) * 100 : 0

    return {
      totalCompletions,
      totalTarget,
      completionRate,
      averageMood,
      streakCount: streak.currentStreak,
      longestStreak: streak.longestStreak,
      periodCompletions,
      periodTarget,
      periodCompletionRate
    }
  }

  /**
   * Get habit progress for a specific date range
   */
  static getHabitProgress(
    entries: HabitEntry[],
    startDate: string,
    endDate: string
  ): {
    date: string
    completed: boolean
    completedValue: number
    targetValue: number
    moodRating?: number
    notes?: string
  }[] {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const progress: any[] = []

    // Generate all dates in range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]
      const entry = entries.find(e => e.entry_date === dateStr)
      
      progress.push({
        date: dateStr,
        completed: entry?.is_completed || false,
        completedValue: entry?.completed_value || 0,
        targetValue: entry?.target_value || 1,
        moodRating: entry?.mood_rating,
        notes: entry?.notes
      })
    }

    return progress
  }

  /**
   * Generate habit insights and recommendations
   */
  static generateInsights(
    userHabit: UserHabit,
    entries: HabitEntry[],
    streak: HabitStreak
  ): {
    insights: string[]
    recommendations: string[]
    achievements: string[]
  } {
    const insights: string[] = []
    const recommendations: string[] = []
    const achievements: string[] = []

    const stats = this.getHabitStats(entries)
    const habitName = userHabit.custom_name || userHabit.habit?.name || 'this habit'

    // Completion rate insights
    if (stats.completionRate >= 90) {
      insights.push(`Excellent consistency! You're completing ${habitName} ${stats.completionRate.toFixed(1)}% of the time.`)
      achievements.push('Consistency Champion')
    } else if (stats.completionRate >= 70) {
      insights.push(`Good progress! You're completing ${habitName} ${stats.completionRate.toFixed(1)}% of the time.`)
    } else if (stats.completionRate >= 50) {
      insights.push(`You're building the habit! Currently completing ${habitName} ${stats.completionRate.toFixed(1)}% of the time.`)
    } else {
      insights.push(`Keep going! You're completing ${habitName} ${stats.completionRate.toFixed(1)}% of the time.`)
    }

    // Streak insights
    if (streak.current_streak >= 30) {
      insights.push(`Amazing! You've maintained ${habitName} for ${streak.current_streak} days straight!`)
      achievements.push('Streak Master')
    } else if (streak.current_streak >= 14) {
      insights.push(`Great streak! You've been consistent with ${habitName} for ${streak.current_streak} days.`)
      achievements.push('Two Week Warrior')
    } else if (streak.current_streak >= 7) {
      insights.push(`Nice work! You've built a ${streak.current_streak}-day streak with ${habitName}.`)
      achievements.push('Week Warrior')
    } else if (streak.current_streak >= 3) {
      insights.push(`Good start! You're building momentum with ${habitName} (${streak.current_streak} days).`)
    }

    // Longest streak insights
    if (streak.longest_streak >= 100) {
      achievements.push('Century Streak')
    } else if (streak.longest_streak >= 50) {
      achievements.push('Half Century')
    } else if (streak.longest_streak >= 21) {
      achievements.push('Habit Formed')
    }

    // Recommendations based on performance
    if (stats.completionRate < 50) {
      recommendations.push('Try setting a smaller, more achievable target to build momentum')
      recommendations.push('Consider adding a reminder to help you remember this habit')
    } else if (stats.completionRate < 80) {
      recommendations.push('You\'re making good progress! Try to increase consistency by planning ahead')
      recommendations.push('Consider tracking your mood to understand what helps you succeed')
    } else {
      recommendations.push('Excellent work! Consider adding a related habit to build on this success')
      recommendations.push('You might be ready to increase the difficulty or add variations')
    }

    // Mood-based recommendations
    const moodEntries = entries.filter(e => e.mood_rating)
    if (moodEntries.length > 0) {
      const avgMood = moodEntries.reduce((sum, e) => sum + (e.mood_rating || 0), 0) / moodEntries.length
      if (avgMood >= 4) {
        insights.push('You feel great when you complete this habit! Keep it up!')
      } else if (avgMood <= 2) {
        recommendations.push('Consider adjusting this habit to make it more enjoyable')
      }
    }

    return { insights, recommendations, achievements }
  }

  /**
   * Get habit categories
   */
  static getHabitCategories(): HabitCategory[] {
    return [
      {
        id: 'fitness',
        name: 'Fitness',
        description: 'Physical activity and exercise habits',
        icon: '💪',
        color: '#10B981',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'nutrition',
        name: 'Nutrition',
        description: 'Eating and drinking habits',
        icon: '🥗',
        color: '#F59E0B',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'sleep',
        name: 'Sleep',
        description: 'Sleep and rest habits',
        icon: '😴',
        color: '#8B5CF6',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'wellness',
        name: 'Wellness',
        description: 'Mental health and wellness habits',
        icon: '🧘',
        color: '#06B6D4',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'hydration',
        name: 'Hydration',
        description: 'Water intake and hydration habits',
        icon: '💧',
        color: '#3B82F6',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'recovery',
        name: 'Recovery',
        description: 'Recovery and self-care habits',
        icon: '🛁',
        color: '#EC4899',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  }

  /**
   * Get frequency type info
   */
  static getFrequencyTypeInfo(type: string) {
    return this.FREQUENCY_TYPES[type as keyof typeof this.FREQUENCY_TYPES] || null
  }

  /**
   * Get mood rating info
   */
  static getMoodRatingInfo(rating: number) {
    return this.MOOD_RATINGS.find(m => m.value === rating) || null
  }

  /**
   * Validate habit entry
   */
  static validateHabitEntry(entry: Partial<HabitEntry>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!entry.user_habit_id) {
      errors.push('User habit ID is required')
    }

    if (!entry.entry_date) {
      errors.push('Entry date is required')
    }

    if (entry.completed_value !== undefined && entry.completed_value < 0) {
      errors.push('Completed value cannot be negative')
    }

    if (entry.target_value !== undefined && entry.target_value <= 0) {
      errors.push('Target value must be positive')
    }

    if (entry.mood_rating !== undefined && (entry.mood_rating < 1 || entry.mood_rating > 5)) {
      errors.push('Mood rating must be between 1 and 5')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get habit completion status for today
   */
  static getTodayStatus(userHabit: UserHabit, entries: HabitEntry[]): {
    isCompleted: boolean
    completedValue: number
    targetValue: number
    progress: number
    canComplete: boolean
  } {
    const today = new Date().toISOString().split('T')[0]
    const todayEntry = entries.find(e => e.entry_date === today)

    const targetValue = userHabit.target_value
    const completedValue = todayEntry?.completed_value || 0
    const isCompleted = todayEntry?.is_completed || false
    const progress = targetValue > 0 ? (completedValue / targetValue) * 100 : 0
    const canComplete = !isCompleted && completedValue < targetValue

    return {
      isCompleted,
      completedValue,
      targetValue,
      progress,
      canComplete
    }
  }
}
