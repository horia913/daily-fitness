'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'
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
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const functionCards = [
    {
      id: 'profile',
      title: 'Client Profile',
      description: 'View personal information & settings',
      icon: User,
      gradient: 'from-purple-500 to-indigo-600',
      iconBg: 'from-purple-500 to-indigo-600'
    },
    {
      id: 'workouts',
      title: 'Assigned Workouts',
      description: 'View and manage workout plans',
      icon: Dumbbell,
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'meals',
      title: 'Assigned Meal Plans',
      description: 'View and manage nutrition',
      icon: Apple,
      gradient: 'from-teal-500 to-cyan-600',
      iconBg: 'from-teal-500 to-cyan-600'
    },
    {
      id: 'progress',
      title: 'Client Progress',
      description: 'Check-ins, measurements, photos',
      icon: TrendingUp,
      gradient: 'from-orange-500 to-amber-600',
      iconBg: 'from-orange-500 to-amber-600'
    },
    {
      id: 'adherence',
      title: 'Client Adherence',
      description: 'Workout & nutrition compliance',
      icon: BarChart3,
      gradient: 'from-green-500 to-emerald-600',
      iconBg: 'from-green-500 to-emerald-600'
    },
    {
      id: 'goals',
      title: 'Goals & Milestones',
      description: 'Track client objectives',
      icon: Target,
      gradient: 'from-purple-500 to-indigo-600',
      iconBg: 'from-purple-500 to-indigo-600'
    },
    {
      id: 'habits',
      title: 'Habits & Lifestyle',
      description: 'Sleep, water, steps, cardio',
      icon: Flame,
      gradient: 'from-yellow-500 to-orange-600',
      iconBg: 'from-yellow-500 to-orange-600'
    },
    {
      id: 'clipcards',
      title: 'ClipCards',
      description: 'Manage session credits & packages',
      icon: CreditCard,
      gradient: 'from-pink-500 to-rose-600',
      iconBg: 'from-pink-500 to-rose-600'
    },
    {
      id: 'analytics',
      title: 'App Analytics',
      description: 'Login history, time spent',
      icon: Activity,
      gradient: 'from-slate-500 to-slate-600',
      iconBg: 'from-slate-500 to-slate-600'
    }
  ]

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-4 px-4 sm:px-8 bg-black/50 overflow-y-auto">
      <div 
        className="w-full"
        style={{
          maxWidth: '1600px',
          maxHeight: 'min(88vh, calc(100vh - 4rem))'
        }}
      >
        <div className="overflow-hidden shadow-2xl" style={{
          borderRadius: '24px',
          height: 'min(88vh, calc(100vh - 4rem))',
          maxHeight: 'min(88vh, calc(100vh - 4rem))',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
        }}>
          <div className={`${theme.card} h-full flex flex-col`}>
            
            {/* Header - Sticky */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-500 to-indigo-600 flex-shrink-0" style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold shadow-lg" style={{ width: '56px', height: '56px', borderRadius: '18px', fontSize: '20px' }}>
                    {client.first_name?.[0] || 'C'}
                  </div>
                  <div>
                    <h2 className="text-white" style={{ fontSize: '28px', fontWeight: '700' }}>
                      {client.first_name} {client.last_name}
                    </h2>
                    <p className="text-white/80" style={{ fontSize: '14px' }}>{client.email}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '0 24px' }}>
              <div style={{ paddingTop: '24px', paddingBottom: '32px' }} className="space-y-4">
                <h3 className={`${theme.text} mb-4`} style={{ fontSize: '20px', fontWeight: '700' }}>
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
                        <div className={`p-[1px] bg-gradient-to-r ${card.gradient} hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`} style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                          <Card className={`${theme.card} border-0 h-full`} style={{ borderRadius: '24px' }}>
                            <CardContent style={{ padding: '20px' }}>
                              <div className="flex items-center gap-4 mb-3">
                                <div className={`bg-gradient-to-br ${card.iconBg} flex items-center justify-center shadow-md`} style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
                                  <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className={`${theme.text} mb-1`} style={{ fontSize: '16px', fontWeight: '600' }}>
                                    {card.title}
                                  </h4>
                                  <p className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>
                                    {card.description}
                                  </p>
                                </div>
                                <ChevronRight className={`${theme.textSecondary} flex-shrink-0`} style={{ width: '20px', height: '20px' }} />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer - Sticky */}
            <div className={`flex-shrink-0 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`} style={{ padding: '16px 24px' }}>
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full h-11"
                style={{ borderRadius: '20px', fontSize: '16px', fontWeight: '600' }}
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
