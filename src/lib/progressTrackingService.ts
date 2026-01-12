import { supabase } from './supabase'

// ============================================
// BODY METRICS
// ============================================

export interface BodyMetrics {
  id: string
  client_id: string
  coach_id?: string
  weight_kg?: number
  body_fat_percentage?: number
  muscle_mass_kg?: number
  visceral_fat_level?: number
  left_arm_circumference?: number
  right_arm_circumference?: number
  torso_circumference?: number
  waist_circumference?: number
  hips_circumference?: number
  left_thigh_circumference?: number
  right_thigh_circumference?: number
  left_calf_circumference?: number
  right_calf_circumference?: number
  measured_date: string
  measurement_method?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export class BodyMetricsService {
  // Get all body metrics for a client
  static async getClientMetrics(clientId: string): Promise<BodyMetrics[]> {
    try {
      const { data, error } = await supabase
        .from('body_metrics')
        .select('*')
        .eq('client_id', clientId)
        .order('measured_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching body metrics:', error)
      return []
    }
  }

  // Create new body metrics entry
  static async createBodyMetrics(
    clientId: string,
    metrics: Partial<BodyMetrics>,
    coachId?: string
  ): Promise<BodyMetrics | null> {
    try {
      const { data, error } = await supabase
        .from('body_metrics')
        .insert({
          client_id: clientId,
          coach_id: coachId,
          ...metrics,
        })
        .select()
        .single()

      if (error) throw error
      
      // Sync body composition goals after metric is created (non-blocking)
      if (data) {
        try {
          const { syncBodyCompositionGoal } = await import('./goalSyncService')
          
          // Find all body composition goals for this client
          const { data: bodyGoals } = await supabase
            .from('goals')
            .select('id, title')
            .eq('client_id', clientId)
            .eq('status', 'active')
            .or('title.ilike.%Fat Loss%,title.ilike.%Weight Loss%,title.ilike.%Muscle Gain%,title.ilike.%Body Recomp%,title.ilike.%Recomposition%')

          // Sync each goal with appropriate type
          if (bodyGoals && bodyGoals.length > 0) {
            for (const goal of bodyGoals) {
              const titleLower = goal.title.toLowerCase()
              let goalType: 'fat-loss' | 'weight-loss' | 'muscle-gain' | 'body-recomp' | null = null
              
              if (titleLower.includes('fat loss') || titleLower.includes('lose fat')) {
                goalType = 'fat-loss'
              } else if (titleLower.includes('weight loss') || titleLower.includes('lose weight')) {
                goalType = 'weight-loss'
              } else if (titleLower.includes('muscle gain') || titleLower.includes('gain muscle')) {
                goalType = 'muscle-gain'
              } else if (titleLower.includes('body recomp') || titleLower.includes('recomposition')) {
                goalType = 'body-recomp'
              }

              if (goalType) {
                await syncBodyCompositionGoal(goal.id, clientId, goalType)
              }
            }
          }
        } catch (syncError) {
          console.error('Failed to sync body composition goals (non-blocking):', syncError)
          // Don't fail the request, just log error
        }
      }
      
      return data
    } catch (error) {
      console.error('Error creating body metrics:', error)
      return null
    }
  }

  // Update body metrics
  static async updateBodyMetrics(
    id: string,
    updates: Partial<BodyMetrics>
  ): Promise<BodyMetrics | null> {
    try {
      const { data, error } = await supabase
        .from('body_metrics')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating body metrics:', error)
      return null
    }
  }

  // Delete body metrics entry
  static async deleteBodyMetrics(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('body_metrics')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting body metrics:', error)
      return false
    }
  }
}

// ============================================
// GOALS
// ============================================

export interface Goal {
  id: string
  client_id: string
  coach_id?: string
  goal_type: string
  title: string
  description?: string
  target_value?: number
  current_value?: number
  target_date?: string
  metric_type?: string
  metric_unit?: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  progress_percentage?: number
  created_at?: string
  updated_at?: string
}

export class GoalsService {
  // Get all goals for a client
  static async getClientGoals(clientId: string): Promise<Goal[]> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching goals:', error)
      return []
    }
  }

  // Create new goal
  static async createGoal(
    clientId: string,
    goal: Partial<Goal>,
    coachId?: string
  ): Promise<Goal | null> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          client_id: clientId,
          coach_id: coachId,
          status: 'active',
          ...goal,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating goal:', error)
      return null
    }
  }

  // Update goal
  static async updateGoal(
    id: string,
    updates: Partial<Goal>
  ): Promise<Goal | null> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating goal:', error)
      return null
    }
  }

  // Mark goal as completed
  static async completeGoal(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ status: 'completed' })
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error completing goal:', error)
      return false
    }
  }

  // Delete goal
  static async deleteGoal(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting goal:', error)
      return false
    }
  }
}

// ============================================
// ACHIEVEMENTS
// ============================================

