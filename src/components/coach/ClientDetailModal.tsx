'use client'

import { Button } from '@/components/ui/button'
import { 
  X,
  Dumbbell,
  Apple,
  TrendingUp,
  BarChart3,
  Target,
  Flame,
  Activity,
  ChevronRight,
  User,
  CreditCard
} from 'lucide-react'

interface Client {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  avatar_url?: string
}

interface ClientDetailModalProps {
  client: Client
  onClose: () => void
  onSelectFunction: (functionType: string) => void
}

export default function ClientDetailModal({ client, onClose, onSelectFunction }: ClientDetailModalProps) {
  const functionCards = [
    {
      id: 'profile',
      title: 'Client Profile',
      description: 'View personal information & settings',
      icon: User,
      iconBg: 'fc-icon-neutral'
    },
    {
      id: 'workouts',
      title: 'Assigned Workouts',
      description: 'View and manage workout plans',
      icon: Dumbbell,
      iconBg: 'fc-icon-workouts'
    },
    {
      id: 'meals',
      title: 'Assigned Meal Plans',
      description: 'View and manage nutrition',
      icon: Apple,
      iconBg: 'fc-icon-meals'
    },
    {
      id: 'progress',
      title: 'Client Progress',
      description: 'Check-ins, measurements, photos',
      icon: TrendingUp,
      iconBg: 'fc-icon-workouts'
    },
    {
      id: 'adherence',
      title: 'Client Adherence',
      description: 'Workout & nutrition compliance',
      icon: BarChart3,
      iconBg: 'fc-icon-workouts'
    },
    {
      id: 'goals',
      title: 'Goals & Milestones',
      description: 'Track client objectives',
      icon: Target,
      iconBg: 'fc-icon-workouts'
    },
    {
      id: 'habits',
      title: 'Habits & Lifestyle',
      description: 'Sleep, water, steps, cardio',
      icon: Flame,
      iconBg: 'fc-icon-habits'
    },
    {
      id: 'clipcards',
      title: 'ClipCards',
      description: 'Manage session credits & packages',
      icon: CreditCard,
      iconBg: 'fc-icon-neutral'
    },
    {
      id: 'analytics',
      title: 'App Analytics',
      description: 'Login history, time spent',
      icon: Activity,
      iconBg: 'fc-icon-neutral'
    }
  ]

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-4 px-4 sm:px-8 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="w-full max-w-[1600px]"
        style={{ maxHeight: 'min(88vh, calc(100vh - 4rem))' }}
      >
        <div className="fc-modal fc-card overflow-hidden shadow-2xl h-[min(88vh,calc(100vh-4rem))]">
          <div className="h-full flex flex-col">
            {/* Header - Sticky */}
            <div className="sticky top-0 z-10 flex-shrink-0 border-b border-[color:var(--fc-glass-border)] px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="fc-icon-tile fc-icon-workouts text-lg font-bold">
                    {client.first_name?.[0] || 'C'}
                  </div>
                  <div>
                    <span className="fc-pill fc-pill-glass fc-text-workouts">Client Overview</span>
                    <h2 className="text-2xl font-bold fc-text-primary mt-2">
                      {client.first_name} {client.last_name}
                    </h2>
                    <p className="text-sm fc-text-dim">{client.email}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full fc-btn fc-btn-ghost"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6">
              <div className="pt-6 pb-8 space-y-4">
                <h3 className="text-xl font-bold fc-text-primary mb-4">
                  Select Function to View
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {functionCards.map((card) => {
                    const Icon = card.icon
                    return (
                      <div 
                        key={card.id}
                        onClick={() => onSelectFunction(card.id)}
                        className="cursor-pointer"
                      >
                        <div className="fc-list-row rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]">
                          <div className="flex items-center gap-4">
                            <div className={`fc-icon-tile ${card.iconBg}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="fc-text-primary mb-1 text-base font-semibold">
                                {card.title}
                              </h4>
                              <p className="fc-text-dim text-sm">
                                {card.description}
                              </p>
                            </div>
                            <ChevronRight className="fc-text-subtle flex-shrink-0 w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer - Sticky */}
            <div className="flex-shrink-0 border-t border-[color:var(--fc-glass-border)] px-6 py-4">
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full h-11 fc-btn fc-btn-secondary text-base font-semibold"
              >
                Close
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
