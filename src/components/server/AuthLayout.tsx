import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dumbbell, Heart, ClipboardList, TrendingUp, Users } from 'lucide-react'

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
                  <p className="text-white/80 text-sm font-medium">Coach-led training for clients and coaches</p>
                </div>
              </div>
              <p className="text-white/90 text-lg leading-relaxed">
                Sign in to view workouts, programs, nutrition, and habits assigned by your coach.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-lg">Assigned Workouts</h3>
                  <p className="text-white/85 text-sm leading-relaxed">
                    Follow workouts and training programs your coach assigns to you
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-lg">Coach Nutrition</h3>
                  <p className="text-white/85 text-sm leading-relaxed">
                    View meal plans and nutrition guidance assigned by your coach
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-lg">Your Coach</h3>
                  <p className="text-white/85 text-sm leading-relaxed">
                    Connect with your coach for training, check-ins, and accountability
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-lg">Track Progress</h3>
                  <p className="text-white/85 text-sm leading-relaxed">
                    Log workouts, habits, and see your progress over time
                  </p>
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
