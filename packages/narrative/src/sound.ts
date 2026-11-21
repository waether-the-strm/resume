// The click a hold makes when the reader enters it. Quiet, lower for a chapter, and shorter,
// drier and quieter when holds arrive close together, so a fast scroll rattles.
//
// The adapter calls `wake` after the first tap, click or key. Browsers will not start audio
// before a gesture, so until `wake` every sound is silent. The adapter calls `detent` when a hold
// is entered, which is a beat before the glide settles. `enabled` is the preferences store's
// answer: this module does not read storage, the document, or a global clock, and it registers
// no listeners.
//
// `major` is a chapter stop. In the prototype that is `STOPS[i].main !== undefined`: the
// equation, the words, the structure, the look. Here that is a stop whose `chapter` is set.
// The rail marker that flashes on landing is the adapter's. Nothing here touches the DOM.

/** Drop a tick this soon after the previous one. Prototype: `n - lastTick < 38`. */
const MIN_TICK_GAP_MS = 38
/** A hold this soon after the previous one is the dry click. Prototype: `n - lastDetent < 260`. */
const FAST_DETENT_MS = 260

/** Fast-click frequency, in hertz. Prototype: `1650`. */
const FAST_HZ = 1650
/** Chapter-click frequency, in hertz. Prototype: `880`. */
const MAJOR_HZ = 880
/** Quiet-stop frequency, in hertz. Prototype: `1320`. */
const TICK_HZ = 1320

/** The pitch starts at this multiple of the target, then falls. Prototype: `f * 1.5`. */
const PITCH_RATIO = 1.5
/** How long the fall takes, in seconds. Prototype: `t + .01`. */
const PITCH_FALL_S = 0.01

/** Centre of `random()`, so the jitter is symmetric. Prototype: `Math.random() - .5`. */
const JITTER_CENTRE = 0.5
/** Jitter width of the fast click, as a fraction of the frequency. Prototype: `.12`. */
const FAST_JITTER = 0.12
/** Jitter width of a single click, as a fraction of the frequency. Prototype: `.06`. */
const JITTER = 0.06

/** Peak gain of the fast click. Prototype: `.045`. */
const FAST_PEAK = 0.045
/** Peak gain of a chapter click. Prototype: `.1`. */
const MAJOR_PEAK = 0.1
/** Peak gain of a quiet stop. Prototype: `.05`. */
const TICK_PEAK = 0.05

/** Length of the fast click, in seconds. Prototype: `.016`. */
const FAST_LEN_S = 0.016
/** Length of a chapter click, in seconds. Prototype: `.06`. */
const MAJOR_LEN_S = 0.06
/** Length of a quiet stop, in seconds. Prototype: `.03`. */
const TICK_LEN_S = 0.03

/** Gain floor. An exponential ramp cannot target zero. Prototype: `.0001`. */
const GAIN_FLOOR = 0.0001
/** Attack, in seconds, from the floor to the peak. Prototype: `t + .002`. */
const ATTACK_S = 0.002
/** The oscillator stops this long after the gain returns to the floor. Prototype: `len + .02`. */
const STOP_TAIL_S = 0.02

/** Milliseconds, on the same scale as `performance.now()`. */
export interface SoundClock {
  now(): number
}

/** A value automated over the audio clock. The module only sets and ramps it. */
export interface SoundParam {
  setValueAtTime(value: number, time: number): void
  exponentialRampToValueAtTime(value: number, time: number): void
}

/** Wave shapes this module assigns. Fast clicks are square; the others are triangle. */
export type SoundWave = "sine" | "square" | "sawtooth" | "triangle"

/** The context's destination. Passed straight through to `SoundGain.connect`. */
export type SoundDestination = object

export interface SoundGain {
  readonly gain: SoundParam
  connect(destination: SoundDestination): void
}

export interface SoundOscillator {
  type: SoundWave
  readonly frequency: SoundParam
  connect(gain: SoundGain): SoundGain
  start(when: number): void
  stop(when: number): void
}

/**
 * The slice of an audio context this module uses. The adapter builds the real one inside the
 * gesture that calls `wake`, and passes a factory. State is read, never written: `"running"` is
 * the only state that makes a sound, and any other state is resumed.
 */
export interface SoundContext {
  readonly state: string
  readonly currentTime: number
  readonly destination: SoundDestination
  createOscillator(): SoundOscillator
  createGain(): SoundGain
  resume(): void
}

export interface SoundDeps {
  /** First successful `wake` while sound is on. A throw is retried on the next call. */
  createContext: () => SoundContext
  clock: SoundClock
  /** True when the reader has sound on. The preferences store owns the stored choice. */
  enabled: () => boolean
  /**
   * A number from 0 to 1, as `Math.random` returns. The pitch jitters by it. Injected so a test
   * schedules a known frequency; the adapter passes `Math.random`.
   */
  random: () => number
}

export interface Sound {
  /**
   * Creates the context, or resumes it when it is not running. The adapter calls this from the
   * first tap, click or key, and again when the reader turns sound back on. Silent while
   * `enabled` is false. A failure leaves the module silent and is retried on the next call.
   */
  wake(): void
  /**
   * One click. `major` is a chapter (lower). `fast` is the dry, quiet click. Silent before
   * `wake`, while `enabled` is false, and while the context is not running. A click strictly
   * sooner than 38 ms after one that played is dropped.
   */
  tick(major: boolean, fast: boolean): void
  /**
   * A hold was entered. Clicks at once. An entry strictly sooner than 260 ms after the previous
   * one is the fast click. The entry is remembered even when the click itself is silent.
   */
  detent(major: boolean): void
}

export function createSound(deps: SoundDeps): Sound {
  const { createContext, clock, enabled, random } = deps
  let context: SoundContext | null = null
  // Both timers start at 0, as in the prototype. Measured from the clock's origin, a tick in the
  // first 38 ms is dropped and a hold entered in the first 260 ms is the fast click.
  let lastTick = 0
  let lastDetent = 0

  function wake(): void {
    if (!enabled()) return
    try {
      context = context ?? createContext()
      if (context.state !== "running") context.resume()
    } catch {
      // The prototype swallows a missing or blocked context and stays silent.
    }
  }

  function tick(major: boolean, fast: boolean): void {
    if (!enabled() || context === null || context.state !== "running") return
    const now = clock.now()
    if (now - lastTick < MIN_TICK_GAP_MS) return
    lastTick = now

    const time = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const base = fast ? FAST_HZ : major ? MAJOR_HZ : TICK_HZ
    const spread = fast ? FAST_JITTER : JITTER
    const frequency = base * (1 + (random() - JITTER_CENTRE) * spread)
    const peak = fast ? FAST_PEAK : major ? MAJOR_PEAK : TICK_PEAK
    const length = fast ? FAST_LEN_S : major ? MAJOR_LEN_S : TICK_LEN_S

    oscillator.type = fast ? "square" : "triangle"
    oscillator.frequency.setValueAtTime(frequency * PITCH_RATIO, time)
    oscillator.frequency.exponentialRampToValueAtTime(frequency, time + PITCH_FALL_S)
    gain.gain.setValueAtTime(GAIN_FLOOR, time)
    gain.gain.exponentialRampToValueAtTime(peak, time + ATTACK_S)
    gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, time + length)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(time)
    oscillator.stop(time + length + STOP_TAIL_S)
  }

  function detent(major: boolean): void {
    const now = clock.now()
    const fast = now - lastDetent < FAST_DETENT_MS
    lastDetent = now
    tick(major, fast)
  }

  return { wake, tick, detent }
}
