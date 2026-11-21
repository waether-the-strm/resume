# 0009. The tour is a layer on the page the server rendered

Status: proposed, 21 Nov 2026. Built this way in #87 so it can be judged in motion; Jan decides.

## Context

The engine (`packages/narrative`) knows no DOM. The page is static HTML that is complete without
JavaScript. Something has to join the two, and how it does so decides what a reader without motion
gets, what the tests can freeze, and where a change to a scene is made.

## Decision

One client script, `apps/site/src/scripts/tour.ts`, is the only place where the engine meets the
page. It writes three things and nothing else:

- which scene is on show: `data-scene` on the stage, `data-skin` on the message;
- how far through it: `--t` on the message, and `data-note` for the steps of the structure notes;
- what the guide says: `data-step` on the guide.

Everything a scene looks like is CSS that reads those (`apps/site/src/styles/tour.css`). The script
never builds markup. The message, the structure notes, the guide's sentences and the equation are
all in the HTML the server renders, in every language, and hidden by CSS when they are not part of
the finished page.

The layer switches on through `data-tour` on `<html>`, set before the first paint when motion is
allowed. Without it, no rule of the tour applies and the page is the finished look.

The geometry of the track travels in a `data-track` attribute; the words stay in the markup.

The order of events in a scene change (heading first, the page a beat later, the frozen edge) is
engine logic, in `scenes.ts`, tested with fakes. The script only supplies the callbacks.

## Rejected

**The script builds the scenes**, as the prototype does (`build`, `renderMsg`). The page would then
depend on JavaScript for its text, in two languages, and the server could not render it.

**A data island**: the whole narrative as JSON in the page, rendered by the script. The same
objection, and the copy would exist twice in the HTML.

**Scene styles in strm-ui.** The skins arrange the blocks of one page; strm-ui's own rule is that
such layout belongs to the page. The skins read strm-ui's tokens and reset its primitives.

**A framework island** (a component with state). The state is one number, the scroll position, and
it already has a store.

## Consequences

- A scene is changed in CSS. A new continuous effect is a function of `--t`, so it reverses for
  free.
- The HTML carries elements a reader of the finished page never sees: five notes, three guide
  sentences, the equation. They are `display: none` and outside the accessibility tree.
- The existing Playwright specs now ask for reduced motion, because they check the finished page;
  the tour's specs ask for motion.
- If the script fails to load, the page shows the finished look after four seconds. That delay is
  the cost of not flashing the finished page before the first scene.
