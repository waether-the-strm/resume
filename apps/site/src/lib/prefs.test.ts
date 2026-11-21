import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  MOTION_ATTR,
  MOTION_KEY,
  SOUND_KEY,
  THEME_ATTR,
  THEME_KEY,
  bindSwitches,
  createPrefs,
  motionAllowed,
  type AttrRoot,
  type Motion,
  type Prefs,
  type PrefsStorage,
  type Theme,
} from "./prefs.ts"

function memoryStorage(initial: Record<string, string> = {}): PrefsStorage & { writes: string[] } {
  const values = new Map(Object.entries(initial))
  const writes: string[] = []
  return {
    writes,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      writes.push(`set ${key}=${value}`)
      values.set(key, value)
    },
    removeItem: (key) => {
      writes.push(`remove ${key}`)
      values.delete(key)
    },
  }
}

function fakeRoot(initial: Record<string, string> = {}): AttrRoot {
  const attrs = new Map(Object.entries(initial))
  return {
    getAttribute: (name) => attrs.get(name) ?? null,
    setAttribute: (name, value) => {
      attrs.set(name, value)
    },
    removeAttribute: (name) => {
      attrs.delete(name)
    },
  }
}

function brokenStorage(): PrefsStorage {
  const fail = (): never => {
    throw new Error("storage unavailable")
  }
  return { getItem: fail, setItem: fail, removeItem: fail }
}

function brokenRoot(): AttrRoot {
  const fail = (): never => {
    throw new Error("no element")
  }
  return { getAttribute: fail, setAttribute: fail, removeAttribute: fail }
}

function prefsWith(options?: {
  stored?: Record<string, string>
  attrs?: Record<string, string>
  reduced?: boolean
  storage?: PrefsStorage
  root?: AttrRoot
}): { prefs: Prefs; storage: PrefsStorage & { writes?: string[] }; root: AttrRoot } {
  const storage = options?.storage ?? memoryStorage(options?.stored)
  const root = options?.root ?? fakeRoot(options?.attrs)
  const reduced = options?.reduced ?? false
  return {
    storage,
    root,
    prefs: createPrefs({ storage, root, reducedMotion: () => reduced }),
  }
}

test("nothing stored means system theme, system motion, and sound on", () => {
  const { prefs } = prefsWith()
  assert.deepEqual(prefs.get(), { theme: null, motion: null, sound: true })
  assert.equal(prefs.theme(), null)
  assert.equal(prefs.motion(), null)
  assert.equal(prefs.sound(), true)
})

test("the attribute wins over storage for theme and motion", () => {
  const { prefs } = prefsWith({
    stored: { [THEME_KEY]: "dark", [MOTION_KEY]: "reduced" },
    attrs: { [THEME_ATTR]: "light" },
    reduced: true,
  })
  assert.equal(prefs.theme(), "light")
  assert.equal(prefs.motion(), null)
  assert.equal(prefs.motionAllowed(), false, "no motion attribute, so the system decides")
})

test("an unknown attribute is the same as no choice", () => {
  const { prefs, root, storage } = prefsWith({
    attrs: { [THEME_ATTR]: "sepia", [MOTION_ATTR]: "sometimes" },
    reduced: true,
  })
  assert.equal(prefs.theme(), null)
  assert.equal(prefs.motion(), null)
  assert.equal(prefs.motionAllowed(), false)
  prefs.setTheme(null)
  prefs.setMotion(null)
  assert.equal(root.getAttribute(THEME_ATTR), null)
  assert.equal(root.getAttribute(MOTION_ATTR), null)
  assert.equal(storage.getItem(THEME_KEY), null)
})

test("setting a choice writes the attribute and the key, and tells listeners once", () => {
  const { prefs, root, storage } = prefsWith()
  const seen: (string | null)[] = []
  prefs.subscribe((state, previous) => {
    assert.notEqual(state, previous)
    assert.equal(previous.theme, null)
    assert.equal(previous.sound, true)
    assert.equal(state.sound, true)
    seen.push(state.theme)
  })
  prefs.setTheme("dark")
  prefs.setTheme("dark")
  assert.deepEqual(seen, ["dark"])
  assert.equal(root.getAttribute(THEME_ATTR), "dark")
  assert.equal(storage.getItem(THEME_KEY), "dark")
  assert.equal(root.getAttribute(MOTION_ATTR), null)
  assert.equal(storage.getItem(MOTION_KEY), null)
  assert.equal(storage.getItem(SOUND_KEY), null)
})

