import { Type } from "typebox";
import type { AgentTool } from "@earendil-works/pi-agent-core";

/**
 * Parent-agent wrapper: delegates to the fleet `researcher` agent.
 * Keeps web/Firecrawl tools off the parent allowlist.
 */
export function createCallResearcherTool(): AgentTool {
  return {
    name: "call_researcher",
    label: "Call researcher",
    description:
      "Delegate a web-research question to the fleet researcher agent (Firecrawl on the AI tailnet host, plus optional pi-web-access). Use for dependency docs, upstream APIs, or external claims — not for routine repo reads.",
    parameters: Type.Object({
      query: Type.String({ minLength: 1, description: "Research question or URL-focused ask" }),
    }),
    async execute(_toolCallId, params, signal) {
      const { query } = params as { query: string };
      const { runAgent, isAgentAvailable } = await import("../../../runtime/run-agent.js");
      if (!isAgentAvailable("researcher")) {
        throw new Error(
          "researcher agent is disabled. Enable it (check AGENTS_DISABLE / auth flags) before call_researcher.",
        );
      }
      const messages = await runAgent("researcher", query, { signal });
      const last = messages.at(-1);
      const content =
        last && typeof last === "object" && "content" in last ? last.content : last;
      const text =
        typeof content === "string" ? content : JSON.stringify(content ?? null, null, 2);
      return {
        content: [{ type: "text", text }],
        details: { agentId: "researcher", messageCount: messages.length },
      };
    },
  };
}
