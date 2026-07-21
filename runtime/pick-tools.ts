import type { AgentTool } from "@earendil-works/pi-agent-core";

export function pickTools<T extends AgentTool>(
  tools: readonly T[],
  names: readonly string[],
): T[] {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const picked: T[] = [];
  const missing: string[] = [];

  for (const name of names) {
    const tool = byName.get(name);
    if (!tool) {
      missing.push(name);
      continue;
    }
    picked.push(tool);
  }

  if (missing.length > 0) {
    throw new Error(`pickTools: unknown tool(s): ${missing.join(", ")}`);
  }

  return picked;
}
