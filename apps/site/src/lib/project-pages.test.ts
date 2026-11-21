import assert from "node:assert/strict"
import { test } from "node:test"
import { fallbackWarning } from "../i18n/fallback.ts"
import {
  bodyFallbackWhat,
  resolveProjectPages,
  type BodyRef,
  type ResolvedPage,
} from "./project-pages.ts"

function body(id: string, text: string, draft = false): BodyRef {
  return { id, draft, text }
}

function pages(
  locale: "en" | "pl",
  slugs: readonly string[],
  bodies: readonly BodyRef[],
  includeDrafts: boolean
): ResolvedPage[] {
  return resolveProjectPages(locale, slugs, bodies, { includeDrafts })
}

test("a project with no body has no page", () => {
  const slugs = ["letsreg-sign-in", "gsr"]
  assert.deepEqual(pages("en", slugs, [], false), [])
  assert.deepEqual(pages("pl", slugs, [], false), [])
})

test("an English body builds a page in both languages, and Polish falls back", () => {
  const bodies = [body("en/letsreg-sign-in", "A short article.")]
  assert.deepEqual(pages("en", ["letsreg-sign-in", "gsr"], bodies, false), [
    {
      slug: "letsreg-sign-in",
      bodyId: "en/letsreg-sign-in",
      bodyLocale: "en",
      fallback: false,
    },
  ])
  assert.deepEqual(pages("pl", ["letsreg-sign-in", "gsr"], bodies, false), [
    {
      slug: "letsreg-sign-in",
      bodyId: "en/letsreg-sign-in",
      bodyLocale: "en",
      fallback: true,
    },
  ])
})

test("the Polish fallback is the line the build prints", () => {
  assert.equal(
    fallbackWarning(bodyFallbackWhat("letsreg-sign-in"), "pl"),
    `[i18n] projects/letsreg-sign-in body: no "pl" entry, falling back to "en"`
  )
})

test("a locale with its own body does not fall back", () => {
  const bodies = [
    body("en/letsreg-sign-in", "English article."),
    body("pl/letsreg-sign-in", "Polish body."),
  ]
  assert.deepEqual(pages("pl", ["letsreg-sign-in"], bodies, false), [
    {
      slug: "letsreg-sign-in",
      bodyId: "pl/letsreg-sign-in",
      bodyLocale: "pl",
      fallback: false,
    },
  ])
})

test("a draft body is left out of the production build and kept when asked", () => {
  const bodies = [body("en/letsreg-sign-in", "DRAFT. Placeholder.", true)]
  assert.deepEqual(pages("en", ["letsreg-sign-in"], bodies, false), [])
  assert.deepEqual(pages("pl", ["letsreg-sign-in"], bodies, false), [])
  assert.deepEqual(pages("pl", ["letsreg-sign-in"], bodies, true), [
    {
      slug: "letsreg-sign-in",
      bodyId: "en/letsreg-sign-in",
      bodyLocale: "en",
      fallback: true,
    },
  ])
})

test("a published Polish body still builds when the English body is a draft", () => {
  const bodies = [body("en/gsr", "DRAFT.", true), body("pl/gsr", "Published body.")]
  assert.deepEqual(pages("en", ["gsr"], bodies, false), [])
  assert.deepEqual(pages("pl", ["gsr"], bodies, false), [
    { slug: "gsr", bodyId: "pl/gsr", bodyLocale: "pl", fallback: false },
  ])
})

test("a blank body, an unknown slug, and an unknown locale do not build a page", () => {
  const bodies = [
    body("en/letsreg-sign-in", "   \n"),
    body("en/not-a-project", "Orphan."),
    body("xx/letsreg-sign-in", "Not a locale."),
    body("letsreg-sign-in", "No locale."),
  ]
  assert.deepEqual(pages("en", ["letsreg-sign-in"], bodies, true), [])
  assert.deepEqual(pages("pl", ["letsreg-sign-in"], bodies, true), [])
})

test("pages keep the project order", () => {
  const bodies = [body("en/gsr", "Second."), body("en/letsreg-sign-in", "First.")]
  assert.deepEqual(
    pages("en", ["letsreg-sign-in", "gsr"], bodies, false).map((page) => page.slug),
    ["letsreg-sign-in", "gsr"]
  )
})
