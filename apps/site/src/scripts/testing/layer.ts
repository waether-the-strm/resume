// The welcome modal, the corner bar, and the feedback drawer. Built in the
// browser, so the server HTML is the page it is today. Tokens and the existing
// type classes only; the surface is ui-panel and the action is ui-pill.

import type { FavoriteId } from "../../testing/schema.ts"
import { cleanName } from "../../testing/text.ts"
import { testingCopy, type TestingLang, type TestingPhrases } from "./copy.ts"
import { feedbackSubmitted, modalDismissed, postTelemetry, postTelemetryAwait } from "./events.ts"
import {
  copyVariant,
  readMinimized,
  readPlace,
  replaceQuery,
  tourOwnsProgress,
  writeLang,
  writeMinimized,
  writeName,
  writePlace,
  writeWelcomed,
  type WidgetPlace,
} from "./session.ts"
import { pageContext, type WatchedSession } from "./watch.ts"

type View = "modal" | "bar" | "drawer"

interface Scores {
  visuals?: number
  clarity?: number
  tone?: number
}

interface Drag {
  pointerId: number
  originX: number
  originY: number
  startLeft: number
  startTop: number
  moved: boolean
  hadPlace: boolean
  bar: HTMLElement
}

export function mountTesting(doc: Document, session: WatchedSession): void {
  if (doc.querySelector("[data-testing-root]")) return
  const candidate = doc.defaultView
  if (candidate === null) return
  const viewWindow: Window = candidate

  const root = doc.createElement("div")
  root.dataset.testingRoot = ""
  root.className = "testing"
  doc.body.append(root)

  let view: View = session.memory.getItem("strm.testing.welcomed") === "1" ? "bar" : "modal"
  let editing = false
  let greet = session.name.length > 0
  let openedAt = viewWindow.performance.now()
  let scores: Scores = {}
  let favorite: FavoriteId = copyVariant(viewWindow.location.search)
  let comment = ""
  let error = ""
  let sent = false
  let thanksName = ""
  let sending = false
  let minimized = readMinimized(session.memory)
  let place = readPlace(session.memory)
  let widgetClosed = false
  let drag: Drag | null = null
  const frozen: Element[] = []

  const paint = (focusSelector: string | null) => {
    endDrag(false)
    const phrases = testingCopy[session.lang]
    root.replaceChildren()
    if (view === "bar") {
      if (!widgetClosed) {
        const bar = buildBar(phrases)
        root.append(bar)
        settle(bar)
      }
      setInert(false)
    } else if (view === "modal") {
      root.append(buildModal(phrases))
      setInert(true)
    } else {
      root.append(buildDrawer(phrases))
      setInert(true)
    }
    if (focusSelector) root.querySelector<HTMLElement>(focusSelector)?.focus()
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && drag) {
      event.preventDefault()
      event.stopPropagation()
      endDrag(false)
      return
    }
    const dialog = root.querySelector<HTMLElement>("[data-testing-dialog]")
    if (!dialog) return
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      if (editing) {
        editing = false
        paint("[data-testing='change-name']")
        return
      }
      if (view === "modal") dismissModal()
      else closeDrawer()
      return
    }
    if (event.key === "Tab") trap(dialog, event)
  }
  doc.addEventListener("keydown", onKey, true)
  paint(view === "modal" ? "[data-testing-dialog]" : null)

  function dismissModal(): void {
    const elapsed = viewWindow.performance.now() - openedAt
    postTelemetry(modalDismissed(session.sessionId, elapsed))
    writeWelcomed(session.memory, true)
    view = "bar"
    editing = false
    paint("[data-testing='feedback']")
  }

  function closeDrawer(): void {
    view = "bar"
    sent = false
    thanksName = ""
    error = ""
    sending = false
    paint("[data-testing='feedback']")
  }

  function openModal(): void {
    view = "modal"
    editing = false
    greet = session.name.length > 0
    openedAt = viewWindow.performance.now()
    paint("[data-testing-dialog]")
  }

  function openDrawer(): void {
    view = "drawer"
    sent = false
    thanksName = ""
    error = ""
    scores = {}
    comment = ""
    favorite = copyVariant(viewWindow.location.search)
    paint("[data-testing-dialog]")
  }

  function setLang(lang: TestingLang): void {
    if (session.lang === lang) return
    session.lang = lang
    writeLang(session.memory, lang)
    const next = replaceQuery(viewWindow.location.href, (params) => {
      params.set("feedbackLang", lang)
      params.delete("fl")
    })
    writeAddress(next)
    paint(`[data-lang="${lang}"]`)
  }

  function applyName(value: string): void {
    session.name = cleanName(value)
    writeName(session.memory, session.name)
    const next = replaceQuery(viewWindow.location.href, (params) => {
      if (session.name) params.set("tester", session.name)
      else params.delete("tester")
      if (!tourOwnsProgress(params)) params.delete("t")
    })
    writeAddress(next)
  }

  function writeAddress(next: string): void {
    const here = `${viewWindow.location.pathname}${viewWindow.location.search}${viewWindow.location.hash}`
    if (next !== here) viewWindow.history.replaceState(viewWindow.history.state, "", next)
  }

  function chrome(phrases: TestingPhrases): HTMLElement {
    const group = el(doc, "div", "testing-chrome")
    const toggle = iconButton(
      minimized ? phrases.expand : phrases.shrink,
      minimized ? "+" : "–",
      minimized ? "expand" : "shrink"
    )
    toggle.addEventListener("click", () => {
      minimized = !minimized
      writeMinimized(session.memory, minimized)
      paint(minimized ? "[data-testing='expand']" : "[data-testing='shrink']")
    })
    const move = iconButton(phrases.move, "✥", "move")
    move.classList.add("testing-grip")
    move.addEventListener("pointerdown", startDrag)
    const closeWidget = iconButton(phrases.closeWidget, "×", "close-widget")
    closeWidget.addEventListener("click", () => {
      widgetClosed = true
      paint(null)
    })
    group.append(toggle, move, closeWidget)
    return group
  }

  function iconButton(label: string, mark: string, testing: string): HTMLButtonElement {
    const button = el(doc, "button", "type-micro testing-chrome-button")
    button.type = "button"
    button.dataset.testing = testing
    button.setAttribute("aria-label", label)
    const glyph = el(doc, "span", "testing-mark", mark)
    glyph.setAttribute("aria-hidden", "true")
    button.append(glyph)
    return button
  }

  function settle(bar: HTMLElement): void {
    if (!place) return
    pin(bar, clamp(bar, place.x, place.y))
  }

  function pin(bar: HTMLElement, next: WidgetPlace): void {
    bar.style.right = "auto"
    bar.style.left = `${next.x}px`
    bar.style.top = `${next.y}px`
  }

  function clamp(node: HTMLElement, x: number, y: number): WidgetPlace {
    const maxX = Math.max(0, doc.documentElement.clientWidth - node.offsetWidth)
    const maxY = Math.max(0, viewWindow.innerHeight - node.offsetHeight)
    return {
      x: Math.round(Math.min(maxX, Math.max(0, x))),
      y: Math.round(Math.min(maxY, Math.max(0, y))),
    }
  }

  function startDrag(event: PointerEvent): void {
    if (event.button !== 0) return
    const handle = event.currentTarget
    if (!(handle instanceof HTMLElement)) return
    const bar = handle.closest<HTMLElement>("[data-testing='bar']")
    if (!bar) return
    event.preventDefault()
    const rect = bar.getBoundingClientRect()
    drag = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
      hadPlace: place !== null,
      bar,
    }
    pin(bar, { x: rect.left, y: rect.top })
    handle.setPointerCapture(event.pointerId)
    viewWindow.addEventListener("pointermove", onDragMove)
    viewWindow.addEventListener("pointerup", onDragEnd)
    viewWindow.addEventListener("pointercancel", onDragCancel)
  }

  function onDragMove(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return
    const dx = event.clientX - drag.originX
    const dy = event.clientY - drag.originY
    if (Math.hypot(dx, dy) >= 4) drag.moved = true
    const next = clamp(drag.bar, drag.startLeft + dx, drag.startTop + dy)
    pin(drag.bar, next)
  }

  function onDragEnd(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return
    endDrag(drag.moved)
  }

  function onDragCancel(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return
    endDrag(false)
  }

  function endDrag(persist: boolean): void {
    const current = drag
    if (!current) return
    drag = null
    viewWindow.removeEventListener("pointermove", onDragMove)
    viewWindow.removeEventListener("pointerup", onDragEnd)
    viewWindow.removeEventListener("pointercancel", onDragCancel)
    if (!current.bar.isConnected) return
    if (persist) {
      const rect = current.bar.getBoundingClientRect()
      const next = clamp(current.bar, rect.left, rect.top)
      place = next
      writePlace(session.memory, next.x, next.y)
      pin(current.bar, next)
      return
    }
    if (current.hadPlace && place) pin(current.bar, clamp(current.bar, place.x, place.y))
    else {
      current.bar.style.left = ""
      current.bar.style.top = ""
      current.bar.style.right = ""
    }
  }

  function setInert(on: boolean): void {
    if (!on) {
      for (const node of frozen) node.removeAttribute("inert")
      frozen.length = 0
      return
    }
    for (const child of doc.body.children) {
      if (child === root || child.hasAttribute("inert")) continue
      child.setAttribute("inert", "")
      frozen.push(child)
    }
  }

  function buildBar(phrases: TestingPhrases): HTMLElement {
    const bar = el(doc, "aside", "testing-bar ui-panel")
    bar.dataset.testing = "bar"
    bar.setAttribute("aria-label", phrases.barLabel)
    if (!minimized) {
      const variant = el(doc, "span", "type-micro testing-variant")
      variant.textContent = phrases.variantLine(copyVariant(viewWindow.location.search))
      const feedback = el(doc, "button", "ui-pill", phrases.feedback)
      feedback.type = "button"
      feedback.dataset.testing = "feedback"
      feedback.addEventListener("click", openDrawer)
      const help = el(doc, "button", "type-micro testing-help", "?")
      help.type = "button"
      help.setAttribute("aria-label", phrases.instructions)
      help.addEventListener("click", openModal)
      bar.append(variant, feedback, langSwitch(phrases), help)
    }
    bar.append(chrome(phrases))
    return bar
  }

  function buildModal(phrases: TestingPhrases): HTMLElement {
    const backdrop = backdropOf("modal")
    const dialog = sheet("testing-title")
    dialog.dataset.testing = "modal"
    const head = el(doc, "div", "testing-head")
    const title = el(doc, "h2", "type-lead")
    title.id = "testing-title"
    title.textContent = greet && session.name ? phrases.titleNamed(session.name) : phrases.title
    head.append(title, langSwitch(phrases))
    const body = el(doc, "div", "testing-body type-body")
    for (const text of [
      phrases.honest,
      phrases.language,
      phrases.quick,
      phrases.comparative,
      phrases.respond,
      phrases.widget,
    ]) {
      body.append(el(doc, "p", undefined, text))
    }
    body.append(nameControl(phrases))
    const foot = el(doc, "div", "testing-foot")
    const dismiss = el(doc, "button", "ui-pill", phrases.dismiss)
    dismiss.type = "button"
    dismiss.addEventListener("click", dismissModal)
    foot.append(dismiss)
    dialog.append(head, body, foot)
    backdrop.append(dialog)
    return backdrop
  }

  function buildDrawer(phrases: TestingPhrases): HTMLElement {
    const backdrop = backdropOf("drawer")
    const dialog = sheet("testing-drawer-title")
    dialog.dataset.testing = "drawer"
    const head = el(doc, "div", "testing-head")
    const titles = el(doc, "div")
    const title = el(doc, "h2", "type-lead", phrases.drawerLabel)
    title.id = "testing-drawer-title"
    const watching = el(doc, "p", "type-micro testing-variant")
    watching.textContent = phrases.variantLine(copyVariant(viewWindow.location.search))
    titles.append(title, watching)
    const close = el(doc, "button", "type-micro testing-close", phrases.close)
    close.type = "button"
    close.addEventListener("click", closeDrawer)
    head.append(titles, langSwitch(phrases), close)
    dialog.append(head)
    dialog.append(sent ? thanksBody(phrases) : formBody(phrases))
    backdrop.append(dialog)
    return backdrop
  }

  function thanksBody(phrases: TestingPhrases): HTMLElement {
    const body = el(doc, "div", "testing-body")
    const line = el(doc, "p", "type-body")
    line.textContent = thanksName ? phrases.thanksNamed(thanksName) : phrases.thanks
    body.append(line)
    return body
  }

  function formBody(phrases: TestingPhrases): HTMLFormElement {
    const form = doc.createElement("form")
    form.className = "testing-form"
    form.noValidate = true
    form.append(
      scale("visuals", phrases.visuals, undefined, phrases.visualsLow, phrases.visualsHigh),
      scale(
        "clarity",
        phrases.clarity,
        phrases.clarityQuestion,
        phrases.clarityLow,
        phrases.clarityHigh
      ),
      scale(
        "tone",
        phrases.tone,
        phrases.toneQuestion,
        phrases.toneLow,
        phrases.toneHigh,
        phrases.toneHint
      ),
      favorites(phrases),
      wordsField(phrases),
      signatureField(phrases)
    )
    const alert = el(doc, "p", "type-micro testing-error")
    alert.id = "testing-error"
    alert.setAttribute("role", "alert")
    alert.textContent = error
    const send = el(doc, "button", "ui-pill", phrases.send)
    send.type = "submit"
    send.disabled = sending
    form.append(alert, send)
    form.addEventListener("submit", (event) => {
      event.preventDefault()
      void submit(form, phrases)
    })
    return form
  }

  function scale(
    name: keyof Scores,
    legend: string,
    question: string | undefined,
    low: string,
    high: string,
    hint?: string
  ): HTMLFieldSetElement {
    const field = doc.createElement("fieldset")
    const caption = el(doc, "legend", "type-label", legend)
    field.append(caption)
    if (question) field.append(el(doc, "p", "type-body", question))
    if (hint) field.append(el(doc, "p", "type-micro testing-hint", hint))
    const row = el(doc, "div", "testing-scale")
    for (let value = 1; value <= 5; value += 1) {
      row.append(choice(`${name}`, String(value), String(value), scores[name] === value))
    }
    const ends = el(doc, "p", "type-micro testing-ends")
    ends.append(el(doc, "span", undefined, low), el(doc, "span", undefined, high))
    field.append(row, ends)
    row.addEventListener("change", () => {
      const selected = field.querySelector<HTMLInputElement>("input:checked")
      const number = Number(selected?.value)
      if (number >= 1 && number <= 5) scores[name] = number
    })
    return field
  }

  function favorites(phrases: TestingPhrases): HTMLFieldSetElement {
    const field = doc.createElement("fieldset")
    field.append(el(doc, "legend", "type-label", phrases.favorite))
    const row = el(doc, "div", "testing-scale")
    const options: { value: FavoriteId; label: string }[] = [
      { value: "one", label: phrases.favoriteOne },
      { value: "", label: phrases.variant("") },
      { value: "a", label: phrases.variant("a") },
      { value: "b", label: phrases.variant("b") },
      { value: "c", label: phrases.variant("c") },
      { value: "d", label: phrases.variant("d") },
    ]
    for (const option of options) {
      row.append(choice("favorite", option.value, option.label, favorite === option.value))
    }
    row.addEventListener("change", () => {
      const selected = field.querySelector<HTMLInputElement>("input:checked")
      if (selected && isFavorite(selected.value)) favorite = selected.value
    })
    field.append(row)
    return field
  }

  function wordsField(phrases: TestingPhrases): HTMLElement {
    const wrap = el(doc, "div", "testing-field-wrap")
    const label = el(doc, "label", "type-label", phrases.words)
    label.htmlFor = "testing-words"
    const area = doc.createElement("textarea")
    area.id = "testing-words"
    area.className = "testing-field"
    area.maxLength = 2000
    area.placeholder = phrases.wordsPlaceholder
    area.value = comment
    area.addEventListener("input", () => {
      comment = area.value
    })
    wrap.append(label, area)
    return wrap
  }

  function signatureField(phrases: TestingPhrases): HTMLElement {
    const wrap = el(doc, "div", "testing-field-wrap")
    const label = el(doc, "label", "type-label", phrases.signature)
    label.htmlFor = "testing-signature"
    const input = doc.createElement("input")
    input.id = "testing-signature"
    input.className = "testing-field"
    input.maxLength = 80
    input.setAttribute("autocomplete", "nickname")
    input.value = session.name
    input.placeholder = phrases.namePlaceholder
    input.addEventListener("input", () => applyName(input.value))
    wrap.append(label, input)
    return wrap
  }

  function nameControl(phrases: TestingPhrases): HTMLElement {
    if (!greet || editing) {
      const wrap = el(doc, "div", "testing-field-wrap")
      const label = el(doc, "label", "type-label", phrases.nameLabel)
      label.htmlFor = "testing-modal-name"
      const input = doc.createElement("input")
      input.id = "testing-modal-name"
      input.className = "testing-field"
      input.dataset.testing = "name"
      input.maxLength = 80
      input.setAttribute("autocomplete", "nickname")
      input.placeholder = phrases.namePlaceholder
      input.value = session.name
      if (editing) {
        input.addEventListener("input", () => applyName(input.value))
        input.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          editing = false
          greet = session.name.length > 0
          paint(greet ? "[data-testing='change-name']" : "[data-testing='name']")
        })
        // Paint after the click that left the field, so that click still lands.
        input.addEventListener("blur", () => {
          viewWindow.setTimeout(() => {
            if (view !== "modal" || !editing) return
            editing = false
            greet = session.name.length > 0
            paint(greet ? "[data-testing='change-name']" : "[data-testing='name']")
          }, 0)
        })
      } else {
        input.addEventListener("input", () => applyName(input.value))
      }
      wrap.append(label, input)
      return wrap
    }
    const button = el(doc, "button", "type-micro testing-change", phrases.changeName)
    button.type = "button"
    button.dataset.testing = "change-name"
    button.addEventListener("click", () => {
      editing = true
      paint("[data-testing='name']")
    })
    return button
  }

  function choice(name: string, value: string, label: string, checked: boolean): HTMLLabelElement {
    const wrap = doc.createElement("label")
    wrap.className = "testing-choice"
    const input = doc.createElement("input")
    input.type = "radio"
    input.name = `testing-${name}`
    input.value = value
    input.checked = checked
    wrap.append(input, el(doc, "span", undefined, label))
    return wrap
  }

  function langSwitch(phrases: TestingPhrases): HTMLElement {
    const group = el(doc, "div", "testing-lang")
    group.setAttribute("role", "group")
    group.setAttribute("aria-label", phrases.langLabel)
    for (const code of ["pl", "en"] as const) {
      const button = el(doc, "button", "type-micro", code.toUpperCase())
      button.type = "button"
      button.dataset.lang = code
      button.setAttribute("aria-pressed", String(session.lang === code))
      button.addEventListener("click", () => setLang(code))
      group.append(button)
    }
    return group
  }

  function backdropOf(kind: "modal" | "drawer"): HTMLElement {
    const backdrop = el(doc, "div", "testing-backdrop")
    backdrop.dataset.testing = kind === "modal" ? "modal-backdrop" : "drawer-backdrop"
    backdrop.addEventListener("click", (event) => {
      if (event.target !== backdrop) return
      if (kind === "modal") dismissModal()
      else closeDrawer()
    })
    return backdrop
  }

  function sheet(titleId: string): HTMLElement {
    const dialog = el(doc, "div", "ui-panel testing-sheet")
    dialog.dataset.testingDialog = ""
    dialog.setAttribute("role", "dialog")
    dialog.setAttribute("aria-modal", "true")
    dialog.setAttribute("aria-labelledby", titleId)
    dialog.tabIndex = -1
    return dialog
  }

  async function submit(form: HTMLFormElement, phrases: TestingPhrases): Promise<void> {
    if (sending) return
    const visuals = readScore(form, "visuals")
    const clarity = readScore(form, "clarity")
    const tone = readScore(form, "tone")
    const picked = form.querySelector<HTMLInputElement>("input[name='testing-favorite']:checked")
    const note = (form.querySelector("#testing-words") as HTMLTextAreaElement | null)?.value ?? ""
    const signature =
      (form.querySelector("#testing-signature") as HTMLInputElement | null)?.value ?? ""
    const chosen = picked?.value
    if (
      visuals === null ||
      clarity === null ||
      tone === null ||
      chosen === undefined ||
      !isFavorite(chosen)
    ) {
      error = phrases.missingScores
      const alert = form.querySelector(".testing-error")
      if (alert) alert.textContent = error
      return
    }
    error = ""
    sending = true
    const button = form.querySelector<HTMLButtonElement>("button[type='submit']")
    if (button) button.disabled = true
    applyName(signature)
    const payload = feedbackSubmitted(
      pageContext(doc, session),
      { visuals, clarity, tone },
      chosen,
      note.trim(),
      session.name
    )
    try {
      const response = await postTelemetryAwait(payload)
      if (!response.ok) throw new Error(String(response.status))
      sent = true
      thanksName = session.name
      sending = false
      paint("[data-testing-dialog]")
    } catch {
      sending = false
      error = phrases.sendFailed
      if (button) button.disabled = false
      const alert = form.querySelector(".testing-error")
      if (alert) alert.textContent = error
    }
  }
}

function readScore(form: HTMLFormElement, name: string): number | null {
  const selected = form.querySelector<HTMLInputElement>(`input[name="testing-${name}"]:checked`)
  const value = Number(selected?.value)
  if (!Number.isInteger(value) || value < 1 || value > 5) return null
  return value
}

function isFavorite(value: string): value is FavoriteId {
  return (
    value === "one" ||
    value === "" ||
    value === "a" ||
    value === "b" ||
    value === "c" ||
    value === "d"
  )
}

function trap(container: HTMLElement, event: KeyboardEvent): void {
  const items = [
    ...container.querySelectorAll<HTMLElement>("button, input, textarea, select, a[href]"),
  ].filter((node) => !node.hasAttribute("disabled") && !node.closest("[hidden]"))
  if (items.length === 0) {
    event.preventDefault()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return
  const active = container.ownerDocument.activeElement
  const inside = active instanceof Node && container.contains(active)
  if (event.shiftKey && (active === first || !inside)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || active === container)) {
    event.preventDefault()
    first.focus()
  }
}

function el<T extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: T,
  className: string | undefined = "",
  text?: string
): HTMLElementTagNameMap[T] {
  const node = doc.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}
