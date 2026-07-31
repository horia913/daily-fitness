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
      
      // Sync goals from goal_source_links after metric is created (non-blocking)
      if (data) {
        try {
          const { syncGoalsForClient } = await import('./goalSyncService')
          await syncGoalsForClient(clientId)
        } catch (syncError) {
          console.error('Failed to sync goals (non-blocking):', syncError)
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

