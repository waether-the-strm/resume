import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import type { Settle } from "./settle.ts"
import {
  createKeys,
  keyBindings,
  type FocusKind,
  type KeyActions,
  type KeyEvent,
  type KeyHintText,
  type Keys,
} from "./keys.ts"

const HINTS: KeyHintText = { next: "NEXT_STOP", previous: "PREVIOUS_STOP" }

type Call = { readonly type: "step"; readonly direction: 1 | -1 } | { readonly type: "cancel" }

interface Row {
  readonly name: string
  readonly event: KeyEvent
  /** What the injected `step` returns. Ignored when the row expects no call. */
  readonly stepReturns: boolean
  readonly prevent: boolean
  readonly calls: readonly Call[]
}

function keyEvent(partial: {
  key: string
  shiftKey?: boolean
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  focus?: FocusKind
}): KeyEvent {
  return {
    key: partial.key,
    shiftKey: partial.shiftKey ?? false,
    metaKey: partial.metaKey ?? false,
    ctrlKey: partial.ctrlKey ?? false,
    altKey: partial.altKey ?? false,
    ...(partial.focus !== undefined ? { focus: partial.focus } : {}),
  }
}

function row(
  name: string,
  event: KeyEvent,
  prevent: boolean,
  calls: readonly Call[],
  stepReturns = true
): Row {
  return { name, event, prevent, calls, stepReturns }
}

const step = (direction: 1 | -1): Call => ({ type: "step", direction })
const cancel: Call = { type: "cancel" }

const fields = ["a", "input", "textarea", "select"] as const satisfies readonly FocusKind[]

