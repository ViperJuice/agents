# Contributing

Thanks for extending the fleet agent library. Read `AGENTS.md` for architecture, `docs/architecture.md` for design rationale, and `docs/third-party-extensions.md` before adding external Pi packages or npm deps.

## Prerequisites

- Node 20+
- pnpm (`corepack enable`)
- For CLI dev smoke only: `pi` CLI (`@mariozechner/pi-coding-agent`) with provider auth

## Adding an agent

1. Scaffold: `pnpm run new-agent -- <kebab-name> "<one-line description>"`
2. Refactor toward SDK shape (see `docs/architecture.md`):
   - `skills/<name>/SKILL.md` — behavior contract
   - `tools/index.ts` — `AgentTool[]` exports with TypeBox schemas
   - `agent.ts` — metadata for registry entry
3. Register in `registry/agents.ts` when that file exists.
4. Third-party Pi packages: add `tools/vendor/<vendor>.ts` adapters per `docs/third-party-extensions.md`; allowlist tool names in registry + `SKILL.md`.
5. Add unit tests for tool logic (no LLM required for most cases).
6. Run checks (below).

Naming: kebab-case directory names (`code-reviewer`, not `codeReviewer`).

## Before you open a PR

```bash
pnpm install
pnpm run validate
pnpm run typecheck
# unit tests when present:
# pnpm test
```

Optional CLI dev smoke (not a merge gate unless the PR only touches CLI scaffold):

```bash
pnpm run smoke -- <package-name>
```

## PR checklist

- [ ] Agent has its own `packages/<name>/` directory with skill + tools
- [ ] Tools are allowlisted explicitly; no dependency on global `pi install` for production behavior
- [ ] Tool subprocesses use `execFile` without `shell: true`; timeouts and redaction applied
- [ ] `SKILL.md` lists tools and hard rules (no push, no secrets, escalation boundaries as applicable)
- [ ] `pnpm run validate` passes
- [ ] No `.pi/`, credentials, or env files committed
- [ ] README / `AGENTS.md` / `docs/` updated if you change repo conventions
- [ ] Third-party deps: version pinned, source reviewed, tools allowlisted (see `docs/third-party-extensions.md`)

## What we merge

- Focused agent packages with clear, bounded tool sets
- Tests that prove tool behavior without live LLM calls where possible
- Documentation updates when the contract changes

## What we reject

- Agents that require global Pi package discovery to function safely
- Tools with unrestricted shell or undeclared network access without explicit review
- Third-party pi-packages wired only via global `pi install` or unfiltered vendor tool exports
- Duplicating phase-loop supervisor logic — use `dotfiles/phase-loop-pi` or migrate it deliberately

## Cursor / harness notes

Agents working in this repo should follow `AGENTS.md`. Cursor rules in `.cursor/rules/` are thin pointers; do not treat them as the source of truth over `AGENTS.md`.
