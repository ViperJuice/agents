# Agent instructions — `agents` repo

Programmatic **Pi agents** for the coding fleet: standalone roles with explicit tools and skills, invoked headlessly by orchestrators and other agents.

Read `docs/architecture.md` for the full design and `docs/third-party-extensions.md` for external Pi packages and npm deps. This file is the operational contract for any harness working in this repo.

## Architecture (summary)

- **Production runtime:** `@earendil-works/pi-agent-core` + `@earendil-works/pi-ai` (`runAgentLoop`, explicit `AgentTool[]`, skill → `systemPrompt`).
- **Not production runtime:** Pi CLI (`pi install`, global discovery, `pi --print`). Use CLI only for optional interactive debugging.
- **One package per agent** under `packages/<kebab-name>/`.
- **Integration surface:** `registry/` + `runtime/run-agent.ts` (target layout — implement when adding the second real agent).
- **Isolation:** each `runAgent(id, input)` call gets only that agent's tools and skill. No ambient tool discovery.

## Repository layout

```
agents/
├── AGENTS.md              # this file — harness-neutral instructions
├── CLAUDE.md              # @AGENTS.md loader for Claude Code
├── CONTRIBUTING.md        # human contributor workflow
├── docs/architecture.md   # design reference
├── docs/third-party-extensions.md  # npm + Pi package dependencies
├── packages/<name>/       # one agent per directory
├── registry/              # agentId → definition (planned)
├── runtime/               # runAgent() SDK entrypoint (planned)
└── scripts/               # validate, scaffold, dev smoke
```

### Per-agent package (target shape)

| Path | Role |
| --- | --- |
| `skill/SKILL.md` or `skills/<name>/SKILL.md` | Behavior contract → loaded into `systemPrompt` |
| `tools/index.ts` | Exports `AgentTool[]` (SDK shape) |
| `agent.ts` | Agent metadata: id, model, tool list, skill path |
| `package.json` | Workspace metadata; legacy `pi` block optional for CLI dev only |

The `_template` package still uses CLI extension shape during migration. New agents should follow the SDK target shape above.

## Invariants

1. **Explicit tools only** — pass `context.tools` with the allowlisted `AgentTool[]`. Never rely on global Pi package discovery in production paths.
2. **Skills are instructions** — load `SKILL.md` into `systemPrompt`; do not treat skills as executable code.
3. **Safe subprocesses** — `execFile`/`spawn` without `shell: true`; timeouts, `maxBuffer`, secret redaction on tool output.
4. **Test tool logic directly** — export pure helpers and unit-test `execute` without an LLM where possible.
5. **Parent agents call children via SDK** — `await runAgent("reviewer", input)` or a wrapper tool; do not shell out to `pi` in orchestration code.
6. **Phase-loop is separate** — repo-local `phase-loop-pi/**` in consumer repos is for `executor=pi` lanes; this repo authors generic fleet agents.

## Third-party dependencies

Production composition is **registry allowlists**, not global `pi install`. See `docs/third-party-extensions.md`.

| Tier | What | Wire how |
| --- | --- | --- |
| **1 — npm libraries** | zod, HTTP clients, parsers | `dependencies` in package.json; use in `tools/*.ts` |
| **2 — Pi packages** | npm/git `pi-package` extensions | **SDK:** `tools/vendor/<pkg>.ts` adapters → `AgentTool[]`; **CLI dev only:** `bundledDependencies` + `pi.extensions` `node_modules/...` paths |
| **3 — fleet shared** | `packages/_shared/tools/` | Import in registry; allowlist per agent |

Rules:

- Never load third-party tools via ambient Pi discovery in production paths.
- Each agent's registry entry lists **exact tool names** it may use (`pickTools` / explicit array).
- Map CLI extension guardrails to SDK `beforeToolCall` / `afterToolCall` in runtime — do not assume `pi.on(...)` hooks run headlessly.
- Pin vendor versions; review source before merge (full system access — Pi upstream security note).

When adding a vendor: adapter in `tools/vendor/`, allowlist in registry + `SKILL.md`, unit tests on `execute`, optional CLI `pi.extensions` path for dev smoke only.

## Commands

```bash
pnpm install
pnpm run validate          # manifest / file references
pnpm run typecheck         # TypeScript (packages with tsconfig)
pnpm run new-agent -- <name> "<description>"
pnpm run smoke -- <name>   # CLI dev smoke only; requires pi on PATH
```

Cursor: **Tasks: Run Task → Pi Agents: Validate** (default test task). See README § Cursor workflow.

## Adding an agent

1. `pnpm run new-agent -- <kebab-name> "<description>"`
2. Implement SDK tools in `tools/index.ts` (`AgentTool` + TypeBox schemas).
3. Write `skills/<name>/SKILL.md` (when to use, tool list, hard rules).
4. Register in `registry/agents.ts` when the registry exists.
5. Add unit tests for tool `execute` paths (including any `tools/vendor/` adapters).
6. `pnpm run validate` before commit.

Third-party Pi packages: follow `docs/third-party-extensions.md` — adapter + registry allowlist required for SDK; CLI bundle optional for dev.

See `CONTRIBUTING.md` for PR checklist.

## Related repos

| Repo | Relationship |
| --- | --- |
| `agent-harness` | Phase-loop orchestration; `executor=pi` uses repo-local `phase-loop-pi/**` |
| `dotfiles/phase-loop-pi` | Production phase-loop supervisor package (may migrate here) |
| `fractal-agents` | `pi-agent-core` subscription transport pattern reference |

## Do not

- Treat `pi install` / `link-fleet` as the production deployment model for fleet agents.
- Add tools to an agent package that other agents are expected to inherit via global install.
- Shell out to `pi` from orchestrators when `runAgentLoop` suffices.
- Commit `.pi/`, secrets, or provider tokens.
- Add third-party tools without registry allowlist and vendor review (`docs/third-party-extensions.md`).
