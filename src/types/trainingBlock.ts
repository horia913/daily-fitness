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
  goal: TrainingBlockGoal
  custom_goal_label?: string | null
  duration_weeks: number
  block_order: number
  progression_profile: ProgressionProfile
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export const TRAINING_BLOCK_GOALS: Record<TrainingBlockGoal, string> = {
  hypertrophy:     'Hypertrophy',
  strength:        'Strength',
  power:           'Power / Explosive',
  peaking:         'Peaking',
  accumulation:    'Accumulation',
  conditioning:    'Conditioning',
  deload:          'Deload',
  general_fitness: 'General Fitness',
  sport_specific:  'Sport-Specific',
  custom:          'Custom',
}

export const PROGRESSION_PROFILES: Record<ProgressionProfile, string> = {
  volume_ramp:      'Volume Ramp',
  intensity_ramp:   'Intensity Ramp',
  taper:            'Taper',
  density_increase: 'Density Increase',
  reduction:        'Reduction',
  linear:           'Linear',
  none:             'None (Manual)',
}
