/**
 * Performance budget for the finished home page.
 *
 * The phone profile is Lighthouse 12.8.2's mid-tier mobile device (Moto G Power) with
 * `mobileSlow4G` applied the way Lighthouse's DevTools throttling applies it: request
 * latency 150 × 3.75 ms, throughput in bytes per second, CPU 4× the host. That is the
 * throttled mid-range phone this job can run inside Chromium. It is not Lighthouse's
 * simulated score, and it does not call a hosted service.
 *
 * Budgets are the first cold-load measurement plus the margin below. Change
 * `firstMeasurement` only when rebaselining from a new measurement. Do not edit it so
 * a run goes green.
 */

export const pages = ["/", "/pl/"] as const
export type PagePath = (typeof pages)[number]

/** Added to each transferred-byte measurement. Covers header noise between two previews. */
export const byteMargin = 1024

/** Added to the measured cumulative layout shift. Sub-pixel noise, not a grade threshold. */
export const clsMargin = 0.01

/**
 * Finished-paint budget is the measurement times (1 + this). CPU throttling is a multiple
 * of the host, and the enforcing run is a GitHub-hosted runner, not the machine that took
 * the first measurement.
 */
export const paintMarginRatio = 1

export const measuredOn = "21 Nov 2026"

export const phoneProfile = {
  viewport: { width: 412, height: 823 },
  deviceScaleFactor: 1.75,
  userAgent:
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
  latencyMs: 150 * 3.75,
  downloadThroughputBytesPerSecond: Math.floor((1.6 * 1024 * 1024) / 8),
  uploadThroughputBytesPerSecond: Math.floor((750 * 1024) / 8),
  cpuSlowdown: 4,
} as const

export type ResourceKind = "document" | "css" | "font" | "script" | "other"

export type MetricSample = {
  finishedPaintMs: number
  cls: number
  document: number
  css: number
  font: number
  script: number
}

export type BudgetMetric = keyof MetricSample

/**
 * Highest of three cold loads on 21 Nov 2026, this machine, the profile above,
 * against the built site on this branch. Finished paint is that highest sample
 * rounded up to the next millisecond. Bytes and layout shift were the same on
 * every run. One layout-shift entry was observed on each page and its score was 0.
 *
 * `/` paint ms: 1512.9, 1482.6, 1481.5.
 * `/pl/` paint ms: 1472.8, 1461.0, 1471.3.
 */
export const firstMeasurement: Record<PagePath, MetricSample> = {
  "/": {
    finishedPaintMs: 1513,
    cls: 0,
    document: 3454,
    css: 3489,
    font: 49656,
    script: 0,
  },
  "/pl/": {
    finishedPaintMs: 1473,
    cls: 0,
    document: 3660,
    css: 3489,
    font: 49656,
    script: 0,
  },
}

export function budgetFor(sample: MetricSample): MetricSample {
  return {
    finishedPaintMs: Math.ceil(sample.finishedPaintMs * (1 + paintMarginRatio)),
    cls: sample.cls + clsMargin,
    document: sample.document + byteMargin,
    css: sample.css + byteMargin,
    font: sample.font + byteMargin,
    script: sample.script + byteMargin,
  }
}

export const budgets: Record<PagePath, MetricSample> = {
  "/": budgetFor(firstMeasurement["/"]),
  "/pl/": budgetFor(firstMeasurement["/pl/"]),
}

export function kindOf(resourceType: string): ResourceKind {
  switch (resourceType) {
    case "document":
      return "document"
    case "stylesheet":
      return "css"
    case "font":
      return "font"
    case "script":
      return "script"
    default:
      return "other"
  }
}

export type ByteTotals = Record<ResourceKind, number>

export type Transfer = {
  url: string
  resourceType: string
  transferSize: number
  encodedBodySize: number
  headerDelayMs: number
}

export type TimedEntry = {
  url: string
  transferSize: number
  encodedBodySize: number
  headerDelayMs: number
}

export type SeenResponse = {
  url: string
  resourceType: string
  status: number
}

export type RawMeasurement = {
  finishedPaintMs: number
  cls: number
  fcpMs: number | null
  lcpMs: number | null
  navigation: TimedEntry
  resources: TimedEntry[]
  responses: SeenResponse[]
}

export type Sample = {
  path: PagePath
  finishedPaintMs: number
  cls: number
  fcpMs: number | null
  lcpMs: number | null
  bytes: ByteTotals
  transfers: Transfer[]
  notes: string[]
  gaps: string[]
}

export type Overage = {
  path: PagePath
  metric: BudgetMetric
  measured: number
  budget: number
}

