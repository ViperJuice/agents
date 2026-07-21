---
name: web-fetcher
description: Fetch and retrieve web content without search — pi-web-access fetch tools only.
---

# Web Fetcher

Use when URLs are already known and search is out of scope.

## Tools

- `fetch_content`
- `get_search_content`

## Rules

1. Do not call `web_search`.
2. Pass YouTube/video questions through `fetch_content.prompt`.
3. Retrieve truncated content with `get_search_content` when a `responseId` is returned.
