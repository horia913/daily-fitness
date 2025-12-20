// Client Compliance Dashboard Core Logic
export interface ClientComplianceMetrics {
  id: string
  client_id: string
  coach_id: string
  metric_date: string
  workout_compliance: number
  nutrition_compliance: number
  habit_compliance: number
  session_attendance: number
  overall_compliance: number
  engagement_score: number
  created_at: string
  updated_at: string
}

export interface ClientEngagement {
  id: string
  client_id: string
  coach_id: string
  engagement_date: string
  app_logins: number
  workout_sessions: number
  nutrition_logs: number
  habit_completions: number
  messages_sent: number
  progress_updates: number
  feature_usage: Record<string, any>
  session_duration: number
  created_at: string
  updated_at: string
}

export interface ClientMilestone {
  id: string
  client_id: string
  coach_id: string
  milestone_type: 'workout' | 'nutrition' | 'habit' | 'weight' | 'strength' | 'endurance' | 'flexibility' | 'general'
  milestone_name: string
  milestone_description?: string
  target_value: number
  current_value: number
  unit: string
  target_date?: string
  achieved_date?: string
  is_achieved: boolean
  priority: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
}

export interface ClientComplianceAlert {
  id: string
  client_id: string
  coach_id: string
  alert_type: 'low_compliance' | 'missed_workout' | 'nutrition_goal' | 'habit_streak' | 'low_engagement' | 'session_missed'
  alert_level: 'info' | 'warning' | 'critical'
  alert_message: string
  alert_data: Record<string, any>
  is_resolved: boolean
  resolved_at?: string
  resolved_by?: string
  created_at: string
  updated_at: string
}

export interface ClientComplianceReport {
  id: string
  client_id: string
  coach_id: string
  report_type: 'weekly' | 'monthly' | 'quarterly' | 'custom'
  report_period_start: string
  report_period_end: string
  report_data: Record<string, any>
  summary?: string
  recommendations?: string
  is_generated: boolean
  generated_at?: string
  created_at: string
  updated_at: string
}

export interface ClientComplianceSettings {
  id: string
  client_id: string
  coach_id: string
  compliance_thresholds: Record<string, number>
  alert_preferences: Record<string, any>
  reporting_preferences: Record<string, any>
  notification_settings: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ClientProfile {
  id: string
  first_name?: string
  last_name?: string
  email: string
  fitness_level?: string
  goals?: string[]
  join_date: string
  last_active?: string
}

export interface ComplianceDashboardData {
  client: ClientProfile
  compliance: ClientComplianceMetrics
  engagement: ClientEngagement
  milestones: ClientMilestone[]
  alerts: ClientComplianceAlert[]
  trends: {
    compliance_trend: 'up' | 'down' | 'stable'
    engagement_trend: 'up' | 'down' | 'stable'
    workout_trend: 'up' | 'down' | 'stable'
    nutrition_trend: 'up' | 'down' | 'stable'
  }
  insights: string[]
  recommendations: string[]
}

export class ClientComplianceTracker {
  private static readonly COMPLIANCE_THRESHOLDS = {
    excellent: 90,
    good: 75,
    fair: 60,
    poor: 50,
    critical: 30
  }

  private static readonly ENGAGEMENT_THRESHOLDS = {
    high: 80,
    medium: 60,
    low: 40,
    very_low: 20
  }

  private static readonly MILESTONE_TYPES = {
    workout: { icon: '🏋️', color: '#10B981' },
    nutrition: { icon: '🥗', color: '#F59E0B' },
    habit: { icon: '⚡', color: '#8B5CF6' },
    weight: { icon: '⚖️', color: '#EF4444' },
    strength: { icon: '💪', color: '#3B82F6' },
    endurance: { icon: '❤️', color: '#EC4899' },
    flexibility: { icon: '🤸', color: '#06B6D4' },
    general: { icon: '🎯', color: '#6366F1' }
  }

  /**
   * Calculate compliance score for a client
   */
  static calculateComplianceScore(
    workoutCompliance: number,
    nutritionCompliance: number,
    habitCompliance: number,
    sessionAttendance: number
  ): number {
    // Weighted average: workouts 40%, nutrition 30%, habits 20%, sessions 10%
    return Math.round(
      (workoutCompliance * 0.4) +
      (nutritionCompliance * 0.3) +
      (habitCompliance * 0.2) +
      (sessionAttendance * 0.1)
    )
  }

