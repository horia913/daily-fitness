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

  test('formatPropertyPreviewValue uses min RIR for working set', () => {
    const values = [3, 2, 1]
    expect(representativeSetValue('rir', values)).toBe(1)
    expect(formatPropertyPreviewValue('rir', values)).toBe('1')
  })
})
