'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
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
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const getTemplateColor = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-600 dark:text-blue-400'
      case 'green': return 'text-green-600 dark:text-green-400'
      case 'purple': return 'text-purple-600 dark:text-purple-400'
      case 'orange': return 'text-orange-600 dark:text-orange-400'
      default: return 'text-slate-600 dark:text-slate-400'
    }
  }

  const getTemplateBgColor = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 dark:bg-blue-900/30'
      case 'green': return 'bg-green-100 dark:bg-green-900/30'
      case 'purple': return 'bg-purple-100 dark:bg-purple-900/30'
      case 'orange': return 'bg-orange-100 dark:bg-orange-900/30'
      default: return 'bg-slate-100 dark:bg-slate-800'
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
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            Report Templates
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => {
              const Icon = template.icon
              const isSelected = selectedTemplate === template.id
              
              return (
                <div
                  key={template.id}
                  className={`${theme.card} rounded-xl p-4 border-2 cursor-pointer transition-all duration-300 ${
                    isSelected 
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  onClick={() => onTemplateSelect(template.id)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : getTemplateBgColor(template.color)
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        isSelected ? 'text-blue-600 dark:text-blue-400' : getTemplateColor(template.color)
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${theme.text}`}>{template.name}</h3>
                        {template.isPopular && (
                          <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-0 text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                        {template.isCustom && (
                          <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-0 text-xs">
                            Custom
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0 text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${theme.textSecondary}`}>{template.description}</p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className={`text-xs ${theme.textSecondary} mb-2`}>
                      Includes {template.sections.length} sections:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.sections.slice(0, 3).map(sectionId => {
                        const SectionIcon = getSectionIcon(sectionId)
                        return (
                          <div key={sectionId} className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs">
                            <SectionIcon className="w-3 h-3" />
                            <span>{getSectionName(sectionId)}</span>
                          </div>
                        )
                      })}
                      {template.sections.length > 3 && (
                        <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs">
                          +{template.sections.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${theme.textSecondary}`}>
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
                  className={`${theme.card} rounded-xl p-4 border-2 cursor-pointer transition-all duration-300 ${
                    isSelected 
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  onClick={() => onTemplateSelect(template.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${
                      isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : getTemplateBgColor(template.color)
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        isSelected ? 'text-blue-600 dark:text-blue-400' : getTemplateColor(template.color)
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${theme.text}`}>{template.name}</h3>
                        {template.isPopular && (
                          <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-0 text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                        {template.isCustom && (
                          <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-0 text-xs">
                            Custom
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0 text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${theme.textSecondary} mb-2`}>{template.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
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
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Customize
                      </Button>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
