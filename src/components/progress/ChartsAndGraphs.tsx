'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  Calendar, 
  Filter, 
  Download, 
  Share2, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Eye,
  EyeOff,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Settings,
  Info,
  AlertCircle,
  CheckCircle,
  Star,
  Zap,
  Heart,
  Dumbbell,
  Weight,
  Timer,
  Award,
  Trophy,
  Flame,
  Sparkles,
  Crown,
  Diamond,
  Sun,
  Moon,
  Rainbow
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

interface ChartDataPoint {
  date: string
  value: number
  label?: string
  metadata?: {
    workout?: string
    notes?: string
    goal?: number
    achievement?: boolean
  }
}

interface ChartDataset {
  id: string
  name: string
  data: ChartDataPoint[]
  color: string
  type: 'line' | 'bar' | 'area'
  visible: boolean
  goal?: number
  unit?: string
}

interface ChartConfig {
  id: string
  title: string
  description: string
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter'
  datasets: ChartDataset[]
  xAxisLabel: string
  yAxisLabel: string
  showGrid: boolean
  showLegend: boolean
  showTooltips: boolean
  animated: boolean
  goalLine?: number
  annotations?: Array<{
    date: string
    label: string
    type: 'milestone' | 'achievement' | 'note'
    color: string
  }>
}

interface ChartsAndGraphsProps {
  charts?: ChartConfig[]
  loading?: boolean
  onExport?: (chartId: string) => void
  onShare?: (chartId: string) => void
  onRefresh?: () => void
  className?: string
}

