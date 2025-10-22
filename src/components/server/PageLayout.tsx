import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar,
  Clock,
  Dumbbell,
  Target,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Users,
  Mail,
  Phone,
  TrendingUp,
  MessageCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'

// Server Component for page headers
export function PageHeader({ 
  title, 
  description, 
  action 
}: { 
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-slate-500">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// Server Component for workout cards
export function WorkoutCard({ 
  workout,
  onStart
}: {
  workout: {
    id: string
    name: string
    description: string
    duration: number
    difficulty: string
    exerciseCount: number
    status: string
    notes?: string
  }
  onStart?: () => void
}) {
  const statusColors = {
    'assigned': 'bg-blue-100 text-blue-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'skipped': 'bg-red-100 text-red-800'
  }

  const difficultyColors = {
    'Beginner': 'bg-green-100 text-green-800',
    'Intermediate': 'bg-yellow-100 text-yellow-800',
    'Advanced': 'bg-red-100 text-red-800'
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={statusColors[workout.status as keyof typeof statusColors]}>
                {workout.status.replace('_', ' ')}
              </Badge>
              <Badge className={difficultyColors[workout.difficulty as keyof typeof difficultyColors]}>
                {workout.difficulty}
              </Badge>
            </div>
            <CardTitle className="text-lg">{workout.name}</CardTitle>
            <CardDescription className="text-sm mb-3">
              {workout.description}
            </CardDescription>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{workout.duration} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Dumbbell className="w-4 h-4" />
                <span>{workout.exerciseCount} exercises</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      {workout.notes && (
        <CardContent className="p-4 pt-0">
          <div className="p-3 bg-blue-100 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-800">{workout.notes}</p>
            </div>
          </div>
        </CardContent>
      )}
      {onStart && (
        <CardContent className="p-4 pt-0">
          <Button 
            onClick={onStart}
            className="bg-blue-600 hover:bg-blue-700 w-full"
          >
            <Dumbbell className="w-4 h-4 mr-2" />
            Start Workout
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

// Server Component for client cards
export function ClientCard({ 
  client 
}: {
  client: {
    id: string
    name: string
    email: string
    phone: string
    joinDate: string
    status: string
    progress: number
    goals: string
    nextSession?: string
    avatar: string
  }
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'inactive':
        return 'bg-slate-100 text-slate-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <Card className="bg-white border-slate-200 hover:shadow-md transition-shadow">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">{client.avatar}</span>
            </div>
            <div>
              <CardTitle className="text-lg">{client.name}</CardTitle>
              <CardDescription className="text-sm">{client.email}</CardDescription>
            </div>
          </div>
          <Badge className={getStatusColor(client.status)}>
            {client.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="w-4 h-4" />
            <span>{client.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>Joined {new Date(client.joinDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Target className="w-4 h-4" />
            <span>{client.goals}</span>
          </div>
          {client.nextSession && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>Next: {formatDate(client.nextSession)}</span>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Progress</span>
              <span className="font-medium text-slate-800">{client.progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${client.progress}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Server Component for exercise cards
export function ExerciseCard({ 
  exercise 
}: {
  exercise: {
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
  }
}) {
  const difficultyColors = {
    'beginner': 'bg-green-100 text-green-700',
    'intermediate': 'bg-yellow-100 text-yellow-700',
    'advanced': 'bg-red-100 text-red-700'
  }

  return (
    <Card className="bg-white border-slate-200 hover:shadow-md transition-shadow">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {exercise.category}
              </Badge>
              <Badge className={difficultyColors[exercise.difficulty as keyof typeof difficultyColors]}>
                {exercise.difficulty}
              </Badge>
              {exercise.is_public && (
                <Badge variant="outline" className="text-xs">
                  Public
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{exercise.name}</CardTitle>
            <CardDescription className="text-sm mb-3">
              {exercise.description}
            </CardDescription>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Target className="w-4 h-4" />
                <span>{exercise.muscle_groups.join(', ')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Dumbbell className="w-4 h-4" />
                <span>{exercise.equipment.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          {exercise.instructions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-800 mb-2">Instructions:</h4>
              <ol className="text-sm text-slate-600 space-y-1">
                {exercise.instructions.slice(0, 3).map((instruction, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 font-medium">{index + 1}.</span>
                    <span>{instruction}</span>
                  </li>
                ))}
                {exercise.instructions.length > 3 && (
                  <li className="text-slate-500 text-xs">
                    +{exercise.instructions.length - 3} more steps
                  </li>
                )}
              </ol>
            </div>
          )}
          {exercise.tips.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-800 mb-2">Tips:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                {exercise.tips.slice(0, 2).map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600 mt-1 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
                {exercise.tips.length > 2 && (
                  <li className="text-slate-500 text-xs">
                    +{exercise.tips.length - 2} more tips
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Server Component for empty states
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Card className="bg-white border-slate-200">
      <CardContent className="p-12 text-center">
        <Icon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 mb-4">{description}</p>
        {action && <div>{action}</div>}
      </CardContent>
    </Card>
  )
}