export interface Achievement {
  id: string
  client_id: string
  title: string
  description?: string
  achievement_type: string
  metric_type?: string
  metric_value?: number
  metric_unit?: string
  achieved_date: string
  is_public: boolean
  goal_id?: string
  workout_id?: string
  created_at?: string
}

export class AchievementsService {
  // Get all achievements for a client
  static async getClientAchievements(clientId: string): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('client_id', clientId)
        .order('achieved_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching achievements:', error)
      return []
    }
  }

  // Create new achievement
  static async createAchievement(
    clientId: string,
    achievement: Partial<Achievement>
  ): Promise<Achievement | null> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .insert({
          client_id: clientId,
          achieved_date: new Date().toISOString().split('T')[0],
          is_public: true,
          ...achievement,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating achievement:', error)
      return null
    }
  }
}

// ============================================
// PERSONAL RECORDS
// ============================================

export interface PersonalRecord {
  id: string
  client_id: string
  exercise_id: string
  record_type: 'max_weight' | 'max_reps' | 'max_volume' | 'best_time'
  value: number
  unit: string
  reps?: number
  weight_kg?: number
  achieved_date: string
  workout_log_id?: string
  notes?: string
  created_at?: string
}

export class PersonalRecordsService {
  // Get all personal records for a client
  static async getClientPersonalRecords(clientId: string): Promise<PersonalRecord[]> {
    try {
      const { data, error } = await supabase
        .from('personal_records')
        .select(`
          *,
          exercise:exercises(id, name, category)
        `)
        .eq('client_id', clientId)
        .order('achieved_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching personal records:', error)
      return []
    }
  }

  // Get personal records for a specific exercise
  static async getExercisePersonalRecords(
    clientId: string,
    exerciseId: string
  ): Promise<PersonalRecord[]> {
    try {
      const { data, error } = await supabase
        .from('personal_records')
        .select('*')
        .eq('client_id', clientId)
        .eq('exercise_id', exerciseId)
        .order('achieved_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching exercise personal records:', error)
      return []
    }
  }

  // Create or update personal record
  static async upsertPersonalRecord(
    clientId: string,
    record: Partial<PersonalRecord>
  ): Promise<PersonalRecord | null> {
    try {
      // Check if a better record exists
      const existing = await this.getExercisePersonalRecords(
        clientId,
        record.exercise_id!
      )

      const sameType = existing.find(
        r => r.record_type === record.record_type
      )

      // Only create if this is a new record
      if (sameType && record.value && sameType.value >= record.value) {
        return null // Not a new record
      }

      // Delete old record of same type if this is better
      if (sameType) {
        await supabase
          .from('personal_records')
          .delete()
          .eq('id', sameType.id)
      }

      const { data, error } = await supabase
        .from('personal_records')
        .insert({
          client_id: clientId,
          achieved_date: new Date().toISOString().split('T')[0],
          ...record,
        })
        .select()
        .single()

      if (error) throw error

      // Check and unlock achievements (non-blocking)
      try {
        const { AchievementService } = await import('./achievementService')
        await AchievementService.checkAndUnlockAchievements(clientId, 'pr_count')
      } catch (achievementError) {
        console.error('Failed to check/unlock achievements (non-blocking):', achievementError)
        // Don't fail the request, just log error
      }

      return data
    } catch (error) {
      console.error('Error upserting personal record:', error)
      return null
    }
  }
}

// ============================================
// MOBILITY METRICS
// ============================================

export interface MobilityMetric {
  id: string
  client_id: string
  coach_id?: string
  assessment_type: 'shoulder' | 'hip' | 'ankle' | 'spine' | 'overall'
  assessed_date: string
  
  // Shoulder mobility fields
  left_shoulder_ir?: number      // Internal rotation (degrees)
  left_shoulder_er?: number      // External rotation (degrees)
  left_shoulder_abduction?: number
  left_shoulder_flexion?: number
  right_shoulder_ir?: number     // Internal rotation (degrees)
  right_shoulder_er?: number     // External rotation (degrees)
  right_shoulder_abduction?: number
  right_shoulder_flexion?: number
  
  // Hip mobility fields
  left_hip_ir?: number           // Internal rotation (degrees)
  left_hip_er?: number           // External rotation (degrees)
  left_hip_straight_leg_raise?: number
  left_hip_knee_to_chest?: number
  right_hip_ir?: number          // Internal rotation (degrees)
  right_hip_er?: number          // External rotation (degrees)
  right_hip_straight_leg_raise?: number
  right_hip_knee_to_chest?: number
  
  // Ankle mobility fields
  left_ankle_plantar_flexion?: number
  right_ankle_plantar_flexion?: number
  
  // Spine mobility fields
  forward_lean?: number
  
  // Overall assessment fields
  toe_touch?: number
  squat_depth?: number
  
  // Photos and notes
  photos?: string[]               // Array of photo URLs
  notes?: string
  created_at?: string
  updated_at?: string
}

