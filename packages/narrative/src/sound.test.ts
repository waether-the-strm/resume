import { test } from "node:test"
import assert from "node:assert/strict"
import {
  createSound,
  type Sound,
  type SoundContext,
  type SoundGain,
  type SoundOscillator,
  type SoundParam,
  type SoundWave,
} from "./sound.ts"

interface ParamCall {
  method: "setValueAtTime" | "exponentialRampToValueAtTime"
  value: number
  time: number
}

interface Click {
  type: string
  frequency: ParamCall[]
  gain: ParamCall[]
  start: number | null
  stop: number | null
  toDestination: boolean
  order: string[]
}

/** What one click schedules. The numbers are the prototype's, lines 628 to 634. */
const ORDER = [
  "type",
  "frequency",
  "frequency",
  "gain",
  "gain",
  "gain",
  "connect-osc",
  "connect-gain",
  "start",
  "stop",
]

function specClick(time: number, kind: "quiet" | "major" | "fast", random = 0.5): Click {
  const fast = kind === "fast"
  const major = kind === "major"
  const hz = fast ? 1650 : major ? 880 : 1320
  const spread = fast ? 0.12 : 0.06
  const frequency = hz * (1 + (random - 0.5) * spread)
  const peak = fast ? 0.045 : major ? 0.1 : 0.05
  const length = fast ? 0.016 : major ? 0.06 : 0.03
  return {
    type: fast ? "square" : "triangle",
    frequency: [
      { method: "setValueAtTime", value: frequency * 1.5, time },
      { method: "exponentialRampToValueAtTime", value: frequency, time: time + 0.01 },
    ],
    gain: [
      { method: "setValueAtTime", value: 0.0001, time },
      { method: "exponentialRampToValueAtTime", value: peak, time: time + 0.002 },
      { method: "exponentialRampToValueAtTime", value: 0.0001, time: time + length },
    ],
    start: time,
    stop: time + length + 0.02,
    toDestination: true,
    order: ORDER,
  }
}

interface Harness {
  sound: Sound
  clicks: Click[]
  builds: number
  resumes: number
  oscillators: number
  rolls: number
  state: string
  currentTime: number
  at(ms: number): void
  set on(value: boolean)
  /** The next `createContext` throws once, and the one after it is tried afresh. */
  blockContext(): void
  /** The next `resume` throws once. */
  blockResume(): void
}

function harness(options?: { random?: () => number }): Harness {
  let state = "suspended"
  let currentTime = 0
  let now = 0
  let on = true
  let builds = 0
  let resumes = 0
  let oscillators = 0
  let rolls = 0
  let contextThrows = false
  let resumeThrows = false
  const clicks: Click[] = []
  const steps: string[] = []
  let cursor = 0
  const destination = {}
  const gainCalls = new WeakMap<SoundGain, ParamCall[]>()
  const gainDestination = new WeakMap<SoundGain, object>()
  const wired = new WeakMap<SoundOscillator, SoundGain>()

  function param(calls: ParamCall[], label: "frequency" | "gain"): SoundParam {
    return {
      setValueAtTime(value, time) {
        steps.push(label)
        calls.push({ method: "setValueAtTime", value, time })
      },
      exponentialRampToValueAtTime(value, time) {
        steps.push(label)
        calls.push({ method: "exponentialRampToValueAtTime", value, time })
      },
    }
  }

  const context: SoundContext = {
    get state() {
      return state
    },
    get currentTime() {
      return currentTime
    },
    destination,
    createOscillator() {
      oscillators += 1
      const frequency: ParamCall[] = []
      let type: SoundWave = "sine"
      let start: number | null = null
      const oscillator: SoundOscillator = {
        get type() {
          return type
        },
        set type(value: SoundWave) {
          steps.push("type")
          type = value
        },
        frequency: param(frequency, "frequency"),
        connect(gain: SoundGain) {
          steps.push("connect-osc")
          wired.set(oscillator, gain)
          return gain
        },
        start(when: number) {
          steps.push("start")
          start = when
        },
        stop(when: number) {
          steps.push("stop")
          const gain = wired.get(oscillator)
          clicks.push({
            type,
            frequency: frequency.slice(),
            gain: gain ? (gainCalls.get(gain)?.slice() ?? []) : [],
            start,
            stop: when,
            toDestination: gain !== undefined && gainDestination.get(gain) === destination,
            order: steps.slice(cursor),
          })
          cursor = steps.length
        },
      }
      return oscillator
    },
    createGain() {
      const calls: ParamCall[] = []
      const gain: SoundGain = {
        gain: param(calls, "gain"),
        connect(dest) {
          steps.push("connect-gain")
          gainDestination.set(gain, dest)
        },
      }
      gainCalls.set(gain, calls)
      return gain
    },
    resume() {
      resumes += 1
      if (resumeThrows) {
        resumeThrows = false
        throw new Error("resume blocked")
      }
    },
  }

  const random = options?.random ?? (() => 0.5)
  const sound = createSound({
    createContext() {
      builds += 1
      if (contextThrows) {
        contextThrows = false
        throw new Error("context blocked")
      }
      return context
    },
    clock: { now: () => now },
    enabled: () => on,
    random() {
      rolls += 1
      return random()
    },
  })

  return {
    sound,
    clicks,
    get builds() {
      return builds
    },
    get resumes() {
      return resumes
    },
    get oscillators() {
      return oscillators
    },
    get rolls() {
      return rolls
    },
    get state() {
      return state
    },
    set state(value: string) {
      state = value
    },
    get currentTime() {
      return currentTime
    },
    set currentTime(value: number) {
      currentTime = value
    },
    at(ms: number) {
      now = ms
    },
    set on(value: boolean) {
      on = value
    },
    blockContext() {
      contextThrows = true
    },
    blockResume() {
      resumeThrows = true
    },
  }
}

