'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  BookOpen, 
  Target, 
  Edit, 
  X,
  Users,
  Copy,
  Calendar,
  Dumbbell,
  Info,
  Zap
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { preventBackgroundScroll, restoreBackgroundScroll } from '@/lib/mobile-compatibility'
import { useTheme } from '@/contexts/ThemeContext'

interface WorkoutProgram {
  id: string
  name: string
  description: string
  duration_weeks: number
  difficulty_level: string
  target_audience: string
  coach_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  weeks?: ProgramWeek[]
}

interface ProgramWeek {
  id: string
  week_number: number
  name: string
  description?: string
  focus_area?: string
  is_deload?: boolean
  workouts: ProgramWeekWorkout[]
}

interface ProgramWeekWorkout {
  id: string
  day_number: number
  order_index?: number
  template_id: string
  notes?: string
  template?: WorkoutTemplate
}

interface WorkoutTemplate {
  id: string
  name: string
  description: string
  estimated_duration: number
  difficulty_level: string
  category?: {
    name: string
    color: string
  }
}

interface ProgramDetailModalProps {
  isOpen: boolean
  onClose: () => void
  program?: WorkoutProgram
  onEdit?: (program: WorkoutProgram) => void
}

export default function ProgramDetailModal({ isOpen, onClose, program, onEdit }: ProgramDetailModalProps) {
  const { theme, isDark } = useTheme()
  const [loading, setLoading] = useState(false)
  const [programDetails, setProgramDetails] = useState<WorkoutProgram | null>(null)
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])

  // Safe theme fallbacks
  const safeTheme = theme || {
    card: 'bg-white dark:bg-slate-900',
    shadow: 'shadow-xl',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-900 dark:text-slate-100',
    textSecondary: 'text-slate-600 dark:text-slate-400'
  }

  const loadProgramDetails = useCallback(async () => {
    if (!program?.id) return
    
    setLoading(true)
    try {
      // Load program with weeks and workouts
      const { data: programData, error: programError } = await supabase
        .from('workout_programs')
        .select(`
          *,
          program_weeks:program_weeks (
            *,
            program_week_workouts:program_week_workouts (
              *,
              workout_templates:workout_templates (
                id,
                name,
                description,
                estimated_duration,
                difficulty_level
              )
            )
          )
        `)
        .eq('id', program.id)
        .single()

      if (programError) throw programError

      // Transform the data structure
      const transformedProgram = {
        ...programData,
        weeks: programData.program_weeks?.map((week: any) => ({
          ...week,
          workouts: week.program_week_workouts?.map((workout: any) => ({
            ...workout,
            template: workout.workout_templates
          })) || []
        })) || []
      }

      setProgramDetails(transformedProgram)
    } catch (error) {
      console.error('Error loading program details:', error)
    } finally {
      setLoading(false)
    }
  }, [program?.id])

  useEffect(() => {
    if (isOpen && program) {
      preventBackgroundScroll()
      loadProgramDetails()
    }
    
    return () => {
      restoreBackgroundScroll()
    }
  }, [isOpen, program, loadProgramDetails])

  const handleEdit = () => {
    if (program && onEdit) {
      onEdit(program)
      onClose()
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getTargetAudienceLabel = (audience: string) => {
    const labels: { [key: string]: string } = {
      'general_fitness': 'General Fitness',
      'weight_loss': 'Weight Loss',
      'muscle_building': 'Muscle Building',
      'athletic_performance': 'Athletic Performance',
      'rehabilitation': 'Rehabilitation',
      'seniors': 'Seniors'
    }
    return labels[audience] || audience
  }

  const getFocusAreaLabel = (area: string) => {
    const labels: { [key: string]: string } = {
      'strength': 'Strength Training',
      'endurance': 'Endurance',
      'flexibility': 'Flexibility',
      'balance': 'Balance',
      'recovery': 'Recovery',
      'technique': 'Technique'
    }
    return labels[area] || area
  }

  const getTotalStats = () => {
    if (!programDetails?.weeks) return { totalWorkouts: 0, totalDuration: 0, averageWorkoutsPerWeek: 0 }

    const totalWorkouts = programDetails.weeks.reduce((sum, week) => {
      return sum + (week.workouts?.length || 0)
    }, 0)

    const totalDuration = programDetails.weeks.reduce((sum, week) => {
      return sum + (week.workouts?.reduce((weekSum, workout) => {
        return weekSum + (workout.template?.estimated_duration || 0)
      }, 0) || 0)
    }, 0)

    const averageWorkoutsPerWeek = programDetails.weeks.length > 0 ? totalWorkouts / programDetails.weeks.length : 0

    return { totalWorkouts, totalDuration, averageWorkoutsPerWeek }
  }

  const stats = getTotalStats()

  if (!isOpen || !program) return null

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`
          fixed inset-4 sm:inset-8 md:inset-16
          ${safeTheme.card} 
          rounded-3xl 
          ${safeTheme.shadow} 
          flex flex-col
          max-h-[95vh]
          border ${safeTheme.border}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 ${safeTheme.card} border-b ${safeTheme.border} px-6 py-5 rounded-t-3xl flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-lg`}>
                <BookOpen className={`w-6 h-6 text-white`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${safeTheme.text}`}>
                  {program.name}
                </h2>
                <p className={`text-sm ${safeTheme.textSecondary} mt-1`}>
                  Program Details & Overview
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  onClick={handleEdit}
                  className={`bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl px-4 py-2`}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Program
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className={`${safeTheme.text} hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl`}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {/* Program Overview */}
              <Card className={`${safeTheme.card} border ${safeTheme.border} rounded-2xl`}>
                <CardHeader className="p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-lg`}>
                      <Info className={`w-5 h-5 text-white`} />
                    </div>
                    <CardTitle className={`text-xl font-bold ${safeTheme.text}`}>Program Overview</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <p className={`${safeTheme.text} leading-relaxed`}>
                      {program.description || 'No description available'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'} text-center`}>
                      <Calendar className={`w-5 h-5 ${safeTheme.text} mx-auto mb-2`} />
                      <div className={`text-2xl font-bold ${safeTheme.text}`}>{program.duration_weeks}</div>
                      <div className={`text-xs ${safeTheme.textSecondary}`}>Weeks</div>
                    </div>
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'} text-center`}>
                      <Dumbbell className={`w-5 h-5 ${safeTheme.text} mx-auto mb-2`} />
                      <div className={`text-2xl font-bold ${safeTheme.text}`}>{stats.totalWorkouts}</div>
                      <div className={`text-xs ${safeTheme.textSecondary}`}>Workouts</div>
                    </div>
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'} text-center`}>
                      <Clock className={`w-5 h-5 ${safeTheme.text} mx-auto mb-2`} />
                      <div className={`text-2xl font-bold ${safeTheme.text}`}>{Math.round(stats.totalDuration)}</div>
                      <div className={`text-xs ${safeTheme.textSecondary}`}>Min Total</div>
                    </div>
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'} text-center`}>
                      <Target className={`w-5 h-5 ${safeTheme.text} mx-auto mb-2`} />
                      <div className={`text-2xl font-bold ${safeTheme.text}`}>{Math.round(stats.averageWorkoutsPerWeek * 10) / 10}</div>
                      <div className={`text-xs ${safeTheme.textSecondary}`}>Avg/Week</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className={getDifficultyColor(program.difficulty_level)}>
                      <Zap className="w-3 h-3 mr-1" />
                      {program.difficulty_level}
                    </Badge>
                    <Badge className={`bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`}>
                      <Users className="w-3 h-3 mr-1" />
                      {getTargetAudienceLabel(program.target_audience)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Program Weeks */}
              {programDetails?.weeks && programDetails.weeks.length > 0 && (
                <Card className={`${safeTheme.card} border ${safeTheme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-lg`}>
                        <Calendar className={`w-5 h-5 text-white`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${safeTheme.text}`}>Program Schedule</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-4">
                    {programDetails.weeks.map((week) => (
                      <div key={week.id} className={`border ${safeTheme.border} rounded-2xl p-4`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className={`text-lg font-semibold ${safeTheme.text}`}>{week.name}</h4>
                            {week.description && (
                              <p className={`text-sm ${safeTheme.textSecondary} mt-1`}>{week.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {week.is_deload && (
                              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                Deload
                              </Badge>
                            )}
                            {week.focus_area && (
                              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                {getFocusAreaLabel(week.focus_area)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {week.workouts && week.workouts.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                            {[1, 2, 3, 4, 5, 6, 7].map(day => {
                              const dayWorkouts = week.workouts.filter(w => w.day_number === day)
                              return (
                                <div key={day} className={`p-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'} min-h-[60px]`}>
                                  <div className={`text-xs font-medium ${safeTheme.textSecondary} mb-1 text-center`}>
                                    Day {day}
                                  </div>
                                  <div className="space-y-1">
                                    {dayWorkouts.map(workout => (
                                      <div key={workout.id} className={`text-xs p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-center`}>
                                        {workout.template?.name || 'Unnamed Workout'}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className={`text-sm ${safeTheme.textSecondary} text-center py-4 border border-dashed ${safeTheme.border} rounded-lg`}>
                            No workouts scheduled for this week
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`${safeTheme.card} border-t ${safeTheme.border} px-6 py-4 rounded-b-3xl flex justify-end gap-3 flex-shrink-0`}>
          <Button
            variant="outline"
            onClick={onClose}
            className={`rounded-xl px-6`}
          >
            Close
          </Button>
          {onEdit && (
            <Button
              onClick={handleEdit}
              className={`bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl px-6`}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Program
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
