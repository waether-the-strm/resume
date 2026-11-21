import { defineConfig, devices } from "@playwright/test"

// The suite hits the built site. `astro preview` defaults to 4321, which other work on this
// machine uses, so the static server stays on 4333. E2E_PORT moves it when that port is taken.
const host = "127.0.0.1"
const port = Number(process.env.E2E_PORT ?? 4333)

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: `http://${host}:${port}`,
    trace: "retain-on-failure",
    // The specs here check the finished page: what the server renders, and what a reader who
    // asks for reduced motion keeps. With motion allowed the tour takes the page over; its
    // specs opt back in with `test.use({ contextOptions: { reducedMotion: "no-preference" } })`.
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm --filter @strm/site exec astro preview --host ${host} --port ${port} --ignore-lock`,
    url: `http://${host}:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
