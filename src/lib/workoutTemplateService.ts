'use client'

import { supabase } from './supabase'
import { ProgramProgressionService } from './programProgressionService'
import { WorkoutBlockService } from './workoutBlockService'

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
  exercise_count?: number
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
  is_optional?: boolean // Optional field (not in DB schema, defaults to false)
  is_active: boolean
  notes?: string
  template_name?: string
  template_description?: string
  estimated_duration?: number | null
  created_at: string
  updated_at: string
  template?: WorkoutTemplate
}

export interface ProgressionRule {
  id: string
  program_id: string
  template_exercise_id: string
  week_number: number
  sets: number
  reps: number // Database stores as integer (first number of rep range)
  weight_guidance?: string
  rest_time: number
  notes?: string // Contains JSON with original rep range and full config
  created_at: string
  updated_at: string
}

// ===== PROGRAM ASSIGNMENTS =====
export interface ProgramAssignment {
  id: string
  program_id: string
  client_id: string
  coach_id?: string
  start_date: string
  total_days: number
  status?: string
  created_at?: string
  updated_at?: string
}

export interface ProgramDayAssignment {
  id: string
  program_assignment_id: string
  program_day_id: string | null
  day_number: number | null
  day_type: string | null
  workout_assignment_id: string | null
  name: string | null
  description: string | null
  estimated_duration: number | null
  target_muscles: string[] | null
  intensity_level: string | null
  rest_focus: string | null
  recommended_activities: string[] | null
  is_completed: boolean | null
  completed_date: string | null
  notes: string | null
  is_customized: boolean | null
  created_at: string
  updated_at: string
  program_day: number | null
  workout_template_id: string | null
  week_number?: number | null
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
        .select('*')
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      const templates = data || []

      if (templates.length === 0) {
        return []
      }

      const templateIds = templates.map((t: any) => t.id)

      const { data: exerciseRows, error: exerciseError } = await supabase
        .from('workout_block_exercises')
        .select('id, workout_blocks!inner(template_id)')
        .in('workout_blocks.template_id', templateIds)

      const counts: Record<string, number> = {}
      if (!exerciseError && exerciseRows) {
        exerciseRows.forEach((row: any) => {
          const templateId = row.workout_blocks?.template_id
          if (templateId) {
            counts[templateId] = (counts[templateId] || 0) + 1
          }
        })
      } else if (exerciseError) {
        console.warn('Unable to load exercise counts for templates:', exerciseError.message)
      }

