'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  Trophy, 
  Target, 
  Zap, 
  Heart, 
  Star, 
  Award, 
  CheckCircle, 
  ArrowRight, 
  Share2, 
  MessageCircle, 
  Calendar, 
  BarChart3, 
  Sparkles, 
  Flame, 
  Crown, 
  Rocket, 
  Diamond, 
  Sun, 
  Moon, 
  Rainbow, 
  Gift, 
  ThumbsUp, 
  AlertTriangle, 
  RefreshCw,
  Eye,
  ExternalLink,
  Plus,
  Minus,
  Equal
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { analyzeWorkoutTrends } from '@/lib/progressInsights'

interface DynamicInsight {
  id: string
  type: 'achievement' | 'improvement' | 'recommendation' | 'motivation' | 'warning' | 'trend' | 'milestone'
  category: 'workout' | 'nutrition' | 'consistency' | 'strength' | 'recovery' | 'progress'
  title: string
  description: string
  value?: string | number
  change?: number
  changeType?: 'increase' | 'decrease' | 'stable'
  priority: 'high' | 'medium' | 'low'
  actionable: boolean
  actionText?: string
  actionUrl?: string
  icon: string
  color: string
  gradient: string
  animation?: 'pulse' | 'bounce' | 'glow' | 'none'
  createdAt: string
  expiresAt?: string
}

interface DynamicInsightsProps {
  insights?: DynamicInsight[]
  loading?: boolean
  onShare?: (insight: DynamicInsight) => void
  onAction?: (insight: DynamicInsight) => void
  onRefresh?: () => void
  className?: string
}

