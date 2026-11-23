// Serves POST /api/telemetry during `astro dev`. The built site is static, and
// `astro preview` drops user Vite plugins, so the Playwright server wraps that
// command instead (preview-with-telemetry.mjs). The handler is the Worker's;
// without a D1 binding it logs the event and answers 200.

import { handleTelemetry } from "./src/worker/telemetry.ts"

export function telemetryPreview() {
  return {
    name: "strm-telemetry-preview",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (await respondTelemetry(req, res)) return
        next()
      })
    },
  }
}

export async function respondTelemetry(req, res) {
  const path = (req.url ?? "").split("?")[0]
  if (req.method !== "POST" || path !== "/api/telemetry") return false
  try {
    const request = await toRequest(req)
    const response = await handleTelemetry(request, {})
    res.statusCode = response.status
    const type = response.headers.get("content-type")
    if (type) res.setHeader("content-type", type)
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch {
    console.log(JSON.stringify({ error: "preview_failed" }))
    res.statusCode = 500
    res.end()
  }
  return true
}

async function toRequest(req) {
  const host = req.headers.host ?? "127.0.0.1"
  const url = `http://${host}${req.url ?? "/"}`
  const method = req.method ?? "GET"
  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(", "))
  }
  headers.delete("content-length")
  headers.delete("transfer-encoding")
  if (!headers.has("cf-connecting-ip") && req.socket?.remoteAddress) {
    headers.set("cf-connecting-ip", req.socket.remoteAddress)
  }
  const body = Buffer.concat(chunks)
  return new Request(url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : body,
  })
}
