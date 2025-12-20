'use client'

import { useState, useEffect } from 'react'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Target,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Dumbbell,
  Apple,
  Zap,
  Heart,
  Activity,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Filter,
  Download,
  RefreshCw,
  Star,
  Flame,
  Shield,
  Sparkles,
  Eye,
  Settings
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AdherenceData {
  clientId: string
  clientName: string
  avatar: string
  overallAdherence: number
  workoutAdherence: number
  nutritionAdherence: number
  habitAdherence: number
  sessionAttendance: number
  trend: 'up' | 'down' | 'stable'
  lastActive: string
  alerts: number
  streak: number
  weeklyData: {
    date: string
    workout: boolean
    nutrition: boolean
    habit: boolean
    session: boolean
  }[]
}

interface OptimizedAdherenceTrackingProps {
  coachId?: string
}

export default function OptimizedAdherenceTracking({ coachId }: OptimizedAdherenceTrackingProps) {
  const { getThemeStyles, performanceSettings } = useTheme()
  const router = useRouter()
  const theme = getThemeStyles()

  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week')
  const [selectedMetric, setSelectedMetric] = useState<'overall' | 'workout' | 'nutrition' | 'habit'>('overall')
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')

  // Mock data - replace with actual data fetching
  const [adherenceData, setAdherenceData] = useState<AdherenceData[]>([
    {
      clientId: '1',
      clientName: 'John Smith',
      avatar: 'JS',
      overallAdherence: 95,
      workoutAdherence: 98,
      nutritionAdherence: 92,
      habitAdherence: 95,
      sessionAttendance: 100,
      trend: 'up',
      lastActive: '2024-01-15',
      alerts: 0,
      streak: 12,
      weeklyData: [
        { date: '2024-01-08', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-09', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-10', workout: true, nutrition: false, habit: true, session: true },
        { date: '2024-01-11', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-12', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-13', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-14', workout: true, nutrition: true, habit: true, session: true }
      ]
    },
    {
      clientId: '2',
      clientName: 'Sarah Johnson',
      avatar: 'SJ',
      overallAdherence: 88,
      workoutAdherence: 85,
      nutritionAdherence: 90,
      habitAdherence: 89,
      sessionAttendance: 95,
      trend: 'stable',
      lastActive: '2024-01-14',
      alerts: 1,
      streak: 8,
      weeklyData: [
        { date: '2024-01-08', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-09', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-10', workout: false, nutrition: true, habit: true, session: true },
        { date: '2024-01-11', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-12', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-13', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-14', workout: true, nutrition: true, habit: true, session: true }
      ]
    },
    {
      clientId: '3',
      clientName: 'Mike Wilson',
      avatar: 'MW',
      overallAdherence: 76,
      workoutAdherence: 70,
      nutritionAdherence: 80,
      habitAdherence: 78,
      sessionAttendance: 85,
      trend: 'down',
      lastActive: '2024-01-13',
      alerts: 3,
      streak: 3,
      weeklyData: [
        { date: '2024-01-08', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-09', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-10', workout: false, nutrition: true, habit: false, session: true },
        { date: '2024-01-11', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-12', workout: false, nutrition: true, habit: true, session: true },
        { date: '2024-01-13', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-14', workout: false, nutrition: false, habit: true, session: false }
      ]
    },
    {
      clientId: '4',
      clientName: 'Emily Davis',
      avatar: 'ED',
      overallAdherence: 92,
      workoutAdherence: 95,
      nutritionAdherence: 88,
      habitAdherence: 93,
      sessionAttendance: 90,
      trend: 'up',
      lastActive: '2024-01-15',
      alerts: 0,
      streak: 15,
      weeklyData: [
        { date: '2024-01-08', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-09', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-10', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-11', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-12', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-13', workout: true, nutrition: true, habit: true, session: true },
        { date: '2024-01-14', workout: true, nutrition: true, habit: true, session: true }
      ]
    }
  ])

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000)
  }, [])

  const getAdherenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 75) return 'text-blue-600 dark:text-blue-400'
    if (score >= 60) return 'text-orange-600 dark:text-orange-400'
    if (score >= 50) return 'text-red-600 dark:text-red-400'
    return 'text-red-700 dark:text-red-300'
  }

  const getAdherenceBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 75) return 'bg-blue-100 dark:bg-blue-900/30'
    if (score >= 60) return 'bg-orange-100 dark:bg-orange-900/30'
    if (score >= 50) return 'bg-red-100 dark:bg-red-900/30'
    return 'bg-red-200 dark:bg-red-900/50'
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />
      default: return <Activity className="w-4 h-4 text-slate-400" />
    }
  }

  const getOverallStats = () => {
    const totalClients = adherenceData.length
    const avgAdherence = adherenceData.length > 0 
      ? adherenceData.reduce((sum, c) => sum + c.overallAdherence, 0) / adherenceData.length
      : 0
    const totalAlerts = adherenceData.reduce((sum, c) => sum + c.alerts, 0)
    const avgStreak = adherenceData.length > 0
      ? adherenceData.reduce((sum, c) => sum + c.streak, 0) / adherenceData.length
      : 0

    return {
      totalClients,
      avgAdherence,
      totalAlerts,
      avgStreak
    }
  }

  const filteredClients = selectedClient === 'all' 
    ? adherenceData 
    : adherenceData.filter(client => client.clientId === selectedClient)

  const stats = getOverallStats()

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse">
          <div className="h-64 bg-slate-200 dark:bg-slate-800"></div>
          <div className="p-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className={`${theme.card} rounded-2xl p-6`}>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen">
        {/* Enhanced Header */}
      <div className={`p-6 ${theme.background} relative overflow-hidden`}>
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/coach')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className={`text-3xl font-bold ${theme.text} mb-2`}>
                  Client Adherence Tracking 📈
                </h1>
                <p className={`text-lg ${theme.textSecondary}`}>
                  Monitor detailed client engagement and program adherence
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:border-green-300 transition-all duration-300`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${theme.text}`}>{stats.avgAdherence.toFixed(1)}%</p>
                    <p className={`text-sm ${theme.textSecondary}`}>Avg Adherence</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:border-blue-300 transition-all duration-300`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${theme.text}`}>{stats.totalClients}</p>
                    <p className={`text-sm ${theme.textSecondary}`}>Active Clients</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:border-orange-300 transition-all duration-300`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${theme.text}`}>{stats.totalAlerts}</p>
                    <p className={`text-sm ${theme.textSecondary}`}>Active Alerts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:border-purple-300 transition-all duration-300`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <Flame className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${theme.text}`}>{stats.avgStreak.toFixed(0)}</p>
                    <p className={`text-sm ${theme.textSecondary}`}>Avg Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Filters */}
          <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Users className="w-4 h-4 text-slate-400" />
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {adherenceData.map(client => (
                        <SelectItem key={client.clientId} value={client.clientId}>
                          {client.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Metric" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overall">Overall</SelectItem>
                      <SelectItem value="workout">Workouts</SelectItem>
                      <SelectItem value="nutrition">Nutrition</SelectItem>
                      <SelectItem value="habit">Habits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Adherence Cards */}
          <div className="space-y-6">
            {filteredClients.map(client => (
              <Card key={client.clientId} className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:shadow-lg transition-all duration-300`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {/* Client Avatar */}
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {client.avatar}
                        </div>
                        {/* Status indicator */}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          client.overallAdherence >= 90 ? 'bg-green-500' :
                          client.overallAdherence >= 75 ? 'bg-blue-500' :
                          client.overallAdherence >= 60 ? 'bg-orange-500' :
                          client.overallAdherence >= 50 ? 'bg-red-500' : 'bg-red-700'
                        }`}></div>
                      </div>

                      <div className="flex-1">
                        <CardTitle className={`text-xl ${theme.text}`}>
                          {client.clientName}
                        </CardTitle>
                        <p className={`text-sm ${theme.textSecondary} mb-3`}>
                          Last active: {new Date(client.lastActive).toLocaleDateString()}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <Badge className={`${getAdherenceBgColor(client.overallAdherence)} ${getAdherenceColor(client.overallAdherence)} border-0`}>
                            {client.overallAdherence}% adherence
                          </Badge>
                          <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-0">
                            <Flame className="w-3 h-3 mr-1" />
                            {client.streak} day streak
                          </Badge>
                          {client.alerts > 0 && (
                            <Badge className="bg-red-500 text-white border-0">
                              {client.alerts} alert{client.alerts > 1 ? 's' : ''}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1">
                            {getTrendIcon(client.trend)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="hover:bg-green-50 dark:hover:bg-green-900/20">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="hover:bg-purple-50 dark:hover:bg-purple-900/20">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Adherence Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className={`text-sm font-medium ${theme.text}`}>Workouts</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-lg font-bold ${getAdherenceColor(client.workoutAdherence)}`}>
                            {client.workoutAdherence}%
                          </span>
                        </div>
                        <Progress value={client.workoutAdherence} className="h-2" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Apple className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className={`text-sm font-medium ${theme.text}`}>Nutrition</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-lg font-bold ${getAdherenceColor(client.nutritionAdherence)}`}>
                            {client.nutritionAdherence}%
                          </span>
                        </div>
                        <Progress value={client.nutritionAdherence} className="h-2" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className={`text-sm font-medium ${theme.text}`}>Habits</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-lg font-bold ${getAdherenceColor(client.habitAdherence)}`}>
                            {client.habitAdherence}%
                          </span>
                        </div>
                        <Progress value={client.habitAdherence} className="h-2" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className={`text-sm font-medium ${theme.text}`}>Sessions</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-lg font-bold ${getAdherenceColor(client.sessionAttendance)}`}>
                            {client.sessionAttendance}%
                          </span>
                        </div>
                        <Progress value={client.sessionAttendance} className="h-2" />
                      </div>
                    </div>
                  </div>

                  {/* Weekly Adherence Calendar */}
                  <div className={`${theme.card} rounded-xl p-4 border-2`}>
                    <h4 className={`font-semibold ${theme.text} mb-4`}>Weekly Adherence Calendar</h4>
                    <div className="grid grid-cols-7 gap-2">
                      {client.weeklyData.map((day, index) => (
                        <div key={index} className="text-center">
                          <div className={`text-xs ${theme.textSecondary} mb-1`}>
                            {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                          </div>
                          <div className="space-y-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              day.workout ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                            }`}>
                              <Dumbbell className="w-3 h-3" />
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              day.nutrition ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                            }`}>
                              <Apple className="w-3 h-3" />
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              day.habit ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                            }`}>
                              <Zap className="w-3 h-3" />
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              day.session ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                            }`}>
                              <Calendar className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Check-in
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Settings className="w-4 h-4 mr-2" />
                      Adjust Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredClients.length === 0 && (
            <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
              <CardContent className="text-center py-12">
                <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className={`text-lg font-medium ${theme.text} mb-2`}>No clients found</h3>
                <p className={`${theme.textSecondary} mb-4`}>
                  {selectedClient !== 'all'
                    ? 'Try selecting a different client or period'
                    : 'No clients are currently assigned to you'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </AnimatedBackground>
  )
}
