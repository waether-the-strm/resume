// The sparks where `how` leaves the equation and where it lands in the guide's corner
// (#38, scenario A13). `tour.onHowMoves` says when, and which way. The spark is the one
// node a script adds: decoration, no text, `aria-hidden`, removed when its animation ends
// (ADR 0009 is about markup that carries content). Its look is the `ui-spark` primitive.
import { centre, plan, type Point } from "./spark-plan.ts"
import type { TourPart } from "./types"

function centreOf(selector: string): Point | null {
  const element = document.querySelector(selector)
  if (!element) return null
  const box = element.getBoundingClientRect()
  // Not on the page (display: none): there is nothing to put a spark on.
  return box.width === 0 && box.height === 0 ? null : centre(box)
}

function launch(at: Point, late: boolean): void {
  const spark = document.createElement("i")
  spark.className = late ? "ui-spark is-late" : "ui-spark"
  spark.setAttribute("aria-hidden", "true")
  spark.style.setProperty("--spark-x", `${at.x.toFixed(1)}px`)
  spark.style.setProperty("--spark-y", `${at.y.toFixed(1)}px`)
  spark.addEventListener("animationend", () => spark.remove(), { once: true })
  document.body.append(spark)
}

export const sparks: TourPart = ({ store, onHowMoves, prefs }) => {
  // Coming back, the tour takes the corner off the page (`display: none` on the guide)
  // before it says `how` has moved, so the corner is not there to measure any more. It is
  // read where it stood while the reader was past it.
  let corner: Point | null = null
  const remember = () => {
    const guide = document.querySelector(".guide")
    if (guide?.hasAttribute("data-how")) corner = centreOf(".guide .how") ?? corner
  }
  store.subscribe(remember)
  remember()

  onHowMoves((direction) => {
    if (!prefs.motionAllowed()) return
    remember()
    const equation = centreOf(".equation .how .q")
    for (const spark of plan(direction, equation, centreOf(".guide .how") ?? corner)) {
      launch(spark, spark.late)
    }
  })
}
