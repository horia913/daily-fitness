// Plate Calculator System for Weight Training
export interface Plate {
  weight: number
  unit: 'kg' | 'lb'
  color: string
  size: 'small' | 'medium' | 'large'
  count: number
}

export interface PlateSet {
  plates: Plate[]
  totalWeight: number
  unit: 'kg' | 'lb'
  barWeight: number
}

export interface PlateCalculationResult {
  plates: Plate[]
  totalWeight: number
  barWeight: number
  platesPerSide: Plate[]
  totalPlatesPerSide: number
  isValid: boolean
  error?: string
  alternativeWeights?: number[]
}

export interface GymConfiguration {
  name: string
  plates: Plate[]
  barWeight: number
  unit: 'kg' | 'lb'
  description?: string
}

export class PlateCalculator {
  // Standard gym plate configurations
  private static readonly STANDARD_PLATES_KG: Plate[] = [
    { weight: 25, unit: 'kg', color: '#FF0000', size: 'large', count: 0 },
    { weight: 20, unit: 'kg', color: '#0000FF', size: 'large', count: 0 },
    { weight: 15, unit: 'kg', color: '#FFFF00', size: 'medium', count: 0 },
    { weight: 10, unit: 'kg', color: '#00FF00', size: 'medium', count: 0 },
    { weight: 5, unit: 'kg', color: '#FF00FF', size: 'small', count: 0 },
    { weight: 2.5, unit: 'kg', color: '#00FFFF', size: 'small', count: 0 },
    { weight: 1.25, unit: 'kg', color: '#FFA500', size: 'small', count: 0 },
    { weight: 0.5, unit: 'kg', color: '#800080', size: 'small', count: 0 }
  ]

  private static readonly STANDARD_PLATES_LB: Plate[] = [
    { weight: 45, unit: 'lb', color: '#FF0000', size: 'large', count: 0 },
    { weight: 35, unit: 'lb', color: '#0000FF', size: 'large', count: 0 },
    { weight: 25, unit: 'lb', color: '#FFFF00', size: 'medium', count: 0 },
    { weight: 10, unit: 'lb', color: '#00FF00', size: 'medium', count: 0 },
    { weight: 5, unit: 'lb', color: '#FF00FF', size: 'small', count: 0 },
    { weight: 2.5, unit: 'lb', color: '#00FFFF', size: 'small', count: 0 },
    { weight: 1.25, unit: 'lb', color: '#FFA500', size: 'small', count: 0 },
    { weight: 0.5, unit: 'lb', color: '#800080', size: 'small', count: 0 }
  ]

  private static readonly BAR_WEIGHTS = {
    kg: { olympic: 20, standard: 15, ez: 10, hex: 15 },
    lb: { olympic: 45, standard: 35, ez: 20, hex: 35 }
  }

