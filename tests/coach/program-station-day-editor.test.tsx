import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ProgramDayEditor } from '@/components/coach/programs/station/ProgramDayEditor'
import { summarizeDaySlot } from '@/lib/programs/stationScheduleUtils'

const mockUpdateWorkout = jest.fn()
const mockBuildDay = jest.fn()

jest.mock('@/contexts/ProgramDraftContext', () => ({
  useProgramDraft: () => ({
    workingCopy: {
      workouts: {
        'tpl-abc': { id: 'tpl-abc', name: 'Upper', kind: 'program_day', groups: [{ slots: [{}, {}] }] },
      },
    },
    updateWorkout: mockUpdateWorkout,
    buildDay: mockBuildDay,
    insertLibraryDay: jest.fn(),
    clearDay: jest.fn(),
  }),
}))

jest.mock('@/components/workout-canvas/WorkoutCanvasCore', () => ({
  WorkoutCanvasCore: ({
    workout,
    onWorkoutChange,
  }: {
    workout: { id: string; name: string; groups: Array<{ slots: unknown[] }> }
    onWorkoutChange?: (w: { name: string; groups: Array<{ slots: unknown[] }> }) => void
  }) => (
    <div data-testid="mock-canvas-core" data-workout-id={workout.id}>
      <button
        type="button"
        data-testid="simulate-edit"
        onClick={() =>
          onWorkoutChange?.({
            name: 'Edited day',
            groups: [{ slots: [{}, {}] }],
          })
        }
      >
        Edit
      </button>
    </div>
  ),
}))

jest.mock('@/lib/programs/stationDayWorkout', () => ({
  saveDayWorkoutToLibrary: jest.fn().mockResolvedValue('lib-id'),
  listLibraryWorkouts: jest.fn().mockResolvedValue([
    { id: 'lib-1', name: 'Push day', exercise_count: 5 },
  ]),
}))

jest.mock('@/components/ui/toast-provider', () => ({
  useToast: () => ({ addToast: jest.fn() }),
}))

jest.mock('lucide-react', () => ({
  MoreVertical: () => <span />,
  Dumbbell: () => <span />,
  Library: () => <span />,
  Search: () => <span />,
}))

describe('ProgramDayEditor draft mode', () => {
  test('rest day shows build-from-scratch affordance', () => {
    render(
      <ProgramDayEditor
        coachId="coach-1"
        absoluteWeek={1}
        programDay={3}
        summary={summarizeDaySlot(undefined)}
        activeBlockId="block-1"
      />,
    )
    expect(screen.getByTestId('rest-day-add-workout')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('build-from-scratch'))
    expect(mockBuildDay).toHaveBeenCalledWith(1, 3, 'block-1')
  })

  test('scheduled day mounts canvas from working copy workout prop', () => {
    render(
      <ProgramDayEditor
        coachId="coach-1"
        absoluteWeek={2}
        programDay={1}
        summary={{
          label: 'Upper',
          isRest: false,
          isOptional: false,
          templateId: 'tpl-abc',
          exerciseCount: 4,
        }}
        activeBlockId="block-1"
      />,
    )
    const canvas = screen.getByTestId('mock-canvas-core')
    expect(canvas).toHaveAttribute('data-workout-id', 'tpl-abc')
  })

  test('canvas edits update working copy via draft context', () => {
    render(
      <ProgramDayEditor
        coachId="coach-1"
        absoluteWeek={1}
        programDay={1}
        summary={{
          label: 'Legs',
          isRest: false,
          isOptional: false,
          templateId: 'tpl-abc',
        }}
        activeBlockId="block-1"
      />,
    )
    fireEvent.click(screen.getByTestId('simulate-edit'))
    expect(mockUpdateWorkout).toHaveBeenCalledWith('tpl-abc', expect.objectContaining({ name: 'Edited day' }))
  })
})
