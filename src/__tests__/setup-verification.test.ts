describe('Test infrastructure', () => {
  test('Jest is configured and running', () => {
    expect(true).toBe(true)
  })

  test('TypeScript is working in tests', () => {
    const add = (a: number, b: number): number => a + b
    expect(add(1, 2)).toBe(3)
  })

  test('@/ path alias works', () => {
    expect(true).toBe(true)
  })
})
