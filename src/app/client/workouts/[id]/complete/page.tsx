'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft,
  CheckCircle,
  Trophy,
  Clock,
  Target,
  Calendar,
  Sparkles,
  Star,
  Award,
  Flame,
  TrendingUp,
  Dumbbell,
  Heart,
  Zap,
  Share2,
  BarChart3,
  MessageCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Play,
  Calendar as CalendarIcon,
  Gift
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import NotificationTriggers from '@/lib/notificationTriggers'
import { DynamicSummaryComponent } from '@/components/DynamicSummary'
import { useWorkoutSummary } from '@/hooks/useWorkoutSummary'

interface WorkoutAssignment {
  id: string
  template_id: string
  client_id: string
  status: string
  notes?: string
  template?: {
    id: string
    name: string
    description?: string
    estimated_duration: number
    difficulty_level: string
  }
}

export default function WorkoutComplete() {
  const params = useParams()
  const router = useRouter()
  const assignmentId = params.id as string
  
  const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [showDynamicSummary, setShowDynamicSummary] = useState(false)
  const [showExerciseBreakdown, setShowExerciseBreakdown] = useState(false)
  const [workoutStats, setWorkoutStats] = useState({
    duration: 0,
    exercisesCompleted: 0,
    totalSets: 0,
    caloriesBurned: 0,
    personalBests: 0
  })
  
  // Get session ID from URL or state
  const sessionId = params.sessionId as string || localStorage.getItem('currentWorkoutSessionId')
  
  // Load dynamic summary data
  const { workoutData, userProfile, comparison, loading: summaryLoading } = useWorkoutSummary(
    assignment?.client_id || '', 
    sessionId || undefined
  )

  useEffect(() => {
    if (assignmentId) {
      loadAssignment().catch(error => {
        console.error('Error loading assignment:', error)
      })
    }
  }, [assignmentId])

  const loadAssignment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('workout_assignments')
        .select(`
          *,
          template:workout_templates(*)
        `)
        .eq('id', assignmentId)
        .eq('client_id', user.id)
        .single()

      if (assignmentError) throw assignmentError

      setAssignment(assignmentData)

      // Load workout statistics
      if (sessionId) {
        const { data: logs } = await supabase
          .from('workout_logs')
          .select('*')
          .eq('session_id', sessionId)

        if (logs) {
          const stats = {
            duration: assignmentData.template?.estimated_duration || 45,
            exercisesCompleted: new Set(logs.map(log => log.template_exercise_id)).size,
            totalSets: logs.length,
            caloriesBurned: Math.round((assignmentData.template?.estimated_duration || 45) * 8), // Rough estimate
            personalBests: Math.floor(Math.random() * 3) // Mock data for now
          }
          setWorkoutStats(stats)
        }
      }
    } catch (error) {
      console.error('Error loading assignment:', error)
    } finally {
      setLoading(false)
    }
  }

  const markWorkoutComplete = async () => {
    if (!assignment) return
    
    setCompleting(true)
    try {
      // Update assignment status to completed
      const { error } = await supabase
        .from('workout_assignments')
        .update({ 
          status: 'completed'
        })
        .eq('id', assignmentId)

      if (error) throw error

      // Send notification
      if (assignment.template) {
        await NotificationTriggers.triggerWorkoutCompleted(
          assignment.template.name,
          assignment.template.estimated_duration
        )
      }

      // Navigate back to workouts
      router.push('/client/workouts')
    } catch (error) {
      console.error('Error completing workout:', error)
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="p-4">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-slate-200 rounded mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!assignment) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="p-4">
          <div className="max-w-7xl mx-auto">
            <Card className="bg-white border-slate-200">
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-medium text-slate-800 mb-2">Workout not found</h3>
                <p className="text-slate-500 mb-6">This workout doesn't exist or you don't have access to it.</p>
                <Button onClick={() => router.push('/client/workouts')} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Workouts
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="client">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Enhanced Header with Back Button */}
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/client/workouts')}
                className="rounded-2xl"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>

            {/* Celebratory Header */}
            <Card className="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 border-0 shadow-2xl rounded-3xl overflow-hidden">
              <CardContent className="p-8 text-center relative">
                {/* Floating Sparkles Animation */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-4 left-8 w-3 h-3 bg-yellow-300 rounded-full animate-bounce"></div>
                  <div className="absolute top-8 right-12 w-2 h-2 bg-yellow-200 rounded-full animate-pulse"></div>
                  <div className="absolute bottom-6 left-16 w-2 h-2 bg-white/60 rounded-full animate-bounce delay-1000"></div>
                  <div className="absolute bottom-4 right-8 w-3 h-3 bg-yellow-300/80 rounded-full animate-pulse delay-500"></div>
                </div>
                
                <div className="relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce">
                      <Trophy className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  
                  <h1 className="text-4xl font-bold text-white mb-3">
                    Amazing Work! 🎉
                  </h1>
                  <p className="text-white/90 text-xl mb-6">
                    You crushed your workout today!
                  </p>
                  
                  {/* Workout Name Badge */}
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3 mb-6">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    <span className="text-white font-semibold text-lg">
                      {assignment.template?.name}
                    </span>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-white" />
                        <span className="text-white/80 text-sm">Duration</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {workoutStats.duration}m
                      </div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Dumbbell className="w-5 h-5 text-white" />
                        <span className="text-white/80 text-sm">Exercises</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {workoutStats.exercisesCompleted}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Workout Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800 mb-1">
                    {workoutStats.duration}m
                  </div>
                  <div className="text-sm text-slate-500">Total Time</div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800 mb-1">
                    {workoutStats.caloriesBurned}
                  </div>
                  <div className="text-sm text-slate-500">Calories Burned</div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800 mb-1">
                    {workoutStats.totalSets}
                  </div>
                  <div className="text-sm text-slate-500">Total Sets</div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800 mb-1">
                    {workoutStats.personalBests}
                  </div>
                  <div className="text-sm text-slate-500">Personal Bests</div>
                </CardContent>
              </Card>
            </div>

            {/* Exercise Breakdown */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader 
                className="p-6 cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => setShowExerciseBreakdown(!showExerciseBreakdown)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-white" />
                    </div>
                    Exercise Breakdown
                  </CardTitle>
                  {showExerciseBreakdown ? (
                    <ChevronUp className="w-6 h-6 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-slate-500" />
                  )}
                </div>
              </CardHeader>
              {showExerciseBreakdown && (
                <CardContent className="p-6 pt-0">
                  <div className="space-y-4">
                    <div className="text-center py-8 text-slate-500">
                      <Dumbbell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>Exercise details will be loaded from your workout logs</p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Motivational Message */}
            <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center">
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                      Keep the momentum going! 💪
                    </h3>
                    <p className="text-slate-600">
                      Every workout brings you closer to your goals. You&apos;re doing amazing!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps & Call to Action */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="p-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                  What&apos;s Next?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-4">
                  <p className="text-slate-600 mb-6">
                    Ready to continue your fitness journey? Here are your next steps:
                  </p>
                  
                  {/* Primary Action Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      onClick={() => setShowDynamicSummary(true)}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl h-14 text-lg font-semibold shadow-lg disabled:opacity-50"
                      disabled={summaryLoading}
                    >
                      <div className="flex items-center gap-3">
                        {summaryLoading ? (
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <BarChart3 className="w-6 h-6" />
                        )}
                        {summaryLoading ? 'Generating Summary...' : 'View Detailed Summary'}
                      </div>
                    </Button>
                    
                    <Button 
                      onClick={markWorkoutComplete}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl h-14 text-lg font-semibold shadow-lg disabled:opacity-50"
                      disabled={completing}
                    >
                      <div className="flex items-center gap-3">
                        {completing ? (
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-6 h-6" />
                        )}
                        {completing ? 'Completing...' : 'Mark as Complete'}
                      </div>
                    </Button>
                  </div>
                  
                  {/* Secondary Action Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                    <Button 
                      variant="outline"
                      onClick={() => router.push('/client/progress')}
                      className="rounded-2xl h-12 border-2 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-medium">View Progress</span>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => router.push('/client/workouts')}
                      className="rounded-2xl h-12 border-2 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        <span className="font-medium">Schedule Next</span>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => console.log('Share workout')}
                      className="rounded-2xl h-12 border-2 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4" />
                        <span className="font-medium">Share</span>
                      </div>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Enhanced Dynamic Summary Modal */}
      {showDynamicSummary && workoutData && userProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-6xl max-h-[95vh] overflow-hidden">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Workout Summary</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDynamicSummary(false)}
                  className="rounded-2xl hover:bg-white/50"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="max-h-[80vh] overflow-y-auto">
                <DynamicSummaryComponent
                  workoutData={workoutData}
                  userProfile={userProfile}
                  comparison={comparison}
                  onShare={() => {
                    console.log('Share workout summary')
                  }}
                  onViewProgress={() => {
                    router.push('/client/progress')
                  }}
                  onScheduleNext={() => {
                    router.push('/client/workouts')
                  }}
                  className="p-6"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
