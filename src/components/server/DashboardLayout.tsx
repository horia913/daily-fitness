import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Dumbbell, 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Plus,
  Award,
  Flame,
  BarChart3,
  Trophy,
  Apple,
  Calculator,
  Flag,
  MessageCircle,
  User,
  Users,
  Utensils,
  CreditCard,
  Settings,
  FileText,
  UserPlus,
  BookOpen,
  Zap,
  Star,
  Heart,
  Activity
} from 'lucide-react'
import Link from 'next/link'

// Server Component for static dashboard content
export function DashboardLayout({ 
  userRole, 
  userName 
}: { 
  userRole: 'client' | 'coach'
  userName?: string 
}) {
  if (userRole === 'client') {
    return (
      <div className="p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome Section */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">
                  Welcome back{userName ? `, ${userName}` : ''}! 👋
                </h1>
                <p className="text-slate-500">
                  Ready to crush your fitness goals today?
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-amber-400" />
                <span className="text-sm font-medium text-amber-600">Streak: 7 days</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/client/workouts">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <Dumbbell className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-blue-800">Workouts</h3>
                  <p className="text-sm text-blue-600">Start your session</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/client/nutrition">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <Apple className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-green-800">Nutrition</h3>
                  <p className="text-sm text-green-600">Log your meals</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/client/progress">
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-purple-800">Progress</h3>
                  <p className="text-sm text-purple-600">Track results</p>
                </CardContent>
              </Card>
            </Link>

            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.open('https://wa.me/', '_blank', 'noopener,noreferrer');
                }
              }}
              className="text-left"
            >
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <MessageCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-green-800">WhatsApp</h3>
                  <p className="text-sm text-green-600">Chat with coach</p>
                </CardContent>
              </Card>
            </button>
          </div>

          {/* Static Content Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tips Card */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  Today's Tip
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  Stay hydrated! Aim for 8-10 glasses of water throughout the day to support your workouts and recovery.
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>Updated daily</span>
                </div>
              </CardContent>
            </Card>

            {/* Motivation Card */}
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Trophy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Daily Motivation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <blockquote className="text-slate-800 dark:text-slate-200 italic mb-4">
                  "The only bad workout is the one that didn't happen."
                </blockquote>
                <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                  <Star className="w-4 h-4" />
                  <span>Keep pushing forward!</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Coach dashboard layout
  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                Coach Dashboard 🏋️‍♂️
              </h1>
              <p className="text-slate-500">
                Manage your clients and help them achieve their fitness goals
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium text-green-600">Active Coach</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/coach/clients">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-800">Clients</h3>
                <p className="text-sm text-blue-600">Manage clients</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/coach/exercises">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <Dumbbell className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-800">Exercises</h3>
                <p className="text-sm text-green-600">Exercise library</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/coach/programs-workouts">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-purple-800">Workouts</h3>
                <p className="text-sm text-purple-600">Create programs</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/coach/meals">
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <Utensils className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <h3 className="font-semibold text-orange-800">Meals</h3>
                <p className="text-sm text-orange-600">Meal planning</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Static Content Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coaching Tips */}
          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Coaching Tip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300 mb-4">
                Regular check-ins with clients improve adherence by 40%. Schedule weekly progress reviews to keep clients motivated.
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                <span>Updated weekly</span>
              </div>
            </CardContent>
          </Card>

          {/* Resources */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-800 dark:text-slate-200 mb-4">
                Access the latest fitness research and training methodologies to enhance your coaching effectiveness.
              </p>
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <Zap className="w-4 h-4" />
                <span>Stay updated</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Import Lightbulb icon
import { Lightbulb } from 'lucide-react'
