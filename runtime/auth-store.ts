import { homedir } from "node:os";
import { join } from "node:path";
import type { Credential, CredentialStore } from "@earendil-works/pi-ai";
import { AuthStorage } from "@earendil-works/pi-coding-agent";

/**
 * Bridge Pi coding-agent auth.json (~/.pi/agent/auth.json) into pi-ai's CredentialStore.
 * Lets fleet agents use existing Codex / Anthropic OAuth logins without metered keys.
 */
export function createPiAuthCredentialStore(
  authPath = join(homedir(), ".pi", "agent", "auth.json"),
): CredentialStore {
  const storage = AuthStorage.create(authPath);
  return {
    async read(providerId: string): Promise<Credential | undefined> {
      storage.reload();
      return storage.get(providerId) as Credential | undefined;
    },
    async modify(
      providerId: string,
      fn: (current: Credential | undefined) => Promise<Credential | undefined>,
    ): Promise<Credential | undefined> {
      storage.reload();
      const current = storage.get(providerId) as Credential | undefined;
      const next = await fn(current);
      if (next) {
        storage.set(providerId, next as Parameters<AuthStorage["set"]>[1]);
      }
      return next ?? current;
    },
    async delete(providerId: string): Promise<void> {
      storage.remove(providerId);
    },
  };
}
