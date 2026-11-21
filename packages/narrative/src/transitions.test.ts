import { test } from "node:test"
import assert from "node:assert/strict"
import { createTransitions as exported } from "./index.ts"
import {
  createTransitions,
  type StartViewTransition,
  type Transition,
  type ViewTransitionHandle,
} from "./transitions.ts"

// `document.startViewTransition.bind(document)` has to stay injectable. The callback
// parameter is optional on the DOM method and required on ours.
type BoundStartViewTransition = (
  callbackOptions?: ViewTransitionUpdateCallback | StartViewTransitionOptions
) => ViewTransition
type InjectsDocumentMethod = BoundStartViewTransition extends StartViewTransition ? true : false
const injectsDocumentMethod: InjectsDocumentMethod = true
void injectsDocumentMethod

interface Shot {
  update: () => void
  handle: ViewTransitionHandle
  resolveFinished: () => void
  rejectFinished: (reason: unknown) => void
  resolveUpdate: () => void
  rejectUpdate: (reason: unknown) => void
}

/**
 * A fake `document.startViewTransition`. It returns before calling the update, and the
 * test decides when that call happens. Each start gets its own `finished` and
 * `updateCallbackDone`.
 */
function viewApi(log?: string[]) {
  let active: Shot | undefined

  function shot(update: () => void): Shot {
    let resolveFinished: (value: void) => void = () => {}
    let rejectFinished: (reason: unknown) => void = () => {}
    const finished = new Promise<void>((resolve, reject) => {
      resolveFinished = resolve
      rejectFinished = reject
    })
    let resolveUpdate: (value: void) => void = () => {}
    let rejectUpdate: (reason: unknown) => void = () => {}
    const updateCallbackDone = new Promise<void>((resolve, reject) => {
      resolveUpdate = resolve
      rejectUpdate = reject
    })
    return {
      update,
      handle: { finished, updateCallbackDone },
      resolveFinished: () => resolveFinished(),
      rejectFinished,
      resolveUpdate: () => resolveUpdate(),
      rejectUpdate,
    }
  }

  return {
    start: ((update: () => void) => {
      log?.push("start")
      active = shot(update)
      return active.handle
    }) as StartViewTransition,
    /** Runs the update callback the API is holding. */
    flush() {
      const current = active
      log?.push("enter")
      try {
        current?.update()
        log?.push("leave")
        current?.resolveUpdate()
      } catch (error) {
        log?.push("leave")
        current?.rejectUpdate(error)
        current?.rejectFinished(error)
        throw error
      }
    },
    finish() {
      active?.resolveFinished()
    },
    skip() {
      active?.rejectFinished(new Error("skipped"))
    },
    /** Settles `updateCallbackDone` without running the update callback. */
    settleUpdate() {
      active?.resolveUpdate()
    },
    failUpdate(reason: unknown) {
      active?.rejectUpdate(reason)
    },
    get finished(): Promise<void> {
      return active?.handle.finished ?? Promise.resolve()
    },
    get updateCallbackDone(): Promise<void> {
      return active?.handle.updateCallbackDone ?? Promise.resolve()
    },
  }
}

function runner(
  startViewTransition: StartViewTransition | undefined,
  motionAllowed: () => boolean
): Transition {
  return createTransitions({ startViewTransition, motionAllowed })
}

test("the package entry exports the runner", () => {
  assert.equal(exported, createTransitions)
})

test("the change runs in a view transition only when one may", () => {
  const cases: { api: boolean; motion: boolean; where: "transition" | "direct" }[] = [
    { api: false, motion: true, where: "direct" },
    { api: false, motion: false, where: "direct" },
    { api: true, motion: false, where: "direct" },
    { api: true, motion: true, where: "transition" },
  ]

  for (const { api, motion, where } of cases) {
    const log: string[] = []
    const view = viewApi(log)
    const run = runner(api ? view.start : undefined, () => motion)
    run(() => log.push("change"))
    if (where === "direct") {
      assert.deepEqual(log, ["change"], `api ${api}, motion ${motion}`)
      continue
    }
    assert.deepEqual(log, ["start"], `api ${api}, motion ${motion}: not yet`)
    view.flush()
    assert.deepEqual(log, ["start", "enter", "change", "leave"], `api ${api}, motion ${motion}`)
  }
})

test("the API receives a wrapper and runs the change only when it calls it", () => {
  let received: () => void = () => {}
  let ran = false
  const startViewTransition: StartViewTransition = (update) => {
    received = update
    return viewApi().start(() => {})
  }
  const change = () => {
    ran = true
  }
  runner(startViewTransition, () => true)(change)
  assert.notEqual(received, change)
  assert.equal(ran, false)
  received()
  assert.equal(ran, true)
})

test("motion is read on each call", () => {
  let allowed = false
  const log: string[] = []
  const view = viewApi(log)
  const run = runner(view.start, () => allowed)
  run(() => log.push("blocked"))
  allowed = true
  run(() => log.push("allowed"))
  assert.deepEqual(log, ["blocked", "start"])
  view.flush()
  assert.deepEqual(log, ["blocked", "start", "enter", "allowed", "leave"])
})

