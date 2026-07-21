import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PACKAGES = join(ROOT, "packages");

let failures = 0;

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function validatePackage(dir, name) {
  const manifestPath = join(dir, "package.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    console.error(`[${name}] missing or invalid package.json`);
    failures += 1;
    return;
  }

  if (!manifest.keywords?.includes("pi-package")) {
    return;
  }

  const pi = manifest.pi;
  if (!pi || typeof pi !== "object") {
    console.error(`[${name}] package.json must define a "pi" block`);
    failures += 1;
    return;
  }

  for (const section of ["extensions", "skills", "prompts"]) {
    for (const rel of pi[section] ?? []) {
      const path = join(dir, rel);
      if (!(await pathExists(path))) {
        console.error(`[${name}] missing pi.${section} entry: ${rel}`);
        failures += 1;
      }
    }
  }
}

async function validateSharedVendorCatalog() {
  const catalogPath = join(ROOT, "registry/catalog.ts");
  const catalogSource = await readFile(catalogPath, "utf8");
  if (!catalogSource.includes("pi-web-access")) {
    console.error("[registry] catalog.ts must declare pi-web-access vendor entry");
    failures += 1;
  }
  const loaderPath = join(ROOT, "packages/_shared/tools/vendor/load-vendor-tools.ts");
  if (!(await pathExists(loaderPath))) {
    console.error("[_shared] missing tools/vendor/load-vendor-tools.ts");
    failures += 1;
  }
}

const entries = await readdir(PACKAGES, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isDirectory() || entry.name === "_template" || entry.name === "_shared") continue;
  await validatePackage(join(PACKAGES, entry.name), entry.name);
}

await validateSharedVendorCatalog();

if (failures > 0) {
  console.error(`Validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log("All Pi packages validated.");
