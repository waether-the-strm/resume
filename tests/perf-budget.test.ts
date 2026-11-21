import assert from "node:assert/strict"
import { test } from "node:test"
import {
  assemble,
  budgetForFinished,
  budgetForTour,
  budgets,
  byteMargin,
  clsMargin,
  firstMeasurement,
  formatSummary,
  kindOf,
  overages,
  pages,
  paintFactor,
  phoneProfile,
  throttlingGaps,
  type FinishedSample,
  type PagePath,
  type PageState,
  type RawMeasurement,
  type Sample,
  type TourSample,
} from "./perf-budget.ts"

test("the phone profile is Lighthouse 12.8.2 devtools throttling of a Moto G Power", () => {
  assert.equal(phoneProfile.viewport.width, 412)
  assert.equal(phoneProfile.viewport.height, 823)
  assert.equal(phoneProfile.deviceScaleFactor, 1.75)
  assert.equal(phoneProfile.cpuSlowdown, 4)
  // enableNetworkThrottling uses requestLatencyMs (150 × 3.75) and bytes per second.
  assert.equal(phoneProfile.latencyMs, 150 * 3.75)
  assert.equal(phoneProfile.downloadThroughputBytesPerSecond, Math.floor((1.6 * 1024 * 1024) / 8))
  assert.equal(phoneProfile.uploadThroughputBytesPerSecond, Math.floor((750 * 1024) / 8))
  assert.match(phoneProfile.userAgent, /moto g power \(2022\)/)
})

test("each budget is the first measurement plus the stated margin", () => {
  assert.equal(paintFactor, 1.3)
  for (const path of pages) {
    const finished = firstMeasurement.finished[path]
    assert.deepEqual(budgets.finished[path], budgetForFinished(finished))
    assert.equal(
      budgets.finished[path].finishedPaintMs,
      Math.ceil(finished.finishedPaintMs * paintFactor)
    )
    assert.equal(budgets.finished[path].cls, finished.cls + clsMargin)
    assert.equal(budgets.finished[path].document, finished.document + byteMargin)
    assert.equal(budgets.finished[path].css, finished.css + byteMargin)
    assert.equal(budgets.finished[path].font, finished.font + byteMargin)

    const tour = firstMeasurement.tour[path]
    assert.deepEqual(budgets.tour[path], budgetForTour(tour))
    assert.equal(budgets.tour[path].cls, tour.cls + clsMargin)
    assert.equal(budgets.tour[path].script, tour.script + byteMargin)
  }
})

test("resource types fall into document, CSS, font, script, or other", () => {
  assert.equal(kindOf("document"), "document")
  assert.equal(kindOf("stylesheet"), "css")
  assert.equal(kindOf("font"), "font")
  assert.equal(kindOf("script"), "script")
  assert.equal(kindOf("image"), "other")
  assert.equal(kindOf("xhr"), "other")
})

function timing(url: string, transferSize: number, headerDelayMs = 600) {
  return { url, transferSize, encodedBodySize: transferSize - 200, headerDelayMs }
}

function raw(overrides: Partial<RawMeasurement> = {}): RawMeasurement {
  const origin = "http://127.0.0.1:4333"
  return {
    finishedPaintMs: 1000,
    cls: 0,
    fcpMs: 400,
    lcpMs: 900,
    navigation: timing(`${origin}/`, 14000),
    resources: [
      timing(`${origin}/_astro/base.css`, 12000),
      timing(`${origin}/_astro/recursive.woff2`, 50000),
      timing(`${origin}/favicon.svg`, 2500),
    ],
    responses: [
      { url: `${origin}/`, resourceType: "document", status: 200 },
      { url: `${origin}/_astro/base.css`, resourceType: "stylesheet", status: 200 },
      { url: `${origin}/_astro/recursive.woff2`, resourceType: "font", status: 200 },
      { url: `${origin}/favicon.svg`, resourceType: "image", status: 200 },
    ],
    ...overrides,
  }
}

test("transferred bytes are summed by type, once per resource", () => {
  const origin = "http://127.0.0.1:4333"
  const sample = assemble(
    "/",
    {
      ...raw(),
      responses: [
        ...raw().responses,
        { url: `${origin}/_astro/recursive.woff2`, resourceType: "font", status: 200 },
      ],
    },
    "finished"
  )
  assert.deepEqual(sample.bytes, {
    document: 14000,
    css: 12000,
    font: 50000,
    script: 0,
    other: 2500,
  })
  assert.deepEqual(sample.gaps, [])
  assert.equal(sample.notes.length, 1)
})

