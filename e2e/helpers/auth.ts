import { Page } from '@playwright/test'

/**
 * Log in as a coach user.
 *
 * IMPORTANT: This requires valid credentials in the environment.
 * Set COACH_EMAIL and COACH_PASSWORD in a .env.test file,
 * or pass them as environment variables.
 *
 * For now, this helper navigates to the login page and fills the form.
 * It does NOT use API-based auth (which would be faster but requires
 * knowing the exact Supabase auth flow).
 */
export async function loginAsCoach(page: Page) {
  const email = process.env.COACH_EMAIL || 'coach@test.com'
  const password = process.env.COACH_PASSWORD || 'testpassword123'

  await page.goto('/')

  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 })

  await page.fill('input[type="email"], input[name="email"]', email)
  await page.fill('input[type="password"], input[name="password"]', password)

  await page.click('button[type="submit"]')

  await page.waitForURL(/\/(coach|client)/, { timeout: 15000 })
}

/**
 * Log in as a client user.
 */
export async function loginAsClient(page: Page) {
  const email = process.env.CLIENT_EMAIL || 'client@test.com'
  const password = process.env.CLIENT_PASSWORD || 'testpassword123'

  await page.goto('/')
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 })
  await page.fill('input[type="email"], input[name="email"]', email)
  await page.fill('input[type="password"], input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(coach|client)/, { timeout: 15000 })
}

/**
 * Check if the page shows an authenticated state (e.g., dashboard content).
 * Returns true if the user appears to be logged in.
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    const hasNav = await page.locator('nav, [role="navigation"]').count()
    const hasGreeting = await page.locator('text=/Hey|Welcome|Good/').count()
    return hasNav > 0 || hasGreeting > 0
  } catch {
    return false
  }
}