  /**
   * Calculate plates needed for a given total weight
   */
  static calculatePlates(
    totalWeight: number,
    barType: 'olympic' | 'standard' | 'ez' | 'hex' = 'olympic',
    unit: 'kg' | 'lb' = 'kg',
    availablePlates?: Plate[]
  ): PlateCalculationResult {
    const plates = availablePlates || (unit === 'kg' ? this.STANDARD_PLATES_KG : this.STANDARD_PLATES_LB)
    const barWeight = this.BAR_WEIGHTS[unit][barType]
    
    // Calculate weight needed on each side
    const weightPerSide = (totalWeight - barWeight) / 2
    
    if (weightPerSide < 0) {
      return {
        plates: [],
        totalWeight: barWeight,
        barWeight,
        platesPerSide: [],
        totalPlatesPerSide: 0,
        isValid: false,
        error: `Total weight (${totalWeight}${unit}) is less than bar weight (${barWeight}${unit})`
      }
    }

    // Sort plates by weight (descending)
    const sortedPlates = [...plates].sort((a, b) => b.weight - a.weight)
    
    let remainingWeight = weightPerSide
    const platesPerSide: Plate[] = []
    const usedPlates: Plate[] = []

    // Greedy algorithm to find minimum number of plates
    for (const plate of sortedPlates) {
      const maxPlates = Math.floor(remainingWeight / plate.weight)
      if (maxPlates > 0) {
        const platesToUse = Math.min(maxPlates, plate.count || Infinity)
        if (platesToUse > 0) {
          const plateCopy = { ...plate, count: platesToUse }
          platesPerSide.push(plateCopy)
          usedPlates.push({ ...plate, count: platesToUse * 2 }) // Both sides
          remainingWeight -= plate.weight * platesToUse
        }
      }
    }

    // Check if we can achieve the exact weight
    const isValid = Math.abs(remainingWeight) < 0.1 // Allow small tolerance for floating point

    // Calculate alternative weights if exact match not possible
    let alternativeWeights: number[] = []
    if (!isValid && remainingWeight > 0) {
      alternativeWeights = this.findAlternativeWeights(totalWeight, barWeight, plates, unit)
    }

    return {
      plates: usedPlates,
      totalWeight: barWeight + (weightPerSide * 2),
      barWeight,
      platesPerSide,
      totalPlatesPerSide: weightPerSide,
      isValid,
      error: isValid ? undefined : `Cannot achieve exact weight. Need ${remainingWeight.toFixed(2)}${unit} more per side.`,
      alternativeWeights
    }
  }

  /**
   * Find alternative weights close to the target
   */
  private static findAlternativeWeights(
    targetWeight: number,
    barWeight: number,
    plates: Plate[],
    unit: 'kg' | 'lb'
  ): number[] {
    const alternatives: number[] = []
    const sortedPlates = [...plates].sort((a, b) => b.weight - a.weight)
    
    // Try weights slightly above and below target
    const tolerance = unit === 'kg' ? 2.5 : 5 // 2.5kg or 5lb tolerance
    
    for (let offset = -tolerance; offset <= tolerance; offset += unit === 'kg' ? 1.25 : 2.5) {
      const testWeight = targetWeight + offset
      if (testWeight > barWeight) {
        const result = this.calculatePlates(testWeight, 'olympic', unit, plates)
        if (result.isValid) {
          alternatives.push(testWeight)
        }
      }
    }

    return alternatives.slice(0, 3) // Return up to 3 alternatives
  }

  /**
   * Convert weight between units
   */
  static convertWeight(weight: number, fromUnit: 'kg' | 'lb', toUnit: 'kg' | 'lb'): number {
    if (fromUnit === toUnit) return weight
    
    if (fromUnit === 'kg' && toUnit === 'lb') {
      return weight * 2.20462
    } else if (fromUnit === 'lb' && toUnit === 'kg') {
      return weight / 2.20462
    }
    
    return weight
  }

  /**
   * Get standard gym configurations
   */
  static getStandardConfigurations(): GymConfiguration[] {
    return [
      {
        name: 'Olympic Gym (KG)',
        plates: this.STANDARD_PLATES_KG.map(plate => ({ ...plate, count: 10 })),
        barWeight: 20,
        unit: 'kg',
        description: 'Standard Olympic gym with metric plates'
      },
      {
        name: 'Olympic Gym (LB)',
        plates: this.STANDARD_PLATES_LB.map(plate => ({ ...plate, count: 10 })),
        barWeight: 45,
        unit: 'lb',
        description: 'Standard Olympic gym with imperial plates'
      },
      {
        name: 'Home Gym (KG)',
        plates: this.STANDARD_PLATES_KG.slice(0, 6).map(plate => ({ ...plate, count: 4 })),
        barWeight: 20,
        unit: 'kg',
        description: 'Smaller home gym setup'
      },
      {
        name: 'Home Gym (LB)',
        plates: this.STANDARD_PLATES_LB.slice(0, 6).map(plate => ({ ...plate, count: 4 })),
        barWeight: 45,
        unit: 'lb',
        description: 'Smaller home gym setup'
      }
    ]
  }

