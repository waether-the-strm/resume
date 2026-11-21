# tests

Playwright against the built site (`astro preview`), in English and Polish at 1280×820, 1280×700 and
390×664.

`specs/static-page.spec.ts` checks the server-rendered home page: the finished message, card and
projects with JavaScript disabled, no horizontal overflow, `lang` and `hreflang`, visible keyboard
focus (F5), the 390×664 message fit (G9), and the same finished page under reduced motion (F1).
Chromium only. The Polish 390×664 fit is an expected failure until
[#13](https://github.com/waether-the-strm/resume/issues/13). Later scenarios are not here yet.

The script is `e2e`, not `test`, so `pnpm test` stays the unit tests. Build first, then:

```
pnpm --filter @strm/tests exec playwright install chromium
pnpm --filter @strm/tests e2e
```

The preview listens on port 4333.
