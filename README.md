# agents

Monorepo for **programmatic Pi agents** — standalone roles with explicit tools and skills, invoked headlessly by orchestrators and other agents across the coding fleet.

Production runtime is **`pi-agent-core` + `pi-ai`** (`runAgentLoop`, explicit tool allowlists). The Pi CLI is for optional interactive debugging only.

## Documentation

| Doc | Audience |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Harness agents (Claude, Cursor, Codex) working in this repo |
| [`docs/architecture.md`](docs/architecture.md) | Design: SDK vs CLI, registry, isolation, fleet integration |
| [`docs/third-party-extensions.md`](docs/third-party-extensions.md) | npm + Pi package deps, adapters, allowlists |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Human contributor workflow and PR checklist |
| [`CLAUDE.md`](CLAUDE.md) | Claude Code loader (`@AGENTS.md`) |

## Quick start

```bash
cd ~/code/agents
pnpm install

pnpm run new-agent -- my-agent "One-line description"
pnpm run validate
pnpm run typecheck
```

Target per-agent layout (see `docs/architecture.md`):

```
packages/<name>/
├── skills/<name>/SKILL.md   # → systemPrompt
├── tools/index.ts           # → AgentTool[]
└── agent.ts                 # → registry metadata
```

Planned integration surface: `registry/agents.ts` + `runtime/run-agent.ts`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run validate` | Manifest and file reference checks |
| `pnpm run typecheck` | TypeScript across packages |
| `pnpm run new-agent -- <name> "<desc>"` | Scaffold from `_template` |
| `pnpm run smoke -- <name>` | CLI dev smoke only (requires `pi` on PATH) |

## Cursor workflow

| Mechanism | Location |
| --- | --- |
| Rules | `.cursor/rules/pi-*.mdc` — pointers to `AGENTS.md` |
| Hook | `.cursor/hooks/validate-after-edit.mjs` — validates after `packages/` edits |
| Tasks | `.vscode/tasks.json` — **Pi Agents:** Validate, Typecheck, Smoke, Local Install |

Default test task: **Pi Agents: Validate** (`Tasks: Run Task`).

## Related repos

- [`agent-harness`](https://github.com/ViperJuice/agent-harness) — phase-loop; `executor=pi` uses repo-local `phase-loop-pi/**`
- `dotfiles/phase-loop-pi` — phase-loop supervisor package
- `fractal-agents` — `pi-agent-core` subscription transport reference

## License

Apache-2.0 when published externally; currently fleet tooling.
