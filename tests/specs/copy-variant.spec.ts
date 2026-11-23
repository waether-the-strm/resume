import { expect, test, type Locator, type Page } from "../fixture.ts"

// Real selection through the browser, not a synthetic change event.
async function openCopy(page: Page): Promise<Locator> {
  await page.locator(".ui-blob__title").focus()
  await page.keyboard.press("Enter")
  await page.locator("[data-blob='settings']").click()
  const select = page.locator("[data-blob='copy'] select")
  await expect(select).toBeVisible()
  return select
}

test.describe("the copy switch", () => {
  test("?copy=a shows variant A, another option changes the address, no parameter keeps the draft", async ({
    page,
  }) => {
    await page.goto("/?copy=a&stage=2&t=0.5")
    await expect(page.locator(".message .headline")).toContainText("understood in seconds")
    await expect(page.locator(".message .headline")).not.toContainText("clear at a glance")

    const select = await openCopy(page)
    await expect(select).toHaveValue("a")
    await select.selectOption("b")
    await expect(page).toHaveURL(/[?&]copy=b(&|$)/)
    await expect(page).toHaveURL(/[?&]stage=2(&|$)/)
    await expect(page).toHaveURL(/[?&]t=0\.5(&|$)/)
    await expect(page.locator(".message .headline")).toContainText("Clarity, built in.")

    await page.goto("/")
    await expect(page.locator(".message .headline")).toContainText("clear at a glance")
    await expect(page.locator(".message .headline")).not.toContainText("understood in seconds")
    await expect(page.locator(".message .headline")).not.toContainText("Clear at a glance")
  })

  test("an unknown value leaves the current copy, and projects stay", async ({ page }) => {
    await page.goto("/?copy=nope")
    await expect(page.locator(".message .headline")).toContainText("clear at a glance")
    await page.goto("/?copy=c")
    const named = await page.locator(".message .who [data-role='name']").allTextContents()
    expect(named.join("")).toContain("I'm Jan Mirecki,")
    await page.goto("/?copy=a")
    await expect(page.locator("main")).toContainText("LetsReg sign-in")
    expect(await page.locator("a.skip").textContent()).toBe("Skip to the card")
    expect(await page.locator(".guide .pay").textContent()).toContain("Easier this time")
    expect(await page.locator(".equation .how .a").textContent()).toBe(
      "just scroll. Watch it come together."
    )
  })

  test("Polish stays until a variant is chosen, and then those slots become the English draft", async ({
    page,
  }) => {
    await page.goto("/pl/")
    await expect(page.locator(".message .headline")).toContainText(
      "zrozumiały od pierwszego spojrzenia"
    )
    await expect(page.locator("main")).toContainText("Logowanie LetsReg")

    await page.goto("/pl/?copy=a")
    await expect(page.locator(".message .headline")).toContainText("understood in seconds")
    await expect(page.locator(".message .headline")).not.toContainText("zrozumiały")
    await expect(page.locator("main")).toContainText("Logowanie LetsReg")
    await expect(page.locator(".card .ui-kicker [data-role='accent']")).toHaveText("=")
    await expect(page.locator(".message .who [data-role='name']")).toHaveCount(0)
  })
})

test.describe("the tour reads the swapped copy", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } })

  test("variant A is what the tour shows", async ({ page }) => {
    await page.goto("/?copy=a&stage=3&t=0.5")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "moment")
    await expect(page.locator(".message .headline")).toContainText("understood in seconds")
  })
})
