import type { AgentTool } from "@earendil-works/pi-agent-core";
import { loadPiExtensionTools } from "../../../../runtime/pi-extension-bridge.js";
import { vendorCatalog, vendorExtensionUrl, type VendorCatalogId } from "../../../../registry/catalog.js";

const cache = new Map<string, Promise<AgentTool[]>>();

function cacheKey(vendorId: VendorCatalogId, names?: readonly string[]): string {
  return `${vendorId}:${names?.join(",") ?? "*"}`;
}

export async function loadVendorTools(
  vendorId: VendorCatalogId,
  names?: readonly string[],
): Promise<AgentTool[]> {
  const entry = vendorCatalog[vendorId];
  if (names) {
    for (const name of names) {
      if (!entry.toolNames.includes(name)) {
        throw new Error(
          `loadVendorTools: "${name}" is not declared for ${vendorId}. Allowed: ${entry.toolNames.join(", ")}`,
        );
      }
    }
  }

  const key = cacheKey(vendorId, names);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  const pending = loadPiExtensionTools(vendorExtensionUrl(entry), { names });
  cache.set(key, pending);
  return pending;
}
