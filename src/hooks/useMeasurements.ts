'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  getClientMeasurements,
  getLatestMeasurement,
  getMeasurementProgress,
  getMeasurementTrend,
  isDueForMeasurement,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
  validateMeasurement,
  type BodyMeasurement,
  type MeasurementProgress
} from '@/lib/measurementService'

/**
 * Hook for client's measurement history
 */
export function useMeasurements(clientId: string, limit?: number) {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!clientId) return

    setLoading(true)
    setError(null)
    try {
      const data = await getClientMeasurements(clientId, limit)
      setMeasurements(data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load measurements'
      setError(errorMsg)
      console.error('Error loading measurements:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId, limit])

  useEffect(() => {
    load()
  }, [load])

  return {
    measurements,
    loading,
    error,
    refresh: load
  }
}

/**
 * Hook for latest measurement
 */
export function useLatestMeasurement(clientId: string) {
  const [measurement, setMeasurement] = useState<BodyMeasurement | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!clientId) return

    setLoading(true)
    try {
      const data = await getLatestMeasurement(clientId)
      setMeasurement(data)
    } catch (error) {
      console.error('Error loading latest measurement:', error)
      setMeasurement(null)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    load()
  }, [load])

  return {
    measurement,
    loading,
    refresh: load
  }
}

/**
 * Hook for measurement progress (current vs previous)
 */
export function useMeasurementProgress(clientId: string) {
  const [progress, setProgress] = useState<MeasurementProgress | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!clientId) return

    setLoading(true)
    try {
      const data = await getMeasurementProgress(clientId)
      setProgress(data)
    } catch (error) {
      console.error('Error loading measurement progress:', error)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    load()
  }, [load])

  return {
    progress,
    loading,
    refresh: load
  }
}

/**
 * Hook for measurement trend chart data
 */
export function useMeasurementTrend(clientId: string, months: number = 6) {
  const [trend, setTrend] = useState<{
    dates: string[]
    weight: number[]
    waist: number[]
  }>({ dates: [], weight: [], waist: [] })
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!clientId) return

    setLoading(true)
    try {
      const data = await getMeasurementTrend(clientId, months)
      setTrend(data)
    } catch (error) {
      console.error('Error loading measurement trend:', error)
      setTrend({ dates: [], weight: [], waist: [] })
    } finally {
      setLoading(false)
    }
  }, [clientId, months])

  useEffect(() => {
    load()
  }, [load])

  return {
    trend,
    loading,
    refresh: load
  }
}

/**
 * Hook for creating/updating measurements
 */
export function useMeasurementForm(clientId: string) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async (
    measurement: Partial<BodyMeasurement>,
    measurementId?: string
  ): Promise<BodyMeasurement | null> => {
    setSaving(true)
    setError(null)

    try {
      // Validate
      const validation = validateMeasurement(measurement)
      if (!validation.valid) {
        setError(validation.errors.join(', '))
        return null
      }

      let result: BodyMeasurement | null

      if (measurementId) {
        // Update existing
        result = await updateMeasurement(measurementId, measurement)
      } else {
        // Create new
        result = await createMeasurement({
          ...measurement,
          client_id: clientId
        } as Omit<BodyMeasurement, 'id' | 'created_at' | 'updated_at'>)
      }

      if (!result) {
        setError('Failed to save measurement')
      }

      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      return null
    } finally {
      setSaving(false)
    }
  }, [clientId])

  const deleteM = useCallback(async (measurementId: string): Promise<boolean> => {
    setSaving(true)
    setError(null)

    try {
      const success = await deleteMeasurement(measurementId)
      if (!success) {
        setError('Failed to delete measurement')
      }
      return success
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    save,
    delete: deleteM,
    saving,
    error,
    clearError: () => setError(null)
  }
}

/**
 * Hook to check if measurement is due
 */
export function useMeasurementDue(clientId: string) {
  const [isDue, setIsDue] = useState(false)
  const [loading, setLoading] = useState(false)

  const check = useCallback(async () => {
    if (!clientId) return

    setLoading(true)
    try {
      const due = await isDueForMeasurement(clientId)
      setIsDue(due)
    } catch (error) {
      console.error('Error checking measurement due:', error)
      setIsDue(false)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    check()
  }, [check])

  return {
    isDue,
    loading,
    refresh: check
  }
}

