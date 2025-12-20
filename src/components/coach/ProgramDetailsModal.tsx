'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
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
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const difficultyColors = {
    'beginner': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'intermediate': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'advanced': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
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
      className={`fixed inset-0 z-[9999] flex items-start justify-center p-4 ${theme.background.includes('slate-900') ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/50 backdrop-blur-sm'}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-theme={theme.background.includes('slate-900') ? 'dark' : 'light'}
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
        <div className={`sticky top-0 ${theme.card} border-b ${theme.border} px-6 py-5 rounded-t-3xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-lg`}>
                <Calendar className={`w-6 h-6 text-white`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${theme.text}`}>
                  {program.name}
                </h2>
                <p className={`text-sm ${theme.textSecondary} mt-1`}>
                  Created {new Date(program.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:${theme.text} hover:${theme.background.includes('slate-900') ? 'bg-slate-700' : 'bg-slate-100'}`}
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
            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-lg`}>
                    <Target className={`w-5 h-5 text-white`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>Program Overview</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className={`text-sm font-medium ${theme.text}`}>Duration</span>
                    </div>
                    <p className={`text-2xl font-bold ${theme.text}`}>{program.duration_weeks} weeks</p>
                  </div>
                  
                  <div className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Dumbbell className="w-4 h-4 text-green-500" />
                      <span className={`text-sm font-medium ${theme.text}`}>Workouts</span>
                    </div>
                    <p className={`text-2xl font-bold ${theme.text}`}>{program.schedule?.length || 0}</p>
                  </div>
                  
                  <div className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      <span className={`text-sm font-medium ${theme.text}`}>Target</span>
                    </div>
                    <p className={`text-2xl font-bold ${theme.text}`}>{targetAudienceLabels[program.target_audience as keyof typeof targetAudienceLabels] || program.target_audience}</p>
                  </div>
                  
                  <div className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className={`text-sm font-medium ${theme.text}`}>Level</span>
                    </div>
                    <Badge className={`${difficultyColors[program.difficulty_level as keyof typeof difficultyColors]} border-0`}>
                      {program.difficulty_level}
                    </Badge>
                  </div>
                </div>

                {program.description && (
                  <div className="mt-6">
                    <h4 className={`text-lg font-semibold ${theme.text} mb-2`}>Description</h4>
                    <p className={`${theme.textSecondary} leading-relaxed`}>{program.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Schedule */}
            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-lg`}>
                    <Calendar className={`w-5 h-5 text-white`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>
                    Weekly Schedule
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-7 gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                    const dayWorkouts = (program.schedule as any)?.filter((s: any) => s.program_day === index + 1) || []
                    return (
                      <div key={day} className={`p-3 rounded-lg ${theme.card} border ${theme.border} text-center`}>
                        <h4 className={`font-semibold ${theme.text} mb-2`}>{day.slice(0, 3)}</h4>
                        {dayWorkouts.length > 0 ? (
                          <div className="space-y-1">
                            {dayWorkouts.map((schedule: any, idx: number) => {
                              const template = templates.find(t => t.id === schedule.template_id)
                              return (
                                <div key={idx} className={`text-xs p-2 rounded ${theme.card} border ${theme.border}`}>
                                  <div className={`font-medium ${theme.text} truncate`}>
                                    {template?.name || 'Workout'}
                                  </div>
                                  <div className={`text-xs ${theme.textSecondary}`}>
                                    {schedule.duration_minutes}m
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className={`text-xs ${theme.textSecondary}`}>Rest</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Workout Templates */}
            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-lg`}>
                    <Dumbbell className={`w-5 h-5 text-white`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>
                    Workout Templates ({program.schedule?.length || 0})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {program.schedule && program.schedule.length > 0 ? (
                  <div className="space-y-4">
                    {program.schedule.map((scheduleItem: any, index: number) => {
                      const template = templates.find(t => t.id === scheduleItem.template_id)
                      return (
                        <div key={scheduleItem.id || index} className={`${theme.card} border ${theme.border} rounded-xl p-4`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className={`font-semibold ${theme.text} mb-1`}>
                                {template?.name || 'Workout'}
                              </h4>
                              <div className="flex items-center gap-4 text-sm">
                                <span className={`${theme.textSecondary}`}>
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  Week {scheduleItem.week_number || 1}, Day {scheduleItem.day_of_week || 1}
                                </span>
                                <span className={`${theme.textSecondary}`}>
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  {template?.estimated_duration || 60}m
                                </span>
                                <span className={`${theme.textSecondary}`}>
                                  <Dumbbell className="w-3 h-3 inline mr-1" />
                                  {template?.exercises?.length || 0} exercises
                                </span>
                                {template?.difficulty_level && (
                                  <Badge className={`text-xs ${difficultyColors[template.difficulty_level as keyof typeof difficultyColors]} border-0`}>
                                    {template.difficulty_level}
                                  </Badge>
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
                    <Dumbbell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className={`text-slate-500 ${theme.textSecondary}`}>No workout templates added to this program</p>
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
