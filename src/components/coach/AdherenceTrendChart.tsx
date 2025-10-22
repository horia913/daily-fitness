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
  LineChart,
  PieChart
} from 'lucide-react'

interface TrendData {
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

  // Mock trend data - replace with actual data
  const mockTrendData: TrendData[] = [
    { date: '2024-01-08', workout: 95, nutrition: 90, habit: 85, overall: 90 },
    { date: '2024-01-09', workout: 98, nutrition: 92, habit: 88, overall: 93 },
    { date: '2024-01-10', workout: 85, nutrition: 88, habit: 90, overall: 88 },
    { date: '2024-01-11', workout: 92, nutrition: 95, habit: 87, overall: 91 },
    { date: '2024-01-12', workout: 88, nutrition: 90, habit: 92, overall: 90 },
    { date: '2024-01-13', workout: 95, nutrition: 93, habit: 89, overall: 92 },
    { date: '2024-01-14', workout: 90, nutrition: 88, habit: 91, overall: 90 }
  ]

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
    const latest = mockTrendData[mockTrendData.length - 1]
    return latest[selectedMetric]
  }

  const getPreviousValue = () => {
    const previous = mockTrendData[mockTrendData.length - 2]
    return previous[selectedMetric]
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
    return Math.abs(((current - previous) / previous) * 100).toFixed(1)
  }

  const MetricIcon = getMetricIcon(selectedMetric)

  return (
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
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
      
      <CardContent>
        {/* Trend Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`${theme.card} rounded-xl p-4 border-2`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className={`text-sm font-medium ${theme.text}`}>Current</span>
            </div>
            <p className={`text-2xl font-bold ${getMetricColor(selectedMetric)}`}>
              {getCurrentValue()}%
            </p>
          </div>
          
          <div className={`${theme.card} rounded-xl p-4 border-2`}>
            <div className="flex items-center gap-2 mb-2">
              {getTrend() === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : getTrend() === 'down' ? (
                <TrendingDown className="w-4 h-4 text-red-600" />
              ) : (
                <Activity className="w-4 h-4 text-slate-400" />
              )}
              <span className={`text-sm font-medium ${theme.text}`}>Trend</span>
            </div>
            <p className={`text-2xl font-bold ${
              getTrend() === 'up' ? 'text-green-600 dark:text-green-400' :
              getTrend() === 'down' ? 'text-red-600 dark:text-red-400' :
              'text-slate-600 dark:text-slate-400'
            }`}>
              {getTrend() === 'up' ? '+' : getTrend() === 'down' ? '-' : '±'}{getTrendPercentage()}%
            </p>
          </div>
          
          <div className={`${theme.card} rounded-xl p-4 border-2`}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className={`text-sm font-medium ${theme.text}`}>7-Day Avg</span>
            </div>
            <p className={`text-2xl font-bold ${getMetricColor(selectedMetric)}`}>
              {(mockTrendData.reduce((sum, day) => sum + day[selectedMetric], 0) / mockTrendData.length).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Chart Visualization */}
        <div className={`${theme.card} rounded-xl p-6 border-2`}>
          <div className="space-y-4">
            {/* Chart Header */}
            <div className="flex items-center justify-between">
              <h4 className={`font-semibold ${theme.text}`}>Weekly Trend</h4>
              <Badge className={`${getMetricBgColor(selectedMetric)} ${getMetricColor(selectedMetric)} border-0`}>
                {chartType === 'line' ? 'Line Chart' : 'Bar Chart'}
              </Badge>
            </div>

            {/* Simple Chart Visualization */}
            <div className="h-64 flex items-end justify-between gap-2">
              {mockTrendData.map((day, index) => {
                const value = day[selectedMetric]
                const height = (value / 100) * 200 // Scale to chart height
                
                return (
                  <div key={index} className="flex flex-col items-center gap-2 flex-1">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
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
        <div className={`${theme.card} rounded-xl p-4 border-2 mt-4`}>
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
