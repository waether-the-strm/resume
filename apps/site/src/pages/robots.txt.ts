import type { APIRoute } from "astro"

// Crawlers may fetch the pages. Base.astro emits noindex unless the build was
// run with STRM_PRODUCTION=true. /ui and the 404 stay noindex even then, and
// the sitemap does not list them.
// This file only points at the sitemap.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL("sitemap-index.xml", site)
  const body = ["User-agent: *", "Allow: /", "", `Sitemap: ${sitemap.href}`, ""].join("\n")
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
