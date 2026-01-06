'use client'

import { notificationService } from './notifications'
import { oneSignalService } from './onesignal'

/**
 * Notification triggers for various app events
 * These functions should be called when specific events occur
 */

export class NotificationTriggers {
  /**
   * Trigger workout reminder notification
   * Call this when a workout is scheduled or reminder time is reached
   */
  static async triggerWorkoutReminder(workoutName: string, scheduledTime: string) {
    try {
      await notificationService.sendWorkoutReminder(workoutName, scheduledTime)
      console.log('Workout reminder notification sent')
    } catch (error) {
      console.error('Error sending workout reminder notification:', error)
    }
  }

  /**
   * Trigger achievement notification
   * Call this when a user unlocks an achievement
   */
  static async triggerAchievementUnlocked(achievementName: string, description: string) {
    try {
      await notificationService.sendAchievementNotification(achievementName, description)
      console.log('Achievement notification sent')
    } catch (error) {
      console.error('Error sending achievement notification:', error)
    }
  }

  /**
   * Trigger workout completion notification
   * Call this when a workout is completed
   */
  static async triggerWorkoutCompleted(workoutName: string, duration: number) {
    try {
      await notificationService.sendWorkoutCompleteNotification(workoutName, duration)
      console.log('Workout completion notification sent')
    } catch (error) {
      console.error('Error sending workout completion notification:', error)
    }
  }

  /**
   * Trigger message notification (deprecated - use WhatsApp for messaging)
   * This function is disabled as messaging has moved to WhatsApp
   */
  static async triggerNewMessage(senderName: string, message: string) {
    console.log('Message notifications disabled - use WhatsApp for coach-client communication')
    // Function disabled - messaging moved to WhatsApp
    return
  }

  /**
   * Trigger goal reminder notification
   * Call this when goal progress is updated or reminder is due
   */
  static async triggerGoalReminder(goalName: string, progress: string) {
    try {
      await notificationService.sendGoalReminder(goalName, progress)
      console.log('Goal reminder notification sent')
    } catch (error) {
      console.error('Error sending goal reminder notification:', error)
    }
  }

  /**
   * Schedule workout reminders
   * Call this when workouts are assigned or scheduled
   */
  static scheduleWorkoutReminders(workouts: Array<{
    name: string
    scheduledTime: string
    reminderMinutes: number
  }>) {
    workouts.forEach(workout => {
      const reminderTime = new Date(workout.scheduledTime)
      reminderTime.setMinutes(reminderTime.getMinutes() - workout.reminderMinutes)
      
      const now = new Date()
      const delay = reminderTime.getTime() - now.getTime()
      
      if (delay > 0) {
        setTimeout(() => {
          this.triggerWorkoutReminder(workout.name, workout.scheduledTime)
        }, delay)
      }
    })
  }

  /**
   * Check for achievement unlocks
   * Call this after workout completion or goal updates
   */
  static async checkAchievements(userId: string, context: {
    workoutCompleted?: boolean
    streakDays?: number
    totalWorkouts?: number
    goalsCompleted?: number
  }) {
    // This would integrate with your achievement system
    // For now, we'll simulate some achievements
    
    if (context.workoutCompleted && context.totalWorkouts === 1) {
      await this.triggerAchievementUnlocked(
        'First Workout',
        'Congratulations on completing your first workout!'
      )
    }
    
    if (context.streakDays === 7) {
      await this.triggerAchievementUnlocked(
        'Week Warrior',
        'You\'ve worked out for 7 days in a row!'
      )
    }
    
    if (context.goalsCompleted && context.goalsCompleted >= 5) {
      await this.triggerAchievementUnlocked(
        'Goal Crusher',
        'You\'ve completed 5 goals! Keep it up!'
      )
    }
  }

  /**
   * Send daily motivation notification
   * Call this at a scheduled time each day
   */
  static async sendDailyMotivation() {
    const motivations = [
      'Every workout counts! 💪',
      'You\'re stronger than yesterday! 🔥',
      'Consistency is key to success! ⭐',
      'Your future self will thank you! 🙌',
      'Small steps lead to big changes! 🚀'
    ]
    
    const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)]
    
    try {
      await notificationService.sendNotification({
        type: 'message',
        title: '💪 Daily Motivation',
        body: randomMotivation,
        userId: 'current-user-id'
      })
    } catch (error) {
      console.error('Error sending daily motivation:', error)
    }
  }

  /**
   * Send weekly progress summary
   * Call this at the end of each week
   */
  static async sendWeeklyProgressSummary(stats: {
    workoutsCompleted: number
    totalMinutes: number
    goalsAchieved: number
  }) {
    try {
      await notificationService.sendNotification({
        type: 'message',
        title: '📊 Weekly Summary',
        body: `This week: ${stats.workoutsCompleted} workouts, ${stats.totalMinutes} minutes, ${stats.goalsAchieved} goals achieved!`,
        userId: 'current-user-id'
      })
    } catch (error) {
      console.error('Error sending weekly progress summary:', error)
    }
  }
}

// Export for easy use
export default NotificationTriggers
