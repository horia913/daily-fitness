'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  AlertTriangle,
  CheckCircle,
  Clock,
  Dumbbell,
  Apple,
  Zap,
  Heart,
  Activity,
  LineChart,
  PieChart,
  Download,
  RefreshCw,
  Minimize2,
  Maximize2,
  ArrowLeft,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRouter } from 'next/navigation'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Dumbbell,
  Apple,
  Heart,
  Target,
}

interface ClientCompliance {
  id: string
  name: string
  avatar_url?: string
  compliance: number
}

interface AnalyticsOverviewData {
  // Business KPIs
  totalClients: number
  activeClients: number
  newClientsThisPeriod: number
  clientRetentionRate: number
  overallComplianceRate: number
  
  // Engagement Metrics
  avgSessionTime: number
  sessionsPerWeek: number
  goalsAchieved: number
  totalGoals: number
  successRate: number
  
  // Activity Metrics
  totalWorkouts: number
  totalMeals: number
  totalHabits: number
  personalBests: number
  
  // Trends
  clientGrowthTrend: 'up' | 'down' | 'stable'
  complianceTrend: 'up' | 'down' | 'stable'
  engagementTrend: 'up' | 'down' | 'stable'
  
  // Client Growth Data
  clientGrowthData: {
    period: string
    newClients: number
    churnedClients: number
    netGrowth: number
  }[]
  
  // Compliance Breakdown
  complianceBreakdown: {
    category: string
    percentage: number
    color: string
    icon: React.ComponentType<{ className?: string }>
  }[]
  
  // Program Effectiveness
  programEffectiveness: {
    programName: string
    successRate: number
    avgProgress: number
    clientCount: number
    color: string
  }[]
  
  // Quick Insights/Alerts
  insights: {
    id: string
    type: 'success' | 'warning' | 'info' | 'alert'
    title: string
    description: string
    action?: string
    icon: React.ComponentType<{ className?: string }>
  }[]
}

interface OptimizedAnalyticsOverviewProps {
  coachId?: string
}

