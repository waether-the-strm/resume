# tests

Playwright against the built site (`astro preview`), in English and Polish at 1280×820, 1280×700 and
390×664.

`specs/static-page.spec.ts` checks the server-rendered home page: the finished message, card and
projects with JavaScript disabled, no horizontal overflow, `lang` and `hreflang`, visible keyboard
focus (F5), the 390×664 message fit (G9), and the same finished page under reduced motion (F1).
Chromium only. Both languages are asserted to fit at 390×664 (G9). Later scenarios are not here yet.

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
