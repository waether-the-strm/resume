// The reader's preferences, persisted. A second store next to the engine's.
//
// Theme and motion live on <html>. data-theme and data-motion are the source of truth, and
// the matching localStorage keys are written in the same step. packages/strm-ui's theme-init.js
// reads those keys before the first paint and sets the attributes, so a reload does not flash
// the wrong look. This module does not read storage back over the attribute.
//
// Sound is storage only (strm-sound, "1" or "0"). Absent means on, which is the prototype's
// rule. It has no attribute.
//
// Locale is not a preference here. It is the URL.
//
// Theme and motion are read from the attribute. Sound is read from storage. Nothing is cached,
// so two stores on one page agree when asked. A subscriber hears writes made through its own
// store. Reading and writing never throw when storage is missing, blocked, or full.

export const THEME_KEY = "strm-theme"
export const MOTION_KEY = "strm-motion"
export const SOUND_KEY = "strm-sound"

export const THEME_ATTR = "data-theme"
export const MOTION_ATTR = "data-motion"

export type Theme = "light" | "dark"
/** "reduced" forces motion off. "full" forces it on. Null lets the system decide. */
export type Motion = "reduced" | "full"

export interface PrefsState {
  /** No attribute: the system colour scheme decides. */
  theme: Theme | null
  /** No attribute: prefers-reduced-motion decides. */
  motion: Motion | null
  /** False only when strm-sound is "0". */
  sound: boolean
}

export type PrefsListener = (state: PrefsState, previous: PrefsState) => void

export interface PrefsStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** The bit of <html> the store writes. Tests pass a fake. */
export interface AttrRoot {
  getAttribute(name: string): string | null
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
}

export interface PrefsEnv {
  storage: PrefsStorage
  root: AttrRoot
  /** True when the operating system asks for reduced motion. */
  reducedMotion: () => boolean
}

export interface Prefs {
  get(): PrefsState
  theme(): Theme | null
  motion(): Motion | null
  sound(): boolean
  setTheme(theme: Theme | null): void
  setMotion(motion: Motion | null): void
  setSound(on: boolean): void
  /** The attribute first, then the system preference. */
  motionAllowed(): boolean
  /** Calls the listener after a change. Returns the function that stops it. */
  subscribe(listener: PrefsListener): () => void
}

/** Stored when sound is turned on. Anything other than "0", including a missing key, is on. */
const SOUND_ON = "1"
const SOUND_OFF = "0"

function safeGet(storage: PrefsStorage, key: string): string | null {
  try {
    const value = storage.getItem(key)
    return typeof value === "string" ? value : null
  } catch {
    return null
  }
}

function safeSet(storage: PrefsStorage, key: string, value: string | null): void {
  try {
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  } catch {
    // Private mode, a full quota, or no storage. Theme and motion still sit on the attribute.
  }
}

function safeAttr(root: AttrRoot, name: string): string | null {
  try {
    const value = root.getAttribute(name)
    return typeof value === "string" ? value : null
  } catch {
    return null
  }
}

/** False when the attribute could not be written, so storage is left unchanged. */
function safeWriteAttr(root: AttrRoot, name: string, value: string | null): boolean {
  try {
    if (value === null) root.removeAttribute(name)
    else root.setAttribute(name, value)
    return true
  } catch {
    return false
  }
}

function readTheme(root: AttrRoot): Theme | null {
  const value = safeAttr(root, THEME_ATTR)
  return value === "light" || value === "dark" ? value : null
}

function readMotion(root: AttrRoot): Motion | null {
  const value = safeAttr(root, MOTION_ATTR)
  return value === "reduced" || value === "full" ? value : null
}

function readSound(storage: PrefsStorage): boolean {
  return safeGet(storage, SOUND_KEY) !== SOUND_OFF
}

function snapshot(env: PrefsEnv): PrefsState {
  return {
    theme: readTheme(env.root),
    motion: readMotion(env.root),
    sound: readSound(env.storage),
  }
}

function same(a: PrefsState, b: PrefsState): boolean {
  return a.theme === b.theme && a.motion === b.motion && a.sound === b.sound
}

function isTheme(value: unknown): value is Theme | null {
  return value === null || value === "light" || value === "dark"
}

function isMotion(value: unknown): value is Motion | null {
  return value === null || value === "reduced" || value === "full"
}

/**
 * Whether a script may animate. data-motion="reduced" is off, data-motion="full" is on,
 * and with no attribute the system preference decides. A system query that throws counts
 * as motion allowed: the media query would not have applied either.
 */
export function motionAllowed(root: AttrRoot, reducedMotion: () => boolean): boolean {
  const motion = readMotion(root)
  if (motion === "reduced") return false
  if (motion === "full") return true
  try {
    return !reducedMotion()
  } catch {
    return true
  }
}

