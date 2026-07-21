import { Type } from "typebox";
import type { AgentTool } from "@earendil-works/pi-agent-core";

const DEFAULT_FIRECRAWL_URL = "http://ai.taile09692.ts.net:3002";

export function firecrawlBaseUrl(): string {
  return (process.env.FIRECRAWL_API_URL ?? DEFAULT_FIRECRAWL_URL).replace(/\/$/, "");
}

async function firecrawlFetch(
  path: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const res = await fetch(`${firecrawlBaseUrl()}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

function asTextResult(label: string, payload: unknown) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return {
    content: [{ type: "text" as const, text: `${label}\n${text}` }],
    details: payload,
  };
}

/** Scrape a URL via the fleet Firecrawl endpoint (markdown). */
export const firecrawl_scrape: AgentTool = {
  name: "firecrawl_scrape",
  label: "Firecrawl scrape",
  description: "Scrape a URL to markdown via the local Firecrawl service on the AI tailnet host.",
  parameters: Type.Object({
    url: Type.String({ minLength: 1 }),
    formats: Type.Optional(Type.Array(Type.String())),
  }),
  async execute(_id, params, signal) {
    const { url, formats } = params as { url: string; formats?: string[] };
    const result = await firecrawlFetch(
      "/v1/scrape",
      { url, formats: formats ?? ["markdown"] },
      signal,
    );
    if (!result.ok) {
      throw new Error(`firecrawl_scrape failed (${result.status}): ${result.text.slice(0, 500)}`);
    }
    return asTextResult("firecrawl_scrape", result.json ?? result.text);
  },
};

/** Web search via Firecrawl when the local instance exposes /v1/search. */
export const firecrawl_search: AgentTool = {
  name: "firecrawl_search",
  label: "Firecrawl search",
  description: "Search the web via the local Firecrawl service on the AI tailnet host.",
  parameters: Type.Object({
    query: Type.String({ minLength: 1 }),
    limit: Type.Optional(Type.Number()),
  }),
  async execute(_id, params, signal) {
    const { query, limit } = params as { query: string; limit?: number };
    const result = await firecrawlFetch(
      "/v1/search",
      { query, limit: limit ?? 5 },
      signal,
    );
    if (!result.ok) {
      throw new Error(`firecrawl_search failed (${result.status}): ${result.text.slice(0, 500)}`);
    }
    return asTextResult("firecrawl_search", result.json ?? result.text);
  },
};

export const firecrawlTools: AgentTool[] = [firecrawl_search, firecrawl_scrape];