  /**
   * Calculate engagement score based on various metrics
   */
  static calculateEngagementScore(engagement: ClientEngagement): number {
    const weights = {
      app_logins: 2,
      workout_sessions: 10,
      nutrition_logs: 5,
      habit_completions: 3,
      messages_sent: 5,
      progress_updates: 3
    }

    const score = 
      (engagement.app_logins * weights.app_logins) +
      (engagement.workout_sessions * weights.workout_sessions) +
      (engagement.nutrition_logs * weights.nutrition_logs) +
      (engagement.habit_completions * weights.habit_completions) +
      (engagement.messages_sent * weights.messages_sent) +
      (engagement.progress_updates * weights.progress_updates)

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Get compliance level based on score
   */
  static getComplianceLevel(score: number): {
    level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
    color: string
    description: string
  } {
    if (score >= this.COMPLIANCE_THRESHOLDS.excellent) {
      return {
        level: 'excellent',
        color: '#10B981',
        description: 'Outstanding compliance across all areas'
      }
    } else if (score >= this.COMPLIANCE_THRESHOLDS.good) {
      return {
        level: 'good',
        color: '#3B82F6',
        description: 'Good compliance with room for improvement'
      }
    } else if (score >= this.COMPLIANCE_THRESHOLDS.fair) {
      return {
        level: 'fair',
        color: '#F59E0B',
        description: 'Fair compliance, needs attention'
      }
    } else if (score >= this.COMPLIANCE_THRESHOLDS.poor) {
      return {
        level: 'poor',
        color: '#EF4444',
        description: 'Poor compliance, intervention needed'
      }
    } else {
      return {
        level: 'critical',
        color: '#DC2626',
        description: 'Critical compliance issues'
      }
    }
  }

  /**
   * Get engagement level based on score
   */
  static getEngagementLevel(score: number): {
    level: 'high' | 'medium' | 'low' | 'very_low'
    color: string
    description: string
  } {
    if (score >= this.ENGAGEMENT_THRESHOLDS.high) {
      return {
        level: 'high',
        color: '#10B981',
        description: 'Highly engaged and active'
      }
    } else if (score >= this.ENGAGEMENT_THRESHOLDS.medium) {
      return {
        level: 'medium',
        color: '#3B82F6',
        description: 'Moderately engaged'
      }
    } else if (score >= this.ENGAGEMENT_THRESHOLDS.low) {
      return {
        level: 'low',
        color: '#F59E0B',
        description: 'Low engagement, needs motivation'
      }
    } else {
      return {
        level: 'very_low',
        color: '#EF4444',
        description: 'Very low engagement, intervention required'
      }
    }
  }

  /**
   * Generate insights based on compliance data
   */
  static generateInsights(
    compliance: ClientComplianceMetrics,
    engagement: ClientEngagement,
    milestones: ClientMilestone[]
  ): string[] {
    const insights: string[] = []
    const complianceLevel = this.getComplianceLevel(compliance.overall_compliance)
    const engagementLevel = this.getEngagementLevel(compliance.engagement_score)

    // Compliance insights
    if (complianceLevel.level === 'excellent') {
      insights.push('Client is demonstrating excellent compliance across all areas. Keep up the great work!')
    } else if (complianceLevel.level === 'good') {
      insights.push('Client shows good overall compliance with some areas for improvement.')
    } else if (complianceLevel.level === 'fair') {
      insights.push('Client compliance is fair but needs attention to prevent further decline.')
    } else if (complianceLevel.level === 'poor') {
      insights.push('Client compliance is poor and requires immediate intervention.')
    } else {
      insights.push('Client compliance is critical and needs urgent attention.')
    }

    // Engagement insights
    if (engagementLevel.level === 'high') {
      insights.push('Client is highly engaged and actively using the platform.')
    } else if (engagementLevel.level === 'medium') {
      insights.push('Client shows moderate engagement with room for improvement.')
    } else if (engagementLevel.level === 'low') {
      insights.push('Client engagement is low and may need additional motivation.')
    } else {
      insights.push('Client engagement is very low and requires immediate intervention.')
    }

    // Specific area insights
    if (compliance.workout_compliance < 60) {
      insights.push('Workout compliance is below target. Consider program adjustments or additional support.')
    }
    if (compliance.nutrition_compliance < 60) {
      insights.push('Nutrition compliance needs improvement. Consider nutrition education or meal planning support.')
    }
    if (compliance.habit_compliance < 60) {
      insights.push('Habit compliance is low. Focus on building sustainable daily habits.')
    }

    // Milestone insights
    const achievedMilestones = milestones.filter(m => m.is_achieved)
    const upcomingMilestones = milestones.filter(m => !m.is_achieved && m.target_date)
    
    if (achievedMilestones.length > 0) {
      insights.push(`Client has achieved ${achievedMilestones.length} milestone(s) recently. Celebrate these wins!`)
    }
    
    if (upcomingMilestones.length > 0) {
      insights.push(`Client has ${upcomingMilestones.length} upcoming milestone(s). Use these as motivation.`)
    }

    return insights
  }

  /**
   * Generate recommendations based on compliance data
   */
  static generateRecommendations(
    compliance: ClientComplianceMetrics,
    engagement: ClientEngagement,
    alerts: ClientComplianceAlert[]
  ): string[] {
    const recommendations: string[] = []

    // Compliance-based recommendations
    if (compliance.overall_compliance < 70) {
      recommendations.push('Schedule a check-in call to understand barriers and provide support')
      recommendations.push('Consider simplifying the program to reduce overwhelm')
    }

    if (compliance.workout_compliance < 60) {
      recommendations.push('Review workout difficulty and adjust if too challenging')
      recommendations.push('Provide additional workout motivation and accountability')
    }

    if (compliance.nutrition_compliance < 60) {
      recommendations.push('Offer nutrition education sessions or meal planning support')
      recommendations.push('Consider simplifying nutrition tracking requirements')
    }

    if (compliance.habit_compliance < 60) {
      recommendations.push('Focus on building 1-2 key habits before adding more')
      recommendations.push('Provide habit-building education and support')
    }

    // Engagement-based recommendations
    if (compliance.engagement_score < 40) {
      recommendations.push('Reach out personally to understand what\'s preventing engagement')
      recommendations.push('Consider reducing app complexity or providing training')
    }

    if (engagement.messages_sent === 0) {
      recommendations.push('Encourage more communication and provide multiple contact channels')
    }

    if (engagement.app_logins < 3) {
      recommendations.push('Provide app usage training and highlight key features')
    }

    // Alert-based recommendations
    const criticalAlerts = alerts.filter((a: any) => a.alert_level === 'critical' && !a.is_resolved)
    if (criticalAlerts.length > 0) {
      recommendations.push('Address critical alerts immediately with direct client contact')
    }

    const warningAlerts = alerts.filter((a: any) => a.alert_level === 'warning' && !a.is_resolved)
    if (warningAlerts.length > 2) {
      recommendations.push('Multiple warning alerts suggest systemic issues that need addressing')
    }

    return recommendations
  }

  /**
   * Calculate trends based on historical data
   */
  static calculateTrends(
    currentMetrics: ClientComplianceMetrics,
    previousMetrics: ClientComplianceMetrics
  ): {
    compliance_trend: 'up' | 'down' | 'stable'
    engagement_trend: 'up' | 'down' | 'stable'
    workout_trend: 'up' | 'down' | 'stable'
    nutrition_trend: 'up' | 'down' | 'stable'
  } {
    const getTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
      const diff = current - previous
      if (diff > 5) return 'up'
      if (diff < -5) return 'down'
      return 'stable'
    }

    return {
      compliance_trend: getTrend(currentMetrics.overall_compliance, previousMetrics.overall_compliance),
      engagement_trend: getTrend(currentMetrics.engagement_score, previousMetrics.engagement_score),
      workout_trend: getTrend(currentMetrics.workout_compliance, previousMetrics.workout_compliance),
      nutrition_trend: getTrend(currentMetrics.nutrition_compliance, previousMetrics.nutrition_compliance)
    }
  }

