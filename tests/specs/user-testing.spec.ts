import { expect, test, type Page } from "@playwright/test"

// Real input: clicks, typing, and keys. The preview serves POST /api/telemetry.

test.describe("the testing layer", () => {
  test("the first visit opens the modal, and dismiss leaves the bar", async ({ page }) => {
    await page.goto("/")
    const modal = page.locator("[data-testing='modal']")
    await expect(modal).toBeVisible()
    await expect(modal).toContainText("This is a draft of the new site.")
    await expect(modal).toContainText("An honest first impression matters")
    await modal.getByRole("button", { name: "Got it" }).click()
    await expect(modal).toBeHidden()
    const bar = page.locator("[data-testing='bar']")
    await expect(bar).toBeVisible()
    await expect(bar.getByRole("button", { name: "Leave feedback" })).toBeVisible()
    await bar.getByRole("button", { name: "Open the testing notes" }).click()
    await expect(modal).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(modal).toBeHidden()
    await expect(bar).toBeVisible()
  })

  test("the feedback language does not change the page language", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    await expect(page.locator(".message .headline")).toContainText("clear at a glance")
    await page
      .locator("[data-testing='modal']")
      .getByRole("button", { name: "PL", exact: true })
      .click()
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    await expect(page.locator(".message .headline")).toContainText("clear at a glance")
    await expect(page.locator("[data-testing='modal']")).toContainText(
      "To szkic mojej nowej strony."
    )
    await expect(page.locator("[data-testing='modal']")).toContainText("Oceń stronę")
    await expect(page).toHaveURL(/feedbackLang=pl/)
    await page
      .locator("[data-testing='modal']")
      .getByRole("button", { name: "EN", exact: true })
      .click()
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    await expect(page.locator("[data-testing='modal']")).toContainText(
      "This is a draft of the new site."
    )
  })

  test("a Polish page stays Polish when the testing layer is English", async ({ page }) => {
    await page.goto("/pl/?fl=en")
    await expect(page.locator("html")).toHaveAttribute("lang", "pl")
    await expect(page.locator(".message .headline")).toContainText("zrozumiały")
    await expect(page.locator("[data-testing='modal']")).toContainText(
      "This is a draft of the new site."
    )
    await page.keyboard.press("Escape")
    await expect(page.locator("html")).toHaveAttribute("lang", "pl")
    await expect(page.locator("[data-testing='bar']")).toContainText("Leave feedback")
  })

  test("?copy= still switches copy while the notes are in Polish", async ({ page }) => {
    await page.goto("/?copy=a&feedbackLang=pl&stage=2&t=0.5")
    await expect(page.locator(".message .headline")).toContainText("understood in seconds")
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    const modal = page.locator("[data-testing='modal']")
    await expect(modal).toContainText("Oceń stronę")
    await modal.getByRole("button", { name: "Jasne" }).click()

    await page.locator(".ui-blob__title").focus()
    await page.keyboard.press("Enter")
    await page.locator("[data-blob='settings']").click()
    await page.locator("[data-blob='copy'] select").selectOption("b")

    await expect(page).toHaveURL(/[?&]copy=b(&|$)/)
    await expect(page).toHaveURL(/[?&]stage=2(&|$)/)
    await expect(page).toHaveURL(/[?&]t=0\.5(&|$)/)
    await expect(page).toHaveURL(/feedbackLang=pl/)
    await expect(page.locator(".message .headline")).toContainText("Clarity, built in.")
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    await expect(page.locator("[data-testing='bar']")).toContainText("Tekst · B")
  })

  test("a name from the address greets them, and they can change it", async ({ page }) => {
    await page.goto("/?tester=Ada")
    const modal = page.locator("[data-testing='modal']")
    await expect(modal).toContainText("Hi Ada! Thanks for being here.")
    await modal.getByRole("button", { name: "Not you? Change name" }).click()
    const field = modal.getByLabel("Your name or nickname")
    await field.fill("Bea")
    await field.press("Enter")
    await expect(modal).toContainText("Hi Bea! Thanks for being here.")
    await expect(page).toHaveURL(/tester=Bea/)
  })

  test("submitting a note shows the thank-you state", async ({ page }) => {
    await page.goto("/?tester=Ada&copy=b")
    await page.locator("[data-testing='modal']").getByRole("button", { name: "Got it" }).click()
    await page.getByRole("button", { name: "Leave feedback" }).click()
    const drawer = page.locator("[data-testing='drawer']")
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText("Copy · B")
    await expect(drawer.getByRole("radio", { name: "B", exact: true })).toBeChecked()

    await pick(drawer, "Visuals & flow", "4")
    await pick(drawer, "Clarity of message", "5")
    await pick(drawer, "Copy tone & readability", "3")
    await drawer
      .getByRole("textbox", { name: "A few words from you" })
      .fill("The hierarchy is calm.")
    await expect(drawer.getByRole("textbox", { name: "Your name" })).toHaveValue("Ada")

    const sent = page.waitForResponse(async (response) => {
      if (!response.url().endsWith("/api/telemetry") || response.request().method() !== "POST")
        return false
      return (response.request().postData() ?? "").includes("feedback_submitted")
    })
    await drawer.getByRole("button", { name: "Send the note" }).click()
    expect((await sent).ok()).toBe(true)
    await expect(drawer).toContainText("Thanks, Ada.")
    await expect(drawer).toContainText("stays in the corner")
    await drawer.getByRole("button", { name: "Close" }).click()
    await expect(page.locator("[data-testing='bar']")).toBeVisible()
    await expect(page.locator(".message .headline")).toContainText("Clarity, built in.")
  })

  test("a missing score is said in the feedback language and is not sent", async ({ page }) => {
    await page.goto("/?fl=pl")
    await page.locator("[data-testing='modal']").getByRole("button", { name: "Jasne" }).click()
    await page.getByRole("button", { name: "Oceń stronę" }).click()
    const drawer = page.locator("[data-testing='drawer']")
    let posts = 0
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/api/telemetry")) {
        if ((request.postData() ?? "").includes("feedback_submitted")) posts += 1
      }
    })
    await drawer.getByRole("button", { name: "Wyślij opinię" }).click()
    await expect(drawer).toContainText("Zaznacz ocenę na wszystkich trzech skalach.")
    await expect(drawer).not.toContainText("Dzięki.")
    expect(posts).toBe(0)
  })

  test("the widget can shrink, move, and close, and a reload brings it back", async ({ page }) => {
    await page.goto("/")
    const modal = page.locator("[data-testing='modal']")
    await expect(modal).toContainText(
      "You can shrink this feedback bar to an icon, move it, or close it. If you close it, refresh the page and it comes back."
    )
    await modal.getByRole("button", { name: "Got it" }).click()
    const bar = page.locator("[data-testing='bar']")

    await bar.getByRole("button", { name: "Leave feedback" }).click()
    await page
      .locator("[data-testing='drawer']")
      .getByRole("button", { name: "Close", exact: true })
      .click()
    await expect(bar.getByRole("button", { name: "Shrink to an icon" })).toBeVisible()

    await bar.getByRole("button", { name: "Shrink to an icon" }).click()
    await expect(bar.getByRole("button", { name: "Expand" })).toBeVisible()
    await expect(bar.getByRole("button", { name: "Leave feedback" })).toHaveCount(0)

    const before = await bar.boundingBox()
    const grip = await bar.getByRole("button", { name: "Move" }).boundingBox()
    if (!before || !grip) throw new Error("the widget has no box")
    const startX = grip.x + grip.width / 2
    const startY = grip.y + grip.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX - 180, startY + 160, { steps: 12 })
    await page.mouse.up()

    const moved = await bar.boundingBox()
    if (!moved) throw new Error("the widget has no box")
    expect(moved.x).toBeLessThan(before.x - 100)
    expect(moved.y).toBeGreaterThan(before.y + 100)

    await page.reload()
    await expect(bar.getByRole("button", { name: "Expand" })).toBeVisible()
    const restored = await bar.boundingBox()
    if (!restored) throw new Error("the widget has no box")
    expect(Math.abs(restored.x - moved.x)).toBeLessThan(2)
    expect(Math.abs(restored.y - moved.y)).toBeLessThan(2)

    await bar.getByRole("button", { name: "Expand" }).click()
    await expect(bar.getByRole("button", { name: "Leave feedback" })).toBeVisible()
    const expanded = await bar.boundingBox()
    await page.reload()
    await expect(bar.getByRole("button", { name: "Shrink to an icon" })).toBeVisible()
    const expandedAgain = await bar.boundingBox()
    if (!expanded || !expandedAgain) throw new Error("the widget has no box")
    expect(Math.abs(expandedAgain.x - expanded.x)).toBeLessThan(2)
    expect(Math.abs(expandedAgain.y - expanded.y)).toBeLessThan(2)

    await bar.getByRole("button", { name: "Close the bar" }).click()
    await expect(bar).toHaveCount(0)
    const stored = await page.evaluate(() => sessionStorage.getItem("strm.testing.place"))
    await page.reload()
    await expect(bar).toBeVisible()
    await expect(bar.getByRole("button", { name: "Leave feedback" })).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem("strm.testing.place"))).toBe(stored)
  })

  test("Polish names the widget controls, and Zamknij still closes the drawer", async ({
    page,
  }) => {
    await page.goto("/?feedbackLang=pl")
    const modal = page.locator("[data-testing='modal']")
    await expect(modal).toContainText(
      "Ten pasek z opinią możesz zwinąć do ikony, przesunąć albo zamknąć. Jeśli go zamkniesz, wystarczy odświeżyć stronę, żeby wrócił."
    )
    await modal.getByRole("button", { name: "Jasne" }).click()
    const bar = page.locator("[data-testing='bar']")
    await expect(bar.getByRole("button", { name: "Zwiń do ikony" })).toBeVisible()
    await expect(bar.getByRole("button", { name: "Przesuń" })).toBeVisible()
    await expect(bar.getByRole("button", { name: "Zamknij pasek" })).toBeVisible()
    await bar.getByRole("button", { name: "Oceń stronę" }).click()
    await expect(
      page.locator("[data-testing='drawer']").getByRole("button", { name: "Zamknij", exact: true })
    ).toBeVisible()
  })
})

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false })

  test("the testing layer is absent and the page is the current draft", async ({ page }) => {
    await page.goto("/?copy=a&tester=Ada&feedbackLang=pl")
    await expect(page.locator("[data-testing]")).toHaveCount(0)
    await expect(page.locator(".message .headline")).toContainText("clear at a glance")
    await expect(page.locator(".message .headline")).not.toContainText("understood in seconds")
  })
})

async function pick(drawer: ReturnType<Page["locator"]>, legend: string, value: string) {
  await drawer
    .getByRole("group", { name: legend })
    .getByRole("radio", { name: value, exact: true })
    .click()
}
