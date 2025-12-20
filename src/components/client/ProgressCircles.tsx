'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Target,
  Dumbbell,
  Apple,
  Heart,
  Flame,
  Trophy,
  Award,
  Star,
  Zap,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  BarChart3,
  Activity,
  Timer,
  Bell,
  CheckCircle,
  CheckCircle2,
  CircleCheck,
  CircleX,
  CircleAlert,
  CircleMinus,
  CirclePlus,
  CircleDot,
  CirclePause,
  CirclePlay,
  CircleStop,
  CircleHelp,
  ExternalLink,
  RefreshCw,
  Plus,
  Eye,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Settings,
  Edit,
  Trash2,
  Copy,
  Share2,
  MessageCircle,
  Users,
  User,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  UserCog,
  UserSearch,
  Sparkles
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'

interface ProgressMetric {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  textColor: string
  borderColor: string
  glowColor: string
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
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
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
  const { getThemeStyles } = useTheme()
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
          color: '#8B5CF6',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          textColor: 'text-purple-600 dark:text-purple-400',
          borderColor: 'border-purple-200 dark:border-purple-800',
          glowColor: 'shadow-purple-200 dark:shadow-purple-800',
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
          color: '#10B981',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-600 dark:text-green-400',
          borderColor: 'border-green-200 dark:border-green-800',
          glowColor: 'shadow-green-200 dark:shadow-green-800',
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
          color: '#F59E0B',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30',
          textColor: 'text-orange-600 dark:text-orange-400',
          borderColor: 'border-orange-200 dark:border-orange-800',
          glowColor: 'shadow-orange-200 dark:shadow-orange-800',
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
    if (percentage >= 90) return '#10B981' // Green
    if (percentage >= 70) return '#F59E0B' // Orange
    if (percentage >= 50) return '#EF4444' // Red
    return '#6B7280' // Gray
  }

  const getProgressBackgroundColor = (percentage: number) => {
    if (percentage >= 90) return '#D1FAE5' // Light green
    if (percentage >= 70) return '#FEF3C7' // Light orange
    if (percentage >= 50) return '#FEE2E2' // Light red
    return '#F3F4F6' // Light gray
  }

  const getMotivationalMessage = (percentage: number) => {
    if (percentage >= 90) return "Outstanding! You're crushing it! 🚀"
    if (percentage >= 70) return "Great progress! Keep up the momentum! 💪"
    if (percentage >= 50) return "Good work! You're on the right track! 🌟"
    return "Let's get back on track! Every step counts! 🌱"
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
      case 'down': return <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />
      default: return <Activity className="w-3 h-3 text-slate-400" />
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

  const theme = getThemeStyles()
  const overallProgress = calculateOverallProgress()

  if (loading) {
    return (
      <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
        <CardHeader className="pb-4">
          <CardTitle className={`flex items-center gap-2 ${theme.text}`}>
            <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            Weekly Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="flex justify-center">
              <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center">
                  <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 relative overflow-hidden`}>
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
            <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Weekly Progress</h2>
              <p className={`text-sm ${theme.textSecondary}`}>{formatPeriod(selectedPeriod)}</p>
            </div>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1">
              {overallProgress}% overall
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'overview' ? 'detailed' : 'overview')}
              className="text-xs"
            >
              {viewMode === 'overview' ? 'Detailed' : 'Overview'}
              <Eye className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 relative z-10">
        {progressMetrics.length > 0 ? (
          <div className="space-y-6">
            {/* Overall Progress Circle */}
            <div className={`${theme.card} rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${theme.text}`}>Overall Progress</h3>
                    <p className={`text-sm ${theme.textSecondary}`}>Your weekly achievements</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${theme.text}`}>
                    {overallProgress}%
                  </div>
                  <p className={`text-sm ${theme.textSecondary}`}>
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
                    <div className={`text-2xl font-bold ${theme.text}`}>
                      {overallProgress}%
                    </div>
                    <div className={`text-xs ${theme.textSecondary}`}>
                      Complete
                    </div>
                  </div>
                </CircularProgress>
              </div>
              
              <p className={`text-sm font-medium text-center ${theme.text} mt-2`}>
                {getMotivationalMessage(overallProgress)}
              </p>
            </div>

            {/* Individual Progress Circles */}
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold ${theme.text} flex items-center gap-2`}>
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Category Breakdown
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {progressMetrics.map((metric) => {
                  const Icon = metric.icon
                  const isExpanded = expandedMetric === metric.id
                  
                  return (
                    <div 
                      key={metric.id}
                      className={`${theme.card} ${theme.shadow} rounded-2xl p-4 border-2 ${metric.borderColor} hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105 hover:${metric.glowColor} hover:shadow-lg`}
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
                              <div className={`text-lg font-bold ${theme.text}`}>
                                {metric.percentage}%
                              </div>
                              <div className={`text-xs ${theme.textSecondary}`}>
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
                            <h4 className={`font-bold ${theme.text} text-sm`}>
                              {metric.name}
                            </h4>
                          </div>
                          
                          <div className="flex items-center justify-center gap-2">
                            {getTrendIcon(metric.trend)}
                            <Badge className={`text-xs ${metric.bgColor} ${metric.textColor}`}>
                              {metric.trend === 'up' ? 'Improving' : metric.trend === 'down' ? 'Declining' : 'Stable'}
                            </Badge>
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className={`${theme.textSecondary}`}>Current</span>
                                  <span className={`font-medium ${theme.text}`}>{metric.current}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className={`${theme.textSecondary}`}>Target</span>
                                  <span className={`font-medium ${theme.text}`}>{metric.target}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className={`${theme.textSecondary}`}>Last Update</span>
                                  <span className={`font-medium ${theme.text}`}>{metric.lastUpdate}</span>
                                </div>
                                {metric.streak && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className={`${theme.textSecondary}`}>Streak</span>
                                    <span className={`font-medium ${theme.text}`}>{metric.streak} days</span>
                                  </div>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-2 rounded-xl text-xs"
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
                className="rounded-xl"
              >
                Week
              </Button>
              <Button
                variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('month')}
                className="rounded-xl"
              >
                Month
              </Button>
              <Button
                variant={selectedPeriod === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('year')}
                className="rounded-xl"
              >
                Year
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className={`${theme.card} rounded-xl p-4 border-2`}>
                  <p className={`text-2xl font-bold ${theme.text}`}>{progressMetrics.length}</p>
                  <p className={`text-xs ${theme.textSecondary}`}>Categories</p>
                </div>
                <div className={`${theme.card} rounded-xl p-4 border-2 border-green-200 dark:border-green-800`}>
                  <p className={`text-2xl font-bold text-green-600 dark:text-green-400`}>
                    {progressMetrics.filter(m => m.percentage >= 80).length}
                  </p>
                  <p className={`text-xs ${theme.textSecondary}`}>Excellent</p>
                </div>
                <div className={`${theme.card} rounded-xl p-4 border-2 border-yellow-200 dark:border-yellow-800`}>
                  <p className={`text-2xl font-bold text-yellow-600 dark:text-yellow-400`}>
                    {progressMetrics.filter(m => m.percentage >= 60 && m.percentage < 80).length}
                  </p>
                  <p className={`text-xs ${theme.textSecondary}`}>Good</p>
                </div>
                <div className={`${theme.card} rounded-xl p-4 border-2 border-red-200 dark:border-red-800`}>
                  <p className={`text-2xl font-bold text-red-600 dark:text-red-400`}>
                    {progressMetrics.filter(m => m.percentage < 60).length}
                  </p>
                  <p className={`text-xs ${theme.textSecondary}`}>Needs Work</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="p-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl w-fit mx-auto mb-6">
              <BarChart3 className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className={`text-xl font-bold ${theme.text} mb-2`}>
              No progress data available
            </h3>
            <p className={`text-sm ${theme.textSecondary} mb-4`}>
              Start tracking your workouts, nutrition, and habits to see your progress here
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className={`${theme.primary} ${theme.shadow} rounded-xl`}>
                <Plus className="w-4 h-4 mr-2" />
                Start Tracking
              </Button>
              <Button variant="outline" className="rounded-xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
