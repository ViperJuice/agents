#!/usr/bin/env tsx
import { listAgents, runAgent } from "../runtime/run-agent.js";
import { listAllAgentIds } from "../registry/agents.js";

const argv = process.argv.slice(2).filter((a) => a !== "--");
const agentId = argv[0];
const prompt = argv.slice(1).join(" ").trim();

if (!agentId || agentId === "--help" || agentId === "-h") {
  console.log(`Usage: pnpm run agent -- <agent-id> "<prompt>"

Enabled agents: ${listAgents().join(", ") || "(none)"}
All registered: ${listAllAgentIds().join(", ")}

Flags: AGENTS_DISABLE, AGENTS_FORCE_ENABLE, AGENTS_ALLOW_API_KEY=1
       FIRECRAWL_API_URL (default http://ai.taile09692.ts.net:3002)`);
  process.exit(agentId ? 0 : 1);
}

if (!prompt) {
  console.error("Error: prompt required.");
  process.exit(1);
}

try {
  const messages = await runAgent(agentId, prompt);
  const last = messages.at(-1);
  const content = last && typeof last === "object" && "content" in last ? last.content : last;
  console.log(typeof content === "string" ? content : JSON.stringify(content, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
