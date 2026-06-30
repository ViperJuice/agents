#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT="${1:-}"

usage() {
  cat <<'EOF'
Usage: pnpm run smoke -- <package-name>

Headless Pi smoke for packages/<name>/ using --print --mode json --no-session.
Requires the pi CLI on PATH.
EOF
}

if [[ -z "$AGENT" || "$AGENT" == "--" ]]; then
  usage
  exit 1
fi

PKG="$ROOT/packages/$AGENT"
if [[ ! -f "$PKG/package.json" ]]; then
  echo "Package not found: $PKG" >&2
  exit 1
fi

if ! command -v pi >/dev/null 2>&1; then
  echo "pi CLI not found. Install @mariozechner/pi-coding-agent first." >&2
  exit 1
fi

readarray -t CMD < <(node "$ROOT/scripts/smoke-agent-args.mjs" "$PKG")
if [[ ${#CMD[@]} -eq 0 ]]; then
  echo "Could not build smoke command for $AGENT" >&2
  exit 1
fi

echo "Smoke: ${CMD[*]}" >&2
(cd "$PKG" && pi install . -l >/dev/null 2>&1 || true)
exec "${CMD[@]}"
