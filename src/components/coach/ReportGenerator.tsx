'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  FileText,
  Download,
  Share2,
  Printer,
  Calendar,
  Users,
  BarChart3,
  Target,
  Award,
  CheckCircle,
  Clock,
  Settings,
  Eye,
  Mail,
  MessageSquare
} from 'lucide-react'

interface ReportSection {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  enabled: boolean
  required: boolean
}

interface ReportGeneratorProps {
  onGenerate: (sections: string[], format: string) => void
  onPreview: (sections: string[]) => void
}

export default function ReportGenerator({ onGenerate, onPreview }: ReportGeneratorProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const [selectedSections, setSelectedSections] = useState<string[]>(['summary', 'client-progress', 'achievements'])
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf')
  const [isGenerating, setIsGenerating] = useState(false)

  const reportSections: ReportSection[] = [
    {
      id: 'summary',
      title: 'Executive Summary',
      description: 'High-level overview of key metrics and performance indicators',
      icon: BarChart3,
      enabled: true,
      required: true
    },
    {
      id: 'client-progress',
      title: 'Client Progress Analysis',
      description: 'Detailed breakdown of individual client achievements and goals',
      icon: Target,
      enabled: true,
      required: false
    },
    {
      id: 'workout-analytics',
      title: 'Workout Analytics',
      description: 'Comprehensive analysis of workout completion rates and trends',
      icon: BarChart3,
      enabled: false,
      required: false
    },
    {
      id: 'nutrition-tracking',
      title: 'Nutrition Tracking',
      description: 'Meal logging statistics and dietary adherence metrics',
      icon: Users,
      enabled: false,
      required: false
    },
    {
      id: 'achievements',
      title: 'Client Achievements',
      description: 'Celebration of milestones and personal bests achieved',
      icon: Award,
      enabled: true,
      required: false
    },
    {
      id: 'engagement-metrics',
      title: 'Engagement Metrics',
      description: 'Session attendance, app usage, and client interaction data',
      icon: Clock,
      enabled: false,
      required: false
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      description: 'Actionable insights and suggestions for program improvements',
      icon: Settings,
      enabled: false,
      required: false
    }
  ]

  const handleSectionToggle = (sectionId: string) => {
    const section = reportSections.find(s => s.id === sectionId)
    if (section?.required) return

    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    try {
      await onGenerate(selectedSections, selectedFormat)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreviewReport = () => {
    onPreview(selectedSections)
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <FileText className="w-4 h-4" />
      case 'excel': return <BarChart3 className="w-4 h-4" />
      case 'csv': return <Download className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'pdf': return 'text-red-600 dark:text-red-400'
      case 'excel': return 'text-green-600 dark:text-green-400'
      case 'csv': return 'text-blue-600 dark:text-blue-400'
      default: return 'text-slate-600 dark:text-slate-400'
    }
  }

  return (
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          Report Generator
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Report Sections */}
        <div>
          <h3 className={`font-semibold ${theme.text} mb-4`}>Select Report Sections</h3>
          <div className="space-y-3">
            {reportSections.map(section => {
              const Icon = section.icon
              const isSelected = selectedSections.includes(section.id)
              const isRequired = section.required
              
              return (
                <div 
                  key={section.id} 
                  className={`${theme.card} rounded-xl p-4 border-2 cursor-pointer transition-all duration-300 ${
                    isSelected ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' : 'hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  onClick={() => handleSectionToggle(section.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${theme.text}`}>{section.title}</h4>
                        {isRequired && (
                          <Badge className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-0 text-xs">
                            Required
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-0 text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${theme.textSecondary}`}>{section.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isRequired ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSectionToggle(section.id)}
                          className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Export Format */}
        <div>
          <h3 className={`font-semibold ${theme.text} mb-4`}>Export Format</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['pdf', 'excel', 'csv'] as const).map(format => (
              <div
                key={format}
                className={`${theme.card} rounded-xl p-4 border-2 cursor-pointer transition-all duration-300 ${
                  selectedFormat === format 
                    ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' 
                    : 'hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                onClick={() => setSelectedFormat(format)}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`p-2 rounded-lg ${
                    selectedFormat === format ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <div className={getFormatColor(format)}>
                      {getFormatIcon(format)}
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${theme.text}`}>
                    {format.toUpperCase()}
                  </span>
                  {selectedFormat === format && (
                    <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-0 text-xs">
                      Selected
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Report Summary */}
        <div className={`${theme.card} rounded-xl p-4 border-2`}>
          <h3 className={`font-semibold ${theme.text} mb-3`}>Report Summary</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme.textSecondary}`}>Sections included:</span>
              <span className={`text-sm font-medium ${theme.text}`}>{selectedSections.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme.textSecondary}`}>Export format:</span>
              <span className={`text-sm font-medium ${theme.text}`}>{selectedFormat.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme.textSecondary}`}>Estimated size:</span>
              <span className={`text-sm font-medium ${theme.text}`}>
                {selectedSections.length * 2 + 5} pages
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handlePreviewReport}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Report
          </Button>
          
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || selectedSections.length === 0}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" size="sm">
            <Mail className="w-3 h-3 mr-1" />
            Email Report
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-3 h-3 mr-1" />
            Share Link
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="w-3 h-3 mr-1" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquare className="w-3 h-3 mr-1" />
            Send to Client
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
