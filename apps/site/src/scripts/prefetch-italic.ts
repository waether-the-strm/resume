import { prefetch } from "astro:prefetch"
import italicFont from "@strm/ui/fonts/recursive-italic.woff2?url"
import { pageUsesItalics } from "../lib/italic"

/**
 * Fetch the italic file when the reader shows intent for a page that uses it.
 * Hover and focus wait the same 80ms Astro's hover strategy waits, so a pass
 * over the link does not fetch. Touch starts the fetch immediately: the guide's
 * hover strategy does not include touch, and a tap would otherwise navigate
 * before the timer. `prefetch` still skips a slow connection and data saver.
 * The file is not preloaded; without JavaScript the italic page fetches it
 * from the font-face rule.
 */
const HOVER_MS = 80

export function prefetchItalicOnIntent(): void {
  let current: HTMLAnchorElement | null = null
  let timer = 0

  const wants = (anchor: HTMLAnchorElement): boolean => {
    let url: URL
    try {
      url = new URL(anchor.href)
    } catch {
      return false
    }
    return url.origin === location.origin && pageUsesItalics(url.pathname)
  }

  const cancel = () => {
    current = null
    if (timer !== 0) window.clearTimeout(timer)
    timer = 0
  }

  const schedule = (anchor: HTMLAnchorElement) => {
    if (current === anchor) return
    cancel()
    if (!wants(anchor)) return
    current = anchor
    timer = window.setTimeout(() => {
      timer = 0
      prefetch(italicFont)
    }, HOVER_MS)
  }

  const anchorFrom = (event: Event): HTMLAnchorElement | null => {
    const target = event.target
    if (!(target instanceof Element)) return null
    const found = target.closest("a")
    return found instanceof HTMLAnchorElement ? found : null
  }

  document.addEventListener("mouseover", (event) => {
    const anchor = anchorFrom(event)
    if (anchor) schedule(anchor)
  })

  document.addEventListener("mouseout", (event) => {
    if (!current) return
    const next = event.relatedTarget
    if (next instanceof Node && current.contains(next)) return
    cancel()
  })

  document.addEventListener("focusin", (event) => {
    const anchor = anchorFrom(event)
    if (anchor) schedule(anchor)
  })

  document.addEventListener("focusout", () => {
    cancel()
  })

  document.addEventListener(
    "touchstart",
    (event) => {
      const anchor = anchorFrom(event)
      if (anchor && wants(anchor)) prefetch(italicFont)
    },
    { passive: true }
  )
}
