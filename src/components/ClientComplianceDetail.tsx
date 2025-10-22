'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  MessageSquare,
  Calendar,
  BarChart3,
  Download,
  Settings,
  Plus,
  Edit,
  Star,
  Zap,
  Dumbbell,
  Apple,
  Activity,
  Users,
  Trophy,
  Eye,
  EyeOff,
  CalendarDays,
  UserCheck
} from 'lucide-react'
import { 
  ClientComplianceTracker,
  ComplianceDashboardData,
  ClientMilestone,
  ClientComplianceAlert
} from '@/lib/clientCompliance'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'

interface ClientComplianceDetailProps {
  clientId: string
  coachId: string
  onBack: () => void
}

export default function ClientComplianceDetailComponent({ 
  clientId, 
  coachId, 
  onBack 
}: ClientComplianceDetailProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  
  const [clientData, setClientData] = useState<ComplianceDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'metrics' | 'milestones' | 'alerts' | 'reports'>('overview')
  // const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [showDetailedView, setShowDetailedView] = useState(false)

  const loadClientDetailData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load client profile
      const { data: clientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single()

      if (profileError) throw profileError

      // Load comprehensive compliance data
      const { data: complianceData } = await supabase
        .from('client_compliance_metrics')
        .select('*')
        .eq('client_id', clientId)
        .eq('coach_id', coachId)
        .order('metric_date', { ascending: false })
        .limit(30) // Last 30 days

      // Load engagement data
      const { data: engagementData } = await supabase
        .from('client_engagement')
        .select('*')
        .eq('client_id', clientId)
        .eq('coach_id', coachId)
        .order('engagement_date', { ascending: false })
        .limit(30)

      // Load milestones
      const { data: milestonesData } = await supabase
        .from('client_milestones')
        .select('*')
        .eq('client_id', clientId)
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })

      // Load alerts
      const { data: alertsData } = await supabase
        .from('client_compliance_alerts')
        .select('*')
        .eq('client_id', clientId)
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })

      // Get latest compliance and engagement
      const latestCompliance = complianceData?.[0] || {
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

      const latestEngagement = engagementData?.[0] || {
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
      const insights = ClientComplianceTracker.generateInsights(latestCompliance, latestEngagement, milestones)
      const recommendations = ClientComplianceTracker.generateRecommendations(latestCompliance, latestEngagement, alerts)

      // Calculate trends
      const trends = {
        compliance_trend: 'stable' as const,
        engagement_trend: 'stable' as const,
        workout_trend: 'stable' as const,
        nutrition_trend: 'stable' as const
      }

      setClientData({
        client: {
          id: clientId,
          first_name: clientProfile.first_name,
          last_name: clientProfile.last_name,
          email: clientProfile.email,
          fitness_level: clientProfile.fitness_level,
          goals: clientProfile.goals,
          join_date: clientProfile.created_at,
          last_active: clientProfile.updated_at
        },
        compliance: latestCompliance,
        engagement: latestEngagement,
        milestones,
        alerts,
        trends,
        insights,
        recommendations
      })
    } catch (error) {
      console.error('Error loading client detail data:', error)
    } finally {
      setLoading(false)
    }
  }, [clientId, coachId])

  useEffect(() => {
    loadClientDetailData()
  }, [clientId, coachId, loadClientDetailData])

  const getComplianceLevel = (score: number) => {
    return ClientComplianceTracker.getComplianceLevel(score)
  }

  const getEngagementLevel = (score: number) => {
    return ClientComplianceTracker.getEngagementLevel(score)
  }

  // const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  //   switch (trend) {
  //     case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />
  //     case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />
  //     default: return <Minus className="w-4 h-4 text-slate-400" />
  //   }
  // }

  const getMilestoneTypeInfo = (type: string) => {
    return ClientComplianceTracker.getMilestoneTypeInfo(type)
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

  if (!clientData) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">Client not found</h3>
        <p className="text-slate-600 mb-4">The requested client data could not be loaded.</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  const complianceLevel = getComplianceLevel(clientData.compliance.overall_compliance)
  const engagementLevel = getEngagementLevel(clientData.compliance.engagement_score)

  // const getTabIcon = (tab: string) => {
  //   switch (tab) {
  //     case 'overview': return <BarChart3 className="w-4 h-4" />
  //     case 'metrics': return <Target className="w-4 h-4" />
  //     case 'milestones': return <Trophy className="w-4 h-4" />
  //     case 'alerts': return <AlertTriangle className="w-4 h-4" />
  //     case 'reports': return <Download className="w-4 h-4" />
  //     default: return null
  //   }
  // }

  const getComplianceColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getComplianceBgColor = (score: number) => {
    if (score >= 80) return isDark ? 'bg-green-900/20' : 'bg-green-50'
    if (score >= 60) return isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'
    return isDark ? 'bg-red-900/20' : 'bg-red-50'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className={`${theme.card} ${theme.shadow} rounded-3xl border ${theme.border} p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={onBack}
              className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gradient-to-br from-blue-100 to-purple-100'}`}>
                <UserCheck className={`w-6 h-6 ${theme.text}`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${theme.text}`}>
                  {clientData.client.first_name} {clientData.client.last_name}
                </h2>
                <p className={`${theme.textSecondary}`}>{clientData.client.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="rounded-xl text-xs">
                    {clientData.client.fitness_level}
                  </Badge>
                  <span className={`text-xs ${theme.textSecondary}`}>
                    Joined {new Date(clientData.client.join_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowDetailedView(!showDetailedView)}
              className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}
            >
              {showDetailedView ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showDetailedView ? 'Hide' : 'Show'} Details
            </Button>
            <Button 
              variant="outline"
              className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button 
              variant="outline"
              className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              variant="outline"
              className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={`${theme.card} border ${theme.border} rounded-2xl ${getComplianceBgColor(clientData.compliance.overall_compliance)}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                <Target className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <div className={`text-3xl font-bold ${getComplianceColor(clientData.compliance.overall_compliance)}`}>
                  {clientData.compliance.overall_compliance.toFixed(1)}%
                </div>
                <div className={`text-sm font-medium ${theme.textSecondary}`}>Overall Compliance</div>
                <Badge 
                  variant="outline" 
                  className="text-xs mt-2 rounded-xl"
                  style={{ backgroundColor: complianceLevel.color + '20', color: complianceLevel.color }}
                >
                  {complianceLevel.level}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${theme.card} border ${theme.border} rounded-2xl ${getComplianceBgColor(clientData.compliance.engagement_score)}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                <Activity className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <div>
                <div className={`text-3xl font-bold ${getComplianceColor(clientData.compliance.engagement_score)}`}>
                  {clientData.compliance.engagement_score.toFixed(1)}%
                </div>
                <div className={`text-sm font-medium ${theme.textSecondary}`}>Engagement Score</div>
                <Badge 
                  variant="outline" 
                  className="text-xs mt-2 rounded-xl"
                  style={{ backgroundColor: engagementLevel.color + '20', color: engagementLevel.color }}
                >
                  {engagementLevel.level}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${theme.card} border ${theme.border} rounded-2xl ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                <Trophy className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <div>
                <div className={`text-3xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                  {clientData.milestones.filter(m => m.is_achieved).length}
                </div>
                <div className={`text-sm font-medium ${theme.textSecondary}`}>Milestones Achieved</div>
                <div className={`text-xs ${theme.textSecondary} mt-1`}>
                  {clientData.milestones.length} total milestones
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${theme.card} border ${theme.border} rounded-2xl ${isDark ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-orange-100'}`}>
                <AlertTriangle className={`w-6 h-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
              <div>
                <div className={`text-3xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                  {clientData.alerts.filter(a => !a.is_resolved).length}
                </div>
                <div className={`text-sm font-medium ${theme.textSecondary}`}>Active Alerts</div>
                <div className={`text-xs ${theme.textSecondary} mt-1`}>
                  {clientData.alerts.length} total alerts
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={selectedTab} onValueChange={(value: string) => setSelectedTab(value as 'overview' | 'metrics' | 'milestones' | 'alerts' | 'reports')}>
        <TabsList className={`grid w-full grid-cols-5 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          {[
            { value: 'overview', label: 'Overview', icon: BarChart3 },
            { value: 'metrics', label: 'Metrics', icon: Target },
            { value: 'milestones', label: 'Milestones', icon: Trophy },
            { value: 'alerts', label: 'Alerts', icon: AlertTriangle },
            { value: 'reports', label: 'Reports', icon: Download }
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger 
              key={value} 
              value={value} 
              className="rounded-xl flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Compliance Breakdown */}
          <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
            <CardHeader className="p-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                  <BarChart3 className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <CardTitle className={`text-xl font-bold ${theme.text}`}>Compliance Breakdown</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className={`text-lg font-semibold ${theme.text}`}>Compliance Metrics</h4>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Dumbbell className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                          <span className={`text-sm font-medium ${theme.text}`}>Workout Compliance</span>
                        </div>
                        <span className={`font-bold ${getComplianceColor(clientData.compliance.workout_compliance)}`}>
                          {clientData.compliance.workout_compliance.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={clientData.compliance.workout_compliance} 
                        className="h-3 rounded-xl"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Apple className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                          <span className={`text-sm font-medium ${theme.text}`}>Nutrition Compliance</span>
                        </div>
                        <span className={`font-bold ${getComplianceColor(clientData.compliance.nutrition_compliance)}`}>
                          {clientData.compliance.nutrition_compliance.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={clientData.compliance.nutrition_compliance} 
                        className="h-3 rounded-xl"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Zap className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                          <span className={`text-sm font-medium ${theme.text}`}>Habit Compliance</span>
                        </div>
                        <span className={`font-bold ${getComplianceColor(clientData.compliance.habit_compliance)}`}>
                          {clientData.compliance.habit_compliance.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={clientData.compliance.habit_compliance} 
                        className="h-3 rounded-xl"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                          <span className={`text-sm font-medium ${theme.text}`}>Session Attendance</span>
                        </div>
                        <span className={`font-bold ${getComplianceColor(clientData.compliance.session_attendance)}`}>
                          {clientData.compliance.session_attendance.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={clientData.compliance.session_attendance} 
                        className="h-3 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className={`text-lg font-semibold ${theme.text}`}>Engagement Metrics</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className={`flex items-center gap-4 p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                        <Dumbbell className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <div className={`font-semibold ${theme.text}`}>{clientData.engagement.workout_sessions}</div>
                        <div className={`text-sm ${theme.textSecondary}`}>Workout Sessions</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-4 p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                        <Apple className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <div className={`font-semibold ${theme.text}`}>{clientData.engagement.nutrition_logs}</div>
                        <div className={`text-sm ${theme.textSecondary}`}>Nutrition Logs</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-4 p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                        <Zap className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                      </div>
                      <div>
                        <div className={`font-semibold ${theme.text}`}>{clientData.engagement.habit_completions}</div>
                        <div className={`text-sm ${theme.textSecondary}`}>Habit Completions</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-4 p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-orange-100'}`}>
                        <MessageSquare className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                      </div>
                      <div>
                        <div className={`font-semibold ${theme.text}`}>{clientData.engagement.messages_sent}</div>
                        <div className={`text-sm ${theme.textSecondary}`}>Messages Sent</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-4 p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <Clock className={`w-5 h-5 ${theme.textSecondary}`} />
                      </div>
                      <div>
                        <div className={`font-semibold ${theme.text}`}>{clientData.engagement.session_duration} min</div>
                        <div className={`text-sm ${theme.textSecondary}`}>Session Duration</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-4 p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-indigo-100'}`}>
                        <Activity className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      </div>
                      <div>
                        <div className={`font-semibold ${theme.text}`}>{clientData.engagement.app_logins}</div>
                        <div className={`text-sm ${theme.textSecondary}`}>App Logins</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insights and Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-yellow-100'}`}>
                    <Star className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-4">
                  {clientData.insights.map((insight, index) => (
                    <div key={index} className={`flex items-start gap-3 p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                      <Star className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'} mt-0.5 flex-shrink-0`} />
                      <span className={`text-sm ${theme.text}`}>{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                    <Target className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>Recommendations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-4">
                  {clientData.recommendations.map((recommendation, index) => (
                    <div key={index} className={`flex items-start gap-3 p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
                      <CheckCircle className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'} mt-0.5 flex-shrink-0`} />
                      <span className={`text-sm ${theme.text}`}>{recommendation}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
            <CardHeader className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                    <Trophy className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>Milestones</CardTitle>
                </div>
                <Button 
                  size="sm"
                  className={`rounded-xl ${theme.primary} hover:opacity-90 transition-all duration-200`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-6">
                {clientData.milestones.map((milestone) => {
                  const typeInfo = getMilestoneTypeInfo(milestone.milestone_type)
                  const progress = milestone.target_value > 0 ? (milestone.current_value / milestone.target_value) * 100 : 0
                  
                  return (
                    <div key={milestone.id} className={`p-6 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
                            <span className="text-2xl">{typeInfo.icon}</span>
                          </div>
                          <div>
                            <h4 className={`font-semibold ${theme.text}`}>{milestone.milestone_name}</h4>
                            <p className={`text-sm ${theme.textSecondary} mt-1`}>{milestone.milestone_description}</p>
                            {milestone.target_date && (
                              <div className={`text-xs ${theme.textSecondary} mt-2 flex items-center gap-2`}>
                                <CalendarDays className="w-3 h-3" />
                                Target: {new Date(milestone.target_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={milestone.is_achieved ? 'default' : 'outline'}
                            className="rounded-xl"
                            style={{ backgroundColor: milestone.is_achieved ? typeInfo.color : undefined }}
                          >
                            {milestone.is_achieved ? 'Achieved' : milestone.priority}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="rounded-xl"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${theme.text}`}>Progress</span>
                          <span className={`text-sm font-bold ${theme.text}`}>
                            {milestone.current_value} / {milestone.target_value} {milestone.unit}
                          </span>
                        </div>
                        <Progress value={progress} className="h-3 rounded-xl" />
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${theme.textSecondary}`}>
                            {progress.toFixed(1)}% complete
                          </span>
                          {milestone.is_achieved && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs font-medium">Achieved!</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
            <CardHeader className="p-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-orange-100'}`}>
                  <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                </div>
                <CardTitle className={`text-xl font-bold ${theme.text}`}>Active Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                {clientData.alerts.map((alert) => (
                  <div key={alert.id} className={`p-6 border ${theme.border} rounded-2xl ${
                    alert.alert_level === 'critical' ? (isDark ? 'bg-red-900/20' : 'bg-red-50') :
                    alert.alert_level === 'warning' ? (isDark ? 'bg-orange-900/20' : 'bg-orange-50') :
                    (isDark ? 'bg-blue-900/20' : 'bg-blue-50')
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-xl ${
                          alert.alert_level === 'critical' ? (isDark ? 'bg-red-700' : 'bg-red-100') :
                          alert.alert_level === 'warning' ? (isDark ? 'bg-orange-700' : 'bg-orange-100') :
                          (isDark ? 'bg-blue-700' : 'bg-blue-100')
                        }`}>
                          <AlertTriangle className={`w-5 h-5 ${
                            alert.alert_level === 'critical' ? (isDark ? 'text-red-400' : 'text-red-600') :
                            alert.alert_level === 'warning' ? (isDark ? 'text-orange-400' : 'text-orange-600') :
                            (isDark ? 'text-blue-400' : 'text-blue-600')
                          }`} />
                        </div>
                        <div>
                          <h4 className={`font-semibold ${theme.text}`}>{alert.alert_message}</h4>
                          <p className={`text-sm ${theme.textSecondary} mt-1`}>
                            {alert.alert_type.replace('_', ' ')} • {new Date(alert.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline"
                          className="rounded-xl"
                        >
                          {alert.alert_level}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="rounded-xl"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
            <CardHeader className="p-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                  <Download className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <CardTitle className={`text-xl font-bold ${theme.text}`}>Compliance Reports</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-center py-12">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <BarChart3 className={`w-10 h-10 ${theme.textSecondary}`} />
                </div>
                <h3 className={`text-xl font-semibold ${theme.text} mb-3`}>Reports Coming Soon</h3>
                <p className={`${theme.textSecondary} mb-6 max-w-md mx-auto`}>
                  Detailed compliance reports with charts, trends, and actionable insights will be available here
                </p>
                <Button 
                  className={`rounded-xl ${theme.primary} hover:opacity-90 transition-all duration-200`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
