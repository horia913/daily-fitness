import React from 'react'
import { render, screen } from '@testing-library/react'
import { PreviousPerformanceCard } from '../PreviousPerformanceCard'

jest.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  Trophy: () => <span data-testid="icon-trophy" />,
}))

const defaultTheme = {
  text: 'text-gray-900',
  textSecondary: 'text-gray-600',
}

describe('PreviousPerformanceCard', () => {
  test('renders with loading state', () => {
    const { container } = render(
      <PreviousPerformanceCard
        previousPerformance={{
          lastWorkout: null,
          personalBest: null,
          loading: true,
        }}
        theme={defaultTheme}
      />
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  test('renders nothing when no previous performance and not loading', () => {
    const { container } = render(
      <PreviousPerformanceCard
        previousPerformance={{
          lastWorkout: null,
          personalBest: null,
          loading: false,
        }}
        theme={defaultTheme}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders with valid previous performance data', () => {
    const lastWorkout = {
      weight_kg: 60,
      reps: 10,
      logged_at: '2025-02-01T12:00:00Z',
    }
    const personalBest = {
      weight_kg: 70,
      reps_completed: 8,
      logged_at: '2025-02-15T12:00:00Z',
    }
    render(
      <PreviousPerformanceCard
        previousPerformance={{
          lastWorkout,
          personalBest,
          loading: false,
        }}
        theme={defaultTheme}
      />
    )
    expect(screen.getByText('Previous performance')).toBeInTheDocument()
    expect(screen.getByText('Last workout')).toBeInTheDocument()
    expect(screen.getByText('Personal best')).toBeInTheDocument()
    expect(screen.getByText(/60/)).toBeInTheDocument()
    expect(screen.getByText(/10/)).toBeInTheDocument()
    expect(screen.getByText(/70/)).toBeInTheDocument()
    expect(screen.getByText(/8/)).toBeInTheDocument()
    expect(screen.getByText(new Date(lastWorkout.logged_at).toLocaleDateString())).toBeInTheDocument()
  })
})
