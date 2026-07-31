import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ProgramSaveButton } from '@/components/coach/programs/station/ProgramSaveButton'

describe('ProgramSaveButton', () => {
  test('disables button while saving', () => {
    const onSave = jest.fn()
    render(
      <ProgramSaveButton saveState="saving" isDirty onSave={onSave} />,
    )
    const button = screen.getByTestId('program-save-button')
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onSave).not.toHaveBeenCalled()
  })

  test('shows error message as text, not object', () => {
    render(
      <ProgramSaveButton
        saveState="error"
        isDirty
        errorMessage="[23502] null value in column"
        onSave={() => undefined}
      />,
    )
    expect(screen.getByText('[23502] null value in column')).toBeInTheDocument()
  })
})
