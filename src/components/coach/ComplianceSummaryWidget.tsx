'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Trophy,
  Flame,
  Shield,
  Target,
  Users,
  Award,
  Star
} from 'lucide-react'

interface ComplianceSummaryWidgetProps {
  clients: any[]
  selectedPeriod: 'week' | 'month' | 'quarter'
}

export default function ComplianceSummaryWidget({ clients, selectedPeriod }: ComplianceSummaryWidgetProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()

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

    // Calculate compliance distribution
    const excellent = clients.filter(c => c.compliance.overall_compliance >= 90).length
    const good = clients.filter(c => c.compliance.overall_compliance >= 75 && c.compliance.overall_compliance < 90).length
    const fair = clients.filter(c => c.compliance.overall_compliance >= 60 && c.compliance.overall_compliance < 75).length
    const poor = clients.filter(c => c.compliance.overall_compliance >= 50 && c.compliance.overall_compliance < 60).length
    const critical = clients.filter(c => c.compliance.overall_compliance < 50).length

    // Top performers
    const topPerformers = clients
      .sort((a, b) => b.compliance.overall_compliance - a.compliance.overall_compliance)
      .slice(0, 3)

    // Bottom performers
    const bottomPerformers = clients
      .sort((a, b) => a.compliance.overall_compliance - b.compliance.overall_compliance)
      .slice(0, 3)

    return {
      totalClients,
      avgCompliance,
      avgEngagement,
      totalAlerts,
      criticalAlerts,
      distribution: { excellent, good, fair, poor, critical },
      topPerformers,
      bottomPerformers
    }
  }

  const stats = getOverallStats()

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 75) return 'text-blue-600 dark:text-blue-400'
    if (score >= 60) return 'text-orange-600 dark:text-orange-400'
    if (score >= 50) return 'text-red-600 dark:text-red-400'
    return 'text-red-700 dark:text-red-300'
  }

  const getComplianceBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 75) return 'bg-blue-100 dark:bg-blue-900/30'
    if (score >= 60) return 'bg-orange-100 dark:bg-orange-900/30'
    if (score >= 50) return 'bg-red-100 dark:bg-red-900/30'
    return 'bg-red-200 dark:bg-red-900/50'
  }

  return (
    <div className="space-y-6">
      {/* Compliance Distribution */}
      <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${theme.text}`}>
            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Compliance Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className={`text-sm ${theme.text}`}>Excellent (90%+)</span>
              </div>
              <span className={`font-semibold ${theme.text}`}>{stats.distribution.excellent}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className={`text-sm ${theme.text}`}>Good (75-89%)</span>
              </div>
              <span className={`font-semibold ${theme.text}`}>{stats.distribution.good}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className={`text-sm ${theme.text}`}>Fair (60-74%)</span>
              </div>
              <span className={`font-semibold ${theme.text}`}>{stats.distribution.fair}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className={`text-sm ${theme.text}`}>Poor (50-59%)</span>
              </div>
              <span className={`font-semibold ${theme.text}`}>{stats.distribution.poor}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-700 rounded-full"></div>
                <span className={`text-sm ${theme.text}`}>Critical (&lt;50%)</span>
              </div>
              <span className={`font-semibold ${theme.text}`}>{stats.distribution.critical}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${theme.text}`}>
            <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topPerformers.map((client, index) => (
              <div key={client.client.id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className={`font-medium ${theme.text}`}>
                      {client.client.first_name} {client.client.last_name}
                    </p>
                    <p className={`text-xs ${theme.textSecondary}`}>
                      {client.compliance.overall_compliance.toFixed(1)}% compliance
                    </p>
                  </div>
                </div>
                <Badge className={`${getComplianceBgColor(client.compliance.overall_compliance)} ${getComplianceColor(client.compliance.overall_compliance)} border-0`}>
                  <Star className="w-3 h-3 mr-1" />
                  {client.compliance.overall_compliance.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Performers */}
      <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${theme.text}`}>
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.bottomPerformers.map((client, index) => (
              <div key={client.client.id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className={`font-medium ${theme.text}`}>
                      {client.client.first_name} {client.client.last_name}
                    </p>
                    <p className={`text-xs ${theme.textSecondary}`}>
                      {client.compliance.overall_compliance.toFixed(1)}% compliance
                    </p>
                  </div>
                </div>
                <Badge className={`${getComplianceBgColor(client.compliance.overall_compliance)} ${getComplianceColor(client.compliance.overall_compliance)} border-0`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {client.compliance.overall_compliance.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${theme.text}`}>
            <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className={`${theme.card} rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer`}>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className={`text-sm font-medium ${theme.text}`}>Message All</span>
              </div>
              <p className={`text-xs ${theme.textSecondary}`}>Send group message</p>
            </div>
            
            <div className={`${theme.card} rounded-xl p-4 border-2 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 transition-colors cursor-pointer`}>
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className={`text-sm font-medium ${theme.text}`}>Celebrate</span>
              </div>
              <p className={`text-xs ${theme.textSecondary}`}>Acknowledge wins</p>
            </div>
            
            <div className={`${theme.card} rounded-xl p-4 border-2 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors cursor-pointer`}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className={`text-sm font-medium ${theme.text}`}>Set Goals</span>
              </div>
              <p className={`text-xs ${theme.textSecondary}`}>Update targets</p>
            </div>
            
            <div className={`${theme.card} rounded-xl p-4 border-2 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors cursor-pointer`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className={`text-sm font-medium ${theme.text}`}>Report</span>
              </div>
              <p className={`text-xs ${theme.textSecondary}`}>Generate report</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
