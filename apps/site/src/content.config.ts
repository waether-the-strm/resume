// The content layer. Content is data in git (ADR 0006): one file per entry and locale,
// validated here. Nothing in this file knows how a page looks.
import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"
import primitivesCss from "@strm/ui/tokens/primitives.css?raw"
import semanticCss from "@strm/ui/tokens/semantic.css?raw"
import componentCss from "@strm/ui/tokens/component.css?raw"
import { unknownRoles } from "./lib/rich"
import { parseTokens } from "./lib/tokens"

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

// The equation that opens the page: three questions above the line, `how?` below it. Always
// three; the phases of the scene count on it.
const asked = z.strictObject({ question: z.string(), answer: z.string() })
const equation = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/equation" }),
  schema: z.strictObject({
    questions: z.tuple([
      asked.extend({ id: z.literal("what") }),
      asked.extend({ id: z.literal("why") }),
      asked.extend({ id: z.literal("who") }),
    ]),
    how: asked,
  }),
})

// The guide in the corner: the word that travels there from the equation, one sentence per
// scene, and the payoff under the last one.
const guide = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/guide" }),
  schema: z.strictObject({
    label: z.string(),
    scenes: z.strictObject({ words: z.string(), structure: z.string(), look: z.string() }),
    payoff: z.string(),
  }),
})

// The words of the stops, per locale: a name for every stop of the track, a short label for
// the four chapters on the rail, and the name of what comes after the tour. Keys are stop ids;
// they are checked against the track when the two are joined (`lib/narrative.ts`).
const stops = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/stops" }),
  schema: z.strictObject({
    names: z.record(z.string(), z.string()),
    rail: z.record(z.string(), z.string()),
    after: z.string(),
  }),
})

// The track: where the stops are and how long each holds. The same in every language, so it
// is one file and not one per locale. The engine's `layout` takes it as it is.
const stage = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
const track = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/track" }),
  schema: z.strictObject({
    weights: z.tuple([
      z.number().positive(),
      z.number().positive(),
      z.number().positive(),
      z.number().positive(),
    ]),
    stops: z
      .array(
        z.strictObject({
          id: z.string().regex(/^[a-z][a-z-]*$/),
          stage,
          t: z.number().min(0).max(1),
          travel: z.number().min(0),
          hold: z.number().positive(),
          chapter: stage.optional(),
        })
      )
      .min(1)
      .refine((list) => new Set(list.map((stop) => stop.id)).size === list.length, {
        error: "Stop ids must be unique.",
      })
      .refine((list) => list.every((stop, i) => i === 0 || stop.stage >= list[i - 1]!.stage), {
        error: "Stops are in scroll order: a stage never comes before an earlier one.",
      })
      .refine(
        (list) =>
          [0, 1, 2, 3].every(
            (s) => list.filter((stop) => stop.chapter === s && stop.stage === s).length === 1
          ) && list.every((stop) => stop.chapter === undefined || stop.chapter === stop.stage),
        { error: "Each of the four stages has exactly one chapter stop, inside that stage." }
      ),
  }),
})

// What the structure scene shows beside each block of the message. Token names are real:
// one that strm-ui does not define fails the build.
const defined = parseTokens(primitivesCss, semanticCss, componentCss)
const block = z.strictObject({
  component: z.string().regex(/^[A-Z][A-Za-z]*$/),
  element: z.enum(["h1", "p", "ol", "ul", "div"]),
  tokens: z
    .array(
      z.string().refine((name) => defined.has(name), {
        error: "Not a strm-ui token. Use a name defined in packages/strm-ui/src/tokens.",
      })
    )
    .min(1)
    .max(2),
})
const structure = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/structure" }),
  schema: z.strictObject({
    blocks: z.strictObject({ headline: block, lead: block, list: block, who: block, call: block }),
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

// The article, beside the YAML of the same slug (`en/letsreg-sign-in.md` next to
// `en/letsreg-sign-in.yaml`). No file means no page. The page supplies the title;
// this file is the body, starting at the first paragraph. A draft is rendered in
// dev and left out of the production build.
const projectBodies = defineCollection({
  loader: glob({ pattern: "*/*.md", base: "./src/content/projects" }),
  schema: z.strictObject({
    draft: z.boolean().default(false),
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

export const collections = {
  message,
  equation,
  guide,
  stops,
  track,
  structure,
  card,
  projects,
  projectBodies,
  cv,
  experience,
  education,
  skills,
}
