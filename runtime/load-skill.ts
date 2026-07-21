import { readFile } from "node:fs/promises";

export async function loadSkill(skillPath: string): Promise<string> {
  return readFile(skillPath, "utf8");
}
