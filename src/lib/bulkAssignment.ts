// Bulk Assignment Core Logic
export interface BulkAssignment {
  id: string
  coach_id: string
  operation_name: string
  operation_type: 'program' | 'workout' | 'meal_plan'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  total_items: number
  processed_items: number
  failed_items: number
  success_items: number
  operation_data: BulkOperationData
  error_log: string[]
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface BulkAssignmentItem {
  id: string
  bulk_assignment_id: string
  client_id: string
  item_type: 'program' | 'workout' | 'meal_plan'
  item_id: string
  assignment_data: Record<string, any>
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  error_message?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface BulkAssignmentTemplate {
  id: string
  coach_id: string
  template_name: string
  template_description?: string
  template_type: 'program' | 'workout' | 'meal_plan'
  template_data: Record<string, any>
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface BulkAssignmentSchedule {
  id: string
  coach_id: string
  schedule_name: string
  schedule_description?: string
  schedule_type: 'program' | 'workout' | 'meal_plan'
  schedule_data: Record<string, any>
  schedule_frequency: 'once' | 'weekly' | 'monthly'
  next_run_at?: string
  last_run_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BulkOperationData {
  items: BulkOperationItem[]
  settings: BulkOperationSettings
  metadata: {
    created_by: string
    created_at: string
    estimated_duration?: string
    notes?: string
  }
}

export interface BulkOperationItem {
  program_id?: string
  workout_id?: string
  meal_plan_id?: string
  client_ids: string[]
  start_date: string
  notes?: string
  custom_settings?: Record<string, any>
}

export interface BulkOperationSettings {
  start_date: string
  default_notes?: string
  skip_existing_assignments: boolean
  send_notifications: boolean
  auto_schedule: boolean
  validation_level: 'strict' | 'moderate' | 'lenient'
}

export interface Client {
  id: string
  first_name?: string
  last_name?: string
  email: string
  fitness_level?: string
  goals?: string[]
  join_date: string
  last_active?: string
}

export interface Program {
  id: string
  name: string
  description?: string
  duration_weeks: number
  difficulty_level: string
  target_audience?: string
  coach_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BulkAssignmentStats {
  total_operations: number
  completed_operations: number
  failed_operations: number
  pending_operations: number
  total_items_assigned: number
  success_rate: number
}

export interface BulkAssignmentValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

export class BulkAssignmentManager {
  private static readonly VALIDATION_RULES = {
    strict: {
      max_clients_per_operation: 50,
      max_operations_per_day: 10,
      require_client_confirmation: true,
      validate_fitness_levels: true,
      validate_schedule_conflicts: true
    },
    moderate: {
      max_clients_per_operation: 100,
      max_operations_per_day: 20,
      require_client_confirmation: false,
      validate_fitness_levels: true,
      validate_schedule_conflicts: false
    },
    lenient: {
      max_clients_per_operation: 200,
      max_operations_per_day: 50,
      require_client_confirmation: false,
      validate_fitness_levels: false,
      validate_schedule_conflicts: false
    }
  }

  /**
   * Validate bulk assignment data
   */
  static validateBulkAssignment(
    operationData: BulkOperationData,
    operationType: 'program' | 'workout' | 'meal_plan',
    validationLevel: 'strict' | 'moderate' | 'lenient' = 'moderate'
  ): BulkAssignmentValidation {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []
    const rules = this.VALIDATION_RULES[validationLevel]

    // Validate operation data structure
    if (!operationData.items || !Array.isArray(operationData.items)) {
      errors.push('Operation data must contain an items array')
    }

    if (!operationData.settings) {
      errors.push('Operation data must contain settings')
    }

    if (!operationData.metadata) {
      errors.push('Operation data must contain metadata')
    }

    // Validate items
    if (operationData.items) {
      const totalClients = operationData.items.reduce((sum, item) => sum + item.client_ids.length, 0)
      
      if (totalClients > rules.max_clients_per_operation) {
        errors.push(`Too many clients selected. Maximum allowed: ${rules.max_clients_per_operation}`)
      }

      if (totalClients > 100) {
        warnings.push('Large number of clients selected. Consider breaking into smaller batches.')
      }

      // Validate each item
      operationData.items.forEach((item, index) => {
        if (!item.client_ids || item.client_ids.length === 0) {
          errors.push(`Item ${index + 1}: No clients selected`)
        }

        if (!item.start_date) {
          errors.push(`Item ${index + 1}: Start date is required`)
        } else {
          const startDate = new Date(item.start_date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          if (startDate < today) {
            errors.push(`Item ${index + 1}: Start date cannot be in the past`)
          }
        }

        // Validate based on operation type
        if (operationType === 'program' && !item.program_id) {
          errors.push(`Item ${index + 1}: Program ID is required for program assignments`)
        }

        if (operationType === 'workout' && !item.workout_id) {
          errors.push(`Item ${index + 1}: Workout ID is required for workout assignments`)
        }

        if (operationType === 'meal_plan' && !item.meal_plan_id) {
          errors.push(`Item ${index + 1}: Meal plan ID is required for meal plan assignments`)
        }
      })
    }

    // Validate settings
    if (operationData.settings) {
      if (!operationData.settings.start_date) {
        errors.push('Default start date is required in settings')
      }

      if (operationData.settings.skip_existing_assignments === undefined) {
        warnings.push('Skip existing assignments setting not specified. Defaulting to false.')
      }

      if (operationData.settings.send_notifications === undefined) {
        warnings.push('Send notifications setting not specified. Defaulting to true.')
      }
    }

    // Generate suggestions
    if (operationData.items && operationData.items.length > 5) {
      suggestions.push('Consider creating a template for this bulk assignment for future use')
    }

    // Calculate totalClients for suggestions (count unique clients across all items)
    const totalClients = operationData.items 
      ? new Set(operationData.items.flatMap(item => item.client_ids || [])).size
      : 0

    if (totalClients > 20) {
      suggestions.push('Consider scheduling this operation during off-peak hours')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Create bulk assignment operation
   */
  static async createBulkAssignment(
    coachId: string,
    operationName: string,
    operationType: 'program' | 'workout' | 'meal_plan',
    operationData: BulkOperationData
  ): Promise<BulkAssignment> {
    const validation = this.validateBulkAssignment(operationData, operationType)
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    // Calculate total items
    const totalItems = operationData.items.reduce((sum, item) => sum + item.client_ids.length, 0)

    const bulkAssignment: Omit<BulkAssignment, 'id' | 'created_at' | 'updated_at'> = {
      coach_id: coachId,
      operation_name: operationName,
      operation_type: operationType,
      status: 'pending',
      total_items: totalItems,
      processed_items: 0,
      failed_items: 0,
      success_items: 0,
      operation_data: operationData,
      error_log: []
    }

    return bulkAssignment as BulkAssignment
  }

  /**
   * Generate bulk assignment items
   */
  static generateBulkAssignmentItems(
    bulkAssignmentId: string,
    operationData: BulkOperationData,
    operationType: 'program' | 'workout' | 'meal_plan'
  ): Omit<BulkAssignmentItem, 'id' | 'created_at' | 'updated_at'>[] {
    const items: Omit<BulkAssignmentItem, 'id' | 'created_at' | 'updated_at'>[] = []

    operationData.items.forEach(operationItem => {
      operationItem.client_ids.forEach(clientId => {
        const assignmentData = {
          program: operationItem.program_id ? { id: operationItem.program_id } : undefined,
          workout: operationItem.workout_id ? { id: operationItem.workout_id } : undefined,
          meal_plan: operationItem.meal_plan_id ? { id: operationItem.meal_plan_id } : undefined,
          client: { id: clientId },
          start_date: operationItem.start_date,
          notes: operationItem.notes || operationData.settings.default_notes || '',
          custom_settings: operationItem.custom_settings || {}
        }

        items.push({
          bulk_assignment_id: bulkAssignmentId,
          client_id: clientId,
          item_type: operationType,
          item_id: operationItem.program_id || operationItem.workout_id || operationItem.meal_plan_id || '',
          assignment_data: assignmentData,
          status: 'pending'
        })
      })
    })

    return items
  }

  /**
   * Calculate estimated completion time
   */
  static calculateEstimatedCompletionTime(
    totalItems: number,
    operationType: 'program' | 'workout' | 'meal_plan'
  ): string {
    const baseTimePerItem = {
      program: 2, // seconds per program assignment
      workout: 1, // seconds per workout assignment
      meal_plan: 1.5 // seconds per meal plan assignment
    }

    const totalSeconds = totalItems * baseTimePerItem[operationType]
    
    if (totalSeconds < 60) {
      return `${Math.ceil(totalSeconds)} seconds`
    } else if (totalSeconds < 3600) {
      return `${Math.ceil(totalSeconds / 60)} minutes`
    } else {
      return `${Math.ceil(totalSeconds / 3600)} hours`
    }
  }

  /**
   * Generate bulk assignment preview
   */
  static generateBulkAssignmentPreview(
    operationData: BulkOperationData,
    operationType: 'program' | 'workout' | 'meal_plan',
    programs?: Program[],
    clients?: Client[]
  ): {
    summary: {
      totalItems: number
      totalClients: number
      estimatedDuration: string
      operationType: string
    }
    items: Array<{
      item: BulkOperationItem
      itemName: string
      clientCount: number
      clientNames: string[]
    }>
    warnings: string[]
  } {
    const totalItems = operationData.items.reduce((sum, item) => sum + item.client_ids.length, 0)
    const totalClients = new Set(operationData.items.flatMap(item => item.client_ids)).size
    const estimatedDuration = this.calculateEstimatedCompletionTime(totalItems, operationType)

    const items = operationData.items.map(item => {
      let itemName = 'Unknown Item'
      
      if (operationType === 'program' && programs) {
        const program = programs.find(p => p.id === item.program_id)
        itemName = program?.name || 'Unknown Program'
      } else if (operationType === 'workout') {
        itemName = 'Workout Assignment'
      } else if (operationType === 'meal_plan') {
        itemName = 'Meal Plan Assignment'
      }

      const clientNames = clients 
        ? item.client_ids.map(clientId => {
            const client = clients.find(c => c.id === clientId)
            return client ? `${client.first_name} ${client.last_name}` : 'Unknown Client'
          })
        : []

      return {
        item,
        itemName,
        clientCount: item.client_ids.length,
        clientNames
      }
    })

    const warnings: string[] = []
    
    if (totalItems > 100) {
      warnings.push('Large number of assignments. Consider breaking into smaller batches.')
    }

    if (totalClients > 50) {
      warnings.push('Many clients selected. Ensure all clients are appropriate for this assignment.')
    }

    const duplicateClients = operationData.items.flatMap(item => item.client_ids)
      .filter((clientId, index, array) => array.indexOf(clientId) !== index)
    
    if (duplicateClients.length > 0) {
      warnings.push(`${duplicateClients.length} clients appear in multiple assignments.`)
    }

    return {
      summary: {
        totalItems,
        totalClients,
        estimatedDuration,
        operationType
      },
      items,
      warnings
    }
  }

  /**
   * Create bulk assignment template
   */
  static createBulkAssignmentTemplate(
    coachId: string,
    templateName: string,
    templateDescription: string,
    templateType: 'program' | 'workout' | 'meal_plan',
    templateData: Record<string, any>
  ): Omit<BulkAssignmentTemplate, 'id' | 'created_at' | 'updated_at'> {
    return {
      coach_id: coachId,
      template_name: templateName,
      template_description: templateDescription,
      template_type: templateType,
      template_data: templateData,
      is_active: true,
      usage_count: 0
    }
  }

  /**
   * Validate template data
   */
  static validateTemplateData(
    templateData: Record<string, any>,
    templateType: 'program' | 'workout' | 'meal_plan'
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!templateData.items || !Array.isArray(templateData.items)) {
      errors.push('Template must contain items array')
    }

    if (!templateData.settings) {
      errors.push('Template must contain settings')
    }

    if (templateData.items) {
      templateData.items.forEach((item: any, index: number) => {
        if (!item.client_ids || item.client_ids.length === 0) {
          errors.push(`Item ${index + 1}: No clients specified`)
        }

        if (templateType === 'program' && !item.program_id) {
          errors.push(`Item ${index + 1}: Program ID required`)
        }

        if (templateType === 'workout' && !item.workout_id) {
          errors.push(`Item ${index + 1}: Workout ID required`)
        }

        if (templateType === 'meal_plan' && !item.meal_plan_id) {
          errors.push(`Item ${index + 1}: Meal plan ID required`)
        }
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get bulk assignment statistics
   */
  static calculateBulkAssignmentStats(assignments: BulkAssignment[]): BulkAssignmentStats {
    const totalOperations = assignments.length
    const completedOperations = assignments.filter(a => a.status === 'completed').length
    const failedOperations = assignments.filter(a => a.status === 'failed').length
    const pendingOperations = assignments.filter(a => a.status === 'pending' || a.status === 'processing').length
    const totalItemsAssigned = assignments.reduce((sum, a) => sum + a.success_items, 0)
    const successRate = totalOperations > 0 ? (completedOperations / totalOperations) * 100 : 0

    return {
      total_operations: totalOperations,
      completed_operations: completedOperations,
      failed_operations: failedOperations,
      pending_operations: pendingOperations,
      total_items_assigned: totalItemsAssigned,
      success_rate: successRate
    }
  }

  /**
   * Generate bulk assignment report
   */
  static generateBulkAssignmentReport(
    assignment: BulkAssignment,
    items: BulkAssignmentItem[],
    clients?: Client[],
    programs?: Program[]
  ): {
    summary: string
    details: {
      operationName: string
      operationType: string
      status: string
      totalItems: number
      successItems: number
      failedItems: number
      successRate: number
      duration: string
    }
    items: Array<{
      clientName: string
      itemName: string
      status: string
      errorMessage?: string
    }>
    recommendations: string[]
  } {
    const successRate = assignment.total_items > 0 ? (assignment.success_items / assignment.total_items) * 100 : 0
    const duration = assignment.completed_at 
      ? this.calculateDuration(assignment.created_at, assignment.completed_at)
      : 'In Progress'

    const summary = `Bulk ${assignment.operation_type} assignment "${assignment.operation_name}" ${assignment.status}. ` +
      `${assignment.success_items} of ${assignment.total_items} items completed successfully ` +
      `(${successRate.toFixed(1)}% success rate).`

    const itemDetails = items.map(item => {
      const client = clients?.find(c => c.id === item.client_id)
      const clientName = client ? `${client.first_name} ${client.last_name}` : 'Unknown Client'
      
      let itemName = 'Unknown Item'
      if (assignment.operation_type === 'program' && programs) {
        const program = programs.find(p => p.id === item.item_id)
        itemName = program?.name || 'Unknown Program'
      }

      return {
        clientName,
        itemName,
        status: item.status,
        errorMessage: item.error_message
      }
    })

    const recommendations: string[] = []
    
    if (assignment.failed_items > 0) {
      recommendations.push('Review failed items and retry if necessary')
    }

    if (successRate < 80) {
      recommendations.push('Consider reviewing assignment criteria and client compatibility')
    }

    if (assignment.status === 'completed' && successRate === 100) {
      recommendations.push('Excellent! All assignments completed successfully')
    }

    return {
      summary,
      details: {
        operationName: assignment.operation_name,
        operationType: assignment.operation_type,
        status: assignment.status,
        totalItems: assignment.total_items,
        successItems: assignment.success_items,
        failedItems: assignment.failed_items,
        successRate,
        duration
      },
      items: itemDetails,
      recommendations
    }
  }

  /**
   * Calculate duration between two timestamps
   */
  private static calculateDuration(startTime: string, endTime: string): string {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m`
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds % 60}s`
    } else {
      return `${diffSeconds}s`
    }
  }
}
