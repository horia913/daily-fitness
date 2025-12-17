'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  TrendingUp, 
  Calendar, 
  Dumbbell, 
  Target, 
  Award,
  Flame,
  Clock,
  BarChart3,
  Activity,
  Zap,
  Users,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Star,
  Copy,
  UserPlus,
  Filter,
  SortAsc,
  Search,
  Flag,
  Timer,
  DollarSign,
  Package,
  Trophy,
  Eye,
  Heart,
  Smile,
  ThumbsUp,
  TrendingDown,
  Minus,
  Plus,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface ClientProgress {
  id: string
  name: string
  totalWorkouts: number
  thisWeek: number
  thisMonth: number
  streak: number
  completionRate: number
  lastWorkout: string
  adherence: number
}

interface WorkoutStats {
  totalSessions: number
  completedSessions: number
  thisWeek: number
  thisMonth: number
  averageCompletionRate: number
}

export default function CoachProgress() {
  const { user } = useAuth()
  const { isDark, getThemeStyles, performanceSettings } = useTheme()
  const theme = getThemeStyles()
  
  const [loading, setLoading] = useState(true)
  const [clientProgress, setClientProgress] = useState<ClientProgress[]>([])
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats>({
    totalSessions: 0,
    completedSessions: 0,
    thisWeek: 0,
    thisMonth: 0,
    averageCompletionRate: 0
  })
  
  // Enhanced filtering and search
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState('month')
  const [metricFilter, setMetricFilter] = useState('all')
  const [sortBy, setSortBy] = useState('adherence')
  
  // Client details state
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [clientDetailPeriod, setClientDetailPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  
  // Analytics state
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [clientGroup, setClientGroup] = useState<string>('all')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['adherence', 'workouts', 'strength'])

  useEffect(() => {
    if (user) {
      loadProgressData()
    }
  }, [user])

  const loadProgressData = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Load client profiles first
      const { data: clientsData, error: clientsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'client')

      if (clientsError) throw clientsError

      // Then load workout sessions separately for each client
      const processedClients: ClientProgress[] = []
      
      for (const client of clientsData || []) {
        const { data: sessionsData } = await supabase
          .from('workout_sessions')
          .select('id, status, completed_at, assigned_at')
          .eq('client_id', client.id)
          .eq('status', 'completed')

        const completedSessions = sessionsData || []
        
        // Calculate this week's sessions
        const now = new Date()
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
        const thisWeekSessions = completedSessions.filter(s => 
          new Date(s.completed_at) >= weekStart
        )
        
        // Calculate this month's sessions
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const thisMonthSessions = completedSessions.filter(s => 
          new Date(s.completed_at) >= monthStart
        )
        
        // Calculate streak
        const sortedSessions = completedSessions.sort((a, b) => 
          new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        )
        
        let currentStreak = 0
        let currentDate = new Date()
        
        for (const session of sortedSessions) {
          const sessionDate = new Date(session.completed_at)
          const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysDiff <= 1) {
            currentStreak++
            currentDate = sessionDate
          } else {
            break
          }
        }
        
        const completionRate = 85 // Default completion rate since we don't have total assigned
        const adherence = Math.min(100, Math.round((thisMonthSessions.length / 20) * 100)) // Assuming 20 workouts/month goal
        
        processedClients.push({
          id: client.id,
          name: `${client.first_name} ${client.last_name}`,
          totalWorkouts: completedSessions.length,
          thisWeek: thisWeekSessions.length,
          thisMonth: thisMonthSessions.length,
          streak: currentStreak,
          completionRate,
          lastWorkout: sortedSessions[0]?.completed_at || '',
          adherence
        })
      }
      
      setClientProgress(processedClients)
      
      // Calculate overall workout stats
      const totalSessions = processedClients.reduce((sum, client) => sum + client.totalWorkouts, 0)
      const thisWeekTotal = processedClients.reduce((sum, client) => sum + client.thisWeek, 0)
      const thisMonthTotal = processedClients.reduce((sum, client) => sum + client.thisMonth, 0)
      const avgCompletionRate = processedClients.length > 0 
        ? Math.round(processedClients.reduce((sum, client) => sum + client.completionRate, 0) / processedClients.length)
        : 0
      
      setWorkoutStats({
        totalSessions,
        completedSessions: totalSessions,
        thisWeek: thisWeekTotal,
        thisMonth: thisMonthTotal,
        averageCompletionRate: avgCompletionRate
      })

    } catch (error) {
      console.error('Error loading progress data:', error)
      
      // Set fallback data
      setClientProgress([
        {
          id: '1',
          name: 'Jane Doe',
          totalWorkouts: 24,
          thisWeek: 3,
          thisMonth: 8,
          streak: 5,
          completionRate: 85,
          lastWorkout: new Date().toISOString(),
          adherence: 75
        },
        {
          id: '2',
          name: 'John Smith',
          totalWorkouts: 18,
          thisWeek: 2,
          thisMonth: 6,
          streak: 3,
          completionRate: 78,
          lastWorkout: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          adherence: 65
        },
        {
          id: '3',
          name: 'Sarah Wilson',
          totalWorkouts: 31,
          thisWeek: 4,
          thisMonth: 12,
          streak: 7,
          completionRate: 92,
          lastWorkout: new Date().toISOString(),
          adherence: 88
        }
      ])
      
      setWorkoutStats({
        totalSessions: 73,
        completedSessions: 73,
        thisWeek: 9,
        thisMonth: 26,
        averageCompletionRate: 85
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  // Enhanced filtering and sorting functions
  const filteredClientProgress = clientProgress.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  }).sort((a, b) => {
    switch (sortBy) {
      case 'adherence':
        return b.adherence - a.adherence
      case 'name':
        return a.name.localeCompare(b.name)
      case 'workouts':
        return b.totalWorkouts - a.totalWorkouts
      case 'streak':
        return b.streak - a.streak
      case 'completion':
        return b.completionRate - a.completionRate
      default:
        return 0
    }
  })

  // Generate client avatar colors
  const getClientAvatarColor = (name: string) => {
    const colors = [
      'bg-gradient-to-r from-purple-500 to-purple-600',
      'bg-gradient-to-r from-blue-500 to-blue-600',
      'bg-gradient-to-r from-green-500 to-green-600',
      'bg-gradient-to-r from-orange-500 to-orange-600',
      'bg-gradient-to-r from-pink-500 to-pink-600',
      'bg-gradient-to-r from-indigo-500 to-indigo-600',
      'bg-gradient-to-r from-teal-500 to-teal-600',
      'bg-gradient-to-r from-red-500 to-red-600'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  // Generate mini sparkline data
  const generateSparklineData = (client: ClientProgress) => {
    // Generate mock data for demonstration
    const data = []
    for (let i = 0; i < 7; i++) {
      data.push(Math.floor(Math.random() * 5) + 1)
    }
    return data
  }

  // Get trend direction
  const getTrendDirection = (client: ClientProgress) => {
    if (client.adherence >= 80) return 'up'
    if (client.adherence >= 60) return 'stable'
    return 'down'
  }

  // Get trend icon
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <Activity className="w-4 h-4 text-yellow-500" />
    }
  }


  const getAdherenceColor = (adherence: number) => {
    if (adherence >= 80) return 'text-green-600 bg-green-100'
    if (adherence >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getAdherenceIcon = (adherence: number) => {
    if (adherence >= 80) return CheckCircle
    if (adherence >= 60) return AlertTriangle
    return AlertTriangle
  }

  // Client details helper functions
  const getSelectedClientData = () => {
    return clientProgress.find(client => client.id === selectedClient)
  }

  const getClientProgressData = (clientId: string) => {
    const client = clientProgress.find(c => c.id === clientId)
    if (!client) return null

    // Mock additional data for demonstration
    return {
      ...client,
      weight: {
        current: 75.5,
        change: -2.3,
        trend: 'down'
      },
      bodyFat: {
        current: 18.2,
        change: -1.5,
        trend: 'down'
      },
      strength: {
        squat: { current: 120, change: 10, trend: 'up' },
        bench: { current: 85, change: 5, trend: 'up' },
        deadlift: { current: 140, change: 15, trend: 'up' }
      },
      compliance: {
        workouts: client.adherence,
        nutrition: Math.min(100, client.adherence + 5),
        habits: Math.min(100, client.adherence - 10)
      },
      recentActivity: [
        { type: 'workout', name: 'Upper Body Strength', date: new Date().toISOString(), status: 'completed' },
        { type: 'meal', name: 'Post-workout protein shake', date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), status: 'logged' },
        { type: 'habit', name: 'Drink 8 glasses of water', date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), status: 'completed' },
        { type: 'workout', name: 'Cardio Session', date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), status: 'completed' }
      ]
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-slate-600'
    }
  }

  // Analytics helper functions
  const getAnalyticsData = () => {
    const filteredClients = clientGroup === 'all' 
      ? clientProgress 
      : clientProgress.filter(client => {
          switch (clientGroup) {
            case 'high_performers': return client.adherence >= 80
            case 'needs_attention': return client.adherence < 60
            case 'beginners': return client.totalWorkouts < 10
            case 'advanced': return client.totalWorkouts >= 20
            default: return true
          }
        })

    const totalClients = filteredClients.length
    const avgAdherence = totalClients > 0 ? filteredClients.reduce((sum, c) => sum + c.adherence, 0) / totalClients : 0
    const avgWorkouts = totalClients > 0 ? filteredClients.reduce((sum, c) => sum + c.totalWorkouts, 0) / totalClients : 0
    const avgStreak = totalClients > 0 ? filteredClients.reduce((sum, c) => sum + c.streak, 0) / totalClients : 0
    
    // Mock trend data for demonstration
    const trendData = {
      adherence: [65, 68, 72, 75, 78, 82, 85, 88, 85, 87, 89, 91],
      workouts: [12, 15, 18, 22, 25, 28, 31, 34, 32, 35, 38, 41],
      strength: [45, 48, 52, 55, 58, 62, 65, 68, 66, 69, 72, 75]
    }

    const programEffectiveness = {
      weightLoss: { completed: 8, total: 12, rate: 67 },
      strengthGain: { completed: 15, total: 18, rate: 83 },
      generalFitness: { completed: 22, total: 25, rate: 88 }
    }

    const engagementMetrics = {
      dailyActive: 78,
      weeklyActive: 92,
      monthlyActive: 95,
      avgSessionTime: 24 // minutes
    }

    const retentionData = {
      month1: 95,
      month3: 87,
      month6: 78,
      month12: 72
    }

    return {
      totalClients,
      avgAdherence,
      avgWorkouts,
      avgStreak,
      trendData,
      programEffectiveness,
      engagementMetrics,
      retentionData,
      filteredClients
    }
  }

  const getClientGroupLabel = (group: string) => {
    switch (group) {
      case 'all': return 'All Clients'
      case 'high_performers': return 'High Performers'
      case 'needs_attention': return 'Needs Attention'
      case 'beginners': return 'Beginners'
      case 'advanced': return 'Advanced'
      default: return 'All Clients'
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div style={{ backgroundColor: '#E8E9F3', minHeight: '100vh', paddingBottom: '100px' }}>
          <div style={{ padding: '24px 20px' }}>
            <div className="max-w-7xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '32px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                <div className="animate-pulse">
                  <div className="h-8 bg-slate-200 rounded-xl mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded-lg w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded-lg w-1/2"></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: '24px' }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ 
                    height: '128px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                  }}>
                    <div className="animate-pulse p-6">
                      <div className="h-6 bg-slate-200 rounded-lg mb-3"></div>
                      <div className="h-4 bg-slate-200 rounded-lg w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>
        <div style={{ padding: '24px 20px' }}>
          <div className="max-w-7xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Enhanced Header */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '18px', 
                  background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}>
                  <BarChart3 style={{ width: '40px', height: '40px', color: '#FFFFFF' }} />
                </div>
                <h1 style={{ 
                  fontSize: '32px', 
                  fontWeight: '800', 
                  color: '#1A1A1A',
                  margin: 0,
                  lineHeight: '1.2'
                }}>
                  Progress Dashboard
                </h1>
              </div>
              <p style={{ 
                fontSize: '16px', 
                fontWeight: '400', 
                color: '#6B7280',
                margin: 0,
                maxWidth: '560px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                Monitor your clients' fitness journey and celebrate their achievements
              </p>
            </div>

            {/* Enhanced Search and Filters */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-5 h-5`} />
                  <Input
                    placeholder="Search clients by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-12 h-12 rounded-xl border-2 ${theme.border} ${theme.text} bg-transparent focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500`}
                  />
                </div>
                
                <div className="flex gap-3">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <Calendar className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={metricFilter} onValueChange={setMetricFilter}>
                    <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <Target className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Metric" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Metrics</SelectItem>
                      <SelectItem value="workouts">Workouts</SelectItem>
                      <SelectItem value="adherence">Adherence</SelectItem>
                      <SelectItem value="streak">Streak</SelectItem>
                      <SelectItem value="completion">Completion</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <SortAsc className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adherence">Adherence</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="workouts">Total Workouts</SelectItem>
                      <SelectItem value="streak">Current Streak</SelectItem>
                      <SelectItem value="completion">Completion Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

            {/* Enhanced Statistics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{clientProgress.length}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Active Clients</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                      <Dumbbell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{workoutStats.totalSessions}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Total Workouts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{workoutStats.averageCompletionRate}%</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Avg Completion</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{workoutStats.thisMonth}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>This Month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Client Progress Tabs */}
            <div className="relative">
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-2 relative z-50 rounded-xl border-2" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                  <TabsTrigger value="overview" className="text-sm relative z-50 rounded-lg" style={{ color: '#1A1A1A' }}>Overview</TabsTrigger>
                  <TabsTrigger value="clients" className="text-sm relative z-50 rounded-lg" style={{ color: '#1A1A1A' }}>Client Details</TabsTrigger>
                  <TabsTrigger value="analytics" className="text-sm relative z-50 rounded-lg" style={{ color: '#1A1A1A' }}>Analytics</TabsTrigger>
                </TabsList>

                {/* Enhanced Overview Tab */}
                <TabsContent value="overview" className="space-y-8 mt-6 relative z-0">
                  <div className="pt-8"></div>
                  
                  {/* Enhanced KPI Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Active Clients */}
                    <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-blue-500`}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className={`text-3xl font-bold ${theme.text}`}>{clientProgress.length}</div>
                            <div className={`text-sm font-medium ${theme.textSecondary}`}>Active Clients</div>
                            <div className={`text-xs ${theme.textSecondary} mt-1`}>
                              {clientProgress.filter(c => c.adherence >= 80).length} high performers
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Average Compliance */}
                    <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-green-500`}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className={`text-3xl font-bold ${theme.text}`}>{workoutStats.averageCompletionRate}%</div>
                            <div className={`text-sm font-medium ${theme.textSecondary}`}>Avg Compliance</div>
                            <div className={`text-xs ${theme.textSecondary} mt-1`}>
                              {workoutStats.averageCompletionRate >= 80 ? 'Excellent' : 
                               workoutStats.averageCompletionRate >= 60 ? 'Good' : 'Needs improvement'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Clients Needing Attention */}
                    <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-red-500`}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 ${theme.shadow}`}>
                            <AlertTriangle className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className={`text-3xl font-bold ${theme.text}`}>
                              {clientProgress.filter(c => c.adherence < 60).length}
                            </div>
                            <div className={`text-sm font-medium ${theme.textSecondary}`}>Need Attention</div>
                            <div className={`text-xs ${theme.textSecondary} mt-1`}>
                              Below 60% adherence
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Performers */}
                    <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-purple-500`}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                            <Trophy className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className={`text-3xl font-bold ${theme.text}`}>
                              {clientProgress.filter(c => c.adherence >= 90).length}
                            </div>
                            <div className={`text-sm font-medium ${theme.textSecondary}`}>Top Performers</div>
                            <div className={`text-xs ${theme.textSecondary} mt-1`}>
                              90%+ adherence
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Enhanced Client Progress Cards */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                          <Users className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                        </div>
                        <h2 className={`text-2xl font-bold ${theme.text}`}>Client Progress Overview</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-xl">
                          {filteredClientProgress.length} clients
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredClientProgress.map((client) => {
                        const trendDirection = getTrendDirection(client)
                        const sparklineData = generateSparklineData(client)
                        const AdherenceIcon = getAdherenceIcon(client.adherence)
                        
                        return (
                          <Card key={client.id} className={`${theme.card} ${theme.shadow} hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group`}>
                            <CardHeader className="pb-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-12 h-12 rounded-xl ${getClientAvatarColor(client.name)} ${theme.shadow} flex items-center justify-center`}>
                                    <span className="text-white font-bold text-lg">
                                      {client.name.charAt(0)}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <CardTitle className={`text-lg font-bold ${theme.text} group-hover:text-purple-600 transition-colors`}>
                                      {client.name}
                                    </CardTitle>
                                    <div className={`${theme.textSecondary} text-sm mt-1`}>
                                      {client.totalWorkouts} total workouts
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                </div>
                              </div>
                            </CardHeader>
                            
                            <CardContent className="pt-0">
                              <div className="space-y-4">
                                {/* Key Metrics */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-center">
                                    <div className={`text-2xl font-bold ${theme.text}`}>{client.adherence}%</div>
                                    <div className={`text-xs ${theme.textSecondary}`}>Adherence</div>
                                  </div>
                                  <div className="text-center">
                                    <div className={`text-2xl font-bold ${theme.text}`}>{client.streak}</div>
                                    <div className={`text-xs ${theme.textSecondary}`}>Day Streak</div>
                                  </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className={`${theme.textSecondary}`}>Progress</span>
                                    <span className={`font-semibold ${theme.text}`}>{client.adherence}%</span>
                                  </div>
                                  <Progress 
                                    value={client.adherence} 
                                    className="h-3 rounded-full"
                                  />
                                </div>
                                
                                {/* Mini Sparkline */}
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm ${theme.textSecondary}`}>Weekly Activity</span>
                                  <div className="flex items-center gap-1">
                                    {getTrendIcon(trendDirection)}
                                    <div className="flex gap-1">
                                      {sparklineData.map((value, index) => (
                                        <div
                                          key={index}
                                          className="w-2 bg-purple-500 rounded-full"
                                          style={{ height: `${value * 4}px` }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Status Badge */}
                                <div className="flex justify-center">
                                  <Badge className={`${getAdherenceColor(client.adherence)} rounded-xl px-3 py-1`}>
                                    <AdherenceIcon className="w-3 h-3 mr-1" />
                                    {client.adherence >= 80 ? 'On Track' : 
                                     client.adherence >= 60 ? 'Making Progress' : 'Needs Attention'}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>

                  {filteredClientProgress.length === 0 && (
                    <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                      <CardContent className="p-12 text-center">
                        <div className={`p-6 rounded-2xl ${theme.gradient} ${theme.shadow} w-24 h-24 mx-auto mb-6 flex items-center justify-center`}>
                          <Users className="w-12 h-12 text-white" />
                        </div>
                        <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>
                          {clientProgress.length === 0 ? 'No clients found' : 'No clients match your search'}
                        </h3>
                        <p className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}>
                          {clientProgress.length === 0 
                            ? 'Start by adding clients to track their progress.'
                            : 'Try adjusting your search criteria or filters.'
                          }
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Enhanced Weekly Progress and Top Performers */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Weekly Progress */}
                    <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                      <CardHeader className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <CardTitle className={`text-xl font-bold ${theme.text}`}>This Week's Progress</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className={`${theme.textSecondary} font-medium`}>Total Workouts</span>
                            <span className={`font-bold text-2xl ${theme.text}`}>{workoutStats.thisWeek}</span>
                          </div>
                          <Progress 
                            value={(workoutStats.thisWeek / (clientProgress.length * 5)) * 100} 
                            className="h-4 rounded-full" 
                          />
                          <div className="flex justify-between text-sm">
                            <span className={`${theme.textSecondary}`}>Goal: 5 workouts per client</span>
                            <span className={`${theme.textSecondary}`}>
                              {Math.round((workoutStats.thisWeek / (clientProgress.length * 5)) * 100)}% of goal
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className={`${theme.textSecondary} font-medium`}>Average Completion</span>
                            <span className={`font-bold text-2xl ${theme.text}`}>{workoutStats.averageCompletionRate}%</span>
                          </div>
                          <Progress 
                            value={workoutStats.averageCompletionRate} 
                            className="h-4 rounded-full" 
                          />
                          <div className="flex justify-between text-sm">
                            <span className={`${theme.textSecondary}`}>Target: 80%+</span>
                            <span className={`${theme.textSecondary}`}>
                              {workoutStats.averageCompletionRate >= 80 ? '✅ Target met' : '⚠️ Below target'}
                            </span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl"
                              onClick={() => {/* TODO: Schedule check-ins */}}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Schedule Check-ins
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Performers */}
                    <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                      <CardHeader className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 ${theme.shadow}`}>
                            <Award className="w-5 h-5 text-white" />
                          </div>
                          <CardTitle className={`text-xl font-bold ${theme.text}`}>Top Performers</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                        <div className="space-y-4">
                          {clientProgress
                            .sort((a, b) => b.adherence - a.adherence)
                            .slice(0, 3)
                            .map((client, index) => {
                              const Icon = getAdherenceIcon(client.adherence)
                              const trendDirection = getTrendDirection(client)
                              return (
                                <div key={client.id} className={`flex items-center gap-4 p-4 ${theme.card} rounded-2xl border ${theme.border} hover:shadow-lg transition-all duration-200`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl ${getClientAvatarColor(client.name)} ${theme.shadow} flex items-center justify-center`}>
                                      <span className="text-white font-bold text-sm">
                                        {client.name.charAt(0)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-lg font-bold ${theme.text}`}>#{index + 1}</span>
                                      <Icon className="w-4 h-4 text-green-600" />
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <p className={`font-semibold ${theme.text}`}>{client.name}</p>
                                    <div className="flex items-center gap-2">
                                      <p className={`text-sm ${theme.textSecondary}`}>{client.adherence}% adherence</p>
                                      {getTrendIcon(trendDirection)}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge className={`${getAdherenceColor(client.adherence)} rounded-xl px-3 py-1`}>
                                      {client.adherence}%
                                    </Badge>
                                    <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                      {client.streak} day streak
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>

                        {/* Celebration Message */}
                        <div className={`mt-6 p-4 rounded-2xl ${isDark ? 'bg-green-900/20' : 'bg-green-50'} border border-green-200 dark:border-green-800`}>
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-green-600" />
                            <span className={`font-semibold text-green-800 dark:text-green-200`}>
                              Great job this week!
                            </span>
                          </div>
                          <p className={`text-sm text-green-600 dark:text-green-400 mt-1`}>
                            {clientProgress.filter(c => c.adherence >= 80).length} clients are exceeding expectations
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Actionable Insights Section */}
                  <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                          <Heart className="w-5 h-5 text-white" />
                        </div>
                        <CardTitle className={`text-xl font-bold ${theme.text}`}>Coaching Insights & Actions</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Clients Needing Attention */}
                        <div className="space-y-4">
                          <h3 className={`font-semibold ${theme.text} flex items-center gap-2`}>
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Clients Needing Attention
                          </h3>
                          <div className="space-y-3">
                            {clientProgress
                              .filter(c => c.adherence < 60)
                              .slice(0, 3)
                              .map((client) => (
                                <div key={client.id} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-red-900/20' : 'bg-red-50'} border border-red-200 dark:border-red-800`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl ${getClientAvatarColor(client.name)} ${theme.shadow} flex items-center justify-center`}>
                                      <span className="text-white font-bold text-sm">
                                        {client.name.charAt(0)}
                                      </span>
                                    </div>
                                    <div>
                                      <p className={`font-medium ${theme.text}`}>{client.name}</p>
                                      <p className={`text-sm ${theme.textSecondary}`}>{client.adherence}% adherence</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            {clientProgress.filter(c => c.adherence < 60).length === 0 && (
                              <div className={`p-4 rounded-xl ${isDark ? 'bg-green-900/20' : 'bg-green-50'} border border-green-200 dark:border-green-800`}>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                  <span className={`font-medium text-green-800 dark:text-green-200`}>
                                    All clients are performing well!
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-4">
                          <h3 className={`font-semibold ${theme.text} flex items-center gap-2`}>
                            <Zap className="w-5 h-5 text-purple-500" />
                            Quick Actions
                          </h3>
                          <div className="space-y-3">
                            <Button
                              variant="outline"
                              className="w-full rounded-xl py-3"
                              onClick={() => {/* TODO: Schedule group check-in */}}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Schedule Group Check-in
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full rounded-xl py-3"
                              onClick={() => {/* TODO: Generate progress report */}}
                            >
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Generate Progress Report
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Enhanced Client Details Tab */}
                <TabsContent value="clients" className="space-y-8 mt-6 relative z-0">
                  <div className="pt-8"></div>
                  
                  {!selectedClient ? (
                    /* Client Selection View */
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                            <Users className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                          </div>
                          <h2 className={`text-2xl font-bold ${theme.text}`}>Client Details</h2>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-xl">
                            {filteredClientProgress.length} clients
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredClientProgress.map((client) => {
                          const AdherenceIcon = getAdherenceIcon(client.adherence)
                          const trendDirection = getTrendDirection(client)
                          return (
                            <Card key={client.id} className={`${theme.card} ${theme.shadow} hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group cursor-pointer`} onClick={() => setSelectedClient(client.id)}>
                              <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-12 h-12 rounded-xl ${getClientAvatarColor(client.name)} ${theme.shadow} flex items-center justify-center`}>
                                    <span className="text-white font-bold text-lg">
                                      {client.name.charAt(0)}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <CardTitle className={`text-lg font-bold ${theme.text} group-hover:text-purple-600 transition-colors`}>
                                      {client.name}
                                    </CardTitle>
                                    <div className={`${theme.textSecondary} text-sm mt-1`}>
                                      Last workout: {new Date(client.lastWorkout).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              
                              <CardContent className="pt-0">
                                <div className="space-y-4">
                                  {/* Key Metrics */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                      <div className={`text-2xl font-bold ${theme.text}`}>{client.adherence}%</div>
                                      <div className={`text-xs ${theme.textSecondary}`}>Adherence</div>
                                    </div>
                                    <div className="text-center">
                                      <div className={`text-2xl font-bold ${theme.text}`}>{client.streak}</div>
                                      <div className={`text-xs ${theme.textSecondary}`}>Day Streak</div>
                                    </div>
                                  </div>
                                  
                                  {/* Progress Bar */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className={`${theme.textSecondary}`}>Progress</span>
                                      <span className={`font-semibold ${theme.text}`}>{client.adherence}%</span>
                                    </div>
                                    <Progress 
                                      value={client.adherence} 
                                      className="h-3 rounded-full"
                                    />
                                  </div>
                                  
                                  {/* Status Badge */}
                                  <div className="flex justify-center">
                                    <Badge className={`${getAdherenceColor(client.adherence)} rounded-xl px-3 py-1`}>
                                      <AdherenceIcon className="w-3 h-3 mr-1" />
                                      {client.adherence >= 80 ? 'On Track' : 
                                       client.adherence >= 60 ? 'Making Progress' : 'Needs Attention'}
                                    </Badge>
                                  </div>

                                  {/* Click to view details */}
                                  <div className="flex items-center justify-center gap-2 text-purple-600 text-sm font-medium">
                                    <Eye className="w-4 h-4" />
                                    Click to view details
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Individual Client Details View */
                    <div className="space-y-8">
                      {(() => {
                        const clientData = getClientProgressData(selectedClient)
                        if (!clientData) return null

                        return (
                          <>
                            {/* Client Header */}
                            <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                              <CardHeader className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedClient(null)}
                                      className="rounded-xl"
                                    >
                                      <ArrowLeft className="w-4 h-4 mr-2" />
                                      Back to Clients
                                    </Button>
                                    <div className={`w-16 h-16 rounded-2xl ${getClientAvatarColor(clientData.name)} ${theme.shadow} flex items-center justify-center`}>
                                      <span className="text-white font-bold text-2xl">
                                        {clientData.name.charAt(0)}
                                      </span>
                                    </div>
                                    <div>
                                      <CardTitle className={`text-3xl font-bold ${theme.text}`}>
                                        {clientData.name}
                                      </CardTitle>
                                      <div className={`${theme.textSecondary} mt-1`}>
                                        Member since {new Date().toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Select value={clientDetailPeriod} onValueChange={(value: 'week' | 'month' | 'quarter' | 'year') => setClientDetailPeriod(value)}>
                                      <SelectTrigger className="w-40 h-10 rounded-xl">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="week">Last 7 Days</SelectItem>
                                        <SelectItem value="month">Last 30 Days</SelectItem>
                                        <SelectItem value="quarter">Last 90 Days</SelectItem>
                                        <SelectItem value="year">Last Year</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </CardHeader>
                            </Card>

                            {/* Key Progress Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              {/* Current Weight */}
                              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-blue-500`}>
                                <CardContent className="p-6">
                                  <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                                      <Activity className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <div className={`text-3xl font-bold ${theme.text}`}>{clientData.weight.current}kg</div>
                                      <div className={`text-sm font-medium ${theme.textSecondary}`}>Current Weight</div>
                                      <div className={`text-xs ${getTrendColor(clientData.weight.trend)} mt-1`}>
                                        {clientData.weight.change > 0 ? '+' : ''}{clientData.weight.change}kg this month
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Body Fat % */}
                              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-green-500`}>
                                <CardContent className="p-6">
                                  <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                                      <Target className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <div className={`text-3xl font-bold ${theme.text}`}>{clientData.bodyFat.current}%</div>
                                      <div className={`text-sm font-medium ${theme.textSecondary}`}>Body Fat</div>
                                      <div className={`text-xs ${getTrendColor(clientData.bodyFat.trend)} mt-1`}>
                                        {clientData.bodyFat.change > 0 ? '+' : ''}{clientData.bodyFat.change}% this month
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Overall Compliance */}
                              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-purple-500`}>
                                <CardContent className="p-6">
                                  <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                                      <CheckCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <div className={`text-3xl font-bold ${theme.text}`}>{clientData.adherence}%</div>
                                      <div className={`text-sm font-medium ${theme.textSecondary}`}>Compliance</div>
                                      <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                        {clientData.adherence >= 80 ? 'Excellent' : 
                                         clientData.adherence >= 60 ? 'Good' : 'Needs improvement'}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Strength Gains */}
                              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-orange-500`}>
                                <CardContent className="p-6">
                                  <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                                      <Dumbbell className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <div className={`text-3xl font-bold ${theme.text}`}>+{clientData.strength.squat.change}kg</div>
                                      <div className={`text-sm font-medium ${theme.textSecondary}`}>Squat Progress</div>
                                      <div className={`text-xs ${getTrendColor(clientData.strength.squat.trend)} mt-1`}>
                                        {clientData.strength.squat.current}kg current
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Detailed Progress Charts */}
                            <div className="grid md:grid-cols-2 gap-6">
                              {/* Compliance Breakdown */}
                              <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                                <CardHeader className="p-6">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                                      <BarChart3 className="w-5 h-5 text-white" />
                                    </div>
                                    <CardTitle className={`text-xl font-bold ${theme.text}`}>Compliance Breakdown</CardTitle>
                                  </div>
                                </CardHeader>
                                <CardContent className="p-6 pt-0 space-y-6">
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className={`${theme.textSecondary}`}>Workouts</span>
                                        <span className={`font-semibold ${theme.text}`}>{clientData.compliance.workouts}%</span>
                                      </div>
                                      <Progress value={clientData.compliance.workouts} className="h-3 rounded-full" />
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className={`${theme.textSecondary}`}>Nutrition</span>
                                        <span className={`font-semibold ${theme.text}`}>{clientData.compliance.nutrition}%</span>
                                      </div>
                                      <Progress value={clientData.compliance.nutrition} className="h-3 rounded-full" />
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className={`${theme.textSecondary}`}>Habits</span>
                                        <span className={`font-semibold ${theme.text}`}>{clientData.compliance.habits}%</span>
                                      </div>
                                      <Progress value={clientData.compliance.habits} className="h-3 rounded-full" />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Strength Progress */}
                              <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                                <CardHeader className="p-6">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                                      <Dumbbell className="w-5 h-5 text-white" />
                                    </div>
                                    <CardTitle className={`text-xl font-bold ${theme.text}`}>Strength Progress</CardTitle>
                                  </div>
                                </CardHeader>
                                <CardContent className="p-6 pt-0 space-y-6">
                                  <div className="space-y-4">
                                    {Object.entries(clientData.strength).map(([exercise, data]: [string, any]) => (
                                      <div key={exercise} className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} border ${theme.border}`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className={`font-semibold ${theme.text} capitalize`}>{exercise}</span>
                                          <div className="flex items-center gap-2">
                                            {getTrendIcon(data.trend)}
                                            <span className={`text-sm font-bold ${getTrendColor(data.trend)}`}>
                                              +{data.change}kg
                                            </span>
                                          </div>
                                        </div>
                                        <div className={`text-2xl font-bold ${theme.text}`}>
                                          {data.current}kg
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Recent Activity Feed */}
                            <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                              <CardHeader className="p-6">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                                    <Clock className="w-5 h-5 text-white" />
                                  </div>
                                  <CardTitle className={`text-xl font-bold ${theme.text}`}>Recent Activity</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="p-6 pt-0">
                                <div className="space-y-4">
                                  {clientData.recentActivity.map((activity: any, index: number) => (
                                    <div key={index} className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} border ${theme.border}`}>
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        activity.type === 'workout' ? 'bg-blue-100 dark:bg-blue-900/20' :
                                        activity.type === 'meal' ? 'bg-green-100 dark:bg-green-900/20' :
                                        'bg-purple-100 dark:bg-purple-900/20'
                                      }`}>
                                        {activity.type === 'workout' ? <Dumbbell className="w-5 h-5 text-blue-600" /> :
                                         activity.type === 'meal' ? <Heart className="w-5 h-5 text-green-600" /> :
                                         <Target className="w-5 h-5 text-purple-600" />}
                                      </div>
                                      <div className="flex-1">
                                        <div className={`font-semibold ${theme.text}`}>{activity.name}</div>
                                        <div className={`text-sm ${theme.textSecondary}`}>
                                          {new Date(activity.date).toLocaleString()}
                                        </div>
                                      </div>
                                      <Badge className={`rounded-xl ${
                                        activity.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' :
                                        'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
                                      }`}>
                                        {activity.status}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </TabsContent>

                {/* Enhanced Analytics Tab */}
                <TabsContent value="analytics" className="space-y-8 mt-6 relative z-0">
                  <div className="pt-8"></div>
                  
                  {(() => {
                    const analyticsData = getAnalyticsData()
                    
                    return (
                      <>
                        {/* Analytics Header */}
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                                <BarChart3 className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                              </div>
                              <h2 className={`text-2xl font-bold ${theme.text}`}>Advanced Analytics</h2>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="rounded-xl">
                                {analyticsData.totalClients} clients
                              </Badge>
                            </div>
                          </div>

                          {/* Analytics Controls */}
                          <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1">
                                  <Select value={analyticsPeriod} onValueChange={(value: 'week' | 'month' | 'quarter' | 'year') => setAnalyticsPeriod(value)}>
                                    <SelectTrigger className="w-full h-12 rounded-xl">
                                      <Calendar className="w-4 h-4 mr-2" />
                                      <SelectValue placeholder="Time Period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="week">Last 7 Days</SelectItem>
                                      <SelectItem value="month">Last 30 Days</SelectItem>
                                      <SelectItem value="quarter">Last 90 Days</SelectItem>
                                      <SelectItem value="year">Last Year</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="flex-1">
                                  <Select value={clientGroup} onValueChange={setClientGroup}>
                                    <SelectTrigger className="w-full h-12 rounded-xl">
                                      <Users className="w-4 h-4 mr-2" />
                                      <SelectValue placeholder="Client Group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Clients</SelectItem>
                                      <SelectItem value="high_performers">High Performers</SelectItem>
                                      <SelectItem value="needs_attention">Needs Attention</SelectItem>
                                      <SelectItem value="beginners">Beginners</SelectItem>
                                      <SelectItem value="advanced">Advanced</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    className="rounded-xl h-12"
                                    onClick={() => {/* TODO: Export data */}}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Export
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Key Aggregate Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {/* Average Client Progress */}
                          <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-blue-500`}>
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                                  <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className={`text-3xl font-bold ${theme.text}`}>{analyticsData.avgAdherence.toFixed(1)}%</div>
                                  <div className={`text-sm font-medium ${theme.textSecondary}`}>Avg Progress</div>
                                  <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                    {getClientGroupLabel(clientGroup)}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Program Effectiveness */}
                          <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-green-500`}>
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                                  <Target className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className={`text-3xl font-bold ${theme.text}`}>82%</div>
                                  <div className={`text-sm font-medium ${theme.textSecondary}`}>Program Success</div>
                                  <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                    Weight loss programs
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Engagement Rate */}
                          <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-purple-500`}>
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                                  <Activity className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className={`text-3xl font-bold ${theme.text}`}>{analyticsData.engagementMetrics.dailyActive}%</div>
                                  <div className={`text-sm font-medium ${theme.textSecondary}`}>Daily Active</div>
                                  <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                    {analyticsData.engagementMetrics.avgSessionTime}min avg session
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Retention Rate */}
                          <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-orange-500`}>
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                                  <Users className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className={`text-3xl font-bold ${theme.text}`}>{analyticsData.retentionData.month3}%</div>
                                  <div className={`text-sm font-medium ${theme.textSecondary}`}>3-Month Retention</div>
                                  <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                    Client retention rate
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Interactive Charts & Graphs */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Performance Trends */}
                          <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                            <CardHeader className="p-6">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                                  <BarChart3 className="w-5 h-5 text-white" />
                                </div>
                                <CardTitle className={`text-xl font-bold ${theme.text}`}>Performance Trends</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                              <div className="space-y-6">
                                {/* Adherence Trend */}
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className={`font-semibold ${theme.text}`}>Adherence Trend</span>
                                    <span className={`text-sm ${theme.textSecondary}`}>12 months</span>
                                  </div>
                                  <div className="flex items-end gap-1 h-16">
                                    {generateSparklineData(analyticsData.trendData.adherence).map((point, index) => (
                                      <div
                                        key={index}
                                        className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm"
                                        style={{ height: `${point.height}px` }}
                                        title={`Month ${index + 1}: ${point.y}%`}
                                      />
                                    ))}
                                  </div>
                                  <div className="flex justify-between text-xs text-slate-500">
                                    <span>Jan</span>
                                    <span>Dec</span>
                                  </div>
                                </div>

                                {/* Workout Volume Trend */}
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className={`font-semibold ${theme.text}`}>Workout Volume</span>
                                    <span className={`text-sm ${theme.textSecondary}`}>12 months</span>
                                  </div>
                                  <div className="flex items-end gap-1 h-16">
                                    {generateSparklineData(analyticsData.trendData.workouts).map((point, index) => (
                                      <div
                                        key={index}
                                        className="flex-1 bg-gradient-to-t from-green-500 to-green-400 rounded-t-sm"
                                        style={{ height: `${point.height}px` }}
                                        title={`Month ${index + 1}: ${point.y} workouts`}
                                      />
                                    ))}
                                  </div>
                                  <div className="flex justify-between text-xs text-slate-500">
                                    <span>Jan</span>
                                    <span>Dec</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Program Effectiveness */}
                          <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                            <CardHeader className="p-6">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                                  <Target className="w-5 h-5 text-white" />
                                </div>
                                <CardTitle className={`text-xl font-bold ${theme.text}`}>Program Effectiveness</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                              <div className="space-y-6">
                                {Object.entries(analyticsData.programEffectiveness).map(([program, data]: [string, any]) => (
                                  <div key={program} className="space-y-3">
                                    <div className="flex justify-between items-center">
                                      <span className={`font-semibold ${theme.text} capitalize`}>
                                        {program.replace(/([A-Z])/g, ' $1').trim()}
                                      </span>
                                      <span className={`text-sm font-bold ${theme.text}`}>{data.rate}%</span>
                                    </div>
                                    <Progress value={data.rate} className="h-3 rounded-full" />
                                    <div className="flex justify-between text-xs text-slate-500">
                                      <span>{data.completed} completed</span>
                                      <span>{data.total} total</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Client Distribution & Engagement */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Client Distribution */}
                          <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                            <CardHeader className="p-6">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                                  <Users className="w-5 h-5 text-white" />
                                </div>
                                <CardTitle className={`text-xl font-bold ${theme.text}`}>Client Distribution</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                              <div className="space-y-4">
                                <div className={`flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10`}>
                                  <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                    <span className={`font-medium ${theme.text}`}>High Adherence (80%+)</span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-bold text-2xl ${theme.text}`}>
                                      {analyticsData.filteredClients.filter(c => c.adherence >= 80).length}
                                    </span>
                                    <div className={`text-xs ${theme.textSecondary}`}>
                                      {analyticsData.totalClients > 0 ? Math.round((analyticsData.filteredClients.filter(c => c.adherence >= 80).length / analyticsData.totalClients) * 100) : 0}%
                                    </div>
                                  </div>
                                </div>
                                <div className={`flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-yellow-600/10`}>
                                  <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                                    <span className={`font-medium ${theme.text}`}>Medium Adherence (60-79%)</span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-bold text-2xl ${theme.text}`}>
                                      {analyticsData.filteredClients.filter(c => c.adherence >= 60 && c.adherence < 80).length}
                                    </span>
                                    <div className={`text-xs ${theme.textSecondary}`}>
                                      {analyticsData.totalClients > 0 ? Math.round((analyticsData.filteredClients.filter(c => c.adherence >= 60 && c.adherence < 80).length / analyticsData.totalClients) * 100) : 0}%
                                    </div>
                                  </div>
                                </div>
                                <div className={`flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10`}>
                                  <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                                    <span className={`font-medium ${theme.text}`}>Low Adherence (&lt;60%)</span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-bold text-2xl ${theme.text}`}>
                                      {analyticsData.filteredClients.filter(c => c.adherence < 60).length}
                                    </span>
                                    <div className={`text-xs ${theme.textSecondary}`}>
                                      {analyticsData.totalClients > 0 ? Math.round((analyticsData.filteredClients.filter(c => c.adherence < 60).length / analyticsData.totalClients) * 100) : 0}%
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Engagement Metrics */}
                          <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                            <CardHeader className="p-6">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                                  <Activity className="w-5 h-5 text-white" />
                                </div>
                                <CardTitle className={`text-xl font-bold ${theme.text}`}>Engagement Metrics</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-center p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                                    <div className={`text-2xl font-bold ${theme.text}`}>{analyticsData.engagementMetrics.dailyActive}%</div>
                                    <div className={`text-xs ${theme.textSecondary}`}>Daily Active</div>
                                  </div>
                                  <div className="text-center p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10">
                                    <div className={`text-2xl font-bold ${theme.text}`}>{analyticsData.engagementMetrics.weeklyActive}%</div>
                                    <div className={`text-xs ${theme.textSecondary}`}>Weekly Active</div>
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className={`font-semibold ${theme.text}`}>Monthly Active Users</span>
                                    <span className={`text-sm font-bold ${theme.text}`}>{analyticsData.engagementMetrics.monthlyActive}%</span>
                                  </div>
                                  <Progress value={analyticsData.engagementMetrics.monthlyActive} className="h-3 rounded-full" />
                                </div>

                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className={`font-semibold ${theme.text}`}>Average Session Time</span>
                                    <span className={`text-sm font-bold ${theme.text}`}>{analyticsData.engagementMetrics.avgSessionTime} min</span>
                                  </div>
                                  <Progress value={(analyticsData.engagementMetrics.avgSessionTime / 60) * 100} className="h-3 rounded-full" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Retention Analysis */}
                        <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                          <CardHeader className="p-6">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 ${theme.shadow}`}>
                                <Trophy className="w-5 h-5 text-white" />
                              </div>
                              <CardTitle className={`text-xl font-bold ${theme.text}`}>Retention Analysis</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6 pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              {Object.entries(analyticsData.retentionData).map(([period, rate]: [string, number]) => (
                                <div key={period} className="text-center p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-indigo-600/10">
                                  <div className={`text-3xl font-bold ${theme.text}`}>{rate}%</div>
                                  <div className={`text-sm ${theme.textSecondary} mt-1`}>
                                    {period === 'month1' ? '1 Month' :
                                     period === 'month3' ? '3 Months' :
                                     period === 'month6' ? '6 Months' : '12 Months'}
                                  </div>
                                  <div className={`text-xs ${theme.textSecondary} mt-2`}>
                                    Retention Rate
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Actionable Insights */}
                        <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                          <CardHeader className="p-6">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 ${theme.shadow}`}>
                                <Heart className="w-5 h-5 text-white" />
                              </div>
                              <CardTitle className={`text-xl font-bold ${theme.text}`}>Actionable Insights</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6 pt-0">
                            <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <h3 className={`font-semibold ${theme.text} flex items-center gap-2`}>
                                  <TrendingUp className="w-5 h-5 text-green-500" />
                                  Positive Trends
                                </h3>
                                <div className="space-y-3">
                                  <div className={`p-4 rounded-xl ${isDark ? 'bg-green-900/20' : 'bg-green-50'} border border-green-200 dark:border-green-800`}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <span className={`font-medium text-green-800 dark:text-green-200`}>High Engagement</span>
                                    </div>
                                    <p className={`text-sm text-green-600 dark:text-green-400`}>
                                      {analyticsData.engagementMetrics.dailyActive}% daily active rate is above industry average
                                    </p>
                                  </div>
                                  <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} border border-blue-200 dark:border-blue-800`}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Trophy className="w-4 h-4 text-blue-600" />
                                      <span className={`font-medium text-blue-800 dark:text-blue-200`}>Strong Retention</span>
                                    </div>
                                    <p className={`text-sm text-blue-600 dark:text-blue-400`}>
                                      87% 3-month retention rate indicates effective program design
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <h3 className={`font-semibold ${theme.text} flex items-center gap-2`}>
                                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                                  Areas for Improvement
                                </h3>
                                <div className="space-y-3">
                                  <div className={`p-4 rounded-xl ${isDark ? 'bg-orange-900/20' : 'bg-orange-50'} border border-orange-200 dark:border-orange-800`}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Target className="w-4 h-4 text-orange-600" />
                                      <span className={`font-medium text-orange-800 dark:text-orange-200`}>Program Optimization</span>
                                    </div>
                                    <p className={`text-sm text-orange-600 dark:text-orange-400`}>
                                      Weight loss programs show 67% completion - consider program adjustments
                                    </p>
                                  </div>
                                  <div className={`p-4 rounded-xl ${isDark ? 'bg-red-900/20' : 'bg-red-50'} border border-red-200 dark:border-red-800`}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Users className="w-4 h-4 text-red-600" />
                                      <span className={`font-medium text-red-800 dark:text-red-200`}>Client Support</span>
                                    </div>
                                    <p className={`text-sm text-red-600 dark:text-red-400`}>
                                      {analyticsData.filteredClients.filter(c => c.adherence < 60).length} clients need additional support
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )
                  })()}
                </TabsContent>
              </Tabs>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}
