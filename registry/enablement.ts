/**
 * Agent enablement + subscription-safe auth posture.
 *
 * Env flags (comma-separated agent ids):
 *   AGENTS_DISABLE=panel-claude,panel-grok
 *   AGENTS_FORCE_ENABLE=panel-grok
 *   AGENTS_ALLOW_API_KEY=1   — allow agents whose SDK path is API-key (metered)
 *
 * Auth lanes (SDK / pi-ai):
 *   subscription — OAuth without metered key (openai-codex, anthropic Claude Pro/Max)
 *   api-key      — metered provider key (xai/grok in pi-ai today; no OAuth)
 *   local        — no LLM (tool-only helpers; unused for now)
 *
 * Note: Grok *CLI* is subscription-login, but the pi-ai `xai` provider is
 * API-key only — so panel-grok stays disabled by default until that changes
 * or AGENTS_ALLOW_API_KEY / AGENTS_FORCE_ENABLE opts in.
 */

export type AgentAuthLane = "subscription" | "api-key" | "local";

export type AgentEnablement = {
  /** Credential lane this agent’s model uses in the Pi SDK. */
  authLane: AgentAuthLane;
  /**
   * When false, agent is omitted unless forced via AGENTS_FORCE_ENABLE
   * or (for api-key lane) AGENTS_ALLOW_API_KEY=1.
   */
  enabledByDefault: boolean;
  /** Short reason shown when the agent is disabled. */
  disableReason?: string;
};

function parseIdList(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isAgentEnabled(agentId: string, enablement: AgentEnablement): boolean {
  const disabled = parseIdList(process.env.AGENTS_DISABLE);
  const forced = parseIdList(process.env.AGENTS_FORCE_ENABLE);
  const allowApiKey = process.env.AGENTS_ALLOW_API_KEY === "1";

  if (forced.has(agentId)) return true;
  if (disabled.has(agentId)) return false;
  if (!enablement.enabledByDefault) {
    if (enablement.authLane === "api-key" && allowApiKey) return true;
    return false;
  }
  if (enablement.authLane === "api-key" && !allowApiKey) return false;
  return true;
}

export function disabledAgentMessage(agentId: string, enablement: AgentEnablement): string {
  const reason = enablement.disableReason ?? `agent "${agentId}" is disabled`;
  const hints: string[] = [];
  if (enablement.authLane === "api-key") {
    hints.push("set AGENTS_ALLOW_API_KEY=1 to allow metered API-key agents");
  }
  hints.push(`set AGENTS_FORCE_ENABLE=${agentId} to force-enable`);
  hints.push(`or remove it from AGENTS_DISABLE`);
  return `${reason}. ${hints.join("; ")}.`;
}
