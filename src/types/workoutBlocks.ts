/**
 * @deprecated This barrel is a backward-compatibility shim while all
 * imports are migrated to '@/types/workoutSetEntries'.
 * It will be deleted once every consumer is updated.
 */
export type {
  SetType,
  SetType as WorkoutBlockType,
  WorkoutSetEntry,
  WorkoutSetEntry as WorkoutBlock,
  WorkoutSetEntryExercise,
  WorkoutSetEntryExercise as WorkoutBlockExercise,
  Exercise,
  WorkoutDropSet,
  WorkoutClusterSet,
  WorkoutRestPauseSet,
  WorkoutTimeProtocol,
  WorkoutHRSet,
  WorkoutSpeedSet,
  WorkoutEnduranceSet,
  SetTypeConfig,
  SetTypeConfig as WorkoutBlockConfig,
  LiveWorkoutSetEntry,
  LiveWorkoutSetEntry as LiveWorkoutBlock,
  LiveWorkoutExercise,
  LoggedSet,
} from './workoutSetEntries'

export {
  WORKOUT_SET_TYPE_CONFIGS,
  WORKOUT_SET_TYPE_CONFIGS as WORKOUT_BLOCK_CONFIGS,
} from './workoutSetEntries'