/** Wake, then mark the context running. `resume` itself does not flip the state. */
function running(h: Harness): void {
  h.sound.wake()
  h.state = "running"
}

function only(clicks: Click[]): Click {
  assert.equal(clicks.length, 1)
  const click = clicks[0]
  assert.ok(click)
  return click
}

test("no sound before wake", () => {
  const h = harness()
  h.at(1000)
  h.currentTime = 4
  h.sound.tick(true, false)
  h.sound.detent(true)
  assert.equal(h.clicks.length, 0)
  assert.equal(h.builds, 0, "the context is not created")
  assert.equal(h.oscillators, 0)
  assert.equal(h.rolls, 0, "a silent tick does not roll the pitch")
  assert.equal(h.resumes, 0)
})

test("wake while sound is off creates nothing, and a later tick stays silent until wake", () => {
  const h = harness()
  h.on = false
  h.at(1000)
  h.sound.wake()
  h.sound.tick(false, false)
  assert.equal(h.builds, 0)
  assert.equal(h.clicks.length, 0)

  h.on = true
  h.sound.tick(false, false)
  assert.equal(h.builds, 0, "tick does not create the context; wake does")
  assert.equal(h.clicks.length, 0)

  running(h)
  h.sound.tick(false, false)
  assert.equal(h.builds, 1)
  assert.deepEqual(h.clicks, [specClick(0, "quiet")])
})

test("wake creates one context and resumes it only while it is not running", () => {
  const h = harness()
  h.at(1000)
  assert.equal(h.sound.wake(), undefined)
  assert.equal(h.clicks.length, 0, "wake itself is silent")
  assert.equal(h.builds, 1)
  assert.equal(h.resumes, 1)
  assert.equal(h.state, "suspended", "resume does not pretend the context is running")

  h.sound.tick(false, false)
  assert.equal(h.clicks.length, 0)
  assert.equal(h.oscillators, 0)

  h.sound.wake()
  assert.equal(h.builds, 1, "a second wake reuses the context")
  assert.equal(h.resumes, 2)

  h.state = "running"
  h.sound.wake()
  assert.equal(h.resumes, 2, "an already running context is not resumed")
  h.sound.tick(false, false)
  assert.equal(h.clicks.length, 1)
})

test("a context that is not running stays silent, for every other state", () => {
  for (const state of ["suspended", "interrupted", "closed"]) {
    const h = harness()
    h.state = state
    h.at(1000)
    h.sound.wake()
    h.sound.tick(true, false)
    assert.equal(h.clicks.length, 0, state)
    assert.equal(h.resumes, 1, state)
    assert.equal(h.rolls, 0, state)
  }
})

