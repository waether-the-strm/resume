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

// The CV document: one entry per locale. Section headings travel with the entry so a
// missing translation falls back together with the prose.
const cv = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/cv" }),
  schema: z.strictObject({
    name: z.string(),
    role: z.string(),
    subtitle: z.string(),
    tagline: z.string(),
    contacts: z
      .array(
        z.strictObject({
          kind: z.enum(["place", "mail", "phone", "web", "linkedin"]),
          label: z.string(),
          href: z.string().optional(),
        })
      )
      .min(1),
    headings: z.strictObject({
      profile: z.string(),
      process: z.string(),
      experience: z.string(),
      work: z.string(),
      skills: z.string(),
      education: z.string(),
    }),
    profile: z.strictObject({
      quote: rich,
      author: z.string(),
      work: z.string(),
      source: z.string(),
      paragraphs: z.array(rich).min(1),
    }),
    process: z
      .array(
        z.strictObject({
          title: z.string(),
          text: rich,
        })
      )
      .min(1),
  }),
})

// Jobs, newest first. `order` is reading order, not a fact about the work.
// A description is a bullet unless `item` is false, in which case it is a paragraph.
const experience = defineCollection({
  loader: glob({ pattern: "*/*.yaml", base: "./src/content/experience" }),
  schema: z.strictObject({
    company: z.string(),
    order: z.number().int(),
    roles: z
      .array(
        z.strictObject({
          title: z.string(),
          period: z.string(),
        })
      )
      .min(1),
    descriptions: z
      .array(
        z.strictObject({
          text: rich,
          label: z.string().optional(),
          item: z.boolean().default(true),
        })
      )
      .min(1),
    tools: z.array(z.string()).default([]),
  }),
})

const education = defineCollection({
  loader: glob({ pattern: "*/*.yaml", base: "./src/content/education" }),
  schema: z.strictObject({
    school: z.string(),
    detail: z.string(),
    period: z.string(),
    order: z.number().int(),
  }),
})

const skills = defineCollection({
  loader: glob({ pattern: "*/*.yaml", base: "./src/content/skills" }),
  schema: z.strictObject({
    area: z.string(),
    items: z.array(z.string()).min(1),
    order: z.number().int(),
  }),
})

export const collections = { message, card, projects, cv, experience, education, skills }
