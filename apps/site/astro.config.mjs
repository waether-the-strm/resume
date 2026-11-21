import sitemap from "@astrojs/sitemap"
import { defineConfig, envField } from "astro/config"

export default defineConfig({
  site: "https://strm.dev",
  output: "static",
  // Stylesheets. `build.inlineStylesheets` stays "auto" (the default): a stylesheet is
  // inlined into the document when it is smaller than `vite.build.assetsInlineLimit`
  // (default 4096 B), and emitted as a render-blocking file when it is not. The limit is
  // per stylesheet. The default sat between the home page's component sheet and itself:
  // 3199 B, then 4136 B once the blob joined, which turned a document-inlined sheet into a
  // third request and moved finished paint by one round trip (issue #111). 16384 B puts the
  // limit between the largest component sheet (Home, 12.6 KB) and the shared base sheet
  // (tokens and fonts, 21.6 KB), 4 to 5 KB from each. The home page then loads exactly one
  // stylesheet file, the base sheet, and component CSS can grow by that margin without
  // changing the number of requests. Not "always": with the base sheet in the document the
  // first paint no longer waits for the font and the page shifts when it arrives. Measured
  // in `tests/perf-budget.ts`. Check the home page's `<link rel="stylesheet">` count when a
  // sheet nears the limit.
  vite: { build: { assetsInlineLimit: 16384 } },
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