      return templates.map((template: any) => ({
        ...template,
        exercise_count: counts[template.id] || 0,
      }))
    } catch (error) {
      console.error('Error fetching workout templates:', error)
      return []
    }
  }

  static async getWorkoutTemplateById(templateId: string): Promise<WorkoutTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle()

      if (error) throw error
      return data || null
    } catch (error) {
      console.error('Error fetching workout template:', error)
      return null
    }
  }

  static async assignWorkoutToClient(
    clientRelationshipId: string,
    clientProfileId: string,
    templateId: string,
    coachId: string,
    scheduledDate: string,
    notes?: string | null
  ): Promise<any | null> {
    try {
      const template = await this.getWorkoutTemplateById(templateId)

      const { data: existing, error: existingError } = await supabase
        .from('workout_assignments')
        .select('*')
        .eq('client_id', clientProfileId)
        .eq('workout_template_id', templateId)
        .maybeSingle()

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError
      }

      let assignment = existing || null

      if (!assignment) {
        const insertPayload: any = {
          client_id: clientProfileId,
          workout_template_id: templateId,
          coach_id: coachId,
          scheduled_date: scheduledDate,
          status: 'assigned',
          name: template?.name ?? 'Workout Assignment',
          notes: notes ?? null,
        }

        const { data, error } = await supabase
          .from('workout_assignments')
          .insert(insertPayload)
          .select('*')
          .single()

        if (error) throw error
        assignment = data
      } else {
        const updates: any = {}
        if (scheduledDate && assignment.scheduled_date !== scheduledDate) {
          updates.scheduled_date = scheduledDate
        }
        if (notes !== undefined && assignment.notes !== notes) {
          updates.notes = notes
        }
        if (template?.name && assignment.name !== template.name) {
          updates.name = template.name
        }

        if (Object.keys(updates).length > 0) {
          const { data, error } = await supabase
            .from('workout_assignments')
            .update(updates)
            .eq('id', assignment.id)
            .select('*')
            .single()

          if (error) throw error
          assignment = data
        }
      }

      if (!assignment?.id) {
        return null
      }

      // No longer creating copies - assignment links directly to original template
      return assignment
    } catch (error) {
      console.error('Error assigning workout to client:', error)
      return null
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
      // First get the original template
      const { data: originalTemplate, error: fetchError } = await supabase
        .from('workout_templates')
        .select('*')
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

      // Copy blocks using WorkoutBlockService
      const { WorkoutBlockService } = await import('./workoutBlockService')
      const blocks = await WorkoutBlockService.getWorkoutBlocks(id)
      
      if (blocks && blocks.length > 0) {
        // Create blocks for the new template
        for (const block of blocks) {
          const newBlock = await WorkoutBlockService.createWorkoutBlock(
            newTemplate.id,
            block.block_type,
            block.block_order,
            {
              block_name: block.block_name,
              block_notes: block.block_notes,
              total_sets: block.total_sets,
              reps_per_set: block.reps_per_set,
              rest_seconds: block.rest_seconds,
              duration_seconds: block.duration_seconds,
              block_parameters: block.block_parameters,
            }
          )

          // Copy exercises within the block
          if (newBlock && block.exercises && block.exercises.length > 0) {
            for (const exercise of block.exercises) {
              await WorkoutBlockService.addExerciseToBlock(
                newBlock.id,
                exercise.exercise_id,
                exercise.exercise_order,
                {
                  exercise_letter: exercise.exercise_letter,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  weight_kg: exercise.weight_kg,
                  rir: exercise.rir,
                  tempo: exercise.tempo,
                  rest_seconds: exercise.rest_seconds,
                  notes: exercise.notes,
                }
              )
            }
          }
        }
      }

      return newTemplate
    } catch (error) {
      console.error('Error duplicating workout template:', error)
      return null
    }
  }

  // ===== TEMPLATE EXERCISE MANAGEMENT =====
  // NOTE: These methods are deprecated. Use WorkoutBlockService instead.
  // Keeping for backward compatibility, but they now delegate to WorkoutBlockService
  
  static async addExerciseToTemplate(templateId: string, exerciseId: string, orderIndex: number, notes?: string): Promise<TemplateExercise | null> {
    try {
      // Use WorkoutBlockService to create a straight_set block
      const { WorkoutBlockService } = await import('./workoutBlockService')
      const block = await WorkoutBlockService.createWorkoutBlock(
        templateId,
        'straight_set',
        orderIndex,
        { block_notes: notes }
      )

      if (!block) return null

      // Add exercise to the block
      const blockExercise = await WorkoutBlockService.addExerciseToBlock(
        block.id,
        exerciseId,
        1,
        { notes }
      )

      if (!blockExercise) return null

      // Return in legacy format for compatibility
      return {
        id: blockExercise.id,
        template_id: templateId,
        exercise_id: exerciseId,
        order_index: orderIndex,
        notes: notes || null,
      } as any
    } catch (error) {
      console.error('Error adding exercise to template:', error)
      return null
    }
  }

  static async updateTemplateExercise(id: string, updates: Partial<TemplateExercise>): Promise<TemplateExercise | null> {
    try {
      // Legacy method - exercise updates now handled via WorkoutBlockService
      console.warn('updateTemplateExercise is deprecated. Use WorkoutBlockService.updateWorkoutBlock instead.')
      return null
    } catch (error) {
      console.error('Error updating template exercise:', error)
      return null
    }
  }

  static async removeExerciseFromTemplate(id: string): Promise<boolean> {
    try {
      // Legacy method - exercise removal now handled via WorkoutBlockService
      console.warn('removeExerciseFromTemplate is deprecated. Use WorkoutBlockService.deleteWorkoutBlock instead.')
      return false
    } catch (error) {
      console.error('Error removing exercise from template:', error)
      return false
    }
  }

  static async reorderTemplateExercises(templateId: string, exercises: { id: string; orderIndex: number }[]): Promise<boolean> {
    try {
      // Legacy method - use WorkoutBlockService.reorderWorkoutBlocks instead
      console.warn('reorderTemplateExercises is deprecated. Use WorkoutBlockService.reorderWorkoutBlocks instead.')
      const { WorkoutBlockService } = await import('./workoutBlockService')
      
      // Convert exercise IDs to block order updates
      // Note: This is a simplified approach - in reality, we'd need to map exercises to blocks
      const blocks = await WorkoutBlockService.getWorkoutBlocks(templateId)
      const blockOrders = blocks.map((block, index) => ({
        blockId: block.id,
        newOrder: index + 1,
      }))
      
      return await WorkoutBlockService.reorderWorkoutBlocks(templateId, blockOrders)
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
        .select('*')
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
    // Use program_schedule table with columns: program_id, day_of_week, week_number, template_id
    // Avoid DB-side ordering on unknown columns; fetch and sort client-side.
    try {
      const { data: rows, error } = await supabase
        .from('program_schedule')
        .select('*')
        .eq('program_id', programId)

      if (error) throw error

      // Map to legacy ProgramSchedule shape used by callers
      const mapped = (rows || []).map((row: any) => {
        const programDay =
          typeof row.program_day === 'number'
            ? row.program_day
            : typeof row.day === 'number'
            ? row.day
            : typeof row.day_of_week === 'number'
            ? row.day_of_week + 1
            : 1

        const weekNumber =
          typeof row.week_number === 'number'
            ? row.week_number
            : typeof row.week === 'number'
            ? row.week
            : 1

        const templateId = row.template_id ?? row.workout_template_id

        return {
          id: row.id,
          program_id: row.program_id,
          program_day: programDay,
          week_number: weekNumber,
          template_id: templateId,
          is_optional: false, // Default value since column doesn't exist in DB
          is_active: row.is_active ?? true,
          notes: row.notes,
          template_name: row.template_name ?? undefined,
          template_description: row.template_description ?? undefined,
          estimated_duration: row.estimated_duration ?? null,
          created_at: row.created_at,
          updated_at: row.updated_at,
        } as unknown as ProgramSchedule
      })

      // Client-side sort by (week_number ASC, program_day ASC)
      mapped.sort((a: any, b: any) => {
        const wa = a.week_number ?? 1
        const wb = b.week_number ?? 1
        if (wa !== wb) return wa - wb
        const da = a.program_day ?? 1
        const db = b.program_day ?? 1
        return da - db
      })

      return mapped
    } catch (error) {
      console.error('Error fetching program schedule:', error)
      return []
    }
  }

  // ===== PROGRAM ASSIGNMENT MANAGEMENT =====

  static async createProgramAssignment(clientId: string, programId: string, startDate: string, coachId?: string): Promise<ProgramAssignment | null> {
    try {
      const { data: existing, error: existingError } = await supabase
        .from('program_assignments')
        .select('*')
        .eq('client_id', clientId)
        .eq('program_id', programId)
        .maybeSingle()

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError
      }

      const schedule = await this.getProgramSchedule(programId)
      const totalDays = schedule?.length || 0

      const insertPayload: any = {
        client_id: clientId,
        program_id: programId,
        start_date: startDate,
        total_days: totalDays,
      }

      if (coachId) {
        insertPayload.coach_id = coachId
      }

      let data: any = existing
      if (!existing) {
        const insertResponse = await supabase
          .from('program_assignments')
          .insert(insertPayload)
          .select('*')
          .single()

        if (insertResponse.error) throw insertResponse.error
        data = insertResponse.data
      }

      if (data?.id) {
        await ProgramProgressionService.deleteClientProgramProgressionRules(
          data.id
        )
        const copied =
          await ProgramProgressionService.copyProgramRulesToClient(
            programId,
            data.id,
            clientId
          )
        if (!copied) {
          console.warn(
            '[ClientProgramCopy] Failed to copy progression rules for assignment',
            {
              programId,
              assignmentId: data.id,
              clientId,
            }
          )
        }
      }

      return data
    } catch (error) {
      console.error('Error creating program assignment:', error)
      return null
    }
  }

  static async getProgramAssignmentsByClient(clientId: string): Promise<ProgramAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('program_assignments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching client program assignments:', error)
      return []
    }
  }

  static async upsertProgramDayAssignment(
    programAssignmentId: string,
    weekNumber: number,
    programDay: number,
    workoutTemplateId: string | null,
    notes?: string | null,
    overrides?: {
      name?: string | null
      description?: string | null
      estimated_duration?: number | null
    }
  ): Promise<ProgramDayAssignment | null> {
    try {
      const dayNumber = (weekNumber - 1) * 7 + programDay
      const dayType = workoutTemplateId ? 'workout' : 'rest'
      const defaultName =
        dayType === 'workout'
          ? `Workout Day ${weekNumber}-${programDay}`
          : `Rest Day ${weekNumber}-${programDay}`
      const name = overrides?.name ?? defaultName
      const defaultDescription =
        dayType === 'rest' ? 'Rest day' : null
      const description = overrides?.description ?? defaultDescription

      const payload: any = {
        program_assignment_id: programAssignmentId,
        program_day_id: null,
        day_number: dayNumber,
        day_type: dayType,
        workout_template_id: workoutTemplateId ?? null,
        name,
        description,
        notes: notes ?? null,
        is_customized: overrides?.description || overrides?.name ? true : false,
        is_completed: false,
        program_day: programDay,
        target_muscles: [],
        recommended_activities: [],
      }

      if (overrides?.name !== undefined) payload.name = overrides.name
      if (overrides?.description !== undefined) payload.description = overrides.description
      if (overrides?.estimated_duration !== undefined) payload.estimated_duration = overrides.estimated_duration

      const { data, error } = await supabase
        .from('program_day_assignments')
        .upsert(payload)
        .select('*')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error upserting program day assignment:', error)
      return null
    }
  }

  static async removeProgramDayAssignment(programAssignmentId: string, weekNumber: number, programDay: number): Promise<boolean> {
    try {
      const dayNumber = (weekNumber - 1) * 7 + programDay
      const { error } = await supabase
        .from('program_day_assignments')
        .delete()
        .eq('program_assignment_id', programAssignmentId)
        .eq('program_day', programDay)
        .eq('day_number', dayNumber)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error removing program day assignment:', error)
      return false
    }
  }

  static async getProgramAssignmentDetail(programAssignmentId: string): Promise<{ assignment: ProgramAssignment | null; days: ProgramDayAssignment[] }> {
    try {
      const [{ data: assignment, error: aErr }, { data: days, error: dErr }] = await Promise.all([
        supabase.from('program_assignments').select('*').eq('id', programAssignmentId).single(),
        supabase.from('program_day_assignments').select('*').eq('program_assignment_id', programAssignmentId)
      ])

      if (aErr) throw aErr
      if (dErr) throw dErr

      const sorted = (days || []).sort((a: any, b: any) => {
        const da = typeof a.day_number === 'number' ? a.day_number : 0
        const db = typeof b.day_number === 'number' ? b.day_number : 0
        if (da !== db) return da - db
        const pa = typeof a.program_day === 'number' ? a.program_day : 0
        const pb = typeof b.program_day === 'number' ? b.program_day : 0
        return pa - pb
      })

      const mapped = sorted.map((day: any) => {
        const dayNumber = typeof day.day_number === 'number' ? day.day_number : null
        const derivedWeek =
          dayNumber !== null ? Math.floor((dayNumber - 1) / 7) + 1 : null
        return {
          ...day,
          program_assignment_id: day.program_assignment_id || day.assignment_id,
          week_number: derivedWeek,
        }
      }) as ProgramDayAssignment[]

      return {
        assignment: assignment || null,
        days: mapped,
      }
    } catch (error) {
      console.error('Error fetching program assignment detail:', error)
      return { assignment: null, days: [] }
    }
  }

  /**
   * Convenience method: assign a program to multiple clients and copy program days
   */
  static async assignProgramToClients(
    programId: string,
    clientIds: string[],
    coachId: string | undefined,
    startDate: string,
    notes?: string
  ): Promise<number> {
    let successCount = 0
    // fetch program days once
    const days = await this.getProgramSchedule(programId)

    for (const clientId of clientIds) {
      const assignment = await this.createProgramAssignment(clientId, programId, startDate, coachId)
      if (!assignment) continue

      if (days && days.length > 0) {
        const rows = days.map((d) => {
          const weekNumber = d.week_number ?? 1
          const programDay = d.program_day ?? 1
          const dayNumber = (weekNumber - 1) * 7 + programDay
          const dayType = d.template_id ? 'workout' : 'rest'
          const defaultName =
            dayType === 'workout'
              ? `Workout Day ${weekNumber}-${programDay}`
              : `Rest Day ${weekNumber}-${programDay}`
          const name = d.template_name ?? defaultName
          const description =
            d.template_description ??
            (dayType === 'rest' ? 'Rest day' : d.notes ?? null)

          return {
            program_assignment_id: assignment.id,
            program_day_id: null,
            program_day: programDay,
            day_number: dayNumber,
            day_type: dayType,
            workout_template_id: d.template_id ?? null,
            name,
            description,
            estimated_duration: d.estimated_duration ?? null,
            target_muscles: [],
            intensity_level: null,
            rest_focus: null,
            recommended_activities: [],
            is_completed: false,
            completed_date: null,
            notes: notes ?? d.notes ?? null,
            is_customized: false,
          }
        })
        const { error } = await supabase.from('program_day_assignments').insert(rows)
        if (error) {
          console.error('Error copying program days to assignment:', error)
        }
      }
      successCount += 1
    }
    return successCount
  }

  static async setProgramSchedule(programId: string, programDay: number, weekNumber: number, templateId: string, isOptional: boolean = false, notes?: string): Promise<ProgramSchedule | null> {
    try {
      // programDay is 1-based (Day 1, Day 2, etc.), but DB uses day_of_week (0-based)
      // Use program_schedule table with template_id (not workout_template_id)
      const dayOfWeek = programDay - 1; // Convert to 0-based
      
      const { data, error } = await supabase
        .from('program_schedule')
        .upsert({
          program_id: programId,
          day_of_week: dayOfWeek, // 0-based (0=Monday, 1=Tuesday, etc.)
          week_number: weekNumber,
          template_id: templateId
        })
        .select('*')
        .single()

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }
      
      // Map to ProgramSchedule interface, setting is_optional to false by default
      return {
        id: data.id,
        program_id: data.program_id,
        program_day: programDay, // Keep 1-based for interface
        week_number: weekNumber,
        template_id: templateId,
        is_optional: false, // Default value since column doesn't exist in DB
        is_active: true,
        notes: data.notes || undefined,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      } as ProgramSchedule
    } catch (error: any) {
      console.error('Error setting program schedule:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      return null
    }
  }

  static async removeProgramSchedule(programId: string, programDay: number, weekNumber: number): Promise<boolean> {
    try {
      // programDay is 1-based (Day 1, Day 2, etc.), but DB uses day_of_week (0-based)
      const dayOfWeek = programDay - 1; // Convert to 0-based

      // Find existing schedule rows for this slot so we can clean up progression rules first
      const { data: scheduleRows, error: selectError } = await supabase
        .from('program_schedule')
        .select('id')
        .eq('program_id', programId)
        .eq('day_of_week', dayOfWeek)
        .eq('week_number', weekNumber)

      if (selectError) throw selectError

      if (scheduleRows && scheduleRows.length > 0) {
        for (const row of scheduleRows) {
          if (row?.id) {
            await ProgramProgressionService.deleteProgressionRules(row.id, weekNumber).catch(
              (err) => {
                console.error('Error deleting progression rules before removing schedule:', err)
              }
            )
          }
        }
      }

      // Use program_schedule table to delete the schedule entry
      const { error } = await supabase
        .from('program_schedule')
        .delete()
        .eq('program_id', programId)
        .eq('day_of_week', dayOfWeek)
        .eq('week_number', weekNumber)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error removing program schedule:', error)
      return false
    }
  }

  // ===== TEMPLATE EXERCISES =====
  // NOTE: This method is deprecated. Use WorkoutBlockService.getWorkoutBlocks instead.
  static async getWorkoutTemplateExercises(templateId: string): Promise<any[]> {
    try {
      // Use WorkoutBlockService instead
      const { WorkoutBlockService } = await import('./workoutBlockService')
      const blocks = await WorkoutBlockService.getWorkoutBlocks(templateId)
      
      // Convert blocks to legacy format for backward compatibility
      const exercises: any[] = []
      blocks.forEach((block, blockIndex) => {
        if (block.exercises && block.exercises.length > 0) {
          block.exercises.forEach((exercise, exIndex) => {
            exercises.push({
              id: exercise.id,
              template_id: templateId,
              exercise_id: exercise.exercise_id,
              order_index: block.block_order || blockIndex + 1,
              notes: exercise.notes || block.block_notes,
            })
          })
        }
      })
      
      return exercises
    } catch (error) {
      console.error('Error fetching workout template exercises:', error)
      return []
    }
  }

  // ===== PROGRESSION RULES MANAGEMENT =====
  
  static async getProgressionRules(programId: string, exerciseId?: string): Promise<ProgressionRule[]> {
    try {
      // First, get the progression rules without the join (since there's no foreign key relationship)
      let query = supabase
        .from('program_progression_rules')
        .select('*')
        .eq('program_id', programId)

      if (exerciseId) {
        query = query.eq('template_exercise_id', exerciseId)
      }

      const { data, error } = await query
        .order('week_number')
        .order('template_exercise_id')

      if (error) {
        // If table doesn't exist or has schema issues, return empty array
        if (error.code === 'PGRST204' || error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('program_progression_rules table may not exist or has schema issues:', error.message)
          return []
        }
        throw error
      }
      
      // If no data, return empty array
      if (!data || data.length === 0) {
        return []
      }
      
      // Enrich with exercise details by looking up from workout_block_exercises
      // Get unique template_exercise_ids to batch fetch
      const templateExerciseIds = [...new Set(data.map(rule => rule.template_exercise_id).filter(Boolean))]
      
      if (templateExerciseIds.length === 0) {
        return data as ProgressionRule[]
      }
      
      // Fetch all block exercises in one query
      const { data: blockExercises, error: blockExercisesError } = await supabase
        .from('workout_block_exercises')
        .select(`
          id,
          exercise_id,
          sets,
          reps,
          rest_seconds,
          exercise:exercises(
            id,
            name,
            description,
            video_url
          )
        `)
        .in('id', templateExerciseIds)

      if (blockExercisesError) {
        console.warn('Error fetching block exercises for progression rules:', blockExercisesError)
        // Return rules without exercise details
        return data as ProgressionRule[]
      }

      // Create a map for quick lookup
      const exerciseMap = new Map(
        (blockExercises || []).map(be => [be.id, be.exercise])
      )

      // Enrich rules with exercise data
      const enrichedData = data.map((rule) => ({
        ...rule,
        exercise: exerciseMap.get(rule.template_exercise_id),
      }))
      
      return enrichedData as ProgressionRule[]
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
          return this.getDailyWorkout(clientId, new Date().toISOString().split('T')[0])
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
      // Query workout_logs via workout_assignments for the new schema
      const { data: assignments, error: assignError } = await supabase
        .from('workout_assignments')
        .select('id, workout_template_id')
        .eq('client_id', clientId)

      if (assignError || !assignments || assignments.length === 0) {
        return []
      }

      const assignmentIds = assignments.map(a => a.id)
      const { data, error } = await supabase
        .from('workout_logs')
        .select(`
          *,
          workout_assignments!inner(
            workout_template_id,
            template:workout_templates(name, difficulty_level)
          )
        `)
        .in('workout_assignment_id', assignmentIds)
        .order('completed_at', { ascending: false })
        .limit(limit)

      if (error) {
        // If workout_logs doesn't exist or has issues, return empty array
        console.log('Error querying workout_logs:', error)
        return []
      }

      // Map workout_logs data to WorkoutCompletion format
      return (data || []).map((log: any) => ({
        id: log.id,
        assignment_progress_id: log.workout_assignment_id,
        client_id: clientId,
        program_id: '', // Not available in workout_logs
        week_number: 0, // Not available in workout_logs
        program_day: 0, // Not available in workout_logs
        template_id: log.workout_assignments?.workout_template_id || '',
        workout_date: log.completed_at?.split('T')[0] || '',
        completed_at: log.completed_at || '',
        duration_minutes: log.duration_minutes,
        created_at: log.created_at || new Date().toISOString(),
        template: log.workout_assignments?.template
      } as WorkoutCompletion))
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
