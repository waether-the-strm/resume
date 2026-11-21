// Key bindings for moving between stops. Ported from the prototype at v0.16.0,
// the `keydown` listener at lines 612 to 618.
//
// No DOM, no globals, no listeners. The adapter owns the listener. It describes
// the keydown in plain data and prevents the browser default only when `handle`
// returns true. `step` and `cancel` are settle's functions, passed in. This
// module does not import settle, and it does not read a scroll position.
// Positions stay in screens inside settle: that is what decides a step lands on
// the next stop, on the card after the last stop, or returns false so the key
// scrolls natively (scenario G4). This module only decides which key calls which.
//
// One list, `keyBindings`, is the registry (ADR 0004, item 4). The handler and
// the shortcut-hint rows are both read from it. A binding is the keys, an
// optional modifier rule, what it does, and an optional hint. The hint row is
// `[keys, description]`. The description is an interface string the caller
// passes in. This module does not choose that wording.
//
// The prototype's listener, in order:
//
// - meta, ctrl or alt: ignore the key.
// - ArrowDown, PageDown, or Space without Shift: step forward.
// - ArrowUp, PageUp, or Space with Shift: step back.
// - Home or End, and no step key: cancel the glide, and do not prevent the default.
// - a step key while focus is in a link, an input, a textarea or a select: ignore it.
// - Space while focus is in a button: ignore it. The arrows and page keys still step.
// - `step` returns true: the caller prevents the default.
// - `step` returns false: cancel the glide and let the browser scroll.
//
// Shift does not change an arrow or a page key. Home and End still cancel when a
// field has focus, because the prototype handles them before it looks at focus,
// and it does not prevent the default, so the field keeps the key too.
// The adapter calls `handle` on every keydown, including repeats. The prototype
// does not read `repeat`.

/** Kind of element that has focus, when it is one the prototype treats specially. */
export type FocusKind = "a" | "input" | "textarea" | "select" | "button"

/** `KeyboardEvent.key` for the space bar. The prototype compares with `' '`. */
const SPACE = " "

/**
 * Printed for the space bar in a hint row. A key name, not a sentence.
 * The description beside it is an interface string passed to `createKeys`.
 */
const SPACE_NAME = "Space"

/** Printed before a key that matches only while Shift is held. A key name. */
const SHIFT_NAME = "Shift"

/**
 * Step keys do nothing while focus is inside one of these.
 * The prototype: `el.closest('a,input,textarea,select')`.
 */
const FIELD_OR_LINK = ["a", "input", "textarea", "select"] as const satisfies readonly FocusKind[]

/**
 * Space does nothing in a field, a link, or a button.
 * The prototype adds `k === ' ' && el.closest('button')` to the same return.
 */
const SPACE_FOCUS = [
  "a",
  "input",
  "textarea",
  "select",
  "button",
] as const satisfies readonly FocusKind[]

/**
 * A keydown, with no DOM node attached. `focus` is set when focus is inside a
 * link, a field, or a button. A link or a field wins over a button: that is the
 * order of the prototype's `closest` checks, and the adapter resolves it the
 * same way. Omit `focus` when nothing of that kind contains the focus.
 */
export interface KeyEvent {
  /** `KeyboardEvent.key`. Space is `" "`, not `"Space"`. */
  readonly key: string
  readonly shiftKey: boolean
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly focus?: FocusKind
}

/**
 * `plain`: any of meta, ctrl or alt disables the binding. The prototype returns
 * before it reads the key when one of those three is held. Shift is not part of
 * this rule; it belongs to the key pattern, and only Space uses it.
 */
export type ModifierRule = "plain"

/** One key the binding matches. `shift` omitted matches whether or not Shift is held. */
export interface KeyPattern {
  /** `KeyboardEvent.key`. */
  readonly key: string
  /** `true` matches only with Shift. `false` matches only without it. */
  readonly shift?: boolean
  /**
   * Focus kinds that swallow this key: the handler returns false and calls
   * nothing, so the focused control keeps the key and a glide is left running.
   */
  readonly ignoreFocus?: readonly FocusKind[]
}

/** What a binding does once it matches. `step` is one stop; `cancel` stops a glide. */
export type BindingAction =
  | { readonly type: "step"; readonly direction: 1 | -1 }
  | { readonly type: "cancel" }

/** Which interface string fills the description of a hint row. */
export type HintSlot = "next" | "previous"

/**
 * One binding. The keys, an optional modifier rule, what it does, and an
 * optional hint. Bindings with a `hint` become the shortcut-hint rows, in this
 * list's order. The row's keys are these keys, formatted; the description is
 * the string the caller passed for the slot.
 */
