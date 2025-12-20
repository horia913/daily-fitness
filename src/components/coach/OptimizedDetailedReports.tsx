'use client'

import { useState, useEffect } from 'react'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  FileText, 
  Download,
  Calendar,
  User,
  TrendingUp,
  BarChart3,
  Printer,
  Mail,
  Filter,
  Search,
  Plus,
  ArrowLeft,
  ArrowRight,
  Eye,
  Share2,
  Settings,
  Target,
  Dumbbell,
  Apple,
  Zap,
  Heart,
  Activity,
  Award,
  Clock,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Maximize2,
  Minimize2,
  Edit,
  Trash2,
  Copy,
  Send,
  CheckCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReportTemplate {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  sections: string[]
  isPopular?: boolean
}

interface ReportSection {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  required: boolean
  category: 'metrics' | 'charts' | 'insights' | 'goals'
}

interface ClientData {
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

interface OptimizedDetailedReportsProps {
  coachId?: string
}

export default function OptimizedDetailedReports({ coachId }: OptimizedDetailedReportsProps) {
  const { getThemeStyles, performanceSettings } = useTheme()
  const router = useRouter()
  const theme = getThemeStyles()

  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'custom'>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Mock data - replace with actual data fetching
  const [clients, setClients] = useState<ClientData[]>([
    {
      id: '1',
      name: 'John Smith',
      avatar: 'JS',
      program: 'Weight Loss Program',
      startDate: '2024-01-01',
      lastActive: '2024-01-15',
      metrics: {
        weight: 180,
        bodyFat: 18,
        strength: 85,
        endurance: 75,
        adherence: 92
      }
    },
    {
      id: '2',
      name: 'Maria Johnson',
      avatar: 'MJ',
      program: 'Strength Building',
      startDate: '2024-01-05',
      lastActive: '2024-01-14',
      metrics: {
        weight: 165,
        bodyFat: 22,
        strength: 95,
        endurance: 80,
        adherence: 88
      }
    },
    {
      id: '3',
      name: 'David Kim',
      avatar: 'DK',
      program: 'Endurance Training',
      startDate: '2024-01-10',
      lastActive: '2024-01-13',
      metrics: {
        weight: 175,
        bodyFat: 15,
        strength: 70,
        endurance: 90,
        adherence: 85
      }
    }
  ])

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'progress',
      name: 'Progress Report',
      description: 'Comprehensive overview of client achievements and goals',
      icon: TrendingUp,
      color: 'blue',
      sections: ['executive-summary', 'metrics-overview', 'goal-progress', 'achievements', 'recommendations'],
      isPopular: true
    },
    {
      id: 'analytics',
      name: 'Analytics Report',
      description: 'Data-driven insights with charts and performance indicators',
      icon: BarChart3,
      color: 'green',
      sections: ['metrics-overview', 'workout-analytics', 'nutrition-tracking', 'engagement-metrics', 'trend-analysis']
    },
    {
      id: 'summary',
      name: 'Client Summary',
      description: 'Personal summary including goals, progress, and recommendations',
      icon: User,
      color: 'purple',
      sections: ['executive-summary', 'goal-progress', 'achievements', 'coach-notes']
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive Report',
      description: 'Complete analysis with all available metrics and insights',
      icon: FileText,
      color: 'orange',
      sections: ['executive-summary', 'metrics-overview', 'workout-analytics', 'nutrition-tracking', 'engagement-metrics', 'goal-progress', 'achievements', 'trend-analysis', 'recommendations', 'coach-notes']
    }
  ]

  const reportSections: ReportSection[] = [
    {
      id: 'executive-summary',
      name: 'Executive Summary',
      description: 'High-level overview of key metrics and performance',
      icon: Target,
      required: true,
      category: 'insights'
    },
    {
      id: 'metrics-overview',
      name: 'Metrics Overview',
      description: 'Comprehensive breakdown of all key performance indicators',
      icon: Activity,
      required: false,
      category: 'metrics'
    },
    {
      id: 'workout-analytics',
      name: 'Workout Analytics',
      description: 'Detailed analysis of workout completion and performance',
      icon: Dumbbell,
      required: false,
      category: 'charts'
    },
    {
      id: 'nutrition-tracking',
      name: 'Nutrition Tracking',
      description: 'Meal logging statistics and dietary adherence',
      icon: Apple,
      required: false,
      category: 'charts'
    },
    {
      id: 'engagement-metrics',
      name: 'Engagement Metrics',
      description: 'Session attendance, app usage, and interaction data',
      icon: Heart,
      required: false,
      category: 'metrics'
    },
    {
      id: 'goal-progress',
      name: 'Goal Progress',
      description: 'Current progress towards established goals',
      icon: Target,
      required: false,
      category: 'goals'
    },
    {
      id: 'achievements',
      name: 'Achievements',
      description: 'Milestones reached and personal bests achieved',
      icon: Award,
      required: false,
      category: 'insights'
    },
    {
      id: 'trend-analysis',
      name: 'Trend Analysis',
      description: 'Historical trends and performance patterns',
      icon: TrendingUp,
      required: false,
      category: 'charts'
    },
    {
      id: 'recommendations',
      name: 'Recommendations',
      description: 'Actionable insights and suggestions for improvement',
      icon: MessageSquare,
      required: false,
      category: 'insights'
    },
    {
      id: 'coach-notes',
      name: 'Coach Notes',
      description: 'Personalized comments and insights from the coach',
      icon: Edit,
      required: false,
      category: 'insights'
    }
  ]

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000)
  }, [])

  const handleTemplateSelect = (templateId: string) => {
    const template = reportTemplates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setSelectedSections(template.sections)
    }
  }

  const handleSectionToggle = (sectionId: string) => {
    const section = reportSections.find(s => s.id === sectionId)
    if (section?.required) return

    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const generateReport = async () => {
    setIsGenerating(true)
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      setShowPreview(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting report as ${format}`)
  }

  const shareReport = () => {
    console.log('Sharing report')
  }

  const selectedClientData = clients.find(c => c.id === selectedClient)
  const selectedTemplateData = reportTemplates.find(t => t.id === selectedTemplate)

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse">
          <div className="h-64 bg-slate-200 dark:bg-slate-800"></div>
          <div className="p-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className={`${theme.card} rounded-2xl p-6`}>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen">
        {/* Enhanced Header */}
      <div className={`p-6 ${theme.background} relative overflow-hidden`}>
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/coach')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className={`text-3xl font-bold ${theme.text} mb-2`}>
                  Detailed Reports 📋
                </h1>
                <p className={`text-lg ${theme.textSecondary}`}>
                  Generate professional client progress reports with comprehensive insights
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Report Configuration */}
            <div className="lg:col-span-2 space-y-8">
              {/* Client Selection */}
              <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Client Selection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a client for the report" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {client.avatar}
                              </div>
                              <div>
                                <p className="font-medium">{client.name}</p>
                                <p className="text-sm text-slate-500">{client.program}</p>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedClientData && (
                      <div className={`${theme.card} rounded-xl p-4 border-2`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {selectedClientData.avatar}
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold ${theme.text}`}>{selectedClientData.name}</h3>
                            <p className={`text-sm ${theme.textSecondary}`}>{selectedClientData.program}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                              <span>Started: {new Date(selectedClientData.startDate).toLocaleDateString()}</span>
                              <span>Last Active: {new Date(selectedClientData.lastActive).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${theme.text}`}>{selectedClientData.metrics.adherence}%</p>
                            <p className={`text-xs ${theme.textSecondary}`}>Adherence</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Report Templates */}
              <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    Report Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reportTemplates.map(template => {
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
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${
                              isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800'
                            }`}>
                              <Icon className={`w-5 h-5 ${
                                isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-semibold ${theme.text}`}>{template.name}</h3>
                                {template.isPopular && (
                                  <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-0 text-xs">
                                    Popular
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
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${theme.textSecondary}`}>
                              {template.sections.length} sections included
                            </span>
                            {isSelected && (
                              <Checkbox checked={true} className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Report Customization */}
              <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    Report Customization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Date Range */}
                  <div>
                    <h4 className={`font-semibold ${theme.text} mb-3`}>Date Range</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(['month', 'quarter', 'year', 'custom'] as const).map(range => (
                        <Button
                          key={range}
                          variant={dateRange === range ? 'default' : 'outline'}
                          onClick={() => setDateRange(range)}
                          className="h-12"
                        >
                          {range.charAt(0).toUpperCase() + range.slice(1)}
                        </Button>
                      ))}
                    </div>
                    {dateRange === 'custom' && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className={`text-sm font-medium ${theme.text} mb-1 block`}>Start Date</label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label className={`text-sm font-medium ${theme.text} mb-1 block`}>End Date</label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Report Sections */}
                  <div>
                    <h4 className={`font-semibold ${theme.text} mb-3`}>Report Sections</h4>
                    <div className="space-y-3">
                      {reportSections.map(section => {
                        const Icon = section.icon
                        const isSelected = selectedSections.includes(section.id)
                        const isRequired = section.required
                        
                        return (
                          <div
                            key={section.id}
                            className={`${theme.card} rounded-xl p-3 border-2 cursor-pointer transition-all duration-300 ${
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
                                  <h5 className={`font-medium ${theme.text}`}>{section.name}</h5>
                                  {isRequired && (
                                    <Badge className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-0 text-xs">
                                      Required
                                    </Badge>
                                  )}
                                  {isSelected && (
                                    <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-0 text-xs">
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

                  {/* Coach Notes */}
                  <div>
                    <h4 className={`font-semibold ${theme.text} mb-3`}>Coach Notes</h4>
                    <Textarea
                      placeholder="Add personalized comments, insights, or recommendations for this client..."
                      value={coachNotes}
                      onChange={(e) => setCoachNotes(e.target.value)}
                      className="min-h-24"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Preview & Actions */}
            <div className="space-y-8">
              {/* Report Summary */}
              <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Eye className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    Report Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${theme.textSecondary}`}>Client:</span>
                      <span className={`text-sm font-medium ${theme.text}`}>
                        {selectedClientData?.name || 'Not selected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${theme.textSecondary}`}>Template:</span>
                      <span className={`text-sm font-medium ${theme.text}`}>
                        {selectedTemplateData?.name || 'Not selected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${theme.textSecondary}`}>Sections:</span>
                      <span className={`text-sm font-medium ${theme.text}`}>
                        {selectedSections.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${theme.textSecondary}`}>Date Range:</span>
                      <span className={`text-sm font-medium ${theme.text}`}>
                        {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      onClick={generateReport}
                      disabled={!selectedClient || !selectedTemplate || selectedSections.length === 0 || isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Export Options */}
              <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    Export Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      onClick={() => exportReport('pdf')}
                      className="w-full justify-start"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Export as PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportReport('excel')}
                      className="w-full justify-start"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Export as Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportReport('csv')}
                      className="w-full justify-start"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export as CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Share Options */}
              <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Share Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      onClick={shareReport}
                      className="w-full justify-start"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email to Client
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send via App
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AnimatedBackground>
  )
}
