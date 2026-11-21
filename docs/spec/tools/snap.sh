#!/usr/bin/env bash
# Renders the QA matrix of the prototype to PNGs. Usage: tools/snap.sh [outdir]
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; out="${1:-/tmp/snap}"; mkdir -p "$out"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
shot(){ "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size="$1" --virtual-time-budget=5000 --screenshot="$out/$2.png" "$3" >/dev/null 2>&1; echo "$2"; }
moments=("0:0.1" "0:0.5" "0:0.7" "0:0.9" "1:0.6" "2:0.3" "2:0.95" "3:0.2" "3:0.5" "3:1")
for size in 1280,820 1280,700 1440,900; do
  for m in "${moments[@]}"; do s="${m%%:*}"; t="${m##*:}"; shot "$size" "d${size%,*}-s$s-t$t" "file://$here/index.html?stage=$s&t=$t"; done
  shot "$size" "d${size%,*}-jan" "file://$here/index.html?stage=jan"
done
for w in 390 360; do
  for m in "0:0.5" "1:1" "2:0.3" "2:0.95" "3:1"; do s="${m%%:*}"; t="${m##*:}"; shot "500,900" "m$w-s$s-t$t" "file://$here/tools/phone.html?w=$w&h=820&stage=$s&t=$t"; done
done
echo "done → $out"