test("a response without timing, a timing without a response, and a failed status are gaps", () => {
  const origin = "http://127.0.0.1:4333"
  const sample = assemble(
    "/pl/",
    raw({
      navigation: timing(`${origin}/pl/`, 0),
      resources: [timing(`${origin}/_astro/base.css`, 12000), timing(`${origin}/mystery.js`, 300)],
      responses: [
        { url: `${origin}/pl/`, resourceType: "document", status: 200 },
        { url: `${origin}/app.js`, resourceType: "script", status: 200 },
        { url: `${origin}/favicon.svg`, resourceType: "image", status: 404 },
        { url: `${origin}/old`, resourceType: "document", status: 302 },
      ],
    }),
    "finished"
  )
  assert.ok(sample.gaps.some((gap) => gap.includes("document transferSize is 0")))
  assert.ok(sample.gaps.some((gap) => gap.includes("no resource timing")))
  assert.ok(sample.gaps.some((gap) => gap.includes("status 404")))
  assert.ok(sample.gaps.some((gap) => gap.includes("mystery.js")))
  assert.ok(sample.gaps.some((gap) => gap.includes("transferred no font")))
  assert.equal(
    sample.gaps.some((gap) => gap.includes("status 302")),
    false
  )
  assert.equal(
    sample.gaps.some((gap) => gap.includes("transferred no script")),
    false
  )
})

test("the tour is incomplete without a script, and the finished page is not", () => {
  assert.equal(
    assemble("/", raw(), "finished").gaps.some((gap) => gap.includes("transferred no script")),
    false
  )
  assert.ok(assemble("/", raw(), "tour").gaps.some((gap) => gap.includes("transferred no script")))
})

test("a transfer faster than the throttle is a gap, and a cache hit is not", () => {
  const sample = assemble("/", raw(), "finished")
  const fast = { ...sample.transfers[0]!, headerDelayMs: 10, transferSize: 100 }
  const cached = { ...fast, transferSize: 0 }
  assert.equal(throttlingGaps({ ...sample, transfers: [fast] }, 562.5).length, 1)
  assert.deepEqual(throttlingGaps({ ...sample, transfers: [cached] }, 562.5), [])
  assert.deepEqual(throttlingGaps(sample, 562.5), [])
})

type Flat = FinishedSample & TourSample

function sampleAt(state: PageState, path: PagePath, metrics: Flat, gaps: string[] = []): Sample {
  return {
    state,
    path,
    finishedPaintMs: metrics.finishedPaintMs,
    cls: metrics.cls,
    fcpMs: 1,
    lcpMs: 2,
    bytes: {
      document: metrics.document,
      css: metrics.css,
      font: metrics.font,
      script: metrics.script,
      other: 0,
    },
    transfers: [],
    notes: [],
    gaps,
  }
}

function finishedFlat(budget: FinishedSample, script = 0): Flat {
  return { ...budget, script }
}

function tourFlat(budget: TourSample, paint = 1): Flat {
  return {
    finishedPaintMs: paint,
    cls: budget.cls,
    document: 1,
    css: 1,
    font: 1,
    script: budget.script,
  }
}

test("a page on its budget passes, and one byte or one moment over the budgeted metric fails", () => {
  const path: PagePath = "/"
  const finished = budgets.finished[path]
  assert.deepEqual(overages(sampleAt("finished", path, finishedFlat(finished, 9_999_999))), [])
  const overFont = overages(
    sampleAt("finished", path, finishedFlat({ ...finished, font: finished.font + 1 }))
  )
  assert.equal(overFont.length, 1)
  assert.equal(overFont[0]?.metric, "font")
  assert.equal(overFont[0]?.state, "finished")

  const tour = budgets.tour[path]
  assert.deepEqual(overages(sampleAt("tour", path, tourFlat(tour, 99_999))), [])
  const overScript = overages(
    sampleAt("tour", path, tourFlat({ ...tour, script: tour.script + 1 }))
  )
  assert.equal(overScript.length, 1)
  assert.equal(overScript[0]?.metric, "script")
  assert.equal(overScript[0]?.state, "tour")
})

test("the summary names both states and both pages, and an incomplete measurement", () => {
  const within = [
    ...pages.map((path) => sampleAt("finished", path, finishedFlat(budgets.finished[path]))),
    ...pages.map((path) => sampleAt("tour", path, tourFlat(budgets.tour[path]))),
  ]
  const ok = formatSummary(within)
  assert.match(ok, /within budget/)
  assert.match(ok, /### Finished page/)
  assert.match(ok, /### Tour/)
  assert.match(ok, new RegExp(String(byteMargin)))
  assert.match(ok, /×1\.3/)
  assert.match(ok, /\/pl\//)
  assert.equal(ok.includes("engine attaches"), false)
  const broken = formatSummary([
    sampleAt("finished", "/", finishedFlat(budgets.finished["/"]), ["missing font"]),
  ])
  assert.match(broken, /measurement incomplete/)
  assert.match(broken, /missing font/)
  assert.match(broken, /### Tour/)
  assert.match(formatSummary([]), /no measurement/)
})
