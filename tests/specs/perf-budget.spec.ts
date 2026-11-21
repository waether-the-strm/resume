import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test, type CDPSession, type Page, type Response } from "@playwright/test"
import {
  assemble,
  formatSummary,
  overages,
  pages,
  phoneProfile,
  throttlingGaps,
  type PagePath,
  type RawMeasurement,
  type Sample,
  type SeenResponse,
} from "../perf-budget.ts"

// Written for the CI step that appends it to the job summary.
const summaryFile = fileURLToPath(new URL("../test-results/perf-budget.md", import.meta.url))

const browserUse = {
  viewport: phoneProfile.viewport,
  screen: phoneProfile.viewport,
  deviceScaleFactor: phoneProfile.deviceScaleFactor,
  isMobile: true,
  hasTouch: true,
  userAgent: phoneProfile.userAgent,
} as const

test.describe("performance budget", () => {
  test.use(browserUse)

  test("finished home pages stay within the budget", async ({ page }) => {
    test.setTimeout(90_000)
    const samples: Sample[] = []
    const client = await page.context().newCDPSession(page)
    try {
      await expectPhone(page)
      await armObservers(page)
      for (const path of pages) {
        await applyThrottle(client)
        const sample = await measure(page, path)
        await expectLayoutViewport(page, path)
        sample.gaps.push(...throttlingGaps(sample, phoneProfile.latencyMs))
        samples.push(sample)
        note(sample)
        // The same finished page the static suite checks. The paint time was taken
        // before these asserts, so the asserts are not part of the measurement.
        await expectFinished(page)
      }
      await client.detach()
    } finally {
      const markdown = formatSummary(samples)
      console.log(`\n${markdown}`)
      mkdirSync(dirname(summaryFile), { recursive: true })
      writeFileSync(summaryFile, markdown)
      await test.info().attach("performance-budget.md", {
        body: markdown,
        contentType: "text/markdown",
      })
    }

    const gaps = samples.flatMap((sample) => sample.gaps)
    expect(gaps, gaps.join("\n")).toEqual([])
    const problems = samples.flatMap(overages)
    expect(
      problems,
      problems
        .map(
          (problem) => `${problem.path} ${problem.metric} ${problem.measured} > ${problem.budget}`
        )
        .join("\n")
    ).toEqual([])
  })
})

async function expectPhone(page: Page) {
  // about:blank has no viewport meta, so the layout width there is not the phone.
  // The configured viewport, the user agent and the touch point are.
  expect(page.viewportSize()).toEqual({
    width: phoneProfile.viewport.width,
    height: phoneProfile.viewport.height,
  })
  const emulation = await page.evaluate(() => ({
    dpr: window.devicePixelRatio,
    ua: navigator.userAgent,
    touch: navigator.maxTouchPoints > 0,
  }))
  expect(emulation).toEqual({
    dpr: phoneProfile.deviceScaleFactor,
    ua: phoneProfile.userAgent,
    touch: true,
  })
}

async function expectLayoutViewport(page: Page, path: string) {
  const inner = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))
  expect(inner, `${path} layout viewport`).toEqual({
    width: phoneProfile.viewport.width,
    height: phoneProfile.viewport.height,
  })
}

async function armObservers(page: Page) {
  // layout-shift and largest-contentful-paint are delivered to an observer. Reading
  // them back from the timeline is empty in this Chromium, so the callback records them.
  await page.addInitScript(() => {
    const record = window as unknown as {
      __strmCls: number
      __strmShifts: number
      __strmLcp: number | null
      __strmObservers?: PerformanceObserver[]
    }
    record.__strmCls = 0
    record.__strmShifts = 0
    record.__strmLcp = null
    const shifts = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        record.__strmShifts += 1
        const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean }
        if (shift.hadRecentInput || typeof shift.value !== "number") continue
        record.__strmCls += shift.value
      }
    })
    const paints = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1]
      if (last) record.__strmLcp = last.startTime
    })
    shifts.observe({ type: "layout-shift", buffered: true })
    paints.observe({ type: "largest-contentful-paint", buffered: true })
    record.__strmObservers = [shifts, paints]
  })
}

async function applyThrottle(client: CDPSession) {
  await client.send("Network.enable")
  await client.send("Network.setCacheDisabled", { cacheDisabled: true })
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: phoneProfile.latencyMs,
    downloadThroughput: phoneProfile.downloadThroughputBytesPerSecond,
    uploadThroughput: phoneProfile.uploadThroughputBytesPerSecond,
  })
  await client.send("Emulation.setCPUThrottlingRate", { rate: phoneProfile.cpuSlowdown })
}

