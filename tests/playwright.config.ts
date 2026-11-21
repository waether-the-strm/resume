import { defineConfig, devices } from "@playwright/test"

// The suite hits the built site. `astro preview` defaults to 4321, which other work on this
// machine uses, so the static server stays on 4333.
const host = "127.0.0.1"
const port = 4333

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: `http://${host}:${port}`,
    trace: "retain-on-failure",
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