test("auto clears the attribute and the key", () => {
  const { prefs, root, storage } = prefsWith()
  prefs.setTheme("light")
  prefs.setMotion("full")
  prefs.setTheme(null)
  prefs.setMotion(null)
  assert.equal(root.getAttribute(THEME_ATTR), null)
  assert.equal(root.getAttribute(MOTION_ATTR), null)
  assert.equal(storage.getItem(THEME_KEY), null)
  assert.equal(storage.getItem(MOTION_KEY), null)
  assert.deepEqual(storage.writes, [
    "set strm-theme=light",
    "set strm-motion=full",
    "remove strm-theme",
    "remove strm-motion",
  ])
})

test("the same choice does not write and does not notify", () => {
  const storage = memoryStorage({ [THEME_KEY]: "light" })
  const { prefs } = prefsWith({ storage, attrs: { [THEME_ATTR]: "light" } })
  let calls = 0
  prefs.subscribe(() => {
    calls += 1
  })
  prefs.setTheme("light")
  prefs.setSound(true)
  assert.equal(calls, 0)
  assert.deepEqual(storage.writes, [])
})

test("a set repairs storage without notifying when the attribute already matches", () => {
  const storage = memoryStorage({ [THEME_KEY]: "light" })
  const { prefs } = prefsWith({ storage, attrs: { [THEME_ATTR]: "dark" } })
  let calls = 0
  prefs.subscribe(() => {
    calls += 1
  })
  prefs.setTheme("dark")
  assert.equal(calls, 0)
  assert.equal(storage.getItem(THEME_KEY), "dark")
  assert.deepEqual(storage.writes, ["set strm-theme=dark"])
})

test("a value outside the two themes or the two profiles is ignored", () => {
  const { prefs, storage } = prefsWith()
  prefs.setTheme("blue" as Theme)
  prefs.setMotion("none" as Motion)
  assert.equal(prefs.theme(), null)
  assert.equal(prefs.motion(), null)
  assert.deepEqual(storage.writes, [])
})

test("storage that throws never escapes, and the attribute still updates", () => {
  const root = fakeRoot()
  const prefs = createPrefs({ storage: brokenStorage(), root, reducedMotion: () => false })
  let heard = 0
  prefs.subscribe(() => {
    heard += 1
  })
  assert.equal(prefs.sound(), true)
  assert.doesNotThrow(() => {
    prefs.setTheme("light")
    prefs.setMotion("reduced")
    prefs.setSound(false)
  })
  assert.equal(root.getAttribute(THEME_ATTR), "light")
  assert.equal(root.getAttribute(MOTION_ATTR), "reduced")
  assert.equal(prefs.motionAllowed(), false)
  assert.equal(prefs.sound(), true, "sound could not be stored, so it stays on")
  assert.equal(heard, 2, "theme and motion changed; sound did not stick")
})

test("a failed storage write still keeps the attribute and notifies", () => {
  let writes = 0
  const storage: PrefsStorage = {
    getItem: () => null,
    setItem: () => {
      writes += 1
      throw new Error("quota")
    },
    removeItem: () => {
      throw new Error("quota")
    },
  }
  const root = fakeRoot()
  const { prefs } = prefsWith({ storage, root })
  let heard = 0
  prefs.subscribe(() => {
    heard += 1
  })
  assert.doesNotThrow(() => prefs.setTheme("dark"))
  assert.equal(root.getAttribute(THEME_ATTR), "dark")
  assert.equal(heard, 1)
  assert.equal(writes, 1)
})

test("a failed attribute write does not persist theme or motion", () => {
  const storage = memoryStorage()
  const prefs = createPrefs({ storage, root: brokenRoot(), reducedMotion: () => true })
  let heard = 0
  prefs.subscribe(() => {
    heard += 1
  })
  assert.doesNotThrow(() => {
    prefs.setTheme("dark")
    prefs.setMotion("reduced")
  })
  assert.deepEqual(storage.writes, [])
  assert.equal(prefs.theme(), null)
  assert.equal(
    prefs.motionAllowed(),
    false,
    "the attribute could not be read, so the system decides"
  )
  assert.equal(heard, 0)
})