test("tick schedules the prototype's oscillator for each kind of click", () => {
  // Lines 630 to 634. random() is 0.5, so the jitter term is zero and the frequencies are exact:
  // quiet 1320, chapter 880, fast 1650, each starting at 1.5 times that.
  const cases = [
    { major: false, fast: false, kind: "quiet" },
    { major: true, fast: false, kind: "major" },
    { major: false, fast: true, kind: "fast" },
    { major: true, fast: true, kind: "fast" },
  ] as const
  for (const { major, fast, kind } of cases) {
    const h = harness()
    h.state = "running"
    h.at(1000)
    h.currentTime = 4
    h.sound.wake()
    h.sound.tick(major, fast)
    assert.equal(h.resumes, 0, "already running, so wake does not resume")
    assert.deepEqual(h.clicks, [specClick(4, kind)], kind)
    // The scheduled times follow the audio clock, not the 1000 ms gesture clock.
    assert.equal(only(h.clicks).start, 4)
  }
})

test("the quiet, chapter and fast clicks use the prototype's literal settings", () => {
  const h = harness()
  h.state = "running"
  h.at(1000)
  h.currentTime = 4
  h.sound.wake()
  h.sound.tick(false, false)
  const quiet = only(h.clicks)
  assert.equal(quiet.type, "triangle")
  assert.deepEqual(quiet.frequency, [
    { method: "setValueAtTime", value: 1980, time: 4 },
    { method: "exponentialRampToValueAtTime", value: 1320, time: 4 + 0.01 },
  ])
  assert.deepEqual(quiet.gain, [
    { method: "setValueAtTime", value: 0.0001, time: 4 },
    { method: "exponentialRampToValueAtTime", value: 0.05, time: 4 + 0.002 },
    { method: "exponentialRampToValueAtTime", value: 0.0001, time: 4 + 0.03 },
  ])
  assert.equal(quiet.start, 4)
  assert.equal(quiet.stop, 4 + 0.03 + 0.02)
  assert.equal(quiet.toDestination, true)

  const chapter = harness()
  chapter.state = "running"
  chapter.at(1000)
  chapter.currentTime = 4
  chapter.sound.wake()
  chapter.sound.tick(true, false)
  const major = only(chapter.clicks)
  assert.equal(major.type, "triangle")
  assert.equal(major.frequency[0]?.value, 1320)
  assert.equal(major.frequency[1]?.value, 880)
  assert.equal(major.gain[1]?.value, 0.1)
  assert.equal(major.stop, 4 + 0.06 + 0.02)

  const rattle = harness()
  rattle.state = "running"
  rattle.at(1000)
  rattle.currentTime = 4
  rattle.sound.wake()
  rattle.sound.tick(true, true)
  const fast = only(rattle.clicks)
  assert.equal(fast.type, "square")
  assert.equal(fast.frequency[0]?.value, 2475)
  assert.equal(fast.frequency[1]?.value, 1650)
  assert.equal(fast.gain[1]?.value, 0.045)
  assert.equal(fast.gain[2]?.time, 4 + 0.016)
  assert.equal(fast.stop, 4 + 0.016 + 0.02)
})

test("the pitch jitters by half the prototype's spread, and the fast click has the wider one", () => {
  const cases = [
    { random: 0, major: false, fast: false, hz: 1320, spread: 0.06 },
    { random: 1, major: true, fast: false, hz: 880, spread: 0.06 },
    { random: 0, major: true, fast: true, hz: 1650, spread: 0.12 },
    { random: 1, major: false, fast: true, hz: 1650, spread: 0.12 },
  ]
  for (const item of cases) {
    const h = harness({ random: () => item.random })
    h.state = "running"
    h.at(1000)
    h.currentTime = 2
    h.sound.wake()
    h.sound.tick(item.major, item.fast)
    const frequency = item.hz * (1 + (item.random - 0.5) * item.spread)
    const click = only(h.clicks)
    assert.equal(click.frequency[0]?.value, frequency * 1.5)
    assert.equal(click.frequency[1]?.value, frequency)
    assert.equal(click.frequency[1]?.time, 2 + 0.01)
  }
})

