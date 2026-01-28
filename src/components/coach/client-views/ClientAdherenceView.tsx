'use client'

import { BarChart3, CheckCircle, XCircle, Calendar } from 'lucide-react'

interface ClientAdherenceViewProps {
  clientId: string
}

export default function ClientAdherenceView({ clientId }: ClientAdherenceViewProps) {
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
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
          <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts">
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold fc-text-primary leading-tight">
            {adherenceData.workoutAdherence}%
          </p>
          <p className="text-sm fc-text-dim">Workout Adherence</p>
        </div>

        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
          <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts">
            <BarChart3 className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold fc-text-primary leading-tight">
            {adherenceData.nutritionAdherence}%
          </p>
          <p className="text-sm fc-text-dim">Nutrition Adherence</p>
        </div>

        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
          <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold fc-text-primary leading-tight">
            {adherenceData.weeklyAverage}%
          </p>
          <p className="text-sm fc-text-dim">Weekly Average</p>
        </div>
      </div>

      {/* This Week Summary */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
        <h3 className="text-xl font-semibold fc-text-primary mb-4">This Week</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-4 py-4 text-center">
            <CheckCircle className="w-7 h-7 mb-2 fc-text-success mx-auto" />
            <p className="text-2xl font-semibold fc-text-primary">
              {adherenceData.thisWeek.completed}
            </p>
            <p className="text-sm fc-text-subtle">Completed</p>
          </div>

          <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-4 py-4 text-center">
            <XCircle className="w-7 h-7 mb-2 fc-text-error mx-auto" />
            <p className="text-2xl font-semibold fc-text-primary">
              {adherenceData.thisWeek.missed}
            </p>
            <p className="text-sm fc-text-subtle">Missed</p>
          </div>

          <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-4 py-4 text-center">
            <Calendar className="w-7 h-7 mb-2 fc-text-workouts mx-auto" />
            <p className="text-2xl font-semibold fc-text-primary">
              {adherenceData.thisWeek.total}
            </p>
            <p className="text-sm fc-text-subtle">Scheduled</p>
          </div>
        </div>
      </div>

      {/* Weekly Calendar View */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
        <h3 className="text-xl font-semibold fc-text-primary mb-4">7-Day Activity</h3>
        <div className="grid grid-cols-7 gap-2">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
            const isCompleted = i < 5 // Sample: first 5 days completed
            return (
              <div key={i} className="text-center">
                <div
                  className={`w-full aspect-square flex items-center justify-center mb-2 rounded-2xl border ${
                    isCompleted
                      ? 'bg-[color:var(--fc-domain-workouts)] fc-text-primary border-transparent'
                      : 'fc-glass-soft border-[color:var(--fc-glass-border)] fc-text-subtle'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold fc-text-subtle">{day}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