test("two changes in one turn run inside the update, in order", () => {
  const log: string[] = []
  const view = viewApi(log)
  const run = runner(view.start, () => true)
  run(() => log.push("a"))
  run(() => log.push("b"))
  assert.deepEqual(log, ["start"])
  view.flush()
  assert.deepEqual(log, ["start", "enter", "a", "b", "leave"])
})

test("a change from inside the update callback runs in that callback, after the first", () => {
  const log: string[] = []
  const view = viewApi(log)
  const run = runner(view.start, () => true)
  run(() => {
    log.push("outer-start")
    run(() => log.push("inner"))
    log.push("outer-end")
  })
  view.flush()
  assert.deepEqual(log, ["start", "enter", "outer-start", "outer-end", "inner", "leave"])
})

test("a change during the animation is applied at once and is not queued", async () => {
  const log: string[] = []
  const view = viewApi(log)
  const run = runner(view.start, () => true)
  run(() => log.push("first"))
  view.flush()
  run(() => log.push("during"))
  assert.deepEqual(log, ["start", "enter", "first", "leave", "during"])

  const finished = view.finished
  view.finish()
  await finished
  run(() => log.push("after"))
  view.flush()
  assert.deepEqual(log, [
    "start",
    "enter",
    "first",
    "leave",
    "during",
    "start",
    "enter",
    "after",
    "leave",
  ])
})

test("a skipped transition releases the guard", async () => {
  const log: string[] = []
  const view = viewApi(log)
  const run = runner(view.start, () => true)
  run(() => log.push("first"))
  view.flush()

  const ignored = view.finished.then(
    () => {},
    () => {}
  )
  view.skip()
  await ignored

  run(() => log.push("after"))
  view.flush()
  assert.deepEqual(log, ["start", "enter", "first", "leave", "start", "enter", "after", "leave"])
})

test("a queued change that throws does not stop the later ones, and the guard lifts", async () => {
  const log: string[] = []
  const view = viewApi(log)
  const run = runner(view.start, () => true)
  run(() => log.push("a"))
  run(() => {
    log.push("b")
    throw new Error("boom")
  })
  run(() => log.push("c"))

  const ignored = view.finished.then(
    () => {},
    () => {}
  )
  assert.throws(() => view.flush(), /boom/)
  assert.deepEqual(log, ["start", "enter", "a", "b", "c", "leave"])
  await ignored

  run(() => log.push("next"))
  view.flush()
  assert.deepEqual(log, [
    "start",
    "enter",
    "a",
    "b",
    "c",
    "leave",
    "start",
    "enter",
    "next",
    "leave",
  ])
})

test("a start that throws applies the change once and the next change starts again", () => {
  let starts = 0
  const log: string[] = []
  let held: () => void = () => {}
  const startViewTransition: StartViewTransition = (update) => {
    starts += 1
    if (starts === 1) throw new Error("failed to start")
    held = update
    return viewApi().start(() => {})
  }
  const run = runner(startViewTransition, () => true)
  run(() => log.push("a"))
  assert.deepEqual(log, ["a"])
  run(() => log.push("b"))
  assert.equal(starts, 2)
  assert.deepEqual(log, ["a"])
  held()
  assert.deepEqual(log, ["a", "b"])
})

test("a skipped transition before the update applies the queued changes once", async () => {
  const log: string[] = []
  const view = viewApi(log)
  const run = runner(view.start, () => true)
  run(() => log.push("a"))
  run(() => log.push("b"))
  assert.deepEqual(log, ["start"])

  const ignored = view.finished.then(
    () => {},
    () => {}
  )
  view.skip()
  await ignored
  assert.deepEqual(log, ["start", "a", "b"])

  view.flush()
  assert.deepEqual(log, ["start", "a", "b", "enter", "leave"])
})

test("updateCallbackDone settling before the update applies the queued changes once", async () => {
  const log: string[] = []
  const view = viewApi(log)
  const run = runner(view.start, () => true)
  run(() => log.push("a"))
  run(() => log.push("b"))
  assert.deepEqual(log, ["start"])

  const ignored = view.updateCallbackDone.then(
    () => {},
    () => {}
  )
  view.failUpdate(new Error("update never ran"))
  await ignored
  assert.deepEqual(log, ["start", "a", "b"])

  view.flush()
  assert.deepEqual(log, ["start", "a", "b", "enter", "leave"])
})

test("two runners do not share a guard", () => {
  const log: string[] = []
  const first = viewApi(log)
  const second = viewApi(log)
  const a = runner(first.start, () => true)
  const b = runner(second.start, () => true)
  a(() => log.push("a"))
  b(() => log.push("b"))
  assert.deepEqual(log, ["start", "start"])
  first.flush()
  second.flush()
  assert.deepEqual(log, ["start", "start", "enter", "a", "leave", "enter", "b", "leave"])
})
