// Whether a built page tells crawlers not to index it.
//
// STRM_PRODUCTION is the build-time flag declared in astro.config.mjs. The production
// deploy sets it to the string `true`. Astro accepts only `true` and `false` for a
// boolean field. Any other value, including unset, keeps the noindex meta, so local
// builds and previews stay out of the index. Previews also send X-Robots-Tag: noindex.
//
// /ui stays noindex even on a production build. Whether that catalogue is indexed is
// the owner's call (ADR 0005). It stays in the sitemap.
//
// The 404 documents stay noindex. They are real URLs (/404, /pl/404) and are not results.

/** Must match the key in `env.schema` in astro.config.mjs. */
export const PRODUCTION_ENV = "STRM_PRODUCTION"

/** True when this page emits `<meta name="robots" content="noindex">`. */
export function emitsNoindex(pathname: string, production: boolean): boolean {
  if (staysUnindexed(pathname)) return true
  return !production
}

/** Paths that stay out of the index on every build, including production. */
export function staysUnindexed(pathname: string): boolean {
  const path = stripTrailingSlash(pathname)
  if (path === "/ui" || path.startsWith("/ui/")) return true
  if (path === "/404" || path.endsWith("/404")) return true
  return false
}

function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1)
  return pathname
}
