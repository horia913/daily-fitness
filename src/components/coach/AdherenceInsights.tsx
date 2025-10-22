'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Calendar,
  Settings,
  Target,
  Users,
  Award,
  Flame,
  Shield,
  Star,
  Zap,
  Heart,
  Dumbbell,
  Apple
} from 'lucide-react'

interface Insight {
  id: string
  type: 'positive' | 'warning' | 'critical'
  title: string
  description: string
  action: string
  priority: 'low' | 'medium' | 'high'
  clientId: string
  clientName: string
  metric: 'workout' | 'nutrition' | 'habit' | 'overall'
}

interface AdherenceInsightsProps {
  insights: Insight[]
}

export default function AdherenceInsights({ insights }: AdherenceInsightsProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  // Mock insights data - replace with actual data
  const mockInsights: Insight[] = [
    {
      id: '1',
      type: 'positive',
      title: 'Excellent Progress',
      description: 'John Smith has maintained 95%+ adherence for 2 weeks straight. Consider celebrating this achievement.',
      action: 'Send congratulatory message',
      priority: 'low',
      clientId: '1',
      clientName: 'John Smith',
      metric: 'overall'
    },
    {
      id: '2',
      type: 'warning',
      title: 'Nutrition Tracking Decline',
      description: 'Sarah Johnson has missed 3 nutrition logs this week. Her meal planning adherence dropped to 70%.',
      action: 'Schedule nutrition check-in',
      priority: 'medium',
      clientId: '2',
      clientName: 'Sarah Johnson',
      metric: 'nutrition'
    },
    {
      id: '3',
      type: 'critical',
      title: 'Workout Adherence Crisis',
      description: 'Mike Wilson has missed 4 consecutive workouts. His adherence dropped to 45% this week.',
      action: 'Immediate intervention needed',
      priority: 'high',
      clientId: '3',
      clientName: 'Mike Wilson',
      metric: 'workout'
    },
    {
      id: '4',
      type: 'positive',
      title: 'Habit Streak Achievement',
      description: 'Emily Davis completed all daily habits for 15 days straight. This is her longest streak yet.',
      action: 'Acknowledge milestone',
      priority: 'low',
      clientId: '4',
      clientName: 'Emily Davis',
      metric: 'habit'
    },
    {
      id: '5',
      type: 'warning',
      title: 'Session Attendance Drop',
      description: 'Sarah Johnson missed 2 scheduled sessions this week. Her session attendance is at 60%.',
      action: 'Reschedule missed sessions',
      priority: 'medium',
      clientId: '2',
      clientName: 'Sarah Johnson',
      metric: 'overall'
    }
  ]

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive': return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
      default: return <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'text-green-600 dark:text-green-400'
      case 'warning': return 'text-orange-600 dark:text-orange-400'
      case 'critical': return 'text-red-600 dark:text-red-400'
      default: return 'text-blue-600 dark:text-blue-400'
    }
  }

  const getInsightBgColor = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-green-100 dark:bg-green-900/30'
      case 'warning': return 'bg-orange-100 dark:bg-orange-900/30'
      case 'critical': return 'bg-red-100 dark:bg-red-900/30'
      default: return 'bg-blue-100 dark:bg-blue-900/30'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500 text-white'
      case 'medium': return 'bg-orange-500 text-white'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-slate-500 text-white'
    }
  }

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'workout': return Dumbbell
      case 'nutrition': return Apple
      case 'habit': return Zap
      default: return Target
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('message')) return MessageSquare
    if (action.includes('schedule') || action.includes('check-in')) return Calendar
    if (action.includes('intervention')) return Shield
    if (action.includes('acknowledge') || action.includes('celebrate')) return Award
    return Settings
  }

  const groupedInsights = mockInsights.reduce((acc, insight) => {
    if (!acc[insight.type]) acc[insight.type] = []
    acc[insight.type].push(insight)
    return acc
  }, {} as Record<string, Insight[]>)

  return (
    <div className="space-y-6">
      {/* Insights Header */}
      <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            Actionable Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${theme.card} rounded-xl p-4 border-2 border-green-200 dark:border-green-800`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className={`text-sm font-medium ${theme.text}`}>Positive</span>
              </div>
              <p className={`text-2xl font-bold ${theme.text}`}>
                {groupedInsights.positive?.length || 0}
              </p>
              <p className={`text-xs ${theme.textSecondary}`}>Celebrations</p>
            </div>
            
            <div className={`${theme.card} rounded-xl p-4 border-2 border-orange-200 dark:border-orange-800`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className={`text-sm font-medium ${theme.text}`}>Warnings</span>
              </div>
              <p className={`text-2xl font-bold ${theme.text}`}>
                {groupedInsights.warning?.length || 0}
              </p>
              <p className={`text-xs ${theme.textSecondary}`}>Attention Needed</p>
            </div>
            
            <div className={`${theme.card} rounded-xl p-4 border-2 border-red-200 dark:border-red-800`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className={`text-sm font-medium ${theme.text}`}>Critical</span>
              </div>
              <p className={`text-2xl font-bold ${theme.text}`}>
                {groupedInsights.critical?.length || 0}
              </p>
              <p className={`text-xs ${theme.textSecondary}`}>Urgent Action</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Insights */}
      {groupedInsights.critical && groupedInsights.critical.length > 0 && (
        <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 border-red-200 dark:border-red-800`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              Critical Issues - Immediate Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupedInsights.critical.map(insight => {
                const MetricIcon = getMetricIcon(insight.metric)
                const ActionIcon = getActionIcon(insight.action)
                
                return (
                  <div key={insight.id} className={`${theme.card} rounded-xl p-4 border-2 border-red-200 dark:border-red-800`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MetricIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className={`font-semibold ${theme.text}`}>{insight.title}</span>
                          <Badge className={`${getPriorityColor(insight.priority)} border-0`}>
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className={`text-sm ${theme.textSecondary} mb-3`}>
                          <strong>{insight.clientName}:</strong> {insight.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <ActionIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className={`text-sm font-medium ${theme.text}`}>{insight.action}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Message
                        </Button>
                        <Button size="sm" variant="outline">
                          <Calendar className="w-3 h-3 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning Insights */}
      {groupedInsights.warning && groupedInsights.warning.length > 0 && (
        <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 border-orange-200 dark:border-orange-800`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              Warnings - Attention Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupedInsights.warning.map(insight => {
                const MetricIcon = getMetricIcon(insight.metric)
                const ActionIcon = getActionIcon(insight.action)
                
                return (
                  <div key={insight.id} className={`${theme.card} rounded-xl p-4 border-2 border-orange-200 dark:border-orange-800`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MetricIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          <span className={`font-semibold ${theme.text}`}>{insight.title}</span>
                          <Badge className={`${getPriorityColor(insight.priority)} border-0`}>
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className={`text-sm ${theme.textSecondary} mb-3`}>
                          <strong>{insight.clientName}:</strong> {insight.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <ActionIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          <span className={`text-sm font-medium ${theme.text}`}>{insight.action}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" variant="outline">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Message
                        </Button>
                        <Button size="sm" variant="outline">
                          <Calendar className="w-3 h-3 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Positive Insights */}
      {groupedInsights.positive && groupedInsights.positive.length > 0 && (
        <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 border-green-200 dark:border-green-800`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              Positive Achievements - Celebrate Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupedInsights.positive.map(insight => {
                const MetricIcon = getMetricIcon(insight.metric)
                const ActionIcon = getActionIcon(insight.action)
                
                return (
                  <div key={insight.id} className={`${theme.card} rounded-xl p-4 border-2 border-green-200 dark:border-green-800`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MetricIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className={`font-semibold ${theme.text}`}>{insight.title}</span>
                          <Badge className={`${getPriorityColor(insight.priority)} border-0`}>
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className={`text-sm ${theme.textSecondary} mb-3`}>
                          <strong>{insight.clientName}:</strong> {insight.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <ActionIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className={`text-sm font-medium ${theme.text}`}>{insight.action}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                          <Award className="w-3 h-3 mr-1" />
                          Celebrate
                        </Button>
                        <Button size="sm" variant="outline">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-12 flex flex-col gap-1">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">Message All</span>
            </Button>
            <Button variant="outline" className="h-12 flex flex-col gap-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Schedule Check-ins</span>
            </Button>
            <Button variant="outline" className="h-12 flex flex-col gap-1">
              <Award className="w-4 h-4" />
              <span className="text-sm">Celebrate Wins</span>
            </Button>
            <Button variant="outline" className="h-12 flex flex-col gap-1">
              <Settings className="w-4 h-4" />
              <span className="text-sm">Adjust Plans</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
