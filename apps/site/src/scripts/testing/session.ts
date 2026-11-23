// Tester identity and the feedback language. Both live in sessionStorage and ignore
// the page language. `?t=` is also the tour's progress (`?stage=2&t=0.5` in
// packages/narrative/src/url.ts), so that value is never read as a name.

import type { CopyId, FeedbackLang } from "../../testing/schema.ts"
import { cleanName } from "../../testing/text.ts"

export const testingKeys = {
  id: "strm.testing.id",
  name: "strm.testing.name",
  lang: "strm.testing.lang",
  welcomed: "strm.testing.welcomed",
  started: "strm.testing.started",
  variant: "strm.testing.variant",
  milestones: "strm.testing.milestones",
} as const

export interface Memory {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface TestingIdentity {
  sessionId: string
  name: string
  lang: FeedbackLang
  welcomed: boolean
}

export function createMemory(initial: Record<string, string> = {}): Memory {
  const store = new Map(Object.entries(initial))
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: (key) => {
      store.delete(key)
    },
  }
}

/** sessionStorage when it works, and an in-memory stand-in when it throws. */
export function browserMemory(): Memory {
  let storage: Storage | null = null
  try {
    storage = sessionStorage
    storage.getItem(testingKeys.id)
  } catch {
    storage = null
  }
  if (!storage) return createMemory()
  const live = storage
  return {
    getItem(key) {
      try {
        return live.getItem(key)
      } catch {
        return null
      }
    },
    setItem(key, value) {
      try {
        live.setItem(key, value)
      } catch {
        // Storage can be blocked or full. The visit still works in memory.
      }
    },
    removeItem(key) {
      try {
        live.removeItem(key)
      } catch {
        // Same as setItem.
      }
    },
  }
}

export function readIdentity(
  search: string,
  memory: Memory,
  createId: () => string
): TestingIdentity {
  const named = testerFromSearch(search)
  let name = memory.getItem(testingKeys.name) ?? ""
  if (named !== null) {
    name = named
    memory.setItem(testingKeys.name, name)
  }

  let lang = asLang(memory.getItem(testingKeys.lang)) ?? "en"
  const fromUrl = langFromSearch(search)
  if (fromUrl) {
    lang = fromUrl
    memory.setItem(testingKeys.lang, lang)
  }

  let sessionId = memory.getItem(testingKeys.id)
  if (!sessionId || !/^[A-Za-z0-9._:-]{8,80}$/.test(sessionId)) {
    sessionId = createId()
    memory.setItem(testingKeys.id, sessionId)
  }

  return {
    sessionId,
    name,
    lang,
    welcomed: memory.getItem(testingKeys.welcomed) === "1",
  }
}

export function writeName(memory: Memory, name: string): void {
  memory.setItem(testingKeys.name, cleanName(name))
}

export function writeLang(memory: Memory, lang: FeedbackLang): void {
  memory.setItem(testingKeys.lang, lang)
}

export function writeWelcomed(memory: Memory, welcomed: boolean): void {
  memory.setItem(testingKeys.welcomed, welcomed ? "1" : "0")
}

/**
 * The name from the URL, or null when the URL does not set one.
 * `tester` wins. `t` is the alias except while the tour owns it.
 */
export function testerFromSearch(search: string): string | null {
  const params = new URLSearchParams(search)
  if (params.has("tester")) return cleanName(params.get("tester") ?? "")
  if (params.has("t") && !tourOwnsProgress(params)) return cleanName(params.get("t") ?? "")
  return null
}

/** `feedbackLang` wins over the `fl` alias. Anything else is ignored. */
export function langFromSearch(search: string): FeedbackLang | null {
  const params = new URLSearchParams(search)
  return asLang(params.get("feedbackLang")) ?? asLang(params.get("fl"))
}

export function copyVariant(search: string): CopyId {
  const value = new URLSearchParams(search).get("copy")
  if (value === "a" || value === "b" || value === "c" || value === "d") return value
  return ""
}

/** True when `t` is the tour's progress, not a tester's name. */
export function tourOwnsProgress(params: URLSearchParams): boolean {
  const stage = params.get("stage")
  if (stage === null) return false
  if (stage !== "jan" && !/^[0-3]$/.test(stage)) return false
  const raw = params.get("t")
  if (raw === null) return false
  return Number.isFinite(Number(raw))
}

export function replaceQuery(href: string, mutate: (params: URLSearchParams) => void): string {
  const url = new URL(href, "https://strm.dev")
  mutate(url.searchParams)
  return `${url.pathname}${url.search}${url.hash}`
}

function asLang(value: string | null): FeedbackLang | null {
  if (value === "pl" || value === "en") return value
  return null
}
