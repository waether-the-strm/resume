// The tour: the adapter between the engine and the page. It reads the scroll position,
// asks the engine where that is in the story, and writes three things to the page the
// server rendered: which scene (`data-scene`, `data-skin`), how far through it (`--t`), and
// what the guide says. All the looks are CSS (styles/tour.css). The engine knows no DOM;
// this file knows nothing about the story.
//
// It does not run under reduced motion: that reader keeps the finished page, with the blob's
// menu started on its own (blobMenu), so language and theme are one press away there too.
import {
  createScenes,
  createSettle,
  createStore,
  createTransitions,
  layout,
  parseFrozen,
  type Stage,
  type StopDef,
  type Track,
} from "@strm/narrative"
import { createPrefs } from "../lib/prefs"
import { applyCopyVariant } from "./copy-variant.ts"
import { createEquationView } from "./equation"
import { parts } from "./parts"
import { blobMenu } from "./parts/blob"

const SKINS = ["none", "words", "structure", "look"] as const

function start(): void {
  // A known `?copy=` swaps the opening and the card before a word is read. No parameter,
  // and an unknown value, leave the server's YAML.
  applyCopyVariant()
  const root = document.documentElement
  const track = document.querySelector<HTMLElement>(".track")
  const stage = document.querySelector<HTMLElement>(".stage")
  const message = document.querySelector<HTMLElement>(".message")
  const guide = document.querySelector<HTMLElement>(".guide")
  const prefs = createPrefs()
  const frozen = parseFrozen(location.search)

  if (!track || !stage || !message || !guide || !prefs.motionAllowed() || frozen.kind === "card") {
    root.removeAttribute("data-tour")
    if (frozen.kind === "card") document.getElementById("jan")?.scrollIntoView()
    blobMenu(prefs)
    return
  }

  const data = JSON.parse(track.dataset.track ?? "null") as {
    stops: StopDef[]
    weights: Track["weights"]
  } | null
  if (!data) {
    root.removeAttribute("data-tour")
    blobMenu(prefs)
    return
  }
  const laid = layout(data.stops, data.weights)
  const store = createStore(laid)

  // Each word is one element in every scene. Its name lets the browser fly it to its new
  // place when the scene changes; its index lets the weight wave find it.
  let word = 0
  for (const block of message.querySelectorAll<HTMLElement>(".blk")) {
    block.style.viewTransitionName = `block-${block.dataset.block}`
    const words = block.querySelectorAll<HTMLElement>(".ui-w")
    words.forEach((element, index) => {
      element.style.viewTransitionName = `word-${word++}`
      element.style.setProperty("--j", String(index))
    })
  }

  const sign: HTMLElement = guide

  // `how` belongs to the guide from the moment it leaves the equation, and through every
  // later scene.
  let current: Stage = 0
  const equationRoot = document.querySelector<HTMLElement>(".equation")
  const howMoves = new Set<(direction: 1 | -1) => void>()
  const onHowMoves = (listener: (direction: 1 | -1) => void) => {
    howMoves.add(listener)
    return () => {
      howMoves.delete(listener)
    }
  }
  const equation = equationRoot
    ? createEquationView(
        equationRoot,
        (on) => sign.toggleAttribute("data-how", on || current > 0),
        (direction) => {
          for (const listener of [...howMoves]) listener(direction)
        }
      )
    : null

  // A sentence of the guide leaves before the next one arrives (the prototype's 400 ms).
  let leaving = 0
  function say(step: Stage): void {
    window.clearTimeout(leaving)
    const from = sign.dataset.step ?? "0"
    if (from === "0" || step === 0 || from === String(step)) {
      sign.removeAttribute("data-leaving")
      sign.dataset.step = String(step)
      return
    }
    sign.setAttribute("data-leaving", "")
    leaving = window.setTimeout(() => {
      sign.removeAttribute("data-leaving")
      sign.dataset.step = String(step)
    }, 400)
  }

  const scenes = createScenes({
    clock: {
      setTimeout: (callback, ms) => window.setTimeout(callback, ms),
      clearTimeout: (id) => window.clearTimeout(id as number),
    },
    transition: createTransitions({
      startViewTransition:
        "startViewTransition" in document
          ? (change) => document.startViewTransition(change)
          : undefined,
      motionAllowed: () => prefs.motionAllowed(),
    }),
    heading(next) {
      current = next
      say(next)
      guide.toggleAttribute("data-how", next > 0 || (equation?.corner() ?? false))
    },
    show(scene) {
      stage.dataset.scene = String(scene)
      message.dataset.skin = SKINS[scene]
    },
    progress(scene, t) {
      const value = t.toFixed(3)
      if (scene === 0) {
        equation?.update(t)
        return
      }
      message.style.setProperty("--t", value)
      // The notes of the structure scene unfold in steps: name, capital, element, tokens.
      if (scene === 2) message.dataset.note = String(t < 0.2 ? 0 : t < 0.4 ? 1 : t < 0.7 ? 2 : 3)
    },
  })

  store.subscribe((state) => {
    scenes.update(state.stage, state.t)
    guide.toggleAttribute("data-pay", state.named)
    guide.toggleAttribute("data-after", state.after)
  })

  if (frozen.kind === "moment") {
    root.setAttribute("data-tour", "moment")
    store.freeze(frozen)
    const state = store.get()
    scenes.jump(state.stage as Stage, state.t)
    guide.toggleAttribute("data-pay", state.named)
    for (const part of parts) part({ store, track: laid, settle: null, prefs, onHowMoves })
    return
  }

  root.setAttribute("data-tour", "on")

  const screen = () => stage.offsetHeight
  const top = () => track.getBoundingClientRect().top + window.scrollY
  const read = () => (window.scrollY - top()) / screen()

  const settle = createSettle({
    track: laid,
    store,
    scroller: {
      read,
      write: (position) => window.scrollTo(0, top() + position * screen()),
    },
    clock: {
      now: () => performance.now(),
      setTimeout: (callback, ms) => window.setTimeout(callback, ms),
      clearTimeout: (id) => window.clearTimeout(id as number),
      requestFrame: (callback) => requestAnimationFrame(callback),
      cancelFrame: (id) => cancelAnimationFrame(id as number),
    },
    motionAllowed: () => prefs.motionAllowed(),
    screenHeight: screen,
  })

  let frame = 0
  const sample = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => store.setPosition(read()))
  }
  addEventListener(
    "scroll",
    () => {
      sample()
      settle.scroll()
    },
    { passive: true }
  )
  addEventListener("resize", sample)
  addEventListener("scrollend", () => settle.scrollEnd())
  addEventListener("wheel", () => settle.wheel(), { passive: true })
  addEventListener("touchstart", () => settle.touchStart(), { passive: true })
  addEventListener("touchend", () => settle.touchEnd(), { passive: true })
  addEventListener("touchcancel", () => settle.touchEnd(), { passive: true })
  addEventListener("pointerdown", () => settle.pointerDown())

  // The first paint: where the page already is, with no beat.
  store.setPosition(read())
  const state = store.get()
  scenes.jump(state.stage, state.t)
  for (const part of parts) part({ store, track: laid, settle, prefs, onHowMoves })
}

start()
