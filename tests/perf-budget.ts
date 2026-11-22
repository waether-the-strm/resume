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
 *
 * Script bytes measured again the same day, when the keys and sound were wired to the tour
 * (two new parts, 1312 B): 10186, 10186, 10186. Nothing else moved.
 *
 * Measured again the same day, with the rail on that tour. Three cold loads, the same
 * bytes each time. Script 10591 (+405). CSS 7751 (+1031), which the previous margin
 * missed by 7 B. Document `/` 5079 (+361) and `/pl/` 5351 (+371). Font and layout
 * shift did not move. Paint this round stayed under the ceiling, so that ceiling stays:
 * `/` 1942.5, 1937.2, 1958.4; `/pl/` 1894.3, 1923.9, 1904.1.
 *
 * Measured again the same day, with the blob on that rail. Three cold loads, the same
 * bytes each time. CSS 10104 (+2353): the blob's stylesheet is on the home page.
 * Script 11399 (+808): the blob part. Document came out lower and stable, `/` 4947
 * and `/pl/` 5228. Font and layout shift did not move. Paint stayed under the
 * ceiling, so that ceiling stays: `/` 2417.8, 2421.0, 2422.3; `/pl/` 2421.7, 2392.4,
 * 2408.8.
 *
 * That paint was the blob's placement rules joining the page's component sheet. The sheet
 * had been inlined (3199 B). With the blob it was 4136 B, over the build's inline limit, so
 * the build emitted it as `/_astro/Work.*.css`: a third render-blocking stylesheet. On this
 * profile that is another round trip before paint. The rules are inlined in the document
 * now, and the home page is back to rebuild's two stylesheets. Three cold loads after that.
 * Paint is back with rebuild, so the ceiling stays: `/` 1957.0, 1930.4, 1944.3; `/pl/`
 * 1915.7, 1904.4, 1904.0. CSS is those two files, 5404 and 3214, 8618 together (the recorded
 * rebuild total was 7751; the third file, 1486, is gone). Document holds the blob and the
 * inlined rules: `/` 6062, `/pl/` 6354. Script, font and layout shift did not move.
 *
 * Measured again the same day, when the build's inline limit was set on purpose
 * (`vite.build.assetsInlineLimit` 16384 in astro.config.mjs, issue #111), and the blob's
 * hand-inlined `<style is:inline>` went back to ordinary `<style>` and `<style is:global>`.
 * The limit had been Astro's default, 4096, which the home page's component sheet crossed
 * with 937 B of new rules. At 16384 every component sheet is inlined and the home page loads
 * one stylesheet file, the shared base (21642 B raw, over the limit): the number of blocking
 * requests no longer depends on which component grows. Three cold loads, the same bytes each
 * time. CSS 5404 (-3214: the home sheet is in the document now). Document `/` 8938 (+2876)
 * and `/pl/` 9242 (+2888). Script 11405, font 49656 and layout shift did not move. Paint is
 * back under the ceiling, a little lower than the previous round, so that ceiling stays:
 * `/` 1886.6, 1918.8, 1886.3; `/pl/` 1934.3, 1916.7, 1916.4. For the record, with everything
 * inline (`inlineStylesheets: "always"`) the finished layout shift was 0.2854 on `/` and
 * 0.1380 on `/pl/` and the document 13458 B; with nothing inline (`"never"`) paint was
 * about 2420 ms.
 *
 * Measured again the same night, with the theme switch in the footer (#109), the blob's
 * raised surface (#108) and the notation (#110) on the page. Three cold loads, the same
 * bytes each time. Document `/` 9240 (+302) and `/pl/` 9531 (+289): the switch's markup and
 * its inlined rules. Script 11838 (+433): the switch binds through the preferences module.
 * CSS 5491 (+87). Font and layout shift did not move. Paint stayed with rebuild, so the
 * ceiling stays: `/` 1885.4, 1919.1; `/pl/` 1882.3, 1956.2 (the third run's table was lost
 * to two unrelated test failures, #118).
 *
 * Measured again on 22 Nov 2026, with the exit warp on the look. Three cold loads, the
 * same bytes each time. Document `/` 9679 and `/pl/` 9967. CSS 5900. Script 12387. Font
 * and layout shift did not move. Paint stayed with the ceiling, so that ceiling stays:
 * `/` 1891.8, 1894.8, 1871.2; `/pl/` 1862.2, 1925.3, 1893.5.
 *
 * The warp is the smaller part of that gap. Built with and without it, the stylesheet
 * file is the same 24519 B. The document grows by 246 B raw, about 53 B gzip, on both
 * locales: the inlined rules. The tour script grows by 581 B raw, about 169 B gzip. The
 * rest (CSS 5900 against the recorded 5491, and the remainder of the document and the
 * script) was already on rebuild and inside the margin. It is recorded here so the next
 * change is measured from the page as it is.
 *
 * Measured again on 22 Nov 2026, with the sparks (#38). Three cold loads, the same bytes
 * each time. CSS 6128 (+228): the `ui-spark` rules and its tokens, in the shared base sheet.
 * Script 12702 (+315): the sparks part and the plan it asks. Document `/` 9679 and `/pl/`
 * 9967, font and layout shift did not move. Paint stayed with the ceiling, so that ceiling
 * stays: `/` 1914.2, 1906.9, 1904.6; `/pl/` 1902.1, 1963.0, 1895.6 (rebuild's last round:
 * `/` 1891.8, 1894.8, 1871.2; `/pl/` 1862.2, 1925.3, 1893.5, about 1% to 3% apart, the
 * same noise as between those three runs).
 *
 * Measured again on 22 Nov 2026, with the structured data and the share tags (#144).
 * Three cold loads, the same bytes each time. Document `/` 10194 and `/pl/` 10502.
 * A build of rebuild, one cold load on this machine the same hour, transferred
 * document `/` 9952 and `/pl/` 10257, so this change adds 242 B and 245 B: the
 * JSON-LD block and the share-image tags, gzipped inside the document. CSS 6160
 * and script 12915 are that rebuild load as well. They sit ahead of the numbers
 * recorded after the sparks (6128 and 12702) and were already on the branch;
 * the stylesheet and the scripts are the same files. Font did not move. Layout
 * shift stayed 0: one tour load of `/pl/` scored 0.0004 and the other two scored
 * 0, under the margin. Paint stayed with rebuild, so the ceiling stays. This
 * round: `/` 1916.5, 1904.1, 1921.7; `/pl/` 1917.7, 1889.0, 1908.1. Rebuild's
 * load: `/` 1925.7, `/pl/` 1956.3. Rebuild's previous round: `/` 1914.2, 1906.9,
 * 1904.6; `/pl/` 1902.1, 1963.0, 1895.6. About 1% to 3% apart, the same noise.
 *
 * Measured again on 22 Nov 2026, with the scroll hint (#145). Three cold loads, the
 * same bytes each time. Document `/` 9981 (+302) and `/pl/` 10287 (+320): the hint's
 * markup. CSS 6549 (+421): `ui-hint` and its tokens, in the shared base sheet. Script
 * 13321 (+619): the hint part. Font did not move. Layout shift stayed 0, except one
 * tour `/` sample at 0.0004, inside the 0.01 margin, so it is not a new baseline.
 * Finished paint stayed with rebuild, so that ceiling stays: `/` 1938.5, 1937.1,
 * 1939.4; `/pl/` 1932.3, 1962.6, 1901.3. Against the sparks round above, `/` is about
 * 1% to 2% higher and `/pl/` is level with 1963.0. Tour paint is reported only:
 * `/` 2068.0, 2021.7, 2034.5; `/pl/` 2036.0, 2005.4, 2034.5.
 *
 * Measured again on 22 Nov 2026, this branch after merging rebuild (#144 and #155).
 * Three cold loads, the same bytes each time. Document `/` 9975 and `/pl/` 10279.
 * One load of this branch before that merge, after #149 had removed the footer
 * switch, transferred document `/` 9734 and `/pl/` 10035 and script 13006. #144
 * adds 242 B and 245 B of JSON-LD and share tags, which lands on 9976 and 10280;
 * this round is one byte under each. CSS 6549, the hint's sheet (#144's 6160 was
 * rebuild without the hint). Script 13007: the hint round's 13321 was before #149,
 * and #155's one position is the byte past 13006. Font did not move. Layout shift
 * stayed 0. Two tour loads of `/` scored 0.0005 and 0.0004, the other four loads
 * scored 0, inside the margin, so it is not a new baseline. Finished paint stayed
 * with the ceiling: `/` 1921.3, 1944.5, 1944.9; `/pl/` 1917.3, 1951.3, 1910.9.
 * The hint round was `/` 1938.5, 1937.1, 1939.4 and `/pl/` 1932.3, 1962.6, 1901.3.
 * #144's round was `/` 1916.5, 1904.1, 1921.7 and `/pl/` 1917.7, 1889.0, 1908.1.
 * About 1% to 3% apart, the same noise.
 *
 * Measured again on 22 Nov 2026, once the hint is dismissed only by leaving the
 * first frame. Three cold loads, the same bytes each time. Script 12964 (−43):
 * the part no longer listens for wheel, key or touch. Document `/` 9973 (−2) and
 * `/pl/` 10278 (−1): the hashed script address in the page. CSS 6549 and the font
 * did not move. Layout shift stayed 0, except one tour load of each locale at
 * 0.0005, inside the margin, so it is not a new baseline. Finished paint stayed
 * with the ceiling: `/` 1942.2, 1944.8, 1948.7; `/pl/` 1914.0, 1913.1, 1946.5.
 * The round above was `/` 1921.3, 1944.5, 1944.9 and `/pl/` 1917.3, 1951.3, 1910.9.
 * About 1% apart, the same noise.
 */
export const firstMeasurement: {
  finished: Record<PagePath, FinishedSample>
  tour: Record<PagePath, TourSample>
} = {
  finished: {
    "/": { finishedPaintMs: 2009, cls: 0, document: 9973, css: 6549, font: 49656 },
    "/pl/": { finishedPaintMs: 1904, cls: 0, document: 10278, css: 6549, font: 49656 },
  },
  tour: {
    "/": { cls: 0, script: 12964 },
    "/pl/": { cls: 0, script: 12964 },
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