  /**
   * Get milestone type info
   */
  static getMilestoneTypeInfo(type: string) {
    return this.MILESTONE_TYPES[type as keyof typeof this.MILESTONE_TYPES] || this.MILESTONE_TYPES.general
  }

  /**
   * Generate compliance report data
   */
  static generateComplianceReport(
    client: ClientProfile,
    compliance: ClientComplianceMetrics,
    engagement: ClientEngagement,
    milestones: ClientMilestone[],
    alerts: ClientComplianceAlert[],
    periodStart: string,
    periodEnd: string
  ): {
    summary: string
    recommendations: string[]
    keyMetrics: Record<string, any>
    trends: Record<string, any>
    achievements: string[]
    concerns: string[]
  } {
    const complianceLevel = this.getComplianceLevel(compliance.overall_compliance)
    const engagementLevel = this.getEngagementLevel(compliance.engagement_score)
    
    const summary = `${client.first_name || 'Client'} shows ${complianceLevel.level} compliance (${compliance.overall_compliance}%) and ${engagementLevel.level} engagement (${compliance.engagement_score}%) for the period ${periodStart} to ${periodEnd}.`
    
    const recommendations = this.generateRecommendations(compliance, engagement, alerts)
    
    const keyMetrics = {
      overall_compliance: compliance.overall_compliance,
      workout_compliance: compliance.workout_compliance,
      nutrition_compliance: compliance.nutrition_compliance,
      habit_compliance: compliance.habit_compliance,
      engagement_score: compliance.engagement_score,
      app_logins: engagement.app_logins,
      workout_sessions: engagement.workout_sessions,
      nutrition_logs: engagement.nutrition_logs,
      habit_completions: engagement.habit_completions
    }
    
    const trends = {
      compliance_level: complianceLevel.level,
      engagement_level: engagementLevel.level,
      primary_strengths: [] as string[],
      primary_concerns: [] as string[]
    }
    
    // Identify strengths and concerns
    if (compliance.workout_compliance >= 80) trends.primary_strengths.push('Workout consistency')
    if (compliance.nutrition_compliance >= 80) trends.primary_strengths.push('Nutrition adherence')
    if (compliance.habit_compliance >= 80) trends.primary_strengths.push('Habit formation')
    if (compliance.engagement_score >= 70) trends.primary_strengths.push('Platform engagement')
    
    if (compliance.workout_compliance < 60) trends.primary_concerns.push('Workout consistency')
    if (compliance.nutrition_compliance < 60) trends.primary_concerns.push('Nutrition adherence')
    if (compliance.habit_compliance < 60) trends.primary_concerns.push('Habit formation')
    if (compliance.engagement_score < 40) trends.primary_concerns.push('Platform engagement')
    
    const achievements = milestones.filter(m => m.is_achieved).map(m => m.milestone_name)
    const concerns = alerts.filter((a: any) => !a.is_resolved).map((a: any) => a.alert_message)
    
    return {
      summary,
      recommendations,
      keyMetrics,
      trends,
      achievements,
      concerns
    }
  }

