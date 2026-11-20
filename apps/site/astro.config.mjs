import { defineConfig } from "astro/config"

export default defineConfig({
  site: "https://strm.dev",
  output: "static",
  i18n: {
    locales: ["en", "pl", "no"],
    defaultLocale: "en",
    routing: { prefixDefaultLocale: false },
  },
})
