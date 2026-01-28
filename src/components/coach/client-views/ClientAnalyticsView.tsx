'use client'

import { Activity, Clock, Calendar, Smartphone, TrendingUp } from 'lucide-react'

interface ClientAnalyticsViewProps {
  clientId: string
}

export default function ClientAnalyticsView({ clientId }: ClientAnalyticsViewProps) {
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
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
          <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts">
            <Activity className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold fc-text-primary leading-tight">
            {analyticsData.totalLogins}
          </p>
          <p className="text-sm fc-text-dim">Total Logins</p>
        </div>

        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
          <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold fc-text-primary leading-tight">
            {analyticsData.avgSessionDuration}
          </p>
          <p className="text-sm fc-text-dim">Avg Session</p>
        </div>

        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
          <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold fc-text-primary leading-tight">
            {analyticsData.totalTimeSpent}
          </p>
          <p className="text-sm fc-text-dim">Total Time</p>
        </div>

        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
          <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-lg font-semibold fc-text-primary">
            {analyticsData.mostActiveDay}
          </p>
          <p className="text-sm fc-text-dim">Most Active</p>
        </div>
      </div>

      {/* Last Login */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
        <div className="flex items-center gap-4">
          <div className="fc-icon-tile fc-icon-workouts">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm fc-text-subtle">Last Active</p>
            <p className="text-lg font-semibold fc-text-primary">
              {new Date(analyticsData.lastLogin).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Weekly Login Chart */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
        <h3 className="text-xl font-semibold fc-text-primary mb-4">
          Weekly Login Activity
        </h3>
        <div className="flex items-end gap-3 h-40">
          {analyticsData.weeklyLogins.map((count, i) => {
            const maxCount = Math.max(...analyticsData.weeklyLogins)
            const height = (count / maxCount) * 100

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full fc-progress-track rounded-t-lg relative h-full overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full fc-progress-fill transition-all duration-500"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold fc-text-primary">{count}</p>
                  <p className="text-xs fc-text-subtle">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Usage Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5">
          <h4 className="text-sm font-semibold fc-text-subtle mb-4">
            Most Active Time
          </h4>
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold fc-text-primary">
                {analyticsData.mostActiveTime}
              </p>
              <p className="text-sm fc-text-dim">Peak usage hours</p>
            </div>
          </div>
        </div>

        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5">
          <h4 className="text-sm font-semibold fc-text-subtle mb-4">
            Engagement Score
          </h4>
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold fc-text-primary">92%</p>
              <p className="text-sm fc-text-dim">Highly engaged</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

