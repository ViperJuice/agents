import { join } from "node:path";
import type { AgentDefinition } from "./types.js";
import { REPO_ROOT } from "../runtime/paths.js";
import { loadVendorTools } from "../packages/_shared/tools/vendor/load-vendor-tools.js";
import { firecrawlTools } from "../packages/_shared/tools/firecrawl.js";
import { createPanelClaudeTools } from "../packages/panel-claude/tools/index.js";
import { createPanelGrokTools } from "../packages/panel-grok/tools/index.js";
import { createPanelCodexTools } from "../packages/panel-codex/tools/index.js";
import { disabledAgentMessage, isAgentEnabled } from "./enablement.js";

/**
 * Fleet agent registry. Enablement flags: see `registry/enablement.ts`
 * (`AGENTS_DISABLE`, `AGENTS_FORCE_ENABLE`, `AGENTS_ALLOW_API_KEY`).
 */
export const agents: Record<string, AgentDefinition> = {
  researcher: {
    skillPath: join(REPO_ROOT, "packages/researcher/skills/researcher/SKILL.md"),
    model: { provider: "openai-codex", id: "gpt-5.5" },
    enablement: {
      authLane: "subscription",
      enabledByDefault: true,
    },
    tools: async () => {
      const web = await loadVendorTools("pi-web-access");
      return [...firecrawlTools, ...web];
    },
  },
  "web-fetcher": {
    skillPath: join(REPO_ROOT, "packages/web-fetcher/skills/web-fetcher/SKILL.md"),
    model: { provider: "openai-codex", id: "gpt-5.5" },
    enablement: {
      authLane: "subscription",
      enabledByDefault: true,
    },
    tools: () => loadVendorTools("pi-web-access", ["fetch_content", "get_search_content"]),
  },
  "panel-codex": {
    skillPath: join(REPO_ROOT, "packages/panel-codex/skills/panel-codex/SKILL.md"),
    model: { provider: "openai-codex", id: "gpt-5.5" },
    enablement: {
      authLane: "subscription",
      enabledByDefault: true,
    },
    tools: () => createPanelCodexTools(),
  },
  "panel-claude": {
    skillPath: join(REPO_ROOT, "packages/panel-claude/skills/panel-claude/SKILL.md"),
    // Claude Pro/Max OAuth is supported by pi-ai; disable with AGENTS_DISABLE=panel-claude
    // if you do not want Anthropic subscription usage from this SDK path.
    model: { provider: "anthropic", id: "claude-fable-5" },
    enablement: {
      authLane: "subscription",
      enabledByDefault: true,
      disableReason:
        "panel-claude disabled (Anthropic subscription/OAuth opt-out or AGENTS_DISABLE)",
    },
    tools: () => createPanelClaudeTools(),
  },
  "panel-grok": {
    skillPath: join(REPO_ROOT, "packages/panel-grok/skills/panel-grok/SKILL.md"),
    // pi-ai xai provider is API-key only (no OAuth). Grok CLI subscription ≠ SDK path.
    model: { provider: "xai", id: "grok-4.3" },
    enablement: {
      authLane: "api-key",
      enabledByDefault: false,
      disableReason:
        "panel-grok disabled by default: pi-ai xai uses metered XAI_API_KEY (no subscription OAuth)",
    },
    tools: () => createPanelGrokTools(),
  },
};

export function listAgentIds(): string[] {
  return Object.keys(agents)
    .filter((id) => isAgentEnabled(id, agents[id]!.enablement))
    .sort();
}

export function listAllAgentIds(): string[] {
  return Object.keys(agents).sort();
}

export function getAgentDefinition(agentId: string): AgentDefinition {
  const def = agents[agentId];
  if (!def) {
    throw new Error(`Unknown agent "${agentId}". Available: ${listAgentIds().join(", ")}`);
  }
  if (!isAgentEnabled(agentId, def.enablement)) {
    throw new Error(disabledAgentMessage(agentId, def.enablement));
  }
  return def;
}
