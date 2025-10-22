'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from '@/contexts/ThemeContext'
import { Flame, Droplet, Footprints, Heart, CheckCircle } from 'lucide-react'

interface ClientHabitsViewProps {
  clientId: string
}

export default function ClientHabitsView({ clientId }: ClientHabitsViewProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const habits = [
    {
      id: 'sleep',
      name: 'Sleep',
      icon: Heart,
      gradient: 'from-indigo-500 to-purple-600',
      current: '7.5h',
      target: '8h',
      streak: 5,
      weekData: [true, true, false, true, true, true, true]
    },
    {
      id: 'water',
      name: 'Water Intake',
      icon: Droplet,
      gradient: 'from-blue-500 to-cyan-600',
      current: '2.8L',
      target: '3L',
      streak: 12,
      weekData: [true, true, true, true, false, true, true]
    },
    {
      id: 'steps',
      name: 'Daily Steps',
      icon: Footprints,
      gradient: 'from-green-500 to-emerald-600',
      current: '8,500',
      target: '10,000',
      streak: 3,
      weekData: [true, false, true, true, true, false, true]
    },
    {
      id: 'cardio',
      name: 'Cardio Sessions',
      icon: Flame,
      gradient: 'from-orange-500 to-red-600',
      current: '2/week',
      target: '3/week',
      streak: 2,
      weekData: [false, true, false, false, true, false, false]
    }
  ]

  return (
    <div className="space-y-4">
      {habits.map((habit) => {
        const Icon = habit.icon
        const completionRate = Math.round((habit.weekData.filter(d => d).length / 7) * 100)
        
        return (
          <div key={habit.id} className={`p-[1px] bg-gradient-to-r ${habit.gradient}`} style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
              <CardContent style={{ padding: '20px' }}>
                <div className="flex items-start gap-4">
                  <div className={`bg-gradient-to-br ${habit.gradient} flex items-center justify-center flex-shrink-0 shadow-md`} style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '600' }}>{habit.name}</h4>
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                          {habit.streak} day streak
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>
                        Current: <span className="font-bold text-slate-800 dark:text-slate-200">{habit.current}</span>
                      </span>
                      <span className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>
                        Target: <span className="font-bold text-slate-800 dark:text-slate-200">{habit.target}</span>
                      </span>
                      <span className="text-green-600 dark:text-green-400" style={{ fontSize: '14px', fontWeight: '600' }}>
                        {completionRate}% this week
                      </span>
                    </div>

                    {/* 7-Day Visual */}
                    <div className="flex gap-2">
                      {habit.weekData.map((completed, i) => (
                        <div
                          key={i}
                          className={`flex-1 flex items-center justify-center ${
                            completed 
                              ? 'bg-green-500 text-white' 
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                          }`}
                          style={{ height: '32px', borderRadius: '12px' }}
                        >
                          {completed && <CheckCircle className="w-4 h-4" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}

