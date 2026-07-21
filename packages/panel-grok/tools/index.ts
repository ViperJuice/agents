import { createGrokPanelTools } from "../../_shared/tools/alias-coding-tools.js";
import { createCallResearcherTool } from "../../_shared/tools/call-researcher.js";

export function createPanelGrokTools(cwd = process.cwd()) {
  return [...createGrokPanelTools(cwd), createCallResearcherTool()];
}

export const tools = createPanelGrokTools();
