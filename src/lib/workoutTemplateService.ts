'use client'

import { supabase } from './supabase'

// Enhanced interfaces for the new architecture
export interface WorkoutTemplate {
  id: string
  name: string
  description?: string
  coach_id: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  estimated_duration: number
  category?: string
  is_active: boolean
  created_at: string
  updated_at: string
  exercises?: TemplateExercise[]
  usage_count?: number
  rating?: number
}

export interface TemplateExercise {
  id: string
  template_id: string
  exercise_id: string
  order_index: number
  notes?: string
  created_at: string
  updated_at: string
  exercise?: Exercise
}

export interface Exercise {
  id: string
  name: string
  description?: string
  instructions?: string
  tips?: string
  category?: string
  created_at: string
  updated_at: string
  alternatives?: ExerciseAlternative[]
}

export interface ExerciseCategory {
  id: string
  name: string
  description?: string
  icon?: string
  color: string
  created_at: string
}

export interface ExerciseAlternative {
  id: string
  primary_exercise_id: string
  alternative_exercise_id: string
  reason: 'equipment' | 'difficulty' | 'injury' | 'preference'
  notes?: string
  created_at: string
  alternative_exercise?: Exercise
}

export interface Program {
  id: string
  name: string
  description?: string
  coach_id: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  duration_weeks: number
  target_audience: string
  is_public: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  schedule?: ProgramSchedule[]
  progression_rules?: ProgressionRule[]
}

export interface ProgramSchedule {
  id: string
  program_id: string
  program_day: number // 1-6 (Day 1, Day 2, ..., Day 6)
  week_number: number // Week number in the program
  template_id: string
  is_optional: boolean
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
  template?: WorkoutTemplate
}

export interface ProgressionRule {
  id: string
  program_id: string
  exercise_id: string
  week_number: number
  sets: number
  reps: string
  weight_guidance?: string
  rest_seconds: number
  rpe_target?: number
  notes?: string
  created_at: string
  updated_at: string
  exercise?: Exercise
}

export interface DailyWorkout {
  hasWorkout: boolean
  templateId?: string
  templateName?: string
  templateDescription?: string
  weekNumber?: number
  programDay?: number // Day 1-6 instead of dayOfWeek
  estimatedDuration?: number
  difficultyLevel?: string
  exercises?: DailyWorkoutExercise[]
  generatedAt?: string
  message?: string
  weekCompleted?: boolean
  currentWeek?: number
}

// New interfaces for flexible program system
export interface ProgramAssignmentProgress {
  id: string
  assignment_id: string
  client_id: string
  program_id: string
  current_week: number
  current_day: number // Day 1-6
  days_completed_this_week: number
  cycle_start_date: string
  last_workout_date?: string
  total_weeks_completed: number
  is_program_completed: boolean
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface CompletedProgram {
  id: string
  client_id: string
  program_id: string
  assignment_id: string
  program_name: string
  program_description?: string
  total_weeks: number
  difficulty_level: string
  coach_name: string
  started_date: string
  completed_date: string
  total_workouts_completed: number
  completion_percentage: number
  created_at: string
  updated_at: string
}

export interface WorkoutCompletion {
  id: string
  assignment_progress_id: string
  client_id: string
  program_id: string
  week_number: number
  program_day: number
  template_id: string
  workout_date: string
  completed_at: string
  duration_minutes?: number
  notes?: string
  created_at: string
}

export interface DailyWorkoutExercise {
  id: string
  exerciseId: string
  name: string
  description?: string
  instructions?: string
  orderIndex: number
  notes?: string
  sets: number
  reps: string
  weightGuidance?: string
  restSeconds: number
  rpeTarget?: number
  progressionNotes?: string
}

export class WorkoutTemplateService {
  
  // ===== WORKOUT TEMPLATE MANAGEMENT =====
  
  static async getWorkoutTemplates(coachId: string): Promise<WorkoutTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          *,
          exercises:workout_template_exercises(
            *,
            exercise:exercises(*)
          )
        `)
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching workout templates:', error)
      return []
    }
  }

  static async createWorkoutTemplate(template: Omit<WorkoutTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<WorkoutTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .insert(template)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating workout template:', error)
      return null
    }
  }

  static async updateWorkoutTemplate(id: string, updates: Partial<WorkoutTemplate>): Promise<WorkoutTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating workout template:', error)
      return null
    }
  }

  static async deleteWorkoutTemplate(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('workout_templates')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting workout template:', error)
      return false
    }
  }

  static async duplicateWorkoutTemplate(id: string, newName: string): Promise<WorkoutTemplate | null> {
    try {
      // First get the original template with exercises
      const { data: originalTemplate, error: fetchError } = await supabase
        .from('workout_templates')
        .select(`
          *,
          exercises:workout_template_exercises(*)
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Create new template
      const { data: newTemplate, error: createError } = await supabase
        .from('workout_templates')
        .insert({
          name: newName,
          description: originalTemplate.description,
          coach_id: originalTemplate.coach_id,
          difficulty_level: originalTemplate.difficulty_level,
          estimated_duration: originalTemplate.estimated_duration,
          category: originalTemplate.category,
          is_active: true
        })
        .select()
        .single()

