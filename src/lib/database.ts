import { supabase, ensureAuthenticated } from './supabase'

// Types
export interface Profile {
  id: string
  email: string
  role: 'coach' | 'client'
  first_name?: string
  last_name?: string
  avatar_url?: string
  sex?: 'M' | 'F'
  bodyweight?: number // kg
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  coach_id: string
  client_id: string
  status: 'active' | 'inactive' | 'pending'
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Workout {
  id: string
  coach_id: string
  name: string
  description?: string
  duration_minutes?: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'athlete'
  created_at: string
  updated_at: string
}

export interface WorkoutSession {
  id: string
  assignment_id: string
  client_id: string
  started_at: string
  completed_at?: string
  total_duration?: number
  status: 'in_progress' | 'completed' | 'abandoned'
  notes?: string
  created_at: string
  assignment?: WorkoutAssignment
}

export interface WorkoutAssignment {
  id: string
  coach_id: string
  client_id: string
  workout_template_id: string // Database column name (not template_id)
  assigned_date: string
  scheduled_date: string
  status: 'assigned' | 'in_progress' | 'completed' | 'skipped'
  notes?: string
  created_at: string
  template?: WorkoutTemplate
}

export interface WorkoutTemplate {
  id: string
  coach_id: string
  name: string
  description?: string
  category_id?: string
  estimated_duration: number
  difficulty_level: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Achievement {
  id: string
  client_id: string
  title: string
  description?: string
  type: 'streak' | 'pr' | 'goal' | 'milestone'
  value?: string
  created_at: string
}

export interface Session {
  id: string
  coach_id: string
  client_id: string
  title: string
  description?: string
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  created_at: string
  client_profile?: Profile
}

// Database functions
export class DatabaseService {
  // Profile functions
  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      // Ensure user is authenticated before querying
      await ensureAuthenticated()
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Handle specific error cases
        if (error.code === 'PGRST116') {
          console.log('Profile not found for user:', userId)
          // Only try to create profile if this is the current user
          const { data: authUser } = await supabase.auth.getUser()
          if (authUser?.user?.id === userId && authUser?.user?.email) {
            console.log('Creating profile for current user:', userId)
            return await this.createProfile(userId, authUser.user.email, 'client')
          }
          // Don't try to create profile for other users due to RLS restrictions
          return null
        }
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Unexpected error fetching profile:', error)
      return null
    }
  }

  static async getCurrentUserProfile(): Promise<Profile | null> {
    try {
      // Ensure user is authenticated before querying
      await ensureAuthenticated()
      
      const { data, error } = await supabase
        .rpc('get_user_profile')

      if (error) {
        console.error('Error fetching current user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Unexpected error fetching current user profile:', error)
      return null
    }
  }

  static async createProfile(userId: string, email: string, role: 'client' | 'coach' = 'client'): Promise<Profile | null> {
    try {
      // Ensure user is authenticated before creating profile
      await ensureAuthenticated()
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          role: role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Unexpected error creating profile:', error)
      return null
    }
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    try {
      // Ensure user is authenticated before updating profile
      await ensureAuthenticated()
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Unexpected error updating profile:', error)
      return null
    }
  }

  // Client functions (for coaches)
  static async getClients(coachId: string): Promise<Client[]> {
    try {
      // Ensure user is authenticated before querying
      await ensureAuthenticated()
      
      // First, get the client relationships
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('coach_id', coachId)

      if (clientsError) {
        console.error('Error fetching clients:', clientsError)
        return []
      }

      if (!clientsData || clientsData.length === 0) {
        return []
      }

      // Get the client IDs
      const clientIds = clientsData.map(client => client.client_id)

      // Fetch profiles for these client IDs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        return []
      }

      // Combine clients with their profiles
      const clientsWithProfiles = clientsData.map(client => {
        const profile = profilesData?.find(p => p.id === client.client_id)
        return {
          ...client,
          profiles: profile
        }
      })

      return clientsWithProfiles
    } catch (error) {
      console.error('Unexpected error fetching clients:', error)
      return []
    }
  }

