import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Admin Layout - Server-Side Role Guard
 * 
 * This layout runs on the server and checks if the user has admin role
 * BEFORE rendering any content. Non-admins are redirected to /coach.
 * 
 * Security: This is enforced at the server level, not just UI hiding.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  
  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/');
  }
  
  // Check if user has admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile) {
    redirect('/');
  }
  
  // Only allow admin role - not coach, not super_coach, ONLY admin
  if (profile.role !== 'admin') {
    redirect('/coach');
  }
  
  // User is authenticated and has admin role - render the admin pages
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a href="/coach" className="text-slate-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </a>
              <div>
                <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                <p className="text-xs text-slate-400">System Configuration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                ADMIN
              </span>
              <span className="text-sm text-slate-300">{profile.first_name}</span>
            </div>
          </div>
        </div>
        
        {/* Admin Navigation */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto pb-2">
            <AdminNavLink href="/admin/goal-templates">Goal Templates</AdminNavLink>
            <AdminNavLink href="/admin/habit-categories">Habit Categories</AdminNavLink>
            <AdminNavLink href="/admin/achievement-templates">Achievements</AdminNavLink>
            <AdminNavLink href="/admin/tracking-sources">Tracking Sources</AdminNavLink>
          </div>
        </nav>
      </header>
      
      {/* Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

/**
 * Admin Navigation Link Component
 * Server component - uses href for navigation
 */
function AdminNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors whitespace-nowrap"
    >
      {children}
    </a>
  );
}
