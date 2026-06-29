#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL="${1:-}"

if [[ "${LOCAL}" == "--local" ]]; then
  FLAG=(-l)
  SCOPE="project-local (.pi/settings.json in cwd)"
else
  FLAG=()
  SCOPE="global (~/.pi/agent/settings.json)"
fi

if ! command -v pi >/dev/null 2>&1; then
  echo "pi CLI not found. Install @mariozechner/pi-coding-agent first." >&2
  exit 1
fi

echo "Linking fleet Pi packages ($SCOPE)..."

linked=0
for pkg in "$ROOT"/packages/*/; do
  name="$(basename "$pkg")"
  [[ "$name" == "_template" ]] && continue
  [[ -f "$pkg/package.json" ]] || continue
  echo "  pi install ${FLAG[*]} $pkg"
  pi install "${FLAG[@]}" "$pkg"
  linked=$((linked + 1))
done

if [[ "$linked" -eq 0 ]]; then
  echo "No packages to link. Create one with: pnpm run new-agent -- my-agent"
  exit 0
fi

echo "Linked $linked package(s)."