export function totalBytes(transfers: Transfer[]): ByteTotals {
  const totals: ByteTotals = { document: 0, css: 0, font: 0, script: 0, other: 0 }
  for (const transfer of transfers) totals[kindOf(transfer.resourceType)] += transfer.transferSize
  return totals
}

export function assemble(path: PagePath, raw: RawMeasurement): Sample {
  const gaps: string[] = []
  const notes: string[] = []
  const transfers: Transfer[] = [
    {
      url: raw.navigation.url,
      resourceType: "document",
      transferSize: raw.navigation.transferSize,
      encodedBodySize: raw.navigation.encodedBodySize,
      headerDelayMs: raw.navigation.headerDelayMs,
    },
  ]
  if (raw.navigation.transferSize <= 0) {
    gaps.push(`${path} document transferSize is ${raw.navigation.transferSize}`)
  }

  const pending = raw.resources.map((entry) => ({ ...entry, used: false }))
  for (const response of raw.responses) {
    if (response.url === "about:blank") continue
    if (response.status >= 300 && response.status < 400) continue
    if (response.status !== 200) {
      gaps.push(`${path} ${response.resourceType} ${response.url} status ${response.status}`)
      continue
    }
    if (response.resourceType === "document") continue

    const match = pending.find((entry) => !entry.used && entry.url === response.url)
    if (!match) {
      const counted = transfers.some((transfer) => transfer.url === response.url)
      if (counted) notes.push(`${path} duplicate response, counted once: ${response.url}`)
      else gaps.push(`${path} has no resource timing for ${response.resourceType} ${response.url}`)
      continue
    }
    match.used = true
    transfers.push({
      url: response.url,
      resourceType: response.resourceType,
      transferSize: match.transferSize,
      encodedBodySize: match.encodedBodySize,
      headerDelayMs: match.headerDelayMs,
    })
  }

  for (const entry of pending) {
    if (entry.used) continue
    gaps.push(`${path} resource timing had no response: ${entry.url}`)
    transfers.push({
      url: entry.url,
      resourceType: "other",
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      headerDelayMs: entry.headerDelayMs,
    })
  }

  const bytes = totalBytes(transfers)
  if (bytes.document <= 0) gaps.push(`${path} transferred no document`)
  if (bytes.css <= 0) gaps.push(`${path} transferred no CSS`)
  if (bytes.font <= 0) gaps.push(`${path} transferred no font`)

  return {
    path,
    finishedPaintMs: raw.finishedPaintMs,
    cls: raw.cls,
    fcpMs: raw.fcpMs,
    lcpMs: raw.lcpMs,
    bytes,
    transfers,
    notes,
    gaps,
  }
}

/** A cold transfer that returns faster than the throttle did not see the throttle. */
export function throttlingGaps(sample: Sample, latencyMs: number): string[] {
  const minimum = latencyMs * 0.9
  return sample.transfers
    .filter((transfer) => transfer.transferSize > 0 && transfer.headerDelayMs < minimum)
    .map(
      (transfer) =>
        `${sample.path} ${kindOf(transfer.resourceType)} ${transfer.url} header delay ${transfer.headerDelayMs.toFixed(0)} ms, throttle is ${latencyMs} ms`
    )
}

const metricOrder = [
  "finishedPaintMs",
  "cls",
  "document",
  "css",
  "font",
  "script",
] as const satisfies readonly BudgetMetric[]

const metricLabel: Record<BudgetMetric, string> = {
  finishedPaintMs: "Finished paint",
  cls: "Layout shift",
  document: "Document",
  css: "CSS",
  font: "Font",
  script: "Script",
}

export function measuredMetrics(sample: Sample): MetricSample {
  return {
    finishedPaintMs: sample.finishedPaintMs,
    cls: sample.cls,
    document: sample.bytes.document,
    css: sample.bytes.css,
    font: sample.bytes.font,
    script: sample.bytes.script,
  }
}

/** Ignores a millionth, which is binary dust, not a looser budget. */
function exceeds(measured: number, budget: number): boolean {
  return measured - budget > 1e-6
}

export function overages(sample: Sample): Overage[] {
  const budget = budgets[sample.path]
  const measured = measuredMetrics(sample)
  const found: Overage[] = []
  for (const metric of metricOrder) {
    const value = measured[metric]
    const limit = budget[metric]
    if (exceeds(value, limit)) {
      found.push({ path: sample.path, metric, measured: value, budget: limit })
    }
  }
  return found
}

function formatMetric(metric: BudgetMetric, value: number): string {
  if (metric === "finishedPaintMs") return `${value.toFixed(1)} ms`
  if (metric === "cls") return value.toFixed(4)
  return `${value} B`
}

