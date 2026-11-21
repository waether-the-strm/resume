// Text with roles. Content marks a run of words with a role: "Your product, [clear at a
// glance.]{accent}". A role belongs to the run, never to a word's position, which would
// break in another language.
//
// Two ways to render it. `words` splits every word, for the message, where the narrative
// moves single words and each word keeps the role of its run. `runs` keeps each marked run
// whole and leaves the rest as plain text.

export const roles = ["accent", "name"] as const
export type Role = (typeof roles)[number]

export interface Word {
  text: string
  role?: Role
}

/** A plain stretch, or one marked run kept whole. */
export interface Run {
  text: string
  role?: Role
}

const run = /\[([^\]]+)\]\{(\w+)\}/g

/** The roles used in a marked-up string that are not known roles. Empty when valid. */
export function unknownRoles(source: string): string[] {
  return [...source.matchAll(run)]
    .map((match) => match[2] ?? "")
    .filter((role) => !(roles as readonly string[]).includes(role))
}

/** The plain text, with the role marks removed. */
export function plain(source: string): string {
  return source.replace(run, "$1")
}

/** Splits marked-up text into words. Only ordinary spaces split; a non-breaking space does not. */
export function words(source: string): Word[] {
  const out: Word[] = []
  const push = (text: string, role?: Role) => {
    for (const word of text.split(/ +/)) {
      if (word) out.push(role ? { text: word, role } : { text: word })
    }
  }
  let last = 0
  for (const match of source.matchAll(run)) {
    push(source.slice(last, match.index))
    push(match[1] ?? "", match[2] as Role)
    last = match.index + match[0].length
  }
  push(source.slice(last))
  return out
}

/** Splits marked-up text into plain stretches and marked runs. A run is not split into words. */
export function runs(source: string): Run[] {
  const out: Run[] = []
  let last = 0
  for (const match of source.matchAll(run)) {
    const before = source.slice(last, match.index)
    if (before) out.push({ text: before })
    const text = match[1] ?? ""
    if (text) out.push({ text, role: match[2] as Role })
    last = match.index + match[0].length
  }
  const after = source.slice(last)
  if (after) out.push({ text: after })
  return out
}
