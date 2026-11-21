/**
 * Performance budget for the home page, in two states.
 *
 * The phone profile is Lighthouse 12.8.2's mid-tier mobile device (Moto G Power) with
 * `mobileSlow4G` applied the way Lighthouse's DevTools throttling applies it: request
 * latency 150 × 3.75 ms, throughput in bytes per second, CPU 4× the host. That is the
 * throttled mid-range phone this job can run inside Chromium. It is not Lighthouse's
 * simulated score, and it does not call a hosted service.
 *
 * The finished page is reduced motion: paint, layout shift, and the document, CSS and
 * font bytes. The tour is motion allowed: layout shift once the first scene is on show,
 * and the script bytes. Paint on the tour is reported, not budgeted.
 *
 * Budgets are the first cold-load measurement of this round plus the margin below.
 * Change `firstMeasurement` only when rebaselining from a new measurement. Do not edit
 * it so a run goes green.
 */

export const pages = ["/", "/pl/"] as const
export type PagePath = (typeof pages)[number]

export const pageStates = ["finished", "tour"] as const
export type PageState = (typeof pageStates)[number]

/** Added to each budgeted byte measurement. Covers header noise between two previews. */
export const byteMargin = 1024

/** Added to the measured cumulative layout shift. Sub-pixel noise, not a grade threshold. */
export const clsMargin = 0.01

/**
 * Finished-paint budget is the measurement times this. 1.3, because a factor of 2 let a
 * 50% regression through and the local and CI runs of the previous round agreed within 1%.
 */
export const paintFactor = 1.3

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

/** What the finished page is budgeted on. */
export type FinishedSample = {
  finishedPaintMs: number
  cls: number
  document: number
  css: number
  font: number
}

/** What the tour is budgeted on. Paint is not one of them. */
export type TourSample = {
  cls: number
  script: number
}

export type FinishedMetric = keyof FinishedSample
export type TourMetric = keyof TourSample
export type BudgetMetric = FinishedMetric | TourMetric

/**
 * Highest of three cold loads on 21 Nov 2026, this machine, the profile above, against
 * the built site on this branch. Finished paint is that highest sample rounded up to the
 * next millisecond. Bytes and layout shift were the same on every run. One layout-shift
 * entry was observed on each finished page and its score was 0. The tour recorded no
 * layout-shift entries. Replace these numbers only from a new measurement.
 *
 * Finished `/` paint ms: 2008.4, 1903.2, 1913.6.
 * Finished `/pl/` paint ms: 1875.9, 1903.1, 1888.0.
 * Tour `/` and `/pl/` layout shift: 0, 0, 0. Script bytes: 8874, 8874, 8874.
 */
export const firstMeasurement: {
  finished: Record<PagePath, FinishedSample>
  tour: Record<PagePath, TourSample>
} = {
  finished: {
    "/": { finishedPaintMs: 2009, cls: 0, document: 4718, css: 6720, font: 49656 },
    "/pl/": { finishedPaintMs: 1904, cls: 0, document: 4980, css: 6720, font: 49656 },
  },
  tour: {
    "/": { cls: 0, script: 8874 },
    "/pl/": { cls: 0, script: 8874 },
  },
}

export function budgetForFinished(sample: FinishedSample): FinishedSample {
  return {
    finishedPaintMs: Math.ceil(sample.finishedPaintMs * paintFactor),
    cls: sample.cls + clsMargin,
    document: sample.document + byteMargin,
    css: sample.css + byteMargin,
    font: sample.font + byteMargin,
  }
}

export function budgetForTour(sample: TourSample): TourSample {
  return {
    cls: sample.cls + clsMargin,
    script: sample.script + byteMargin,
  }
}

