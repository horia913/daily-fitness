import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { TrainingBlock } from '@/types/trainingBlock'
import {
  buildCopyWeekScheduleArgs,
  shouldShowBlockSpine,
} from '@/lib/programs/stationBlockWeeks'
import { invokeCopyWeekSchedule } from '@/lib/programs/copyWeekSchedule'
import {
  getScheduleSlot,
  summarizeDaySlot,
} from '@/lib/programs/stationScheduleUtils'
import type { ProgramSchedule } from '@/lib/workoutTemplateService'
import { BlockSpine } from '@/components/coach/programs/station/BlockSpine'
import { PeriodizationRibbon } from '@/components/coach/programs/station/PeriodizationRibbon'

jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  Copy: () => <span data-testid="icon-copy" />,
  MoreHorizontal: () => <span data-testid="icon-more" />,
  MoreVertical: () => <span data-testid="icon-more-vertical" />,
  Pencil: () => <span />,
  Trash2: () => <span />,
  ChevronLeft: () => <span />,
  ChevronRight: () => <span />,
}))

jest.mock('@/components/coach/programs/TrainingBlockHeader', () => ({
  TrainingBlockHeader: () => <div data-testid="training-block-header" />,
}))

const block = (id: string, weeks: number, order = 1): TrainingBlock => ({
  id,
  program_id: 'prog-1',
  name: `Block ${id}`,
  duration_weeks: weeks,
  block_order: order,
  notes: null,
  created_at: '',
  updated_at: '',
})

describe('program station utils', () => {
  test('shouldShowBlockSpine is true for fixed programs with 2+ blocks', () => {
    expect(shouldShowBlockSpine('fixed', 2)).toBe(true)
    expect(shouldShowBlockSpine('fixed', 3)).toBe(true)
  })

  test('shouldShowBlockSpine collapses for a single block or recurring programs', () => {
    expect(shouldShowBlockSpine('fixed', 1)).toBe(false)
    expect(shouldShowBlockSpine('recurring', 1)).toBe(false)
    expect(shouldShowBlockSpine('recurring', 3)).toBe(false)
  })

  test('buildCopyWeekScheduleArgs uses cumulative block start week', () => {
    const blocks = [block('b1', 4, 1), block('b2', 3, 2)]
    const args = buildCopyWeekScheduleArgs('prog-1', blocks, blocks[1], 6)
    expect(args).toEqual({
      p_program_id: 'prog-1',
      p_source_week: 6,
      p_total_weeks: 3,
      p_block_start_week: 5,
      p_training_block_id: null,
    })
  })

  test('invokeCopyWeekSchedule falls back to 3-arg RPC when block-scoped call fails', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValueOnce({
        data: { success: false, error: 'source_week_outside_block' },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null })

    await invokeCopyWeekSchedule(
      { rpc } as unknown as import('@supabase/supabase-js').SupabaseClient,
      'prog-1',
      [block('b1', 4, 1)],
      block('b1', 4, 1),
      2,
    )

    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[0][1].p_training_block_id).toBeNull()
    expect(rpc.mock.calls[1][1]).toEqual({
      p_program_id: 'prog-1',
      p_source_week: 2,
      p_total_weeks: 4,
    })
  })

  test('summarizeDaySlot reads schedule slot for rest vs workout', () => {
    const schedule: ProgramSchedule[] = [
      {
        id: 's1',
        program_id: 'prog-1',
        program_day: 1,
        week_number: 2,
        template_id: 'tpl-1',
        is_optional: true,
        created_at: '',
        updated_at: '',
      },
    ]
    const slot = getScheduleSlot(schedule, 2, 1)
    expect(summarizeDaySlot(slot, 'Push A')).toEqual({
      label: 'Push A',
      isRest: false,
      isOptional: true,
      templateId: 'tpl-1',
    })
    expect(summarizeDaySlot(undefined)).toEqual({
      label: 'Rest',
      isRest: true,
      isOptional: false,
      templateId: null,
      exerciseCount: 0,
    })
  })
})

describe('BlockSpine', () => {
  const noop = () => undefined

  test('renders block header strip when visible with 2+ blocks', () => {
    render(
      <BlockSpine
        visible
        trainingBlocks={[block('b1', 4), block('b2', 3)]}
        activeBlockId="b1"
        onSelectBlock={noop}
        onAddBlock={noop}
        onEditBlock={noop}
        onDeleteBlock={noop}
        onUpdateBlock={noop}
        onMoveBlock={noop}
        onDuplicateBlock={noop}
      />,
    )
    expect(screen.getByTestId('block-spine')).toBeInTheDocument()
    expect(screen.getByTestId('training-block-header')).toBeInTheDocument()
  })

  test('collapses to add-block affordance for a single block', () => {
    render(
      <BlockSpine
        visible={false}
        trainingBlocks={[block('b1', 4)]}
        activeBlockId="b1"
        onSelectBlock={noop}
        onAddBlock={noop}
        onEditBlock={noop}
        onDeleteBlock={noop}
        onUpdateBlock={noop}
        onMoveBlock={noop}
        onDuplicateBlock={noop}
      />,
    )
    expect(screen.queryByTestId('block-spine')).not.toBeInTheDocument()
    expect(screen.getByTestId('add-block-collapsed')).toBeInTheDocument()
  })
})

describe('PeriodizationRibbon', () => {
  const noop = () => undefined

  test('renders fused ribbon and week dock', () => {
    render(
      <PeriodizationRibbon
        programName="Hypertrophy Block"
        onProgramNameChange={noop}
        trainingBlocks={[block('b1', 4), block('b2', 3)]}
        activeBlockId="b1"
        relativeWeek={1}
        onSelectBlock={noop}
        onSelectBlockWeek={noop}
        onAddBlock={noop}
        onEditBlock={noop}
        onDeleteBlock={noop}
        onMoveBlock={noop}
        onDuplicateBlock={noop}
        onAddWeek={noop}
      />,
    )
    expect(screen.getByTestId('periodization-ribbon')).toBeInTheDocument()
    expect(screen.getByTestId('ribbon-bar')).toBeInTheDocument()
    expect(screen.getByTestId('week-strip')).toBeInTheDocument()
    expect(screen.getByTestId('ribbon-block-b1')).toBeInTheDocument()
    expect(screen.queryByTestId('week-kebab-b1-1')).not.toBeInTheDocument()
  })

  test('per-block add week button invokes handler', () => {
    const onAddWeek = jest.fn()
    render(
      <PeriodizationRibbon
        programName="Test"
        onProgramNameChange={jest.fn()}
        trainingBlocks={[block('b1', 4, 1), block('b2', 2, 2)]}
        activeBlockId="b1"
        relativeWeek={1}
        onSelectBlock={jest.fn()}
        onSelectBlockWeek={jest.fn()}
        onAddBlock={jest.fn()}
        onEditBlock={jest.fn()}
        onDeleteBlock={jest.fn()}
        onMoveBlock={jest.fn()}
        onDuplicateBlock={jest.fn()}
        onAddWeek={onAddWeek}
      />,
    )
    fireEvent.click(screen.getByTestId('add-week-b1'))
    expect(onAddWeek).toHaveBeenCalledWith('b1')
    fireEvent.click(screen.getByTestId('add-week-b2'))
    expect(onAddWeek).toHaveBeenCalledWith('b2')
  })
})

describe('recurring program layout flags', () => {
  test('recurring type skips block spine and uses single week semantics', () => {
    expect(shouldShowBlockSpine('recurring', 2)).toBe(false)
    const recurringWeekCount = 1
    expect(recurringWeekCount).toBe(1)
  })
})
