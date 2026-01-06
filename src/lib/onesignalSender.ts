'use client'

// OneSignal REST API Sender for server-side push notifications
export class OneSignalSender {
  private static readonly API_URL = 'https://onesignal.com/api/v1/notifications'
  private static readonly APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  private static readonly REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY

  /**
   * Send push notification to all users
   */
  static async sendToAll(title: string, body: string, data?: any): Promise<boolean> {
    if (!this.APP_ID) {
      console.error('OneSignal App ID not configured')
      return false
    }

    if (!this.REST_API_KEY) {
      console.warn('OneSignal REST API Key not configured - server-side notifications disabled')
      return false
    }

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.REST_API_KEY}`
        },
        body: JSON.stringify({
          app_id: this.APP_ID,
          included_segments: ['All'],
          headings: { en: title },
          contents: { en: body },
          data: data || {},
          web_buttons: [
            {
              id: 'view',
              text: 'View',
              icon: '/icon-192x192.png',
              url: data?.url || '/client'
            }
          ]
        })
      })

      const result = await response.json()
      console.log('OneSignal notification sent:', result)
      return response.ok
    } catch (error) {
      console.error('Error sending OneSignal notification:', error)
      return false
    }
  }

  /**
   * Send push notification to specific user
   */
  static async sendToUser(userId: string, title: string, body: string, data?: any): Promise<boolean> {
    if (!this.APP_ID) {
      console.error('OneSignal App ID not configured')
      return false
    }

    if (!this.REST_API_KEY) {
      console.warn('OneSignal REST API Key not configured - server-side notifications disabled')
      return false
    }

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.REST_API_KEY}`
        },
        body: JSON.stringify({
          app_id: this.APP_ID,
          include_external_user_ids: [userId],
          headings: { en: title },
          contents: { en: body },
          data: data || {},
          web_buttons: [
            {
              id: 'view',
              text: 'View',
              icon: '/icon-192x192.png',
              url: data?.url || '/client'
            }
          ]
        })
      })

      const result = await response.json()
      console.log('OneSignal notification sent to user:', result)
      return response.ok
    } catch (error) {
      console.error('Error sending OneSignal notification to user:', error)
      return false
    }
  }

  /**
   * Send workout reminder
   */
  static async sendWorkoutReminder(userId: string, workoutName: string, scheduledTime: string): Promise<boolean> {
    return this.sendToUser(userId, '🏋️ Workout Reminder', `Time for your ${workoutName} workout! Scheduled for ${scheduledTime}`, {
      action: 'open_workouts',
      url: '/client/workouts',
      type: 'workout_reminder'
    })
  }

  /**
   * Send achievement notification
   */
  static async sendAchievement(userId: string, achievementName: string, description: string): Promise<boolean> {
    return this.sendToUser(userId, '🎉 Achievement Unlocked!', `${achievementName}: ${description}`, {
      action: 'open_achievements',
      url: '/client/achievements',
      type: 'achievement'
    })
  }

  /**
   * Send workout completion notification
   */
  static async sendWorkoutComplete(userId: string, workoutName: string, duration: number): Promise<boolean> {
    return this.sendToUser(userId, '✅ Workout Complete!', `Great job completing ${workoutName}! Duration: ${duration} minutes`, {
      action: 'open_progress',
      url: '/client/progress',
      type: 'workout_complete'
    })
  }

  /**
   * Send message notification (deprecated - use WhatsApp for messaging)
   * Redirects to client dashboard instead
   */
  static async sendMessage(userId: string, senderName: string, message: string): Promise<boolean> {
    const shortMessage = message.length > 50 ? message.substring(0, 50) + '...' : message
    return this.sendToUser(userId, `💬 Message from ${senderName}`, shortMessage, {
      action: 'open_dashboard',
      url: '/client',
      type: 'message'
    })
  }

  /**
   * Send goal reminder
   */
  static async sendGoalReminder(userId: string, goalName: string, progress: string): Promise<boolean> {
    return this.sendToUser(userId, '🎯 Goal Progress', `${goalName}: ${progress}`, {
      action: 'open_goals',
      url: '/client/goals',
      type: 'goal_reminder'
    })
  }
}
