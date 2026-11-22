#!/usr/bin/env bash
# Renders the visual baseline of the prototype at v0.16.0 with the prototype's own tools/snap.sh.
#   docs/spec/baseline/regenerate.sh            re-render into this folder (overwrites the PNGs)
#   docs/spec/baseline/regenerate.sh --check    render into a temp folder, compare with the PNGs here
# snap.sh expects the prototype at ../index.html next to tools/; the copy in docs/spec is named
# prototype-v0.16.0.html, so the script lays the files out the way snap.sh expects, in a temp
# folder, and leaves the rest of docs/spec untouched. Needs Google Chrome (CHROME=... to point
# elsewhere).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
spec="$(cd "$here/.." && pwd)"
work="$(mktemp -d)"
raw="$work/raw"
mkdir -p "$work/proto"
cp "$spec/prototype-v0.16.0.html" "$work/proto/index.html"
cp -R "$spec/tools" "$work/proto/tools"
# snap.sh names a desktop image by width only, so 1280x700 would overwrite 1280x820. In the temp
# copy the name carries the height too: d1280x820-..., d1280x700-...
sed -i.bak 's/d\${size%,\*}-/d\${size\/,\/x}-/' "$work/proto/tools/snap.sh"
bash "$work/proto/tools/snap.sh" "$raw" >/dev/null

# The baseline is the sizes issue #23 names: 1280x820, 1280x700, and 390 wide (the phone wrapper).
# snap.sh also renders 1440x900 and 360 wide; they are not kept.
kept=$(cd "$raw" && ls | grep -E '^(d1280x(820|700)|m390)-.*\.png$' | sort)

# Two renders of the same moment are not always the same bytes: headless Chrome under a virtual
# time budget lands a few animated pixels differently from run to run. --check therefore counts
# pixels that differ by more than 2% (ImageMagick `compare -fuzz 2%`) and calls an image the same
# when under 1% of its pixels do. Measured on 22 Nov 2026 between two renders on one machine: at
# most 0.35%, most files under 0.003%. A different Chrome or different fonts can move more.
limit=0.01
if [ "${1:-}" = "--check" ]; then
  command -v compare >/dev/null || { echo "--check needs ImageMagick (compare)"; exit 2; }
  bad=0
  for n in $kept; do
    if [ ! -f "$here/$n" ]; then
      echo "missing in baseline: $n"
      bad=1
      continue
    fi
    out=$(compare -metric AE -fuzz 2% "$here/$n" "$raw/$n" null: 2>&1 || true)
    frac=$(echo "$out" | sed -n 's/.*(\(.*\)).*/\1/p')
    if [ -z "$frac" ]; then
      echo "NOT COMPARABLE $n ($out)"
      bad=1
    elif awk -v f="$frac" -v l="$limit" 'BEGIN { exit !(f <= l) }'; then
      echo "same      $n  $(awk -v f="$frac" 'BEGIN { printf "%.4f%%", f * 100 }') differ"
    else
      echo "DIFFERENT $n  $(awk -v f="$frac" 'BEGIN { printf "%.4f%%", f * 100 }') differ"
      bad=1
    fi
  done
  rm -rf "$work"
  exit $bad
fi

for n in $kept; do cp "$raw/$n" "$here/$n"; done
echo "wrote $(echo "$kept" | wc -l | tr -d ' ') images to $here"
rm -rf "$work"