/** The prototype's keydown listener, lines 612 to 618, as events and the calls they make. */
const table: readonly Row[] = [
  row("ArrowDown steps forward", keyEvent({ key: "ArrowDown" }), true, [step(1)]),
  row("PageDown steps forward", keyEvent({ key: "PageDown" }), true, [step(1)]),
  row("Space steps forward", keyEvent({ key: " " }), true, [step(1)]),
  row("Shift+ArrowDown still steps forward", keyEvent({ key: "ArrowDown", shiftKey: true }), true, [
    step(1),
  ]),
  row("Shift+PageDown still steps forward", keyEvent({ key: "PageDown", shiftKey: true }), true, [
    step(1),
  ]),
  row("ArrowUp steps back", keyEvent({ key: "ArrowUp" }), true, [step(-1)]),
  row("PageUp steps back", keyEvent({ key: "PageUp" }), true, [step(-1)]),
  row("Shift+Space steps back", keyEvent({ key: " ", shiftKey: true }), true, [step(-1)]),
  row("Shift+ArrowUp still steps back", keyEvent({ key: "ArrowUp", shiftKey: true }), true, [
    step(-1),
  ]),
  row("Shift+PageUp still steps back", keyEvent({ key: "PageUp", shiftKey: true }), true, [
    step(-1),
  ]),

  row("meta disables ArrowDown", keyEvent({ key: "ArrowDown", metaKey: true }), false, []),
  row("ctrl disables PageDown", keyEvent({ key: "PageDown", ctrlKey: true }), false, []),
  row("alt disables Space", keyEvent({ key: " ", altKey: true }), false, []),
  row(
    "meta, ctrl and alt together disable ArrowDown",
    keyEvent({ key: "ArrowDown", metaKey: true, ctrlKey: true, altKey: true }),
    false,
    []
  ),
  row("meta disables ArrowUp", keyEvent({ key: "ArrowUp", metaKey: true }), false, []),
  row("ctrl disables PageUp", keyEvent({ key: "PageUp", ctrlKey: true }), false, []),
  row("alt disables Shift+Space", keyEvent({ key: " ", shiftKey: true, altKey: true }), false, []),
  row(
    "Shift does not turn a modified ArrowDown back on",
    keyEvent({ key: "ArrowDown", shiftKey: true, metaKey: true }),
    false,
    []
  ),
  row("meta disables Home", keyEvent({ key: "Home", metaKey: true }), false, []),
  row("ctrl disables End", keyEvent({ key: "End", ctrlKey: true }), false, []),
  row("alt disables Home", keyEvent({ key: "Home", altKey: true }), false, []),
  row(
    "meta+Shift does not cancel on Home",
    keyEvent({ key: "Home", metaKey: true, shiftKey: true }),
    false,
    []
  ),

  row("Home cancels a glide and does not prevent the default", keyEvent({ key: "Home" }), false, [
    cancel,
  ]),
  row("End cancels a glide and does not prevent the default", keyEvent({ key: "End" }), false, [
    cancel,
  ]),
  row("Shift+Home still cancels", keyEvent({ key: "Home", shiftKey: true }), false, [cancel]),
  row("Shift+End still cancels", keyEvent({ key: "End", shiftKey: true }), false, [cancel]),

  ...fields.flatMap((focus) => [
    row(
      `ArrowDown is ignored in ${focus}`,
      keyEvent({ key: "ArrowDown", focus }),
      false,
      [],
      false
    ),
    row(`ArrowUp is ignored in ${focus}`, keyEvent({ key: "ArrowUp", focus }), false, [], false),
    row(`PageDown is ignored in ${focus}`, keyEvent({ key: "PageDown", focus }), false, []),
    row(`PageUp is ignored in ${focus}`, keyEvent({ key: "PageUp", focus }), false, []),
    row(`Space is ignored in ${focus}`, keyEvent({ key: " ", focus }), false, []),
    row(
      `Shift+Space is ignored in ${focus}`,
      keyEvent({ key: " ", shiftKey: true, focus }),
      false,
      []
    ),
    row(`Home still cancels in ${focus}`, keyEvent({ key: "Home", focus }), false, [cancel]),
    row(`End still cancels in ${focus}`, keyEvent({ key: "End", focus }), false, [cancel]),
  ]),

  row("Space is ignored on a button", keyEvent({ key: " ", focus: "button" }), false, []),
  row(
    "Shift+Space is ignored on a button",
    keyEvent({ key: " ", shiftKey: true, focus: "button" }),
    false,
    []
  ),
  row("ArrowDown still steps on a button", keyEvent({ key: "ArrowDown", focus: "button" }), true, [
    step(1),
  ]),
  row("PageDown still steps on a button", keyEvent({ key: "PageDown", focus: "button" }), true, [
    step(1),
  ]),
  row("ArrowUp still steps on a button", keyEvent({ key: "ArrowUp", focus: "button" }), true, [
    step(-1),
  ]),
  row("PageUp still steps on a button", keyEvent({ key: "PageUp", focus: "button" }), true, [
    step(-1),
  ]),
  row("Home still cancels on a button", keyEvent({ key: "Home", focus: "button" }), false, [
    cancel,
  ]),
  row("End still cancels on a button", keyEvent({ key: "End", focus: "button" }), false, [cancel]),
  row(
    "meta+ArrowDown in an input calls nothing",
    keyEvent({ key: "ArrowDown", metaKey: true, focus: "input" }),
    false,
    [],
    false
  ),

  row(
    "ArrowDown when step returns false cancels and lets the browser scroll",
    keyEvent({ key: "ArrowDown" }),
    false,
    [step(1), cancel],
    false
  ),
  row(
    "PageDown when step returns false cancels and lets the browser scroll",
    keyEvent({ key: "PageDown" }),
    false,
    [step(1), cancel],
    false
  ),
  row(
    "Space when step returns false cancels and lets the browser scroll",
    keyEvent({ key: " " }),
    false,
    [step(1), cancel],
    false
  ),
  row(
    "ArrowUp when step returns false cancels and lets the browser scroll",
    keyEvent({ key: "ArrowUp" }),
    false,
    [step(-1), cancel],
    false
  ),
  row(
    "PageUp when step returns false cancels and lets the browser scroll",
    keyEvent({ key: "PageUp" }),
    false,
    [step(-1), cancel],
    false
  ),
  row(
    "Shift+Space when step returns false cancels and lets the browser scroll",
    keyEvent({ key: " ", shiftKey: true }),
    false,
    [step(-1), cancel],
    false
  ),

  row("ArrowLeft is left to the browser", keyEvent({ key: "ArrowLeft" }), false, []),
  row("ArrowRight is left to the browser", keyEvent({ key: "ArrowRight" }), false, []),
  row("Escape is left to the browser", keyEvent({ key: "Escape" }), false, []),
  row("Tab is left to the browser", keyEvent({ key: "Tab" }), false, []),
  row("Enter is left to the browser", keyEvent({ key: "Enter" }), false, []),
  row("a letter is left to the browser", keyEvent({ key: "a" }), false, []),
  row("Backspace is left to the browser", keyEvent({ key: "Backspace" }), false, []),
  row("the legacy Spacebar name is not Space", keyEvent({ key: "Spacebar" }), false, []),
  row("the word Space is not the space bar", keyEvent({ key: "Space" }), false, []),
  row("arrowdown in the wrong case is not a binding", keyEvent({ key: "arrowdown" }), false, []),
  row("an empty key is not a binding", keyEvent({ key: "" }), false, []),
]

