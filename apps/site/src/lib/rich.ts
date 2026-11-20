// Text with roles. Content marks a run of words with a role: "Your product, [clear at a
// glance.]{accent}". Words are the unit of continuity in the narrative, so text is rendered
// one word at a time and each word carries the role of its run. No role depends on a word's
// position in the sentence, which would break in another language.

export const roles = ["accent", "name"] as const
export type Role = (typeof roles)[number]

export interface Word {
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
