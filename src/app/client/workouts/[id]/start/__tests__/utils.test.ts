import { isValidUuid, calculatePlateLoading } from '../utils'

describe('isValidUuid', () => {
  test('returns true for valid UUID v4', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  test('returns false for empty string', () => {
    expect(isValidUuid('')).toBe(false)
  })

  test('returns false for temp- prefixed IDs', () => {
    expect(isValidUuid('temp-1708531200000')).toBe(false)
  })

  test('returns false for random strings', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false)
  })

  test('returns false for null/undefined', () => {
    expect(isValidUuid(null as any)).toBe(false)
    expect(isValidUuid(undefined as any)).toBe(false)
  })
})

describe('calculatePlateLoading', () => {
  test('returns empty plates for barbell-only weight', () => {
    const result = calculatePlateLoading(20, 20)
    expect(result.barbellWeight).toBe(20)
    expect(result.option1.plates).toEqual([])
    expect(result.option2.plates).toEqual([])
    expect(result.option1.remainder).toBe(0)
    expect(result.option2.remainder).toBe(0)
  })

  test('calculates correct plates for standard weight', () => {
    const result = calculatePlateLoading(60, 20)
    expect(result.barbellWeight).toBe(20)
    expect(result.option1.plates.length).toBeGreaterThan(0)
    expect(result.option1.plates.some((p) => p.weight === 20 && p.count >= 1)).toBe(
      true
    )
    expect(result.option1.remainder).toBe(0)
  })

  test('handles weight that requires mixed plates', () => {
    const result = calculatePlateLoading(85, 20)
    expect(result.barbellWeight).toBe(20)
    const totalOption1 = result.option1.plates.reduce(
      (sum, p) => sum + p.weight * p.count,
      0
    )
    expect(totalOption1).toBe(32.5)
    expect(result.option1.remainder).toBe(0)
  })

  test('handles weight less than barbell', () => {
    const result = calculatePlateLoading(15, 20)
    expect(result.option1.plates).toEqual([])
    expect(result.option2.plates).toEqual([])
    expect(result.option1.remainder).toBeLessThan(0)
    expect(result.option2.remainder).toBeLessThan(0)
  })
})
