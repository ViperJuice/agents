---
name: run-example
description: Prompt template for the example Pi agent.
arguments:
  target: Optional focus path or repo root.
---

Use the `example-skill` skill.

Target: {{target}}

Call `example_echo` with a one-line readiness summary, then describe the next safe operator action.
