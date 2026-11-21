import sitemap from "@astrojs/sitemap"
import { defineConfig } from "astro/config"

export default defineConfig({
  site: "https://strm.dev",
  output: "static",
  i18n: {
    locales: ["en", "pl", "no"],
    defaultLocale: "en",
    routing: { prefixDefaultLocale: false },
  },
  // Astro 7 does not write a sitemap. This integration lists built pages and adds
  // hreflang only for a path that exists in more than one locale. Norwegian is
  // not launched, so it is not an alternate.
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
