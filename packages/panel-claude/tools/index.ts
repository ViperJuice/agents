import { createClaudePanelTools } from "../../_shared/tools/alias-coding-tools.js";
import { createCallResearcherTool } from "../../_shared/tools/call-researcher.js";

export function createPanelClaudeTools(cwd = process.cwd()) {
  return [...createClaudePanelTools(cwd), createCallResearcherTool()];
}

export const tools = createPanelClaudeTools();
