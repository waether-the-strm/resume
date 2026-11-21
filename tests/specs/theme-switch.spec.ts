import { expect, test, type Page } from "@playwright/test"

const paths = ["/", "/pl/"] as const

async function paper(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor)
}

test.describe("theme switch", () => {
  // Light system scheme, so dark is a visible change and "system" is not already dark.
  // Reduced motion keeps the finished page: the footer is there either way.
  test.use({ contextOptions: { reducedMotion: "reduce", colorScheme: "light" } })

  for (const path of paths) {
    test(`${path}: system, light and dark, and dark survives a reload`, async ({ page }) => {
      await page.goto(path)
      const group = page.locator(".theme-switch")
      await expect(group).toBeVisible()
      await expect(group).toHaveAttribute("aria-label", "Theme")
      const system = group.locator('button[data-value=""]')
      const light = group.locator('button[data-value="light"]')
      const dark = group.locator('button[data-value="dark"]')
      await expect(group.locator("button")).toHaveText(["System", "Light", "Dark"])

      await expect(page.locator("html")).not.toHaveAttribute("data-theme")
      await expect(system).toHaveAttribute("aria-pressed", "true")
      await expect(light).toHaveAttribute("aria-pressed", "false")
      await expect(dark).toHaveAttribute("aria-pressed", "false")
      const systemPaper = await paper(page)

      await light.click()
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
      await expect(light).toHaveAttribute("aria-pressed", "true")
      await expect(system).toHaveAttribute("aria-pressed", "false")
      expect(await page.evaluate(() => localStorage.getItem("strm-theme"))).toBe("light")

      await dark.click()
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
      await expect(dark).toHaveAttribute("aria-pressed", "true")
      await expect(light).toHaveAttribute("aria-pressed", "false")
      expect(await page.evaluate(() => localStorage.getItem("strm-theme"))).toBe("dark")
      await expect(page.locator("html")).toHaveCSS("color-scheme", "dark")
      expect(await paper(page)).not.toBe(systemPaper)

      // theme-init.js, inline in <head>, restores strm-theme before the first paint.
      // The switch's own module only reads the attribute, so dark at this point came
      // from that head script, not from a later correction.
      await page.reload({ waitUntil: "domcontentloaded" })
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
      await expect(page.locator("html")).toHaveCSS("color-scheme", "dark")
      await expect(dark).toHaveAttribute("aria-pressed", "true")
      expect(await page.evaluate(() => localStorage.getItem("strm-theme"))).toBe("dark")

      await system.click()
      await expect(page.locator("html")).not.toHaveAttribute("data-theme")
      await expect(system).toHaveAttribute("aria-pressed", "true")
      await expect(dark).toHaveAttribute("aria-pressed", "false")
      expect(await page.evaluate(() => localStorage.getItem("strm-theme"))).toBeNull()
    })
  }
})

test.describe("theme switch without JavaScript", () => {
  test.use({ javaScriptEnabled: false })

  for (const path of paths) {
    test(`${path}: the control is in the footer and not usable`, async ({ page }) => {
      await page.goto(path)
      const group = page.locator("footer .theme-switch")
      await expect(group).toBeHidden()
      await expect(group.locator("button")).toHaveCount(3)
    })
  }
})
