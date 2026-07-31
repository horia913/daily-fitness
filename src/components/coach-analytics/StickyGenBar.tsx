'use client'

import { Download, FileText, Table2 } from 'lucide-react'
import hub from './coachAnalyticsHub.module.css'
import { cn } from '@/lib/utils'

function SummaryRow({
  label,
  value,
  miss,
  last,
}: {
  label: string
  value: string
  miss?: boolean
  last?: boolean
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-2 py-[9px]"
      style={{
        borderBottom: last ? undefined : '1px solid var(--line)',
      }}
    >
      <span
        className="uppercase"
        style={{
          fontFamily: 'var(--f-mono, ui-monospace, monospace)',
          fontSize: '9px',
          letterSpacing: '0.13em',
          color: 'var(--t4)',
        }}
      >
        {label}
      </span>
      <span
        className="max-w-[62%] truncate text-right font-semibold"
        style={{
          fontFamily: 'var(--f-mono, ui-monospace, monospace)',
          fontSize: '11.5px',
          color: miss ? 'var(--fc-status-warning)' : 'var(--t1)',
        }}
      >
        {value}
      </span>
    </div>
  )
}

export function StickyGenBar({
  clientLabel,
  templateLabel,
  sectionsLabel,
  rangeLabel,
  canGenerate,
  isGenerating,
  onGenerate,
  onExportPdf,
  onExportExcel,
  onExportCsv,
  exportDisabled,
  className,
}: {
  clientLabel: string
  templateLabel: string
  sectionsLabel: string
  rangeLabel: string
  canGenerate: boolean
  isGenerating: boolean
  onGenerate: () => void
  onExportPdf: () => void
  onExportExcel: () => void
  onExportCsv: () => void
  exportDisabled: boolean
  className?: string
}) {
  const clientMissing = !clientLabel
  const genDisabled = !canGenerate || isGenerating
  const showReady = canGenerate && !isGenerating

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        className="overflow-hidden rounded-[13px] border"
        style={{ borderColor: 'var(--line)', background: 'var(--card)' }}
      >
        <div
          className="border-b px-4 py-3"
          style={{
            background: 'linear-gradient(180deg, var(--fc-accent-dim), transparent)',
            borderColor: 'color-mix(in srgb, var(--fc-accent) 22%, transparent)',
          }}
        >
          <div
            className="font-extrabold uppercase"
            style={{
              fontFamily: 'var(--f-mono, ui-monospace, monospace)',
              fontSize: '9.5px',
              letterSpacing: '0.16em',
              color: 'var(--fc-accent)',
            }}
          >
            Report summary
          </div>
        </div>
        <div className="px-4 pt-1 pb-1">
          <SummaryRow
            label="Client"
            value={clientLabel || 'Not selected'}
            miss={clientMissing}
          />
          <SummaryRow label="Template" value={templateLabel || 'Not selected'} miss={!templateLabel} />
          <SummaryRow label="Sections" value={sectionsLabel} />
          <SummaryRow label="Range" value={rangeLabel || 'Not selected'} last />
        </div>
        <button
          type="button"
          disabled={genDisabled}
          onClick={onGenerate}
          className={cn(
            'mx-4 mb-4 mt-2 flex w-[calc(100%-2rem)] items-center justify-center rounded-[11px] px-[15px] py-[15px] text-center font-extrabold uppercase transition-opacity',
            showReady ? undefined : undefined,
          )}
          style={{
            fontFamily: 'var(--f-display, var(--f-headline, ui-sans-serif))',
            fontSize: '14px',
            letterSpacing: '0.04em',
            background: showReady ? 'var(--fc-accent)' : 'rgba(255,255,255,0.05)',
            color: showReady ? '#fff' : 'var(--t4)',
            boxShadow: showReady ? '0 6px 26px -8px var(--fc-accent-glow)' : 'none',
            border: showReady ? 'none' : '1px solid var(--line)',
            cursor: genDisabled ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.7 : 1,
          }}
        >
          {isGenerating
            ? 'Generating…'
            : showReady
              ? 'Generate report'
              : clientMissing
                ? 'Select a client first'
                : 'Finish setup'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-[7px]">
        <button
          type="button"
          disabled={exportDisabled}
          onClick={onExportPdf}
          className={hub.btnOutline}
        >
          <FileText className="size-3 shrink-0 opacity-80" aria-hidden />
          PDF
        </button>
        <button
          type="button"
          disabled={exportDisabled}
          onClick={onExportExcel}
          className={hub.btnOutline}
        >
          <Table2 className="size-3 shrink-0 opacity-80" aria-hidden />
          Excel
        </button>
        <button
          type="button"
          disabled={exportDisabled}
          onClick={onExportCsv}
          className={hub.btnOutline}
        >
          <Download className="size-3 shrink-0 opacity-80" aria-hidden />
          CSV
        </button>
      </div>
    </div>
  )
}
