// Helper functions for sending notifications throughout the app
// These call the API route to send notifications securely

interface SendNotificationParams {
  userIds: string[]
  title: string
  message: string
  url?: string
  emailSubject?: string
  emailHtml?: string
  sendPush?: boolean
  sendEmail?: boolean
}

export async function sendNotification(params: SendNotificationParams) {
  try {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to send notification:', error)
    return { success: false, error }
  }
}

// Pre-built notification functions for common scenarios

export async function notifyWorkoutAssigned(
  clientId: string, 
  workoutName: string, 
  coachName: string,
  appUrl: string
) {
  return sendNotification({
    userIds: [clientId],
    title: 'New Workout Assigned! 💪',
    message: `${coachName} assigned "${workoutName}" to you`,
    url: `${appUrl}/client/workouts`,
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
        <a href="${appUrl}/client/workouts" style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Workout</a>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">Keep crushing it! 💪<br>- FitCoach Pro Team</p>
      </div>
    `,
    sendPush: true,
    sendEmail: true
  })
}

export async function notifyWorkoutCompleted(
  coachId: string,
  clientName: string,
  workoutName: string,
  appUrl: string
) {
  return sendNotification({
    userIds: [coachId],
    title: 'Workout Completed! ✅',
    message: `${clientName} completed ${workoutName}`,
    url: `${appUrl}/coach/clients`,
    sendPush: true,
    sendEmail: false // Optional for this one
  })
}

export async function notifyAchievementEarned(
  clientId: string,
  achievementName: string,
  appUrl: string
) {
  return sendNotification({
    userIds: [clientId],
    title: 'Achievement Unlocked! 🏆',
    message: `You earned: ${achievementName}`,
    url: `${appUrl}/client/progress/achievements`,
    emailSubject: 'New Achievement Unlocked!',
    emailHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
        <h1 style="color: #F59E0B; font-size: 32px;">🏆 Achievement Unlocked!</h1>
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; border-radius: 15px; margin: 30px 0;">
          <h2 style="color: white; font-size: 24px; margin: 0;">${achievementName}</h2>
        </div>
        <p style="font-size: 18px; color: #1f2937;">Congratulations on reaching this milestone!</p>
        <a href="${appUrl}/client/progress/achievements" style="display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">View All Achievements</a>
      </div>
    `,
    sendPush: true,
    sendEmail: true
  })
}

export async function notifyGoalReached(
  clientId: string,
  coachId: string,
  goalName: string,
  clientName: string,
  appUrl: string
) {
  // Notify client
  await sendNotification({
    userIds: [clientId],
    title: 'Goal Achieved! 🎯',
    message: `Congratulations! You reached your goal: ${goalName}`,
    url: `${appUrl}/client/goals`,
    sendPush: true,
    sendEmail: true
  })

  // Notify coach
  await sendNotification({
    userIds: [coachId],
    title: 'Client Goal Achieved! 🎯',
    message: `${clientName} reached their goal: ${goalName}`,
    url: `${appUrl}/coach/clients`,
    sendPush: true,
    sendEmail: false
  })
}

