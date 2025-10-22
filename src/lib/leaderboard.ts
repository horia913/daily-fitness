import { supabase } from './supabase'

export interface LeaderboardEntry {
  id: string
  name: string
  avatar?: string
  sex: 'M' | 'F'
  bodyweight: number
  lifts: {
    benchPress: number
    squat: number
    deadlift: number
    overheadPress: number
    rdl: number
    hipThrust: number
    pushups: number
    chinups: number
  }
}

export interface PersonalRecord {
  id: string
  client_id: string
  exercise_name: string
  weight: number
  reps: number
  achieved_at: string
}

/**
 * Fetch all personal records with user profiles for leaderboard
 * @param sexFilter - Optional filter by sex ('M', 'F', or null for all)
 * @param timeFilter - Optional time filter ('weekly', 'monthly', 'yearly', 'all_time')
 */
export async function fetchLeaderboardData(
  sexFilter: 'M' | 'F' | null = null,
  timeFilter: 'weekly' | 'monthly' | 'yearly' | 'all_time' = 'all_time'
): Promise<LeaderboardEntry[]> {
  try {
    // Build query for profiles
    let profileQuery = supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, sex, bodyweight')
      .eq('role', 'client')
      .not('sex', 'is', null)
      .not('bodyweight', 'is', null)

    if (sexFilter) {
      profileQuery = profileQuery.eq('sex', sexFilter)
    }

    const { data: profiles, error: profileError } = await profileQuery

    if (profileError) throw profileError
    if (!profiles || profiles.length === 0) return []

    // Calculate cutoff date based on time filter
    const getCutoffDate = () => {
      const now = new Date()
      switch (timeFilter) {
        case 'weekly':
          return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        case 'monthly':
          return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        case 'yearly':
          return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
        case 'all_time':
        default:
          return '1900-01-01T00:00:00.000Z'
      }
    }

    const cutoffDate = getCutoffDate()

    // Fetch all personal records for these users within time filter
    const userIds = profiles.map(p => p.id)
    const { data: prs, error: prError } = await supabase
      .from('personal_records')
      .select('*')
      .in('client_id', userIds)
      .gte('achieved_at', cutoffDate)
      .order('achieved_at', { ascending: false })

    if (prError) throw prError

    // Process data into leaderboard entries
    const leaderboard: LeaderboardEntry[] = profiles.map(profile => {
      // Get the best record for each exercise for this user
      const userPRs = prs?.filter(pr => pr.client_id === profile.id) || []
      
      const getBestLift = (exerciseName: string): number => {
        const exercisePRs = userPRs.filter(pr => 
          pr.exercise_name.toLowerCase().includes(exerciseName.toLowerCase())
        )
        if (exercisePRs.length === 0) return 0
        
        // For bodyweight exercises (pushups, chinups), use reps
        if (exerciseName === 'pushup' || exerciseName === 'chinup') {
          return Math.max(...exercisePRs.map(pr => pr.reps || 0))
        }
        
        // For weighted exercises, calculate 1RM estimate
        // Formula: Weight × (1 + Reps/30)
        return Math.max(...exercisePRs.map(pr => {
          const weight = pr.weight || 0
          const reps = pr.reps || 1
          return weight * (1 + reps / 30)
        }))
      }

      return {
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Anonymous',
        avatar: profile.avatar_url,
        sex: profile.sex!,
        bodyweight: profile.bodyweight!,
        lifts: {
          benchPress: getBestLift('bench press'),
          squat: getBestLift('squat'),
          deadlift: getBestLift('deadlift'),
          overheadPress: getBestLift('overhead press'),
          rdl: getBestLift('rdl'),
          hipThrust: getBestLift('hip thrust'),
          pushups: getBestLift('pushup'),
          chinups: getBestLift('chinup')
        }
      }
    })

    return leaderboard
  } catch (error) {
    console.error('Error fetching leaderboard data:', error)
    return []
  }
}

/**
 * Get user's current rank in a specific category
 */
export async function getUserRank(
  userId: string,
  category: string,
  sexFilter: 'M' | 'F' | null = null
): Promise<{ rank: number; total: number } | null> {
  try {
    const leaderboard = await fetchLeaderboardData(sexFilter)
    
    // This would need the same scoring logic as the component
    // For now, return a placeholder
    const userIndex = leaderboard.findIndex(entry => entry.id === userId)
    
    if (userIndex === -1) return null
    
    return {
      rank: userIndex + 1,
      total: leaderboard.length
    }
  } catch (error) {
    console.error('Error getting user rank:', error)
    return null
  }
}

/**
 * Get leaderboard for a specific lift/category
 */
export async function getCategoryLeaderboard(
  category: string,
  sexFilter: 'M' | 'F' | null = null,
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  const data = await fetchLeaderboardData(sexFilter)
  return data.slice(0, limit)
}

/**
 * Update user's bodyweight
 */
export async function updateUserBodyweight(userId: string, bodyweight: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ bodyweight, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating bodyweight:', error)
    return false
  }
}

/**
 * Update user's sex
 */
export async function updateUserSex(userId: string, sex: 'M' | 'F'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ sex, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating sex:', error)
    return false
  }
}

