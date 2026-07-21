import test from "node:test";
import assert from "node:assert/strict";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { pickTools } from "../runtime/pick-tools.js";
import { getAgentDefinition, listAgentIds, listAllAgentIds, agents } from "../registry/agents.js";
import { isAgentEnabled } from "../registry/enablement.js";
import { PI_WEB_ACCESS } from "../registry/catalog.js";
import { createClaudePanelTools, createGrokPanelTools, createCodexPanelTools } from "../packages/_shared/tools/alias-coding-tools.js";
import { firecrawlTools } from "../packages/_shared/tools/firecrawl.js";

const stubTools: AgentTool[] = [
  { name: "a", label: "A", description: "a", parameters: {}, execute: async () => ({ content: [{ type: "text", text: "a" }], details: {} }) },
  { name: "b", label: "B", description: "b", parameters: {}, execute: async () => ({ content: [{ type: "text", text: "b" }], details: {} }) },
];

test("pickTools returns allowlisted tools in order", () => {
  const picked = pickTools(stubTools, ["b", "a"]);
  assert.deepEqual(picked.map((t) => t.name), ["b", "a"]);
});

test("pickTools throws on unknown names", () => {
  assert.throws(() => pickTools(stubTools, ["missing"]), /unknown tool/);
});

test("registry lists core and panel agents when enabled", () => {
  const ids = listAgentIds();
  assert.ok(ids.includes("researcher"));
  assert.ok(ids.includes("web-fetcher"));
  assert.ok(ids.includes("panel-codex"));
  assert.ok(ids.includes("panel-claude"));
  // grok is api-key lane, disabled by default
  assert.ok(!ids.includes("panel-grok"));
  assert.ok(listAllAgentIds().includes("panel-grok"));
});

test("web-fetcher uses fetch subset of pi-web-access catalog", async () => {
  const def = getAgentDefinition("web-fetcher");
  assert.equal(def.model.provider, "openai-codex");
  assert.deepEqual(PI_WEB_ACCESS.toolNames, ["web_search", "fetch_content", "get_search_content"]);
});

test("loadVendorTools rejects undeclared tool names", async () => {
  const { loadVendorTools } = await import("../packages/_shared/tools/vendor/load-vendor-tools.js");
  await assert.rejects(
    () => loadVendorTools("pi-web-access", ["web_search", "not_a_tool"]),
    /not declared/,
  );
});

test("panel tool aliases use harness-native names", () => {
  assert.deepEqual(createClaudePanelTools("/tmp").map((t) => t.name), ["Read", "Write"]);
  assert.deepEqual(createGrokPanelTools("/tmp").map((t) => t.name), ["read_file", "grep", "list_dir"]);
  assert.deepEqual(createCodexPanelTools("/tmp").map((t) => t.name), ["exec_command"]);
});

test("firecrawl tools are named for local AI-host backend", () => {
  assert.deepEqual(firecrawlTools.map((t) => t.name), ["firecrawl_search", "firecrawl_scrape"]);
});

test("panel-grok enablement respects AGENTS_ALLOW_API_KEY", () => {
  const def = agents["panel-grok"]!;
  const prevAllow = process.env.AGENTS_ALLOW_API_KEY;
  const prevForce = process.env.AGENTS_FORCE_ENABLE;
  const prevDisable = process.env.AGENTS_DISABLE;
  try {
    delete process.env.AGENTS_ALLOW_API_KEY;
    delete process.env.AGENTS_FORCE_ENABLE;
    delete process.env.AGENTS_DISABLE;
    assert.equal(isAgentEnabled("panel-grok", def.enablement), false);

    process.env.AGENTS_ALLOW_API_KEY = "1";
    assert.equal(isAgentEnabled("panel-grok", def.enablement), true);

    delete process.env.AGENTS_ALLOW_API_KEY;
    process.env.AGENTS_FORCE_ENABLE = "panel-grok";
    assert.equal(isAgentEnabled("panel-grok", def.enablement), true);

    process.env.AGENTS_DISABLE = "panel-claude";
    delete process.env.AGENTS_FORCE_ENABLE;
    assert.equal(isAgentEnabled("panel-claude", agents["panel-claude"]!.enablement), false);
  } finally {
    if (prevAllow === undefined) delete process.env.AGENTS_ALLOW_API_KEY;
    else process.env.AGENTS_ALLOW_API_KEY = prevAllow;
    if (prevForce === undefined) delete process.env.AGENTS_FORCE_ENABLE;
    else process.env.AGENTS_FORCE_ENABLE = prevForce;
    if (prevDisable === undefined) delete process.env.AGENTS_DISABLE;
    else process.env.AGENTS_DISABLE = prevDisable;
  }
});

test("getAgentDefinition rejects disabled panel-grok by default", () => {
  const prevAllow = process.env.AGENTS_ALLOW_API_KEY;
  const prevForce = process.env.AGENTS_FORCE_ENABLE;
  try {
    delete process.env.AGENTS_ALLOW_API_KEY;
    delete process.env.AGENTS_FORCE_ENABLE;
    assert.throws(() => getAgentDefinition("panel-grok"), /disabled|XAI_API_KEY|api-key/i);
  } finally {
    if (prevAllow === undefined) delete process.env.AGENTS_ALLOW_API_KEY;
    else process.env.AGENTS_ALLOW_API_KEY = prevAllow;
    if (prevForce === undefined) delete process.env.AGENTS_FORCE_ENABLE;
    else process.env.AGENTS_FORCE_ENABLE = prevForce;
  }
});
