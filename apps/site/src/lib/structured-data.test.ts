import { test } from "node:test"
import assert from "node:assert/strict"
import {
  homeDocument,
  jsonLd,
  personFromCv,
  profileDocument,
  type CvFacts,
} from "./structured-data.ts"

const cv: CvFacts = {
  name: "Name",
  role: "Role",
  contacts: [
    { kind: "place", label: "City" },
    { kind: "mail", label: "a@b.c", href: "mailto:a@b.c?subject=Hello" },
    { kind: "web", label: "site", href: "https://strm.dev" },
    { kind: "linkedin", label: "in", href: "https://www.linkedin.com/in/example/" },
  ],
}

test("the person is built from the CV contacts", () => {
  const person = personFromCv(cv, "https://strm.dev")
  assert.equal(person["@type"], "Person")
  assert.equal(person["@id"], "https://strm.dev/#jan")
  assert.equal(person.name, "Name")
  assert.equal(person.jobTitle, "Role")
  assert.equal(person.address, "City")
  assert.equal(person.email, "a@b.c")
  assert.equal(person.url, "https://strm.dev/")
  assert.deepEqual(person.sameAs, ["https://www.linkedin.com/in/example/"])
})

test("a web address on another origin is refused", () => {
  const other: CvFacts = {
    ...cv,
    contacts: cv.contacts.map((item) =>
      item.kind === "web" ? { ...item, href: "https://example.com" } : item
    ),
  }
  assert.throws(() => personFromCv(other, "https://strm.dev"), /different origin/)
})

test("a missing LinkedIn address is refused", () => {
  const bare: CvFacts = {
    ...cv,
    contacts: cv.contacts.filter((item) => item.kind !== "linkedin"),
  }
  assert.throws(() => personFromCv(bare, "https://strm.dev"), /linkedin/)
})

test("the home page is a person and a website, the CV a profile of that person", () => {
  const person = personFromCv(cv, "https://strm.dev/")
  const home = homeDocument(person, {
    name: "Site",
    url: "https://strm.dev/pl/",
    inLanguage: "pl",
  })
  assert.deepEqual(
    home["@graph"].map((node) => node["@type"]),
    ["Person", "WebSite"]
  )
  const profile = profileDocument(person, "https://strm.dev/cv/")
  assert.equal(profile["@type"], "ProfilePage")
  assert.equal(profile.url, "https://strm.dev/cv/")
  assert.equal(profile.mainEntity["@id"], person["@id"])
  assert.equal(profile.mainEntity.url, "https://strm.dev/")
})

test("JSON-LD cannot close the script element", () => {
  assert.equal(jsonLd({ name: "</script>" }), '{"name":"\\u003c/script>"}')
})
