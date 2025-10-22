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
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  return (
    <ProtectedRoute requiredRole="coach">
      <div style={{ minHeight: '100vh', backgroundColor: '#E8E9F3', paddingBottom: '100px' }}>
        <div style={{ padding: '24px 20px' }} className="container mx-auto">
          {/* Header */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '8px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Dumbbell style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A1A' }}>
                Programs & Workouts
              </h1>
            </div>
            <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>
              Create and manage workout templates and training programs for your clients
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Tabs */}
            <Tabs defaultValue="workouts" className="w-full">
              <div className="flex justify-center" style={{ marginBottom: '20px' }}>
                <TabsList style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', borderRadius: '20px', padding: '8px', border: '0' }}>
                  <TabsTrigger 
                    value="workouts" 
                    style={{ borderRadius: '16px', padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}
                  >
                    <Dumbbell className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Workout Templates</span>
                    <span className="sm:hidden">Workouts</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="programs" 
                    style={{ borderRadius: '16px', padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Training Programs</span>
                    <span className="sm:hidden">Programs</span>
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
