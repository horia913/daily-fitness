import { Page } from '@playwright/test'

/**
 * Navigate to a page and wait for it to load.
 * Handles the common pattern of navigating + waiting for content.
 */
export async function navigateAndWait(page: Page, path: string, waitForSelector?: string) {
  await page.goto(path)
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout: 15000 })
  } else {
    await page.waitForLoadState('networkidle', { timeout: 15000 })
  }
}

/**
 * Check that a page loaded without errors.
 * Verifies no error boundaries, 404s, or server errors are shown.
 */
export async function expectNoErrors(page: Page) {
  const errorTexts = [
    'Application error',
    'Internal Server Error',
    '404',
    'This page could not be found',
    'Something went wrong',
  ]

  for (const errorText of errorTexts) {
    const errorElement = page.locator(`text="${errorText}"`)
    const count = await errorElement.count()
    if (count > 0) {
      const isVisible = await errorElement.first().isVisible().catch(() => false)
      if (isVisible) {
        throw new Error(`Page error detected: "${errorText}" is visible on ${page.url()}`)
      }
    }
  }
}

/**
 * Wait for API calls to complete (useful after actions that trigger fetches).
 */
export async function waitForApi(page: Page, urlPattern: string | RegExp, timeout = 10000) {
  await page.waitForResponse(
    (response) => {
      const url = response.url()
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern)
      }
      return urlPattern.test(url)
    },
    { timeout }
  )
}
