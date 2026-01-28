export const isLiveWorkoutRoute = (pathname?: string | null) => {
  if (!pathname) return false
  return pathname.startsWith('/client/workouts')
}
