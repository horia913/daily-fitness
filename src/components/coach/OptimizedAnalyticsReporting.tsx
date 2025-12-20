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
  const { isDark, getThemeStyles, performanceSettings } = useTheme()
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
      { type: 'Strength Training', percentage: 45, color: 'bg-blue-500' },
      { type: 'Cardio', percentage: 30, color: 'bg-green-500' },
      { type: 'Flexibility', percentage: 15, color: 'bg-purple-500' },
      { type: 'HIIT', percentage: 10, color: 'bg-orange-500' }
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
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />
      default: return <Activity className="w-4 h-4 text-slate-400" />
    }
  }

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'weight_loss': return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
      case 'strength': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
      case 'endurance': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
      default: return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
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
      <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>
        {/* Enhanced Header */}
      <div style={{ padding: '24px 20px', backgroundColor: '#E8E9F3', borderRadius: '24px' }}>
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/coach')}
                style={{ padding: '8px', borderRadius: '20px' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BarChart3 style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>
                    Analytics & Reports
                  </h1>
                  <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>
                    Comprehensive insights into client progress and performance
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={generateReport}
                className="rounded-2xl px-8 py-4 text-base font-semibold border-2 hover:border-blue-300 transition-all duration-200"
              >
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Generate Report</span>
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl px-8 py-4 text-base font-semibold border-2 hover:border-blue-300 transition-all duration-200"
              >
                <Share2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl px-8 py-4 text-base font-semibold border-2 hover:border-blue-300 transition-all duration-200"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div style={{ padding: '24px 20px', backgroundColor: '#E8E9F3', borderRadius: '24px' }}>
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" style={{ position: 'relative', zIndex: 10 }}>
            <TabsList className="flex w-full bg-white rounded-2xl p-1 shadow-lg border-2 border-gray-100 min-h-[56px] overflow-hidden">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-50 data-[state=inactive]:text-gray-600 rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 touch-manipulation cursor-pointer select-none hover:bg-blue-100 hover:text-blue-700 flex-1 flex items-center justify-center min-h-[48px]"
                style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="client-progress" 
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-50 data-[state=inactive]:text-gray-600 rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 touch-manipulation cursor-pointer select-none hover:bg-blue-100 hover:text-blue-700 flex-1 flex items-center justify-center min-h-[48px]"
                style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
              >
                Progress
              </TabsTrigger>
              <TabsTrigger 
                value="compliance" 
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-50 data-[state=inactive]:text-gray-600 rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 touch-manipulation cursor-pointer select-none hover:bg-blue-100 hover:text-blue-700 flex-1 flex items-center justify-center min-h-[48px]"
                style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
              >
                Compliance
              </TabsTrigger>
              <TabsTrigger 
                value="detailed" 
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-50 data-[state=inactive]:text-gray-600 rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 touch-manipulation cursor-pointer select-none hover:bg-blue-100 hover:text-blue-700 flex-1 flex items-center justify-center min-h-[48px]"
                style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
              >
                Reports
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-24 sm:mt-28">
              <OptimizedAnalyticsOverview coachId={coachId} />
            </TabsContent>

            {/* Client Progress Tab */}
            <TabsContent value="client-progress" className="space-y-6 mt-24 sm:mt-28">
              <OptimizedClientProgress coachId={coachId} />
            </TabsContent>

            {/* Compliance Analytics Tab */}
            <TabsContent value="compliance" className="space-y-6 mt-24 sm:mt-28">
              <OptimizedComplianceAnalytics coachId={coachId} />
            </TabsContent>

            {/* Detailed Reports Tab */}
            <TabsContent value="detailed" className="space-y-6 mt-24 sm:mt-28">
              {/* Global Filters */}
              <Card className={`bg-white rounded-3xl p-6 shadow-lg mb-6`}>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                        <SelectTrigger className="w-full md:w-48 h-12 rounded-2xl border-2 border-gray-200 bg-white focus:border-blue-500">
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
                      <Users className="w-4 h-4 text-slate-400" />
                      <Select value={selectedClientGroup} onValueChange={(value: any) => setSelectedClientGroup(value)}>
                        <SelectTrigger className="w-48 h-12 rounded-2xl border-2 border-gray-200 bg-white focus:border-blue-500">
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
                      <BarChart3 className="w-4 h-4 text-slate-400" />
                      <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                        <SelectTrigger className="w-48 h-12 rounded-2xl border-2 border-gray-200 bg-white focus:border-blue-500">
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
              </Card>

              {/* Detailed Reports Content */}
              <div className="space-y-6">
                {/* Client Progress Overview */}
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        Client Progress Overview
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleChartExpansion('progress')}
                        className="rounded-xl"
                      >
                        {expandedCharts.has('progress') ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.clientProgress.map(client => (
                        <div key={client.clientId} className={`${theme.card} rounded-xl p-4 border-2 hover:shadow-md transition-all duration-300`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {client.avatar}
                              </div>
                              <div>
                                <p className={`font-semibold ${theme.text}`}>{client.clientName}</p>
                                <p className={`text-sm ${theme.textSecondary}`}>{client.program}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className={`text-sm font-medium text-green-600 dark:text-green-400`}>{client.achievement}</p>
                                <p className={`text-xs ${theme.textSecondary}`}>This period</p>
                              </div>
                              {getTrendIcon(client.trend)}
                            </div>
                          </div>
                          <Progress value={client.progress} className="h-3 mb-2" />
                          <div className="flex justify-between text-xs text-slate-500">
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
                  <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <PieChart className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          Workout Types Distribution
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleChartExpansion('workout-types')}
                          className="rounded-xl"
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
                                <span className={`text-sm font-medium ${theme.text}`}>{type.type}</span>
                              </div>
                              <span className={`text-sm font-bold ${theme.text}`}>{type.percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
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
                  <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          Engagement Metrics
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleChartExpansion('engagement')}
                          className="rounded-xl"
                        >
                          {expandedCharts.has('engagement') ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className={`${theme.card} rounded-xl p-4 border-2`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className={`text-sm font-medium ${theme.text}`}>Avg Session Time</span>
                            </div>
                            <p className={`text-2xl font-bold ${theme.text}`}>{analyticsData.engagementMetrics.avgSessionTime} min</p>
                          </div>
                          
                          <div className={`${theme.card} rounded-xl p-4 border-2`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className={`text-sm font-medium ${theme.text}`}>Sessions/Week</span>
                            </div>
                            <p className={`text-2xl font-bold ${theme.text}`}>{analyticsData.engagementMetrics.sessionsPerWeek}</p>
                          </div>
                        </div>
                        
                        <div className={`${theme.card} rounded-xl p-4 border-2`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <span className={`text-sm font-medium ${theme.text}`}>Success Rate</span>
                            </div>
                            <span className={`text-lg font-bold text-green-600 dark:text-green-400`}>
                              {analyticsData.engagementMetrics.successRate}%
                            </span>
                          </div>
                          <Progress value={analyticsData.engagementMetrics.successRate} className="h-3" />
                          <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>{analyticsData.engagementMetrics.goalsAchieved} goals achieved</span>
                            <span>{analyticsData.engagementMetrics.totalGoals} total goals</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Achievements */}
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      Recent Client Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.achievements.map(achievement => (
                        <div key={achievement.id} className={`${theme.card} rounded-xl p-4 border-2 hover:shadow-md transition-all duration-300`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 ${getAchievementColor(achievement.type)} rounded-lg`}>
                              <Award className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className={`font-semibold ${theme.text}`}>{achievement.achievement}</p>
                              <p className={`text-sm ${theme.textSecondary}`}>
                                <strong>{achievement.clientName}:</strong> {achievement.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs ${theme.textSecondary}`}>
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
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      Report Generation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className={`${theme.card} rounded-xl p-4 border-2`}>
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className={`font-medium ${theme.text}`}>Summary Report</span>
                        </div>
                        <p className={`text-sm ${theme.textSecondary} mb-4`}>
                          Generate a comprehensive overview of all client metrics and achievements
                        </p>
                        <Button className="w-full rounded-xl">
                          <FileText className="w-4 h-4 mr-2" />
                          Generate Summary
                        </Button>
                      </div>
                      
                      <div className={`${theme.card} rounded-xl p-4 border-2`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className={`font-medium ${theme.text}`}>Client Report</span>
                        </div>
                        <p className={`text-sm ${theme.textSecondary} mb-4`}>
                          Create detailed individual client progress reports
                        </p>
                        <Button variant="outline" className="w-full rounded-xl">
                          <Users className="w-4 h-4 mr-2" />
                          Generate Client Report
                        </Button>
                      </div>
                      
                      <div className={`${theme.card} rounded-xl p-4 border-2`}>
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className={`font-medium ${theme.text}`}>Analytics Report</span>
                        </div>
                        <p className={`text-sm ${theme.textSecondary} mb-4`}>
                          Export detailed analytics and performance metrics
                        </p>
                        <Button variant="outline" className="w-full rounded-xl">
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
