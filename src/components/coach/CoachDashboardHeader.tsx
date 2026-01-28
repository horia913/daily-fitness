'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useCoachDashboardData } from '@/hooks/useDashboardData'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Plus
} from 'lucide-react'

export default function CoachDashboardHeader() {
  const { user } = useAuth()
  const { stats, loading } = useCoachDashboardData()
  const router = useRouter()

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getCoachName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0]
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'Coach'
  }

  if (loading) {
    return (
      <div className="p-6 min-h-[200px]">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-[color:var(--fc-glass-border)] rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-[color:var(--fc-glass-border)] rounded w-1/2 mb-6"></div>
            <div className="flex gap-4">
              <div className="h-16 bg-[color:var(--fc-glass-border)] rounded-lg w-32"></div>
              <div className="h-16 bg-[color:var(--fc-glass-border)] rounded-lg w-32"></div>
              <div className="h-16 bg-[color:var(--fc-glass-border)] rounded-lg w-32"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 min-h-[200px]">
      <div className="max-w-7xl mx-auto">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 min-w-0">
            <span className="fc-pill fc-pill-glass fc-text-workouts">
              Coach overview
            </span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold fc-text-primary mb-2 mt-2 truncate">
              {getTimeBasedGreeting()}, {getCoachName()}!
            </h1>
            <p className="text-sm sm:text-base lg:text-lg fc-text-dim">
              Here's your coaching overview for today
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Add Client Button */}
            <Button 
              onClick={() => router.push('/coach/clients/add')}
              className="fc-btn fc-btn-primary fc-press rounded-full px-3 sm:px-6"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Client</span>
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Active Clients */}
          <div className="fc-glass fc-card rounded-2xl p-6 border border-[color:var(--fc-glass-border)]">
            <div className="flex items-center gap-4">
              <div className="fc-icon-tile fc-icon-workouts">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold fc-text-primary">
                  {stats?.activeClients || 0}
                </p>
                <p className="text-sm fc-text-dim">
                  Active Clients
                </p>
              </div>
            </div>
          </div>

          {/* Today's Sessions */}
          <div className="fc-glass fc-card rounded-2xl p-6 border border-[color:var(--fc-glass-border)]">
            <div className="flex items-center gap-4">
              <div className="fc-icon-tile fc-icon-workouts">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold fc-text-primary">
                  {(stats as any)?.todaysSessions?.length || 0}
                </p>
                <p className="text-sm fc-text-dim">
                  Today's Sessions
                </p>
              </div>
            </div>
          </div>

          {/* Workouts Created */}
          <div className="fc-glass fc-card rounded-2xl p-6 border border-[color:var(--fc-glass-border)]">
            <div className="flex items-center gap-4">
              <div className="fc-icon-tile fc-icon-workouts">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold fc-text-primary">
                  {stats?.workoutsCreated || 0}
                </p>
                <p className="text-sm fc-text-dim">
                  Workouts Created
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
