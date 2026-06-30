#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HOOK_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HOOK_DIR, "../..");
const VALIDATE = join(REPO_ROOT, "scripts/validate-packages.mjs");

function editedPath(input) {
  const candidates = [
    input.file_path,
    input.filePath,
    input.path,
    input.file,
    input.editedFile,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return "";
}

function shouldValidate(rawPath) {
  if (!rawPath) return false;
  const path = rawPath.startsWith("/") ? rawPath : resolve(REPO_ROOT, rawPath);
  const rel = relative(REPO_ROOT, path);
  if (!rel.startsWith(`packages${sep}`) && rel !== "packages") return false;
  if (rel.startsWith(`packages${sep}_template${sep}`)) return false;
  return true;
}

let input = {};
try {
  const raw = readFileSync(0, "utf8").trim();
  if (raw) input = JSON.parse(raw);
} catch {
  process.exit(0);
}

if (!shouldValidate(editedPath(input)) || !existsSync(VALIDATE)) {
  process.exit(0);
}

const result = spawnSync(process.execPath, [VALIDATE], {
  cwd: REPO_ROOT,
  encoding: "utf8",
});

if (result.status === 0) {
  process.exit(0);
}

const output = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
console.log(
  JSON.stringify({
    additional_context: [
      "Pi package validation failed after the last edit.",
      output || "Run `pnpm run validate` for details.",
    ].join("\n"),
  }),
);
process.exit(0);
