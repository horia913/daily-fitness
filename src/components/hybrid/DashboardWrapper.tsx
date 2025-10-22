'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/server/DashboardLayout'
import { useClientDashboardData, useCoachDashboardData } from '@/hooks/useDashboardData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Dumbbell, 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Award,
  Flame,
  BarChart3,
  Trophy,
  Play,
  AlertCircle,
  Zap,
  Star,
  Plus,
  Users,
  X,
  Utensils,
  Apple,
  Settings,
  User,
  FileText,
  Activity,
  BookOpen,
  MessageCircle,
  CreditCard,
  Flag
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import WorkoutAssignmentModal from '@/components/WorkoutAssignmentModal'

// Client Component that wraps Server Component with dynamic data
export function ClientDashboardWrapper() {
  const { user } = useAuth()
  const { profile, todaysWorkout, stats, achievements, loading } = useClientDashboardData()

  if (loading) {
    return (
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
    )
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Static Server Component */}
        <DashboardLayout 
          userRole="client" 
          userName={profile?.first_name} 
        />

        {/* Dynamic Data Sections */}
        {todaysWorkout && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Today's Workout</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  {todaysWorkout.status?.replace('_', ' ') || 'assigned'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-4">
                <div>
                  <CardTitle className="text-xl text-slate-800">
                    {todaysWorkout.template?.name || 'Workout'}
                  </CardTitle>
                  <CardDescription className="text-slate-600 mt-1">
                    {todaysWorkout.template?.description || 'Your assigned workout for today'}
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{todaysWorkout.template?.estimated_duration || 45} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Dumbbell className="w-4 h-4" />
                    <span>{todaysWorkout.exercise_count || 0} exercises</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    <span>{todaysWorkout.template?.difficulty_level || 'Intermediate'}</span>
                  </div>
                </div>

                {todaysWorkout.notes && (
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-800">{todaysWorkout.notes}</p>
                    </div>
                  </div>
                )}

                <Link href={`/client/workouts/${todaysWorkout.id}/start`}>
                  <div className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer">
                    <Play className="w-4 h-4" />
                    Start Workout
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                This Week's Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Workouts Completed</span>
                  <span className="font-bold text-green-600">{stats.thisWeek}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Goal Completion</span>
                  <span className="font-bold text-blue-600">{stats.goalCompletion}%</span>
                </div>
                <Progress value={stats.goalCompletion} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Daily Habits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Track your habits</span>
                  <Link 
                    href="/client/habits"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View All →
                  </Link>
                </div>
                <div className="text-sm text-slate-500">
                  Build healthy habits and track your daily progress
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-slate-600">Start building habits today!</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {achievements.length > 0 ? (
                  achievements.slice(0, 3).map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                      <Trophy className="w-4 h-4 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{achievement.title}</p>
                        <p className="text-xs text-slate-500">{achievement.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">No recent achievements</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}

// Coach Dashboard Wrapper
export function CoachDashboardWrapper() {
  const { user } = useAuth()
  const { profile, stats, todaysSessions, clientProgress, loading } = useCoachDashboardData()
  const [showWorkoutAssignment, setShowWorkoutAssignment] = useState(false)

  if (loading) {
    return (
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
    )
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Static Server Component */}
        <DashboardLayout 
          userRole="coach" 
          userName={profile?.first_name} 
        />

        {/* Dynamic Data Sections */}
        {todaysSessions.length > 0 && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Today's Sessions</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {todaysSessions.length} scheduled
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {todaysSessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                    <div>
                      <p className="font-medium text-slate-800">{session.title}</p>
                      <p className="text-sm text-slate-500">
                        {session.client_profile?.first_name || 'Client'} • {session.duration_minutes} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                {todaysSessions.length > 3 && (
                  <p className="text-sm text-slate-500 text-center">
                    +{todaysSessions.length - 3} more sessions today
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={() => setShowWorkoutAssignment(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Workout
                </Button>
                <Link href="/coach/programs-workouts">
                  <Button variant="outline" className="w-full">
                    <Dumbbell className="w-4 h-4 mr-2" />
                    Manage Programs & Workouts
                  </Button>
                </Link>
                <Link href="/coach/meals">
                  <Button variant="outline" className="w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Assign Meal Plan
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Coach Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Active Clients</span>
                  <span className="font-bold text-blue-600">{stats.activeClients}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Workouts Created</span>
                  <span className="font-bold text-green-600">{stats.workoutsCreated}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Client Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientProgress.length > 0 ? (
                  clientProgress.slice(0, 3).map((client) => (
                    <div key={client.client.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800">
                          {client.client.first_name || client.client.email}
                        </span>
                        <span className="text-sm text-slate-600">{client.progress}%</span>
                      </div>
                      <Progress value={client.progress} className="h-1" />
                      {client.recentAchievement && (
                        <p className="text-xs text-slate-500">
                          Latest: {client.recentAchievement}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">No client data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Features Access */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-600" />
              All Features
            </CardTitle>
            <CardDescription>
              Access all coaching tools and features from here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Programs & Workouts */}
              <Link href="/coach/programs-workouts">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Programs & Workouts</h3>
                      <p className="text-sm text-slate-500">Workout Templates & Programs</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Exercise Management */}
              <Link href="/coach/exercises">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Exercises</h3>
                      <p className="text-sm text-slate-500">Exercise Library</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Categories */}
              <Link href="/coach/categories">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Categories</h3>
                      <p className="text-sm text-slate-500">Exercise Categories</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Client Management */}
              <Link href="/coach/clients">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Clients</h3>
                      <p className="text-sm text-slate-500">Client Management</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Meal Plans */}
              <Link href="/coach/meals">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Meal Plans</h3>
                      <p className="text-sm text-slate-500">Nutrition Management</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Programs */}
              <Link href="/coach/programs">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Programs</h3>
                      <p className="text-sm text-slate-500">Program Builder</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Scheduling */}
              <Link href="/coach/scheduling">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Scheduling</h3>
                      <p className="text-sm text-slate-500">Session Scheduling</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Messages */}
              <Link href="/coach/messages">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Messages</h3>
                      <p className="text-sm text-slate-500">Client Communication</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Analytics */}
              <Link href="/coach/analytics">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Analytics</h3>
                      <p className="text-sm text-slate-500">Performance Analytics</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Reports */}
              <Link href="/coach/reports">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Reports</h3>
                      <p className="text-sm text-slate-500">Generate Reports</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Compliance */}
              <Link href="/coach/compliance">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Flag className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Compliance</h3>
                      <p className="text-sm text-slate-500">Compliance Tracking</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Bulk Assignments */}
              <Link href="/coach/bulk-assignments">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Bulk Assign</h3>
                      <p className="text-sm text-slate-500">Bulk Assignments</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Profile */}
              <Link href="/coach/profile">
                <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">Profile</h3>
                      <p className="text-sm text-slate-500">Coach Profile</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Workout Assignment Modal */}
        <WorkoutAssignmentModal
          isOpen={showWorkoutAssignment}
          onClose={() => setShowWorkoutAssignment(false)}
          onSuccess={() => {
            // Could refresh data here if needed
            console.log('Workout assigned successfully!')
          }}
        />

      </div>
    </div>
  )
}
