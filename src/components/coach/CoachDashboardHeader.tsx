'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
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
  const { getThemeStyles } = useTheme()
  const { stats, loading } = useCoachDashboardData()
  const router = useRouter()

  const theme = getThemeStyles()

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
      <div className={`p-6 ${theme.background} min-h-[200px]`}>
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-6"></div>
            <div className="flex gap-4">
              <div className="h-16 bg-slate-200 rounded-lg w-32"></div>
              <div className="h-16 bg-slate-200 rounded-lg w-32"></div>
              <div className="h-16 bg-slate-200 rounded-lg w-32"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 ${theme.background} min-h-[200px] relative overflow-hidden`}>
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${theme.text} mb-2 truncate`}>
              {getTimeBasedGreeting()}, {getCoachName()}! 👋
            </h1>
            <p className={`text-sm sm:text-base lg:text-lg ${theme.textSecondary}`}>
              Here's your coaching overview for today
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Add Client Button */}
            <Button 
              onClick={() => router.push('/coach/clients/add')}
              className={`${theme.primary} ${theme.shadow} rounded-full px-3 sm:px-6`}
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Client</span>
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Active Clients */}
          <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6 border-2 hover:border-purple-300 transition-all duration-300`}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${theme.text}`}>
                  {stats?.activeClients || 0}
                </p>
                <p className={`text-sm ${theme.textSecondary}`}>
                  Active Clients
                </p>
              </div>
            </div>
          </div>

          {/* Today's Sessions */}
          <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6 border-2 hover:border-orange-300 transition-all duration-300`}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${theme.text}`}>
                  {stats?.todaysSessions?.length || 0}
                </p>
                <p className={`text-sm ${theme.textSecondary}`}>
                  Today's Sessions
                </p>
              </div>
            </div>
          </div>

          {/* Workouts Created */}
          <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6 border-2 hover:border-green-300 transition-all duration-300`}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${theme.text}`}>
                  {stats?.workoutsCreated || 0}
                </p>
                <p className={`text-sm ${theme.textSecondary}`}>
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
