// Server-side notification sending
// This should be called from API routes to keep REST API key secure

interface NotificationPayload {
  userIds?: string[]
  segments?: string[]
  title: string
  message: string
  url?: string
  data?: object
}

interface EmailPayload {
  userIds: string[]
  subject: string
  htmlContent: string
  templateId?: string
}

// Notification data interface for frontend components
export interface NotificationData {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  type: 'workout' | 'session' | 'achievement' | 'reminder' | 'general'
}

export async function sendPushNotification({
  userIds,
  segments,
  title,
  message,
  url,
  data
}: NotificationPayload) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY

  if (!appId || !apiKey) {
    console.error('OneSignal credentials not configured')
    return { success: false, error: 'Configuration missing' }
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        include_external_user_ids: userIds,
        included_segments: segments,
        headings: { en: title },
        contents: { en: message },
        url: url,
        data: data,
        web_url: url
      })
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Push notification sent:', result)
      return { success: true, data: result }
    } else {
      console.error('❌ Failed to send push notification:', result)
      return { success: false, error: result }
    }
  } catch (error) {
    console.error('❌ Push notification error:', error)
    return { success: false, error }
  }
}

export async function sendEmail({
  userIds,
  subject,
  htmlContent,
  templateId
}: EmailPayload) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY

  if (!appId || !apiKey) {
    console.error('OneSignal credentials not configured')
    return { success: false, error: 'Configuration missing' }
    }

    try {
    const payload: any = {
      app_id: appId,
      include_external_user_ids: userIds,
      email_subject: subject,
      email_body: htmlContent
    }

    if (templateId) {
      payload.template_id = templateId
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Email sent:', result)
      return { success: true, data: result }
      } else {
      console.error('❌ Failed to send email:', result)
      return { success: false, error: result }
      }
    } catch (error) {
    console.error('❌ Email sending error:', error)
    return { success: false, error }
  }
}

// Convenience function: Send both push and email
export async function sendNotification({
  userIds,
  title,
  message,
  url,
  emailSubject,
  emailHtml,
  sendPush = true,
  sendEmail: shouldSendEmail = true
}: {
  userIds: string[]
  title: string
  message: string
  url?: string
  emailSubject?: string
  emailHtml?: string
  sendPush?: boolean
  sendEmail?: boolean
}) {
  const results = {
    push: null as any,
    email: null as any
  }

  if (sendPush) {
    results.push = await sendPushNotification({
      userIds,
      title,
      message,
      url
    })
  }

  if (shouldSendEmail && emailSubject && emailHtml) {
    results.email = await sendEmail({
      userIds,
      subject: emailSubject,
      htmlContent: emailHtml
    })
  }

  return results
}

// Notification service for frontend components
export const notificationService = {
  initialize(): void {
    // Initialize the notification service
    console.log('Notification service initialized')
  },
  
  canSendNotifications(): boolean {
    // Check if notifications are supported and permission is granted
    if (typeof window === 'undefined') return false
    return 'Notification' in window && Notification.permission === 'granted'
  },
  
  async getNotifications(): Promise<NotificationData[]> {
    // This would typically fetch from your database
    // For now, return empty array as we're just setting up OneSignal
    return []
  },
  
  async getUnreadCount(): Promise<number> {
    // This would typically fetch from your database
    // For now, return 0 as we're just setting up OneSignal
    return 0
  },
  
  async requestPermission(): Promise<{ granted: boolean }> {
    if (typeof window === 'undefined') return { granted: false }
    if (!('Notification' in window)) return { granted: false }
    
    const permission = await Notification.requestPermission()
    return { granted: permission === 'granted' }
  },
  
  async sendWorkoutReminder(workoutName: string, scheduledTime: string): Promise<void> {
    // This would send a workout reminder notification
    console.log('Sending workout reminder:', workoutName, scheduledTime)
  },
  
  async sendAchievementNotification(achievementName: string, description: string): Promise<void> {
    // This would send an achievement notification
    console.log('Sending achievement notification:', achievementName, description)
  },
  
  async sendWorkoutCompleteNotification(workoutName: string, duration: number): Promise<void> {
    // This would send a workout complete notification
    console.log('Sending workout complete notification:', workoutName, duration)
  },
  
  async sendMessageNotification(senderName: string, message: string): Promise<void> {
    // This would send a message notification
    console.log('Sending message notification:', senderName, message)
  },
  
  async sendGoalReminder(goalName: string, progress: string): Promise<void> {
    // This would send a goal reminder notification
    console.log('Sending goal reminder:', goalName, progress)
  },
  
  async sendNotification(params: { type: string; title: string; body: string; userId: string }): Promise<void> {
    // This would send a generic notification
    console.log('Sending notification:', params)
  },
  
  async markAsRead(notificationId: string): Promise<void> {
    // This would update your database
    console.log('Marking notification as read:', notificationId)
  },
  
  async markAllAsRead(): Promise<void> {
    // This would update your database
    console.log('Marking all notifications as read')
  },
  
  async clearAllNotifications(): Promise<void> {
    // This would clear all notifications from database
    console.log('Clearing all notifications')
  }
}

// Notification templates
export const NotificationTemplates = {
  workoutAssigned: (workoutName: string, coachName: string) => ({
    title: 'New Workout Assigned! 💪',
    message: `${coachName} assigned "${workoutName}" to you`,
    emailSubject: 'New Workout Assigned',
    emailHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8B5CF6;">New Workout Assigned!</h1>
        <p>Hi there,</p>
        <p>Your coach <strong>${coachName}</strong> has assigned a new workout for you:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h2 style="margin: 0; color: #1f2937;">${workoutName}</h2>
        </div>
        <p>Ready to crush your goals? Start your workout now!</p>
        <a href="{{url}}" style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Workout</a>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">Keep crushing it! 💪<br>- FitCoach Pro Team</p>
      </div>
    `
  }),

  sessionBooked: (clientName: string, sessionDate: string, sessionTime: string) => ({
    title: 'New Session Booked! 📅',
    message: `${clientName} booked a session on ${sessionDate} at ${sessionTime}`,
    emailSubject: 'New Session Booking',
    emailHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10B981;">New Session Booked!</h1>
        <p><strong>${clientName}</strong> has booked a training session with you.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Date:</strong> ${sessionDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${sessionTime}</p>
        </div>
        <a href="{{url}}" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Session Details</a>
      </div>
    `
  }),

  achievementEarned: (achievementName: string) => ({
    title: 'Achievement Unlocked! 🏆',
    message: `You earned: ${achievementName}`,
    emailSubject: 'New Achievement Unlocked!',
    emailHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
        <h1 style="color: #F59E0B; font-size: 32px;">🏆 Achievement Unlocked!</h1>
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; border-radius: 15px; margin: 30px 0;">
          <h2 style="color: white; font-size: 24px; margin: 0;">${achievementName}</h2>
        </div>
        <p style="font-size: 18px; color: #1f2937;">Congratulations on reaching this milestone! Keep up the amazing work!</p>
        <a href="{{url}}" style="display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">View All Achievements</a>
      </div>
    `
  }),

  workoutReminder: (workoutName: string) => ({
    title: 'Workout Reminder 🔔',
    message: `Don't forget your workout: ${workoutName}`,
    emailSubject: 'Workout Reminder',
    emailHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8B5CF6;">Time to Train! 💪</h1>
        <p>Don't forget about your scheduled workout:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h2 style="margin: 0; color: #1f2937;">${workoutName}</h2>
        </div>
        <p>Your body will thank you for showing up today!</p>
        <a href="{{url}}" style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Workout</a>
      </div>
    `
  })
}
