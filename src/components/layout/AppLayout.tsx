'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import BottomNav from './BottomNav'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  
  // Don't show layout on auth page
  if (pathname === '/') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex flex-col">
      <Header />
      <main className="flex-1 pb-24 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}