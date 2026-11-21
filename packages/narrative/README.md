# narrative

The scroll engine behind the home page: stops, holds and a settle.

- Depends on nothing: no UI framework, no Astro, no strm-ui.
- Scroll position is the single input. Everything else is derived state in one small store:
  `{ stage, t, stop, nearest, landed, after, named }`. Nothing reads the DOM to learn the state.
- `?stage=S&t=T` and `?stage=jan` inject state into the same store. This is the test contract.

## Modules

- `stops.ts`: the stop table as data, and `layout()` that places it on a track.
- `map.ts`: position to stage, progress and stop. Pure.
- `url.ts`: the `?stage&t` contract.
- `store.ts`: the state and its subscribers. `setPosition` is the only input when live; `land` marks
  a rest; `freeze` injects a state from the URL.
- `fixtures/prototype-v016.ts`: values produced by the prototype's own functions; the port is tested
  against them.

Still to come: `phases`, `settle`, `transitions`, `sound`, `effects/*`, and the adapter that feeds
the scroll position from the page.

Tests are `node:test` files next to the code: `pnpm test`.
