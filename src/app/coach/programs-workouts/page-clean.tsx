'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/contexts/ThemeContext'
import EnhancedWorkoutTemplateManager from '@/components/coach/EnhancedWorkoutTemplateManager'
import EnhancedProgramManager from '@/components/coach/EnhancedProgramManager'
import { 
  Dumbbell, 
  BookOpen
} from 'lucide-react'

export default function ProgramsAndWorkoutsPage() {
  const { user } = useAuth()
  const { theme } = useTheme()

  return (
    <ProtectedRoute allowedRoles={['coach']}>
      <div className={`min-h-screen ${theme.background}`}>
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className={`text-4xl font-bold ${theme.text} mb-2`}>
              Programs & Workouts
            </h1>
            <p className={`text-lg ${theme.textSecondary}`}>
              Manage your workout templates and training programs
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Tabs */}
            <Tabs defaultValue="workouts" className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList className={`${theme.card} ${theme.shadow} rounded-2xl p-2`}>
                  <TabsTrigger 
                    value="workouts" 
                    className="rounded-xl px-6 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
                  >
                    <Dumbbell className="w-4 h-4 mr-2" />
                    Workout Templates
                  </TabsTrigger>
                  <TabsTrigger 
                    value="programs" 
                    className="rounded-xl px-6 py-3 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Training Programs
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Workout Templates Tab */}
              <TabsContent value="workouts" className="space-y-6">
                <EnhancedWorkoutTemplateManager coachId={user?.id || ''} />
              </TabsContent>

              {/* Programs Tab */}
              <TabsContent value="programs" className="space-y-6">
                <EnhancedProgramManager coachId={user?.id || ''} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
