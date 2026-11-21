// Joins the two halves of the stops: the track (where each stop is, the same in every
// language) and its words (what each stop is called, per locale). Pure: no Astro, no files.
import type { Stage, StopDef } from "@strm/narrative"

/** The words of the stops in one locale, keyed by stop id. */
export interface StopWords {
  /** The name of every stop: the blob's title, the label of a rail mark. */
  names: Readonly<Record<string, string>>
  /** The short label of each chapter stop on the rail. */
  rail: Readonly<Record<string, string>>
}

/** A stop as the content schema gives it: an absent chapter may be present as undefined. */
export type StopEntry = Omit<StopDef, "chapter"> & { chapter?: Stage | undefined }

export interface NamedStop extends StopDef {
  name: string
  /** Only on a chapter stop: its short label on the rail. */
  label?: string
}

/**
 * The track's stops, in order, each with its name. Throws when the words and the track
 * disagree in either direction; `where` names the content entry in the message.
 */
export function nameStops(
  stops: readonly StopEntry[],
  words: StopWords,
  where: string
): NamedStop[] {
  const ids = new Set(stops.map((stop) => stop.id))
  const chapters = new Set(stops.filter((stop) => stop.chapter !== undefined).map((s) => s.id))
  const problems = [
    ...stops.filter((s) => !words.names[s.id]).map((s) => `no name for "${s.id}"`),
    ...Object.keys(words.names)
      .filter((id) => !ids.has(id))
      .map((id) => `a name for "${id}", which is not a stop`),
    ...[...chapters].filter((id) => !words.rail[id]).map((id) => `no rail label for "${id}"`),
    ...Object.keys(words.rail)
      .filter((id) => !chapters.has(id))
      .map((id) => `a rail label for "${id}", which is not a chapter stop`),
  ]
  if (problems.length > 0) throw new Error(`${where}: ${problems.join("; ")}.`)

  return stops.map((stop) => {
    const { chapter, ...rest } = stop
    const named: NamedStop = { ...rest, name: words.names[stop.id]! }
    if (chapter !== undefined) named.chapter = chapter
    const label = words.rail[stop.id]
    if (label !== undefined) named.label = label
    return named
  })
}
