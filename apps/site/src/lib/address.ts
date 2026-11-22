// The address the host serves.
//
// Astro's static build uses the directory format, so a page is `cv/index.html`.
// `wrangler.jsonc` does not set `assets.html_handling`. Cloudflare's default is
// `auto-trailing-slash`: a folder index is served with a trailing slash, and the
// bare path redirects to it.
// https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/
//
// Canonical, hreflang, og:url and the sitemap all use this form. `/` stays `/`.

/** The path a crawler should cite. A hash or a query stays put. */
export function withTrailingSlash(path: string): string {
  const cut = endOfPathname(path)
  const pathname = path.slice(0, cut)
  const suffix = path.slice(cut)
  if (pathname === "" || pathname === "/") return `/${suffix}`
  const slashed = pathname.endsWith("/") ? pathname : `${pathname}/`
  return `${slashed}${suffix}`
}

function endOfPathname(path: string): number {
  const hash = path.indexOf("#")
  const query = path.indexOf("?")
  if (hash === -1) return query === -1 ? path.length : query
  if (query === -1) return hash
  return Math.min(hash, query)
}
