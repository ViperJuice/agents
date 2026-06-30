import { readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const pkgDir = resolve(process.argv[2] ?? "");
const manifest = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const pi = manifest.pi ?? {};

const extensions = (pi.extensions ?? []).map((rel) => join(pkgDir, rel));
const skillRel = pi.skills?.[0];
if (!skillRel) {
  console.error("package.json pi.skills is empty");
  process.exit(1);
}

const skillDir = join(pkgDir, skillRel);
const skillName = basename(skillRel);

const toolNames = [];
for (const extPath of extensions) {
  const text = readFileSync(extPath, "utf8");
  for (const match of text.matchAll(/name:\s*["']([^"']+)["']/g)) {
    toolNames.push(match[1]);
  }
}

const args = [
  "pi",
  "--print",
  "-p",
  `Use the ${skillName} skill. Call one registered tool with a minimal readiness check, then summarize the result.`,
  "--mode",
  "json",
  "--no-session",
  "--no-builtin-tools",
  "--skill",
  skillDir,
];

for (const extPath of extensions) {
  args.push("-e", extPath);
}

if (toolNames.length > 0) {
  args.push("--tools", toolNames.join(","));
}

for (const arg of args) {
  console.log(arg);
}
