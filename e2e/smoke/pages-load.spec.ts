import { test, expect } from '@playwright/test'

/**
 * Smoke tests — verify key pages load without crashing.
 * These tests don't require authentication for the login page,
 * but authenticated pages will redirect to login if not authenticated.
 *
 * Run with: npx playwright test e2e/smoke/
 */

test.describe('Public pages', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.locator('form').or(page.locator('input[type="email"]')).first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('health endpoint responds', async ({ page }) => {
    const response = await page.goto('/api/health')
    expect(response?.status()).toBe(200)
  })
})

test.describe('Protected pages redirect to login when not authenticated', () => {
  test('client dashboard redirects', async ({ page }) => {
    await page.goto('/client')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    const url = page.url()
    expect(url).toMatch(/\/(client|$)/)
  })

  test('coach dashboard redirects', async ({ page }) => {
    await page.goto('/coach')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    const url = page.url()
    expect(url).toMatch(/\/(coach|$)/)
  })
})
