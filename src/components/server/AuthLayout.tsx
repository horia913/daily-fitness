import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dumbbell, Heart, Target, Trophy, Users, Zap, Sparkles } from 'lucide-react'

// Server Component for auth page layout (Design System v2: fc tokens)
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen fc-app-bg" style={{ background: "linear-gradient(to bottom right, var(--fc-bg-deep), var(--fc-bg-basalt))" }}>
      <div className="flex min-h-screen">
        {/* Left side - Branding and features */}
        <div className="hidden lg:flex lg:w-1/2 p-12 text-white relative overflow-hidden" style={{ background: "linear-gradient(to bottom right, var(--fc-accent-indigo), var(--fc-accent-violet))" }}>
          {/* Floating background elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-yellow-400/20 rounded-full blur-lg"></div>
          <div className="absolute top-1/2 left-10 w-16 h-16 bg-white/5 rounded-full blur-md"></div>
          
          <div className="flex flex-col justify-center max-w-md relative z-10">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-white/95 rounded-2xl flex items-center justify-center shadow-lg" style={{ color: "var(--fc-accent-indigo)" }}>
                  <Dumbbell className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">
                    DailyFitness
                  </h1>
                  <p className="text-white/80 text-sm font-medium">Your Journey to a Healthier You Starts Here</p>
                </div>
              </div>
              <p className="text-white/90 text-lg leading-relaxed">
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
                  <p className="text-white/85 text-sm leading-relaxed">
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
                  <p className="text-white/85 text-sm leading-relaxed">
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
                  <p className="text-white/85 text-sm leading-relaxed">
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
                  <p className="text-white/85 text-sm leading-relaxed">
                    Detailed analytics, achievement milestones, and celebration of your fitness journey
                  </p>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="flex items-center gap-4 text-sm text-white/80">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-white/90" />
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
        <div className="w-full lg:w-1/2 flex items-center justify-center fc-page">
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
    <Card className="fc-card-shell border-[color:var(--fc-glass-border)] rounded-3xl shadow-2xl">
      <CardHeader className="text-center pb-8 pt-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(to bottom right, var(--fc-accent-indigo), var(--fc-accent-violet))" }}>
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold fc-text-primary">DailyFitness</h1>
        </div>
        <CardTitle className="text-2xl font-bold fc-text-primary mb-2">{title}</CardTitle>
        <CardDescription className="fc-text-dim text-base">{description}</CardDescription>
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
        <div key={index} className="text-center p-3 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm" style={{ background: "linear-gradient(to bottom right, var(--fc-accent-indigo), var(--fc-accent-cyan))" }}>
            <feature.icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-semibold fc-text-primary text-sm mb-1">{feature.title}</h3>
          <p className="text-xs fc-text-dim leading-tight">{feature.description}</p>
        </div>
      ))}
    </div>
  )
}
