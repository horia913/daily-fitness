'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  FileText,
  TrendingUp,
  BarChart3,
  User,
  Target,
  Dumbbell,
  Apple,
  Heart,
  Activity,
  Award,
  MessageSquare,
  Edit,
  CheckCircle,
  Star,
  Zap,
  Settings,
  Eye,
  Copy,
  Download
} from 'lucide-react'

interface ReportTemplate {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  sections: string[]
  isPopular?: boolean
  isCustom?: boolean
}

interface ReportTemplateSelectorProps {
  templates: ReportTemplate[]
  selectedTemplate: string
  onTemplateSelect: (templateId: string) => void
  onCustomize: (templateId: string) => void
  onPreview: (templateId: string) => void
}

export default function ReportTemplateSelector({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onCustomize,
  onPreview
}: ReportTemplateSelectorProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const getTemplateColor = (color: string) => {
    switch (color) {
      case 'blue': return 'fc-text-workouts'
      case 'green': return 'fc-text-success'
      case 'purple': return 'fc-text-workouts'
      case 'orange': return 'fc-text-warning'
      default: return 'fc-text-dim'
    }
  }

  const getTemplateBgColor = (color: string) => {
    switch (color) {
      case 'blue': return 'fc-glass-soft'
      case 'green': return 'fc-glass-soft'
      case 'purple': return 'fc-glass-soft'
      case 'orange': return 'fc-glass-soft'
      default: return 'fc-glass-soft'
    }
  }

  const getSectionIcon = (sectionId: string) => {
    switch (sectionId) {
      case 'executive-summary': return Target
      case 'metrics-overview': return Activity
      case 'workout-analytics': return Dumbbell
      case 'nutrition-tracking': return Apple
      case 'engagement-metrics': return Heart
      case 'goal-progress': return Target
      case 'achievements': return Award
      case 'trend-analysis': return TrendingUp
      case 'recommendations': return MessageSquare
      case 'coach-notes': return Edit
      default: return FileText
    }
  }

  const getSectionName = (sectionId: string) => {
    switch (sectionId) {
      case 'executive-summary': return 'Executive Summary'
      case 'metrics-overview': return 'Metrics Overview'
      case 'workout-analytics': return 'Workout Analytics'
      case 'nutrition-tracking': return 'Nutrition Tracking'
      case 'engagement-metrics': return 'Engagement Metrics'
      case 'goal-progress': return 'Goal Progress'
      case 'achievements': return 'Achievements'
      case 'trend-analysis': return 'Trend Analysis'
      case 'recommendations': return 'Recommendations'
      case 'coach-notes': return 'Coach Notes'
      default: return sectionId
    }
  }

  return (
    <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
      <div className="p-6 pb-4 border-b border-[color:var(--fc-glass-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Reports
              </span>
              <h2 className="text-lg font-semibold fc-text-primary mt-2">
                Report Templates
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'fc-btn fc-btn-primary' : 'fc-btn fc-btn-secondary'}
            >
              Grid
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'fc-btn fc-btn-primary' : 'fc-btn fc-btn-secondary'}
            >
              List
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => {
              const Icon = template.icon
              const isSelected = selectedTemplate === template.id
              
              return (
                <div
                  key={template.id}
                  className={`fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)] cursor-pointer transition-all duration-300 ${
                    isSelected ? 'ring-1 ring-[color:var(--fc-domain-workouts)]' : ''
                  }`}
                  onClick={() => onTemplateSelect(template.id)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`fc-icon-tile fc-icon-workouts ${getTemplateBgColor(template.color)}`}>
                      <Icon className={`w-5 h-5 ${getTemplateColor(template.color)}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold fc-text-primary">{template.name}</h3>
                        {template.isPopular && (
                          <span className="fc-pill fc-pill-glass fc-text-warning text-xs">
                            Popular
                          </span>
                        )}
                        {template.isCustom && (
                          <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                            Custom
                          </span>
                        )}
                        {isSelected && (
                          <span className="fc-pill fc-pill-glass fc-text-success text-xs">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm fc-text-dim">{template.description}</p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-xs fc-text-subtle mb-2">
                      Includes {template.sections.length} sections:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.sections.slice(0, 3).map(sectionId => {
                        const SectionIcon = getSectionIcon(sectionId)
                        return (
                          <div key={sectionId} className="flex items-center gap-1 px-2 py-1 fc-glass border border-[color:var(--fc-glass-border)] rounded text-xs">
                            <SectionIcon className="w-3 h-3" />
                            <span>{getSectionName(sectionId)}</span>
                          </div>
                        )
                      })}
                      {template.sections.length > 3 && (
                        <div className="px-2 py-1 fc-glass border border-[color:var(--fc-glass-border)] rounded text-xs">
                          +{template.sections.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs fc-text-subtle">
                      {template.sections.length} sections included
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onPreview(template.id)
                        }}
                        className="fc-btn fc-btn-secondary"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCustomize(template.id)
                        }}
                        className="fc-btn fc-btn-secondary"
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(template => {
              const Icon = template.icon
              const isSelected = selectedTemplate === template.id
              
              return (
                <div
                  key={template.id}
                  className={`fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)] cursor-pointer transition-all duration-300 ${
                    isSelected ? 'ring-1 ring-[color:var(--fc-domain-workouts)]' : ''
                  }`}
                  onClick={() => onTemplateSelect(template.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`fc-icon-tile fc-icon-workouts ${getTemplateBgColor(template.color)}`}>
                      <Icon className={`w-6 h-6 ${getTemplateColor(template.color)}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold fc-text-primary">{template.name}</h3>
                        {template.isPopular && (
                          <span className="fc-pill fc-pill-glass fc-text-warning text-xs">
                            Popular
                          </span>
                        )}
                        {template.isCustom && (
                          <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                            Custom
                          </span>
                        )}
                        {isSelected && (
                          <span className="fc-pill fc-pill-glass fc-text-success text-xs">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm fc-text-dim mb-2">{template.description}</p>
                      <div className="flex items-center gap-4 text-xs fc-text-subtle">
                        <span>{template.sections.length} sections</span>
                        <span>•</span>
                        <span>Last used: 2 days ago</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onPreview(template.id)
                        }}
                        className="fc-btn fc-btn-secondary"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCustomize(template.id)
                        }}
                        className="fc-btn fc-btn-secondary"
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Customize
                      </Button>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 fc-text-success" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
