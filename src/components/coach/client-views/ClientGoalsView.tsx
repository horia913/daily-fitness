'use client'

import { Target, Calendar } from 'lucide-react'

interface ClientGoalsViewProps {
  clientId: string
}

export default function ClientGoalsView({ clientId }: ClientGoalsViewProps) {
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
      {/* Overview */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Goals
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Progress Snapshot
              </h3>
              <p className="text-sm fc-text-dim">
                Current targets and progress momentum
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">{goals.length}</p>
              <p className="text-sm fc-text-dim">Active Goals</p>
            </div>

            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">5</p>
              <p className="text-sm fc-text-dim">Achieved</p>
            </div>

            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">67%</p>
              <p className="text-sm fc-text-dim">Avg Progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Active Goals
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Goal Timeline
              </h3>
            </div>
            <span className="ml-auto fc-pill fc-pill-glass fc-text-workouts text-xs">
              {goals.length}
            </span>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
        {goals.map((goal) => {
          const progress = Math.round((goal.current / goal.target) * 100)
          return (
            <div
              key={goal.id}
              className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5"
            >
              <div className="flex items-start gap-4">
                <div className="fc-icon-tile fc-icon-workouts">
                  <Target className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="fc-text-primary mb-1 text-lg font-semibold">
                        {goal.title}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                          {goal.type}
                        </span>
                        <span className="fc-pill fc-pill-glass fc-text-warning text-xs">
                          {goal.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 fc-text-subtle" />
                      <span className="text-sm fc-text-subtle">
                        {new Date(goal.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="fc-text-subtle">
                        {goal.current} / {goal.target} {goal.type.includes('kg') ? 'kg' : ''}
                      </span>
                      <span className="font-semibold fc-text-workouts">
                        {progress}%
                      </span>
                    </div>
                    <div className="fc-progress-track h-3 rounded-full overflow-hidden">
                      <div
                        className="fc-progress-fill h-full transition-all duration-500"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}

