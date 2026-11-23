// Playwright previews the built site. Astro's static preview drops Vite plugins,
// so this starts that preview and answers POST /api/telemetry on the same port
// before the static handler sees it. Wrangler preview runs the Worker itself.

import { createRequire } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"
import { respondTelemetry } from "./preview-telemetry.mjs"

const args = process.argv.slice(2)

function flag(name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const host = flag("--host", "127.0.0.1")
const port = Number(flag("--port", "4333"))
const root = fileURLToPath(new URL(".", import.meta.url))

const require = createRequire(import.meta.url)
const astroPackage = require.resolve("astro/package.json")
const previewUrl = pathToFileURL(
  fileURLToPath(new URL("./dist/core/preview/index.js", pathToFileURL(astroPackage)))
)
const { default: preview } = await import(previewUrl.href)

const started = await preview({
  root,
  server: { host, port },
})

const httpServer = started.server
if (!httpServer) throw new Error("astro preview did not expose its HTTP server")

const listeners = httpServer.listeners("request")
httpServer.removeAllListeners("request")
httpServer.on("request", (req, res) => {
  respondTelemetry(req, res)
    .then((handled) => {
      if (handled) return
      for (const listener of listeners) listener.call(httpServer, req, res)
    })
    .catch(() => {
      res.statusCode = 500
      res.end()
    })
})
