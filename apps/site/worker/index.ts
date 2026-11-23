// The Worker entry. Static pages stay on the asset binding. Only /api/telemetry
// is handled here, and only because wrangler.jsonc lists that path in
// `run_worker_first`. There is no Astro server adapter (ADR 0002).

import { handleTelemetry, type TelemetryEnv } from "../src/worker/telemetry.ts"

interface Env extends TelemetryEnv {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === "/api/telemetry") return handleTelemetry(request, env)
    return env.ASSETS.fetch(request)
  },
}
