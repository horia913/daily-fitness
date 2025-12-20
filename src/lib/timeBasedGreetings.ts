// Time-Based Greeting System for Dynamic Dashboard Messages
export interface UserContext {
  id: string
  name: string
  role: 'client' | 'coach'
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced'
  goals?: string[]
  lastWorkoutDate?: string
  streakDays?: number
  timezone?: string
  preferences?: {
    greetingStyle: 'casual' | 'motivational' | 'professional'
    showStreak: boolean
    showWeather: boolean
    showMotivation: boolean
    showTimeContext: boolean
    showQuickStats: boolean
    autoRefresh: boolean
    refreshInterval: number
  }
}

export interface GreetingData {
  greeting: string
  subtitle: string
  icon: string
  color: string
  backgroundColor: string
  borderColor: string
  motivationalMessage?: string
  streakInfo?: {
    days: number
    message: string
  }
  weatherInfo?: {
    condition: string
    temperature: string
    message: string
  }
  timeContext: {
    period: 'early_morning' | 'morning' | 'late_morning' | 'afternoon' | 'evening' | 'night'
    hour: number
    isWeekend: boolean
  }
}

export class TimeBasedGreetingGenerator {
  private static readonly GREETING_TEMPLATES = {
    client: {
      early_morning: {
        casual: [
          "Rise and shine, {name}! 🌅",
          "Early bird gets the gains, {name}! 🐦",
          "Morning warrior, {name}! ⚡",
          "Starting strong, {name}! 🔥"
        ],
        motivational: [
          "The morning belongs to champions, {name}! 🏆",
          "Every sunrise is a new opportunity, {name}! ☀️",
          "Conquer the day, {name}! 💪",
          "Your future self will thank you, {name}! 🙏"
        ],
        professional: [
          "Good morning, {name}. Ready for today's session?",
          "Morning, {name}. Let's make today count.",
          "Good morning, {name}. Time to focus on your goals."
        ]
      },
      morning: {
        casual: [
          "Good morning, {name}! ☀️",
          "Morning, {name}! Ready to crush it? 💪",
          "Hey {name}! Great morning for a workout! 🌟",
          "Morning champ, {name}! 🏆"
        ],
        motivational: [
          "Morning, {name}! Today's workout will change your life! 🚀",
          "Good morning, {name}! Your dedication inspires others! ✨",
          "Morning warrior, {name}! Every rep brings you closer to your goals! 🎯",
          "Rise and grind, {name}! Success starts with action! 💥"
        ],
        professional: [
          "Good morning, {name}. Ready for your training session?",
          "Morning, {name}. Let's achieve your fitness goals today.",
          "Good morning, {name}. Consistency is key to success."
        ]
      },
      late_morning: {
        casual: [
          "Late morning, {name}! Still time for gains! ⏰",
          "Hey {name}! Perfect time for a workout! 🎯",
          "Morning, {name}! Let's get moving! 🏃‍♂️",
          "Late start, {name}! But better late than never! ⚡"
        ],
        motivational: [
          "Late morning, {name}! Every moment counts! ⏱️",
          "Hey {name}! Your commitment shows in every session! 💪",
          "Morning, {name}! Progress over perfection! 📈",
          "Late start, {name}! But champions adapt! 🏆"
        ],
        professional: [
          "Good morning, {name}. Ready for your session?",
          "Morning, {name}. Let's make the most of today.",
          "Good morning, {name}. Consistency builds results."
        ]
      },
      afternoon: {
        casual: [
          "Good afternoon, {name}! 💪",
          "Afternoon, {name}! Time to get after it! 🔥",
          "Hey {name}! Perfect afternoon for gains! ⚡",
          "Afternoon warrior, {name}! 🏋️‍♂️"
        ],
        motivational: [
          "Afternoon, {name}! Your persistence is paying off! 🌟",
          "Good afternoon, {name}! Every workout builds character! 💎",
          "Afternoon champion, {name}! You're unstoppable! 🚀",
          "Hey {name}! Your dedication is inspiring! ✨"
        ],
        professional: [
          "Good afternoon, {name}. Ready for your training?",
          "Afternoon, {name}. Let's focus on your goals.",
          "Good afternoon, {name}. Progress requires action."
        ]
      },
      evening: {
        casual: [
          "Good evening, {name}! 🌙",
          "Evening, {name}! Time to finish strong! 💪",
          "Hey {name}! Evening gains are the best gains! 🌟",
          "Evening warrior, {name}! 🏆"
        ],
        motivational: [
          "Evening, {name}! You're building an incredible legacy! 🏗️",
          "Good evening, {name}! Your commitment never wavers! 💪",
          "Evening champion, {name}! Finish strong! 🎯",
          "Hey {name}! Your dedication is remarkable! ✨"
        ],
        professional: [
          "Good evening, {name}. Ready for your session?",
          "Evening, {name}. Let's end the day strong.",
          "Good evening, {name}. Consistency creates results."
        ]
      },
      night: {
        casual: [
          "Late night, {name}! Night owl gains! 🦉",
          "Hey {name}! Burning the midnight oil! 🔥",
          "Night warrior, {name}! 💪",
          "Late night, {name}! Dedication never sleeps! ⚡"
        ],
        motivational: [
          "Late night, {name}! Your commitment is extraordinary! 🌟",
          "Night owl, {name}! You're building something special! 🏗️",
          "Late night warrior, {name}! Champions never quit! 🏆",
          "Hey {name}! Your dedication inspires! ✨"
        ],
        professional: [
          "Good evening, {name}. Ready for your late session?",
          "Evening, {name}. Let's make this session count.",
          "Good evening, {name}. Dedication drives results."
        ]
      }
    },
    coach: {
      early_morning: {
        casual: [
          "Early morning, Coach {name}! 🌅",
          "Rise and inspire, {name}! ⚡",
          "Morning mentor, {name}! 🏆",
          "Early bird coach, {name}! 🐦"
        ],
        motivational: [
          "Morning, Coach {name}! Ready to change lives today? 💪",
          "Early morning, {name}! Your clients are lucky to have you! ✨",
          "Morning mentor, {name}! Today you'll inspire greatness! 🚀",
          "Rise and coach, {name}! Champions are made in moments like this! 🏆"
        ],
        professional: [
          "Good morning, Coach {name}. Ready for today's sessions?",
          "Morning, {name}. Let's help clients achieve their goals.",
          "Good morning, Coach {name}. Excellence starts early."
        ]
      },
      morning: {
        casual: [
          "Good morning, Coach {name}! ☀️",
          "Morning, Coach {name}! Ready to inspire? 💪",
          "Hey Coach {name}! Great day for coaching! 🌟",
          "Morning mentor, {name}! 🏆"
        ],
        motivational: [
          "Morning, Coach {name}! Today you'll change lives! 🚀",
          "Good morning, {name}! Your expertise transforms clients! ✨",
          "Morning coach, {name}! Every session makes a difference! 💎",
          "Hey Coach {name}! Your passion inspires others! 🔥"
        ],
        professional: [
          "Good morning, Coach {name}. Ready for today's clients?",
          "Morning, {name}. Let's deliver exceptional coaching.",
          "Good morning, Coach {name}. Excellence in every session."
        ]
      },
      late_morning: {
        casual: [
          "Late morning, Coach {name}! ⏰",
          "Hey Coach {name}! Perfect time for coaching! 🎯",
          "Morning, Coach {name}! Let's inspire! 🏃‍♂️",
          "Late start, Coach {name}! But quality over quantity! ⚡"
        ],
        motivational: [
          "Late morning, Coach {name}! Every session counts! ⏱️",
          "Hey Coach {name}! Your impact is immeasurable! 💪",
          "Morning, Coach {name}! Progress over perfection! 📈",
          "Late start, Coach {name}! But champions adapt! 🏆"
        ],
        professional: [
          "Good morning, Coach {name}. Ready for your sessions?",
          "Morning, {name}. Let's make the most of today.",
          "Good morning, Coach {name}. Consistency builds trust."
        ]
      },
      afternoon: {
        casual: [
          "Good afternoon, Coach {name}! 💪",
          "Afternoon, Coach {name}! Time to coach! 🔥",
          "Hey Coach {name}! Perfect afternoon for training! ⚡",
          "Afternoon mentor, {name}! 🏋️‍♂️"
        ],
        motivational: [
          "Afternoon, Coach {name}! Your clients are thriving! 🌟",
          "Good afternoon, {name}! Every session builds confidence! 💎",
          "Afternoon champion, Coach {name}! You're unstoppable! 🚀",
          "Hey Coach {name}! Your dedication inspires! ✨"
        ],
        professional: [
          "Good afternoon, Coach {name}. Ready for your sessions?",
          "Afternoon, {name}. Let's focus on client success.",
          "Good afternoon, Coach {name}. Excellence in action."
        ]
      },
      evening: {
        casual: [
          "Good evening, Coach {name}! 🌙",
          "Evening, Coach {name}! Time to finish strong! 💪",
          "Hey Coach {name}! Evening sessions are powerful! 🌟",
          "Evening mentor, {name}! 🏆"
        ],
        motivational: [
          "Evening, Coach {name}! You're building champions! 🏗️",
          "Good evening, {name}! Your impact lasts beyond the session! 💪",
          "Evening coach, {name}! Finish strong! 🎯",
          "Hey Coach {name}! Your passion is contagious! ✨"
        ],
        professional: [
          "Good evening, Coach {name}. Ready for your sessions?",
          "Evening, {name}. Let's end the day strong.",
          "Good evening, Coach {name}. Consistency creates results."
        ]
      },
      night: {
        casual: [
          "Late night, Coach {name}! Night owl coaching! 🦉",
          "Hey Coach {name}! Burning the midnight oil! 🔥",
          "Night mentor, {name}! 💪",
          "Late night, Coach {name}! Dedication never sleeps! ⚡"
        ],
        motivational: [
          "Late night, Coach {name}! Your commitment is extraordinary! 🌟",
          "Night owl, Coach {name}! You're building something special! 🏗️",
          "Late night warrior, Coach {name}! Champions never quit! 🏆",
          "Hey Coach {name}! Your dedication inspires! ✨"
        ],
        professional: [
          "Good evening, Coach {name}. Ready for your late sessions?",
          "Evening, {name}. Let's make this session count.",
          "Good evening, Coach {name}. Dedication drives results."
        ]
      }
    }
  }

