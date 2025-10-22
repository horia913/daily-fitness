'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { WorkoutTemplate } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import { useExerciseLibrary } from '@/hooks/useCoachData'
import { useAuth } from '@/contexts/AuthContext'
import { 
  X, 
  Dumbbell, 
  Clock, 
  Users, 
  Star, 
  Edit, 
  Copy, 
  Trash2,
  Heart,
  Zap,
  Activity,
  Settings,
  ChevronRight
} from 'lucide-react'

interface WorkoutTemplateDetailsProps {
  isOpen: boolean
  onClose: () => void
  template: WorkoutTemplate
  onEdit?: (template: WorkoutTemplate) => void
}

export default function WorkoutTemplateDetails({ 
  isOpen, 
  onClose, 
  template,
  onEdit 
}: WorkoutTemplateDetailsProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const isDark = theme.background.includes('slate-900')
  const { user } = useAuth()

  // Load exercises for name lookup
  const { exercises: availableExercises } = useExerciseLibrary(user?.id || '')

  const [exercises, setExercises] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set())

  const difficultyColors = {
    'beginner': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'intermediate': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'advanced': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case 'strength': return Dumbbell
      case 'cardio': return Heart
      case 'hiit': return Zap
      case 'flexibility': return Activity
      default: return Dumbbell
    }
  }

  const CategoryIcon = getCategoryIcon(template.category || '')

  const toggleExerciseExpansion = (exerciseId: string) => {
    setExpandedExercises(prev => {
      const newSet = new Set(prev)
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId)
      } else {
        newSet.add(exerciseId)
      }
      return newSet
    })
  }

  useEffect(() => {
    if (isOpen && template) {
      loadTemplateExercises()
    }
  }, [isOpen, template])

  const loadTemplateExercises = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('workout_template_exercises')
        .select(`
          *,
          exercise:exercises(id, name, description)
        `)
        .eq('template_id', template.id)
        .order('order_index', { ascending: true })

      if (error) throw error
      
      // Parse complex exercise data from notes field
      const parsedExercises = (data || []).map(exercise => {
        let parsedExercise = { ...exercise }
        
        // Try to parse JSON from notes field
        if (exercise.notes) {
          try {
            const complexData = JSON.parse(exercise.notes)
            // Restore complex exercise data from JSON
            parsedExercise = {
              ...exercise,
              ...complexData,
              // Keep the original notes if it's not JSON
              notes: typeof complexData === 'object' ? (complexData.notes || '') : exercise.notes
            }
            console.log('🔍 WorkoutTemplateDetails - Restored complex exercise data:', {
              id: exercise.id,
              exercise_type: complexData.exercise_type,
              tabata_sets: complexData.tabata_sets,
              circuit_sets: complexData.circuit_sets,
              rounds: complexData.rounds,
              work_seconds: complexData.work_seconds,
              rest_seconds: complexData.rest_seconds,
              work_seconds_type: typeof complexData.work_seconds,
              rest_after: complexData.rest_after,
              fullComplexData: complexData,
              originalNotes: exercise.notes,
              notesLength: exercise.notes?.length || 0
            })
            
          } catch (e) {
            // If parsing fails, keep original notes (it's regular text)
            console.log('🔍 WorkoutTemplateDetails - Notes field is regular text, not JSON:', exercise.notes)
          }
        }
        
        return parsedExercise
      })
      
      setExercises(parsedExercises)
    } catch (error) {
      console.error('Error loading template exercises:', error)
      setExercises([])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-8 pb-8 ${isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/50 backdrop-blur-sm'}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-theme={isDark ? 'dark' : 'light'}
    >
      <div 
        className={`relative ${theme.card} ${theme.shadow} rounded-3xl border ${theme.border} w-full flex flex-col transform transition-all duration-300 ease-out overflow-hidden`}
        style={{
          animation: 'modalSlideIn 0.3s ease-out',
          height: 'min(90vh, calc(100vh - 2rem))',
          maxHeight: 'min(90vh, calc(100vh - 2rem))',
          maxWidth: 'min(98vw, 90rem)'
        }}
      >
        {/* Header */}
        <div className={`sticky top-0 ${theme.card} border-b ${theme.border} px-3 sm:px-6 py-5 rounded-t-3xl`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-lg`}>
                <CategoryIcon className={`w-6 h-6 text-white`} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className={`text-lg sm:text-2xl font-bold ${theme.text} break-words`}>
                  {template.name}
                </h2>
                <p className={`text-xs sm:text-sm ${theme.textSecondary} mt-1 break-words`}>
                  {template.category || 'General'} • {template.difficulty_level}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 pb-6">
          <div className="space-y-6 w-full">
            {/* Template Overview */}
            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-lg`}>
                    <Settings className={`w-5 h-5 text-white`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>Template Overview</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className={`text-sm font-medium ${theme.text}`}>Duration</span>
                    </div>
                    <p className={`text-2xl font-bold ${theme.text}`}>{template.estimated_duration}m</p>
                  </div>
                  
                  <div className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Dumbbell className="w-4 h-4 text-green-500" />
                      <span className={`text-sm font-medium ${theme.text}`}>Exercises</span>
                    </div>
                    <p className={`text-2xl font-bold ${theme.text}`}>{exercises.length}</p>
                  </div>
                  
                  <div className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      <span className={`text-sm font-medium ${theme.text}`}>Usage</span>
                    </div>
                    <p className={`text-2xl font-bold ${theme.text}`}>{template.usage_count || 0}</p>
                  </div>
                  
                  <div className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className={`text-sm font-medium ${theme.text}`}>Rating</span>
                    </div>
                    <p className={`text-2xl font-bold ${theme.text}`}>{template.rating || 0}</p>
                  </div>
                </div>

                {template.description && (
                  <div className="mt-6">
                    <h4 className={`text-lg font-semibold ${theme.text} mb-2`}>Description</h4>
                    <p className={`${theme.textSecondary} leading-relaxed`}>{template.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exercises */}
            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-lg`}>
                    <Dumbbell className={`w-5 h-5 text-white`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>
                    Exercises ({exercises.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`${theme.card} rounded-xl p-4 animate-pulse`}>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-lg"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : exercises.length > 0 ? (
                  <div className="space-y-4">
                    {exercises.map((exercise, index) => {
                      const isExpanded = expandedExercises.has(exercise.id)
                      
                      // Count how many exercises of the same type have appeared before this one
                      const sameTypeCount = exercises.slice(0, index).filter(ex => ex.exercise_type === exercise.exercise_type).length
                      const exerciseNumber = sameTypeCount + 1
                      
                      // Debug logging for exercise type
                      console.log('🔍 WorkoutTemplateDetails - Displaying exercise:', {
                        id: exercise.id,
                        name: exercise.exercise?.name,
                        exercise_type: exercise.exercise_type,
                        exercise_type_raw: exercise.exercise_type,
                        isTabata: exercise.exercise_type === 'tabata',
                        rounds: exercise.rounds,
                        work_seconds: exercise.work_seconds,
                        tabata_sets: exercise.tabata_sets,
                        allKeys: Object.keys(exercise)
                      })
                      
                      return (
                        <div key={exercise.id} className={`${theme.card} border ${theme.border} rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md`}>
                          {/* Clickable Header */}
                          <div 
                            className="p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                            onClick={() => toggleExerciseExpansion(exercise.id)}
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-2 mb-1">
                                  <h4 className={`font-semibold ${theme.text} break-words`}>
                                    {exercise.exercise_type === 'circuit' 
                                      ? `Circuit ${exerciseNumber}` 
                                      : exercise.exercise_type === 'tabata'
                                      ? `Tabata ${exerciseNumber}`
                                      : exercise.exercise_type === 'giant_set'
                                      ? `Giant Set ${exerciseNumber}`
                                      : exercise.exercise?.name || 'Exercise'
                                    }
                                  </h4>
                                  {/* Debug: Always show exercise type */}
                                  <Badge className={`text-xs ${
                                    exercise.exercise_type === 'tabata' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' :
                                    exercise.exercise_type === 'circuit' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                                    exercise.exercise_type === 'amrap' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                    exercise.exercise_type === 'emom' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                                    exercise.exercise_type === 'superset' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                    exercise.exercise_type === 'drop_set' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                    exercise.exercise_type === 'giant_set' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300' :
                                    exercise.exercise_type === 'cluster_set' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300' :
                                    exercise.exercise_type === 'rest_pause' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300' :
                                    
                                    exercise.exercise_type === 'pre_exhaustion' ? 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-300' :
                                    exercise.exercise_type === 'for_time' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                                  }`}>
                                    {exercise.exercise_type === 'tabata' ? 'Tabata Circuit' :
                                     exercise.exercise_type === 'circuit' ? 'Circuit' :
                                     exercise.exercise_type === 'amrap' ? 'AMRAP' :
                                     exercise.exercise_type === 'emom' ? 'EMOM' :
                                     exercise.exercise_type === 'superset' ? 'Superset' :
                                     exercise.exercise_type === 'drop_set' ? 'Drop Set' :
                                     exercise.exercise_type === 'giant_set' ? 'Giant Set' :
                                     exercise.exercise_type === 'cluster_set' ? 'Cluster Set' :
                                     exercise.exercise_type === 'rest_pause' ? 'Rest-Pause' :
                                     
                                     exercise.exercise_type === 'pre_exhaustion' ? 'Pre-Exhaustion' :
                                     exercise.exercise_type === 'for_time' ? 'For Time' :
                                     exercise.exercise_type ? `Unknown: ${exercise.exercise_type}` : 'Straight Set'}
                                  </Badge>
                                  <div className={`ml-auto flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  </div>
                                </div>
                                <p className={`text-sm ${theme.textSecondary} break-words`}>
                                  {(() => {
                                    console.log('🔍 Summary text check:', {
                                      exercise_type: exercise.exercise_type,
                                      isTabata: exercise.exercise_type === 'tabata',
                                      rounds: exercise.rounds,
                                      work_seconds: exercise.work_seconds,
                                      work_seconds_type: typeof exercise.work_seconds,
                                      work_seconds_raw: exercise.work_seconds,
                                      rest_after: exercise.rest_after,
                                      tabata_sets: exercise.tabata_sets,
                                      full_exercise: exercise
                                    })
                                    
                                    if (exercise.exercise_type === 'tabata') {
                                      return (
                                        <>
                                          {exercise.rounds || 8} rounds • {exercise.work_seconds || 20}s work (actual: {exercise.work_seconds})
                                          {exercise.rest_after && ` • ${exercise.rest_after}s rest after`}
                                          {exercise.tabata_sets && ` • ${exercise.tabata_sets.length} sets`}
                                        </>
                                      )
                                    } else if (exercise.exercise_type === 'circuit') {
                                      return (
                                        <>
                                          {exercise.sets} rounds • {exercise.circuit_sets?.length || 0} exercises
                                          {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
                                        </>
                                      )
                                    } else if (exercise.exercise_type === 'amrap') {
                                      return (
                                        <>
                                          {exercise.amrap_duration} minutes • As many rounds as possible
                                        </>
                                      )
                                    } else if (exercise.exercise_type === 'emom') {
                                      return (
                                        <>
                                          {exercise.emom_duration} minutes • Every minute on the minute
                                          {exercise.emom_reps && ` • ${exercise.emom_reps} reps`}
                                          {exercise.work_seconds && ` • ${exercise.work_seconds}s work`}
                                        </>
                                      )
                                    } else if (exercise.exercise_type === 'cluster_set') {
                                      return (
                                        <>
                                          {exercise.sets} sets
                                          {exercise.cluster_reps && ` • ${exercise.cluster_reps} reps per cluster`}
                                          {exercise.clusters_per_set && ` • ${exercise.clusters_per_set} clusters per set`}
                                          {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
                                        </>
                                      )
                                    } else if (exercise.exercise_type === 'for_time') {
                                      return (
                                        <>
                                          {exercise.target_reps && `Target: ${exercise.target_reps} reps`}
                                          {exercise.time_cap && ` • Time cap: ${exercise.time_cap} min`}
                                        </>
                                      )
                                    } else if (exercise.exercise_type === 'pre_exhaustion') {
                                      return (
                                        <>
                                          {exercise.isolation_reps && `Isolation: ${exercise.isolation_reps} reps`}
                                          {exercise.compound_reps && ` • Compound: ${exercise.compound_reps} reps`}
                                          {exercise.sets && ` • ${exercise.sets} sets`}
                                          {exercise.rest_seconds && ` • Rest: ${exercise.rest_seconds}s`}
                                        </>
                                      )
                                    } else if (exercise.exercise_type === 'rest_pause') {
                                      return (
                                        <>
                                          {exercise.sets && `${exercise.sets} sets`}
                                          {exercise.rest_pause_duration && ` • RP: ${exercise.rest_pause_duration}s`}
                                          {exercise.max_rest_pauses && ` • Max pauses: ${exercise.max_rest_pauses}`}
                                          {exercise.rest_seconds && ` • Rest: ${exercise.rest_seconds}s`}
                                        </>
                                      )
                                    } else if (exercise.exercise_type === 'giant_set') {
                                      return (
                                        <>
                                          {exercise.sets} sets • {exercise.giant_set_exercises?.length || 0} exercises
                                          {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
                                        </>
                                      )
                                    } else {
                                      return (
                                        <>
                                          {exercise.sets} sets × {exercise.reps || 'N/A'} reps
                                          {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
                                          {exercise.rir && ` • RIR: ${exercise.rir}`}
                                          {exercise.tempo && ` • Tempo: ${exercise.tempo}`}
                                        </>
                                      )
                                    }
                                  })()}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700">
                              <div className="pt-4 space-y-4">
                                {/* Exercise Description - Hide for complex exercise types */}
                                {exercise.exercise?.description && !['tabata', 'circuit', 'giant_set'].includes(exercise.exercise_type) && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>Description</h5>
                                    <p className={`text-sm ${theme.textSecondary}`}>{exercise.exercise.description}</p>
                                  </div>
                                )}

                                {/* Exercise Type Specific Details */}
                                {exercise.exercise_type === 'tabata' && exercise.tabata_sets && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>Tabata Sets</h5>
                                    {(() => {
                                      console.log('🔍 Tabata sets debug:', {
                                        exercise_work_seconds: exercise.work_seconds,
                                        tabata_sets: exercise.tabata_sets,
                                        first_set_exercises: exercise.tabata_sets[0]?.exercises
                                      })
                                      return null
                                    })()}
                                    <div className="space-y-2">
                                      {exercise.tabata_sets.map((set: any, setIndex: number) => (
                                        <div key={setIndex} className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`}>
                                              Set {setIndex + 1}
                                            </span>
                                          </div>
                                          <div className="space-y-1">
                                            {set.exercises?.map((tabataExercise: any, exIndex: number) => {
                                              // Look up the exercise name from availableExercises
                                              const exerciseName = availableExercises.find(ex => ex.id === tabataExercise.exercise_id)?.name || 'Exercise'
                                              return (
                                                <div key={exIndex} className={`text-sm ${theme.textSecondary}`}>
                                                  • {exerciseName} - {tabataExercise.work_seconds || exercise.work_seconds || 20}s work
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Circuit Sets */}
                                {exercise.exercise_type === 'circuit' && exercise.circuit_sets && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>Circuit Exercises</h5>
                                    {(() => {
                                      console.log('🔍 Circuit sets debug:', {
                                        exercise_circuit_sets: exercise.circuit_sets,
                                        first_circuit_exercise: exercise.circuit_sets[0],
                                        exercise_work_seconds: exercise.work_seconds,
                                        exercise_rest_seconds: exercise.rest_seconds,
                                        exercise_rounds: exercise.rounds,
                                        circuit_sets_length: exercise.circuit_sets?.length,
                                        first_set_exercises: exercise.circuit_sets[0]?.exercises,
                                        first_set_rest: exercise.circuit_sets[0]?.rest_between_sets
                                      })
                                      return null
                                    })()}
                                    <div className="space-y-2">
                                      {exercise.circuit_sets.map((set: any, setIndex: number) => (
                                        <div key={setIndex} className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`}>
                                              Set {setIndex + 1}
                                            </span>
                                            {set.rest_between_sets && (
                                              <span className={`text-xs ${theme.textSecondary}`}>
                                                Rest: {set.rest_between_sets}s
                                              </span>
                                            )}
                                          </div>
                                          <div className="space-y-1">
                                            {set.exercises?.map((circuitExercise: any, exIndex: number) => {
                                              // Look up the exercise name from availableExercises
                                              const exerciseName = availableExercises.find(ex => ex.id === circuitExercise.exercise_id)?.name || 'Exercise'
                                              return (
                                                <div key={exIndex} className={`text-sm ${theme.textSecondary}`}>
                                                  • {exerciseName} - {circuitExercise.work_seconds || exercise.work_seconds || 'N/A'}s work
                                                  {(circuitExercise.rest_after && ` • ${circuitExercise.rest_after}s rest after`)}
                                                  {(!circuitExercise.rest_after && exercise.rest_after && ` • ${exercise.rest_after}s rest after`)}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Giant Set Exercises */}
                                {exercise.exercise_type === 'giant_set' && exercise.giant_set_exercises && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>Giant Set Exercises</h5>
                                    <div className="space-y-2">
                                      {exercise.giant_set_exercises.map((giantExercise: any, exIndex: number) => {
                                        // Look up the exercise name from availableExercises
                                        const exerciseName = availableExercises.find(ex => ex.id === giantExercise.exercise_id)?.name || 'Exercise'
                                        return (
                                          <div key={exIndex} className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className={`text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300`}>
                                                Exercise {exIndex + 1}
                                              </span>
                                            </div>
                                            <div className={`text-sm ${theme.textSecondary}`}>
                                              • {exerciseName}
                                              {giantExercise.sets && ` • ${giantExercise.sets} sets`}
                                              {giantExercise.reps && ` • ${giantExercise.reps} reps`}
                                              {giantExercise.rest_seconds && ` • ${giantExercise.rest_seconds}s rest`}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Superset Details */}
                                {exercise.exercise_type === 'superset' && exercise.superset_exercise_id && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>Superset Exercises</h5>
                                    <div className="space-y-2">
                                      <div className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className={`text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
                                            Exercise 1
                                          </span>
                                        </div>
                                        <div className={`text-sm ${theme.textSecondary}`}>
                                          • {exercise.exercise?.name || 'Main Exercise'}
                                          {exercise.sets && ` • ${exercise.sets} sets`}
                                          {exercise.reps && ` • ${exercise.reps} reps`}
                                        </div>
                                      </div>
                                      <div className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className={`text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
                                            Exercise 2
                                          </span>
                                        </div>
                                        <div className={`text-sm ${theme.textSecondary}`}>
                                          • {availableExercises.find(ex => ex.id === exercise.superset_exercise_id)?.name || 'Second Exercise'}
                                          {exercise.sets && ` • ${exercise.sets} sets`}
                                          {exercise.superset_reps && ` • ${exercise.superset_reps} reps`}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* AMRAP Details */}
                                {exercise.exercise_type === 'amrap' && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>AMRAP Details</h5>
                                    <div className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                      <div className={`text-sm ${theme.textSecondary}`}>
                                        • {exercise.exercise?.name || 'Exercise'}
                                        {exercise.amrap_duration && ` • ${exercise.amrap_duration} minutes`}
                                        {exercise.sets && ` • ${exercise.sets} rounds`}
                                        {exercise.reps && ` • ${exercise.reps} reps per round`}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* EMOM Details */}
                                {exercise.exercise_type === 'emom' && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>EMOM Details</h5>
                                    <div className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                      <div className={`text-sm ${theme.textSecondary}`}>
                                        • {exercise.exercise?.name || 'Exercise'}
                                        {exercise.emom_duration && ` • ${exercise.emom_duration} minutes`}
                                        {exercise.emom_reps && ` • ${exercise.emom_reps} reps per minute`}
                                        {exercise.work_seconds && ` • ${exercise.work_seconds}s work`}
                                        {exercise.emom_mode && ` • Mode: ${exercise.emom_mode}`}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Drop Set Details */}
                                {exercise.exercise_type === 'drop_set' && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>Drop Set Details</h5>
                                    <div className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                      <div className={`text-sm ${theme.textSecondary}`}>
                                        • {exercise.exercise?.name || 'Exercise'}
                                        {exercise.sets && ` • ${exercise.sets} sets`}
                                        {exercise.reps && ` • ${exercise.reps} reps`}
                                        {exercise.initial_weight && ` • Start: ${exercise.initial_weight}kg`}
                                        {exercise.drop_percentage && ` • Drop: ${exercise.drop_percentage}%`}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Cluster Set Details */}
                                {exercise.exercise_type === 'cluster_set' && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>Cluster Set Details</h5>
                                    <div className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                      <div className={`text-sm ${theme.textSecondary}`}>
                                        • {exercise.exercise?.name || 'Exercise'}
                                        {exercise.sets && ` • ${exercise.sets} sets`}
                                        {exercise.cluster_reps && ` • ${exercise.cluster_reps} reps per cluster`}
                                        {exercise.clusters_per_set && ` • ${exercise.clusters_per_set} clusters per set`}
                                        {exercise.intra_cluster_rest && ` • ${exercise.intra_cluster_rest}s rest between clusters`}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Rest-Pause Details */}
                                {exercise.exercise_type === 'rest_pause' && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>Rest-Pause Details</h5>
                                    <div className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                      <div className={`text-sm ${theme.textSecondary}`}>
                                        • {exercise.exercise?.name || 'Exercise'}
                                        {exercise.sets && ` • ${exercise.sets} sets`}
                                        {exercise.reps && ` • ${exercise.reps} reps`}
                                        {exercise.rest_pause_duration && ` • ${exercise.rest_pause_duration}s rest-pause`}
                                        {exercise.max_rest_pauses && ` • Max ${exercise.max_rest_pauses} rest-pauses`}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                

                                {/* Pre-Exhaustion Details */}
                                {exercise.exercise_type === 'pre_exhaustion' && exercise.compound_exercise_id && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>Pre-Exhaustion Details</h5>
                                    <div className="space-y-2">
                                      <div className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className={`text-xs font-medium px-2 py-1 rounded-full bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300`}>
                                            Pre-Exhaustion
                                          </span>
                                        </div>
                                        <div className={`text-sm ${theme.textSecondary}`}>
                                          • {exercise.exercise?.name || 'Pre-Exhaustion Exercise'}
                                          {exercise.sets && ` • ${exercise.sets} sets`}
                                          {exercise.isolation_reps && ` • Isolation reps: ${exercise.isolation_reps}`}
                                        </div>
                                      </div>
                                      <div className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className={`text-xs font-medium px-2 py-1 rounded-full bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300`}>
                                            Compound
                                          </span>
                                        </div>
                                        <div className={`text-sm ${theme.textSecondary}`}>
                                          • {availableExercises.find(ex => ex.id === exercise.compound_exercise_id)?.name || 'Compound Exercise'}
                                          {exercise.sets && ` • ${exercise.sets} sets`}
                                          {exercise.compound_reps && ` • Compound reps: ${exercise.compound_reps}`}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* For Time Details */}
                                {exercise.exercise_type === 'for_time' && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>For Time Details</h5>
                                    <div className={`p-3 rounded-lg ${theme.card} border ${theme.border}`}>
                                      <div className={`text-sm ${theme.textSecondary}`}>
                                        • {exercise.exercise?.name || 'Exercise'}
                                        {exercise.sets && ` • ${exercise.sets} sets`}
                                        {exercise.reps && ` • ${exercise.reps} reps`}
                                        {exercise.time_cap && ` • Time cap: ${exercise.time_cap} minutes`}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                

                                {/* Notes */}
                                {exercise.notes && (
                                  <div>
                                    <h5 className={`text-sm font-medium ${theme.text} mb-2`}>Notes</h5>
                                    <p className={`text-sm ${theme.textSecondary}`}>{exercise.notes}</p>
                                  </div>
                                )}

                                {/* Additional Parameters */}
                                <div>
                                  <h5 className={`text-sm font-medium ${theme.text} mb-2`}>Parameters</h5>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    {exercise.exercise_type === 'tabata' ? (
                                      <>
                                        {exercise.rounds && <div className={`${theme.textSecondary}`}>Rounds: {exercise.rounds}</div>}
                                        {exercise.work_seconds && <div className={`${theme.textSecondary}`}>Work: {exercise.work_seconds}s</div>}
                                        {exercise.rest_after && <div className={`${theme.textSecondary}`}>Rest After: {exercise.rest_after}s</div>}
                                        {exercise.tabata_sets && <div className={`${theme.textSecondary}`}>Sets: {exercise.tabata_sets.length}</div>}
                                      </>
                                    ) : exercise.exercise_type === 'circuit' ? (
                                      <>
                                        {exercise.sets && <div className={`${theme.textSecondary}`}>Rounds: {exercise.sets}</div>}
                                        {exercise.circuit_sets && <div className={`${theme.textSecondary}`}>Exercises: {exercise.circuit_sets.length}</div>}
                                        {exercise.rest_seconds && <div className={`${theme.textSecondary}`}>Rest: {exercise.rest_seconds}s</div>}
                                      </>
                                    ) : exercise.exercise_type === 'amrap' ? (
                                      <>
                                        {exercise.amrap_duration && <div className={`${theme.textSecondary}`}>Duration: {exercise.amrap_duration}min</div>}
                                      </>
                                    ) : exercise.exercise_type === 'emom' ? (
                                      <>
                                        {exercise.emom_duration && <div className={`${theme.textSecondary}`}>Duration: {exercise.emom_duration}min</div>}
                                        {exercise.emom_reps && <div className={`${theme.textSecondary}`}>Reps: {exercise.emom_reps}</div>}
                                        {exercise.work_seconds && <div className={`${theme.textSecondary}`}>Work Time: {exercise.work_seconds}s</div>}
                                        {exercise.emom_mode && <div className={`${theme.textSecondary}`}>Mode: {exercise.emom_mode}</div>}
                                      </>
                                    ) : exercise.exercise_type === 'giant_set' ? (
                                      <>
                                        {exercise.sets && <div className={`${theme.textSecondary}`}>Sets: {exercise.sets}</div>}
                                        {exercise.giant_set_exercises && <div className={`${theme.textSecondary}`}>Exercises: {exercise.giant_set_exercises.length}</div>}
                                        {exercise.rest_seconds && <div className={`${theme.textSecondary}`}>Rest: {exercise.rest_seconds}s</div>}
                                      </>
                                    ) : (
                                      <>
                                        {exercise.sets && <div className={`${theme.textSecondary}`}>Sets: {exercise.sets}</div>}
                                        {exercise.reps && <div className={`${theme.textSecondary}`}>Reps: {exercise.reps}</div>}
                                        {exercise.rest_seconds && <div className={`${theme.textSecondary}`}>Rest: {exercise.rest_seconds}s</div>}
                                        {exercise.rir && <div className={`${theme.textSecondary}`}>RIR: {exercise.rir}</div>}
                                        {exercise.tempo && <div className={`${theme.textSecondary}`}>Tempo: {exercise.tempo}</div>}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Dumbbell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className={`text-slate-500 ${theme.textSecondary}`}>No exercises added to this template</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`flex-shrink-0 ${theme.card} border-t ${theme.border} px-6 py-4 rounded-b-3xl sticky bottom-0`}>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="rounded-xl"
            >
              Close
            </Button>
            <Button 
              className={`${theme.primary} rounded-xl`}
              onClick={() => {
                onClose()
                if (onEdit) {
                  onEdit(template)
                }
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
