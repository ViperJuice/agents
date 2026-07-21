import { runAgentLoop } from "@earendil-works/pi-agent-core";
import type { AgentContext, AgentMessage } from "@earendil-works/pi-agent-core";
import { agents, getAgentDefinition, listAgentIds } from "../registry/agents.js";
import { isAgentEnabled } from "../registry/enablement.js";
import { buildLoopConfig } from "./build-config.js";
import { loadSkill } from "./load-skill.js";

export type RunAgentOptions = {
  signal?: AbortSignal;
};

export function listAgents(): string[] {
  return listAgentIds();
}

export function isAgentAvailable(agentId: string): boolean {
  const def = agents[agentId];
  return !!def && isAgentEnabled(agentId, def.enablement);
}

export async function runAgent(
  agentId: string,
  input: string,
  options: RunAgentOptions = {},
): Promise<AgentMessage[]> {
  const def = getAgentDefinition(agentId);
  const tools = await def.tools();
  const systemPrompt = await loadSkill(def.skillPath);
  const context: AgentContext = {
    systemPrompt,
    messages: [],
    tools,
  };
  const config = buildLoopConfig(def.model);
  const prompts: AgentMessage[] = [{ role: "user", content: input } as AgentMessage];

  return runAgentLoop(
    prompts,
    context,
    config,
    () => {},
    options.signal,
  );
}
