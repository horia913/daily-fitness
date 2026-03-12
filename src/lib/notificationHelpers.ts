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

// Challenge notifications

const appUrl = typeof window !== 'undefined' ? (window as any).__NEXT_PUBLIC_APP_URL ?? '' : (process.env.NEXT_PUBLIC_APP_URL ?? '')

export async function notifyChallengeCreated(
  clientIds: string[],
  challengeName: string,
  startDate: string,
  baseUrl: string = appUrl
) {
  if (!clientIds.length) return
  return sendNotification({
    userIds: clientIds,
    title: 'New challenge',
    message: `New challenge: ${challengeName} starts ${startDate}. Join now.`,
    url: `${baseUrl}/client/challenges`,
    sendPush: true,
    sendEmail: false
  })
}

export async function notifyChallengeInvitation(
  clientId: string,
  challengeName: string,
  baseUrl: string = appUrl
) {
  return sendNotification({
    userIds: [clientId],
    title: 'Challenge invitation',
    message: `Your coach invited you to ${challengeName}. Tap to join.`,
    url: `${baseUrl}/client/challenges`,
    sendPush: true,
    sendEmail: false
  })
}

export async function notifyChallengeStarted(
  clientIds: string[],
  challengeName: string,
  baseUrl: string = appUrl
) {
  if (!clientIds.length) return
  return sendNotification({
    userIds: clientIds,
    title: 'Challenge started',
    message: `${challengeName} has started! Good luck!`,
    url: `${baseUrl}/client/challenges`,
    sendPush: true,
    sendEmail: false
  })
}

export async function notifyVideoApproved(
  clientId: string,
  categoryName: string,
  score: string,
  baseUrl: string = appUrl
) {
  return sendNotification({
    userIds: [clientId],
    title: 'Submission approved',
    message: `Your ${categoryName} submission was approved! Score: ${score}`,
    url: `${baseUrl}/client/challenges`,
    sendPush: true,
    sendEmail: false
  })
}

export async function notifyVideoRejected(
  clientId: string,
  categoryName: string,
  baseUrl: string = appUrl
) {
  return sendNotification({
    userIds: [clientId],
    title: 'Submission needs revision',
    message: `Your ${categoryName} submission needs revision. Check coach feedback.`,
    url: `${baseUrl}/client/challenges`,
    sendPush: true,
    sendEmail: false
  })
}

export async function notifyChallengeEnded(
  clientId: string,
  challengeName: string,
  rank: number,
  baseUrl: string = appUrl
) {
  return sendNotification({
    userIds: [clientId],
    title: 'Challenge ended',
    message: `${challengeName} has ended! You finished #${rank}.`,
    url: `${baseUrl}/client/challenges`,
    sendPush: true,
    sendEmail: false
  })
}

export async function notifyChallengeWon(
  clientId: string,
  challengeName: string,
  baseUrl: string = appUrl
) {
  return sendNotification({
    userIds: [clientId],
    title: 'You won! 🏆',
    message: `Congratulations! You won ${challengeName}!`,
    url: `${baseUrl}/client/challenges`,
    sendPush: true,
    sendEmail: false
  })
}

