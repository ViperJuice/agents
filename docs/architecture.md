# Architecture — programmatic Pi agents

This document is the stable design reference for the `agents` monorepo. Operational rules for harnesses live in `AGENTS.md`; contributor process in `CONTRIBUTING.md`.

## Problem

Build a **system of standalone Pi agents** where:

- Each agent has its own tools, skills, and model policy.
- Agents are callable **programmatically** by orchestrators and other agents.
- Tool and skill visibility is **explicitly allowlisted** — no cross-agent leakage.
- Execution is **headless** (no TUI, no global package discovery).

## Decision: SDK runtime, not Pi CLI

| | Pi CLI | `pi-agent-core` + `pi-ai` |
| --- | --- | --- |
| Primary use | Interactive coding harness | Programmatic agent loop |
| Tool loading | Package discovery + `pi config` | `AgentContext.tools` array |
| Callable from code | Subprocess + parse stdout | `await runAgentLoop(...)` |
| Multi-turn / events | Awkward | Built-in `AgentEvent` stream |
| Parent → child agent | Shell wrapper | Direct function call |
| Isolation | Requires `--no-extensions`, explicit flags | Native — only passed tools exist |

**Conclusion:** Pi CLI is a **dev/debug convenience** only. Production fleet agents run through the SDK.

Package dependencies (target):

- `@earendil-works/pi-agent-core` — agent loop, tools, hooks
- `@earendil-works/pi-ai` — models, `streamSimple`, provider auth

(`@mariozechner/*` packages are deprecated aliases; prefer earendil-works for new code.)

## System shape

```
┌─────────────────────────────────────────────────────────┐
│  Orchestrator (phase-loop, fractal CM, custom queue)    │
└──────────────────────────┬──────────────────────────────┘
                           │ runAgent(agentId, input)
                           ▼
┌─────────────────────────────────────────────────────────┐
│  runtime/run-agent.ts                                   │
│  - load registry[agentId]                               │
│  - build AgentContext (systemPrompt, tools, messages)   │
│  - runAgentLoop + streamFn (subscription OAuth)         │
└──────────────────────────┬──────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   packages/reviewer  packages/triage  packages/deployer
   SKILL.md → prompt   tools[]         model policy
```

Each agent package is **self-contained**. The registry maps `agentId` → `{ skillPath, tools, model }`.

## Agent definition

```typescript
// registry/agents.ts (target)
export const agents = {
  reviewer: {
    skillPath: "packages/reviewer/skills/reviewer/SKILL.md",
    tools: () => [reviewDiff, gitStatus],
    model: { provider: "openai-codex", id: "gpt-5.5" },
  },
};
```

```typescript
// runtime/run-agent.ts (target)
export async function runAgent(agentId: string, input: string, opts?) {
  const def = agents[agentId];
  const context: AgentContext = {
    systemPrompt: await readFile(def.skillPath, "utf8"),
    messages: [],
    tools: def.tools(),
  };
  return runAgentLoop(
    [{ role: "user", content: input }],
    context,
    buildLoopConfig(def.model),
    emit,
    signal,
    streamFn,
  );
}
```

### Skills

`SKILL.md` files define **behavior contracts**: when to use the agent, which tools exist, hard rules, escalation boundaries. At runtime they become `systemPrompt` (optionally appended with caller context).

Skills are not executable. Do not embed secrets or environment-specific paths in skills.

### Tools

SDK tools use the `AgentTool` shape from `pi-agent-core`:

```typescript
export const reviewDiff: AgentTool = {
  name: "review_diff",
  label: "Review diff",
  description: "...",
  parameters: ReviewDiffSchema, // TypeBox
  execute: async (toolCallId, params, signal) => ({
    content: [{ type: "text", text: "..." }],
    details: { ... },
  }),
};
```

Tool implementation patterns (from `dotfiles/phase-loop-pi`):

- `execFile` without shell interpolation
- Timeouts and output caps
- Redact secret-shaped strings before returning to the model
- Export pure functions for unit tests

Governance hooks on the loop config:

- `beforeToolCall` — block disallowed invocations
- `afterToolCall` — redact or reshape results

### Model / auth

Follow the subscription-first pattern proven in `fractal-agents`:

- `streamSimple` with OAuth token from the maintainer's subscription CLI login
- No metered API keys in fleet agent paths unless explicitly scoped per agent

