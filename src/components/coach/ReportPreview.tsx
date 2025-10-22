'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Dumbbell,
  Apple,
  Heart,
  Award,
  MessageSquare,
  Edit,
  BarChart3,
  PieChart,
  LineChart,
  Calendar,
  User,
  Clock,
  Zap,
  CheckCircle,
  AlertCircle,
  Star,
  Flame
} from 'lucide-react'

interface ReportPreviewProps {
  clientData: {
    id: string
    name: string
    avatar: string
    program: string
    startDate: string
    lastActive: string
    metrics: {
      weight: number
      bodyFat: number
      strength: number
      endurance: number
      adherence: number
    }
  }
  selectedSections: string[]
  dateRange: string
  coachNotes: string
  isVisible: boolean
  onClose: () => void
}

export default function ReportPreview({ 
  clientData, 
  selectedSections, 
  dateRange, 
  coachNotes, 
  isVisible, 
  onClose 
}: ReportPreviewProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [currentPage, setCurrentPage] = useState(1)

  if (!isVisible) return null

  const getMetricColor = (value: number, type: 'weight' | 'bodyFat' | 'strength' | 'endurance' | 'adherence') => {
    if (type === 'weight' || type === 'bodyFat') {
      // For weight/body fat, lower is better
      return value <= 20 ? 'text-green-600 dark:text-green-400' : 
             value <= 30 ? 'text-orange-600 dark:text-orange-400' : 
             'text-red-600 dark:text-red-400'
    } else {
      // For strength, endurance, adherence, higher is better
      return value >= 90 ? 'text-green-600 dark:text-green-400' : 
             value >= 75 ? 'text-blue-600 dark:text-blue-400' : 
             value >= 60 ? 'text-orange-600 dark:text-orange-400' : 
             'text-red-600 dark:text-red-400'
    }
  }

  const getMetricBgColor = (value: number, type: 'weight' | 'bodyFat' | 'strength' | 'endurance' | 'adherence') => {
    if (type === 'weight' || type === 'bodyFat') {
      return value <= 20 ? 'bg-green-100 dark:bg-green-900/30' : 
             value <= 30 ? 'bg-orange-100 dark:bg-orange-900/30' : 
             'bg-red-100 dark:bg-red-900/30'
    } else {
      return value >= 90 ? 'bg-green-100 dark:bg-green-900/30' : 
             value >= 75 ? 'bg-blue-100 dark:bg-blue-900/30' : 
             value >= 60 ? 'bg-orange-100 dark:bg-orange-900/30' : 
             'bg-red-100 dark:bg-red-900/30'
    }
  }

  const renderExecutiveSummary = () => (
    <div className="space-y-6">
      {/* Client Header */}
      <div className="text-center py-8 border-b border-slate-200 dark:border-slate-700">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
          {clientData.avatar}
        </div>
        <h1 className={`text-3xl font-bold ${theme.text} mb-2`}>{clientData.name}</h1>
        <p className={`text-lg ${theme.textSecondary}`}>{clientData.program}</p>
        <div className="flex items-center justify-center gap-4 mt-4 text-sm text-slate-500">
          <span>Report Period: {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}</span>
          <span>Generated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`${theme.card} rounded-xl p-4 border-2 text-center`}>
          <div className={`w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center ${getMetricBgColor(clientData.metrics.adherence, 'adherence')}`}>
            <Target className={`w-6 h-6 ${getMetricColor(clientData.metrics.adherence, 'adherence')}`} />
          </div>
          <p className={`text-2xl font-bold ${getMetricColor(clientData.metrics.adherence, 'adherence')}`}>
            {clientData.metrics.adherence}%
          </p>
          <p className={`text-sm ${theme.textSecondary}`}>Adherence</p>
        </div>
        
        <div className={`${theme.card} rounded-xl p-4 border-2 text-center`}>
          <div className={`w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center ${getMetricBgColor(clientData.metrics.strength, 'strength')}`}>
            <Dumbbell className={`w-6 h-6 ${getMetricColor(clientData.metrics.strength, 'strength')}`} />
          </div>
          <p className={`text-2xl font-bold ${getMetricColor(clientData.metrics.strength, 'strength')}`}>
            {clientData.metrics.strength}%
          </p>
          <p className={`text-sm ${theme.textSecondary}`}>Strength</p>
        </div>
        
        <div className={`${theme.card} rounded-xl p-4 border-2 text-center`}>
          <div className={`w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center ${getMetricBgColor(clientData.metrics.endurance, 'endurance')}`}>
            <Heart className={`w-6 h-6 ${getMetricColor(clientData.metrics.endurance, 'endurance')}`} />
          </div>
          <p className={`text-2xl font-bold ${getMetricColor(clientData.metrics.endurance, 'endurance')}`}>
            {clientData.metrics.endurance}%
          </p>
          <p className={`text-sm ${theme.textSecondary}`}>Endurance</p>
        </div>
        
        <div className={`${theme.card} rounded-xl p-4 border-2 text-center`}>
          <div className={`w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center ${getMetricBgColor(clientData.metrics.bodyFat, 'bodyFat')}`}>
            <Activity className={`w-6 h-6 ${getMetricColor(clientData.metrics.bodyFat, 'bodyFat')}`} />
          </div>
          <p className={`text-2xl font-bold ${getMetricColor(clientData.metrics.bodyFat, 'bodyFat')}`}>
            {clientData.metrics.bodyFat}%
          </p>
          <p className={`text-sm ${theme.textSecondary}`}>Body Fat</p>
        </div>
      </div>

      {/* Summary Text */}
      <div className={`${theme.card} rounded-xl p-6 border-2`}>
        <h3 className={`text-xl font-semibold ${theme.text} mb-3`}>Executive Summary</h3>
        <p className={`${theme.textSecondary} leading-relaxed`}>
          {clientData.name} has shown excellent progress in their {clientData.program.toLowerCase()}. 
          With an adherence rate of {clientData.metrics.adherence}%, they have consistently engaged with their program. 
          Their strength metrics at {clientData.metrics.strength}% and endurance at {clientData.metrics.endurance}% 
          demonstrate significant improvement since starting the program on {new Date(clientData.startDate).toLocaleDateString()}.
        </p>
      </div>
    </div>
  )

  const renderMetricsOverview = () => (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${theme.text} mb-6`}>Metrics Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${theme.card} rounded-xl p-6 border-2`}>
          <h3 className={`text-lg font-semibold ${theme.text} mb-4`}>Physical Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${theme.text}`}>Weight</span>
                <span className={`text-sm font-bold ${getMetricColor(clientData.metrics.weight, 'weight')}`}>
                  {clientData.metrics.weight} lbs
                </span>
              </div>
              <Progress value={clientData.metrics.weight} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${theme.text}`}>Body Fat</span>
                <span className={`text-sm font-bold ${getMetricColor(clientData.metrics.bodyFat, 'bodyFat')}`}>
                  {clientData.metrics.bodyFat}%
                </span>
              </div>
              <Progress value={clientData.metrics.bodyFat} className="h-2" />
            </div>
          </div>
        </div>
        
        <div className={`${theme.card} rounded-xl p-6 border-2`}>
          <h3 className={`text-lg font-semibold ${theme.text} mb-4`}>Performance Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${theme.text}`}>Strength</span>
                <span className={`text-sm font-bold ${getMetricColor(clientData.metrics.strength, 'strength')}`}>
                  {clientData.metrics.strength}%
                </span>
              </div>
              <Progress value={clientData.metrics.strength} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${theme.text}`}>Endurance</span>
                <span className={`text-sm font-bold ${getMetricColor(clientData.metrics.endurance, 'endurance')}`}>
                  {clientData.metrics.endurance}%
                </span>
              </div>
              <Progress value={clientData.metrics.endurance} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderWorkoutAnalytics = () => (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${theme.text} mb-6`}>Workout Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${theme.card} rounded-xl p-6 border-2 text-center`}>
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>Strength Training</h3>
          <p className={`text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2`}>85%</p>
          <p className={`text-sm ${theme.textSecondary}`}>Completion Rate</p>
        </div>
        
        <div className={`${theme.card} rounded-xl p-6 border-2 text-center`}>
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>Cardio</h3>
          <p className={`text-3xl font-bold text-green-600 dark:text-green-400 mb-2`}>92%</p>
          <p className={`text-sm ${theme.textSecondary}`}>Completion Rate</p>
        </div>
        
        <div className={`${theme.card} rounded-xl p-6 border-2 text-center`}>
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>Flexibility</h3>
          <p className={`text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2`}>78%</p>
          <p className={`text-sm ${theme.textSecondary}`}>Completion Rate</p>
        </div>
      </div>
    </div>
  )

  const renderAchievements = () => (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${theme.text} mb-6`}>Achievements</h2>
      
      <div className="space-y-4">
        <div className={`${theme.card} rounded-xl p-4 border-2 border-green-200 dark:border-green-800`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${theme.text}`}>Weight Loss Milestone</h3>
              <p className={`text-sm ${theme.textSecondary}`}>Lost 10 lbs in 8 weeks</p>
            </div>
            <Badge className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-0">
              Achieved
            </Badge>
          </div>
        </div>
        
        <div className={`${theme.card} rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Star className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${theme.text}`}>Consistency Streak</h3>
              <p className={`text-sm ${theme.textSecondary}`}>30 days of consistent workouts</p>
            </div>
            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0">
              Active
            </Badge>
          </div>
        </div>
        
        <div className={`${theme.card} rounded-xl p-4 border-2 border-purple-200 dark:border-purple-800`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Flame className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${theme.text}`}>Personal Best</h3>
              <p className={`text-sm ${theme.textSecondary}`}>New bench press record: 185 lbs</p>
            </div>
            <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-0">
              New Record
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCoachNotes = () => (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${theme.text} mb-6`}>Coach Notes</h2>
      
      <div className={`${theme.card} rounded-xl p-6 border-2`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Edit className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className={`text-lg font-semibold ${theme.text}`}>Personalized Insights</h3>
        </div>
        <div className={`${theme.card} rounded-xl p-4 border-2 bg-slate-50 dark:bg-slate-800`}>
          <p className={`${theme.textSecondary} leading-relaxed`}>
            {coachNotes || "No coach notes provided for this report."}
          </p>
        </div>
      </div>
    </div>
  )

  const renderPage = () => {
    switch (currentPage) {
      case 1: return renderExecutiveSummary()
      case 2: return renderMetricsOverview()
      case 3: return renderWorkoutAnalytics()
      case 4: return renderAchievements()
      case 5: return renderCoachNotes()
      default: return renderExecutiveSummary()
    }
  }

  const totalPages = Math.ceil(selectedSections.length / 2) + 1

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${theme.text}`}>Report Preview</h2>
              <p className={`text-sm ${theme.textSecondary}`}>{clientData.name} - {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)} Report</p>
            </div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {renderPage()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-sm ${theme.textSecondary}`}>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i + 1 === currentPage ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
