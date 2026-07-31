export type TrainingBlockGoal =
  | 'hypertrophy'
  | 'strength'
  | 'power'
  | 'peaking'
  | 'accumulation'
  | 'conditioning'
  | 'deload'
  | 'general_fitness'
  | 'sport_specific'
  | 'custom'

export type ProgressionProfile =
  | 'volume_ramp'
  | 'intensity_ramp'
  | 'taper'
  | 'density_increase'
  | 'reduction'
  | 'linear'
  | 'none'

export interface TrainingBlock {
  id: string
  program_id: string
  name: string
  duration_weeks: number
  block_order: number
  /** Coach-editable phase type (`training_blocks.phase_label` / instance copy). */
  phase_label?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}
