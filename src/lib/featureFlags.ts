export const isPrefetchDisabled =
  process.env.NEXT_PUBLIC_DISABLE_PREFETCH === 'true'

export const isNotificationsPollDisabled =
  process.env.NEXT_PUBLIC_DISABLE_NOTIFICATIONS_POLL === 'true'

export const useNewWorkoutLoader =
  process.env.NEXT_PUBLIC_USE_NEW_WORKOUT_LOADER === 'true'