  /**
   * Validate compliance data
   */
  static validateComplianceData(data: Partial<ClientComplianceMetrics>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!data.client_id) {
      errors.push('Client ID is required')
    }

    if (!data.coach_id) {
      errors.push('Coach ID is required')
    }

    if (data.workout_compliance !== undefined && (data.workout_compliance < 0 || data.workout_compliance > 100)) {
      errors.push('Workout compliance must be between 0 and 100')
    }

    if (data.nutrition_compliance !== undefined && (data.nutrition_compliance < 0 || data.nutrition_compliance > 100)) {
      errors.push('Nutrition compliance must be between 0 and 100')
    }

    if (data.habit_compliance !== undefined && (data.habit_compliance < 0 || data.habit_compliance > 100)) {
      errors.push('Habit compliance must be between 0 and 100')
    }

    if (data.session_attendance !== undefined && (data.session_attendance < 0 || data.session_attendance > 100)) {
      errors.push('Session attendance must be between 0 and 100')
    }

    if (data.overall_compliance !== undefined && (data.overall_compliance < 0 || data.overall_compliance > 100)) {
      errors.push('Overall compliance must be between 0 and 100')
    }

    if (data.engagement_score !== undefined && (data.engagement_score < 0 || data.engagement_score > 100)) {
      errors.push('Engagement score must be between 0 and 100')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