test("rate limiting drops a tick strictly closer than 38 ms, and 38 ms apart both play", () => {
  const h = harness()
  running(h)
  h.currentTime = 4

  h.at(0)
  h.sound.tick(false, false)
  assert.equal(h.clicks.length, 0, "the previous tick starts at 0, so clock 0 is inside the gap")
  assert.equal(h.oscillators, 0)
  assert.equal(h.rolls, 0)

  h.at(37)
  h.sound.tick(false, false)
  assert.equal(h.clicks.length, 0, "37 ms is still inside the gap")

  h.at(38)
  h.sound.tick(false, false)
  assert.deepEqual(h.clicks, [specClick(4, "quiet")])

  h.at(75)
  h.sound.tick(true, false)
  assert.equal(h.clicks.length, 1, "37 ms after a tick that played")
  assert.equal(h.oscillators, 1, "a dropped tick creates no oscillator")
  assert.equal(h.rolls, 1, "a dropped tick does not roll the pitch")

  h.at(76)
  h.currentTime = 9
  h.sound.tick(true, false)
  assert.deepEqual(h.clicks[1], specClick(9, "major"))
})

test("a silent tick does not start the 38 ms gap", () => {
  const beforeWake = harness()
  beforeWake.at(4000)
  beforeWake.sound.tick(false, false)
  running(beforeWake)
  beforeWake.at(4010)
  beforeWake.sound.tick(false, false)
  assert.equal(beforeWake.clicks.length, 1)

  const disabled = harness()
  running(disabled)
  disabled.on = false
  disabled.at(4000)
  disabled.sound.tick(false, false)
  disabled.on = true
  disabled.at(4010)
  disabled.sound.tick(false, false)
  assert.equal(disabled.clicks.length, 1)

  const suspended = harness()
  suspended.at(5000)
  suspended.sound.wake()
  suspended.sound.tick(false, false)
  assert.equal(suspended.clicks.length, 0)
  suspended.state = "running"
  suspended.at(5010)
  suspended.sound.tick(false, false)
  assert.equal(suspended.clicks.length, 1)
  assert.equal(suspended.rolls, 1)
})

test("the rate limit follows the injected clock, not the audio time", () => {
  const h = harness()
  running(h)
  h.currentTime = 4
  h.at(1000)
  h.sound.tick(false, false)
  h.currentTime = 20
  h.at(1010)
  h.sound.tick(false, false)
  assert.equal(h.clicks.length, 1, "a second of audio time does not open the gap")

  h.at(1038)
  h.sound.tick(false, false)
  assert.equal(h.clicks.length, 2)
  assert.equal(h.clicks[1]?.start, 20, "the click is scheduled on the audio clock")
})

test("detent: a hold entered strictly sooner than 260 ms after the previous one is the fast click", () => {
  const h = harness()
  running(h)
  h.currentTime = 4

  h.at(1000)
  h.sound.detent(false)
  h.at(1259)
  h.currentTime = 5
  h.sound.detent(false)
  h.at(1519)
  h.currentTime = 6
  h.sound.detent(true)

  assert.equal(h.clicks.length, 3)
  assert.deepEqual(
    h.clicks[0],
    specClick(4, "quiet"),
    "the first hold, well after 0, is a full click"
  )
  assert.deepEqual(h.clicks[1], specClick(5, "fast"), "259 ms later is dry")
  assert.deepEqual(h.clicks[2], specClick(6, "major"), "260 ms later is a full chapter click")

  const early = harness()
  running(early)
  early.currentTime = 4
  early.at(259)
  early.sound.detent(false)
  assert.deepEqual(
    early.clicks,
    [specClick(4, "fast")],
    "259 ms from the clock's origin is still fast"
  )

  const boundary = harness()
  running(boundary)
  boundary.currentTime = 4
  boundary.at(260)
  boundary.sound.detent(false)
  assert.deepEqual(
    boundary.clicks,
    [specClick(4, "quiet")],
    "260 ms from the origin is a full click"
  )
})

