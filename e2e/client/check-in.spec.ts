import { test, expect } from '@playwright/test'
import { loginAsClient } from '../helpers/auth'

/**
 * Client check-in tests.
 */

test.describe('Client - Check-in', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page)
  })

  test('can navigate to check-in page', async ({ page }) => {
    await page.goto('/client/check-ins')
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const heading = page.locator('text=/Check.?in|Wellness|Daily/i')
    await expect(heading.first()).toBeVisible({ timeout: 10000 })
  })

  test.skip('can complete a check-in', async ({ page }) => {
    // STUB: Full check-in flow
    // TODO: Implement
  })
})
