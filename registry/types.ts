import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { AgentModelSpec } from "../runtime/build-config.js";
import type { AgentEnablement } from "./enablement.js";

export type AgentDefinition = {
  skillPath: string;
  model: AgentModelSpec;
  tools: () => AgentTool[] | Promise<AgentTool[]>;
  enablement: AgentEnablement;
};

export type VendorCatalogEntry = {
  packageName: string;
  version: string;
  toolNames: readonly string[];
  extensionEntry: string;
  skillPath?: string;
};
