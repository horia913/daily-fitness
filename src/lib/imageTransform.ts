import { supabase } from './supabase'

// Image transformation utilities for Supabase Storage
export class ImageTransform {
  private static readonly SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  private static readonly STORAGE_BUCKET = 'exercise-images'

  /**
   * Generate optimized image URL with transformations
   */
  static getOptimizedImageUrl(
    imagePath: string,
    options: {
      width?: number
      height?: number
      quality?: number
      format?: 'webp' | 'jpeg' | 'png'
      resize?: 'cover' | 'contain' | 'fill'
      blur?: number
    } = {}
  ): string {
    if (!imagePath || !this.SUPABASE_URL) {
      return imagePath
    }

    // Extract the file path from the full URL if it's a complete URL
    const filePath = imagePath.includes(this.SUPABASE_URL) 
      ? imagePath.split('/storage/v1/object/public/')[1]?.split('/').slice(1).join('/')
      : imagePath

    if (!filePath) {
      return imagePath
    }

    const {
      width,
      height,
      quality = 80,
      format = 'webp',
      resize = 'cover',
      blur = 0
    } = options

    // Build transformation parameters
    const params = new URLSearchParams()
    
    if (width) params.append('width', width.toString())
    if (height) params.append('height', height.toString())
    if (quality !== 80) params.append('quality', quality.toString())
    if (format !== 'webp') params.append('format', format)
    if (resize !== 'cover') params.append('resize', resize)
    if (blur > 0) params.append('blur', blur.toString())

    const transformQuery = params.toString()
    const baseUrl = `${this.SUPABASE_URL}/storage/v1/render/image/public/${this.STORAGE_BUCKET}/${filePath}`
    
    return transformQuery ? `${baseUrl}?${transformQuery}` : baseUrl
  }

  /**
   * Get thumbnail URL for exercise images
   */
  static getThumbnailUrl(imagePath: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    const sizes = {
      small: { width: 64, height: 64 },
      medium: { width: 128, height: 128 },
      large: { width: 256, height: 256 }
    }

    return this.getOptimizedImageUrl(imagePath, {
      ...sizes[size],
      quality: 85,
      format: 'webp',
      resize: 'cover'
    })
  }

  /**
   * Get avatar URL with transformations
   */
  static getAvatarUrl(avatarPath: string, size: number = 40): string {
    return this.getOptimizedImageUrl(avatarPath, {
      width: size,
      height: size,
      quality: 90,
      format: 'webp',
      resize: 'cover'
    })
  }

  /**
   * Get responsive image URLs for different screen sizes
   */
  static getResponsiveImageUrls(imagePath: string): {
    mobile: string
    tablet: string
    desktop: string
    original: string
  } {
    return {
      mobile: this.getOptimizedImageUrl(imagePath, { width: 320, height: 240, quality: 80 }),
      tablet: this.getOptimizedImageUrl(imagePath, { width: 640, height: 480, quality: 85 }),
      desktop: this.getOptimizedImageUrl(imagePath, { width: 1024, height: 768, quality: 90 }),
      original: imagePath
    }
  }

  /**
   * Get blurred placeholder URL for lazy loading
   */
  static getBlurredPlaceholder(imagePath: string): string {
    return this.getOptimizedImageUrl(imagePath, {
      width: 20,
      height: 20,
      quality: 20,
      blur: 5,
      format: 'webp'
    })
  }

  /**
   * Upload image with automatic optimization
   */
  static async uploadOptimizedImage(
    file: File,
    userId: string,
    options: {
      maxWidth?: number
      maxHeight?: number
      quality?: number
      format?: 'webp' | 'jpeg' | 'png'
    } = {}
  ): Promise<string> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 85,
      format = 'webp'
    } = options

    // Create optimized file
    const optimizedFile = await this.optimizeImageFile(file, {
      maxWidth,
      maxHeight,
      quality,
      format
    })

    // Upload to Supabase Storage
    const fileExt = format
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from(this.STORAGE_BUCKET)
      .upload(fileName, optimizedFile)

    if (error) throw error

    // Return the optimized URL
    return this.getOptimizedImageUrl(fileName)
  }

  /**
   * Optimize image file before upload
   */
  private static async optimizeImageFile(
    file: File,
    options: {
      maxWidth: number
      maxHeight: number
      quality: number
      format: string
    }
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        const { maxWidth, maxHeight } = options

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        // Set canvas dimensions
        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: `image/${options.format}`,
                lastModified: Date.now()
              })
              resolve(optimizedFile)
            } else {
              reject(new Error('Failed to optimize image'))
            }
          },
          `image/${options.format}`,
          options.quality / 100
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Check if image URL is from Supabase Storage
   */
  static isSupabaseImage(imagePath: string): boolean {
    return imagePath.includes(this.SUPABASE_URL || '') && imagePath.includes('/storage/')
  }

  /**
   * Get image dimensions from URL (if available)
   */
  static getImageDimensions(imagePath: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => resolve(null)
      img.src = imagePath
    })
  }
}

// Predefined image sizes for common use cases
export const IMAGE_SIZES = {
  // Exercise thumbnails
  EXERCISE_THUMBNAIL: { width: 128, height: 128 },
  EXERCISE_CARD: { width: 256, height: 192 },
  EXERCISE_DETAIL: { width: 512, height: 384 },
  
  // Avatar sizes
  AVATAR_SMALL: { width: 32, height: 32 },
  AVATAR_MEDIUM: { width: 40, height: 40 },
  AVATAR_LARGE: { width: 64, height: 64 },
  
  // Responsive breakpoints
  MOBILE: { width: 320, height: 240 },
  TABLET: { width: 640, height: 480 },
  DESKTOP: { width: 1024, height: 768 }
} as const

// Image quality presets
export const IMAGE_QUALITY = {
  LOW: 60,
  MEDIUM: 80,
  HIGH: 90,
  MAXIMUM: 95
} as const
