// After the scenario G specs, their measurements go to the job summary.
// Each test writes one file under test-results/rest; this joins them. Locally there is no
// GITHUB_STEP_SUMMARY, so the same text is still left at test-results/rest.md.
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

export default function globalTeardown(): void {
  const dir = fileURLToPath(new URL("./test-results/rest/", import.meta.url))
  if (!existsSync(dir)) return
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
  if (files.length === 0) return
  const body = [
    "## Scenario G, where scroll rests",
    "",
    ...files.map((name) => readFileSync(join(dir, name), "utf8")),
  ].join("\n")
  const combined = fileURLToPath(new URL("./test-results/rest.md", import.meta.url))
  writeFileSync(combined, body)
  const summary = process.env.GITHUB_STEP_SUMMARY
  if (summary) appendFileSync(summary, `\n${body}`)
  console.log(`\nScenario G measurements: ${files.length} written to ${combined}`)
}
