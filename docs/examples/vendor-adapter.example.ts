/**
 * Example: wrap third-party tool logic as SDK AgentTool definitions.
 * Copy into packages/<agent>/tools/vendor/<vendor>.ts and customize.
 *
 * See docs/third-party-extensions.md
 */

import { Type } from "typebox";
import type { AgentTool } from "@earendil-works/pi-agent-core";

// import { runGrep } from "some-pi-tools/lib/grep"; // when vendor exports plain helpers

const GrepSchema = Type.Object({
  pattern: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
});

export const grepRepo: AgentTool = {
  name: "grep_repo",
  label: "Grep repository",
  description: "Search files under a path for a pattern.",
  parameters: GrepSchema,
  async execute(_toolCallId, params, signal) {
    // const result = await runGrep(params, { signal });
    const result = { matches: [] as string[] };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      details: result,
    };
  },
};

/** All tools exported by this vendor adapter (registry picks a subset). */
export const vendorTools: AgentTool[] = [grepRepo];

export function pickVendorTools(names: string[]): AgentTool[] {
  const set = new Set(names);
  const picked = vendorTools.filter((t) => set.has(t.name));
  const missing = names.filter((n) => !picked.some((t) => t.name === n));
  if (missing.length > 0) {
    throw new Error(`pickVendorTools: unknown tool(s): ${missing.join(", ")}`);
  }
  return picked;
}
