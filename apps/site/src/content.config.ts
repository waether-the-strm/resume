// The content layer. Content is data in git (ADR 0006): one file per entry and locale,
// validated here. Nothing in this file knows how a page looks.
import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"
import { unknownRoles } from "./lib/rich"

/** Text that may mark runs of words with a role: "[clear at a glance.]{accent}". */
const rich = z.string().refine((value) => unknownRoles(value).length === 0, {
  error: "Unknown role in marked-up text. Known roles: accent, name.",
})

const link = z.object({ label: z.string(), href: z.string() })

// The message that is built in front of the reader: five blocks, always these five.
const message = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/message" }),
  schema: z.strictObject({
    headline: rich,
    lead: rich,
    list: z.array(rich).min(2).max(4),
    who: rich,
    call: z.strictObject({ text: rich, action: link }),
  }),
})

// The business card at the end of the tour.
const card = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/card" }),
  schema: z.strictObject({
    kicker: rich,
    mark: z.string().max(3),
    name: rich,
    role: z.string(),
    sub: z.string(),
    paths: z
      .array(
        z.strictObject({
          label: z.string(),
          note: z.string(),
          href: z.string(),
          tone: z.enum(["primary", "plain", "soft"]).default("plain"),
        })
      )
      .min(1)
      .max(3),
  }),
})

// Projects: one source for the home page, /cv and the project pages.
const projects = defineCollection({
  loader: glob({ pattern: "*/*.yaml", base: "./src/content/projects" }),
  schema: z.strictObject({
    title: z.string(),
    /** One sentence for a card. Claims come from the facts list only. */
    summary: z.string(),
    role: z.string().optional(),
    year: z.number().int().optional(),
    status: z.enum(["live", "completed"]).optional(),
    tech: z.array(z.string()).default([]),
    link: z.url().optional(),
    /** Position among the featured projects on the home page; absent means not featured. */
    featured: z.number().int().optional(),
  }),
})

export const collections = { message, card, projects }