  private static readonly SUBTITLE_TEMPLATES = {
    client: {
      early_morning: [
        "Early morning workouts set the tone for success!",
        "The early bird catches the gains!",
        "Morning workouts = unstoppable energy all day!",
        "Starting your day with strength!"
      ],
      morning: [
        "Ready to crush your fitness goals today?",
        "Let's make today your strongest day yet!",
        "Time to show your body what it's capable of!",
        "Your fitness journey continues today!"
      ],
      late_morning: [
        "Better late than never - let's get moving!",
        "Perfect time to fit in a great workout!",
        "Late morning gains are still gains!",
        "Flexibility in timing shows dedication!"
      ],
      afternoon: [
        "Afternoon workouts boost energy and focus!",
        "Perfect time to break up the day with fitness!",
        "Afternoon sessions = evening satisfaction!",
        "Let's power through the rest of your day!"
      ],
      evening: [
        "Evening workouts help you unwind and recharge!",
        "Perfect way to end your day on a high note!",
        "Evening sessions = better sleep and recovery!",
        "Let's finish your day with strength!"
      ],
      night: [
        "Night owl workouts are for dedicated athletes!",
        "Late night sessions show true commitment!",
        "Night workouts = morning satisfaction!",
        "Your dedication never sleeps!"
      ]
    },
    coach: {
      early_morning: [
        "Ready to inspire your clients today?",
        "Early morning coaching sets the standard!",
        "Your expertise transforms lives every day!",
        "Champions are made in moments like this!"
      ],
      morning: [
        "Time to help clients achieve their goals!",
        "Your coaching makes all the difference!",
        "Ready to guide clients to success?",
        "Every session is an opportunity to inspire!"
      ],
      late_morning: [
        "Flexible scheduling shows professional dedication!",
        "Quality coaching happens at any time!",
        "Your adaptability benefits every client!",
        "Late morning sessions = focused attention!"
      ],
      afternoon: [
        "Afternoon coaching sessions build momentum!",
        "Perfect time to energize your clients!",
        "Your afternoon sessions are game-changers!",
        "Let's help clients power through their day!"
      ],
      evening: [
        "Evening coaching helps clients unwind and focus!",
        "Perfect way to end the day with progress!",
        "Your evening sessions create lasting impact!",
        "Let's finish the day with client success!"
      ],
      night: [
        "Night owl coaching shows true dedication!",
        "Late night sessions demonstrate commitment!",
        "Your flexibility serves every client!",
        "Professional dedication never sleeps!"
      ]
    }
  }

