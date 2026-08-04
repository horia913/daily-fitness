import { describe, expect, test } from '@jest/globals'
import {
  formatPropertyPreviewValue,
  formatPropertyValues,
  representativeSetValue,
} from '@/lib/programs/fillTool/properties'

describe('fill tool preview display', () => {
  test('formatPropertyPreviewValue shows top set for load_pct', () => {
    const values = [82.5, 77.5, 87.5]
    expect(representativeSetValue('load_pct', values)).toBe(87.5)
    expect(formatPropertyPreviewValue('load_pct', values)).toBe('87.5%')
    expect(formatPropertyValues('load_pct', values)).toBe('82.5/77.5/87.5%')
  })

  test('formatPropertyPreviewValue uses min RPE for working set', () => {
    const values = [8, 7, 6]
    expect(representativeSetValue('rpe', values)).toBe(6)
    expect(formatPropertyPreviewValue('rpe', values)).toBe('6')
  })
})
