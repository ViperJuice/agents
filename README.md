# agents

Monorepo for **Pi agent packages** — extensions, skills, and prompts you install across your coding fleet and harnesses.

Each package is a self-contained [Pi package](https://github.com/badlogic/pi-mono) (`pi install`) with TypeScript extensions that register tools, plus skills and prompt templates. The [agent-harness](https://github.com/ViperJuice/agent-harness) phase-loop runtime can dispatch `executor=pi` lanes against repo-local `phase-loop-pi/**` material; this repo is where you **author and version** reusable Pi agents that are not tied to one product repo.

## Layout

```
agents/
├── packages/
│   ├── _template/          # scaffold — copy via `pnpm run new-agent`
│   └── <your-agent>/       # one Pi package per agent
├── scripts/
│   ├── new-agent.sh        # create a package from _template
│   ├── link-fleet.sh       # pi install all packages
│   └── validate-packages.mjs
└── package.json            # pnpm workspace root
```

### Pi package anatomy

Every agent under `packages/<name>/` follows the same shape as `dotfiles/phase-loop-pi`:

| Path | Purpose |
| --- | --- |
| `package.json` | `"pi-package"` keyword + `"pi": { extensions, skills, prompts }` |
| `extensions/*.ts` | Register tools via Pi's extension API (`registerTool`) |
| `skills/<name>/SKILL.md` | Agent behavior contract (when to use, tools, rules) |
| `prompts/*.md` | Parameterized prompt templates (`{{arg}}` substitution) |
| `bin/*` (optional) | Wrapper CLIs (see `pi-agent-watch` in phase-loop-pi) |

Peer dependencies: `@mariozechner/pi-coding-agent`, `typebox` (for tool schemas).

## Quick start

```bash
cd ~/code/agents
corepack enable
pnpm install

# Scaffold a new agent
pnpm run new-agent -- code-reviewer "Review diffs with harness-neutral guardrails"

# Validate manifests and referenced files
pnpm run validate

# Install every package onto this machine (global)
pnpm run link-fleet

# Or project-local install while developing in a repo
pnpm run link-fleet -- --local
```

Load one package ad hoc:

```bash
pi install ~/code/agents/packages/code-reviewer
pi -e ~/code/agents/packages/code-reviewer/extensions/example-tools.ts \
   --skill ~/code/agents/packages/code-reviewer/skills/code-reviewer
```

## Two deployment modes

Pi agents show up in two places in your fleet. Keep the distinction explicit:

### 1. Fleet-wide packages (this repo)

Install with `pi install` so skills/extensions are available on every machine:

```bash
pi install ~/code/agents/packages/my-agent
```

Dotfiles bootstrap can symlink fleet packages under `~/.pi/agent/packages/` the same way it already links `phase-loop-pi`.

### 2. Repo-local phase-loop material (consumer repos)

When [agent-harness](https://github.com/ViperJuice/agent-harness) launches `executor=pi` for a lane, it injects a context file built from **that repo's**:

- `phase-loop-pi/**` — prompts, skills, extensions for lane execution
- `pi-config/**` — Pi-only installed-skill metadata (not duplicated Codex/Claude skills)

Today those live in [dotfiles](https://github.com/ViperJuice/dotfiles) (`~/code/dotfiles/phase-loop-pi`). You can:

- **Keep them in dotfiles** for bootstrap/symlink ergonomics, and develop new *generic* agents here.
- **Move phase-loop-pi here later** and point dotfiles bootstrap at `~/code/agents/packages/phase-loop-pi` instead.

See `agent-harness/phase-loop-runtime/src/phase_loop_runtime/_contract_docs/phase-loop/pi-loop-control.md` for the full Pi ↔ phase-loop contract.

## Harness integration

| Harness | How Pi agents connect |
| --- | --- |
| **Pi CLI** | `pi install`, `-e`, `--skill`, `--tools` allowlists |
| **phase-loop** | `executor=pi` child lanes; `pi-agent-watch` supervisor wrapper |
| **Claude / Codex / Gemini / OpenCode** | Phase-loop dispatches child executors; Pi supervises or executes simple lanes |
| **fractal-agents** | Lower-level `pi-agent-core` loop (separate from Pi CLI packages) |

Pi as `executor=pi` is a **bounded child runner** — it does not own scheduling, worktrees, or merge reduction. Supervisor work uses `phase-loop-pi` tools (`phase_loop_state`, `phase_loop_run`, …).

## Authoring checklist

When adding a new agent package:

1. `pnpm run new-agent -- <kebab-name> "<description>"`
2. Replace `extensions/example-tools.ts` with real tools (use `execFile`, timeouts, redaction — see `dotfiles/phase-loop-pi/extensions/phase-loop-tools.ts`)
3. Write the skill contract: tools list, when-to-use, hard rules
4. Add prompt templates with typed `arguments:` frontmatter
5. `pnpm run validate`
6. `pi install packages/<name>` and smoke-test with `pi --print -p "Use the <name> skill…"`

Optional guardrail extension (destructive bash/path blocks): copy the pattern from `phase-loop-guardrails.ts`.

## Related repos

- `~/code/agent-harness` — phase-loop runtime, `executor=pi` launcher, protocol docs
- `~/code/dotfiles/phase-loop-pi` — production phase-loop Pi supervisor package
- `~/code/fractal-agents` — `pi-agent-core` integration for recursive agent infrastructure

## License

Private fleet tooling — add a license when you publish any package externally.
