'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Dumbbell,
  Apple,
  Zap,
  Calendar,
  BarChart3,
  LineChart
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export interface TrendData {
  date: string
  workout: number
  nutrition: number
  habit: number
  overall: number
}

interface AdherenceTrendChartProps {
  clientId: string
  clientName: string
  trendData: TrendData[]
  selectedMetric: 'overall' | 'workout' | 'nutrition' | 'habit'
}

export default function AdherenceTrendChart({ 
  clientId, 
  clientName, 
  trendData, 
  selectedMetric 
}: AdherenceTrendChartProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  const data = trendData ?? []

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'workout': return 'text-blue-600 dark:text-blue-400'
      case 'nutrition': return 'text-green-600 dark:text-green-400'
      case 'habit': return 'text-purple-600 dark:text-purple-400'
      default: return 'text-slate-600 dark:text-slate-400'
    }
  }

  const getMetricBgColor = (metric: string) => {
    switch (metric) {
      case 'workout': return 'bg-blue-100 dark:bg-blue-900/30'
      case 'nutrition': return 'bg-green-100 dark:bg-green-900/30'
      case 'habit': return 'bg-purple-100 dark:bg-purple-900/30'
      default: return 'bg-slate-100 dark:bg-slate-900/30'
    }
  }

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'workout': return Dumbbell
      case 'nutrition': return Apple
      case 'habit': return Zap
      default: return Activity
    }
  }

  const getCurrentValue = () => {
    if (data.length === 0) return 0
    const latest = data[data.length - 1]
    return latest[selectedMetric] ?? 0
  }

  const getPreviousValue = () => {
    if (data.length < 2) return 0
    const previous = data[data.length - 2]
    return previous[selectedMetric] ?? 0
  }

  const getTrend = () => {
    const current = getCurrentValue()
    const previous = getPreviousValue()
    const diff = current - previous
    if (diff > 2) return 'up'
    if (diff < -2) return 'down'
    return 'stable'
  }

  const getTrendPercentage = () => {
    const current = getCurrentValue()
    const previous = getPreviousValue()
    if (previous == null || previous === 0) return '0.0'
    return Math.abs(((current - previous) / previous) * 100).toFixed(1)
  }

  const sevenDayAvg =
    data.length > 0
      ? (data.reduce((sum, day) => sum + (day[selectedMetric] ?? 0), 0) / data.length).toFixed(1)
      : '0.0'

  const MetricIcon = getMetricIcon(selectedMetric)

  if (data.length === 0) {
    return (
      <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className={`${theme.text} text-base sm:text-lg`}>
            {clientName} — {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <EmptyState
            variant="compact"
            title="No trend data yet"
            description="Complete workouts and check-ins to see adherence trends."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className={`flex items-center gap-2 sm:gap-3 ${theme.text} text-base sm:text-lg min-w-0 truncate`}>
            <div className={`p-2 ${getMetricBgColor(selectedMetric)} rounded-lg`}>
              <MetricIcon className={`w-5 h-5 ${getMetricColor(selectedMetric)}`} />
            </div>
            {clientName} - {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trends
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <LineChart className="w-4 h-4" />
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6">
        {/* Trend Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className={`${theme.card} rounded-xl p-3 sm:p-4 border-2`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 fc-text-subtle flex-shrink-0" />
              <span className={`text-xs sm:text-sm font-medium ${theme.text}`}>Current</span>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${getMetricColor(selectedMetric)}`}>
              {getCurrentValue()}%
            </p>
          </div>
          
          <div className={`${theme.card} rounded-xl p-3 sm:p-4 border-2`}>
            <div className="flex items-center gap-2 mb-2">
              {getTrend() === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : getTrend() === 'down' ? (
                <TrendingDown className="w-4 h-4 text-red-600 flex-shrink-0" />
              ) : (
                <Activity className="w-4 h-4 fc-text-subtle flex-shrink-0" />
              )}
              <span className={`text-xs sm:text-sm font-medium ${theme.text}`}>Trend</span>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${
              getTrend() === 'up' ? 'text-green-600 dark:text-green-400' :
              getTrend() === 'down' ? 'text-red-600 dark:text-red-400' :
              'text-slate-600 dark:text-slate-400'
            }`}>
              {getTrend() === 'up' ? '+' : getTrend() === 'down' ? '-' : '±'}{getTrendPercentage()}%
            </p>
          </div>
          
          <div className={`${theme.card} rounded-xl p-3 sm:p-4 border-2`}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 fc-text-subtle flex-shrink-0" />
              <span className={`text-xs sm:text-sm font-medium ${theme.text}`}>7-Day Avg</span>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${getMetricColor(selectedMetric)}`}>
              {sevenDayAvg}%
            </p>
          </div>
        </div>

        {/* Chart Visualization */}
        <div className={`${theme.card} rounded-xl p-4 sm:p-6 border-2 overflow-x-auto`}>
          <div className="space-y-3 sm:space-y-4 min-w-0">
            {/* Chart Header */}
            <div className="flex items-center justify-between gap-2">
              <h4 className={`font-semibold text-sm sm:text-base ${theme.text}`}>Weekly Trend</h4>
              <Badge className={`${getMetricBgColor(selectedMetric)} ${getMetricColor(selectedMetric)} border-0`}>
                {chartType === 'line' ? 'Line Chart' : 'Bar Chart'}
              </Badge>
            </div>

            {/* Simple Chart Visualization */}
            <div className="h-64 flex items-end justify-between gap-1 sm:gap-2">
              {data.map((day, index) => {
                const value = day[selectedMetric]
                const height = (value / 100) * 200 // Scale to chart height
                
                return (
                  <div key={index} className="flex flex-col items-center gap-2 flex-1">
                    <div className="text-xs fc-text-subtle">
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                    </div>
                    
                    {chartType === 'line' ? (
                      <div className="relative w-full">
                        <div 
                          className={`w-full rounded-t-sm ${getMetricBgColor(selectedMetric)}`}
                          style={{ height: `${height}px` }}
                        ></div>
                        <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium ${getMetricColor(selectedMetric)}`}>
                          {value}%
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full">
                        <div 
                          className={`w-full rounded-t-sm ${getMetricBgColor(selectedMetric)}`}
                          style={{ height: `${height}px` }}
                        ></div>
                        <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium ${getMetricColor(selectedMetric)}`}>
                          {value}%
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getMetricBgColor(selectedMetric)}`}></div>
                <span className={`text-sm ${theme.textSecondary}`}>
                  {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Adherence
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className={`${theme.card} rounded-xl p-3 sm:p-4 border-2 mt-3 sm:mt-4`}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className={`font-medium ${theme.text}`}>Insights</span>
          </div>
          <div className="space-y-2">
            <p className={`text-sm ${theme.textSecondary}`}>
              {getTrend() === 'up' 
                ? `Great progress! ${selectedMetric} adherence has improved by ${getTrendPercentage()}% this week.`
                : getTrend() === 'down'
                ? `Attention needed: ${selectedMetric} adherence has decreased by ${getTrendPercentage()}% this week.`
                : `${selectedMetric} adherence has remained stable this week.`
              }
            </p>
            <p className={`text-sm ${theme.textSecondary}`}>
              Current streak: {getCurrentValue() >= 90 ? 'Excellent' : getCurrentValue() >= 75 ? 'Good' : 'Needs improvement'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
