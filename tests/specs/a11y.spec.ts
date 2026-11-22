import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// The pages the issue names, in the theme the reader stored. data-theme is set the same way
// the inline script does: strm-theme in localStorage, before the first paint.
// `/cv/` is the address the host serves: the page is `cv/index.html`. The bare
// path is not a preview URL once trailing slashes are required.
const pages = ["/", "/pl/", "/cv/", "/ui/", "/ui/primitives/"] as const
const themes = ["light", "dark"] as const

// Desktop, and the short phone the static suite already measures. Computed font size
// decides whether axe treats text as large (3:1) or normal (4.5:1).
const viewports = [
  { width: 1280, height: 820 },
  { width: 390, height: 664 },
] as const

type Theme = (typeof themes)[number]
type Violations = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]

async function openThemed(page: Page, path: string, theme: Theme) {
  await page.addInitScript((value) => {
    localStorage.setItem("strm-theme", value)
  }, theme)
  const response = await page.goto(path)
  expect(response, `${path} responded`).not.toBeNull()
  expect(response?.status(), `${path} status`).toBeLessThan(400)
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
}

function describeViolations(violations: Violations) {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => {
          const target = node.target.join(" ")
          const data = [...node.any, ...node.all, ...node.none].flatMap((check) =>
            check.data === undefined ? [] : [JSON.stringify(check.data)]
          )
          const detail = data.length > 0 ? `\n      ${data.join("\n      ")}` : ""
          return `    ${target}\n      ${node.html}${detail}`
        })
        .join("\n")
      return `${violation.id} (${violation.impact ?? "unknown"}) ${violation.help}\n  ${violation.helpUrl}\n${nodes}`
    })
    .join("\n\n")
}

test.describe("axe", () => {
  for (const viewport of viewports) {
    for (const theme of themes) {
      test.describe(`${theme} ${viewport.width}×${viewport.height}`, () => {
        test.use({ viewport: { width: viewport.width, height: viewport.height } })

        for (const path of pages) {
          test(path, async ({ page }) => {
            await openThemed(page, path, theme)
            const results = await new AxeBuilder({ page }).analyze()
            // A scan that injects nothing would also have zero violations.
            expect(results.passes.length, "axe ran").toBeGreaterThan(0)
            // Incomplete is axe declining to decide, not a violation. It stays visible in the
            // report. The one known case is the arrow in "Angular → React" on /cv: axe will
            // not score a run of non-text characters, and the words beside it pass.
            for (const item of results.incomplete) {
              const nodes = item.nodes
                .map((entry) => `${entry.target.join(" ")} ${entry.html}`)
                .join("; ")
              test.info().annotations.push({
                type: "axe-incomplete",
                description: `${item.id}: ${nodes}`,
              })
            }
            expect(results.violations, describeViolations(results.violations)).toEqual([])
          })
        }
      })
    }
  }
})
