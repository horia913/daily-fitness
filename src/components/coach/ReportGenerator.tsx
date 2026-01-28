'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
      case 'pdf': return 'fc-text-error'
      case 'excel': return 'fc-text-success'
      case 'csv': return 'fc-text-workouts'
      default: return 'fc-text-dim'
    }
  }

  return (
    <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
      <div className="p-6 pb-4 border-b border-[color:var(--fc-glass-border)]">
        <div className="flex items-center gap-3">
          <div className="fc-icon-tile fc-icon-workouts">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
              Reports
            </span>
            <h2 className="text-lg font-semibold fc-text-primary mt-2">
              Report Generator
            </h2>
          </div>
        </div>
      </div>
      
      <div className="space-y-6 p-6">
        {/* Report Sections */}
        <div>
          <h3 className="font-semibold fc-text-primary mb-4">Select Report Sections</h3>
          <div className="space-y-3">
            {reportSections.map(section => {
              const Icon = section.icon
              const isSelected = selectedSections.includes(section.id)
              const isRequired = section.required
              
              return (
                <div 
                  key={section.id} 
                  className={`fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)] cursor-pointer transition-all duration-300 ${
                    isSelected ? 'ring-1 ring-[color:var(--fc-domain-workouts)]' : ''
                  }`}
                  onClick={() => handleSectionToggle(section.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="fc-icon-tile fc-icon-workouts">
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium fc-text-primary">{section.title}</h4>
                        {isRequired && (
                          <span className="fc-pill fc-pill-glass fc-text-error text-xs">
                            Required
                          </span>
                        )}
                        {isSelected && (
                          <span className="fc-pill fc-pill-glass fc-text-success text-xs">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm fc-text-dim">{section.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isRequired ? (
                        <CheckCircle className="w-5 h-5 fc-text-success" />
                      ) : (
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSectionToggle(section.id)}
                          className="data-[state=checked]:bg-[color:var(--fc-domain-workouts)] data-[state=checked]:border-[color:var(--fc-domain-workouts)]"
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
          <h3 className="font-semibold fc-text-primary mb-4">Export Format</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['pdf', 'excel', 'csv'] as const).map(format => (
              <div
                key={format}
                className={`fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)] cursor-pointer transition-all duration-300 ${
                  selectedFormat === format ? 'ring-1 ring-[color:var(--fc-domain-workouts)]' : ''
                }`}
                onClick={() => setSelectedFormat(format)}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="fc-icon-tile fc-icon-workouts">
                    <div className={getFormatColor(format)}>
                      {getFormatIcon(format)}
                    </div>
                  </div>
                  <span className="text-sm font-medium fc-text-primary">
                    {format.toUpperCase()}
                  </span>
                  {selectedFormat === format && (
                    <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                      Selected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Report Summary */}
        <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)]">
          <h3 className="font-semibold fc-text-primary mb-3">Report Summary</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm fc-text-subtle">Sections included:</span>
              <span className="text-sm font-medium fc-text-primary">{selectedSections.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm fc-text-subtle">Export format:</span>
              <span className="text-sm font-medium fc-text-primary">{selectedFormat.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm fc-text-subtle">Estimated size:</span>
              <span className="text-sm font-medium fc-text-primary">
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
            className="flex-1 fc-btn fc-btn-secondary"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Report
          </Button>
          
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || selectedSections.length === 0}
            className="flex-1 fc-btn fc-btn-primary fc-press"
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
        <div className="flex flex-wrap gap-2 pt-4 border-t border-[color:var(--fc-glass-border)]">
          <Button variant="outline" size="sm" className="fc-btn fc-btn-secondary">
            <Mail className="w-3 h-3 mr-1" />
            Email Report
          </Button>
          <Button variant="outline" size="sm" className="fc-btn fc-btn-secondary">
            <Share2 className="w-3 h-3 mr-1" />
            Share Link
          </Button>
          <Button variant="outline" size="sm" className="fc-btn fc-btn-secondary">
            <Printer className="w-3 h-3 mr-1" />
            Print
          </Button>
          <Button variant="outline" size="sm" className="fc-btn fc-btn-secondary">
            <MessageSquare className="w-3 h-3 mr-1" />
            Send to Client
          </Button>
        </div>
      </div>
    </div>
  )
}
