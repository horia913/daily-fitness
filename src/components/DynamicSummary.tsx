'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Clock, 
  Dumbbell, 
  Heart, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Share2,
  Star,
  Award,
  Lightbulb,
  AlertTriangle,
  ThumbsUp,
  Calendar,
  BarChart3,
  Users,
  MessageCircle
} from 'lucide-react'
import { 
  DynamicSummaryGenerator, 
  DynamicSummary, 
  WorkoutData, 
  UserProfile, 
  WorkoutComparison,
  SummaryInsight 
} from '@/lib/dynamicSummary'

interface DynamicSummaryProps {
  workoutData: WorkoutData
  userProfile: UserProfile
  comparison?: WorkoutComparison
  onShare?: () => void
  onViewProgress?: () => void
  onScheduleNext?: () => void
  className?: string
}

export function DynamicSummaryComponent({
  workoutData,
  userProfile,
  comparison,
  onShare,
  onViewProgress,
  onScheduleNext,
  className = ''
}: DynamicSummaryProps) {
  const [summary, setSummary] = useState<DynamicSummary | null>(null)
  const [isGenerating, setIsGenerating] = useState(true)

  useEffect(() => {
    const generateSummary = async () => {
      setIsGenerating(true)
      
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const generatedSummary = DynamicSummaryGenerator.generateSummary(
        workoutData,
        userProfile,
        comparison
      )
      
      setSummary(generatedSummary)
      setIsGenerating(false)
    }

    generateSummary()
  }, [workoutData, userProfile, comparison])

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'great': return 'text-green-600 bg-green-50 border-green-200'
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'fair': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPerformanceIcon = (rating: string) => {
    switch (rating) {
      case 'excellent': return <Trophy className="w-6 h-6" />
      case 'great': return <Award className="w-6 h-6" />
      case 'good': return <Star className="w-6 h-6" />
      case 'fair': return <ThumbsUp className="w-6 h-6" />
      default: return <Target className="w-6 h-6" />
    }
  }

  const InsightCard = ({ insight }: { insight: SummaryInsight }) => {
    const getInsightIcon = () => {
      switch (insight.type) {
        case 'achievement': return <Trophy className="w-5 h-5" />
        case 'improvement': return <TrendingUp className="w-5 h-5" />
        case 'recommendation': return <Lightbulb className="w-5 h-5" />
        case 'motivation': return <Zap className="w-5 h-5" />
        case 'warning': return <AlertTriangle className="w-5 h-5" />
        default: return <CheckCircle className="w-5 h-5" />
      }
    }

    return (
      <Card className={`border-l-4 ${insight.color}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`${insight.color} mt-1`}>
              {getInsightIcon()}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 mb-1">{insight.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
              {insight.actionable && insight.actionText && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insight.actionUrl && window.open(insight.actionUrl)}
                  className="text-xs"
                >
                  {insight.actionText}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isGenerating) {
    return (
      <Card className={`w-full max-w-4xl mx-auto ${className}`}>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <BarChart3 className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Generating Your Summary</h3>
            <p className="text-gray-600">Analyzing your workout performance...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) return null

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-800 mb-2">{summary.greeting}</h1>
            <p className="text-blue-600 text-lg">{summary.motivationalMessage}</p>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <Card className={`${getPerformanceColor(summary.overallPerformance.rating)}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {getPerformanceIcon(summary.overallPerformance.rating)}
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{summary.overallPerformance.score}/100</div>
              <div className="text-sm opacity-75">Overall Score</div>
            </div>
            <div className="flex-1 mx-4">
              <Progress value={summary.overallPerformance.score} className="h-3" />
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {summary.overallPerformance.rating.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm">{summary.overallPerformance.description}</p>
        </CardContent>
      </Card>

      {/* Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Today's Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.highlights.map((highlight, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">{highlight}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {summary.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-purple-500" />
              Personalized Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-800">{summary.stats.duration}</div>
            <div className="text-xs text-gray-500">Duration</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Dumbbell className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-800">{summary.stats.exercisesCompleted}</div>
            <div className="text-xs text-gray-500">Exercises</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Target className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-800">{summary.stats.totalVolume}</div>
            <div className="text-xs text-gray-500">Volume</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Heart className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-800">{summary.stats.averageRPE}</div>
            <div className="text-xs text-gray-500">Avg RPE</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-800">{summary.stats.consistency}</div>
            <div className="text-xs text-gray-500">Complete</div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.nextSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-blue-800">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        {onShare && (
          <Button onClick={onShare} variant="outline" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share Achievement
          </Button>
        )}
        {onViewProgress && (
          <Button onClick={onViewProgress} variant="outline" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            View Progress
          </Button>
        )}
        {onScheduleNext && (
          <Button onClick={onScheduleNext} className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Next Workout
          </Button>
        )}
      </div>
    </div>
  )
}

// Hook for managing dynamic summary state
export function useDynamicSummary() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [summary, setSummary] = useState<DynamicSummary | null>(null)

  const generateSummary = async (
    workoutData: WorkoutData,
    userProfile: UserProfile,
    comparison?: WorkoutComparison
  ) => {
    setIsGenerating(true)
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const generatedSummary = DynamicSummaryGenerator.generateSummary(
        workoutData,
        userProfile,
        comparison
      )
      
      setSummary(generatedSummary)
      return generatedSummary
    } finally {
      setIsGenerating(false)
    }
  }

  const clearSummary = () => {
    setSummary(null)
  }

  return {
    summary,
    isGenerating,
    generateSummary,
    clearSummary
  }
}
