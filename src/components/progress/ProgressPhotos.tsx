'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { 
  Camera, 
  Calendar, 
  Weight, 
  Upload, 
  Share2, 
  Download, 
  Eye, 
  RotateCcw, 
  Maximize2, 
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  TrendingUp,
  Target,
  Award,
  Heart,
  Star,
  Zap,
  ArrowRight,
  ExternalLink,
  Filter,
  Grid3X3,
  List,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressPhoto {
  id: string
  url: string
  date: string
  bodyweight?: number
  notes?: string
  tags?: string[]
  isFavorite?: boolean
  transformation?: {
    weightChange?: number
    bodyFatChange?: number
    muscleGain?: number
  }
}

interface ProgressPhotosProps {
  photos: ProgressPhoto[]
  loading?: boolean
  onUpload?: () => void
  onShare?: (photo: ProgressPhoto) => void
  onDelete?: (photoId: string) => void
}

export function ProgressPhotos({ 
  photos, 
  loading = false, 
  onUpload, 
  onShare, 
  onDelete 
}: ProgressPhotosProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonPhotos, setComparisonPhotos] = useState<{ before: ProgressPhoto | null; after: ProgressPhoto | null }>({
    before: null,
    after: null
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [filterTag, setFilterTag] = useState<string | null>(null)

  // Get all unique tags
  const allTags = Array.from(new Set(photos.flatMap(photo => photo.tags || [])))
  
  // Filter photos by tag
  const filteredPhotos = filterTag 
    ? photos.filter(photo => photo.tags?.includes(filterTag))
    : photos

  // Sort photos by date (newest first)
  const sortedPhotos = [...filteredPhotos].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const photoDate = new Date(dateString)
    const diffInDays = Math.floor((now.getTime() - photoDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return `${Math.floor(diffInDays / 30)} months ago`
  }

  const handleComparePhotos = (photo1: ProgressPhoto, photo2: ProgressPhoto) => {
    const sorted = [photo1, photo2].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    setComparisonPhotos({ before: sorted[0], after: sorted[1] })
    setShowComparison(true)
  }

  const getTransformationMessage = (photo: ProgressPhoto) => {
    if (!photo.transformation) return null
    
    const { weightChange, bodyFatChange, muscleGain } = photo.transformation
    const messages = []
    
    if (weightChange && weightChange !== 0) {
      messages.push(`${weightChange > 0 ? '+' : ''}${weightChange}kg`)
    }
    if (bodyFatChange && bodyFatChange !== 0) {
      messages.push(`${bodyFatChange > 0 ? '+' : ''}${bodyFatChange}% body fat`)
    }
    if (muscleGain && muscleGain > 0) {
      messages.push(`+${muscleGain}kg muscle`)
    }
    
    return messages.length > 0 ? messages.join(', ') : null
  }

  if (loading) {
    return (
      <div className={cn("fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)] overflow-hidden")}>
        <div className="p-6 pb-4 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts w-12 h-12">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                  Progress
                </span>
                <div className="text-2xl font-bold fc-text-primary mt-2">Progress Photos</div>
                <p className="fc-text-subtle">Your transformation journey</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="animate-pulse space-y-6">
            {/* Header skeleton */}
            <div className="flex gap-4">
              <div className="h-10 bg-[color:var(--fc-glass-border)] rounded-xl w-32"></div>
              <div className="h-10 bg-[color:var(--fc-glass-border)] rounded-xl w-32"></div>
            </div>
            
            {/* Photo grid skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-[3/4] bg-[color:var(--fc-glass-border)] rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)] overflow-hidden">
        <div className="p-6 pb-4 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts w-12 h-12">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                  Progress
                </span>
                <div className="text-2xl font-bold fc-text-primary mt-2">Progress Photos</div>
                <p className="fc-text-subtle">Your transformation journey</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="text-center py-16">
            <div className="w-24 h-24 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Camera className="w-12 h-12 fc-text-workouts" />
            </div>
            <h3 className="text-2xl font-bold fc-text-primary mb-4">
              Start Your Visual Journey
            </h3>
            <p className="fc-text-subtle mb-8 max-w-md mx-auto text-lg">
              Take your first progress photo to begin tracking your amazing transformation!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={onUpload}
                className="fc-btn fc-btn-primary fc-press px-8 py-4 text-lg font-semibold"
              >
                <Camera className="w-5 h-5 mr-2" />
                Take First Photo
              </Button>
              <Button 
                variant="outline" 
                className="fc-btn fc-btn-secondary px-8 py-4 text-lg font-semibold"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Photo
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)] overflow-hidden w-full")}>
      <div className="p-4 sm:p-6 pb-4 border-b border-[color:var(--fc-glass-border)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts w-12 h-12 flex-shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Progress
              </span>
              <div className="text-xl sm:text-2xl font-bold fc-text-primary mt-2">Progress Photos</div>
              <p className="text-sm fc-text-subtle">
                {sortedPhotos.length} photo{sortedPhotos.length !== 1 ? 's' : ''} • Your transformation
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-xl p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "rounded-lg",
                  viewMode === 'grid' 
                    ? "fc-btn fc-btn-secondary" 
                    : "fc-btn fc-btn-ghost"
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className={cn(
                  "rounded-lg",
                  viewMode === 'timeline' 
                    ? "fc-btn fc-btn-secondary" 
                    : "fc-btn fc-btn-ghost"
                )}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Upload Button */}
            <Button 
              onClick={onUpload}
              className="fc-btn fc-btn-primary fc-press rounded-xl px-4 py-2 flex-shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Photo</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Filter Tags */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mt-4 w-full overflow-hidden">
            <Filter className="w-4 h-4 fc-text-subtle flex-shrink-0" />
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1 min-w-0">
              <Button
                variant={filterTag === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTag(null)}
                className={cn(
                  "rounded-xl whitespace-nowrap",
                  filterTag === null 
                    ? "fc-btn fc-btn-primary" 
                    : "fc-btn fc-btn-secondary"
                )}
              >
                All Photos
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant={filterTag === tag ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterTag(tag)}
                  className={cn(
                    "rounded-xl whitespace-nowrap",
                    filterTag === tag 
                      ? "fc-btn fc-btn-primary" 
                      : "fc-btn fc-btn-secondary"
                  )}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 pt-0">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedPhotos.map((photo, index) => (
              <PhotoCard 
                key={photo.id} 
                photo={photo} 
                index={index}
                onCompare={(otherPhoto) => handleComparePhotos(photo, otherPhoto)}
                onShare={() => onShare?.(photo)}
                onDelete={() => onDelete?.(photo.id)}
                formatDate={formatDate}
                getTimeAgo={getTimeAgo}
                getTransformationMessage={getTransformationMessage}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPhotos.map((photo, index) => (
              <TimelinePhotoCard 
                key={photo.id} 
                photo={photo} 
                index={index}
                onCompare={(otherPhoto) => handleComparePhotos(photo, otherPhoto)}
                onShare={() => onShare?.(photo)}
                onDelete={() => onDelete?.(photo.id)}
                formatDate={formatDate}
                getTimeAgo={getTimeAgo}
                getTransformationMessage={getTransformationMessage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comparison Modal */}
      {showComparison && comparisonPhotos.before && comparisonPhotos.after && (
        <ComparisonModal
          beforePhoto={comparisonPhotos.before}
          afterPhoto={comparisonPhotos.after}
          onClose={() => setShowComparison(false)}
          formatDate={formatDate}
        />
      )}
    </div>
  )
}

// Photo Card Component for Grid View
function PhotoCard({ 
  photo, 
  index, 
  onCompare, 
  onShare, 
  onDelete, 
  formatDate, 
  getTimeAgo, 
  getTransformationMessage 
}: {
  photo: ProgressPhoto
  index: number
  onCompare: (otherPhoto: ProgressPhoto) => void
  onShare: () => void
  onDelete: () => void
  formatDate: (date: string) => string
  getTimeAgo: (date: string) => string
  getTransformationMessage: (photo: ProgressPhoto) => string | null
}) {
  const [isHovered, setIsHovered] = useState(false)
  const transformationMessage = getTransformationMessage(photo)

  return (
    <div 
      className="group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Image
        src={photo.url}
        alt={`Progress photo from ${formatDate(photo.date)}`}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-110"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
      
      {/* Overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300",
        isHovered ? "opacity-100" : "opacity-60"
      )}>
        {/* Photo Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">{getTimeAgo(photo.date)}</span>
            </div>
            {photo.isFavorite && (
              <Heart className="w-4 h-4 fc-text-error fill-current" />
            )}
          </div>
          
          {photo.bodyweight && (
            <div className="flex items-center gap-2 mb-2">
              <Weight className="w-4 h-4" />
              <span className="text-sm font-medium">{photo.bodyweight}kg</span>
            </div>
          )}
          
          {transformationMessage && (
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 fc-text-success" />
              <span className="text-sm font-medium fc-text-success">{transformationMessage}</span>
            </div>
          )}
          
          {/* Tags */}
          {photo.tags && photo.tags.length > 0 && (
            <div className="flex gap-1 mb-2">
              {photo.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="fc-pill fc-pill-glass text-xs text-white border border-white/30">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={cn(
          "absolute top-4 right-4 flex gap-2 transition-all duration-300",
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}>
          <Button
            size="sm"
            variant="secondary"
            className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
            onClick={(e) => {
              e.stopPropagation()
              onShare()
            }}
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Compare Button */}
        <div className={cn(
          "absolute bottom-4 right-4 transition-all duration-300",
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}>
          <Button
            size="sm"
            className="fc-btn fc-btn-primary fc-press rounded-xl px-3 py-2"
            onClick={(e) => {
              e.stopPropagation()
              // This would need to be implemented to select another photo for comparison
            }}
          >
            <Eye className="w-4 h-4 mr-1" />
            Compare
          </Button>
        </div>
      </div>
    </div>
  )
}

// Timeline Photo Card Component
function TimelinePhotoCard({ 
  photo, 
  index, 
  onCompare, 
  onShare, 
  onDelete, 
  formatDate, 
  getTimeAgo, 
  getTransformationMessage 
}: {
  photo: ProgressPhoto
  index: number
  onCompare: (otherPhoto: ProgressPhoto) => void
  onShare: () => void
  onDelete: () => void
  formatDate: (date: string) => string
  getTimeAgo: (date: string) => string
  getTransformationMessage: (photo: ProgressPhoto) => string | null
}) {
  const transformationMessage = getTransformationMessage(photo)

  return (
    <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Photo */}
        <div className="relative w-full md:w-48 h-48 md:h-32">
          <Image
            src={photo.url}
            alt={`Progress photo from ${formatDate(photo.date)}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 200px"
          />
          {photo.isFavorite && (
            <div className="absolute top-2 right-2">
              <Heart className="w-5 h-5 fc-text-error fill-current" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold fc-text-primary mb-1">
                {formatDate(photo.date)}
              </h3>
              <p className="text-sm fc-text-subtle">
                {getTimeAgo(photo.date)}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="fc-btn fc-btn-secondary"
                onClick={onShare}
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="fc-btn fc-btn-secondary"
                onClick={onDelete}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-3">
            {photo.bodyweight && (
              <div className="flex items-center gap-2">
                <Weight className="w-4 h-4 fc-text-subtle" />
                <span className="text-sm font-medium fc-text-dim">
                  {photo.bodyweight}kg
                </span>
              </div>
            )}
            
            {transformationMessage && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 fc-text-success" />
                <span className="text-sm font-medium fc-text-success">
                  {transformationMessage}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          {photo.tags && photo.tags.length > 0 && (
            <div className="flex gap-2 mb-3">
              {photo.tags.map((tag) => (
                <span key={tag} className="fc-pill fc-pill-glass text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Notes */}
          {photo.notes && (
            <p className="text-sm fc-text-subtle italic mb-3">
              "{photo.notes}"
            </p>
          )}

          {/* Compare Button */}
          <Button
            size="sm"
            className="fc-btn fc-btn-primary fc-press"
            onClick={() => {
              // This would need to be implemented to select another photo for comparison
            }}
          >
            <Eye className="w-4 h-4 mr-1" />
            Compare with Another Photo
          </Button>
        </div>
      </div>
    </div>
  )
}

// Comparison Modal Component
function ComparisonModal({ 
  beforePhoto, 
  afterPhoto, 
  onClose, 
  formatDate 
}: {
  beforePhoto: ProgressPhoto
  afterPhoto: ProgressPhoto
  onClose: () => void
  formatDate: (date: string) => string
}) {
  const [sliderPosition, setSliderPosition] = useState(50)

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    setSliderPosition(Math.max(0, Math.min(100, percentage)))
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.touches[0].clientX - rect.left
    const percentage = (x / rect.width) * 100
    setSliderPosition(Math.max(0, Math.min(100, percentage)))
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl h-[80vh] fc-modal fc-card overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-6 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Photo Comparison</h2>
              <p className="text-white/80">Drag the slider to compare your transformation</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Comparison Slider */}
        <div 
          className="relative h-full cursor-col-resize"
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
        >
          {/* Before Photo */}
          <div className="absolute inset-0">
            <Image
              src={beforePhoto.url}
              alt={`Before photo from ${formatDate(beforePhoto.date)}`}
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute top-20 left-6 bg-black/50 text-white px-3 py-2 rounded-xl text-sm font-medium">
              Before • {formatDate(beforePhoto.date)}
            </div>
          </div>

          {/* After Photo */}
          <div 
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <Image
              src={afterPhoto.url}
              alt={`After photo from ${formatDate(afterPhoto.date)}`}
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute top-20 right-6 bg-black/50 text-white px-3 py-2 rounded-xl text-sm font-medium">
              After • {formatDate(afterPhoto.date)}
            </div>
          </div>

          {/* Slider Line */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-20"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-[color:var(--fc-glass-border)] rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  {Math.floor((new Date(afterPhoto.date).getTime() - new Date(beforePhoto.date).getTime()) / (1000 * 60 * 60 * 24))} days apart
                </span>
              </div>
              {beforePhoto.bodyweight && afterPhoto.bodyweight && (
                <div className="flex items-center gap-2">
                  <Weight className="w-4 h-4" />
                  <span className="text-sm">
                    {afterPhoto.bodyweight - beforePhoto.bodyweight > 0 ? '+' : ''}{afterPhoto.bodyweight - beforePhoto.bodyweight}kg change
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                className="rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share Comparison
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
