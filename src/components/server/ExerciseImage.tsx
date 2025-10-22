import { ImageTransform } from '@/lib/imageTransform'
import { Dumbbell } from 'lucide-react'

interface ExerciseImageProps {
  imageUrl?: string
  exerciseName: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function ExerciseImage({ 
  imageUrl, 
  exerciseName, 
  size = 'medium',
  className = '' 
}: ExerciseImageProps) {
  if (!imageUrl) {
    return (
      <div className={`bg-slate-100 flex items-center justify-center ${className}`}>
        <Dumbbell className="w-6 h-6 text-slate-400" />
      </div>
    )
  }

  // Generate optimized image URL for server-side rendering
  const optimizedUrl = ImageTransform.getThumbnailUrl(imageUrl, size)
  
  return (
    <img
      src={optimizedUrl}
      alt={exerciseName}
      className={`object-cover ${className}`}
      loading="lazy"
    />
  )
}

// Server Component for exercise cards with optimized images
export function ExerciseCardImage({ 
  exercise 
}: {
  exercise: {
    id: string
    name: string
    image_url?: string
    category: string
    difficulty: string
  }
}) {
  return (
    <div className="relative">
      <ExerciseImage
        imageUrl={exercise.image_url}
        exerciseName={exercise.name}
        size="medium"
        className="w-full h-48 rounded-t-lg"
      />
      
      {/* Overlay with exercise info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 rounded-b-lg">
        <div className="text-white">
          <h3 className="font-semibold text-lg">{exercise.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm bg-white/20 px-2 py-1 rounded">
              {exercise.category}
            </span>
            <span className="text-sm bg-white/20 px-2 py-1 rounded">
              {exercise.difficulty}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
