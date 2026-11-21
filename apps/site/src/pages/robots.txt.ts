import type { APIRoute } from "astro"

// Crawlers may fetch the pages. The noindex meta in Base.astro is what keeps the
// rebuild out of the index until v2.0.0. This file only points at the sitemap.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL("sitemap-index.xml", site)
  const body = ["User-agent: *", "Allow: /", "", `Sitemap: ${sitemap.href}`, ""].join("\n")
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