async function measure(page: Page, path: PagePath): Promise<Sample> {
  const responses: SeenResponse[] = []
  const onResponse = (response: Response) => {
    responses.push({
      url: response.url(),
      resourceType: response.request().resourceType(),
      status: response.status(),
    })
  }
  page.on("response", onResponse)
  try {
    const response = await page.goto(path, { waitUntil: "load", timeout: 45_000 })
    expect(response, `${path} responded`).not.toBeNull()
    expect(response?.status(), `${path} status`).toBeLessThan(400)
    const reading = await readFinished(page)
    if (!reading.loaded) {
      throw new Error(
        `${path} Recursive Variable did not load (${reading.faceStatus || "no faces"})`
      )
    }
    if (!reading.navigation) throw new Error(`${path} has no navigation timing`)
    const sample = assemble(path, {
      finishedPaintMs: reading.finishedPaintMs,
      cls: reading.cls,
      fcpMs: reading.fcpMs,
      lcpMs: reading.lcpMs,
      navigation: reading.navigation,
      resources: reading.resources,
      responses,
    })
    if (!reading.observed) sample.gaps.push(`${path} layout-shift observer did not run`)
    sample.notes.push(`${path} layout-shift entries observed: ${reading.shiftCount}`)
    return sample
  } finally {
    page.off("response", onResponse)
  }
}

type BrowserReading = {
  loaded: boolean
  faceStatus: string
  finishedPaintMs: number
  cls: number
  observed: boolean
  shiftCount: number
  fcpMs: number | null
  lcpMs: number | null
  navigation: RawMeasurement["navigation"] | null
  resources: RawMeasurement["resources"]
}

async function readFinished(page: Page): Promise<BrowserReading> {
  return page.evaluate(async () => {
    await document.fonts.ready
    const faces = [...document.fonts]
    const recursive = faces.filter((face) => face.family === "Recursive Variable")
    const loaded = recursive.length > 0 && recursive.every((face) => face.status === "loaded")
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })

    const record = window as Window & {
      __strmCls?: number
      __strmShifts?: number
      __strmLcp?: number | null
    }
    const paints = performance.getEntriesByType("paint")
    const fcp = paints.find((entry) => entry.name === "first-contentful-paint")
    const navigationEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined
    const resources = performance.getEntriesByType("resource").map((entry) => {
      const timing = entry as PerformanceResourceTiming
      return {
        url: timing.name,
        transferSize: timing.transferSize,
        encodedBodySize: timing.encodedBodySize,
        headerDelayMs: timing.responseStart - timing.requestStart,
      }
    })

    return {
      loaded,
      faceStatus: faces.map((face) => `${face.family}=${face.status}`).join(" "),
      finishedPaintMs: performance.now(),
      cls: record.__strmCls ?? 0,
      observed: "__strmCls" in window,
      shiftCount: record.__strmShifts ?? 0,
      fcpMs: fcp ? fcp.startTime : null,
      lcpMs: record.__strmLcp ?? null,
      navigation: navigationEntry
        ? {
            url: navigationEntry.name,
            transferSize: navigationEntry.transferSize,
            encodedBodySize: navigationEntry.encodedBodySize,
            headerDelayMs: navigationEntry.responseStart - navigationEntry.requestStart,
          }
        : null,
      resources,
    }
  })
}

function note(sample: Sample) {
  const metrics = [
    `finished paint ${sample.finishedPaintMs.toFixed(1)} ms`,
    `layout shift ${sample.cls.toFixed(4)}`,
    `document ${sample.bytes.document} B`,
    `css ${sample.bytes.css} B`,
    `font ${sample.bytes.font} B`,
    `script ${sample.bytes.script} B`,
  ]
  test.info().annotations.push({
    type: "measurement",
    description: `${sample.path} ${metrics.join(", ")}`,
  })
}

async function expectFinished(page: Page) {
  const message = page.locator(".message")
  await expect(message.locator(".headline")).toBeVisible()
  await expect(message.locator(".lead")).toBeVisible()
  await expect(message.locator(".ui-tiles")).toBeVisible()
  await expect(message.locator(".who")).toBeVisible()
  await expect(message.locator(".call")).toBeVisible()

  const card = page.locator(".card")
  await expect(card).toBeVisible()
  const paths = card.locator("nav.ui-paths > a")
  await expect(paths).toHaveCount(3)
  for (const path of await paths.all()) await expect(path).toBeVisible()

  const projects = page.locator("ul.ui-work > li")
  await expect(projects).toHaveCount(3)
  for (const project of await projects.all()) await expect(project).toBeVisible()
}
