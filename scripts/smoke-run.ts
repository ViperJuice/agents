import { runAgent } from "../runtime/run-agent.js";

const agentId = process.argv[2] ?? "panel-codex";
const prompt = process.argv.slice(3).join(" ").trim() || "Reply with exactly: SMOKE_OK";

try {
  const msgs = await runAgent(agentId, prompt);
  console.log("message_count:", msgs.length);
  console.log(JSON.stringify(msgs, null, 2).slice(0, 4000));
} catch (error) {
  console.error("SMOKE_FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
}
