import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";

type PiToolResult = {
  content: AgentToolResult<unknown>["content"];
  details?: unknown;
};

type PiRegisteredTool = {
  name: string;
  label?: string;
  description: string;
  parameters: unknown;
  execute: (
    callId: string,
    params: unknown,
    signal?: AbortSignal,
    onUpdate?: (partial: PiToolResult) => void,
    ctx?: HeadlessExtensionContext,
  ) => Promise<PiToolResult>;
};

type HeadlessExtensionContext = {
  hasUI: false;
  cwd: string;
  model: undefined;
  modelRegistry: undefined;
  isProjectTrusted: () => boolean;
  sessionManager: { getBranch: () => unknown[] };
};

type PiExtensionApi = {
  registerTool: (tool: PiRegisteredTool) => void;
  on: (...args: unknown[]) => () => void;
  registerShortcut: (...args: unknown[]) => void;
  appendEntry: (...args: unknown[]) => void;
  sendMessage: (...args: unknown[]) => void;
};

export type LoadPiExtensionToolsOptions = {
  names?: readonly string[];
  cwd?: string;
};

function headlessContext(cwd: string): HeadlessExtensionContext {
  return {
    hasUI: false,
    cwd,
    model: undefined,
    modelRegistry: undefined,
    isProjectTrusted: () => true,
    sessionManager: { getBranch: () => [] },
  };
}

function toAgentTool(tool: PiRegisteredTool, ctx: HeadlessExtensionContext): AgentTool {
  return {
    name: tool.name,
    label: tool.label ?? tool.name,
    description: tool.description,
    parameters: tool.parameters as AgentTool["parameters"],
    async execute(toolCallId, params, signal, onUpdate) {
      const result = await tool.execute(toolCallId, params, signal, (partial) => {
        onUpdate?.({
          content: partial.content,
          details: partial.details ?? {},
        });
      }, ctx);
      return {
        content: result.content,
        details: result.details ?? {},
      };
    },
  };
}

function createMockPi(collected: PiRegisteredTool[]): PiExtensionApi {
  return {
    registerTool(tool) {
      collected.push(tool);
    },
    on() {
      return () => {};
    },
    registerShortcut() {},
    appendEntry() {},
    sendMessage() {},
  };
}

export async function loadPiExtensionTools(
  extensionModuleUrl: string,
  options: LoadPiExtensionToolsOptions = {},
): Promise<AgentTool[]> {
  const mod = await import(extensionModuleUrl);
  const init = mod.default;
  if (typeof init !== "function") {
    throw new Error(`Pi extension module has no default export: ${extensionModuleUrl}`);
  }

  const collected: PiRegisteredTool[] = [];
  const ctx = headlessContext(options.cwd ?? process.cwd());
  init(createMockPi(collected));

  let tools = collected.map((tool) => toAgentTool(tool, ctx));
  if (options.names?.length) {
    const { pickTools } = await import("./pick-tools.js");
    tools = pickTools(tools, [...options.names]);
  }
  return tools;
}
