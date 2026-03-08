'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  const loadingRef = useRef(false)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'custom'>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [clients, setClients] = useState<ClientData[]>([])
  const didLoadRef = useRef(false)

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      if (!coachId) {
        setClients([])
        setLoading(false)
        return
      }
      if (didLoadRef.current) return
      if (loadingRef.current) return
      didLoadRef.current = true
      loadingRef.current = true
      setLoading(true)
      try {
        const res = await fetch('/api/coach/reports/clients', {
          signal: signal ?? null,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        const data = await res.json()
        setClients(data.clients ?? [])
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          didLoadRef.current = false
          return
        }
        console.error('Error loading report clients:', err)
        didLoadRef.current = false
        setClients([])
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    },
    [coachId]
  )

  useEffect(() => {
    if (!coachId) {
      setClients([])
      setLoading(false)
      return
    }
    const ac = new AbortController()
    loadData(ac.signal)
    return () => {
      didLoadRef.current = false
      loadingRef.current = false
      ac.abort()
    }
  }, [coachId, loadData])

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

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    const list = selectedClient ? clients.filter((c) => c.id === selectedClient) : clients
    if (list.length === 0) return
    const headers = ['Client', 'Program', 'Start Date', 'Last Active', 'Weight (kg)', 'Body Fat (%)', 'Strength', 'Endurance', 'Adherence (%)']
    const rows = list.map((c) => [
      c.name,
      c.program,
      c.startDate,
      c.lastActive,
      String(c.metrics.weight),
      String(c.metrics.bodyFat),
      String(c.metrics.strength),
      String(c.metrics.endurance),
      String(c.metrics.adherence)
    ])
    if (format === 'pdf') {
      try {
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pageW = doc.internal.pageSize.getWidth()
        const margin = 14
        let y = 20
        doc.setFontSize(18)
        doc.text('Client Progress Report', margin, y)
        y += 10
        doc.setFontSize(10)
        doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, margin, y)
        y += 12
        doc.setFontSize(11)
        const colW = (pageW - 2 * margin) / 9
        headers.forEach((h, i) => doc.text(h, margin + i * colW, y))
        y += 7
        doc.setFontSize(9)
        rows.forEach((row) => {
          if (y > 270) { doc.addPage(); y = 20 }
          row.forEach((cell, i) => doc.text(String(cell).slice(0, 18), margin + i * colW, y))
          y += 6
        })
        doc.save(`report-${new Date().toISOString().slice(0, 10)}.pdf`)
      } catch (e) {
        console.error('PDF export failed:', e)
        const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
      }
      return
    }
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv' })
    const ext = format === 'excel' ? 'xls' : 'csv'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `report-${new Date().toISOString().slice(0, 10)}.${ext}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const shareReport = () => {
    const list = selectedClient ? clients.filter((c) => c.id === selectedClient) : clients
    if (list.length === 0) return
    const lines = list.map((c) => `${c.name}: Weight ${c.metrics.weight}kg, Body Fat ${c.metrics.bodyFat}%, Adherence ${c.metrics.adherence}%`)
    const text = `Client Report (${new Date().toISOString().slice(0, 10)})\n${lines.join('\n')}`
    navigator.clipboard.writeText(text).then(() => {
      if (typeof window !== 'undefined' && (window as any).toast) (window as any).toast.success('Report summary copied to clipboard')
    }).catch(() => {})
  }

  const selectedClientData = clients.find(c => c.id === selectedClient)
  const selectedTemplateData = reportTemplates.find(t => t.id === selectedTemplate)

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse">
          <div className="h-64 bg-[color:var(--fc-glass-highlight)]"></div>
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
              <div className="fc-glass fc-card rounded-2xl p-3 sm:p-4 md:p-6">
                <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-16 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
                  <div className="h-16 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
                  <div className="h-16 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
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
        {/* Enhanced Header — single padding level on mobile */}
        <div className={`p-3 sm:p-4 md:p-6 ${theme.background} relative overflow-hidden`}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[color:var(--fc-accent-cyan)]/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[color:var(--fc-accent-purple)]/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-[color:var(--fc-domain-meals)]/10 rounded-full blur-2xl"></div>
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            <Card className="fc-glass fc-card rounded-2xl sm:rounded-3xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Button
                      variant="ghost"
                      onClick={() => router.push('/coach')}
                      className="fc-btn fc-btn-ghost h-10 w-10 flex-shrink-0"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="space-y-1 sm:space-y-2 min-w-0">
                      <Badge className="fc-badge">Report Builder</Badge>
                      <h1 className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                        Detailed Reports 📋
                      </h1>
                      <p className="text-sm sm:text-base md:text-lg text-[color:var(--fc-text-dim)]">
                        Generate professional client progress reports with comprehensive insights
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                      className="fc-btn fc-btn-ghost flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px]"
                    >
                      <Eye className="w-4 h-4" />
                      {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </Button>
                    <Button
                      variant="outline"
                      className="fc-btn fc-btn-ghost flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px]"
                      onClick={() => {
                        if (coachId) {
                          didLoadRef.current = false
                          loadData()
                        }
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      {/* Main Content — single padding level on mobile (p-3 = 24px total horizontal) */}
      <div className="p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Report Configuration — reduced nesting: Card padding only on content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 md:space-y-8">
              {/* Client Selection */}
              <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                <CardHeader className="p-3 sm:p-4 md:p-6 pb-2">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg">
                    <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-domain-workouts)]" />
                    </div>
                    Client Selection
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger className="fc-select w-full min-h-[44px]">
                        <SelectValue placeholder="Select a client for the report" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center font-bold text-sm">
                                {client.avatar}
                              </div>
                              <div>
                                <p className="font-medium text-[color:var(--fc-text-primary)]">{client.name}</p>
                                <p className="text-sm text-[color:var(--fc-text-dim)]">{client.program}</p>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedClientData && (
                      <div className="fc-glass rounded-xl p-3 sm:p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                          <div className="w-12 h-12 rounded-full bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center font-bold text-lg">
                            {selectedClientData.avatar}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-[color:var(--fc-text-primary)]">{selectedClientData.name}</h3>
                            <p className="text-sm text-[color:var(--fc-text-dim)]">{selectedClientData.program}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-[color:var(--fc-text-subtle)]">
                              <span>Started: {new Date(selectedClientData.startDate).toLocaleDateString()}</span>
                              <span>Last Active: {new Date(selectedClientData.lastActive).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-[color:var(--fc-text-primary)]">{selectedClientData.metrics.adherence}%</p>
                            <p className="text-xs text-[color:var(--fc-text-dim)]">Adherence</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Report Templates */}
              <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                <CardHeader className="p-3 sm:p-4 md:p-6 pb-2">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg">
                    <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-domain-meals)]" />
                    </div>
                    Report Templates
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {reportTemplates.map(template => {
                      const Icon = template.icon
                      const isSelected = selectedTemplate === template.id
                      
                      return (
                        <div
                          key={template.id}
                          className={`fc-glass rounded-xl p-3 sm:p-4 border cursor-pointer transition-all duration-300 ${
                            isSelected 
                              ? 'border-[color:var(--fc-accent-cyan)]/50 bg-[color:var(--fc-glass-soft)]' 
                              : 'border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)]'
                          }`}
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${
                              isSelected ? 'bg-[color:var(--fc-glass-soft)]' : 'bg-[color:var(--fc-glass-soft)]'
                            }`}>
                              <Icon className={`w-5 h-5 ${
                                isSelected ? 'text-[color:var(--fc-accent-cyan)]' : 'text-[color:var(--fc-text-subtle)]'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-[color:var(--fc-text-primary)]">{template.name}</h3>
                                {template.isPopular && (
                                  <Badge className="bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-warning)] border border-[color:var(--fc-glass-border)] text-xs">
                                    Popular
                                  </Badge>
                                )}
                                {isSelected && (
                                  <Badge className="bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-accent-cyan)] border border-[color:var(--fc-glass-border)] text-xs">
                                    Selected
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-[color:var(--fc-text-dim)]">{template.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[color:var(--fc-text-subtle)]">
                              {template.sections.length} sections included
                            </span>
                            {isSelected && (
                              <Checkbox checked={true} className="data-[state=checked]:bg-[color:var(--fc-accent-cyan)] data-[state=checked]:border-[color:var(--fc-accent-cyan)]" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Report Customization */}
              <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                <CardHeader className="p-3 sm:p-4 md:p-6 pb-2">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg">
                    <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                      <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-accent-purple)]" />
                    </div>
                    Report Customization
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-4 sm:space-y-6">
                  {/* Date Range */}
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base text-[color:var(--fc-text-primary)] mb-2 sm:mb-3">Date Range</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                      {(['month', 'quarter', 'year', 'custom'] as const).map(range => (
                        <Button
                          key={range}
                          variant={dateRange === range ? 'default' : 'outline'}
                          onClick={() => setDateRange(range)}
                          className={dateRange === range ? 'fc-btn fc-btn-primary min-h-[44px]' : 'fc-btn fc-btn-ghost min-h-[44px]'}
                        >
                          {range.charAt(0).toUpperCase() + range.slice(1)}
                        </Button>
                      ))}
                    </div>
                    {dateRange === 'custom' && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-sm font-medium text-[color:var(--fc-text-primary)] mb-1 block">Start Date</label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="fc-input w-full"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-[color:var(--fc-text-primary)] mb-1 block">End Date</label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="fc-input w-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Report Sections */}
                  <div>
                    <h4 className="font-semibold text-[color:var(--fc-text-primary)] mb-3">Report Sections</h4>
                    <div className="space-y-3">
                      {reportSections.map(section => {
                        const Icon = section.icon
                        const isSelected = selectedSections.includes(section.id)
                        const isRequired = section.required
                        
                        return (
                          <div
                            key={section.id}
                            className={`fc-glass rounded-xl p-3 border cursor-pointer transition-all duration-300 ${
                              isSelected ? 'border-[color:var(--fc-accent-purple)]/50 bg-[color:var(--fc-glass-soft)]' : 'border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)]'
                            }`}
                            onClick={() => handleSectionToggle(section.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-[color:var(--fc-glass-soft)]">
                                <Icon className={`w-4 h-4 ${isSelected ? 'text-[color:var(--fc-accent-purple)]' : 'text-[color:var(--fc-text-subtle)]'}`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium text-[color:var(--fc-text-primary)]">{section.name}</h5>
                                  {isRequired && (
                                    <Badge className="bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-error)] border border-[color:var(--fc-glass-border)] text-xs">
                                      Required
                                    </Badge>
                                  )}
                                  {isSelected && (
                                    <Badge className="bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-accent-purple)] border border-[color:var(--fc-glass-border)] text-xs">
                                      Selected
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-[color:var(--fc-text-dim)]">{section.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isRequired ? (
                                  <CheckCircle className="w-5 h-5 text-[color:var(--fc-status-success)]" />
                                ) : (
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => handleSectionToggle(section.id)}
                                    className="data-[state=checked]:bg-[color:var(--fc-accent-purple)] data-[state=checked]:border-[color:var(--fc-accent-purple)]"
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
                    <h4 className="font-semibold text-[color:var(--fc-text-primary)] mb-3">Coach Notes</h4>
                    <Textarea
                      placeholder="Add personalized comments, insights, or recommendations for this client..."
                      value={coachNotes}
                      onChange={(e) => setCoachNotes(e.target.value)}
                      className="fc-textarea min-h-24"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Preview & Actions */}
            <div className="space-y-4 sm:space-y-6 md:space-y-8">
              {/* Report Summary */}
              <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                <CardHeader className="p-3 sm:p-4 md:p-6 pb-2">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg">
                    <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-status-warning)]" />
                    </div>
                    Report Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-3 sm:space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[color:var(--fc-text-dim)]">Client:</span>
                      <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">
                        {selectedClientData?.name || 'Not selected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[color:var(--fc-text-dim)]">Template:</span>
                      <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">
                        {selectedTemplateData?.name || 'Not selected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[color:var(--fc-text-dim)]">Sections:</span>
                      <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">
                        {selectedSections.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[color:var(--fc-text-dim)]">Date Range:</span>
                      <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">
                        {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-3 sm:pt-4 border-t border-[color:var(--fc-glass-border)]">
                    <Button
                      onClick={generateReport}
                      disabled={!selectedClient || !selectedTemplate || selectedSections.length === 0 || isGenerating}
                      className="fc-btn fc-btn-primary w-full min-h-[44px]"
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
              <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                <CardHeader className="p-3 sm:p-4 md:p-6 pb-2">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg">
                    <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                      <Download className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-domain-meals)]" />
                    </div>
                    Export Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                  <div className="space-y-2 sm:space-y-3">
                    <Button
                      variant="outline"
                      onClick={() => exportReport('pdf')}
                      className="fc-btn fc-btn-ghost w-full justify-start min-h-[44px]"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Export as PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportReport('excel')}
                      className="fc-btn fc-btn-ghost w-full justify-start min-h-[44px]"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Export as Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportReport('csv')}
                      className="fc-btn fc-btn-ghost w-full justify-start min-h-[44px]"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export as CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Share Options */}
              <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                <CardHeader className="p-3 sm:p-4 md:p-6 pb-2">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-[color:var(--fc-text-primary)] text-base sm:text-lg">
                    <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg flex-shrink-0">
                      <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-domain-workouts)]" />
                    </div>
                    Share Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                  <div className="space-y-2 sm:space-y-3">
                    <Button
                      variant="outline"
                      onClick={shareReport}
                      className="fc-btn fc-btn-ghost w-full justify-start min-h-[44px]"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email to Client
                    </Button>
                    <Button
                      variant="outline"
                      className="fc-btn fc-btn-ghost w-full justify-start min-h-[44px]"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send via App
                    </Button>
                    <Button
                      variant="outline"
                      className="fc-btn fc-btn-ghost w-full justify-start min-h-[44px]"
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
