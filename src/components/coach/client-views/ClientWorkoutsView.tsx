'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import WorkoutTemplateDetails from '../WorkoutTemplateDetails'
import ProgramDetailsModal from '../ProgramDetailsModal'
import {
  Dumbbell,
  Calendar,
  Clock,
  Target,
  X,
  Star
} from 'lucide-react'

// Data mapping: workout_assignments -> workout_templates -> workout_blocks ->
// workout_block_exercises -> protocol tables (workout_time_protocols,
// workout_cluster_sets, workout_rest_pause_sets, workout_drop_sets, workout_hr_sets)
interface ClientWorkoutsViewProps {
  clientId: string
}

interface WorkoutAssignment {
  id: string
  scheduled_date: string
  status: string
  created_at: string
  workout_templates?: {
    name: string
    description?: string
    difficulty_level?: string
    estimated_duration?: number
  }
}

interface ProgramAssignment {
  id: string
  start_date: string
  end_date?: string
  status: string
  created_at: string
  workout_programs?: {
    name: string
    description?: string
    duration_weeks?: number
  }
}

export default function ClientWorkoutsView({ clientId }: ClientWorkoutsViewProps) {
  const [workouts, setWorkouts] = useState<WorkoutAssignment[]>([])
  const [programs, setPrograms] = useState<ProgramAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    assigned: 0
  })
  
  // Modal states
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null)
  const [selectedProgram, setSelectedProgram] = useState<any>(null)
  const [showWorkoutModal, setShowWorkoutModal] = useState(false)
  const [showProgramModal, setShowProgramModal] = useState(false)
  
  // Data for program details modal
  const [templates, setTemplates] = useState<any[]>([])
  const [exercises, setExercises] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  const getWorkoutStatusMeta = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', color: 'fc-text-success' }
      case 'in_progress':
        return { label: 'In progress', color: 'fc-text-warning' }
      case 'skipped':
        return { label: 'Skipped', color: 'fc-text-error' }
      case 'assigned':
      default:
        return { label: 'Assigned', color: 'fc-text-subtle' }
    }
  }

  const getProgramStatusMeta = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', color: 'fc-text-warning' }
      case 'paused':
        return { label: 'Paused', color: 'fc-text-subtle' }
      case 'completed':
        return { label: 'Completed', color: 'fc-text-success' }
      case 'cancelled':
        return { label: 'Cancelled', color: 'fc-text-error' }
      default:
        return { label: status, color: 'fc-text-subtle' }
    }
  }

  useEffect(() => {
    loadWorkouts()
    loadPrograms()
    loadProgramData()
  }, [clientId])

  const loadProgramData = async () => {
    try {
      // Load templates
      const { data: templatesData } = await supabase
        .from('workout_templates')
        .select('*')
        .order('name')
      setTemplates(templatesData || [])

      // Load exercises
      const { data: exercisesData } = await supabase
        .from('exercises')
        .select('*')
        .order('name')
      setExercises(exercisesData || [])

      // Load categories
      const { data: categoriesData } = await supabase
        .from('exercise_categories')
        .select('*')
        .order('name')
      setCategories(categoriesData || [])
    } catch (error) {
      console.error('Error loading program data:', error)
    }
  }

  const loadWorkouts = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_assignments')
        .select(`
          *,
          workout_templates(*)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) {
        // Table might not exist or be empty - show empty state
        setWorkouts([])
        return
      }

      // Remove duplicates based on ID
      const uniqueWorkouts = data?.filter((workout, index, self) => 
        index === self.findIndex(w => w.id === workout.id)
      ) || []

      console.log('Total workouts fetched:', data?.length)
      console.log('Unique workouts after deduplication:', uniqueWorkouts.length)

      setWorkouts(uniqueWorkouts)
      
      // Calculate stats
      const total = data?.length || 0
      const completed = data?.filter(w => w.status === 'completed').length || 0
      const inProgress = data?.filter(w => w.status === 'in_progress').length || 0
      const assigned = data?.filter(w => w.status === 'assigned').length || 0
      
      setStats({ total, completed, inProgress, assigned })
    } catch {
      // Silently handle error and show empty state
      setWorkouts([])
    }
  }

  const loadPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('program_assignments')
        .select(`
          *,
          workout_programs(*)
        `)
        .eq('client_id', clientId)
        .order('start_date', { ascending: false })

      if (error) {
        // Table might not exist - show empty state
        setPrograms([])
        setLoading(false)
        return
      }

      setPrograms(data || [])
    } catch {
      // Silently handle error
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }

  const handleUnassignWorkout = async (workoutId: string) => {
    if (!confirm('Are you sure you want to unassign this workout?')) return

    try {
      const { error } = await supabase
        .from('workout_assignments')
        .delete()
        .eq('id', workoutId)

      if (error) throw error

      // Refresh the list
      await loadWorkouts()
    } catch (error) {
      console.error('Error unassigning workout:', error)
      alert('Failed to unassign workout. Please try again.')
    }
  }

  const setAsActiveWorkout = async (workoutId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('Setting workout as active:', workoutId)
      console.log('Client ID:', clientId)

      // First, deactivate ALL workouts for this client (not just 'active' ones)
      const { data: deactivatedWorkouts, error: deactivateWorkoutsError } = await supabase
        .from('workout_assignments')
        .update({ status: 'assigned' })
        .eq('client_id', clientId)
        .neq('id', workoutId)
        .select()

      console.log('Deactivated workouts:', deactivatedWorkouts)
      if (deactivateWorkoutsError) {
        console.error('Error deactivating workouts:', deactivateWorkoutsError)
      }

      // Deactivate ALL programs for this client (use 'paused' as it's allowed)
      const { data: deactivatedPrograms, error: deactivateProgramsError } = await supabase
        .from('program_assignments')
        .update({ status: 'paused' })
        .eq('client_id', clientId)
        .select()

      console.log('Deactivated programs:', deactivatedPrograms)
      if (deactivateProgramsError) {
        console.error('Error deactivating programs:', deactivateProgramsError)
      }

      // Then, activate this specific workout
      const { data: activatedWorkout, error } = await supabase
        .from('workout_assignments')
        .update({ 
          status: 'in_progress',
          scheduled_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', workoutId)
        .select()

      console.log('Activated workout:', activatedWorkout)
      if (error) throw error

      alert('This workout is now the ONLY in-progress workout for this client!')
      await loadWorkouts()
      await loadPrograms()
    } catch (error) {
      console.error('Error setting active workout:', error)
      alert('Failed to set active workout. Please try again.')
    }
  }

  const handleUnassignProgram = async (programId: string) => {
    if (!confirm('Are you sure you want to unassign this program?')) return

    try {
      const { error } = await supabase
        .from('program_assignments')
        .delete()
        .eq('id', programId)

      if (error) throw error

      // Refresh the list
      await loadPrograms()
    } catch (error) {
      console.error('Error unassigning program:', error)
      alert('Failed to unassign program. Please try again.')
    }
  }

  const setAsActiveProgram = async (programId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // First, deactivate ALL workouts for this client
      const { error: deactivateWorkoutsError } = await supabase
        .from('workout_assignments')
        .update({ status: 'assigned' })
        .eq('client_id', clientId)

      if (deactivateWorkoutsError) {
        console.error('Error deactivating workouts:', deactivateWorkoutsError)
      }

      // Deactivate ALL programs for this client (use 'paused' as it's allowed)
      const { error: deactivateProgramsError } = await supabase
        .from('program_assignments')
        .update({ status: 'paused' })
        .eq('client_id', clientId)
        .neq('id', programId) // Don't update the one we're about to activate

      if (deactivateProgramsError) {
        console.error('Error deactivating programs:', deactivateProgramsError)
      }

      // Then, activate this specific program
      const { error } = await supabase
        .from('program_assignments')
        .update({ 
          status: 'active',
          start_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', programId)

      if (error) throw error

      alert('This program is now the ONLY active program for this client!')
      await loadWorkouts()
      await loadPrograms()
    } catch (error) {
      console.error('Error setting active program:', error)
      alert('Failed to set active program. Please try again.')
    }
  }

  // Modal handlers
  const handleWorkoutClick = async (workout: any) => {
    if (!workout?.workout_templates?.id) {
      alert('Workout template data not available')
      return
    }

    try {
      // Fetch full template details
      const { data: fullTemplate, error: templateError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', workout.workout_templates.id)
        .single()

      if (templateError) throw templateError
      
      // Fetch blocks and block exercises (block-based system)
      const { data: blocksData, error: blocksError } = await supabase
        .from('workout_blocks')
        .select('*')
        .eq('template_id', workout.workout_templates.id)
        .order('block_order')

      if (blocksError) throw blocksError

      const blockIds = (blocksData || []).map((block) => block.id).filter(Boolean)

      let blockExercises: any[] = []
      let timeProtocols: any[] = []
      let clusterSets: any[] = []
      let restPauseSets: any[] = []
      let dropSets: any[] = []
      let hrSets: any[] = []

      if (blockIds.length > 0) {
        const { data: blockExercisesData, error: blockExercisesError } = await supabase
          .from('workout_block_exercises')
          .select(`
            *,
            exercises (
              id,
              name,
              description,
              category
            )
          `)
          .in('block_id', blockIds)
          .order('exercise_order')

        if (blockExercisesError) throw blockExercisesError
        blockExercises = blockExercisesData || []

        const [
          { data: timeProtocolsData, error: timeProtocolsError },
          { data: clusterSetsData, error: clusterSetsError },
          { data: restPauseSetsData, error: restPauseSetsError },
          { data: dropSetsData, error: dropSetsError },
          { data: hrSetsData, error: hrSetsError },
        ] = await Promise.all([
          supabase.from('workout_time_protocols').select('*').in('block_id', blockIds),
          supabase.from('workout_cluster_sets').select('*').in('block_id', blockIds),
          supabase.from('workout_rest_pause_sets').select('*').in('block_id', blockIds),
          supabase.from('workout_drop_sets').select('*').in('block_id', blockIds),
          supabase.from('workout_hr_sets').select('*').in('block_id', blockIds),
        ])

        if (timeProtocolsError) throw timeProtocolsError
        if (clusterSetsError) throw clusterSetsError
        if (restPauseSetsError) throw restPauseSetsError
        if (dropSetsError) throw dropSetsError
        if (hrSetsError) throw hrSetsError

        timeProtocols = timeProtocolsData || []
        clusterSets = clusterSetsData || []
        restPauseSets = restPauseSetsData || []
        dropSets = dropSetsData || []
        hrSets = hrSetsData || []
      }

      const blocksWithExercises = (blocksData || []).map((block) => {
        const exercisesForBlock =
          (blockExercises || []).filter((exercise) => exercise.block_id === block.id) || []
        return {
          ...block,
          exercises: exercisesForBlock,
          time_protocols:
            (timeProtocols || []).filter((protocol) => protocol.block_id === block.id) || [],
          cluster_sets:
            (clusterSets || []).filter((cluster) => cluster.block_id === block.id) || [],
          rest_pause_sets:
            (restPauseSets || []).filter((restPause) => restPause.block_id === block.id) || [],
          drop_sets:
            (dropSets || []).filter((drop) => drop.block_id === block.id) || [],
          hr_sets: (hrSets || []).filter((set) => set.block_id === block.id) || [],
        }
      })

      console.log('Full template:', fullTemplate)
      console.log('Template blocks:', blocksWithExercises)
      console.log('Blocks count:', blocksWithExercises.length)

      if (fullTemplate) {
        setSelectedWorkout({
          ...workout,
          workout_templates: {
            ...fullTemplate,
            blocks: blocksWithExercises || []
          }
        })
        setShowWorkoutModal(true)
      }
    } catch (error) {
      console.error('Error loading workout details:', error)
      alert('Failed to load workout details')
    }
  }

  const handleProgramClick = async (program: any) => {
    if (!program?.workout_programs?.id) {
      alert('Program data not available')
      return
    }

    try {
      // Fetch full program with schedule
      const { data: fullProgram, error } = await supabase
        .from('workout_programs')
        .select(`
          *,
          program_schedule(
            *,
            workout_templates(*)
          )
        `)
        .eq('id', program.workout_programs.id)
        .single()

      if (error) {
        console.error('Error loading program:', error)
        alert('Could not load program details')
        return
      }

      // Rename program_schedule to schedule for compatibility with modal component
      const programWithSchedule = {
        ...fullProgram,
        schedule: fullProgram.program_schedule || []
      }

      setSelectedProgram(programWithSchedule)
      setShowProgramModal(true)
    } catch (error) {
      console.error('Error loading program details:', error)
      alert('Could not load program details')
    }
  }

  const closeWorkoutModal = () => {
    setShowWorkoutModal(false)
    setSelectedWorkout(null)
  }

  const closeProgramModal = () => {
    setShowProgramModal(false)
    setSelectedProgram(null)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-32 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-6"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
    <div className="space-y-6">
      {/* Assignments Overview */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Assignments
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Overview
              </h3>
              <p className="text-sm fc-text-dim">
                Snapshot of assigned workouts and programs
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">{stats.total}</p>
              <p className="text-sm fc-text-dim">Total</p>
            </div>

            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">{stats.completed}</p>
              <p className="text-sm fc-text-dim">Completed</p>
            </div>

            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">{stats.inProgress}</p>
              <p className="text-sm fc-text-dim">In Progress</p>
            </div>

            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">{stats.assigned}</p>
              <p className="text-sm fc-text-dim">Assigned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Programs Section */}
      {programs.length > 0 && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
          <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                  Programs
                </span>
                <h3 className="text-lg font-semibold fc-text-primary mt-2">
                  Assigned Programs
                </h3>
              </div>
              <span className="ml-auto fc-pill fc-pill-glass fc-text-workouts text-xs">
                {programs.length}
              </span>
            </div>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            {programs.map((program) => {
              const programStatus = getProgramStatusMeta(program.status)
              return (
                <div
                  key={program.id}
                  onClick={() => handleProgramClick(program)}
                  className={`fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 transition-all w-full min-h-[7rem] sm:min-h-[8rem] cursor-pointer ${
                    program.status === 'active' ? 'ring-2 ring-[color:var(--fc-domain-workouts)]' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
                    {/* Row 1: Icon, Title, Button */}
                    <div className="flex items-center gap-4 w-full">
                      {/* Icon */}
                      <div className="fc-icon-tile fc-icon-workouts">
                        <Target className="w-6 h-6" />
                      </div>

                      {/* Title */}
                      <h4 className="fc-text-primary break-words leading-tight flex-1 min-w-0 text-lg font-semibold">
                        {program.workout_programs?.name || 'Program'}
                      </h4>

                      {/* Action Buttons - Right Side */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Set as Active Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAsActiveProgram(program.id)
                          }}
                          className="fc-btn fc-btn-ghost fc-press h-7 w-7 p-0 fc-text-warning border border-[color:var(--fc-status-warning)]"
                          title="Set as Active Program"
                        >
                          <Star className="w-4 h-4" />
                        </button>

                        {/* Unassign Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnassignProgram(program.id)
                          }}
                          className="fc-btn fc-btn-ghost fc-press h-7 w-7 p-0 fc-text-error border border-[color:var(--fc-status-error)]"
                          title="Unassign Program"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Details - Mobile: Full width, Desktop: Side */}
                    <div className="flex items-center gap-2 text-xs sm:ml-0 sm:flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 fc-text-workouts flex-shrink-0" />
                        <span className="fc-text-subtle font-medium">
                          {new Date(program.start_date).toLocaleDateString()}
                        </span>
                      </div>

                      {program.workout_programs?.duration_weeks && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 fc-text-workouts flex-shrink-0" />
                          <span className="fc-text-subtle font-medium">
                            {program.workout_programs.duration_weeks}w
                          </span>
                        </div>
                      )}

                      <span className={`fc-pill fc-pill-glass text-xs ${programStatus.color}`}>
                        {programStatus.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Workouts List */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Workouts
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Individual Workouts
              </h3>
            </div>
            <span className="ml-auto fc-pill fc-pill-glass fc-text-workouts text-xs">
              {workouts.length}
            </span>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {workouts.length === 0 && programs.length === 0 ? (
            <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl text-center px-6 py-12">
              <div className="mx-auto mb-4 fc-icon-tile fc-icon-workouts w-16 h-16">
                <Dumbbell className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold fc-text-primary mb-2">
                No Workouts Assigned
              </h3>
              <p className="text-sm fc-text-dim">
                This client doesn't have any workout or program assignments yet.
              </p>
            </div>
          ) : workouts.length === 0 ? (
            <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl text-center px-6 py-8">
              <p className="text-sm fc-text-dim">
                No individual workouts assigned.
              </p>
            </div>
          ) : (
            workouts.map((workout) => {
              const workoutStatus = getWorkoutStatusMeta(workout.status)
              console.log('Rendering workout card:', { id: workout.id, name: workout.workout_templates?.name, status: workout.status })
              return (
                <div 
                  key={workout.id} 
                  data-workout-id={workout.id}
                  onClick={() => handleWorkoutClick(workout)}
                  className={`fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 transition-all w-full min-h-[7rem] sm:min-h-[8rem] cursor-pointer ${
                    workout.status === 'in_progress' ? 'ring-2 ring-[color:var(--fc-domain-workouts)]' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
                    {/* Row 1: Icon, Title, Button */}
                    <div className="flex items-center gap-4 w-full">
                      {/* Icon */}
                      <div className="fc-icon-tile fc-icon-workouts">
                        <Dumbbell className="w-6 h-6" />
                      </div>

                      {/* Title */}
                      <h4 className="fc-text-primary break-words leading-tight flex-1 min-w-0 text-lg font-semibold">
                        {workout.workout_templates?.name || 'Workout'}
                      </h4>

                      {/* Action Buttons - Right Side */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Set as Active Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAsActiveWorkout(workout.id)
                          }}
                          className="fc-btn fc-btn-ghost fc-press h-7 w-7 p-0 fc-text-warning border border-[color:var(--fc-status-warning)]"
                          title="Set as Today's Workout"
                        >
                          <Star className="w-4 h-4" />
                        </button>

                        {/* Unassign Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnassignWorkout(workout.id)
                          }}
                          className="fc-btn fc-btn-ghost fc-press h-7 w-7 p-0 fc-text-error border border-[color:var(--fc-status-error)]"
                          title="Unassign Workout"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Details - Mobile: Full width, Desktop: Side */}
                    <div className="flex items-center gap-2 text-xs sm:ml-0 sm:flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 fc-text-workouts flex-shrink-0" />
                        <span className="fc-text-subtle font-medium">
                          {new Date(workout.scheduled_date).toLocaleDateString()}
                        </span>
                      </div>

                      {workout.workout_templates?.estimated_duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 fc-text-workouts flex-shrink-0" />
                          <span className="fc-text-subtle font-medium">
                            {workout.workout_templates.estimated_duration}m
                          </span>
                        </div>
                      )}

                      {workout.workout_templates?.difficulty_level && (
                        <div className="flex items-center gap-1">
                          <Dumbbell className="w-3 h-3 fc-text-warning flex-shrink-0" />
                          <span className="fc-text-subtle font-medium">
                            {workout.workout_templates.difficulty_level}
                          </span>
                        </div>
                      )}

                      <span className={`fc-pill fc-pill-glass text-xs ${workoutStatus.color}`}>
                        {workoutStatus.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>

    {/* Workout Details Modal */}
    {showWorkoutModal && selectedWorkout?.workout_templates && (
      <WorkoutTemplateDetails
        isOpen={showWorkoutModal}
        onClose={closeWorkoutModal}
        template={selectedWorkout.workout_templates}
      />
    )}

    {/* Program Details Modal */}
    {showProgramModal && selectedProgram && (
      <ProgramDetailsModal
        program={selectedProgram}
        templates={templates}
        exercises={exercises}
        categories={categories}
        onClose={closeProgramModal}
        onEdit={() => {}}
      />
    )}
    </>
  )
}