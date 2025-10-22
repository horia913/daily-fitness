'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Dumbbell,
  Apple,
  Zap,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'

interface DailyLogEntry {
  date: string
  workout: {
    completed: boolean
    duration?: number
    notes?: string
  }
  nutrition: {
    logged: boolean
    mealsLogged: number
    notes?: string
  }
  habit: {
    completed: boolean
    habitsCompleted: number
    notes?: string
  }
  session: {
    attended: boolean
    duration?: number
    notes?: string
  }
}

interface DailyAdherenceLogProps {
  clientId: string
  clientName: string
  dailyLogs: DailyLogEntry[]
}

export default function DailyAdherenceLog({ clientId, clientName, dailyLogs }: DailyAdherenceLogProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [selectedDate, setSelectedDate] = useState<string>('')

  // Mock daily log data - replace with actual data
  const mockDailyLogs: DailyLogEntry[] = [
    {
      date: '2024-01-14',
      workout: { completed: true, duration: 45, notes: 'Great session!' },
      nutrition: { logged: true, mealsLogged: 3, notes: 'All meals tracked' },
      habit: { completed: true, habitsCompleted: 5, notes: 'Morning routine completed' },
      session: { attended: true, duration: 30, notes: 'Weekly check-in' }
    },
    {
      date: '2024-01-13',
      workout: { completed: true, duration: 60, notes: 'Intense workout' },
      nutrition: { logged: true, mealsLogged: 2, notes: 'Missed dinner log' },
      habit: { completed: true, habitsCompleted: 4, notes: 'Most habits done' },
      session: { attended: false, notes: 'Rescheduled' }
    },
    {
      date: '2024-01-12',
      workout: { completed: false, notes: 'Rest day' },
      nutrition: { logged: true, mealsLogged: 3, notes: 'Perfect tracking' },
      habit: { completed: true, habitsCompleted: 5, notes: 'All habits completed' },
      session: { attended: true, duration: 25, notes: 'Quick check-in' }
    },
    {
      date: '2024-01-11',
      workout: { completed: true, duration: 50, notes: 'Good form today' },
      nutrition: { logged: false, notes: 'Forgot to log' },
      habit: { completed: true, habitsCompleted: 3, notes: 'Partial completion' },
      session: { attended: true, duration: 35, notes: 'Detailed discussion' }
    },
    {
      date: '2024-01-10',
      workout: { completed: true, duration: 40, notes: 'Light workout' },
      nutrition: { logged: true, mealsLogged: 3, notes: 'All meals logged' },
      habit: { completed: false, notes: 'Missed morning routine' },
      session: { attended: true, duration: 20, notes: 'Brief update' }
    }
  ]

  const getStatusIcon = (completed: boolean) => {
    return completed ? (
      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
    )
  }

  const getStatusColor = (completed: boolean) => {
    return completed 
      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
  }

  const getDailyScore = (log: DailyLogEntry) => {
    const total = 4
    const completed = [
      log.workout.completed,
      log.nutrition.logged,
      log.habit.completed,
      log.session.attended
    ].filter(Boolean).length
    
    return Math.round((completed / total) * 100)
  }

  const getOverallTrend = () => {
    const scores = mockDailyLogs.map(getDailyScore)
    const recent = scores.slice(0, 3).reduce((sum, score) => sum + score, 0) / 3
    const older = scores.slice(3).reduce((sum, score) => sum + score, 0) / 2
    
    if (recent > older + 5) return 'up'
    if (recent < older - 5) return 'down'
    return 'stable'
  }

  const selectedLog = selectedDate 
    ? mockDailyLogs.find(log => log.date === selectedDate)
    : mockDailyLogs[0]

  return (
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          {clientName} - Daily Adherence Log
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate('')}
              className={!selectedDate ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
            >
              All Days
            </Button>
            {mockDailyLogs.slice(0, 5).map((log, index) => (
              <Button
                key={log.date}
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(log.date)}
                className={selectedDate === log.date ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
              >
                {new Date(log.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {getOverallTrend() === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : getOverallTrend() === 'down' ? (
              <TrendingDown className="w-4 h-4 text-red-600" />
            ) : (
              <Activity className="w-4 h-4 text-slate-400" />
            )}
            <span className={`text-sm ${theme.textSecondary}`}>
              {getOverallTrend()} trend
            </span>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`${theme.card} rounded-xl p-4 border-2`}>
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className={`text-sm font-medium ${theme.text}`}>Workouts</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(selectedLog?.workout.completed || false)}
              <span className={`text-sm ${theme.textSecondary}`}>
                {selectedLog?.workout.completed ? 'Completed' : 'Missed'}
              </span>
            </div>
            {selectedLog?.workout.duration && (
              <p className={`text-xs ${theme.textSecondary} mt-1`}>
                {selectedLog.workout.duration} min
              </p>
            )}
          </div>
          
          <div className={`${theme.card} rounded-xl p-4 border-2`}>
            <div className="flex items-center gap-2 mb-2">
              <Apple className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className={`text-sm font-medium ${theme.text}`}>Nutrition</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(selectedLog?.nutrition.logged || false)}
              <span className={`text-sm ${theme.textSecondary}`}>
                {selectedLog?.nutrition.logged ? 'Logged' : 'Missed'}
              </span>
            </div>
            {selectedLog?.nutrition.mealsLogged && (
              <p className={`text-xs ${theme.textSecondary} mt-1`}>
                {selectedLog.nutrition.mealsLogged} meals
              </p>
            )}
          </div>
          
          <div className={`${theme.card} rounded-xl p-4 border-2`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className={`text-sm font-medium ${theme.text}`}>Habits</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(selectedLog?.habit.completed || false)}
              <span className={`text-sm ${theme.textSecondary}`}>
                {selectedLog?.habit.completed ? 'Completed' : 'Missed'}
              </span>
            </div>
            {selectedLog?.habit.habitsCompleted && (
              <p className={`text-xs ${theme.textSecondary} mt-1`}>
                {selectedLog.habit.habitsCompleted} habits
              </p>
            )}
          </div>
          
          <div className={`${theme.card} rounded-xl p-4 border-2`}>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className={`text-sm font-medium ${theme.text}`}>Sessions</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(selectedLog?.session.attended || false)}
              <span className={`text-sm ${theme.textSecondary}`}>
                {selectedLog?.session.attended ? 'Attended' : 'Missed'}
              </span>
            </div>
            {selectedLog?.session.duration && (
              <p className={`text-xs ${theme.textSecondary} mt-1`}>
                {selectedLog.session.duration} min
              </p>
            )}
          </div>
        </div>

        {/* Daily Score */}
        <div className={`${theme.card} rounded-xl p-4 border-2`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`font-semibold ${theme.text}`}>Daily Adherence Score</h4>
            <Badge className={`${getStatusColor(getDailyScore(selectedLog!) >= 75)} border-0`}>
              {getDailyScore(selectedLog!)}%
            </Badge>
          </div>
          
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full ${
                getDailyScore(selectedLog!) >= 75 
                  ? 'bg-green-500' 
                  : getDailyScore(selectedLog!) >= 50 
                  ? 'bg-orange-500' 
                  : 'bg-red-500'
              }`}
              style={{ width: `${getDailyScore(selectedLog!)}%` }}
            ></div>
          </div>
        </div>

        {/* Notes and Details */}
        {selectedLog && (
          <div className={`${theme.card} rounded-xl p-4 border-2`}>
            <h4 className={`font-semibold ${theme.text} mb-3`}>Daily Notes</h4>
            <div className="space-y-3">
              {selectedLog.workout.notes && (
                <div className="flex items-start gap-2">
                  <Dumbbell className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium ${theme.text}`}>Workout</p>
                    <p className={`text-sm ${theme.textSecondary}`}>{selectedLog.workout.notes}</p>
                  </div>
                </div>
              )}
              
              {selectedLog.nutrition.notes && (
                <div className="flex items-start gap-2">
                  <Apple className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium ${theme.text}`}>Nutrition</p>
                    <p className={`text-sm ${theme.textSecondary}`}>{selectedLog.nutrition.notes}</p>
                  </div>
                </div>
              )}
              
              {selectedLog.habit.notes && (
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium ${theme.text}`}>Habits</p>
                    <p className={`text-sm ${theme.textSecondary}`}>{selectedLog.habit.notes}</p>
                  </div>
                </div>
              )}
              
              {selectedLog.session.notes && (
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium ${theme.text}`}>Session</p>
                    <p className={`text-sm ${theme.textSecondary}`}>{selectedLog.session.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weekly Overview */}
        <div className={`${theme.card} rounded-xl p-4 border-2`}>
          <h4 className={`font-semibold ${theme.text} mb-3`}>Weekly Overview</h4>
          <div className="grid grid-cols-7 gap-2">
            {mockDailyLogs.map((log, index) => (
              <div key={index} className="text-center">
                <div className={`text-xs ${theme.textSecondary} mb-1`}>
                  {new Date(log.date).toLocaleDateString('en', { weekday: 'short' })}
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  getDailyScore(log) >= 75 
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : getDailyScore(log) >= 50
                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {getDailyScore(log)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
