// JSON-LD for the home page and the CV. Every string is a field the pages
// already render (the CV entry, the site title). Nothing here is a new claim.

export interface ContactFact {
  kind: string
  label: string
  href?: string | undefined
}

export interface CvFacts {
  name: string
  role: string
  contacts: readonly ContactFact[]
}

export interface PersonNode {
  "@type": "Person"
  "@id": string
  name: string
  jobTitle: string
  address: string
  url: string
  email: string
  sameAs: readonly string[]
}

export interface WebSiteNode {
  "@type": "WebSite"
  name: string
  url: string
  inLanguage: string
}

/** The home page's `id="jan"`, as a stable id for the one person. */
const personFragment = "/#jan"

export function personFromCv(cv: CvFacts, origin: string): PersonNode {
  const place = contact(cv, "place")
  const mail = contact(cv, "mail")
  const web = contact(cv, "web")
  const linkedin = contact(cv, "linkedin")
  if (!web.href) throw new Error("CV is missing the web address")
  if (!linkedin.href) throw new Error("CV is missing the LinkedIn address")
  const site = new URL(origin)
  const webUrl = new URL(web.href)
  if (webUrl.origin !== site.origin) {
    throw new Error("CV web address is a different origin from the site")
  }
  return {
    "@type": "Person",
    "@id": new URL(personFragment, site.origin).href,
    name: cv.name,
    jobTitle: cv.role,
    address: place.label,
    url: new URL("/", site.origin).href,
    email: emailAddress(mail),
    sameAs: [linkedin.href],
  }
}

export function homeDocument(person: PersonNode, website: Omit<WebSiteNode, "@type">) {
  return {
    "@context": "https://schema.org",
    "@graph": [person, { "@type": "WebSite" as const, ...website }],
  }
}

export function profileDocument(person: PersonNode, pageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage" as const,
    url: pageUrl,
    mainEntity: person,
  }
}

/** Safe to drop into a script element: `<` cannot close it. */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c")
}

function contact(cv: CvFacts, kind: string): ContactFact {
  const found = cv.contacts.find((item) => item.kind === kind)
  if (!found) throw new Error(`CV is missing the ${kind} contact`)
  return found
}

function emailAddress(mail: ContactFact): string {
  const href = mail.href
  if (href?.startsWith("mailto:")) {
    const value = href.slice("mailto:".length).split("?")[0]
    if (value) return value
  }
  return mail.label
}
