'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Dumbbell,
  Target,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Heart
} from 'lucide-react'

interface ProgramWeek {
  id: string
  program_id: string
  week_number: number
  name: string
  description: string
  focus_area: string
  is_deload: boolean
  workouts?: ProgramWorkout[]
}

interface ProgramWorkout {
  id: string
  program_week_id: string
  template_id: string
  day_of_week: number
  order_index: number
  is_optional: boolean
  notes: string
  template?: WorkoutTemplate
}

interface WorkoutTemplate {
  id: string
  name: string
  description: string
  category_id: string
  estimated_duration: number
  difficulty_level: string
  is_active: boolean
  created_at: string
  updated_at: string
  category?: {
    name: string
    color: string
  }
}

interface ProgramTimelineProps {
  weeks: ProgramWeek[]
  onAddWeek: () => void
  onRemoveWeek: (weekId: string) => void
  onUpdateWeek: (weekId: string, updates: any) => void
  onAddWorkout: (weekId: string, dayOfWeek: number) => void
  onRemoveWorkout: (workoutId: string) => void
  onUpdateWorkout: (workoutId: string, updates: any) => void
  onReorderWorkouts: (weekId: string, dayOfWeek: number, newOrder: ProgramWorkout[]) => void
  availableTemplates: WorkoutTemplate[]
  isEditing: boolean
}

