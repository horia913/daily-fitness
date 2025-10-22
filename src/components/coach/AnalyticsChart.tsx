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
  BarChart3,
  LineChart,
  PieChart,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  Filter
} from 'lucide-react'

interface ChartData {
  label: string
  value: number
  color: string
  trend?: 'up' | 'down' | 'stable'
}

interface AnalyticsChartProps {
  title: string
  type: 'line' | 'bar' | 'pie' | 'area'
  data: ChartData[]
  description?: string
  chartId: string
  onExport?: () => void
  onShare?: () => void
}

export default function AnalyticsChart({ 
  title, 
  type, 
  data, 
  description, 
  chartId,
  onExport,
  onShare
}: AnalyticsChartProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedDataPoint, setSelectedDataPoint] = useState<ChartData | null>(null)

  const getChartHeight = () => {
    return isExpanded ? 'h-96' : 'h-64'
  }

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    if (!trend) return null
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-600" />
      case 'down': return <TrendingDown className="w-3 h-3 text-red-600" />
      default: return <Activity className="w-3 h-3 text-slate-400" />
    }
  }

  const renderLineChart = () => {
    const maxValue = Math.max(...data.map(d => d.value))
    const minValue = Math.min(...data.map(d => d.value))
    const range = maxValue - minValue || 1

    return (
      <div className={`${getChartHeight()} w-full relative`}>
        <svg className="w-full h-full" viewBox="0 0 400 200">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <line
              key={index}
              x1="0"
              y1={200 * ratio}
              x2="400"
              y2={200 * ratio}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-slate-200 dark:text-slate-700"
            />
          ))}
          
          {/* Data line */}
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500"
            points={data.map((point, index) => {
              const x = (index / (data.length - 1)) * 400
              const y = 200 - ((point.value - minValue) / range) * 200
              return `${x},${y}`
            }).join(' ')}
          />
          
          {/* Data points */}
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 400
            const y = 200 - ((point.value - minValue) / range) * 200
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="currentColor"
                className="text-blue-500 cursor-pointer hover:r-6 transition-all"
                onClick={() => setSelectedDataPoint(point)}
              />
            )
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          {data.map((point, index) => (
            <span key={index} className="text-center">
              {point.label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const renderBarChart = () => {
    const maxValue = Math.max(...data.map(d => d.value))

    return (
      <div className={`${getChartHeight()} w-full`}>
        <div className="flex items-end justify-between h-full gap-2">
          {data.map((point, index) => {
            const height = (point.value / maxValue) * 100
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="relative group">
                  <div
                    className={`w-full ${point.color} rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer`}
                    style={{ height: `${height}%` }}
                    onClick={() => setSelectedDataPoint(point)}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {point.value}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-2 text-center">
                  {point.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderPieChart = () => {
    const total = data.reduce((sum, point) => sum + point.value, 0)
    let currentAngle = 0

    return (
      <div className={`${getChartHeight()} w-full flex items-center justify-center`}>
        <div className="relative w-48 h-48">
          <svg className="w-full h-full" viewBox="0 0 200 200">
            {data.map((point, index) => {
              const percentage = (point.value / total) * 100
              const angle = (percentage / 100) * 360
              const startAngle = currentAngle
              const endAngle = currentAngle + angle
              currentAngle += angle

              const startAngleRad = (startAngle * Math.PI) / 180
              const endAngleRad = (endAngle * Math.PI) / 180
              const largeArcFlag = angle > 180 ? 1 : 0

              const x1 = 100 + 80 * Math.cos(startAngleRad)
              const y1 = 100 + 80 * Math.sin(startAngleRad)
              const x2 = 100 + 80 * Math.cos(endAngleRad)
              const y2 = 100 + 80 * Math.sin(endAngleRad)

              const pathData = [
                `M 100 100`,
                `L ${x1} ${y1}`,
                `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                `Z`
              ].join(' ')

              return (
                <path
                  key={index}
                  d={pathData}
                  fill={point.color.replace('bg-', '#').replace('-500', '')}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedDataPoint(point)}
                />
              )
            })}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-2xl font-bold ${theme.text}`}>{total}</div>
              <div className={`text-xs ${theme.textSecondary}`}>Total</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderChart = () => {
    switch (type) {
      case 'line': return renderLineChart()
      case 'bar': return renderBarChart()
      case 'pie': return renderPieChart()
      default: return renderBarChart()
    }
  }

  return (
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 ${isExpanded ? 'col-span-2 row-span-2' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              {type === 'line' ? <LineChart className="w-5 h-5 text-blue-600 dark:text-blue-400" /> :
               type === 'bar' ? <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> :
               <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </div>
            <div>
              <CardTitle className={`${theme.text}`}>{title}</CardTitle>
              {description && (
                <p className={`text-sm ${theme.textSecondary}`}>{description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            {onShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Chart */}
        <div className="mb-4">
          {renderChart()}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {data.map((point, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-3 h-3 ${point.color} rounded-full`}></div>
              <span className={`text-sm ${theme.text}`}>{point.label}</span>
              <span className={`text-sm font-medium ${theme.text}`}>{point.value}</span>
              {getTrendIcon(point.trend)}
            </div>
          ))}
        </div>

        {/* Selected Data Point Details */}
        {selectedDataPoint && (
          <div className={`${theme.card} rounded-xl p-4 border-2`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-semibold ${theme.text}`}>{selectedDataPoint.label}</p>
                <p className={`text-sm ${theme.textSecondary}`}>Value: {selectedDataPoint.value}</p>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(selectedDataPoint.trend)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDataPoint(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Chart Controls */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className={`text-sm ${theme.textSecondary}`}>Interactive Chart</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0">
              {type.toUpperCase()}
            </Badge>
            {isExpanded && (
              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-0">
                EXPANDED
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