export const budgets: {
  finished: Record<PagePath, FinishedSample>
  tour: Record<PagePath, TourSample>
} = {
  finished: {
    "/": budgetForFinished(firstMeasurement.finished["/"]),
    "/pl/": budgetForFinished(firstMeasurement.finished["/pl/"]),
  },
  tour: {
    "/": budgetForTour(firstMeasurement.tour["/"]),
    "/pl/": budgetForTour(firstMeasurement.tour["/pl/"]),
  },
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
  state: PageState
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
  state: PageState
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

export function assemble(path: PagePath, raw: RawMeasurement, state: PageState): Sample {
  const gaps: string[] = []
  const notes: string[] = []
  const where = `${state} ${path}`
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
    gaps.push(`${where} document transferSize is ${raw.navigation.transferSize}`)
  }

  const pending = raw.resources.map((entry) => ({ ...entry, used: false }))
  for (const response of raw.responses) {
    if (response.url === "about:blank") continue
    if (response.status >= 300 && response.status < 400) continue
    if (response.status !== 200) {
      gaps.push(`${where} ${response.resourceType} ${response.url} status ${response.status}`)
      continue
    }
    if (response.resourceType === "document") continue

    const match = pending.find((entry) => !entry.used && entry.url === response.url)
    if (!match) {
      const counted = transfers.some((transfer) => transfer.url === response.url)
      if (counted) notes.push(`${where} duplicate response, counted once: ${response.url}`)
      else gaps.push(`${where} has no resource timing for ${response.resourceType} ${response.url}`)
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
    gaps.push(`${where} resource timing had no response: ${entry.url}`)
    transfers.push({
      url: entry.url,
      resourceType: "other",
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      headerDelayMs: entry.headerDelayMs,
    })
  }

  const bytes = totalBytes(transfers)
  if (bytes.document <= 0) gaps.push(`${where} transferred no document`)
  if (bytes.css <= 0) gaps.push(`${where} transferred no CSS`)
  if (bytes.font <= 0) gaps.push(`${where} transferred no font`)
  if (state === "tour" && bytes.script <= 0) gaps.push(`${where} transferred no script`)

  return {
    state,
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
        `${sample.state} ${sample.path} ${kindOf(transfer.resourceType)} ${transfer.url} header delay ${transfer.headerDelayMs.toFixed(0)} ms, throttle is ${latencyMs} ms`
    )
}

const metricLabel: Record<BudgetMetric, string> = {
  finishedPaintMs: "Finished paint",
  cls: "Layout shift",
  document: "Document",
  css: "CSS",
  font: "Font",
  script: "Script",
}

/** Ignores a millionth, which is binary dust, not a looser budget. */
function exceeds(measured: number, budget: number): boolean {
  return measured - budget > 1e-6
}

export function overages(sample: Sample): Overage[] {
  const found: Overage[] = []
  const add = (metric: BudgetMetric, measured: number, limit: number) => {
    if (!exceeds(measured, limit)) return
    found.push({
      state: sample.state,
      path: sample.path,
      metric,
      measured,
      budget: limit,
    })
  }
  if (sample.state === "finished") {
    const budget = budgets.finished[sample.path]
    add("finishedPaintMs", sample.finishedPaintMs, budget.finishedPaintMs)
    add("cls", sample.cls, budget.cls)
    add("document", sample.bytes.document, budget.document)
    add("css", sample.bytes.css, budget.css)
    add("font", sample.bytes.font, budget.font)
    return found
  }
  const budget = budgets.tour[sample.path]
  add("cls", sample.cls, budget.cls)
  add("script", sample.bytes.script, budget.script)
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

function tableRows(sample: Sample): string[] {
  const row = (label: string, measured: string, budget: string) =>
    `| \`${sample.path}\` | ${label} | ${measured} | ${budget} |`
  const lines: string[] = []
  if (sample.state === "finished") {
    const budget = budgets.finished[sample.path]
    lines.push(
      row(
        "Finished paint",
        formatMetric("finishedPaintMs", sample.finishedPaintMs),
        formatMetric("finishedPaintMs", budget.finishedPaintMs)
      ),
      row("Layout shift", formatMetric("cls", sample.cls), formatMetric("cls", budget.cls)),
      row("Document", `${sample.bytes.document} B`, `${budget.document} B`),
      row("CSS", `${sample.bytes.css} B`, `${budget.css} B`),
      row("Font", `${sample.bytes.font} B`, `${budget.font} B`),
      row("Script", `${sample.bytes.script} B`, "reported")
    )
  } else {
    const budget = budgets.tour[sample.path]
    lines.push(
      row("Layout shift", formatMetric("cls", sample.cls), formatMetric("cls", budget.cls)),
      row("Script", `${sample.bytes.script} B`, `${budget.script} B`),
      row("Paint", formatMetric("finishedPaintMs", sample.finishedPaintMs), "reported"),
      row("Document", `${sample.bytes.document} B`, "reported"),
      row("CSS", `${sample.bytes.css} B`, "reported"),
      row("Font", `${sample.bytes.font} B`, "reported")
    )
  }
  lines.push(
    row("First contentful paint", formatOptionalMs(sample.fcpMs), "reported"),
    row("Largest contentful paint", formatOptionalMs(sample.lcpMs), "reported"),
    row("Other", `${sample.bytes.other} B`, "reported")
  )
  return lines
}

function stateSection(
  title: string,
  prose: string[],
  state: PageState,
  samples: Sample[]
): string[] {
  const lines = [`### ${title}`, "", ...prose, ""]
  const own = samples.filter((sample) => sample.state === state)
  if (own.length === 0) {
    lines.push("No page was measured.", "")
    return lines
  }
  lines.push("| Page | Metric | Measured | Budget |", "| --- | --- | ---: | ---: |")
  for (const sample of own) lines.push(...tableRows(sample))
  lines.push("")
  return lines
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
    "Bytes are Resource Timing transferSize (response headers plus the encoded body) from astro preview. Inline CSS and the theme script travel inside the document. Layout shift ignores shifts with recent input.",
    "",
    ...stateSection(
      "Finished page",
      [
        "Reduced motion. This is the page the server rendered.",
        "",
        "Finished paint is the time from navigation start until the upright Recursive Variable face has loaded and two frames have been painted. Layout shift is the cumulative shift up to that moment.",
        "",
        `Budgets were set from the first measurement on ${measuredOn}: finished paint ×${paintFactor}, layout shift +${clsMargin}, each of document, CSS and font +${byteMargin} B. Script bytes are reported, not budgeted.`,
      ],
      "finished",
      samples
    ),
    ...stateSection(
      "Tour",
      [
        'Motion allowed. Layout shift and paint are read after the html element has `data-tour="on"` and the first scene is on show: the stage\'s `data-scene` is `0` and the equation is visible, then two frames. Paint is that moment. It is reported, not budgeted.',
        "",
        `Budgets were set from the first measurement on ${measuredOn}: layout shift +${clsMargin}, script +${byteMargin} B.`,
      ],
      "tour",
      samples
    ),
  ]

  if (samples.length === 0) return lines.join("\n")

  const readings = samples.map((sample) => ({
    state: sample.state,
    path: sample.path,
    finishedPaintMs: sample.finishedPaintMs,
    cls: sample.cls,
    document: sample.bytes.document,
    css: sample.bytes.css,
    font: sample.bytes.font,
    script: sample.bytes.script,
    fcpMs: sample.fcpMs,
    lcpMs: sample.lcpMs,
    other: sample.bytes.other,
  }))
  lines.push("```json", JSON.stringify(readings, null, 2), "```", "")

  for (const sample of samples) {
    const problems = overages(sample)
    if (problems.length > 0) {
      lines.push(`Over \`${sample.state} ${sample.path}\`:`)
      for (const problem of problems) {
        lines.push(
          `- ${metricLabel[problem.metric]} measured ${formatMetric(problem.metric, problem.measured)}, budget ${formatMetric(problem.metric, problem.budget)}.`
        )
      }
      lines.push("")
    }
    if (sample.gaps.length > 0) {
      lines.push(`Incomplete \`${sample.state} ${sample.path}\`:`)
      for (const gap of sample.gaps) lines.push(`- ${gap}`)
      lines.push("")
    }
    if (sample.notes.length > 0) {
      lines.push(`Notes \`${sample.state} ${sample.path}\`:`)
      for (const note of sample.notes) lines.push(`- ${note}`)
      lines.push("")
    }
    lines.push(`Transfers \`${sample.state} ${sample.path}\`:`, "")
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