      if (createError) throw createError

      // Copy exercises
      if (originalTemplate.exercises && originalTemplate.exercises.length > 0) {
        const exercisesToInsert = originalTemplate.exercises.map((exercise: TemplateExercise) => ({
          template_id: newTemplate.id,
          exercise_id: exercise.exercise_id,
          order_index: exercise.order_index,
          notes: exercise.notes
        }))

        const { error: exercisesError } = await supabase
          .from('workout_template_exercises')
          .insert(exercisesToInsert)

        if (exercisesError) throw exercisesError
      }

      return newTemplate
    } catch (error) {
      console.error('Error duplicating workout template:', error)
      return null
    }
  }

  // ===== TEMPLATE EXERCISE MANAGEMENT =====
  
  static async addExerciseToTemplate(templateId: string, exerciseId: string, orderIndex: number, notes?: string): Promise<TemplateExercise | null> {
    try {
      const { data, error } = await supabase
        .from('workout_template_exercises')
        .insert({
          template_id: templateId,
          exercise_id: exerciseId,
          order_index: orderIndex,
          notes
        })
        .select(`
          *,
          exercise:exercises(
            *,
            category:exercise_categories(*)
          )
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding exercise to template:', error)
      return null
    }
  }

  static async updateTemplateExercise(id: string, updates: Partial<TemplateExercise>): Promise<TemplateExercise | null> {
    try {
      const { data, error } = await supabase
        .from('workout_template_exercises')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          exercise:exercises(
            *,
            category:exercise_categories(*)
          )
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating template exercise:', error)
      return null
    }
  }

  static async removeExerciseFromTemplate(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('workout_template_exercises')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error removing exercise from template:', error)
      return false
    }
  }

  static async reorderTemplateExercises(templateId: string, exercises: { id: string; orderIndex: number }[]): Promise<boolean> {
    try {
      const updates = exercises.map(exercise => 
        supabase
          .from('workout_template_exercises')
          .update({ order_index: exercise.orderIndex })
          .eq('id', exercise.id)
      )

      await Promise.all(updates)
      return true
    } catch (error) {
      console.error('Error reordering template exercises:', error)
      return false
    }
  }

  // ===== PROGRAM MANAGEMENT =====
  
  static async getPrograms(coachId: string): Promise<Program[]> {
    try {
      const { data, error } = await supabase
        .from('workout_programs')
        .select(`
          *,
          schedule:program_schedule(
            *,
            template:workout_templates(*)
          )
        `)
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching programs:', error)
      return []
    }
  }

  static async createProgram(programData: Omit<Program, 'id' | 'created_at' | 'updated_at'>): Promise<Program | null> {
    try {
      const { data, error } = await supabase
        .from('workout_programs')
        .insert({
          ...programData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating program:', error)
      return null
    }
  }

  static async updateProgram(programId: string, programData: Partial<Program>): Promise<Program | null> {
    try {
      const { data, error } = await supabase
        .from('workout_programs')
        .update({
          ...programData,
          updated_at: new Date().toISOString()
        })
        .eq('id', programId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating program:', error)
      return null
    }
  }

  static async deleteProgram(programId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('workout_programs')
        .update({ is_active: false })
        .eq('id', programId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting program:', error)
      return false
    }
  }

  // ===== PROGRAM SCHEDULE MANAGEMENT =====
  
  static async getProgramSchedule(programId: string): Promise<ProgramSchedule[]> {
    try {
      const { data, error } = await supabase
        .from('program_schedule')
        .select(`
          *,
          template:workout_templates(*)
        `)
        .eq('program_id', programId)
        .order('week_number')
        .order('day_of_week')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching program schedule:', error)
      return []
    }
  }

  static async setProgramSchedule(programId: string, programDay: number, weekNumber: number, templateId: string, isOptional: boolean = false, notes?: string): Promise<ProgramSchedule | null> {
    try {
      const { data, error } = await supabase
        .from('program_schedule')
        .upsert({
          program_id: programId,
          // store as 0-based in DB
          day_of_week: (programDay ?? 1) - 1,
          week_number: weekNumber,
          template_id: templateId,
          is_optional: isOptional,
          notes
        })
        .select(`
          *,
          template:workout_templates(*)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error setting program schedule:', error)
      return null
    }
  }

  static async removeProgramSchedule(programId: string, programDay: number, weekNumber: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('program_schedule')
        .delete()
        .eq('program_id', programId)
        .eq('day_of_week', (programDay ?? 1) - 1)
        .eq('week_number', weekNumber)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error removing program schedule:', error)
      return false
    }
  }

  // ===== TEMPLATE EXERCISES =====
  static async getWorkoutTemplateExercises(templateId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('workout_template_exercises')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching workout template exercises:', error)
      return []
    }
  }

  // ===== PROGRESSION RULES MANAGEMENT =====
  
  static async getProgressionRules(programId: string, exerciseId?: string): Promise<ProgressionRule[]> {
    try {
      let query = supabase
        .from('program_progression_rules')
        .select(`
          *,
          exercise:exercises(
            *,
            category:exercise_categories(*)
          )
        `)
        .eq('program_id', programId)

      if (exerciseId) {
        query = query.eq('exercise_id', exerciseId)
      }

      const { data, error } = await query
        .order('week_number')
        .order('exercise_id')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching progression rules:', error)
      return []
    }
  }

  static async setProgressionRule(rule: Omit<ProgressionRule, 'id' | 'created_at' | 'updated_at'>): Promise<ProgressionRule | null> {
    try {
      const { data, error } = await supabase
        .from('program_progression_rules')
        .upsert(rule)
        .select(`
          *,
          exercise:exercises(
            *,
            category:exercise_categories(*)
          )
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error setting progression rule:', error)
      return null
    }
  }

  static async deleteProgressionRule(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('program_progression_rules')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting progression rule:', error)
      return false
    }
  }

  static async bulkSetProgressionRules(rules: Omit<ProgressionRule, 'id' | 'created_at' | 'updated_at'>[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('program_progression_rules')
        .upsert(rules)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error bulk setting progression rules:', error)
      return false
    }
  }

  // ===== DAILY WORKOUT GENERATION =====
  
  // ===== FLEXIBLE PROGRAM SYSTEM =====
  
  static async getNextDueWorkout(clientId: string): Promise<DailyWorkout> {
    try {
      const { data, error } = await supabase
        .rpc('get_next_due_workout', {
          p_client_id: clientId
        })

      if (error) {
        // Handle specific error cases gracefully
        if (error.code === 'PGRST202') {
          console.log('get_next_due_workout function not found, falling back to legacy method')
          return this.getDailyWorkout(clientId, new Date())
        }
        console.log('Error calling get_next_due_workout:', error)
        // Return a default response instead of throwing
        return { 
          hasWorkout: false, 
          message: 'No active program assigned. Contact your coach to get started!' 
        }
      }
      return data || { hasWorkout: false, message: 'No active program assigned. Contact your coach to get started!' }
    } catch (error) {
      console.error('Error getting next due workout:', error)
      // Return a helpful message instead of falling back
      return { 
        hasWorkout: false, 
        message: 'No active program assigned. Contact your coach to get started!',
        weekCompleted: false
      }
    }
  }

  static async completeWorkout(clientId: string, templateId: string, durationMinutes?: number, notes?: string): Promise<{ success: boolean; message: string; nextWorkout?: DailyWorkout; isProgramCompleted?: boolean }> {
    try {
      const { data, error } = await supabase
        .rpc('complete_workout', {
          p_client_id: clientId,
          p_template_id: templateId,
          p_duration_minutes: durationMinutes,
          p_notes: notes
        })

      if (error) throw error
      return data || { success: false, message: 'Failed to complete workout' }
    } catch (error) {
      console.error('Error completing workout:', error)
      return { success: false, message: 'Error completing workout' }
    }
  }

  static async getCompletedPrograms(clientId: string): Promise<CompletedProgram[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_completed_programs', {
          p_client_id: clientId
        })

      if (error) {
        // Handle specific error cases gracefully
        if (error.code === 'PGRST202') {
          console.log('get_completed_programs function not found, returning empty array')
          return []
        }
        throw error
      }
      return data || []
    } catch (error) {
      console.error('Error getting completed programs:', error)
      return []
    }
  }

  static async getProgramProgress(clientId: string): Promise<ProgramAssignmentProgress | null> {
    try {
      const { data, error } = await supabase
        .from('program_assignment_progress')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_program_completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No active program found for client')
          return null // No active program
        }
        if (error.code === 'PGRST205') {
          console.log('program_assignment_progress table not found, returning null')
          return null
        }
        if (error.code === 'PGRST301') {
          console.log('406 Not Acceptable - RLS policy issue, returning null')
          return null
        }
        console.log('Error accessing program_assignment_progress:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Error getting program progress:', error)
      return null
    }
  }

  static async getWorkoutHistory(clientId: string, limit: number = 10): Promise<WorkoutCompletion[]> {
    try {
      const { data, error } = await supabase
        .from('program_workout_completions')
        .select(`
          *,
          template:workout_templates(name, difficulty_level)
        `)
        .eq('client_id', clientId)
        .order('completed_at', { ascending: false })
        .limit(limit)

      if (error) {
        if (error.code === 'PGRST205') {
          console.log('program_workout_completions table not found, returning empty array')
          return []
        }
        throw error
      }
      return data || []
    } catch (error) {
      console.error('Error getting workout history:', error)
      return []
    }
  }

  // Legacy method for backward compatibility
  static async getDailyWorkout(clientId: string, workoutDate: string = new Date().toISOString().split('T')[0]): Promise<DailyWorkout> {
    // For now, just return the next due workout regardless of date
    // This maintains compatibility while transitioning to the new system
    return await this.getNextDueWorkout(clientId)
  }

  static async generateDailyWorkout(clientId: string, programAssignmentId: string, workoutDate: string): Promise<DailyWorkout> {
    try {
      const { data, error } = await supabase
        .rpc('generate_daily_workout', {
          p_client_id: clientId,
          p_program_assignment_id: programAssignmentId,
          p_workout_date: workoutDate
        })

      if (error) throw error
      return data || { hasWorkout: false, message: 'Failed to generate workout' }
    } catch (error) {
      console.error('Error generating daily workout:', error)
      return { hasWorkout: false, message: 'Error generating workout' }
    }
  }

  static async clearWorkoutCache(clientId: string, programAssignmentId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('daily_workout_cache')
        .delete()
        .eq('client_id', clientId)

      if (programAssignmentId) {
        query = query.eq('program_assignment_id', programAssignmentId)
      }

      const { error } = await query

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error clearing workout cache:', error)
      return false
    }
  }

  // ===== EXERCISE ALTERNATIVES =====
  
  static async getExerciseAlternatives(exerciseId: string): Promise<ExerciseAlternative[]> {
    try {
      const { data, error } = await supabase
        .from('exercise_alternatives')
        .select(`
          *,
          alternative_exercise:exercises!alternative_exercise_id(*)
        `)
        .eq('primary_exercise_id', exerciseId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching exercise alternatives:', error)
      return []
    }
  }

  static async addExerciseAlternative(primaryExerciseId: string, alternativeExerciseId: string, reason: ExerciseAlternative['reason'], notes?: string): Promise<ExerciseAlternative | null> {
    try {
      const { data, error } = await supabase
        .from('exercise_alternatives')
        .insert({
          primary_exercise_id: primaryExerciseId,
          alternative_exercise_id: alternativeExerciseId,
          reason,
          notes
        })
        .select(`
          *,
          alternative_exercise:exercises!alternative_exercise_id(*)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding exercise alternative:', error)
      return null
    }
  }

  static async removeExerciseAlternative(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('exercise_alternatives')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error removing exercise alternative:', error)
      return false
    }
  }

  // ===== UTILITY FUNCTIONS =====
  
  static async getExercises(categoryId?: string, search?: string): Promise<Exercise[]> {
    try {
      let query = supabase
        .from('exercises')
        .select('*')

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
      }

      const { data, error } = await query
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching exercises:', error)
      return []
    }
  }

  static async getExerciseCategories(): Promise<ExerciseCategory[]> {
    try {
      const { data, error } = await supabase
        .from('exercise_categories')
        .select('*')
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching exercise categories:', error)
      return []
    }
  }

  // ===== ANALYTICS & INSIGHTS =====
  
  static async getTemplateUsageStats(coachId: string): Promise<{ templateId: string; templateName: string; usageCount: number; avgRating: number }[]> {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          id,
          name,
          program_schedule!inner(program_id)
        `)
        .eq('coach_id', coachId)

      if (error) throw error

      // Transform the data to get usage counts
      const usageStats = (data || []).map((template: any) => ({
        templateId: template.id,
        templateName: template.name,
        usageCount: template.program_schedule.length,
        avgRating: 0 // This would need to be calculated from client feedback
      }))

      return usageStats
    } catch (error) {
      console.error('Error fetching template usage stats:', error)
      return []
    }
  }
}

export default WorkoutTemplateService
