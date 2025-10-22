'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { X, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VideoPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title?: string
}

export default function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  title
}: VideoPlayerModalProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  if (!isOpen) return null

  // Convert YouTube/Vimeo URLs to embed format
  const getEmbedUrl = (url: string) => {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }
    
    // Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
      return `https://player.vimeo.com/video/${videoId}`
    }
    
    // Direct video URL
    return url
  }

  const embedUrl = getEmbedUrl(videoUrl)
  const isDirectVideo = !videoUrl.includes('youtube') && !videoUrl.includes('vimeo')

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isDark ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/70 backdrop-blur-sm'}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-theme={isDark ? 'dark' : 'light'}
    >
      <div 
        className={`relative ${theme.card} shadow-2xl rounded-3xl border ${theme.border} w-full overflow-hidden transform transition-all duration-300 ease-out flex flex-col`}
        style={{
          animation: 'modalSlideIn 0.3s ease-out',
          maxWidth: 'min(95vw, 70rem)',
          maxHeight: 'min(90vh, calc(100vh - 2rem))'
        }}
      >
        {/* Header - Sticky */}
        {title && (
          <div className={`${theme.card} border-b ${theme.border} px-4 sm:px-6 py-4 flex-shrink-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <h2 className={`text-lg sm:text-2xl font-bold ${theme.text}`}>
                  {title}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Video Player */}
        <div className={`flex-1 ${!title ? 'p-0' : ''} relative bg-black`}>
          {isDirectVideo ? (
            <video
              src={embedUrl}
              controls
              autoPlay
              className="w-full h-full"
              style={{ maxHeight: '80vh' }}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              style={{ minHeight: '400px', maxHeight: '80vh', aspectRatio: '16/9' }}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          )}
          
          {/* Close button overlay (only if no header) */}
          {!title && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Footer with Close Button */}
        <div className={`${theme.card} border-t ${theme.border} px-4 sm:px-6 py-3 flex-shrink-0`}>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