test("sound is on unless the stored value is 0, and it never touches the attribute", () => {
  for (const value of ["1", "", "on", "true"]) {
    const { prefs } = prefsWith({ stored: { [SOUND_KEY]: value } })
    assert.equal(prefs.sound(), true, `stored ${JSON.stringify(value)}`)
  }
  const { prefs: off } = prefsWith({ stored: { [SOUND_KEY]: "0" } })
  assert.equal(off.sound(), false)

  const storage = memoryStorage()
  const root = fakeRoot({ [THEME_ATTR]: "light" })
  const { prefs } = prefsWith({ storage, root })
  const seen: boolean[] = []
  prefs.subscribe((state, previous) => {
    assert.equal(previous.theme, "light")
    assert.equal(state.theme, "light")
    seen.push(state.sound)
  })
  prefs.setSound(false)
  prefs.setSound(false)
  prefs.setSound(true)
  assert.deepEqual(seen, [false, true])
  assert.equal(storage.getItem(SOUND_KEY), "1")
  assert.equal(root.getAttribute(THEME_ATTR), "light")
  assert.equal(root.getAttribute(MOTION_ATTR), null)
  assert.deepEqual(storage.writes, ["set strm-sound=0", "set strm-sound=1"])
})

const motionCases: { attr: Motion | null; system: boolean; allowed: boolean; name: string }[] = [
  { attr: null, system: false, allowed: true, name: "no choice, and the system allows motion" },
  { attr: null, system: true, allowed: false, name: "no choice, and the system reduces motion" },
  {
    attr: "reduced",
    system: false,
    allowed: false,
    name: "reduced wins over a system that allows motion",
  },
  {
    attr: "full",
    system: true,
    allowed: true,
    name: "full wins over a system that reduces motion",
  },
]

for (const item of motionCases) {
  test(`motionAllowed: ${item.name}`, () => {
    const attrs = item.attr === null ? {} : { [MOTION_ATTR]: item.attr }
    const { prefs, root } = prefsWith({ attrs, reduced: item.system })
    assert.equal(prefs.motionAllowed(), item.allowed)
    assert.equal(
      motionAllowed(root, () => item.system),
      item.allowed
    )
  })
}

test("motionAllowed asks the system only when the attribute does not decide", () => {
  let calls = 0
  const reducedMotion = (): boolean => {
    calls += 1
    throw new Error("no matchMedia")
  }
  const reduced = fakeRoot({ [MOTION_ATTR]: "reduced" })
  const full = fakeRoot({ [MOTION_ATTR]: "full" })
  const auto = fakeRoot()
  assert.equal(motionAllowed(reduced, reducedMotion), false)
  assert.equal(motionAllowed(full, reducedMotion), true)
  assert.equal(calls, 0)
  assert.equal(motionAllowed(auto, reducedMotion), true)
  assert.equal(calls, 1)
})

test("motionAllowed follows a system preference that changes without a write", () => {
  let reduced = false
  const live = createPrefs({
    storage: memoryStorage(),
    root: fakeRoot(),
    reducedMotion: () => reduced,
  })
  assert.equal(live.motionAllowed(), true)
  reduced = true
  assert.equal(live.motionAllowed(), false)
  live.setMotion("full")
  assert.equal(live.motionAllowed(), true)
})

test("subscribers hear each change, in order, and can stop listening", () => {
  const { prefs } = prefsWith()
  const seen: (string | null)[] = []
  const stop = prefs.subscribe((state) => {
    seen.push(state.motion)
  })
  const stopFirst = prefs.subscribe(() => {
    seen.push("other")
    stopFirst()
  })
  prefs.setMotion("full")
  prefs.setMotion("reduced")
  stop()
  prefs.setMotion(null)
  assert.deepEqual(seen, ["full", "other", "reduced"])
})

test("theme and motion keys stay in step with the pre-paint script", () => {
  const themeInit = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../../../packages/strm-ui/src/theme-init.js"),
    "utf8"
  )
  assert.equal(THEME_KEY, "strm-theme")
  assert.equal(MOTION_KEY, "strm-motion")
  assert.equal(SOUND_KEY, "strm-sound")
  assert.equal(THEME_ATTR, "data-theme")
  assert.equal(MOTION_ATTR, "data-motion")
  assert.match(themeInit, /localStorage\.getItem\("strm-theme"\)/)
  assert.match(themeInit, /localStorage\.getItem\("strm-motion"\)/)
  assert.match(themeInit, /theme === "light" \|\| theme === "dark"/)
  assert.match(themeInit, /motion === "reduced" \|\| motion === "full"/)
  assert.match(themeInit, /setAttribute\("data-theme", theme\)/)
  assert.match(themeInit, /setAttribute\("data-motion", motion\)/)
  assert.doesNotMatch(themeInit, /strm-sound/, "sound is not restored before paint")
})

test("bindSwitches does nothing when there is no document", () => {
  assert.equal(typeof document, "undefined")
  const { prefs } = prefsWith()
  const stop = bindSwitches(prefs)
  stop()
  prefs.setTheme("dark")
  assert.equal(prefs.theme(), "dark")
})
