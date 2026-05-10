'use client'

import { Check, Download, FileText, Table2 } from 'lucide-react'
import hub from './coachAnalyticsHub.module.css'

function SummaryRow({
  label,
  value,
  empty,
  first,
}: {
  label: string
  value: string
  empty?: boolean
  first?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 py-1.5"
      style={{
        borderTop: first ? undefined : '1px solid var(--line-2)',
        fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
        fontSize: '10px',
      }}
    >
      <span className="uppercase tracking-[0.06em]" style={{ color: 'var(--t3)' }}>
        {label}
      </span>
      <span
        className="max-w-[60%] truncate text-right font-medium"
        style={{
          color: empty ? 'var(--t4)' : 'var(--t1)',
          fontStyle: empty ? 'italic' : 'normal',
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
}) {
  const genDisabled = !canGenerate || isGenerating
  const showReady = canGenerate && !isGenerating

  return (
    <div
      className="sticky z-20 flex flex-col gap-2 rounded-[14px] border p-3"
      style={{
        bottom: 6,
        background: 'var(--card)',
        borderColor: 'var(--cyan-dim)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px var(--cyan-dim)',
      }}
    >
      <div>
        <SummaryRow first label="CLIENT" value={clientLabel || 'Not selected'} empty={!clientLabel} />
        <SummaryRow label="TEMPLATE" value={templateLabel || 'Not selected'} empty={!templateLabel} />
        <SummaryRow label="SECTIONS" value={sectionsLabel} empty={!sectionsLabel} />
        <SummaryRow label="RANGE" value={rangeLabel || 'Not selected'} empty={!rangeLabel} />
      </div>

      <button
        type="button"
        disabled={genDisabled}
        onClick={onGenerate}
        className={showReady ? hub.btnPrimaryLime : hub.btnCyanFill}
        style={
          !showReady
            ? {
                opacity: genDisabled ? 0.6 : 1,
                cursor: genDisabled ? 'not-allowed' : 'pointer',
              }
            : undefined
        }
      >
        {isGenerating ? (
          'Generating…'
        ) : showReady ? (
          <>
            <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
            Generate report
          </>
        ) : !clientLabel ? (
          'Generate · select client first'
        ) : (
          'Generate · finish setup'
        )}
      </button>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          disabled={exportDisabled}
          onClick={onExportPdf}
          className={hub.btnOutline}
        >
          <FileText className="size-3.5 shrink-0 opacity-80" aria-hidden />
          PDF
        </button>
        <button
          type="button"
          disabled={exportDisabled}
          onClick={onExportExcel}
          className={hub.btnOutline}
        >
          <Table2 className="size-3.5 shrink-0 opacity-80" aria-hidden />
          Excel
        </button>
        <button
          type="button"
          disabled={exportDisabled}
          onClick={onExportCsv}
          className={hub.btnOutline}
        >
          <Download className="size-3.5 shrink-0 opacity-80" aria-hidden />
          CSV
        </button>
      </div>
    </div>
  )
}