  private static readonly MOTIVATIONAL_MESSAGES = {
    client: [
      "Every workout brings you closer to your best self! 💪",
      "Consistency is the key to unlocking your potential! 🔑",
      "Your dedication today shapes your tomorrow! 🌟",
      "Progress, not perfection - you're doing amazing! 📈",
      "Every rep is an investment in your future! 💎",
      "You're not just working out, you're building character! 🏗️",
      "Your commitment inspires others around you! ✨",
      "Champions are made in moments like this! 🏆"
    ],
    coach: [
      "Your expertise transforms lives every day! 💪",
      "Every client session is an opportunity to inspire! 🌟",
      "Your dedication to excellence sets the standard! 🏆",
      "Coaching is not just a job, it's a calling! ✨",
      "Your passion for fitness changes lives! 🔥",
      "Every session builds stronger, healthier people! 💎",
      "Your commitment to clients never goes unnoticed! 📈",
      "Champions are made through coaches like you! 🏗️"
    ]
  }

  /**
   * Generate a time-based greeting for the user
   */
  static generateGreeting(userContext: UserContext): GreetingData {
    const timeContext = this.getTimeContext(userContext.timezone)
    const greetingStyle = userContext.preferences?.greetingStyle || 'casual'
    
    // Get greeting template
    const templates = this.GREETING_TEMPLATES[userContext.role][timeContext.period][greetingStyle]
    const greeting = templates[Math.floor(Math.random() * templates.length)]
      .replace('{name}', userContext.name)

    // Get subtitle
    const subtitles = this.SUBTITLE_TEMPLATES[userContext.role][timeContext.period]
    const subtitle = subtitles[Math.floor(Math.random() * subtitles.length)]

    // Get motivational message
    const motivationalMessages = this.MOTIVATIONAL_MESSAGES[userContext.role]
    const motivationalMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]

