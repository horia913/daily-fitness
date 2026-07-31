'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText,
  Download,
  Calendar,
  User,
  TrendingUp,
  BarChart3,
  Target,
  Dumbbell,
  Activity,
  Award,
  MessageSquare,
  RefreshCw,
  Edit,
  Eye,
  List,
  Utensils,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { fetchApi } from '@/lib/apiClient'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import hub from '@/components/coach-analytics/coachAnalyticsHub.module.css'
import reports from '@/components/coach-analytics/coachReports.module.css'
import { AnalyticsHero } from '@/components/coach-analytics/AnalyticsHero'
import { ReportTemplateCard } from '@/components/coach-analytics/ReportTemplateCard'
import { DateRangeSeg } from '@/components/coach-analytics/DateRangeSeg'
import { ReportSectionRow } from '@/components/coach-analytics/ReportSectionRow'
import { StickyGenBar } from '@/components/coach-analytics/StickyGenBar'
import { cn } from '@/lib/utils'

interface ReportTemplate {
  id: string
  name: string
  description: string
  icon: LucideIcon
  accent: 'cyan' | 'purple' | 'action' | 'good' | 'gold'
  sections: string[]
  isPopular?: boolean
}

interface ReportSection {
  id: string
  name: string
  description: string
  icon: LucideIcon
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

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'progress',
    name: 'Progress Report',
    description: 'Client achievements and goals',
    icon: TrendingUp,
    accent: 'cyan',
    sections: ['executive-summary', 'metrics-overview', 'goal-progress', 'achievements', 'recommendations'],
    isPopular: true,
  },
  {
    id: 'analytics',
    name: 'Analytics Report',
    description: 'Charts and KPIs',
    icon: BarChart3,
    accent: 'purple',
    sections: ['metrics-overview', 'workout-analytics', 'nutrition-tracking', 'engagement-metrics', 'trend-analysis'],
  },
  {
    id: 'summary',
    name: 'Client Summary',
    description: 'Goals, progress, next steps',
    icon: User,
    accent: 'action',
    sections: ['executive-summary', 'goal-progress', 'achievements', 'coach-notes'],
  },
  {
    id: 'comprehensive',
    name: 'Comprehensive',
    description: 'Everything available',
    icon: FileText,
    accent: 'gold',
    sections: [
      'executive-summary',
      'metrics-overview',
      'workout-analytics',
      'nutrition-tracking',
      'engagement-metrics',
      'goal-progress',
      'achievements',
      'trend-analysis',
      'recommendations',
      'coach-notes',
    ],
  },
]

const REPORT_SECTIONS: ReportSection[] = [
  {
    id: 'executive-summary',
    name: 'Executive summary',
    description: 'Key metrics overview',
    icon: List,
    required: true,
    category: 'insights',
  },
  {
    id: 'metrics-overview',
    name: 'Metrics overview',
    description: 'All key performance indicators',
    icon: Activity,
    required: false,
    category: 'metrics',
  },
  {
    id: 'workout-analytics',
    name: 'Workout analytics',
    description: 'Completion and performance',
    icon: Dumbbell,
    required: false,
    category: 'charts',
  },
  {
    id: 'nutrition-tracking',
    name: 'Nutrition tracking',
    description: 'Meal logging and adherence',
    icon: Utensils,
    required: false,
    category: 'charts',
  },
  {
    id: 'engagement-metrics',
    name: 'Engagement',
    description: 'Attendance and app usage',
    icon: Activity,
    required: false,
    category: 'metrics',
  },
  {
    id: 'goal-progress',
    name: 'Goal progress',
    description: 'Progress toward goals',
    icon: Target,
    required: false,
    category: 'goals',
  },
  {
    id: 'achievements',
    name: 'Achievements',
    description: 'Milestones and PBs',
    icon: Award,
    required: false,
    category: 'insights',
  },
  {
    id: 'trend-analysis',
    name: 'Trend analysis',
    description: 'Historical patterns',
    icon: TrendingUp,
    required: false,
    category: 'charts',
  },
  {
    id: 'recommendations',
    name: 'Recommendations',
    description: 'Actionable suggestions',
    icon: MessageSquare,
    required: false,
    category: 'insights',
  },
  {
    id: 'coach-notes',
    name: 'Coach notes',
    description: 'Your comments',
    icon: Edit,
    required: false,
    category: 'insights',
  },
]

function withRequired(sections: string[]): string[] {
  const s = new Set(sections)
  s.add('executive-summary')
  return Array.from(s)
}

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

interface OptimizedDetailedReportsProps {
  coachId?: string
}