function press(event: KeyEvent, stepReturns: boolean): { prevent: boolean; calls: Call[] } {
  const calls: Call[] = []
  const keys = createKeys(
    {
      step(direction) {
        calls.push({ type: "step", direction })
        return stepReturns
      },
      cancel() {
        calls.push(cancel)
      },
    },
    HINTS
  )
  return { prevent: keys.handle(event), calls }
}

test("keydown events call step or cancel as the prototype's listener does", () => {
  for (const entry of table) {
    const outcome = press(entry.event, entry.stepReturns)
    assert.equal(outcome.prevent, entry.prevent, entry.name)
    assert.deepEqual(outcome.calls, entry.calls, entry.name)
  }
})

test("a repeated keydown steps again", () => {
  const calls: Call[] = []
  const keys = createKeys(
    {
      step(direction) {
        calls.push(step(direction))
        return true
      },
      cancel() {
        calls.push(cancel)
      },
    },
    HINTS
  )
  assert.equal(keys.handle(keyEvent({ key: "ArrowDown" })), true)
  assert.equal(keys.handle(keyEvent({ key: "ArrowDown" })), true)
  assert.deepEqual(calls, [step(1), step(1)])
})

test("a step that returns true does not cancel", () => {
  const outcome = press(keyEvent({ key: "PageDown" }), true)
  assert.equal(outcome.prevent, true)
  assert.deepEqual(outcome.calls, [step(1)])
})

test("hint rows are the hinted bindings, with the caller's descriptions", () => {
  const first = createKeys(idle(), { next: "NEXT_STOP", previous: "PREVIOUS_STOP" })
  const second = createKeys(idle(), { next: "AAA", previous: "BBB" })
  assert.deepEqual(first.hints, [
    ["ArrowDown, PageDown, Space", "NEXT_STOP"],
    ["ArrowUp, PageUp, Shift+Space", "PREVIOUS_STOP"],
  ])
  assert.deepEqual(second.hints, [
    ["ArrowDown, PageDown, Space", "AAA"],
    ["ArrowUp, PageUp, Shift+Space", "BBB"],
  ])
  for (const entry of first.hints) {
    assert.equal(entry[0].includes("Home"), false)
    assert.equal(entry[0].includes("End"), false)
  }
  assert.equal(first.handle(keyEvent({ key: "ArrowDown" })), true)
  assert.equal(second.handle(keyEvent({ key: "ArrowUp" })), true)
})

test("the hint rows follow the registry, in order", () => {
  const text: KeyHintText = { next: "N", previous: "P" }
  const { hints } = createKeys(idle(), text)
  const hinted = keyBindings.filter((binding) => binding.hint !== undefined)
  assert.equal(hints.length, hinted.length)
  hinted.forEach((binding, index) => {
    const hint = binding.hint
    assert.notEqual(hint, undefined)
    assert.equal(hints[index]?.[1], text[hint!])
  })
  assert.deepEqual(
    hints.map((entry) => entry[0]),
    ["ArrowDown, PageDown, Space", "ArrowUp, PageUp, Shift+Space"]
  )
})

test("every binding is plain, and handling its key runs its action", () => {
  assert.equal(keyBindings.length, 3)
  for (const binding of keyBindings) {
    assert.equal(binding.modifier, "plain")
    for (const pattern of binding.keys) {
      const outcome = press(
        keyEvent({
          key: pattern.key,
          shiftKey: pattern.shift === true,
        }),
        true
      )
      if (binding.action.type === "cancel") {
        assert.equal(outcome.prevent, false, pattern.key)
        assert.deepEqual(outcome.calls, [cancel], pattern.key)
      } else {
        assert.equal(outcome.prevent, true, pattern.key)
        assert.deepEqual(outcome.calls, [step(binding.action.direction)], pattern.key)
      }
    }
  }
})

test("keys.ts imports nothing", () => {
  const source = readFileSync(new URL("./keys.ts", import.meta.url), "utf8")
  assert.equal(/\bfrom\s+["']/.test(source), false)
})

/** Compile-time check: settle's `step` and `cancel` are the injected actions. */
function wire(settle: Pick<Settle, "step" | "cancel">, text: KeyHintText): Keys {
  return createKeys(settle, text)
}

test("settle's step and cancel are the actions the handler calls", () => {
  const calls: Call[] = []
  const settle: Pick<Settle, "step" | "cancel"> = {
    step(direction) {
      calls.push(step(direction as 1 | -1))
      return direction > 0
    },
    cancel() {
      calls.push(cancel)
    },
  }
  const keys = wire(settle, HINTS)
  assert.equal(keys.handle(keyEvent({ key: "ArrowUp" })), false)
  assert.deepEqual(calls, [step(-1), cancel])
})

function idle(): KeyActions {
  return {
    step() {
      return true
    },
    cancel() {},
  }
}
