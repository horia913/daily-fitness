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
    if (score >= 90) return 'text-[color:var(--fc-status-success)]'
    if (score >= 75) return 'text-[color:var(--fc-accent-cyan)]'
    if (score >= 60) return 'text-[color:var(--fc-status-warning)]'
    if (score >= 50) return 'text-[color:var(--fc-status-error)]'
    return 'text-[color:var(--fc-status-error)]'
  }

  const getAdherenceBgColor = (score: number) => {
    if (score >= 90) return 'bg-[color:var(--fc-glass-soft)]'
    if (score >= 75) return 'bg-[color:var(--fc-glass-soft)]'
    if (score >= 60) return 'bg-[color:var(--fc-glass-soft)]'
    if (score >= 50) return 'bg-[color:var(--fc-glass-soft)]'
    return 'bg-[color:var(--fc-glass-soft)]'
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-[color:var(--fc-status-success)]" />
      case 'down': return <TrendingDown className="w-4 h-4 text-[color:var(--fc-status-error)]" />
      default: return <Activity className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
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
          <div className="h-64 bg-[color:var(--fc-glass-highlight)]"></div>
          <div className="p-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="fc-glass fc-card rounded-2xl p-6">
                <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-16 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
                  <div className="h-16 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
                  <div className="h-16 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
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
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[color:var(--fc-accent-cyan)]/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[color:var(--fc-domain-meals)]/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-[color:var(--fc-accent-purple)]/10 rounded-full blur-2xl"></div>
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            <Card className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="p-5 sm:p-6 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <Button
                      variant="ghost"
                      onClick={() => router.push('/coach')}
                      className="fc-btn fc-btn-ghost h-10 w-10"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="space-y-2">
                      <Badge className="fc-badge">Adherence Monitor</Badge>
                      <h1 className="text-3xl font-bold text-[color:var(--fc-text-primary)]">
                        Client Adherence Tracking 📈
                      </h1>
                      <p className="text-lg text-[color:var(--fc-text-dim)]">
                        Monitor detailed client engagement and program adherence
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="fc-btn fc-btn-ghost flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      className="fc-btn fc-btn-ghost flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </div>
                </div>

                {/* Overall Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                          <Target className="w-5 h-5 text-[color:var(--fc-status-success)]" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{stats.avgAdherence.toFixed(1)}%</p>
                          <p className="text-sm text-[color:var(--fc-text-dim)]">Avg Adherence</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                          <Users className="w-5 h-5 text-[color:var(--fc-domain-workouts)]" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{stats.totalClients}</p>
                          <p className="text-sm text-[color:var(--fc-text-dim)]">Active Clients</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                          <AlertCircle className="w-5 h-5 text-[color:var(--fc-status-warning)]" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{stats.totalAlerts}</p>
                          <p className="text-sm text-[color:var(--fc-text-dim)]">Active Alerts</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                          <Flame className="w-5 h-5 text-[color:var(--fc-accent-purple)]" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{stats.avgStreak.toFixed(0)}</p>
                          <p className="text-sm text-[color:var(--fc-text-dim)]">Avg Streak</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Filters */}
          <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr] gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="fc-select w-full h-11">
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
                  <Calendar className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                  <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                    <SelectTrigger className="fc-select w-full h-11">
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
                  <BarChart3 className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                  <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                    <SelectTrigger className="fc-select w-full h-11">
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
              <Card key={client.clientId} className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Client Avatar */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center font-bold text-lg">
                          {client.avatar}
                        </div>
                        {/* Status indicator */}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[color:var(--fc-glass-border)] ${
                          client.overallAdherence >= 90 ? 'bg-[color:var(--fc-status-success)]' :
                          client.overallAdherence >= 75 ? 'bg-[color:var(--fc-accent-cyan)]' :
                          client.overallAdherence >= 60 ? 'bg-[color:var(--fc-status-warning)]' :
                          client.overallAdherence >= 50 ? 'bg-[color:var(--fc-status-error)]' : 'bg-[color:var(--fc-status-error)]'
                        }`}></div>
                      </div>

                      <div className="flex-1">
                        <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">
                          {client.clientName}
                        </CardTitle>
                        <p className="text-sm text-[color:var(--fc-text-dim)] mb-3">
                          Last active: {new Date(client.lastActive).toLocaleDateString()}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`${getAdherenceBgColor(client.overallAdherence)} ${getAdherenceColor(client.overallAdherence)} border border-[color:var(--fc-glass-border)]`}>
                            {client.overallAdherence}% adherence
                          </Badge>
                          <Badge className="bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-accent-purple)] border border-[color:var(--fc-glass-border)]">
                            <Flame className="w-3 h-3 mr-1" />
                            {client.streak} day streak
                          </Badge>
                          {client.alerts > 0 && (
                            <Badge className="bg-[color:var(--fc-status-error)] text-white border-0">
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
                      <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost">
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
                        <Dumbbell className="w-4 h-4 text-[color:var(--fc-domain-workouts)]" />
                        <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Workouts</span>
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
                        <Apple className="w-4 h-4 text-[color:var(--fc-domain-meals)]" />
                        <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Nutrition</span>
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
                        <Zap className="w-4 h-4 text-[color:var(--fc-domain-habits)]" />
                        <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Habits</span>
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
                        <Calendar className="w-4 h-4 text-[color:var(--fc-status-warning)]" />
                        <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Sessions</span>
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
                  <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                    <h4 className="font-semibold text-[color:var(--fc-text-primary)] mb-4">Weekly Adherence Calendar</h4>
                    <div className="grid grid-cols-7 gap-2">
                      {client.weeklyData.map((day, index) => (
                        <div key={index} className="text-center">
                          <div className="text-xs text-[color:var(--fc-text-subtle)] mb-1">
                            {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                          </div>
                          <div className="space-y-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              day.workout ? 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-domain-workouts)]' : 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-subtle)]'
                            }`}>
                              <Dumbbell className="w-3 h-3" />
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              day.nutrition ? 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-domain-meals)]' : 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-subtle)]'
                            }`}>
                              <Apple className="w-3 h-3" />
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              day.habit ? 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-domain-habits)]' : 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-subtle)]'
                            }`}>
                              <Zap className="w-3 h-3" />
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              day.session ? 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-warning)]' : 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-subtle)]'
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
                    <Button variant="outline" className="fc-btn fc-btn-ghost flex-1">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                    <Button variant="outline" className="fc-btn fc-btn-ghost flex-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Check-in
                    </Button>
                    <Button variant="outline" className="fc-btn fc-btn-ghost flex-1">
                      <Settings className="w-4 h-4 mr-2" />
                      Adjust Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredClients.length === 0 && (
            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="text-center py-12">
                <Users className="w-16 h-16 text-[color:var(--fc-text-subtle)] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[color:var(--fc-text-primary)] mb-2">No clients found</h3>
                <p className="text-[color:var(--fc-text-dim)] mb-4">
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
