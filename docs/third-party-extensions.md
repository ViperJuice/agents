# Third-party extensions and dependencies

How to use external Pi packages and npm libraries in fleet agents. Operational rules for harnesses: `AGENTS.md` § Third-party dependencies.

Pi upstream reference: [packages.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md) (Pi CLI package model).

## Two runtimes, two dependency paths

| Runtime | Dependency mechanism | Production? |
| --- | --- | --- |
| **SDK** (`runAgentLoop`) | Registry + explicit `AgentTool[]` imports/wrappers | **Yes** |
| **Pi CLI** (`pi install`, `-e`) | `package.json` deps + `bundledDependencies` + `pi.extensions` paths | Dev/debug only |

There is **no single framework** that auto-wires third-party Pi CLI extensions into the SDK. Production composition happens in **TypeScript at the registry**.

## Three tiers

### Tier 1 — Ordinary npm libraries

Standard `dependencies` in the agent or workspace `package.json` (HTTP clients, parsers, etc.). Use inside `tools/*.ts` implementations.

```json
{
  "dependencies": {
    "zod": "^3.24.0"
  }
}
```

No Pi-specific wiring. Pin versions; review licenses.

### Tier 2 — Third-party Pi packages

Published as npm/git Pi packages (`keywords: ["pi-package"]`). Pi CLI loads them via extension entrypoints (`export default function(pi) { pi.registerTool(...) }`).

**CLI dev** — bundle and reference in the agent `package.json`:

```json
{
  "dependencies": {
    "some-pi-tools": "^2.0.0"
  },
  "bundledDependencies": ["some-pi-tools"],
  "pi": {
    "extensions": [
      "./extensions",
      "node_modules/some-pi-tools/extensions"
    ],
    "skills": ["./skills"]
  }
}
```

Notes from Pi upstream:

- Pi packages do **not** compose via nested `pi install` alone; bundle sibling pi-packages in `bundledDependencies` and point `pi.extensions` at `node_modules/...` paths.
- Pi core libs (`pi-agent-core`, `pi-ai`, `pi-coding-agent`, `typebox`) belong in **`peerDependencies`**, not bundled.
- **Package filtering** in `.pi/settings.json` narrows what loads (CLI only):

```json
{
  "packages": [
    {
      "source": "npm:some-pi-tools",
      "extensions": ["extensions/useful.ts", "!extensions/legacy.ts"],
      "skills": []
    }
  ]
}
```

**SDK production** — wrap or re-export; do not rely on Pi loading `node_modules` extensions:

```
packages/my-agent/
├── tools/
│   ├── index.ts              # allowlisted AgentTool[] for this agent
│   └── vendor/
│       └── some-pi-tools.ts  # adapters → AgentTool[]
└── package.json              # deps for CLI dev + shared libraries
```

Adapter strategies:

1. **Reusable library export** — if the package exports plain functions, call them from `AgentTool.execute`.
2. **Extension-only package** — reimplement the small tool surface you need as `AgentTool`, or keep CLI-only for dev and ship SDK tools for production.
3. **Lifecycle hooks** (`pi.on("tool_call")`, guardrails) — map to SDK `beforeToolCall` / `afterToolCall` in `runtime/`, not CLI extension events.

See `docs/examples/vendor-adapter.example.ts`.

### Tier 3 — Fleet-internal shared tools (implemented)

Vendor loaders under `packages/_shared/tools/vendor/` with metadata in `registry/catalog.ts`.

```typescript
// registry/agents.ts
import { loadVendorTools } from "../packages/_shared/tools/vendor/load-vendor-tools.js";

researcher: {
  tools: () => loadVendorTools("pi-web-access"),
},
"web-fetcher": {
  tools: () => loadVendorTools("pi-web-access", ["fetch_content", "get_search_content"]),
},
```

`loadVendorTools` uses `runtime/pi-extension-bridge.ts` to load Pi extension modules headlessly and cache `AgentTool[]`. Add new frequent vendors to `registry/catalog.ts`, then allowlist per agent.

Manual adapters in `packages/<agent>/tools/vendor/` remain valid when the bridge is insufficient.

**Per-agent allowlisting is mandatory.** Third-party tools never load globally for all agents.

## Registry composition (production)

The registry is the fleet dependency framework for SDK agents:

```typescript
export type AgentDefinition = {
  skillPath: string;
  tools: () => AgentTool[];
  model: { provider: string; id: string };
  beforeToolCall?: AgentLoopConfig["beforeToolCall"];
};
```

Each agent's `tools()` returns a **closed set**. Parent orchestrators call `runAgent(id, input)` — they do not merge tool sets unless explicitly coded.

Helper pattern for subsets:

```typescript
export function pickTools(tools: AgentTool[], names: string[]): AgentTool[] {
  const set = new Set(names);
  const picked = tools.filter((t) => set.has(t.name));
  if (picked.length !== names.length) {
    throw new Error(`pickTools: missing ${names.filter((n) => !picked.some((t) => t.name === n)).join(", ")}`);
  }
  return picked;
}
```

Implement `pickTools` in `runtime/pick-tools.ts` (done). Register new vendors in `registry/catalog.ts`.

## Security and review

Pi packages run with **full system access** (Pi upstream warning). Before adding a third-party dependency:

- [ ] Pin version (`^` only after trust; prefer exact pins for new vendors)
- [ ] Read extension source (network, shell, filesystem scope)
- [ ] Confirm license compatible with fleet use
- [ ] List allowed tool names in `SKILL.md` and registry entry
- [ ] Unit-test adapter `execute` paths
- [ ] No secrets in bundled packages or skills

Reject packages that require global `pi install` discovery for safe operation.

## Workflow: add a third-party Pi package to an agent

1. Add npm dependency (+ `bundledDependencies` if bundling a pi-package) to `packages/<agent>/package.json`.
2. Create `tools/vendor/<vendor>.ts` — export `AgentTool[]` (adapters).
3. Compose in `tools/index.ts` — only the tools this agent needs.
4. Register allowlist in `registry/agents.ts` when present.
5. Optional: wire `pi.extensions` `node_modules/...` paths for CLI dev smoke.
6. Document vendor + allowed tool names in agent `SKILL.md`.
7. Add unit tests for vendor adapter behavior.

## What not to do

- Install third-party pi-packages globally and expect per-agent isolation.
- Pass through entire vendor tool arrays without an explicit allowlist.
- Use CLI package filtering as the only production gate (settings do not apply to SDK).
- Shell out to `pi -e npm:...` from orchestrators at scale.

## Related

- `docs/architecture.md` — SDK runtime and registry target
- `docs/examples/vendor-adapter.example.ts` — adapter skeleton
- `CONTRIBUTING.md` — PR checklist for new vendors
