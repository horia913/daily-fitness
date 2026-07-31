import React from 'react'
import { render, screen } from '@testing-library/react'
import { ProgramSaveOverlay } from '@/components/coach/programs/station/ProgramSaveOverlay'

jest.mock('lucide-react', () => ({
  Loader2: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="save-overlay-spinner" {...props} />
  ),
}))

describe('ProgramSaveOverlay', () => {
  test('renders nothing when not visible', () => {
    const { container } = render(<ProgramSaveOverlay visible={false} />)
    expect(container.firstChild).toBeNull()
  })

  test('shows blocking overlay with spinner and title when visible', () => {
    render(<ProgramSaveOverlay visible showSubline={false} />)
    const overlay = screen.getByTestId('program-save-overlay')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveAttribute('aria-busy', 'true')
    expect(overlay).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Saving program…')).toBeInTheDocument()
    expect(screen.getByTestId('save-overlay-spinner')).toBeInTheDocument()
    expect(screen.queryByText('Saving your changes')).not.toBeInTheDocument()
  })

  test('shows subline for larger commits', () => {
    render(<ProgramSaveOverlay visible showSubline />)
    expect(screen.getByText('Saving your changes')).toBeInTheDocument()
  })
})
