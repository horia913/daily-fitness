'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Calendar, BookOpen, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'

interface Program {
  id: string
  name: string
  description: string
  duration_weeks: number
}

interface ProgramWeek {
  week_number: number
  workouts: Array<{
    id: string
    name: string
    description: string
    estimated_duration: number
  }>
}

export default function ProgramDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  // supabase is imported from @/lib/supabase
  const { theme } = useTheme()
  const [program, setProgram] = useState<Program | null>(null)
  const [weeks, setWeeks] = useState<ProgramWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadProgramDetails(id as string)
    }
  }, [id])

  const loadProgramDetails = async (programId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Get program details
      const { data: programData, error: programError } = await supabase
        .from('workout_programs')
        .select('id, name, description, duration_weeks')
        .eq('id', programId)
        .single()

      if (programError) {
        console.error('Error fetching program:', programError)
        setError('Failed to load program details')
        return
      }

      setProgram(programData)

      // Get program weeks and workouts
      const { data: programWeeks, error: weeksError } = await supabase
        .from('program_weeks')
        .select(`
          week_number,
          workout_templates!inner (
            id,
            name,
            description,
            estimated_duration
          )
        `)
        .eq('program_id', programId)
        .order('week_number', { ascending: true })

      if (weeksError) {
        console.error('Error fetching program weeks:', weeksError)
        // Don't set error here, just show empty weeks
        setWeeks([])
      } else {
        // Transform the data to match our interface
        const weeksData: ProgramWeek[] = programWeeks?.map((week: any) => ({
          week_number: week.week_number,
          workouts: week.workout_templates ? [week.workout_templates] : []
        })) || []
        
        setWeeks(weeksData)
      }
    } catch (error) {
      console.error('Error loading program details:', error)
      setError('Failed to load program details')
    } finally {
      setLoading(false)
    }
  }

  const getThemeStyles = () => {
    return {
      background: theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-gray-50 to-gray-100',
      card: theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200',
      text: theme === 'dark' ? 'text-white' : 'text-gray-900',
      textSecondary: theme === 'dark' ? 'text-gray-300' : 'text-gray-600',
      badge: theme === 'dark' 
        ? 'bg-orange-600 text-white' 
        : 'bg-orange-100 text-orange-800'
    }
  }

  const styles = getThemeStyles()

  if (loading) {
    return (
      <div className={`min-h-screen ${styles.background}`}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className={styles.textSecondary}>Loading program details...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !program) {
    return (
      <div className={`min-h-screen ${styles.background}`}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <p className={`text-red-500 mb-4`}>{error || 'Program not found'}</p>
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${styles.background}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            onClick={() => router.back()} 
            variant="ghost" 
            className="text-orange-500 hover:text-orange-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Program Header */}
        <Card className={`${styles.card} mb-6`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={`${styles.text} text-2xl`}>
                {program.name}
              </CardTitle>
              <Badge className={styles.badge}>
                <Calendar className="w-3 h-3 mr-1" />
                {program.duration_weeks} weeks
              </Badge>
            </div>
            {program.description && (
              <p className={`${styles.textSecondary} mt-2`}>
                {program.description}
              </p>
            )}
          </CardHeader>
        </Card>

        {/* Program Weeks */}
        <Card className={styles.card}>
          <CardHeader>
            <CardTitle className={`${styles.text} flex items-center`}>
              <BookOpen className="w-5 h-5 mr-2" />
              Program Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeks.length === 0 ? (
              <p className={`${styles.textSecondary} text-center py-8`}>
                No workout schedule found for this program.
              </p>
            ) : (
              <div className="space-y-6">
                {weeks.map((week) => (
                  <div key={week.week_number} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                    <h3 className={`${styles.text} font-semibold text-lg mb-3`}>
                      Week {week.week_number}
                    </h3>
                    
                    {week.workouts.length === 0 ? (
                      <p className={`${styles.textSecondary} text-sm`}>
                        No workouts scheduled for this week.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {week.workouts.map((workout) => (
                          <div 
                            key={workout.id}
                            className={`${styles.card} border rounded-lg p-3 flex items-center justify-between`}
                          >
                            <div>
                              <h4 className={`${styles.text} font-medium`}>
                                {workout.name}
                              </h4>
                              {workout.description && (
                                <p className={`${styles.textSecondary} text-sm`}>
                                  {workout.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {workout.estimated_duration} min
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/client/workouts/${workout.id}/details`)}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="mt-6 text-center">
          <Button 
            onClick={() => router.push('/client/workouts')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 text-lg"
          >
            <Play className="w-5 h-5 mr-2" />
            View All Workouts
          </Button>
        </div>
      </div>
    </div>
  )
}
