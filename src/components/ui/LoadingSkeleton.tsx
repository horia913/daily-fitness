/**
 * Loading Skeleton Component
 * Reusable skeleton loader for consistent loading states
 */

import { useTheme } from '@/contexts/ThemeContext'

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'circle' | 'rect'
  width?: string | number
  height?: string | number
  className?: string
  count?: number
}

export function LoadingSkeleton({
  variant = 'rect',
  width,
  height,
  className = '',
  count = 1
}: LoadingSkeletonProps) {
  const { isDark } = useTheme()

  const baseStyles = {
    background: isDark
      ? 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)'
      : 'linear-gradient(90deg, rgba(0,0,0,0.03) 25%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.03) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-loading 1.5s ease-in-out infinite',
    borderRadius: variant === 'circle' ? '50%' : variant === 'card' ? '12px' : '4px',
  }

  const getDimensions = () => {
    if (width && height) {
      return { width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height }
    }
    
    switch (variant) {
      case 'circle':
        return { width: '48px', height: '48px' }
      case 'text':
        return { width: '100%', height: '16px' }
      case 'card':
        return { width: '100%', height: '200px' }
      default:
        return { width: width || '100%', height: height || '20px' }
    }
  }

  const dimensions = getDimensions()

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={className}
          style={{
            ...baseStyles,
            ...dimensions,
            marginBottom: count > 1 && index < count - 1 ? '8px' : '0',
          }}
        />
      ))}
      <style jsx>{`
        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </>
  )
}

/**
 * Card Skeleton - For loading card components
 */
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <LoadingSkeleton variant="text" width="60%" height="24px" className="mb-4" />
          <LoadingSkeleton variant="text" width="100%" height="16px" className="mb-2" />
          <LoadingSkeleton variant="text" width="80%" height="16px" />
        </div>
      ))}
    </div>
  )
}

/**
 * List Skeleton - For loading lists
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <LoadingSkeleton variant="circle" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton variant="text" width="40%" height="16px" />
            <LoadingSkeleton variant="text" width="60%" height="14px" />
          </div>
        </div>
      ))}
    </div>
  )
}

