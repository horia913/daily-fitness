'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { Target, TrendingUp, Award, Calendar } from 'lucide-react'

interface ClientGoalsViewProps {
  clientId: string
}

export default function ClientGoalsView({ clientId }: ClientGoalsViewProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  // Sample goals data
  const goals = [
    {
      id: '1',
      title: 'Bench Press 100kg',
      type: 'Strength PR',
      current: 85,
      target: 100,
      deadline: '2025-12-31',
      status: 'active'
    },
    {
      id: '2',
      title: 'Lose 10kg',
      type: 'Body Weight',
      current: 85,
      target: 75,
      deadline: '2025-11-30',
      status: 'active'
    },
    {
      id: '3',
      title: 'Complete 50 Workouts',
      type: 'Workout Count',
      current: 32,
      target: 50,
      deadline: '2025-12-31',
      status: 'active'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-[1px] bg-gradient-to-r from-purple-500 to-indigo-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent className="text-center" style={{ padding: '16px' }}>
              <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{goals.length}</p>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Active Goals</p>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-green-500 to-emerald-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent className="text-center" style={{ padding: '16px' }}>
              <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>5</p>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Achieved</p>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-blue-500 to-blue-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent className="text-center" style={{ padding: '16px' }}>
              <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>67%</p>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Avg Progress</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const progress = Math.round((goal.current / goal.target) * 100)
          return (
            <div key={goal.id} className="p-[1px] bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
                <CardContent style={{ padding: '20px' }}>
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md" style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
                      <Target className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className={`${theme.text} mb-1`} style={{ fontSize: '18px', fontWeight: '600' }}>{goal.title}</h4>
                          <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs">
                            {goal.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {new Date(goal.deadline).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className={theme.textSecondary}>
                            {goal.current} / {goal.target} {goal.type.includes('kg') ? 'kg' : ''}
                          </span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {progress}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}