export default function ProgramTimeline({
  weeks,
  onAddWeek,
  onRemoveWeek,
  onUpdateWeek,
  onAddWorkout,
  onRemoveWorkout,
  onUpdateWorkout,
  onReorderWorkouts,
  availableTemplates,
  isEditing
}: ProgramTimelineProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const [editingWeek, setEditingWeek] = useState<string | null>(null)
  const [editingWorkout, setEditingWorkout] = useState<string | null>(null)

  const dayNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6']
  const dayColors = [
    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
  ]

  const toggleWeekExpansion = (weekId: string) => {
    const newExpanded = new Set(expandedWeeks)
    if (newExpanded.has(weekId)) {
      newExpanded.delete(weekId)
    } else {
      newExpanded.add(weekId)
    }
    setExpandedWeeks(newExpanded)
  }

  const getWeekWorkouts = (week: ProgramWeek, dayOfWeek: number) => {
    return week.workouts?.filter(workout => workout.day_of_week === dayOfWeek) || []
  }

  const getDayWorkoutCount = (week: ProgramWeek, dayOfWeek: number) => {
    return getWeekWorkouts(week, dayOfWeek).length
  }

  const getTotalWorkoutsForWeek = (week: ProgramWeek) => {
    return week.workouts?.length || 0
  }

  const getWeekDuration = (week: ProgramWeek) => {
    return week.workouts?.reduce((sum, workout) => sum + (workout.template?.estimated_duration || 0), 0) || 0
  }

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-xl font-semibold ${theme.text}`}>Program Timeline</h3>
          <p className={`text-sm ${theme.textSecondary}`}>
            {weeks.length} weeks • {weeks.reduce((sum, week) => sum + getTotalWorkoutsForWeek(week), 0)} total workouts
          </p>
        </div>
        {isEditing && (
          <Button
            onClick={onAddWeek}
            className="rounded-xl bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Week
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {weeks.map((week, weekIndex) => {
          const isExpanded = expandedWeeks.has(week.id)
          const totalWorkouts = getTotalWorkoutsForWeek(week)
          const weekDuration = getWeekDuration(week)
          
          return (
            <Card key={week.id} className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Week Number */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-lg">
                      {week.week_number}
                    </div>
                    
                    {/* Week Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className={`font-semibold ${theme.text} text-lg`}>
                          {editingWeek === week.id ? (
                            <Input
                              value={week.name}
                              onChange={(e) => onUpdateWeek(week.id, { name: e.target.value })}
                              className="h-8 text-lg font-semibold"
                              onBlur={() => setEditingWeek(null)}
                              autoFocus
                            />
                          ) : (
                            <span onClick={() => isEditing && setEditingWeek(week.id)}>
                              {week.name || `Week ${week.week_number}`}
                            </span>
                          )}
                        </h4>
                        {week.is_deload && (
                          <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-0">
                            Deload
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Dumbbell className="w-3 h-3" />
                          <span>{totalWorkouts} workouts</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{weekDuration}m total</span>
                        </div>
                        {week.focus_area && (
                          <div className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            <span>{week.focus_area}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Week Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleWeekExpansion(week.id)}
                      className="p-2"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    {isEditing && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingWeek(week.id)}
                          className="p-2 text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveWeek(week.id)}
                          className="p-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Week Description */}
                {week.description && (
                  <p className={`text-sm ${theme.textSecondary} mt-2`}>
                    {week.description}
                  </p>
                )}
              </CardHeader>

              {/* Week Content */}
              {isExpanded && (
                <CardContent className="pt-0">
                  {/* Days Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    {dayNames.map((dayName, dayIndex) => {
                      const dayWorkouts = getWeekWorkouts(week, dayIndex)
                      const workoutCount = dayWorkouts.length
                      
                      return (
                        <div key={dayIndex} className="space-y-2">
                          {/* Day Header */}
                          <div className="flex items-center justify-between">
                            <h5 className={`text-sm font-medium ${theme.text}`}>{dayName}</h5>
                            <Badge className={`${dayColors[dayIndex]} border-0 text-xs`}>
                              {workoutCount}
                            </Badge>
                          </div>

                          {/* Workouts for this day */}
                          <div className="space-y-2 min-h-20">
                            {dayWorkouts.map((workout, workoutIndex) => (
                              <WorkoutCard
                                key={workout.id}
                                workout={workout}
                                isEditing={isEditing}
                                onEdit={() => setEditingWorkout(workout.id)}
                                onRemove={() => onRemoveWorkout(workout.id)}
                                onUpdate={(updates) => onUpdateWorkout(workout.id, updates)}
                              />
                            ))}
                            
                            {/* Add Workout Button */}
                            {isEditing && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onAddWorkout(week.id, dayIndex)}
                                className="w-full h-8 text-xs border-dashed"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Workout
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {weeks.length === 0 && (
        <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
          <CardContent className="text-center py-12">
            <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className={`text-lg font-medium ${theme.text} mb-2`}>No weeks yet</h3>
            <p className={`text-sm ${theme.textSecondary} mb-6`}>
              Add weeks to build your program timeline.
            </p>
            {isEditing && (
              <Button 
                onClick={onAddWeek}
                className="rounded-xl bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Week
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Workout Card Component
interface WorkoutCardProps {
  workout: ProgramWorkout
  isEditing: boolean
  onEdit: () => void
  onRemove: () => void
  onUpdate: (updates: any) => void
}

function WorkoutCard({ workout, isEditing, onEdit, onRemove, onUpdate }: WorkoutCardProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case 'strength': return Dumbbell
      case 'cardio': return Heart
      case 'hiit': return Zap
      case 'flexibility': return Activity
      case 'upper body': return Target
      case 'lower body': return Dumbbell
      default: return Dumbbell
    }
  }

  const categoryName = typeof workout.template?.category === 'string' 
    ? workout.template.category 
    : workout.template?.category?.name || ''
  const CategoryIcon = getCategoryIcon(categoryName)

  return (
    <Card className={`${theme.card} ${theme.shadow} rounded-xl border-2 hover:shadow-md transition-all duration-200`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          {/* Workout Icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800">
            <CategoryIcon className="w-4 h-4 text-slate-500" />
          </div>

          {/* Workout Info */}
          <div className="flex-1 min-w-0">
            <h6 className={`font-medium ${theme.text} text-sm truncate`}>
              {workout.template?.name || 'Unknown Workout'}
            </h6>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{workout.template?.estimated_duration || 0}m</span>
              {workout.is_optional && (
                <Badge variant="outline" className="text-xs">
                  Optional
                </Badge>
              )}
            </div>
          </div>

          {/* Workout Actions */}
          {isEditing && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="p-1 text-blue-600 hover:text-blue-700"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="p-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Workout Notes */}
        {workout.notes && (
          <div className={`mt-2 p-2 rounded-lg ${theme.card}`}>
            <p className={`text-xs ${theme.textSecondary}`}>{workout.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
