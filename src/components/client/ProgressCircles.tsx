'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Target,
  Dumbbell,
  Apple,
  Heart,
  Trophy,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  Plus,
  Eye,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface ProgressMetric {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  textColor: string
  borderColor: string
  current: number
  target: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
  period: string
  lastUpdate?: string
  streak?: number
}

interface CircularProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
  backgroundColor?: string
  children?: React.ReactNode
  className?: string
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = 'var(--fc-domain-workouts)',
  backgroundColor = 'var(--fc-glass-border)',
  children,
  className = ''
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ width: size, height: size }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-in-out"
          style={{
            strokeDasharray: strokeDasharray,
            strokeDashoffset: strokeDashoffset,
          }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

export default function ProgressCircles() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [progressMetrics, setProgressMetrics] = useState<ProgressMetric[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week')
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')

  useEffect(() => {
    if (user) {
      loadProgressData()
    }
  }, [user, selectedPeriod])

  const loadProgressData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Mock data for now - replace with actual API calls
      const mockData: ProgressMetric[] = [
        {
          id: 'workouts',
          name: 'Workouts',
          icon: Dumbbell,
          color: 'var(--fc-domain-workouts)',
          bgColor: 'fc-glass-soft border border-[color:var(--fc-glass-border)]',
          textColor: 'fc-text-workouts',
          borderColor: 'border border-[color:var(--fc-glass-border)]',
          current: 4,
          target: 5,
          percentage: 80,
          trend: 'up',
          period: selectedPeriod,
          lastUpdate: '2 hours ago',
          streak: 7
        },
        {
          id: 'nutrition',
          name: 'Nutrition',
          icon: Apple,
          color: 'var(--fc-status-success)',
          bgColor: 'fc-glass-soft border border-[color:var(--fc-glass-border)]',
          textColor: 'fc-text-success',
          borderColor: 'border border-[color:var(--fc-glass-border)]',
          current: 6,
          target: 7,
          percentage: 86,
          trend: 'stable',
          period: selectedPeriod,
          lastUpdate: '1 hour ago',
          streak: 3
        },
        {
          id: 'habits',
          name: 'Habits',
          icon: Heart,
          color: 'var(--fc-status-warning)',
          bgColor: 'fc-glass-soft border border-[color:var(--fc-glass-border)]',
          textColor: 'fc-text-warning',
          borderColor: 'border border-[color:var(--fc-glass-border)]',
          current: 3,
          target: 4,
          percentage: 75,
          trend: 'up',
          period: selectedPeriod,
          lastUpdate: '30 minutes ago',
          streak: 5
        }
      ]

      setProgressMetrics(mockData)
    } catch (error) {
      console.error('Error loading progress data:', error)
      setProgressMetrics([])
    } finally {
      setLoading(false)
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'var(--fc-status-success)'
    if (percentage >= 70) return 'var(--fc-status-warning)'
    if (percentage >= 50) return 'var(--fc-status-error)'
    return 'var(--fc-text-subtle)'
  }

  const getProgressBackgroundColor = (percentage: number) => {
    if (percentage >= 90) return 'var(--fc-glass-border)'
    if (percentage >= 70) return 'var(--fc-glass-border)'
    if (percentage >= 50) return 'var(--fc-glass-border)'
    return 'var(--fc-glass-border)'
  }

  const getMotivationalMessage = (percentage: number) => {
    if (percentage >= 90) return "Outstanding! You're crushing it! 🚀"
    if (percentage >= 70) return "Great progress! Keep up the momentum! 💪"
    if (percentage >= 50) return "Good work! You're on the right track! 🌟"
    return "Let's get back on track! Every step counts! 🌱"
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 fc-text-success" />
      case 'down': return <TrendingDown className="w-3 h-3 fc-text-error" />
      default: return <Activity className="w-3 h-3 fc-text-subtle" />
    }
  }

  const formatPeriod = (period: string) => {
    switch (period) {
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      case 'year': return 'This Year'
      default: return 'This Week'
    }
  }

  const calculateOverallProgress = () => {
    if (progressMetrics.length === 0) return 0
    const total = progressMetrics.reduce((sum, metric) => sum + metric.percentage, 0)
    return Math.round(total / progressMetrics.length)
  }

  const overallProgress = calculateOverallProgress()

  if (loading) {
    return (
      <div className="fc-glass fc-card">
        <div className="pb-4 px-6 pt-6">
          <div className="flex items-center gap-3 fc-text-primary font-semibold">
            <div className="fc-icon-tile fc-icon-workouts">
              <BarChart3 className="w-5 h-5" />
            </div>
            Weekly Progress
          </div>
        </div>
        <div className="space-y-4 px-6 pb-6">
          <div className="animate-pulse space-y-4">
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full bg-[color:var(--fc-glass-border)]"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center">
                  <div className="w-20 h-20 rounded-full mx-auto mb-2 bg-[color:var(--fc-glass-border)]"></div>
                  <div className="h-4 rounded w-3/4 mx-auto bg-[color:var(--fc-glass-border)]"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fc-glass fc-card fc-accent-workouts relative overflow-hidden">
      <div className="pb-4 relative z-10 px-4 sm:px-6 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 fc-text-primary">
            <div className="fc-icon-tile fc-icon-workouts">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts">
                Progress
              </span>
              <h2 className="text-lg sm:text-xl font-bold mt-2">
                Weekly Progress
              </h2>
              <p className="text-sm fc-text-dim">{formatPeriod(selectedPeriod)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="fc-pill fc-pill-glass fc-text-workouts px-3 py-1">
              {overallProgress}% overall
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'overview' ? 'detailed' : 'overview')}
              className="text-xs fc-btn fc-btn-ghost"
            >
              {viewMode === 'overview' ? 'Detailed' : 'Overview'}
              <Eye className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6 relative z-10">
        {progressMetrics.length > 0 ? (
          <div className="space-y-6">
            {/* Overall Progress Circle */}
            <div className="fc-glass-soft rounded-2xl p-6 border border-[color:var(--fc-glass-border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="fc-icon-tile fc-icon-workouts">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold fc-text-primary">Overall Progress</h3>
                    <p className="text-sm fc-text-dim">Your weekly achievements</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold fc-text-primary">
                    {overallProgress}%
                  </div>
                  <p className="text-sm fc-text-dim">
                    {progressMetrics.reduce((sum, m) => sum + m.current, 0)} of {progressMetrics.reduce((sum, m) => sum + m.target, 0)} goals
                  </p>
                </div>
              </div>
              
              <div className="flex justify-center mb-4">
                <CircularProgress
                  percentage={overallProgress}
                  size={140}
                  strokeWidth={10}
                  color={getProgressColor(overallProgress)}
                  backgroundColor={getProgressBackgroundColor(overallProgress)}
                  className="transition-all duration-1000"
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold fc-text-primary">
                      {overallProgress}%
                    </div>
                    <div className="text-xs fc-text-subtle">
                      Complete
                    </div>
                  </div>
                </CircularProgress>
              </div>
              
              <p className="text-sm font-medium text-center fc-text-primary mt-2">
                {getMotivationalMessage(overallProgress)}
              </p>
            </div>

            {/* Individual Progress Circles */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold fc-text-primary flex items-center gap-2">
                <Target className="w-5 h-5 fc-text-workouts" />
                Category Breakdown
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {progressMetrics.map((metric) => {
                  const Icon = metric.icon
                  const isExpanded = expandedMetric === metric.id
                  
                  return (
                    <div 
                      key={metric.id}
                      className={`fc-list-row rounded-2xl p-4 cursor-pointer group ${metric.borderColor}`}
                      onClick={() => setExpandedMetric(isExpanded ? null : metric.id)}
                    >
                      <div className="text-center">
                        {/* Progress Circle */}
                        <div className="flex justify-center mb-3">
                          <CircularProgress
                            percentage={metric.percentage}
                            size={100}
                            strokeWidth={6}
                            color={metric.color}
                            backgroundColor={getProgressBackgroundColor(metric.percentage)}
                            className="transition-all duration-1000"
                          >
                            <div className="text-center">
                              <div className="text-lg font-bold fc-text-primary">
                                {metric.percentage}%
                              </div>
                              <div className="text-xs fc-text-subtle">
                                {metric.current}/{metric.target}
                              </div>
                            </div>
                          </CircularProgress>
                        </div>
                        
                        {/* Metric Info */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                    <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                              <Icon className={`w-4 h-4 ${metric.textColor}`} />
                            </div>
                            <h4 className="font-bold fc-text-primary text-sm">
                              {metric.name}
                            </h4>
                          </div>
                          
                          <div className="flex items-center justify-center gap-2">
                            {getTrendIcon(metric.trend)}
                    <span className={`fc-pill fc-pill-glass text-xs ${metric.textColor}`}>
                              {metric.trend === 'up' ? 'Improving' : metric.trend === 'down' ? 'Declining' : 'Stable'}
                    </span>
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-[color:var(--fc-glass-border)]">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="fc-text-subtle">Current</span>
                                  <span className="font-medium fc-text-primary">{metric.current}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="fc-text-subtle">Target</span>
                                  <span className="font-medium fc-text-primary">{metric.target}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="fc-text-subtle">Last Update</span>
                                  <span className="font-medium fc-text-primary">{metric.lastUpdate}</span>
                                </div>
                                {metric.streak && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="fc-text-subtle">Streak</span>
                                    <span className="font-medium fc-text-primary">{metric.streak} days</span>
                                  </div>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-2 rounded-xl text-xs fc-btn fc-btn-secondary"
                                >
                                  View Details
                                  <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant={selectedPeriod === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('week')}
                className="rounded-xl fc-btn fc-press"
              >
                Week
              </Button>
              <Button
                variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('month')}
                className="rounded-xl fc-btn fc-press"
              >
                Month
              </Button>
              <Button
                variant={selectedPeriod === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('year')}
                className="rounded-xl fc-btn fc-press"
              >
                Year
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="pt-4 border-t border-[color:var(--fc-glass-border)]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="fc-glass-soft rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                  <p className="text-2xl font-bold fc-text-primary">{progressMetrics.length}</p>
                  <p className="text-xs fc-text-subtle">Categories</p>
                </div>
                <div className="fc-glass-soft rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                  <p className="text-2xl font-bold fc-text-success">
                    {progressMetrics.filter(m => m.percentage >= 80).length}
                  </p>
                  <p className="text-xs fc-text-subtle">Excellent</p>
                </div>
                <div className="fc-glass-soft rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                  <p className="text-2xl font-bold fc-text-warning">
                    {progressMetrics.filter(m => m.percentage >= 60 && m.percentage < 80).length}
                  </p>
                  <p className="text-xs fc-text-subtle">Good</p>
                </div>
                <div className="fc-glass-soft rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                  <p className="text-2xl font-bold fc-text-error">
                    {progressMetrics.filter(m => m.percentage < 60).length}
                  </p>
                  <p className="text-xs fc-text-subtle">Needs Work</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="p-6 fc-icon-tile fc-icon-workouts rounded-2xl w-fit mx-auto mb-6">
              <BarChart3 className="w-12 h-12 fc-text-workouts" />
            </div>
            <h3 className="text-xl font-bold fc-text-primary mb-2">
              No progress data available
            </h3>
            <p className="text-sm fc-text-dim mb-4">
              Start tracking your workouts, nutrition, and habits to see your progress here
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="fc-btn fc-btn-primary fc-press rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Start Tracking
              </Button>
              <Button variant="outline" className="rounded-xl fc-btn fc-btn-secondary">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
