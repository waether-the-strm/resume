---
name: verify
description: How to render, inspect and QA the page without a browser session — headless Chrome recipes, the frozen-moment URL parameters, the phone iframe wrapper, and the QA matrix. Use after every change and before every push.
---

# Verify

## Frozen moments
`index.html?stage=S&t=T` renders one moment: `stage=0` the equation with `t` 0…1 over its phases
(thresholds `.03 .07 .11 .17 .23 .29 .35 .41 .48 .55 .63 .80 .86 .92`), `stage=1|2|3` a scene with `t`
progress, `stage=jan` the final board alone.

## Render
```
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1280,820 --virtual-time-budget=5000 \
  --screenshot=/tmp/shot.png "file://$PWD/index.html?stage=2&t=0.9"
```
Then look at the PNG (Read tool). Headless Chrome will not go below ~500 px width: for phones use the
iframe wrapper `tools/phone.html?w=390&h=844&stage=3&t=1` at `--window-size=500,900`.
`tools/snap.sh` renders the whole matrix to `/tmp/snap/`.

## Motion and rest (live scroll)
`cd tools && npm i --no-save playwright-core`, then
`node tools/rest.mjs "file://$PWD/index.html" wheel|trackpad|touch|keys|rail` prints where each input comes to
rest (`stop=` must be a number inside the track), and
`node tools/stops.mjs "file://$PWD/index.html" /tmp/stops.png 390x664` renders a contact sheet of every stop
(also `1280x820`, `1280x700`). Chrome only: Safari, Firefox and real touch still need a person.

## What to look at
- Equation: `+` before the questions; question before answer; `how?` centred then left; the hold; the corner.
- Scenes at 0.3 / 0.6 / 0.95: labels on box edges, nothing clipped, nothing under the guide band, content
  within the viewport at 1280×700 and on phones.
- Look at 0.2 / 0.5 / 1: tiles enter in order, the weight wave, the call last; colour solid, never half-baked.
- Final board: card balance, hairlines only between rows, three cards, signature not overlapping.
- Reverse: render t descending and confirm the same states.
- Reduced motion: emulate with `--force-prefers-reduced-motion`; the final page must be complete.

## Known tooling traps
- Fonts load late: render with `--virtual-time-budget` ≥ 4000.
- `backdrop-filter` + background gradient + mask banded in headless; keep haze on a separate layer.
- Sparks, melts and the weight wave are only visible in motion; state it in the report instead of guessing.
