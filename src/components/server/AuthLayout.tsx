import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dumbbell, Heart, Target, Trophy, Users, Zap, Sparkles } from 'lucide-react'

// Server Component for auth page layout
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="flex min-h-screen">
        {/* Left side - Branding and features */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 text-white relative overflow-hidden">
          {/* Floating background elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-yellow-400/20 rounded-full blur-lg"></div>
          <div className="absolute top-1/2 left-10 w-16 h-16 bg-white/5 rounded-full blur-md"></div>
          
          <div className="flex flex-col justify-center max-w-md relative z-10">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                  <Dumbbell className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    DailyFitness
                  </h1>
                  <p className="text-blue-200 text-sm font-medium">Your Journey to a Healthier You Starts Here</p>
                </div>
              </div>
              <p className="text-blue-100 text-lg leading-relaxed">
                Join thousands of users who are transforming their lives with personalized fitness coaching and nutrition guidance.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-lg">Personalized Workouts</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    AI-powered workout plans designed by certified trainers, tailored to your goals and fitness level
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-lg">Smart Nutrition</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    Comprehensive meal logging, macro tracking, and personalized nutrition recommendations
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-lg">Expert Coaching</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    Direct access to certified fitness professionals for guidance and motivation
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-lg">Track Progress</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    Detailed analytics, achievement milestones, and celebration of your fitness journey
                  </p>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="flex items-center gap-4 text-sm text-blue-200">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>4.9/5 Rating</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>10K+ Users</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// Server Component for auth form container
export function AuthFormContainer({ 
  title, 
  description, 
  children 
}: { 
  title: string
  description: string
  children: React.ReactNode 
}) {
  return (
    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-2xl border-0 rounded-3xl">
      <CardHeader className="text-center pb-8 pt-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">DailyFitness</h1>
        </div>
        <CardTitle className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{title}</CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-300 text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        {children}
      </CardContent>
    </Card>
  )
}

// Server Component for feature highlights
export function FeatureHighlights() {
  const features = [
    {
      icon: Target,
      title: "Smart Workouts",
      description: "AI-powered recommendations"
    },
    {
      icon: Heart,
      title: "Health Tracking",
      description: "Comprehensive wellness monitoring"
    },
    {
      icon: Zap,
      title: "Quick Results",
      description: "See progress in 2 weeks"
    }
  ]

  return (
    <div className="grid grid-cols-3 gap-3 mt-6">
      {features.map((feature, index) => (
        <div key={index} className="text-center p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border border-blue-100 dark:border-slate-700">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
            <feature.icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-1">{feature.title}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-tight">{feature.description}</p>
        </div>
      ))}
    </div>
  )
}
