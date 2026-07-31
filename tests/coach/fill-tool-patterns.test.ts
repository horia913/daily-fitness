import { describe, expect, test } from '@jest/globals'
import {
  holdPattern,
  linearPattern,
  stepPattern,
  wavePattern,
} from '@/lib/programs/fillTool/patterns'

describe('fill tool patterns', () => {
  test('linear: 70 + 2.5 per week for 6 weeks', () => {
    const values = [0, 1, 2, 3, 4, 5].map((i) => linearPattern(70, 2.5, i))
    expect(values).toEqual([70, 72.5, 75, 77.5, 80, 82.5])
  })

  test('hold stays flat', () => {
    expect([0, 1, 2, 3].map((i) => holdPattern(70, i))).toEqual([70, 70, 70, 70])
  })

  test('step: hold 2 then jump 5 from baseline 70', () => {
    const values = [0, 1, 2, 3, 4, 5].map((i) => stepPattern(70, 2, 5, i))
    expect(values).toEqual([70, 70, 75, 75, 80, 80])
  })

  test('wave: overlapping cycles with independent withinStep and cycleStep', () => {
    const b = 70
    const waveLength = 3
    const withinStep = 5
    const cycleStep = 2.5
    const values = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
      wavePattern(b, waveLength, withinStep, cycleStep, i),
    )
    expect(values).toEqual([70, 75, 80, 72.5, 77.5, 82.5, 75, 80, 85])
  })
})
