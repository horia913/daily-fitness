'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
  const [currentPage, setCurrentPage] = useState(1)

  if (!isVisible) return null

  const getMetricColor = (value: number, type: 'weight' | 'bodyFat' | 'strength' | 'endurance' | 'adherence') => {
    if (type === 'weight' || type === 'bodyFat') {
      // For weight/body fat, lower is better
      return value <= 20 ? 'fc-text-success' : 
             value <= 30 ? 'fc-text-warning' : 
             'fc-text-error'
    } else {
      // For strength, endurance, adherence, higher is better
      return value >= 90 ? 'fc-text-success' : 
             value >= 75 ? 'fc-text-workouts' : 
             value >= 60 ? 'fc-text-warning' : 
             'fc-text-error'
    }
  }

  const renderExecutiveSummary = () => (
    <div className="space-y-6">
      {/* Client Header */}
      <div className="text-center py-8 border-b border-[color:var(--fc-glass-border)]">
        <div className="w-20 h-20 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-full flex items-center justify-center text-2xl font-bold fc-text-primary mx-auto mb-4">
          {clientData.avatar}
        </div>
        <h1 className="text-3xl font-bold fc-text-primary mb-2">{clientData.name}</h1>
        <p className="text-lg fc-text-dim">{clientData.program}</p>
        <div className="flex items-center justify-center gap-4 mt-4 text-sm fc-text-subtle">
          <span>Report Period: {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}</span>
          <span>Generated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)] text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <Target className={`w-6 h-6 ${getMetricColor(clientData.metrics.adherence, 'adherence')}`} />
          </div>
          <p className={`text-2xl font-bold ${getMetricColor(clientData.metrics.adherence, 'adherence')}`}>
            {clientData.metrics.adherence}%
          </p>
          <p className="text-sm fc-text-dim">Adherence</p>
        </div>
        
        <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)] text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <Dumbbell className={`w-6 h-6 ${getMetricColor(clientData.metrics.strength, 'strength')}`} />
          </div>
          <p className={`text-2xl font-bold ${getMetricColor(clientData.metrics.strength, 'strength')}`}>
            {clientData.metrics.strength}%
          </p>
          <p className="text-sm fc-text-dim">Strength</p>
        </div>
        
        <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)] text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <Heart className={`w-6 h-6 ${getMetricColor(clientData.metrics.endurance, 'endurance')}`} />
          </div>
          <p className={`text-2xl font-bold ${getMetricColor(clientData.metrics.endurance, 'endurance')}`}>
            {clientData.metrics.endurance}%
          </p>
          <p className="text-sm fc-text-dim">Endurance</p>
        </div>
        
        <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)] text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <Activity className={`w-6 h-6 ${getMetricColor(clientData.metrics.bodyFat, 'bodyFat')}`} />
          </div>
          <p className={`text-2xl font-bold ${getMetricColor(clientData.metrics.bodyFat, 'bodyFat')}`}>
            {clientData.metrics.bodyFat}%
          </p>
          <p className="text-sm fc-text-dim">Body Fat</p>
        </div>
      </div>

      {/* Summary Text */}
      <div className="fc-glass-soft rounded-2xl p-6 border border-[color:var(--fc-glass-border)]">
        <h3 className="text-xl font-semibold fc-text-primary mb-3">Executive Summary</h3>
        <p className="fc-text-dim leading-relaxed">
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
      <h2 className="text-2xl font-bold fc-text-primary mb-6">Metrics Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="fc-glass-soft rounded-2xl p-6 border border-[color:var(--fc-glass-border)]">
          <h3 className="text-lg font-semibold fc-text-primary mb-4">Physical Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium fc-text-primary">Weight</span>
                <span className={`text-sm font-bold ${getMetricColor(clientData.metrics.weight, 'weight')}`}>
                  {clientData.metrics.weight} lbs
                </span>
              </div>
              <div className="h-2 fc-progress-track">
                <div
                  className="h-full fc-progress-fill"
                  style={{ width: `${clientData.metrics.weight}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium fc-text-primary">Body Fat</span>
                <span className={`text-sm font-bold ${getMetricColor(clientData.metrics.bodyFat, 'bodyFat')}`}>
                  {clientData.metrics.bodyFat}%
                </span>
              </div>
              <div className="h-2 fc-progress-track">
                <div
                  className="h-full fc-progress-fill"
                  style={{ width: `${clientData.metrics.bodyFat}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="fc-glass-soft rounded-2xl p-6 border border-[color:var(--fc-glass-border)]">
          <h3 className="text-lg font-semibold fc-text-primary mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium fc-text-primary">Strength</span>
                <span className={`text-sm font-bold ${getMetricColor(clientData.metrics.strength, 'strength')}`}>
                  {clientData.metrics.strength}%
                </span>
              </div>
              <div className="h-2 fc-progress-track">
                <div
                  className="h-full fc-progress-fill"
                  style={{ width: `${clientData.metrics.strength}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium fc-text-primary">Endurance</span>
                <span className={`text-sm font-bold ${getMetricColor(clientData.metrics.endurance, 'endurance')}`}>
                  {clientData.metrics.endurance}%
                </span>
              </div>
              <div className="h-2 fc-progress-track">
                <div
                  className="h-full fc-progress-fill"
                  style={{ width: `${clientData.metrics.endurance}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderWorkoutAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold fc-text-primary mb-6">Workout Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="fc-glass-soft rounded-2xl p-6 border border-[color:var(--fc-glass-border)] text-center">
          <div className="w-16 h-16 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 fc-text-workouts" />
          </div>
          <h3 className="text-lg font-semibold fc-text-primary mb-2">Strength Training</h3>
          <p className="text-3xl font-bold fc-text-workouts mb-2">85%</p>
          <p className="text-sm fc-text-dim">Completion Rate</p>
        </div>
        
        <div className="fc-glass-soft rounded-2xl p-6 border border-[color:var(--fc-glass-border)] text-center">
          <div className="w-16 h-16 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 fc-text-success" />
          </div>
          <h3 className="text-lg font-semibold fc-text-primary mb-2">Cardio</h3>
          <p className="text-3xl font-bold fc-text-success mb-2">92%</p>
          <p className="text-sm fc-text-dim">Completion Rate</p>
        </div>
        
        <div className="fc-glass-soft rounded-2xl p-6 border border-[color:var(--fc-glass-border)] text-center">
          <div className="w-16 h-16 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 fc-text-workouts" />
          </div>
          <h3 className="text-lg font-semibold fc-text-primary mb-2">Flexibility</h3>
          <p className="text-3xl font-bold fc-text-workouts mb-2">78%</p>
          <p className="text-sm fc-text-dim">Completion Rate</p>
        </div>
      </div>
    </div>
  )

  const renderAchievements = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold fc-text-primary mb-6">Achievements</h2>
      
      <div className="space-y-4">
        <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Award className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold fc-text-primary">Weight Loss Milestone</h3>
              <p className="text-sm fc-text-dim">Lost 10 lbs in 8 weeks</p>
            </div>
            <span className="fc-pill fc-pill-glass fc-text-success text-xs">
              Achieved
            </span>
          </div>
        </div>
        
        <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Star className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold fc-text-primary">Consistency Streak</h3>
              <p className="text-sm fc-text-dim">30 days of consistent workouts</p>
            </div>
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
              Active
            </span>
          </div>
        </div>
        
        <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Flame className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold fc-text-primary">Personal Best</h3>
              <p className="text-sm fc-text-dim">New bench press record: 185 lbs</p>
            </div>
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
              New Record
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCoachNotes = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold fc-text-primary mb-6">Coach Notes</h2>
      
      <div className="fc-glass-soft rounded-2xl p-6 border border-[color:var(--fc-glass-border)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="fc-icon-tile fc-icon-workouts">
            <Edit className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold fc-text-primary">Personalized Insights</h3>
        </div>
        <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
          <p className="fc-text-dim leading-relaxed">
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="fc-modal fc-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Report preview
              </span>
              <h2 className="text-xl font-bold fc-text-primary mt-2">Report Preview</h2>
              <p className="text-sm fc-text-dim">
                {clientData.name} - {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)} Report
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onClose} className="fc-btn fc-btn-secondary">
            Close
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {renderPage()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="fc-btn fc-btn-secondary"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="fc-btn fc-btn-secondary"
            >
              Next
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm fc-text-subtle">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i + 1 === currentPage ? 'bg-[color:var(--fc-domain-workouts)]' : 'bg-[color:var(--fc-glass-border)]'
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
