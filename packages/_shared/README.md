# Shared fleet tools

Reusable SDK tool adapters and vendor loaders for agent packages.

| Path | Purpose |
| --- | --- |
| `tools/vendor/load-vendor-tools.ts` | Load allowlisted tools from pinned vendor Pi packages |
| `../registry/catalog.ts` | Vendor metadata (`pi-web-access`, …) |

Agents opt in through `registry/agents.ts` — never import vendor tools globally.
