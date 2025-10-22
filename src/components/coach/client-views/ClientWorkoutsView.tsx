'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import WorkoutTemplateDetails from '../WorkoutTemplateDetails'
import ProgramDetailsModal from '../ProgramDetailsModal'
import { 
  Dumbbell,
  Calendar,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  PlayCircle,
  TrendingUp,
  X,
  Edit,
  Users,
  Star
} from 'lucide-react'

// Import the existing ProgramDetailsModal from EnhancedProgramManager
import { Program, WorkoutTemplate, Exercise, ExerciseCategory } from '@/lib/workoutTemplateService'

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
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      case 'assigned':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
      case 'skipped':
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300'
      default:
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      case 'intermediate':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
      case 'advanced':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      default:
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300'
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
          status: 'active',
          scheduled_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', workoutId)
        .select()

      console.log('Activated workout:', activatedWorkout)
      if (error) throw error

      alert('This workout is now the ONLY active workout for this client!')
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

      // Fetch exercises separately from workout_template_exercises table
      const { data: templateExercises, error: exercisesError } = await supabase
        .from('workout_template_exercises')
        .select(`
          *,
          exercises (
            id,
            name,
            description,
            category
          )
        `)
        .eq('template_id', workout.workout_templates.id)
        .order('order_index')

      if (exercisesError) throw exercisesError

      console.log('Full template:', fullTemplate)
      console.log('Template exercises:', templateExercises)
      console.log('Exercises count:', templateExercises?.length || 0)
      if (templateExercises && templateExercises.length > 0) {
        console.log('First exercise sample:', templateExercises[0])
      }

      if (fullTemplate) {
        setSelectedWorkout({
          ...workout,
          workout_templates: {
            ...fullTemplate,
            exercises: templateExercises || []
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
            <div className={`${theme.card} h-32`} style={{ borderRadius: '24px', padding: '24px' }}></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-[1px] bg-gradient-to-r from-blue-500 to-indigo-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent style={{ padding: '16px' }}>
              <div className="text-center">
                <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{stats.total}</p>
                <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-green-500 to-emerald-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent style={{ padding: '16px' }}>
              <div className="text-center">
                <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{stats.completed}</p>
                <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-blue-400 to-blue-500" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent style={{ padding: '16px' }}>
              <div className="text-center">
                <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{stats.inProgress}</p>
                <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>In Progress</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-orange-500 to-amber-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent style={{ padding: '16px' }}>
              <div className="text-center">
                <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{stats.assigned}</p>
                <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Assigned</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Programs Section */}
      {programs.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '700' }}>Assigned Programs</h3>
          </div>
          <div className="space-y-4 mb-6">
            {programs.map((program) => (
            <div 
              key={program.id} 
              onClick={() => handleProgramClick(program)}
              className={`p-[1px] ${
                program.status === 'active' 
                  ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 ring-4 ring-yellow-300/50 dark:ring-yellow-500/30' 
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600'
              } hover:shadow-xl transition-all w-full min-h-[7rem] sm:min-h-[8rem] cursor-pointer`}
              style={{ borderRadius: '24px', boxShadow: program.status === 'active' ? '0 4px 12px rgba(0, 0, 0, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.08)' }}
            >
              <Card className={`${theme.card} border-0 h-full`} style={{ borderRadius: '24px' }}>
                <CardContent className="flex items-center h-full" style={{ padding: '24px' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
                    {/* Row 1: Icon, Title, Button */}
                    <div className="flex items-center gap-4 w-full">
                      {/* Icon */}
                      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg" style={{ width: '56px', height: '56px', borderRadius: '18px' }}>
                        <Target className="w-8 h-8 text-white" />
                      </div>

                      {/* Title */}
                      <h4 className={`${theme.text} break-words leading-tight flex-1 min-w-0`} style={{ fontSize: '18px', fontWeight: '600' }}>
                        {program.workout_programs?.name || 'Program'}
                      </h4>

                      {/* Action Buttons - Right Side */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Set as Active Button */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setAsActiveProgram(program.id);
                          }}
                          className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-yellow-500 text-yellow-600 hover:text-white hover:bg-yellow-500 hover:border-yellow-600 dark:border-yellow-400 dark:text-yellow-400 dark:hover:bg-yellow-500 dark:hover:text-white rounded cursor-pointer flex items-center justify-center transition-colors"
                          title="Set as Active Program"
                        >
                          <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>

                        {/* Unassign Button */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnassignProgram(program.id);
                          }}
                          className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-red-500 text-red-600 hover:text-white hover:bg-red-500 hover:border-red-600 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white rounded cursor-pointer flex items-center justify-center transition-colors"
                          title="Unassign Program"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Details - Mobile: Full width, Desktop: Side */}
                    <div className="flex items-center gap-2 text-xs sm:ml-0 sm:flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className={`${theme.textSecondary} font-medium`}>
                          {new Date(program.start_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {program.workout_programs?.duration_weeks && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          <span className={`${theme.textSecondary} font-medium`}>
                            {program.workout_programs.duration_weeks}w
                          </span>
                        </div>
                      )}

                      {program.status === 'active' && (
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg animate-pulse">
                          ⭐ ACTIVE
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            ))}
          </div>
        </>
      )}

      {/* Workouts List */}
      <div className="flex items-center gap-2 mb-2">
        <Dumbbell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '700' }}>Individual Workouts</h3>
      </div>
      <div className="space-y-4">
        {workouts.length === 0 && programs.length === 0 ? (
          <Card className={`${theme.card} border-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`} style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardContent className="text-center" style={{ padding: '48px 24px' }}>
              <Dumbbell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className={`${theme.text} mb-2`} style={{ fontSize: '20px', fontWeight: '700' }}>
                No Workouts Assigned
              </h3>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>
                This client doesn't have any workout or program assignments yet.
              </p>
            </CardContent>
          </Card>
        ) : workouts.length === 0 ? (
          <Card className={`${theme.card} border-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`} style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardContent className="text-center" style={{ padding: '32px 24px' }}>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>
                No individual workouts assigned.
              </p>
            </CardContent>
          </Card>
        ) : (
          workouts.map((workout) => {
            console.log('Rendering workout card:', { id: workout.id, name: workout.workout_templates?.name, status: workout.status })
            return (
            <div 
              key={workout.id} 
              data-workout-id={workout.id}
              onClick={() => handleWorkoutClick(workout)}
              className={`p-[1px] ${
                workout.status === 'active' 
                  ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 ring-4 ring-yellow-300/50 dark:ring-yellow-500/30' 
                  : 'bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600'
              } hover:shadow-xl transition-all w-full min-h-[7rem] sm:min-h-[8rem] cursor-pointer`}
              style={{ borderRadius: '24px', boxShadow: workout.status === 'active' ? '0 4px 12px rgba(0, 0, 0, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.08)' }}
            >
              <Card className={`${theme.card} border-0 h-full`} style={{ borderRadius: '24px' }}>
                <CardContent className="flex items-center h-full" style={{ padding: '24px' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
                    {/* Row 1: Icon, Title, Button */}
                    <div className="flex items-center gap-4 w-full">
                      {/* Icon */}
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg" style={{ width: '56px', height: '56px', borderRadius: '18px' }}>
                        <Dumbbell className="w-8 h-8 text-white" />
                      </div>

                      {/* Title */}
                      <h4 className={`${theme.text} break-words leading-tight flex-1 min-w-0`} style={{ fontSize: '18px', fontWeight: '600' }}>
                        {workout.workout_templates?.name || 'Workout'}
                      </h4>

                      {/* Action Buttons - Right Side */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Set as Active Button */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setAsActiveWorkout(workout.id);
                          }}
                          className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-yellow-500 text-yellow-600 hover:text-white hover:bg-yellow-500 hover:border-yellow-600 dark:border-yellow-400 dark:text-yellow-400 dark:hover:bg-yellow-500 dark:hover:text-white rounded cursor-pointer flex items-center justify-center transition-colors"
                          title="Set as Today's Workout"
                        >
                          <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>

                        {/* Unassign Button */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnassignWorkout(workout.id);
                          }}
                          className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-red-500 text-red-600 hover:text-white hover:bg-red-500 hover:border-red-600 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white rounded cursor-pointer flex items-center justify-center transition-colors"
                          title="Unassign Workout"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Details - Mobile: Full width, Desktop: Side */}
                    <div className="flex items-center gap-2 text-xs sm:ml-0 sm:flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className={`${theme.textSecondary} font-medium`}>
                          {new Date(workout.scheduled_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {workout.workout_templates?.estimated_duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                          <span className={`${theme.textSecondary} font-medium`}>
                            {workout.workout_templates.estimated_duration}m
                          </span>
                        </div>
                      )}
                      
                      {workout.workout_templates?.difficulty_level && (
                        <div className="flex items-center gap-1">
                          <Dumbbell className="w-3 h-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                          <span className={`${theme.textSecondary} font-medium`}>
                            {workout.workout_templates.difficulty_level}
                          </span>
                        </div>
                      )}

                      {workout.status === 'active' && (
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg animate-pulse">
                          ⭐ ACTIVE
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })
        )}
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