import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RUNTIME_DIR = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = join(RUNTIME_DIR, "..");
