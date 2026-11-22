import assert from "node:assert/strict"
import { test } from "node:test"
import {
  copyAddress,
  copyId,
  markIfPresent,
  slotsFor,
  splitStep3,
  type CopyId,
} from "./copy-variant.ts"

const ids: CopyId[] = ["a", "b", "c", "d"]

test("step 3 splits the way the live guide already does", () => {
  assert.deepEqual(
    splitStep3(
      "Now the look. Read it again. Same words, read twice. The second time took no effort. That is layout."
    ),
    {
      look: "Now the look. Read it again.",
      payoff: "Same words, read twice. The second time took no effort. That is layout.",
    }
  )
})

test("a role mark stays only when the variant still carries the phrase", () => {
  assert.equal(
    markIfPresent("I'm Jan Mirecki, a design engineer.", "I'm Jan Mirecki,", "name"),
    "[I'm Jan Mirecki,]{name} a design engineer."
  )
  assert.equal(
    markIfPresent("I'm Jan Mirecki—fifteen years.", "I'm Jan Mirecki,", "name"),
    "I'm Jan Mirecki—fifteen years."
  )
  assert.equal(
    markIfPresent("= how? · the short version", "=", "accent"),
    "[=]{accent} how? · the short version"
  )
})

test("variant A maps onto the opening and the card", () => {
  const slots = slotsFor("a")
  assert.equal(slots.equation.what, "A page that assembles itself while you scroll.")
  assert.equal(slots.equation.how, "just scroll. Watch it come together.")
  assert.equal(slots.guide.words, "First, just the words. A bit of a wall, isn't it?")
  assert.equal(
    slots.guide.structure,
    "Same words, now with a job to do. Every piece gets a name and a rule."
  )
  assert.equal(slots.guide.look, "Now the look. Read it again.")
  assert.equal(slots.guide.payoff, "Easier this time, right? That's layout.")
  assert.equal(slots.message.headline, "Your product, understood in seconds.")
  assert.equal(slots.message.list[2], "Colour used sparingly, like salt.")
  assert.equal(slots.message.callText, "Want your product to feel this obvious?")
  assert.equal(slots.message.callLabel, "Write to me.")
  assert.equal(slots.card.kicker, "[=]{accent} how? · the short version")
  assert.equal(slots.card.name, "I work in the material the product is made of.")
  assert.equal(slots.card.role, "Jan Mirecki · Design Engineer · Oslo")
  assert.equal(slots.skip, "Skip to the card")
  assert.equal(slots.message.who.includes("{name}"), false)
})

test("the other variants keep the same mapping", () => {
  const b = slotsFor("b")
  assert.equal(b.guide.look, "Add the surface last. Read it once more.")
  assert.equal(b.guide.payoff, "The effort is gone—that is layout.")
  assert.equal(b.message.headline, "Clarity, built in.")
  assert.equal(b.skip, "Jump to the finished card")
  assert.equal(b.card.kicker, "[=]{accent} how? · from sentence to system")

  const c = slotsFor("c")
  assert.equal(c.guide.look, "Visual layer on. Read it again.")
  assert.equal(c.guide.payoff, "Same text, half the effort. That is layout.")
  assert.equal(
    c.message.who,
    "[I'm Jan Mirecki,]{name} a design engineer. Fifteen years in design, eleven in code."
  )
  assert.equal(c.message.callLabel, "Email me.")

  const d = slotsFor("d")
  assert.equal(d.guide.look, "Step three: the clothes. Read it again.")
  assert.equal(d.guide.payoff, "You didn't even have to try. That's layout.")
  assert.equal(d.equation.why, "Because 'I care about typography' is boring to read.")
  assert.equal(d.skip, "Skip the demo")
  assert.equal(d.card.name, "No magic—just disciplined order of operations.")
})

test("no variant invents a role the phrase does not earn", () => {
  for (const id of ids) {
    const slots = slotsFor(id)
    assert.equal(slots.message.headline.includes("["), false, id)
    assert.equal(slots.card.name.includes("["), false, id)
    assert.equal(slots.card.kicker.startsWith("[=]{accent}"), true, id)
  }
  assert.equal(slotsFor("a").message.who.includes("["), false)
  assert.equal(slotsFor("b").message.who.includes("["), false)
  assert.equal(slotsFor("d").message.who.includes("["), false)
})

test("only a, b, c and d are variants", () => {
  assert.equal(copyId(""), null)
  assert.equal(copyId("?copy=a"), "a")
  assert.equal(copyId("?stage=2&copy=d"), "d")
  assert.equal(copyId("?copy=A"), null)
  assert.equal(copyId("?copy=0"), null)
  assert.equal(copyId("?copy=nope"), null)
  assert.equal(copyId("?copy="), null)
})

test("changing the select keeps every other parameter", () => {
  assert.equal(copyAddress("https://strm.dev/?stage=2&t=0.5", "a"), "/?stage=2&t=0.5&copy=a")
  assert.equal(
    copyAddress("https://strm.dev/pl/?copy=a&stage=2&t=0.5", "b"),
    "/pl/?copy=b&stage=2&t=0.5"
  )
  assert.equal(copyAddress("https://strm.dev/pl/?copy=a&stage=2&t=0.5", ""), "/pl/?stage=2&t=0.5")
  assert.equal(copyAddress("https://strm.dev/?copy=nope", "c"), "/?copy=c")
  assert.equal(copyAddress("https://strm.dev/?copy=a#jan", ""), "/#jan")
})
