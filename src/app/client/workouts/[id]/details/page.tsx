'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Target, Dumbbell, Play, Video, RefreshCw, Trophy, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'

interface WorkoutTemplate {
  id: string
  name: string
  description: string
  estimated_duration: number
}

interface Exercise {
  id: string
  name: string
  description: string
  sets: number
  reps: number
  weight?: number
  rest_seconds: number
  order_index: number
  exercise_type?: string
  video_url?: string
  previous_performance?: {
    weight: number
    reps: number
    date: string
  }
}

export default function WorkoutDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  // supabase is imported from @/lib/supabase
  const { isDark, getThemeStyles } = useTheme()
  const [workout, setWorkout] = useState<WorkoutTemplate | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadWorkoutDetails(id as string).catch(error => {
        console.error('Error loading workout details:', error)
        setError('Failed to load workout details')
        setLoading(false)
      })
    }
  }, [id])

  const loadWorkoutDetails = async (templateId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Get workout template details
      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .select('id, name, description, estimated_duration')
        .eq('id', templateId)
        .single()

      if (templateError) {
        console.error('Error fetching workout template:', templateError)
        setError('Failed to load workout details')
        return
      }

      setWorkout(template)

      // Get exercises for this workout
      const { data: exerciseTemplates, error: exercisesError } = await supabase
        .from('workout_template_exercises')
        .select(`
          id,
          exercise_id,
          sets,
          reps,
          rest_seconds,
          order_index,
          notes
        `)
        .eq('template_id', templateId)
        .order('order_index', { ascending: true })

      if (exercisesError) {
        console.error('Error fetching exercises:', exercisesError)
        setError('Failed to load exercises')
        return
      }

          // Get exercise details
          let exercisesWithDetails: Exercise[] = []
          if (exerciseTemplates && exerciseTemplates.length > 0) {
            const exerciseIds = exerciseTemplates.map(et => et.exercise_id).filter(id => id)
            
            if (exerciseIds.length > 0) {
              const { data: exerciseDetails, error: exerciseDetailsError } = await supabase
                .from('exercises')
                .select('id, name, description, video_url')
                .in('id', exerciseIds)
              
              if (exerciseDetailsError) {
                console.error('Error fetching exercise details:', exerciseDetailsError)
                setError('Failed to load exercise details')
                return
              }

              // Get additional exercise IDs from notes (for Giant Sets, Circuits, Tabata, etc.)
              const additionalExerciseIds = new Set()
              exerciseTemplates.forEach(template => {
                if (template.notes) {
                  try {
                    const notesData = typeof template.notes === 'string' ? JSON.parse(template.notes) : template.notes
                    if (notesData.giant_set_exercises) {
                      notesData.giant_set_exercises.forEach((ex: any) => {
                        if (ex.exercise_id) additionalExerciseIds.add(ex.exercise_id)
                      })
                    }
                    if (notesData.circuit_sets) {
                      notesData.circuit_sets.forEach((set: any) => {
                        if (set.exercises) {
                          set.exercises.forEach((ex: any) => {
                            if (ex.exercise_id) additionalExerciseIds.add(ex.exercise_id)
                          })
                        }
                      })
                    }
                    if (notesData.tabata_sets) {
                      notesData.tabata_sets.forEach((set: any) => {
                        if (set.exercises) {
                          set.exercises.forEach((ex: any) => {
                            if (ex.exercise_id) additionalExerciseIds.add(ex.exercise_id)
                          })
                        }
                      })
                    }
                    if (notesData.superset_exercise_id) {
                      additionalExerciseIds.add(notesData.superset_exercise_id)
                    }
                    if (notesData.compound_exercise_id) {
                      additionalExerciseIds.add(notesData.compound_exercise_id)
                    }
                  } catch (error) {
                    console.log('Error parsing notes for additional exercises:', error)
                  }
                }
              })

              // Fetch additional exercise details
              let allExerciseDetails = [...(exerciseDetails || [])]
              if (additionalExerciseIds.size > 0) {
                const additionalIds = Array.from(additionalExerciseIds).filter(id => !exerciseIds.includes(id))
                if (additionalIds.length > 0) {
                  const { data: additionalDetails, error: additionalError } = await supabase
                    .from('exercises')
                    .select('id, name, description, video_url')
                    .in('id', additionalIds)
                  
                  if (!additionalError && additionalDetails) {
                    allExerciseDetails = [...allExerciseDetails, ...additionalDetails]
                  }
                }
              }

          // Get previous performance data (mock for now - you can implement this later)
          // const { data: previousWorkouts } = await supabase
          //   .from('workout_logs')
          //   .select('*')
          //   .in('exercise_id', exerciseIds)
          //   .order('created_at', { ascending: false })

          // Combine the data and extract exercise types from notes
          exercisesWithDetails = exerciseTemplates.map((template, index) => {
            const exerciseDetail = exerciseDetails?.find(ed => ed.id === template.exercise_id)
            
            // Extract exercise type and detailed data from notes JSON
            let exerciseType = 'Straight Set'
            let targetWeight = 0
            let exerciseData = null
            let sets = []
            
            try {
              if (template.notes) {
                const notesData = typeof template.notes === 'string' ? JSON.parse(template.notes) : template.notes
                
                // Log the full notes data to understand structure
                console.log(`🔍 Workout Details - Raw notes for exercise ${index + 1}:`, notesData)
                
                if (notesData.exercise_type) {
                  exerciseType = notesData.exercise_type
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')
                }
                
                // Extract weight from notes if available
                if (notesData.weight) {
                  targetWeight = notesData.weight
                }
                
                // Extract specific data based on exercise type
                switch (notesData.exercise_type) {
                  case 'giant_set':
                    exerciseData = {
                      exercises: notesData.giant_set_exercises || [],
                      rest_seconds: notesData.rest_seconds || template.rest_seconds
                    }
                    break
                  case 'superset':
                    exerciseData = {
                      exercise_a: template.reps,
                      exercise_b: notesData.superset_reps || template.reps,
                      superset_exercise_id: notesData.superset_exercise_id, // Add the superset partner exercise ID
                      rest_seconds: notesData.rest_seconds || template.rest_seconds
                    }
                    break
                  case 'amrap':
                    exerciseData = {
                      duration: notesData.amrap_duration || template.reps,
                      rest_seconds: notesData.rest_seconds || template.rest_seconds
                    }
                    break
                  case 'circuit':
                    exerciseData = {
                      rounds: template.sets,
                      exercises: notesData.circuit_sets || [],
                      rest_seconds: notesData.rest_seconds || template.rest_seconds
                    }
                    break
                  case 'tabata':
                    exerciseData = {
                      rounds: notesData.rounds || template.sets,
                      work_seconds: notesData.work_seconds || 20,
                      rest_seconds: notesData.rest_seconds || 10,
                      exercises: notesData.tabata_sets || []
                    }
                    break
                  case 'drop_set':
                    exerciseData = {
                      sets: template.sets,
                      reps: template.reps,
                      drop_percentage: notesData.drop_percentage,
                      drop_reps: notesData.drop_set_reps,
                      rest_seconds: notesData.rest_seconds || template.rest_seconds
                    }
                    break
                  case 'cluster_set':
                    exerciseData = {
                      sets: template.sets,
                      cluster_reps: notesData.cluster_reps,
                      rest_seconds: notesData.rest_seconds || template.rest_seconds
                    }
                    break
                  case 'rest_pause':
                    exerciseData = {
                      sets: template.sets,
                      pause_duration: notesData.rest_pause_duration,
                      rest_seconds: notesData.rest_seconds || template.rest_seconds
                    }
                    break
                  case 'emom':
                    exerciseData = {
                      duration: notesData.emom_duration,
                      work_seconds: notesData.work_seconds,
                      reps: notesData.emom_reps || template.reps
                    }
                    break
                  case 'for_time':
                    exerciseData = {
                      target_reps: notesData.target_reps,
                      time_cap: notesData.time_cap
                    }
                    break
                  case 'pre_exhaustion':
                    exerciseData = {
                      sets: template.sets,
                      reps: template.reps,
                      compound_exercise_id: notesData.compound_exercise_id,
                      rest_seconds: notesData.rest_seconds || template.rest_seconds
                    }
                    break
                  default:
                    exerciseData = {
                      sets: template.sets,
                      reps: template.reps,
                      rest_seconds: template.rest_seconds
                    }
                }
              }
            } catch (error) {
              console.log(`Error parsing notes for exercise ${index + 1}:`, error)
            }

            // Determine the display name - exercise type for multi-exercise types, exercise name for single exercises
            const isMultiExercise = ['Giant Set', 'Superset', 'Circuit'].includes(exerciseType)
            const displayName = isMultiExercise ? exerciseType : (exerciseDetail?.name || `Exercise ${index + 1}`)

            const finalExerciseData = {
              id: template.id,
              exercise_id: template.exercise_id, // Add the exercise_id from template
              name: displayName, // Use exercise type for multi-exercise, exercise name for single exercises
              description: exerciseDetail?.description || '',
              sets: template.sets || 1,
              reps: template.reps || 0,
              weight: targetWeight,
              rest_seconds: template.rest_seconds || 60,
              order_index: template.order_index || index,
              exercise_type: exerciseType,
              video_url: exerciseDetail?.video_url || '',
              notes_data: exerciseData, // Raw exercise data from notes
              sets_data: sets, // Sets information from notes
              all_exercise_details: allExerciseDetails, // All exercise details for name lookup
              previous_performance: {
                weight: 0, // Mock data - implement actual previous performance lookup
                reps: 0,
                date: ''
              }
            }
            
            // Debug logging to understand the data
            console.log(`🔍 Workout Details - Exercise ${index + 1}:`, {
              name: finalExerciseData.name,
              exercise_id: template.exercise_id,
              template_sets: template.sets,
              template_reps: template.reps,
              template_rest: template.rest_seconds,
              exercise_type: exerciseType,
              notes_data: exerciseData,
              sets_data: sets,
              all_exercise_details: allExerciseDetails,
              exercise_details_count: allExerciseDetails.length,
              raw_notes: template.notes,
              raw_notes_string: typeof template.notes === 'string' ? template.notes : JSON.stringify(template.notes)
            })
            
            // Also log the template object to see all available fields
            console.log(`🔍 Workout Details - Full template object ${index + 1}:`, template)
            
            return finalExerciseData
          })
        }
      }

      setExercises(exercisesWithDetails)
    } catch (error) {
      console.error('Error loading workout details:', error)
      setError('Failed to load workout details')
    } finally {
      setLoading(false)
    }
  }


  const renderExerciseDetails = (exercise: any) => {
    const styles = getThemeStyles()
    
    // Handle different exercise types
    switch (exercise.exercise_type) {
      case 'Giant Set':
        return renderGiantSetDetails(exercise, styles)
      case 'Superset':
        return renderSupersetDetails(exercise, styles)
      case 'Amrap':
        return renderAmrapDetails(exercise, styles)
      case 'Circuit':
        return renderCircuitDetails(exercise, styles)
      case 'Tabata':
        return renderTabataDetails(exercise, styles)
      case 'Drop Set':
        return renderDropSetDetails(exercise, styles)
      case 'Cluster Set':
        return renderClusterSetDetails(exercise, styles)
      case 'Rest Pause':
        return renderRestPauseDetails(exercise, styles)
      case 'Emom':
        return renderEmomDetails(exercise, styles)
      case 'For Time':
        return renderForTimeDetails(exercise, styles)
      case 'Pre Exhaustion':
        return renderPreExhaustionDetails(exercise, styles)
      default:
        return renderStraightSetDetails(exercise, styles)
    }
  }

  const renderStraightSetDetails = (exercise: any, styles: any) => (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span className={styles.textSecondary}>Sets:</span>
        <span className={styles.text}>{exercise.sets}</span>
      </div>
      <div className="flex justify-between">
        <span className={styles.textSecondary}>Reps:</span>
        <span className={styles.text}>{exercise.reps > 0 ? exercise.reps : ''}</span>
      </div>
      {exercise.weight > 0 && (
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Weight:</span>
          <span className={styles.text}>{exercise.weight}kg</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className={styles.textSecondary}>Rest:</span>
        <span className={styles.text}>{exercise.rest_seconds}s</span>
      </div>
    </div>
  )

  const renderGiantSetDetails = (exercise: any, styles: any) => {
    const data = exercise.notes_data
    const exercises = data?.exercises || []
    const exerciseDetails = exercise.all_exercise_details || []
    
    // Debug logging
    console.log('🔍 Giant Set Debug:', {
      exercise_name: exercise.name,
      exercise_id: exercise.exercise_id,
      notes_data: data,
      exercises_in_notes: exercises,
      all_exercise_details: exerciseDetails,
      exercise_details_count: exerciseDetails.length
    })
    
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Sets:</span>
          <span className={styles.text}>{exercise.sets}</span>
        </div>
        {exercises.length > 0 ? (
          <div className="space-y-1">
            {exercises.map((ex: any, index: number) => {
              // Look up the actual exercise name from the exercise details
              const exerciseDetail = exerciseDetails.find((ed: any) => ed.id === ex.exercise_id)
              const exerciseName = exerciseDetail?.name || `Exercise ${index + 1}`
              return (
                <div key={index} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                  <div className="flex-1">
                    <div className={styles.textSecondary}>{exerciseName}</div>
                    {ex.reps && <div className={styles.text}>{ex.reps} reps</div>}
                  </div>
                  <div className="flex gap-1">
                    {exerciseDetail?.video_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(exerciseDetail.video_url, '_blank')}
                        className="text-xs px-2 py-1 h-6"
                      >
                        <Video className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        console.log('Exercise swap clicked for:', exerciseName)
                      }}
                      className="text-xs px-2 py-1 h-6"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex justify-between">
            <span className={styles.textSecondary}>Reps:</span>
            {exercise.reps && <span className={styles.text}>{exercise.reps}</span>}
          </div>
        )}
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Rest:</span>
          <span className={styles.text}>{data?.rest_seconds || exercise.rest_seconds || 0}s</span>
        </div>
      </div>
    )
  }

  const renderSupersetDetails = (exercise: any, styles: any) => {
    const data = exercise.notes_data
    const exerciseDetails = exercise.all_exercise_details || []
    
    // Debug logging
    console.log('🔍 Superset Debug:', {
      exercise_name: exercise.name,
      exercise_id: exercise.exercise_id,
      notes_data: data,
      superset_exercise_id: data?.superset_exercise_id,
      all_exercise_details: exerciseDetails,
      exercise_details_count: exerciseDetails.length
    })
    
    // Get the exercise names for the superset
    // For Exercise A, we need to get the main exercise from the current workout template
    const exerciseADetail = exerciseDetails.find((ed: any) => ed.id === exercise.exercise_id) // Current exercise
    const exerciseBDetail = exerciseDetails.find((ed: any) => ed.id === data?.superset_exercise_id) // Superset partner
    
    const exerciseAName = exerciseADetail?.name || 'Exercise A'
    const exerciseBName = exerciseBDetail?.name || 'Exercise B'
    
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Sets:</span>
          <span className={styles.text}>{exercise.sets}</span>
        </div>
        <div className="space-y-2">
          {/* Exercise A */}
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
            <div className="flex-1">
              <div className={styles.textSecondary}>{exerciseAName}</div>
              {(data?.work_time || data?.exercise_a) && <div className={styles.text}>{data?.work_time || data?.exercise_a} {data?.work_time ? 'sec' : 'reps'}</div>}
            </div>
            <div className="flex gap-1">
              {exerciseADetail?.video_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(exerciseADetail.video_url, '_blank')}
                  className="text-xs px-2 py-1 h-6"
                >
                  <Video className="w-3 h-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  console.log('Exercise swap clicked for:', exerciseAName)
                }}
                className="text-xs px-2 py-1 h-6"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {/* Exercise B */}
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
            <div className="flex-1">
              <div className={styles.textSecondary}>{exerciseBName}</div>
              {(data?.work_time || data?.exercise_b) && <div className={styles.text}>{data?.work_time || data?.exercise_b} {data?.work_time ? 'sec' : 'reps'}</div>}
            </div>
            <div className="flex gap-1">
              {exerciseBDetail?.video_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(exerciseBDetail.video_url, '_blank')}
                  className="text-xs px-2 py-1 h-6"
                >
                  <Video className="w-3 h-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  console.log('Exercise swap clicked for:', exerciseBName)
                }}
                className="text-xs px-2 py-1 h-6"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Rest:</span>
          <span className={styles.text}>{data?.rest_seconds || exercise.rest_seconds || 0}s</span>
        </div>
      </div>
    )
  }

  const renderAmrapDetails = (exercise: any, styles: any) => {
    const data = exercise.notes_data
    return (
      <div className="space-y-1 text-sm">
        {data?.duration && (
          <div className="flex justify-between">
            <span className={styles.textSecondary}>Duration:</span>
            <span className={styles.text}>{data.duration} min</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Format:</span>
          <span className={styles.text}>AMRAP</span>
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Rest:</span>
          <span className={styles.text}>{data?.rest_seconds || exercise.rest_seconds || 0}s</span>
        </div>
      </div>
    )
  }

  const renderCircuitDetails = (exercise: any, styles: any) => {
    const data = exercise.notes_data
    const circuitSets = data?.exercises || []
    const exerciseDetails = exercise.all_exercise_details || []
    
    // Debug logging
    console.log('🔍 Circuit Debug:', {
      exercise_name: exercise.name,
      notes_data: data,
      circuit_sets: circuitSets,
      all_exercise_details: exerciseDetails
    })
    
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Rounds:</span>
          <span className={styles.text}>{data?.rounds || exercise.sets}</span>
        </div>
        {circuitSets.length > 0 ? (
          <div className="space-y-3 mt-3">
            {circuitSets.map((set: any, setIndex: number) => {
              const setExercises = set.exercises || []
              return (
                <div key={setIndex} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`${styles.textSecondary} text-xs font-semibold`}>
                      Set {setIndex + 1}
                    </div>
                    {set.rest_between_sets && (
                      <div className={`${styles.textSecondary} text-xs`}>
                        • Rest: {set.rest_between_sets}s
                      </div>
                    )}
                  </div>
                  {setExercises.map((ex: any, exIndex: number) => {
                    const exerciseDetail = exerciseDetails.find((ed: any) => ed.id === ex.exercise_id)
                    const exerciseName = exerciseDetail?.name || `Exercise ${exIndex + 1}`
                    return (
                      <div key={exIndex} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                        <div className="flex-1">
                          <div className={styles.textSecondary}>{exerciseName}</div>
                          <div className={styles.text}>
                            {ex.work_seconds || exercise.work_seconds || 'N/A'}s work
                            {(ex.rest_after || exercise.rest_after) && ` • ${ex.rest_after || exercise.rest_after}s rest after`}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {exerciseDetail?.video_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(exerciseDetail.video_url, '_blank')}
                              className="text-xs px-2 py-1 h-6"
                            >
                              <Video className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('Exercise swap clicked for:', exerciseName)
                            }}
                            className="text-xs px-2 py-1 h-6"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex justify-between">
            <span className={styles.textSecondary}>Reps:</span>
            <span className={styles.text}>{exercise.reps || 'AMRAP'}</span>
          </div>
        )}
      </div>
    )
  }

  const renderTabataDetails = (exercise: any, styles: any) => {
    const data = exercise.notes_data
    const tabataSets = data?.exercises || []
    const exerciseDetails = exercise.all_exercise_details || []
    
    // Debug logging
    console.log('🔍 Tabata Debug:', {
      exercise_name: exercise.name,
      notes_data: data,
      tabata_sets: tabataSets,
      all_exercise_details: exerciseDetails
    })
    
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Sets:</span>
          <span className={styles.text}>{tabataSets.length || 1}</span>
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Work:</span>
          <span className={styles.text}>{data?.work_seconds || 20}s</span>
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Rest:</span>
          <span className={styles.text}>{data?.rest_seconds || 10}s</span>
        </div>
        {tabataSets.length > 0 && (
          <div className="space-y-3 mt-3">
            {tabataSets.map((set: any, setIndex: number) => {
              const setExercises = set.exercises || []
              return (
                <div key={setIndex} className="space-y-2">
                  <div className={`${styles.textSecondary} text-xs font-semibold`}>
                    Set {setIndex + 1}:
                  </div>
                  {setExercises.map((ex: any, exIndex: number) => {
                    const exerciseDetail = exerciseDetails.find((ed: any) => ed.id === ex.exercise_id)
                    const exerciseName = exerciseDetail?.name || `Exercise ${exIndex + 1}`
                    return (
                      <div key={exIndex} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                        <div className="flex-1">
                          <div className={styles.textSecondary}>{exerciseName}</div>
                          <div className={styles.text}>{ex.work_seconds || data?.work_seconds || 20}s work</div>
                        </div>
                        <div className="flex gap-1">
                          {exerciseDetail?.video_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(exerciseDetail.video_url, '_blank')}
                              className="text-xs px-2 py-1 h-6"
                            >
                              <Video className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('Exercise swap clicked for:', exerciseName)
                            }}
                            className="text-xs px-2 py-1 h-6"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // New render functions for additional exercise types
  const renderDropSetDetails = (exercise: any, styles: any) => {
    const data = exercise.notes_data
    return (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Sets:</span>
          <span className={styles.text}>{data?.sets || exercise.sets}</span>
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Initial Reps:</span>
          <span className={styles.text}>{data?.reps || exercise.reps}</span>
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Drop %:</span>
          {data?.drop_percentage && <span className={styles.text}>{data.drop_percentage}%</span>}
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Drop Reps:</span>
          {data?.drop_reps && <span className={styles.text}>{data.drop_reps}</span>}
        </div>
      </div>
    )
  }

  const renderClusterSetDetails = (exercise: any, styles: any) => {
    const data = exercise.notes_data
    return (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Sets:</span>
          <span className={styles.text}>{data?.sets || exercise.sets}</span>
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Cluster Reps:</span>
          {data?.cluster_reps && <span className={styles.text}>{data.cluster_reps}</span>}
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Rest:</span>
          <span className={styles.text}>{data?.rest_seconds || exercise.rest_seconds || 0}s</span>
        </div>
      </div>
    )
  }

  const renderRestPauseDetails = (exercise: any, styles: any) => {
    const data = exercise.notes_data
    return (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Sets:</span>
          <span className={styles.text}>{data?.sets || exercise.sets}</span>
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Pause Duration:</span>
          {data?.pause_duration && <span className={styles.text}>{data.pause_duration}s</span>}
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Rest:</span>
          <span className={styles.text}>{data?.rest_seconds || exercise.rest_seconds || 0}s</span>
        </div>
      </div>
    )
  }

  const renderEmomDetails = (exercise: any, styles: any) => {
    const data = exercise.notes_data
    return (
      <div className="space-y-1 text-sm">
        {data?.duration && (
          <div className="flex justify-between">
            <span className={styles.textSecondary}>Duration:</span>
            <span className={styles.text}>{data.duration} min</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Work:</span>
          {data?.work_seconds && <span className={styles.text}>{data.work_seconds}s</span>}
        </div>
        {data?.reps && (
          <div className="flex justify-between">
            <span className={styles.textSecondary}>Reps:</span>
            <span className={styles.text}>{data.reps}</span>
          </div>
        )}
      </div>
    )
  }

  const renderForTimeDetails = (exercise: any, styles: any) => {
    const data = exercise.notes_data
    return (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Target Reps:</span>
          {data?.target_reps && <span className={styles.text}>{data.target_reps}</span>}
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Time Cap:</span>
          {data?.time_cap && <span className={styles.text}>{data.time_cap} min</span>}
        </div>
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Format:</span>
          <span className={styles.text}>For Time</span>
        </div>
      </div>
    )
  }

  const renderPreExhaustionDetails = (exercise: any, styles: any) => {
    const data = exercise.notes_data
    const exerciseDetails = exercise.all_exercise_details || []
    
    // Get the compound exercise details
    const compoundExerciseDetail = exerciseDetails.find((ed: any) => ed.id === data?.compound_exercise_id)
    
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Sets:</span>
          {data?.sets && <span className={styles.text}>{data.sets}</span>}
        </div>
        {data?.reps && (
          <div className="flex justify-between">
            <span className={styles.textSecondary}>Reps:</span>
            <span className={styles.text}>{data.reps}</span>
          </div>
        )}
        {compoundExerciseDetail?.name && (
          <div className="flex justify-between">
            <span className={styles.textSecondary}>Compound Exercise:</span>
            <span className={styles.text}>{compoundExerciseDetail.name}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className={styles.textSecondary}>Rest:</span>
          {data?.rest_seconds && <span className={styles.text}>{data.rest_seconds}s</span>}
        </div>
      </div>
    )
  }

  const styles = getThemeStyles()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#E8E9F3', padding: '24px 20px' }}>
        <div className="container mx-auto">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>Loading workout details...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !workout) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#E8E9F3', padding: '24px 20px' }}>
        <div className="container mx-auto">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <p style={{ color: '#EF4444', marginBottom: '16px', fontSize: '16px', fontWeight: '400' }}>{error || 'Workout not found'}</p>
              <Button onClick={() => window.location.href = '/client'} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#E8E9F3', padding: '24px 20px', paddingBottom: '100px' }}>
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
          <a 
            href="/client"
            className="flex items-center cursor-pointer no-underline"
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              backgroundColor: '#FFFFFF',
              color: '#6B7280',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s'
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </a>
        </div>

        {/* Workout Header */}
        <Card style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          marginBottom: '20px',
          border: 'none'
        }}>
          <CardHeader style={{ padding: '0' }}>
            <div className="flex items-center justify-between">
              <CardTitle style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#1A1A1A',
                margin: '0'
              }}>
                {workout.name}
              </CardTitle>
              <Badge style={{
                backgroundColor: '#EDE7F6',
                color: '#6C5CE7',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: 'none'
              }}>
                <Clock className="w-3 h-3" />
                {workout.estimated_duration} min
              </Badge>
            </div>
            {workout.description && (
              <p style={{
                fontSize: '14px',
                fontWeight: '400',
                color: '#6B7280',
                marginTop: '12px'
              }}>
                {workout.description}
              </p>
            )}
          </CardHeader>
        </Card>

        {/* Exercises */}
        <Card style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: 'none'
        }}>
          <CardHeader style={{ padding: '0', marginBottom: '20px' }}>
            <CardTitle style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1A1A1A',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '0'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Dumbbell style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
              </div>
              <span>Exercises ({exercises.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent style={{ padding: '0' }}>
            {exercises.length === 0 ? (
              <p style={{
                fontSize: '14px',
                fontWeight: '400',
                color: '#6B7280',
                textAlign: 'center',
                padding: '32px 0'
              }}>
                No exercises found for this workout.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {exercises.map((exercise, index) => (
                  <div 
                    key={exercise.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      border: '2px solid #E5E7EB'
                    }}
                  >
                    {/* Exercise Header */}
                    <div className="flex items-start justify-between" style={{ marginBottom: '16px' }}>
                      <div className="flex-1">
                        <div className="flex items-center" style={{ gap: '12px', marginBottom: '8px' }}>
                          <h3 style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#1A1A1A'
                          }}>
                            {index + 1}. {exercise.name}
                          </h3>
                          {exercise.exercise_type && (
                            <Badge variant="outline" style={{
                              backgroundColor: '#EDE7F6',
                              color: '#6C5CE7',
                              fontSize: '12px',
                              fontWeight: '600',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              border: 'none'
                            }}>
                              {exercise.exercise_type}
                            </Badge>
                          )}
                        </div>
                        {exercise.description && (
                          <p style={{
                            fontSize: '14px',
                            fontWeight: '400',
                            color: '#6B7280',
                            lineHeight: '1.5'
                          }}>
                            {exercise.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Action Buttons - Only show for single-exercise types */}
                      {!['Giant Set', 'Superset', 'Circuit', 'Tabata', 'Pre Exhaustion'].includes(exercise.exercise_type) && (
                        <div className="flex gap-2 ml-4">
                          {exercise.video_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(exercise.video_url, '_blank')}
                              className={`${styles.secondary} border-gray-300 dark:border-gray-600`}
                            >
                              <Video className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // TODO: Implement exercise swap modal
                              console.log('Exercise swap clicked for:', exercise.name)
                            }}
                            className={`${styles.secondary} border-gray-300 dark:border-gray-600`}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Exercise Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '16px' }}>
                      {/* Current Workout */}
                      <div style={{
                        backgroundColor: '#EDE7F6',
                        borderRadius: '24px',
                        padding: '20px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                      }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1A1A1A',
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <Target style={{ width: '20px', height: '20px', color: '#6C5CE7' }} />
                          Today's Target
                        </h4>
                        {renderExerciseDetails(exercise)}
                      </div>

                      {/* Previous Performance */}
                      <div style={{
                        backgroundColor: '#E3F2FD',
                        borderRadius: '24px',
                        padding: '20px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                      }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1A1A1A',
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <Trophy style={{ width: '20px', height: '20px', color: '#2196F3' }} />
                          Last Performance
                        </h4>
                        {exercise.previous_performance?.date ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className={styles.textSecondary}>Date:</span>
                              <span className={styles.text}>
                                {new Date(exercise.previous_performance.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={styles.textSecondary}>Weight:</span>
                              <span className={styles.text}>
                                {exercise.previous_performance.weight}kg
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={styles.textSecondary}>Reps:</span>
                              <span className={styles.text}>
                                {exercise.previous_performance.reps}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className={`${styles.textSecondary} text-sm mb-2`}>
                              No previous performance data
                            </p>
                            <TrendingUp className={`w-8 h-8 mx-auto ${styles.textSecondary}`} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Button */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Button 
            onClick={() => router.push(`/client/workouts/${id}/start`)}
            style={{
              backgroundColor: '#4CAF50',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: '600',
              padding: '16px 32px',
              borderRadius: '20px',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Play className="w-5 h-5" />
            Start Workout
          </Button>
        </div>
      </div>
    </div>
  )
}
