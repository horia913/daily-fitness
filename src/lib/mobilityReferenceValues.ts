/**
 * Reference values and ranges for mobility assessments
 * Used for displaying color-coded indicators and guidance
 */

export interface ReferenceValue {
  field: string
  label: string
  unit: string
  normalRange: { min: number; max: number }
  target: number
  poorRange?: { min: number; max: number }
  excellentRange?: { min: number; max: number }
}

export interface AssessmentTypeReference {
  type: 'shoulder' | 'hip' | 'ankle' | 'spine' | 'overall'
  fields: ReferenceValue[]
}

export const MOBILITY_REFERENCE_VALUES: Record<string, AssessmentTypeReference> = {
  shoulder: {
    type: 'shoulder',
    fields: [
      {
        field: 'ir',
        label: 'Internal Rotation (IR)',
        unit: '°',
        normalRange: { min: 60, max: 90 },
        target: 70,
        poorRange: { min: 0, max: 45 },
        excellentRange: { min: 70, max: 90 }
      },
      {
        field: 'er',
        label: 'External Rotation (ER)',
        unit: '°',
        normalRange: { min: 60, max: 90 },
        target: 70,
        poorRange: { min: 0, max: 45 },
        excellentRange: { min: 70, max: 90 }
      },
      {
        field: 'abduction',
        label: 'Abduction',
        unit: '°',
        normalRange: { min: 160, max: 180 },
        target: 170,
        poorRange: { min: 0, max: 120 },
        excellentRange: { min: 170, max: 180 }
      },
      {
        field: 'flexion',
        label: 'Flexion',
        unit: '°',
        normalRange: { min: 150, max: 180 },
        target: 165,
        poorRange: { min: 0, max: 120 },
        excellentRange: { min: 165, max: 180 }
      }
    ]
  },
  hip: {
    type: 'hip',
    fields: [
      {
        field: 'ir',
        label: 'Internal Rotation (IR)',
        unit: '°',
        normalRange: { min: 30, max: 45 },
        target: 35,
        poorRange: { min: 0, max: 20 },
        excellentRange: { min: 35, max: 45 }
      },
      {
        field: 'er',
        label: 'External Rotation (ER)',
        unit: '°',
        normalRange: { min: 40, max: 60 },
        target: 50,
        poorRange: { min: 0, max: 30 },
        excellentRange: { min: 50, max: 60 }
      },
      {
        field: 'straight_leg_raise',
        label: 'Straight Leg Raise',
        unit: '°',
        normalRange: { min: 70, max: 90 },
        target: 80,
        poorRange: { min: 0, max: 60 },
        excellentRange: { min: 80, max: 90 }
      },
      {
        field: 'knee_to_chest',
        label: 'Knee to Chest',
        unit: '°',
        normalRange: { min: 120, max: 140 },
        target: 130,
        poorRange: { min: 0, max: 100 },
        excellentRange: { min: 130, max: 140 }
      }
    ]
  },
  ankle: {
    type: 'ankle',
    fields: [
      {
        field: 'plantar_flexion',
        label: 'Plantar Flexion',
        unit: '°',
        normalRange: { min: 40, max: 50 },
        target: 45,
        poorRange: { min: 0, max: 30 },
        excellentRange: { min: 45, max: 50 }
      }
    ]
  },
  spine: {
    type: 'spine',
    fields: [
      {
        field: 'forward_lean',
        label: 'Forward Lean',
        unit: '°',
        normalRange: { min: 0, max: 10 },
        target: 5,
        poorRange: { min: 15, max: 90 },
        excellentRange: { min: 0, max: 5 }
      }
    ]
  },
  overall: {
    type: 'overall',
    fields: [
      {
        field: 'toe_touch',
        label: 'Toe Touch',
        unit: 'cm',
        normalRange: { min: 0, max: 5 },
        target: 0,
        poorRange: { min: 15, max: 100 },
        excellentRange: { min: -5, max: 0 } // Negative = beyond toes
      },
      {
        field: 'squat_depth',
        label: 'Squat Depth',
        unit: '°',
        normalRange: { min: 90, max: 120 },
        target: 110,
        poorRange: { min: 0, max: 70 },
        excellentRange: { min: 110, max: 120 }
      }
    ]
  }
}

/**
 * Get color based on value compared to reference ranges
 */
export function getValueColor(value: number | undefined, reference: ReferenceValue): 'green' | 'yellow' | 'red' | 'gray' {
  if (value === undefined || value === null) return 'gray'
  
  const { normalRange, poorRange, excellentRange } = reference
  
  // Check excellent range first (best)
  if (excellentRange && value >= excellentRange.min && value <= excellentRange.max) {
    return 'green'
  }
  
  // Check normal range (good)
  if (value >= normalRange.min && value <= normalRange.max) {
    return 'green'
  }
  
  // Check poor range (needs improvement)
  if (poorRange && value >= poorRange.min && value <= poorRange.max) {
    return 'red'
  }
  
  // Values outside poor range but below normal are yellow
  if (poorRange && value > poorRange.max && value < normalRange.min) {
    return 'yellow'
  }
  
  // Values above normal/excellent are yellow
  if (excellentRange && value > excellentRange.max) {
    return 'yellow'
  }
  
  return 'yellow'
}

/**
 * Get reference value for a specific field
 */
export function getReferenceValue(
  assessmentType: 'shoulder' | 'hip' | 'ankle' | 'spine' | 'overall',
  fieldName: string
): ReferenceValue | undefined {
  const assessment = MOBILITY_REFERENCE_VALUES[assessmentType]
  if (!assessment) return undefined
  
  return assessment.fields.find(f => 
    fieldName.includes(f.field) || 
    fieldName.toLowerCase().replace(/_/g, '').includes(f.field)
  )
}

/**
 * Format reference display text
 */
export function formatReferenceText(reference: ReferenceValue): string {
  const { normalRange, target, unit } = reference
  return `Normal: ${normalRange.min}-${normalRange.max}${unit} | Target: ${target}${unit}`
}

