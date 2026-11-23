// Starts the temporary testing layer on the home page. Without this module the
// server HTML is unchanged. The tour script runs first and may already have
// swapped a copy variant; this module reads the address, it does not read nodes.

import { browserMemory, readIdentity } from "./session.ts"
import { mountTesting } from "./layer.ts"
import { installWatch, type WatchedSession } from "./watch.ts"

function start(): void {
  if (typeof document === "undefined") return
  if (!document.querySelector("main")) return
  if (document.documentElement.dataset.testingBoot === "1") return
  document.documentElement.dataset.testingBoot = "1"
  const memory = browserMemory()
  const identity = readIdentity(location.search, memory, () => crypto.randomUUID())
  const session: WatchedSession = { ...identity, memory }
  installWatch(document, session)
  mountTesting(document, session)
}

start()
