'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/contexts/ThemeContext'
import OptimizedAnalyticsOverview from './OptimizedAnalyticsOverview'
import OptimizedClientProgress from './OptimizedClientProgress'
import OptimizedComplianceAnalytics from './OptimizedComplianceAnalytics'
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
  Settings,
  PieChart,
  LineChart,
  FileText,
  Share2,
  Printer,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AnalyticsData {
  totalClients: number
  activeClients: number
  avgAdherence: number
  totalWorkouts: number
  totalMeals: number
  personalBests: number
  clientProgress: {
    clientId: string
    clientName: string
    avatar: string
    program: string
    progress: number
    goal: string
    achievement: string
    trend: 'up' | 'down' | 'stable'
  }[]
  workoutTypes: {
    type: string
    percentage: number
    color: string
  }[]
  engagementMetrics: {
    avgSessionTime: number
    sessionsPerWeek: number
    goalsAchieved: number
    totalGoals: number
    successRate: number
  }
  achievements: {
    id: string
    clientName: string
    achievement: string
    description: string
    type: 'weight_loss' | 'strength' | 'endurance' | 'general'
    date: string
  }[]
}

interface OptimizedAnalyticsReportingProps {
  coachId?: string
}

export default function OptimizedAnalyticsReporting({ coachId }: OptimizedAnalyticsReportingProps) {
  const { getThemeStyles, performanceSettings } = useTheme()
  const router = useRouter()
  const theme = getThemeStyles()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [selectedClientGroup, setSelectedClientGroup] = useState<'all' | 'active' | 'new' | 'struggling'>('all')
  const [selectedMetric, setSelectedMetric] = useState<'overall' | 'workouts' | 'nutrition' | 'progress'>('overall')
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set())

  // Empty/zero initial state; filled by fetchAnalyticsData from metrics layer
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalClients: 0,
    activeClients: 0,
    avgAdherence: 0,
    totalWorkouts: 0,
    totalMeals: 0,
    personalBests: 0,
    clientProgress: [],
    workoutTypes: [],
    engagementMetrics: {
      avgSessionTime: 0,
      sessionsPerWeek: 0,
      goalsAchieved: 0,
      totalGoals: 0,
      successRate: 0
    },
    achievements: []
  })

  useEffect(() => {
    if (coachId) {
      fetchAnalyticsData()
    }
  }, [coachId])

  const fetchAnalyticsData = async () => {
    if (!coachId) return
    try {
      setLoading(true)
      const { getCoachClientIds, getTotalWorkouts, getTotalMeals, getPersonalRecordsCount, getSuccessRate, getAvgSessionTime, getSessionsPerWeek, getPeriodBounds } = await import('@/lib/metrics')
      const period = getPeriodBounds('this_month')

      const clientIds = await getCoachClientIds(coachId, false)
      if (clientIds.length === 0) {
        setAnalyticsData(prev => ({ ...prev, totalClients: 0, activeClients: 0 }))
        setLoading(false)
        return
      }

      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, client_id, status')
        .eq('coach_id', coachId)
        .in('client_id', clientIds)
      if (clientsError) throw clientsError

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', clientIds)

      const [
        totalWorkouts,
        totalMeals,
        personalBests,
        successRate,
        avgSessionTime,
        sessionsPerWeek,
        workoutLogsData,
        goalsData,
        achievementsData
      ] = await Promise.all([
        getTotalWorkouts(clientIds, period),
        getTotalMeals(clientIds, period),
        getPersonalRecordsCount(clientIds, period),
        getSuccessRate(clientIds, period),
        getAvgSessionTime(clientIds, period),
        getSessionsPerWeek(clientIds, period),
        supabase.from('workout_logs').select('client_id').in('client_id', clientIds).not('completed_at', 'is', null).gte('completed_at', period.start).lt('completed_at', period.end),
        supabase.from('goals').select('client_id, progress_percentage').in('client_id', clientIds).in('status', ['active', 'completed']),
        supabase.from('achievements').select('id, client_id, title, achievement_type, achieved_date').in('client_id', clientIds).order('achieved_date', { ascending: false }).limit(30)
      ])

      const completedByClient: Record<string, number> = {}
      clientIds.forEach(id => (completedByClient[id] = 0))
      ;(workoutLogsData.data || []).forEach((r: { client_id: string }) => { completedByClient[r.client_id] = (completedByClient[r.client_id] || 0) + 1 })
      const goalsByClient: Record<string, number[]> = {}
      clientIds.forEach(id => (goalsByClient[id] = []))
      ;(goalsData.data || []).forEach((r: { client_id: string; progress_percentage: number | null }) => {
        if (r.progress_percentage != null) goalsByClient[r.client_id].push(r.progress_percentage)
      })

      const clientProgressList = (clients || []).map((client) => {
        const profile = profiles?.find(p => p.id === client.client_id)
        const firstName = profile?.first_name || 'Unknown'
        const lastName = profile?.last_name || 'Client'
        const name = `${firstName} ${lastName}`.trim()
        const progressPcts = goalsByClient[client.client_id] || []
        const progress = progressPcts.length > 0 ? Math.round(progressPcts.reduce((a, b) => a + b, 0) / progressPcts.length) : (completedByClient[client.client_id] || 0)
        return {
          clientId: client.id,
          clientName: name,
          avatar: `${(firstName || '')[0]}${(lastName || '')[0]}`.toUpperCase().slice(0, 2) || '?',
          program: 'General Fitness',
          progress: Math.min(100, Math.max(0, progress)),
          goal: progressPcts.length ? 'On track' : 'Stay healthy',
          achievement: 'Active',
          trend: 'up' as const
        }
      })

      const achievementList = (achievementsData.data || []).map((a: { id: string; client_id: string; title: string; achievement_type: string; achieved_date: string }) => {
        const profile = profiles?.find(p => p.id === a.client_id)
        const name = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Client'
        return {
          id: a.id,
          clientName: name || 'Client',
          achievement: a.title,
          description: a.achievement_type,
          type: (a.achievement_type === 'personal_record' ? 'strength' : a.achievement_type === 'goal_completion' ? 'weight_loss' : 'general') as 'weight_loss' | 'strength' | 'endurance' | 'general',
          date: a.achieved_date
        }
      })

      const activeCount = (clients || []).filter(c => c.status === 'active').length
      const adherenceList = clientProgressList.map(c => c.progress)
      const avgAdherence = adherenceList.length > 0 ? Math.round(adherenceList.reduce((a, b) => a + b, 0) / adherenceList.length) : 0

      setAnalyticsData(prev => ({
        ...prev,
        totalClients: clients?.length || 0,
        activeClients: activeCount,
        avgAdherence,
        totalWorkouts,
        totalMeals,
        personalBests,
        engagementMetrics: {
          avgSessionTime,
          sessionsPerWeek,
          goalsAchieved: successRate.achieved,
          totalGoals: successRate.total,
          successRate: successRate.ratePercent
        },
        clientProgress: clientProgressList,
        achievements: achievementList
      }))
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-[color:var(--fc-status-success)]" />
      case 'down': return <TrendingDown className="w-4 h-4 text-[color:var(--fc-status-error)]" />
      default: return <Activity className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
    }
  }

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'weight_loss': return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-success)]'
      case 'strength': return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-domain-workouts)]'
      case 'endurance': return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-accent-purple)]'
      default: return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-warning)]'
    }
  }

  const toggleChartExpansion = (chartId: string) => {
    const newExpanded = new Set(expandedCharts)
    if (newExpanded.has(chartId)) {
      newExpanded.delete(chartId)
    } else {
      newExpanded.add(chartId)
    }
    setExpandedCharts(newExpanded)
  }

  const generateReport = () => {
    // Implement report generation logic
    console.log('Generating report for period:', selectedPeriod, 'client group:', selectedClientGroup)
  }

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
      <div className="min-h-screen pb-24">
        {/* Header - no frame */}
        <div className="p-4 sm:p-6 relative overflow-hidden w-full">
          <div className="w-full relative z-10">
            <div className="p-4 sm:p-6 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <Button
                      variant="ghost"
                      onClick={() => router.push('/coach')}
                      className="fc-btn fc-btn-ghost h-10 w-10"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                          Analytics & Reports
                        </h1>
                        <p className="text-sm sm:text-base text-[color:var(--fc-text-dim)]">
                          Comprehensive insights into client progress and performance
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={generateReport}
                      className="fc-btn fc-btn-ghost"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Generate Report</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="fc-btn fc-btn-ghost"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Share</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="fc-btn fc-btn-ghost"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs - full width */}
        <div className="p-4 sm:p-6 w-full">
          <div className="w-full space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex w-full rounded-lg border-0 bg-transparent p-1 min-h-[56px] overflow-hidden">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-[color:var(--fc-accent-cyan)] data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-[color:var(--fc-text-dim)] rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 touch-manipulation cursor-pointer select-none hover:bg-[color:var(--fc-glass-soft)] hover:text-[color:var(--fc-text-primary)] flex-1 flex items-center justify-center min-h-[48px]"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="client-progress" 
                  className="data-[state=active]:bg-[color:var(--fc-accent-cyan)] data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-[color:var(--fc-text-dim)] rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 touch-manipulation cursor-pointer select-none hover:bg-[color:var(--fc-glass-soft)] hover:text-[color:var(--fc-text-primary)] flex-1 flex items-center justify-center min-h-[48px]"
                >
                  Progress
                </TabsTrigger>
                <TabsTrigger 
                  value="compliance" 
                  className="data-[state=active]:bg-[color:var(--fc-accent-cyan)] data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-[color:var(--fc-text-dim)] rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 touch-manipulation cursor-pointer select-none hover:bg-[color:var(--fc-glass-soft)] hover:text-[color:var(--fc-text-primary)] flex-1 flex items-center justify-center min-h-[48px]"
                >
                  Compliance
                </TabsTrigger>
                <TabsTrigger 
                  value="detailed" 
                  className="data-[state=active]:bg-[color:var(--fc-accent-cyan)] data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-[color:var(--fc-text-dim)] rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 touch-manipulation cursor-pointer select-none hover:bg-[color:var(--fc-glass-soft)] hover:text-[color:var(--fc-text-primary)] flex-1 flex items-center justify-center min-h-[48px]"
                >
                  Reports
                </TabsTrigger>
              </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <OptimizedAnalyticsOverview coachId={coachId} />
            </TabsContent>

            {/* Client Progress Tab */}
            <TabsContent value="client-progress" className="space-y-6 mt-6">
              <OptimizedClientProgress coachId={coachId} />
            </TabsContent>

            {/* Compliance Analytics Tab */}
            <TabsContent value="compliance" className="space-y-6 mt-6">
              <OptimizedComplianceAnalytics coachId={coachId} />
            </TabsContent>

            {/* Detailed Reports Tab */}
            <TabsContent value="detailed" className="space-y-6 mt-6">
              {/* Global Filters */}
              <div className="p-6 mb-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <Calendar className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                      <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                        <SelectTrigger className="fc-select w-full md:w-48 h-12">
                          <SelectValue placeholder="Select Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="week">Last 7 Days</SelectItem>
                          <SelectItem value="month">Last 30 Days</SelectItem>
                          <SelectItem value="quarter">Last 90 Days</SelectItem>
                          <SelectItem value="year">Last Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                      <Select value={selectedClientGroup} onValueChange={(value: any) => setSelectedClientGroup(value)}>
                        <SelectTrigger className="fc-select w-48 h-12">
                          <SelectValue placeholder="Client Group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Clients</SelectItem>
                          <SelectItem value="active">Active Clients</SelectItem>
                          <SelectItem value="new">New Clients</SelectItem>
                          <SelectItem value="struggling">Struggling Clients</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                      <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                        <SelectTrigger className="fc-select w-48 h-12">
                          <SelectValue placeholder="Metric Focus" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overall">Overall Performance</SelectItem>
                          <SelectItem value="workouts">Workout Analytics</SelectItem>
                          <SelectItem value="nutrition">Nutrition Tracking</SelectItem>
                          <SelectItem value="progress">Progress Metrics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

              {/* Detailed Reports Content */}
              <div className="space-y-6">
                {/* Client Progress Overview */}
                <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-3 text-[color:var(--fc-text-primary)]">
                        <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                          <BarChart3 className="w-5 h-5 text-[color:var(--fc-domain-workouts)]" />
                        </div>
                        Client Progress Overview
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleChartExpansion('progress')}
                        className="fc-btn fc-btn-ghost"
                      >
                        {expandedCharts.has('progress') ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.clientProgress.map(client => (
                        <div key={client.clientId} className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)] hover:shadow-md transition-all duration-300">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center font-bold">
                                {client.avatar}
                              </div>
                              <div>
                                <p className="font-semibold text-[color:var(--fc-text-primary)]">{client.clientName}</p>
                                <p className="text-sm text-[color:var(--fc-text-dim)]">{client.program}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-sm font-medium text-[color:var(--fc-status-success)]">{client.achievement}</p>
                                <p className="text-xs text-[color:var(--fc-text-subtle)]">This period</p>
                              </div>
                              {getTrendIcon(client.trend)}
                            </div>
                          </div>
                          <Progress value={client.progress} className="h-3 mb-2" />
                          <div className="flex justify-between text-xs text-[color:var(--fc-text-subtle)]">
                            <span>Goal: {client.goal}</span>
                            <span>{client.progress}% complete</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Analytics Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Workout Types Distribution */}
                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3 text-[color:var(--fc-text-primary)]">
                          <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                            <PieChart className="w-5 h-5 text-[color:var(--fc-domain-meals)]" />
                          </div>
                          Workout Types Distribution
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleChartExpansion('workout-types')}
                          className="fc-btn fc-btn-ghost"
                        >
                          {expandedCharts.has('workout-types') ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analyticsData.workoutTypes.map((type, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 ${type.color} rounded-full`}></div>
                                <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">{type.type}</span>
                              </div>
                              <span className="text-sm font-bold text-[color:var(--fc-text-primary)]">{type.percentage}%</span>
                            </div>
                            <div className="w-full bg-[color:var(--fc-glass-soft)] rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${type.color}`}
                                style={{ width: `${type.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Engagement Metrics */}
                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3 text-[color:var(--fc-text-primary)]">
                          <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                            <Activity className="w-5 h-5 text-[color:var(--fc-status-warning)]" />
                          </div>
                          Engagement Metrics
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleChartExpansion('engagement')}
                          className="fc-btn fc-btn-ghost"
                        >
                          {expandedCharts.has('engagement') ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-[color:var(--fc-domain-workouts)]" />
                              <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Avg Session Time</span>
                            </div>
                            <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{analyticsData.engagementMetrics.avgSessionTime} min</p>
                          </div>
                          
                          <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-[color:var(--fc-domain-meals)]" />
                              <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Sessions/Week</span>
                            </div>
                            <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{analyticsData.engagementMetrics.sessionsPerWeek}</p>
                          </div>
                        </div>
                        
                        <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-[color:var(--fc-accent-purple)]" />
                              <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Success Rate</span>
                            </div>
                            <span className="text-lg font-bold text-[color:var(--fc-status-success)]">
                              {analyticsData.engagementMetrics.successRate}%
                            </span>
                          </div>
                          <Progress value={analyticsData.engagementMetrics.successRate} className="h-3" />
                          <div className="flex justify-between text-xs text-[color:var(--fc-text-subtle)] mt-1">
                            <span>{analyticsData.engagementMetrics.goalsAchieved} goals achieved</span>
                            <span>{analyticsData.engagementMetrics.totalGoals} total goals</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Achievements */}
                <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-[color:var(--fc-text-primary)]">
                      <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                        <Award className="w-5 h-5 text-[color:var(--fc-status-warning)]" />
                      </div>
                      Recent Client Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.achievements.map(achievement => (
                        <div key={achievement.id} className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)] hover:shadow-md transition-all duration-300">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 ${getAchievementColor(achievement.type)} rounded-lg`}>
                              <Award className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-[color:var(--fc-text-primary)]">{achievement.achievement}</p>
                              <p className="text-sm text-[color:var(--fc-text-dim)]">
                                <strong>{achievement.clientName}:</strong> {achievement.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-[color:var(--fc-text-subtle)]">
                                {new Date(achievement.date).toLocaleDateString()}
                              </p>
                              <Badge className={`${getAchievementColor(achievement.type)} border-0 mt-1`}>
                                {achievement.type.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Report Generation Section */}
                <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-[color:var(--fc-text-primary)]">
                      <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                        <FileText className="w-5 h-5 text-[color:var(--fc-accent-purple)]" />
                      </div>
                      Report Generation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4 text-[color:var(--fc-domain-workouts)]" />
                          <span className="font-medium text-[color:var(--fc-text-primary)]">Summary Report</span>
                        </div>
                        <p className="text-sm text-[color:var(--fc-text-dim)] mb-4">
                          Generate a comprehensive overview of all client metrics and achievements
                        </p>
                        <Button className="fc-btn fc-btn-primary w-full">
                          <FileText className="w-4 h-4 mr-2" />
                          Generate Summary
                        </Button>
                      </div>
                      
                      <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-[color:var(--fc-domain-meals)]" />
                          <span className="font-medium text-[color:var(--fc-text-primary)]">Client Report</span>
                        </div>
                        <p className="text-sm text-[color:var(--fc-text-dim)] mb-4">
                          Create detailed individual client progress reports
                        </p>
                        <Button variant="outline" className="fc-btn fc-btn-ghost w-full">
                          <Users className="w-4 h-4 mr-2" />
                          Generate Client Report
                        </Button>
                      </div>
                      
                      <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 className="w-4 h-4 text-[color:var(--fc-accent-purple)]" />
                          <span className="font-medium text-[color:var(--fc-text-primary)]">Analytics Report</span>
                        </div>
                        <p className="text-sm text-[color:var(--fc-text-dim)] mb-4">
                          Export detailed analytics and performance metrics
                        </p>
                        <Button variant="outline" className="fc-btn fc-btn-ghost w-full">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Generate Analytics
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>
    </AnimatedBackground>
  )
}
