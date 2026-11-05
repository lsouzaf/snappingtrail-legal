#!/usr/bin/env bash
# Copies the Collect app's screenshots into the "Collect app" chapter of the manual.
#
# The screenshots are drawn in the Collect repository (Roborazzi, ManualScreenshotsTest), in
# app/src/test/screenshots, as collect-<screen>-<en|pt>.png. This copies, under the same names, the
# ones the chapter's pages use (<img src={require('./img/…')} … /> or ![…](./img/…)) into each
# language's img folder, and fails when a page uses an image the Collect repository does not have.
#
# usage: tools/sync-collect-screenshots.sh [Collect screenshots folder]
#   default: /home/luiz/projetos/snappingtrailcollect/app/src/test/screenshots
set -euo pipefail

source_dir="${1:-/home/luiz/projetos/snappingtrailcollect/app/src/test/screenshots}"
site="$(cd "$(dirname "$0")/.." && pwd)"
chapters=(
  "$site/docs/collect-app"
  "$site/i18n/pt/docusaurus-plugin-content-docs/current/collect-app"
)

if [[ ! -d "$source_dir" ]]; then
  echo "Screenshots folder not found: $source_dir" >&2
  exit 1
fi

copied=0
missing=0
for chapter in "${chapters[@]}"; do
  mkdir -p "$chapter/img"
  # Every ./img/collect-….png a page of this chapter uses, once.
  used="$(grep -ohE "\./img/collect-[A-Za-z0-9_-]+\.png" "$chapter"/*.md | sort -u | sed 's|^\./img/||')"
  for name in $used; do
    if [[ -f "$source_dir/$name" ]]; then
      cp "$source_dir/$name" "$chapter/img/$name"
      copied=$((copied + 1))
    else
      echo "MISSING: ${chapter#"$site"/} uses img/$name, which is not in $source_dir" >&2
      missing=$((missing + 1))
    fi
  done
done

echo "Copied $copied screenshot(s) into the Collect app chapter."
if ((missing > 0)); then
  echo "$missing image(s) used by the pages are missing from the Collect screenshots." >&2
  exit 1
fi
