import assert from "node:assert/strict"
import { test } from "node:test"
import {
  assemble,
  budgetFor,
  budgets,
  byteMargin,
  clsMargin,
  firstMeasurement,
  formatSummary,
  kindOf,
  overages,
  pages,
  paintMarginRatio,
  phoneProfile,
  throttlingGaps,
  type MetricSample,
  type PagePath,
  type RawMeasurement,
  type Sample,
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
  for (const path of pages) {
    const measured = firstMeasurement[path]
    assert.deepEqual(budgets[path], budgetFor(measured))
    assert.equal(
      budgets[path].finishedPaintMs,
      Math.ceil(measured.finishedPaintMs * (1 + paintMarginRatio))
    )
    assert.equal(budgets[path].cls, measured.cls + clsMargin)
    assert.equal(budgets[path].document, measured.document + byteMargin)
    assert.equal(budgets[path].css, measured.css + byteMargin)
    assert.equal(budgets[path].font, measured.font + byteMargin)
    assert.equal(budgets[path].script, measured.script + byteMargin)
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
  const sample = assemble("/", {
    ...raw(),
    responses: [
      ...raw().responses,
      { url: `${origin}/_astro/recursive.woff2`, resourceType: "font", status: 200 },
    ],
  })
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
    })
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
})

test("a transfer faster than the throttle is a gap, and a cache hit is not", () => {
  const sample = assemble("/", raw())
  const fast = { ...sample.transfers[0]!, headerDelayMs: 10, transferSize: 100 }
  const cached = { ...fast, transferSize: 0 }
  assert.equal(throttlingGaps({ ...sample, transfers: [fast] }, 562.5).length, 1)
  assert.deepEqual(throttlingGaps({ ...sample, transfers: [cached] }, 562.5), [])
  assert.deepEqual(throttlingGaps(sample, 562.5), [])
})

function sampleAt(path: PagePath, metrics: MetricSample, gaps: string[] = []): Sample {
  return {
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

test("a page on its budget passes and one byte over it fails", () => {
  const path: PagePath = "/"
  const budget = budgets[path]
  assert.deepEqual(overages(sampleAt(path, budget)), [])
  const over = sampleAt(path, { ...budget, font: budget.font + 1 })
  const problems = overages(over)
  assert.equal(problems.length, 1)
  assert.equal(problems[0]?.metric, "font")
  assert.equal(problems[0]?.measured, budget.font + 1)
})

test("the summary names both pages, the margin, and an incomplete measurement", () => {
  const within = pages.map((path) => sampleAt(path, budgets[path]))
  const ok = formatSummary(within)
  assert.match(ok, /within budget/)
  assert.match(ok, new RegExp(String(byteMargin)))
  assert.match(ok, /\/pl\//)
  const broken = formatSummary([sampleAt("/", budgets["/"], ["missing font"])])
  assert.match(broken, /measurement incomplete/)
  assert.match(broken, /missing font/)
  assert.match(formatSummary([]), /no measurement/)
})
