'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  ArrowRight,
  Filter,
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
  Printer,
  Maximize2,
  Minimize2
} from 'lucide-react'

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
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [selectedClientGroup, setSelectedClientGroup] = useState<'all' | 'active' | 'new' | 'struggling'>('all')
  const [selectedMetric, setSelectedMetric] = useState<'overall' | 'workouts' | 'nutrition' | 'progress'>('overall')
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set())

  // Data is loaded by OptimizedAnalyticsOverview via API; no local fetch to avoid duplicate/timeout
  const [analyticsData] = useState<AnalyticsData>({
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
  }

  return (
      <div className="min-h-screen pb-24 flex flex-col gap-0 sm:gap-6">
        {/* Header - hidden on mobile; page-level header is sufficient */}
        <div className="hidden sm:block shrink-0">
        <div className="p-3 sm:p-6 relative overflow-hidden w-full">
          <div className="w-full relative z-10">
            <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                        Analytics
                      </h1>
                      <p className="text-sm sm:text-base text-[color:var(--fc-text-dim)]">
                        Comprehensive insights into client progress and performance
                      </p>
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
                  </div>
                </div>
            </div>
          </div>
        </div>
        </div>

        {/* Main Content - no top spacing on mobile when header is hidden */}
        <div className="p-2 sm:p-6 w-full max-w-full overflow-x-hidden pt-0 sm:pt-6 min-w-0">
          <div className="w-full space-y-3 sm:space-y-6">
            <div className="space-y-4 sm:space-y-6 mt-0">
              <OptimizedAnalyticsOverview coachId={coachId} />
            </div>
            {/* Legacy detailed tab content removed from this component; use /coach/reports for report generation. Client Progress: /coach/progress. Compliance: dedicated flow if needed. */}
            {false && (
            <div className="space-y-3 sm:space-y-6 mt-3 sm:mt-6">
              {/* Global Filters */}
              <div className="p-2 sm:p-4 mb-2 sm:mb-6">
                  <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Calendar className="w-4 h-4 text-[color:var(--fc-text-subtle)] flex-shrink-0" />
                      <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                        <SelectTrigger className="fc-select w-full md:w-48 h-11 sm:h-12 min-h-[44px]">
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
                    
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="w-4 h-4 text-[color:var(--fc-text-subtle)] flex-shrink-0" />
                      <Select value={selectedClientGroup} onValueChange={(value: any) => setSelectedClientGroup(value)}>
                        <SelectTrigger className="fc-select w-full md:w-48 h-11 sm:h-12 min-h-[44px]">
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

                    <div className="flex items-center gap-2 min-w-0">
                      <BarChart3 className="w-4 h-4 text-[color:var(--fc-text-subtle)] flex-shrink-0" />
                      <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                        <SelectTrigger className="fc-select w-full md:w-48 h-11 sm:h-12 min-h-[44px]">
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
              <div className="space-y-4 sm:space-y-6">
                {/* Client Progress Overview */}
                <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg min-w-0">
                        <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-domain-workouts)]" />
                        </div>
                        <span className="truncate">Client Progress Overview</span>
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
                  <CardContent className="p-3 sm:p-6 pt-2">
                    <div className="space-y-3 sm:space-y-4">
                      {analyticsData.clientProgress.map(client => (
                        <div key={client.clientId} className="fc-glass rounded-xl p-3 sm:p-4 border border-[color:var(--fc-glass-border)] hover:shadow-md transition-all duration-300">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center font-bold flex-shrink-0 text-sm">
                                {client.avatar}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-[color:var(--fc-text-primary)] truncate">{client.clientName}</p>
                                <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">{client.program}</p>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Workout Types Distribution */}
                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardHeader className="p-3 sm:p-6 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg min-w-0">
                          <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                            <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-domain-meals)]" />
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
                    <CardContent className="p-3 sm:p-6 pt-2">
                      <div className="space-y-3 sm:space-y-4">
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
                    <CardHeader className="p-3 sm:p-6 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg min-w-0">
                          <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-status-warning)]" />
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
                    <CardContent className="p-3 sm:p-6 pt-2">
                      <div className="space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                          <div className="fc-glass rounded-xl p-3 sm:p-4 border border-[color:var(--fc-glass-border)]">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                              <Clock className="w-4 h-4 text-[color:var(--fc-domain-workouts)] flex-shrink-0" />
                              <span className="text-xs sm:text-sm font-medium text-[color:var(--fc-text-primary)]">Avg Session Time</span>
                            </div>
                            <p className="text-xl sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{analyticsData.engagementMetrics.avgSessionTime} min</p>
                          </div>
                          
                          <div className="fc-glass rounded-xl p-3 sm:p-4 border border-[color:var(--fc-glass-border)]">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                              <Calendar className="w-4 h-4 text-[color:var(--fc-domain-meals)] flex-shrink-0" />
                              <span className="text-xs sm:text-sm font-medium text-[color:var(--fc-text-primary)]">Sessions/Week</span>
                            </div>
                            <p className="text-xl sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{analyticsData.engagementMetrics.sessionsPerWeek}</p>
                          </div>
                        </div>
                        
                        <div className="fc-glass rounded-xl p-3 sm:p-4 border border-[color:var(--fc-glass-border)]">
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
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg">
                      <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                        <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-status-warning)]" />
                      </div>
                      Recent Client Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-2">
                    <div className="space-y-3 sm:space-y-4">
                      {analyticsData.achievements.map(achievement => (
                        <div key={achievement.id} className="fc-glass rounded-xl p-3 sm:p-4 border border-[color:var(--fc-glass-border)] hover:shadow-md transition-all duration-300">
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <div className={`p-2 ${getAchievementColor(achievement.type)} rounded-lg flex-shrink-0`}>
                              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm sm:text-base text-[color:var(--fc-text-primary)] truncate">{achievement.achievement}</p>
                              <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">
                                <strong>{achievement.clientName}:</strong> {achievement.description}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
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
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg">
                      <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-accent-purple)]" />
                      </div>
                      Report Generation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                      <div className="fc-glass rounded-xl p-3 sm:p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4 text-[color:var(--fc-domain-workouts)]" />
                          <span className="font-medium text-[color:var(--fc-text-primary)]">Summary Report</span>
                        </div>
                        <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mb-3 sm:mb-4">
                          Generate a comprehensive overview of all client metrics and achievements
                        </p>
                        <Button className="fc-btn fc-btn-primary w-full min-h-[44px]">
                          <FileText className="w-4 h-4 mr-2" />
                          Generate Summary
                        </Button>
                      </div>
                      
                      <div className="fc-glass rounded-xl p-3 sm:p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-[color:var(--fc-domain-meals)]" />
                          <span className="font-medium text-[color:var(--fc-text-primary)]">Client Report</span>
                        </div>
                        <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mb-3 sm:mb-4">
                          Create detailed individual client progress reports
                        </p>
                        <Button variant="outline" className="fc-btn fc-btn-ghost w-full min-h-[44px]">
                          <Users className="w-4 h-4 mr-2" />
                          Generate Client Report
                        </Button>
                      </div>
                      
                      <div className="fc-glass rounded-xl p-3 sm:p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 className="w-4 h-4 text-[color:var(--fc-accent-purple)]" />
                          <span className="font-medium text-[color:var(--fc-text-primary)]">Analytics Report</span>
                        </div>
                        <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mb-3 sm:mb-4">
                          Export detailed analytics and performance metrics
                        </p>
                        <Button variant="outline" className="fc-btn fc-btn-ghost w-full min-h-[44px]">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Generate Analytics
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
  )
}