  // Workout functions
  static async getWorkouts(coachId: string): Promise<Workout[]> {
    try {
      // Ensure user is authenticated before querying
      await ensureAuthenticated()
      
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching workouts:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Unexpected error fetching workouts:', error)
      return []
    }
  }

  // Workout assignment functions
  static async getTodaysWorkout(clientId: string): Promise<WorkoutAssignment | null> {
    try {
      // Ensure user is authenticated before querying
      await ensureAuthenticated()
      
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('workout_assignments')
        .select(`
          *,
          template:workout_templates(*)
        `)
        .eq('client_id', clientId)
        .eq('scheduled_date', today)
        .eq('status', 'assigned')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching today\'s workout:', error)
        return null
      }

      // Return the first result or null if no workout found
      return data && data.length > 0 ? data[0] : null
    } catch (error) {
      console.error('Unexpected error fetching today\'s workout:', error)
      return null
    }
  }

  static async getWorkoutStats(clientId: string): Promise<{
    thisWeek: number
    goalCompletion: number
  }> {
    try {
      // Ensure user is authenticated before querying
      await ensureAuthenticated()
      
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const startOfWeekStr = startOfWeek.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('workout_assignments')
        .select('status')
        .eq('client_id', clientId)
        .gte('scheduled_date', startOfWeekStr)

      if (error) {
        console.error('Error fetching workout stats:', error)
        return { thisWeek: 0, goalCompletion: 0 }
      }

      const completed = data?.filter(assignment => assignment.status === 'completed').length || 0
      const total = data?.length || 0
      const goalCompletion = total > 0 ? Math.round((completed / total) * 100) : 0

      return {
        thisWeek: completed,
        goalCompletion
      }
    } catch (error) {
      console.error('Unexpected error fetching workout stats:', error)
      return { thisWeek: 0, goalCompletion: 0 }
    }
  }

  // Achievement functions
  static async getRecentAchievements(clientId: string): Promise<Achievement[]> {
    try {
      // Ensure user is authenticated before querying
      await ensureAuthenticated()
      
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching achievements:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Unexpected error fetching achievements:', error)
      return []
    }
  }

  // Session functions (for coaches)
  static async getTodaysSessions(coachId: string): Promise<Session[]> {
    try {
      // Ensure user is authenticated before querying
      await ensureAuthenticated()
      
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('coach_id', coachId)
        .gte('scheduled_at', `${today}T00:00:00`)
        .lt('scheduled_at', `${today}T23:59:59`)
        .order('scheduled_at', { ascending: true })

      if (error) {
        console.error('Error fetching today\'s sessions:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Unexpected error fetching today\'s sessions:', error)
      return []
    }
  }

  static async getCoachStats(coachId: string): Promise<{
    activeClients: number
    workoutsCreated: number
  }> {
    try {
      // Ensure user is authenticated before querying
      await ensureAuthenticated()
      
      const [clientsResult, workoutsResult] = await Promise.all([
        supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('coach_id', coachId)
          .eq('status', 'active'),
        supabase
          .from('workouts')
          .select('id', { count: 'exact' })
          .eq('coach_id', coachId)
      ])

      return {
        activeClients: clientsResult.count || 0,
        workoutsCreated: workoutsResult.count || 0
      }
    } catch (error) {
      console.error('Unexpected error fetching coach stats:', error)
      return {
        activeClients: 0,
        workoutsCreated: 0
      }
    }
  }

  // Client progress functions
  static async getClientProgress(coachId: string): Promise<Array<{
    client: Profile
    progress: number
    recentAchievement?: string
  }>> {
    try {
      // Ensure user is authenticated before querying
      await ensureAuthenticated()
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('coach_id', coachId)
        .eq('status', 'active')
        .limit(5)

      if (error) {
        console.error('Error fetching client progress:', error)
        return []
      }

      // Fetch profiles for each client
      const clientProgress = []
      for (const client of data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', client.client_id)
          .single()
        
        if (profile) {
          clientProgress.push({
            client: profile,
            progress: Math.floor(Math.random() * 40) + 60, // Mock progress for now
            recentAchievement: undefined // Will implement achievements later
          })
        }
      }
      
      return clientProgress
    } catch (error) {
      console.error('Unexpected error fetching client progress:', error)
      return []
    }
  }
}