test("a fast scroll rattles: the first click is full, later ones are dry, and some are dropped", () => {
  const audible = harness()
  running(audible)
  audible.currentTime = 4
  for (const ms of [7000, 7050, 7100, 7150]) {
    audible.at(ms)
    audible.sound.detent(false)
  }
  assert.deepEqual(
    audible.clicks.map((click) => [click.type, click.gain[1]?.value, click.frequency[1]?.value]),
    [
      ["triangle", 0.05, 1320],
      ["square", 0.045, 1650],
      ["square", 0.045, 1650],
      ["square", 0.045, 1650],
    ]
  )

  const dense = harness()
  running(dense)
  dense.currentTime = 4
  for (const ms of [5000, 5020, 5040, 5060, 5080]) {
    dense.at(ms)
    dense.sound.detent(false)
  }
  assert.deepEqual(
    dense.clicks.map((click) => click.type),
    ["triangle", "square", "square"],
    "20 ms apart: the 1st, 3rd and 5th play; the rest fall inside 38 ms"
  )
  assert.equal(dense.oscillators, 3)
})

test("detent remembers the entry when the click is silent, so the next one can still be fast", () => {
  const beforeWake = harness()
  beforeWake.at(1000)
  beforeWake.sound.detent(false)
  assert.equal(beforeWake.clicks.length, 0)
  running(beforeWake)
  beforeWake.currentTime = 4
  beforeWake.at(1200)
  beforeWake.sound.detent(false)
  assert.deepEqual(beforeWake.clicks, [specClick(4, "fast")], "200 ms after a silent entry")

  const dropped = harness()
  running(dropped)
  dropped.currentTime = 4
  dropped.at(2000)
  dropped.sound.detent(false)
  dropped.at(2010)
  dropped.sound.detent(false)
  assert.equal(dropped.clicks.length, 1, "the second entry is inside the 38 ms gap")
  dropped.at(2260)
  dropped.currentTime = 8
  dropped.sound.detent(false)
  assert.deepEqual(
    dropped.clicks[1],
    specClick(8, "fast"),
    "250 ms after the dropped entry, and 260 ms after the one that played: fast only if the drop counted"
  )
})

test("tick does not move the detent timer", () => {
  const h = harness()
  running(h)
  h.currentTime = 4
  h.at(3000)
  h.sound.tick(true, false)
  h.at(3100)
  h.currentTime = 5
  h.sound.detent(false)
  assert.deepEqual(h.clicks[1], specClick(5, "quiet"))
})

test("turning sound off silences a running context, and turning it on uses the same one", () => {
  const h = harness()
  running(h)
  h.currentTime = 4
  h.at(8000)
  h.sound.tick(false, false)
  assert.equal(h.clicks.length, 1)

  h.on = false
  h.at(8100)
  h.sound.tick(false, false)
  h.sound.wake()
  assert.equal(h.clicks.length, 1)
  assert.equal(h.resumes, 1, "wake while sound is off does not resume")
  assert.equal(h.builds, 1)

  h.on = true
  h.at(8200)
  h.sound.tick(false, false)
  assert.equal(h.clicks.length, 2, "still running, so no second wake is required")
  assert.equal(h.builds, 1)

  h.state = "suspended"
  h.sound.wake()
  assert.equal(
    h.resumes,
    2,
    "turning sound back on is the adapter's cue to wake a suspended context"
  )
})

test("a blocked context is swallowed and tried again on the next wake", () => {
  const created = harness()
  created.blockContext()
  assert.doesNotThrow(() => created.sound.wake())
  assert.equal(created.builds, 1)
  assert.equal(created.resumes, 0)
  created.at(1000)
  created.sound.tick(false, false)
  assert.equal(created.clicks.length, 0)

  running(created)
  created.sound.tick(false, false)
  assert.equal(created.builds, 2)
  assert.equal(created.clicks.length, 1)

  const resumed = harness()
  resumed.blockResume()
  assert.doesNotThrow(() => resumed.sound.wake())
  assert.equal(resumed.builds, 1)
  assert.equal(resumed.resumes, 1)
  resumed.sound.wake()
  assert.equal(resumed.builds, 1, "the context was kept, and resume is retried")
  assert.equal(resumed.resumes, 2)
})

test("two sounds do not share a rate limit", () => {
  const a = harness()
  const b = harness()
  running(a)
  running(b)
  a.at(1000)
  b.at(1000)
  a.sound.tick(false, false)
  b.sound.tick(false, false)
  assert.equal(a.clicks.length, 1)
  assert.equal(b.clicks.length, 1)
})
