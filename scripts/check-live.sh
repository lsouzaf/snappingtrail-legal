#!/usr/bin/env bash
# Checks the live docs site after a deploy: /manual/ answers 200, and so does the stylesheet its
# HTML references (a page without its CSS still answers 200). GitHub Pages can take a moment to
# serve a new deploy, so each check retries — by default 30 times, 10 s apart.
#
# usage: scripts/check-live.sh [base URL, default https://docs.snappingtrail.com]
set -euo pipefail

base="${1:-https://docs.snappingtrail.com}"
base="${base%/}"
tries="${CHECK_LIVE_TRIES:-30}"
pause="${CHECK_LIVE_WAIT:-10}"

page="$(mktemp)"
css="$(mktemp)"
trap 'rm -f "$page" "$css"' EXIT

# Writes the body to $2 and prints the HTTP status ("000" when there is no answer).
status() {
  curl -sS -o "$2" -w '%{http_code}' --max-time 20 "$1" 2>/dev/null || true
}

# Fetches $1 into $2 until it answers 200, or gives up.
fetch_ok() {
  local url="$1" out="$2" code
  for ((i = 1; i <= tries; i++)); do
    code="$(status "$url" "$out")"
    if [[ "$code" == "200" ]]; then
      return 0
    fi
    echo "$url: HTTP ${code:-000} (try $i of $tries)"
    if ((i < tries)); then sleep "$pause"; fi
  done
  return 1
}

if ! fetch_ok "$base/manual/" "$page"; then
  echo "::error::$base/manual/ does not answer 200"
  exit 1
fi

href="$(grep -oE '<link[^>]*rel="stylesheet"[^>]*>' "$page" | grep -oE 'href="[^"]+"' | head -1 | sed -E 's/^href="(.*)"$/\1/' || true)"
if [[ -z "$href" ]]; then
  echo "::error::$base/manual/ references no stylesheet"
  exit 1
fi
case "$href" in
  http://* | https://*) css_url="$href" ;;
  /*) css_url="$base$href" ;;
  *) css_url="$base/manual/$href" ;;
esac

if ! fetch_ok "$css_url" "$css"; then
  echo "::error::the stylesheet of $base/manual/ ($css_url) does not answer 200"
  exit 1
fi

echo "OK: $base/manual/ and its stylesheet $href answer 200"
