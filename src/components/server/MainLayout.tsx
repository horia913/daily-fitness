import { ReactNode } from 'react'

// Server Component for the main layout structure
export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex flex-col min-h-screen">
        {/* Main content area */}
        <main className="flex-1 pb-16">
          {children}
        </main>
      </div>
    </div>
  )
}

// Server Component for page containers
export function PageContainer({ 
  children, 
  className = "" 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {children}
    </div>
  )
}

// Server Component for section spacing
export function Section({ 
  children, 
  className = "" 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <section className={`py-6 ${className}`}>
      {children}
    </section>
  )
}

// Server Component for grid layouts
export function Grid({ 
  children, 
  cols = 1, 
  gap = 6,
  className = ""
}: { 
  children: ReactNode
  cols?: 1 | 2 | 3 | 4
  gap?: 3 | 4 | 6 | 8
  className?: string
}) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }

  const gridGap = {
    3: 'gap-3',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8'
  }

  return (
    <div className={`grid ${gridCols[cols]} ${gridGap[gap]} ${className}`}>
      {children}
    </div>
  )
}

// Server Component for loading skeletons
export function LoadingSkeleton({ 
  lines = 3,
  className = ""
}: { 
  lines?: number
  className?: string 
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          {index === 0 && <div className="h-4 bg-slate-200 rounded w-1/2"></div>}
        </div>
      ))}
    </div>
  )
}

// Server Component for error states
export function ErrorState({ 
  title = "Something went wrong",
  description = "Please try again later",
  className = ""
}: { 
  title?: string
  description?: string
  className?: string
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500">{description}</p>
    </div>
  )
}

// Server Component for success states
export function SuccessState({ 
  title = "Success!",
  description = "Operation completed successfully",
  className = ""
}: { 
  title?: string
  description?: string
  className?: string
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500">{description}</p>
    </div>
  )
}