export function ChartsAndGraphs({ 
  charts = [], 
  loading = false, 
  onExport, 
  onShare, 
  onRefresh,
  className = '' 
}: ChartsAndGraphsProps) {
  const theme = useTheme()
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('3M')
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)

  // Generate mock charts if none provided
  const mockCharts: ChartConfig[] = [
    {
      id: 'weight-progress',
      title: 'Weight Progress',
      description: 'Track your weight changes over time',
      type: 'line',
      xAxisLabel: 'Date',
      yAxisLabel: 'Weight (kg)',
      showGrid: true,
      showLegend: true,
      showTooltips: true,
      animated: true,
      goalLine: 70,
      datasets: [{
        id: 'weight',
        name: 'Body Weight',
        data: [
          { date: '2024-01-01', value: 75.2, metadata: { notes: 'Starting weight' } },
          { date: '2024-01-08', value: 74.8, metadata: { notes: 'First week progress' } },
          { date: '2024-01-15', value: 74.1, metadata: { notes: 'Good progress' } },
          { date: '2024-01-22', value: 73.5, metadata: { notes: 'Milestone reached' } },
          { date: '2024-01-29', value: 72.9, metadata: { notes: 'Excellent progress' } },
          { date: '2024-02-05', value: 72.2, metadata: { notes: 'Goal achieved!' } }
        ],
        color: 'text-blue-600',
        type: 'line',
        visible: true,
        goal: 70,
        unit: 'kg'
      }],
      annotations: [
        { date: '2024-01-15', label: 'First Milestone', type: 'milestone', color: 'text-green-600' },
        { date: '2024-02-05', label: 'Goal Achieved!', type: 'achievement', color: 'text-yellow-600' }
      ]
    },
    {
      id: 'strength-progress',
      title: 'Strength Progress',
      description: 'Track your strength gains across exercises',
      type: 'bar',
      xAxisLabel: 'Exercise',
      yAxisLabel: 'Weight (kg)',
      showGrid: true,
      showLegend: true,
      showTooltips: true,
      animated: true,
      datasets: [
        {
          id: 'bench-press',
          name: 'Bench Press',
          data: [
            { date: '2024-01-01', value: 60, metadata: { workout: 'Push Day' } },
            { date: '2024-01-15', value: 65, metadata: { workout: 'Push Day' } },
            { date: '2024-02-01', value: 70, metadata: { workout: 'Push Day' } },
            { date: '2024-02-15', value: 75, metadata: { workout: 'Push Day' } }
          ],
          color: 'text-blue-600',
          type: 'bar',
          visible: true,
          unit: 'kg'
        },
        {
          id: 'squat',
          name: 'Squat',
          data: [
            { date: '2024-01-01', value: 80, metadata: { workout: 'Leg Day' } },
            { date: '2024-01-15', value: 85, metadata: { workout: 'Leg Day' } },
            { date: '2024-02-01', value: 90, metadata: { workout: 'Leg Day' } },
            { date: '2024-02-15', value: 95, metadata: { workout: 'Leg Day' } }
          ],
          color: 'text-green-600',
          type: 'bar',
          visible: true,
          unit: 'kg'
        }
      ]
    },
    {
      id: 'workout-frequency',
      title: 'Workout Frequency',
      description: 'Track your weekly workout consistency',
      type: 'area',
      xAxisLabel: 'Week',
      yAxisLabel: 'Workouts',
      showGrid: true,
      showLegend: true,
      showTooltips: true,
      animated: true,
      goalLine: 4,
      datasets: [{
        id: 'workouts',
        name: 'Workouts per Week',
        data: [
          { date: '2024-01-01', value: 3 },
          { date: '2024-01-08', value: 4 },
          { date: '2024-01-15', value: 5 },
          { date: '2024-01-22', value: 4 },
          { date: '2024-01-29', value: 6 },
          { date: '2024-02-05', value: 5 }
        ],
        color: 'text-purple-600',
        type: 'area',
        visible: true,
        goal: 4,
        unit: 'workouts'
      }]
    }
  ]

  const displayCharts = charts.length > 0 ? charts : mockCharts

  // Filter charts by metric if selected
  const filteredCharts = selectedMetric 
    ? displayCharts.filter(chart => chart.datasets.some(dataset => dataset.id === selectedMetric))
    : displayCharts

  // Get unique metrics
  const metrics = Array.from(new Set(displayCharts.flatMap(chart => chart.datasets.map(dataset => dataset.id))))

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'line': return <LineChart className="w-5 h-5" />
      case 'bar': return <BarChart3 className="w-5 h-5" />
      case 'pie': return <PieChart className="w-5 h-5" />
      case 'area': return <Activity className="w-5 h-5" />
      case 'scatter': return <Target className="w-5 h-5" />
      default: return <BarChart3 className="w-5 h-5" />
    }
  }

  const getMetricIcon = (metricId: string) => {
    switch (metricId) {
      case 'weight': return <Weight className="w-4 h-4" />
      case 'bench-press': return <Dumbbell className="w-4 h-4" />
      case 'squat': return <Dumbbell className="w-4 h-4" />
      case 'workouts': return <Calendar className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const formatTimeRange = (range: string) => {
    switch (range) {
      case '1M': return '1 Month'
      case '3M': return '3 Months'
      case '6M': return '6 Months'
      case '1Y': return '1 Year'
      case 'ALL': return 'All Time'
      default: return range
    }
  }

  if (loading) {
    return (
      <Card className={cn("rounded-3xl shadow-lg border-0 overflow-hidden", theme.card)}>
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">Charts & Graphs</CardTitle>
                <p className="text-slate-600 dark:text-slate-400">Data visualization and progress tracking</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="animate-pulse space-y-6">
            {/* Header skeleton */}
            <div className="flex gap-4">
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-32"></div>
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-32"></div>
            </div>
            
            {/* Chart skeleton */}
            <div className="bg-slate-200 dark:bg-slate-700 rounded-2xl h-64"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("rounded-3xl shadow-lg border-0 overflow-hidden w-full", theme.card, className)}>
      <CardHeader className="p-4 sm:p-6 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">Charts & Graphs</CardTitle>
              <p className="text-slate-600 dark:text-slate-400">
                {filteredCharts.length} chart{filteredCharts.length !== 1 ? 's' : ''} • Visualize your progress
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-shrink-0">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "rounded-lg",
                  viewMode === 'grid' 
                    ? "bg-white dark:bg-slate-700 shadow-sm" 
                    : "hover:bg-transparent"
                )}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn(
                  "rounded-lg",
                  viewMode === 'list' 
                    ? "bg-white dark:bg-slate-700 shadow-sm" 
                    : "hover:bg-transparent"
                )}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Refresh Button */}
            <Button 
              onClick={onRefresh}
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full overflow-x-auto">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-shrink-0">
              {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "rounded-lg text-xs px-2",
                    timeRange === range 
                      ? "bg-white dark:bg-slate-700 shadow-sm" 
                      : "hover:bg-transparent"
                  )}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>

          {/* Metric Filter */}
          {metrics.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 overflow-x-auto">
                <Button
                  variant={selectedMetric === null ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedMetric(null)}
                  className={cn(
                    "rounded-lg text-xs px-2 whitespace-nowrap flex-shrink-0",
                    selectedMetric === null 
                      ? "bg-white dark:bg-slate-700 shadow-sm" 
                      : "hover:bg-transparent"
                  )}
                >
                  All
                </Button>
                {metrics.slice(0, 3).map((metric) => (
                  <Button
                    key={metric}
                    variant={selectedMetric === metric ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedMetric(metric)}
                    className={cn(
                      "rounded-lg text-xs px-2 whitespace-nowrap flex-shrink-0",
                      selectedMetric === metric 
                        ? "bg-white dark:bg-slate-700 shadow-sm" 
                        : "hover:bg-transparent"
                    )}
                  >
                    {getMetricIcon(metric)}
                    <span className="ml-1 capitalize hidden sm:inline">{metric.replace('-', ' ')}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0">
        {filteredCharts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-12 h-12 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              No Data Yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto text-lg">
              Start logging your workouts and measurements to see beautiful charts of your progress!
            </p>
            <Button 
              onClick={onRefresh}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Generate Charts
            </Button>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 lg:grid-cols-2 gap-6" 
              : "space-y-6"
          )}>
            {filteredCharts.map((chart) => (
              <ChartCard 
                key={chart.id} 
                chart={chart}
                viewMode={viewMode}
                timeRange={timeRange}
                onExport={() => onExport?.(chart.id)}
                onShare={() => onShare?.(chart.id)}
                onSelect={() => setSelectedChart(chart.id)}
                isSelected={selectedChart === chart.id}
                getChartIcon={getChartIcon}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Individual Chart Card Component
function ChartCard({ 
  chart, 
  viewMode, 
  timeRange, 
  onExport, 
  onShare, 
  onSelect, 
  isSelected,
  getChartIcon 
}: {
  chart: ChartConfig
  viewMode: 'grid' | 'list'
  timeRange: string
  onExport: () => void
  onShare: () => void
  onSelect: () => void
  isSelected: boolean
  getChartIcon: (type: string) => React.ReactNode
}) {
  const theme = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null)

  const cardClasses = cn(
    "rounded-2xl p-6 transition-all duration-300 cursor-pointer",
    "bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900",
    "border border-slate-200 dark:border-slate-700",
    "hover:shadow-xl hover:scale-[1.02]",
    isSelected && "ring-2 ring-blue-500 shadow-lg",
    isExpanded && "col-span-2 row-span-2"
  )

  const renderLineChart = (dataset: ChartDataset) => {
    const maxValue = Math.max(...dataset.data.map(d => d.value))
    const minValue = Math.min(...dataset.data.map(d => d.value))
    const range = maxValue - minValue || 1

    return (
      <div className="h-64 w-full relative">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          {/* Grid lines */}
          {chart.showGrid && [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
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
          
          {/* Goal line */}
          {chart.goalLine && (
            <line
              x1="0"
              y1={200 - ((chart.goalLine - minValue) / range) * 200}
              x2="400"
              y2={200 - ((chart.goalLine - minValue) / range) * 200}
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5,5"
              className="text-green-500"
            />
          )}
          
          {/* Data line */}
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={dataset.color}
            points={dataset.data.map((point, index) => {
              const x = (index / (dataset.data.length - 1)) * 400
              const y = 200 - ((point.value - minValue) / range) * 200
              return `${x},${y}`
            }).join(' ')}
          />
          
          {/* Data points */}
          {dataset.data.map((point, index) => {
            const x = (index / (dataset.data.length - 1)) * 400
            const y = 200 - ((point.value - minValue) / range) * 200
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="currentColor"
                className={cn(
                  dataset.color,
                  "cursor-pointer hover:r-6 transition-all",
                  hoveredPoint === point && "r-6"
                )}
                onClick={() => setHoveredPoint(point)}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            )
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          {dataset.data.map((point, index) => (
            <span key={index} className="text-center">
              {new Date(point.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const renderBarChart = (dataset: ChartDataset) => {
    const maxValue = Math.max(...dataset.data.map(d => d.value))

    return (
      <div className="h-64 w-full">
        <div className="flex items-end justify-between h-full gap-2">
          {dataset.data.map((point, index) => {
            const height = (point.value / maxValue) * 100
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="relative group">
                  <div
                    className={cn(
                      "w-full rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer",
                      dataset.color.replace('text-', 'bg-')
                    )}
                    style={{ height: `${height}%` }}
                    onClick={() => setHoveredPoint(point)}
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {point.value}{dataset.unit}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-2 text-center">
                  {new Date(point.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderChart = () => {
    const dataset = chart.datasets.find(d => d.visible) || chart.datasets[0]
    if (!dataset) return null

    switch (chart.type) {
      case 'line': return renderLineChart(dataset)
      case 'bar': return renderBarChart(dataset)
      default: return renderLineChart(dataset)
    }
  }

  return (
    <div className={cardClasses} onClick={onSelect}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            {getChartIcon(chart.type)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
              {chart.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {chart.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="rounded-xl"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onExport()
            }}
            className="rounded-xl"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onShare()
            }}
            className="rounded-xl"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-4">
        {renderChart()}
      </div>

      {/* Legend */}
      {chart.showLegend && (
        <div className="flex flex-wrap gap-2 mb-4">
          {chart.datasets.map((dataset) => (
            <div key={dataset.id} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", dataset.color.replace('text-', 'bg-'))}></div>
              <span className="text-sm text-slate-700 dark:text-slate-300">{dataset.name}</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {dataset.data[dataset.data.length - 1]?.value}{dataset.unit}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hovered Point Details */}
      {hoveredPoint && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {new Date(hoveredPoint.date).toLocaleDateString()}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Value: {hoveredPoint.value}
              </p>
              {hoveredPoint.metadata?.notes && (
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  {hoveredPoint.metadata.notes}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHoveredPoint(null)}
              className="rounded-xl"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Chart Info */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0">
            {chart.type.toUpperCase()}
          </Badge>
          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-0">
            {timeRange}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {chart.datasets.length} dataset{chart.datasets.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

