import {
  buildPhaseWeekRanges,
  clientPhaseChipLabel,
  clientPhaseSecondaryLabel,
  formatPhaseWeekSpanLabel,
  isLegacyCoachBlockPhaseName,
} from '@/lib/clientInstancePhaseContext'
import type { InstancePhaseRow } from '@/lib/programInstance/instanceCanvasLoad'

describe('clientInstancePhaseContext', () => {
  it('detects legacy coach block phase names', () => {
    expect(isLegacyCoachBlockPhaseName('Block 1')).toBe(true)
    expect(isLegacyCoachBlockPhaseName('training block 2')).toBe(true)
    expect(isLegacyCoachBlockPhaseName('Hypertrophy')).toBe(false)
    expect(isLegacyCoachBlockPhaseName('Phase 2')).toBe(false)
  })

  it('clientPhaseChipLabel prefers phase_label and never returns Block N', () => {
    expect(
      clientPhaseChipLabel({
        phase_label: 'test',
        name: 'Block 1',
        phase_order: 1,
      }),
    ).toBe('test')

    expect(
      clientPhaseChipLabel({
        phase_label: null,
        name: 'Block 1',
        phase_order: 1,
      }),
    ).toBe('Phase 1')

    expect(
      clientPhaseChipLabel({
        phase_label: null,
        name: 'Phase 2',
        phase_order: 2,
      }),
    ).toBe('Phase 2')
  })

  it('clientPhaseSecondaryLabel hides redundant or legacy names', () => {
    expect(
      clientPhaseSecondaryLabel({
        phase_label: null,
        name: 'Block 1',
        phase_order: 1,
      }),
    ).toBeNull()

    expect(
      clientPhaseSecondaryLabel({
        phase_label: 'test',
        name: 'Phase 2',
        phase_order: 2,
      }),
    ).toBe('Phase 2')
  })

  it('buildPhaseWeekRanges matches instance phase durations', () => {
    const phases: InstancePhaseRow[] = [
      {
        id: 'a',
        name: 'Block 1',
        duration_weeks: 9,
        phase_order: 1,
        phase_label: null,
        notes: null,
      },
      {
        id: 'b',
        name: 'Phase 2',
        duration_weeks: 4,
        phase_order: 2,
        phase_label: 'test',
        notes: null,
      },
    ]
    const ranges = buildPhaseWeekRanges(phases)
    expect(ranges[0].startWeek).toBe(1)
    expect(ranges[0].endWeek).toBe(9)
    expect(ranges[1].startWeek).toBe(10)
    expect(ranges[1].endWeek).toBe(13)
    expect(formatPhaseWeekSpanLabel(phases[0], 1, 9)).toBe('Phase 1 · Weeks 1–9')
    expect(formatPhaseWeekSpanLabel(phases[1], 10, 13)).toBe('test · Weeks 10–13')
  })
})
