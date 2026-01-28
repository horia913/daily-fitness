'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const [editingWeek, setEditingWeek] = useState<string | null>(null)
  const [editingWorkout, setEditingWorkout] = useState<string | null>(null)

  const dayNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="fc-pill fc-pill-glass fc-text-workouts">
            Program timeline
          </span>
          <h3 className="text-xl font-semibold fc-text-primary mt-2">
            Training blocks overview
          </h3>
          <p className="text-sm fc-text-dim">
            {weeks.length} weeks • {weeks.reduce((sum, week) => sum + getTotalWorkoutsForWeek(week), 0)} total workouts
          </p>
        </div>
        {isEditing && (
          <Button
            onClick={onAddWeek}
            className="fc-btn fc-btn-primary fc-press"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Week
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {weeks.map((week) => {
          const isExpanded = expandedWeeks.has(week.id)
          const totalWorkouts = getTotalWorkoutsForWeek(week)
          const weekDuration = getWeekDuration(week)
          
          return (
            <div key={week.id} className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
              <div className="pb-3 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Week Number */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-full fc-icon-tile fc-icon-workouts text-lg font-bold">
                      {week.week_number}
                    </div>
                    
                    {/* Week Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold fc-text-primary text-lg">
                          {editingWeek === week.id ? (
                            <Input
                              value={week.name}
                              onChange={(e) => onUpdateWeek(week.id, { name: e.target.value })}
                              className="h-8 text-lg font-semibold fc-glass-soft border border-[color:var(--fc-glass-border)]"
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
                          <span className="fc-pill fc-pill-glass fc-text-warning text-xs">
                            Deload
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm fc-text-subtle">
                        <div className="flex items-center gap-1">
                          <Dumbbell className="w-3 h-3 fc-text-workouts" />
                          <span>{totalWorkouts} workouts</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 fc-text-workouts" />
                          <span>{weekDuration}m total</span>
                        </div>
                        {week.focus_area && (
                          <div className="flex items-center gap-1">
                            <Target className="w-3 h-3 fc-text-workouts" />
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
                      className="p-2 fc-btn fc-btn-ghost"
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
                          className="p-2 fc-btn fc-btn-ghost"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveWeek(week.id)}
                          className="p-2 fc-btn fc-btn-ghost fc-text-error"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Week Description */}
                {week.description && (
                  <p className="text-sm fc-text-dim mt-2">
                    {week.description}
                  </p>
                )}
              </div>

              {/* Week Content */}
              {isExpanded && (
                <div className="pt-0 px-6 pb-6">
                  {/* Days Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    {dayNames.map((dayName, dayIndex) => {
                      const dayWorkouts = getWeekWorkouts(week, dayIndex)
                      const workoutCount = dayWorkouts.length
                      
                      return (
                        <div key={dayIndex} className="space-y-2">
                          {/* Day Header */}
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium fc-text-primary">{dayName}</h5>
                            <span className="fc-pill fc-pill-glass text-xs fc-text-dim">
                              {workoutCount}
                            </span>
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
                                className="w-full h-8 text-xs border-dashed fc-btn fc-btn-secondary"
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
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {weeks.length === 0 && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
          <div className="text-center py-12">
            <div className="mx-auto mb-4 fc-icon-tile fc-icon-workouts w-16 h-16">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium fc-text-primary mb-2">No weeks yet</h3>
            <p className="text-sm fc-text-dim mb-6">
              Add weeks to build your program timeline.
            </p>
            {isEditing && (
              <Button 
                onClick={onAddWeek}
                className="fc-btn fc-btn-primary fc-press"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Week
              </Button>
            )}
          </div>
        </div>
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
    <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] hover:shadow-md transition-all duration-200">
      <div className="p-3">
        <div className="flex items-center gap-2">
          {/* Workout Icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg fc-glass border border-[color:var(--fc-glass-border)]">
            <CategoryIcon className="w-4 h-4 fc-text-subtle" />
          </div>

          {/* Workout Info */}
          <div className="flex-1 min-w-0">
            <h6 className="font-medium fc-text-primary text-sm truncate">
              {workout.template?.name || 'Unknown Workout'}
            </h6>
            <div className="flex items-center gap-2 text-xs fc-text-subtle">
              <Clock className="w-3 h-3 fc-text-workouts" />
              <span>{workout.template?.estimated_duration || 0}m</span>
              {workout.is_optional && (
                <span className="fc-pill fc-pill-glass text-[10px] fc-text-dim">
                  Optional
                </span>
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
                className="p-1 fc-btn fc-btn-ghost"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="p-1 fc-btn fc-btn-ghost fc-text-error"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Workout Notes */}
        {workout.notes && (
          <div className="mt-2 p-2 rounded-lg fc-glass border border-[color:var(--fc-glass-border)]">
            <p className="text-xs fc-text-dim">{workout.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
