'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Program, WorkoutTemplate, Exercise, ExerciseCategory } from '@/lib/workoutTemplateService'
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  Star, 
  Edit, 
  Dumbbell,
  Target,
  TrendingUp
} from 'lucide-react'

interface ProgramDetailsModalProps {
  program: Program
  templates: WorkoutTemplate[]
  exercises: Exercise[]
  categories: ExerciseCategory[]
  onClose: () => void
  onEdit: () => void
}

export default function ProgramDetailsModal({ program, templates, exercises, categories, onClose, onEdit }: ProgramDetailsModalProps) {
  const difficultyColors = {
    'beginner': 'fc-text-success',
    'intermediate': 'fc-text-warning',
    'advanced': 'fc-text-error'
  }

  const targetAudienceLabels = {
    'general_fitness': 'General Fitness',
    'weight_loss': 'Weight Loss',
    'muscle_gain': 'Muscle Gain',
    'strength': 'Strength',
    'endurance': 'Endurance',
    'athletic_performance': 'Athletic Performance'
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="relative fc-modal fc-card w-full flex flex-col transform transition-all duration-300 ease-out overflow-hidden"
        style={{
          animation: 'modalSlideIn 0.3s ease-out',
          height: 'min(90vh, calc(100vh - 2rem))',
          maxHeight: 'min(90vh, calc(100vh - 2rem))',
          maxWidth: 'min(98vw, 90rem)'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 border-b border-[color:var(--fc-glass-border)] px-6 py-5 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="fc-icon-tile fc-icon-workouts">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="fc-pill fc-pill-glass fc-text-workouts">Program</span>
                <h2 className="text-2xl font-bold fc-text-primary mt-2">
                  {program.name}
                </h2>
                <p className="text-sm fc-text-dim mt-1">
                  Created {new Date(program.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 rounded-xl fc-btn fc-btn-ghost"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-6">
            {/* Program Overview */}
            <div className="fc-glass fc-card border border-[color:var(--fc-glass-border)] rounded-2xl">
              <div className="p-6 border-b border-[color:var(--fc-glass-border)]">
                <div className="flex items-center gap-3">
                  <div className="fc-icon-tile fc-icon-workouts">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="text-xl font-bold fc-text-primary">Program Overview</div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 fc-text-workouts" />
                      <span className="text-sm font-medium fc-text-primary">Duration</span>
                    </div>
                    <p className="text-2xl font-bold fc-text-primary">{program.duration_weeks} weeks</p>
                  </div>
                  
                  <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Dumbbell className="w-4 h-4 fc-text-workouts" />
                      <span className="text-sm font-medium fc-text-primary">Workouts</span>
                    </div>
                    <p className="text-2xl font-bold fc-text-primary">{program.schedule?.length || 0}</p>
                  </div>
                  
                  <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 fc-text-habits" />
                      <span className="text-sm font-medium fc-text-primary">Target</span>
                    </div>
                    <p className="text-2xl font-bold fc-text-primary">{targetAudienceLabels[program.target_audience as keyof typeof targetAudienceLabels] || program.target_audience}</p>
                  </div>
                  
                  <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 fc-text-warning" />
                      <span className="text-sm font-medium fc-text-primary">Level</span>
                    </div>
                    <span className={`fc-pill fc-pill-glass ${difficultyColors[program.difficulty_level as keyof typeof difficultyColors]}`}>
                      {program.difficulty_level}
                    </span>
                  </div>
                </div>

                {program.description && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold fc-text-primary mb-2">Description</h4>
                    <p className="fc-text-dim leading-relaxed">{program.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Schedule */}
            <div className="fc-glass fc-card border border-[color:var(--fc-glass-border)] rounded-2xl">
              <div className="p-6 border-b border-[color:var(--fc-glass-border)]">
                <div className="flex items-center gap-3">
                  <div className="fc-icon-tile fc-icon-workouts">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="text-xl font-bold fc-text-primary">
                    Weekly Schedule
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-7 gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                    // day_of_week is 0-indexed in database: 0=Monday, 1=Tuesday, ..., 6=Sunday
                    const dayWorkouts = (program.schedule as any)?.filter((s: any) => s.day_of_week === index) || []
                    return (
                      <div key={day} className="p-3 rounded-lg fc-glass-soft border border-[color:var(--fc-glass-border)] text-center">
                        <h4 className="font-semibold fc-text-primary mb-2">{day.slice(0, 3)}</h4>
                        {dayWorkouts.length > 0 ? (
                          <div className="space-y-1">
                            {dayWorkouts.map((schedule: any, idx: number) => {
                              // Try to get template from embedded workout_templates or from props
                              const template = schedule.workout_templates || templates.find(t => t.id === schedule.template_id)
                              return (
                                <div key={idx} className="text-xs p-2 rounded fc-glass-soft border border-[color:var(--fc-glass-border)]">
                                  <div className="font-medium fc-text-primary truncate">
                                    {template?.name || 'Workout'}
                                  </div>
                                  <div className="text-xs fc-text-subtle">
                                    {template?.estimated_duration || 60}m
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-xs fc-text-subtle">Rest</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Workout Templates */}
            <div className="fc-glass fc-card border border-[color:var(--fc-glass-border)] rounded-2xl">
              <div className="p-6 border-b border-[color:var(--fc-glass-border)]">
                <div className="flex items-center gap-3">
                  <div className="fc-icon-tile fc-icon-workouts">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div className="text-xl font-bold fc-text-primary">
                    Workout Templates ({program.schedule?.length || 0})
                  </div>
                </div>
              </div>
              <div className="p-6">
                {program.schedule && program.schedule.length > 0 ? (
                  <div className="space-y-4">
                    {program.schedule.map((scheduleItem: any, index: number) => {
                      // Try to get template from embedded workout_templates or from props
                      const template = scheduleItem.workout_templates || templates.find(t => t.id === scheduleItem.template_id)
                      return (
                        <div key={scheduleItem.id || index} className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold fc-text-primary mb-1">
                                {template?.name || 'Workout'}
                              </h4>
                              <div className="flex items-center gap-4 text-sm flex-wrap">
                                <span className="fc-text-dim">
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  Week {scheduleItem.week_number || 1}, Day {(scheduleItem.day_of_week ?? 0) + 1}
                                </span>
                                <span className="fc-text-dim">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  {template?.estimated_duration || 60}m
                                </span>
                                <span className="fc-text-dim">
                                  <Dumbbell className="w-3 h-3 inline mr-1" />
                                  {template?.blocks?.length || 0} exercises
                                </span>
                                {template?.difficulty_level && (
                                  <span className={`fc-pill fc-pill-glass text-xs ${difficultyColors[template.difficulty_level as keyof typeof difficultyColors]}`}>
                                    {template.difficulty_level}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Dumbbell className="w-12 h-12 fc-text-subtle mx-auto mb-4" />
                    <p className="fc-text-dim">No workout templates added to this program</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 border-t border-[color:var(--fc-glass-border)] px-6 py-4 rounded-b-3xl sticky bottom-0">
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="rounded-xl fc-btn fc-btn-secondary"
            >
              Close
            </Button>
            <Button 
              className="fc-btn fc-btn-primary fc-press rounded-xl"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Program
            </Button>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
