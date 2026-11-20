# narrative

The scroll engine behind the home page: stops, holds and a settle.

- Depends on nothing: no UI framework, no Astro, no strm-ui.
- Scroll position is the single input. Everything else is derived state in one small store:
  `{ stage, t, stop, nearest, landed, after, named }`. Nothing reads the DOM to learn the state.
- `?stage=S&t=T` and `?stage=jan` inject state into the same store. This is the test contract.

Planned modules: `map`, `phases`, `scenes`, `settle`, `transitions`, `sound`, `effects/*`.

Status: empty skeleton. The port starts in phase 4, with unit tests first.
