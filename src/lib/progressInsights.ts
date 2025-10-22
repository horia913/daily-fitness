interface InsightData {
  currentValue: number
  previousValue: number
  timePeriod: string
  unit: string
  exerciseName?: string
}

interface ChartData {
  date: string
  value: number
}

export function generateInsightHeadline(
  data: InsightData | ChartData[],
  type: 'weight' | 'workouts' | 'duration' | 'streak' | 'reps'
): string {
  let insightData: InsightData

  // If it's an array of chart data, calculate the insight
  if (Array.isArray(data)) {
    if (data.length < 2) {
      return getDefaultInsight(type)
    }
    
    const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const latest = sortedData[sortedData.length - 1]
    const previous = sortedData[0]
    const timeDiff = Math.floor((new Date(latest.date).getTime() - new Date(previous.date).getTime()) / (1000 * 60 * 60 * 24))
    
    insightData = {
      currentValue: latest.value,
      previousValue: previous.value,
      timePeriod: timeDiff > 30 ? '30 days' : `${timeDiff} days`,
      unit: getUnit(type),
      exerciseName: type === 'reps' ? 'reps' : undefined
    }
  } else {
    insightData = data
  }

  const change = insightData.currentValue - insightData.previousValue
  const changePercent = insightData.previousValue > 0 ? Math.abs((change / insightData.previousValue) * 100) : 0

  // Generate insight based on type and change
  switch (type) {
    case 'weight':
      if (change < 0) {
        const weightLoss = Math.abs(change).toFixed(1)
        return `Down ${weightLoss}${insightData.unit} in the last ${insightData.timePeriod}! Awesome progress. 💪`
      } else if (change > 0) {
        const weightGain = change.toFixed(1)
        return `Up ${weightGain}${insightData.unit} in the last ${insightData.timePeriod}. Stay focused on your goals! 🎯`
      } else {
        return `Consistently tracking your weight! Keep up the great work. 📊`
      }

    case 'workouts':
      if (change > 0) {
        return `Completed ${change} more workouts this ${insightData.timePeriod}! You're on fire! 🔥`
      } else if (change < 0) {
        return `Building momentum! ${insightData.currentValue} workouts completed this ${insightData.timePeriod}. 🏋️‍♂️`
      } else {
        return `Consistent progress! ${insightData.currentValue} workouts this ${insightData.timePeriod}. 🎯`
      }

    case 'duration':
      const hoursChange = (change / 60).toFixed(1)
      if (change > 0) {
        return `+${hoursChange} hours of training this ${insightData.timePeriod}! Incredible dedication. ⏰`
      } else {
        return `Quality over quantity! ${(insightData.currentValue / 60).toFixed(1)} hours logged this ${insightData.timePeriod}. 💪`
      }

    case 'streak':
      if (change > 0) {
        return `${change}-day streak increase! You're unstoppable! 🔥`
      } else if (insightData.currentValue > 0) {
        return `Amazing ${insightData.currentValue}-day streak! Keep the momentum going! 🏆`
      } else {
        return `Ready to start a new streak? Every journey begins with a single step! 🚀`
      }

    case 'reps':
      if (change > 0) {
        return `+${change} reps improvement on ${insightData.exerciseName}! Getting stronger every day! 💪`
      } else if (change < 0) {
        return `Building endurance! ${insightData.currentValue} reps on ${insightData.exerciseName} - consistency is key! 🎯`
      } else {
        return `Solid performance! ${insightData.currentValue} reps on ${insightData.exerciseName}. 📈`
      }

    default:
      return getDefaultInsight(type)
  }
}

function getUnit(type: string): string {
  switch (type) {
    case 'weight': return 'kg'
    case 'duration': return 'min'
    case 'workouts': return ''
    case 'streak': return ''
    case 'reps': return ''
    default: return ''
  }
}

function getDefaultInsight(type: string): string {
  switch (type) {
    case 'weight': return 'Tracking your progress! Every measurement counts. 📊'
    case 'workouts': return 'Your fitness journey starts here! 🏋️‍♂️'
    case 'duration': return 'Building healthy habits one workout at a time! ⏰'
    case 'streak': return 'Ready to start your streak? 🚀'
    case 'reps': return 'Ready to set some personal records! 🏆'
    default: return 'Great work! Keep pushing forward! 💪'
  }
}

// Helper function to analyze workout data for insights
export function analyzeWorkoutTrends(sessions: any[]): {
  workoutInsight: string
  durationInsight: string
  streakInsight: string
} {
  if (sessions.length === 0) {
    return {
      workoutInsight: getDefaultInsight('workouts'),
      durationInsight: getDefaultInsight('duration'),
      streakInsight: getDefaultInsight('streak')
    }
  }

  // Calculate workout frequency trends
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const recentWorkouts = sessions.filter(s => new Date(s.completed_at) >= thirtyDaysAgo)
  const previousWorkouts = sessions.filter(s => {
    const date = new Date(s.completed_at)
    return date >= sixtyDaysAgo && date < thirtyDaysAgo
  })

  const workoutInsight = generateInsightHeadline({
    currentValue: recentWorkouts.length,
    previousValue: previousWorkouts.length,
    timePeriod: '30 days',
    unit: ''
  }, 'workouts')

  // Calculate duration trends
  const recentDuration = recentWorkouts.reduce((sum, w) => sum + (w.total_duration || 0), 0)
  const previousDuration = previousWorkouts.reduce((sum, w) => sum + (w.total_duration || 0), 0)

  const durationInsight = generateInsightHeadline({
    currentValue: recentDuration,
    previousValue: previousDuration,
    timePeriod: '30 days',
    unit: 'min'
  }, 'duration')

  // Calculate streak
  const sortedSessions = sessions.sort((a, b) => 
    new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  )
  
  let currentStreak = 0
  let currentDate = new Date()
  
  for (const session of sortedSessions) {
    const sessionDate = new Date(session.completed_at)
    const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff <= 1) {
      currentStreak++
      currentDate = sessionDate
    } else {
      break
    }
  }

  const streakInsight = generateInsightHeadline({
    currentValue: currentStreak,
    previousValue: 0,
    timePeriod: 'current',
    unit: ''
  }, 'streak')

  return {
    workoutInsight,
    durationInsight,
    streakInsight
  }
}