export default function OptimizedDetailedReports({ coachId }: OptimizedDetailedReportsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlHydrated = useRef(false)

  const [loading, setLoading] = useState(true)
  const loadingRef = useRef(false)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('progress')
  const [selectedSections, setSelectedSections] = useState<string[]>(() =>
    withRequired(REPORT_TEMPLATES[0].sections),
  )
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'custom'>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [requiredTooltipFlash, setRequiredTooltipFlash] = useState(false)

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
        const res = await fetchApi('/api/coach/reports/clients', {
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
    [coachId],
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

  /** Hydrate form from URL once loading finishes */
  useEffect(() => {
    if (loading || urlHydrated.current) return

    const clientParam = searchParams.get('client')
    if (clientParam && clients.length > 0 && clients.some((c) => c.id === clientParam)) {
      setSelectedClient(clientParam)
    }
    const tpl = searchParams.get('template')
    if (tpl && REPORT_TEMPLATES.some((t) => t.id === tpl)) {
      const t = REPORT_TEMPLATES.find((x) => x.id === tpl)!
      setSelectedTemplate(tpl)
      setSelectedSections(withRequired(t.sections))
    }
    const range = searchParams.get('range') as 'month' | 'quarter' | 'year' | 'custom' | null
    if (range && ['month', 'quarter', 'year', 'custom'].includes(range)) {
      setDateRange(range)
    }
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    if (start) setCustomStartDate(start)
    if (end) setCustomEndDate(end)
    const sec = searchParams.get('sections')
    if (sec) {
      const parsed = sec
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (parsed.length) setSelectedSections(withRequired(parsed))
    }
    const notes = searchParams.get('notes')
    if (notes) {
      try {
        setCoachNotes(decodeURIComponent(notes))
      } catch {
        setCoachNotes(notes)
      }
    }
    urlHydrated.current = true
  }, [loading, clients, searchParams])

  /** Apply ?client= after clients list arrives */
  useEffect(() => {
    if (loading || clients.length === 0) return
    const clientParam = searchParams.get('client')
    if (clientParam && clients.some((c) => c.id === clientParam)) {
      setSelectedClient(clientParam)
    }
  }, [loading, clients, searchParams])

  /** Push form state to URL (debounced — coach notes typing) */
  useEffect(() => {
    if (!urlHydrated.current) return
    const id = window.setTimeout(() => {
      const p = new URLSearchParams()
      if (selectedClient) p.set('client', selectedClient)
      if (selectedTemplate) p.set('template', selectedTemplate)
      p.set('range', dateRange)
      if (dateRange === 'custom') {
        if (customStartDate) p.set('start', customStartDate)
        if (customEndDate) p.set('end', customEndDate)
      }
      if (selectedSections.length) p.set('sections', selectedSections.join(','))
      if (coachNotes.trim()) p.set('notes', encodeURIComponent(coachNotes.trim()))
      const qs = p.toString()
      router.replace(qs ? `/coach/reports?${qs}` : '/coach/reports', { scroll: false })
    }, 320)
    return () => window.clearTimeout(id)
  }, [
    router,
    selectedClient,
    selectedTemplate,
    dateRange,
    customStartDate,
    customEndDate,
    selectedSections,
    coachNotes,
  ])

  useEffect(() => {
    const t = coachNotes.trim()
    if (t.length === 0) return
    setSelectedSections((prev) => (prev.includes('coach-notes') ? prev : [...prev, 'coach-notes']))
  }, [coachNotes])

  const handleTemplateSelect = (templateId: string) => {
    const template = REPORT_TEMPLATES.find((x) => x.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setSelectedSections(withRequired(template.sections))
    }
  }

  const handleSectionToggle = (sectionId: string) => {
    const section = REPORT_SECTIONS.find((s) => s.id === sectionId)
    if (section?.required) return
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    )
  }

  const flashRequiredHint = () => {
    setRequiredTooltipFlash(true)
    window.setTimeout(() => setRequiredTooltipFlash(false), 1600)
  }

  const generateReport = async () => {
    setIsGenerating(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
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
      String(c.metrics.adherence),
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
          if (y > 270) {
            doc.addPage()
            y = 20
          }
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

  const selectedClientData = clients.find((c) => c.id === selectedClient)
  const selectedTemplateData = REPORT_TEMPLATES.find((t) => t.id === selectedTemplate)

  const rangeLabel = useMemo(() => {
    if (dateRange === 'custom') {
      if (customStartDate && customEndDate) return `${customStartDate} → ${customEndDate}`
      if (customStartDate || customEndDate) return 'Custom (incomplete)'
      return 'Custom'
    }
    return dateRange.charAt(0).toUpperCase() + dateRange.slice(1)
  }, [dateRange, customStartDate, customEndDate])

  const sectionsSummary = `${selectedSections.length} / ${REPORT_SECTIONS.length}`
  const sectionsSummaryFull = `${sectionsSummary} selected`

  const canGenerate = Boolean(selectedClient && selectedTemplate && selectedSections.length > 0)

  const exportReady =
    showPreview || (Boolean(selectedClient) && Boolean(selectedTemplate) && selectedSections.length > 0)

  const sectionIconBtn = (variant: 'cyan' | 'good' | 'warn' | 'purple' | 'action', Icon: LucideIcon) => {
    const map = {
      cyan: { bg: 'var(--fc-accent-dim)', fg: 'var(--fc-accent)' },
      good: { bg: 'var(--good-soft)', fg: 'var(--good)' },
      warn: { bg: 'var(--warning-soft)', fg: 'var(--warning)' },
      purple: { bg: 'var(--purple-soft)', fg: 'var(--purple)' },
      action: { bg: 'var(--fc-accent-dim)', fg: 'var(--fc-accent)' },
    }[variant]
    return (
      <div className="flex size-[26px] shrink-0 items-center justify-center rounded-lg" style={{ background: map.bg }}>
        <Icon className="size-3.5" style={{ color: map.fg }} aria-hidden />
      </div>
    )
  }

  const summaryRail = (
    <>
      <StickyGenBar
        className={reports.railGen}
        clientLabel={selectedClientData?.name ?? ''}
        templateLabel={selectedTemplateData?.name ?? ''}
        sectionsLabel={sectionsSummary}
        rangeLabel={rangeLabel}
        canGenerate={canGenerate}
        isGenerating={isGenerating}
        onGenerate={generateReport}
        onExportPdf={() => exportReport('pdf')}
        onExportExcel={() => exportReport('excel')}
        onExportCsv={() => exportReport('csv')}
        exportDisabled={!exportReady}
      />
      <div className={reports.previewBox}>
        <div className={reports.previewEyebrow}>Preview</div>
        <p className={reports.previewBody}>
          {selectedClientData
            ? showPreview
              ? 'Preview is on — generate to refresh the narrative view.'
              : 'Use Show preview in the header, then generate to see the report.'
            : 'Select a client to see how the report will look before generating.'}
        </p>
      </div>
    </>
  )

  if (loading) {
    return <PageSkeleton variant="dashboard" />
  }

  return (
    <div className="space-y-4 pb-[var(--fc-bottom-safe-area)] sm:space-y-5">
      <AnalyticsHero
        accent="cyan"
        eyebrow="Coaching reports"
        title="Build a report"
        subtitle="Client-ready summaries and performance narratives"
        controls={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-[9px] border px-[15px] py-[9px] text-[10.5px] font-bold uppercase tracking-[0.07em] transition-colors hover:bg-white/[0.04]"
              style={{
                borderColor: 'var(--line-2)',
                color: 'var(--t2)',
                fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
                background: 'transparent',
              }}
            >
              <Eye className="size-[11px] shrink-0" aria-hidden />
              {showPreview ? 'Hide preview' : 'Show preview'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (coachId) {
                  didLoadRef.current = false
                  loadData()
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-[9px] border px-[15px] py-[9px] text-[10.5px] font-bold uppercase tracking-[0.07em] transition-colors hover:bg-white/[0.04]"
              style={{
                borderColor: 'var(--line-2)',
                color: 'var(--t2)',
                fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
                background: 'transparent',
              }}
            >
              <RefreshCw className="size-[11px] shrink-0" aria-hidden />
              Refresh
            </button>
          </div>
        }
      />

      {requiredTooltipFlash ? (
        <p className="text-center text-[11px]" style={{ color: 'var(--warning)' }}>
          Executive summary is required for this template.
        </p>
      ) : null}

      <div className={reports.layout}>
        <div className={reports.main}>
          {/* Client */}
          <div className={hub.sectionCard}>
            <div className={hub.sectionHead}>
              <div className={hub.sectionHeadLeft}>
                {sectionIconBtn('cyan', User)}
                <h2 className={hub.sectionTitle}>Client</h2>
              </div>
            </div>
            <Select value={selectedClient || undefined} onValueChange={setSelectedClient}>
              <SelectTrigger
                className={cn(
                  'h-auto min-h-0 w-full justify-between rounded-[10px] border px-3.5 py-3 text-left text-[13px] shadow-none',
                  !selectedClientData && reports.clientTriggerMiss,
                  !selectedClientData && 'text-[color:var(--t4)]',
                )}
                style={{
                  background: 'var(--card-2)',
                  borderColor: selectedClientData ? 'var(--line-2)' : undefined,
                  color: selectedClientData ? 'var(--t1)' : 'var(--t3)',
                }}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {selectedClientData ? (
                    <span
                      className="flex size-[18px] shrink-0 items-center justify-center rounded-md text-[8px] font-bold text-white"
                      style={{
                        background: 'linear-gradient(135deg, hsl(190 55% 42%), hsl(260 50% 38%))',
                      }}
                    >
                      {initialsFromName(selectedClientData.name)}
                    </span>
                  ) : null}
                  <span className="min-w-0 truncate">
                    {selectedClientData ? selectedClientData.name : 'Select a client for the report'}
                  </span>
                </span>
                {!selectedClientData ? (
                  <span className={reports.clientRequiredHint}>Required</span>
                ) : null}
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-[color:var(--fc-accent-dim)] text-xs font-bold text-[color:var(--fc-accent)]">
                        {client.avatar}
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-xs opacity-70">{client.program}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template */}
          <div className={hub.sectionCard}>
            <div className={hub.sectionHead}>
              <div className={hub.sectionHeadLeft}>
                {sectionIconBtn('good', FileText)}
                <h2 className={hub.sectionTitle}>Template</h2>
              </div>
            </div>
            <div className={reports.tplGrid}>
              {REPORT_TEMPLATES.map((template) => (
                <ReportTemplateCard
                  key={template.id}
                  name={template.name}
                  description={template.description}
                  meta={`${template.sections.length} sections`}
                  icon={template.icon}
                  accent={template.accent}
                  selected={selectedTemplate === template.id}
                  popular={template.isPopular}
                  onClick={() => handleTemplateSelect(template.id)}
                />
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className={hub.sectionCard}>
            <div className={hub.sectionHead}>
              <div className={hub.sectionHeadLeft}>
                {sectionIconBtn('warn', Calendar)}
                <h2 className={hub.sectionTitle}>Date range</h2>
              </div>
            </div>
            <DateRangeSeg value={dateRange} onChange={setDateRange} />
            {dateRange === 'custom' ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px]" style={{ color: 'var(--t3)' }}>
                    Start
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full cursor-pointer rounded-[11px] border px-3 py-2.5 text-[12.5px] outline-none"
                    style={{ background: 'var(--card-2)', borderColor: 'var(--line)', color: 'var(--t1)' }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px]" style={{ color: 'var(--t3)' }}>
                    End
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full cursor-pointer rounded-[11px] border px-3 py-2.5 text-[12.5px] outline-none"
                    style={{ background: 'var(--card-2)', borderColor: 'var(--line)', color: 'var(--t1)' }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Sections */}
          <div className={hub.sectionCard}>
            <div className={hub.sectionHead}>
              <div className={hub.sectionHeadLeft}>
                {sectionIconBtn('purple', List)}
                <h2 className={hub.sectionTitle}>Report sections</h2>
              </div>
              <span className={reports.sectionsCount}>{sectionsSummaryFull}</span>
            </div>
            <div className={reports.secGrid}>
              {REPORT_SECTIONS.map((section) => (
                <ReportSectionRow
                  key={section.id}
                  name={section.name}
                  description={section.description}
                  icon={section.icon}
                  required={section.required}
                  checked={selectedSections.includes(section.id)}
                  onToggle={() => handleSectionToggle(section.id)}
                  onRequiredClick={flashRequiredHint}
                />
              ))}
            </div>
          </div>

          {/* Coach notes */}
          <div className={hub.sectionCard}>
            <div className={hub.sectionHead}>
              <div className={hub.sectionHeadLeft}>
                {sectionIconBtn('action', Edit)}
                <h2 className={hub.sectionTitle}>Coach notes</h2>
              </div>
            </div>
            <textarea
              placeholder="Add personalised comments, insights, or recommendations for this client…"
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              className="min-h-[96px] w-full resize-y rounded-[10px] border px-3.5 py-3 text-[12.5px] outline-none"
              style={{
                background: 'var(--card-2)',
                borderColor: 'var(--line-2)',
                color: 'var(--t1)',
                fontFamily: 'var(--font-body, Inter, sans-serif)',
              }}
            />
          </div>

          {/* Mobile: summary below form (unchanged order) */}
          <div className="lg:hidden">{summaryRail}</div>
        </div>

        {/* Desktop sticky rail */}
        <aside className={cn(reports.rail, 'hidden lg:flex')} aria-label="Report summary">
          {summaryRail}
        </aside>
      </div>
    </div>
  )
}