export interface Binding {
  readonly keys: readonly KeyPattern[]
  readonly modifier?: ModifierRule
  readonly action: BindingAction
  readonly hint?: HintSlot
}

/** Interface strings for the hint rows. This module does not supply them. */
export interface KeyHintText {
  /** Shown beside the keys that step forward. */
  readonly next: string
  /** Shown beside the keys that step back. */
  readonly previous: string
}

/** One shortcut-hint row: the keys, then the description the caller supplied. */
export type HintRow = readonly [keys: string, description: string]

/**
 * Settle's `step` and `cancel`, passed in. `step` returns false when there is
 * nothing to do, and it does not cancel a glide itself: a key that gets false
 * calls `cancel` so the glide stops and the browser scrolls. An arrow button
 * that calls `step` directly does not, which is settle's own rule.
 */
export interface KeyActions {
  step(direction: 1 | -1): boolean
  cancel(): void
}

export interface Keys {
  /** True when the caller should prevent the browser's default for this key. */
  handle(event: KeyEvent): boolean
  /** One row per binding that carries a hint, in registry order. */
  readonly hints: readonly HintRow[]
}

/**
 * The prototype's keys. Forward, then back, then Home and End, which is the
 * order the listener tests them. Every binding is `plain`.
 */
export const keyBindings: readonly Binding[] = [
  {
    keys: [
      { key: "ArrowDown", ignoreFocus: FIELD_OR_LINK },
      { key: "PageDown", ignoreFocus: FIELD_OR_LINK },
      { key: SPACE, shift: false, ignoreFocus: SPACE_FOCUS },
    ],
    modifier: "plain",
    action: { type: "step", direction: 1 },
    hint: "next",
  },
  {
    keys: [
      { key: "ArrowUp", ignoreFocus: FIELD_OR_LINK },
      { key: "PageUp", ignoreFocus: FIELD_OR_LINK },
      { key: SPACE, shift: true, ignoreFocus: SPACE_FOCUS },
    ],
    modifier: "plain",
    action: { type: "step", direction: -1 },
    hint: "previous",
  },
  {
    keys: [{ key: "Home" }, { key: "End" }],
    modifier: "plain",
    action: { type: "cancel" },
  },
]

function patternMatches(pattern: KeyPattern, event: KeyEvent): boolean {
  if (pattern.key !== event.key) return false
  if (pattern.shift === undefined) return true
  return pattern.shift === event.shiftKey
}

/** A plain binding matches the key but a modifier chord disables it. */
function modifierBlocks(binding: Binding, event: KeyEvent): boolean {
  if (binding.modifier !== "plain") return false
  return event.metaKey || event.ctrlKey || event.altKey
}

function focusBlocks(pattern: KeyPattern, event: KeyEvent): boolean {
  const focus = event.focus
  if (focus === undefined) return false
  return pattern.ignoreFocus?.includes(focus) ?? false
}

function perform(action: BindingAction, actions: KeyActions): boolean {
  if (action.type === "cancel") {
    actions.cancel()
    return false
  }
  const moved = actions.step(action.direction)
  if (!moved) actions.cancel()
  return moved
}

function handleKey(event: KeyEvent, actions: KeyActions): boolean {
  for (const binding of keyBindings) {
    const pattern = binding.keys.find((candidate) => patternMatches(candidate, event))
    if (pattern === undefined) continue
    // The modifier rule drops this binding only. Every binding in the list is
    // plain and the keys do not overlap, so a chord calls nothing, which is
    // the prototype's early return on meta, ctrl or alt.
    if (modifierBlocks(binding, event)) continue
    // The focused control keeps the key. A later binding must not take it.
    if (focusBlocks(pattern, event)) return false
    return perform(binding.action, actions)
  }
  return false
}

function keyLabel(pattern: KeyPattern): string {
  const name = pattern.key === SPACE ? SPACE_NAME : pattern.key
  if (pattern.shift === true) return `${SHIFT_NAME}+${name}`
  return name
}

function keysLabel(patterns: readonly KeyPattern[]): string {
  return patterns.map(keyLabel).join(", ")
}

function hintRows(text: KeyHintText): readonly HintRow[] {
  const rows: HintRow[] = []
  for (const binding of keyBindings) {
    const slot = binding.hint
    if (slot === undefined) continue
    rows.push([keysLabel(binding.keys), text[slot]])
  }
  return rows
}

/** The handler and the hint rows for `keyBindings`. */
export function createKeys(actions: KeyActions, text: KeyHintText): Keys {
  return {
    handle(event) {
      return handleKey(event, actions)
    },
    hints: hintRows(text),
  }
}