  /**
   * Create custom gym configuration
   */
  static createCustomConfiguration(
    name: string,
    plates: Plate[],
    barWeight: number,
    unit: 'kg' | 'lb',
    description?: string
  ): GymConfiguration {
    return {
      name,
      plates: plates.map(plate => ({ ...plate, unit, count: plate.count || 0 })),
      barWeight,
      unit,
      description
    }
  }

  /**
   * Validate plate configuration
   */
  static validateConfiguration(config: GymConfiguration): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.name.trim()) {
      errors.push('Configuration name is required')
    }

    if (config.barWeight <= 0) {
      errors.push('Bar weight must be greater than 0')
    }

    if (config.plates.length === 0) {
      errors.push('At least one plate type is required')
    }

    // Check for duplicate weights
    const weights = config.plates.map(p => p.weight)
    const uniqueWeights = new Set(weights)
    if (weights.length !== uniqueWeights.size) {
      errors.push('Duplicate plate weights found')
    }

    // Check for negative weights
    if (config.plates.some(p => p.weight <= 0)) {
      errors.push('All plate weights must be greater than 0')
    }

    // Check for negative counts
    if (config.plates.some(p => p.count < 0)) {
      errors.push('Plate counts cannot be negative')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get plate visualization data
   */
  static getPlateVisualization(plates: Plate[]): {
    leftSide: Plate[]
    rightSide: Plate[]
    bar: { weight: number; unit: string }
  } {
    const leftSide: Plate[] = []
    const rightSide: Plate[] = []

    plates.forEach(plate => {
      const platesPerSide = Math.floor(plate.count / 2)
      if (platesPerSide > 0) {
        const leftPlate = { ...plate, count: platesPerSide }
        const rightPlate = { ...plate, count: platesPerSide }
        leftSide.push(leftPlate)
        rightSide.push(rightPlate)
      }
    })

    return {
      leftSide,
      rightSide,
      bar: { weight: 20, unit: 'kg' } // Default bar weight
    }
  }

  /**
   * Calculate 1RM from weight and reps
   */
  static calculate1RM(weight: number, reps: number): number {
    if (reps <= 0) return 0
    if (reps === 1) return weight
    
    // Epley formula: 1RM = weight * (1 + reps/30)
    return weight * (1 + reps / 30)
  }

  /**
   * Calculate working weight from 1RM percentage
   */
  static calculateWorkingWeight(oneRM: number, percentage: number): number {
    return (oneRM * percentage) / 100
  }

  /**
   * Get common weight progressions
   */
  static getWeightProgressions(currentWeight: number, unit: 'kg' | 'lb'): number[] {
    const increment = unit === 'kg' ? 2.5 : 5
    const progressions: number[] = []

    // Previous weights
    for (let i = 1; i <= 3; i++) {
      const weight = currentWeight - (increment * i)
      if (weight > 0) {
        progressions.unshift(weight)
      }
    }

    // Current weight
    progressions.push(currentWeight)

    // Next weights
    for (let i = 1; i <= 5; i++) {
      progressions.push(currentWeight + (increment * i))
    }

    return progressions
  }

  /**
   * Format weight for display
   */
  static formatWeight(weight: number, unit: 'kg' | 'lb', decimals: number = 1): string {
    return `${weight.toFixed(decimals)}${unit}`
  }

  /**
   * Get plate color by weight
   */
  static getPlateColor(weight: number, unit: 'kg' | 'lb'): string {
    const plates = unit === 'kg' ? this.STANDARD_PLATES_KG : this.STANDARD_PLATES_LB
    const plate = plates.find(p => p.weight === weight)
    return plate?.color || '#6B7280'
  }

  /**
   * Get plate size by weight
   */
  static getPlateSize(weight: number, unit: 'kg' | 'lb'): 'small' | 'medium' | 'large' {
    const plates = unit === 'kg' ? this.STANDARD_PLATES_KG : this.STANDARD_PLATES_LB
    const plate = plates.find(p => p.weight === weight)
    return plate?.size || 'small'
  }
}
