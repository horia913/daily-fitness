'use client'

import { useState, useEffect, useCallback } from 'react'
import { ImageTransform } from '@/lib/imageTransform'

interface UseImageOptimizationOptions {
  src: string
  width?: number
  height?: number
  quality?: 'low' | 'medium' | 'high' | 'maximum'
  format?: 'webp' | 'jpeg' | 'png'
  lazy?: boolean
  placeholder?: 'blur' | 'skeleton'
}

interface ImageState {
  src: string
  optimizedSrc: string
  placeholderSrc?: string
  isLoaded: boolean
  hasError: boolean
  isInView: boolean
  dimensions?: { width: number; height: number }
}

export function useImageOptimization({
  src,
  width,
  height,
  quality = 'medium',
  format = 'webp',
  lazy = true,
  placeholder = 'blur'
}: UseImageOptimizationOptions) {
  const [state, setState] = useState<ImageState>({
    src,
    optimizedSrc: '',
    placeholderSrc: undefined,
    isLoaded: false,
    hasError: false,
    isInView: !lazy
  })

  // Generate optimized URLs
  useEffect(() => {
    if (!src) return

    const optimizedSrc = ImageTransform.isSupabaseImage(src)
      ? ImageTransform.getOptimizedImageUrl(src, {
          width,
          height,
          quality: ImageTransform.IMAGE_QUALITY[quality],
          format,
          resize: 'cover'
        })
      : src

    const placeholderSrc = placeholder === 'blur' && ImageTransform.isSupabaseImage(src)
      ? ImageTransform.getBlurredPlaceholder(src)
      : undefined

    setState(prev => ({
      ...prev,
      optimizedSrc,
      placeholderSrc
    }))
  }, [src, width, height, quality, format, placeholder])

  // Get image dimensions
  const getDimensions = useCallback(async () => {
    if (!src) return

    try {
      const dimensions = await ImageTransform.getImageDimensions(src)
      setState(prev => ({ ...prev, dimensions }))
    } catch (error) {
      console.warn('Failed to get image dimensions:', error)
    }
  }, [src])

  // Handle image load
  const handleLoad = useCallback(() => {
    setState(prev => ({ ...prev, isLoaded: true, hasError: false }))
  }, [])

  // Handle image error
  const handleError = useCallback(() => {
    setState(prev => ({ ...prev, hasError: true, isLoaded: false }))
  }, [])

  // Set in view for lazy loading
  const setInView = useCallback((inView: boolean) => {
    setState(prev => ({ ...prev, isInView: inView }))
  }, [])

  return {
    ...state,
    getDimensions,
    handleLoad,
    handleError,
    setInView
  }
}

// Hook for managing multiple images (e.g., gallery)
export function useImageGallery(images: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set())

  const handleImageLoad = useCallback((src: string) => {
    setLoadedImages(prev => new Set([...prev, src]))
    setErrorImages(prev => {
      const newSet = new Set(prev)
      newSet.delete(src)
      return newSet
    })
  }, [])

  const handleImageError = useCallback((src: string) => {
    setErrorImages(prev => new Set([...prev, src]))
    setLoadedImages(prev => {
      const newSet = new Set(prev)
      newSet.delete(src)
      return newSet
    })
  }, [])

  const isImageLoaded = useCallback((src: string) => loadedImages.has(src), [loadedImages])
  const hasImageError = useCallback((src: string) => errorImages.has(src), [errorImages])

  return {
    loadedImages: Array.from(loadedImages),
    errorImages: Array.from(errorImages),
    handleImageLoad,
    handleImageError,
    isImageLoaded,
    hasImageError
  }
}

// Hook for image upload with optimization
export function useImageUpload() {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const uploadImage = useCallback(async (
    file: File,
    userId: string,
    options: {
      maxWidth?: number
      maxHeight?: number
      quality?: number
      format?: 'webp' | 'jpeg' | 'png'
    } = {}
  ): Promise<string> => {
    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      const result = await ImageTransform.uploadOptimizedImage(file, userId, options)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploading(false)
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
      setUploadProgress(0)
      throw err
    }
  }, [])

  const reset = useCallback(() => {
    setUploading(false)
    setUploadProgress(0)
    setError(null)
  }, [])

  return {
    uploading,
    uploadProgress,
    error,
    uploadImage,
    reset
  }
}
