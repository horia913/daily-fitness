/** Program builder type (FLIP 3 — `workout_programs.type`). */
export type ProgramType = 'fixed' | 'recurring'

export interface StationProgram {
  id: string
  name: string
  description?: string
  coach_id: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'athlete'
  duration_weeks: number
  target_audience: string
  category?: string | null
  is_active: boolean
  type: ProgramType
  /** Display-only periodization preset (`workout_programs.periodization_style`). */
  periodization_style?: string | null
  created_at: string
  updated_at: string
}
