import { createCodexPanelTools } from "../../_shared/tools/alias-coding-tools.js";
import { createCallResearcherTool } from "../../_shared/tools/call-researcher.js";

export function createPanelCodexTools(cwd = process.cwd()) {
  return [...createCodexPanelTools(cwd), createCallResearcherTool()];
}

export const tools = createPanelCodexTools();
