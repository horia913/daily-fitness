// Image optimization configuration for Supabase Storage
export const IMAGE_CONFIG = {
  // Storage buckets
  BUCKETS: {
    EXERCISE_IMAGES: 'exercise-images',
    USER_AVATARS: 'user-avatars',
    WORKOUT_THUMBNAILS: 'workout-thumbnails'
  },

  // Image transformation presets
  PRESETS: {
    // Exercise images
    EXERCISE_THUMBNAIL: {
      width: 128,
      height: 128,
      quality: 85,
      format: 'webp' as const,
      resize: 'cover' as const
    },
    EXERCISE_CARD: {
      width: 256,
      height: 192,
      quality: 85,
      format: 'webp' as const,
      resize: 'cover' as const
    },
    EXERCISE_DETAIL: {
      width: 512,
      height: 384,
      quality: 90,
      format: 'webp' as const,
      resize: 'cover' as const
    },

    // Avatar images
    AVATAR_SMALL: {
      width: 32,
      height: 32,
      quality: 90,
      format: 'webp' as const,
      resize: 'cover' as const
    },
    AVATAR_MEDIUM: {
      width: 40,
      height: 40,
      quality: 90,
      format: 'webp' as const,
      resize: 'cover' as const
    },
    AVATAR_LARGE: {
      width: 64,
      height: 64,
      quality: 90,
      format: 'webp' as const,
      resize: 'cover' as const
    },

    // Responsive images
    RESPONSIVE_MOBILE: {
      width: 320,
      height: 240,
      quality: 80,
      format: 'webp' as const,
      resize: 'cover' as const
    },
    RESPONSIVE_TABLET: {
      width: 640,
      height: 480,
      quality: 85,
      format: 'webp' as const,
      resize: 'cover' as const
    },
    RESPONSIVE_DESKTOP: {
      width: 1024,
      height: 768,
      quality: 90,
      format: 'webp' as const,
      resize: 'cover' as const
    },

    // Blur placeholder
    BLUR_PLACEHOLDER: {
      width: 20,
      height: 20,
      quality: 20,
      format: 'webp' as const,
      resize: 'cover' as const,
      blur: 5
    }
  },

  // Upload settings
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    DEFAULT_QUALITY: 85,
    DEFAULT_FORMAT: 'webp' as const,
    MAX_DIMENSIONS: {
      width: 1920,
      height: 1080
    }
  },

  // Performance settings
  PERFORMANCE: {
    LAZY_LOADING_THRESHOLD: 0.1,
    INTERSECTION_ROOT_MARGIN: '50px',
    PLACEHOLDER_BLUR: 5,
    TRANSITION_DURATION: 300
  }
} as const

// Helper functions for common image operations
export const ImageHelpers = {
  // Get optimized URL for exercise thumbnail
  getExerciseThumbnail: (imagePath: string, size: 'small' | 'medium' | 'large' = 'medium') => {
    const preset = size === 'small' ? IMAGE_CONFIG.PRESETS.EXERCISE_THUMBNAIL :
                  size === 'medium' ? IMAGE_CONFIG.PRESETS.EXERCISE_CARD :
                  IMAGE_CONFIG.PRESETS.EXERCISE_DETAIL
    
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/render/image/public/${IMAGE_CONFIG.BUCKETS.EXERCISE_IMAGES}/${imagePath}?${new URLSearchParams({
      width: preset.width.toString(),
      height: preset.height.toString(),
      quality: preset.quality.toString(),
      format: preset.format,
      resize: preset.resize
    }).toString()}`
  },

  // Get optimized URL for avatar
  getAvatar: (imagePath: string, size: 'small' | 'medium' | 'large' = 'medium') => {
    const preset = size === 'small' ? IMAGE_CONFIG.PRESETS.AVATAR_SMALL :
                  size === 'medium' ? IMAGE_CONFIG.PRESETS.AVATAR_MEDIUM :
                  IMAGE_CONFIG.PRESETS.AVATAR_LARGE
    
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/render/image/public/${IMAGE_CONFIG.BUCKETS.USER_AVATARS}/${imagePath}?${new URLSearchParams({
      width: preset.width.toString(),
      height: preset.height.toString(),
      quality: preset.quality.toString(),
      format: preset.format,
      resize: preset.resize
    }).toString()}`
  },

  // Get responsive image URLs
  getResponsiveUrls: (imagePath: string, bucket: string) => {
    return {
      mobile: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/render/image/public/${bucket}/${imagePath}?${new URLSearchParams({
        width: IMAGE_CONFIG.PRESETS.RESPONSIVE_MOBILE.width.toString(),
        height: IMAGE_CONFIG.PRESETS.RESPONSIVE_MOBILE.height.toString(),
        quality: IMAGE_CONFIG.PRESETS.RESPONSIVE_MOBILE.quality.toString(),
        format: IMAGE_CONFIG.PRESETS.RESPONSIVE_MOBILE.format,
        resize: IMAGE_CONFIG.PRESETS.RESPONSIVE_MOBILE.resize
      }).toString()}`,
      
      tablet: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/render/image/public/${bucket}/${imagePath}?${new URLSearchParams({
        width: IMAGE_CONFIG.PRESETS.RESPONSIVE_TABLET.width.toString(),
        height: IMAGE_CONFIG.PRESETS.RESPONSIVE_TABLET.height.toString(),
        quality: IMAGE_CONFIG.PRESETS.RESPONSIVE_TABLET.quality.toString(),
        format: IMAGE_CONFIG.PRESETS.RESPONSIVE_TABLET.format,
        resize: IMAGE_CONFIG.PRESETS.RESPONSIVE_TABLET.resize
      }).toString()}`,
      
      desktop: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/render/image/public/${bucket}/${imagePath}?${new URLSearchParams({
        width: IMAGE_CONFIG.PRESETS.RESPONSIVE_DESKTOP.width.toString(),
        height: IMAGE_CONFIG.PRESETS.RESPONSIVE_DESKTOP.height.toString(),
        quality: IMAGE_CONFIG.PRESETS.RESPONSIVE_DESKTOP.quality.toString(),
        format: IMAGE_CONFIG.PRESETS.RESPONSIVE_DESKTOP.format,
        resize: IMAGE_CONFIG.PRESETS.RESPONSIVE_DESKTOP.resize
      }).toString()}`
    }
  },

  // Validate file before upload
  validateFile: (file: File): { valid: boolean; error?: string } => {
    if (file.size > IMAGE_CONFIG.UPLOAD.MAX_FILE_SIZE) {
      return { valid: false, error: 'File size too large. Maximum 10MB allowed.' }
    }

    if (!IMAGE_CONFIG.UPLOAD.ALLOWED_FORMATS.includes(file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif')) {
      return { valid: false, error: 'Invalid file format. Only JPEG, PNG, WebP, and GIF are allowed.' }
    }

    return { valid: true }
  },

  // Generate file name for upload
  generateFileName: (userId: string, originalName: string, format: string = 'webp'): string => {
    const timestamp = Date.now()
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `${userId}/${timestamp}_${sanitizedName}.${format}`
  }
}