export default function OptimizedAnalyticsOverview({ coachId }: OptimizedAnalyticsOverviewProps) {
  const { getThemeStyles } = useTheme()
  const router = useRouter()
  const theme = getThemeStyles()

  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set())
  const [topClients, setTopClients] = useState<ClientCompliance[]>([])
  const [bottomClients, setBottomClients] = useState<ClientCompliance[]>([])
  const loadingRef = useRef(false)
  const didLoadRef = useRef(false)

  // Initialize with empty data
  const [analyticsData, setAnalyticsData] = useState<AnalyticsOverviewData>({
    totalClients: 0,
    activeClients: 0,
    newClientsThisPeriod: 0,
    clientRetentionRate: 0,
    overallComplianceRate: 0,
    
    avgSessionTime: 0,
    sessionsPerWeek: 0,
    goalsAchieved: 0,
    totalGoals: 0,
    successRate: 0,
    
    totalWorkouts: 0,
    totalMeals: 0,
    totalHabits: 0,
    personalBests: 0,
    
    clientGrowthTrend: 'stable',
    complianceTrend: 'stable',
    engagementTrend: 'stable',
    
    clientGrowthData: [],
    complianceBreakdown: [
      { category: 'Workouts', percentage: 0, color: 'bg-[color:var(--fc-domain-workouts)]', icon: Dumbbell },
      { category: 'Nutrition', percentage: 0, color: 'bg-[color:var(--fc-domain-meals)]', icon: Apple },
      { category: 'Habits', percentage: 0, color: 'bg-[color:var(--fc-domain-habits)]', icon: Heart },
      { category: 'Goals', percentage: 0, color: 'bg-[color:var(--fc-status-warning)]', icon: Target }
    ],
    programEffectiveness: [],
    insights: []
  })

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (!coachId) return
    if (didLoadRef.current) return
    if (loadingRef.current) return
    didLoadRef.current = true
    loadingRef.current = true
    setLoading(true)
    try {
      const res = await fetch(`/api/coach/analytics/overview?period=${selectedPeriod}`, { signal: signal ?? null })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      const breakdown = (data.complianceBreakdown || []).map((item: { category: string; percentage: number; color: string; icon: string }) => ({
        ...item,
        icon: iconMap[item.icon] || Dumbbell,
      }))
      setTopClients(data.topClients || [])
      setBottomClients(data.bottomClients || [])
      setAnalyticsData({
        totalClients: data.totalClients ?? 0,
        activeClients: data.activeClients ?? 0,
        newClientsThisPeriod: data.newClientsThisPeriod ?? 0,
        clientRetentionRate: data.clientRetentionRate ?? 0,
        overallComplianceRate: data.overallComplianceRate ?? 0,
        avgSessionTime: data.avgSessionTime ?? 0,
        sessionsPerWeek: data.sessionsPerWeek ?? 0,
        goalsAchieved: data.goalsAchieved ?? 0,
        totalGoals: data.totalGoals ?? 0,
        successRate: data.successRate ?? 0,
        totalWorkouts: data.totalWorkouts ?? 0,
        totalMeals: data.totalMeals ?? 0,
        totalHabits: data.totalHabits ?? 0,
        personalBests: data.personalBests ?? 0,
        clientGrowthTrend: data.clientGrowthTrend ?? 'stable',
        complianceTrend: data.complianceTrend ?? 'stable',
        engagementTrend: data.engagementTrend ?? 'stable',
        clientGrowthData: data.clientGrowthData ?? [],
        complianceBreakdown: breakdown,
        programEffectiveness: data.programEffectiveness ?? [],
        insights: data.insights ?? [],
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        didLoadRef.current = false
        return
      }
      console.error('Error loading analytics data:', err)
      didLoadRef.current = false
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [coachId, selectedPeriod])

  useEffect(() => {
    if (!coachId) return
    const ac = new AbortController()
    loadData(ac.signal)
    return () => {
      didLoadRef.current = false
      loadingRef.current = false
      ac.abort()
    }
  }, [coachId, selectedPeriod, loadData])

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-[color:var(--fc-status-success)]" />
      case 'down': return <TrendingDown className="w-4 h-4 text-[color:var(--fc-status-error)]" />
      default: return <Activity className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-[color:var(--fc-status-success)]'
      case 'down': return 'text-[color:var(--fc-status-error)]'
      default: return 'text-[color:var(--fc-text-subtle)]'
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-success)] border-[color:var(--fc-glass-border)]'
      case 'warning': return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-warning)] border-[color:var(--fc-glass-border)]'
      case 'info': return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-accent-cyan)] border-[color:var(--fc-glass-border)]'
      case 'alert': return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-error)] border-[color:var(--fc-glass-border)]'
      default: return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-subtle)] border-[color:var(--fc-glass-border)]'
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

  const formatPercentage = (value: number) => {
    return `${value}%`
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse">
          <div className="h-64 bg-[color:var(--fc-glass-highlight)]"></div>
          <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
            <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6">
              <div className="fc-card-shell p-3 sm:p-6">
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
    <div className={`min-h-screen flex flex-col gap-0 sm:gap-6 ${theme.background}`}>
      {/* Enhanced Header - hidden on mobile to save vertical space */}
      <div className="hidden sm:block shrink-0">
      <div className={`p-2 sm:p-6 ${theme.background} relative overflow-hidden max-w-full overflow-x-hidden`}>
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[color:var(--fc-accent-cyan)]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[color:var(--fc-accent-purple)]/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-[color:var(--fc-domain-meals)]/10 rounded-full blur-2xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <Card className="fc-card-shell rounded-3xl border border-[color:var(--fc-glass-border)]">
            <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-6">
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
                    <Badge className="fc-badge">Business Intelligence</Badge>
                    <h1 className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                      Analytics Overview 📊
                    </h1>
                    <p className="text-base sm:text-lg text-[color:var(--fc-text-dim)]">
                      High-level insights into your coaching business performance
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => { didLoadRef.current = false; loadData(); }}
                    className="fc-btn fc-btn-ghost flex items-center gap-2"
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="fc-btn fc-btn-ghost flex items-center gap-2"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 text-[color:var(--fc-text-dim)]">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-text-subtle)]" />
                  <span className="text-sm sm:text-base font-medium">Time Period</span>
                </div>
                <Select value={selectedPeriod} onValueChange={(value: '7d' | '30d' | '90d' | '1y') => setSelectedPeriod(value)}>
                  <SelectTrigger className="fc-select w-full sm:w-48 h-10 sm:h-12">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="1y">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>

      {/* Main Content - no top spacing on mobile when hero is hidden */}
      <div className="p-2 sm:p-6 max-w-full pt-0 sm:pt-6 min-w-0">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-4">
            {/* Total Clients */}
            <Card className="fc-card-shell hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
              <CardContent className="p-2 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                    <Users className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{analyticsData.totalClients}</p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Total Clients</p>
                    <div className="flex items-center gap-1 mt-1">
                      {getTrendIcon(analyticsData.clientGrowthTrend)}
                      <span className={`text-xs ${getTrendColor(analyticsData.clientGrowthTrend)}`}>
                        +{analyticsData.newClientsThisPeriod} this period
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Clients */}
            <Card className="fc-card-shell hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
              <CardContent className="p-2 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-status-success)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{analyticsData.activeClients}</p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Active Clients</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-[color:var(--fc-text-subtle)]">
                        {formatPercentage(analyticsData.clientRetentionRate)} retention
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overall Compliance */}
            <Card className="fc-card-shell hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
              <CardContent className="p-2 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                    <Target className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-accent-purple)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{formatPercentage(analyticsData.overallComplianceRate)}</p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Compliance</p>
                    <div className="flex items-center gap-1 mt-1">
                      {getTrendIcon(analyticsData.complianceTrend)}
                      <span className={`text-xs ${getTrendColor(analyticsData.complianceTrend)}`}>
                        {analyticsData.complianceTrend === 'up' ? '+' : analyticsData.complianceTrend === 'down' ? '-' : ''}2.3%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Workouts */}
            <Card className="fc-card-shell hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
              <CardContent className="p-2 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                    <Dumbbell className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{analyticsData.totalWorkouts}</p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Workouts</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-[color:var(--fc-text-subtle)]">
                        {analyticsData.avgSessionTime}min avg
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Meals */}
            <Card className="fc-card-shell hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
              <CardContent className="p-2 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                    <Apple className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-domain-meals)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{analyticsData.totalMeals}</p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Meals Logged</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-[color:var(--fc-text-subtle)]">
                        {analyticsData.sessionsPerWeek}/week
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Bests */}
            <Card className="fc-card-shell hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
              <CardContent className="p-2 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                    <Award className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-status-warning)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{analyticsData.personalBests}</p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Personal Bests</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-[color:var(--fc-text-subtle)]">
                        {formatPercentage(analyticsData.successRate)} success rate
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            {/* Client Growth Chart */}
            <Card className="fc-card-shell">
              <CardHeader className="p-3 sm:p-6 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg min-w-0">
                    <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                      <LineChart className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-accent-cyan)]" />
                    </div>
                    Client Growth Trend
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleChartExpansion('client-growth')}
                    className="fc-btn fc-btn-ghost"
                  >
                    {expandedCharts.has('client-growth') ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-2">
                <div className="space-y-3 sm:space-y-4">
                  {analyticsData.clientGrowthData.map((data, index) => (
                    <div key={index} className="fc-glass rounded-xl p-2 sm:p-4 border border-[color:var(--fc-glass-border)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-[color:var(--fc-text-primary)]">{data.period}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[color:var(--fc-text-dim)]">Net: </span>
                          <span className={`text-sm font-bold ${data.netGrowth >= 0 ? 'text-[color:var(--fc-status-success)]' : 'text-[color:var(--fc-status-error)]'}`}>
                            {data.netGrowth >= 0 ? '+' : ''}{data.netGrowth}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[color:var(--fc-status-success)] rounded-full"></div>
                          <span className="text-[color:var(--fc-text-subtle)]">New: {data.newClients}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[color:var(--fc-status-error)] rounded-full"></div>
                          <span className="text-[color:var(--fc-text-subtle)]">Churned: {data.churnedClients}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Compliance Breakdown */}
            <Card className="fc-card-shell">
              <CardHeader className="p-3 sm:p-6 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg min-w-0">
                    <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                      <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-accent-purple)]" />
                    </div>
                    Compliance Breakdown
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleChartExpansion('compliance')}
                    className="fc-btn fc-btn-ghost"
                  >
                    {expandedCharts.has('compliance') ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-2">
                <div className="space-y-3 sm:space-y-4">
                  {analyticsData.complianceBreakdown.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <div key={index} className="fc-glass rounded-xl p-2 sm:p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                              <Icon className={`w-4 h-4 ${item.color.replace('bg-', 'text-')}`} />
                            </div>
                            <span className="font-medium text-[color:var(--fc-text-primary)]">{item.category}</span>
                          </div>
                          <span className="text-lg font-bold text-[color:var(--fc-text-primary)]">{formatPercentage(item.percentage)}</span>
                        </div>
                        <div className="w-full bg-[color:var(--fc-glass-soft)] rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full ${item.color}`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Program Effectiveness */}
          <Card className="fc-card-shell">
            <CardHeader className="p-3 sm:p-6 pb-2">
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg">
                <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-status-warning)]" />
                </div>
                Program Effectiveness
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {analyticsData.programEffectiveness.map((program, index) => (
                  <div key={index} className="fc-glass rounded-xl p-2 sm:p-4 border border-[color:var(--fc-glass-border)] hover:shadow-md transition-all duration-300">
                    <div className="mb-3">
                      <h4 className="font-semibold text-[color:var(--fc-text-primary)] mb-1">{program.programName}</h4>
                      <p className="text-xs text-[color:var(--fc-text-dim)]">{program.clientCount} clients</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[color:var(--fc-text-dim)]">Success Rate</span>
                          <span className="text-sm font-bold text-[color:var(--fc-text-primary)]">{formatPercentage(program.successRate)}</span>
                        </div>
                        <div className="w-full bg-[color:var(--fc-glass-soft)] rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${program.color}`}
                            style={{ width: `${program.successRate}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[color:var(--fc-text-dim)]">Avg Progress</span>
                          <span className="text-sm font-bold text-[color:var(--fc-text-primary)]">{formatPercentage(program.avgProgress)}</span>
                        </div>
                        <div className="w-full bg-[color:var(--fc-glass-soft)] rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${program.color} opacity-70`}
                            style={{ width: `${program.avgProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Engagement Metrics */}
          <Card className="fc-card-shell">
            <CardHeader className="p-3 sm:p-6 pb-2">
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg">
                <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-domain-meals)]" />
                </div>
                Engagement Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <div className="fc-glass rounded-xl p-2 sm:p-4 border border-[color:var(--fc-glass-border)]">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <Clock className="w-4 h-4 text-[color:var(--fc-domain-workouts)] flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-[color:var(--fc-text-primary)]">Avg Session Time</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{analyticsData.avgSessionTime} min</p>
                </div>
                
                <div className="fc-glass rounded-xl p-2 sm:p-4 border border-[color:var(--fc-glass-border)]">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <Calendar className="w-4 h-4 text-[color:var(--fc-domain-meals)] flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-[color:var(--fc-text-primary)]">Sessions/Week</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{analyticsData.sessionsPerWeek}</p>
                </div>
                
                <div className="fc-glass rounded-xl p-2 sm:p-4 border border-[color:var(--fc-glass-border)]">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <Target className="w-4 h-4 text-[color:var(--fc-accent-purple)] flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-[color:var(--fc-text-primary)]">Goals Achieved</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{analyticsData.goalsAchieved}/{analyticsData.totalGoals}</p>
                </div>
                
                <div className="fc-glass rounded-xl p-2 sm:p-4 border border-[color:var(--fc-glass-border)]">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <TrendingUp className="w-4 h-4 text-[color:var(--fc-status-warning)] flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-[color:var(--fc-text-primary)]">Success Rate</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{formatPercentage(analyticsData.successRate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Compliance Rankings */}
          <Card className="fc-card-shell">
            <CardHeader className="p-3 sm:p-6 pb-2">
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg">
                <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-accent-purple)]" />
                </div>
                Client Compliance Rankings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Top Performers */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-[color:var(--fc-status-success)]" />
                    <h3 className="font-semibold text-[color:var(--fc-text-primary)]">Top Performers</h3>
                  </div>
                  <div className="space-y-3">
                    {topClients.length > 0 ? (
                      topClients.map((client, index) => (
                        <div key={client.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg fc-glass border border-[color:var(--fc-glass-border)]">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <Badge className="bg-[color:var(--fc-status-success)] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {index + 1}
                            </Badge>
                            {client.avatar_url ? (
                              <img
                                src={client.avatar_url}
                                alt={client.name}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[color:var(--fc-status-success)] text-white flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                                {client.name.split(' ').map(n => n[0]).join('')}
                              </div>
                            )}
                            <span className="font-medium text-sm sm:text-base text-[color:var(--fc-text-primary)] truncate min-w-0">{client.name}</span>
                          </div>
                          <Badge className="bg-[color:var(--fc-status-success)] text-white px-3 py-1">
                            {client.compliance}%
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <EmptyState variant="compact" title="No data yet" />
                    )}
                  </div>
                </div>

                {/* Needs Attention */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-[color:var(--fc-status-error)]" />
                    <h3 className="font-semibold text-[color:var(--fc-text-primary)]">Needs Attention</h3>
                  </div>
                  <div className="space-y-3">
                    {bottomClients.length > 0 ? (
                      bottomClients.map((client, index) => (
                        <div key={client.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg fc-glass border border-[color:var(--fc-glass-border)]">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <Badge className="bg-[color:var(--fc-status-error)] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {bottomClients.length - index}
                            </Badge>
                            {client.avatar_url ? (
                              <img
                                src={client.avatar_url}
                                alt={client.name}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[color:var(--fc-status-error)] text-white flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                                {client.name.split(' ').map(n => n[0]).join('')}
                              </div>
                            )}
                            <span className="font-medium text-sm sm:text-base text-[color:var(--fc-text-primary)] truncate min-w-0">{client.name}</span>
                          </div>
                          <Badge className="bg-[color:var(--fc-status-error)] text-white px-3 py-1">
                            {client.compliance}%
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <EmptyState variant="compact" title="No data yet" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