export function DynamicInsights({ 
  insights = [], 
  loading = false, 
  onShare, 
  onAction, 
  onRefresh,
  className = '' 
}: DynamicInsightsProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showExpired, setShowExpired] = useState(false)

  // Generate mock insights if none provided
  const mockInsights: DynamicInsight[] = [
    {
      id: '1',
      type: 'achievement',
      category: 'workout',
      title: 'Workout Streak Champion!',
      description: 'You\'ve completed 7 workouts in a row - your longest streak this month!',
      value: '7 days',
      change: 3,
      changeType: 'increase',
      priority: 'high',
      actionable: true,
      actionText: 'Keep the momentum',
      actionUrl: '/client/workouts',
      icon: '🔥',
      color: 'text-orange-600',
      gradient: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
      animation: 'pulse',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      type: 'improvement',
      category: 'strength',
      title: 'Strength Gains Detected!',
      description: 'Your bench press has improved by 12.5kg over the past month.',
      value: '+12.5kg',
      change: 12.5,
      changeType: 'increase',
      priority: 'high',
      actionable: true,
      actionText: 'View progress',
      actionUrl: '/client/progress',
      icon: '💪',
      color: 'text-green-600',
      gradient: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
      animation: 'glow',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      type: 'recommendation',
      category: 'recovery',
      title: 'Recovery Optimization',
      description: 'Your sleep quality has improved 15% this week. Consider adding meditation.',
      value: '+15%',
      change: 15,
      changeType: 'increase',
      priority: 'medium',
      actionable: true,
      actionText: 'Learn more',
      actionUrl: '/client/recovery',
      icon: '🧘',
      color: 'text-purple-600',
      gradient: 'from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
      animation: 'none',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      type: 'milestone',
      category: 'progress',
      title: 'Monthly Goal Achieved!',
      description: 'You\'ve completed 20 workouts this month - exceeding your goal of 16!',
      value: '125%',
      change: 25,
      changeType: 'increase',
      priority: 'high',
      actionable: true,
      actionText: 'Set new goal',
      actionUrl: '/client/goals',
      icon: '🎯',
      color: 'text-blue-600',
      gradient: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
      animation: 'bounce',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5',
      type: 'trend',
      category: 'consistency',
      title: 'Consistency Trend Up!',
      description: 'Your workout consistency has improved by 8% over the past 2 weeks.',
      value: '+8%',
      change: 8,
      changeType: 'increase',
      priority: 'medium',
      actionable: false,
      icon: '📈',
      color: 'text-indigo-600',
      gradient: 'from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20',
      animation: 'none',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]

  const displayInsights = insights.length > 0 ? insights : mockInsights

  // Filter insights by category
  const filteredInsights = selectedCategory 
    ? displayInsights.filter(insight => insight.category === selectedCategory)
    : displayInsights

  // Get unique categories
  const categories = Array.from(new Set(displayInsights.map(insight => insight.category)))

  const getInsightIcon = (insight: DynamicInsight) => {
    switch (insight.type) {
      case 'achievement': return <Trophy className="w-6 h-6" />
      case 'improvement': return <TrendingUp className="w-6 h-6" />
      case 'recommendation': return <Lightbulb className="w-6 h-6" />
      case 'motivation': return <Zap className="w-6 h-6" />
      case 'warning': return <AlertTriangle className="w-6 h-6" />
      case 'trend': return <BarChart3 className="w-6 h-6" />
      case 'milestone': return <Target className="w-6 h-6" />
      default: return <Brain className="w-6 h-6" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'workout': return <Dumbbell className="w-4 h-4" />
      case 'nutrition': return <Heart className="w-4 h-4" />
      case 'consistency': return <CheckCircle className="w-4 h-4" />
      case 'strength': return <Zap className="w-4 h-4" />
      case 'recovery': return <Moon className="w-4 h-4" />
      case 'progress': return <TrendingUp className="w-4 h-4" />
      default: return <Star className="w-4 h-4" />
    }
  }

  const getChangeIcon = (changeType?: string) => {
    switch (changeType) {
      case 'increase': return <ArrowUp className="w-4 h-4 text-green-500" />
      case 'decrease': return <ArrowDown className="w-4 h-4 text-red-500" />
      case 'stable': return <Equal className="w-4 h-4 text-blue-500" />
      default: return null
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return `${Math.floor(diffInDays / 7)}w ago`
  }

  if (loading) {
    return (
      <Card className={cn("rounded-3xl shadow-lg border-0 overflow-hidden", isDark ? "bg-slate-800/50" : "bg-white")}>
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">Dynamic Insights</CardTitle>
                <p className="text-slate-600 dark:text-slate-400">AI-powered progress analysis</p>
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
            
            {/* Insight cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-slate-200 dark:bg-slate-700 rounded-2xl p-6 h-32"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("rounded-3xl shadow-lg border-0 overflow-hidden", isDark ? "bg-slate-800/50" : "bg-white", className)}>
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">Dynamic Insights</CardTitle>
              <p className="text-slate-600 dark:text-slate-400">
                {filteredInsights.length} insight{filteredInsights.length !== 1 ? 's' : ''} • AI-powered progress analysis
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
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

        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "rounded-xl whitespace-nowrap",
                  selectedCategory === null 
                    ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                All Insights
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "rounded-xl whitespace-nowrap",
                    selectedCategory === category 
                      ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white" 
                      : "hover:bg-slate-100 dark:hover:bg-slate-700"
                  )}
                >
                  {getCategoryIcon(category)}
                  <span className="ml-1 capitalize">{category}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6 pt-0">
        {filteredInsights.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Brain className="w-12 h-12 text-purple-500 dark:text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              No Insights Yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto text-lg">
              Complete a few workouts to start receiving personalized insights and recommendations!
            </p>
            <Button 
              onClick={onRefresh}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-2xl px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Generate Insights
            </Button>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
              : "space-y-4"
          )}>
            {filteredInsights.map((insight) => (
              <InsightCard 
                key={insight.id} 
                insight={insight}
                viewMode={viewMode}
                onShare={() => onShare?.(insight)}
                onAction={() => onAction?.(insight)}
                getInsightIcon={getInsightIcon}
                getChangeIcon={getChangeIcon}
                getPriorityColor={getPriorityColor}
                formatTimeAgo={formatTimeAgo}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Individual Insight Card Component
function InsightCard({ 
  insight, 
  viewMode, 
  onShare, 
  onAction, 
  getInsightIcon, 
  getChangeIcon, 
  getPriorityColor, 
  formatTimeAgo 
}: {
  insight: DynamicInsight
  viewMode: 'grid' | 'list'
  onShare: () => void
  onAction: () => void
  getInsightIcon: (insight: DynamicInsight) => React.ReactNode
  getChangeIcon: (changeType?: string) => React.ReactNode
  getPriorityColor: (priority: string) => string
  formatTimeAgo: (dateString: string) => string
}) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [isHovered, setIsHovered] = useState(false)

  const cardClasses = cn(
    "rounded-2xl p-6 transition-all duration-300 cursor-pointer",
    `bg-gradient-to-r ${insight.gradient}`,
    "border border-slate-200 dark:border-slate-700",
    "hover:shadow-xl hover:scale-[1.02]",
    isHovered && "shadow-lg",
    insight.animation === 'pulse' && "animate-pulse",
    insight.animation === 'bounce' && "animate-bounce",
    insight.animation === 'glow' && "shadow-lg shadow-purple-500/25"
  )

  return (
    <div 
      className={cardClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", insight.color)}>
            {getInsightIcon(insight)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
              {insight.title}
            </h3>
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", getPriorityColor(insight.priority))}>
                {insight.priority}
              </Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatTimeAgo(insight.createdAt)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {insight.value && (
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {insight.value}
              </div>
              {insight.change && (
                <div className="flex items-center gap-1 text-sm">
                  {getChangeIcon(insight.changeType)}
                  <span className={cn(
                    insight.changeType === 'increase' ? 'text-green-600' :
                    insight.changeType === 'decrease' ? 'text-red-600' :
                    'text-blue-600'
                  )}>
                    {insight.change > 0 ? '+' : ''}{insight.change}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
        {insight.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {insight.actionable && insight.actionText && (
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl"
              onClick={onAction}
            >
              {insight.actionText}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={onShare}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Missing ArrowUp and ArrowDown components - let's add them
const ArrowUp = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
)

const ArrowDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
)

const Dumbbell = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)
