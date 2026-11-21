import sitemap from "@astrojs/sitemap"
import { defineConfig, envField } from "astro/config"

export default defineConfig({
  site: "https://strm.dev",
  output: "static",
  // STRM_PRODUCTION=true marks the build that may be indexed. Astro's boolean
  // field accepts only the strings "true" and "false". Unset stays noindex.
  // The production workflow sets it; previews do not. See src/lib/indexing.ts.
  env: {
    schema: {
      STRM_PRODUCTION: envField.boolean({
        context: "server",
        access: "public",
        optional: true,
        default: false,
      }),
    },
  },
  // Internal links only: Astro skips anything on another origin. Hover also
  // prefetches on focus. Touch is the tap strategy, and a slow connection or
  // data saver falls back to tap. That check stays on. No client prerender.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  i18n: {
    locales: ["en", "pl", "no"],
    defaultLocale: "en",
    routing: { prefixDefaultLocale: false },
  },
  // Astro 7 does not write a sitemap. This integration lists built pages and adds
  // hreflang only for a path that exists in more than one locale. Norwegian is
  // not launched, so it is not an alternate. /ui and /ui/primitives stay in the
  // list. They are noindex until the owner decides whether the catalogue is
  // indexed (ADR 0005).
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en",
          pl: "pl",
        },
      },
    }),
  ],
})
