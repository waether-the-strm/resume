import { test as base, expect } from "@playwright/test"

/**
 * The same flag the testing layer stores after the welcome is dismissed
 * (`strm.testing.welcomed` in apps/site/src/scripts/testing/session.ts).
 * Specs of the page itself meet it after that welcome, so the modal does not
 * cover them. The user-testing spec does not use this fixture.
 */
export function markTestingWelcomed(): void {
  try {
    sessionStorage.setItem("strm.testing.welcomed", "1")
  } catch {
    // Storage can throw. The suite still runs.
  }
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(markTestingWelcomed)
    await use(page)
  },
})

export { expect }
export type {
  APIRequestContext,
  BrowserContext,
  CDPSession,
  Locator,
  Page,
  Response,
} from "@playwright/test"