export class MobilityMetricsService {
  // Get all mobility metrics for a client
  static async getClientMobilityMetrics(clientId: string): Promise<MobilityMetric[]> {
    try {
      const { data, error } = await supabase
        .from('mobility_metrics')
        .select('*')
        .eq('client_id', clientId)
        .order('assessed_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching mobility metrics:', error)
      return []
    }
  }

  // Create new mobility assessment
  static async createMobilityMetric(
    clientId: string,
    metric: Partial<MobilityMetric>,
    coachId?: string
  ): Promise<MobilityMetric | null> {
    try {
      const { data, error } = await supabase
        .from('mobility_metrics')
        .insert({
          client_id: clientId,
          coach_id: coachId,
          assessed_date: new Date().toISOString().split('T')[0],
          ...metric,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating mobility metric:', error)
      return null
    }
  }

  // Update mobility metric
  static async updateMobilityMetric(
    id: string,
    updates: Partial<MobilityMetric>
  ): Promise<MobilityMetric | null> {
    try {
      const { data, error } = await supabase
        .from('mobility_metrics')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating mobility metric:', error)
      return null
    }
  }

  // Delete mobility metric
  static async deleteMobilityMetric(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mobility_metrics')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting mobility metric:', error)
      return false
    }
  }
}

// ============================================
// FMS ASSESSMENTS
// ============================================

export interface FMSAssessment {
  id: string
  client_id: string
  coach_id?: string
  assessed_date: string
  photos?: string[]
  deep_squat_score?: number // 0-3
  hurdle_step_left_score?: number
  hurdle_step_right_score?: number
  inline_lunge_left_score?: number
  inline_lunge_right_score?: number
  shoulder_mobility_left_score?: number
  shoulder_mobility_right_score?: number
  active_straight_leg_raise_left_score?: number
  active_straight_leg_raise_right_score?: number
  trunk_stability_pushup_score?: number
  rotary_stability_left_score?: number
  rotary_stability_right_score?: number
  total_score?: number
  notes?: string
  created_at?: string
  updated_at?: string
}

export class FMSAssessmentService {
  // Get all FMS assessments for a client
  static async getClientFMSAssessments(clientId: string): Promise<FMSAssessment[]> {
    try {
      const { data, error } = await supabase
        .from('fms_assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('assessed_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching FMS assessments:', error)
      return []
    }
  }

  // Create new FMS assessment
  static async createFMSAssessment(
    clientId: string,
    assessment: Partial<FMSAssessment>,
    coachId?: string
  ): Promise<FMSAssessment | null> {
    try {
      // Calculate total score
      const scores = [
        assessment.deep_squat_score,
        assessment.hurdle_step_left_score,
        assessment.hurdle_step_right_score,
        assessment.inline_lunge_left_score,
        assessment.inline_lunge_right_score,
        assessment.shoulder_mobility_left_score,
        assessment.shoulder_mobility_right_score,
        assessment.active_straight_leg_raise_left_score,
        assessment.active_straight_leg_raise_right_score,
        assessment.trunk_stability_pushup_score,
        assessment.rotary_stability_left_score,
        assessment.rotary_stability_right_score,
      ].filter((score): score is number => score !== undefined && score !== null)

      const totalScore = scores.reduce((sum, score) => sum + (score || 0), 0)

      const insertData: any = {
        client_id: clientId,
        coach_id: coachId,
        assessed_date: assessment.assessed_date || new Date().toISOString().split('T')[0],
        total_score: totalScore,
        ...assessment,
      }
      
      // Only include photos if provided
      if (assessment.photos !== undefined) {
        insertData.photos = assessment.photos
      }

      const { data, error } = await supabase
        .from('fms_assessments')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating FMS assessment:', error)
      return null
    }
  }

  // Update FMS assessment
  static async updateFMSAssessment(
    id: string,
    updates: Partial<FMSAssessment>
  ): Promise<FMSAssessment | null> {
    try {
      // Recalculate total score if any scores changed
      const scores = [
        updates.deep_squat_score,
        updates.hurdle_step_left_score,
        updates.hurdle_step_right_score,
        updates.inline_lunge_left_score,
        updates.inline_lunge_right_score,
        updates.shoulder_mobility_left_score,
        updates.shoulder_mobility_right_score,
        updates.active_straight_leg_raise_left_score,
        updates.active_straight_leg_raise_right_score,
        updates.trunk_stability_pushup_score,
        updates.rotary_stability_left_score,
        updates.rotary_stability_right_score,
      ].filter((score): score is number => score !== undefined && score !== null)

      if (scores.length > 0) {
        const totalScore = scores.reduce((sum, score) => sum + (score || 0), 0)
        updates.total_score = totalScore
      }

      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      }
      
      // Only include photos if provided
      if (updates.photos !== undefined) {
        updateData.photos = updates.photos
      }

      const { data, error } = await supabase
        .from('fms_assessments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating FMS assessment:', error)
      return null
    }
  }

  // Delete FMS assessment
  static async deleteFMSAssessment(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fms_assessments')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting FMS assessment:', error)
      return false
    }
  }
}