    // Get visual styling
    const styling = this.getTimeBasedStyling(timeContext.period)

    // Generate streak info if applicable
    const streakInfo = this.generateStreakInfo(userContext)

    return {
      greeting,
      subtitle,
      icon: styling.icon,
      color: styling.color,
      backgroundColor: styling.backgroundColor,
      borderColor: styling.borderColor,
      motivationalMessage,
      streakInfo,
      timeContext
    }
  }

  /**
   * Get time context based on current time
   */
  private static getTimeContext(timezone?: string): {
    period: 'early_morning' | 'morning' | 'late_morning' | 'afternoon' | 'evening' | 'night'
    hour: number
    isWeekend: boolean
  } {
    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    let period: 'early_morning' | 'morning' | 'late_morning' | 'afternoon' | 'evening' | 'night'
    
    if (hour >= 5 && hour < 7) period = 'early_morning'
    else if (hour >= 7 && hour < 10) period = 'morning'
    else if (hour >= 10 && hour < 12) period = 'late_morning'
    else if (hour >= 12 && hour < 17) period = 'afternoon'
    else if (hour >= 17 && hour < 21) period = 'evening'
    else period = 'night'

    return { period, hour, isWeekend }
  }

  /**
   * Get visual styling based on time period
   */
  private static getTimeBasedStyling(period: string) {
    const styling = {
      early_morning: {
        icon: '🌅',
        color: 'text-orange-600',
        backgroundColor: 'bg-gradient-to-br from-orange-50 to-yellow-50',
        borderColor: 'border-orange-200'
      },
      morning: {
        icon: '☀️',
        color: 'text-yellow-600',
        backgroundColor: 'bg-gradient-to-br from-yellow-50 to-amber-50',
        borderColor: 'border-yellow-200'
      },
      late_morning: {
        icon: '🌤️',
        color: 'text-blue-600',
        backgroundColor: 'bg-gradient-to-br from-blue-50 to-sky-50',
        borderColor: 'border-blue-200'
      },
      afternoon: {
        icon: '☀️',
        color: 'text-orange-600',
        backgroundColor: 'bg-gradient-to-br from-orange-50 to-red-50',
        borderColor: 'border-orange-200'
      },
      evening: {
        icon: '🌙',
        color: 'text-purple-600',
        backgroundColor: 'bg-gradient-to-br from-purple-50 to-indigo-50',
        borderColor: 'border-purple-200'
      },
      night: {
        icon: '🌃',
        color: 'text-indigo-600',
        backgroundColor: 'bg-gradient-to-br from-indigo-50 to-slate-50',
        borderColor: 'border-indigo-200'
      }
    }

    return styling[period as keyof typeof styling]
  }

  /**
   * Generate streak information
   */
  private static generateStreakInfo(userContext: UserContext) {
    if (!userContext.preferences?.showStreak || !userContext.streakDays) return undefined

    const streakDays = userContext.streakDays
    let message: string

    if (streakDays >= 30) {
      message = "Incredible dedication! 🔥"
    } else if (streakDays >= 14) {
      message = "Building amazing habits! 💪"
    } else if (streakDays >= 7) {
      message = "Great consistency! ⚡"
    } else if (streakDays >= 3) {
      message = "Building momentum! 🚀"
    } else {
      message = "Starting strong! 🌟"
    }

    return {
      days: streakDays,
      message
    }
  }

  /**
   * Get contextual greeting based on user activity
   */
  static getContextualGreeting(userContext: UserContext, additionalContext?: {
    lastWorkoutDaysAgo?: number
    upcomingWorkout?: boolean
    goalProgress?: number
    achievements?: string[]
  }): string {
    const timeContext = this.getTimeContext(userContext.timezone)
    
    // Add contextual elements based on user activity
    if (additionalContext?.lastWorkoutDaysAgo === 0) {
      return "Welcome back after yesterday's great session! 🎉"
    }
    
    if (additionalContext?.upcomingWorkout) {
      return "Ready for today's workout? Let's make it count! 💪"
    }
    
    if (additionalContext?.goalProgress && additionalContext.goalProgress > 80) {
      return "You're crushing your goals! Keep the momentum going! 🚀"
    }
    
    if (additionalContext?.achievements && additionalContext.achievements.length > 0) {
      return "Congratulations on your recent achievements! 🏆"
    }

    // Default to time-based greeting
    return this.generateGreeting(userContext).greeting
  }
}
