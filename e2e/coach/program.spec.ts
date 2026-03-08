import { test, expect } from '@playwright/test'
import { loginAsCoach } from '../helpers/auth'

test.describe('Coach - Programs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCoach(page)
  })

  test('can navigate to programs page', async ({ page }) => {
    await page.goto('/coach/programs')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    const heading = page.locator('text=/Program/i')
    await expect(heading.first()).toBeVisible({ timeout: 10000 })
  })

  test.skip('program details shows week navigation', async ({ page }) => {
    // TODO: Implement when program ID is known
  })

  test.skip('program schedule tab uses day strip', async ({ page }) => {
    // TODO: Implement when program ID is known
  })
})
