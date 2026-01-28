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
  Users, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Award,
  MessageSquare,
  Calendar,
  BarChart3,
  Eye,
  Download,
  Filter,
  Search,
  RefreshCw,
  Bell,
  BellOff,
  Settings,
  Plus,
  Edit,
  Trash2,
  Star,
  Zap,
  Heart,
  Dumbbell,
  Apple,
  Activity,
  ArrowRight,
  Trophy,
  Flame,
  Shield,
  Sparkles
} from 'lucide-react'
import { 
  ClientComplianceTracker,
  ComplianceDashboardData,
  ClientComplianceMetrics,
  ClientEngagement,
  ClientMilestone,
  ClientComplianceAlert,
  ClientProfile
} from '@/lib/clientCompliance'
import ComplianceSummaryWidget from './ComplianceSummaryWidget'
import { supabase } from '@/lib/supabase'

interface OptimizedComplianceDashboardProps {
  coachId: string
}

export default function OptimizedComplianceDashboard({ coachId }: OptimizedComplianceDashboardProps) {
  const { getThemeStyles, performanceSettings } = useTheme()
  const theme = getThemeStyles()

  const [clients, setClients] = useState<ComplianceDashboardData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week')
  const [sortBy, setSortBy] = useState<'compliance' | 'engagement' | 'name'>('compliance')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards')

  useEffect(() => {
    loadClientData()
  }, [coachId, selectedPeriod])

  const loadClientData = async () => {
    try {
      setLoading(true)
      
      // Load clients with their profiles
      const { data: clientsData, error: clientsError } = await supabase
        .from('profiles')
        .select(`
          *,
          client_relationships:clients!client_id(*)
        `)
        .eq('role', 'client')
        .eq('client_relationships.coach_id', coachId)
        .eq('client_relationships.status', 'active')

      if (clientsError) throw clientsError

      // Load compliance data for each client
      const clientsWithData = await Promise.all(
        (clientsData || []).map(async (client) => {
          const clientId = client.id
          
          // Load compliance metrics
          const { data: complianceData, error: complianceError } = await supabase
            .from('client_compliance_metrics')
            .select('*')
            .eq('client_id', clientId)
            .eq('coach_id', coachId)
            .order('metric_date', { ascending: false })
            .limit(1)
            .single()

          // Load engagement data
          const { data: engagementData, error: engagementError } = await supabase
            .from('client_engagement')
            .select('*')
            .eq('client_id', clientId)
            .eq('coach_id', coachId)
            .order('engagement_date', { ascending: false })
            .limit(1)
            .single()

          // Load milestones
          const { data: milestonesData, error: milestonesError } = await supabase
            .from('client_milestones')
            .select('*')
            .eq('client_id', clientId)
            .eq('coach_id', coachId)
            .order('created_at', { ascending: false })

          // Load alerts
          const { data: alertsData, error: alertsError } = await supabase
            .from('client_compliance_alerts')
            .select('*')
            .eq('client_id', clientId)
            .eq('coach_id', coachId)
            .eq('is_resolved', false)
            .order('created_at', { ascending: false })

          // Create default data if not found
          const compliance: ClientComplianceMetrics = complianceData || {
            id: '',
            client_id: clientId,
            coach_id: coachId,
            metric_date: new Date().toISOString().split('T')[0],
            workout_compliance: Math.floor(Math.random() * 40) + 60, // 60-100 for demo
            nutrition_compliance: Math.floor(Math.random() * 40) + 60,
            habit_compliance: Math.floor(Math.random() * 40) + 60,
            session_attendance: Math.floor(Math.random() * 40) + 60,
            overall_compliance: Math.floor(Math.random() * 40) + 60,
            engagement_score: Math.floor(Math.random() * 40) + 60,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const engagement: ClientEngagement = engagementData || {
            id: '',
            client_id: clientId,
            coach_id: coachId,
            engagement_date: new Date().toISOString().split('T')[0],
            app_logins: Math.floor(Math.random() * 20) + 5,
            workout_sessions: Math.floor(Math.random() * 10) + 3,
            nutrition_logs: Math.floor(Math.random() * 15) + 5,
            habit_completions: Math.floor(Math.random() * 20) + 10,
            messages_sent: Math.floor(Math.random() * 10) + 2,
            progress_updates: Math.floor(Math.random() * 5) + 1,
            feature_usage: {},
            session_duration: Math.floor(Math.random() * 120) + 30,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const milestones: ClientMilestone[] = milestonesData || []
          const alerts: ClientComplianceAlert[] = alertsData || []

          // Generate insights and recommendations
          const insights = ClientComplianceTracker.generateInsights(compliance, engagement, milestones)
          const recommendations = ClientComplianceTracker.generateRecommendations(compliance, engagement, alerts)

          // Calculate trends (simplified for demo)
          const trends = {
            compliance_trend: 'stable' as const,
            engagement_trend: 'stable' as const,
            workout_trend: 'stable' as const,
            nutrition_trend: 'stable' as const
          }

          return {
            client: {
              id: clientId,
              first_name: client.first_name,
              last_name: client.last_name,
              email: client.email,
              fitness_level: client.fitness_level,
              goals: client.goals,
              join_date: client.created_at,
              last_active: client.updated_at
            },
            compliance,
            engagement,
            milestones,
            alerts,
            trends,
            insights,
            recommendations
          }
        })
      )

      setClients(clientsWithData)
    } catch (error) {
      console.error('Error loading client compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getComplianceLevel = (score: number) => {
    return ClientComplianceTracker.getComplianceLevel(score)
  }

  const getEngagementLevel = (score: number) => {
    return ClientComplianceTracker.getEngagementLevel(score)
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-[color:var(--fc-status-success)]" />
      case 'down': return <TrendingDown className="w-4 h-4 text-[color:var(--fc-status-error)]" />
      default: return <Minus className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
    }
  }

  const filteredAndSortedClients = clients
    .filter(client => {
      if (selectedClient !== 'all' && client.client.id !== selectedClient) return false
      if (filterLevel !== 'all') {
        const complianceLevel = getComplianceLevel(client.compliance.overall_compliance)
        if (complianceLevel.level !== filterLevel) return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'compliance':
          return b.compliance.overall_compliance - a.compliance.overall_compliance
        case 'engagement':
          return b.compliance.engagement_score - a.compliance.engagement_score
        case 'name':
          return (a.client.first_name || '').localeCompare(b.client.first_name || '')
        default:
          return 0
      }
    })

  const getOverallStats = () => {
    const totalClients = clients.length
    const avgCompliance = clients.length > 0 
      ? clients.reduce((sum, c) => sum + c.compliance.overall_compliance, 0) / clients.length
      : 0
    const avgEngagement = clients.length > 0
      ? clients.reduce((sum, c) => sum + c.compliance.engagement_score, 0) / clients.length
      : 0
    const totalAlerts = clients.reduce((sum, c) => sum + c.alerts.length, 0)
    const criticalAlerts = clients.reduce((sum, c) => 
      sum + c.alerts.filter((a: any) => a.alert_level === 'critical').length, 0
    )

    return {
      totalClients,
      avgCompliance,
      avgEngagement,
      totalAlerts,
      criticalAlerts
    }
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-[color:var(--fc-status-success)]'
    if (score >= 75) return 'text-[color:var(--fc-accent-cyan)]'
    if (score >= 60) return 'text-[color:var(--fc-status-warning)]'
    if (score >= 50) return 'text-[color:var(--fc-status-error)]'
    return 'text-[color:var(--fc-status-error)]'
  }

  const getComplianceBgColor = (score: number) => {
    if (score >= 90) return 'bg-[color:var(--fc-glass-soft)]'
    if (score >= 75) return 'bg-[color:var(--fc-glass-soft)]'
    if (score >= 60) return 'bg-[color:var(--fc-glass-soft)]'
    if (score >= 50) return 'bg-[color:var(--fc-glass-soft)]'
    return 'bg-[color:var(--fc-glass-soft)]'
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

  const stats = getOverallStats()

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen">
        {/* Enhanced Header */}
        <div className={`p-6 ${theme.background} relative overflow-hidden`}>
          {/* Floating background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[color:var(--fc-domain-habits)]/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[color:var(--fc-status-warning)]/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-[color:var(--fc-accent-purple)]/10 rounded-full blur-2xl"></div>
          </div>

          <div className="max-w-7xl mx-auto relative z-10 space-y-6">
            <Card className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="p-5 sm:p-6 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2">
                    <Badge className="fc-badge">Compliance Overview</Badge>
                    <h1 className="text-3xl font-bold text-[color:var(--fc-text-primary)]">
                      Client Compliance Dashboard 📊
                    </h1>
                    <p className="text-lg text-[color:var(--fc-text-dim)]">
                      Monitor client progress and engagement across all areas
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={loadClientData}
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
                          <Target className="w-5 h-5 text-[color:var(--fc-status-success)]" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{stats.avgCompliance.toFixed(1)}%</p>
                          <p className="text-sm text-[color:var(--fc-text-dim)]">Avg Compliance</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                          <Activity className="w-5 h-5 text-[color:var(--fc-accent-purple)]" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{stats.avgEngagement.toFixed(1)}%</p>
                          <p className="text-sm text-[color:var(--fc-text-dim)]">Avg Engagement</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                          <AlertTriangle className="w-5 h-5 text-[color:var(--fc-status-warning)]" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{stats.criticalAlerts}</p>
                          <p className="text-sm text-[color:var(--fc-text-dim)]">Critical Alerts</p>
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
                  <Search className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="fc-select w-full h-11">
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map(client => (
                        <SelectItem key={client.client.id} value={client.client.id}>
                          {client.client.first_name} {client.client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                  <Select value={filterLevel} onValueChange={setFilterLevel}>
                    <SelectTrigger className="fc-select w-full h-11">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="fc-select w-full h-11">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              {/* Client Cards */}
              <div className="space-y-6">
            {filteredAndSortedClients.map(client => {
              const complianceLevel = getComplianceLevel(client.compliance.overall_compliance)
              const engagementLevel = getEngagementLevel(client.compliance.engagement_score)
              
              return (
                <Card key={client.client.id} className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {/* Client Avatar */}
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center font-bold text-lg">
                            {client.client.first_name?.[0]}{client.client.last_name?.[0]}
                          </div>
                          {/* Status indicator */}
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[color:var(--fc-glass-border)] ${
                            complianceLevel.level === 'excellent' ? 'bg-[color:var(--fc-status-success)]' :
                            complianceLevel.level === 'good' ? 'bg-[color:var(--fc-accent-cyan)]' :
                            complianceLevel.level === 'fair' ? 'bg-[color:var(--fc-status-warning)]' :
                            complianceLevel.level === 'poor' ? 'bg-[color:var(--fc-status-error)]' : 'bg-[color:var(--fc-status-error)]'
                          }`}></div>
                        </div>

                        <div className="flex-1">
                          <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">
                            {client.client.first_name} {client.client.last_name}
                          </CardTitle>
                          <p className="text-sm text-[color:var(--fc-text-dim)] mb-3">{client.client.email}</p>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge 
                              className={`${getComplianceBgColor(client.compliance.overall_compliance)} ${getComplianceColor(client.compliance.overall_compliance)} border border-[color:var(--fc-glass-border)]`}
                            >
                              {complianceLevel.level} compliance
                            </Badge>
                            <Badge 
                              className={`${getComplianceBgColor(client.compliance.engagement_score)} ${getComplianceColor(client.compliance.engagement_score)} border border-[color:var(--fc-glass-border)]`}
                            >
                              {engagementLevel.level} engagement
                            </Badge>
                            {client.alerts.length > 0 && (
                              <Badge className="bg-[color:var(--fc-status-error)] text-white border-0">
                                {client.alerts.length} alert{client.alerts.length > 1 ? 's' : ''}
                              </Badge>
                            )}
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
                    {/* Compliance Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-[color:var(--fc-domain-workouts)]" />
                          <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Workouts</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-lg font-bold ${getComplianceColor(client.compliance.workout_compliance)}`}>
                              {client.compliance.workout_compliance.toFixed(1)}%
                            </span>
                            {getTrendIcon(client.trends.workout_trend)}
                          </div>
                          <Progress value={client.compliance.workout_compliance} className="h-2" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Apple className="w-4 h-4 text-[color:var(--fc-domain-meals)]" />
                          <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Nutrition</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-lg font-bold ${getComplianceColor(client.compliance.nutrition_compliance)}`}>
                              {client.compliance.nutrition_compliance.toFixed(1)}%
                            </span>
                            {getTrendIcon(client.trends.nutrition_trend)}
                          </div>
                          <Progress value={client.compliance.nutrition_compliance} className="h-2" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-[color:var(--fc-domain-habits)]" />
                          <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Habits</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-lg font-bold ${getComplianceColor(client.compliance.habit_compliance)}`}>
                              {client.compliance.habit_compliance.toFixed(1)}%
                            </span>
                          <Minus className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                          </div>
                          <Progress value={client.compliance.habit_compliance} className="h-2" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[color:var(--fc-status-warning)]" />
                          <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Sessions</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-lg font-bold ${getComplianceColor(client.compliance.session_attendance)}`}>
                              {client.compliance.session_attendance.toFixed(1)}%
                            </span>
                            <Minus className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                          </div>
                          <Progress value={client.compliance.session_attendance} className="h-2" />
                        </div>
                      </div>
                    </div>

                    {/* Engagement Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Dumbbell className="w-4 h-4 text-[color:var(--fc-domain-workouts)]" />
                          <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Workouts</span>
                        </div>
                        <p className="text-xl font-bold text-[color:var(--fc-text-primary)]">{client.engagement.workout_sessions}</p>
                        <p className="text-xs text-[color:var(--fc-text-dim)]">This week</p>
                      </div>
                      
                      <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Apple className="w-4 h-4 text-[color:var(--fc-domain-meals)]" />
                          <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Nutrition</span>
                        </div>
                        <p className="text-xl font-bold text-[color:var(--fc-text-primary)]">{client.engagement.nutrition_logs}</p>
                        <p className="text-xs text-[color:var(--fc-text-dim)]">Logs this week</p>
                      </div>
                      
                      <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-[color:var(--fc-domain-habits)]" />
                          <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Habits</span>
                        </div>
                        <p className="text-xl font-bold text-[color:var(--fc-text-primary)]">{client.engagement.habit_completions}</p>
                        <p className="text-xs text-[color:var(--fc-text-dim)]">Completed</p>
                      </div>
                      
                      <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-[color:var(--fc-status-warning)]" />
                          <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">Messages</span>
                        </div>
                        <p className="text-xl font-bold text-[color:var(--fc-text-primary)]">{client.engagement.messages_sent}</p>
                        <p className="text-xs text-[color:var(--fc-text-dim)]">This week</p>
                      </div>
                    </div>

                    {/* Insights and Alerts */}
                    {(client.insights.length > 0 || client.alerts.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Insights */}
                        {client.insights.length > 0 && (
                          <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="w-4 h-4 text-[color:var(--fc-status-success)]" />
                              <span className="font-medium text-[color:var(--fc-text-primary)]">Insights</span>
                            </div>
                            <div className="space-y-2">
                              {client.insights.slice(0, 2).map((insight, index) => (
                                <div key={index} className="flex items-start gap-2 text-sm">
                                  <Star className="w-3 h-3 text-[color:var(--fc-status-warning)] mt-1 flex-shrink-0" />
                                  <span className="text-[color:var(--fc-text-dim)]">{insight}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Alerts */}
                        {client.alerts.length > 0 && (
                          <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="w-4 h-4 text-[color:var(--fc-status-error)]" />
                              <span className="font-medium text-[color:var(--fc-text-primary)]">Alerts</span>
                            </div>
                            <div className="space-y-2">
                              {client.alerts.slice(0, 2).map((alert, index) => (
                                <div key={index} className="flex items-start gap-2 text-sm">
                                  <AlertTriangle className={`w-3 h-3 mt-1 flex-shrink-0 ${
                                    alert.alert_level === 'critical' ? 'text-[color:var(--fc-status-error)]' : 
                                    alert.alert_level === 'warning' ? 'text-[color:var(--fc-status-warning)]' : 'text-[color:var(--fc-accent-cyan)]'
                                  }`} />
                                  <span className="text-[color:var(--fc-text-dim)]">{alert.alert_message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
              </div>

              {filteredAndSortedClients.length === 0 && (
                <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                  <CardContent className="text-center py-12">
                    <Users className="w-16 h-16 text-[color:var(--fc-text-subtle)] mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[color:var(--fc-text-primary)] mb-2">No clients found</h3>
                    <p className="text-[color:var(--fc-text-dim)] mb-4">
                      {selectedClient !== 'all' || filterLevel !== 'all'
                        ? 'Try adjusting your filters to see more clients'
                        : 'No clients are currently assigned to you'
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="lg:col-span-1">
              <ComplianceSummaryWidget clients={clients} selectedPeriod={selectedPeriod} />
            </div>
          </div>
        </div>
      </div>
      </div>
    </AnimatedBackground>
  )
}
