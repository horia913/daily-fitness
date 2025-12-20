'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Activity
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
import { supabase } from '@/lib/supabase'

interface ClientComplianceDashboardProps {
  coachId: string
}

export default function ClientComplianceDashboardComponent({ coachId }: ClientComplianceDashboardProps) {
  const [clients, setClients] = useState<ComplianceDashboardData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week')
  const [sortBy, setSortBy] = useState<'compliance' | 'engagement' | 'name'>('compliance')
  const [filterLevel, setFilterLevel] = useState<string>('all')

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
            workout_compliance: 0,
            nutrition_compliance: 0,
            habit_compliance: 0,
            session_attendance: 0,
            overall_compliance: 0,
            engagement_score: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const engagement: ClientEngagement = engagementData || {
            id: '',
            client_id: clientId,
            coach_id: coachId,
            engagement_date: new Date().toISOString().split('T')[0],
            app_logins: 0,
            workout_sessions: 0,
            nutrition_logs: 0,
            habit_completions: 0,
            messages_sent: 0,
            progress_updates: 0,
            feature_usage: {},
            session_duration: 0,
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
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />
      default: return <Minus className="w-4 h-4 text-slate-400" />
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const stats = getOverallStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Client Compliance Dashboard</h2>
          <p className="text-slate-600">Monitor client progress and engagement across all areas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadClientData}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-800">{stats.totalClients}</div>
                <div className="text-sm text-blue-600">Active Clients</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-800">{stats.avgCompliance.toFixed(1)}%</div>
                <div className="text-sm text-green-600">Avg Compliance</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-800">{stats.avgEngagement.toFixed(1)}%</div>
                <div className="text-sm text-purple-600">Avg Engagement</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-800">{stats.criticalAlerts}</div>
                <div className="text-sm text-orange-600">Critical Alerts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-48">
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
              <Filter className="w-4 h-4 text-slate-400" />
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-40">
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
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
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

      {/* Client Cards */}
      <div className="space-y-4">
        {filteredAndSortedClients.map(client => {
          const complianceLevel = getComplianceLevel(client.compliance.overall_compliance)
          const engagementLevel = getEngagementLevel(client.compliance.engagement_score)
          
          return (
            <Card key={client.client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {client.client.first_name} {client.client.last_name}
                    </CardTitle>
                    <p className="text-sm text-slate-600">{client.client.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant="outline" 
                        style={{ backgroundColor: complianceLevel.color + '20', color: complianceLevel.color }}
                      >
                        {complianceLevel.level} compliance
                      </Badge>
                      <Badge 
                        variant="outline" 
                        style={{ backgroundColor: engagementLevel.color + '20', color: engagementLevel.color }}
                      >
                        {engagementLevel.level} engagement
                      </Badge>
                      {client.alerts.length > 0 && (
                        <Badge variant="destructive">
                          {client.alerts.length} alert{client.alerts.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Compliance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Workouts</span>
                      <span className="font-medium">{client.compliance.workout_compliance.toFixed(1)}%</span>
                    </div>
                    <Progress value={client.compliance.workout_compliance} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Nutrition</span>
                      <span className="font-medium">{client.compliance.nutrition_compliance.toFixed(1)}%</span>
                    </div>
                    <Progress value={client.compliance.nutrition_compliance} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Habits</span>
                      <span className="font-medium">{client.compliance.habit_compliance.toFixed(1)}%</span>
                    </div>
                    <Progress value={client.compliance.habit_compliance} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Sessions</span>
                      <span className="font-medium">{client.compliance.session_attendance.toFixed(1)}%</span>
                    </div>
                    <Progress value={client.compliance.session_attendance} className="h-2" />
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-blue-500" />
                    <span>{client.engagement.workout_sessions} workouts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Apple className="w-4 h-4 text-green-500" />
                    <span>{client.engagement.nutrition_logs} logs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-500" />
                    <span>{client.engagement.habit_completions} habits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                    <span>{client.engagement.messages_sent} messages</span>
                  </div>
                </div>

                {/* Trends */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    {getTrendIcon(client.trends.compliance_trend)}
                    <span>Compliance</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(client.trends.engagement_trend)}
                    <span>Engagement</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(client.trends.workout_trend)}
                    <span>Workouts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(client.trends.nutrition_trend)}
                    <span>Nutrition</span>
                  </div>
                </div>

                {/* Insights */}
                {client.insights.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="space-y-1">
                      {client.insights.slice(0, 2).map((insight, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-600">{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alerts */}
                {client.alerts.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="space-y-1">
                      {client.alerts.slice(0, 2).map((alert, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            alert.alert_level === 'critical' ? 'text-red-500' : 
                            alert.alert_level === 'warning' ? 'text-orange-500' : 'text-blue-500'
                          }`} />
                          <span className="text-slate-600">{alert.alert_message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredAndSortedClients.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No clients found</h3>
            <p className="text-slate-600 mb-4">
              {selectedClient !== 'all' || filterLevel !== 'all'
                ? 'Try adjusting your filters to see more clients'
                : 'No clients are currently assigned to you'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
