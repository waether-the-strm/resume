# tests

Playwright against the built site (`astro preview`), in English and Polish at 1280×820, 1280×700 and
390×664.

`specs/static-page.spec.ts` checks the server-rendered home page: the finished message, card and
projects with JavaScript disabled, no horizontal overflow, `lang` and `hreflang`, visible keyboard
focus (F5), the 390×664 message fit (G9, the page with no tour), and the same finished page under
reduced motion (F1). Chromium only. Both languages are asserted to fit at 390×664.

`specs/scenarios-a-e.spec.ts` is scenarios A to E, one test per row, frozen with `?stage=&t=` except
the two that scroll.

`specs/scenarios-g.spec.ts` is scenario G: where wheel, trackpad, touch, keys and the rail come to
rest, in both languages at the three sizes. G4, G5, G8, G10, G11 and G12 already live in
`tour.spec.ts`, `rail.spec.ts` and `blob.spec.ts` and are not repeated. The gesture lengths and the
settle poll are the prototype's tools (`docs/spec/tools/rest.mjs`, `stops.mjs`), called as helpers.
There is no `html[data-stop]`; a rest is placed against `.track[data-track]`. The run writes
`test-results/rest.md`, and in CI that text is appended to the job summary. G13 is `test.fixme`: the
exit warp is not built.

`specs/a11y.spec.ts` runs axe-core (`@axe-core/playwright`) on `/`, `/pl/`, `/cv`, `/ui/` and
`/ui/primitives/`, in light and dark, at 1280×820 and 390×664. Any violation fails the run. An
incomplete result is annotated on the test and does not fail it: axe did not decide. Theme is
`strm-theme` in localStorage, read by the same inline script the page uses.

The script is `e2e`, not `test`, so `pnpm test` stays the unit tests. Build first, then:

```
pnpm --filter @strm/tests exec playwright install chromium
pnpm --filter @strm/tests e2e
```

The preview listens on port 4333. `E2E_PORT` moves it.
