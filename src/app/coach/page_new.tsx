'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { 
  Dumbbell,
  Apple,
  UserPlus,
  Users,
  TrendingUp,
  Target,
  MessageCircle,
  Calendar,
  CheckCircle,
  BarChart3,
  Clock,
  Flame,
  Activity,
  BookOpen,
  Heart,
  Send
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Client {
  id: string
  first_name?: string
  last_name?: string
  avatar_url?: string
}

export default function CoachDashboard() {
  const { user } = useAuth()
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalWorkouts: 0,
    totalMealPlans: 0
  })
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [coachMessage, setCoachMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return
    
    try {
      // Load clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('client_id, status')
        .eq('coach_id', user.id)

      const totalClients = clientsData?.length || 0
      const activeClients = clientsData?.filter(c => c.status === 'active').length || 0

      // Load recent client profiles
      if (clientsData && clientsData.length > 0) {
        const recentClientIds = clientsData.slice(0, 3).map(c => c.client_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', recentClientIds)
        
        setRecentClients(profilesData || [])
      }

      // Load workout templates count
      const { data: workoutsData } = await supabase
        .from('workout_templates')
        .select('id')
        .eq('coach_id', user.id)
        .eq('is_active', true)

      // Load meal plans count
      const { data: mealPlansData } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('coach_id', user.id)
        .eq('is_active', true)

      setStats({
        totalClients,
        activeClients,
        totalWorkouts: workoutsData?.length || 0,
        totalMealPlans: mealPlansData?.length || 0
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = () => {
    if (coachMessage.trim()) {
      // TODO: Implement messaging
      alert('Message sent!')
      setCoachMessage('')
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
          <div className="p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="animate-pulse space-y-6">
                <div className={`${theme.card} rounded-3xl h-32`}></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`${theme.card} rounded-2xl h-24`}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 -left-20 w-80 h-80 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-purple-500/20 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 p-4 sm:p-6 pb-24">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Greeting Header */}
            <div className="text-center sm:text-left mb-8">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Dumbbell className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className={`text-3xl sm:text-4xl font-bold ${theme.text}`}>
                    Coach Dashboard
                  </h1>
                  <p className={`text-sm sm:text-base ${theme.textSecondary}`}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Total Clients */}
              <div className="rounded-2xl p-[1px] bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg hover:shadow-xl transition-all">
                <Card className={cn(theme.card, "rounded-2xl border-0 h-full")}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <p className={`text-xl sm:text-2xl font-bold ${theme.text}`}>{stats.totalClients}</p>
                        <p className={`text-xs sm:text-sm ${theme.textSecondary}`}>Total Clients</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Clients */}
              <div className="rounded-2xl p-[1px] bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg hover:shadow-xl transition-all">
                <Card className={cn(theme.card, "rounded-2xl border-0 h-full")}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <p className={`text-xl sm:text-2xl font-bold ${theme.text}`}>{stats.activeClients}</p>
                        <p className={`text-xs sm:text-sm ${theme.textSecondary}`}>Active</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Workout Templates */}
              <div className="rounded-2xl p-[1px] bg-gradient-to-r from-orange-500 to-amber-600 shadow-lg hover:shadow-xl transition-all">
                <Card className={cn(theme.card, "rounded-2xl border-0 h-full")}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                        <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <p className={`text-xl sm:text-2xl font-bold ${theme.text}`}>{stats.totalWorkouts}</p>
                        <p className={`text-xs sm:text-sm ${theme.textSecondary}`}>Workouts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Meal Plans */}
              <div className="rounded-2xl p-[1px] bg-gradient-to-r from-teal-500 to-cyan-600 shadow-lg hover:shadow-xl transition-all">
                <Card className={cn(theme.card, "rounded-2xl border-0 h-full")}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                        <Apple className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <p className={`text-xl sm:text-2xl font-bold ${theme.text}`}>{stats.totalMealPlans}</p>
                        <p className={`text-xs sm:text-sm ${theme.textSecondary}`}>Meal Plans</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Create & Assign */}
              <div className="rounded-3xl p-[1px] bg-gradient-to-r from-blue-500 to-indigo-600 shadow-xl">
                <Card className={cn(theme.card, "rounded-3xl border-0")}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-white" />
                      </div>
                      <h2 className={`text-xl font-bold ${theme.text}`}>Create & Assign</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Link href="/coach/programs-workouts">
                        <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-md h-20 flex flex-col items-center justify-center gap-2">
                          <Dumbbell className="w-6 h-6" />
                          <span className="text-sm font-semibold">Workouts</span>
                        </Button>
                      </Link>
                      
                      <Link href="/coach/meal-plans">
                        <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-xl shadow-md h-20 flex flex-col items-center justify-center gap-2">
                          <Apple className="w-6 h-6" />
                          <span className="text-sm font-semibold">Meal Plans</span>
                        </Button>
                      </Link>
                      
                      <Link href="/coach/programs-workouts">
                        <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl shadow-md h-20 flex flex-col items-center justify-center gap-2">
                          <BookOpen className="w-6 h-6" />
                          <span className="text-sm font-semibold">Programs</span>
                        </Button>
                      </Link>
                      
                      <Link href="/coach/clients">
                        <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-md h-20 flex flex-col items-center justify-center gap-2">
                          <UserPlus className="w-6 h-6" />
                          <span className="text-sm font-semibold">Add Client</span>
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Client Management */}
              <div className="rounded-3xl p-[1px] bg-gradient-to-r from-slate-500 to-slate-600 shadow-xl">
                <Card className={cn(theme.card, "rounded-3xl border-0")}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h2 className={`text-xl font-bold ${theme.text}`}>Recent Clients</h2>
                      </div>
                      <Link href="/coach/clients">
                        <Button size="sm" variant="ghost" className="rounded-xl">
                          View All
                        </Button>
                      </Link>
                    </div>
                    
                    {recentClients.length > 0 ? (
                      <div className="space-y-3">
                        {recentClients.map((client) => (
                          <div key={client.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                              {client.first_name?.[0] || 'C'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold ${theme.text} truncate`}>
                                {client.first_name} {client.last_name}
                              </p>
                            </div>
                            <MessageCircle className="w-4 h-4 text-slate-400" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className={`text-sm ${theme.textSecondary}`}>No clients yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Client Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              
              {/* Overall Adherence */}
              <Link href="/coach/clients" className="block">
                <div className="rounded-3xl p-[1px] bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg hover:shadow-xl transition-all">
                  <Card className={cn(theme.card, "rounded-3xl border-0 h-full")}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className={`text-2xl font-bold ${theme.text}`}>87%</p>
                          <p className={`text-sm ${theme.textSecondary}`}>Avg Adherence</p>
                        </div>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                        ↑ 5% from last week
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </Link>

              {/* Overall Progress */}
              <Link href="/coach/clients" className="block">
                <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 to-amber-600 shadow-lg hover:shadow-xl transition-all">
                  <Card className={cn(theme.card, "rounded-3xl border-0 h-full")}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className={`text-2xl font-bold ${theme.text}`}>156</p>
                          <p className={`text-sm ${theme.textSecondary}`}>Total Progress</p>
                        </div>
                      </div>
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                        Workouts completed this week
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </Link>

              {/* Goals Tracking */}
              <Link href="/coach/clients" className="block">
                <div className="rounded-3xl p-[1px] bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg hover:shadow-xl transition-all">
                  <Card className={cn(theme.card, "rounded-3xl border-0 h-full")}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                          <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className={`text-2xl font-bold ${theme.text}`}>42</p>
                          <p className={`text-sm ${theme.textSecondary}`}>Active Goals</p>
                        </div>
                      </div>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        12 goals achieved this month
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </Link>
            </div>

            {/* Quick Access Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Client List */}
              <Link href="/coach/clients" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg hover:shadow-xl transition-all">
                  <div className={cn(
                    "rounded-2xl p-5 h-full",
                    isDark ? 'bg-slate-800' : 'bg-white'
                  )}>
                    <Users className={`w-8 h-8 mb-3 mx-auto ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm text-center`}>Client List</p>
                  </div>
                </div>
              </Link>

              {/* Compliance */}
              <Link href="/coach/clients" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg hover:shadow-xl transition-all">
                  <div className={cn(
                    "rounded-2xl p-5 h-full",
                    isDark ? 'bg-slate-800' : 'bg-white'
                  )}>
                    <BarChart3 className={`w-8 h-8 mb-3 mx-auto ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm text-center`}>Adherence</p>
                  </div>
                </div>
              </Link>

              {/* Progress Tracking */}
              <Link href="/coach/clients" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-orange-500 to-amber-600 shadow-lg hover:shadow-xl transition-all">
                  <div className={cn(
                    "rounded-2xl p-5 h-full",
                    isDark ? 'bg-slate-800' : 'bg-white'
                  )}>
                    <TrendingUp className={`w-8 h-8 mb-3 mx-auto ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm text-center`}>Progress</p>
                  </div>
                </div>
              </Link>

              {/* Goals & Habits */}
              <Link href="/coach/clients" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg hover:shadow-xl transition-all">
                  <div className={cn(
                    "rounded-2xl p-5 h-full",
                    isDark ? 'bg-slate-800' : 'bg-white'
                  )}>
                    <Target className={`w-8 h-8 mb-3 mx-auto ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm text-center`}>Goals</p>
                  </div>
                </div>
              </Link>

              {/* Sessions */}
              <Link href="/coach/sessions" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg hover:shadow-xl transition-all">
                  <div className={cn(
                    "rounded-2xl p-5 h-full",
                    isDark ? 'bg-slate-800' : 'bg-white'
                  )}>
                    <Calendar className={`w-8 h-8 mb-3 mx-auto ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm text-center`}>Sessions</p>
                  </div>
                </div>
              </Link>

              {/* Habits */}
              <Link href="/coach/clients" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-teal-500 to-cyan-600 shadow-lg hover:shadow-xl transition-all">
                  <div className={cn(
                    "rounded-2xl p-5 h-full",
                    isDark ? 'bg-slate-800' : 'bg-white'
                  )}>
                    <Flame className={`w-8 h-8 mb-3 mx-auto ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm text-center`}>Habits</p>
                  </div>
                </div>
              </Link>

              {/* Analytics */}
              <Link href="/coach/clients" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-yellow-500 to-orange-600 shadow-lg hover:shadow-xl transition-all">
                  <div className={cn(
                    "rounded-2xl p-5 h-full",
                    isDark ? 'bg-slate-800' : 'bg-white'
                  )}>
                    <Activity className={`w-8 h-8 mb-3 mx-auto ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm text-center`}>Analytics</p>
                  </div>
                </div>
              </Link>

              {/* Messaging */}
              <Link href="/coach/clients" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-slate-500 to-slate-600 shadow-lg hover:shadow-xl transition-all">
                  <div className={cn(
                    "rounded-2xl p-5 h-full",
                    isDark ? 'bg-slate-800' : 'bg-white'
                  )}>
                    <MessageCircle className={`w-8 h-8 mb-3 mx-auto ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm text-center`}>Messages</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Broadcast Message to Clients */}
            <div className="rounded-3xl p-[1px] bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-500 shadow-xl">
              <Card className={cn(theme.card, "rounded-3xl border-0")}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <h2 className={`text-xl font-bold ${theme.text}`}>Broadcast Message</h2>
                  </div>
                  
                  <div className="flex gap-3">
                    <Input
                      placeholder="Send a message to all your clients..."
                      value={coachMessage}
                      onChange={(e) => setCoachMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className={cn(
                        "flex-1 rounded-xl border-2 h-12 text-base",
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      )}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!coachMessage.trim()}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl px-6 shadow-md disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  <p className={`text-xs ${theme.textSecondary} mt-3`}>
                    💬 This message will be sent to all {stats.activeClients} active clients
                  </p>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

