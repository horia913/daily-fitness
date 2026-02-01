/**
 * Achievement Service
 * Handles achievement templates, progress calculation, and unlocking
 * Uses achievement_templates and user_achievements tables
 */

import { supabase } from './supabase'
import { getStreak } from './programService'

// ============================================================================
// INTERFACES
// ============================================================================

export interface AchievementTemplate {
  id: string
  name: string
  description: string | null
  icon: string | null
  category: string
  achievement_type: string
  is_tiered: boolean
  tier_bronze_threshold: number | null
  tier_bronze_label: string | null
  tier_silver_threshold: number | null
  tier_silver_label: string | null
  tier_gold_threshold: number | null
  tier_gold_label: string | null
  tier_platinum_threshold: number | null
  tier_platinum_label: string | null
  single_threshold: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserAchievement {
  id: string
  client_id: string
  achievement_template_id: string
  tier: string | null
  metric_value: number
  achieved_date: string
  is_public: boolean
  created_at: string
}

export interface AchievementProgress {
  template: AchievementTemplate
  currentValue: number
  progress: number // 0-100
  unlockedTiers: string[] // Array of unlocked tier names (e.g., ['bronze', 'silver'])
  nextTier: { tier: string; threshold: number; label: string } | null
  status: 'locked' | 'in_progress' | 'unlocked'
}

// ============================================================================
// ACHIEVEMENT SERVICE
// ============================================================================

export class AchievementService {
  /**
   * Get all active achievement templates
   */
  static async getTemplates(): Promise<AchievementTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('achievement_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching achievement templates:', error)
      return []
    }
  }

  /**
   * Get unlocked achievements for a client
   */
  static async getUnlockedAchievements(clientId: string): Promise<UserAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('client_id', clientId)
        .order('achieved_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching unlocked achievements:', error)
      return []
    }
  }

  /**
   * Get current metric value for an achievement type
   */
  static async getCurrentMetricValue(
    clientId: string,
    achievementType: string
  ): Promise<number> {
    try {
      switch (achievementType) {
        case 'workout_count': {
          const { count, error } = await supabase
            .from('workout_logs')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientId)

          if (error) throw error
          return count ?? 0
        }

        case 'streak_weeks': {
          return await getStreak(clientId)
        }

        case 'pr_count': {
          const { count, error } = await supabase
            .from('personal_records')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientId)

          if (error) throw error
          return count ?? 0
        }

        case 'program_completion': {
          // Count completed programs (status = 'completed')
          const { count, error } = await supabase
            .from('program_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .eq('status', 'completed')

          if (error) throw error
          return count ?? 0
        }

        case 'total_volume': {
          // Sum total volume from workout_logs (would need volume calculation)
          // For now, return 0 - would need to calculate from workout_set_logs
          return 0
        }

        default:
          return 0
      }
    } catch (error) {
      console.error(`Error getting metric value for ${achievementType}:`, error)
      return 0
    }
  }

  /**
   * Calculate progress for all achievements for a client
   */
  static async getAchievementProgress(clientId: string): Promise<AchievementProgress[]> {
    try {
      const [templates, unlocked] = await Promise.all([
        this.getTemplates(),
        this.getUnlockedAchievements(clientId)
      ])

      // Create a map of unlocked achievements by template_id and tier
      const unlockedMap = new Map<string, Set<string>>()
      unlocked.forEach(ua => {
        const key = ua.achievement_template_id
        const tier = ua.tier || 'single' // Use 'single' for non-tiered achievements
        if (!unlockedMap.has(key)) {
          unlockedMap.set(key, new Set())
        }
        unlockedMap.get(key)!.add(tier)
      })

      // Calculate progress for each template
      const progressPromises = templates.map(async (template) => {
        const currentValue = await this.getCurrentMetricValue(clientId, template.achievement_type)
        const unlockedTiers = Array.from(unlockedMap.get(template.id) || [])

        if (template.is_tiered) {
          // Tiered achievement
          const tiers = [
            { name: 'bronze', threshold: template.tier_bronze_threshold, label: template.tier_bronze_label },
            { name: 'silver', threshold: template.tier_silver_threshold, label: template.tier_silver_label },
            { name: 'gold', threshold: template.tier_gold_threshold, label: template.tier_gold_label },
            { name: 'platinum', threshold: template.tier_platinum_threshold, label: template.tier_platinum_label }
          ].filter(t => t.threshold !== null && t.threshold !== undefined) as Array<{
            name: string
            threshold: number
            label: string | null
          }>

          // Find next tier to unlock
          const nextTier = tiers.find(
            t => currentValue < t.threshold && !unlockedTiers.includes(t.name)
          ) || null

          // Calculate overall progress (based on highest tier)
          const highestTier = tiers[tiers.length - 1]
          const progress = highestTier
            ? Math.min((currentValue / highestTier.threshold) * 100, 100)
            : 0

          // Determine status
          let status: 'locked' | 'in_progress' | 'unlocked'
          if (unlockedTiers.length === tiers.length) {
            status = 'unlocked' // All tiers unlocked
          } else if (currentValue > 0) {
            status = 'in_progress'
          } else {
            status = 'locked'
          }

          return {
            template,
            currentValue,
            progress,
            unlockedTiers,
            nextTier: nextTier ? {
              tier: nextTier.name,
              threshold: nextTier.threshold,
              label: nextTier.label || nextTier.name
            } : null,
            status
          } as AchievementProgress
        } else {
          // Non-tiered achievement
          const threshold = template.single_threshold || 0
          const progress = threshold > 0 ? Math.min((currentValue / threshold) * 100, 100) : 0
          const isUnlocked = unlockedTiers.includes('single')

          return {
            template,
            currentValue,
            progress,
            unlockedTiers: isUnlocked ? ['single'] : [],
            nextTier: null,
            status: isUnlocked ? 'unlocked' : (currentValue > 0 ? 'in_progress' : 'locked')
          } as AchievementProgress
        }
      })

      return await Promise.all(progressPromises)
    } catch (error) {
      console.error('Error calculating achievement progress:', error)
      return []
    }
  }

  /**
   * Check and unlock achievements for a specific achievement type
   * Called after an action (e.g., workout completion)
   */
  static async checkAndUnlockAchievements(
    clientId: string,
    achievementType: string
  ): Promise<UserAchievement[]> {
    try {
      // Get relevant templates
      const templates = await this.getTemplates()
      const relevantTemplates = templates.filter(t => t.achievement_type === achievementType)

      if (relevantTemplates.length === 0) {
        return []
      }

      // Get current metric value
      const currentValue = await this.getCurrentMetricValue(clientId, achievementType)

      // Get already unlocked achievements for this type
      const unlocked = await this.getUnlockedAchievements(clientId)
      const unlockedMap = new Map<string, Set<string>>()
      unlocked.forEach(ua => {
        if (!unlockedMap.has(ua.achievement_template_id)) {
          unlockedMap.set(ua.achievement_template_id, new Set())
        }
        unlockedMap.get(ua.achievement_template_id)!.add(ua.tier || 'single')
      })

      // Check each template and unlock if threshold met
      const newlyUnlocked: UserAchievement[] = []

      for (const template of relevantTemplates) {
        if (template.is_tiered) {
          // Check each tier
          const tiers = [
            { name: 'bronze', threshold: template.tier_bronze_threshold },
            { name: 'silver', threshold: template.tier_silver_threshold },
            { name: 'gold', threshold: template.tier_gold_threshold },
            { name: 'platinum', threshold: template.tier_platinum_threshold }
          ].filter(t => t.threshold !== null && t.threshold !== undefined) as Array<{
            name: string
            threshold: number
          }>

          for (const tier of tiers) {
            const alreadyUnlocked = unlockedMap.get(template.id)?.has(tier.name) || false

            if (!alreadyUnlocked && currentValue >= tier.threshold) {
              // Unlock this tier
              const unlockedAchievement = await this.unlockAchievement(
                clientId,
                template.id,
                tier.name,
                currentValue
              )

              if (unlockedAchievement) {
                newlyUnlocked.push(unlockedAchievement)
                // Update unlocked map
                if (!unlockedMap.has(template.id)) {
                  unlockedMap.set(template.id, new Set())
                }
                unlockedMap.get(template.id)!.add(tier.name)
              }
            }
          }
        } else {
          // Non-tiered achievement
          const threshold = template.single_threshold || 0
          const alreadyUnlocked = unlockedMap.get(template.id)?.has('single') || false

          if (!alreadyUnlocked && currentValue >= threshold) {
            const unlockedAchievement = await this.unlockAchievement(
              clientId,
              template.id,
              null, // No tier for non-tiered
              currentValue
            )

            if (unlockedAchievement) {
              newlyUnlocked.push(unlockedAchievement)
            }
          }
        }
      }

      return newlyUnlocked
    } catch (error) {
      console.error(`Error checking and unlocking achievements for ${achievementType}:`, error)
      return []
    }
  }

  /**
   * Unlock a specific achievement tier
   */
  private static async unlockAchievement(
    clientId: string,
    templateId: string,
    tier: string | null,
    metricValue: number
  ): Promise<UserAchievement | null> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .insert({
          // Required columns that were missing:
          user_id: clientId,  // user_id is the same as client_id
          achievement_id: templateId,  // achievement_id is the same as achievement_template_id
          // Standard columns:
          client_id: clientId,
          achievement_template_id: templateId,
          tier: tier,
          metric_value: metricValue,
          achieved_date: new Date().toISOString().split('T')[0],
          is_public: true
        })
        .select()
        .single()

      if (error) {
        // If unique constraint violation, achievement already unlocked (ignore)
        if (error.code === '23505') {
          console.log(`Achievement already unlocked: template=${templateId}, tier=${tier}`)
          return null
        }
        console.error('Error inserting achievement:', error)
        throw error
      }

      console.log(`Achievement unlocked! template=${templateId}, tier=${tier}, value=${metricValue}`)
      return data
    } catch (error) {
      console.error('Error unlocking achievement:', error)
      return null
    }
  }

  /**
   * Get count of achievements in progress (for progressStatsService)
   */
  static async getAchievementsInProgressCount(clientId: string): Promise<number> {
    try {
      const progress = await this.getAchievementProgress(clientId)
      return progress.filter(p => p.status === 'in_progress').length
    } catch (error) {
      console.error('Error getting achievements in progress count:', error)
      return 0
    }
  }

  /**
   * Get count of unlocked achievements (for progressStatsService)
   */
  static async getUnlockedAchievementsCount(clientId: string): Promise<number> {
    try {
      const unlocked = await this.getUnlockedAchievements(clientId)
      return unlocked.length
    } catch (error) {
      console.error('Error getting unlocked achievements count:', error)
      return 0
    }
  }
}
