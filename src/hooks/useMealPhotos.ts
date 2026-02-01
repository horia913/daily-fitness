'use client'

import { useState, useCallback } from 'react'
import {
  uploadMealPhoto,
  getMealPhotosForDay,
  getMealPhotoForDate,
  isMealLoggedToday,
  getTodayAdherence,
  deleteMealPhoto,
  validateMealOptionForUpload,
  type MealPhotoLog,
  type UploadPhotoResult
} from '@/lib/mealPhotoService'

/**
 * Hook for meal photo uploads with "1 photo per meal per day" enforcement
 * 
 * IMPORTANT: meal_option_id is INFORMATIONAL ONLY
 * - If meal has options → mealOptionId is REQUIRED
 * - If meal has no options → mealOptionId should be NULL/undefined
 * - You CANNOT upload multiple photos for the same meal by using different options
 */
export function useMealPhotoUpload(clientId: string) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  /**
   * Upload a meal photo
   * @param mealId - The meal ID
   * @param file - The photo file
   * @param logDate - Optional date (defaults to today)
   * @param notes - Optional notes
   * @param mealOptionId - Option ID if meal has options (INFORMATIONAL ONLY)
   * @param mealHasOptions - Whether the meal has options configured (for validation)
   */
  const upload = useCallback(async (
    mealId: string,
    file: File,
    logDate?: string,
    notes?: string,
    mealOptionId?: string | null,
    mealHasOptions?: boolean
  ): Promise<UploadPhotoResult> => {
    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Validate option requirement if meal has options
      if (mealHasOptions !== undefined) {
        const validationError = validateMealOptionForUpload(mealHasOptions, mealOptionId)
        if (validationError) {
          setError(validationError)
          return { success: false, error: validationError }
        }
      }

      // Simulate progress (real progress tracking would need additional setup)
      setUploadProgress(25)
      
      const result = await uploadMealPhoto(clientId, mealId, file, logDate, notes, mealOptionId)
      
      setUploadProgress(100)
      
      if (!result.success) {
        setError(result.error || 'Upload failed')
      }

      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 500) // Reset after animation
    }
  }, [clientId])

  const reset = useCallback(() => {
    setUploading(false)
    setUploadProgress(0)
    setError(null)
  }, [])

  return {
    upload,
    uploading,
    uploadProgress,
    error,
    reset
  }
}

/**
 * Hook for checking if meal is already logged today
 */
export function useMealLogStatus(clientId: string, mealId: string | null) {
  const [logged, setLogged] = useState(false)
  const [photoLog, setPhotoLog] = useState<MealPhotoLog | undefined>()
  const [loading, setLoading] = useState(false)

  const checkStatus = useCallback(async () => {
    if (!mealId) return

    setLoading(true)
    try {
      const result = await isMealLoggedToday(clientId, mealId)
      setLogged(result.logged)
      setPhotoLog(result.photoLog)
    } catch (error) {
      console.error('Error checking meal log status:', error)
      setLogged(false)
      setPhotoLog(undefined)
    } finally {
      setLoading(false)
    }
  }, [clientId, mealId])

  return {
    logged,
    photoLog,
    loading,
    refresh: checkStatus
  }
}

/**
 * Hook for today's meal adherence widget
 */
export function useTodayMealAdherence(clientId: string, expectedMeals: number) {
  const [adherence, setAdherence] = useState({
    logged: 0,
    expected: expectedMeals,
    percentage: 0
  })
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getTodayAdherence(clientId, expectedMeals)
      setAdherence(result)
    } catch (error) {
      console.error('Error fetching today adherence:', error)
    } finally {
      setLoading(false)
    }
  }, [clientId, expectedMeals])

  return {
    adherence,
    loading,
    refresh
  }
}

/**
 * Hook for fetching day's meal photo logs
 */
export function useDayMealPhotos(clientId: string, date: string) {
  const [photos, setPhotos] = useState<MealPhotoLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getMealPhotosForDay(clientId, date)
      setPhotos(result)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load photos'
      setError(errorMsg)
      console.error('Error fetching day meal photos:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId, date])

  const deletePhoto = useCallback(async (photoId: string) => {
    const success = await deleteMealPhoto(photoId)
    if (success) {
      setPhotos(prev => prev.filter(p => p.id !== photoId))
    }
    return success
  }, [])

  return {
    photos,
    loading,
    error,
    load,
    deletePhoto,
    refresh: load
  }
}

/**
 * Hook for checking specific meal's log status (for any date)
 */
export function useMealPhotoForDate(
  clientId: string,
  mealId: string | null,
  date: string
) {
  const [photoLog, setPhotoLog] = useState<MealPhotoLog | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!mealId) {
      setPhotoLog(null)
      return
    }

    setLoading(true)
    try {
      const result = await getMealPhotoForDate(clientId, mealId, date)
      setPhotoLog(result)
    } catch (error) {
      console.error('Error fetching meal photo for date:', error)
      setPhotoLog(null)
    } finally {
      setLoading(false)
    }
  }, [clientId, mealId, date])

  return {
    photoLog,
    loading,
    load,
    refresh: load
  }
}