function browserStorage(): PrefsStorage {
  const read = (): Storage | null => {
    try {
      return globalThis.localStorage ?? null
    } catch {
      return null
    }
  }
  return {
    getItem(key) {
      try {
        return read()?.getItem(key) ?? null
      } catch {
        return null
      }
    },
    setItem(key, value) {
      try {
        read()?.setItem(key, value)
      } catch {
        // Unavailable. The attribute is the part theme and motion can still keep.
      }
    },
    removeItem(key) {
      try {
        read()?.removeItem(key)
      } catch {
        // Same as setItem.
      }
    },
  }
}

function memoryRoot(): AttrRoot {
  const attrs = new Map<string, string>()
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

function browserRoot(): AttrRoot {
  const root = typeof document === "undefined" ? null : document.documentElement
  return root ?? memoryRoot()
}

function browserReduced(): boolean {
  try {
    if (typeof matchMedia !== "function") return false
    return matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    return false
  }
}

function browserEnv(): PrefsEnv {
  return {
    storage: browserStorage(),
    root: browserRoot(),
    reducedMotion: browserReduced,
  }
}

export function createPrefs(env: PrefsEnv = browserEnv()): Prefs {
  const listeners = new Set<PrefsListener>()

  function emit(previous: PrefsState): void {
    const next = snapshot(env)
    if (same(previous, next)) return
    for (const listener of [...listeners]) listener(next, previous)
  }

  // The attribute is written first. If that fails, storage is left so a reload cannot
  // restore a choice the page never showed.
  function writeChoice(attr: string, key: string, value: string | null): void {
    const previous = snapshot(env)
    const attrMatches = safeAttr(env.root, attr) === value
    const storedMatches = safeGet(env.storage, key) === value
    if (attrMatches && storedMatches) return
    if (!attrMatches && !safeWriteAttr(env.root, attr, value)) return
    if (!storedMatches) safeSet(env.storage, key, value)
    emit(previous)
  }

  return {
    get: () => snapshot(env),
    theme: () => readTheme(env.root),
    motion: () => readMotion(env.root),
    sound: () => readSound(env.storage),
    setTheme(theme) {
      if (!isTheme(theme)) return
      writeChoice(THEME_ATTR, THEME_KEY, theme)
    },
    setMotion(motion) {
      if (!isMotion(motion)) return
      writeChoice(MOTION_ATTR, MOTION_KEY, motion)
    },
    setSound(on) {
      if (typeof on !== "boolean") return
      const previous = snapshot(env)
      if (previous.sound === on) return
      safeSet(env.storage, SOUND_KEY, on ? SOUND_ON : SOUND_OFF)
      emit(previous)
    },
    motionAllowed: () => motionAllowed(env.root, env.reducedMotion),
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

type Axis = "theme" | "motion"

function axisOf(value: string | null): Axis | null {
  if (value === "theme" || value === "motion") return value
  return null
}

function currentValue(prefs: Prefs, axis: Axis): string {
  if (axis === "theme") return prefs.theme() ?? ""
  return prefs.motion() ?? ""
}

function applyValue(prefs: Prefs, axis: Axis, value: string): void {
  if (axis === "theme") {
    if (value === "") prefs.setTheme(null)
    else if (value === "light" || value === "dark") prefs.setTheme(value)
    return
  }
  if (value === "") prefs.setMotion(null)
  else if (value === "reduced" || value === "full") prefs.setMotion(value)
}

/**
 * Wires every [data-switch="theme"|"motion"] in scope. A button's data-value is a choice,
 * or "" for auto, which clears the attribute and the key. The pressed button follows the
 * attribute. Without a document this does nothing, so a test can import it.
 */
export function bindSwitches(prefs: Prefs, scope?: ParentNode): () => void {
  const root = scope ?? (typeof document === "undefined" ? undefined : document)
  if (!root) return () => {}

  const groups = [...root.querySelectorAll("[data-switch]")]

  const paint = (): void => {
    for (const group of groups) {
      const axis = axisOf(group.getAttribute("data-switch"))
      if (!axis) continue
      const current = currentValue(prefs, axis)
      for (const button of group.querySelectorAll("button")) {
        const value = button.getAttribute("data-value") ?? ""
        button.setAttribute("aria-pressed", String(value === current))
      }
    }
  }

  const onClick = (event: Event): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest("button")
    if (!(button instanceof HTMLButtonElement)) return
    const axis = axisOf(button.closest("[data-switch]")?.getAttribute("data-switch") ?? null)
    if (!axis) return
    applyValue(prefs, axis, button.getAttribute("data-value") ?? "")
  }

  for (const group of groups) group.addEventListener("click", onClick)
  const stop = prefs.subscribe(paint)
  paint()
  return () => {
    stop()
    for (const group of groups) group.removeEventListener("click", onClick)
  }
}
