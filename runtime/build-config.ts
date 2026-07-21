import { builtinModels } from "@earendil-works/pi-ai/providers/all";
import type { AgentLoopConfig, AgentMessage } from "@earendil-works/pi-agent-core";
import type { Message } from "@earendil-works/pi-ai";
import { createPiAuthCredentialStore } from "./auth-store.js";

const models = builtinModels({
  credentials: createPiAuthCredentialStore(),
});

export type AgentModelSpec = {
  provider: string;
  id: string;
};

export function buildLoopConfig(model: AgentModelSpec): AgentLoopConfig {
  const resolved = models.getModel(model.provider, model.id);
  if (!resolved) {
    throw new Error(`Unknown model ${model.provider}/${model.id}`);
  }
  return {
    model: resolved,
    convertToLlm(messages: AgentMessage[]): Message[] {
      return messages as Message[];
    },
  };
}
