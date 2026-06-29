#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT/packages/_template"

usage() {
  cat <<'EOF'
Usage: pnpm run new-agent -- <agent-name> [description]

Creates packages/<agent-name>/ from the _template scaffold.

Examples:
  pnpm run new-agent -- code-reviewer "Review diffs with harness-neutral guardrails"
  pnpm run new-agent -- deploy-helper
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

# pnpm may pass a literal "--" separator.
ARGS=("$@")
if [[ "${ARGS[0]}" == "--" ]]; then
  ARGS=("${ARGS[@]:1}")
fi

if [[ ${#ARGS[@]} -lt 1 ]]; then
  usage
  exit 1
fi

AGENT="${ARGS[0]}"
DESCRIPTION="${ARGS[1]:-Pi agent package: ${AGENT}}"

if [[ ! "$AGENT" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "Agent name must be kebab-case starting with a letter: $AGENT" >&2
  exit 1
fi

TARGET="$ROOT/packages/$AGENT"
if [[ -e "$TARGET" ]]; then
  echo "Package already exists: $TARGET" >&2
  exit 1
fi

cp -R "$TEMPLATE" "$TARGET"

# Replace placeholders in package.json and skill frontmatter.
python3 - "$AGENT" "$DESCRIPTION" "$TARGET" <<'PY'
import json
import sys
from pathlib import Path

agent, description, target = sys.argv[1:4]
root = Path(target)

manifest_path = root / "package.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest["name"] = f"@viperjuice/{agent}"
manifest["description"] = description
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

skill_path = root / "skills" / "example-skill" / "SKILL.md"
skill_path.parent.rename(root / "skills" / agent)
skill_path = root / "skills" / agent / "SKILL.md"
text = skill_path.read_text(encoding="utf-8")
text = text.replace("example-skill", agent).replace("Example skill for the Pi agent template.", description)
skill_path.write_text(text, encoding="utf-8")

prompt_path = root / "prompts" / "run-example.md"
prompt_path.rename(root / "prompts" / f"run-{agent}.md")
(root / "prompts" / f"run-{agent}.md").write_text(
    (root / "prompts" / f"run-{agent}.md").read_text(encoding="utf-8").replace("example-skill", agent),
    encoding="utf-8",
)

manifest["pi"]["skills"] = [f"./skills/{agent}"]
manifest["pi"]["prompts"] = [f"./prompts/run-{agent}.md"]
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
PY

echo "Created $TARGET"
echo "Next:"
echo "  cd $TARGET && pi install . -l    # project-local"
echo "  pi install $TARGET               # global fleet install"
