import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { VendorCatalogEntry } from "./types.js";

const require = createRequire(import.meta.url);

function resolvePackageDir(packageName: string): string {
  const pkgJson = require.resolve(`${packageName}/package.json`);
  return dirname(pkgJson);
}

export const PI_WEB_ACCESS: VendorCatalogEntry = {
  packageName: "pi-web-access",
  version: "0.13.0",
  toolNames: ["web_search", "fetch_content", "get_search_content"],
  extensionEntry: "index.ts",
  skillPath: join(resolvePackageDir("pi-web-access"), "skills/librarian/SKILL.md"),
};

export function vendorExtensionUrl(entry: VendorCatalogEntry): string {
  return pathToFileURL(join(resolvePackageDir(entry.packageName), entry.extensionEntry)).href;
}

export const vendorCatalog = {
  "pi-web-access": PI_WEB_ACCESS,
} as const;

export type VendorCatalogId = keyof typeof vendorCatalog;
