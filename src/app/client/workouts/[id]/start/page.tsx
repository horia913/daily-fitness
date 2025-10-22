'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Stepper } from '@/components/ui/stepper'
import { RestTimerOverlay } from '@/components/workout/RestTimerOverlay'
import { 
  ArrowLeft,
  Play,
  Check,
  Target,
  Youtube,
  X,
  Trophy,
  AlertTriangle,
  Dumbbell,
  Calculator,
  Clock,
  Lightbulb,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Image,
  Video,
  Zap,
  Activity,
  Square,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast-provider'
import { useTheme } from '@/contexts/ThemeContext'
import LiveWorkoutBlockExecutor from '@/components/client/LiveWorkoutBlockExecutor'
import { WorkoutBlock, LiveWorkoutBlock, LoggedSet } from '@/types/workoutBlocks'
import { WorkoutBlockService } from '@/lib/workoutBlockService'

interface WorkoutAssignment {
  id: string
  template_id: string
  status: string
  notes?: string
  template?: {
    id: string
    name: string
    description: string
    estimated_duration: number
    difficulty_level: string
    category?: {
      name: string
      color: string
    }
  }
}

interface TemplateExercise {
  id: string
  exercise_id: string
  order_index: number
  sets: number
  reps: string
  rest_seconds: number
  notes: string
  // Parsed complex data saved as JSON in notes
  exercise_type?: string
  meta?: any
  exercise?: {
    id: string
    name: string
    description: string
    category: string
    image_url?: string
    video_url?: string
  }
  completed_sets?: number
  current_set?: number
}

export default function LiveWorkout() {
  const params = useParams()
  const router = useRouter()
  const assignmentId = params.id as string
  const { addToast } = useToast()
  const { isDark, getThemeStyles } = useTheme()
  
  const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null)
  const [exercises, setExercises] = useState<TemplateExercise[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [workoutStarted, setWorkoutStarted] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentSetData, setCurrentSetData] = useState({
    weight: 0,
    reps: 0
  })
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [currentVideoUrl, setCurrentVideoUrl] = useState('')
  const [isLoggingSet, setIsLoggingSet] = useState(false)
  
  // Rest Timer State
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restTime, setRestTime] = useState(60)
  
  // Exercise Display Enhancements
  const [showExerciseAlternatives, setShowExerciseAlternatives] = useState(false)
  const [showExerciseImage, setShowExerciseImage] = useState(false)
  const [showPlateCalculator, setShowPlateCalculator] = useState(false)
  const [showDropSetCalculator, setShowDropSetCalculator] = useState(false)
  const [showClusterTimer, setShowClusterTimer] = useState(false)
  const [selectedBarbell, setSelectedBarbell] = useState(20)
  const [targetWeight, setTargetWeight] = useState('')
  const [showPlateResults, setShowPlateResults] = useState(false)
  
  // Workout Block System
  const [workoutBlocks, setWorkoutBlocks] = useState<LiveWorkoutBlock[]>([])
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [useBlockSystem, setUseBlockSystem] = useState(false)
  
  // Button Enhancement States
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  
  // Workout Completion State
  const [showWorkoutCompletion, setShowWorkoutCompletion] = useState(false)
  const [workoutStats, setWorkoutStats] = useState({
    totalTime: 0,
    exercisesCompleted: 0,
    totalSets: 0,
    personalBests: 0,
    totalWeightLifted: 0,
    weightComparison: ''
  })
  const [workoutStartTime, setWorkoutStartTime] = useState(Date.now())
  const [totalWeightLifted, setTotalWeightLifted] = useState(0)
  // Exercise details lookup for nested items (giant set, etc.)
  const [exerciseLookup, setExerciseLookup] = useState<Record<string, { name: string; video_url?: string }>>({})

  // Barbell options
  const barbellOptions = [
    { weight: 20, name: 'Olympic', type: 'straight' },
    { weight: 15, name: 'Junior', type: 'straight' },
    { weight: 12, name: 'Straight', type: 'straight' },
    { weight: 9, name: 'EZ Bar', type: 'ez' }
  ]

  // Function to calculate plate loading with barbell selection - PRIORITIZES 20kg and 10kg
  const calculatePlateLoading = (targetWeight: number, barbellWeight: number = 20) => {
    const plates = [
      { weight: 20, color: 'bg-blue-600', border: 'border-blue-800' },
      { weight: 10, color: 'bg-green-500', border: 'border-green-700' },
      { weight: 25, color: 'bg-red-600', border: 'border-red-800' },
      { weight: 15, color: 'bg-yellow-500', border: 'border-yellow-700' },
      { weight: 5, color: 'bg-white', border: 'border-slate-400' },
      { weight: 2.5, color: 'bg-black', border: 'border-slate-600' },
      { weight: 1.25, color: 'bg-gray-400', border: 'border-gray-600' }
    ]
    
    // Calculate plates needed per side
    const plateWeight = targetWeight - barbellWeight
    const weightPerSide = plateWeight / 2
    
    // Generate two best loading options
    const options = []
    
    // Option 1: Prioritize 20kg and 10kg plates first
    const option1 = []
    let remaining1 = weightPerSide
    for (const plate of plates) {
      const count = Math.floor(remaining1 / plate.weight)
      if (count > 0) {
        option1.push({
          weight: plate.weight,
          count: count,
          color: plate.color,
          border: plate.border
        })
        remaining1 -= count * plate.weight
      }
    }
    
    // Option 2: Alternative approach - try to minimize total number of plates
    const option2 = []
    let remaining2 = weightPerSide
    const platesAlt = [
      { weight: 25, color: 'bg-red-600', border: 'border-red-800' },
      { weight: 20, color: 'bg-blue-600', border: 'border-blue-800' },
      { weight: 15, color: 'bg-yellow-500', border: 'border-yellow-700' },
      { weight: 10, color: 'bg-green-500', border: 'border-green-700' },
      { weight: 5, color: 'bg-white', border: 'border-slate-400' },
      { weight: 2.5, color: 'bg-black', border: 'border-slate-600' },
      { weight: 1.25, color: 'bg-gray-400', border: 'border-gray-600' }
    ]
    for (const plate of platesAlt) {
      const count = Math.floor(remaining2 / plate.weight)
      if (count > 0) {
        option2.push({
          weight: plate.weight,
          count: count,
          color: plate.color,
          border: plate.border
        })
        remaining2 -= count * plate.weight
      }
    }
    
    // If both options are the same, provide a third alternative
    const isSame = JSON.stringify(option1) === JSON.stringify(option2)
    if (isSame && option1.length > 1) {
      // Try a different combination for option 2
      option2.length = 0 // Clear option 2
      remaining2 = weightPerSide
      // Use a different greedy approach
      for (const plate of platesAlt.slice(1)) { // Skip 25kg to force different combination
        const count = Math.floor(remaining2 / plate.weight)
        if (count > 0) {
          option2.push({
            weight: plate.weight,
            count: count,
            color: plate.color,
            border: plate.border
          })
          remaining2 -= count * plate.weight
        }
      }
    }
    
    return { 
      option1: { plates: option1, remainder: remaining1 },
      option2: { plates: option2, remainder: remaining2 },
      barbellWeight 
    }
  }

  // Removed childish weight comparison function - now just showing weight in kg

  // Workout Block Handlers
  const handleBlockComplete = (blockId: string, loggedSets: LoggedSet[]) => {
    setWorkoutBlocks(prev => prev.map(block => 
      block.block.id === blockId 
        ? { ...block, isCompleted: true }
        : block
    ))
  }

  const handleNextBlock = () => {
    if (currentBlockIndex < workoutBlocks.length - 1) {
      setCurrentBlockIndex(prev => prev + 1)
    } else {
      // All blocks completed, finish workout
      setShowWorkoutCompletion(true)
    }
  }

  useEffect(() => {
    if (assignmentId) {
      loadAssignment().catch(error => {
        console.error('Error loading assignment:', error)
      })
    }
  }, [assignmentId])

  // Auto-start workout when assignment and exercises are loaded
  useEffect(() => {
    if (assignment && exercises.length > 0 && !sessionId) {
      startWorkout().catch(error => {
        console.error('Error starting workout:', error)
      })
    }
  }, [assignment, exercises, sessionId])


  const loadAssignment = async () => {
    try {
      console.log('🔍 Workout Execution - Loading assignment with ID:', assignmentId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('🔍 Workout Execution - User ID:', user.id)

      try {
        // Load assignment using simpler approach to avoid RLS issues
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('workout_assignments')
          .select('*')
          .eq('id', assignmentId)
          .eq('client_id', user.id)
          .maybeSingle()

        console.log('🔍 Workout Execution - Assignment query result:', { assignmentData, assignmentError })

        if (assignmentError) throw assignmentError
        if (!assignmentData) throw new Error('Workout assignment not found')

        // Load template details separately
        const { data: templateData, error: templateError } = await supabase
          .from('workout_templates')
          .select(`
            id, name, description, estimated_duration, difficulty_level,
            category:workout_categories(name, color)
          `)
          .eq('id', assignmentData.template_id)
          .maybeSingle()

        if (templateError) throw templateError
        if (!templateData) throw new Error('Workout template not found')

        // Combine the data
        const combinedData = {
          ...assignmentData,
          template: templateData
        }

        // Load exercises
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('workout_template_exercises')
          .select('*')
          .eq('template_id', assignmentData.template_id)
          .order('order_index')

        if (exercisesError) throw exercisesError

        // Load exercise details separately
        const exercisesWithDetails = await Promise.all(
          (exercisesData || []).map(async (exercise) => {
            // Parse complex meta from notes JSON if present
            let meta: any = {}
            let exercise_type: string | undefined = undefined
            if (exercise.notes) {
              try {
                const parsed = JSON.parse(exercise.notes)
                if (parsed && typeof parsed === 'object') {
                  meta = parsed
                  exercise_type = parsed.exercise_type || undefined
                }
              } catch {}
            }
            const { data: exerciseDetails } = await supabase
              .from('exercises')
              .select('id, name, description, category, image_url, video_url')
              .eq('id', exercise.exercise_id)
              .single()
            
            return {
              ...exercise,
              exercise_type,
              meta,
              exercise: exerciseDetails
            }
          })
        )

        setAssignment(combinedData)
        setExercises(exercisesWithDetails)

        // Build lookup of extra exercise IDs referenced in complex metas
        try {
          const idSet = new Set<string>()
          for (const ex of exercisesWithDetails as any[]) {
            const m = ex.meta || {}
            if (m.superset_exercise_id) idSet.add(m.superset_exercise_id)
            if (m.compound_exercise_id) idSet.add(m.compound_exercise_id)
            if (Array.isArray(m.giant_set_exercises)) {
              for (const gi of m.giant_set_exercises) {
                if (gi?.exercise_id) idSet.add(gi.exercise_id)
              }
            }
            if (Array.isArray(m.circuit_sets)) {
              for (const cs of m.circuit_sets) {
                if (Array.isArray(cs.exercises)) {
                  for (const cse of cs.exercises) {
                    if (cse?.exercise_id) idSet.add(cse.exercise_id)
                  }
                }
              }
            }
            if (Array.isArray(m.tabata_sets)) {
              for (const ts of m.tabata_sets) {
                if (Array.isArray(ts.exercises)) {
                  for (const tse of ts.exercises) {
                    if (tse?.exercise_id) idSet.add(tse.exercise_id)
                  }
                }
              }
            }
            // Also check for tabata_sets at the root level (not in meta)
            if (Array.isArray(ex.tabata_sets)) {
              for (const ts of ex.tabata_sets) {
                if (Array.isArray(ts.exercises)) {
                  for (const tse of ts.exercises) {
                    if (tse?.exercise_id) idSet.add(tse.exercise_id)
                  }
                }
              }
            }
          }
          if (idSet.size > 0) {
            const ids = Array.from(idSet)
            const { data: extras } = await supabase
              .from('exercises')
              .select('id, name, video_url')
              .in('id', ids)
            const map: Record<string, { name: string; video_url?: string }> = {}
            for (const e of extras || []) {
              map[e.id] = { name: e.name, video_url: (e as any).video_url }
            }
            setExerciseLookup(map)
          }
        } catch {}

        // Load workout blocks (with error handling for missing schema)
        try {
          const blocks = await WorkoutBlockService.getWorkoutBlocks(assignmentData.template_id)
          
          if (blocks.length > 0) {
            // Use block system
            setUseBlockSystem(true)
            const liveBlocks: LiveWorkoutBlock[] = blocks.map(block => ({
              block,
              currentExerciseIndex: 0,
              currentSetIndex: 0,
              isCompleted: false,
              completedSets: 0,
              totalSets: block.total_sets || 1
            }))
            setWorkoutBlocks(liveBlocks)
          } else {
            // Use traditional system
            setUseBlockSystem(false)
          }
        } catch (error) {
          console.log('Workout blocks not available, using traditional system:', error)
          // Use traditional system if blocks table doesn't exist
          setUseBlockSystem(false)
        }
      } catch (dbError) {
        console.log('Database not ready, using localStorage fallback')
        
        // Sample data for testing
        const sampleAssignment = {
          id: assignmentId,
          template_id: 'template-1',
          status: 'assigned',
          notes: 'Focus on form and controlled movements',
          template: {
            id: 'template-1',
            name: 'Upper Body Strength',
            description: 'Build strength in chest, shoulders, and arms',
            estimated_duration: 45,
            difficulty_level: 'Intermediate',
            category: { name: 'Upper Body', color: '#EF4444' }
          }
        }

        const sampleExercises = [
          {
            id: '1',
            exercise_id: 'ex-1',
            order_index: 1,
            sets: 3,
            reps: '10',
            rest_seconds: 60,
            notes: 'Keep core tight',
            exercise: {
              id: 'ex-1',
              name: 'Push-ups',
              description: 'Classic bodyweight exercise',
              category: 'Upper Body'
            },
            completed_sets: 0,
            current_set: 1
          },
          {
            id: '2',
            exercise_id: 'ex-2',
            order_index: 2,
            sets: 3,
            reps: '8-12',
            rest_seconds: 90,
            notes: 'Focus on controlled movement',
            exercise: {
              id: 'ex-2',
              name: 'Pull-ups',
              description: 'Upper body pulling exercise',
              category: 'Upper Body'
            },
            completed_sets: 0,
            current_set: 1
          }
        ]

        setAssignment(sampleAssignment)
        setExercises(sampleExercises)
      }
    } catch (error) {
      console.error('Error loading assignment:', error)
    } finally {
      setLoading(false)
    }
  }

  const startWorkout = async () => {
    // Create workout session
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        try {
          const { data, error } = await supabase
            .from('workout_sessions')
            .insert({
              assignment_id: assignmentId,
              client_id: user.id,
              status: 'in_progress'
            })
            .select()
            .single()

          if (error) throw error
          setSessionId(data.id)
        } catch (dbError) {
          console.log('Database not ready, using localStorage fallback')
          setSessionId(Date.now().toString())
        }
      }
    } catch (error) {
      console.error('Error creating workout session:', error)
    }
  }

  const completeDropSet = async () => {
    const currentExercise = exercises[currentExerciseIndex]
    const workingWeightNum = parseFloat(dropWorkingWeight)
    const dropWeightNum = parseFloat(dropWeight)
    
    if (!currentExercise || workingWeightNum <= 0 || dropWeightNum <= 0 || isLoggingSet) {
      return
    }

    setIsLoggingSet(true)
    setShowSuccessAnimation(true)
    
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
    } catch (e) {}

    const setReps = Number(currentExercise?.meta?.drop_set_reps) || Number(currentExercise?.drop_set_reps) || Number(currentExercise?.reps) || 0
    const dropReps = Number(currentExercise?.meta?.dropset_reps) || Number(currentExercise?.dropset_reps) || 0
    
    // Track total weight lifted
    const setWeight = (workingWeightNum * setReps) + (dropWeightNum * dropReps)
    setTotalWeightLifted(prev => prev + setWeight)

    // BACKGROUND DATABASE SAVE
    try {
      await supabase
        .from('workout_logs')
        .insert({
          session_id: sessionId,
          template_exercise_id: currentExercise.id,
          set_number: currentSet,
          weight_used: workingWeightNum,
          reps_completed: setReps,
          rest_taken: currentExercise.rest_seconds || 60,
          rpe: 5,
          notes: `dropset_weight=${dropWeightNum},dropset_reps=${dropReps}`
        })

      addToast({
        title: 'Drop Set Logged!',
        description: `${workingWeightNum}kg → ${dropWeightNum}kg saved`,
        variant: 'success',
        duration: 2000
      })

    } catch (error) {
      console.error('Error logging drop set:', error)
      addToast({
        title: 'Failed to Save',
        description: 'Please check your connection and try again',
        variant: 'destructive',
        duration: 5000
      })
    }

    // Reset drop set state
    setDropWorkingWeight('')
    setDropWeight('')
    setDropManualOverride(false)

    // Move to next exercise/set
    const updatedExercises = [...exercises]
    const currentExerciseUpdated = updatedExercises[currentExerciseIndex]
    
    if (currentExerciseUpdated) {
      currentExerciseUpdated.completed_sets = (currentExerciseUpdated.completed_sets || 0) + 1
    }
    setExercises(updatedExercises)
    
    const isExerciseComplete = currentExerciseUpdated && (currentExerciseUpdated.completed_sets || 0) >= currentExerciseUpdated.sets
    const isWorkoutComplete = isExerciseComplete && currentExerciseIndex === exercises.length - 1

    if (isWorkoutComplete) {
      setIsLoggingSet(false)
      const totalSets = exercises.reduce((sum, ex) => sum + (ex.completed_sets || 0), 0)
      const exercisesCompleted = exercises.filter(ex => (ex.completed_sets || 0) >= ex.sets).length
      
      setWorkoutStats({
        totalTime: Math.floor((Date.now() - workoutStartTime) / 1000 / 60),
        exercisesCompleted,
        totalSets,
        personalBests: 0,
        totalWeightLifted,
        weightComparison: `${totalWeightLifted.toLocaleString()} kg`
      })
      
      setShowWorkoutCompletion(true)
      return
    }

    setRestTime(currentExercise.rest_seconds || 60)
    setShowRestTimer(true)
    setIsLoggingSet(false)
  }

  const completeSuperset = async () => {
    const currentExercise = exercises[currentExerciseIndex]
    const weightA = parseFloat(supersetAWeight)
    const repsA = parseInt(supersetAReps)
    const weightB = parseFloat(supersetBWeight)
    const repsB = parseInt(supersetBReps)
    
    if (!currentExercise || weightA <= 0 || repsA <= 0 || weightB <= 0 || repsB <= 0 || isLoggingSet) {
      return
    }

    setIsLoggingSet(true)

    // Show success animation and add haptic feedback
    setShowSuccessAnimation(true)
    
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
    } catch (e) {}

    // Track total weight lifted
    const setWeight = (weightA * repsA) + (weightB * repsB)
    setTotalWeightLifted(prev => prev + setWeight)

    // BACKGROUND DATABASE SAVE - Log both exercises
    try {
      // Log first exercise
      await supabase
        .from('workout_logs')
        .insert({
          session_id: sessionId,
          template_exercise_id: currentExercise.id,
          set_number: currentSet,
          weight_used: weightA,
          reps_completed: repsA,
          rest_taken: currentExercise.rest_seconds || 60,
          rpe: 5,
          notes: 'superset_exercise_a'
        })

      // Log second exercise
      await supabase
        .from('workout_logs')
        .insert({
          session_id: sessionId,
          template_exercise_id: currentExercise.id,
          set_number: currentSet,
          weight_used: weightB,
          reps_completed: repsB,
          rest_taken: currentExercise.rest_seconds || 60,
          rpe: 5,
          notes: 'superset_exercise_b'
        })

      addToast({
        title: 'Superset Logged!',
        description: `Both exercises saved`,
        variant: 'success',
        duration: 2000
      })

    } catch (error) {
      console.error('Error logging superset:', error)
      addToast({
        title: 'Failed to Save',
        description: 'Please check your connection and try again',
        variant: 'destructive',
        duration: 5000
      })
    }

    // Reset superset state
    setSupersetAWeight('')
    setSupersetAReps('')
    setSupersetBWeight('')
    setSupersetBReps('')

    // Move to next exercise/set
    const updatedExercises = [...exercises]
    const currentExerciseUpdated = updatedExercises[currentExerciseIndex]
    
    if (currentExerciseUpdated) {
      currentExerciseUpdated.completed_sets = (currentExerciseUpdated.completed_sets || 0) + 1
    }
    setExercises(updatedExercises)
    
    const isExerciseComplete = currentExerciseUpdated && (currentExerciseUpdated.completed_sets || 0) >= currentExerciseUpdated.sets
    const isWorkoutComplete = isExerciseComplete && currentExerciseIndex === exercises.length - 1

    if (isWorkoutComplete) {
      setIsLoggingSet(false)
      const totalSets = exercises.reduce((sum, ex) => sum + (ex.completed_sets || 0), 0)
      const exercisesCompleted = exercises.filter(ex => (ex.completed_sets || 0) >= ex.sets).length
      
      setWorkoutStats({
        totalTime: Math.floor((Date.now() - workoutStartTime) / 1000 / 60),
        exercisesCompleted,
        totalSets,
        personalBests: 0,
        totalWeightLifted,
        weightComparison: `${totalWeightLifted.toLocaleString()} kg`
      })
      
      setShowWorkoutCompletion(true)
      return
    }

    // Start rest timer
    setRestTime(currentExercise.rest_seconds || 60)
    setShowRestTimer(true)
    setIsLoggingSet(false)
  }

  const completeAmrapSet = async () => {
    const currentExercise = exercises[currentExerciseIndex]
    const weightNum = parseFloat(amrapWeight)
    const repsNum = parseInt(amrapReps)
    
    if (!currentExercise || weightNum <= 0 || repsNum <= 0 || isLoggingSet) {
      return
    }

    setIsLoggingSet(true)

    // Show success animation and add haptic feedback
    setShowSuccessAnimation(true)
    
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
    } catch (e) {}

    // Track total weight lifted
    const setWeight = weightNum * repsNum
    setTotalWeightLifted(prev => prev + setWeight)

    // BACKGROUND DATABASE SAVE
    try {
      const { error } = await supabase
        .from('workout_logs')
        .insert({
          session_id: sessionId,
          template_exercise_id: currentExercise.id,
          set_number: currentSet,
          weight_used: weightNum,
          reps_completed: repsNum,
          rest_taken: currentExercise.rest_seconds || 60,
          rpe: 5,
          notes: ''
        })

      if (error) throw error

      addToast({
        title: 'AMRAP Logged!',
        description: `${weightNum}kg × ${repsNum} reps saved`,
        variant: 'success',
        duration: 2000
      })

    } catch (error) {
      console.error('Error logging AMRAP:', error)
      addToast({
        title: 'Failed to Save',
        description: 'Please check your connection and try again',
        variant: 'destructive',
        duration: 5000
      })
    }

    // Reset AMRAP state
    setAmrapWeight('')
    setAmrapReps('')
    setAmrapActive(false)
    setAmrapTimeLeft(0)

    // Move to next exercise/set
    const updatedExercises = [...exercises]
    const currentExerciseUpdated = updatedExercises[currentExerciseIndex]
    
    if (currentExerciseUpdated) {
      currentExerciseUpdated.completed_sets = (currentExerciseUpdated.completed_sets || 0) + 1
    }
    setExercises(updatedExercises)
    
    const isExerciseComplete = currentExerciseUpdated && (currentExerciseUpdated.completed_sets || 0) >= currentExerciseUpdated.sets
    const isWorkoutComplete = isExerciseComplete && currentExerciseIndex === exercises.length - 1

    if (isWorkoutComplete) {
      setIsLoggingSet(false)
      const totalSets = exercises.reduce((sum, ex) => sum + (ex.completed_sets || 0), 0)
      const exercisesCompleted = exercises.filter(ex => (ex.completed_sets || 0) >= ex.sets).length
      
      setWorkoutStats({
        totalTime: Math.floor((Date.now() - workoutStartTime) / 1000 / 60),
        exercisesCompleted,
        totalSets,
        personalBests: 0,
        totalWeightLifted,
        weightComparison: `${totalWeightLifted.toLocaleString()} kg`
      })
      
      setShowWorkoutCompletion(true)
      return
    }

    // Start rest timer
    setRestTime(currentExercise.rest_seconds || 60)
    setShowRestTimer(true)
    setIsLoggingSet(false)
  }

  const completeSet = async () => {
    const currentExercise = exercises[currentExerciseIndex]
    if (!currentExercise || currentSetData.weight <= 0 || currentSetData.reps <= 0 || isLoggingSet) {
      return
    }

    setIsLoggingSet(true)

    // Show success animation and add haptic feedback
    setShowSuccessAnimation(true)
    
    // Add haptic feedback for success
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]) // Success vibration pattern
      }
    } catch (e) {
      // Ignore haptic feedback errors
    }

    // OPTIMISTIC UI UPDATE - Show checkmark immediately
    const updatedExercises = [...exercises]
    const currentExerciseUpdated = updatedExercises[currentExerciseIndex]
    
    if (currentExerciseUpdated) {
      currentExerciseUpdated.completed_sets = (currentExerciseUpdated.completed_sets || 0) + 1
    }

    setExercises(updatedExercises)
    
    // Track total weight lifted
    const setWeight = currentSetData.weight * currentSetData.reps
    setTotalWeightLifted(prev => prev + setWeight)

    // Determine if we need rest timer or if workout is complete
    const isExerciseComplete = currentExerciseUpdated && (currentExerciseUpdated.completed_sets || 0) >= currentExerciseUpdated.sets
    const isWorkoutComplete = isExerciseComplete && currentExerciseIndex === exercises.length - 1

    if (isWorkoutComplete) {
      setIsLoggingSet(false)
      // Calculate workout stats
      const totalSets = exercises.reduce((sum, ex) => sum + (ex.completed_sets || 0), 0)
      const exercisesCompleted = exercises.filter(ex => (ex.completed_sets || 0) >= ex.sets).length
      
      setWorkoutStats({
        totalTime: Math.floor((Date.now() - workoutStartTime) / 1000 / 60), // minutes
        exercisesCompleted,
        totalSets,
        personalBests: 0, // TODO: Calculate from previous performances
        totalWeightLifted,
        weightComparison: `${totalWeightLifted.toLocaleString()} kg`
      })
      
      setShowWorkoutCompletion(true)
      return
    }

    // Start rest timer
    setRestTime(currentExercise.rest_seconds || 60)
    setShowRestTimer(true)

    // Reset form data for next set
    setCurrentSetData({ weight: 0, reps: 0 })

    // BACKGROUND DATABASE SAVE
    try {
      const { error } = await supabase
        .from('workout_logs')
        .insert({
          session_id: sessionId,
          template_exercise_id: currentExercise.id,
          set_number: currentSet,
          weight_used: currentSetData.weight,
          reps_completed: currentSetData.reps,
          rest_taken: currentExercise.rest_seconds || 60,
          rpe: 5,
          notes: (currentType === 'for_time' && forTimeCompletionSecs != null)
            ? `for_time_completion_secs=${forTimeCompletionSecs}`
            : ''
        })

      if (error) throw error

      addToast({
        title: 'Set Logged!',
        description: `${currentSetData.weight}kg × ${currentSetData.reps} reps saved`,
        variant: 'success',
        duration: 2000
      })

    } catch (error) {
      console.error('Error logging set:', error)
      addToast({
        title: 'Failed to Save Set',
        description: 'Please check your connection and try again',
        variant: 'destructive',
        duration: 5000
      })
    } finally {
      setIsLoggingSet(false)
      
      // Hide success animation after delay
      setTimeout(() => {
        setShowSuccessAnimation(false)
      }, 1500)
    }
  }

  // Giant Set: log all sub-exercises together
  const completeGiantSet = async () => {
    const current = exercises[currentExerciseIndex]
    if (!current || isLoggingSet) return
    setIsLoggingSet(true)

    // Sum weight x reps across items
    let sumWeight = 0
    for (let i = 0; i < Math.max(giantWeights.length, giantReps.length); i++) {
      const w = parseFloat(giantWeights[i] || '0') || 0
      const r = parseInt(giantReps[i] || '0') || 0
      sumWeight += w * r
    }

    // Optimistic UI: increment completed sets and total weight lifted
    const updatedExercises = [...exercises]
    const updated = updatedExercises[currentExerciseIndex]
    if (updated) {
      updated.completed_sets = (updated.completed_sets || 0) + 1
    }
    setExercises(updatedExercises)
    setTotalWeightLifted(prev => prev + sumWeight)

    const isExerciseComplete = updated && (updated.completed_sets || 0) >= updated.sets
    const isWorkoutComplete = isExerciseComplete && currentExerciseIndex === exercises.length - 1

    if (isWorkoutComplete) {
      setIsLoggingSet(false)
      const totalSets = exercises.reduce((sum, ex) => sum + (ex.completed_sets || 0), 0)
      const exercisesCompleted = exercises.filter(ex => (ex.completed_sets || 0) >= ex.sets).length
      setWorkoutStats({
        totalTime: Math.floor((Date.now() - workoutStartTime) / 1000 / 60),
        exercisesCompleted,
        totalSets,
        personalBests: 0,
        totalWeightLifted,
        weightComparison: `${totalWeightLifted.toLocaleString()} kg`
      })
      setShowWorkoutCompletion(true)
      return
    }

    // Start rest timer
    setRestTime(current.rest_seconds || 60)
    setShowRestTimer(true)

    // Background save
    try {
      const { error } = await supabase
        .from('workout_logs')
        .insert({
          session_id: sessionId,
          template_exercise_id: current.id,
          set_number: currentSet,
          weight_used: null,
          reps_completed: null,
          rest_taken: current.rest_seconds || 60,
          rpe: 5,
          notes: JSON.stringify({ giant_set: { weights: giantWeights, reps: giantReps } })
        })
      if (error) throw error
      addToast({ title: 'Giant Set Logged!', description: 'All entries saved', variant: 'success', duration: 2000 })
    } catch (error) {
      console.error('Error logging giant set:', error)
      addToast({ title: 'Failed to Save', description: 'Please try again', variant: 'destructive', duration: 5000 })
    } finally {
      setIsLoggingSet(false)
      setTimeout(() => setShowSuccessAnimation(false), 1500)
    }
  }


  const handleRestTimerComplete = () => {
    setShowRestTimer(false)
    
    // Advance to next set or exercise
    const currentExercise = exercises[currentExerciseIndex]
    const isExerciseComplete = currentExercise && (currentExercise.completed_sets || 0) >= currentExercise.sets
    
    if (isExerciseComplete && currentExerciseIndex < exercises.length - 1) {
      // Move to next exercise
      setCurrentExerciseIndex(currentExerciseIndex + 1)
      setCurrentSet(1)
    } else {
      // More sets in current exercise
      setCurrentSet(currentSet + 1)
    }
  }

  const handleRestTimerSkip = () => {
    setShowRestTimer(false)
    handleRestTimerComplete()
  }

  const getVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  const getEmbedUrl = (url: string) => {
    const videoId = getVideoId(url)
    return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
  }

  const openVideoModal = (videoUrl: string) => {
    setCurrentVideoUrl(videoUrl)
    setShowVideoModal(true)
  }

  const closeVideoModal = () => {
    setShowVideoModal(false)
    setCurrentVideoUrl('')
  }

  const completeWorkout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        // Update workout session
        if (sessionId) {
          await supabase
            .from('workout_sessions')
            .update({
              completed_at: new Date().toISOString(),
              status: 'completed'
            })
            .eq('id', sessionId)
        }

        // Update assignment status
        await supabase
          .from('workout_assignments')
          .update({ status: 'completed' })
          .eq('id', assignmentId)
      } catch (dbError) {
        console.log('Database not ready, using localStorage fallback')
      }

      // Navigate to completion page
      router.push(`/client/workouts/${assignmentId}/complete`)
    } catch (error) {
      console.error('Error completing workout:', error)
    }
  }


  const currentExercise = exercises[currentExerciseIndex]
  const targetReps = currentExercise?.reps || '0'
  const currentType = currentExercise?.exercise_type || currentExercise?.meta?.exercise_type || 'straight_set'

  // Short, human-friendly instructions per exercise type
  const typeHelp = (() => {
    switch (currentType) {
      case 'giant_set':
        return 'Perform all exercises back-to-back with minimal rest. Log weights for each, then tap Log Giant Set.'
      case 'superset':
        return 'Alternate the two exercises with minimal rest. Log both exercises each set.'
      case 'pre_exhaustion':
        return 'Do the isolation move first to fatigue the muscle, then perform the compound move.'
      case 'drop_set':
        return 'Work to near-failure at the working weight, then immediately reduce weight and continue.'
      case 'cluster_set':
        return 'Use short rests within the set. Reps per cluster are fixed; adjust weights as needed.'
      case 'tabata':
        return 'High-intensity intervals: follow the autoplay timer for work/rest rounds.'
      case 'circuit':
        return 'Move through the circuit following the autoplay timer for each exercise/rest.'
      case 'amrap':
        return 'As many reps as possible in the time window. Start the timer, then log performance.'
      case 'emom':
        return 'Every minute on the minute: complete the work at the start of each minute.'
      case 'for_time':
        return 'Complete the target reps as fast as possible. Start the timer and stop when done.'
      default:
        return 'Log weight and reps for each set. Rest as prescribed.'
    }
  })()

  // AMRAP timer state (countdown in seconds)
  const [amrapActive, setAmrapActive] = useState(false)
  const [amrapTimeLeft, setAmrapTimeLeft] = useState(0)
  const [amrapWeight, setAmrapWeight] = useState<string>('')
  const [amrapReps, setAmrapReps] = useState<string>('')
  // EMOM state
  const [emomActive, setEmomActive] = useState(false)
  const [emomPhase, setEmomPhase] = useState<'work' | 'rest'>('work')
  const [emomPhaseLeft, setEmomPhaseLeft] = useState(0)
  const [emomTotalLeft, setEmomTotalLeft] = useState(0)
  const [emomRepActive, setEmomRepActive] = useState(false)
  const [emomRepTimeLeft, setEmomRepTimeLeft] = useState(0)
  // Tabata/Circuit state
  const [intervalActive, setIntervalActive] = useState(false)
  const [intervalPhase, setIntervalPhase] = useState<'work' | 'rest'>('work')
  const [intervalPhaseLeft, setIntervalPhaseLeft] = useState(0)
  const [intervalRound, setIntervalRound] = useState(0)
  const [intervalTotalRounds, setIntervalTotalRounds] = useState(0)
  const [intervalMode, setIntervalMode] = useState<'tabata' | 'circuit' | null>(null)
  const [showTimerModal, setShowTimerModal] = useState(false)
  const [timerExerciseIndex, setTimerExerciseIndex] = useState(0)
  const [timerSetIndex, setTimerSetIndex] = useState(0)
  const [isTimerPaused, setIsTimerPaused] = useState(false)
  // Drop set state
  const [dropWorkingWeight, setDropWorkingWeight] = useState<string>('')
  const [dropWeight, setDropWeight] = useState<string>('')
  const [dropReps, setDropReps] = useState<number>(0)
  const [dropManualOverride, setDropManualOverride] = useState(false)
  // Cluster set state
  const [clusterWeights, setClusterWeights] = useState<string[]>([])
  // Rest-pause state (extra forced mini-sets reps)
  const [restPauseExtraReps, setRestPauseExtraReps] = useState<string[]>([])
  // For Time state
  const [forTimeActive, setForTimeActive] = useState(false)
  
  // Previous Performance data
  const [previousPerformance, setPreviousPerformance] = useState<{
    lastWorkout: any | null
    personalBest: any | null
    loading: boolean
  }>({
    lastWorkout: null,
    personalBest: null,
    loading: false
  })
  const [forTimeTimeLeft, setForTimeTimeLeft] = useState(0)
  const [forTimeCompletionSecs, setForTimeCompletionSecs] = useState<number | null>(null)
  // Superset/Pre-exhaustion dual inputs
  const [supersetAWeight, setSupersetAWeight] = useState<string>('')
  const [supersetAReps, setSupersetAReps] = useState<string>('')
  const [supersetBWeight, setSupersetBWeight] = useState<string>('')
  const [supersetBReps, setSupersetBReps] = useState<string>('')
  // Giant set per-exercise inputs
  const [giantWeights, setGiantWeights] = useState<string[]>([])
  const [giantReps, setGiantReps] = useState<string[]>([])

  useEffect(() => {
    let interval: any
    if (amrapActive && amrapTimeLeft > 0) {
      interval = setInterval(() => {
        setAmrapTimeLeft((t) => (t > 0 ? t - 1 : 0))
      }, 1000)
    } else if (amrapActive && amrapTimeLeft === 0) {
      // Timer finished: stop and reveal standard form
      setAmrapActive(false)
    }
    return () => interval && clearInterval(interval)
  }, [amrapActive, amrapTimeLeft])

  // EMOM: time-based alternating work/rest until total duration ends
  useEffect(() => {
    let interval: any
    if (emomActive && emomTotalLeft > 0) {
      interval = setInterval(() => {
        setEmomTotalLeft((t) => (t > 0 ? t - 1 : 0))
        setEmomPhaseLeft((p) => {
          if (p > 1) return p - 1
          // phase finished: switch
          const workSeconds = Number(currentExercise?.meta?.work_seconds) || Number(currentExercise?.work_seconds) || 40
          const restSeconds = 60 - workSeconds
          const nextPhase = emomPhase === 'work' ? 'rest' : 'work'
          setEmomPhase(nextPhase)
          return nextPhase === 'work' ? workSeconds : restSeconds
        })
      }, 1000)
    } else if (emomActive && emomTotalLeft === 0) {
      setEmomActive(false)
    }
    return () => interval && clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emomActive, emomTotalLeft])

  // EMOM: rep-based acts like AMRAP per your spec
  useEffect(() => {
    let interval: any
    if (emomRepActive && emomRepTimeLeft > 0) {
      interval = setInterval(() => {
        setEmomRepTimeLeft((t) => (t > 0 ? t - 1 : 0))
      }, 1000)
    } else if (emomRepActive && emomRepTimeLeft === 0) {
      setEmomRepActive(false)
    }
    return () => interval && clearInterval(interval)
  }, [emomRepActive, emomRepTimeLeft])

  // Tabata/Circuit autoplay: alternate work/rest for N rounds
  // State machine: Move to next state when time reaches zero
  useEffect(() => {
    if (intervalPhaseLeft !== 0 || !intervalActive || !showTimerModal) return
    if (currentType !== 'tabata' && currentType !== 'circuit') return

    // Time reached zero - transition to next state
    const circuitSets = currentExercise?.meta?.circuit_sets
    if (!circuitSets) return

    const currentSet = circuitSets[timerSetIndex]
    const currentExerciseInSet = currentSet?.exercises?.[timerExerciseIndex]

    if (intervalPhase === 'work') {
      // Work phase finished - transition to rest
      const restTime = currentExerciseInSet?.rest_after || 10
      console.log('💪 WORK PHASE FINISHED - Going to REST:', {
        timerSetIndex,
        timerExerciseIndex,
        restTime
      })
      setIntervalPhase('rest')
      setIntervalPhaseLeft(restTime)
    } else if (intervalPhase === 'rest') {
      // Rest phase finished - determine next state
      console.log('📊 REST PHASE FINISHED - Checking next state:', {
        timerExerciseIndex,
        exercisesInSet: currentSet?.exercises?.length,
        hasMoreExercises: timerExerciseIndex + 1 < (currentSet?.exercises?.length || 0),
        timerSetIndex,
        totalSets: circuitSets.length,
        hasMoreSets: timerSetIndex + 1 < circuitSets.length
      })
      
      if (timerExerciseIndex + 1 < (currentSet?.exercises?.length || 0)) {
        // More exercises in current set - move to next exercise
        console.log('➡️ Moving to next exercise in same set')
        const nextExerciseIndex = timerExerciseIndex + 1
        const nextExercise = currentSet.exercises[nextExerciseIndex]
        const workTime = nextExercise?.work_seconds || 20
        setTimerExerciseIndex(nextExerciseIndex)
        setIntervalPhase('work')
        setIntervalPhaseLeft(workTime)
      } else {
        // Completed all exercises in current set
        const isLastSetInRound = timerSetIndex === circuitSets.length - 1
        const nextRound = intervalRound + 1
        const isLastRound = nextRound >= intervalTotalRounds
        
        // Show rest after set UNLESS this is the last set of the last round
        if (!isLastSetInRound || !isLastRound) {
          // Show rest after set
          const restAfterSetTime = Number(currentSet?.rest_between_sets) || 30
          console.log('🟣 Transitioning to REST AFTER SET:', {
            currentSet,
            rest_between_sets: currentSet?.rest_between_sets,
            restAfterSetTime,
            timerSetIndex,
            isLastSetInRound,
            isLastRound
          })
          setIntervalPhase('rest_after_set')
          setIntervalPhaseLeft(restAfterSetTime)
        } else {
          // Last set of last round - workout complete
          console.log('✅ Workout complete!')
          setIntervalActive(false)
          setShowTimerModal(false)
        }
      }
    } else if (intervalPhase === 'rest_after_set') {
      // Rest after set finished
      const isLastSetInRound = timerSetIndex === circuitSets.length - 1
      
      if (isLastSetInRound) {
        // Last set of round completed - start next round
        const nextRound = intervalRound + 1
        console.log('🔄 Starting next round after rest:', nextRound + 1)
        const firstSet = circuitSets[0]
        const firstExercise = firstSet?.exercises?.[0]
        const workTime = firstExercise?.work_seconds || 20
        setIntervalRound(nextRound)
        setTimerSetIndex(0)
        setTimerExerciseIndex(0)
        setIntervalPhase('work')
        setIntervalPhaseLeft(workTime)
      } else {
        // Move to first exercise of next set
        const nextSetIndex = timerSetIndex + 1
        const nextSet = circuitSets[nextSetIndex]
        const firstExercise = nextSet?.exercises?.[0]
        const workTime = firstExercise?.work_seconds || 20
        console.log('➡️ Moving to next set after rest:', nextSetIndex + 1)
        setTimerSetIndex(nextSetIndex)
        setTimerExerciseIndex(0)
        setIntervalPhase('work')
        setIntervalPhaseLeft(workTime)
      }
    }
  }, [intervalPhaseLeft, intervalActive, showTimerModal, currentType, currentExercise?.meta?.circuit_sets, timerSetIndex, timerExerciseIndex, intervalPhase, intervalRound, intervalTotalRounds])

  // Single master timer - ticks every second
  useEffect(() => {
    if (!intervalActive || !showTimerModal || isTimerPaused) return
    if (currentType !== 'tabata' && currentType !== 'circuit') return

    const masterInterval = setInterval(() => {
      setIntervalPhaseLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(masterInterval)
  }, [intervalActive, showTimerModal, isTimerPaused, currentType])

  // Auto-calc drop weight when working weight or percentage changes, unless user overrode
  useEffect(() => {
    if (currentType !== 'drop_set') return
    if (dropManualOverride) return
    const pct = Number(currentExercise?.meta?.drop_percentage) || Number(currentExercise?.drop_percentage) || 0
    const w = parseFloat(dropWorkingWeight)
    if (!isNaN(w) && pct > 0) {
      const dw = Math.max(0, w * (1 - pct / 100))
      setDropWeight(dw ? dw.toFixed(1) : '')
    } else {
      setDropWeight('')
    }
  }, [currentType, currentExercise?.meta?.drop_percentage, currentExercise?.drop_percentage, dropWorkingWeight, dropManualOverride])

  // Initialize cluster weights when switching to cluster_set or exercise changes
  useEffect(() => {
    if (currentType !== 'cluster_set') return
    const count = Number(currentExercise?.meta?.clusters_per_set) || Number(currentExercise?.clusters_per_set) || 1
    setClusterWeights(Array.from({ length: Math.max(1, count) }, () => ''))
  }, [currentType, currentExercise?.id, currentExercise?.meta?.clusters_per_set, currentExercise?.clusters_per_set])

  // Initialize rest-pause mini-sets when switching to rest_pause or exercise changes
  useEffect(() => {
    if (currentType !== 'rest_pause') return
    const count = Number(currentExercise?.meta?.max_rest_pauses) || Number(currentExercise?.max_rest_pauses) || 0
    setRestPauseExtraReps(Array.from({ length: Math.max(0, count) }, () => ''))
  }, [currentType, currentExercise?.id, currentExercise?.meta?.max_rest_pauses, currentExercise?.max_rest_pauses])

  // For Time countdown
  useEffect(() => {
    let interval: any
    if (forTimeActive && forTimeTimeLeft > 0) {
      interval = setInterval(() => {
        setForTimeTimeLeft(t => (t > 0 ? t - 1 : 0))
      }, 1000)
    } else if (forTimeActive && forTimeTimeLeft === 0) {
      // time exhausted
      setForTimeActive(false)
      setForTimeCompletionSecs(prev => (prev == null ? (Number(currentExercise?.meta?.time_cap) || Number(currentExercise?.time_cap) || 0) * 60 : prev))
    }
    return () => interval && clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forTimeActive, forTimeTimeLeft])

  // Initialize giant set arrays when switching to giant_set or exercise changes
  useEffect(() => {
    if (currentType !== 'giant_set') return
    const items: any[] = (currentExercise?.meta?.giant_set_exercises || currentExercise?.giant_set_exercises || []) as any[]
    const len = Math.max(1, items.length)
    setGiantWeights(Array.from({ length: len }, () => ''))
    setGiantReps(Array.from({ length: len }, (_, i) => {
      const r = (items[i] && (items[i].reps || items[i].target_reps)) || ''
      return r?.toString?.() || ''
    }))
  }, [currentType, currentExercise?.id, currentExercise?.meta?.giant_set_exercises, currentExercise?.giant_set_exercises])

  // Fetch previous performance when exercise changes
  useEffect(() => {
    if (currentExercise?.exercise?.id) {
      fetchPreviousPerformance(currentExercise.exercise.id).catch(error => {
        console.error('Error fetching previous performance:', error)
      })
    }
  }, [currentExercise?.exercise?.id])

  // Theme-aware styles using your app's approach
  const theme = getThemeStyles()
  
  // Fetch previous performance data for current exercise
  const fetchPreviousPerformance = async (exerciseId: string) => {
    if (!exerciseId) return
    
    setPreviousPerformance(prev => ({ ...prev, loading: true }))
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setPreviousPerformance({ lastWorkout: null, personalBest: null, loading: false })
        return
      }

      // Get last workout performance for this exercise
      // Join with workout_assignments to filter by current user
      const { data: lastWorkout, error: lastError } = await supabase
        .from('workout_logs')
        .select(`
          id, 
          set_number, 
          reps_completed, 
          reps,
          weight_used, 
          weight_kg,
          logged_at,
          assignment_id
        `)
        .eq('exercise_id', exerciseId)
        .not('assignment_id', 'is', null)
        .order('logged_at', { ascending: false })
        .limit(10)

      if (lastError) {
        console.log('Unable to fetch previous performance:', lastError.message)
        setPreviousPerformance({ lastWorkout: null, personalBest: null, loading: false })
        return
      }

      // Filter by user's assignments (since we can't join directly)
      const { data: userAssignments } = await supabase
        .from('workout_assignments')
        .select('id')
        .eq('client_id', user.id)

      const assignmentIds = userAssignments?.map(a => a.id) || []
      const userLastWorkout = lastWorkout?.find(log => assignmentIds.includes(log.assignment_id))

      // Get personal best (highest weight used) for this exercise
      const { data: bestWorkout, error: bestError } = await supabase
        .from('workout_logs')
        .select(`
          id, 
          set_number,
          reps_completed,
          reps,
          weight_used,
          weight_kg,
          logged_at,
          assignment_id
        `)
        .eq('exercise_id', exerciseId)
        .not('assignment_id', 'is', null)
        .order('weight_used', { ascending: false })
        .order('weight_kg', { ascending: false })
        .limit(10)

      if (bestError) {
        console.log('Unable to fetch personal best:', bestError.message)
        setPreviousPerformance({ lastWorkout: userLastWorkout || null, personalBest: null, loading: false })
        return
      }

      // Filter by user's assignments
      const userBestWorkout = bestWorkout?.find(log => assignmentIds.includes(log.assignment_id) && (log.weight_used || log.weight_kg))

      setPreviousPerformance({
        lastWorkout: userLastWorkout || null,
        personalBest: userBestWorkout || null,
        loading: false
      })
    } catch (error) {
      console.log('Previous performance data unavailable:', error)
      setPreviousPerformance({ lastWorkout: null, personalBest: null, loading: false })
    }
  }

  // Reusable Previous Performance Card Component
  const PreviousPerformanceCard = () => (
    <div className="rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div className={`font-bold ${theme.text} text-base`}>Previous Performance</div>
      </div>
      
      {previousPerformance.loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
          <span className={`ml-2 text-sm ${theme.textSecondary}`}>Loading...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Last Workout */}
          <div className="rounded-lg p-3 bg-white/60 dark:bg-slate-800/60 border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className={`text-sm font-semibold ${theme.text}`}>Last Workout</span>
            </div>
            {previousPerformance.lastWorkout ? (
              <div className="space-y-1">
                {(previousPerformance.lastWorkout.weight_used || previousPerformance.lastWorkout.weight_kg) && (
                  <div className={`text-sm ${theme.text}`}>
                    <span className="font-medium">Weight:</span> {previousPerformance.lastWorkout.weight_used || previousPerformance.lastWorkout.weight_kg}kg
                  </div>
                )}
                {(previousPerformance.lastWorkout.reps_completed || previousPerformance.lastWorkout.reps) && (
                  <div className={`text-sm ${theme.text}`}>
                    <span className="font-medium">Reps:</span> {previousPerformance.lastWorkout.reps_completed || previousPerformance.lastWorkout.reps}
                  </div>
                )}
                {previousPerformance.lastWorkout.set_number && (
                  <div className={`text-sm ${theme.text}`}>
                    <span className="font-medium">Set:</span> {previousPerformance.lastWorkout.set_number}
                  </div>
                )}
                <div className={`text-xs ${theme.textSecondary}`}>
                  {new Date(previousPerformance.lastWorkout.logged_at).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className={`text-sm ${theme.textSecondary}`}>No previous data</div>
            )}
          </div>

          {/* Personal Best */}
          <div className="rounded-lg p-3 bg-white/60 dark:bg-slate-800/60 border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className={`text-sm font-semibold ${theme.text}`}>Personal Best</span>
            </div>
            {previousPerformance.personalBest ? (
              <div className="space-y-1">
                {(previousPerformance.personalBest.weight_used || previousPerformance.personalBest.weight_kg) && (
                  <div className={`text-sm ${theme.text}`}>
                    <span className="font-medium">Weight:</span> {previousPerformance.personalBest.weight_used || previousPerformance.personalBest.weight_kg}kg
                  </div>
                )}
                {(previousPerformance.personalBest.reps_completed || previousPerformance.personalBest.reps) && (
                  <div className={`text-sm ${theme.text}`}>
                    <span className="font-medium">Reps:</span> {previousPerformance.personalBest.reps_completed || previousPerformance.personalBest.reps}
                  </div>
                )}
                {previousPerformance.personalBest.set_number && (
                  <div className={`text-sm ${theme.text}`}>
                    <span className="font-medium">Set:</span> {previousPerformance.personalBest.set_number}
                  </div>
                )}
                <div className={`text-xs ${theme.textSecondary}`}>
                  {new Date(previousPerformance.personalBest.logged_at).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className={`text-sm ${theme.textSecondary}`}>No personal best yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <ProtectedRoute requiredRole="client">
      <div style={{ minHeight: '100vh', backgroundColor: '#E8E9F3', paddingBottom: '100px' }}>
        {/* Rest Timer Overlay */}
        <RestTimerOverlay
          isActive={showRestTimer}
          initialTime={restTime}
          onComplete={handleRestTimerComplete}
          onSkip={handleRestTimerSkip}
          exerciseName={currentExercise?.exercise?.name}
          nextSet={currentSet}
          totalSets={currentExercise?.sets}
        />

        <div style={{ padding: '24px 20px' }}>
          <div className="max-w-4xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Enhanced Header */}
            <Card style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              marginBottom: '20px',
              border: 'none',
              overflow: 'hidden'
            }}>
              <CardContent style={{ padding: '0' }}>
                <div className="flex items-center" style={{ gap: '16px' }}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => router.push('/client/workouts')}
                    style={{
                      padding: '12px',
                      borderRadius: '16px',
                      color: '#6B7280'
                    }}
                  >
                    <ArrowLeft style={{ width: '20px', height: '20px' }} />
                  </Button>
                  <div className="flex-1">
                    <div className="flex items-center" style={{ gap: '12px' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '18px',
                        background: 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Dumbbell style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                      </div>
                      <div>
                        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A', lineHeight: '1.2', marginBottom: '4px' }}>
                          {assignment?.template?.name || 'Workout'}
                        </h1>
                        <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>Live Workout Session</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#4CAF50', borderRadius: '50%', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
                    <span style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>Live</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workout Block System */}
            {useBlockSystem && workoutBlocks.length > 0 ? (
              <LiveWorkoutBlockExecutor
                block={workoutBlocks[currentBlockIndex]}
                onBlockComplete={handleBlockComplete}
                onNextBlock={handleNextBlock}
              />
            ) : (
              /* Traditional Workout System */
              loading ? (
                <Card className={`${theme.card} border ${theme.border} rounded-3xl overflow-hidden`}>
                  <CardContent className="p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Dumbbell className="w-10 h-10 text-white animate-pulse" />
                    </div>
                    <h3 className={`text-2xl font-bold ${theme.text} mb-3`}>Loading workout...</h3>
                    <p className={`${theme.textSecondary} mb-6`}>Please wait while we prepare your exercises.</p>
                  </CardContent>
                </Card>
              ) : currentExercise ? (
                <div className="space-y-4 sm:space-y-6">
                  {/* Instruction Card - Only show for types that don't have their own detail cards */}
                  {currentType !== 'giant_set' && currentType !== 'circuit' && currentType !== 'tabata' && currentType !== 'amrap' && currentType !== 'emom' && currentType !== 'for_time' && currentType !== 'superset' && currentType !== 'pre_exhaustion' && (
                  <div className="rounded-2xl sm:rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl relative z-30">
                    <Card className={`border-0 ${theme.card} bg-white/90 dark:bg-slate-800/90 backdrop-blur-md overflow-hidden`}>
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                            <Lightbulb className="w-4 h-4" />
                          </div>
                      <div className="flex-1">
                            <div className={`text-base font-semibold ${theme.text} mb-1`}>How to perform</div>
                            <div className={`text-base leading-relaxed ${theme.textSecondary} rounded-xl border ${theme.border} bg-white/70 dark:bg-slate-800/50 p-3`}>{typeHelp}</div>
                      </div>
                          {/* Optional tiny illustration placeholder (hidden if not needed) */}
                          <div className="hidden sm:block shrink-0">
                            <div className="w-16 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border border-white/40 dark:border-white/10"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  )}
                  {/* AMRAP Flow */}
                  {currentType === 'amrap' && (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      border: '2px solid #2196F3'
                    }}>
                      <div>
                      {!amrapActive ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Exercise Details Header */}
                          <div className="flex items-center" style={{ gap: '12px' }}>
                            <div style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '18px',
                              background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Target style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>AMRAP Details</div>
                              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                                Complete as many reps as possible
                              </div>
                            </div>
                          </div>

                          {/* Summary Info */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-700">
                              <div className={`text-sm ${theme.textSecondary} mb-1`}>Duration</div>
                              <div className={`text-2xl font-bold ${theme.text}`}>
                                {currentExercise?.meta?.amrap_duration || currentExercise?.amrap_duration || 10} min
                              </div>
                            </div>
                            <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                              <div className={`text-sm ${theme.textSecondary} mb-1`}>Sets</div>
                              <div className={`text-2xl font-bold ${theme.text}`}>{currentExercise?.sets || 1}</div>
                            </div>
                          </div>

                          {/* Exercise Details */}
                          <div className="rounded-xl p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border-2 border-blue-200 dark:border-blue-700">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-400 to-cyan-500">
                                <Dumbbell className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`font-bold ${theme.text} text-base`}>
                                    {currentExercise.exercise?.name || 'Exercise'}
                                  </div>
                                  {/* Utility Icon Buttons */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowPlateCalculator(true)}
                                    className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowExerciseAlternatives(true)}
                                    className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 text-sm">
                                  {currentExercise?.reps && (
                                    <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                      <span className={`text-sm font-bold ${theme.text}`}>{currentExercise.reps} reps</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                        {currentExercise.exercise?.video_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                            onClick={() => openVideoModal(currentExercise.exercise?.video_url || '')}
                                  className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Youtube className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            {/* Logging Fields */}
                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                              <div>
                                <label className={`block text-sm font-medium ${theme.text} mb-1`}>Weight (kg)</label>
                                <input
                                  type="number"
                                  value={amrapWeight}
                                  onChange={(e) => setAmrapWeight(e.target.value)}
                                  className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                  step="0.5"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className={`block text-sm font-medium ${theme.text} mb-1`}>Reps Achieved</label>
                                <input
                                  type="number"
                                  value={amrapReps}
                                  onChange={(e) => setAmrapReps(e.target.value)}
                                  className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                  placeholder="0"
                                />
                            </div>
                          </div>
                          </div>

                          {/* Previous Performance Card */}
                          <PreviousPerformanceCard />
                        
                          {/* Action Buttons */}
                          <div className="space-y-2">
                            {/* Primary: Log and Continue */}
                        <Button
                              onClick={completeAmrapSet}
                              className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
                              disabled={isLoggingSet}
                            >
                              <Check className="w-5 h-5 mr-2" /> Log AMRAP
                            </Button>
                            
                            {/* Secondary: Start Timer */}
                            <Button
                              onClick={() => {
                                const minutes = Number(currentExercise?.meta?.amrap_duration) || Number(currentExercise?.amrap_duration) || 10
                                setAmrapTimeLeft(minutes * 60)
                                setAmrapActive(true)
                              }}
                          variant="outline"
                              className="w-full border-2 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl py-4 text-base font-semibold"
                        >
                              <Clock className="w-4 h-4 mr-2" /> Start Timer
                        </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="text-5xl font-bold text-blue-700 dark:text-blue-300">
                            {Math.floor(amrapTimeLeft / 60).toString().padStart(2, '0')}:{(amrapTimeLeft % 60).toString().padStart(2, '0')}
                          </div>
                          <div className="mt-2 text-slate-600 dark:text-slate-300">Time Remaining</div>
                          <Button 
                            onClick={() => {
                              setAmrapActive(false)
                              setAmrapTimeLeft(0)
                            }} 
                            variant="outline" 
                            className="mt-4"
                          >
                            Stop
                          </Button>
                        </div>
                      )}
                      </div>
                    </div>
                  )}

                  {/* EMOM Flow */}
                  {currentType === 'emom' && (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      border: '2px solid #4CAF50'
                    }}>
                      <div>
                      {/* Rep-based behaves like AMRAP */}
                      {currentExercise?.meta?.emom_mode === 'rep_based' ? (
                        !emomRepActive && emomRepTimeLeft === 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Exercise Details Header */}
                            <div className="flex items-center" style={{ gap: '12px' }}>
                              <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '18px',
                                background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Clock style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>EMOM Details (Rep-Based)</div>
                                <div style={{ fontSize: '14px', color: '#6B7280' }}>
                                  Complete target reps every minute
                                </div>
                              </div>
                            </div>

                            {/* Summary Info */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-700">
                                <div className={`text-sm ${theme.textSecondary} mb-1`}>Duration</div>
                                <div className={`text-2xl font-bold ${theme.text}`}>
                                  {currentExercise?.meta?.emom_duration || currentExercise?.emom_duration || 10} min
                                </div>
                              </div>
                              <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                                <div className={`text-sm ${theme.textSecondary} mb-1`}>Sets</div>
                                <div className={`text-2xl font-bold ${theme.text}`}>{currentExercise?.sets || 1}</div>
                              </div>
                            </div>

                            {/* Start Button */}
                            <Button
                              onClick={() => {
                                const minutes = Number(currentExercise?.meta?.emom_duration) || Number(currentExercise?.emom_duration) || 10
                                setEmomRepTimeLeft(minutes * 60)
                                setEmomRepActive(true)
                              }}
                              className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
                            >
                              <Clock className="w-5 h-5 mr-2" /> Start EMOM
                            </Button>
                          </div>
                        ) : emomRepActive ? (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="text-5xl font-bold text-emerald-700 dark:text-emerald-300">
                              {Math.floor(emomRepTimeLeft / 60).toString().padStart(2, '0')}:{(emomRepTimeLeft % 60).toString().padStart(2, '0')}
                            </div>
                            <div className="mt-2 text-slate-600 dark:text-slate-300">Time Remaining</div>
                            <Button onClick={() => setEmomRepActive(false)} variant="outline" className="mt-4">Stop</Button>
                          </div>
                        ) : null
                      ) : (
                        // Time-based with alternating phases
                        !emomActive && emomTotalLeft === 0 ? (
                          <div className="space-y-4">
                            {/* Exercise Details Header */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600">
                                <Clock className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className={`text-xl font-bold ${theme.text}`}>EMOM Details (Time-Based)</div>
                                <div className={`text-sm ${theme.textSecondary}`}>
                                  Work every minute on the minute
                                </div>
                              </div>
                            </div>

                            {/* Summary Info */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-700">
                                <div className={`text-sm ${theme.textSecondary} mb-1`}>Duration</div>
                                <div className={`text-2xl font-bold ${theme.text}`}>
                                  {currentExercise?.meta?.emom_duration || currentExercise?.emom_duration || 10} min
                                </div>
                              </div>
                              <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                                <div className={`text-sm ${theme.textSecondary} mb-1`}>Work Time</div>
                                <div className={`text-2xl font-bold ${theme.text}`}>
                                  {currentExercise?.meta?.work_seconds || currentExercise?.work_seconds || 40}s
                                </div>
                              </div>
                            </div>

                            {/* Start Button */}
                            <Button
                              onClick={() => {
                                const minutes = Number(currentExercise?.meta?.emom_duration) || Number(currentExercise?.emom_duration) || 10
                                const workSeconds = Number(currentExercise?.meta?.work_seconds) || Number(currentExercise?.work_seconds) || 40
                                const restSeconds = Math.max(0, 60 - workSeconds)
                                setEmomTotalLeft(minutes * 60)
                                setEmomPhase('work')
                                setEmomPhaseLeft(workSeconds)
                                setEmomActive(true)
                              }}
                              className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
                            >
                              <Clock className="w-5 h-5 mr-2" /> Start EMOM
                            </Button>
                          </div>
                        ) : emomActive ? (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1">Total Remaining</div>
                            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mb-4">
                              {Math.floor(emomTotalLeft / 60).toString().padStart(2, '0')}:{(emomTotalLeft % 60).toString().padStart(2, '0')}
                            </div>
                            <div className={`text-5xl font-extrabold ${emomPhase === 'work' ? 'text-red-600' : 'text-blue-600'} dark:${emomPhase === 'work' ? 'text-red-400' : 'text-blue-400'}`}>
                              {Math.floor(emomPhaseLeft / 60).toString().padStart(2, '0')}:{(emomPhaseLeft % 60).toString().padStart(2, '0')}
                            </div>
                            <div className="mt-2 text-slate-600 dark:text-slate-300">
                              {emomPhase === 'work' ? 'Work' : 'Rest'} phase
                            </div>
                            <Button onClick={() => setEmomActive(false)} variant="outline" className="mt-4">Stop</Button>
                          </div>
                        ) : null
                      )}
                      </div>
                    </div>
                  )}

                  {/* Tabata / Circuit Flow */}
                  {(currentType === 'tabata' || currentType === 'circuit') && (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      border: currentType === 'tabata' ? '2px solid #F5576C' : '2px solid #6C5CE7'
                    }}>
                      <div>
                      {!intervalActive ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Debug log */}
                          {currentType === 'tabata' && console.log('🔍 Tabata currentExercise data:', {
                            work_seconds: currentExercise?.work_seconds,
                            rest_seconds: currentExercise?.rest_seconds,
                            meta: currentExercise?.meta,
                            full: currentExercise
                          })}
                          {/* Exercise Details Card */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Header */}
                            <div className="flex items-center" style={{ gap: '12px' }}>
                              <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '18px',
                                background: currentType === 'tabata' 
                                  ? 'linear-gradient(135deg, #F5576C 0%, #FF8A80 100%)' 
                                  : 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Activity style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>
                                  {currentType === 'tabata' ? 'Tabata' : 'Circuit'} Details
                                </div>
                                <div style={{ fontSize: '14px', color: '#6B7280' }}>
                                  Autoplay countdowns for work and rest
                                </div>
                              </div>
                            </div>

                            {/* Summary Info */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
                                <div className={`text-sm ${theme.textSecondary} mb-1`}>
                                  {currentType === 'tabata' ? 'Rounds per Set' : 'Total Rounds'}
                                </div>
                                <div className={`text-2xl font-bold ${theme.text}`}>
                                  {currentType === 'tabata' 
                                    ? (currentExercise?.rounds || currentExercise?.meta?.rounds || 8)
                                    : (currentExercise?.sets || 1)
                                  }
                                </div>
                              </div>
                              <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                                <div className={`text-sm ${theme.textSecondary} mb-1`}>
                                  {currentType === 'tabata' ? 'Total Sets' : 'Sets per Round'}
                                </div>
                                <div className={`text-2xl font-bold ${theme.text}`}>
                                  {(() => {
                                    const sets = currentType === 'tabata' 
                                      ? currentExercise?.meta?.tabata_sets || currentExercise?.tabata_sets
                                      : currentExercise?.meta?.circuit_sets
                                    return Array.isArray(sets) ? sets.length : 0
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* Sets Details */}
                            {(() => {
                              const sets = currentType === 'tabata' 
                                ? currentExercise?.meta?.tabata_sets || currentExercise?.tabata_sets
                                : currentExercise?.meta?.circuit_sets
                              return Array.isArray(sets) && sets.length > 0 && (
                                <div className="space-y-3">
                                  {sets.map((set: any, setIndex: number) => (
                                  <div 
                                    key={setIndex} 
                                    className="rounded-xl p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border-2 border-blue-200 dark:border-blue-700"
                                  >
                                    {/* Set Header */}
                                    <div className="flex items-center justify-between mb-3">
                                      <div className={`text-lg font-bold ${theme.text}`}>Set {setIndex + 1}</div>
                                      {set.rest_between_sets && (
                                        <div className="px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700">
                                          <div className={`text-xs font-semibold ${theme.text}`}>
                                            Rest After Set: {set.rest_between_sets}s
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Exercises */}
                                    <div className="space-y-2">
                                      {Array.isArray(set.exercises) && set.exercises.map((exercise: any, exerciseIndex: number) => {
                                        const exerciseInfo = exerciseLookup[exercise.exercise_id]
                                        return (
                                          <div 
                                            key={exerciseIndex} 
                                            className="rounded-lg p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600"
                                          >
                                            <div className="flex items-start gap-3">
                                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                currentType === 'tabata'
                                                  ? 'bg-gradient-to-br from-red-400 to-orange-500'
                                                  : 'bg-gradient-to-br from-purple-400 to-indigo-500'
                                              }`}>
                                                <span className="text-white font-bold text-sm">{exerciseIndex + 1}</span>
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <div className={`font-bold ${theme.text} text-base`}>
                                                    {exerciseInfo?.name || 'Unknown Exercise'}
                                                  </div>
                                                  {/* Utility Icon Buttons */}
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowPlateCalculator(true)}
                                                    className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                  >
                                                    <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowExerciseAlternatives(true)}
                                                    className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                  >
                                                    <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                                  </Button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-sm">
                                                  {currentType === 'tabata' ? (
                                                    <>
                                                      {/* For Tabata, use global work_seconds and rest_seconds */}
                                                      {(currentExercise?.work_seconds || currentExercise?.meta?.work_seconds) && (
                                                        <div className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700">
                                                          <span className={`font-semibold ${theme.text}`}>Work: {currentExercise?.work_seconds || currentExercise?.meta?.work_seconds}s</span>
                                                        </div>
                                                      )}
                                                      {(currentExercise?.rest_seconds || currentExercise?.meta?.rest_seconds) && (
                                                        <div className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700">
                                                          <span className={`font-semibold ${theme.text}`}>Rest: {currentExercise?.rest_seconds || currentExercise?.meta?.rest_seconds}s</span>
                                                        </div>
                                                      )}
                                                    </>
                                                  ) : (
                                                    <>
                                                      {/* For Circuit, use individual exercise settings */}
                                                      {exercise.work_seconds && (
                                                        <div className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700">
                                                          <span className={`font-semibold ${theme.text}`}>Work: {exercise.work_seconds}s</span>
                                                        </div>
                                                      )}
                                                      {exercise.target_reps && (
                                                        <div className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700">
                                                          <span className={`font-semibold ${theme.text}`}>Target: {exercise.target_reps} reps</span>
                                                        </div>
                                                      )}
                                                      {exercise.rest_after && (
                                                        <div className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700">
                                                          <span className={`font-semibold ${theme.text}`}>Rest: {exercise.rest_after}s</span>
                                                        </div>
                                                      )}
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                              {/* Video Button */}
                                              {exerciseInfo?.video_url && (
                        <Button
                          variant="outline"
                          size="sm"
                                                  onClick={() => {
                                                    setCurrentVideoUrl(exerciseInfo.video_url || '')
                                                    setShowVideoModal(true)
                                                  }}
                                                  className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                  <Youtube className="w-4 h-4" />
                        </Button>
                                              )}
                      </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ))}
                                </div>
                              )
                            })()}
                    </div>

                          {/* Start Button */}
                          <Button
                            onClick={() => {
                              setShowTimerModal(true)
                              setTimerExerciseIndex(0)
                              setTimerSetIndex(0)
                              setIntervalMode(currentType as any)
                              setIntervalRound(0)
                              setIntervalPhase('work')
                              setIntervalActive(true)
                              
                              // Initialize timer with first exercise
                              const sets = currentType === 'tabata' 
                                ? currentExercise?.meta?.tabata_sets || currentExercise?.tabata_sets
                                : currentExercise?.meta?.circuit_sets
                              const firstSet = sets?.[0]
                              const firstExercise = firstSet?.exercises?.[0]
                              const workTime = firstExercise?.work_seconds || 20
                              setIntervalPhaseLeft(workTime)
                              
                              // Set total rounds
                              const rounds = currentExercise?.sets || 1
                              setIntervalTotalRounds(rounds)
                            }}
                            className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
                          >
                            <Clock className="w-5 h-5 mr-2" /> Start {currentType === 'tabata' ? 'Tabata' : 'Circuit'}
                          </Button>
                        </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8">
                          <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                            Round {Math.min(intervalRound + (intervalPhase === 'rest' ? 1 : 1), intervalTotalRounds)} / {intervalTotalRounds}
                        </div>
                          <div className={`text-5xl font-extrabold ${intervalPhase === 'work' ? 'text-purple-700' : 'text-indigo-700'} dark:${intervalPhase === 'work' ? 'text-purple-300' : 'text-indigo-300'}`}>
                            {Math.floor(intervalPhaseLeft / 60).toString().padStart(2, '0')}:{(intervalPhaseLeft % 60).toString().padStart(2, '0')}
                        </div>
                          <div className="mt-2 text-slate-600 dark:text-slate-300">
                            {intervalPhase === 'work' ? 'Work' : 'Rest'} phase
                      </div>
                          <Button onClick={() => setIntervalActive(false)} variant="outline" className="mt-4">Stop</Button>
                        </div>
                        )}
                      </div>
                    </div>
                  )}


                  {/* Cluster Set Flow */}
                  {currentType === 'cluster_set' && (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      border: '2px solid #6C5CE7'
                    }}>
                      <div>
                        {/* Header */}
                        <div className="flex items-center" style={{ gap: '12px', marginBottom: '16px' }}>
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '18px',
                            background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Dumbbell style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>Cluster Set</div>
                            <div style={{ fontSize: '14px', color: '#6B7280' }}>Multiple mini-sets with short rest</div>
                          </div>
                        </div>

                        {/* Summary Info */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="rounded-xl p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                            <div className={`text-xs ${theme.textSecondary} mb-1`}>Clusters</div>
                            <div className={`text-lg font-bold ${theme.text}`}>
                              {Number(currentExercise?.meta?.clusters_per_set) || Number(currentExercise?.clusters_per_set) || 1}
                            </div>
                          </div>
                          <div className="rounded-xl p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
                            <div className={`text-xs ${theme.textSecondary} mb-1`}>Reps per Cluster</div>
                            <div className={`text-lg font-bold ${theme.text}`}>
                              {Number(currentExercise?.meta?.cluster_reps) || Number(currentExercise?.cluster_reps) || 1}
                            </div>
                          </div>
                          <div className="rounded-xl p-3 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-2 border-green-200 dark:border-green-700 relative">
                            <div className={`text-xs ${theme.textSecondary} mb-1`}>Rest (s)</div>
                            <div className={`text-lg font-bold ${theme.text}`}>
                              {Number(currentExercise?.meta?.intra_cluster_rest) || Number(currentExercise?.intra_cluster_rest) || 0}
                            </div>
                          </div>
                        </div>

                        {/* Exercise Info */}
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-400 to-pink-500">
                            <Dumbbell className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`font-bold ${theme.text} text-lg`}>
                                {currentExercise.exercise?.name || 'Exercise'}
                              </div>
                              {/* Utility Icon Buttons */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPlateCalculator(true)}
                                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowExerciseAlternatives(true)}
                                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {(currentExercise?.reps || currentExercise?.meta?.cluster_reps) && (
                                <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                  <span className={`text-sm font-bold ${theme.text}`}>
                                    {currentExercise?.reps || currentExercise?.meta?.cluster_reps} reps
                                  </span>
                                </div>
                              )}
                              {(currentExercise?.rir || currentExercise?.rir === 0) && (
                                <div className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700">
                                  <span className={`text-xs font-semibold ${theme.text}`}>RIR: {currentExercise.rir}</span>
                                </div>
                              )}
                              {currentExercise?.tempo && (
                                <div className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700">
                                  <span className={`text-xs font-semibold ${theme.text}`}>Tempo: {currentExercise.tempo}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {currentExercise.exercise?.video_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openVideoModal(currentExercise.exercise?.video_url || '')}
                              className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Youtube className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {/* Cluster Logging Fields */}
                        <div className="space-y-3">
                          <div className={`text-sm font-semibold ${theme.text} mb-2`}>Log Performance</div>
                          {clusterWeights.map((w, idx) => (
                            <div key={idx} className="rounded-xl p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border-2 border-blue-200 dark:border-blue-700">
                              <div className="flex items-center justify-between mb-2">
                                <div className={`text-sm font-bold ${theme.text}`}>Cluster {idx + 1}</div>
                                <div className={`text-xs ${theme.textSecondary}`}>
                                  Reps: {Number(currentExercise?.meta?.cluster_reps) || Number(currentExercise?.cluster_reps) || 1}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={`block text-xs font-medium ${theme.text} mb-1`}>Weight (kg)</label>
                                  <input
                                    type="number"
                                    value={w}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      setClusterWeights(prev => {
                                        const copy = [...prev]
                                        copy[idx] = val
                                        // autofill subsequent clusters if editing first cluster
                                        if (idx === 0 && val) {
                                          for (let i = 1; i < copy.length; i++) {
                                            copy[i] = val
                                          }
                                        }
                                        // clear subsequent clusters if first cluster is cleared
                                        else if (idx === 0 && !val) {
                                          for (let i = 1; i < copy.length; i++) {
                                            copy[i] = ''
                                          }
                                        }
                                        return copy
                                      })
                                    }}
                                    className={`w-full h-10 text-center text-sm rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                    step="0.5"
                                    placeholder={idx === 0 ? 'Enter weight' : 'Auto-filled'}
                                    readOnly={idx > 0}
                                  />
                                </div>
                                <div>
                                  <label className={`block text-xs font-medium ${theme.text} mb-1`}>Reps</label>
                                  <input
                                    type="number"
                                    value={Number(currentExercise?.meta?.cluster_reps) || Number(currentExercise?.cluster_reps) || 1}
                                    readOnly
                                    className={`w-full h-10 text-center text-sm rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-slate-100 dark:bg-slate-700 ${theme.text} font-semibold`}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Timer Button */}
                        <div className="flex justify-center mt-6 mb-4">
                          <Button
                            onClick={() => setShowClusterTimer(true)}
                            className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Start Rest Timer
                          </Button>
                        </div>

                        {/* Previous Performance Card */}
                        <div className="mt-4">
                          <PreviousPerformanceCard />
                        </div>

                        {/* Log Button */}
                        <div className="mt-4">
                          <Button
                            onClick={() => {
                              // TODO: Implement cluster set completion logic
                              console.log('Logging cluster set:', clusterWeights)
                            }}
                            className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
                            disabled={clusterWeights.some(w => !w || w === '0')}
                          >
                            <Check className="w-5 h-5 mr-2" /> Log Cluster Set
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rest-Pause Flow */}
                  {currentType === 'rest_pause' && (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      border: '2px solid #4CAF50'
                    }}>
                      <div>
                        {/* Header */}
                        <div className="flex items-center" style={{ gap: '12px', marginBottom: '16px' }}>
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '18px',
                            background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Dumbbell style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>Rest Pause Set</div>
                            <div style={{ fontSize: '14px', color: '#6B7280' }}>Main set + mini-sets with rest periods</div>
                          </div>
                        </div>

                        {/* Summary Info */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="rounded-xl p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
                            <div className={`text-xs ${theme.textSecondary} mb-1`}>Main Set</div>
                            <div className={`text-lg font-bold ${theme.text}`}>1</div>
                          </div>
                          <div className="rounded-xl p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                            <div className={`text-xs ${theme.textSecondary} mb-1`}>Mini-sets</div>
                            <div className={`text-lg font-bold ${theme.text}`}>{restPauseExtraReps.length}</div>
                          </div>
                          <div className="rounded-xl p-3 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-2 border-green-200 dark:border-green-700">
                            <div className={`text-xs ${theme.textSecondary} mb-1`}>Rest (s)</div>
                            <div className={`text-lg font-bold ${theme.text}`}>
                              {Number(currentExercise?.meta?.rest_pause_duration) || Number(currentExercise?.rest_pause_duration) || 0}
                            </div>
                          </div>
                        </div>

                        {/* Exercise Info */}
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-teal-400 to-cyan-500">
                            <Dumbbell className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`font-bold ${theme.text} text-lg`}>
                                {currentExercise.exercise?.name || 'Exercise'}
                              </div>
                              {/* Utility Icon Buttons */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPlateCalculator(true)}
                                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowExerciseAlternatives(true)}
                                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {(currentExercise?.reps || currentExercise?.meta?.rest_pause_reps) && (
                                <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                  <span className={`text-sm font-bold ${theme.text}`}>
                                    {currentExercise?.reps || currentExercise?.meta?.rest_pause_reps} reps
                                  </span>
                                </div>
                              )}
                              {(currentExercise?.rir || currentExercise?.rir === 0) && (
                                <div className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700">
                                  <span className={`text-xs font-semibold ${theme.text}`}>RIR: {currentExercise.rir}</span>
                                </div>
                              )}
                              {currentExercise?.tempo && (
                                <div className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700">
                                  <span className={`text-xs font-semibold ${theme.text}`}>Tempo: {currentExercise.tempo}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {currentExercise.exercise?.video_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openVideoModal(currentExercise.exercise?.video_url || '')}
                              className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Youtube className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {/* Main Set Logging */}
                        <div className="space-y-3 mb-4">
                          <div className={`text-sm font-semibold ${theme.text} mb-2`}>Main Set</div>
                          <div className="rounded-xl p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border-2 border-blue-200 dark:border-blue-700">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className={`block text-sm font-medium ${theme.text} mb-1`}>Weight (kg)</label>
                                <input
                                  type="number"
                                  value={currentSetData.weight === 0 ? '' : currentSetData.weight}
                                  onChange={(e) => setCurrentSetData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                                  className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                  step="0.5"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className={`block text-sm font-medium ${theme.text} mb-1`}>Reps</label>
                                <input
                                  type="number"
                                  value={currentSetData.reps === 0 ? '' : currentSetData.reps}
                                  onChange={(e) => setCurrentSetData(prev => ({ ...prev, reps: parseInt(e.target.value) || 0 }))}
                                  className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mini-sets Logging */}
                        {restPauseExtraReps.length > 0 && (
                          <div className="space-y-3 mb-4">
                            <div className={`text-sm font-semibold ${theme.text} mb-2`}>Mini-sets</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {restPauseExtraReps.map((r, idx) => (
                                <div key={idx} className="rounded-xl p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border-2 border-blue-200 dark:border-blue-700">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className={`text-sm font-bold ${theme.text}`}>Mini-set {idx + 1}</div>
                                    <div className={`text-sm font-bold ${theme.text}`}>
                                      {currentSetData.weight || 0}kg
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className={`block text-xs font-medium ${theme.text} mb-1`}>Reps</label>
                                      <input
                                        type="number"
                                        value={r}
                                        onChange={(e) => setRestPauseExtraReps(prev => prev.map((x, i) => i === idx ? e.target.value : x))}
                                        className={`w-full h-10 text-center text-sm rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                        placeholder="0"
                                      />
                                    </div>
                                    <div>
                                      <label className={`block text-xs font-medium ${theme.text} mb-1`}>Rest (s)</label>
                                      <input
                                        type="number"
                                        value={Number(currentExercise?.meta?.rest_pause_duration) || Number(currentExercise?.rest_pause_duration) || 0}
                                        readOnly
                                        className={`w-full h-10 text-center text-sm rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-slate-100 dark:bg-slate-700 ${theme.text} font-semibold`}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Previous Performance Card */}
                        <div className="mt-4">
                          <PreviousPerformanceCard />
                        </div>

                        {/* Log Button */}
                        <div className="mt-4">
                          <Button
                            onClick={() => {
                              // TODO: Implement rest pause completion logic
                              console.log('Logging rest pause set:', { mainSet: currentSetData, miniSets: restPauseExtraReps })
                            }}
                            className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
                            disabled={currentSetData.weight <= 0 || currentSetData.reps <= 0}
                          >
                            <Check className="w-5 h-5 mr-2" /> Log Rest Pause Set
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* For Time Flow */}
                  {currentType === 'for_time' && (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      border: '2px solid #FFD54F'
                    }}>
                      <div>
                      {!forTimeActive && forTimeCompletionSecs == null ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Exercise Details Header */}
                          <div className="flex items-center" style={{ gap: '12px' }}>
                            <div style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '18px',
                              background: 'linear-gradient(135deg, #FFD54F 0%, #FFE082 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Trophy style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>For Time Details</div>
                              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                                Complete target reps as fast as possible
                              </div>
                            </div>
                          </div>

                          {/* Summary Info */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-700">
                              <div className={`text-sm ${theme.textSecondary} mb-1`}>Time Cap</div>
                              <div className={`text-2xl font-bold ${theme.text}`}>
                                {currentExercise?.meta?.time_cap || currentExercise?.time_cap || 10} min
                              </div>
                            </div>
                            <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                              <div className={`text-sm ${theme.textSecondary} mb-1`}>Target Reps</div>
                              <div className={`text-2xl font-bold ${theme.text}`}>
                                {currentExercise?.meta?.target_reps || currentExercise?.target_reps || currentExercise?.reps || '-'}
                              </div>
                            </div>
                          </div>

                          {/* Start Button */}
                          <Button
                            onClick={() => {
                              const capMin = Number(currentExercise?.meta?.time_cap) || Number(currentExercise?.time_cap) || 10
                              setForTimeTimeLeft(capMin * 60)
                              setForTimeCompletionSecs(null)
                              setForTimeActive(true)
                            }}
                            className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
                          >
                            <Clock className="w-5 h-5 mr-2" /> Start For Time
                          </Button>
                        </div>
                      ) : forTimeActive ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="text-5xl font-bold text-amber-700 dark:text-amber-300">
                            {Math.floor(forTimeTimeLeft / 60).toString().padStart(2, '0')}:{(forTimeTimeLeft % 60).toString().padStart(2, '0')}
                          </div>
                          <div className="mt-2 text-slate-600 dark:text-slate-300">Time Remaining</div>
                          <Button
                            onClick={() => {
                              const capMin = Number(currentExercise?.meta?.time_cap) || Number(currentExercise?.time_cap) || 10
                              const elapsed = capMin * 60 - forTimeTimeLeft
                              setForTimeCompletionSecs(elapsed)
                              setForTimeActive(false)
                            }}
                            variant="outline"
                            className="mt-4"
                          >
                            I hit target reps
                          </Button>
                        </div>
                      ) : (
                        <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="text-sm text-slate-700 dark:text-slate-200">
                            Completion time recorded: {forTimeCompletionSecs}s
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  )}

                  {/* Superset / Pre-Exhaustion Flow */}
                  {(currentType === 'superset' || currentType === 'pre_exhaustion') && (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      border: '2px solid #F5576C'
                    }}>
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                          <div className="flex items-center" style={{ gap: '12px' }}>
                            <div style={{
                              fontSize: '20px',
                              fontWeight: '700',
                              color: '#1A1A1A'
                            }}>
                              {currentType === 'superset' ? 'Superset' : 'Pre-Exhaustion'}
                            </div>
                            {(currentExercise?.rest_seconds || currentExercise?.meta?.rest_seconds) && (
                              <div className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700">
                                <span className={`text-xs font-semibold ${theme.text}`}>Rest: {currentExercise?.rest_seconds || currentExercise?.meta?.rest_seconds}s</span>
                              </div>
                            )}
                          </div>
                          <div className={`text-xs ${theme.textSecondary}`}>Set {currentSet} of {currentExercise?.sets || 1}</div>
                        </div>

                        {/* Exercise Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Exercise A */}
                          <div className="rounded-2xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-xl">
                            <div className={`p-4 ${theme.card} bg-white/95 dark:bg-slate-800/95 rounded-2xl space-y-3`}>
                              {/* Exercise Header */}
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-400 to-indigo-500">
                                  <span className="text-white font-bold text-sm">1</span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className={`font-bold ${theme.text} text-base`}>
                                      {currentExercise?.exercise?.name || 'First Exercise'}
                                    </div>
                                    {/* Utility Icon Buttons */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowPlateCalculator(true)}
                                      className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                      <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowExerciseAlternatives(true)}
                                      className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    </Button>
                                  </div>
                                </div>
                                {currentExercise?.exercise?.video_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openVideoModal(currentExercise.exercise?.video_url || '')}
                                    className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Youtube className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>

                              {/* Exercise Details */}
                              <div className="flex flex-wrap gap-2">
                                {(currentExercise?.meta?.superset_reps_a || currentExercise?.reps) && (
                                  <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                    <span className={`text-sm font-bold ${theme.text}`}>{currentExercise?.meta?.superset_reps_a || currentExercise?.reps} reps</span>
                                  </div>
                                )}
                                {(currentExercise?.rir || currentExercise?.rir === 0) && (
                                  <div className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700">
                                    <span className={`text-xs font-semibold ${theme.text}`}>RIR: {currentExercise.rir}</span>
                                  </div>
                                )}
                                {currentExercise?.tempo && (
                                  <div className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700">
                                    <span className={`text-xs font-semibold ${theme.text}`}>Tempo: {currentExercise.tempo}</span>
                                  </div>
                                )}
                              </div>

                              {/* Logging Fields */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={`block text-sm font-medium ${theme.text} mb-1`}>Weight (kg)</label>
                                  <input 
                                    type="number" 
                                    value={supersetAWeight} 
                                    onChange={(e) => setSupersetAWeight(e.target.value)} 
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                    step="0.5"
                            placeholder="0"
                          />
                                </div>
                                <div>
                                  <label className={`block text-sm font-medium ${theme.text} mb-1`}>Reps</label>
                                  <input 
                                    type="number" 
                                    value={supersetAReps} 
                                    onChange={(e) => setSupersetAReps(e.target.value)} 
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                        </div>
                      </div>

                          {/* Exercise B */}
                          <div className="rounded-2xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-xl">
                            <div className={`p-4 ${theme.card} bg-white/95 dark:bg-slate-800/95 rounded-2xl space-y-3`}>
                              {/* Exercise Header */}
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-400 to-indigo-500">
                                  <span className="text-white font-bold text-sm">2</span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className={`font-bold ${theme.text} text-base`}>
                                      {(() => {
                                        const exerciseId = currentExercise?.meta?.superset_exercise_id || currentExercise?.superset_exercise_id
                                        const exerciseInfo = exerciseId ? exerciseLookup[exerciseId] : undefined
                                        return exerciseInfo?.name || 'Second Exercise'
                                      })()}
                                    </div>
                                    {/* Utility Icon Buttons */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowPlateCalculator(true)}
                                      className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                      <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowExerciseAlternatives(true)}
                                      className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    </Button>
                                  </div>
                                </div>
                                {(() => {
                                  const exerciseId = currentExercise?.meta?.superset_exercise_id || currentExercise?.superset_exercise_id
                                  const exerciseInfo = exerciseId ? exerciseLookup[exerciseId] : undefined
                                  const video = exerciseInfo?.video_url
                                  return video && (
                      <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openVideoModal(video)}
                                      className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <Youtube className="w-4 h-4" />
                      </Button>
                                  )
                                })()}
                              </div>

                              {/* Exercise Details */}
                              <div className="flex flex-wrap gap-2">
                                {(currentExercise?.meta?.superset_reps_b || currentExercise?.meta?.superset_reps || currentExercise?.superset_reps || currentExercise?.reps) && (
                                  <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                    <span className={`text-sm font-bold ${theme.text}`}>
                                      {currentExercise?.meta?.superset_reps_b || currentExercise?.meta?.superset_reps || currentExercise?.superset_reps || currentExercise?.reps} reps
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Logging Fields */}
                              <div className="grid grid-cols-2 gap-3">
                            <div>
                                  <label className={`block text-sm font-medium ${theme.text} mb-1`}>Weight (kg)</label>
                                  <input 
                                    type="number" 
                                    value={supersetBWeight} 
                                    onChange={(e) => setSupersetBWeight(e.target.value)} 
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                    step="0.5"
                                    placeholder="0"
                                  />
                            </div>
                                <div>
                                  <label className={`block text-sm font-medium ${theme.text} mb-1`}>Reps</label>
                                  <input 
                                    type="number" 
                                    value={supersetBReps} 
                                    onChange={(e) => setSupersetBReps(e.target.value)} 
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Previous Performance Card */}
                        <div style={{ marginTop: '24px' }}>
                          <PreviousPerformanceCard />
                        </div>

                        {/* Log Button */}
                        <Button
                          onClick={completeSuperset}
                          style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                            color: '#FFFFFF',
                            borderRadius: '20px',
                            padding: '16px 32px',
                            fontSize: '16px',
                            fontWeight: '600',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            border: 'none',
                            cursor: isLoggingSet ? 'not-allowed' : 'pointer',
                            opacity: isLoggingSet ? 0.5 : 1,
                            marginTop: '24px'
                          }}
                          disabled={isLoggingSet}
                        >
                          <Check className="w-5 h-5 mr-2" /> Log {currentType === 'superset' ? 'Superset' : 'Pre-Exhaustion'}
                        </Button>
                          </div>
                        </div>
                      )}

                  {/* Giant Set Flow */}
                  {currentType === 'giant_set' && (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      border: '2px solid #6C5CE7',
                      position: 'relative',
                      zIndex: 20
                    }}>
                      <div>
                        <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                            <div className={`text-base sm:text-xl font-bold ${theme.text}`}>Giant Set</div>
                          <div className={`text-xs ${theme.textSecondary}`}>Set {currentSet} of {currentExercise?.sets || 1}</div>
                    </div>
                        {((currentExercise?.meta?.giant_set_exercises || currentExercise?.giant_set_exercises || []) as any[]).map((item: any, idx: number) => {
                          const resolved = item.exercise_id ? exerciseLookup[item.exercise_id] : undefined
                          const displayName = resolved?.name || item.name || `Exercise ${idx + 1}`
                          const video = resolved?.video_url || item.video_url
                          return (
                          <div
                            key={idx}
                            className="rounded-2xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-xl"
                          >
                            <div className={`p-4 ${theme.card} bg-white/95 dark:bg-slate-800/95 rounded-2xl space-y-3`}> 
                            {/* Header: name + video + number badge */}
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-orange-400 to-red-500">
                                <span className="text-white font-bold text-sm">{idx + 1}</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{displayName}</div>
                                  {/* Utility Icon Buttons */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowPlateCalculator(true)}
                                    className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowExerciseAlternatives(true)}
                                    className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  </Button>
                                </div>
                              </div>
                              {video && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openVideoModal(video)}
                                  className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Youtube className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            
                            {/* Exercise Details - Reps */}
                            {item.reps && (
                              <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                <span className={`text-sm font-bold ${theme.text}`}>{item.reps} reps</span>
                              </div>
                            )}
                            
                            {/* Input Fields */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className={`block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1`}>Weight (kg)</label>
                                <input
                                  type="number"
                                  value={giantWeights[idx] || ''}
                                  onChange={(e) => setGiantWeights(prev => prev.map((w, i) => i === idx ? e.target.value : w))}
                                  className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-indigo-700 bg-white/90 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500 dark:focus:border-indigo-500`}
                                  step="0.5"
                                />
                              </div>
                              <div>
                                <label className={`block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1`}>Reps</label>
                                <input
                                  type="number"
                                  value={giantReps[idx] || ''}
                                  readOnly
                                  className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-indigo-700 bg-white/80 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold`}
                                />
                              </div>
                            </div>
                            </div>
                          </div>
                          )
                        })}

                        {/* Previous Performance Card */}
                        <div style={{ marginTop: '24px' }}>
                          <PreviousPerformanceCard />
                        </div>

                        <Button
                          onClick={completeGiantSet}
                          style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                            color: '#FFFFFF',
                            borderRadius: '20px',
                            padding: '16px 32px',
                            fontSize: '16px',
                            fontWeight: '600',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            border: 'none',
                            cursor: isLoggingSet ? 'not-allowed' : 'pointer',
                            opacity: isLoggingSet ? 0.5 : 1,
                            marginTop: '24px'
                          }}
                          disabled={isLoggingSet}
                        >
                          Log Giant Set
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* Standard Exercise Types - Modern Style */}
                {currentType !== 'giant_set' && currentType !== 'circuit' && currentType !== 'tabata' && currentType !== 'amrap' && currentType !== 'emom' && currentType !== 'for_time' && currentType !== 'superset' && currentType !== 'pre_exhaustion' && currentType !== 'cluster_set' && currentType !== 'rest_pause' && (
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '2px solid #2196F3'
                  }}>
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                        <div className="flex items-center gap-3">
                          <div className={`text-base sm:text-xl font-bold ${theme.text}`}>
                            {currentType === 'straight_set' ? 'Straight Set' : 
                             currentType === 'drop_set' ? 'Drop Set' :
                             currentType === 'cluster_set' ? 'Cluster Set' :
                             currentType === 'rest_pause' ? 'Rest Pause' :
                             'Exercise'}
                          </div>
                          {currentExercise?.rest_seconds && (
                            <div className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700">
                              <span className={`text-xs font-semibold ${theme.text}`}>Rest: {currentExercise.rest_seconds}s</span>
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700">
                          <span className={`text-sm font-bold ${theme.text}`}>Set {currentSet} of {currentExercise?.sets || 1}</span>
                        </div>
                      </div>

                      {/* Exercise Name and Actions */}
                      <div className="flex items-start" style={{ gap: '12px', marginBottom: '16px' }}>
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '18px',
                            background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Dumbbell style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div style={{ 
                                fontSize: '20px',
                                fontWeight: '700',
                                color: '#1A1A1A'
                              }}>
                                {currentExercise.exercise?.name || 'Exercise'}
                              </div>
                              {/* Utility Icon Buttons */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPlateCalculator(true)}
                                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowExerciseAlternatives(true)}
                                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap" style={{ gap: '8px' }}>
                              {targetReps && (
                                <div style={{
                                  backgroundColor: '#EDE7F6',
                                  borderRadius: '12px',
                                  padding: '6px 12px',
                                  display: 'inline-block'
                                }}>
                                  <span style={{ 
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#6C5CE7'
                                  }}>{targetReps} reps</span>
                                </div>
                              )}
                              {(currentExercise?.rir || currentExercise?.rir === 0) && (
                                <div style={{
                                  backgroundColor: '#FFE0B2',
                                  borderRadius: '12px',
                                  padding: '6px 12px',
                                  display: 'inline-block'
                                }}>
                                  <span style={{ 
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#F5576C'
                                  }}>RIR: {currentExercise.rir}</span>
                                </div>
                              )}
                              {currentExercise?.tempo && (
                                <div style={{
                                  backgroundColor: '#E3F2FD',
                                  borderRadius: '12px',
                                  padding: '6px 12px',
                                  display: 'inline-block'
                                }}>
                                  <span style={{ 
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#2196F3'
                                  }}>Tempo: {currentExercise.tempo}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {currentExercise.exercise?.video_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openVideoModal(currentExercise.exercise?.video_url || '')}
                              className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Youtube className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {/* Logging Fields */}
                        <div className="grid grid-cols-2" style={{ gap: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#6B7280',
                              marginBottom: '8px'
                            }}>
                              {currentType === 'drop_set' ? 'Working Weight (kg)' : 'Weight (kg)'}
                            </label>
                            <input
                              type="number"
                              value={currentSetData.weight === 0 ? '' : currentSetData.weight}
                              onChange={(e) => setCurrentSetData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                              style={{
                                width: '100%',
                                height: '56px',
                                textAlign: 'center',
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#1A1A1A',
                                backgroundColor: '#FFFFFF',
                                border: '2px solid #2196F3',
                                borderRadius: '16px',
                                outline: 'none'
                              }}
                              step="0.5"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#6B7280',
                              marginBottom: '8px'
                            }}>
                              Reps
                            </label>
                            <input
                              type="number"
                              value={currentSetData.reps === 0 ? '' : currentSetData.reps}
                              onChange={(e) => setCurrentSetData(prev => ({ ...prev, reps: parseInt(e.target.value) || 0 }))}
                              style={{
                                width: '100%',
                                height: '56px',
                                textAlign: 'center',
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#1A1A1A',
                                backgroundColor: '#FFFFFF',
                                border: '2px solid #2196F3',
                                borderRadius: '16px',
                                outline: 'none'
                              }}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Drop Set - Second Set Fields */}
                        {currentType === 'drop_set' && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                              <Calculator className="w-3 h-3 text-orange-500" />
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Drop Set (Second Set)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-slate-500 dark:text-slate-500 mb-1">Drop Weight (kg)</label>
                                <input
                                  type="number"
                                  value={dropWeight === '' ? '' : dropWeight}
                                  onChange={(e) => setDropWeight(e.target.value)}
                                  className="w-full h-8 text-center text-sm rounded-lg border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-slate-700 dark:text-slate-300"
                                  step="0.5"
                                  placeholder={currentSetData.weight > 0 ? 
                                    (currentSetData.weight * (1 - (Number(currentExercise?.meta?.drop_percentage) || Number(currentExercise?.drop_percentage) || 0) / 100)).toFixed(1) : 
                                    'Auto'
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 dark:text-slate-500 mb-1">Reps</label>
                                <input
                                  type="number"
                                  value={dropReps === 0 ? '' : dropReps}
                                  onChange={(e) => setDropReps(parseInt(e.target.value) || 0)}
                                  className="w-full h-8 text-center text-sm rounded-lg border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-slate-700 dark:text-slate-300"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Previous Performance Card */}
                      <div style={{ marginTop: '24px' }}>
                        <PreviousPerformanceCard />
                      </div>

                      {/* Log Button */}
                      <Button
                        onClick={completeSet}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                          color: '#FFFFFF',
                          borderRadius: '20px',
                          padding: '16px 32px',
                          fontSize: '16px',
                          fontWeight: '600',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                          border: 'none',
                          cursor: currentSetData.weight <= 0 || currentSetData.reps <= 0 || isLoggingSet ? 'not-allowed' : 'pointer',
                          opacity: currentSetData.weight <= 0 || currentSetData.reps <= 0 || isLoggingSet ? 0.5 : 1,
                          marginTop: '24px'
                        }}
                        disabled={currentSetData.weight <= 0 || currentSetData.reps <= 0 || isLoggingSet}
                      >
                        <Check className="w-5 h-5 mr-2" /> Log Set
                      </Button>
                    </div>
                  </div>
                )}


                {/* Simple Navigation */}
                {exercises.length > 1 && (
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
                      disabled={currentExerciseIndex === 0}
                      className="flex-1 mr-2"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    
                    <div className="text-center px-4">
                      <div className="text-sm text-slate-600 dark:text-slate-300">Exercise</div>
                      <div className="text-lg font-bold">{currentExerciseIndex + 1} / {exercises.length}</div>
                    </div>
                    
                    <Button
                      variant="outline"
                      onClick={() => setCurrentExerciseIndex(Math.min(exercises.length - 1, currentExerciseIndex + 1))}
                      disabled={currentExerciseIndex === exercises.length - 1}
                      className="flex-1 ml-2"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Card className={`${theme.card} border ${theme.border} rounded-3xl overflow-hidden`}>
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className={`text-2xl font-bold ${theme.text} mb-3`}>No exercises found</h3>
                  <p className={`${theme.textSecondary} mb-6`}>This workout doesn&apos;t have any exercises assigned.</p>
                  <Button 
                    onClick={() => router.push('/client/workouts')}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Workouts
                  </Button>
                </CardContent>
              </Card>
            )
            )}
            )
        </div>
      </div>


      {/* Full-Screen Timer Modal for Tabata/Circuit */}
      {showTimerModal && (currentType === 'tabata' || currentType === 'circuit') && (
        <div className={`fixed inset-0 z-[9999] transition-colors duration-500 ${
          intervalPhase === 'work' ? 'bg-red-900/95' : 
          intervalPhase === 'rest_after_set' ? 'bg-purple-900/95' : 'bg-blue-900/95'
        }`}>
          <div className="h-full flex flex-col items-center justify-center p-4">
            {/* Segment Counter */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-2">
                <span className="text-white font-semibold text-lg">
                  {(() => {
                    const circuitSets = currentExercise?.meta?.circuit_sets || []
                    
                    // Calculate segments per round
                    let segmentsPerRound = 0
                    circuitSets.forEach(set => {
                      const exercisesInSet = set?.exercises?.length || 0
                      // Each exercise has: work + rest
                      segmentsPerRound += exercisesInSet * 2
                      // Each set (except the last one) has: rest_after_set
                      // Actually, every set except the last set of the last round has rest_after_set
                      // For counting purposes, we'll add it for all sets and subtract later if needed
                    })
                    // Add rest_after_set for each set
                    segmentsPerRound += circuitSets.length
                    
                    const totalSegments = segmentsPerRound * intervalTotalRounds - 1 // -1 because last set of last round has no rest_after_set
                    
                    // Calculate current segment
                    let currentSegment = intervalRound * segmentsPerRound
                    
                    // Add segments from completed sets in current round
                    for (let s = 0; s < timerSetIndex; s++) {
                      const exercisesInSet = circuitSets[s]?.exercises?.length || 0
                      currentSegment += exercisesInSet * 2 + 1 // work + rest per exercise + rest_after_set
                    }
                    
                    // Add segments from current set
                    const currentSet = circuitSets[timerSetIndex]
                    const exercisesBeforeCurrent = timerExerciseIndex
                    currentSegment += exercisesBeforeCurrent * 2 // work + rest for each completed exercise
                    
                    // Add current phase
                    if (intervalPhase === 'work') {
                      currentSegment += 1
                    } else if (intervalPhase === 'rest') {
                      currentSegment += 2
                    } else if (intervalPhase === 'rest_after_set') {
                      const exercisesInCurrentSet = currentSet?.exercises?.length || 0
                      currentSegment += exercisesInCurrentSet * 2 + 1
                    }
                    
                    return `${currentSegment} / ${totalSegments}`
                  })()}
                </span>
              </div>
            </div>

            {/* Main Timer Display */}
            <div className="text-center flex-1 flex flex-col justify-center items-center">
              {/* Current Exercise Info */}
              {currentExercise?.meta?.circuit_sets && 
               currentExercise.meta.circuit_sets[timerSetIndex]?.exercises && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-6 max-w-md mb-12">
                  <div className="text-2xl font-bold text-white mb-2">
                    {(() => {
                      const currentExerciseInSet = currentExercise.meta.circuit_sets[timerSetIndex]?.exercises?.[timerExerciseIndex]
                      return exerciseLookup[currentExerciseInSet?.exercise_id]?.name || 'Exercise'
                    })()}
                  </div>
                  {intervalPhase === 'work' && (
                    <div className="text-lg text-gray-200">
                      {currentExercise.meta.circuit_sets[timerSetIndex]?.exercises?.[timerExerciseIndex]?.work_seconds ? 
                        `${currentExercise.meta.circuit_sets[timerSetIndex].exercises[timerExerciseIndex].work_seconds}s work` :
                        currentExercise.meta.circuit_sets[timerSetIndex]?.exercises?.[timerExerciseIndex]?.target_reps ?
                        `${currentExercise.meta.circuit_sets[timerSetIndex].exercises[timerExerciseIndex].target_reps} reps` :
                        'Work phase'
                      }
                    </div>
                  )}
                </div>
              )}

              {/* Phase Indicator */}
              <div className={`mb-8 px-8 py-4 rounded-2xl ${
                intervalPhase === 'work' 
                  ? 'bg-red-600/30 border-2 border-red-400' 
                  : intervalPhase === 'rest_after_set'
                  ? 'bg-purple-600/30 border-2 border-purple-400'
                  : 'bg-blue-600/30 border-2 border-blue-400'
              }`}>
                <div className="text-4xl sm:text-5xl font-black text-white">
                  {intervalPhase === 'work' ? 'WORK' : 
                   intervalPhase === 'rest_after_set' ? 'REST AFTER SET' : 'REST'}
                </div>
              </div>

              {/* Large Timer */}
              <div className={`text-9xl sm:text-[12rem] font-black mb-8 ${
                intervalPhase === 'work' 
                  ? 'text-red-100' 
                  : 'text-blue-100'
              }`}>
                {Math.floor(intervalPhaseLeft / 60).toString().padStart(2, '0')}:
                {(intervalPhaseLeft % 60).toString().padStart(2, '0')}
              </div>

              {/* Next Exercise Preview */}
              {currentExercise?.meta?.circuit_sets && 
               currentExercise.meta.circuit_sets[timerSetIndex]?.exercises && (
                <div className="mb-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
                    <div className="text-sm text-gray-300 mb-1">Next:</div>
                    <div className="text-lg font-semibold text-white">
                      {timerExerciseIndex + 1 < currentExercise.meta.circuit_sets[timerSetIndex].exercises.length ? (
                        exerciseLookup[currentExercise.meta.circuit_sets[timerSetIndex].exercises[timerExerciseIndex + 1]?.exercise_id]?.name || 'Next Exercise'
                      ) : (
                        timerSetIndex + 1 < currentExercise.meta.circuit_sets.length ? 'Next Set' : 'Break'
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 items-center">
              {/* Previous Button */}
              <Button
                onClick={() => {
                  const circuitSets = currentExercise?.meta?.circuit_sets
                  
                  if (intervalPhase === 'work') {
                    // Work -> Previous Rest (or Previous Rest After Set)
                    if (timerExerciseIndex > 0) {
                      // Go to rest of previous exercise in same set
                      setTimerExerciseIndex(prev => prev - 1)
                      const currentSet = circuitSets?.[timerSetIndex]
                      const prevExercise = currentSet?.exercises?.[timerExerciseIndex - 1]
                      const restTime = prevExercise?.rest_after || 10
                      setIntervalPhase('rest')
                      setIntervalPhaseLeft(restTime)
                    } else if (timerSetIndex > 0) {
                      // First exercise in set - go to rest_after_set of previous set
                      setTimerSetIndex(prev => prev - 1)
                      const prevSet = circuitSets?.[timerSetIndex - 1]
                      const restAfterSetTime = Number(prevSet?.rest_between_sets) || 30
                      setIntervalPhase('rest_after_set')
                      setIntervalPhaseLeft(restAfterSetTime)
                    } else if (intervalRound > 0) {
                      // First exercise of first set - go to rest_after_set of last set of previous round
                      setIntervalRound(prev => prev - 1)
                      const lastSetIndex = circuitSets.length - 1
                      const lastSet = circuitSets?.[lastSetIndex]
                      const restAfterSetTime = Number(lastSet?.rest_between_sets) || 30
                      setTimerSetIndex(lastSetIndex)
                      setTimerExerciseIndex(0)
                      setIntervalPhase('rest_after_set')
                      setIntervalPhaseLeft(restAfterSetTime)
                    }
                  } else if (intervalPhase === 'rest') {
                    // Rest -> Work (same exercise)
                    const currentSet = circuitSets?.[timerSetIndex]
                    const currentExerciseInSet = currentSet?.exercises?.[timerExerciseIndex]
                    const workTime = currentExerciseInSet?.work_seconds || 20
                    setIntervalPhase('work')
                    setIntervalPhaseLeft(workTime)
                  } else if (intervalPhase === 'rest_after_set') {
                    // Rest After Set -> Rest (last exercise of current set)
                    const currentSet = circuitSets?.[timerSetIndex]
                    const lastExerciseIndex = (currentSet?.exercises?.length || 1) - 1
                    const lastExercise = currentSet?.exercises?.[lastExerciseIndex]
                    const restTime = lastExercise?.rest_after || 10
                    setTimerExerciseIndex(lastExerciseIndex)
                    setIntervalPhase('rest')
                    setIntervalPhaseLeft(restTime)
                  }
                }}
                variant="outline"
                size="sm"
                className="border-white/50 text-white hover:bg-white hover:text-black bg-white/10 backdrop-blur-sm"
                disabled={timerExerciseIndex === 0 && timerSetIndex === 0 && intervalRound === 0 && intervalPhase === 'work'}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              {/* Play/Pause Button */}
              <Button
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                variant="outline"
                size="lg"
                className="border-white/50 text-white hover:bg-white hover:text-black bg-white/10 backdrop-blur-sm px-8 py-3 text-lg"
              >
                {isTimerPaused ? (
                  <Play className="w-6 h-6" />
                ) : (
                  <div className="flex gap-1">
                    <div className="w-2 h-6 bg-white"></div>
                    <div className="w-2 h-6 bg-white"></div>
                  </div>
                )}
              </Button>

              {/* Next Button */}
              <Button
                onClick={() => {
                  const circuitSets = currentExercise?.meta?.circuit_sets
                  
                  if (intervalPhase === 'work') {
                    // Work -> Rest (same exercise)
                    const currentSet = circuitSets?.[timerSetIndex]
                    const currentExerciseInSet = currentSet?.exercises?.[timerExerciseIndex]
                    const restTime = currentExerciseInSet?.rest_after || 10
                    setIntervalPhase('rest')
                    setIntervalPhaseLeft(restTime)
                  } else if (intervalPhase === 'rest') {
                    // Rest -> Next Work (or Rest After Set)
                    const currentSet = circuitSets?.[timerSetIndex]
                    const isLastExerciseInSet = timerExerciseIndex === (currentSet?.exercises?.length || 1) - 1
                    
                    if (!isLastExerciseInSet) {
                      // More exercises in set - go to next exercise work
                      setTimerExerciseIndex(prev => prev + 1)
                      const nextExercise = currentSet?.exercises?.[timerExerciseIndex + 1]
                      const workTime = nextExercise?.work_seconds || 20
                      setIntervalPhase('work')
                      setIntervalPhaseLeft(workTime)
                    } else {
                      // Last exercise in set - check if we should show rest_after_set
                      const isLastSetInRound = timerSetIndex === circuitSets.length - 1
                      const nextRound = intervalRound + 1
                      const isLastRound = nextRound >= intervalTotalRounds
                      
                      if (!isLastSetInRound || !isLastRound) {
                        // Show rest after set
                        const restAfterSetTime = Number(currentSet?.rest_between_sets) || 30
                        setIntervalPhase('rest_after_set')
                        setIntervalPhaseLeft(restAfterSetTime)
                      } else {
                        // Last set of last round - workout complete
                        setIntervalActive(false)
                        setShowTimerModal(false)
                      }
                    }
                  } else if (intervalPhase === 'rest_after_set') {
                    // Rest After Set -> Work (first exercise of next set or next round)
                    const isLastSetInRound = timerSetIndex === circuitSets.length - 1
                    
                    if (isLastSetInRound) {
                      // Start next round
                      setIntervalRound(prev => prev + 1)
                      setTimerSetIndex(0)
                      setTimerExerciseIndex(0)
                      const firstSet = circuitSets?.[0]
                      const firstExercise = firstSet?.exercises?.[0]
                      const workTime = firstExercise?.work_seconds || 20
                      setIntervalPhase('work')
                      setIntervalPhaseLeft(workTime)
                    } else {
                      // Move to next set
                      setTimerSetIndex(prev => prev + 1)
                      setTimerExerciseIndex(0)
                      const nextSet = circuitSets?.[timerSetIndex + 1]
                      const firstExercise = nextSet?.exercises?.[0]
                      const workTime = firstExercise?.work_seconds || 20
                      setIntervalPhase('work')
                      setIntervalPhaseLeft(workTime)
                    }
                  }
                }}
                variant="outline"
                size="sm"
                className="border-white/50 text-white hover:bg-white hover:text-black bg-white/10 backdrop-blur-sm"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Button>

              {/* Stop Button */}
              <Button
                onClick={() => {
                  setShowTimerModal(false)
                  setIntervalActive(false)
                  setIsTimerPaused(false)
                }}
                variant="outline"
                className="px-6 py-3 text-lg border-red-400 text-red-100 hover:bg-red-600 hover:text-white bg-red-600/20 backdrop-blur-sm"
              >
                Stop
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-white/20">
            {/* Enhanced Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <Youtube className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Exercise Video</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeVideoModal}
                className="text-white hover:bg-white/20 rounded-2xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Enhanced Video Content */}
            <div className="p-6">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={getEmbedUrl(currentVideoUrl)}
                  title="Exercise Video"
                  className="absolute top-0 left-0 w-full h-full rounded-2xl"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Image Modal */}
      {showExerciseImage && currentExercise.exercise?.image_url && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Image className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">{currentExercise.exercise?.name}</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExerciseImage(false)}
                className="text-white hover:bg-white/20 rounded-2xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Image Content */}
            <div className="p-6">
              <div className="relative w-full">
                <img 
                  src={currentExercise.exercise.image_url} 
                  alt={currentExercise.exercise?.name}
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Alternatives Modal */}
      {showExerciseAlternatives && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-white/20">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Exercise Alternatives</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExerciseAlternatives(false)}
                className="text-white hover:bg-white/20 rounded-2xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Alternatives Content */}
            <div className="p-6">
              <div className="space-y-4">
                <p className="text-white/70 text-center mb-6">
                  Can&apos;t perform {currentExercise.exercise?.name}? Try these alternatives:
                </p>
                
                {/* Alternative Exercises */}
                <div className="space-y-3">
                  {[
                    { name: 'Modified Push-ups', difficulty: 'Easy', description: 'Knee push-ups or wall push-ups' },
                    { name: 'Dumbbell Press', difficulty: 'Medium', description: 'Using dumbbells instead of bodyweight' },
                    { name: 'Incline Push-ups', difficulty: 'Easy', description: 'Using a bench or elevated surface' }
                  ].map((alternative, index) => (
                    <div key={index} className="p-4 bg-white/10 rounded-2xl border border-white/20 hover:bg-white/20 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white">{alternative.name}</h4>
                          <p className="text-sm text-white/70">{alternative.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${
                            alternative.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                            alternative.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {alternative.difficulty}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/20 rounded-xl"
                          >
                            <Zap className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-500/20 rounded-2xl border border-blue-400/30">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-100 mb-1">Need Help?</p>
                      <p className="text-sm text-blue-200">Ask your coach for personalized alternatives or modifications.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plate Calculator Modal */}
      {showPlateCalculator && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden border-0 shadow-2xl">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Calculator className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Barbell Plate Calculator</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPlateCalculator(false)
                    setShowPlateResults(false)
                    setTargetWeight('')
                    setSelectedBarbell(20)
                  }}
                  className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {!showPlateResults ? (
                // Input Screen
                <div className="space-y-6">
                  {/* Barbell Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Select Barbell:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {barbellOptions.map((barbell) => (
                        <button
                          key={barbell.weight}
                          onClick={() => setSelectedBarbell(barbell.weight)}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            selectedBarbell === barbell.weight
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-lg font-bold text-slate-800 dark:text-white">
                              {barbell.weight}kg
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              {barbell.name}
                            </div>
                            <div className="text-xs mt-1">
                              {barbell.type === 'straight' ? '📏' : '🌀'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Weight Input */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Target Weight:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={targetWeight}
                        onChange={(e) => setTargetWeight(e.target.value)}
                        className="w-full p-4 text-2xl font-bold text-center border-2 border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none"
                        placeholder="142.5"
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">
                        kg
                      </div>
                    </div>
                  </div>

                  {/* Calculate Button */}
                  <button
                    onClick={() => {
                      const weight = Number(targetWeight)
                      if (weight > 0) {
                        setShowPlateResults(true)
                      }
                    }}
                    disabled={!targetWeight || Number(targetWeight) <= 0}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Calculate
                  </button>
                </div>
              ) : (
                // Results Screen
                <div className="space-y-6">
                  {(() => {
                    const result = calculatePlateLoading(Number(targetWeight), selectedBarbell)
                    const selectedBarbellInfo = barbellOptions.find(b => b.weight === selectedBarbell)
                    
                    if (result.option1.remainder > 0 || result.option2.remainder > 0) {
                      // Impossible weight - show closest options
                      return (
                        <div className="space-y-4">
                          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700">
                            <div className="text-red-800 dark:text-red-200 font-semibold">
                              Unable to load {targetWeight}kg exactly
                            </div>
                            <div className="text-red-600 dark:text-red-400 text-sm mt-1">
                              Here are the closest options:
                            </div>
                          </div>
                          
                          {/* Lighter option */}
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                            <div className="text-center space-y-3">
                              <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                                Option 1: {Number(targetWeight) - (result.option1.remainder * 2)}kg ({(result.option1.remainder * 2).toFixed(2)}kg lighter)
                              </div>
                              <div className="text-sm text-blue-700 dark:text-blue-200">
                                Load on each side:
                              </div>
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                {result.option1.plates.map((plate, index) => (
                                  <div key={index} className="flex items-center gap-1">
                                    <div className={`w-3 h-3 ${plate.color} rounded-full border ${plate.border} relative flex items-center justify-center`}>
                                      {/* Inner grey circle - smaller */}
                                      <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center">
                                        {/* Tiny black center */}
                                        <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                      </div>
                                    </div>
                                    <span className="text-sm">
                                      {plate.count} x {plate.weight}kg
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Heavier option */}
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700">
                            <div className="text-center space-y-3">
                              <div className="text-lg font-bold text-green-800 dark:text-green-200">
                                Option 2: {targetWeight + (result.option1.remainder * 2)}kg ({(result.option1.remainder * 2).toFixed(2)}kg heavier)
                              </div>
                              <div className="text-sm text-green-700 dark:text-green-200">
                                Load on each side:
                              </div>
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                {result.option1.plates.map((plate, index) => (
                                  <div key={index} className="flex items-center gap-1">
                                    <div className={`w-3 h-3 ${plate.color} rounded-full border ${plate.border} relative flex items-center justify-center`}>
                                      {/* Inner grey circle - smaller */}
                                      <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center">
                                        {/* Tiny black center */}
                                        <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                      </div>
                                    </div>
                                    <span className="text-sm">
                                      {plate.count} x {plate.weight}kg
                                    </span>
                                  </div>
                                ))}
                                {result.option1.remainder > 0 && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-gray-400 rounded-full border border-gray-600 relative flex items-center justify-center">
                                      {/* Inner grey circle */}
                                      <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center">
                                        {/* Tiny black center */}
                                        <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                      </div>
                                    </div>
                                    <span className="text-sm">
                                      1 x 1.25kg
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    
                    // Exact match - show 2 best loading options
                    return (
                      <div className="space-y-6">
                        {/* Total Weight Display */}
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                          <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                            Total: {targetWeight}kg
                          </div>
                          <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                            Using {selectedBarbell}kg {selectedBarbellInfo?.name} ({selectedBarbellInfo?.type === 'straight' ? '📏' : '🌀'})
                          </div>
                        </div>
                        
                        {/* Option 1 - Recommended */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                          <div className="text-center space-y-4">
                            <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                              Option 1 (Recommended):
                            </div>
                            
                            {/* Visual Barbell Display */}
                            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                              <div className="text-center text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Load on each side:
                              </div>
                              <div className="flex items-center justify-between">
                                {/* Left side plates */}
                                <div className="flex items-center space-x-1">
                                  {result.option1.plates.map((plate, index) => {
                                    const size = plate.weight >= 20 ? 'w-6 h-6' : plate.weight >= 10 ? 'w-5 h-5' : 'w-4 h-4'
                                    const innerSize = plate.weight >= 20 ? 'w-3 h-3' : plate.weight >= 10 ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'
                                    return Array.from({ length: plate.count }, (_, i) => (
                                      <div key={`left-${index}-${i}`} className="flex flex-col items-center">
                                        <div className={`${size} ${plate.color} rounded-full border-2 ${plate.border} relative flex items-center justify-center`}>
                                          {/* Inner grey circle - smaller */}
                                          <div className={`${innerSize} bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center`}>
                                            {/* Tiny black center */}
                                            <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                          </div>
                                        </div>
                                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                                          {plate.weight}
                                        </div>
                                      </div>
                                    ))
                                  }).flat()}
                                </div>
                                
                                {/* Barbell shaft - aligned with black dots */}
                                <div className="flex-1 h-0.5 bg-slate-400 dark:bg-slate-500 mx-3 rounded relative">
                                  {/* Align barbell with the center of plates (black dots) */}
                                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-400 dark:bg-slate-500 rounded"></div>
                                </div>
                                
                                {/* Right side plates */}
                                <div className="flex items-center space-x-1">
                                  {result.option1.plates.map((plate, index) => {
                                    const size = plate.weight >= 20 ? 'w-6 h-6' : plate.weight >= 10 ? 'w-5 h-5' : 'w-4 h-4'
                                    const innerSize = plate.weight >= 20 ? 'w-3 h-3' : plate.weight >= 10 ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'
                                    return Array.from({ length: plate.count }, (_, i) => (
                                      <div key={`right-${index}-${i}`} className="flex flex-col items-center">
                                        <div className={`${size} ${plate.color} rounded-full border-2 ${plate.border} relative flex items-center justify-center`}>
                                          {/* Inner grey circle - smaller */}
                                          <div className={`${innerSize} bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center`}>
                                            {/* Tiny black center */}
                                            <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                          </div>
                                        </div>
                                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                                          {plate.weight}
                                        </div>
                                      </div>
                                    ))
                                  }).flat()}
                                </div>
                              </div>
                            </div>
                            
                            {/* Simple Text Breakdown */}
                            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                              {result.option1.plates.map((plate, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  <div className={`w-3 h-3 ${plate.color} rounded-full border ${plate.border} relative flex items-center justify-center`}>
                                    {/* Inner grey circle - smaller */}
                                    <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center">
                                      {/* Tiny black center */}
                                      <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                    </div>
                                  </div>
                                  <span className="text-blue-700 dark:text-blue-200">
                                    {plate.count} x {plate.weight}kg
                                  </span>
                                  {index < result.option1.plates.length - 1 && (
                                    <span className="text-blue-600 dark:text-blue-300 mx-1">+</span>
                                  )}
                                </div>
                              ))}
                              <span className="text-blue-600 dark:text-blue-300 mx-1">= {targetWeight}kg</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Option 2 - Alternative */}
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
                          <div className="text-center space-y-3">
                            <div className="text-lg font-bold text-green-800 dark:text-green-200">
                              Option 2 (Alternative):
                            </div>
                            
                            {/* Simple Text Breakdown */}
                            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                              {result.option2.plates.map((plate, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  <div className={`w-3 h-3 ${plate.color} rounded-full border ${plate.border} relative flex items-center justify-center`}>
                                    {/* Inner grey circle - smaller */}
                                    <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center">
                                      {/* Tiny black center */}
                                      <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                    </div>
                                  </div>
                                  <span className="text-green-700 dark:text-green-200">
                                    {plate.count} x {plate.weight}kg
                                  </span>
                                  {index < result.option2.plates.length - 1 && (
                                    <span className="text-green-600 dark:text-green-300 mx-1">+</span>
                                  )}
                                </div>
                              ))}
                              <span className="text-green-600 dark:text-green-300 mx-1">= {targetWeight}kg</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                  
                  {/* Back Button */}
                  <button
                    onClick={() => setShowPlateResults(false)}
                    className="w-full py-3 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white font-medium rounded-xl hover:bg-slate-300 dark:hover:bg-slate-500 transition-all"
                  >
                    Calculate New Weight
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workout Completion Modal */}
      {showWorkoutCompletion && (
        <div style={{
          position: 'fixed',
          inset: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '448px',
            maxHeight: '90vh',
            overflow: 'hidden',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
          }}>
            <div style={{ padding: '32px', textAlign: 'center' }}>
              {/* Celebration Header */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}>
                  <Trophy style={{ width: '40px', height: '40px', color: '#FFFFFF' }} />
                </div>
                <h2 style={{
                  fontSize: '32px',
                  fontWeight: '800',
                  color: '#1A1A1A',
                  lineHeight: '1.2',
                  marginBottom: '8px'
                }}>
                  Workout Complete! 🎉
                </h2>
                <p style={{
                  fontSize: '16px',
                  fontWeight: '400',
                  color: '#6B7280'
                }}>
                  Amazing work! You crushed this workout!
                </p>
              </div>

              {/* Weight Lifted Highlight */}
              <div style={{
                padding: '24px',
                backgroundColor: '#FFE082',
                borderRadius: '24px',
                border: '2px solid #F5576C',
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '40px',
                  fontWeight: '800',
                  color: '#1A1A1A',
                  lineHeight: '1.1',
                  marginBottom: '8px'
                }}>
                  {workoutStats.totalWeightLifted.toLocaleString()} kg
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1A1A1A'
                }}>
                  Total Weight Lifted
                </div>
              </div>

              {/* Performance Stats */}
              <div style={{ marginBottom: '32px' }}>
                <div className="grid grid-cols-3" style={{ gap: '12px' }}>
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '16px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '2px solid #2196F3'
                  }}>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '800',
                      color: '#1A1A1A',
                      lineHeight: '1.1'
                    }}>
                      {workoutStats.totalTime}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '400',
                      color: '#6B7280'
                    }}>Minutes</div>
                  </div>
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '16px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '2px solid #6C5CE7'
                  }}>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '800',
                      color: '#1A1A1A',
                      lineHeight: '1.1'
                    }}>
                      {workoutStats.exercisesCompleted}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '400',
                      color: '#6B7280'
                    }}>Exercises</div>
                  </div>
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '16px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '2px solid #F5576C'
                  }}>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '800',
                      color: '#1A1A1A',
                      lineHeight: '1.1'
                    }}>
                      {workoutStats.totalSets}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '400',
                      color: '#6B7280'
                    }}>Total Sets</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Button
                  onClick={async () => {
                    await completeWorkout()
                    setShowWorkoutCompletion(false)
                    router.push('/client/workouts')
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: '#4CAF50',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: '600',
                    padding: '16px 32px',
                    borderRadius: '20px',
                    border: 'none',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Trophy style={{ width: '20px', height: '20px' }} />
                  View Progress
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWorkoutCompletion(false)
                    router.push('/client/workouts')
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: '#FFFFFF',
                    color: '#6C5CE7',
                    fontSize: '16px',
                    fontWeight: '600',
                    padding: '16px 32px',
                    borderRadius: '20px',
                    border: '2px solid #6C5CE7',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Back to Dashboard
                </Button>
              </div>

              {/* Motivational Message */}
              <div style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#FFE082',
                borderRadius: '24px',
                border: '2px solid #F5576C'
              }}>
                <p style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  textAlign: 'center'
                }}>
                  💪 Keep pushing! Every workout makes you stronger!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drop Set Calculator Modal */}
      {showDropSetCalculator && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden border-0 shadow-2xl">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <Calculator className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Drop Set Calculator</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDropSetCalculator(false)}
                  className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Working Weight Input */}
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Working Weight (kg):
                  </label>
                  <input
                    type="number"
                    value={currentSetData.weight === 0 ? '' : currentSetData.weight}
                    onChange={(e) => setCurrentSetData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                    className="w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                    step="0.5"
                    placeholder="Enter weight"
                  />
                </div>

                {/* Calculator Result */}
                <div className="rounded-xl p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Auto-calculated drop weight:
                    </span>
                  </div>
                  {currentSetData.weight > 0 ? (
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {(currentSetData.weight * (1 - (Number(currentExercise?.meta?.drop_percentage) || Number(currentExercise?.drop_percentage) || 0) / 100)).toFixed(1)}kg
                    </div>
                  ) : (
                    <div className="text-slate-600 dark:text-slate-400">
                      Enter working weight to see calculation
                    </div>
                  )}
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Drop percentage: {Number(currentExercise?.meta?.drop_percentage) || Number(currentExercise?.drop_percentage) || 0}%
                  </div>
                </div>

                {/* Manual Override */}
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Manual Drop Weight (kg):
                  </label>
                  <input
                    type="number"
                    value={dropWeight === '' ? '' : dropWeight}
                    onChange={(e) => setDropWeight(e.target.value)}
                    className="w-full h-12 text-center text-lg rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-purple-500"
                    step="0.5"
                    placeholder="Override calculated weight"
                  />
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Leave empty to use auto-calculated weight
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cluster Timer Modal */}
      {showClusterTimer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden border-0 shadow-2xl">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Cluster Rest Timer</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClusterTimer(false)}
                  className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="text-center space-y-6">
                {/* Timer Display */}
                <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-2xl p-8 border-2 border-green-200 dark:border-green-700">
                  <div className="text-6xl font-extrabold text-green-600 dark:text-green-400 mb-2">
                    {Number(currentExercise?.meta?.intra_cluster_rest) || Number(currentExercise?.intra_cluster_rest) || 0}
                  </div>
                  <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                    seconds rest
                  </div>
                </div>

                {/* Instructions */}
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Use this timer between each cluster set. Tap start to begin the countdown.
                </div>

                {/* Timer Controls */}
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => {
                      // TODO: Implement timer start logic
                      console.log('Starting cluster rest timer')
                    }}
                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-8 py-3 rounded-xl font-semibold"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Timer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowClusterTimer(false)}
                    className="px-8 py-3 rounded-xl font-semibold"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </ProtectedRoute>
  )
}
