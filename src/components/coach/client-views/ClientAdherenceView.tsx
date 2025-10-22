'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from '@/contexts/ThemeContext'
import { BarChart3, CheckCircle, XCircle, Calendar } from 'lucide-react'

interface ClientAdherenceViewProps {
  clientId: string
}

export default function ClientAdherenceView({ clientId }: ClientAdherenceViewProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  // Sample data - will be replaced with real data
  const adherenceData = {
    workoutAdherence: 85,
    nutritionAdherence: 78,
    weeklyAverage: 82,
    thisWeek: {
      completed: 5,
      missed: 2,
      total: 7
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-[1px] bg-gradient-to-r from-green-500 to-emerald-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent className="text-center" style={{ padding: '20px' }}>
              <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{adherenceData.workoutAdherence}%</p>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Workout Adherence</p>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-teal-500 to-cyan-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent className="text-center" style={{ padding: '20px' }}>
              <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{adherenceData.nutritionAdherence}%</p>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Nutrition Adherence</p>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-blue-500 to-indigo-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent className="text-center" style={{ padding: '20px' }}>
              <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{adherenceData.weeklyAverage}%</p>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Weekly Average</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* This Week Summary */}
      <div className="p-[1px] bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
        <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
          <CardContent style={{ padding: '24px' }}>
            <h3 className={`${theme.text} mb-4`} style={{ fontSize: '20px', fontWeight: '700' }}>This Week</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-100 dark:border-green-800/30 text-center" style={{ padding: '16px', borderRadius: '16px' }}>
                <CheckCircle className="w-8 h-8 mb-2 text-green-600 dark:text-green-400 mx-auto" />
                <p className="text-slate-800 dark:text-slate-200" style={{ fontSize: '24px', fontWeight: '700' }}>{adherenceData.thisWeek.completed}</p>
                <p className="text-slate-600 dark:text-slate-400" style={{ fontSize: '14px' }}>Completed</p>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-800/30 text-center" style={{ padding: '16px', borderRadius: '16px' }}>
                <XCircle className="w-8 h-8 mb-2 text-red-600 dark:text-red-400 mx-auto" />
                <p className="text-slate-800 dark:text-slate-200" style={{ fontSize: '24px', fontWeight: '700' }}>{adherenceData.thisWeek.missed}</p>
                <p className="text-slate-600 dark:text-slate-400" style={{ fontSize: '14px' }}>Missed</p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800/30 text-center" style={{ padding: '16px', borderRadius: '16px' }}>
                <Calendar className="w-8 h-8 mb-2 text-blue-600 dark:text-blue-400 mx-auto" />
                <p className="text-slate-800 dark:text-slate-200" style={{ fontSize: '24px', fontWeight: '700' }}>{adherenceData.thisWeek.total}</p>
                <p className="text-slate-600 dark:text-slate-400" style={{ fontSize: '14px' }}>Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Calendar View */}
      <div className="p-[1px] bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
        <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
          <CardContent style={{ padding: '24px' }}>
            <h3 className={`${theme.text} mb-4`} style={{ fontSize: '20px', fontWeight: '700' }}>7-Day Activity</h3>
            
            <div className="grid grid-cols-7 gap-2">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                const isCompleted = i < 5 // Sample: first 5 days completed
                return (
                  <div key={i} className="text-center">
                    <div className={`w-full aspect-square flex items-center justify-center mb-2 ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                    }`} style={{ borderRadius: '16px' }}>
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <p className={`${theme.textSecondary}`} style={{ fontSize: '12px', fontWeight: '600' }}>{day}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

