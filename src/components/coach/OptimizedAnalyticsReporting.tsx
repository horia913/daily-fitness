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

  // Mock analytics data - replace with actual data fetching
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalClients: 24,
    activeClients: 18,
    avgAdherence: 87,
    totalWorkouts: 342,
    totalMeals: 1089,
    personalBests: 12,
    clientProgress: [
      {
        clientId: '1',
        clientName: 'John Smith',
        avatar: 'JS',
        program: 'Weight Loss Program',
        progress: 75,
        goal: 'Lose 10 lbs',
        achievement: '-8 lbs',
        trend: 'up'
      },
      {
        clientId: '2',
        clientName: 'Maria Johnson',
        avatar: 'MJ',
        program: 'Strength Building',
        progress: 90,
        goal: 'Add 20 lbs to bench',
        achievement: '+15 lbs',
        trend: 'up'
      },
      {
        clientId: '3',
        clientName: 'David Kim',
        avatar: 'DK',
        program: 'Endurance Training',
        progress: 60,
        goal: 'Improve 5K time by 5 min',
        achievement: '+2.5 min',
        trend: 'stable'
      },
      {
        clientId: '4',
        clientName: 'Sarah Wilson',
        avatar: 'SW',
        program: 'Muscle Building',
        progress: 85,
        goal: 'Gain 8 lbs muscle',
        achievement: '+6 lbs',
        trend: 'up'
      }
    ],
    workoutTypes: [
      { type: 'Strength Training', percentage: 45, color: 'bg-[color:var(--fc-domain-workouts)]' },
      { type: 'Cardio', percentage: 30, color: 'bg-[color:var(--fc-domain-meals)]' },
      { type: 'Flexibility', percentage: 15, color: 'bg-[color:var(--fc-accent-purple)]' },
      { type: 'HIIT', percentage: 10, color: 'bg-[color:var(--fc-status-warning)]' }
    ],
    engagementMetrics: {
      avgSessionTime: 45,
      sessionsPerWeek: 3.2,
      goalsAchieved: 8,
      totalGoals: 12,
      successRate: 67
    },
    achievements: [
      {
        id: '1',
        clientName: 'John Smith',
        achievement: 'Weight Loss Goal Reached!',
        description: 'Lost 10 lbs in 8 weeks',
        type: 'weight_loss',
        date: '2024-01-15'
      },
      {
        id: '2',
        clientName: 'Maria Johnson',
        achievement: 'Bench Press Improvement',
        description: 'Added 20 lbs to her max',
        type: 'strength',
        date: '2024-01-14'
      },
      {
        id: '3',
        clientName: 'David Kim',
        achievement: 'First 5K Completed',
        description: 'Finished in 28:45',
        type: 'endurance',
        date: '2024-01-13'
      }
    ]
  })

  useEffect(() => {
    if (coachId) {
      fetchAnalyticsData()
    }
  }, [coachId])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Fetch clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('coach_id', coachId)

      if (clientsError) throw clientsError

      // Fetch profiles for these clients
      const clientIds = clients?.map(c => c.client_id) || []
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientIds)

      // Create real client progress data
      const realClientProgress = clients?.map((client, index) => {
        const profile = profiles?.find(p => p.id === client.client_id)
        const firstName = profile?.first_name || 'Unknown'
        const lastName = profile?.last_name || 'Client'
        
        return {
          clientId: client.id,
          clientName: `${firstName} ${lastName}`.trim(),
          avatar: `${firstName[0]}${lastName[0]}`.toUpperCase(),
          program: 'General Fitness',
          progress: Math.floor(Math.random() * 40) + 60, // Random progress between 60-100
          goal: 'Stay healthy',
          achievement: 'Active',
          trend: 'up' as const
        }
      }) || []

      // Update analytics data with real data
      setAnalyticsData(prev => ({
        ...prev,
        totalClients: clients?.length || 0,
        activeClients: clients?.filter(c => c.status === 'active').length || 0,
        clientProgress: realClientProgress,
        achievements: realClientProgress.slice(0, 3).map((client, index) => ({
          id: client.clientId,
          clientName: client.clientName,
          achievement: 'Great Progress!',
          description: 'Maintaining consistent workouts',
          type: 'general' as const,
          date: new Date().toISOString().split('T')[0]
        }))
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
        {/* Enhanced Header */}
        <div className="p-4 sm:p-6 relative overflow-hidden">
          {/* Floating background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[color:var(--fc-accent-cyan)]/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[color:var(--fc-accent-purple)]/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-[color:var(--fc-domain-meals)]/10 rounded-full blur-2xl"></div>
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
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex w-full fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-1 min-h-[56px] overflow-hidden">
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
              <Card className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)] mb-6">
                <CardContent className="p-6">
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
                </CardContent>
              </Card>

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