function formatOptionalMs(value: number | null): string {
  return value === null ? "none" : `${value.toFixed(1)} ms`
}

function urlPath(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

export function verdict(samples: Sample[]): string {
  if (samples.length === 0) return "no measurement"
  const gapCount = samples.reduce((count, sample) => count + sample.gaps.length, 0)
  if (gapCount > 0) return "measurement incomplete"
  const over = samples.reduce((count, sample) => count + overages(sample).length, 0)
  if (over > 0) return "over budget"
  return "within budget"
}

export function formatSummary(samples: Sample[]): string {
  const lines = [
    "### Performance budget",
    "",
    `Result: ${verdict(samples)}.`,
    "",
    "Chromium, cold load, cache disabled, JavaScript left on. The profile is Lighthouse 12.8.2 mid-tier mobile (Moto G Power) with DevTools throttling applied in the browser.",
    "",
    `- Device: Moto G Power (2022), ${phoneProfile.viewport.width}×${phoneProfile.viewport.height}, device scale ${phoneProfile.deviceScaleFactor}.`,
    `- Network: ${phoneProfile.latencyMs} ms latency, ${phoneProfile.downloadThroughputBytesPerSecond} B/s down, ${phoneProfile.uploadThroughputBytesPerSecond} B/s up.`,
    `- CPU: ${phoneProfile.cpuSlowdown}× the host.`,
    "",
    "Finished paint is the time from navigation start until Recursive Variable has loaded and two frames have been painted. Layout shift is the cumulative shift up to that moment, ignoring shifts with recent input. Bytes are Resource Timing transferSize (response headers plus the encoded body) from astro preview. Inline CSS and the theme script travel inside the document.",
    "",
    "The scroll engine is not on this page yet, so the layout shift is the shift of the finished static page. The same budget applies when the engine attaches.",
    "",
    `Budgets were set from the first measurement on ${measuredOn} plus this margin: finished paint ×${1 + paintMarginRatio}, layout shift +${clsMargin}, each of document, CSS, font and script +${byteMargin} B.`,
    "",
  ]

  if (samples.length === 0) {
    lines.push("No page was measured.", "")
    return lines.join("\n")
  }

  lines.push("| Page | Metric | Measured | Budget |", "| --- | --- | ---: | ---: |")
  for (const sample of samples) {
    const budget = budgets[sample.path]
    const measured = measuredMetrics(sample)
    for (const metric of metricOrder) {
      lines.push(
        `| \`${sample.path}\` | ${metricLabel[metric]} | ${formatMetric(metric, measured[metric])} | ${formatMetric(metric, budget[metric])} |`
      )
    }
    lines.push(
      `| \`${sample.path}\` | First contentful paint | ${formatOptionalMs(sample.fcpMs)} | reported |`,
      `| \`${sample.path}\` | Largest contentful paint | ${formatOptionalMs(sample.lcpMs)} | reported |`,
      `| \`${sample.path}\` | Other | ${sample.bytes.other} B | reported |`
    )
  }
  lines.push("")

  const readings = samples.map((sample) => ({
    path: sample.path,
    ...measuredMetrics(sample),
    fcpMs: sample.fcpMs,
    lcpMs: sample.lcpMs,
    other: sample.bytes.other,
  }))
  lines.push("```json", JSON.stringify(readings, null, 2), "```", "")

  for (const sample of samples) {
    const problems = overages(sample)
    if (problems.length > 0) {
      lines.push(`Over \`${sample.path}\`:`)
      for (const problem of problems) {
        lines.push(
          `- ${metricLabel[problem.metric]} measured ${formatMetric(problem.metric, problem.measured)}, budget ${formatMetric(problem.metric, problem.budget)}.`
        )
      }
      lines.push("")
    }
    if (sample.gaps.length > 0) {
      lines.push(`Incomplete \`${sample.path}\`:`)
      for (const gap of sample.gaps) lines.push(`- ${gap}`)
      lines.push("")
    }
    if (sample.notes.length > 0) {
      lines.push(`Notes \`${sample.path}\`:`)
      for (const note of sample.notes) lines.push(`- ${note}`)
      lines.push("")
    }
    lines.push(`Transfers \`${sample.path}\`:`, "")
    lines.push(
      "| Resource | Type | Transferred | Encoded body | Header delay |",
      "| --- | --- | ---: | ---: | ---: |"
    )
    for (const transfer of sample.transfers) {
      lines.push(
        `| \`${urlPath(transfer.url)}\` | ${kindOf(transfer.resourceType)} | ${transfer.transferSize} B | ${transfer.encodedBodySize} B | ${transfer.headerDelayMs.toFixed(0)} ms |`
      )
    }
    lines.push("")
  }

  return lines.join("\n")
}
