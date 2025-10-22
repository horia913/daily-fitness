'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Dumbbell, 
  Heart, 
  Zap, 
  Target, 
  Trophy, 
  Shield,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Star,
  Clock,
  Users,
  MoreVertical,
  Copy,
  Share2,
  Bookmark,
  BookmarkCheck,
  Download,
  Upload
} from 'lucide-react'

interface Exercise {
  id: string
  name: string
  description: string
  category: string
  muscle_groups: string[]
  equipment: string[]
  difficulty: string
  instructions: string[]
  tips: string[]
  video_url?: string
  image_url?: string
  is_public: boolean
  created_at: string
  updated_at: string
  usage_count?: number
  rating?: number
}

interface ExerciseCardProps {
  exercise: Exercise
  viewMode: 'grid' | 'list'
  isSelected: boolean
  onSelect: (exerciseId: string) => void
  onEdit: (exercise: Exercise) => void
  onDelete: (exerciseId: string) => void
  onToggleVisibility: (exerciseId: string, currentVisibility: boolean) => void
  onPlayVideo?: (videoUrl: string) => void
}

export default function ExerciseCard({
  exercise,
  viewMode,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleVisibility,
  onPlayVideo
}: ExerciseCardProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const categoryIcons = {
    'Strength': Dumbbell,
    'Cardio': Heart,
    'Flexibility': Zap,
    'Balance': Target,
    'Sports': Trophy,
    'Rehabilitation': Shield
  }

  const difficultyColors = {
    'beginner': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'intermediate': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'advanced': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }

  const difficultyLabels = {
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced'
  }

  const IconComponent = categoryIcons[exercise.category as keyof typeof categoryIcons] || Dumbbell

  const handlePlayVideo = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (exercise.video_url) {
      setIsPlaying(!isPlaying)
      onPlayVideo?.(exercise.video_url)
    }
  }

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMuted(!isMuted)
  }

  if (viewMode === 'list') {
    return (
      <Card 
        className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:shadow-lg transition-all duration-300 cursor-pointer ${
          isSelected ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-slate-300 dark:hover:border-slate-600'
        }`}
        onClick={() => onSelect(exercise.id)}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {/* Exercise Image */}
            <div className="relative w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl overflow-hidden flex-shrink-0">
              {exercise.image_url ? (
                <img 
                  src={exercise.image_url} 
                  alt={exercise.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <IconComponent className="w-8 h-8 text-slate-400" />
                </div>
              )}
              
              {/* Video Play Button */}
              {exercise.video_url && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayVideo}
                    className="w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full p-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 text-white" />
                    ) : (
                      <Play className="w-4 h-4 text-white ml-0.5" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Exercise Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className={`font-semibold ${theme.text} text-lg mb-1`}>
                    {exercise.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <IconComponent className="w-4 h-4 text-slate-400" />
                    <span className={`text-sm ${theme.textSecondary}`}>
                      {exercise.category}
                    </span>
                    <Badge className={`${difficultyColors[exercise.difficulty as keyof typeof difficultyColors]} border-0 text-xs`}>
                      {difficultyLabels[exercise.difficulty as keyof typeof difficultyLabels]}
                    </Badge>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>

              {exercise.description && (
                <p className={`text-sm ${theme.textSecondary} mb-3 line-clamp-2`}>
                  {exercise.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Muscles: {exercise.muscle_groups.slice(0, 3).join(', ')}</span>
                <span>Equipment: {exercise.equipment.join(', ')}</span>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{exercise.usage_count || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  <span>{exercise.rating || 0}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className={`flex items-center gap-2 transition-opacity duration-200 ${
              showActions ? 'opacity-100' : 'opacity-0'
            }`}>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleVisibility(exercise.id, exercise.is_public)
                }}
              >
                {exercise.is_public ? (
                  <Eye className="w-4 h-4 text-green-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(exercise)
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(exercise.id)
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Grid view
  return (
    <Card 
      className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:shadow-lg transition-all duration-300 cursor-pointer ${
        isSelected ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-slate-300 dark:hover:border-slate-600'
      }`}
      onClick={() => onSelect(exercise.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Exercise Image/Video */}
      <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-t-2xl overflow-hidden">
        {exercise.image_url ? (
          <img 
            src={exercise.image_url} 
            alt={exercise.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <IconComponent className="w-16 h-16 text-slate-400" />
          </div>
        )}
        
        {/* Video Play Button */}
        {exercise.video_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayVideo}
              className="w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full p-0"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" />
              )}
            </Button>
          </div>
        )}

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}

        {/* Difficulty Badge */}
        <div className="absolute top-3 left-3">
          <Badge className={`${difficultyColors[exercise.difficulty as keyof typeof difficultyColors]} border-0`}>
            {difficultyLabels[exercise.difficulty as keyof typeof difficultyLabels]}
          </Badge>
        </div>

        {/* Visibility Toggle */}
        <div className="absolute bottom-3 right-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onToggleVisibility(exercise.id, exercise.is_public)
            }}
            className="p-2 bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800"
          >
            {exercise.is_public ? (
              <Eye className="w-4 h-4 text-green-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-400" />
            )}
          </Button>
        </div>

        {/* Video Controls */}
        {exercise.video_url && isPlaying && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleMute}
              className="p-1 bg-black/50 hover:bg-black/70 rounded-full"
            >
              {isMuted ? (
                <VolumeX className="w-3 h-3 text-white" />
              ) : (
                <Volume2 className="w-3 h-3 text-white" />
              )}
            </Button>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Exercise Name and Category */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className={`font-semibold ${theme.text} text-lg mb-1`}>
              {exercise.name}
            </h3>
            <div className="flex items-center gap-2">
              <IconComponent className="w-4 h-4 text-slate-400" />
              <span className={`text-sm ${theme.textSecondary}`}>
                {exercise.category}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {exercise.description && (
          <p className={`text-sm ${theme.textSecondary} line-clamp-2`}>
            {exercise.description}
          </p>
        )}

        {/* Muscle Groups */}
        <div className="flex flex-wrap gap-1">
          {exercise.muscle_groups.slice(0, 2).map(group => (
            <Badge key={group} variant="outline" className="text-xs">
              {group}
            </Badge>
          ))}
          {exercise.muscle_groups.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{exercise.muscle_groups.length - 2}
            </Badge>
          )}
        </div>

        {/* Equipment */}
        <div className={`text-xs ${theme.textSecondary}`}>
          Equipment: {exercise.equipment.join(', ')}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{exercise.usage_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            <span>{exercise.rating || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{new Date(exercise.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 transition-opacity duration-200 ${
          showActions ? 'opacity-100' : 'opacity-0'
        }`}>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(exercise)
            }}
            className="flex-1"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(exercise.id)
            }}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
