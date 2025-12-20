'use client'

import { useState, useRef, useEffect } from 'react'
import { ImageTransform, IMAGE_SIZES, IMAGE_QUALITY } from '@/lib/imageTransform'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  quality?: 'low' | 'medium' | 'high' | 'maximum'
  format?: 'webp' | 'jpeg' | 'png'
  lazy?: boolean
  placeholder?: 'blur' | 'skeleton'
  fallback?: React.ReactNode
  onLoad?: () => void
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  quality = 'medium',
  format = 'webp',
  lazy = true,
  placeholder = 'blur',
  fallback,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(!lazy)
  const imgRef = useRef<HTMLImageElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    observer.observe(imgRef.current)

    return () => observer.disconnect()
  }, [lazy])

  // Generate optimized image URL
  const optimizedSrc = ImageTransform.isSupabaseImage(src)
    ? ImageTransform.getOptimizedImageUrl(src, {
        width,
        height,
        quality: IMAGE_QUALITY[quality.toUpperCase() as keyof typeof IMAGE_QUALITY],
        format,
        resize: 'cover'
      })
    : src

  // Generate placeholder URL
  const placeholderSrc = placeholder === 'blur' && ImageTransform.isSupabaseImage(src)
    ? ImageTransform.getBlurredPlaceholder(src)
    : undefined

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  if (hasError && fallback) {
    return <>{fallback}</>
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Placeholder */}
      {!isLoaded && placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Skeleton placeholder */}
      {!isLoaded && placeholder === 'skeleton' && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
      )}

      {/* Main image */}
      {isInView && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? 'lazy' : 'eager'}
        />
      )}

      {/* Error state */}
      {hasError && !fallback && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
          <span className="text-slate-400 text-sm">Image unavailable</span>
        </div>
      )}
    </div>
  )
}

// Specialized components for common use cases
export function ExerciseThumbnail({
  src,
  alt,
  size = 'medium',
  className,
  ...props
}: {
  src: string
  alt: string
  size?: 'small' | 'medium' | 'large'
  className?: string
} & Omit<OptimizedImageProps, 'width' | 'height'>) {
  const sizes = {
    small: IMAGE_SIZES.EXERCISE_THUMBNAIL,
    medium: IMAGE_SIZES.EXERCISE_CARD,
    large: IMAGE_SIZES.EXERCISE_DETAIL
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={sizes[size].width}
      height={sizes[size].height}
      className={cn('rounded-lg object-cover', className)}
      quality="medium"
      placeholder="blur"
      {...props}
    />
  )
}

export function AvatarImage({
  src,
  alt,
  size = 'medium',
  className,
  ...props
}: {
  src: string
  alt: string
  size?: 'small' | 'medium' | 'large'
  className?: string
} & Omit<OptimizedImageProps, 'width' | 'height'>) {
  const sizes = {
    small: IMAGE_SIZES.AVATAR_SMALL,
    medium: IMAGE_SIZES.AVATAR_MEDIUM,
    large: IMAGE_SIZES.AVATAR_LARGE
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={sizes[size].width}
      height={sizes[size].height}
      className={cn('rounded-full object-cover', className)}
      quality="high"
      placeholder="blur"
      {...props}
    />
  )
}

export function ResponsiveImage({
  src,
  alt,
  className,
  ...props
}: {
  src: string
  alt: string
  className?: string
} & Omit<OptimizedImageProps, 'width' | 'height'>) {
  const [imageUrls, setImageUrls] = useState<{
    mobile: string
    tablet: string
    desktop: string
    original: string
  } | null>(null)

  useEffect(() => {
    if (ImageTransform.isSupabaseImage(src)) {
      setImageUrls(ImageTransform.getResponsiveImageUrls(src))
    }
  }, [src])

  return (
    <picture className={cn('block', className)}>
      {/* Desktop */}
      {imageUrls && (
        <source
          media="(min-width: 1024px)"
          srcSet={ImageTransform.getOptimizedImageUrl(src, {
            ...IMAGE_SIZES.DESKTOP,
            quality: IMAGE_QUALITY.HIGH,
            format: 'webp'
          })}
          type="image/webp"
        />
      )}

      {/* Tablet */}
      {imageUrls && (
        <source
          media="(min-width: 640px)"
          srcSet={ImageTransform.getOptimizedImageUrl(src, {
            ...IMAGE_SIZES.TABLET,
            quality: IMAGE_QUALITY.MEDIUM,
            format: 'webp'
          })}
          type="image/webp"
        />
      )}

      {/* Mobile */}
      {imageUrls && (
        <source
          media="(max-width: 639px)"
          srcSet={ImageTransform.getOptimizedImageUrl(src, {
            ...IMAGE_SIZES.MOBILE,
            quality: IMAGE_QUALITY.MEDIUM,
            format: 'webp'
          })}
          type="image/webp"
        />
      )}

      {/* Fallback */}
      <OptimizedImage
        src={src}
        alt={alt}
        className="w-full h-auto"
        quality="medium"
        {...props}
      />
    </picture>
  )
}
