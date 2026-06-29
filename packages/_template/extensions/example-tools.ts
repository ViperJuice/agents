import { Type } from "typebox";

type JsonObject = Record<string, unknown>;
type ToolSpec = {
  name: string;
  description: string;
  parameters: unknown;
  execute: (params: JsonObject) => Promise<JsonObject>;
};
type PiApi = {
  registerTool?: (tool: ToolSpec) => unknown;
  tools?: { register?: (tool: ToolSpec) => unknown };
};

const EchoSchema = Type.Object({
  message: Type.String({ minLength: 1 })
});

function registerTool(pi: PiApi, tool: ToolSpec) {
  if (typeof pi.registerTool === "function") {
    pi.registerTool(tool);
    return;
  }
  pi.tools?.register?.(tool);
}

export default function exampleTools(pi: PiApi) {
  registerTool(pi, {
    name: "example_echo",
    description: "Return the input message. Replace with real fleet tools.",
    parameters: EchoSchema,
    execute: async (params) => ({
      content: [{ type: "text", text: String(params.message ?? "") }]
    })
  });
}
