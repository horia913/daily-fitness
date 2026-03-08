import { test, expect } from '@playwright/test'
import { loginAsClient } from '../helpers/auth'

/**
 * Client workout execution tests.
 *
 * PREREQUISITES:
 * - Dev server running on localhost:3000
 * - Valid client credentials
 * - Client has an assigned workout (active program or standalone assignment)
 */

test.describe('Client - Workout Execution', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page)
  })

  test('can navigate to training page', async ({ page }) => {
    await page.goto('/client/train')
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const heading = page.locator('text=/Train|Training|Workout/i')
    await expect(heading.first()).toBeVisible({ timeout: 10000 })
  })

  test.skip('can start a workout from training page', async ({ page }) => {
    // STUB: Full workout execution flow
    // TODO: Implement when test workout assignment exists
  })

  test.skip('LOG SET button has correct touch target', async ({ page }) => {
    // STUB: Verify workout execution UI
    // TODO: Implement
  })
})
