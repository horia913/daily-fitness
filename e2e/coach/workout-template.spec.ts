import { test, expect } from '@playwright/test'
import { loginAsCoach } from '../helpers/auth'

/**
 * Coach workout template tests.
 *
 * PREREQUISITES:
 * - Dev server running on localhost:3000
 * - Valid coach credentials in environment (COACH_EMAIL, COACH_PASSWORD)
 * - At least one workout template exists
 *
 * To run: npx playwright test e2e/coach/workout-template.spec.ts
 */

test.describe('Coach - Workout Templates', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCoach(page)
  })

  test('can navigate to workout templates page', async ({ page }) => {
    await page.goto('/coach/workouts/templates')
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const heading = page.locator('text=/Template|Workout/i')
    await expect(heading.first()).toBeVisible({ timeout: 10000 })
  })

  test('can open create template form', async ({ page }) => {
    await page.goto('/coach/workouts/templates/create')
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    await page.waitForSelector('input', { timeout: 10000 })
  })

  test.skip('can create a basic workout template', async ({ page }) => {
    // STUB: Requires filling out the full form
    // TODO: Implement when test data strategy is ready
  })

  test.skip('block type selector shows grouped categories', async ({ page }) => {
    // STUB: Verify Phase 8A change
    // TODO: Implement
  })

  test.skip('exercise cards are collapsible', async ({ page }) => {
    // STUB: Verify Phase 8C change
    // TODO: Implement when template with exercises exists
  })
})
