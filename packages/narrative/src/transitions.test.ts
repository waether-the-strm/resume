import { test } from "node:test"
import assert from "node:assert/strict"
import { createTransitions as exported } from "./index.ts"
import { createTransitions, type StartViewTransition, type Transition } from "./transitions.ts"

// `document.startViewTransition.bind(document)` has to stay injectable. The callback
// parameter is optional on the DOM method and required on ours.
type BoundStartViewTransition = (
  callbackOptions?: ViewTransitionUpdateCallback | StartViewTransitionOptions
) => ViewTransition
type InjectsDocumentMethod = BoundStartViewTransition extends StartViewTransition ? true : false
const injectsDocumentMethod: InjectsDocumentMethod = true
void injectsDocumentMethod

const pending = (): Promise<void> => new Promise(() => {})

/** A fake `document.startViewTransition`: runs the update synchronously, as the API does. */
function fakeStart(log: string[], finished: Promise<void> = pending()): StartViewTransition {
  return (change) => {
    log.push("enter")
    change()
    log.push("leave")
    return { finished }
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
  // The prototype's condition, plus the re-entry case covered below: API present, motion
  // allowed, and no transition running.
  const cases: { api: boolean; motion: boolean; where: "transition" | "direct" }[] = [
    { api: false, motion: true, where: "direct" },
    { api: false, motion: false, where: "direct" },
    { api: true, motion: false, where: "direct" },
    { api: true, motion: true, where: "transition" },
  ]

  for (const { api, motion, where } of cases) {
    const log: string[] = []
    const run = runner(api ? fakeStart(log) : undefined, () => motion)
    run(() => log.push("change"))
    assert.deepEqual(
      log,
      where === "transition" ? ["enter", "change", "leave"] : ["change"],
      `api ${api}, motion ${motion}`
    )
  }
})

test("the update callback handed to the API is the change itself", () => {
  let received: () => void = () => {}
  const change = () => {}
  const startViewTransition: StartViewTransition = (update) => {
    received = update
    return { finished: pending() }
  }
  runner(startViewTransition, () => true)(change)
  assert.equal(received, change)
})

test("motion is read on each call", () => {
  let allowed = false
  const log: string[] = []
  const run = runner(fakeStart(log), () => allowed)
  run(() => log.push("blocked"))
  allowed = true
  run(() => log.push("allowed"))
  assert.deepEqual(log, ["blocked", "enter", "allowed", "leave"])
})

test("a change from inside the update callback does not start a second transition", () => {
  const log: string[] = []
  const run = runner(fakeStart(log), () => true)
  run(() => {
    log.push("outer")
    run(() => log.push("inner"))
  })
  assert.deepEqual(log, ["enter", "outer", "inner", "leave"])
})

test("a change while a transition runs is applied at once and is not queued", async () => {
  let finish: () => void = () => {}
  const finished = new Promise<void>((resolve) => {
    finish = resolve
  })
  const log: string[] = []
  const run = runner(fakeStart(log, finished), () => true)

  run(() => log.push("first"))
  run(() => log.push("during"))
  assert.deepEqual(log, ["enter", "first", "leave", "during"])

  finish()
  await finished
  run(() => log.push("after"))
  assert.deepEqual(log, ["enter", "first", "leave", "during", "enter", "after", "leave"])
})

test("a skipped transition releases the guard", async () => {
  let rejectFinished: (reason: unknown) => void = () => {}
  const finished = new Promise<void>((_resolve, reject) => {
    rejectFinished = reject
  })
  const log: string[] = []
  const run = runner(fakeStart(log, finished), () => true)
  run(() => log.push("first"))

  const ignored = finished.then(
    () => {},
    () => {}
  )
  rejectFinished(new Error("skipped"))
  await ignored

  run(() => log.push("after"))
  assert.deepEqual(log, ["enter", "first", "leave", "enter", "after", "leave"])
})

test("a start that throws does not leave the guard stuck", () => {
  let starts = 0
  const startViewTransition: StartViewTransition = (change) => {
    starts += 1
    if (starts === 1) throw new Error("failed to start")
    change()
    return { finished: pending() }
  }
  const run = runner(startViewTransition, () => true)
  assert.throws(() => run(() => {}), /failed to start/)
  run(() => {})
  assert.equal(starts, 2)
})

test("a change that throws inside the update releases the guard", () => {
  let starts = 0
  const startViewTransition: StartViewTransition = (change) => {
    starts += 1
    change()
    return { finished: pending() }
  }
  const run = runner(startViewTransition, () => true)
  assert.throws(
    () =>
      run(() => {
        throw new Error("boom")
      }),
    /boom/
  )
  run(() => {})
  assert.equal(starts, 2)
})

test("two runners do not share a guard", () => {
  const log: string[] = []
  const start = fakeStart(log)
  const a = runner(start, () => true)
  const b = runner(start, () => true)
  a(() => log.push("a"))
  b(() => log.push("b"))
  assert.deepEqual(log, ["enter", "a", "leave", "enter", "b", "leave"])
})