## Calling from other agents

Three supported patterns:

1. **Direct invoke** — `await runAgent("reviewer", taskDescription)`
2. **Tool wrapper** — parent agent exposes `call_reviewer` whose `execute` calls `runAgent`
3. **Job queue** — worker processes `{ agentId, input }` jobs using the same runtime

Each invocation creates a **fresh** `AgentContext`. Parent and child do not share tool registries unless you explicitly pass tools into both (don't).

## Pi CLI role (dev only)

The CLI remains useful for:

- Interactive skill tuning: `pi --skill ./skills/foo -e ./extensions/bar.ts`
- Legacy scaffold smoke: `pnpm run smoke -- <name>`
- Human debugging before SDK wiring exists

CLI production anti-patterns for this repo:

- `pi install` everything globally and expect isolation
- Orchestrators shelling out to `pi --print` per agent turn at scale
- Relying on `pi config` toggles for production agent boundaries

## Relationship to other fleet components

### agent-harness / phase-loop

Phase-loop dispatches `executor=pi` lanes using **repo-local** `phase-loop-pi/**` and `pi-config/**` in the **consumer repo**. That path injects a context file with explicit tool policy for scheduler-assigned lane work.

This `agents` repo builds **generic fleet agents** not tied to one product repo. Overlap is intentional but scoped:

- `phase-loop-pi` = supervisor / lane runner for roadmaps
- `agents/packages/*` = reusable roles (reviewer, triage, deploy helper, …)

`phase-loop-pi` may migrate into `packages/phase-loop-pi` here later.

### fractal-agents

Fractal uses `pi-agent-core` at a lower level with its own tool registry and governance (spawn_subtask, capability forge, etc.). Fleet agents in this repo can be:

- Called from fractal via `runAgent` integration, or
- Kept separate as a shared library of role definitions

Do not duplicate fractal's CM/tool-governance stack here. This repo owns **agent definitions + thin runtime**, not scroll/state management.

## Migration from CLI scaffold

Current state:

- `_template` and `validate-packages.mjs` use Pi CLI package manifest shape (`package.json` `"pi"` block, `extensions/*.ts` with `PiApi.registerTool`).
- `pnpm run smoke` wraps Pi CLI `--print`.

Target state:

- `tools/index.ts` exports `AgentTool[]`
- `registry/` + `runtime/run-agent.ts` provide `runAgent()`
- CLI manifest optional per package for dev only
- Tests target tool `execute` and registry wiring, not `pi install`

Migrate agents incrementally; do not block new SDK-shaped agents on full template rewrite.

## Testing strategy

| Layer | What | How |
| --- | --- | --- |
| Static | Manifests, file refs | `pnpm run validate` |
| Types | Extension/tool TS | `pnpm run typecheck` |
| Unit | Tool execute, redaction, arg normalization | `node:test` / vitest on exported helpers |
| Integration | Full agent turn | SDK smoke calling `runAgent()` with mocked or opt-in live auth |
| CLI dev | Skill prose iteration | `pnpm run smoke -- <name>` (optional) |

CI should run validate + typecheck + unit tests. Live LLM integration tests are opt-in (subscription auth required).

## Future layout (planned)

```
agents/
├── registry/agents.ts
├── runtime/
│   ├── run-agent.ts
│   ├── build-config.ts
│   └── load-skill.ts
└── packages/
    └── <agent>/
        ├── skills/<agent>/SKILL.md
        ├── tools/index.ts
        └── agent.ts
```

Implement `registry/` and `runtime/` when the first non-template agent lands.

## Third-party extensions and dependencies

Fleet agents may use npm libraries and third-party Pi packages. **Production composition is explicit in the registry**, not Pi CLI discovery.

| Tier | Mechanism |
| --- | --- |
| npm libraries | Normal `dependencies`; used inside `tools/*.ts` |
| Pi packages (CLI dev) | `bundledDependencies` + `pi.extensions` `node_modules/...` paths |
| Pi packages (SDK prod) | `tools/vendor/*.ts` adapters exporting `AgentTool[]`; registry allowlist |

CLI package filtering in `.pi/settings.json` applies to interactive runs only. SDK agents use `pickTools()` / explicit arrays per agent definition.

Full workflow, security checklist, and adapter example: **`docs/third-party-extensions.md`** and **`docs/examples/vendor-adapter.example.ts`**.
