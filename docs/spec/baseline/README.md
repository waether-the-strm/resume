# Visual baseline

The prototype at `v0.16.0` rendered at every frozen moment of scenarios A to E: the images the port
is compared against. They were made on 22 Nov 2026 with Google Chrome 158 on macOS, by the
prototype's own `tools/snap.sh` (through `regenerate.sh`, below). Issue #23.

| Size        | Files                    | What                                                                                                |
| ----------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| 1280×820    | `d1280x820-*.png`        | 10 moments and the final card (`jan`)                                                               |
| 1280×700    | `d1280x700-*.png`        | the same 11                                                                                         |
| 390 wide    | `m390-*.png`             | 5 moments, through `tools/phone.html` (a 390×820 frame in a 500×900 window; headless Chrome will not go narrower) |

File names are `<size>-s<stage>-t<t>.png`, the same `stage` and `t` as the URL `?stage=S&t=T`.
The moments are `snap.sh`'s: `0:0.1 0:0.5 0:0.7 0:0.9 1:0.6 2:0.3 2:0.95 3:0.2 3:0.5 3:1` on desktop,
`0:0.5 1:1 2:0.3 2:0.95 3:1` on the phone. They are the QA matrix, not a picture of every row of
A to E. `snap.sh` also renders 1440×900 and 360 wide; they are not kept.

## Regenerate and check

```
docs/spec/baseline/regenerate.sh            # re-render, overwrite the images here (about 50 s)
docs/spec/baseline/regenerate.sh --check    # render to a temp folder, compare with these images
```

Needs Google Chrome (`CHROME=` points elsewhere) and, for `--check`, ImageMagick (`brew install
imagemagick`). The script lays the prototype out as `snap.sh` expects (`index.html` next to
`tools/`) in a temp folder; nothing else in `docs/spec` is touched. In that temp copy the desktop
file names carry the height too, because `snap.sh` names them by width only and 1280×700 would
overwrite 1280×820.

Two renders of one moment are not byte-identical (headless Chrome under a virtual time budget lands
a few animated pixels differently). `--check` counts pixels that differ by more than 2% and calls an
image the same when fewer than 1% do. Measured between two renders on one machine: at most 0.28%
(`s2-t0.95`, where the sparks are), most files under 0.003%. A different Chrome or different fonts
move more: regenerate on the new setup rather than loosening the limit.

## Comparing the product

The images are a reference for the eye and for a pixel count, not a test that fails the build. The
product keeps its own look in places on purpose (the list is in `docs/spec/README.md`), so a count
is a pointer to where to look.

- Same URLs, same sizes: `http://127.0.0.1:<port>/?stage=S&t=T` against `pnpm --filter @strm/site
  exec astro preview`. Render with Playwright and wait for the page (a second or two), not with
  `--virtual-time-budget`: the product starts its scripts later, and `?stage=jan` is an empty page
  at five seconds of virtual time.
- Count the difference with `compare -metric AE -fuzz 2% baseline.png product.png null:`, or put the
  pair side by side with `magick baseline.png product.png +append pair.png`.
