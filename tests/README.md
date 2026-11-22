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
rest. Live scroll runs in English only, at the three sizes: a rest is the track's geometry, not the
copy. G2, G7 and G9 stay in both languages, because the copy and its length are what they read. G4,
G5, G8, G10, G11 and G12 already live in `tour.spec.ts`, `rail.spec.ts` and `blob.spec.ts` and are
not repeated. The gesture lengths and the settle poll are the prototype's tools
(`docs/spec/tools/rest.mjs`, `stops.mjs`), called as helpers. There is no `html[data-stop]`; a rest
is placed against `.track[data-track]`. Each test writes one file under `test-results/rest/`; the
global teardown concatenates them into `test-results/rest.md` and, in CI, appends that to the job
summary. G13 scrolls on from the look and checks the warp: blur and fade from the stylesheet, empty
inline filter and opacity at rest, opacity only on a coarse pointer, and no warp under reduced
motion. The wheel walk at 1280×820 is `test.fail`: G3 fails there, and the assertion stays what G3
says. The file is the `scenarios-g` project: the walks are most of the Playwright job, and the
performance budget waits until they are done.

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
