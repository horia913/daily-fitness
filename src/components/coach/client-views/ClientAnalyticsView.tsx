'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from '@/contexts/ThemeContext'
import { Activity, Clock, Calendar, Smartphone, TrendingUp } from 'lucide-react'

interface ClientAnalyticsViewProps {
  clientId: string
}

export default function ClientAnalyticsView({ clientId }: ClientAnalyticsViewProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const analyticsData = {
    totalLogins: 156,
    lastLogin: new Date().toISOString(),
    avgSessionDuration: '12m',
    totalTimeSpent: '31h 24m',
    mostActiveDay: 'Monday',
    mostActiveTime: '6-8 AM',
    weeklyLogins: [5, 6, 7, 6, 5, 4, 3]
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-[1px] bg-gradient-to-r from-blue-500 to-indigo-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent className="text-center" style={{ padding: '20px' }}>
              <Activity className="w-8 h-8 mb-2 text-blue-600 dark:text-blue-400 mx-auto" />
              <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{analyticsData.totalLogins}</p>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Total Logins</p>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-green-500 to-emerald-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent className="text-center" style={{ padding: '20px' }}>
              <Clock className="w-8 h-8 mb-2 text-green-600 dark:text-green-400 mx-auto" />
              <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{analyticsData.avgSessionDuration}</p>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Avg Session</p>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-orange-500 to-amber-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent className="text-center" style={{ padding: '20px' }}>
              <TrendingUp className="w-8 h-8 mb-2 text-orange-600 dark:text-orange-400 mx-auto" />
              <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{analyticsData.totalTimeSpent}</p>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Total Time</p>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-purple-500 to-indigo-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent className="text-center" style={{ padding: '20px' }}>
              <Calendar className="w-8 h-8 mb-2 text-purple-600 dark:text-purple-400 mx-auto" />
              <p className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '700' }}>{analyticsData.mostActiveDay}</p>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Most Active</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Last Login */}
      <div className="p-[1px] bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
        <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
          <CardContent style={{ padding: '24px' }}>
            <div className="flex items-center gap-4">
              <Smartphone className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <p className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>Last Active</p>
                <p className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '700' }}>
                  {new Date(analyticsData.lastLogin).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Login Chart */}
      <div className="p-[1px] bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
        <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
          <CardContent style={{ padding: '24px' }}>
            <h3 className={`${theme.text} mb-4`} style={{ fontSize: '20px', fontWeight: '700' }}>Weekly Login Activity</h3>
            
            <div className="flex items-end gap-3 h-40">
              {analyticsData.weeklyLogins.map((count, i) => {
                const maxCount = Math.max(...analyticsData.weeklyLogins)
                const height = (count / maxCount) * 100
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-t-lg relative" style={{ height: '100%' }}>
                      <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-indigo-600 rounded-t-lg transition-all duration-500"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{count}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-[1px] bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent style={{ padding: '20px' }}>
              <h4 className={`${theme.text} mb-4`} style={{ fontSize: '16px', fontWeight: '600' }}>Most Active Time</h4>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md" style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className={`${theme.text}`} style={{ fontSize: '24px', fontWeight: '700' }}>{analyticsData.mostActiveTime}</p>
                  <p className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>Peak usage hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent style={{ padding: '20px' }}>
              <h4 className={`${theme.text} mb-4`} style={{ fontSize: '16px', fontWeight: '600' }}>Engagement Score</h4>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md" style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className={`${theme.text}`} style={{ fontSize: '24px', fontWeight: '700' }}>92%</p>
                  <p className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>Highly engaged</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

